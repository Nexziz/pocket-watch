'use strict';

const { Plugin, PluginSettingTab, Setting, MarkdownView, Notice, Menu } = require('obsidian');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// Each analog face picks a case and its own hour markers, and optionally a decoration, a dial
// finish (texture), a flange with a minute track, polished metal (applied) markers, a window
// onto the movement in one slot, serif printing, and whether its name is printed (plain, model).
// Its colours live in styles.css under .pocket-watch-face-<key>.
const ANALOG_FACES = {
  porcelain: { name: 'Porcelain', case: 'polished', markers: 'batons', decor: 'minute-dots', texture: 'enamel', serif: true },
  linen: { name: 'Linen', case: 'polished', markers: 'roman', decor: 'railroad', texture: 'guilloche', serif: true },
  slate: { name: 'Slate', case: 'polished', markers: 'quarters', texture: 'brushed', flange: true, applied: true },
  midnight: { name: 'Midnight', case: 'polished', markers: 'dots', decor: 'aventurine', texture: 'sunburst', flange: true, applied: true },
  openheart: { name: 'Open heart', case: 'polished', markers: 'batons', texture: 'azurage', flange: true, applied: true, window: 'slotBottom' },
  bauhaus: { name: 'Bauhaus', case: 'thin', markers: 'arabic', decor: 'minute-ticks' },
  void: { name: 'Void', case: 'thin', markers: 'minimal', applied: true, plain: true },
  field: { name: 'Field', case: 'polished', markers: 'arabic', decor: 'inner-24', texture: 'grain' },
  sector: { name: 'Sector', case: 'polished', markers: 'arabic', decor: 'sector', texture: 'grain', serif: true },
  diver: { name: 'Diver', case: 'dive', markers: 'lume', texture: 'waves' },
  rose: { name: 'Rosé', case: 'polished', markers: 'batons', texture: 'sunburst', flange: true, applied: true, serif: true },
  theme: { name: 'Match theme', case: 'thin', markers: 'batons', decor: 'minute-dots', model: false },
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

const CASES = { crown: 'Crown', bow: 'Pocket watch bow', none: 'Plain' };

const MOVEMENTS = { lifelike: 'Lifelike, 18,000 beats an hour', gentle: 'Gentle', still: 'Still' };

const COMPLICATIONS = {
  none: 'Nothing',
  date: 'Date',
  'weekday-date': 'Weekday and date',
  month: 'Month',
  moon: 'Moon phase',
  movement: 'Movement window',
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

  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  chime: true,
  showCountdown: true,

  showWatch: true,
  watchType: 'analog',
  watchSize: 120,

  face: 'porcelain',
  caseStyle: 'crown',
  dialText: true,
  markers: 'face',
  hands: 'leaf',
  seconds: 'off',
  slotTop: 'none',
  slotRight: 'weekday-date',
  slotBottom: 'moon',
  slotLeft: 'none',
  goalRing: true,
  movement: 'lifelike',

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

// A toothed wheel with a centre hole and spoke windows, drawn with the even-odd rule.
// An escape wheel has slanted, club-shaped teeth and four windows.
function gearPath(cx, cy, r, teeth, escape) {
  const inner = r - (escape ? 2.2 : 1.6);
  const step = (2 * Math.PI) / teeth;
  const at = (rr, a) => `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    if (escape) pts.push(at(inner, a), at(r, a + step * 0.42), at(r * 0.94, a + step * 0.62), at(inner, a + step * 0.5));
    else pts.push(at(inner, a), at(r, a + step * 0.2), at(r, a + step * 0.5), at(inner, a + step * 0.7));
  }
  const windows = escape ? 4 : 5;
  let d = `M ${pts.join(' L ')} Z ${circlePath(cx, cy, r * 0.12)}`;
  for (let i = 0; i < windows; i++) {
    const a = (i * 2 * Math.PI) / windows;
    d += ` ${circlePath(cx + r * 0.5 * Math.cos(a), cy + r * 0.5 * Math.sin(a), r * (escape ? 0.24 : 0.22))}`;
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

const SESSION_NAMES = { focus: 'Focus', short: 'Break', long: 'Long break' };

// A soft two-note bell, made on the spot so the plugin needs no sound files.
let audio = null;
function chime() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime;
    const out = audio.createGain();
    out.gain.value = 0.16;
    out.connect(audio.destination);
    for (const [freq, delay] of [[659.25, 0], [987.77, 0.22]]) {
      for (const [mult, amp] of [[1, 1], [2.76, 0.22], [5.4, 0.06]]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.frequency.value = freq * mult;
        gain.gain.setValueAtTime(0, t + delay);
        gain.gain.linearRampToValueAtTime(amp, t + delay + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 2.4 / mult);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t + delay);
        osc.stop(t + delay + 2.6);
      }
    }
  } catch (e) {
    // No sound available; the notice and the watch still say the session is done.
  }
}

// Settings saved by earlier versions, turned into today's options.
function migrateSettings(s) {
  if (!s) return {};
  if (s.face === 'skeleton') s.face = 'openheart';
  if (s.face === 'digital') {
    s.watchType = 'digital';
    s.face = 'porcelain';
  }
  if ('showSeconds' in s) s.seconds = s.showSeconds ? 'tick' : 'off';
  if (s.motion === false) s.movement = 'still';
  if ('showDate' in s) s.slotRight = s.showDate ? 'weekday-date' : 'none';
  if ('showMoon' in s) s.slotBottom = s.showMoon ? 'moon' : 'none';
  if ('showFocus' in s) s.goalRing = s.showFocus;
  for (const k of ['showSeconds', 'showDate', 'showMoon', 'showFocus', 'watchStyle', 'motion']) delete s[k];
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
    // The running focus session or break, if any: { kind, total, endsAt, paused, remaining }.
    this.session = saved.session || null;
    // Focus sessions finished since the last long break.
    this.cycle = saved.cycle || 0;

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
    this.addCommand({ id: 'start-focus', name: 'Start a focus session', callback: () => this.startSession('focus') });
    this.addCommand({ id: 'start-break', name: 'Take a break', callback: () => this.startSession('short') });
    this.addCommand({
      id: 'toggle-session',
      name: 'Pause or resume the focus session',
      checkCallback: (checking) => {
        if (!this.session) return false;
        if (!checking) this.toggleSessionPause();
        return true;
      },
    });
    this.addCommand({
      id: 'stop-session',
      name: 'Stop the focus session',
      checkCallback: (checking) => {
        if (!this.session) return false;
        if (!checking) this.stopSession();
        return true;
      },
    });
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
    if (audio) audio.close();
    audio = null;
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

    // A session that ran out while Obsidian was closed for a while is counted, quietly.
    const x = this.session;
    if (x && !x.paused && now >= x.endsAt) this.completeSession(now - x.endsAt > 5 * 60000);

    const ms = this.getDay(dayKey(new Date())).ms;
    this.statusEl.setText(this.session ? `⏱ ${fmtShort(ms)} · ${this.sessionLabel()}` : `⏱ ${fmtShort(ms)}`);
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

  // --- Focus sessions ---

  sessionMinutes(kind) {
    const s = this.settings;
    return kind === 'focus' ? s.focusMinutes : kind === 'long' ? s.longBreakMinutes : s.shortBreakMinutes;
  }

  startSession(kind, quiet) {
    const minutes = this.sessionMinutes(kind);
    const total = minutes * 60000;
    this.session = { kind, total, endsAt: Date.now() + total, paused: false, remaining: total };
    this.markActive();
    if (!quiet) new Notice(kind === 'focus' ? `Focus for ${minutes} minutes` : `${SESSION_NAMES[kind]}, ${minutes} minutes`);
    this.saveSettings();
    this.tick();
  }

  sessionRemaining() {
    const x = this.session;
    if (!x) return 0;
    return x.paused ? x.remaining : Math.max(0, x.endsAt - Date.now());
  }

  // "Focus 18 min", "Break 4 min" or "Paused 18 min".
  sessionLabel() {
    const x = this.session;
    if (!x) return '';
    return `${x.paused ? 'Paused' : SESSION_NAMES[x.kind]} ${Math.ceil(this.sessionRemaining() / 60000)} min`;
  }

  toggleSessionPause() {
    const x = this.session;
    if (!x) return;
    if (x.paused) {
      x.endsAt = Date.now() + x.remaining;
      x.paused = false;
    } else {
      x.remaining = this.sessionRemaining();
      x.paused = true;
    }
    this.saveSettings();
    this.tick();
  }

  stopSession() {
    this.session = null;
    this.saveSettings();
    this.tick();
  }

  skipSession() {
    const x = this.session;
    if (!x) return;
    this.startSession(x.kind === 'focus' ? 'short' : 'focus');
  }

  // After every few focus sessions the break is a long one.
  nextBreak() {
    return this.cycle > 0 && this.cycle % this.settings.longBreakEvery === 0 ? 'long' : 'short';
  }

  completeSession(quiet) {
    const x = this.session;
    this.session = null;
    if (x.kind === 'focus') {
      const d = this.today();
      d.sessions = (d.sessions || 0) + 1;
      d.focusMs = (d.focusMs || 0) + x.total;
      this.cycle += 1;
    } else if (x.kind === 'long') {
      this.cycle = 0;
    }
    if (quiet) {
      this.saveSettings();
      return;
    }
    if (this.settings.chime) chime();
    if (this.watch) this.watch.ring();
    if (x.kind === 'focus') {
      const next = this.nextBreak();
      new Notice(`Focus session done. Time for a ${next === 'long' ? 'long' : 'short'} break.`);
      if (this.settings.autoStartBreaks) this.startSession(next, true);
      else this.saveSettings();
    } else {
      new Notice("Break's over. Ready to focus again?");
      if (this.settings.autoStartFocus) this.startSession('focus', true);
      else this.saveSettings();
    }
  }

  // Right-click on the watch.
  showWatchMenu(e) {
    const s = this.settings;
    const menu = new Menu();
    if (this.session) {
      const x = this.session;
      menu.addItem((i) => i.setTitle(x.paused ? 'Resume the session' : 'Pause the session').setIcon(x.paused ? 'play' : 'pause').onClick(() => this.toggleSessionPause()));
      menu.addItem((i) => i.setTitle(x.kind === 'focus' ? 'Skip to a break' : 'Skip to focus').setIcon('skip-forward').onClick(() => this.skipSession()));
      menu.addItem((i) => i.setTitle('Stop the session').setIcon('square').onClick(() => this.stopSession()));
    } else {
      menu.addItem((i) => i.setTitle(`Focus for ${s.focusMinutes} minutes`).setIcon('play').onClick(() => this.startSession('focus')));
      menu.addItem((i) => i.setTitle(`Short break, ${s.shortBreakMinutes} minutes`).setIcon('coffee').onClick(() => this.startSession('short')));
      menu.addItem((i) => i.setTitle(`Long break, ${s.longBreakMinutes} minutes`).setIcon('armchair').onClick(() => this.startSession('long')));
    }
    menu.addSeparator();
    menu.addItem((i) => i.setTitle('Open the shelf').setIcon('calendar-days').onClick(() => this.watch && !this.watch.shelfEl && this.watch.openShelf()));
    menu.addItem((i) => i.setTitle(this.paused ? 'Resume tracking' : 'Pause tracking').setIcon('timer').onClick(() => this.togglePause()));
    menu.addItem((i) => i.setTitle('Hide the watch').setIcon('eye-off').onClick(() => this.updateWatch({ showWatch: false })));
    menu.showAtMouseEvent(e);
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
    await this.saveData({ settings: this.settings, days: this.days, session: this.session, cycle: this.cycle });
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
    const s = { ms: 0, written: 0, deleted: 0, activeDays: 0, bestKey: null, bestMs: 0, streak: this.streak(), sessions: 0, focusMs: 0 };
    for (const [key, d] of Object.entries(this.days)) {
      s.ms += d.ms;
      s.sessions += d.sessions || 0;
      s.focusMs += d.focusMs || 0;
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
    this.badgeEl = this.el.createDiv('pocket-watch-badge');
    this.el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.plugin.showWatchMenu(e);
    });
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
    window.clearTimeout(this.ringTimer);
    this.closeShelf();
    this.removeGhost();
    this.el.remove();
  }

  // A gentle glow when a session ends.
  ring() {
    this.el.removeClass('is-ringing');
    void this.el.offsetWidth;
    this.el.addClass('is-ringing');
    window.clearTimeout(this.ringTimer);
    this.ringTimer = window.setTimeout(() => this.el.removeClass('is-ringing'), 7000);
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
      s.watchType, s.watchSize, s.face, s.caseStyle, s.dialText, s.markers, s.hands, s.seconds, s.slotTop, s.slotRight, s.slotBottom, s.slotLeft,
      s.goalRing, s.movement, s.digitalStyle, s.digitalLayout, s.clock, s.digitalSeconds, s.blinkColon,
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
    // During a session the ring and the bar count down instead of filling toward the goal.
    const x = p.session;
    const ringMode = x ? (x.paused ? 'paused' : x.kind === 'focus' ? 'focus' : 'break') : s.goalRing ? 'goal' : 'off';
    setIfChanged(this.el, 'data-ring', ringMode);
    const progress = x ? p.sessionRemaining() / x.total : goal;
    const badge = x && s.showCountdown ? p.sessionLabel() : '';
    setText(this.badgeEl, badge);
    this.badgeEl.classList.toggle('is-shown', !!badge);
    const label = [
      fmtTime(now, this.h24),
      now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      moonName(moonPhase(now)),
      `${fmtShort(day.ms)} in Obsidian today (${STATE_LABELS[p.state].toLowerCase()})`,
      ...(x ? [`${p.sessionLabel()} left. Right-click for session controls.`] : ['Right-click to start a focus session.']),
    ].join('\n');
    if (this.el.getAttribute('aria-label') !== label) this.el.setAttr('aria-label', label);

    if (parts.hour) {
      turn(parts.hour, ((h % 12) + m / 60) * 30);
      turn(parts.minute, m * 6 + sec * 0.1);
      if (parts.second && s.seconds === 'tick') turn(parts.second, sec * 6);
      if (parts.ring) setIfChanged(parts.ring, 'stroke-dasharray', `${(progress * 100).toFixed(2)} 100`);
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
    if (parts.fill) parts.fill.style.width = `${progress * 100}%`;
  }

  // --- Analog -------------------------------------------------------------

  // An id that is unique to this build of the face, for its gradients and clip paths.
  id(name) {
    return `pocket-watch-${name}-${this.uid}`;
  }

  // Adds a gradient to the face once. A stop is [offset, colour] or [offset, class].
  gradient(add, tag, name, attr, stops) {
    if (this.defs.querySelector(`#${this.id(name)}`)) return;
    const g = add(this.defs, tag, Object.assign({ id: this.id(name) }, attr));
    for (const [offset, color] of stops) {
      if (color.startsWith('pw-')) add(g, 'stop', { offset }, color);
      else add(g, 'stop', { offset, 'stop-color': color });
    }
  }

  buildAnalog(now) {
    const s = this.plugin.settings;
    const faceKey = ANALOG_FACES[s.face] ? s.face : 'porcelain';
    const face = ANALOG_FACES[faceKey];
    const R = face.case === 'thin' ? 95 : face.case === 'dive' ? 80 : 89.5;
    const k = R / 89.5;
    this.uid = (this.uid || 0) + 1;
    const used = {};
    for (const slot of SLOTS) used[slot.hour] = s[slot.key] !== 'none' || face.window === slot.key;

    // The crown or the pocket watch bow sits outside the case, so the drawing grows to fit it.
    const caseStyle = CASES[s.caseStyle] ? s.caseStyle : 'crown';
    const box = caseStyle === 'crown' ? [0, 0, 208, 200] : caseStyle === 'bow' ? [0, -28, 200, 228] : [0, 0, 200, 200];
    const svg = this.faceEl.createSvg('svg', {
      attr: { viewBox: box.join(' '), width: (s.watchSize * box[2]) / 200, height: (s.watchSize * box[3]) / 200 },
      cls: ['pocket-watch-svg', `pocket-watch-face-${faceKey}`, `pw-case-${face.case}`],
    });
    if (s.movement !== 'still') svg.addClass('pw-motion');
    if (s.movement === 'gentle') svg.addClass('pw-movement-gentle');
    const add = (parent, tag, attr, cls) => parent.createSvg(tag, { attr, cls });
    const text = (parent, x, y, size, value, cls) => {
      const t = add(parent, 'text', { x, y, 'font-size': size }, cls);
      t.textContent = value;
      return t;
    };
    const url = (name) => `url(#${this.id(name)})`;

    this.defs = add(svg, 'defs');
    this.gradient(add, 'linearGradient', 'bezel', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', 'pw-bezel-a'], ['55%', 'pw-bezel-b'], ['100%', 'pw-bezel-c']]);
    this.gradient(add, 'linearGradient', 'bezel-rev', { x1: 1, y1: 1, x2: 0, y2: 0 }, [['0%', 'pw-bezel-a'], ['55%', 'pw-bezel-b'], ['100%', 'pw-bezel-c']]);
    this.gradient(add, 'radialGradient', 'dial', { cx: '50%', cy: '40%', r: '62%' }, [['0%', 'pw-dial-a'], ['100%', 'pw-dial-b']]);
    this.gradient(add, 'radialGradient', 'dial-shade', { cx: '50%', cy: '50%', r: '50%' }, [['80%', 'rgba(0,0,0,0)'], ['100%', 'rgba(0,0,0,0.22)']]);
    this.gradient(add, 'linearGradient', 'metal', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', 'pw-metal-a'], ['50%', 'pw-metal-b'], ['100%', 'pw-metal-c']]);
    this.gradient(add, 'linearGradient', 'glass', { x1: 0, y1: 0, x2: 0.7, y2: 1 }, [['0%', 'rgba(255,255,255,0.13)'], ['100%', 'rgba(255,255,255,0)']]);
    this.gradient(add, 'radialGradient', 'cap', { cx: '35%', cy: '30%', r: '75%' }, [['0%', 'pw-cap-a'], ['100%', 'pw-cap-b']]);
    add(add(this.defs, 'clipPath', { id: this.id('dial-clip') }), 'circle', { cx: 100, cy: 100, r: R });

    // Case: a polished bezel with a crisp outer edge and a stepped inner bevel.
    if (caseStyle === 'crown') {
      add(svg, 'rect', { x: 194, y: 95, width: 6, height: 10, rx: 1.5, fill: url('bezel') }, 'pw-case-part');
      add(svg, 'rect', { x: 198.5, y: 89, width: 8.5, height: 22, rx: 2.6, fill: url('bezel') }, 'pw-case-part');
      for (let y = 91.6; y <= 108.6; y += 1.7) add(svg, 'line', { x1: 199.4, y1: y, x2: 206.2, y2: y }, 'pw-knurl');
      add(svg, 'rect', { x: 205.2, y: 90, width: 1.4, height: 20, rx: 0.7 }, 'pw-crown-shine');
    } else if (caseStyle === 'bow') {
      add(svg, 'circle', { cx: 100, cy: -16.5, r: 9.5, fill: 'none', stroke: url('bezel'), 'stroke-width': 3.6 }, 'pw-bow');
      add(svg, 'circle', { cx: 100, cy: -16.5, r: 9.5 }, 'pw-bow-shine');
      add(svg, 'rect', { x: 95.5, y: -9.5, width: 9, height: 6, rx: 2, fill: url('bezel') }, 'pw-case-part');
      add(svg, 'rect', { x: 93, y: -4.5, width: 14, height: 7, rx: 2, fill: url('bezel') }, 'pw-case-part');
      for (let x = 94.6; x <= 105.6; x += 1.6) add(svg, 'line', { x1: x, y1: -3.8, x2: x, y2: 1.8 }, 'pw-knurl');
    }
    add(svg, 'circle', { cx: 100, cy: 100, r: 99, fill: url('bezel') }, 'pw-bezel');
    add(svg, 'circle', { cx: 100, cy: 100, r: 98.3 }, 'pw-bezel-edge');
    if (face.case === 'dive') this.drawDiveBezel(svg, add);
    else add(svg, 'circle', { cx: 100, cy: 100, r: R + 1.1, 'stroke-width': 2.2, stroke: url('bezel-rev') }, 'pw-bezel-step');

    // The ring on the bezel shows the daily goal, or the countdown during a focus session.
    const [ringR, ringW] = face.case === 'thin' ? [97, 2] : face.case === 'dive' ? [83, 1.8] : [94.6, 2.8];
    add(svg, 'circle', { cx: 100, cy: 100, r: ringR, 'stroke-width': ringW }, 'pw-ring-track');
    this.parts.ring = add(svg, 'circle', {
      cx: 100, cy: 100, r: ringR, 'stroke-width': ringW, pathLength: 100, transform: 'rotate(-90 100 100)', 'stroke-dasharray': '0 100',
    }, 'pw-ring');
    add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: url('dial') }, 'pw-dial');

    // Dial: its finish, then shading where it meets the case, then the flange.
    if (face.texture) this.drawTexture(svg, add, face.texture, R);
    if (face.decor) this.drawDecor(svg, add, text, face.decor, R, k, used);
    add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: url('dial-shade') }, 'pw-dial-shade');
    if (face.flange) {
      add(svg, 'circle', { cx: 100, cy: 100, r: R - 2, 'stroke-width': 4 }, 'pw-flange');
      let d = '';
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 0.4, i * 6);
        const [x2, y2] = polar(R - (i % 5 ? 2.6 : 3.8), i * 6);
        d += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
      }
      add(svg, 'path', { d }, 'pw-flange-tick');
    }
    const markers = s.markers === 'face' || !MARKERS[s.markers] ? face.markers : s.markers;
    this.drawMarkers(svg, add, text, markers, R, k, used, face);

    // The name printed under 12, unless something else sits there.
    if (s.dialText && !face.plain && !used[0]) {
      const offset = { batons: 31, dots: 24, arabic: face.decor === 'inner-24' ? 52 : 40, quarters: 45, roman: 44, lume: 27 }[markers] || 28;
      const y = 100 - R + offset * k;
      text(svg, 100, y, 5.4 * k, 'POCKET WATCH', face.serif ? ['pw-brand', 'is-serif'] : 'pw-brand');
      if (face.model !== false) text(svg, 100, y + 6.6 * k, 3.9 * k, (face.model || face.name).toUpperCase(), face.serif ? ['pw-model', 'is-serif'] : 'pw-model');
    }

    if (face.window) {
      const slot = SLOTS.find((x) => x.key === face.window);
      const [cx, cy] = polar(R * 0.415, slot.hour * 30);
      this.drawMovementWindow(svg, add, cx, cy, R * 0.345);
    }
    for (const slot of SLOTS) {
      const type = s[slot.key];
      if (face.window === slot.key || !type || type === 'none' || !COMPLICATIONS[type]) continue;
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
      add(body, 'rect', { x: -1.5 * k, y: 9 * k, width: 3 * k, height: 9.5 * k, rx: 1.5 * k });
      add(body, 'circle', { cx: 0, cy: 0, r: 2.6 * k });
      if (s.seconds === 'sweep') sweep(this.parts.second, now);
    }
    // A domed cap over the hands, with a glint.
    add(svg, 'circle', { cx: 100, cy: 100, r: 4.8 * k, fill: url('cap') }, 'pw-cap');
    add(svg, 'circle', { cx: 100 - 1.4 * k, cy: 100 - 1.5 * k, r: 1.3 * k }, 'pw-cap-shine');
    add(svg, 'circle', { cx: 100, cy: 100, r: 1.5 * k }, s.seconds !== 'off' ? 'pw-cap-dot' : 'pw-cap-pin');

    // Reflections on the domed crystal: a broad one at the top left and a small one opposite.
    const [gx1, gy1] = polar(R * 0.97, 238);
    const [gx2, gy2] = polar(R * 0.97, 18);
    add(svg, 'path', {
      d: `M ${gx1} ${gy1} A ${R * 0.97} ${R * 0.97} 0 0 1 ${gx2} ${gy2} A ${R * 1.15} ${R * 1.15} 0 0 0 ${gx1} ${gy1} Z`,
      fill: url('glass'),
    }, 'pw-glass');
    const [hx1, hy1] = polar(R * 0.93, 112);
    const [hx2, hy2] = polar(R * 0.93, 152);
    add(svg, 'path', {
      d: `M ${hx1} ${hy1} A ${R * 0.93} ${R * 0.93} 0 0 1 ${hx2} ${hy2} A ${R * 1.05} ${R * 1.05} 0 0 0 ${hx1} ${hy1} Z`,
    }, 'pw-glass-small');
  }

  // A ceramic diver's bezel, plain apart from the luminous marker at 12 and dots at the quarters.
  drawDiveBezel(svg, add) {
    const url = (name) => `url(#${this.id(name)})`;
    add(svg, 'circle', { cx: 100, cy: 100, r: 89.6, 'stroke-width': 15.6 }, 'pw-insert');
    add(svg, 'circle', { cx: 100, cy: 100, r: 89.6, 'stroke-width': 15.6, stroke: url('glass') }, 'pw-insert-gloss');
    add(svg, 'circle', { cx: 100, cy: 100, r: 81.4 }, 'pw-insert-edge');
    add(svg, 'circle', { cx: 100, cy: 100, r: 97.6 }, 'pw-insert-edge');
    for (const a of [90, 180, 270]) {
      const [x, y] = polar(89.6, a);
      add(svg, 'circle', { cx: x, cy: y, r: 1.4 }, 'pw-insert-dot');
    }
    add(svg, 'path', { d: 'M 93.4 4 L 106.6 4 L 100 16.2 Z', fill: url('metal') }, 'pw-applied');
    add(svg, 'path', { d: 'M 94 4.4 L 106 4.4 L 100 15.6 Z' }, 'pw-insert-pip');
    add(svg, 'circle', { cx: 100, cy: 8.6, r: 1.7 }, 'pw-insert-pearl');
  }

  // Dial finishes, all drawn within the dial: sunburst rays, azurage circles, glossy enamel,
  // a clous de Paris guilloché, vertical brushing, ocean waves and a fine grain.
  drawTexture(svg, add, texture, R) {
    const url = (name) => `url(#${this.id(name)})`;
    const clipped = () => add(svg, 'g', { 'clip-path': url('dial-clip') });
    if (texture === 'sunburst') {
      let d = '';
      for (let i = 0; i < 120; i++) {
        const [x1, y1] = polar(R, i * 3);
        const [x2, y2] = polar(R, i * 3 + 1.5);
        d += `M 100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} Z `;
      }
      add(svg, 'path', { d }, 'pw-rays');
    } else if (texture === 'azurage') {
      for (let r = 2.5; r < R * 0.66; r += 1.6) add(svg, 'circle', { cx: 100, cy: 100, r }, 'pw-azurage');
    } else if (texture === 'enamel') {
      this.gradient(add, 'radialGradient', 'enamel', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(255,255,255,0.75)'], ['100%', 'rgba(255,255,255,0)']]);
      add(svg, 'ellipse', { cx: 78, cy: 62, rx: R * 0.6, ry: R * 0.36, transform: 'rotate(-32 78 62)', fill: url('enamel') }, 'pw-enamel');
    } else if (texture === 'guilloche') {
      // Clous de Paris: two sets of fine grooves crossing, in a disc at the centre.
      const disc = R * 0.56;
      add(add(this.defs, 'clipPath', { id: this.id('guilloche') }), 'circle', { cx: 100, cy: 100, r: disc });
      const g = add(svg, 'g', { 'clip-path': url('guilloche') });
      let d = '';
      for (let t = -disc * 1.5; t <= disc * 1.5; t += 2.3) {
        d += `M ${100 + t - disc} ${100 - disc} L ${100 + t + disc} ${100 + disc} `;
        d += `M ${100 + t + disc} ${100 - disc} L ${100 + t - disc} ${100 + disc} `;
      }
      add(g, 'circle', { cx: 100, cy: 100, r: disc }, 'pw-guilloche-bed');
      add(g, 'path', { d }, 'pw-guilloche');
      add(svg, 'circle', { cx: 100, cy: 100, r: disc }, 'pw-guilloche-ring');
      add(svg, 'circle', { cx: 100, cy: 100, r: disc + 1.6 }, 'pw-guilloche-ring');
    } else if (texture === 'brushed') {
      const g = clipped();
      let light = '';
      let dark = '';
      for (let x = 100 - R, i = 0; x <= 100 + R; x += 0.9, i++) {
        const seg = `M ${x.toFixed(2)} ${100 - R} L ${x.toFixed(2)} ${100 + R} `;
        if (i % 3 === 0) light += seg;
        else if (i % 3 === 1) dark += seg;
      }
      add(g, 'path', { d: light }, ['pw-brushed', 'is-light']);
      add(g, 'path', { d: dark }, 'pw-brushed');
    } else if (texture === 'waves') {
      const g = clipped();
      let d = '';
      for (let y = 100 - R; y <= 100 + R + 4; y += 4.6) {
        d += `M ${100 - R - 8} ${y.toFixed(2)}`;
        for (let x = 100 - R - 8; x < 100 + R + 8; x += 16) d += ` q 4 -1.8 8 0 t 8 0`;
        d += ' ';
      }
      add(g, 'path', { d, transform: 'translate(0 1)' }, ['pw-waves', 'is-shadow']);
      add(g, 'path', { d }, 'pw-waves');
    } else if (texture === 'grain') {
      const f = add(this.defs, 'filter', { id: this.id('grain'), x: 0, y: 0, width: 1, height: 1 });
      add(f, 'feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, seed: 4, result: 'noise' });
      add(f, 'feColorMatrix', { in: 'noise', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.62', result: 'specks' });
      add(f, 'feFlood', {}, 'pw-grain-color');
      add(f, 'feComposite', { in2: 'specks', operator: 'in', result: 'tinted' });
      add(f, 'feComposite', { in: 'tinted', in2: 'SourceGraphic', operator: 'in' });
      add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: '#fff', filter: url('grain') }, 'pw-grain');
    }
  }

  drawDecor(svg, add, text, decor, R, k, used) {
    if (decor === 'minute-dots') {
      let d = '';
      for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue;
        const [x, y] = polar(R - 6.5, i * 6);
        d += circlePath(x, y, 0.9);
      }
      add(svg, 'path', { d }, 'pw-minute-dot');
    } else if (decor === 'minute-ticks') {
      let d = '';
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 2.5, i * 6);
        const [x2, y2] = polar(R - (i % 5 ? 6 : 8), i * 6);
        d += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
      }
      add(svg, 'path', { d }, 'pw-tick');
    } else if (decor === 'railroad') {
      add(svg, 'circle', { cx: 100, cy: 100, r: R - 3.5 }, 'pw-track');
      add(svg, 'circle', { cx: 100, cy: 100, r: R - 8.5 }, 'pw-track');
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 3.5, i * 6);
        const [x2, y2] = polar(R - 8.5, i * 6);
        add(svg, 'line', { x1, y1, x2, y2 }, i % 5 ? 'pw-tick' : ['pw-tick', 'is-hour']);
      }
    } else if (decor === 'aventurine') {
      // Glittering specks scattered evenly over the dial, and a few brighter glints.
      let seed = 11;
      const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const specks = ['', '', ''];
      for (let i = 0; i < 170; i++) {
        const [x, y] = polar(Math.sqrt(rand()) * (R - 7), rand() * 360);
        specks[i % 3] += circlePath(x, y, 0.2 + rand() * 0.5);
      }
      specks.forEach((d, i) => add(svg, 'path', { d }, ['pw-star', `is-${i}`]));
      for (let i = 0; i < 8; i++) {
        const [x, y] = polar(12 + rand() * (R - 22), rand() * 360);
        const z = 1.1 + rand() * 1.6;
        add(svg, 'path', {
          d: `M ${x} ${y - z} L ${x + z * 0.2} ${y - z * 0.2} L ${x + z} ${y} L ${x + z * 0.2} ${y + z * 0.2} L ${x} ${y + z} L ${x - z * 0.2} ${y + z * 0.2} L ${x - z} ${y} L ${x - z * 0.2} ${y - z * 0.2} Z`,
        }, 'pw-glint');
      }
    } else if (decor === 'sector') {
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.63, 'stroke-width': R * 0.2 }, 'pw-sector-band');
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.42 }, 'pw-sector-line');
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.53 }, 'pw-sector-line');
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.73 }, 'pw-sector-line');
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.84 }, 'pw-sector-line');
      add(svg, 'line', { x1: 100, y1: 100 - R * 0.84, x2: 100, y2: 100 + R * 0.84 }, 'pw-sector-line');
      add(svg, 'line', { x1: 100 - R * 0.84, y1: 100, x2: 100 + R * 0.84, y2: 100 }, 'pw-sector-line');
      let d = '';
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 2.5, i * 6);
        const [x2, y2] = polar(R - (i % 5 ? 5.5 : 8), i * 6);
        d += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
      }
      add(svg, 'path', { d }, 'pw-tick');
    } else if (decor === 'inner-24') {
      let d = '';
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = polar(R - 2.5, i * 6);
        const [x2, y2] = polar(R - (i % 5 ? 5.5 : 8), i * 6);
        d += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
      }
      add(svg, 'path', { d }, 'pw-tick');
      add(svg, 'circle', { cx: 100, cy: 100, r: R - 28 }, 'pw-track');
      for (let i = 0; i < 12; i++) {
        if (used[i]) continue;
        const [x, y] = polar(R - 33.5, i * 30);
        text(svg, x, y, 7.2 * k, String(i === 0 ? 24 : i + 12), 'pw-numeral-24');
      }
    }
  }

  // Printed markers, or faceted metal ones on faces with applied markers.
  drawMarkers(svg, add, text, markers, R, k, used, face) {
    const url = (name) => `url(#${this.id(name)})`;
    const metal = face.applied;
    if (metal) {
      this.gradient(add, 'linearGradient', 'facet-l', { x1: 0, y1: 0, x2: 0, y2: 1 }, [['0%', 'pw-metal-a'], ['100%', 'pw-metal-b']]);
      this.gradient(add, 'linearGradient', 'facet-r', { x1: 0, y1: 0, x2: 0, y2: 1 }, [['0%', 'pw-metal-b'], ['100%', 'pw-metal-c']]);
      this.gradient(add, 'radialGradient', 'stud', { cx: '35%', cy: '30%', r: '75%' }, [['0%', 'pw-metal-a'], ['55%', 'pw-metal-b'], ['100%', 'pw-metal-c']]);
    }
    // Applied markers and numerals cast a small shadow on the dial.
    const shadow = (el) => metal && el.addClass('pw-raised');

    if (markers === 'batons') {
      const baton = (angle, dx, major) => {
        const len = major ? 16.5 : 11.5;
        const y = 100 - R + 5.5;
        if (metal) {
          const w = (major ? 4.6 : 3.2) * k;
          const x = 100 + dx - w / 2;
          const g = add(svg, 'g', { transform: `rotate(${angle} 100 100)` }, ['pw-applied', 'pw-raised']);
          add(g, 'rect', { x, y, width: w / 2, height: len, fill: url('facet-l') });
          add(g, 'rect', { x: x + w / 2, y, width: w / 2, height: len, fill: url('facet-r') });
          add(g, 'rect', { x, y, width: w, height: len, rx: 0.4 }, 'pw-applied-edge');
        } else {
          add(svg, 'line', {
            x1: 100 + dx, y1: y, x2: 100 + dx, y2: y + len, transform: `rotate(${angle} 100 100)`,
          }, major ? ['pw-index', 'is-major'] : 'pw-index');
        }
      };
      const windowHour = face.window ? SLOTS.find((x) => x.key === face.window).hour : -1;
      for (let i = 1; i < 12; i++) if (i !== windowHour) baton(i * 30, 0, i % 3 === 0);
      baton(0, -3.6 * k, true);
      baton(0, 3.6 * k, true);
    } else if (markers === 'arabic') {
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(R - 16.5, i * 30);
        shadow(text(svg, x, y, 14.5 * k, String(i === 0 ? 12 : i), 'pw-numeral'));
      }
    } else if (markers === 'quarters') {
      let d = '';
      for (let i = 0; i < 60; i++) {
        if (face.flange && i % 5) continue;
        const [x1, y1] = polar(R - 4.5, i * 6);
        const [x2, y2] = polar(i % 5 ? R - 8 : R - 13.5, i * 6);
        if (i % 5) d += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
        else add(svg, 'line', { x1, y1, x2, y2 }, ['pw-tick', 'is-hour']);
      }
      if (d) add(svg, 'path', { d }, 'pw-tick');
      for (const i of [0, 3, 6, 9]) {
        if (used[i]) continue;
        const [x, y] = polar(R - 27.5, i * 30);
        shadow(text(svg, x, y, 21 * k, String(i === 0 ? 12 : i), 'pw-numeral'));
      }
    } else if (markers === 'roman') {
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(R - 18.5, i * 30);
        shadow(text(svg, x, y, 12 * k, ROMAN[i], ['pw-numeral', 'is-roman']));
      }
    } else if (markers === 'dots') {
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(R - 12.5, i * 30);
        const r = (i === 0 ? 4 : i % 3 === 0 ? 3 : 2.1) * k;
        if (metal) add(svg, 'circle', { cx: x, cy: y, r: r + 0.3, fill: url('stud') }, ['pw-applied', 'pw-raised']);
        else add(svg, 'circle', { cx: x, cy: y, r }, 'pw-dot-index');
      }
    } else if (markers === 'lume') {
      // Luminous plots in polished metal surrounds.
      const plot = (tag, attr, grow) => {
        const ring = Object.assign({}, attr, { fill: url('metal') });
        if (tag === 'circle') ring.r = attr.r + grow;
        else if (tag === 'rect') Object.assign(ring, { x: attr.x - grow, y: attr.y - grow, width: attr.width + grow * 2, height: attr.height + grow * 2 });
        add(svg, tag, ring, ['pw-applied', 'pw-raised']);
        add(svg, tag, attr, 'pw-lume');
      };
      for (let i = 1; i < 12; i++) {
        if (i % 3 === 0) {
          plot('rect', { x: 100 - 2.6 * k, y: 100 - R + 4.6, width: 5.2 * k, height: 13.4 * k, rx: 1, transform: `rotate(${i * 30} 100 100)` }, 0.9);
        } else {
          const [x, y] = polar(R - 9.5 * k, i * 30);
          plot('circle', { cx: x, cy: y, r: 3.9 * k }, 0.9);
        }
      }
      const top = 100 - R + 4.4;
      add(svg, 'path', { d: `M ${100 - 7.8 * k} ${top - 0.8} L ${100 + 7.8 * k} ${top - 0.8} L 100 ${top + 15 * k} Z`, fill: url('metal') }, ['pw-applied', 'pw-raised']);
      add(svg, 'path', { d: `M ${100 - 6.6 * k} ${top} L ${100 + 6.6 * k} ${top} L 100 ${top + 13 * k} Z` }, 'pw-lume');
    } else if (markers === 'minimal') {
      const dot = { cx: 100, cy: 100 - R + 12 * k, r: 3.6 * k };
      if (metal) add(svg, 'circle', Object.assign(dot, { fill: url('stud') }), ['pw-applied', 'pw-raised']);
      else add(svg, 'circle', dot, 'pw-dot-index');
    }
  }

  // Something useful at 12, 3, 6 or 9 o'clock.
  drawComplication(svg, add, text, type, cx, cy, k, now) {
    const live = this.parts.live;
    const windowed = (w, value) => {
      const x = cx - (w * k) / 2;
      const y = cy - 8.5 * k;
      add(svg, 'rect', { x, y, width: w * k, height: 17 * k, rx: 2.5 * k }, 'pw-date-bg');
      add(svg, 'path', { d: `M ${x + 1.6 * k} ${y + 1.1 * k} L ${x + (w - 1.6) * k} ${y + 1.1 * k}` }, 'pw-date-shade');
      text(svg, cx, cy + 0.4 * k, 11 * k, value, 'pw-date');
    };
    const reading = (caption, liveType) => {
      const value = text(svg, cx, cy - 2 * k, 11.5 * k, '', 'pw-reading');
      text(svg, cx, cy + 8 * k, 5.6 * k, caption, 'pw-caption');
      live.push({ type: liveType, el: value });
    };
    const subdial = () => {
      add(svg, 'circle', { cx, cy, r: 17 * k }, 'pw-subdial');
      for (let r = 3 * k; r < 15 * k; r += 1.3 * k) add(svg, 'circle', { cx, cy, r }, 'pw-snailing');
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const len = i % 3 === 0 ? 3.4 : 2;
        add(svg, 'line', {
          x1: cx + 15.5 * k * Math.sin(a), y1: cy - 15.5 * k * Math.cos(a),
          x2: cx + (15.5 - len) * k * Math.sin(a), y2: cy - (15.5 - len) * k * Math.cos(a),
        }, 'pw-subdial-tick');
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
      this.drawMoonWindow(svg, add, cx, cy, k, now);
    } else if (type === 'movement') {
      this.drawMovementWindow(svg, add, cx, cy, 19.5 * k);
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

  // The classic moon phase window: a turning disc of night sky carrying two gold moons,
  // seen through an arch whose two humps hide the moon around new moon.
  drawMoonWindow(svg, add, cx, cy, k, now) {
    const a = 21 * k;
    const base = cy + a * 0.42;
    const arch = `M ${cx - a} ${base} A ${a} ${a} 0 0 1 ${cx + a} ${base} A ${a / 2} ${a / 2} 0 0 0 ${cx} ${base} A ${a / 2} ${a / 2} 0 0 0 ${cx - a} ${base} Z`;
    this.clips = (this.clips || 0) + 1;
    const clipId = this.id(`moon-${this.clips}`);
    add(add(this.defs, 'clipPath', { id: clipId }), 'path', { d: arch });
    this.gradient(add, 'linearGradient', 'sky', { x1: 0, y1: 0, x2: 0, y2: 1 }, [['0%', '#2a4a8c'], ['100%', '#0c1736']]);
    this.gradient(add, 'radialGradient', 'moon', { cx: '38%', cy: '34%', r: '70%' }, [['0%', '#fff6d6'], ['55%', '#ebc66a'], ['100%', '#b28431']]);

    const g = add(svg, 'g', { 'clip-path': `url(#${clipId})` });
    add(g, 'rect', { x: cx - a, y: base - a - 1, width: 2 * a, height: a + 2, fill: `url(#${this.id('sky')})` });
    const disc = add(g, 'g', { transform: `rotate(${((moonPhase(now) - 0.5) * 180).toFixed(2)} ${cx} ${base})` });
    let seed = 5;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 16; i++) {
      const r = a * (0.12 + rand() * 0.85);
      const t = rand() * 2 * Math.PI;
      const x = cx + r * Math.cos(t);
      const y = base + r * Math.sin(t);
      const z = (0.5 + rand() * 0.9) * k;
      add(disc, 'path', {
        d: `M ${x} ${y - z} L ${x + z * 0.28} ${y - z * 0.28} L ${x + z} ${y} L ${x + z * 0.28} ${y + z * 0.28} L ${x} ${y + z} L ${x - z * 0.28} ${y + z * 0.28} L ${x - z} ${y} L ${x - z * 0.28} ${y - z * 0.28} Z`,
      }, 'pw-moon-star');
    }
    for (const dy of [-a / 2, a / 2]) {
      const my = base + dy;
      add(disc, 'circle', { cx, cy: my, r: a * 0.46, fill: `url(#${this.id('moon')})` }, 'pw-moon');
      for (const [x, y, r] of [[-0.14, -0.1, 0.1], [0.12, 0.06, 0.07], [-0.02, 0.18, 0.06], [0.16, -0.16, 0.045]]) {
        add(disc, 'circle', { cx: cx + x * a, cy: my + y * a, r: r * a }, 'pw-crater');
      }
    }
    add(svg, 'path', { d: arch }, 'pw-moon-arch');
  }

  // A window onto the movement, drawn like a real pocket watch movement at 18,000 beats an
  // hour: the balance wheel with its timing screws and blued Breguet hairspring, under a
  // polished cock with a shock-protected jewel and a regulator; the pallet fork and escape
  // wheel; a wheel of the gear train turning once a minute; a bridge with Geneva stripes;
  // perlage on the plate; rubies in gold chatons; blued screws. The parts cast small shadows
  // on each other. Drawn on a 60 unit circle around (0, 0), then scaled to radius r.
  drawMovementWindow(svg, add, cx, cy, r) {
    const url = (name) => `url(#${this.id(name)})`;
    const once = (name, build) => {
      if (!this.defs.querySelector(`#${this.id(name)}`)) build(this.id(name));
    };
    const B = [-3, -3];
    const P = [10, 4];
    const E = [17, 13];
    const T = [-22, -18];
    const bridgePath = 'M -34 21 L 34 17 L 34 36 L -34 36 Z';
    const cockPath = 'M 13 -34 Q 3.5 -22 -0.1 -8.02 A 5.8 5.8 0 1 0 2.45 -1.02 Q 18 -1 38 -11 L 38 -34 Z';

    once('mv-window', (id) => add(add(this.defs, 'clipPath', { id }), 'circle', { cx: 0, cy: 0, r: 30 }));
    once('mv-bridge', (id) => add(add(this.defs, 'clipPath', { id }), 'path', { d: bridgePath }));
    once('mv-cock', (id) => add(add(this.defs, 'clipPath', { id }), 'path', { d: cockPath }));
    this.gradient(add, 'radialGradient', 'plate', { cx: '35%', cy: '30%', r: '80%' }, [['0%', '#b9bfc7'], ['100%', '#6b717a']]);
    this.gradient(add, 'linearGradient', 'bridge', { x1: 0, y1: 0, x2: 0.3, y2: 1 }, [['0%', '#f1f3f5'], ['100%', '#a7adb6']]);
    this.gradient(add, 'linearGradient', 'gold', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', '#f7e4a8'], ['50%', '#d2a54e'], ['100%', '#8a6325']]);
    this.gradient(add, 'linearGradient', 'steel', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', '#f4f6f8'], ['55%', '#c3c9d0'], ['100%', '#868d96']]);
    this.gradient(add, 'radialGradient', 'perl', { cx: '40%', cy: '35%', r: '65%' }, [['0%', 'rgba(255,255,255,0.32)'], ['70%', 'rgba(255,255,255,0.04)'], ['100%', 'rgba(0,0,0,0.14)']]);
    this.gradient(add, 'linearGradient', 'cotes', { x1: 0, y1: 0, x2: 1, y2: 0 }, [['0%', 'rgba(0,0,0,0.1)'], ['45%', 'rgba(255,255,255,0.55)'], ['100%', 'rgba(0,0,0,0.1)']]);
    this.gradient(add, 'radialGradient', 'vignette', { cx: '50%', cy: '50%', r: '50%' }, [['60%', 'rgba(0,0,0,0)'], ['100%', 'rgba(0,0,0,0.6)']]);
    this.gradient(add, 'linearGradient', 'sapphire', { x1: 0, y1: 0, x2: 0.6, y2: 1 }, [['0%', 'rgba(255,255,255,0.22)'], ['100%', 'rgba(255,255,255,0)']]);
    // Perlage: rows of small overlapping circular grains.
    once('mv-perlage', (id) => {
      const pat = add(this.defs, 'pattern', { id, patternUnits: 'userSpaceOnUse', width: 4.4, height: 4.4 });
      for (const [x, y] of [[0, 0], [4.4, 0], [0, 4.4], [4.4, 4.4], [2.2, 2.2]]) add(pat, 'circle', { cx: x, cy: y, r: 2.6, fill: url('perl') });
    });
    // Côtes de Genève: wide polished bands, set at an angle.
    once('mv-cotes', (id) => {
      const pat = add(this.defs, 'pattern', { id, patternUnits: 'userSpaceOnUse', width: 6, height: 80, patternTransform: 'rotate(-16)' });
      add(pat, 'rect', { x: 0, y: 0, width: 6, height: 80, fill: url('cotes') });
    });
    once('mv-shadow', (id) => {
      const f = add(this.defs, 'filter', { id, x: '-30%', y: '-30%', width: '160%', height: '160%' });
      add(f, 'feDropShadow', { dx: 0.9, dy: 1.3, stdDeviation: 0.7, 'flood-color': '#000', 'flood-opacity': 0.5 });
    });

    const outer = add(svg, 'g', { transform: `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${(r / 30).toFixed(4)})` });
    const g = add(outer, 'g', { 'clip-path': url('mv-window') });
    const layer = () => add(g, 'g', { filter: url('mv-shadow') });
    const jewel = (parent, x, y, size) => {
      add(parent, 'circle', { cx: x, cy: y, r: size * 1.8, fill: url('gold') }, 'pw-mv-chaton');
      add(parent, 'circle', { cx: x, cy: y, r: size }, 'pw-mv-ruby');
      add(parent, 'circle', { cx: x - size * 0.35, cy: y - size * 0.35, r: size * 0.32 }, 'pw-mv-glint');
    };
    const screw = (parent, x, y, turn) => {
      add(parent, 'circle', { cx: x, cy: y, r: 2 }, 'pw-mv-screw');
      const t = ((turn || 30) * Math.PI) / 180;
      add(parent, 'line', { x1: x - 1.4 * Math.cos(t), y1: y - 1.4 * Math.sin(t), x2: x + 1.4 * Math.cos(t), y2: y + 1.4 * Math.sin(t) }, 'pw-mv-slot');
      add(parent, 'circle', { cx: x - 0.6, cy: y - 0.7, r: 0.5 }, 'pw-mv-glint');
    };
    const at = (c, rr, deg) => [c[0] + rr * Math.cos((deg * Math.PI) / 180), c[1] + rr * Math.sin((deg * Math.PI) / 180)];

    // The main plate, grained with perlage.
    add(g, 'circle', { cx: 0, cy: 0, r: 31, fill: url('plate') });
    add(g, 'circle', { cx: 0, cy: 0, r: 31, fill: url('mv-perlage') });
    add(g, 'circle', { cx: 5.6, cy: -0.4, r: 0.75 }, 'pw-mv-pin');
    add(g, 'circle', { cx: 7.6, cy: -2.1, r: 0.75 }, 'pw-mv-pin');

    // A wheel of the gear train, mostly behind the dial, turning once a minute.
    const trainWrap = layer();
    const train = add(trainWrap, 'g', {}, ['pw-mv-spin', 'is-train']);
    add(train, 'path', { d: gearPath(T[0], T[1], 16, 64), 'fill-rule': 'evenodd' }, 'pw-mv-wheel');
    add(train, 'circle', { cx: T[0], cy: T[1], r: 12.6 }, 'pw-mv-wheel-ring');

    // The escape wheel, advancing a tooth with every second beat.
    const escapeWrap = layer();
    const escape = add(escapeWrap, 'g', {}, ['pw-mv-spin', 'is-escape']);
    add(escape, 'path', { d: gearPath(E[0], E[1], 7.6, 15, true), 'fill-rule': 'evenodd', fill: url('steel') }, 'pw-mv-steel');

    // The pallet fork, snapping from side to side on each beat.
    const forkWrap = layer();
    const fork = add(forkWrap, 'g', {}, 'pw-mv-fork');
    add(fork, 'circle', { cx: P[0], cy: P[1], r: 13, fill: 'none' });
    const lever = `M 1.4 -1.4 L ${P[0]} ${P[1]} M 10.2 9.8 L ${P[0]} ${P[1]} L 15.6 4.6`;
    const horns = 'M 1.4 -1.4 L 0.2 -2.9 M 1.4 -1.4 L 2.9 -2.5';
    add(fork, 'path', { d: lever }, ['pw-mv-lever', 'is-outline']);
    add(fork, 'path', { d: horns }, ['pw-mv-lever', 'is-fine', 'is-outline']);
    add(fork, 'path', { d: lever }, 'pw-mv-lever');
    add(fork, 'path', { d: horns }, ['pw-mv-lever', 'is-fine']);
    add(fork, 'rect', { x: 9.4, y: 9.1, width: 1.7, height: 2.4, rx: 0.3, transform: 'rotate(-35 10.2 10.3)' }, 'pw-mv-ruby');
    add(fork, 'rect', { x: 15, y: 4.2, width: 2.4, height: 1.7, rx: 0.3, transform: 'rotate(25 16.2 5)' }, 'pw-mv-ruby');

    // The bridge across the bottom, with Geneva stripes and polished, bevelled edges.
    const bridgeWrap = layer();
    const bridge = add(bridgeWrap, 'g', { 'clip-path': url('mv-bridge') });
    add(bridge, 'path', { d: bridgePath, fill: url('bridge') });
    add(bridge, 'path', { d: bridgePath, fill: url('mv-cotes') });
    add(bridgeWrap, 'path', { d: 'M -34 21 L 34 17' }, 'pw-mv-edge');
    add(bridgeWrap, 'path', { d: 'M -34 21.7 L 34 17.7' }, 'pw-mv-bevel');
    screw(bridgeWrap, -21, 27.5, 20);
    screw(bridgeWrap, 24, 25.5, 75);
    jewel(bridgeWrap, 2, 26.5, 1.3);

    // Jewels for the wheels and the fork, set in the plate.
    jewel(g, T[0], T[1], 1.5);
    jewel(g, E[0], E[1], 1.1);
    jewel(g, P[0], P[1], 0.8);

    // The balance wheel: a gold rim with timing screws, three arms and the roller.
    const balanceWrap = layer();
    const balance = add(balanceWrap, 'g', {}, 'pw-mv-balance');
    add(balance, 'circle', { cx: B[0], cy: B[1], r: 17.5, fill: 'none' });
    add(balance, 'circle', { cx: B[0], cy: B[1], r: 14.8, fill: 'none', stroke: url('gold') }, 'pw-mv-rim');
    add(balance, 'circle', { cx: B[0], cy: B[1], r: 16 }, 'pw-mv-rim-shine');
    add(balance, 'circle', { cx: B[0], cy: B[1], r: 13.6 }, 'pw-mv-rim-edge');
    for (let i = 0; i < 3; i++) {
      const [x, y] = at(B, 14, i * 120 + 30);
      add(balance, 'line', { x1: B[0], y1: B[1], x2: x, y2: y, stroke: url('gold') }, 'pw-mv-arm');
    }
    for (let i = 0; i < 14; i++) {
      const [x, y] = at(B, 16.4, (i * 360) / 14);
      add(balance, 'circle', { cx: x, cy: y, r: 0.95, fill: url('gold') }, 'pw-mv-rim-screw');
    }
    add(balance, 'circle', { cx: B[0], cy: B[1], r: 2.4, fill: url('gold') }, 'pw-mv-hub');
    add(balance, 'rect', { x: B[0] - 0.4, y: B[1] + 1.4, width: 0.8, height: 1.3, rx: 0.2 }, 'pw-mv-ruby');

    // The blued Breguet hairspring, breathing with the balance, its overcoil held at the stud.
    const spring = add(g, 'g', {}, 'pw-mv-hairspring');
    add(spring, 'circle', { cx: B[0], cy: B[1], r: 11.5, fill: 'none' });
    let d = '';
    for (let t = 0; t <= 22 * Math.PI; t += 0.18) {
      const rr = 2.2 + (t / (22 * Math.PI)) * 8.4;
      const [x, y] = at(B, rr, (t * 180) / Math.PI);
      d += `${d ? ' L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    add(spring, 'path', { d }, 'pw-mv-spring');
    const [sx, sy] = at(B, 11.6, -55);
    const [ox, oy] = at(B, 10.6, 0);
    add(g, 'path', { d: `M ${ox.toFixed(2)} ${oy.toFixed(2)} Q ${(B[0] + 13).toFixed(2)} ${(B[1] - 6).toFixed(2)} ${sx.toFixed(2)} ${sy.toFixed(2)}` }, 'pw-mv-spring');

    // The balance cock: polished, with a snailed disc, a shock-protected jewel, the regulator
    // index and its scale, and the stud that holds the hairspring.
    const cock = layer();
    add(cock, 'path', { d: cockPath, fill: url('bridge') }, 'pw-mv-cock');
    add(add(cock, 'g', { 'clip-path': url('mv-cock') }), 'path', { d: cockPath, fill: url('mv-cotes'), transform: 'rotate(40 10 -20)' }, 'pw-mv-cock-cotes');
    for (let rr = 1.2; rr < 5.6; rr += 0.55) add(cock, 'circle', { cx: B[0], cy: B[1], r: rr }, 'pw-mv-snail');
    add(cock, 'path', { d: cockPath }, 'pw-mv-cock-bevel');
    let ticks = '';
    for (let i = 0; i <= 8; i++) {
      const deg = -58 + i * 3;
      const [x1, y1] = at(B, 21, deg);
      const [x2, y2] = at(B, i % 4 === 0 ? 23.4 : 22.4, deg);
      ticks += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
    }
    add(cock, 'path', { d: ticks }, 'pw-mv-scale');
    const [ix, iy] = at(B, 21.4, -46);
    add(cock, 'path', { d: `M ${B[0]} ${B[1]} L ${ix.toFixed(2)} ${iy.toFixed(2)}` }, 'pw-mv-index');
    add(cock, 'rect', { x: sx - 1.1, y: sy - 1.1, width: 2.2, height: 2.2, rx: 0.3, fill: url('steel'), transform: `rotate(-55 ${sx} ${sy})` }, 'pw-mv-stud');
    jewel(cock, B[0], B[1], 1.25);
    add(cock, 'circle', { cx: B[0], cy: B[1], r: 3.4 }, 'pw-mv-lyre');
    screw(cock, 25, -25, 120);
    add(cock, 'circle', { cx: 31, cy: -16, r: 0.9, fill: url('steel') }, 'pw-mv-pin');

    // Depth and the polished, bevelled edge of the window.
    add(outer, 'circle', { cx: 0, cy: 0, r: 30, fill: url('vignette') });
    add(outer, 'path', { d: 'M -27 -9 A 28.5 28.5 0 0 1 9 -27 A 34 34 0 0 0 -27 -9 Z', fill: url('sapphire') });
    add(outer, 'circle', { cx: 0, cy: 0, r: 29.2 }, 'pw-window-edge');
    add(outer, 'circle', { cx: 0, cy: 0, r: 30.6, fill: 'none', stroke: url('metal') }, 'pw-window-rim');
  }

  // Hands are drawn pointing at 12 around (0, 0) and turned into place by update(). Most are
  // faceted: the two halves catch the light differently, like polished metal.
  drawHand(g, add, style, len, k, hour) {
    const halves = (half) => {
      add(g, 'path', { d: half(-1) }, 'pw-hand-body');
      add(g, 'path', { d: half(1) }, 'pw-hand-shade');
    };
    if (style === 'baton') {
      const w = (hour ? 7.2 : 5.2) * k;
      const r = w / 2;
      const tail = (hour ? 10 : 12) * k;
      halves((s) => `M 0 ${-len} A ${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${s * r} ${-len + r} L ${s * r} ${tail - r} A ${r} ${r} 0 0 ${s > 0 ? 1 : 0} 0 ${tail} Z`);
      add(g, 'rect', { x: -w / 2 + 1.5 * k, y: -len + 4 * k, width: w - 3 * k, height: len * 0.55, rx: (w - 3 * k) / 2 }, 'pw-hand-lume');
    } else if (style === 'breguet') {
      const ringY = -len * (hour ? 0.68 : 0.81);
      const ringR = (hour ? 5.6 : 4.4) * k;
      const w = (hour ? 2.8 : 2.2) * k;
      add(g, 'rect', { x: -w / 2, y: ringY + ringR - 0.5, width: w, height: -ringY - ringR + 10.5 * k, rx: w / 2 }, 'pw-hand-body');
      add(g, 'circle', { cx: 0, cy: ringY, r: ringR }, 'pw-hand-ring');
      halves((s) => `M 0 ${ringY - ringR + 0.5} L ${s * w * 0.6} ${ringY - ringR + 0.5} L 0 ${-len} Z`);
    } else if (style === 'dauphine') {
      const w = (hour ? 8 : 6.2) * k;
      const tail = 7 * k;
      halves((s) => `M 0 ${tail} L ${s * w / 2} ${-len * 0.06} L 0 ${-len} Z`);
    } else if (style === 'sword') {
      const w = (hour ? 7.4 : 5.6) * k;
      const tail = 10 * k;
      halves((s) => `M 0 ${tail} L ${s * w * 0.28} ${tail} L ${s * w / 2} ${-len * 0.74} L 0 ${-len} Z`);
      add(g, 'path', { d: `M ${-w * 0.14} ${-len * 0.12} L ${-w * 0.27} ${-len * 0.72} L 0 ${-len * 0.88} L ${w * 0.27} ${-len * 0.72} L ${w * 0.14} ${-len * 0.12} Z` }, 'pw-hand-lume');
    } else if (style === 'pencil') {
      const w = (hour ? 3.8 : 2.8) * k;
      const tail = 8 * k;
      halves((s) => `M 0 ${tail} L ${s * w / 2} ${tail} L ${s * w / 2} ${-len + 6 * k} L 0 ${-len} Z`);
    } else if (style === 'arrow') {
      if (hour) {
        const w = 3.2 * k;
        const head = 13 * k;
        halves((s) => `M 0 ${10 * k} L ${s * w / 2} ${10 * k} L ${s * w / 2} ${-len + head - 1} L 0 ${-len + head - 1} Z`);
        halves((s) => `M 0 ${-len + head} L ${s * 6.5 * k} ${-len + head} L 0 ${-len} Z`);
        add(g, 'path', { d: `M ${-3.4 * k} ${-len + head - 2 * k} L 0 ${-len + 5 * k} L ${3.4 * k} ${-len + head - 2 * k} Z` }, 'pw-hand-lume');
      } else {
        const w = 3.4 * k;
        halves((s) => `M 0 ${12 * k} L ${s * w / 2} ${12 * k} L ${s * w / 2} ${-len + 3 * k} L 0 ${-len} Z`);
        add(g, 'rect', { x: -0.7 * k, y: -len + 5 * k, width: 1.4 * k, height: len * 0.6, rx: 0.7 * k }, 'pw-hand-lume');
      }
    } else {
      const w = (hour ? 6.6 : 4.8) * k;
      const tail = (hour ? 11 : 13) * k;
      halves((s) => `M 0 ${tail} C ${s * w} ${-len * 0.15} ${s * w * 0.7} ${-len * 0.62} 0 ${-len} Z`);
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
  // the status bar. Null when the box is collapsed, such as a closed sidebar.
  spotXY(box, spot) {
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    if (box.right - box.left < 40 || box.bottom - box.top < 40) return null;
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
    return { x: clamp(x, 0, window.innerWidth - w), y: clamp(y, 0, window.innerHeight - h) };
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
    setIfChanged(this.badgeEl, 'data-side', spot[0] === 'b' ? 'above' : 'below');
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
    const x = p.session;
    if (this.sessionKey !== (x ? `${x.kind}|${x.paused}` : '')) {
      this.render();
      return;
    }
    if (x && this.focusTimeEl) {
      const left = p.sessionRemaining();
      setText(this.focusTimeEl, `${Math.ceil(left / 60000)} min`);
      setText(this.focusLabelEl, x.paused ? 'Paused' : `${SESSION_NAMES[x.kind]} · until ${fmtTime(new Date(x.endsAt), uses24h(p.settings.clock))}`);
      this.focusFillEl.style.width = `${(left / x.total) * 100}%`;
    }
    this.clockEl.setText(fmtShort(p.getDay(today).ms));
    this.stateEl.setText(STATE_LABELS[p.state]);
    this.headEl.setAttr('data-state', p.state);
    this.pauseBtn.setText(p.paused ? 'Resume tracking' : 'Pause tracking');
  }

  render() {
    const el = this.el;
    const scroll = el.scrollTop;
    el.empty();
    this.lastRender = Date.now();
    this.renderedDay = dayKey(new Date());

    this.renderToday(el.createDiv('pocket-watch-section'));
    this.renderFocus(el.createDiv('pocket-watch-section'));
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

  // Start a focus session or a break, or follow the one that's running.
  renderFocus(el) {
    const p = this.plugin;
    const s = p.settings;
    const x = p.session;
    this.sessionKey = x ? `${x.kind}|${x.paused}` : '';
    this.focusTimeEl = null;
    el.createEl('h4', { text: 'Focus' });
    const box = el.createDiv('pocket-watch-focus');
    const button = (row, label, onClick, cta) => {
      const b = row.createEl('button', { text: label });
      if (cta) b.addClass('mod-cta');
      b.addEventListener('click', () => {
        onClick();
        this.render();
      });
    };
    if (x) {
      box.setAttr('data-kind', x.paused ? 'paused' : x.kind);
      const top = box.createDiv('pocket-watch-focus-top');
      this.focusTimeEl = top.createDiv('pocket-watch-focus-time');
      this.focusLabelEl = top.createDiv('pocket-watch-focus-label');
      this.focusFillEl = box.createDiv('pocket-watch-focus-bar').createDiv('pocket-watch-focus-fill');
      const row = box.createDiv('pocket-watch-focus-buttons');
      button(row, x.paused ? 'Resume' : 'Pause', () => p.toggleSessionPause(), true);
      button(row, x.kind === 'focus' ? 'Skip to break' : 'Skip to focus', () => p.skipSession());
      button(row, 'Stop', () => p.stopSession());
    } else {
      const row = box.createDiv('pocket-watch-focus-buttons');
      button(row, `Focus ${s.focusMinutes} min`, () => p.startSession('focus'), true);
      button(row, `Break ${s.shortBreakMinutes}`, () => p.startSession('short'));
      button(row, `Long ${s.longBreakMinutes}`, () => p.startSession('long'));
    }
    const day = p.getDay(dayKey(new Date()));
    const n = day.sessions || 0;
    const left = s.longBreakEvery - (p.cycle % s.longBreakEvery);
    const summary = n ? `Today: ${n} ${n === 1 ? 'session' : 'sessions'}, ${fmtShort(day.focusMs || 0)} of focus.` : 'No focus sessions yet today.';
    el.createDiv({ cls: 'pocket-watch-compare', text: `${summary} A long break after ${left} more.` });
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
      if (p.getDay(key).sessions) cell.createDiv('pocket-watch-cal-dot');
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
    row('Focus sessions', d.sessions ? `${d.sessions} (${fmtShort(d.focusMs || 0)})` : '0');
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
    tile('Focus sessions', fmtNum(s.sessions), 'all time');
    tile('Focus time', fmtShort(s.focusMs), 'all time');

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
      dropdown(new Setting(el).setName('Face'), faceNames(), s.face, (v) => set({ face: v }, true));
      dropdown(new Setting(el).setName('Case'), CASES, s.caseStyle, (v) => set({ caseStyle: v }));
      toggle('Name on the dial', 'dialText', 'Prints "Pocket Watch" and the face name under 12 o\'clock, when nothing else is there.');
      dropdown(new Setting(el).setName('Hour markers'), MARKERS, s.markers, (v) => set({ markers: v }));
      dropdown(new Setting(el).setName('Hands'), HANDS, s.hands, (v) => set({ hands: v }));
      dropdown(new Setting(el).setName('Seconds hand'), SECONDS, s.seconds, (v) => set({ seconds: v }));
      const face = ANALOG_FACES[s.face] || ANALOG_FACES.porcelain;
      for (const slot of SLOTS) {
        const setting = new Setting(el).setName(slot.name);
        dropdown(setting, COMPLICATIONS, s[slot.key], (v) => set({ [slot.key]: v }));
        if (face.window === slot.key) setting.setDesc(`The ${face.name} face shows its movement here.`).setDisabled(true);
      }
      toggle('Goal ring', 'goalRing', 'A ring on the bezel that fills up toward your daily goal, and dims while the timer is paused.');
      dropdown(
        new Setting(el).setName('Movement').setDesc('How the balance wheel and the wheels move in the open heart face and the movement window. Lifelike runs at the pace of a classic pocket watch: five ticks a second.'),
        MOVEMENTS, s.movement, (v) => set({ movement: v }),
      );
    }

    new Setting(el).setName('Focus sessions').setHeading();
    const minutes = (name, key, min, max, step, desc) => {
      const setting = new Setting(el).setName(name);
      if (desc) setting.setDesc(desc);
      setting.addSlider((sl) => sl.setLimits(min, max, step).setValue(s[key]).setDynamicTooltip().onChange(async (v) => {
        s[key] = v;
        await p.saveSettings();
      }));
    };
    minutes('Focus (minutes)', 'focusMinutes', 5, 90, 5, 'Start a session from the shelf, the command palette, or by right-clicking the watch. The ring on the bezel counts down.');
    minutes('Short break (minutes)', 'shortBreakMinutes', 1, 30, 1);
    minutes('Long break (minutes)', 'longBreakMinutes', 5, 60, 5);
    minutes('Long break after', 'longBreakEvery', 2, 8, 1, 'How many focus sessions come before a long break.');
    const plain = (name, key, desc) => {
      const setting = new Setting(el).setName(name);
      if (desc) setting.setDesc(desc);
      setting.addToggle((t) => t.setValue(s[key]).onChange(async (v) => {
        s[key] = v;
        await p.saveSettings();
        if (p.watch) p.watch.refresh();
      }));
      return setting;
    };
    plain('Start breaks automatically', 'autoStartBreaks');
    plain('Start the next focus session automatically', 'autoStartFocus');
    plain('Countdown under the watch', 'showCountdown', 'Shows the minutes left in a small label next to the watch.');
    plain('Chime', 'chime', 'A soft bell when a session or break ends.')
      .addExtraButton((b) => b.setIcon('volume-2').setTooltip('Play the chime').onClick(() => chime()));

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
