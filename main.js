'use strict';

const { Plugin, PluginSettingTab, Setting, MarkdownView, Notice } = require('obsidian');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// Each analog face picks a case, its own hour markers and an optional decoration.
// Its colours live in styles.css under .pocket-watch-face-<key>.
const ANALOG_FACES = {
  porcelain: { name: 'Porcelain', case: 'polished', markers: 'batons', decor: 'minute-dots' },
  linen: { name: 'Linen', case: 'polished', markers: 'roman', decor: 'railroad' },
  slate: { name: 'Slate', case: 'polished', markers: 'quarters', decor: null },
  midnight: { name: 'Midnight', case: 'polished', markers: 'dots', decor: 'stars' },
  skeleton: { name: 'Skeleton', case: 'polished', markers: 'batons', decor: 'skeleton' },
  bauhaus: { name: 'Bauhaus', case: 'thin', markers: 'arabic', decor: 'minute-ticks' },
  void: { name: 'Void', case: 'thin', markers: 'minimal', decor: null },
  field: { name: 'Field', case: 'polished', markers: 'arabic', decor: 'inner-24' },
  sector: { name: 'Sector', case: 'polished', markers: 'arabic', decor: 'sector' },
  diver: { name: 'Diver', case: 'dive', markers: 'lume', decor: null },
  rose: { name: 'Rosé', case: 'polished', markers: 'batons', decor: 'minute-ticks' },
  theme: { name: 'Match theme', case: 'thin', markers: 'batons', decor: 'minute-dots' },
};

const MARKERS = {
  face: "Face's own",
  batons: 'Batons',
  arabic: 'Numerals',
  quarters: '12, 3, 6 and 9',
  roman: 'Roman numerals',
  dots: 'Dots',
  lume: 'Diver',
  minimal: 'A single dot',
  none: 'None',
};

const HANDS = {
  leaf: 'Leaf',
  baton: 'Baton',
  breguet: 'Breguet',
  dauphine: 'Dauphine',
  sword: 'Sword',
  pencil: 'Pencil',
  arrow: 'Arrow',
};

const SECONDS = { off: 'Off', tick: 'Ticking', sweep: 'Sweeping' };

const COMPLICATIONS = {
  none: 'Nothing',
  date: 'Date',
  'weekday-date': 'Weekday and date',
  month: 'Month',
  moon: 'Moon phase',
  focus: "Today's time",
  words: "Today's words",
  streak: 'Streak',
  goal: 'Goal dial',
  seconds: 'Small seconds',
};

// The four places on the dial that can hold a complication, and the hour they sit at.
const SLOTS = [
  { key: 'slotTop', name: "12 o'clock", hour: 0 },
  { key: 'slotRight', name: "3 o'clock", hour: 3 },
  { key: 'slotBottom', name: "6 o'clock", hour: 6 },
  { key: 'slotLeft', name: "9 o'clock", hour: 9 },
];

const DIGITAL_STYLES = {
  slate: 'Slate',
  lcd: 'LCD',
  nixie: 'Nixie',
  flip: 'Flip',
  eink: 'E-ink',
  theme: 'Match theme',
};

const DIGITAL_LAYOUTS = { wide: 'Wide', slim: 'Slim', tall: 'Tall', compact: 'Compact' };

const CLOCKS = { system: 'Follow system', 12: '12-hour', 24: '24-hour' };

const DEFAULT_SETTINGS = {
  idleMinutes: 30,
  onlyWhenFocused: true,
  discardIdleTime: false,
  weekStartsMonday: true,
  dailyGoalMinutes: 120,

  showWatch: true,
  watchType: 'analog',
  watchSize: 120,

  face: 'porcelain',
  markers: 'face',
  hands: 'leaf',
  seconds: 'off',
  slotTop: 'none',
  slotRight: 'weekday-date',
  slotBottom: 'moon',
  slotLeft: 'none',
  goalRing: true,
  motion: true,

  digitalStyle: 'slate',
  digitalLayout: 'wide',
  clock: 'system',
  digitalSeconds: false,
  blinkColon: false,
  digitalDate: true,
  digitalMoon: true,
  digitalFocus: true,
  digitalBar: true,

  // Where the watch is snapped: { group, spot } for a pane, or { window: true, spot }.
  // A spot is a row (t, m, b) and a column (l, c, r), such as "br" for bottom right.
  watchAnchor: null,
  // Where the watch sits when dropped freely (Alt), as fractions of the free space
  // to its left and above it, so it keeps its spot when the window is resized.
  watchPos: null,
};

const DEFAULT_WATCH_POS = { fx: 0.97, fy: 0.9 };
const SNAP_INSET = 14;
const SPOTS = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'];
const MIN_SIZE = 64;
const MAX_SIZE = 260;

// A day counts toward the streak and "active days" once it has at least a minute.
const ACTIVE_DAY_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function pad2(n) {
  return String(n).padStart(2, '0');
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

function uses24h(clock) {
  if (clock === '24') return true;
  if (clock === '12') return false;
  const cycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h23' || cycle === 'h24';
}

function fmtTime(date, h24) {
  const h = date.getHours();
  const mm = pad2(date.getMinutes());
  return h24 ? `${pad2(h)}:${mm}` : `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
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

function circlePath(cx, cy, r) {
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

// A toothed wheel with a centre hole and five windows, drawn with the even-odd rule.
function gearPath(cx, cy, r, teeth) {
  const inner = r - 2.6;
  const step = (2 * Math.PI) / teeth;
  const at = (rr, a) => `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(at(inner, a), at(r, a + step * 0.2), at(r, a + step * 0.5), at(inner, a + step * 0.7));
  }
  let d = `M ${pts.join(' L ')} Z ${circlePath(cx, cy, r * 0.14)}`;
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5;
    d += ` ${circlePath(cx + r * 0.52 * Math.cos(a), cy + r * 0.52 * Math.sin(a), r * 0.2)}`;
  }
  return d;
}

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

const EMPTY_DAY = Object.freeze({ ms: 0, written: 0, deleted: 0 });

const STATE_LABELS = {
  tracking: 'Tracking',
  idle: 'Idle: type, click or scroll to resume',
  away: 'Paused while Obsidian is in the background',
  paused: 'Paused',
};

