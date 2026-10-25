'use strict';

const { Plugin, ItemView, PluginSettingTab, Setting, MarkdownView, Notice } = require('obsidian');

const VIEW_TYPE = 'inkwatch-view';

const DEFAULT_SETTINGS = {
  idleMinutes: 30,
  onlyWhenFocused: true,
  discardIdleTime: false,
  weekStartsMonday: true,
};

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

function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function fmtShort(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtNum(n) {
  return n.toLocaleString();
}

const EMPTY_DAY = Object.freeze({ ms: 0, written: 0, deleted: 0 });

const STATE_LABELS = {
  tracking: 'Tracking',
  idle: 'Idle: type, click or scroll to resume',
  away: 'Paused while Obsidian is in the background',
  paused: 'Paused',
};

module.exports = class InkwatchPlugin extends Plugin {
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

    this.registerView(VIEW_TYPE, (leaf) => new InkwatchView(leaf, this));
    this.addRibbonIcon('clock', 'Open Inkwatch', () => this.openView());
    this.addSettingTab(new InkwatchSettingTab(this.app, this));

    this.addCommand({ id: 'open', name: 'Open time and stats', callback: () => this.openView() });
    this.addCommand({ id: 'toggle-pause', name: 'Pause or resume the timer', callback: () => this.togglePause() });

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass('inkwatch-status', 'mod-clickable');
    this.registerDomEvent(this.statusEl, 'click', () => this.openView());

    this.watchWindow(window);
    this.registerEvent(this.app.workspace.on('window-open', (_w, win) => this.watchWindow(win)));

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
    this.app.workspace.onLayoutReady(() => {
      for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
        if (leaf.view instanceof MarkdownView) this.seedWordCount(leaf.view.file);
      }
    });

    this.registerInterval(window.setInterval(() => this.tick(), 1000));
    this.registerInterval(window.setInterval(() => this.flush(), 30 * 1000));
    this.tick();
  }

  onunload() {
    for (const t of this.pendingCounts.values()) window.clearTimeout(t);
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

    this.updateStatusBar();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof InkwatchView) leaf.view.refreshLive();
    }
  }

  updateStatusBar() {
    this.statusEl.setText(`⏱ ${fmtClock(this.getDay(dayKey(new Date())).ms)}`);
    this.statusEl.setAttr('data-state', this.state);
    this.statusEl.setAttr('aria-label', `Inkwatch: ${STATE_LABELS[this.state]}. Click for stats.`);
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.markActive();
    new Notice(this.paused ? 'Inkwatch paused' : 'Inkwatch resumed');
    this.tick();
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
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof InkwatchView) leaf.view.render();
    }
  }

  async openView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false) || workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
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

