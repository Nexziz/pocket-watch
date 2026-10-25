'use strict';

const { Plugin, PluginSettingTab, Setting, MarkdownView, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
  idleMinutes: 30,
  onlyWhenFocused: true,
  discardIdleTime: false,
  weekStartsMonday: true,
  showWatch: true,
  watchStyle: 'analog',
  // Where the floating watch sits, as fractions of the free space to its left and above it,
  // so it stays in the same corner when the window is resized.
  watchPos: null,
};

const DEFAULT_WATCH_POS = { fx: 0.97, fy: 0.9 };

// A day counts toward the streak and "active days" once it has at least a minute.
const ACTIVE_DAY_MS = 60 * 1000;

// Chinese, Japanese and Korean have no spaces, so each character counts as one word,
// the same way Obsidian's own word count does it.
const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}ー]/gu;
const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function countWords(text) {
  const cjk = (text.match(CJK_CHAR) || []).length;
  const rest = text.replace(CJK_CHAR, ' ').match(WORD);
  return cjk + (rest ? rest.length : 0);
}

function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysAgo(n) {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() - n);
}

function fmtShort(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Fits in a calendar cell: "45m", "2h", "1h58".
function fmtCompact(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

function fmtNum(n) {
  return n.toLocaleString();
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

const EMPTY_DAY = Object.freeze({ ms: 0, written: 0, deleted: 0 });

const STATE_LABELS = {
  tracking: 'Tracking',
  idle: 'Idle: type, click or scroll to resume',
  away: 'Paused while Obsidian is in the background',
  paused: 'Paused',
};

module.exports = class PocketWatchPlugin extends Plugin {
  async onload() {
    const saved = (await this.loadData()) || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved.settings);
    this.days = saved.days || {};

    this.paused = false;
    this.state = 'tracking';
    this.lastActivity = Date.now();
    this.lastInput = 0;
    this.lastTick = Date.now();
    this.sinceActivityMs = 0;
    this.dirty = false;
    // Word count of each open note when we last looked, keyed by path.
    this.wordCounts = new Map();
    this.pendingCounts = new Map();
    this.watch = null;

    this.addRibbonIcon('clock', 'Open Pocket Watch', () => this.watch && this.watch.toggleShelf());
    this.addSettingTab(new PocketWatchSettingTab(this.app, this));

    this.addCommand({ id: 'toggle-shelf', name: 'Open or close the stats shelf', callback: () => this.watch && this.watch.toggleShelf() });
    this.addCommand({ id: 'toggle-watch', name: 'Show or hide the floating watch', callback: () => this.setShowWatch(!this.settings.showWatch) });
    this.addCommand({ id: 'toggle-pause', name: 'Pause or resume the timer', callback: () => this.togglePause() });

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass('pocket-watch-status', 'mod-clickable');
    this.registerDomEvent(this.statusEl, 'click', () => this.watch && this.watch.toggleShelf());

    this.watchWindow(window);
    this.registerEvent(this.app.workspace.on('window-open', (_w, win) => this.watchWindow(win)));

    // Close the shelf when clicking anywhere outside it, or with Escape.
    this.registerDomEvent(document, 'pointerdown', (e) => {
      if (this.watch && this.watch.shelfEl && !this.watch.contains(e.target)) this.watch.closeShelf();
    }, true);
    this.registerDomEvent(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.watch && this.watch.shelfEl) this.watch.closeShelf();
    });
    this.registerDomEvent(window, 'resize', () => this.watch && this.watch.place());

    this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => this.onEditorChange(editor, info)));
    this.registerEvent(this.app.workspace.on('file-open', (file) => {
      this.markActive();
      this.seedWordCount(file);
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.markActive()));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      if (this.wordCounts.has(oldPath)) {
        this.wordCounts.set(file.path, this.wordCounts.get(oldPath));
        this.wordCounts.delete(oldPath);
      }
    }));
    this.registerInterval(window.setInterval(() => this.tick(), 1000));
    this.registerInterval(window.setInterval(() => this.flush(), 30 * 1000));

    this.app.workspace.onLayoutReady(() => {
      for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
        if (leaf.view instanceof MarkdownView) this.seedWordCount(leaf.view.file);
      }
      this.watch = new FloatingWatch(this);
      this.tick();
    });
  }

  onunload() {
    for (const t of this.pendingCounts.values()) window.clearTimeout(t);
    if (this.watch) this.watch.destroy();
    this.flush();
  }

  // Activity is anything you do in an Obsidian window: typing, clicking, scrolling,
  // moving the mouse, switching notes.
  watchWindow(win) {
    const doc = win.document;
    const activity = () => this.markActive();
    const input = () => {
      this.lastInput = Date.now();
      this.markActive();
    };
    const passive = { capture: true, passive: true };
    this.registerDomEvent(doc, 'keydown', input, true);
    this.registerDomEvent(doc, 'pointerdown', input, true);
    this.registerDomEvent(doc, 'wheel', activity, passive);
    this.registerDomEvent(doc, 'scroll', activity, passive);
    this.registerDomEvent(doc, 'mousemove', activity, passive);
    this.registerDomEvent(doc, 'touchstart', activity, passive);
    this.registerDomEvent(win, 'focus', activity);
  }

  markActive() {
    this.lastActivity = Date.now();
    this.sinceActivityMs = 0;
  }

  isFocused() {
    const doc = typeof activeDocument !== 'undefined' ? activeDocument : document;
    return doc.hasFocus();
  }

  tick() {
    const now = Date.now();
    // Cap the step so waking from sleep doesn't add the whole time asleep.
    const delta = Math.min(now - this.lastTick, 5000);
    this.lastTick = now;

    let state;
    if (this.paused) state = 'paused';
    else if (this.settings.onlyWhenFocused && !this.isFocused()) state = 'away';
    else if (now - this.lastActivity >= this.settings.idleMinutes * 60000) state = 'idle';
    else state = 'tracking';

    if (state === 'tracking') {
      this.today().ms += delta;
      this.sinceActivityMs += delta;
      this.dirty = true;
    } else if (state === 'idle' && this.state !== 'idle' && this.settings.discardIdleTime) {
      const d = this.today();
      d.ms = Math.max(0, d.ms - this.sinceActivityMs);
      this.sinceActivityMs = 0;
      this.dirty = true;
    }
    this.state = state;

    const ms = this.getDay(dayKey(new Date())).ms;
    this.statusEl.setText(`⏱ ${fmtShort(ms)}`);
    this.statusEl.setAttr('data-state', state);
    this.statusEl.setAttr('aria-label', `Pocket Watch: ${STATE_LABELS[state]}. Click for stats.`);
    if (this.watch) this.watch.refresh();
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.markActive();
    new Notice(this.paused ? 'Pocket Watch paused' : 'Pocket Watch resumed');
    this.tick();
  }

  async setShowWatch(show) {
    this.settings.showWatch = show;
    await this.saveSettings();
    if (this.watch) this.watch.applySettings();
  }

  async setWatchStyle(style) {
    this.settings.watchStyle = style;
    await this.saveSettings();
    if (this.watch) this.watch.applySettings();
  }

  today() {
    const key = dayKey(new Date());
    if (!this.days[key]) this.days[key] = { ms: 0, written: 0, deleted: 0 };
    return this.days[key];
  }

  getDay(key) {
    return this.days[key] || EMPTY_DAY;
  }

  seedWordCount(file) {
    if (!file || file.extension !== 'md' || this.pendingCounts.has(file.path)) return;
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view && view.file === file) this.wordCounts.set(file.path, countWords(view.editor.getValue()));
  }

  // Compare the note's word count with what it was before. Growth counts as words
  // written, shrinking as words deleted. Waits until you pause typing for half a second.
  onEditorChange(editor, info) {
    const file = info && info.file;
    if (!file) return;
    const path = file.path;
    if (!this.wordCounts.has(path)) {
      this.wordCounts.set(path, countWords(editor.getValue()));
      return;
    }
    window.clearTimeout(this.pendingCounts.get(path));
    this.pendingCounts.set(path, window.setTimeout(() => {
      this.pendingCounts.delete(path);
      // The pane may have switched to another note in the meantime.
      if (!info.file || info.file.path !== path) return;
      const now = countWords(editor.getValue());
      const before = this.wordCounts.get(path);
      this.wordCounts.set(path, now);
      // Changes that arrive without you typing or clicking (sync, other plugins) don't count.
      if (Date.now() - this.lastInput > 5000) return;
      const diff = now - before;
      if (diff > 0) this.today().written += diff;
      else if (diff < 0) this.today().deleted += -diff;
      if (diff !== 0) this.dirty = true;
    }, 500));
  }

  async flush() {
    if (!this.dirty) return;
    this.dirty = false;
    await this.saveData({ settings: this.settings, days: this.days });
  }

  async saveSettings() {
    this.dirty = true;
    await this.flush();
  }

  async resetData() {
    this.days = {};
    await this.saveSettings();
    this.tick();
    if (this.watch && this.watch.dashboard) this.watch.dashboard.render();
  }

  sumLastDays(n) {
    const sum = { ms: 0, written: 0, deleted: 0 };
    for (let i = 0; i < n; i++) {
      const d = this.getDay(dayKey(daysAgo(i)));
      sum.ms += d.ms;
      sum.written += d.written;
      sum.deleted += d.deleted;
    }
    return sum;
  }

  stats() {
    const s = { ms: 0, written: 0, deleted: 0, activeDays: 0, bestKey: null, bestMs: 0, streak: 0 };
    for (const [key, d] of Object.entries(this.days)) {
      s.ms += d.ms;
      s.written += d.written;
      s.deleted += d.deleted;
      if (d.ms >= ACTIVE_DAY_MS) s.activeDays++;
      if (d.ms > s.bestMs) {
        s.bestMs = d.ms;
        s.bestKey = key;
      }
    }
    // Today not counting yet shouldn't break a streak that ran through yesterday.
    let i = this.getDay(dayKey(daysAgo(0))).ms >= ACTIVE_DAY_MS ? 0 : 1;
    while (this.getDay(dayKey(daysAgo(i))).ms >= ACTIVE_DAY_MS) {
      s.streak++;
      i++;
    }
    return s;
  }
};