// Settings saved by earlier versions, turned into today's options.
function migrateSettings(s) {
  if (!s) return {};
  if (s.face === 'digital') {
    s.watchType = 'digital';
    s.face = 'porcelain';
  }
  if ('showSeconds' in s) s.seconds = s.showSeconds ? 'tick' : 'off';
  if ('showDate' in s) s.slotRight = s.showDate ? 'weekday-date' : 'none';
  if ('showMoon' in s) s.slotBottom = s.showMoon ? 'moon' : 'none';
  if ('showFocus' in s) s.goalRing = s.showFocus;
  for (const k of ['showSeconds', 'showDate', 'showMoon', 'showFocus', 'watchStyle']) delete s[k];
  if (s.watchAnchor && s.watchAnchor.corner) {
    s.watchAnchor = { group: s.watchAnchor.group, spot: s.watchAnchor.corner };
  }
  return s;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

module.exports = class PocketWatchPlugin extends Plugin {
  async onload() {
    const saved = (await this.loadData()) || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, migrateSettings(saved.settings));
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
    this.addCommand({
      id: 'toggle-type',
      name: 'Switch between analog and digital',
      callback: () => this.updateWatch({ watchType: this.settings.watchType === 'digital' ? 'analog' : 'digital' }),
    });

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

  streak() {
    // Today not counting yet shouldn't break a streak that ran through yesterday.
    let i = this.getDay(dayKey(daysAgo(0))).ms >= ACTIVE_DAY_MS ? 0 : 1;
    let n = 0;
    while (this.getDay(dayKey(daysAgo(i))).ms >= ACTIVE_DAY_MS) {
      n++;
      i++;
    }
    return n;
  }

  stats() {
    const s = { ms: 0, written: 0, deleted: 0, activeDays: 0, bestKey: null, bestMs: 0, streak: this.streak() };
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
    return s;
  }
};

// ---------------------------------------------------------------------------
// The watch
// ---------------------------------------------------------------------------

// The watch that sits on top of your panes. It shows the time of day; your time in
// Obsidian today can sit on the bezel and in the dial's complications. Drag it onto a
// pane and it snaps to the nearest corner or edge; drag its handle to resize it; click
// it to open the shelf.
class FloatingWatch {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.shelfEl = null;
    this.dashboard = null;
    this.ghostEl = null;
    this.dragging = false;
    this.resizing = false;
    this.built = '';
    this.parts = {};
    this.anchorEl = null;
    this.anchorId = null;
    this.el = document.body.createDiv('pocket-watch-float');
    this.faceEl = this.el.createDiv('pocket-watch-face');
    this.gripEl = this.el.createDiv({ cls: 'pocket-watch-grip', attr: { 'aria-label': 'Drag to resize' } });
    this.el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.gripEl.addEventListener('pointerdown', (e) => this.onResizeStart(e));
    this.el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    // Place it again whenever its size changes: when the plugin's styles arrive, or the face changes.
    this.resizeObserver = new ResizeObserver(() => this.place());
    this.resizeObserver.observe(this.el);
    this.applySettings();
  }

  destroy() {
    this.resizeObserver.disconnect();
    window.clearTimeout(this.saveTimer);
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
  // otherwise just the hands and the live readings move.
  refresh() {
    const s = this.plugin.settings;
    const now = new Date();
    const key = JSON.stringify([
      s.watchType, s.watchSize, s.face, s.markers, s.hands, s.seconds, s.slotTop, s.slotRight, s.slotBottom, s.slotLeft,
      s.goalRing, s.motion, s.digitalStyle, s.digitalLayout, s.clock, s.digitalSeconds, s.blinkColon,
      s.digitalDate, s.digitalMoon, s.digitalFocus, s.digitalBar, dayKey(now),
    ]);
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
    this.parts = { live: [] };
    this.h24 = uses24h(s.clock);
    this.el.setAttr('data-type', s.watchType);
    if (s.watchType === 'digital') this.buildDigital(now);
    else this.buildAnalog(now);
  }

  update(now) {
    const p = this.plugin;
    const s = p.settings;
    const day = p.getDay(dayKey(now));
    const parts = this.parts;
    const h = now.getHours();
    const m = now.getMinutes();
    const sec = now.getSeconds();
    const goal = Math.min(1, day.ms / (Math.max(1, s.dailyGoalMinutes) * 60000));

    this.el.setAttr('data-state', p.state);
    const label = [
      fmtTime(now, this.h24),
      now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      moonName(moonPhase(now)),
      `${fmtShort(day.ms)} in Obsidian today (${STATE_LABELS[p.state].toLowerCase()})`,
    ].join('\n');
    if (this.el.getAttribute('aria-label') !== label) this.el.setAttr('aria-label', label);

    if (parts.hour) {
      turn(parts.hour, ((h % 12) + m / 60) * 30);
      turn(parts.minute, m * 6 + sec * 0.1);
      if (parts.second && s.seconds === 'tick') turn(parts.second, sec * 6);
      if (parts.ring) setIfChanged(parts.ring, 'stroke-dasharray', `${(goal * 100).toFixed(2)} 100`);
    }
    for (const live of parts.live) {
      if (live.type === 'focus') setText(live.el, fmtShort(day.ms));
      else if (live.type === 'words') setText(live.el, fmtNum(day.written));
      else if (live.type === 'streak') setText(live.el, `${p.streak()}d`);
      else if (live.type === 'goal') setIfChanged(live.el, 'stroke-dasharray', `${(goal * 100).toFixed(2)} 100`);
      else if (live.type === 'subsec' && s.seconds !== 'sweep') turn(live.el, sec * 6);
    }

    const d = parts.digital;
    if (d) {
      setDigits(d.hh, this.h24 ? pad2(h) : String(h % 12 || 12));
      setDigits(d.mm, pad2(m));
      if (d.ss) setDigits(d.ss, pad2(sec));
      if (d.ampm) setText(d.ampm, h < 12 ? 'AM' : 'PM');
    }
    if (parts.focusText) setText(parts.focusText, fmtShort(day.ms));
    if (parts.fill) parts.fill.style.width = `${goal * 100}%`;
  }

  // --- Analog -------------------------------------------------------------

  buildAnalog(now) {
    const s = this.plugin.settings;
    const faceKey = ANALOG_FACES[s.face] ? s.face : 'porcelain';
    const face = ANALOG_FACES[faceKey];
    const R = face.case === 'thin' ? 95 : face.case === 'dive' ? 80 : 89.5;
    const k = R / 89.5;
    const used = {};
    for (const slot of SLOTS) used[slot.hour] = s[slot.key] !== 'none';

    const svg = this.faceEl.createSvg('svg', {
      attr: { viewBox: '0 0 200 200', width: s.watchSize, height: s.watchSize },
      cls: ['pocket-watch-svg', `pocket-watch-face-${faceKey}`, `pw-case-${face.case}`],
    });
    if (s.motion) svg.addClass('pw-motion');
    const add = (parent, tag, attr, cls) => parent.createSvg(tag, { attr, cls });
    const text = (parent, x, y, size, value, cls) => {
      const t = add(parent, 'text', { x, y, 'font-size': size }, cls);
      t.textContent = value;
      return t;
    };

    const defs = add(svg, 'defs');
    const bezel = add(defs, 'linearGradient', { id: 'pocket-watch-bezel', x1: 0, y1: 0, x2: 1, y2: 1 });
    add(bezel, 'stop', { offset: '0%' }, 'pw-bezel-a');
    add(bezel, 'stop', { offset: '55%' }, 'pw-bezel-b');
    add(bezel, 'stop', { offset: '100%' }, 'pw-bezel-c');
    const dial = add(defs, 'radialGradient', { id: 'pocket-watch-dial', cx: '50%', cy: '40%', r: '62%' });
    add(dial, 'stop', { offset: '0%' }, 'pw-dial-a');
    add(dial, 'stop', { offset: '100%' }, 'pw-dial-b');

    // Case
    add(svg, 'circle', { cx: 100, cy: 100, r: 99, fill: 'url(#pocket-watch-bezel)' }, 'pw-bezel');
    if (face.case === 'dive') this.drawDiveBezel(svg, add, text);
    if (s.goalRing) {
      const [ringR, ringW] = face.case === 'thin' ? [97, 2] : face.case === 'dive' ? [81.2, 2] : [94.3, 3];
      add(svg, 'circle', { cx: 100, cy: 100, r: ringR, 'stroke-width': ringW }, 'pw-ring-track');
      this.parts.ring = add(svg, 'circle', {
        cx: 100, cy: 100, r: ringR, 'stroke-width': ringW, pathLength: 100, transform: 'rotate(-90 100 100)', 'stroke-dasharray': '0 100',
      }, 'pw-ring');
    }
    add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: 'url(#pocket-watch-dial)' }, 'pw-dial');

    // Dial
    if (face.decor) this.drawDecor(svg, add, text, face.decor, R, k, used);
    const markers = s.markers === 'face' || !MARKERS[s.markers] ? face.markers : s.markers;
    this.drawMarkers(svg, add, text, markers, R, k, used);

    for (const slot of SLOTS) {
      const type = s[slot.key];
      if (!type || type === 'none' || !COMPLICATIONS[type]) continue;
      const [cx, cy] = polar(R * 0.47, slot.hour * 30);
      this.drawComplication(svg, add, text, type, cx, cy, k, now);
    }

    // Hands
    const hands = add(svg, 'g', {}, 'pw-hands');
    const hand = (kind) => {
      const turnEl = add(hands, 'g', {}, 'pw-turn');
      const body = add(turnEl, 'g', { transform: 'translate(100 100)' }, kind === 'second' ? 'pw-second' : 'pw-hand');
      return [turnEl, body];
    };
    const style = HANDS[s.hands] ? s.hands : 'leaf';
    let body;
    [this.parts.hour, body] = hand('hour');
    this.drawHand(body, add, style, R * 0.52, k, true);
    [this.parts.minute, body] = hand('minute');
    this.drawHand(body, add, style, R * 0.8, k, false);
    if (s.seconds !== 'off') {
      [this.parts.second, body] = hand('second');
      add(body, 'line', { x1: 0, y1: 18 * k, x2: 0, y2: -R * 0.88 });
      add(body, 'circle', { cx: 0, cy: 13 * k, r: 2.6 * k });
      add(body, 'circle', { cx: 0, cy: 0, r: 2.6 * k });
      if (s.seconds === 'sweep') sweep(this.parts.second, now);
    }
    add(svg, 'circle', { cx: 100, cy: 100, r: 4.6 * k }, 'pw-cap');
    add(svg, 'circle', { cx: 100, cy: 100, r: 1.6 * k }, 'pw-cap-dot');
  }

  // A rotating diver's bezel: a dark insert with a 60 minute scale and a marker at 12.
  drawDiveBezel(svg, add, text) {
    add(svg, 'circle', { cx: 100, cy: 100, r: 89.6, 'stroke-width': 15.6 }, 'pw-insert');
    for (let i = 0; i < 60; i++) {
      if (i % 10 === 0) continue;
      const [x1, y1] = polar(96, i * 6);
      const [x2, y2] = polar(i < 15 || i % 5 === 0 ? 91.5 : 94, i * 6);
      add(svg, 'line', { x1, y1, x2, y2 }, i % 5 === 0 ? ['pw-insert-tick', 'is-major'] : 'pw-insert-tick');
    }
    for (const n of [10, 20, 30, 40, 50]) {
      const [x, y] = polar(89.4, n * 6);
      text(svg, x, y, 9.5, String(n), 'pw-insert-num');
    }
    add(svg, 'path', { d: 'M 94 4.4 L 106 4.4 L 100 15.6 Z' }, 'pw-insert-pip');
    add(svg, 'circle', { cx: 100, cy: 8.6, r: 1.7 }, 'pw-insert-pearl');
  }

  drawDecor(svg, add, text, decor, R, k, used) {
    if (decor === 'minute-dots') {
      for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue;
        const [x, y] = polar(R - 6.5, i * 6);
        add(svg, 'circle', { cx: x, cy: y, r: 0.9 }, 'pw-minute-dot');
      }
    } else if (decor === 'minute-ticks') {
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 2.5, i * 6);
        const [x2, y2] = polar(R - (i % 5 ? 6 : 8), i * 6);
        add(svg, 'line', { x1, y1, x2, y2 }, 'pw-tick');
      }
    } else if (decor === 'railroad') {
      add(svg, 'circle', { cx: 100, cy: 100, r: R - 3.5 }, 'pw-track');
      add(svg, 'circle', { cx: 100, cy: 100, r: R - 8.5 }, 'pw-track');
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 3.5, i * 6);
        const [x2, y2] = polar(R - 8.5, i * 6);
        add(svg, 'line', { x1, y1, x2, y2 }, i % 5 ? 'pw-tick' : ['pw-tick', 'is-hour']);
      }
    } else if (decor === 'stars') {
      let seed = 11;
      const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 36; i++) {
        const [x, y] = polar(18 + rand() * (R - 28), rand() * 360);
        add(svg, 'circle', { cx: x, cy: y, r: 0.35 + rand() * 0.75, opacity: 0.2 + rand() * 0.6 }, 'pw-star');
      }
      add(svg, 'circle', { cx: 100, cy: 100, r: R - 5 }, 'pw-track');
    } else if (decor === 'sector') {
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.63, 'stroke-width': R * 0.2 }, 'pw-sector-band');
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.42 }, 'pw-sector-line');
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.84 }, 'pw-sector-line');
      add(svg, 'line', { x1: 100, y1: 100 - R * 0.84, x2: 100, y2: 100 + R * 0.84 }, 'pw-sector-line');
      add(svg, 'line', { x1: 100 - R * 0.84, y1: 100, x2: 100 + R * 0.84, y2: 100 }, 'pw-sector-line');
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 2.5, i * 6);
        const [x2, y2] = polar(R - (i % 5 ? 5.5 : 8), i * 6);
        add(svg, 'line', { x1, y1, x2, y2 }, 'pw-tick');
      }
    } else if (decor === 'inner-24') {
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 2.5, i * 6);
        const [x2, y2] = polar(R - (i % 5 ? 5.5 : 8), i * 6);
        add(svg, 'line', { x1, y1, x2, y2 }, 'pw-tick');
      }
      for (let i = 0; i < 12; i++) {
        if (used[i]) continue;
        const [x, y] = polar(R - 33, i * 30);
        text(svg, x, y, 7.5 * k, String(i === 0 ? 24 : i + 12), 'pw-numeral-24');
      }
    } else if (decor === 'skeleton') {
      this.drawMovement(svg, add, R);
    }
  }

  // The visible movement behind a skeleton dial: wheels, bridges, jewels and a balance wheel.
  drawMovement(svg, add, R) {
    const spin = (el, cx, cy, seconds, reverse) => {
      el.style.transformOrigin = `${cx}px ${cy}px`;
      el.style.animationDuration = `${seconds}s`;
      if (reverse) el.style.animationDirection = 'reverse';
      el.addClass('pw-spin');
    };
    const gears = [
      [127, 125, 23, 30, 48, false],
      [91, 133, 14.5, 19, 30, true],
      [137, 91, 11.5, 15, 24, true],
      [100, 100, 12, 16, 60, false],
    ];
    for (const [cx, cy, r, teeth, secs, rev] of gears) {
      const g = add(svg, 'g', {}, 'pw-gear-wrap');
      add(g, 'path', { d: gearPath(cx, cy, r, teeth), 'fill-rule': 'evenodd' }, 'pw-gear');
      spin(g, cx, cy, secs, rev);
    }
    add(svg, 'rect', { x: 78, y: 118, width: 66, height: 9, rx: 4.5, transform: 'rotate(-14 111 122)' }, 'pw-bridge');
    add(svg, 'rect', { x: 52, y: 64, width: 46, height: 8, rx: 4, transform: 'rotate(32 75 68)' }, 'pw-bridge');
    // Balance wheel with a hairspring, swinging gently.
    const bx = 70;
    const by = 72;
    const balance = add(svg, 'g', {}, 'pw-balance');
    balance.style.transformOrigin = `${bx}px ${by}px`;
    add(balance, 'circle', { cx: bx, cy: by, r: 15 }, 'pw-balance-rim');
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3;
      add(balance, 'line', { x1: bx, y1: by, x2: bx + 15 * Math.cos(a), y2: by + 15 * Math.sin(a) }, 'pw-balance-spoke');
    }
    let spiral = `M ${bx} ${by}`;
    for (let t = 0; t <= 4 * Math.PI; t += 0.3) spiral += ` L ${(bx + 1.6 * t * Math.cos(t)).toFixed(2)} ${(by + 1.6 * t * Math.sin(t)).toFixed(2)}`;
    add(svg, 'path', { d: spiral }, 'pw-hairspring');
    for (const [x, y] of [[127, 125], [91, 133], [137, 91], [bx, by], [62, 58], [139, 117]]) {
      add(svg, 'circle', { cx: x, cy: y, r: 2.3 }, 'pw-jewel');
    }
    for (const [x, y] of [[84, 128], [88, 78]]) {
      add(svg, 'circle', { cx: x, cy: y, r: 2.6 }, 'pw-screw');
      add(svg, 'line', { x1: x - 1.8, y1: y - 1.2, x2: x + 1.8, y2: y + 1.2 }, 'pw-screw-slot');
    }
    // The chapter ring that carries the hour markers.
    add(svg, 'circle', { cx: 100, cy: 100, r: R - 8.5, 'stroke-width': 17 }, 'pw-chapter');
  }

  drawMarkers(svg, add, text, markers, R, k, used) {
    if (markers === 'batons') {
      for (let i = 1; i < 12; i++) {
        const [x1, y1] = polar(R - 5.5, i * 30);
        const [x2, y2] = polar(R - (i % 3 === 0 ? 22 : 17), i * 30);
        add(svg, 'line', { x1, y1, x2, y2 }, i % 3 === 0 ? ['pw-index', 'is-major'] : 'pw-index');
      }
      for (const dx of [-3.6, 3.6]) {
        add(svg, 'line', { x1: 100 + dx * k, y1: 100 - R + 5.5, x2: 100 + dx * k, y2: 100 - R + 22 }, ['pw-index', 'is-major']);
      }
    } else if (markers === 'arabic') {
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(R - 16.5, i * 30);
        text(svg, x, y, 14.5 * k, String(i === 0 ? 12 : i), 'pw-numeral');
      }
    } else if (markers === 'quarters') {
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 4.5, i * 6);
        const [x2, y2] = polar(i % 5 ? R - 8 : R - 13.5, i * 6);
        add(svg, 'line', { x1, y1, x2, y2 }, i % 5 ? 'pw-tick' : ['pw-tick', 'is-hour']);
      }
      for (const i of [0, 3, 6, 9]) {
        if (used[i]) continue;
        const [x, y] = polar(R - 27.5, i * 30);
        text(svg, x, y, 21 * k, String(i === 0 ? 12 : i), 'pw-numeral');
      }
    } else if (markers === 'roman') {
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(R - 18.5, i * 30);
        text(svg, x, y, 12 * k, ROMAN[i], ['pw-numeral', 'is-roman']);
      }
    } else if (markers === 'dots') {
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(R - 12.5, i * 30);
        add(svg, 'circle', { cx: x, cy: y, r: (i === 0 ? 4 : i % 3 === 0 ? 3 : 2.1) * k }, 'pw-dot-index');
      }
    } else if (markers === 'lume') {
      for (let i = 1; i < 12; i++) {
        if (i % 3 === 0) {
          add(svg, 'rect', { x: 100 - 2.6 * k, y: 100 - R + 4, width: 5.2 * k, height: 14 * k, rx: 1, transform: `rotate(${i * 30} 100 100)` }, 'pw-lume');
        } else {
          const [x, y] = polar(R - 9.5 * k, i * 30);
          add(svg, 'circle', { cx: x, cy: y, r: 4.2 * k }, 'pw-lume');
        }
      }
      const top = 100 - R + 4;
      add(svg, 'path', { d: `M ${100 - 7 * k} ${top} L ${100 + 7 * k} ${top} L 100 ${top + 14 * k} Z` }, 'pw-lume');
    } else if (markers === 'minimal') {
      add(svg, 'circle', { cx: 100, cy: 100 - R + 12 * k, r: 3.6 * k }, 'pw-dot-index');
    }
  }

  // Something useful at 12, 3, 6 or 9 o'clock.
  drawComplication(svg, add, text, type, cx, cy, k, now) {
    const live = this.parts.live;
    const windowed = (w, value) => {
      add(svg, 'rect', { x: cx - (w * k) / 2, y: cy - 8.5 * k, width: w * k, height: 17 * k, rx: 2.5 * k }, 'pw-date-bg');
      text(svg, cx, cy + 0.4 * k, 11 * k, value, 'pw-date');
    };
    const reading = (caption, liveType) => {
      const value = text(svg, cx, cy - 2 * k, 11.5 * k, '', 'pw-reading');
      text(svg, cx, cy + 8 * k, 5.6 * k, caption, 'pw-caption');
      live.push({ type: liveType, el: value });
    };
    const subdial = () => {
      add(svg, 'circle', { cx, cy, r: 17 * k }, 'pw-subdial');
      for (let i = 0; i < 12; i++) {
        const [x1, y1] = [cx + 15.5 * k * Math.sin((i * Math.PI) / 6), cy - 15.5 * k * Math.cos((i * Math.PI) / 6)];
        const len = i % 3 === 0 ? 3.4 : 2;
        const [x2, y2] = [cx + (15.5 - len) * k * Math.sin((i * Math.PI) / 6), cy - (15.5 - len) * k * Math.cos((i * Math.PI) / 6)];
        add(svg, 'line', { x1, y1, x2, y2 }, 'pw-subdial-tick');
      }
    };

    if (type === 'date') {
      windowed(22, String(now.getDate()));
    } else if (type === 'weekday-date') {
      const weekday = now.toLocaleDateString(undefined, { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase();
      windowed(44, `${weekday} ${now.getDate()}`);
    } else if (type === 'month') {
      windowed(30, now.toLocaleDateString(undefined, { month: 'short' }).replace('.', '').slice(0, 3).toUpperCase());
    } else if (type === 'moon') {
      add(svg, 'circle', { cx, cy, r: 20.5 * k }, 'pw-moon-frame');
      add(svg, 'circle', { cx, cy, r: 19 * k }, 'pw-moon-sky');
      for (const [x, y, r] of [[-12, -6, 0.7], [11, -9, 0.55], [13, 6, 0.6], [-9, 10, 0.5], [3, -14, 0.45]]) {
        add(svg, 'circle', { cx: cx + x * k, cy: cy + y * k, r: r * k }, 'pw-moon-star');
      }
      add(svg, 'circle', { cx, cy, r: 9.5 * k }, 'pw-moon-dark');
      add(svg, 'path', { d: moonPath(cx, cy, 9.5 * k, moonPhase(now)) }, 'pw-moon-lit');
    } else if (type === 'focus') {
      reading('TODAY', 'focus');
    } else if (type === 'words') {
      reading('WORDS', 'words');
    } else if (type === 'streak') {
      reading('STREAK', 'streak');
    } else if (type === 'goal') {
      add(svg, 'circle', { cx, cy, r: 17 * k }, 'pw-subdial');
      add(svg, 'circle', { cx, cy, r: 12.5 * k }, 'pw-goal-track');
      const arc = add(svg, 'circle', {
        cx, cy, r: 12.5 * k, pathLength: 100, transform: `rotate(-90 ${cx} ${cy})`, 'stroke-dasharray': '0 100',
      }, 'pw-goal-arc');
      live.push({ type: 'goal', el: arc });
      text(svg, cx, cy + 0.5 * k, 5.4 * k, 'GOAL', 'pw-caption');
    } else if (type === 'seconds') {
      subdial();
      const turnEl = add(svg, 'g', {}, 'pw-turn');
      turnEl.style.transformOrigin = `${cx}px ${cy}px`;
      add(turnEl, 'line', { x1: cx, y1: cy + 3 * k, x2: cx, y2: cy - 14 * k }, 'pw-subsec-hand');
      add(svg, 'circle', { cx, cy, r: 1.6 * k }, 'pw-subsec-pin');
      live.push({ type: 'subsec', el: turnEl });
      if (this.plugin.settings.seconds === 'sweep') sweep(turnEl, now);
    }
  }

  // Hands are drawn pointing at 12 around (0, 0) and turned into place by update().
  drawHand(g, add, style, len, k, hour) {
    if (style === 'baton') {
      const w = (hour ? 7.2 : 5.2) * k;
      const tail = (hour ? 10 : 12) * k;
      add(g, 'rect', { x: -w / 2, y: -len, width: w, height: len + tail, rx: w / 2 }, 'pw-hand-body');
      add(g, 'rect', { x: -w / 2 + 1.6 * k, y: -len + 4 * k, width: w - 3.2 * k, height: len * 0.55, rx: (w - 3.2 * k) / 2 }, 'pw-hand-lume');
    } else if (style === 'breguet') {
      const ringY = -len * (hour ? 0.68 : 0.81);
      const ringR = (hour ? 5.6 : 4.4) * k;
      const w = (hour ? 2.8 : 2.2) * k;
      add(g, 'rect', { x: -w / 2, y: ringY + ringR - 0.5, width: w, height: -ringY - ringR + 10.5 * k, rx: w / 2 }, 'pw-hand-body');
      add(g, 'circle', { cx: 0, cy: ringY, r: ringR }, 'pw-hand-ring');
      add(g, 'path', { d: `M ${-w * 0.6} ${ringY - ringR + 0.5} L 0 ${-len} L ${w * 0.6} ${ringY - ringR + 0.5} Z` }, 'pw-hand-body');
    } else if (style === 'dauphine') {
      const w = (hour ? 8 : 6.2) * k;
      const tail = 7 * k;
      add(g, 'path', { d: `M 0 ${tail} L ${-w / 2} ${-len * 0.06} L 0 ${-len} Z` }, 'pw-hand-body');
      add(g, 'path', { d: `M 0 ${tail} L ${w / 2} ${-len * 0.06} L 0 ${-len} Z` }, 'pw-hand-shade');
    } else if (style === 'sword') {
      const w = (hour ? 7.4 : 5.6) * k;
      const tail = 10 * k;
      add(g, 'path', { d: `M ${-w * 0.28} ${tail} L ${-w / 2} ${-len * 0.74} L 0 ${-len} L ${w / 2} ${-len * 0.74} L ${w * 0.28} ${tail} Z` }, 'pw-hand-body');
      add(g, 'path', { d: `M ${-w * 0.14} ${-len * 0.12} L ${-w * 0.27} ${-len * 0.72} L 0 ${-len * 0.88} L ${w * 0.27} ${-len * 0.72} L ${w * 0.14} ${-len * 0.12} Z` }, 'pw-hand-lume');
    } else if (style === 'pencil') {
      const w = (hour ? 3.6 : 2.6) * k;
      const tail = 8 * k;
      add(g, 'path', { d: `M ${-w / 2} ${tail} L ${-w / 2} ${-len + 6 * k} L 0 ${-len} L ${w / 2} ${-len + 6 * k} L ${w / 2} ${tail} Z` }, 'pw-hand-body');
    } else if (style === 'arrow') {
      if (hour) {
        const w = 3.2 * k;
        const head = 13 * k;
        add(g, 'rect', { x: -w / 2, y: -len + head - 1, width: w, height: len - head + 10 * k, rx: w / 2 }, 'pw-hand-body');
        add(g, 'path', { d: `M ${-6.5 * k} ${-len + head} L 0 ${-len} L ${6.5 * k} ${-len + head} Z` }, 'pw-hand-body');
        add(g, 'path', { d: `M ${-3.4 * k} ${-len + head - 2 * k} L 0 ${-len + 5 * k} L ${3.4 * k} ${-len + head - 2 * k} Z` }, 'pw-hand-lume');
      } else {
        const w = 3.4 * k;
        add(g, 'rect', { x: -w / 2, y: -len, width: w, height: len + 12 * k, rx: w / 2 }, 'pw-hand-body');
        add(g, 'rect', { x: -0.7 * k, y: -len + 4 * k, width: 1.4 * k, height: len * 0.6, rx: 0.7 * k }, 'pw-hand-lume');
      }
    } else {
      const w = (hour ? 6.6 : 4.8) * k;
      const tail = (hour ? 11 : 13) * k;
      add(g, 'path', {
        d: `M 0 ${tail} C ${w} ${-len * 0.15} ${w * 0.7} ${-len * 0.62} 0 ${-len} C ${-w * 0.7} ${-len * 0.62} ${-w} ${-len * 0.15} 0 ${tail} Z`,
      }, 'pw-hand-body');
    }
  }

  // --- Digital ------------------------------------------------------------

  buildDigital(now) {
    const s = this.plugin.settings;
    const style = DIGITAL_STYLES[s.digitalStyle] ? s.digitalStyle : 'slate';
    const layout = DIGITAL_LAYOUTS[s.digitalLayout] ? s.digitalLayout : 'wide';
    const box = this.faceEl.createDiv({ cls: ['pocket-watch-digital', `pw-d-${style}`, `pw-l-${layout}`] });
    if (s.blinkColon) box.addClass('pw-blink');
    box.style.fontSize = `${(s.watchSize / 120) * 13}px`;

    const d = (this.parts.digital = {});
    const time = box.createDiv('pw-d-time');
    if (layout === 'tall') {
      d.hh = time.createDiv('pw-d-hh');
      d.mm = time.createDiv('pw-d-mm');
      if (s.digitalSeconds) d.ss = time.createDiv('pw-d-ss');
    } else {
      d.hh = time.createSpan('pw-d-hh');
      time.createSpan({ cls: 'pw-d-colon', text: ':' });
      d.mm = time.createSpan('pw-d-mm');
      if (s.digitalSeconds) {
        time.createSpan({ cls: ['pw-d-colon', 'is-small'], text: ':' });
        d.ss = time.createSpan('pw-d-ss');
      }
    }
    if (!this.h24) d.ampm = time.createSpan('pw-d-ampm');

    if (layout !== 'compact') {
      const meta = box.createDiv('pw-d-meta');
      if (s.digitalDate) meta.createSpan({ text: now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) });
      if (s.digitalMoon) {
        const moon = meta.createSvg('svg', { attr: { viewBox: '0 0 20 20', width: '1.1em', height: '1.1em' }, cls: 'pw-d-moon' });
        moon.createSvg('circle', { attr: { cx: 10, cy: 10, r: 8 }, cls: 'pw-moon-dark' });
        moon.createSvg('path', { attr: { d: moonPath(10, 10, 8, moonPhase(now)) }, cls: 'pw-moon-lit' });
      }
      if (s.digitalFocus) this.parts.focusText = meta.createSpan('pw-d-focus');
      if (!meta.childElementCount) meta.remove();
      if (s.digitalBar) this.parts.fill = box.createDiv('pw-d-bar').createDiv('pw-d-fill');
    }
  }

  // --- Placement ----------------------------------------------------------

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
    return { group: leaf.parent.id, spot: 'br' };
  }

  // The part of a pane the watch can sit in: below its header.
  paneBox(groupEl) {
    const content = groupEl.querySelector(':scope > .workspace-tab-container') || groupEl;
    const r = content.getBoundingClientRect();
    const header = Array.from(content.querySelectorAll('.view-header')).find((e) => e.offsetParent !== null);
    return { left: r.left, top: r.top + (header ? header.offsetHeight : 0), right: r.right, bottom: r.bottom, scrollbar: 6 };
  }

  windowBox() {
    const r = (document.querySelector('.app-container') || document.body).getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, scrollbar: 0 };
  }

  // A spot in a box: a row (t, m, b) and a column (l, c, r). Bottom spots keep clear of
  // the status bar. Null when the box is too small, such as a collapsed sidebar.
  spotXY(box, spot) {
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    if (box.right - box.left < w + SNAP_INSET * 2 || box.bottom - box.top < h + SNAP_INSET * 2) return null;
    const col = spot[1];
    const row = spot[0];
    const x = col === 'l' ? box.left + SNAP_INSET
      : col === 'r' ? box.right - SNAP_INSET - box.scrollbar - w
        : box.left + (box.right - box.left - w) / 2;
    let y = row === 't' ? box.top + SNAP_INSET
      : row === 'b' ? box.bottom - SNAP_INSET - h
        : box.top + (box.bottom - box.top - h) / 2;
    const bar = document.querySelector('.status-bar');
    if (bar && row === 'b') {
      const b = bar.getBoundingClientRect();
      if (b.width && x + w > b.left && x < b.right && y + h > b.top - 6) y = b.top - 6 - h;
    }
    return { x, y };
  }

  // Over a pane, the nearest of its eight spots; anywhere else, the nearest spot of the window.
  snapTarget(px, py, left, top) {
    const el = this.groupAt(px, py);
    const id = el && this.groupId(el);
    const box = id ? this.paneBox(el) : this.windowBox();
    let best = null;
    for (const spot of SPOTS) {
      const xy = this.spotXY(box, spot);
      if (!xy) continue;
      const d = Math.hypot(xy.x - left, xy.y - top);
      if (!best || d < best.d) best = { id, spot, xy, d };
    }
    return best;
  }

  place() {
    const s = this.plugin.settings;
    if (this.dragging || !s.showWatch) return;
    let xy = null;
    let tucked = false;
    if (!s.watchAnchor && s.watchPos) {
      xy = this.freeSpot(s.watchPos);
    } else {
      if (!s.watchAnchor) {
        const anchor = this.defaultAnchor();
        if (anchor) {
          s.watchAnchor = anchor;
          this.plugin.saveSettings();
        }
      }
      const a = s.watchAnchor;
      const spot = a && SPOTS.includes(a.spot) ? a.spot : 'br';
      if (a && a.window) {
        xy = this.spotXY(this.windowBox(), spot);
      } else {
        const el = a && this.resolveGroup(a.group);
        if (el) {
          xy = this.spotXY(this.paneBox(el), spot);
          tucked = !xy;
        } else {
          // The pane it was snapped to is gone: use the bottom right of the window.
          xy = this.freeSpot(DEFAULT_WATCH_POS);
        }
      }
    }
    this.el.classList.toggle('is-tucked', tucked);
    if (xy) {
      const left = `${Math.round(xy.x)}px`;
      const top = `${Math.round(xy.y)}px`;
      if (this.el.style.left !== left) this.el.style.left = left;
      if (this.el.style.top !== top) this.el.style.top = top;
    }
    this.placeGrip();
    if (this.shelfEl) this.placeShelf();
  }

  // The resize handle sits on the corner facing away from where the watch is snapped,
  // so dragging it outward makes the watch bigger.
  placeGrip() {
    const a = this.plugin.settings.watchAnchor;
    // Placed freely: the handle goes bottom right.
    const spot = a && a.spot ? a.spot : 'tl';
    const corner = `${spot[0] === 'b' ? 't' : 'b'}${spot[1] === 'r' ? 'l' : 'r'}`;
    setIfChanged(this.gripEl, 'data-corner', corner);
  }

  freeSpot(pos) {
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    return { x: pos.fx * Math.max(0, window.innerWidth - w), y: pos.fy * Math.max(0, window.innerHeight - h) };
  }

  showGhost(xy) {
    if (!xy) {
      this.removeGhost();
      return;
    }
    if (!this.ghostEl) {
      this.ghostEl = document.body.createDiv('pocket-watch-ghost');
      this.ghostEl.setAttr('data-type', this.plugin.settings.watchType);
      this.ghostEl.style.width = `${this.el.offsetWidth}px`;
      this.ghostEl.style.height = `${this.el.offsetHeight}px`;
    }
    this.ghostEl.style.left = `${xy.x}px`;
    this.ghostEl.style.top = `${xy.y}px`;
  }

  removeGhost() {
    if (this.ghostEl) this.ghostEl.remove();
    this.ghostEl = null;
  }

  // A short press opens the shelf. Pressing and moving drags the watch; let go and it
  // snaps to the nearest spot of the pane under the pointer (or of the window). Hold Alt
  // to leave it exactly where it is.
  onPointerDown(e) {
    if (e.button !== 0 || this.gripEl.contains(e.target)) return;
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
      this.showGhost(target && target.xy);
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
        s.watchAnchor = target.id ? { group: target.id, spot: target.spot } : { window: true, spot: target.spot };
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

  onResizeStart(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const s = this.plugin.settings;
    const startSize = s.watchSize;
    const start = { x: e.clientX, y: e.clientY };
    const corner = this.gripEl.getAttribute('data-corner') || 'br';
    const sx = corner[1] === 'r' ? 1 : -1;
    const sy = corner[0] === 'b' ? 1 : -1;
    this.resizing = true;
    this.el.addClass('is-resizing');
    this.gripEl.setPointerCapture(e.pointerId);

    const move = (ev) => {
      const grow = (sx * (ev.clientX - start.x) + sy * (ev.clientY - start.y)) / 2;
      this.setSize(startSize + grow);
    };
    const up = () => {
      this.gripEl.removeEventListener('pointermove', move);
      this.gripEl.removeEventListener('pointerup', up);
      this.gripEl.removeEventListener('pointercancel', up);
      this.resizing = false;
      this.el.removeClass('is-resizing');
      this.plugin.saveSettings();
    };
    this.gripEl.addEventListener('pointermove', move);
    this.gripEl.addEventListener('pointerup', up);
    this.gripEl.addEventListener('pointercancel', up);
  }

  // Alt and the scroll wheel over the watch resize it too.
  onWheel(e) {
    if (!e.altKey) return;
    e.preventDefault();
    this.setSize(this.plugin.settings.watchSize + (e.deltaY < 0 ? 6 : -6));
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.plugin.saveSettings(), 400);
  }

  setSize(value) {
    const size = Math.round(clamp(value, MIN_SIZE, MAX_SIZE) / 2) * 2;
    if (size === this.plugin.settings.watchSize) return;
    this.plugin.settings.watchSize = size;
    this.refresh();
  }

  // --- Shelf --------------------------------------------------------------

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

