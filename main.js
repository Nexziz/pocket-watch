'use strict';

const { Plugin, PluginSettingTab, Setting, MarkdownView, Notice } = require('obsidian');

const FACES = { porcelain: 'Porcelain', slate: 'Slate', midnight: 'Midnight', digital: 'Digital' };
const HANDS = { leaf: 'Leaf', baton: 'Baton', breguet: 'Breguet' };

const DEFAULT_SETTINGS = {
  idleMinutes: 30,
  onlyWhenFocused: true,
  discardIdleTime: false,
  weekStartsMonday: true,
  showWatch: true,
  face: 'porcelain',
  hands: 'leaf',
  watchSize: 120,
  showSeconds: false,
  showDate: true,
  showMoon: true,
  showFocus: true,
  dailyGoalMinutes: 120,
  // The pane (tab group) the watch is snapped to, and which corner: { group, corner }.
  watchAnchor: null,
  // Where the watch sits when dropped freely (Alt), as fractions of the free space
  // to its left and above it, so it keeps its spot when the window is resized.
  watchPos: null,
};

const DEFAULT_WATCH_POS = { fx: 0.97, fy: 0.9 };
const SNAP_INSET = 14;

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

// Point on the dial at radius r and angle a (degrees clockwise from 12), on a 200 x 200 face.
function polar(r, a) {
  const rad = (a * Math.PI) / 180;
  return [100 + r * Math.sin(rad), 100 - r * Math.cos(rad)];
}

// Where we are in the moon's cycle: 0 is new moon, 0.5 is full moon.
function moonPhase(date) {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return (((days / 29.530588853) % 1) + 1) % 1;
}

const MOON_NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];

function moonName(p) {
  return MOON_NAMES[Math.floor(p * 8 + 0.5) % 8];
}