// The small watch that floats over the workspace. Drag it anywhere; click it to open the shelf.
class FloatingWatch {
  constructor(plugin) {
    this.plugin = plugin;
    this.shelfEl = null;
    this.dashboard = null;
    this.drawn = '';
    this.el = document.body.createDiv('pocket-watch-float');
    this.faceEl = this.el.createDiv('pocket-watch-face');
    this.el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    // Place it again whenever its size changes: when the plugin's styles arrive, or the style switches.
    this.resizeObserver = new ResizeObserver(() => this.place());
    this.resizeObserver.observe(this.el);
    this.applySettings();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.closeShelf();
    this.el.remove();
  }

  contains(target) {
    return this.el.contains(target) || (this.shelfEl && this.shelfEl.contains(target));
  }

  applySettings() {
    this.el.classList.toggle('is-hidden', !this.plugin.settings.showWatch);
    this.drawn = '';
    this.refresh();
    this.place();
  }

  // Called every second, but the face only redraws when the minute or the state changes.
  refresh() {
    const p = this.plugin;
    const ms = p.getDay(dayKey(new Date())).ms;
    const style = p.settings.watchStyle;
    const key = `${style}|${Math.floor(ms / 60000)}|${p.state}`;
    if (this.dashboard) this.dashboard.refreshLive();
    if (key === this.drawn) return;
    this.drawn = key;
    this.el.setAttr('data-state', p.state);
    this.el.setAttr('data-style', style);
    this.el.setAttr('aria-label', `${fmtShort(ms)} today. ${STATE_LABELS[p.state]}`);
    this.faceEl.empty();
    if (style === 'digital') this.drawDigital(ms);
    else this.drawAnalog(ms);
  }