class InkwatchView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    const t = new Date();
    this.month = new Date(t.getFullYear(), t.getMonth(), 1);
    this.selected = dayKey(t);
    this.renderedDay = this.selected;
    this.lastRender = 0;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return 'Inkwatch';
  }

  getIcon() {
    return 'clock';
  }

  async onOpen() {
    this.render();
  }

  // Called every second. Only the clock updates each second; the rest redraws every 15 seconds.
  refreshLive() {
    if (!this.clockEl) return;
    const today = dayKey(new Date());
    if (today !== this.renderedDay) {
      // Midnight passed: follow the new day if you were looking at today.
      if (this.selected === this.renderedDay) this.selected = today;
      this.render();
      return;
    }
    if (Date.now() - this.lastRender > 15000) {
      this.render();
      return;
    }
    this.clockEl.setText(fmtClock(this.plugin.getDay(today).ms));
    this.stateEl.setText(STATE_LABELS[this.plugin.state]);
    this.watchEl.setAttr('data-state', this.plugin.state);
    this.pauseBtn.setText(this.plugin.paused ? 'Resume' : 'Pause');
  }

  render() {
    const el = this.contentEl;
    el.empty();
    el.addClass('inkwatch-view');
    this.lastRender = Date.now();
    this.renderedDay = dayKey(new Date());

    this.renderWatch(el.createDiv('inkwatch-section'));
    this.renderCalendar(el.createDiv('inkwatch-section'));
    this.renderDay(el.createDiv('inkwatch-section'));
    this.renderStats(el.createDiv('inkwatch-section'));
    this.refreshLive();
  }

  renderWatch(el) {
    const p = this.plugin;
    this.watchEl = el.createDiv('inkwatch-watch');
    this.watchEl.createDiv({ cls: 'inkwatch-label', text: 'Today' });
    this.clockEl = this.watchEl.createDiv('inkwatch-clock');
    const row = this.watchEl.createDiv('inkwatch-state-row');
    row.createSpan('inkwatch-dot');
    this.stateEl = row.createSpan('inkwatch-state');
    this.pauseBtn = this.watchEl.createEl('button', { cls: 'inkwatch-pause' });
    this.pauseBtn.addEventListener('click', () => p.togglePause());

    new Setting(el)
      .setName('Idle limit')
      .setDesc(`Timer stops after ${p.settings.idleMinutes} min with no activity`)
      .addSlider((s) => s
        .setLimits(1, 120, 1)
        .setValue(p.settings.idleMinutes)
        .setDynamicTooltip()
        .onChange(async (v) => {
          p.settings.idleMinutes = v;
          await p.saveSettings();
          this.render();
        }));
  }

  renderCalendar(el) {
    const p = this.plugin;
    const y = this.month.getFullYear();
    const m = this.month.getMonth();

    const head = el.createDiv('inkwatch-cal-head');
    const prev = head.createEl('button', { text: '‹', cls: 'inkwatch-nav', attr: { 'aria-label': 'Previous month' } });
    head.createDiv({
      cls: 'inkwatch-month',
      text: this.month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    });
    const next = head.createEl('button', { text: '›', cls: 'inkwatch-nav', attr: { 'aria-label': 'Next month' } });
    prev.addEventListener('click', () => {
      this.month = new Date(y, m - 1, 1);
      this.render();
    });
    next.addEventListener('click', () => {
      this.month = new Date(y, m + 1, 1);
      this.render();
    });

    const grid = el.createDiv('inkwatch-cal');
    const mon = p.settings.weekStartsMonday;
    const names = mon ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    for (const n of names) grid.createDiv({ cls: 'inkwatch-wd', text: n });

    const offset = (new Date(y, m, 1).getDay() - (mon ? 1 : 0) + 7) % 7;
    for (let i = 0; i < offset; i++) grid.createDiv('inkwatch-cell is-blank');

    const todayKey = dayKey(new Date());
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayKey(new Date(y, m, d));
      const ms = p.getDay(key).ms;
      const level = ms === 0 ? 0 : ms < 30 * 60000 ? 1 : ms < 90 * 60000 ? 2 : ms < 180 * 60000 ? 3 : 4;
      const cell = grid.createDiv(`inkwatch-cell inkwatch-l${level}`);
      if (key === todayKey) cell.addClass('is-today');
      if (key === this.selected) cell.addClass('is-selected');
      cell.createDiv({ cls: 'inkwatch-daynum', text: String(d) });
      if (ms >= 60000) cell.createDiv({ cls: 'inkwatch-daytime', text: fmtShort(ms) });
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

    const rows = el.createDiv('inkwatch-rows');
    const row = (label, value) => {
      const r = rows.createDiv('inkwatch-row');
      r.createSpan({ text: label });
      r.createSpan({ cls: 'inkwatch-val', text: value });
    };
    row('Time', fmtShort(d.ms));
    row('Words written', fmtNum(d.written));
    row('Words deleted', fmtNum(d.deleted));
    const net = d.written - d.deleted;
    row('Net words', `${net > 0 ? '+' : ''}${fmtNum(net)}`);

    if (this.selected !== todayKey) {
      const t = p.getDay(todayKey).ms;
      const diff = t - d.ms;
      const text = diff === 0
        ? 'Same time as today'
        : diff > 0
          ? `Today you've done ${fmtShort(diff)} more (${fmtShort(t)})`
          : `Today you've done ${fmtShort(-diff)} less (${fmtShort(t)})`;
      el.createDiv({ cls: 'inkwatch-compare', text });
    }
  }

  renderStats(el) {
    const p = this.plugin;
    const s = p.stats();
    const week = p.sumLastDays(7);
    const month = p.sumLastDays(30);
    el.createEl('h4', { text: 'Stats' });

    const tiles = el.createDiv('inkwatch-tiles');
    const tile = (label, value, sub) => {
      const t = tiles.createDiv('inkwatch-tile');
      t.createDiv({ cls: 'inkwatch-tile-val', text: value });
      t.createDiv({ cls: 'inkwatch-tile-label', text: label });
      if (sub) t.createDiv({ cls: 'inkwatch-tile-sub', text: sub });
    };
    tile('Last 7 days', fmtShort(week.ms), `${fmtNum(week.written)} words`);
    tile('Last 30 days', fmtShort(month.ms), `${fmtNum(month.written)} words`);
    tile('All time', fmtShort(s.ms), `${s.activeDays} active days`);
    tile('Daily average', fmtShort(s.activeDays ? s.ms / s.activeDays : 0), 'on active days');
    tile('Streak', `${s.streak} ${s.streak === 1 ? 'day' : 'days'}`, 'at least 1 min a day');
    tile('Best day', fmtShort(s.bestMs), s.bestKey || '');
    tile('Words written', fmtNum(s.written), 'all time');
    tile('Words deleted', fmtNum(s.deleted), 'all time');

    el.createDiv({ cls: 'inkwatch-label', text: 'Last 14 days' });
    const bars = el.createDiv('inkwatch-bars');
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = daysAgo(i);
      days.push({ date, ms: p.getDay(dayKey(date)).ms });
    }
    const max = Math.max(1, ...days.map((x) => x.ms));
    for (const { date, ms } of days) {
      const col = bars.createDiv('inkwatch-bar-col');
      col.setAttr('aria-label', `${dayKey(date)}: ${fmtShort(ms)}`);
      const track = col.createDiv('inkwatch-bar-track');
      track.createDiv('inkwatch-bar').style.height = `${(ms / max) * 100}%`;
      col.createDiv({ cls: 'inkwatch-bar-day', text: String(date.getDate()) });
    }
  }
}

class InkwatchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const p = this.plugin;
    const el = this.containerEl;
    el.empty();

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
        if (window.confirm('Delete all Inkwatch time and word stats?')) {
          await p.resetData();
          new Notice('Inkwatch data reset');
        }
      }));
  }
}