// The lit part of the moon: half the disc on the lit side, closed by the curved terminator.
function moonPath(cx, cy, r, p) {
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(k) * r;
  const waxing = p < 0.5;
  const outer = waxing ? 1 : 0;
  const inner = waxing === (k > 0) ? 0 : 1;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outer} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${inner} ${cx} ${cy - r} Z`;
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
    this.addCommand({ id: 'toggle-watch', name: 'Show or hide the watch', callback: () => this.updateWatch({ showWatch: !this.settings.showWatch }) });
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

    // The watch follows its pane when the layout changes.
    const follow = () => this.watch && this.watch.place();
    this.registerDomEvent(window, 'resize', follow);
    this.registerEvent(this.app.workspace.on('layout-change', follow));
    this.registerEvent(this.app.workspace.on('resize', follow));

    this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => this.onEditorChange(editor, info)));
    this.registerEvent(this.app.workspace.on('file-open', (file) => {
      this.markActive();
      this.seedWordCount(file);
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.markActive();
      follow();
    }));
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

  async updateWatch(patch) {
    Object.assign(this.settings, patch);
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

// The watch that sits on top of your panes. It shows the time of day; today's time in
// Obsidian is the ring on the bezel and the small text on the dial. Drag it onto a pane
// and it snaps to that pane's nearest corner; click it to open the shelf.
class FloatingWatch {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.shelfEl = null;
    this.dashboard = null;
    this.ghostEl = null;
    this.dragging = false;
    this.built = '';
    this.parts = {};
    this.anchorEl = null;
    this.anchorId = null;
    this.el = document.body.createDiv('pocket-watch-float');
    this.faceEl = this.el.createDiv('pocket-watch-face');
    this.el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    // Place it again whenever its size changes: when the plugin's styles arrive, or the face changes.
    this.resizeObserver = new ResizeObserver(() => this.place());
    this.resizeObserver.observe(this.el);
    this.applySettings();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.closeShelf();
    this.removeGhost();
    this.el.remove();
  }

  contains(target) {
    return this.el.contains(target) || (this.shelfEl && this.shelfEl.contains(target));
  }

  applySettings() {
    this.el.classList.toggle('is-hidden', !this.plugin.settings.showWatch);
    this.built = '';
    this.refresh();
  }

  // Called every second. The face is only rebuilt when an option or the date changes;
  // otherwise just the hands, the ring and the text move.
  refresh() {
    const s = this.plugin.settings;
    const now = new Date();
    const key = [s.face, s.hands, s.watchSize, s.showSeconds, s.showDate, s.showMoon, s.showFocus, dayKey(now)].join('|');
    if (key !== this.built) {
      this.build(now);
      this.built = key;
    }
    this.update(now);
    if (this.dashboard) this.dashboard.refreshLive();
    this.place();
  }

  build(now) {
    const s = this.plugin.settings;
    this.faceEl.empty();
    this.parts = {};
    this.el.setAttr('data-face', s.face);
    if (s.face === 'digital') this.buildDigital(now);
    else this.buildAnalog(now);
  }

  update(now) {
    const p = this.plugin;
    const s = p.settings;
    const ms = p.getDay(dayKey(now)).ms;
    const parts = this.parts;
    const h = now.getHours();
    const m = now.getMinutes();
    const sec = now.getSeconds();
    const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    this.el.setAttr('data-state', p.state);
    const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const label = [time, date];
    if (s.showMoon) label.push(moonName(moonPhase(now)));
    label.push(`${fmtShort(ms)} in Obsidian today (${STATE_LABELS[p.state].toLowerCase()})`);
    this.el.setAttr('aria-label', label.join('\n'));

    const goal = Math.min(1, ms / (Math.max(1, s.dailyGoalMinutes) * 60000));
    if (parts.hour) {
      rotate(parts.hour, ((h % 12) + m / 60) * 30);
      rotate(parts.minute, m * 6 + sec * 0.1);
      if (parts.second) rotate(parts.second, sec * 6);
      if (parts.ring) setIfChanged(parts.ring, 'stroke-dasharray', `${(goal * 100).toFixed(2)} 100`);
    }
    if (parts.time && parts.time.textContent !== time) parts.time.textContent = time;
    if (parts.focusText && parts.focusText.textContent !== fmtShort(ms)) parts.focusText.textContent = fmtShort(ms);
    if (parts.fill) parts.fill.style.width = `${goal * 100}%`;
  }

  buildAnalog(now) {
    const s = this.plugin.settings;
    const svg = this.faceEl.createSvg('svg', {
      attr: { viewBox: '0 0 200 200', width: s.watchSize, height: s.watchSize },
      cls: ['pocket-watch-svg', `pocket-watch-face-${s.face}`],
    });
    const add = (parent, tag, attr, cls) => parent.createSvg(tag, { attr, cls });

    const defs = add(svg, 'defs');
    const bezel = add(defs, 'linearGradient', { id: 'pocket-watch-bezel', x1: 0, y1: 0, x2: 1, y2: 1 });
    add(bezel, 'stop', { offset: '0%' }, 'pw-bezel-a');
    add(bezel, 'stop', { offset: '55%' }, 'pw-bezel-b');
    add(bezel, 'stop', { offset: '100%' }, 'pw-bezel-c');
    const dial = add(defs, 'radialGradient', { id: 'pocket-watch-dial', cx: '50%', cy: '40%', r: '62%' });
    add(dial, 'stop', { offset: '0%' }, 'pw-dial-a');
    add(dial, 'stop', { offset: '100%' }, 'pw-dial-b');

    add(svg, 'circle', { cx: 100, cy: 100, r: 99, fill: 'url(#pocket-watch-bezel)' }, 'pw-bezel');
    if (s.showFocus) {
      add(svg, 'circle', { cx: 100, cy: 100, r: 94.5 }, 'pw-ring-track');
      this.parts.ring = add(svg, 'circle', {
        cx: 100, cy: 100, r: 94.5, pathLength: 100, transform: 'rotate(-90 100 100)', 'stroke-dasharray': '0 100',
      }, 'pw-ring');
    }
    add(svg, 'circle', { cx: 100, cy: 100, r: 89.5, fill: 'url(#pocket-watch-dial)' }, 'pw-dial');

    if (s.face === 'slate') this.drawSlate(svg, add);
    else if (s.face === 'midnight') this.drawMidnight(svg, add);
    else this.drawPorcelain(svg, add);

    if (s.showDate) {
      const weekday = now.toLocaleDateString(undefined, { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase();
      add(svg, 'rect', { x: 121, y: 91, width: 44, height: 18, rx: 3 }, 'pw-date-bg');
      add(svg, 'text', { x: 143, y: 100.5 }, 'pw-date').textContent = `${weekday} ${now.getDate()}`;
    }
    if (s.showMoon) this.drawMoon(svg, add, now);
    if (s.showFocus) this.parts.focusText = add(svg, 'text', { x: 100, y: 66 }, 'pw-focus-text');

    const hands = add(svg, 'g', {}, 'pw-hands');
    this.parts.hour = add(hands, 'g', {}, 'pw-hand');
    this.drawHand(this.parts.hour, add, s.hands, 'hour');
    this.parts.minute = add(hands, 'g', {}, 'pw-hand');
    this.drawHand(this.parts.minute, add, s.hands, 'minute');
    if (s.showSeconds) {
      this.parts.second = add(hands, 'g', {}, 'pw-second');
      add(this.parts.second, 'line', { x1: 0, y1: 20, x2: 0, y2: -80 });
      add(this.parts.second, 'circle', { cx: 0, cy: 15, r: 2.6 });
    }
    add(svg, 'circle', { cx: 100, cy: 100, r: 4.6 }, 'pw-cap');
    add(svg, 'circle', { cx: 100, cy: 100, r: 1.6 }, 'pw-cap-dot');
  }

  // Ivory dial, thin batons and a dotted minute track.
  drawPorcelain(svg, add) {
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const [x, y] = polar(83, i * 6);
      add(svg, 'circle', { cx: x, cy: y, r: 0.9 }, 'pw-minute-dot');
    }
    for (let i = 1; i < 12; i++) {
      const [x1, y1] = polar(84, i * 30);
      const [x2, y2] = polar(i % 3 === 0 ? 67 : 72, i * 30);
      add(svg, 'line', { x1, y1, x2, y2 }, i % 3 === 0 ? ['pw-index', 'is-major'] : 'pw-index');
    }
    for (const dx of [-3.6, 3.6]) {
      add(svg, 'line', { x1: 100 + dx, y1: 16, x2: 100 + dx, y2: 33 }, ['pw-index', 'is-major']);
    }
  }

  // Charcoal dial with sand-coloured numerals; the date and moon take the place of 3 and 6.
  drawSlate(svg, add) {
    const s = this.plugin.settings;
    for (let i = 0; i < 60; i++) {
      const [x1, y1] = polar(85, i * 6);
      const [x2, y2] = polar(i % 5 ? 81.5 : 76, i * 6);
      add(svg, 'line', { x1, y1, x2, y2 }, i % 5 ? 'pw-tick' : ['pw-tick', 'is-hour']);
    }
    for (const [i, n] of [[0, '12'], [3, '3'], [6, '6'], [9, '9']]) {
      if ((i === 3 && s.showDate) || (i === 6 && s.showMoon)) continue;
      const [x, y] = polar(62, i * 30);
      add(svg, 'text', { x, y }, 'pw-numeral').textContent = n;
    }
  }

  // Deep blue dial with a scatter of faint stars and round indices.
  drawMidnight(svg, add) {
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 36; i++) {
      const [x, y] = polar(18 + rand() * 62, rand() * 360);
      add(svg, 'circle', { cx: x, cy: y, r: 0.35 + rand() * 0.75, opacity: 0.2 + rand() * 0.6 }, 'pw-star');
    }
    add(svg, 'circle', { cx: 100, cy: 100, r: 84.5 }, 'pw-track');
    for (let i = 0; i < 12; i++) {
      const [x, y] = polar(77, i * 30);
      add(svg, 'circle', { cx: x, cy: y, r: i === 0 ? 4 : i % 3 === 0 ? 3 : 2.1 }, 'pw-dot-index');
    }
  }

  // A small window at 6 o'clock with tonight's moon.
  drawMoon(svg, add, now) {
    const cx = 100;
    const cy = 141;
    add(svg, 'circle', { cx, cy, r: 20.5 }, 'pw-moon-frame');
    add(svg, 'circle', { cx, cy, r: 19 }, 'pw-moon-sky');
    for (const [x, y, r] of [[-12, -6, 0.7], [11, -9, 0.55], [13, 6, 0.6], [-9, 10, 0.5], [3, -14, 0.45]]) {
      add(svg, 'circle', { cx: cx + x, cy: cy + y, r }, 'pw-moon-star');
    }
    add(svg, 'circle', { cx, cy, r: 9.5 }, 'pw-moon-dark');
    add(svg, 'path', { d: moonPath(cx, cy, 9.5, moonPhase(now)) }, 'pw-moon-lit');
  }

  // Hands are drawn pointing at 12 around (0, 0) and turned into place by update().
  drawHand(g, add, style, kind) {
    const hour = kind === 'hour';
    if (style === 'baton') {
      const [w, len, tail] = hour ? [7.2, 46, 10] : [5.2, 71, 12];
      add(g, 'rect', { x: -w / 2, y: -len, width: w, height: len + tail, rx: w / 2 }, 'pw-hand-body');
      add(g, 'rect', { x: -w / 2 + 1.6, y: -len + 4, width: w - 3.2, height: len * 0.55, rx: (w - 3.2) / 2 }, 'pw-hand-lume');
    } else if (style === 'breguet') {
      const [len, ringY, ringR, w] = hour ? [47, -32, 5.6, 2.8] : [74, -60, 4.4, 2.2];
      add(g, 'rect', { x: -w / 2, y: ringY + ringR - 0.5, width: w, height: -ringY - ringR + 10.5, rx: w / 2 }, 'pw-hand-body');
      add(g, 'circle', { cx: 0, cy: ringY, r: ringR }, 'pw-hand-ring');
      add(g, 'path', { d: `M ${-w * 0.6} ${ringY - ringR + 0.5} L 0 ${-len} L ${w * 0.6} ${ringY - ringR + 0.5} Z` }, 'pw-hand-body');
    } else {
      const [w, len, tail] = hour ? [6.6, 46, 11] : [4.8, 72, 13];
      add(g, 'path', {
        d: `M 0 ${tail} C ${w} ${-len * 0.15} ${w * 0.7} ${-len * 0.62} 0 ${-len} C ${-w * 0.7} ${-len * 0.62} ${-w} ${-len * 0.15} 0 ${tail} Z`,
      }, 'pw-hand-body');
    }
  }

  buildDigital(now) {
    const s = this.plugin.settings;
    const box = this.faceEl.createDiv('pocket-watch-digital');
    box.style.fontSize = `${(s.watchSize / 120) * 13}px`;
    this.parts.time = box.createDiv('pocket-watch-digital-time');
    const meta = box.createDiv('pocket-watch-digital-meta');
    if (s.showDate) meta.createSpan({ text: now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) });
    if (s.showMoon) {
      const moon = meta.createSvg('svg', { attr: { viewBox: '0 0 20 20', width: '1.1em', height: '1.1em' }, cls: 'pocket-watch-digital-moon' });
      moon.createSvg('circle', { attr: { cx: 10, cy: 10, r: 8 }, cls: 'pw-moon-dark' });
      moon.createSvg('path', { attr: { d: moonPath(10, 10, 8, moonPhase(now)) }, cls: 'pw-moon-lit' });
    }
    if (s.showFocus) {
      this.parts.focusText = meta.createSpan('pocket-watch-digital-focus');
      this.parts.fill = box.createDiv('pocket-watch-digital-bar').createDiv('pocket-watch-digital-fill');
    }
  }

  // The tab group under the pointer, if it lives in this window.
  groupAt(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (this.el.contains(el) || (this.ghostEl && this.ghostEl.contains(el))) continue;
      const group = el.closest('.workspace-tabs');
      if (group) return group;
    }
    return null;
  }

  groupId(el) {
    let id = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!id && leaf.parent && leaf.parent.containerEl === el) id = leaf.parent.id;
    });
    return id;
  }

  resolveGroup(id) {
    if (this.anchorId === id && this.anchorEl && this.anchorEl.isConnected) return this.anchorEl;
    let el = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!el && leaf.parent && leaf.parent.id === id) el = leaf.parent.containerEl;
    });
    this.anchorId = id;
    this.anchorEl = el && el.ownerDocument === document ? el : null;
    return this.anchorEl;
  }

  // The tab group of the note you're working in, for the first time the watch is placed.
  defaultAnchor() {
    const ws = this.app.workspace;
    const leaf = ws.getMostRecentLeaf(ws.rootSplit);
    if (!leaf || !leaf.parent || !leaf.parent.id) return null;
    return { group: leaf.parent.id, corner: 'br' };
  }

  // The spot in a corner of a pane, below its header and clear of the status bar.
  // Null when the pane is hidden, such as in a collapsed sidebar.
  snapSpot(groupEl, corner) {
    const content = groupEl.querySelector(':scope > .workspace-tab-container') || groupEl;
    const r = content.getBoundingClientRect();
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    if (r.width < w + SNAP_INSET * 2 || r.height < h + SNAP_INSET * 2) return null;
    const header = Array.from(content.querySelectorAll('.view-header')).find((e) => e.offsetParent !== null);
    const x = corner[1] === 'l' ? r.left + SNAP_INSET : r.right - SNAP_INSET - 6 - w;
    let y = corner[0] === 't' ? r.top + (header ? header.offsetHeight : 0) + SNAP_INSET : r.bottom - SNAP_INSET - h;
    const bar = document.querySelector('.status-bar');
    if (bar && corner[0] === 'b') {
      const b = bar.getBoundingClientRect();
      if (b.width && x + w > b.left && x < b.right && y + h > b.top - 6) y = b.top - 6 - h;
    }
    return { x, y };
  }

  snapTarget(px, py, left, top) {
    const el = this.groupAt(px, py);
    const id = el && this.groupId(el);
    if (!id) return null;
    let best = null;
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const spot = this.snapSpot(el, corner);
      if (!spot) continue;
      const d = Math.hypot(spot.x - left, spot.y - top);
      if (!best || d < best.d) best = { el, id, corner, spot, d };
    }
    return best;
  }

  place() {
    const s = this.plugin.settings;
    if (this.dragging || !s.showWatch) return;
    let spot = null;
    let tucked = false;
    if (!s.watchAnchor && s.watchPos) {
      spot = this.freeSpot(s.watchPos);
    } else {
      if (!s.watchAnchor) {
        const anchor = this.defaultAnchor();
        if (anchor) {
          s.watchAnchor = anchor;
          this.plugin.saveSettings();
        }
      }
      const el = s.watchAnchor && this.resolveGroup(s.watchAnchor.group);
      if (el) {
        spot = this.snapSpot(el, s.watchAnchor.corner);
        tucked = !spot;
      } else {
        // The pane it was snapped to is gone: use the bottom right of the window.
        spot = this.freeSpot(DEFAULT_WATCH_POS);
      }
    }
    this.el.classList.toggle('is-tucked', tucked);
    if (spot) {
      const left = `${Math.round(spot.x)}px`;
      const top = `${Math.round(spot.y)}px`;
      if (this.el.style.left !== left) this.el.style.left = left;
      if (this.el.style.top !== top) this.el.style.top = top;
    }
    if (this.shelfEl) this.placeShelf();
  }

  freeSpot(pos) {
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    return { x: pos.fx * Math.max(0, window.innerWidth - w), y: pos.fy * Math.max(0, window.innerHeight - h) };
  }

  showGhost(spot) {
    if (!spot) {
      this.removeGhost();
      return;
    }
    if (!this.ghostEl) {
      this.ghostEl = document.body.createDiv('pocket-watch-ghost');
      this.ghostEl.setAttr('data-face', this.plugin.settings.face);
      this.ghostEl.style.width = `${this.el.offsetWidth}px`;
      this.ghostEl.style.height = `${this.el.offsetHeight}px`;
    }
    this.ghostEl.style.left = `${spot.x}px`;
    this.ghostEl.style.top = `${spot.y}px`;
  }

  removeGhost() {
    if (this.ghostEl) this.ghostEl.remove();
    this.ghostEl = null;
  }

  // A short press opens the shelf. Pressing and moving drags the watch; let go over a pane
  // and it snaps to the nearest corner, or hold Alt to leave it exactly where it is.
  onPointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = this.el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    let left = r.left;
    let top = r.top;
    let target = null;
    this.el.setPointerCapture(e.pointerId);

    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!this.dragging && Math.hypot(dx, dy) < 4) return;
      if (!this.dragging) {
        this.dragging = true;
        this.el.addClass('is-dragging');
      }
      left = clamp(r.left + dx, 0, window.innerWidth - r.width);
      top = clamp(r.top + dy, 0, window.innerHeight - r.height);
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
      target = ev.altKey ? null : this.snapTarget(ev.clientX, ev.clientY, left, top);
      this.showGhost(target && target.spot);
      if (this.shelfEl) this.placeShelf();
    };
    const up = () => {
      this.el.removeEventListener('pointermove', move);
      this.el.removeEventListener('pointerup', up);
      this.el.removeEventListener('pointercancel', up);
      if (!this.dragging) {
        this.toggleShelf();
        return;
      }
      this.dragging = false;
      this.el.removeClass('is-dragging');
      this.removeGhost();
      const s = this.plugin.settings;
      if (target) {
        s.watchAnchor = { group: target.id, corner: target.corner };
        s.watchPos = null;
      } else {
        const freeX = window.innerWidth - r.width;
        const freeY = window.innerHeight - r.height;
        s.watchAnchor = null;
        s.watchPos = { fx: freeX > 0 ? left / freeX : 0, fy: freeY > 0 ? top / freeY : 0 };
      }
      this.plugin.saveSettings();
      this.place();
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
    if (!this.plugin.settings.showWatch || this.el.hasClass('is-tucked')) {
      s.style.left = `${W - sw - 16}px`;
      s.style.top = `${clamp(48, gap, H - sh - gap)}px`;
      s.setAttr('data-side', 'below');
      return;
    }
    const w = this.el.getBoundingClientRect();
    const below = w.top + w.height / 2 < H / 2;
    const onRight = w.left + w.width / 2 > W / 2;
    let top = clamp(below ? w.bottom + gap : w.top - gap - sh, gap, H - sh - gap);
    let left = onRight ? w.right - sw : w.left;
    let side = below ? 'below' : 'above';
    // Not enough room above or below: open beside the watch instead of covering it.
    if (below ? top < w.bottom + gap : top + sh > w.top - gap) {
      top = clamp(below ? w.top : w.bottom - sh, gap, H - sh - gap);
      left = onRight ? w.left - gap - sw : w.right + gap;
      side = onRight ? 'left' : 'right';
    }
    s.style.top = `${top}px`;
    s.style.left = `${clamp(left, gap, W - sw - gap)}px`;
    s.setAttr('data-side', side);
  }
}

function rotate(g, angle) {
  setIfChanged(g, 'transform', `translate(100 100) rotate(${angle.toFixed(2)})`);
}

function setIfChanged(el, name, value) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

// Everything on the shelf: today, the calendar, the selected day, the stats and the watch options.
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
    const scroll = el.scrollTop;
    el.empty();
    this.lastRender = Date.now();
    this.renderedDay = dayKey(new Date());

    this.renderToday(el.createDiv('pocket-watch-section'));
    this.renderCalendar(el.createDiv('pocket-watch-section'));
    this.renderDay(el.createDiv('pocket-watch-section'));
    this.renderStats(el.createDiv('pocket-watch-section'));
    this.renderWatchOptions(el.createDiv('pocket-watch-section'));
    el.scrollTop = scroll;
    this.refreshLive();
    if (this.onRender) this.onRender();
  }

  renderToday(el) {
    const p = this.plugin;
    this.headEl = el.createDiv('pocket-watch-head');
    const left = this.headEl.createDiv();
    left.createDiv({ cls: 'pocket-watch-label', text: 'In Obsidian today' });
    this.clockEl = left.createDiv('pocket-watch-clock');
    const row = left.createDiv('pocket-watch-state-row');
    row.createSpan('pocket-watch-dot');
    this.stateEl = row.createSpan('pocket-watch-state');
    this.pauseBtn = this.headEl.createEl('button');
    this.pauseBtn.addEventListener('click', () => p.togglePause());

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

  renderWatchOptions(el) {
    const p = this.plugin;
    el.createEl('h4', { text: 'Watch' });
    new Setting(el).setName('Face').addDropdown((d) => {
      for (const [k, v] of Object.entries(FACES)) d.addOption(k, v);
      d.setValue(p.settings.face).onChange((v) => p.updateWatch({ face: v }));
    });
    new Setting(el).setName('Hands').addDropdown((d) => {
      for (const [k, v] of Object.entries(HANDS)) d.addOption(k, v);
      d.setValue(p.settings.hands).onChange((v) => p.updateWatch({ hands: v }));
    });
    el.createDiv({ cls: 'pocket-watch-compare', text: 'Date, moon phase, seconds and size are in the plugin settings.' });
  }
}

class PocketWatchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const p = this.plugin;
    const s = p.settings;
    const el = this.containerEl;
    el.empty();

    new Setting(el).setName('Watch').setHeading();

    new Setting(el)
      .setName('Show watch')
      .setDesc('Drag it onto any pane and it snaps to the nearest corner. Hold Alt while dropping to place it freely. Click it to open the stats shelf.')
      .addToggle((t) => t.setValue(s.showWatch).onChange((v) => p.updateWatch({ showWatch: v })));

    new Setting(el)
      .setName('Face')
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(FACES)) d.addOption(k, v);
        d.setValue(s.face).onChange((v) => p.updateWatch({ face: v }));
      });

    new Setting(el)
      .setName('Hands')
      .setDesc('Not used by the digital face.')
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(HANDS)) d.addOption(k, v);
        d.setValue(s.hands).onChange((v) => p.updateWatch({ hands: v }));
      });

    new Setting(el)
      .setName('Size')
      .addSlider((sl) => sl
        .setLimits(64, 180, 4)
        .setValue(s.watchSize)
        .setDynamicTooltip()
        .onChange((v) => p.updateWatch({ watchSize: v })));

    new Setting(el)
      .setName('Date')
      .addToggle((t) => t.setValue(s.showDate).onChange((v) => p.updateWatch({ showDate: v })));

    new Setting(el)
      .setName('Moon phase')
      .addToggle((t) => t.setValue(s.showMoon).onChange((v) => p.updateWatch({ showMoon: v })));

    new Setting(el)
      .setName('Seconds hand')
      .addToggle((t) => t.setValue(s.showSeconds).onChange((v) => p.updateWatch({ showSeconds: v })));

    new Setting(el)
      .setName("Today's time")
      .setDesc('Shows your time in Obsidian today on the dial, and a ring on the bezel that fills up toward your daily goal.')
      .addToggle((t) => t.setValue(s.showFocus).onChange((v) => p.updateWatch({ showFocus: v })));

    new Setting(el)
      .setName('Daily goal (minutes)')
      .addSlider((sl) => sl
        .setLimits(15, 480, 15)
        .setValue(s.dailyGoalMinutes)
        .setDynamicTooltip()
        .onChange((v) => p.updateWatch({ dailyGoalMinutes: v })));

    new Setting(el)
      .setName('Reset watch position')
      .setDesc('Snap the watch back to the bottom right corner of the note you are working in.')
      .addButton((b) => b.setButtonText('Reset').onClick(() => p.updateWatch({ watchAnchor: null, watchPos: null })));

    new Setting(el).setName('Tracking').setHeading();

    new Setting(el)
      .setName('Idle limit (minutes)')
      .setDesc('The timer stops when there is no typing, clicking, scrolling or mouse movement for this long.')
      .addSlider((sl) => sl
        .setLimits(1, 120, 1)
        .setValue(s.idleMinutes)
        .setDynamicTooltip()
        .onChange(async (v) => {
          s.idleMinutes = v;
          await p.saveSettings();
        }));

    new Setting(el)
      .setName('Remove idle time')
      .setDesc('When the timer goes idle, take back the minutes you spent without activity before it stopped.')
      .addToggle((t) => t.setValue(s.discardIdleTime).onChange(async (v) => {
        s.discardIdleTime = v;
        await p.saveSettings();
      }));

    new Setting(el)
      .setName('Only count while Obsidian is focused')
      .setDesc('Pause the timer when another app is in front.')
      .addToggle((t) => t.setValue(s.onlyWhenFocused).onChange(async (v) => {
        s.onlyWhenFocused = v;
        await p.saveSettings();
      }));

    new Setting(el)
      .setName('Week starts on Monday')
      .addToggle((t) => t.setValue(s.weekStartsMonday).onChange(async (v) => {
        s.weekStartsMonday = v;
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