  drawDigital(ms) {
    this.faceEl.createSpan('pocket-watch-dot');
    this.faceEl.createSpan({ cls: 'pocket-watch-digits', text: fmtShort(ms) });
  }

  // The hands show today's time like a stopwatch: the short hand counts hours, the long hand minutes.
  drawAnalog(ms) {
    const totalMin = Math.floor(ms / 60000);
    const svg = this.faceEl.createSvg('svg', { attr: { viewBox: '0 -16 100 116' }, cls: 'pocket-watch-svg' });
    svg.createSvg('circle', { attr: { cx: 50, cy: -7, r: 6 }, cls: 'pocket-watch-bow' });
    svg.createSvg('rect', { attr: { x: 44, y: -2, width: 12, height: 7, rx: 2 }, cls: 'pocket-watch-crown' });
    svg.createSvg('circle', { attr: { cx: 50, cy: 50, r: 46 }, cls: 'pocket-watch-case' });
    for (let i = 0; i < 12; i++) {
      const inner = i % 3 === 0 ? 33 : 37;
      svg.createSvg('line', {
        attr: { x1: 50, y1: 50 - inner, x2: 50, y2: 9, transform: `rotate(${i * 30} 50 50)` },
        cls: i % 3 === 0 ? ['pocket-watch-tick', 'is-major'] : 'pocket-watch-tick',
      });
    }
    const label = svg.createSvg('text', { attr: { x: 50, y: 73 }, cls: 'pocket-watch-face-text' });
    label.textContent = fmtShort(ms);
    const hourAngle = ((totalMin / 60) % 12) * 30;
    const minuteAngle = (totalMin % 60) * 6;
    svg.createSvg('line', { attr: { x1: 50, y1: 50, x2: 50, y2: 27, transform: `rotate(${hourAngle} 50 50)` }, cls: ['pocket-watch-hand', 'is-hour'] });
    svg.createSvg('line', { attr: { x1: 50, y1: 50, x2: 50, y2: 15, transform: `rotate(${minuteAngle} 50 50)` }, cls: ['pocket-watch-hand', 'is-minute'] });
    svg.createSvg('circle', { attr: { cx: 50, cy: 50, r: 4 }, cls: 'pocket-watch-pin' });
  }