function turn(el, angle) {
  const v = `rotate(${angle.toFixed(2)}deg)`;
  if (el.style.transform !== v) el.style.transform = v;
}

// A seconds hand that glides instead of ticking: a CSS animation started at the right second.
function sweep(el, now) {
  el.addClass('pw-sweep');
  el.style.animationDelay = `-${now.getSeconds() + now.getMilliseconds() / 1000}s`;
}

function setIfChanged(el, name, value) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function setText(el, value) {
  if (el.textContent !== value) el.textContent = value;
}

// The LCD style shows faint unlit "8"s behind each digit.
function setDigits(el, value) {
  if (el.textContent === value) return;
  el.textContent = value;
  el.setAttribute('data-ghost', '8'.repeat(value.length));
}

// ---------------------------------------------------------------------------
// The shelf
// ---------------------------------------------------------------------------

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

  // Quick changes to the watch; everything else is in the plugin settings.
  renderWatchOptions(el) {
    const p = this.plugin;
    const s = p.settings;
    const change = async (patch) => {
      await p.updateWatch(patch);
      this.render();
    };
    el.createEl('h4', { text: 'Watch' });
    dropdown(new Setting(el).setName('Type'), { analog: 'Analog', digital: 'Digital' }, s.watchType, (v) => change({ watchType: v }));
    if (s.watchType === 'digital') {
      dropdown(new Setting(el).setName('Style'), DIGITAL_STYLES, s.digitalStyle, (v) => change({ digitalStyle: v }));
      dropdown(new Setting(el).setName('Layout'), DIGITAL_LAYOUTS, s.digitalLayout, (v) => change({ digitalLayout: v }));
    } else {
      dropdown(new Setting(el).setName('Face'), faceNames(), s.face, (v) => change({ face: v }));
      dropdown(new Setting(el).setName('Hands'), HANDS, s.hands, (v) => change({ hands: v }));
    }
    el.createDiv({ cls: 'pocket-watch-compare', text: 'More options, like what shows at 12, 3, 6 and 9 o\'clock, are in the plugin settings.' });
  }
}