  place() {
    const pos = this.plugin.settings.watchPos || DEFAULT_WATCH_POS;
    const r = this.el.getBoundingClientRect();
    this.el.style.left = `${pos.fx * Math.max(0, window.innerWidth - r.width)}px`;
    this.el.style.top = `${pos.fy * Math.max(0, window.innerHeight - r.height)}px`;
    if (this.shelfEl) this.placeShelf();
  }

  // A short press opens the shelf; pressing and moving drags the watch.
  onPointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = this.el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    let dragging = false;
    let left = r.left;
    let top = r.top;
    this.el.setPointerCapture(e.pointerId);

    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) < 4) return;
      dragging = true;
      this.el.addClass('is-dragging');
      left = clamp(r.left + dx, 0, window.innerWidth - r.width);
      top = clamp(r.top + dy, 0, window.innerHeight - r.height);
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
      if (this.shelfEl) this.placeShelf();
    };
    const up = () => {
      this.el.removeEventListener('pointermove', move);
      this.el.removeEventListener('pointerup', up);
      this.el.removeEventListener('pointercancel', up);
      this.el.removeClass('is-dragging');
      if (!dragging) {
        this.toggleShelf();
        return;
      }
      const freeX = window.innerWidth - r.width;
      const freeY = window.innerHeight - r.height;
      this.plugin.settings.watchPos = {
        fx: freeX > 0 ? left / freeX : 0,
        fy: freeY > 0 ? top / freeY : 0,
      };
      this.plugin.saveSettings();
    };
    this.el.addEventListener('pointermove', move);
    this.el.addEventListener('pointerup', up);
    this.el.addEventListener('pointercancel', up);
  }

  toggleShelf() {
    if (this.shelfEl) this.closeShelf();
    else this.openShelf();
  }

  openShelf() {
    this.shelfEl = document.body.createDiv('pocket-watch-shelf');
    this.dashboard = new Dashboard(this.plugin, this.shelfEl, () => this.placeShelf());
    this.dashboard.render();
    this.el.addClass('is-open');
  }

  closeShelf() {
    if (!this.shelfEl) return;
    this.shelfEl.remove();
    this.shelfEl = null;
    this.dashboard = null;
    this.el.removeClass('is-open');
  }

  // Open toward whichever side of the window has more room, next to the watch.
  placeShelf() {
    const s = this.shelfEl;
    const gap = 8;
    const sw = s.offsetWidth;
    const sh = s.offsetHeight;
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (!this.plugin.settings.showWatch) {
      s.style.left = `${W - sw - 16}px`;
      s.style.top = `${clamp(48, gap, H - sh - gap)}px`;
      s.setAttr('data-side', 'below');
      return;
    }
    const w = this.el.getBoundingClientRect();
    const below = w.top + w.height / 2 < H / 2;
    const top = below ? w.bottom + gap : w.top - gap - sh;
    const left = w.left + w.width / 2 > W / 2 ? w.right - sw : w.left;
    s.style.top = `${clamp(top, gap, H - sh - gap)}px`;
    s.style.left = `${clamp(left, gap, W - sw - gap)}px`;
    s.setAttr('data-side', below ? 'below' : 'above');
  }
}