function faceNames() {
  const names = {};
  for (const [k, f] of Object.entries(ANALOG_FACES)) names[k] = f.name;
  return names;
}

function dropdown(setting, options, value, onChange) {
  return setting.addDropdown((d) => {
    for (const [k, v] of Object.entries(options)) d.addOption(k, v);
    d.setValue(String(value)).onChange(onChange);
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

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
    const set = (patch, redraw) => p.updateWatch(patch).then(() => redraw && this.display());
    const toggle = (name, key, desc) => {
      const setting = new Setting(el).setName(name);
      if (desc) setting.setDesc(desc);
      setting.addToggle((t) => t.setValue(s[key]).onChange((v) => set({ [key]: v })));
    };

    new Setting(el)
      .setName('Show watch')
      .setDesc('Click the watch to open the stats shelf.')
      .addToggle((t) => t.setValue(s.showWatch).onChange((v) => set({ showWatch: v })));
    dropdown(new Setting(el).setName('Type'), { analog: 'Analog', digital: 'Digital' }, s.watchType, (v) => set({ watchType: v }, true));
    new Setting(el)
      .setName('Size')
      .setDesc('You can also drag the handle that appears on the watch when you point at it, or hold Alt and scroll over the watch.')
      .addSlider((sl) => sl
        .setLimits(MIN_SIZE, MAX_SIZE, 2)
        .setValue(s.watchSize)
        .setDynamicTooltip()
        .onChange((v) => set({ watchSize: v })));

    if (s.watchType === 'digital') {
      new Setting(el).setName('Digital').setHeading();
      dropdown(new Setting(el).setName('Style'), DIGITAL_STYLES, s.digitalStyle, (v) => set({ digitalStyle: v }));
      dropdown(
        new Setting(el).setName('Layout').setDesc('Wide has the time over a line of details, slim is a single line, tall stacks the hours over the minutes, and compact is just the time.'),
        DIGITAL_LAYOUTS, s.digitalLayout, (v) => set({ digitalLayout: v }),
      );
      dropdown(new Setting(el).setName('Clock'), CLOCKS, s.clock, (v) => set({ clock: v }));
      toggle('Seconds', 'digitalSeconds');
      toggle('Blinking colon', 'blinkColon');
      toggle('Date', 'digitalDate');
      toggle('Moon phase', 'digitalMoon');
      toggle("Today's time", 'digitalFocus', 'Your time in Obsidian today.');
      toggle('Goal bar', 'digitalBar', 'A thin bar that fills up toward your daily goal.');
    } else {
      new Setting(el).setName('Analog').setHeading();
      dropdown(new Setting(el).setName('Face'), faceNames(), s.face, (v) => set({ face: v }));
      dropdown(new Setting(el).setName('Hour markers'), MARKERS, s.markers, (v) => set({ markers: v }));
      dropdown(new Setting(el).setName('Hands'), HANDS, s.hands, (v) => set({ hands: v }));
      dropdown(new Setting(el).setName('Seconds hand'), SECONDS, s.seconds, (v) => set({ seconds: v }));
      for (const slot of SLOTS) {
        dropdown(new Setting(el).setName(slot.name), COMPLICATIONS, s[slot.key], (v) => set({ [slot.key]: v }));
      }
      toggle('Goal ring', 'goalRing', 'A ring on the bezel that fills up toward your daily goal, and dims while the timer is paused.');
      toggle('Gentle motion', 'motion', 'Lets the wheels of the skeleton face turn and its balance wheel swing.');
    }

    new Setting(el).setName('Placement').setHeading();
    new Setting(el)
      .setName('Reset watch position')
      .setDesc('Drag the watch over a pane and it snaps to the nearest corner or edge. Drop it outside a pane, such as on the ribbon or status bar, to snap it to the edge of the window. Hold Alt while dropping to place it freely.')
      .addButton((b) => b.setButtonText('Reset').onClick(() => set({ watchAnchor: null, watchPos: null })));

    new Setting(el).setName('Tracking').setHeading();

    new Setting(el)
      .setName('Daily goal (minutes)')
      .addSlider((sl) => sl
        .setLimits(15, 480, 15)
        .setValue(s.dailyGoalMinutes)
        .setDynamicTooltip()
        .onChange((v) => set({ dailyGoalMinutes: v })));

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