// Everything on the shelf: today, the calendar, the selected day and the stats.
class Dashboard {
  constructor(plugin, el, onRender) {
    this.plugin = plugin;
    this.el = el;
    this.onRender = onRender;
    const t = new Date();
    this.month = new Date(t.getFullYear(), t.getMonth(), 1);
    this.selected = dayKey(t);
    this.renderedDay = this.selected;
    this.lastRender = 0;
  }

  refreshLive() {
    if (!this.clockEl) return;
    const today = dayKey(new Date());
    if (today !== this.renderedDay) {
      // Midnight passed: follow the new day if you were looking at today.
      if (this.selected === this.renderedDay) this.selected = today;
      this.render();
      return;
    }
    // Redraw the rest once a minute, but not under the mouse while you're using it.
    if (Date.now() - this.lastRender > 60000 && !this.el.matches(':hover')) {
      this.render();
      return;
    }
    const p = this.plugin;
    this.clockEl.setText(fmtShort(p.getDay(today).ms));
    this.stateEl.setText(STATE_LABELS[p.state]);
    this.headEl.setAttr('data-state', p.state);
    this.pauseBtn.setText(p.paused ? 'Resume' : 'Pause');
  }

  render() {
    const el = this.el;
    el.empty();
    this.lastRender = Date.now();
    this.renderedDay = dayKey(new Date());

    this.renderToday(el.createDiv('pocket-watch-section'));
    this.renderCalendar(el.createDiv('pocket-watch-section'));
    this.renderDay(el.createDiv('pocket-watch-section'));
    this.renderStats(el.createDiv('pocket-watch-section'));
    this.refreshLive();
    if (this.onRender) this.onRender();
  }

  renderToday(el) {
    const p = this.plugin;
    this.headEl = el.createDiv('pocket-watch-head');
    const left = this.headEl.createDiv();
    left.createDiv({ cls: 'pocket-watch-label', text: 'Today' });
    this.clockEl = left.createDiv('pocket-watch-clock');
    const row = left.createDiv('pocket-watch-state-row');
    row.createSpan('pocket-watch-dot');
    this.stateEl = row.createSpan('pocket-watch-state');

    const right = this.headEl.createDiv('pocket-watch-head-actions');
    this.pauseBtn = right.createEl('button');
    this.pauseBtn.addEventListener('click', () => p.togglePause());
    const styles = right.createDiv('pocket-watch-switch');
    for (const [value, text] of [['analog', 'Analog'], ['digital', 'Digital']]) {
      const b = styles.createEl('button', { text });
      if (p.settings.watchStyle === value) b.addClass('is-active');
      b.addEventListener('click', async () => {
        await p.setWatchStyle(value);
        this.render();
      });
    }

    const idle = new Setting(el)
      .setName('Idle limit')
      .setDesc(`Stops after ${p.settings.idleMinutes} min with no activity`);
    idle.addSlider((s) => s
      .setLimits(1, 120, 1)
      .setValue(p.settings.idleMinutes)
      .setDynamicTooltip()
      .onChange(async (v) => {
        p.settings.idleMinutes = v;
        idle.setDesc(`Stops after ${v} min with no activity`);
        await p.saveSettings();
      }));
  }

  renderCalendar(el) {
    const p = this.plugin;
    const y = this.month.getFullYear();
    const m = this.month.getMonth();

    const head = el.createDiv('pocket-watch-cal-head');
    const prev = head.createEl('button', { text: '‹', cls: 'pocket-watch-nav', attr: { 'aria-label': 'Previous month' } });
    head.createDiv({
      cls: 'pocket-watch-month',
      text: this.month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    });
    const next = head.createEl('button', { text: '›', cls: 'pocket-watch-nav', attr: { 'aria-label': 'Next month' } });
    prev.addEventListener('click', () => {
      this.month = new Date(y, m - 1, 1);
      this.render();
    });
    next.addEventListener('click', () => {
      this.month = new Date(y, m + 1, 1);
      this.render();
    });

    const grid = el.createDiv('pocket-watch-cal');
    const mon = p.settings.weekStartsMonday;
    const names = mon ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    for (const n of names) grid.createDiv({ cls: 'pocket-watch-wd', text: n });

    const offset = (new Date(y, m, 1).getDay() - (mon ? 1 : 0) + 7) % 7;
    for (let i = 0; i < offset; i++) grid.createDiv({ cls: ['pocket-watch-cell', 'is-blank'] });

    const todayKey = dayKey(new Date());
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayKey(new Date(y, m, d));
      const ms = p.getDay(key).ms;
      const level = ms === 0 ? 0 : ms < 30 * 60000 ? 1 : ms < 90 * 60000 ? 2 : ms < 180 * 60000 ? 3 : 4;
      const cell = grid.createDiv({ cls: ['pocket-watch-cell', `pocket-watch-l${level}`] });
      if (key === todayKey) cell.addClass('is-today');
      if (key === this.selected) cell.addClass('is-selected');
      cell.createDiv({ cls: 'pocket-watch-daynum', text: String(d) });
      if (ms >= 60000) cell.createDiv({ cls: 'pocket-watch-daytime', text: fmtCompact(ms) });
      cell.setAttr('aria-label', `${key}: ${fmtShort(ms)}`);
      cell.addEventListener('click', () => {
        this.selected = key;
        this.render();
      });
    }
  }

  renderDay(el) {
    const p = this.plugin;
    const todayKey = dayKey(new Date());
    const d = p.getDay(this.selected);
    const title = keyToDate(this.selected).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    el.createEl('h4', { text: this.selected === todayKey ? `Today, ${title}` : title });

    const rows = el.createDiv('pocket-watch-rows');
    const row = (label, value) => {
      const r = rows.createDiv('pocket-watch-row');
      r.createSpan({ text: label });
      r.createSpan({ cls: 'pocket-watch-val', text: value });
    };
    row('Time', fmtShort(d.ms));
    row('Words written', fmtNum(d.written));
    row('Words deleted', fmtNum(d.deleted));
    const net = d.written - d.deleted;
    row('Net words', `${net > 0 ? '+' : ''}${fmtNum(net)}`);

    if (this.selected !== todayKey) {
      const t = p.getDay(todayKey).ms;
      const diff = t - d.ms;
      const text = d.ms === 0
        ? `Nothing tracked that day. Today so far: ${fmtShort(t)}`
        : diff === 0
          ? 'Same time as today'
          : diff > 0
            ? `Today you've done ${fmtShort(diff)} more (${fmtShort(t)})`
            : `Today you've done ${fmtShort(-diff)} less (${fmtShort(t)})`;
      el.createDiv({ cls: 'pocket-watch-compare', text });
    }
  }

  renderStats(el) {
    const p = this.plugin;
    const s = p.stats();
    const week = p.sumLastDays(7);
    const month = p.sumLastDays(30);
    el.createEl('h4', { text: 'Stats' });

    const tiles = el.createDiv('pocket-watch-tiles');
    const tile = (label, value, sub) => {
      const t = tiles.createDiv('pocket-watch-tile');
      t.createDiv({ cls: 'pocket-watch-tile-val', text: value });
      t.createDiv({ cls: 'pocket-watch-tile-label', text: label });
      if (sub) t.createDiv({ cls: 'pocket-watch-tile-sub', text: sub });
    };
    tile('Last 7 days', fmtShort(week.ms), `${fmtNum(week.written)} words`);
    tile('Last 30 days', fmtShort(month.ms), `${fmtNum(month.written)} words`);
    tile('All time', fmtShort(s.ms), `${s.activeDays} active days`);
    tile('Daily average', fmtShort(s.activeDays ? s.ms / s.activeDays : 0), 'on active days');
    tile('Streak', `${s.streak} ${s.streak === 1 ? 'day' : 'days'}`, 'at least 1 min a day');
    tile('Best day', fmtShort(s.bestMs), s.bestKey || '');
    tile('Words written', fmtNum(s.written), 'all time');
    tile('Words deleted', fmtNum(s.deleted), 'all time');

    el.createDiv({ cls: 'pocket-watch-label', text: 'Last 14 days' });
    const bars = el.createDiv('pocket-watch-bars');
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = daysAgo(i);
      days.push({ date, ms: p.getDay(dayKey(date)).ms });
    }
    const max = Math.max(1, ...days.map((x) => x.ms));
    for (const { date, ms } of days) {
      const col = bars.createDiv('pocket-watch-bar-col');
      col.setAttr('aria-label', `${dayKey(date)}: ${fmtShort(ms)}`);
      const track = col.createDiv('pocket-watch-bar-track');
      track.createDiv('pocket-watch-bar').style.height = `${(ms / max) * 100}%`;
      col.createDiv({ cls: 'pocket-watch-bar-day', text: String(date.getDate()) });
    }
  }
}

class PocketWatchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const p = this.plugin;
    const el = this.containerEl;
    el.empty();

    new Setting(el)
      .setName('Show floating watch')
      .setDesc('A small watch you can drag anywhere over your notes. Click it to open the stats shelf.')
      .addToggle((t) => t.setValue(p.settings.showWatch).onChange((v) => p.setShowWatch(v)));

    new Setting(el)
      .setName('Watch style')
      .addDropdown((d) => d
        .addOption('analog', 'Analog')
        .addOption('digital', 'Digital')
        .setValue(p.settings.watchStyle)
        .onChange((v) => p.setWatchStyle(v)));

    new Setting(el)
      .setName('Reset watch position')
      .setDesc('Move the watch back to the bottom right corner.')
      .addButton((b) => b.setButtonText('Reset').onClick(async () => {
        p.settings.watchPos = null;
        await p.saveSettings();
        if (p.watch) p.watch.place();
      }));

    new Setting(el)
      .setName('Idle limit (minutes)')
      .setDesc('The timer stops when there is no typing, clicking, scrolling or mouse movement for this long.')
      .addSlider((s) => s
        .setLimits(1, 120, 1)
        .setValue(p.settings.idleMinutes)
        .setDynamicTooltip()
        .onChange(async (v) => {
          p.settings.idleMinutes = v;
          await p.saveSettings();
        }));

    new Setting(el)
      .setName('Remove idle time')
      .setDesc('When the timer goes idle, take back the minutes you spent without activity before it stopped.')
      .addToggle((t) => t.setValue(p.settings.discardIdleTime).onChange(async (v) => {
        p.settings.discardIdleTime = v;
        await p.saveSettings();
      }));

    new Setting(el)
      .setName('Only count while Obsidian is focused')
      .setDesc('Pause the timer when another app is in front.')
      .addToggle((t) => t.setValue(p.settings.onlyWhenFocused).onChange(async (v) => {
        p.settings.onlyWhenFocused = v;
        await p.saveSettings();
      }));

    new Setting(el)
      .setName('Week starts on Monday')
      .addToggle((t) => t.setValue(p.settings.weekStartsMonday).onChange(async (v) => {
        p.settings.weekStartsMonday = v;
        await p.saveSettings();
      }));

    new Setting(el)
      .setName('Reset all data')
      .setDesc('Deletes every tracked day. This cannot be undone.')
      .addButton((b) => b.setButtonText('Reset').setWarning().onClick(async () => {
        if (window.confirm('Delete all Pocket Watch time and word stats?')) {
          await p.resetData();
          new Notice('Pocket Watch data reset');
        }
      }));
  }
}
