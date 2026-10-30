'use strict';

const { Plugin, PluginSettingTab, Setting, MarkdownView, Notice, Menu, ItemView, Modal, setIcon } = require('obsidian');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// Each analog face is a watch of its own: a case, hour markers, hands and a set of
// complications (set: what sits at 12, 3, 6 and 9), and optionally a decoration, a dial
// finish (texture), a painting (art), a flange with a minute track, polished metal (applied)
// markers, a window onto the movement in one slot, and serif printing. A regulator shows the
// hours on a small dial of their own in one slot and leaves the centre to the minutes, and a
// Pomodoro face paints the focus session and the break after it on the dial. The Philip
// Pocket monogram is printed under 12 (brandWidth and brandClear size and place it);
// brandAt: 'six' moves it above 6, 'low' just below the hands and 'nine' to their left, brandInk
// prints it rather than applying it in metal on a light dial, and brandEngraved cuts it into
// the dial. Its colours live in styles.css
// under .pocket-watch-face-<key>.
const ANALOG_FACES = {
  porcelain: {
    name: 'Porcelain', case: 'polished', markers: 'batons', decor: 'minute-dots', texture: 'enamel', serif: true,
    hands: 'leaf', set: { slotRight: 'weekday-date', slotBottom: 'moon' },
  },
  linen: {
    name: 'Linen', case: 'polished', markers: 'roman', decor: 'railroad', texture: 'guilloche', serif: true,
    hands: 'breguet', subdial: 1.32, set: { slotBottom: 'seconds' },
  },
  slate: {
    name: 'Slate', case: 'polished', markers: 'quarters', texture: 'slate', flange: true, applied: true,
    hands: 'sword', set: { slotRight: 'date', slotBottom: 'words' },
  },
  midnight: {
    name: 'Midnight', case: 'polished', markers: 'dots', decor: 'aventurine', texture: 'sunburst', flange: true, applied: true,
    hands: 'dauphine', set: { slotBottom: 'moon-age' },
  },
  sakura: {
    name: 'Sakura', case: 'polished', markers: 'pips', art: 'sakura', flange: true, applied: true,
    hands: 'dauphine', set: {},
  },
  nocturne: {
    name: 'Nocturne', case: 'polished', markers: 'pips', art: 'nocturne', flange: true, applied: true,
    hands: 'leaf', set: {},
  },
  meteorite: {
    name: 'Meteorite', case: 'polished', markers: 'batons', art: 'meteorite', texture: 'grain', flange: true, applied: true, brandEngraved: true,
    hands: 'dauphine', set: { slotBottom: 'seconds' },
  },
  openheart: {
    name: 'Open heart', case: 'polished', markers: 'batons', texture: 'azurage', flange: true, applied: true, window: 'slotBottom', windowShape: 'heart',
    hands: 'dauphine', set: {},
  },
  bauhaus: {
    name: 'Bauhaus', case: 'thin', markers: 'arabic', decor: 'minute-ticks',
    hands: 'baton', set: { slotRight: 'date' },
  },
  void: {
    name: 'Void', case: 'thin', markers: 'minimal', applied: true,
    hands: 'baton', set: {},
  },
  field: {
    name: 'Field', case: 'polished', markers: 'arabic', decor: 'inner-24', texture: 'grain',
    hands: 'sword', set: { slotRight: 'date', slotBottom: 'focus' },
  },
  sector: {
    name: 'Sector', case: 'polished', markers: 'arabic', decor: 'sector', texture: 'grain',
    hands: 'sword', set: { slotBottom: 'goal' },
  },
  panda: {
    name: 'Panda', case: 'polished', markers: 'batons', texture: 'sunburst', art: 'panda', applied: true, brandInk: true,
    hands: 'baton', set: { slotLeft: 'seconds', slotRight: 'goal' },
  },
  diver: {
    name: 'Diver', case: 'dive', markers: 'lume', texture: 'waves',
    hands: 'arrow', set: { slotRight: 'date' },
  },
  rose: {
    name: 'Rosé', case: 'polished', markers: 'batons', texture: 'sunburst', flange: true, applied: true, serif: true, brandInk: true,
    hands: 'leaf', set: { slotLeft: 'month', slotRight: 'date' },
  },
  pomodoro: {
    name: 'Pomodoro', case: 'polished', markers: 'minutes', texture: 'enamel', pomodoro: true, serif: true,
    brandWidth: 22, hands: 'dauphine', set: {},
  },
  regulator: {
    name: 'Regulator', case: 'polished', markers: 'minutes', decor: 'railroad', texture: 'sunburst', regulator: 'slotTop',
    brandAt: 'nine', brandWidth: 22, serif: true, hands: 'breguet', subdial: 1.3, set: { slotBottom: 'seconds' },
  },
  malachite: {
    name: 'Malachite', case: 'polished', markers: 'batons', art: 'malachite', flange: true, applied: true, brandAt: 'low', brandWidth: 30, brandEngraved: true,
    hands: 'dauphine', set: {},
  },
  koi: {
    name: 'Koi', shape: 'square', case: 'polished', markers: 'square', art: 'koi', applied: true,
    hands: 'leaf', set: {},
  },
  deco: {
    name: 'Deco', shape: 'square', case: 'polished', markers: 'deco', art: 'deco', applied: true,
    hands: 'sword', set: { slotBottom: 'seconds' },
  },
  theme: {
    name: 'Match theme', case: 'thin', markers: 'batons', decor: 'minute-dots',
    hands: 'baton', set: { slotRight: 'date' },
  },
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
  pips: 'Small pips',
  minutes: 'Minutes',
  square: 'Square, along the edge',
  deco: 'Deco numerals',
  none: 'None',
};

const HANDS = {
  face: "Face's own",
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

const SESSION_COLOURS = {
  colour: 'Colour: orange for focus, green for breaks',
  grey: 'Greyscale: just the watch while you focus, a soft fade on breaks',
};

const TIMES_UP = {
  glow: 'Glow: a soft halo that breathes',
  colour: 'Colour: the ring and dial take on the colour',
  dot: 'Dot: a small dot on the edge',
  off: 'Off',
};

const MOVEMENTS = { lifelike: 'Lifelike, 18,000 beats an hour', gentle: 'Gentle', still: 'Still' };

const COMPLICATION_SETS = { face: 'As designed', custom: 'Your own' };

const COMPLICATIONS = {
  none: 'Nothing',
  date: 'Date',
  'weekday-date': 'Weekday and date',
  month: 'Month',
  moon: 'Moon phase, arched window',
  'moon-age': 'Moon phase, round window with its age',
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

// The Philip Pocket monogram: two Great Vibes capital P's (SIL Open Font License), the second
// turned half a turn and laid across the first. Centred on (0, 0), about 130 units wide.
const MONOGRAM = {
  box: [-66.3, -48.1, 66.3, 48.1],
  path: 'M-49.8 37.2Q-52 37.2 -54.1 36.9Q-60.4 36.1 -63.3 33.2Q-66.3 30.3 -66.3 26.9Q-66.3 23.2 -62.9 20.2Q-59.6 17.2 -53.5 17.2Q-51.6 17.2 -49.4 17.6Q-47.3 17.9 -44.9 18.7Q-43.7 19.1 -43.7 19.8Q-43.7 20.2 -44.3 20.2Q-44.9 20.2 -45.3 20Q-46.9 19.4 -48.3 19.2Q-49.8 18.9 -51.1 18.9Q-55.4 18.9 -57.6 21.4Q-59.9 23.8 -59.9 26.7Q-59.9 29.5 -57.6 31.8Q-55.3 34.1 -50.3 34.1Q-44 34.1 -38.6 31.2Q-33.3 28.3 -28.5 23.6Q-23.4 18.6 -19.2 11.6Q-15 4.5 -10.8 -3.5Q-6.7 -11.6 -1.8 -19.8Q3.1 -28 9.5 -35.2Q10.8 -36.6 12.2 -38.1Q13.5 -39.7 14.8 -40.8Q11.4 -41.3 7.8 -41.5Q4.2 -41.8 0.7 -41.8Q-4.5 -41.8 -9.1 -41.3Q-13.8 -40.9 -18.4 -40.1Q-23.1 -39.2 -28.9 -37.3Q-34.7 -35.4 -40.1 -32.3Q-45.6 -29.3 -49.4 -25Q-53.3 -20.7 -54.2 -15.1Q-54.3 -14.6 -54.3 -14Q-54.4 -13.5 -54.4 -13Q-54.4 -8.4 -51.2 -5.4Q-48.1 -2.4 -43.9 -2.4Q-40.8 -2.4 -37.9 -4Q-35 -5.7 -32.7 -8.4Q-30.4 -11.2 -29.3 -14.5Q-29.2 -15.5 -28.5 -15.5Q-27.9 -15.5 -27.9 -14.4Q-28 -10 -30.4 -6.8Q-32.9 -3.6 -36.6 -1.9Q-40.3 -0.3 -44.1 -0.3Q-48 -0.3 -51.5 -1.9Q-55 -3.6 -57.2 -6.8Q-59.4 -10.1 -59.4 -14.9Q-59.4 -20.5 -56.6 -24.8Q-53.9 -29.1 -49.3 -32.3Q-44.7 -35.6 -39.3 -37.8Q-33.9 -40.1 -28.5 -41.4Q-23.1 -42.8 -18.7 -43.5Q-14.2 -44.2 -9.3 -44.6Q-4.5 -45 0.5 -45Q4.8 -45 9.1 -44.6Q13.4 -44.2 17.5 -43.4Q19.2 -44.7 21 -45.7Q22.8 -46.7 25 -47.5Q26.4 -48.1 27.1 -48.1Q27.7 -48.1 27.7 -47.7Q27.7 -47 26.1 -46Q25.3 -45.6 24.1 -44.6Q22.9 -43.6 21.5 -42.3Q28 -40.7 33.2 -37.5Q38.9 -34.1 41.4 -30.3Q43.8 -26.5 43.8 -22.5Q43.8 -17.9 41 -13.3Q38.2 -8.8 33.7 -4.9Q29.2 -1 23.8 1.9Q18.4 4.7 13.1 6Q8 7.3 2.8 7.9Q-2.4 8.5 -6.5 8.5Q-7.2 8.5 -7.9 8.5Q-8.7 8.5 -9.4 8.4Q-12.8 13.2 -16.4 17.8Q-20 22.3 -24.5 26.6Q-30 31.8 -36.5 34.5Q-43 37.2 -49.8 37.2ZM-8 6.2Q-4.2 6.3 0.5 5.6Q5.2 4.9 9.9 3.5Q17.7 1.1 24 -3.4Q30.2 -7.9 33.9 -13.4Q37.5 -18.9 37.5 -24.2Q37.5 -27.4 36 -30.3Q34.4 -33.2 30.9 -35.5Q28.6 -37 25.7 -38.1Q22.8 -39.2 19.6 -39.9Q14.5 -32.7 10.1 -24.9Q5.6 -17.1 1.3 -9.2Q-3.1 -1.3 -8 6.2ZM49.8 -37.2Q52 -37.2 54.1 -36.9Q60.4 -36.1 63.3 -33.2Q66.3 -30.3 66.3 -26.9Q66.3 -23.2 62.9 -20.2Q59.6 -17.2 53.5 -17.2Q51.6 -17.2 49.4 -17.6Q47.3 -17.9 44.9 -18.7Q43.7 -19.1 43.7 -19.8Q43.7 -20.2 44.3 -20.2Q44.9 -20.2 45.3 -20Q46.9 -19.4 48.3 -19.2Q49.8 -18.9 51.1 -18.9Q55.4 -18.9 57.6 -21.4Q59.9 -23.8 59.9 -26.7Q59.9 -29.5 57.6 -31.8Q55.3 -34.1 50.3 -34.1Q44 -34.1 38.6 -31.2Q33.3 -28.3 28.5 -23.6Q23.4 -18.6 19.2 -11.6Q15 -4.5 10.8 3.5Q6.7 11.6 1.8 19.8Q-3.1 28 -9.5 35.2Q-10.8 36.6 -12.2 38.1Q-13.5 39.7 -14.8 40.8Q-11.4 41.3 -7.8 41.5Q-4.2 41.8 -0.7 41.8Q4.5 41.8 9.1 41.3Q13.8 40.9 18.4 40.1Q23.1 39.2 28.9 37.3Q34.7 35.4 40.1 32.3Q45.6 29.3 49.4 25Q53.3 20.7 54.2 15.1Q54.3 14.6 54.3 14Q54.4 13.5 54.4 13Q54.4 8.4 51.2 5.4Q48.1 2.4 43.9 2.4Q40.8 2.4 37.9 4Q35 5.7 32.7 8.4Q30.4 11.2 29.3 14.5Q29.2 15.5 28.5 15.5Q27.9 15.5 27.9 14.4Q28 10 30.4 6.8Q32.9 3.6 36.6 1.9Q40.3 0.3 44.1 0.3Q48 0.3 51.5 1.9Q55 3.6 57.2 6.8Q59.4 10.1 59.4 14.9Q59.4 20.5 56.6 24.8Q53.9 29.1 49.3 32.3Q44.7 35.6 39.3 37.8Q33.9 40.1 28.5 41.4Q23.1 42.8 18.7 43.5Q14.2 44.2 9.3 44.6Q4.5 45 -0.5 45Q-4.8 45 -9.1 44.6Q-13.4 44.2 -17.5 43.4Q-19.2 44.7 -21 45.7Q-22.8 46.7 -25 47.5Q-26.4 48.1 -27.1 48.1Q-27.7 48.1 -27.7 47.7Q-27.7 47 -26.1 46Q-25.3 45.6 -24.1 44.6Q-22.9 43.6 -21.5 42.3Q-28 40.7 -33.2 37.5Q-38.9 34.1 -41.4 30.3Q-43.8 26.5 -43.8 22.5Q-43.8 17.9 -41 13.3Q-38.2 8.8 -33.7 4.9Q-29.2 1 -23.8 -1.9Q-18.4 -4.7 -13.1 -6Q-8 -7.3 -2.8 -7.9Q2.4 -8.5 6.5 -8.5Q7.2 -8.5 7.9 -8.5Q8.7 -8.5 9.4 -8.4Q12.8 -13.2 16.4 -17.8Q20 -22.3 24.5 -26.6Q30 -31.8 36.5 -34.5Q43 -37.2 49.8 -37.2ZM8 -6.2Q4.2 -6.3 -0.5 -5.6Q-5.2 -4.9 -9.9 -3.5Q-17.7 -1.1 -24 3.4Q-30.2 7.9 -33.9 13.4Q-37.5 18.9 -37.5 24.2Q-37.5 27.4 -36 30.3Q-34.4 33.2 -30.9 35.5Q-28.6 37 -25.7 38.1Q-22.8 39.2 -19.6 39.9Q-14.5 32.7 -10.1 24.9Q-5.6 17.1 -1.3 9.2Q3.1 1.3 8 -6.2Z',
};

const DIGITAL_STYLES = {
  slate: 'Slate',
  lcd: 'LCD',
  nixie: 'Nixie',
  flip: 'Flip',
  eink: 'E-ink',
  theme: 'Match theme',
  hairline: 'Hairline',
  capsule: 'Capsule',
  column: 'Column',
};

// Slim styles that come in a shape of their own and show just the time: Hairline is bare
// numerals in your theme's colours, Capsule a slim pill that fills with the session, and
// Column the hours over the minutes in a narrow strip. The layout doesn't apply to them.
const SHAPED_STYLES = ['hairline', 'capsule', 'column'];

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
  sessionColours: 'colour',
  timesUp: 'glow',

  showWatch: true,
  watchType: 'analog',
  watchSize: 120,

  face: 'porcelain',
  caseStyle: 'crown',
  dialText: true,
  markers: 'face',
  hands: 'face',
  seconds: 'off',
  // 'face' shows each face's own complications; 'custom' shows the four below.
  complications: 'face',
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

  // Projects you track your time toward: { id, name, color (1 to 8), archived }. While one is
  // active, everything you track goes to it as well; locking it asks before switching.
  projects: [],
  activeProject: null,
  projectLocked: false,
};

// Eight project colours, told apart even with colour blindness, in the order new projects
// take them. Each has a light and a dark step in styles.css (--pw-p1 to --pw-p8).
const PROJECT_COLOURS = ['Blue', 'Orange', 'Aqua', 'Yellow', 'Magenta', 'Green', 'Violet', 'Red'];

// Every face drawn gets its own number, so the ids of its gradients never clash with another's.
let drawings = 0;

const DEFAULT_WATCH_POS = { fx: 0.97, fy: 0.9 };
const SNAP_INSET = 14;
const SPOTS = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'];
// The stats page, which opens in a tab of its own.
const VIEW_STATS = 'pocket-watch-stats';

// Where to buy the maker a coffee.
const SUPPORT_URL = 'https://buymeacoffee.com/nexsiz';

const MIN_SIZE = 64;
const MAX_SIZE = 260;
// The room left above and below the watch when it sits in a pane's tab bar.
const TRAY_PAD = 4;

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

// A seeded random number generator, so a face is painted the same way every time.
function rng(seed) {
  let x = seed;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

// A point on a cubic Bézier curve given as four [x, y] points.
function bezier(c, t) {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * c[0][i] + 3 * u * u * t * c[1][i] + 3 * u * t * t * c[2][i] + t * t * t * c[3][i]);
}

// A point on a chain of cubic curves, with t running from 0 to 1 over the whole chain.
function chainAt(chain, t) {
  const n = chain.length;
  const i = Math.min(n - 1, Math.floor(t * n));
  return bezier(chain[i], t * n - i);
}

// A brush stroke along a cubic curve, or a chain of them: w0 wide where it starts, tapering
// to w1 where it ends.
function brushPath(c, w0, w1, steps = 22) {
  const chain = typeof c[0][0] === 'number' ? [c] : c;
  steps *= chain.length;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = chainAt(chain, t);
    const [ax, ay] = chainAt(chain, Math.max(0, t - 0.004));
    const [bx, by] = chainAt(chain, Math.min(1, t + 0.004));
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    const nx = (-(by - ay) / len) * w;
    const ny = ((bx - ax) / len) * w;
    left.push(`${(x + nx).toFixed(2)} ${(y + ny).toFixed(2)}`);
    right.unshift(`${(x - nx).toFixed(2)} ${(y - ny).toFixed(2)}`);
  }
  return `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
}

// A four-pointed glint.
function glintPath(x, y, z, waist = 0.24) {
  const w = z * waist;
  return `M ${x} ${y - z} L ${x + w} ${y - w} L ${x + z} ${y} L ${x + w} ${y + w} L ${x} ${y + z} L ${x - w} ${y + w} L ${x - z} ${y} L ${x - w} ${y - w} Z `;
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
  outside: 'Tracking outside Obsidian',
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
  // Before 1.6 every face shared one set of hands and complications. Now each face comes with
  // its own, so it starts out as designed.
  if (Object.keys(s).length && !('complications' in s)) {
    s.complications = 'face';
    s.hands = 'face';
  }
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
    // Projects are edited in place, so each plugin gets its own copies.
    this.settings.projects = (this.settings.projects || []).map((x) => Object.assign({}, x));
    this.days = saved.days || {};
    // The running focus session or break, if any: { kind, total, endsAt, paused, remaining }.
    this.session = saved.session || null;
    // Focus sessions finished since the last long break.
    this.cycle = saved.cycle || 0;
    // When a session or break has ended: { kind, endedAt, until }. The watch shows it until you
    // respond, or until its `until` time when the next one started on its own.
    this.alert = saved.alert || null;

    this.paused = false;
    // Keep counting while you work in another app, such as a browser or a PDF reader.
    this.outside = false;
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

    this.registerView(VIEW_STATS, (leaf) => new StatsView(leaf, this));
    this.addCommand({ id: 'toggle-shelf', name: 'Open or close the stats shelf', callback: () => this.watch && this.watch.toggleShelf() });
    this.addCommand({ id: 'open-stats', name: 'Open your stats', callback: () => this.openStats() });
    this.addCommand({ id: 'switch-project', name: 'Change the project you are tracking', callback: () => this.showProjectMenu() });
    this.addCommand({ id: 'new-project', name: 'New project', callback: () => new ProjectModal(this.app, this).open() });
    this.addCommand({ id: 'lock-project', name: 'Lock or unlock the project you are tracking', callback: () => this.toggleProjectLock() });
    this.addCommand({ id: 'toggle-watch', name: 'Show or hide the watch', callback: () => this.updateWatch({ showWatch: !this.settings.showWatch }) });
    this.addCommand({ id: 'toggle-pause', name: 'Pause or resume the timer', callback: () => this.togglePause() });
    this.addCommand({ id: 'toggle-outside', name: 'Track time outside Obsidian too, or stop', callback: () => this.toggleOutside() });
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
      id: 'dismiss-times-up',
      name: "Dismiss the time's up highlight",
      checkCallback: (checking) => {
        if (!this.alert) return false;
        if (!checking) this.dismissAlert();
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
      this.renameInDays(oldPath, file.path);
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

    // Outside Obsidian there is no typing or scrolling to see, so the idle limit waits until
    // you are back.
    const focused = this.isFocused();
    let state;
    if (this.paused) state = 'paused';
    else if (this.outside && !focused) state = 'outside';
    else if (this.settings.onlyWhenFocused && !focused) state = 'away';
    else if (now - this.lastActivity >= this.settings.idleMinutes * 60000) state = 'idle';
    else state = 'tracking';

    if (state === 'tracking' || state === 'outside') {
      const day = this.today();
      day.ms += delta;
      // And the hour of the day it falls in, for the stats page.
      day.hours = day.hours || new Array(24).fill(0);
      day.hours[new Date(now).getHours()] += delta;
      const project = this.projectDay(day);
      if (project) {
        project.ms += delta;
        project.hours[new Date(now).getHours()] += delta;
      }
      if (state === 'tracking') {
        this.sinceActivityMs += delta;
        // The note you're working in gets the time too. Time outside Obsidian isn't in a note.
        const file = this.app.workspace.getActiveFile();
        if (file) {
          day.files = day.files || {};
          day.files[file.path] = (day.files[file.path] || 0) + delta;
          if (project) project.files[file.path] = (project.files[file.path] || 0) + delta;
        }
      }
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
    if (this.alert && this.alert.until && now > this.alert.until) this.alert = null;

    const ms = this.getDay(dayKey(new Date())).ms;
    const extra = this.session ? this.sessionLabel() : this.alertLabel();
    this.statusEl.setText(extra ? `⏱ ${fmtShort(ms)} · ${extra}` : `⏱ ${fmtShort(ms)}`);
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

  // The stats page, in a tab of its own; the one already open if there is one.
  async openStats() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_STATS)[0];
    if (!leaf) {
      leaf = ws.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_STATS, active: true });
    }
    ws.revealLeaf(leaf);
    if (this.watch) this.watch.closeShelf();
  }

  // Count the time you spend in other apps too, until you turn it off again.
  toggleOutside() {
    this.outside = !this.outside;
    if (this.outside) this.paused = false;
    this.markActive();
    new Notice(this.outside ? 'Pocket Watch counts your time outside Obsidian too' : 'Pocket Watch counts only your time in Obsidian again');
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
    this.alert = null;
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
    this.alert = null;
    this.saveSettings();
    this.tick();
  }

  // "Focus done +3 min" or "Break over +1 min": how far past the set time you are.
  alertLabel() {
    const a = this.alert;
    if (!a) return '';
    const over = Math.floor((Date.now() - a.endedAt) / 60000);
    return `${a.kind === 'focus' ? 'Focus done' : 'Break over'}${over >= 1 ? ` +${over} min` : ''}`;
  }

  dismissAlert() {
    this.alert = null;
    this.saveSettings();
    this.tick();
  }

  // Shows the time's-up highlight for a few seconds, to try the styles.
  previewAlert() {
    // A real time's up already shows the new style.
    if (!(this.alert && !this.alert.until)) this.alert = { kind: 'focus', endedAt: Date.now(), until: Date.now() + 8000 };
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
      const project = this.projectDay(d);
      if (project) {
        project.sessions += 1;
        project.focusMs += x.total;
      }
      this.cycle += 1;
    } else if (x.kind === 'long') {
      this.cycle = 0;
    }
    if (quiet) {
      this.saveSettings();
      return;
    }
    if (this.settings.chime) chime();
    const next = x.kind === 'focus' ? this.nextBreak() : 'focus';
    const auto = x.kind === 'focus' ? this.settings.autoStartBreaks : this.settings.autoStartFocus;
    new Notice(x.kind === 'focus' ? `Focus session done. Time for a ${next === 'long' ? 'long' : 'short'} break.` : "Break's over. Ready to focus again?");
    if (auto) this.startSession(next, true);
    // The watch shows that the time is up: until you respond, or for a minute when the next
    // one started on its own.
    const now = Date.now();
    this.alert = auto ? { kind: x.kind, endedAt: now, until: now + 60000 } : { kind: x.kind, endedAt: now };
    this.saveSettings();
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
    } else if (this.alert && this.alert.kind === 'focus') {
      const next = this.nextBreak();
      menu.addItem((i) => i.setTitle(`${next === 'long' ? 'Long' : 'Short'} break, ${this.sessionMinutes(next)} minutes`).setIcon('coffee').onClick(() => this.startSession(next)));
      menu.addItem((i) => i.setTitle(`Focus again, ${s.focusMinutes} minutes`).setIcon('play').onClick(() => this.startSession('focus')));
      menu.addItem((i) => i.setTitle('Dismiss').setIcon('check').onClick(() => this.dismissAlert()));
    } else if (this.alert) {
      menu.addItem((i) => i.setTitle(`Focus for ${s.focusMinutes} minutes`).setIcon('play').onClick(() => this.startSession('focus')));
      menu.addItem((i) => i.setTitle(`Another break, ${s.shortBreakMinutes} minutes`).setIcon('coffee').onClick(() => this.startSession('short')));
      menu.addItem((i) => i.setTitle('Dismiss').setIcon('check').onClick(() => this.dismissAlert()));
    } else {
      menu.addItem((i) => i.setTitle(`Focus for ${s.focusMinutes} minutes`).setIcon('play').onClick(() => this.startSession('focus')));
      menu.addItem((i) => i.setTitle(`Short break, ${s.shortBreakMinutes} minutes`).setIcon('coffee').onClick(() => this.startSession('short')));
      menu.addItem((i) => i.setTitle(`Long break, ${s.longBreakMinutes} minutes`).setIcon('armchair').onClick(() => this.startSession('long')));
    }
    menu.addSeparator();
    menu.addItem((i) => i.setTitle('Open the shelf').setIcon('calendar-days').onClick(() => this.watch && !this.watch.shelfEl && this.watch.openShelf()));
    menu.addItem((i) => i.setTitle('Open your stats').setIcon('bar-chart-2').onClick(() => this.openStats()));
    menu.addItem((i) => i.setTitle(this.paused ? 'Resume tracking' : 'Pause tracking').setIcon('timer').onClick(() => this.togglePause()));
    menu.addItem((i) => i.setTitle('Track outside Obsidian').setIcon('external-link').setChecked(this.outside).onClick(() => this.toggleOutside()));
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
      const project = this.projectDay(this.today());
      if (diff > 0) this.today().written += diff;
      else if (diff < 0) this.today().deleted += -diff;
      if (project && diff > 0) project.written += diff;
      else if (project && diff < 0) project.deleted += -diff;
      if (diff !== 0) this.dirty = true;
    }, 500));
  }

  async flush() {
    if (!this.dirty) return;
    this.dirty = false;
    await this.saveData({ settings: this.settings, days: this.days, session: this.session, cycle: this.cycle, alert: this.alert });
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

  // A renamed note keeps its time, and a renamed folder takes its notes' time with it.
  renameInDays(oldPath, newPath) {
    const move = (files) => {
      for (const path of Object.keys(files)) {
        const moved = path === oldPath ? newPath : path.startsWith(`${oldPath}/`) ? newPath + path.slice(oldPath.length) : null;
        if (!moved) continue;
        files[moved] = (files[moved] || 0) + files[path];
        delete files[path];
        this.dirty = true;
      }
    };
    for (const day of Object.values(this.days)) {
      if (day.files) move(day.files);
      for (const project of Object.values(day.projects || {})) if (project.files) move(project.files);
    }
  }

  // --- Projects ---

  activeProject() {
    const s = this.settings;
    return s.projects.find((x) => x.id === s.activeProject && !x.archived) || null;
  }

  // The active project's share of a day, made when first needed; null when no project is active.
  projectDay(day) {
    const project = this.activeProject();
    if (!project) return null;
    day.projects = day.projects || {};
    if (!day.projects[project.id]) {
      day.projects[project.id] = { ms: 0, written: 0, deleted: 0, sessions: 0, focusMs: 0, hours: new Array(24).fill(0), files: {} };
    }
    return day.projects[project.id];
  }

  // Switch the project your time goes to. When tracking is locked, ask first.
  async setProject(id) {
    const s = this.settings;
    if ((id || null) === (s.activeProject || null)) return;
    const current = this.activeProject();
    const next = s.projects.find((x) => x.id === id);
    if (s.projectLocked && current) {
      const ok = window.confirm(`Tracking is locked to ${current.name}. Switch to ${next ? next.name : 'no project'} anyway?`);
      if (!ok) return;
    }
    s.activeProject = next ? next.id : null;
    await this.saveSettings();
    new Notice(next ? `Now tracking ${next.name}` : 'Not tracking a project');
    this.refreshProjects();
  }

  async toggleProjectLock() {
    this.settings.projectLocked = !this.settings.projectLocked;
    await this.saveSettings();
    this.refreshProjects();
  }

  async saveProject(fields, id) {
    const s = this.settings;
    let project = s.projects.find((x) => x.id === id);
    if (project) Object.assign(project, fields);
    else {
      // An id no other project has, even one made in the same moment.
      let id = `p${Date.now().toString(36)}`;
      while (s.projects.some((x) => x.id === id)) id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
      project = Object.assign({ id, archived: false }, fields);
      s.projects.push(project);
    }
    await this.saveSettings();
    this.refreshProjects();
    return project;
  }

  async archiveProject(id, archived) {
    const s = this.settings;
    const project = s.projects.find((x) => x.id === id);
    if (!project) return;
    project.archived = archived;
    if (archived && s.activeProject === id) s.activeProject = null;
    await this.saveSettings();
    this.refreshProjects();
  }

  // The colour a new project takes: the first not yet used.
  nextColour() {
    const used = new Set(this.settings.projects.filter((x) => !x.archived).map((x) => x.color));
    for (let i = 1; i <= PROJECT_COLOURS.length; i++) if (!used.has(i)) return i;
    return 1;
  }

  refreshProjects() {
    if (this.watch && this.watch.dashboard) this.watch.dashboard.render();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_STATS)) leaf.view.render();
  }

  // Pick the project to track, start a new one, or unlock.
  showProjectMenu(e) {
    const s = this.settings;
    const menu = new Menu();
    for (const project of s.projects.filter((x) => !x.archived)) {
      menu.addItem((i) => i.setTitle(project.name).setIcon('circle').setChecked(project.id === s.activeProject).onClick(() => this.setProject(project.id)));
    }
    menu.addItem((i) => i.setTitle('No project').setIcon('circle-off').setChecked(!this.activeProject()).onClick(() => this.setProject(null)));
    menu.addSeparator();
    menu.addItem((i) => i.setTitle('New project…').setIcon('plus').onClick(() => new ProjectModal(this.app, this).open()));
    menu.addItem((i) => i.setTitle(s.projectLocked ? 'Unlock switching' : 'Lock to this project').setIcon(s.projectLocked ? 'unlock' : 'lock').onClick(() => this.toggleProjectLock()));
    if (e && e.clientX !== undefined) menu.showAtMouseEvent(e);
    else menu.showAtPosition({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 3 });
  }

  // The notes you spent the most time in over the given days, most first.
  topFiles(keys, limit) {
    const sum = {};
    for (const key of keys) {
      const files = this.getDay(key).files;
      if (!files) continue;
      for (const [path, ms] of Object.entries(files)) sum[path] = (sum[path] || 0) + ms;
    }
    return Object.entries(sum).filter(([, ms]) => ms >= 60000).sort((a, b) => b[1] - a[1]).slice(0, limit);
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
    this.alertDotEl = this.el.createDiv('pocket-watch-alert-dot');
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
    // In a tab bar the watch is as tall as the bar allows; elsewhere it is the size you chose.
    // How tall a watch is for its size is only known once it is drawn, so a watch moved into a
    // tab bar may be drawn a second time to fit.
    const fit = this.trayHeight();
    for (let pass = 0; pass < 2; pass++) {
      const want = fit ? fit / (this.ratio || 1) : s.watchSize;
      // Within a few percent is close enough, so rounding never has it redrawn every second.
      if (!fit || !this.size || Math.abs(want - this.size) > Math.max(1, this.size * 0.03)) this.size = Math.round(want);
      const key = JSON.stringify([
        s.watchType, this.size, s.face, s.caseStyle, s.dialText, s.markers, s.hands, s.seconds, s.complications, s.slotTop, s.slotRight, s.slotBottom, s.slotLeft,
        s.goalRing, s.movement, s.digitalStyle, s.digitalLayout, s.clock, s.digitalSeconds, s.blinkColon,
        s.digitalDate, s.digitalMoon, s.digitalFocus, s.digitalBar, s.longBreakEvery, dayKey(now),
      ]);
      if (key === this.built) break;
      this.build(now);
      this.built = key;
      // Measured with the time in place, since the digits of a digital watch come in with it.
      this.update(now);
      const ratio = this.faceEl.offsetHeight / this.size;
      if (ratio) this.ratio = ratio;
      if (!fit || !ratio) break;
    }
    this.el.classList.toggle('is-in-tray', !!fit);
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
    this.el.setAttr('data-slim', s.watchType === 'digital' && SHAPED_STYLES.includes(s.digitalStyle) ? s.digitalStyle : '');
    if (s.watchType === 'digital') {
      this.buildDigital(now);
      // On the digital case the dot sits on the curve of the top right corner (see styles.css).
      this.faceEl.querySelector('.pocket-watch-digital').appendChild(this.alertDotEl);
      this.alertDotEl.style.left = '';
      this.alertDotEl.style.top = '';
    } else {
      this.el.appendChild(this.alertDotEl);
      this.buildAnalog(now);
    }
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
    // When time is up, the chosen highlight shows; orange after focus, green after a break.
    const alert = p.alert && s.timesUp !== 'off' ? (p.alert.kind === 'focus' ? 'focus' : 'break') : 'none';
    setIfChanged(this.el, 'data-alert', alert);
    setIfChanged(this.el, 'data-times-up', s.timesUp);
    setIfChanged(this.el, 'data-palette', s.sessionColours === 'grey' ? 'grey' : 'colour');
    const ringMode = x ? (x.paused ? 'paused' : x.kind === 'focus' ? 'focus' : 'break')
      : alert !== 'none' && s.timesUp === 'colour' ? 'over' : s.goalRing ? 'goal' : 'off';
    setIfChanged(this.el, 'data-ring', ringMode);
    const progress = x ? p.sessionRemaining() / x.total : ringMode === 'over' ? 1 : goal;
    const badge = !s.showCountdown ? '' : x ? p.sessionLabel() : p.alertLabel();
    setText(this.badgeEl, badge);
    setIfChanged(this.badgeEl, 'data-tone', x ? (x.paused ? 'paused' : x.kind === 'focus' ? 'focus' : 'break') : p.alert && p.alert.kind !== 'focus' ? 'break' : 'focus');
    this.badgeEl.classList.toggle('is-shown', !!badge);
    const label = [
      fmtTime(now, this.h24),
      now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      moonName(moonPhase(now)),
      `${fmtShort(day.ms)} in Obsidian today (${STATE_LABELS[p.state].toLowerCase()})`,
      ...(x ? [`${p.sessionLabel()} left. Right-click for session controls.`]
        : p.alert ? [`${p.alertLabel()}. Right-click to start the next one, or to dismiss.`]
          : ['Right-click to start a focus session.']),
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
    if (parts.pomo) this.updatePomodoro(now);
    if (parts.focusText) setText(parts.focusText, fmtShort(day.ms));
    if (parts.fill) parts.fill.style[parts.fillAxis || 'width'] = `${progress * 100}%`;
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
    this.faceDef = face;
    // A square face has a rounded square case and dial; R is then half the dial's width.
    const sq = face.shape === 'square';
    const R = sq ? 84 : face.case === 'thin' ? 95 : face.case === 'dive' ? 80 : 89.5;
    const k = R / 89.5;
    this.uid = ++drawings;
    const slots = faceSlots(s);
    const used = {};
    for (const slot of SLOTS) used[slot.hour] = slots[slot.key] !== 'none' || face.window === slot.key || face.regulator === slot.key;

    // The crown or the pocket watch bow sits outside the case, so the drawing grows to fit it.
    const caseStyle = CASES[s.caseStyle] ? s.caseStyle : 'crown';
    const box = caseStyle === 'crown' ? [0, 0, 208, 200] : caseStyle === 'bow' ? [0, -28, 200, 228] : [0, 0, 200, 200];
    const svg = this.faceEl.createSvg('svg', {
      attr: { viewBox: box.join(' '), width: (this.size * box[2]) / 200, height: (this.size * box[3]) / 200 },
      cls: ['pocket-watch-svg', `pocket-watch-face-${faceKey}`, `pw-case-${face.case}`, sq ? 'is-square' : 'is-round'],
    });
    this.el.setAttr('data-shape', sq ? 'square' : 'round');
    const [dotX, dotY] = sq ? [188.5, 11.5] : polar(94, 45);
    this.alertDotEl.style.left = `${((dotX - box[0]) / box[2]) * 100}%`;
    this.alertDotEl.style.top = `${((dotY - box[1]) / box[3]) * 100}%`;
    if (s.movement !== 'still') svg.addClass('pw-motion');
    if (s.movement === 'gentle') svg.addClass('pw-movement-gentle');
    const add = (parent, tag, attr, cls) => parent.createSvg(tag, { attr, cls });
    const text = (parent, x, y, size, value, cls) => {
      const t = add(parent, 'text', { x, y, 'font-size': size }, cls);
      t.textContent = value;
      return t;
    };
    const url = (name) => `url(#${this.id(name)})`;
    // A disc of radius r, or on a square face a rounded square r from the centre to each side.
    const disc = (parent, r, attr, cls) => add(parent, sq ? 'rect' : 'circle', Object.assign(
      sq ? { x: 100 - r, y: 100 - r, width: 2 * r, height: 2 * r, rx: r * 0.3 } : { cx: 100, cy: 100, r }, attr,
    ), cls);

    this.defs = add(svg, 'defs');
    this.gradient(add, 'linearGradient', 'bezel', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', 'pw-bezel-a'], ['55%', 'pw-bezel-b'], ['100%', 'pw-bezel-c']]);
    this.gradient(add, 'linearGradient', 'bezel-rev', { x1: 1, y1: 1, x2: 0, y2: 0 }, [['0%', 'pw-bezel-a'], ['55%', 'pw-bezel-b'], ['100%', 'pw-bezel-c']]);
    this.gradient(add, 'radialGradient', 'dial', { cx: '50%', cy: '40%', r: '62%' }, [['0%', 'pw-dial-a'], ['100%', 'pw-dial-b']]);
    this.gradient(add, 'radialGradient', 'dial-shade', { cx: '50%', cy: '50%', r: '50%' }, [['80%', 'rgba(0,0,0,0)'], ['100%', 'rgba(0,0,0,0.22)']]);
    this.gradient(add, 'linearGradient', 'metal', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', 'pw-metal-a'], ['50%', 'pw-metal-b'], ['100%', 'pw-metal-c']]);
    this.gradient(add, 'linearGradient', 'glass', { x1: 0, y1: 0, x2: 0.7, y2: 1 }, [['0%', 'rgba(255,255,255,0.13)'], ['100%', 'rgba(255,255,255,0)']]);
    this.gradient(add, 'radialGradient', 'cap', { cx: '35%', cy: '30%', r: '75%' }, [['0%', 'pw-cap-a'], ['100%', 'pw-cap-b']]);
    disc(add(this.defs, 'clipPath', { id: this.id('dial-clip') }), R, {});

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
    disc(svg, 99, { fill: url('bezel') }, 'pw-bezel');
    disc(svg, 98.3, {}, 'pw-bezel-edge');
    if (face.case === 'dive') this.drawDiveBezel(svg, add);
    else disc(svg, R + 1.1, { 'stroke-width': 2.2, stroke: url('bezel-rev') }, 'pw-bezel-step');

    // The ring on the bezel shows the daily goal, or the countdown during a focus session. On
    // a square case it runs round the square from 12.
    const [ringR, ringW] = sq ? [91.6, 2.8] : face.case === 'thin' ? [97, 2] : face.case === 'dive' ? [83, 1.8] : [94.6, 2.8];
    if (sq) {
      const d = squarePath(ringR, ringR * 0.33);
      add(svg, 'path', { d, 'stroke-width': ringW }, 'pw-ring-track');
      this.parts.ring = add(svg, 'path', { d, 'stroke-width': ringW, pathLength: 100, 'stroke-dasharray': '0 100' }, 'pw-ring');
    } else {
      add(svg, 'circle', { cx: 100, cy: 100, r: ringR, 'stroke-width': ringW }, 'pw-ring-track');
      this.parts.ring = add(svg, 'circle', {
        cx: 100, cy: 100, r: ringR, 'stroke-width': ringW, pathLength: 100, transform: 'rotate(-90 100 100)', 'stroke-dasharray': '0 100',
      }, 'pw-ring');
    }
    disc(svg, R, { fill: url('dial') }, 'pw-dial');

    // Dial: its painting and finish, then shading where it meets the case, then the flange.
    if (face.art === 'sakura') this.drawSakura(svg, add, R);
    else if (face.art === 'nocturne') this.drawNocturne(svg, add, R, now);
    else if (face.art === 'meteorite') this.drawMeteorite(svg, add, R);
    else if (face.art === 'malachite') this.drawMalachite(svg, add, R);
    else if (face.art === 'panda') this.drawPanda(svg, add, R, k);
    else if (face.art === 'koi') this.drawKoi(svg, add, R);
    else if (face.art === 'deco') this.drawDeco(svg, add, R, k);
    if (face.pomodoro) this.drawPomodoro(svg, add, text, R, k);
    if (face.texture) this.drawTexture(svg, add, face.texture, R);
    if (face.decor) this.drawDecor(svg, add, text, face.decor, R, k, used);
    disc(svg, R, { fill: url('dial-shade') }, 'pw-dial-shade');
    disc(svg, R, {}, 'pw-alert-wash');
    if (face.flange && !sq) {
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

    if (s.dialText) this.drawBrand(svg, add, face, markers, R, k, used);

    if (face.window) {
      const slot = SLOTS.find((x) => x.key === face.window);
      const [cx, cy] = polar(R * 0.415, slot.hour * 30);
      this.drawMovementWindow(svg, add, cx, cy, R * 0.345, face.windowShape);
    }
    let hourDial = null;
    if (face.regulator) {
      const slot = SLOTS.find((x) => x.key === face.regulator);
      hourDial = polar(R * 0.45, slot.hour * 30);
      this.drawHourDial(svg, add, text, hourDial[0], hourDial[1], k);
    }
    for (const slot of SLOTS) {
      const type = slots[slot.key];
      if (face.window === slot.key || face.regulator === slot.key || !type || type === 'none' || !COMPLICATIONS[type]) continue;
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
    const style = s.hands !== 'face' && HANDS[s.hands] ? s.hands : face.hands || 'leaf';
    let body;
    if (hourDial) {
      // On a regulator the hour hand turns on its own small dial, under the minute hand.
      const [cx, cy] = hourDial;
      [this.parts.hour, body] = hand('hour');
      this.parts.hour.style.transformOrigin = `${cx}px ${cy}px`;
      body.setAttr('transform', `translate(${cx} ${cy})`);
      this.drawHand(body, add, style, 13 * k, k * 0.5, true);
      add(hands, 'circle', { cx, cy, r: 2.2 * k, fill: url('cap') }, 'pw-cap');
    } else {
      [this.parts.hour, body] = hand('hour');
      this.drawHand(body, add, style, R * 0.52, k, true);
    }
    [this.parts.minute, body] = hand('minute');
    // On a square dial the minute hand reaches further, toward the markers along the edge.
    this.drawHand(body, add, style, R * (sq ? 0.88 : 0.8), k, false);
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

    // Reflections on the crystal: a broad one at the top left and a small one opposite. A flat
    // square crystal catches the light in straight-edged bands across its corners.
    if (sq) {
      const c = add(svg, 'g', { 'clip-path': url('dial-clip') }, 'pw-glass');
      add(c, 'path', { d: `M ${100 - R} ${100 + R * 0.2} L ${100 - R} ${100 - R} L ${100 + R * 0.25} ${100 - R} Q ${100 - R * 0.3} ${100 - R * 0.35} ${100 - R} ${100 + R * 0.2} Z`, fill: url('glass') });
      add(c, 'path', { d: `M ${100 + R} ${100 + R * 0.45} L ${100 + R} ${100 + R} L ${100 + R * 0.45} ${100 + R} Q ${100 + R * 0.8} ${100 + R * 0.8} ${100 + R} ${100 + R * 0.45} Z` }, 'pw-glass-small');
      return;
    }
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

  // The Philip Pocket monogram under 12, clear of the hour markers, or where the face asks
  // for it: above 6, just below the hands, or to their left. When a complication sits there it moves to
  // the next free place. Faces with polished metal markers have it in the same metal, as if
  // applied, and an engraved one is cut into the dial, catching the light on its lower edge.
  drawBrand(svg, add, face, markers, R, k, used) {
    let at = face.brandAt || 'top';
    if (at === 'nine' && used[9]) at = 'top';
    if (at === 'top' && used[0]) at = 'six';
    if ((at === 'six' || at === 'low') && used[6]) at = used[0] ? null : 'top';
    if (!at) return;
    // On light dials metal would not show, so the monogram is printed there.
    const engraved = !!face.brandEngraved;
    const metal = face.applied && !face.brandInk && !engraved;
    const [left, top, right, bottom] = MONOGRAM.box;
    const scale = ((face.brandWidth || 26) * k) / (right - left);
    const height = (bottom - top) * scale;
    // How far in from the edge the markers reach at 12 (or 6).
    const clear = (face.brandClear || {
      batons: 24, dots: 21, arabic: face.decor === 'inner-24' ? 41 : 27, quarters: 41, roman: 30, lume: 25, minimal: 22, pips: 15, minutes: 22, square: 22, deco: 36,
    }[markers] || 17) * k;
    // Under 12 it keeps a little room from the marker above it; at 6 a little more, as it
    // sits lowest; below the hands and at 9 it is centred a little under halfway out.
    const x = at === 'nine' ? 100 - R * 0.47 : 100;
    const y0 = at === 'nine' ? 100 - height / 2 : at === 'low' ? 100 + R * 0.38 - height / 2
      : at === 'six' ? 100 + R - clear - 4 * k - height : 100 - R + clear + 5 * k;
    const place = (dy) => `translate(${x.toFixed(2)} ${(y0 + dy - top * scale).toFixed(2)}) scale(${scale.toFixed(4)})`;
    if (engraved) add(add(svg, 'g', { transform: place(0.55 * k) }, 'pw-brand-engrave-light'), 'path', { d: MONOGRAM.path });
    const g = add(svg, 'g', { transform: place(0) }, metal ? ['pw-brand-mark', 'is-applied', 'pw-raised'] : engraved ? ['pw-brand-mark', 'is-engraved'] : 'pw-brand-mark');
    const fill = metal ? { fill: `url(#${this.id('brand-metal')})` } : {};
    if (metal) {
      this.gradient(add, 'linearGradient', 'brand-metal', { x1: 0, x2: 0, y1: top, y2: bottom, gradientUnits: 'userSpaceOnUse' }, [['0%', 'pw-metal-a'], ['55%', 'pw-metal-b'], ['100%', 'pw-metal-c']]);
    }
    add(g, 'path', Object.assign({ d: MONOGRAM.path }, fill), 'pw-brand-script');
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

  // Maki-e: a cherry branch in gold lacquer with mother-of-pearl blossoms on black urushi,
  // gold dust settled along the bottom and two bands of gold mist, and petals drifting by.
  drawSakura(svg, add, R) {
    const url = (name) => `url(#${this.id(name)})`;
    const g = add(svg, 'g', { 'clip-path': url('dial-clip') });
    const rand = rng(29);
    this.gradient(add, 'linearGradient', 'sakura-gold', { gradientUnits: 'userSpaceOnUse', x1: 30, y1: 175, x2: 175, y2: 35 }, [
      ['0%', '#6e4a12'], ['30%', '#c99a3e'], ['50%', '#fbe7a6'], ['68%', '#d2a24a'], ['100%', '#7a5416'],
    ]);
    this.gradient(add, 'radialGradient', 'sakura-petal', { cx: '50%', cy: '100%', r: '105%' }, [
      ['0%', '#df6f93'], ['30%', '#f3b6c8'], ['62%', '#fde6ec'], ['100%', '#fffaf8'],
    ]);
    this.gradient(add, 'linearGradient', 'sakura-pearl', { x1: 0, y1: 0, x2: 1, y2: 1 }, [
      ['0%', 'rgba(190,225,255,0)'], ['40%', 'rgba(196,228,255,0.5)'], ['55%', 'rgba(255,214,236,0)'], ['82%', 'rgba(214,255,226,0.38)'], ['100%', 'rgba(214,255,226,0)'],
    ]);
    this.gradient(add, 'linearGradient', 'sakura-mist', { x1: 0, y1: 0, x2: 1, y2: 0 }, [
      ['0%', 'rgba(226,190,104,0)'], ['18%', 'rgba(226,190,104,0.9)'], ['82%', 'rgba(226,190,104,0.9)'], ['100%', 'rgba(226,190,104,0)'],
    ]);
    this.gradient(add, 'radialGradient', 'sakura-gloss', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(255,255,255,0.15)'], ['100%', 'rgba(255,255,255,0)']]);

    // Nashiji: gold dust, thick along the bottom and thinning out as it rises.
    let dust = '';
    for (let i = 0; i < 560; i++) {
      const x = 100 - R + rand() * 2 * R;
      const y = 100 + R - Math.pow(rand(), 2.1) * R * 1.25;
      dust += circlePath(x.toFixed(2), y.toFixed(2), (0.1 + rand() * 0.3).toFixed(2));
    }
    add(g, 'path', { d: dust, fill: url('sakura-gold') }, 'pw-art-dust');
    // Kasumi: bands of mist in close-set gold dust, thinning out toward their ends.
    let mist = '';
    for (const [x, y, w, h] of [[110, 150, 82, 7.5], [14, 64, 52, 5.5], [136, 161, 44, 4.2]]) {
      add(g, 'rect', { x, y, width: w, height: h, rx: h / 2, fill: url('sakura-mist') }, 'pw-art-mist');
      for (let i = 0; i < w * h * 0.9; i++) {
        const u = rand();
        const sx = x + u * w;
        const sy = y + rand() * h;
        // Keep inside the rounded ends, and let the dust thin out toward them.
        const end = Math.min(sx - x, x + w - sx);
        if (end < h / 2 && Math.hypot(h / 2 - end, sy - y - h / 2) > h / 2) continue;
        if (rand() > Math.min(1, end / (w * 0.22))) continue;
        mist += circlePath(sx.toFixed(2), sy.toFixed(2), (0.1 + rand() * 0.22).toFixed(2));
      }
    }
    add(g, 'path', { d: mist, fill: url('sakura-gold') }, 'pw-art-mist-dust');

    // Depth: a second branch far behind, soft and dim as if out of focus, with blossoms
    // blurred to points of light. The main branch stands off the lacquer on its own shadow,
    // and a few petals drift past close to the crystal.
    const soft = (name, sd) => {
      const f = add(this.defs, 'filter', { id: this.id(name), x: '-40%', y: '-40%', width: '180%', height: '180%' });
      add(f, 'feGaussianBlur', { stdDeviation: sd });
    };
    soft('sakura-far', 1.5);
    soft('sakura-near', 1.3);
    const lift = add(this.defs, 'filter', { id: this.id('sakura-lift'), x: '-20%', y: '-20%', width: '140%', height: '140%' });
    add(lift, 'feDropShadow', { dx: 1.2, dy: 2.2, stdDeviation: 1.6, 'flood-color': '#000', 'flood-opacity': 0.85 });
    const far = add(g, 'g', { filter: url('sakura-far') }, 'pw-sakura-far');
    const farBranch = [[[200, 28], [168, 44], [140, 40], [112, 54]], [[112, 54], [92, 64], [70, 60], [44, 74]]];
    add(far, 'path', { d: brushPath(farBranch, 5, 1.2), fill: url('sakura-gold') });
    for (const [x, y, r] of [[160, 40, 6], [132, 46, 7], [104, 56, 5.5], [80, 60, 6.5], [56, 68, 5], [146, 30, 4.5], [92, 48, 4]]) {
      add(far, 'circle', { cx: x, cy: y, r, fill: url('sakura-petal') }, 'pw-sakura-bokeh');
    }

    // The branch, in raised gold with a light catching its upper edge.
    const main = add(g, 'g', { filter: url('sakura-lift') });
    const trunk = [
      [[-4, 172], [36, 152], [70, 134], [104, 125]],
      [[104, 125], [132, 118], [152, 101], [170, 71]],
      [[170, 71], [175, 62], [179, 54], [186, 47]],
    ];
    const boughs = [
      [trunk, 9, 0.6],
      [[[96, 127], [86, 114], [74, 101], [60, 92]], 3.2, 0.8],
      [[[137, 111], [150, 117], [160, 126], [173, 131]], 2.4, 0.6],
      [[[58, 141], [55, 131], [49, 123], [39, 118]], 2.6, 0.6],
      [[[155, 93], [160, 85], [167, 82], [177, 84]], 1.5, 0.4],
      [[[30, 157], [26, 150], [22, 147], [14, 146]], 2.6, 0.7],
    ];
    // The twigs first, so they grow out from behind the trunk drawn over them.
    const bark = add(main, 'g', {}, 'pw-bark');
    for (const [c, w0, w1] of boughs.slice().reverse()) {
      add(bark, 'path', { d: brushPath(c, w0, w1), fill: url('sakura-gold') });
      const shift = ([x, y]) => [x - 0.35, y - w0 * 0.2];
      const lit = typeof c[0][0] === 'number' ? c.map(shift) : c.map((curve) => curve.map(shift));
      add(bark, 'path', { d: brushPath(lit, w0 * 0.3, w1 * 0.2) }, 'pw-bark-light');
    }
    // Cherry bark is marked with little bands across the branch.
    let lenticels = '';
    for (let t = 0.04; t < 0.8; t += 0.018 + rand() * 0.03) {
      const [x, y] = chainAt(trunk, t);
      const [x2, y2] = chainAt(trunk, t + 0.004);
      const len = Math.hypot(x2 - x, y2 - y) || 1;
      if (rand() < 0.35) continue;
      const half = (9 + (0.6 - 9) * t) * (0.12 + rand() * 0.2);
      const [nx, ny] = [(-(y2 - y) / len) * half, ((x2 - x) / len) * half];
      const off = (rand() - 0.5) * half;
      const [cx, cy] = [x + ((-(y2 - y)) / len) * off, y + ((x2 - x) / len) * off];
      lenticels += `M ${(cx - nx).toFixed(2)} ${(cy - ny).toFixed(2)} L ${(cx + nx).toFixed(2)} ${(cy + ny).toFixed(2)} `;
    }
    add(main, 'path', { d: lenticels }, 'pw-bark-mark');
    for (const [x, y, rx, ry, a] of [[44, 147, 1.6, 0.7, -30], [83, 129, 1.4, 0.6, -18], [121, 120, 1.2, 0.5, -30], [149, 104, 0.9, 0.45, -55]]) {
      add(main, 'ellipse', { cx: x, cy: y, rx, ry, transform: `rotate(${a} ${x} ${y})` }, 'pw-bark-knot');
    }

    // Buds, closed in their gold calyxes.
    const petal = (L, W) => `M 0 0 C ${-W * 0.55} ${-L * 0.25} ${-W * 0.62} ${-L * 0.85} ${-W * 0.22} ${-L} Q ${-W * 0.08} ${-L * 1.03} 0 ${-L * 0.86} Q ${W * 0.08} ${-L * 1.03} ${W * 0.22} ${-L} C ${W * 0.62} ${-L * 0.85} ${W * 0.55} ${-L * 0.25} 0 0 Z`;
    for (const [x, y, turn] of [[186, 46, 50], [60, 92, -55], [174, 131, 105], [38, 118, -75], [178, 84, 80], [13, 146, -95]]) {
      const b = add(main, 'g', { transform: `translate(${x} ${y}) rotate(${turn})` });
      add(b, 'ellipse', { cx: 0, cy: -2.7, rx: 1.8, ry: 2.9, fill: url('sakura-petal') }, 'pw-petal');
      add(b, 'path', { d: 'M -1.7 -0.9 Q 0 -3.4 1.7 -0.9 Q 0 0.9 -1.7 -0.9 Z', fill: url('sakura-gold') });
    }

    // Blossoms of mother-of-pearl, each with a deep pink eye and gold stamens.
    const blossoms = [
      [30, 154, 5.8, 22], [56, 136, 6.4, 8], [75, 124, 7.4, 38], [92, 134, 5.4, -22], [114, 114, 6.8, 64],
      [128, 126, 5.2, 14], [141, 104, 6.4, -34], [152, 87, 5.6, 22], [163, 75, 5, 48], [69, 99, 5.6, -12],
      [52, 90, 4.6, 30], [45, 124, 4.8, 2], [165, 128, 4.8, -26], [176, 64, 4.2, 12],
    ];
    for (const [x, y, size, turn] of blossoms) {
      const b = add(main, 'g', { transform: `translate(${x} ${y}) rotate(${turn})` }, 'pw-blossom');
      for (let i = 0; i < 5; i++) {
        const leaf = add(b, 'g', { transform: `rotate(${i * 72 + (rand() - 0.5) * 8})` });
        const L = size * (0.94 + rand() * 0.12);
        add(leaf, 'path', { d: petal(L, L * 0.88), fill: url('sakura-petal') }, 'pw-petal');
        add(leaf, 'path', { d: petal(L, L * 0.88), fill: url('sakura-pearl') }, 'pw-petal-sheen');
      }
      let stamens = '';
      let tips = '';
      for (let i = 0; i < 10; i++) {
        const a = ((i * 36 + rand() * 14) * Math.PI) / 180;
        const l = size * (0.36 + rand() * 0.16);
        const sx = (Math.sin(a) * l).toFixed(2);
        const sy = (-Math.cos(a) * l).toFixed(2);
        stamens += `M 0 0 L ${sx} ${sy} `;
        tips += circlePath(sx, sy, (size * 0.055).toFixed(2));
      }
      add(b, 'circle', { r: size * 0.2 }, 'pw-blossom-eye');
      add(b, 'path', { d: stamens }, 'pw-stamen');
      add(b, 'path', { d: tips }, 'pw-stamen-tip');
    }

    // Petals carried off on the air.
    for (const [x, y, size, turn] of [[126, 42, 3.4, 30], [148, 54, 2.8, -50], [86, 60, 3, 80], [40, 82, 2.6, -20], [158, 150, 3.2, 120], [104, 168, 2.6, 40], [66, 38, 2.4, 150], [182, 108, 2.6, -70]]) {
      const p = add(g, 'g', { transform: `translate(${x} ${y}) rotate(${turn})` }, 'pw-petal-fall');
      add(p, 'path', { d: petal(size * 1.6, size * 1.3), fill: url('sakura-petal') }, 'pw-petal');
      add(p, 'path', { d: petal(size * 1.6, size * 1.3), fill: url('sakura-pearl') }, 'pw-petal-sheen');
    }
    for (const [x, y, size, turn] of [[30, 48, 6.5, 40], [170, 168, 7.5, -60], [186, 30, 5.5, 160]]) {
      const p = add(g, 'g', { transform: `translate(${x} ${y}) rotate(${turn})`, filter: url('sakura-near') }, 'pw-petal-near');
      add(p, 'path', { d: petal(size * 1.6, size * 1.3), fill: url('sakura-petal') });
    }
    // The gloss of the lacquer.
    add(g, 'ellipse', { cx: 72, cy: 56, rx: R * 0.62, ry: R * 0.3, transform: 'rotate(-32 72 56)', fill: url('sakura-gloss') }, 'pw-art-gloss');
  }

  // A painted night: a mountain lake at dusk under the first stars and the milky way, with
  // tonight's moon in its true phase, its light on the water, and a boat with a lantern.
  drawNocturne(svg, add, R, now) {
    const url = (name) => `url(#${this.id(name)})`;
    const g = add(svg, 'g', { 'clip-path': url('dial-clip') });
    const rand = rng(41);
    const H = 129;
    const lin = (name, y1, y2, stops) => this.gradient(add, 'linearGradient', name, { gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0, y1, y2 }, stops);
    lin('noc-sky', 10, H, [['0%', '#060a20'], ['30%', '#111a46'], ['56%', '#2d2c6a'], ['76%', '#6a4985'], ['91%', '#c77a85'], ['100%', '#f2b386']]);
    lin('noc-lake', H, 190, [['0%', '#e6a382'], ['10%', '#8f6b90'], ['36%', '#373a71'], ['72%', '#131940'], ['100%', '#070a20']]);
    lin('noc-far', 84, H, [['0%', '#9290c0'], ['100%', '#5b5a90']]);
    lin('noc-mid', 104, H, [['0%', '#4a4d88'], ['100%', '#2b2e62']]);
    lin('noc-near', 112, H + 2, [['0%', '#1c1e42'], ['100%', '#0e1029']]);
    this.gradient(add, 'radialGradient', 'noc-glow', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(255,241,206,0.55)'], ['35%', 'rgba(255,241,206,0.16)'], ['100%', 'rgba(255,241,206,0)']]);
    this.gradient(add, 'radialGradient', 'noc-moon', { cx: '40%', cy: '35%', r: '70%' }, [['0%', '#fffbea'], ['70%', '#f1e2b1'], ['100%', '#d6c088']]);
    this.gradient(add, 'radialGradient', 'noc-milky', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(205,212,255,0.2)'], ['100%', 'rgba(205,212,255,0)']]);
    this.gradient(add, 'radialGradient', 'noc-dusk', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(255,192,140,0.5)'], ['100%', 'rgba(255,192,140,0)']]);
    this.gradient(add, 'radialGradient', 'noc-lantern', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(255,214,140,0.95)'], ['30%', 'rgba(255,180,90,0.4)'], ['100%', 'rgba(255,170,80,0)']]);

    // The sky, the milky way across it and the last light low in the west.
    add(g, 'rect', { x: 0, y: 0, width: 200, height: H + 1, fill: url('noc-sky') });
    add(g, 'ellipse', { cx: 92, cy: 58, rx: 96, ry: 15, transform: 'rotate(-27 92 58)', fill: url('noc-milky') });
    add(g, 'ellipse', { cx: 70, cy: H, rx: 120, ry: 28, fill: url('noc-dusk') });
    const stars = ['', '', ''];
    for (let i = 0; i < 190; i++) {
      // Some of the stars gather along the milky way.
      let x;
      let y;
      if (i % 3 === 0) {
        const t = rand() * 2 - 1;
        x = 92 + t * 92 * Math.cos(0.471) + (rand() - 0.5) * 22;
        y = 58 - t * 92 * Math.sin(0.471) + (rand() - 0.5) * 18;
      } else {
        x = 8 + rand() * 184;
        y = 8 + Math.pow(rand(), 1.4) * (H - 26);
      }
      if (y > H - 14) continue;
      const fade = 1 - (y - 8) / H;
      stars[i % 3] += circlePath(x.toFixed(2), y.toFixed(2), ((0.12 + rand() * 0.36) * (0.4 + fade * 0.6)).toFixed(2));
    }
    stars.forEach((d, i) => add(g, 'path', { d }, ['pw-noc-star', `is-${i}`]));
    let bright = '';
    for (const [x, y, z] of [[48, 40, 2.1], [72, 26, 1.5], [158, 34, 1.7], [104, 52, 1.3], [30, 72, 1.4], [176, 80, 1.2]]) bright += glintPath(x, y, z);
    add(g, 'path', { d: bright }, 'pw-noc-glint');

    // Tonight's moon.
    const [mx, my, mr] = [138, 55, 7.4];
    const phase = moonPhase(now);
    add(g, 'circle', { cx: mx, cy: my, r: mr * 3.6, fill: url('noc-glow') });
    add(g, 'circle', { cx: mx, cy: my, r: mr }, 'pw-noc-moon-dark');
    add(g, 'path', { d: moonPath(mx, my, mr, phase), fill: url('noc-moon') }, 'pw-noc-moon');

    // Mountains: a far range with moonlit snow, a nearer one, and pine woods on the shores.
    const ridge = (points, seed, rough) => {
      const r = rng(seed);
      let pts = points;
      for (let pass = 0; pass < 2; pass++) {
        const next = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          next.push(pts[i], [(x1 + x2) / 2 + (r() - 0.5) * rough, (y1 + y2) / 2 + (r() - 0.5) * rough * 1.4]);
        }
        next.push(pts[pts.length - 1]);
        pts = next;
        rough /= 2;
      }
      return pts;
    };
    const line = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const fill = (pts, base) => `${line(pts)} L 205 ${base} L -5 ${base} Z`;
    const far = ridge([[-5, 112], [14, 105], [27, 99], [38, 103], [51, 90], [61, 83], [70, 88], [81, 96], [93, 91], [105, 99], [118, 95], [131, 101], [146, 93], [158, 98], [172, 91], [187, 100], [205, 104]], 7, 5);
    const mid = ridge([[-5, 120], [17, 113], [31, 117], [46, 109], [60, 116], [78, 112], [96, 120], [111, 112], [125, 107], [140, 114], [156, 109], [171, 117], [187, 111], [205, 116]], 13, 4);
    const scene = add(g, 'g', {});
    add(scene, 'path', { d: fill(far, H + 1), fill: url('noc-far') });
    add(scene, 'path', { d: line(far) }, 'pw-noc-snow');
    add(scene, 'path', { d: fill(mid, H + 1), fill: url('noc-mid') });
    add(scene, 'path', { d: line(mid) }, 'pw-noc-rim');
    let woods = `M -5 ${H + 1} L -5 ${H - 5} L 78 ${H - 2} L 84 ${H + 1} Z M 140 ${H + 1} L 146 ${H - 3} L 205 ${H - 6} L 205 ${H + 1} Z `;
    const pine = (x, base, h) => {
      const w = h * 0.36;
      let d = `M ${x - 0.25} ${base} L ${x - 0.25} ${base - h * 0.2} `;
      for (let t = 0; t < 3; t++) {
        const y = base - h * (0.18 + t * 0.27);
        const s = w * (1 - t * 0.26);
        d += `L ${x - s} ${y.toFixed(2)} L ${x - s * 0.35} ${(y - h * 0.08).toFixed(2)} `;
      }
      d += `L ${x} ${base - h} `;
      for (let t = 2; t >= 0; t--) {
        const y = base - h * (0.18 + t * 0.27);
        const s = w * (1 - t * 0.26);
        d += `L ${x + s * 0.35} ${(y - h * 0.08).toFixed(2)} L ${x + s} ${y.toFixed(2)} `;
      }
      return `${d}L ${x + 0.25} ${base - h * 0.2} L ${x + 0.25} ${base} Z `;
    };
    for (let x = -2; x < 80; x += 2.6 + rand() * 3) woods += pine(x, H - 2 - (x / 80) * 2 + rand(), 6 + rand() * 7 * (1 - x / 120));
    for (let x = 144; x < 204; x += 2.6 + rand() * 3) woods += pine(x, H - 3 - ((x - 140) / 60) * 3 + rand(), 5 + rand() * 6 * ((x - 120) / 80));
    add(scene, 'path', { d: woods, fill: url('noc-near') });

    // The lake, holding the mountains upside down, with ripples and the moon's path on it.
    add(g, 'rect', { x: 0, y: H, width: 200, height: 200 - H, fill: url('noc-lake') });
    const mirror = add(g, 'g', { transform: `matrix(1 0 0 -1 0 ${2 * H})` }, 'pw-noc-reflection');
    add(mirror, 'path', { d: fill(far, H + 1), fill: url('noc-far') });
    add(mirror, 'path', { d: fill(mid, H + 1), fill: url('noc-mid') });
    add(mirror, 'path', { d: woods, fill: url('noc-near') });
    add(g, 'rect', { x: 0, y: H - 0.3, width: 200, height: 1 }, 'pw-noc-shore');
    let ripples = '';
    for (let i = 0; i < 70; i++) {
      const y = H + 2 + Math.pow(rand(), 1.6) * 56;
      const x = rand() * 200;
      const len = 3 + rand() * 10 + (y - H) * 0.12;
      ripples += `M ${x.toFixed(2)} ${y.toFixed(2)} L ${(x + len).toFixed(2)} ${y.toFixed(2)} `;
    }
    add(g, 'path', { d: ripples }, 'pw-noc-ripple');
    // The moon's path widens as it comes closer, broken up by the ripples.
    let glitter = '';
    for (let i = 0; i < 90; i++) {
      const depth = Math.pow(rand(), 1.3);
      const y = H + 1.5 + depth * 56;
      const spread = 1.2 + depth * 9;
      const x = mx + (rand() + rand() - 1) * spread;
      const len = (0.5 + rand() * 1.6) * (1 + depth * 1.6);
      glitter += `M ${(x - len / 2).toFixed(2)} ${y.toFixed(2)} L ${(x + len / 2).toFixed(2)} ${y.toFixed(2)} `;
    }
    add(g, 'path', { d: glitter, opacity: (0.35 + 0.65 * Math.sin(Math.PI * phase)).toFixed(2) }, 'pw-noc-glitter');

    // A boat with a lantern, and the lantern's light on the water.
    const [bx, by] = [70, 147];
    let lantern = '';
    for (let i = 0; i < 16; i++) {
      const y = by + 3 + rand() * 20;
      const x = bx + 8.2 + (rand() - 0.5) * (1 + (y - by) * 0.12);
      const len = 0.5 + rand() * 1.2;
      lantern += `M ${(x - len / 2).toFixed(2)} ${y.toFixed(2)} L ${(x + len / 2).toFixed(2)} ${y.toFixed(2)} `;
    }
    add(g, 'path', { d: lantern }, 'pw-noc-lantern-path');
    add(g, 'path', { d: `M ${bx - 8} ${by} Q ${bx} ${by + 3.4} ${bx + 9} ${by - 0.4} L ${bx + 7.4} ${by + 2.2} Q ${bx} ${by + 4.6} ${bx - 6.2} ${by + 2.2} Z` }, 'pw-noc-boat');
    add(g, 'path', { d: `M ${bx - 1.6} ${by + 1.4} L ${bx - 1.3} ${by - 3.6} Q ${bx - 0.6} ${by - 5} ${bx + 0.2} ${by - 3.6} L ${bx + 0.6} ${by + 1.6} Z M ${bx - 0.7} ${by - 4.4} m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 Z` }, 'pw-noc-boat');
    add(g, 'path', { d: `M ${bx + 3} ${by + 1} L ${bx + 8.2} ${by - 5.6}` }, 'pw-noc-pole');
    add(g, 'circle', { cx: bx + 8.2, cy: by - 5, r: 4.6, fill: url('noc-lantern') });
    add(g, 'circle', { cx: bx + 8.2, cy: by - 5, r: 0.75 }, 'pw-noc-lantern');

    // Reeds at the water's edge in the foreground.
    let reeds = '';
    for (let i = 0; i < 16; i++) {
      const x = 12 + rand() * 38;
      const h = 8 + rand() * 14;
      const lean = (rand() - 0.3) * 5;
      reeds += `M ${x.toFixed(2)} 192 Q ${(x + lean * 0.3).toFixed(2)} ${(192 - h * 0.6).toFixed(2)} ${(x + lean).toFixed(2)} ${(192 - h).toFixed(2)} `;
    }
    add(g, 'path', { d: reeds }, 'pw-noc-reed');
  }

  // Widmanstätten pattern: the crystals of iron and nickel that grew inside a meteorite as it
  // cooled over millions of years, as three families of plates crossing at 60 degrees, etched
  // so some catch the light and others lie in shadow.
  drawMeteorite(svg, add, R) {
    const g = add(svg, 'g', { 'clip-path': `url(#${this.id('dial-clip')})` });
    const rand = rng(83);
    const plates = { light: '', soft: '', dark: '', deep: '' };
    for (const family of [0, 60, 120]) {
      const a = ((17 + family) * Math.PI) / 180;
      const [ux, uy] = [Math.cos(a), Math.sin(a)];
      const at = (u, v) => `${(100 + ux * u - uy * v).toFixed(1)} ${(100 + uy * u + ux * v).toFixed(1)}`;
      for (let v = -R - 4; v < R + 4; v += 1.9 + rand() * 3.4) {
        const w = 0.9 + rand() * 1.9;
        for (let u = -R - 10; u < R + 10;) {
          const len = 10 + rand() * 46;
          if (rand() > 0.42) {
            const pick = rand();
            const kind = pick < 0.3 ? 'light' : pick < 0.55 ? 'soft' : pick < 0.82 ? 'dark' : 'deep';
            plates[kind] += `M ${at(u, v)} L ${at(u + len, v)} L ${at(u + len, v + w)} L ${at(u, v + w)} Z `;
          }
          u += len + rand() * 3.5;
        }
      }
    }
    for (const [kind, d] of Object.entries(plates)) add(g, 'path', { d }, ['pw-plate', `is-${kind}`]);
  }

  // Malachite: a slice of polished green stone, its bands curving in rings around a few eyes,
  // pale lines where the stone grew in fine layers.
  drawMalachite(svg, add, R) {
    const g = add(svg, 'g', { 'clip-path': `url(#${this.id('dial-clip')})` });
    const rand = rng(29);
    const tones = ['deep', 'dark', 'mid', 'dark', 'light', 'mid', 'deep', 'mid', 'pale'];
    // Each eye: its centre, how far its outer band reaches, and how much its rings wander.
    const eyes = [[38, 168, 205, 0.1], [156, 52, 64, 0.14], [138, 148, 34, 0.12], [58, 62, 24, 0.16]];
    for (const [cx, cy, reach, wobble] of eyes) {
      // Every ring of an eye follows the same waves, so the bands stay roughly parallel.
      const waves = [2, 3, 5, 7].map((n) => [n, wobble * (0.25 + rand()) / Math.sqrt(n), rand() * 2 * Math.PI]);
      let r = reach;
      let i = Math.floor(rand() * tones.length);
      while (r > 1.2) {
        let d = '';
        const drift = rand() * 0.6;
        for (let j = 0; j <= 96; j++) {
          const t = (j / 96) * 2 * Math.PI;
          let f = 1;
          for (const [n, amp, phase] of waves) f += amp * Math.sin(n * t + phase + drift * (n === 2 ? 1 : 0));
          d += `${j ? 'L' : 'M'} ${(cx + r * f * Math.cos(t)).toFixed(2)} ${(cy + r * f * Math.sin(t)).toFixed(2)} `;
        }
        const tone = tones[i++ % tones.length];
        add(g, 'path', { d: `${d}Z` }, ['pw-stone', `is-${tone}`]);
        // Pale lines are thin; the rest of the bands vary.
        r -= tone === 'pale' ? 0.7 + rand() * 0.6 : 1.4 + rand() * rand() * 7;
      }
    }
    // The polish catches the light at the top left.
    this.gradient(add, 'radialGradient', 'polish', { cx: '30%', cy: '26%', r: '75%' }, [['0%', 'rgba(255,255,255,0.2)'], ['60%', 'rgba(255,255,255,0.03)'], ['100%', 'rgba(255,255,255,0)']]);
    add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: `url(#${this.id('polish')})` }, 'pw-stone-polish');
  }

  // Koi, painted: a green pond in loose brush strokes with dappled light, lily pads and a
  // lotus, and two koi gliding round each other, a white one marked in vermilion and a
  // golden one, their shadows on the pond floor below them.
  drawKoi(svg, add, R) {
    const url = (name) => `url(#${this.id(name)})`;
    const g = add(svg, 'g', { 'clip-path': url('dial-clip') });
    const rand = rng(57);
    this.gradient(add, 'radialGradient', 'koi-water', { cx: '36%', cy: '30%', r: '85%' }, [['0%', '#4f9a8f'], ['45%', '#2a6c6c'], ['100%', '#0f3439']]);
    this.gradient(add, 'radialGradient', 'koi-pad', { cx: '40%', cy: '35%', r: '70%' }, [['0%', '#8cc066'], ['65%', '#4f8a3c'], ['100%', '#2f5e28']]);
    this.gradient(add, 'radialGradient', 'koi-lotus', { cx: '50%', cy: '100%', r: '100%' }, [['0%', '#e0688a'], ['55%', '#f4a9bd'], ['100%', '#fff1f4']]);
    this.gradient(add, 'linearGradient', 'koi-white', { x1: 0, y1: 0, x2: 0, y2: 1 }, [['0%', '#ffffff'], ['100%', '#e6e1d8']]);
    this.gradient(add, 'linearGradient', 'koi-gold', { x1: 0, y1: 0, x2: 0, y2: 1 }, [['0%', '#ffd27a'], ['55%', '#f0a03a'], ['100%', '#c86f1c']]);
    const blur = (name, sd) => add(add(this.defs, 'filter', { id: this.id(name), x: '-50%', y: '-50%', width: '200%', height: '200%' }), 'feGaussianBlur', { stdDeviation: sd });
    blur('koi-soft', 3.2);
    blur('koi-shadow', 2.4);

    add(g, 'rect', { x: 100 - R, y: 100 - R, width: 2 * R, height: 2 * R, fill: url('koi-water') });
    // Loose strokes of the brush across the water, lighter and darker.
    for (let i = 0; i < 46; i++) {
      const x = 100 - R + rand() * 2 * R;
      const y = 100 - R + rand() * 2 * R;
      const len = 14 + rand() * 30;
      const bend = (rand() - 0.5) * 8;
      const c = [[x, y], [x + len * 0.33, y + bend], [x + len * 0.66, y - bend], [x + len, y + (rand() - 0.5) * 4]];
      add(g, 'path', { d: brushPath(c, 1.6 + rand() * 2.6, 0.4) }, ['pw-koi-stroke', rand() < 0.5 ? 'is-light' : 'is-dark']);
    }
    // Sunlight dappling through the water.
    for (let i = 0; i < 8; i++) {
      add(g, 'ellipse', { cx: 100 - R + rand() * 2 * R, cy: 100 - R + rand() * 2 * R, rx: 6 + rand() * 12, ry: 3 + rand() * 6, filter: url('koi-soft') }, 'pw-koi-dapple');
    }

    // A koi along a curve from its head to its tail: a body that swells behind the head and
    // tapers to the tail, a forked tail fin, two pectoral fins, markings and a dark eye.
    const koi = (spine, W, skin, marks, markCls) => {
      const steps = 40;
      const left = [];
      const right = [];
      const frame = (t) => {
        const [x, y] = chainAt(spine, t);
        const [ax, ay] = chainAt(spine, Math.max(0, t - 0.01));
        const [bx, by] = chainAt(spine, Math.min(1, t + 0.01));
        const len = Math.hypot(bx - ax, by - ay) || 1;
        return { x, y, tx: (bx - ax) / len, ty: (by - ay) / len };
      };
      // Half the body's width along it: a round head, widest a third of the way back, then
      // narrowing to the slim stalk of the tail.
      const half = (t) => (W / 2) * (t < 0.32 ? 0.66 + 0.34 * Math.sin((t / 0.32) * (Math.PI / 2)) : 0.16 + 0.84 * Math.pow(Math.cos(((t - 0.32) / 0.68) * (Math.PI / 2)), 1.25));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const w = half(t);
        const f = frame(t);
        left.push(`${(f.x - f.ty * w).toFixed(2)} ${(f.y + f.tx * w).toFixed(2)}`);
        right.unshift(`${(f.x + f.ty * w).toFixed(2)} ${(f.y - f.tx * w).toFixed(2)}`);
      }
      const h0 = half(0);
      const body = `M ${left.join(' L ')} L ${right.join(' L ')} A ${h0} ${h0 * 1.15} 0 0 0 ${left[0]} Z`;
      const tail = frame(1);
      // A broad, flowing tail in two lobes.
      const fin = (side) => {
        const [bx, by] = [tail.x - tail.tx * 2, tail.y - tail.ty * 2];
        const out = (along, across) => [tail.x + tail.tx * W * along - tail.ty * side * W * across, tail.y + tail.ty * W * along + tail.tx * side * W * across];
        const tip = out(1.05, 0.62);
        const c1 = out(0.35, 0.55);
        const c2 = out(0.75, 0.12);
        return `M ${bx} ${by} Q ${c1[0]} ${c1[1]} ${tip[0]} ${tip[1]} Q ${c2[0]} ${c2[1]} ${bx} ${by} Z`;
      };
      // Pectoral fins just behind the head, spread out and back.
      const pecs = [-1, 1].map((side) => {
        const f = frame(0.2);
        const w = half(0.2) * 0.85;
        const base = [f.x - f.ty * side * w, f.y + f.tx * side * w];
        const tip = [base[0] - f.ty * side * W * 0.5 + f.tx * W * 0.42, base[1] + f.tx * side * W * 0.5 + f.ty * W * 0.42];
        const ctl = [base[0] - f.ty * side * W * 0.42 - f.tx * W * 0.05, base[1] + f.tx * side * W * 0.42 - f.ty * W * 0.05];
        const back = [base[0] + f.tx * W * 0.3, base[1] + f.ty * W * 0.3];
        return `M ${base[0]} ${base[1]} Q ${ctl[0]} ${ctl[1]} ${tip[0]} ${tip[1]} Q ${back[0] - f.ty * side * W * 0.12} ${back[1] + f.tx * side * W * 0.12} ${back[0]} ${back[1]} Z`;
      });
      // Its shadow on the floor of the pond.
      add(g, 'path', { d: `${body} ${fin(-1)} ${fin(1)}`, transform: 'translate(4 7)', filter: url('koi-shadow') }, 'pw-koi-shadow');
      const fish = add(g, 'g', {}, 'pw-koi');
      for (const d of [fin(-1), fin(1), ...pecs]) add(fish, 'path', { d, fill: skin }, 'pw-koi-fin');
      add(fish, 'path', { d: body, fill: skin }, 'pw-koi-body');
      this.clips = (this.clips || 0) + 1;
      const clipId = this.id(`koi-${this.clips}`);
      add(add(this.defs, 'clipPath', { id: clipId }), 'path', { d: body });
      const spots = add(fish, 'g', { 'clip-path': `url(#${clipId})` });
      for (const [t, side, size] of marks) {
        const f = frame(t);
        add(spots, 'ellipse', {
          cx: f.x - f.ty * side * W * 0.18, cy: f.y + f.tx * side * W * 0.18, rx: W * size, ry: W * size * 0.62,
          transform: `rotate(${(Math.atan2(f.ty, f.tx) * 180) / Math.PI} ${f.x - f.ty * side * W * 0.18} ${f.y + f.tx * side * W * 0.18})`,
        }, markCls);
      }
      // A soft light along the back, and the eyes.
      let back = '';
      for (let i = 0; i <= 20; i++) {
        const f = frame(0.04 + i * 0.032);
        back += `${i ? 'L' : 'M'} ${(f.x + f.ty * W * 0.12).toFixed(2)} ${(f.y - f.tx * W * 0.12).toFixed(2)} `;
      }
      add(fish, 'path', { d: back }, 'pw-koi-sheen');
      for (const side of [-1, 1]) {
        const f = frame(0.05);
        add(fish, 'circle', { cx: f.x - f.ty * side * W * 0.22, cy: f.y + f.tx * side * W * 0.22, r: W * 0.055 }, 'pw-koi-eye');
      }
    };

    // Lily pads, each with its notch and veins, and a lotus open on the largest.
    const pad = (cx, cy, r, notch) => {
      const a0 = notch - 0.22;
      const a1 = notch + 0.22;
      const d = `M ${cx} ${cy} L ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} Z`;
      add(g, 'path', { d, transform: 'translate(2.5 4)', filter: url('koi-shadow') }, 'pw-koi-shadow');
      add(g, 'path', { d, fill: url('koi-pad') }, 'pw-koi-pad');
      let veins = '';
      for (let i = 1; i < 11; i++) {
        const a = a1 + (i / 11) * (2 * Math.PI - 0.44);
        veins += `M ${cx} ${cy} L ${(cx + r * 0.9 * Math.cos(a)).toFixed(2)} ${(cy + r * 0.9 * Math.sin(a)).toFixed(2)} `;
      }
      add(g, 'path', { d: veins }, 'pw-koi-vein');
    };
    pad(40, 44, 22, 0.9);
    pad(162, 160, 17, 3.6);
    pad(170, 52, 9, 2.2);
    for (let i = 0; i < 12; i++) {
      const outer = i < 7;
      const a = (i * (outer ? 360 / 7 : 360 / 5) + (outer ? 0 : 36)) - 90;
      const len = outer ? 12 : 8.5;
      add(g, 'ellipse', { cx: 40, cy: 44 - len * 0.5, rx: outer ? 4.2 : 3.4, ry: len * 0.55, transform: `rotate(${a + 90} 40 44)`, fill: url('koi-lotus') }, 'pw-koi-petal');
    }
    add(g, 'circle', { cx: 40, cy: 44, r: 3.4 }, 'pw-koi-seedpod');

    koi([[[140, 124], [124, 148], [92, 152], [70, 136]]], 23, url('koi-white'),
      [[0.08, 0, 0.3], [0.36, -0.25, 0.42], [0.6, 0.3, 0.26]], 'pw-koi-red');
    koi([[[54, 92], [70, 70], [102, 64], [124, 76]]], 19, url('koi-gold'),
      [[0.32, 0.3, 0.22], [0.52, -0.25, 0.17]], 'pw-koi-ink');
    // Rings spreading on the surface.
    for (const [x, y, r] of [[118, 34, 7], [118, 34, 12], [30, 150, 6], [30, 150, 10.5]]) add(g, 'ellipse', { cx: x, cy: y, rx: r, ry: r * 0.42 }, 'pw-koi-ripple');
  }

  // Deco: black lacquer framed in stepped gold lines, a rising sun at 6 (the small seconds)
  // sending a fan of gold rays up the dial, and stepped ornaments in the corners.
  drawDeco(svg, add, R, k) {
    const url = (name) => `url(#${this.id(name)})`;
    const g = add(svg, 'g', { 'clip-path': url('dial-clip') }, 'pw-deco');
    const [sx, sy] = [100, 100 + R * 0.47];
    let rays = '';
    let bold = '';
    for (let a = -84; a <= 84; a += 4) {
      const rad = (a * Math.PI) / 180;
      const seg = `M ${(sx + 22 * k * Math.sin(rad)).toFixed(2)} ${(sy - 22 * k * Math.cos(rad)).toFixed(2)} L ${(sx + 260 * Math.sin(rad)).toFixed(2)} ${(sy - 260 * Math.cos(rad)).toFixed(2)} `;
      if (a % 12 === 0) bold += seg;
      else rays += seg;
    }
    add(g, 'path', { d: rays }, 'pw-deco-ray');
    add(g, 'path', { d: bold }, ['pw-deco-ray', 'is-bold']);
    for (const r of [24, 29, 34]) add(g, 'path', { d: `M ${sx - r * k} ${sy} A ${r * k} ${r * k} 0 0 1 ${sx + r * k} ${sy}` }, 'pw-deco-arc');
    // Two stepped frames inside the edge.
    for (const inset of [10, 13]) {
      const r = R - inset * k;
      add(g, 'rect', { x: 100 - r, y: 100 - r, width: 2 * r, height: 2 * r, rx: r * 0.22 }, 'pw-deco-frame');
    }
    // Stepped chevrons in each corner, like the setbacks of a skyscraper.
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      let d = '';
      for (let i = 0; i < 3; i++) {
        const c = R - 17 * k - i * 4.2 * k;
        const len = (10 - i * 2.2) * k;
        d += `M ${100 + dx * c} ${100 + dy * (c - len)} L ${100 + dx * c} ${100 + dy * c} L ${100 + dx * (c - len)} ${100 + dy * c} `;
      }
      add(g, 'path', { d }, 'pw-deco-step');
    }
  }

  // A panda's face: round black ears at the top of the dial, the subdials at 9 and 3 set in
  // black patches that slope down and out like a panda's eyes, and a small nose and mouth.
  drawPanda(svg, add, R, k) {
    const g = add(svg, 'g', { 'clip-path': `url(#${this.id('dial-clip')})` }, 'pw-panda');
    for (const a of [-41, 41]) {
      const [x, y] = polar(R + 4, a);
      add(g, 'circle', { cx: x, cy: y, r: 23 * k }, 'pw-panda-ear');
      add(g, 'circle', { cx: x, cy: y, r: 12 * k }, 'pw-panda-ear-in');
    }
    for (const [hour, tilt] of [[9, -38], [3, 38]]) {
      const [x, y] = polar(R * 0.47, hour * 30);
      add(g, 'ellipse', { cx: x, cy: y + 3 * k, rx: 27 * k, ry: 19.5 * k, transform: `rotate(${tilt} ${x} ${y + 3 * k})` }, 'pw-panda-patch');
    }
    const ny = 100 + R * 0.36;
    const w = 5.2 * k;
    add(g, 'path', { d: `M ${100 - w} ${ny - 2.6 * k} Q 100 ${ny - 4.4 * k} ${100 + w} ${ny - 2.6 * k} Q ${100 + w * 0.9} ${ny + 1.2 * k} 100 ${ny + 2.8 * k} Q ${100 - w * 0.9} ${ny + 1.2 * k} ${100 - w} ${ny - 2.6 * k} Z` }, 'pw-panda-nose');
    add(g, 'ellipse', { cx: 100 - 1.8 * k, cy: ny - 2.2 * k, rx: 1.6 * k, ry: 0.7 * k }, 'pw-panda-shine');
    add(g, 'path', { d: `M 100 ${ny + 2.8 * k} L 100 ${ny + 5.6 * k} M ${100 - 5 * k} ${ny + 5.2 * k} Q ${100 - 2.4 * k} ${ny + 8 * k} 100 ${ny + 5.6 * k} Q ${100 + 2.4 * k} ${ny + 8 * k} ${100 + 5 * k} ${ny + 5.2 * k}` }, 'pw-panda-mouth');
  }

  // The small dial at 12 of a regulator, where the hour hand turns on its own.
  drawHourDial(svg, add, text, cx, cy, k) {
    const z = (this.faceDef && this.faceDef.subdial) || 1;
    this.drawSunkSubdial(svg, add, text, cx, cy, 18.5 * k * z, k * z, ['XII', 'III', 'VI', 'IX'], 12);
  }

  // A subdial sunk into the dial: a shadowed step, fine circular graining, a track with a
  // tick for every division and the four quarters numbered.
  drawSunkSubdial(svg, add, text, cx, cy, r, k, numerals, divisions = 60) {
    add(svg, 'circle', { cx, cy, r: r + 0.9 * k }, 'pw-sunk-step');
    add(svg, 'circle', { cx, cy, r }, ['pw-subdial', 'is-sunk']);
    for (let rr = 2.4 * k; rr < r - 6.5 * k; rr += 1.05 * k) add(svg, 'circle', { cx, cy, r: rr }, 'pw-snailing');
    add(svg, 'circle', { cx, cy, r: r - 0.6 * k }, 'pw-sunk-shadow');
    add(svg, 'circle', { cx, cy, r: r - 1.6 * k }, 'pw-sub-track');
    let fine = '';
    let major = '';
    for (let i = 0; i < divisions; i++) {
      const a = (i * 2 * Math.PI) / divisions;
      const big = i % (divisions / 4) === 0;
      const mid = !big && i % (divisions / 12) === 0;
      const len = big ? 3.2 * k : mid ? 2.2 * k : 1.1 * k;
      const seg = `M ${(cx + (r - 1.6 * k) * Math.sin(a)).toFixed(2)} ${(cy - (r - 1.6 * k) * Math.cos(a)).toFixed(2)} L ${(cx + (r - 1.6 * k - len) * Math.sin(a)).toFixed(2)} ${(cy - (r - 1.6 * k - len) * Math.cos(a)).toFixed(2)} `;
      if (big || mid) major += seg;
      else fine += seg;
    }
    add(svg, 'path', { d: fine }, ['pw-subdial-tick', 'is-fine']);
    add(svg, 'path', { d: major }, 'pw-subdial-tick');
    numerals.forEach((n, i) => {
      const a = (i * Math.PI) / 2;
      const rr = r - 7.4 * k;
      text(svg, cx + rr * Math.sin(a), cy - rr * Math.cos(a), 4.4 * k, n, ['pw-numeral', 'is-sub']);
    });
  }

  // The Pomodoro dial: the focus session painted as a wedge from the minute hand to when it
  // ends, and the break after it in a second colour, so the minute hand walks through your
  // focus into your break. Between sessions they show faintly, ready to start. In the middle,
  // the time left and a dot for each session until the long break.
  drawPomodoro(svg, add, text, R, k) {
    const r0 = R * 0.37;
    const r1 = R * 0.75;
    add(svg, 'circle', { cx: 100, cy: 100, r: (r0 + r1) / 2, 'stroke-width': r1 - r0 }, 'pw-pomo-track');
    add(svg, 'circle', { cx: 100, cy: 100, r: r0 }, 'pw-pomo-edge');
    add(svg, 'circle', { cx: 100, cy: 100, r: r1 }, 'pw-pomo-edge');
    const g = add(svg, 'g', {}, 'pw-pomo');
    const pomo = { g, r0, r1, focus: add(g, 'path', { d: '' }, ['pw-pomo-wedge', 'is-focus']), break: add(g, 'path', { d: '' }, ['pw-pomo-wedge', 'is-break']) };
    pomo.readout = text(svg, 100, 100 + 12.5 * k, 10 * k, '', 'pw-pomo-readout');
    pomo.caption = text(svg, 100, 100 + 20.5 * k, 3.9 * k, '', 'pw-pomo-caption');
    const n = clamp(this.plugin.settings.longBreakEvery, 1, 8);
    pomo.dots = [];
    for (let i = 0; i < n; i++) {
      const x = 100 + (i - (n - 1) / 2) * 4.6 * k;
      pomo.dots.push(add(svg, 'circle', { cx: x, cy: 100 + 26 * k, r: 1.35 * k }, 'pw-pomo-dot'));
    }
    this.parts.pomo = pomo;
  }

  // Moves the Pomodoro dial along: called every second.
  updatePomodoro(now) {
    const p = this.plugin;
    const s = p.settings;
    const x = p.session;
    const pomo = this.parts.pomo;
    const every = Math.max(1, s.longBreakEvery);
    // The break after the coming focus session: a long one once enough sessions are done.
    const breakAfter = () => p.sessionMinutes((p.cycle + 1) % every === 0 ? 'long' : 'short');
    let first;
    let firstMin;
    let second = null;
    let secondMin = 0;
    let mode = 'preview';
    let readout;
    let caption;
    if (x) {
      const left = p.sessionRemaining();
      first = x.kind === 'focus' ? 'focus' : 'break';
      firstMin = left / 60000;
      second = x.kind === 'focus' ? 'break' : 'focus';
      secondMin = x.kind === 'focus' ? breakAfter() : s.focusMinutes;
      mode = x.paused ? 'paused' : 'running';
      const secs = Math.ceil(left / 1000);
      readout = `${Math.floor(secs / 60)}:${pad2(secs % 60)}`;
      caption = x.paused ? 'PAUSED' : x.kind === 'focus' ? 'FOCUS' : x.kind === 'long' ? 'LONG BREAK' : 'BREAK';
    } else if (p.alert) {
      // Time is up: what comes next waits to start.
      const done = p.alert.kind === 'focus';
      first = done ? 'break' : 'focus';
      firstMin = done ? p.sessionMinutes(p.nextBreak()) : s.focusMinutes;
      const over = Math.floor((Date.now() - p.alert.endedAt) / 60000);
      readout = over >= 1 ? `+${over}` : '0:00';
      caption = done ? 'BREAK TIME' : 'FOCUS TIME';
    } else {
      first = 'focus';
      firstMin = s.focusMinutes;
      second = 'break';
      secondMin = breakAfter();
      readout = `${s.focusMinutes}:00`;
      caption = 'READY';
    }
    // From the minute hand, round the dial; an hour at most.
    const start = (now.getMinutes() + now.getSeconds() / 60) * 6;
    const a = Math.min(firstMin, 60) * 6;
    const b = Math.min(secondMin, 60 - Math.min(firstMin, 60)) * 6;
    setIfChanged(pomo[first], 'd', wedgePath(pomo.r0, pomo.r1, start, start + a));
    if (second) setIfChanged(pomo[second], 'd', b > 0 ? wedgePath(pomo.r0, pomo.r1, start + a, start + a + b) : '');
    else setIfChanged(pomo[first === 'focus' ? 'break' : 'focus'], 'd', '');
    setIfChanged(pomo.g, 'data-mode', mode);
    setIfChanged(pomo.g, 'data-now', first);
    setText(pomo.readout, readout);
    setText(pomo.caption, caption);
    const done = x && x.kind === 'long' ? every : p.cycle % every;
    pomo.dots.forEach((dot, i) => {
      setIfChanged(dot, 'class', `pw-pomo-dot${i < done ? ' is-done' : x && x.kind === 'focus' && i === done ? ' is-now' : ''}`);
    });
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
    } else if (texture === 'slate') {
      // Cleft slate: layers that split unevenly along the grain, darker beds between them, a
      // few pale seams and a fine mineral sparkle.
      const noise = (name, freq, oct, seed, alpha, color, cls) => {
        const f = add(this.defs, 'filter', { id: this.id(name), x: 0, y: 0, width: 1, height: 1 });
        add(f, 'feTurbulence', { type: 'fractalNoise', baseFrequency: freq, numOctaves: oct, seed, result: 'noise' });
        add(f, 'feColorMatrix', { in: 'noise', type: 'matrix', values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${alpha}`, result: 'mask' });
        add(f, 'feFlood', { 'flood-color': color, result: 'ink' });
        add(f, 'feComposite', { in: 'ink', in2: 'mask', operator: 'in', result: 'tinted' });
        add(f, 'feComposite', { in: 'tinted', in2: 'SourceGraphic', operator: 'in' });
        add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: '#fff', filter: url(name) }, cls);
      };
      noise('slate-beds', '0.006 0.09', 4, 7, '2.4 0 0 0 -1.05', '#000', ['pw-slate', 'is-beds']);
      noise('slate-cleft', '0.012 0.3', 3, 19, '0 2.6 0 0 -1.25', '#ffffff', ['pw-slate', 'is-cleft']);
      noise('slate-grain', '1.1', 2, 3, '0 0 2.2 0 -1.15', '#ffffff', ['pw-slate', 'is-grain']);
      const g = clipped();
      const rand = rng(17);
      let seams = '';
      for (let i = 0; i < 5; i++) {
        let y = 100 - R + 20 + rand() * (2 * R - 40);
        seams += `M ${100 - R} ${y.toFixed(2)}`;
        for (let x = 100 - R; x < 100 + R; x += 6) {
          y += (rand() - 0.5) * 1.6;
          seams += ` L ${(x + 6).toFixed(2)} ${y.toFixed(2)}`;
        }
        seams += ' ';
      }
      add(g, 'path', { d: seams }, 'pw-slate-seam');
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
      // Waves in relief: each row catches the light on its crest and falls into shadow
      // before the next, like the stamped dial of a diver.
      const id = this.id('wave-tile');
      const W = 16;
      const H = 5.4;
      this.gradient(add, 'linearGradient', 'wave-band', { x1: 0, y1: 0, x2: 0, y2: 1 }, [
        ['0%', 'rgba(255,255,255,0.34)'], ['22%', 'rgba(255,255,255,0.1)'], ['60%', 'rgba(0,0,0,0.06)'], ['100%', 'rgba(0,0,10,0.42)'],
      ]);
      const pat = add(this.defs, 'pattern', { id, patternUnits: 'userSpaceOnUse', width: W, height: H, x: 0, y: 2 });
      const crest = (dy) => `M -1 ${2 + dy} Q 3 ${-0.3 + dy} 7 ${2 + dy} T 15 ${2 + dy} T 23 ${2 + dy}`;
      for (const dy of [-H, 0]) {
        add(pat, 'path', { d: `${crest(dy)} L 23 ${2 + dy + H} L -1 ${2 + dy + H} Z`, fill: url('wave-band') });
        add(pat, 'path', { d: crest(dy) }, 'pw-wave-crest');
      }
      const g = clipped();
      add(g, 'circle', { cx: 100, cy: 100, r: R, fill: `url(#${id})` }, 'pw-waves-relief');
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
      // Depth: a faint glow deep in the stone, a haze of far specks out of focus, then the
      // glittering specks and a few brighter glints, and the dial darkening toward its edge.
      const url = (name) => `url(#${this.id(name)})`;
      this.gradient(add, 'radialGradient', 'nebula', { cx: '40%', cy: '34%', r: '62%' }, [['0%', 'rgba(120,150,255,0.32)'], ['45%', 'rgba(90,80,200,0.1)'], ['100%', 'rgba(20,20,60,0)']]);
      this.gradient(add, 'radialGradient', 'abyss', { cx: '50%', cy: '50%', r: '50%' }, [['55%', 'rgba(0,0,10,0)'], ['100%', 'rgba(0,0,10,0.55)']]);
      add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: url('nebula') });
      const haze = add(this.defs, 'filter', { id: this.id('haze'), x: '-10%', y: '-10%', width: '120%', height: '120%' });
      add(haze, 'feGaussianBlur', { stdDeviation: 0.55 });
      const deep = rng(23);
      let far = '';
      for (let i = 0; i < 260; i++) {
        const [x, y] = polar(Math.sqrt(deep()) * (R - 4), deep() * 360);
        far += circlePath(x, y, 0.25 + deep() * 0.35);
      }
      add(svg, 'path', { d: far, filter: url('haze') }, 'pw-star-far');
      add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: url('abyss') });
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
      // A few specks close under the crystal, large and soft.
      const near = add(this.defs, 'filter', { id: this.id('near'), x: '-50%', y: '-50%', width: '200%', height: '200%' });
      add(near, 'feGaussianBlur', { stdDeviation: 1.1 });
      let bokeh = '';
      for (let i = 0; i < 7; i++) {
        const [x, y] = polar(20 + deep() * (R - 30), deep() * 360);
        bokeh += circlePath(x, y, 1.4 + deep() * 1.6);
      }
      add(svg, 'path', { d: bokeh, filter: url('near') }, 'pw-star-near');
    } else if (decor === 'sector') {
      add(svg, 'circle', { cx: 100, cy: 100, r: R * 0.63, 'stroke-width': R * 0.2 }, 'pw-sector-band');
      // A bright dot on the band at every hour, and a larger one at the quarters.
      let dots = '';
      for (let i = 0; i < 12; i++) {
        if (used[i]) continue;
        const [x, y] = polar(R * 0.63, i * 30);
        dots += circlePath(x, y, (i % 3 ? 1.5 : 2.4) * k);
      }
      add(svg, 'path', { d: dots }, 'pw-sector-dot');
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
    } else if (markers === 'pips') {
      // Small lozenges at the hours, close to the edge, which leave the dial to its picture.
      for (let i = 0; i < 12; i++) {
        const big = i % 3 === 0;
        const r1 = R - 5 * k;
        const r2 = R - (big ? 11.5 : 9) * k;
        const w = (big ? 1.6 : 1.15) * k;
        const attr = {
          d: `M 100 ${100 - r1} L ${100 + w} ${100 - (r1 + r2) / 2} L 100 ${100 - r2} L ${100 - w} ${100 - (r1 + r2) / 2} Z`,
          transform: `rotate(${i * 30} 100 100)`,
        };
        if (metal) add(svg, 'path', Object.assign(attr, { fill: url('facet-l') }), ['pw-applied', 'pw-raised']);
        else add(svg, 'path', attr, 'pw-dot-index');
      }
    } else if (markers === 'minutes') {
      // A minute track with every five minutes numbered, as on a regulator or a kitchen timer.
      // On a railway track the ticks are already there.
      if (face.decor !== 'railroad') {
        let d = '';
        for (let i = 0; i < 60; i++) {
          if (i % 5 === 0) continue;
          const [x1, y1] = polar(R - 2.8, i * 6);
          const [x2, y2] = polar(R - 5.8, i * 6);
          d += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
        }
        add(svg, 'path', { d }, 'pw-tick');
        for (let i = 0; i < 12; i++) {
          const [x1, y1] = polar(R - 2.8, i * 30);
          const [x2, y2] = polar(R - 8, i * 30);
          add(svg, 'line', { x1, y1, x2, y2 }, ['pw-tick', 'is-hour']);
        }
      }
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(R - 15, i * 30);
        shadow(text(svg, x, y, 8.4 * k, String(i === 0 ? 60 : i * 5), ['pw-numeral', 'is-minutes']));
      }
    } else if (markers === 'square' || markers === 'deco') {
      // Along the edge of a square dial: a fine minute track, and at the hours polished
      // batons pointing in from the edge. Deco has tall numerals at 12, 3, 6 and 9 instead.
      const at = (a, inset) => edgePoint(R, a, inset);
      let d = '';
      for (let i = 0; i < 60; i++) {
        const [x1, y1] = at(i * 6, 2.6);
        const [x2, y2] = at(i * 6, i % 5 ? 4.6 : 6);
        d += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
      }
      add(svg, 'path', { d }, ['pw-tick', 'is-edge']);
      for (let i = 0; i < 12; i++) {
        const deco = markers === 'deco' && i % 3 === 0;
        if (deco) {
          if (used[i]) continue;
          const [x, y] = at(i * 30, i % 6 ? 16 : 17.5);
          const t = text(svg, x, y, 21 * k, String(i === 0 ? 12 : i), ['pw-numeral', 'is-deco']);
          if (metal) t.style.fill = url('facet-l');
          shadow(t);
          continue;
        }
        const major = i % 3 === 0;
        const len = (major ? 14 : 10.5) * k;
        const w = (major ? 3.6 : 2.6) * k;
        const pair = i === 0 && markers === 'square' ? [-2.8 * k, 2.8 * k] : [0];
        for (const off of pair) {
          const [x1, y1] = at(i * 30, 7.5);
          const g = add(svg, 'g', { transform: `translate(${x1.toFixed(2)} ${y1.toFixed(2)}) rotate(${i * 30})` }, metal ? ['pw-applied', 'pw-raised'] : []);
          if (metal) {
            add(g, 'rect', { x: off - w / 2, y: 0, width: w / 2, height: len, fill: url('facet-l') });
            add(g, 'rect', { x: off, y: 0, width: w / 2, height: len, fill: url('facet-r') });
            add(g, 'rect', { x: off - w / 2, y: 0, width: w, height: len, rx: 0.4 }, 'pw-applied-edge');
          } else {
            add(g, 'rect', { x: off - w / 2, y: 0, width: w, height: len, rx: w / 2 }, 'pw-dot-index');
          }
        }
      }
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
      // At 3 and 9 a wide window moves in, clear of the hour marker beside it.
      const dx = cx - 100;
      const reach = 89.5 * k * 0.68;
      const mx = Math.abs(dx) > 1 && Math.abs(dx) + (w * k) / 2 > reach ? 100 + Math.sign(dx) * (reach - (w * k) / 2) : cx;
      const x = mx - (w * k) / 2;
      const y = cy - 8.5 * k;
      add(svg, 'rect', { x, y, width: w * k, height: 17 * k, rx: 2.5 * k }, 'pw-date-bg');
      add(svg, 'path', { d: `M ${x + 1.6 * k} ${y + 1.1 * k} L ${x + (w - 1.6) * k} ${y + 1.1 * k}` }, 'pw-date-shade');
      text(svg, mx, cy + 0.4 * k, 11 * k, value, 'pw-date');
    };
    const reading = (caption, liveType) => {
      const value = text(svg, cx, cy - 2 * k, 11.5 * k, '', 'pw-reading');
      text(svg, cx, cy + 8 * k, 5.6 * k, caption, 'pw-caption');
      live.push({ type: liveType, el: value });
    };
    // Some faces have a larger subdial, sunk into the dial, with a seconds track and numerals.
    const z = (this.faceDef && this.faceDef.subdial) || 1;
    const subdial = () => {
      if (z > 1) this.drawSunkSubdial(svg, add, text, cx, cy, 17 * k * z, k * z, ['60', '15', '30', '45']);
      else {
        add(svg, 'circle', { cx, cy, r: 17 * k }, 'pw-subdial');
        for (let r = 3 * k; r < 15 * k; r += 1.3 * k) add(svg, 'circle', { cx, cy, r }, 'pw-snailing');
      }
      for (let i = 0; i < 12; i++) {
        if (z > 1) break;
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
    } else if (type === 'moon-age') {
      this.drawMoonPorthole(svg, add, text, cx, cy, k, now);
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
      add(turnEl, 'line', { x1: cx, y1: cy + 3 * k * z, x2: cx, y2: cy - 14 * k * z }, 'pw-subsec-hand');
      if (z > 1) {
        // A counterweight at the tail, and a small ring near the tip.
        add(turnEl, 'circle', { cx, cy: cy + 4.2 * k * z, r: 1.5 * k * z }, 'pw-subsec-weight');
        add(turnEl, 'circle', { cx, cy: cy - 10 * k * z, r: 1.2 * k * z }, 'pw-subsec-ring');
      }
      add(svg, 'circle', { cx, cy, r: 1.6 * k * Math.sqrt(z) }, 'pw-subsec-pin');
      live.push({ type: 'subsec', el: turnEl });
      if (this.plugin.settings.seconds === 'sweep') sweep(turnEl, now);
    }
  }

  // The classic moon phase window: a turning disc of night sky carrying two gold moons,
  // seen through an arch whose two humps hide the moon around new moon.
  drawMoonWindow(svg, add, cx, cy, k, now) {
    const a = 27 * k;
    const base = cy + a * 0.36;
    const arch = `M ${cx - a} ${base} A ${a} ${a} 0 0 1 ${cx + a} ${base} A ${a / 2} ${a / 2} 0 0 0 ${cx} ${base} A ${a / 2} ${a / 2} 0 0 0 ${cx - a} ${base} Z`;
    this.clips = (this.clips || 0) + 1;
    const clipId = this.id(`moon-${this.clips}`);
    add(add(this.defs, 'clipPath', { id: clipId }), 'path', { d: arch });
    this.gradient(add, 'linearGradient', 'sky', { x1: 0, y1: 0, x2: 0, y2: 1 }, [['0%', '#2f55a0'], ['60%', '#15265a'], ['100%', '#0a1330']]);
    this.gradient(add, 'radialGradient', 'moon', { cx: '38%', cy: '34%', r: '70%' }, [['0%', '#fff8dc'], ['50%', '#efcb70'], ['100%', '#a87a2a']]);
    this.gradient(add, 'linearGradient', 'moon-frame', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', '#fff3cf'], ['45%', '#d6ad5a'], ['100%', '#86602a']]);

    // The age of the moon, 0 to 29½ days, printed round the arch, with a pointer at today's.
    const ring = a + 3.2 * k;
    let ticks = '';
    for (let i = 0; i <= 59; i++) {
      const t = Math.PI * (1 - i / 59);
      const len = i % 10 === 0 ? 2.2 * k : 1.1 * k;
      ticks += `M ${(cx + ring * Math.cos(t)).toFixed(2)} ${(base - ring * Math.sin(t)).toFixed(2)} L ${(cx + (ring + len) * Math.cos(t)).toFixed(2)} ${(base - (ring + len) * Math.sin(t)).toFixed(2)} `;
    }
    add(svg, 'path', { d: ticks }, 'pw-moon-scale');
    const age = Math.PI * (1 - moonPhase(now));
    const [px, py] = [cx + (ring - 0.4 * k) * Math.cos(age), base - (ring - 0.4 * k) * Math.sin(age)];
    const [qx, qy] = [Math.cos(age), -Math.sin(age)];
    add(svg, 'path', {
      d: `M ${px.toFixed(2)} ${py.toFixed(2)} L ${(px + qx * 3.4 * k - qy * 1.3 * k).toFixed(2)} ${(py + qy * 3.4 * k + qx * 1.3 * k).toFixed(2)} L ${(px + qx * 3.4 * k + qy * 1.3 * k).toFixed(2)} ${(py + qy * 3.4 * k - qx * 1.3 * k).toFixed(2)} Z`,
    }, 'pw-moon-pointer');

    const g = add(svg, 'g', { 'clip-path': `url(#${clipId})` });
    add(g, 'rect', { x: cx - a, y: base - a - 1, width: 2 * a, height: a + 2, fill: `url(#${this.id('sky')})` });
    const disc = add(g, 'g', { transform: `rotate(${((moonPhase(now) - 0.5) * 180).toFixed(2)} ${cx} ${base})` });
    const rand = rng(5);
    let dots = '';
    for (let i = 0; i < 70; i++) {
      const r = a * (0.08 + rand() * 0.9);
      const t = rand() * 2 * Math.PI;
      dots += circlePath((cx + r * Math.cos(t)).toFixed(2), (base + r * Math.sin(t)).toFixed(2), ((0.12 + rand() * 0.22) * k).toFixed(2));
    }
    add(disc, 'path', { d: dots }, 'pw-moon-dust');
    for (let i = 0; i < 20; i++) {
      const r = a * (0.12 + rand() * 0.85);
      const t = rand() * 2 * Math.PI;
      add(disc, 'path', { d: glintPath(cx + r * Math.cos(t), base + r * Math.sin(t), (0.5 + rand() * 1.1) * k, 0.28) }, 'pw-moon-star');
    }
    // Two gold moons, each with craters and the faint, sleeping face of an old moon dial.
    for (const dy of [-a / 2, a / 2]) {
      const my = base + dy;
      const mr = a * 0.44;
      add(disc, 'circle', { cx, cy: my, r: mr, fill: `url(#${this.id('moon')})` }, 'pw-moon');
      for (const [x, y, r] of [[-0.16, -0.16, 0.08], [0.15, 0.1, 0.06], [-0.04, 0.22, 0.05], [0.2, -0.16, 0.04], [-0.24, 0.06, 0.04]]) {
        add(disc, 'circle', { cx: cx + x * a, cy: my + y * a, r: r * a }, 'pw-crater');
      }
      const f = mr / 10;
      add(disc, 'path', {
        d: `M ${cx - 4.6 * f} ${my - 1.2 * f} q ${1.5 * f} ${1.1 * f} ${3 * f} 0 M ${cx + 1.6 * f} ${my - 1.2 * f} q ${1.5 * f} ${1.1 * f} ${3 * f} 0 M ${cx - 2.4 * f} ${my + 3.4 * f} q ${2.4 * f} ${1.6 * f} ${4.8 * f} 0`,
      }, 'pw-moon-face');
    }
    // A polished gold frame round the window.
    add(svg, 'path', { d: arch, stroke: `url(#${this.id('moon-frame')})` }, 'pw-moon-frame');
  }

  // A round window onto a realistic moon: its seas and craters, lit from the side as it is
  // tonight, with the shadow's edge softened, and the faint earthshine on its dark side. Around
  // the window, a scale of the moon's age in days, with a small pointer at tonight's age.
  drawMoonPorthole(svg, add, text, cx, cy, k, now) {
    const url = (name) => `url(#${this.id(name)})`;
    const a = 14.5 * k;
    const m = a * 0.7;
    const phase = moonPhase(now);
    this.clips = (this.clips || 0) + 1;
    const n = this.clips;
    add(add(this.defs, 'clipPath', { id: this.id(`port-${n}`) }), 'circle', { cx, cy, r: a });
    add(add(this.defs, 'clipPath', { id: this.id(`luna-${n}`) }), 'circle', { cx, cy, r: m });
    const soft = add(this.defs, 'filter', { id: this.id(`soft-${n}`), x: '-20%', y: '-20%', width: '140%', height: '140%' });
    add(soft, 'feGaussianBlur', { stdDeviation: (m * 0.09).toFixed(2) });
    const blur = add(this.defs, 'filter', { id: this.id(`seas-${n}`), x: '-20%', y: '-20%', width: '140%', height: '140%' });
    add(blur, 'feGaussianBlur', { stdDeviation: (m * 0.05).toFixed(2) });
    this.gradient(add, 'radialGradient', 'port-sky', { cx: '45%', cy: '35%', r: '70%' }, [['0%', '#23396b'], ['100%', '#060c20']]);
    this.gradient(add, 'radialGradient', 'luna', { cx: '42%', cy: '38%', r: '62%' }, [['0%', '#fbf6e6'], ['60%', '#e2dbc4'], ['100%', '#a9a28c']]);

    // The age scale: a tick for each day, longer every five, numbered, on a slightly sunken ring.
    const ring = a + 4.2 * k;
    add(svg, 'circle', { cx, cy, r: ring, 'stroke-width': 7.4 * k }, 'pw-age-ring');
    let ticks = '';
    for (let day = 0; day < 30; day++) {
      const ang = ((day / 29.53) * 360 * Math.PI) / 180;
      const len = day % 5 === 0 ? 2.2 : 1.2;
      const [r1, r2] = [a + 1.4 * k, a + (1.4 + len) * k];
      ticks += `M ${(cx + r1 * Math.sin(ang)).toFixed(2)} ${(cy - r1 * Math.cos(ang)).toFixed(2)} L ${(cx + r2 * Math.sin(ang)).toFixed(2)} ${(cy - r2 * Math.cos(ang)).toFixed(2)} `;
      if (day % 5 === 0 && day) {
        const rr = a + 5.4 * k;
        text(svg, cx + rr * Math.sin(ang), cy - rr * Math.cos(ang), 2.9 * k, String(day), 'pw-age-num');
      }
    }
    add(svg, 'path', { d: ticks }, 'pw-age-tick');
    // The pointer at tonight's age, and a small star for new moon at the top.
    const age = phase * 29.53;
    const pr = a + 7.5 * k;
    add(svg, 'path', {
      d: `M ${cx} ${cy - pr + 2.6 * k} L ${cx + 1.3 * k} ${cy - pr - 0.2 * k} L ${cx - 1.3 * k} ${cy - pr - 0.2 * k} Z`,
      transform: `rotate(${((age / 29.53) * 360).toFixed(2)} ${cx} ${cy})`,
    }, 'pw-age-pointer');
    add(svg, 'path', { d: glintPath(cx, cy - a - 4.9 * k, 1.5 * k, 0.3) }, 'pw-age-num');

    // The window: night sky, a few stars, and the moon.
    const g = add(svg, 'g', { 'clip-path': url(`port-${n}`) });
    add(g, 'circle', { cx, cy, r: a, fill: url('port-sky') });
    const rand = rng(57);
    let stars = '';
    for (let i = 0; i < 26; i++) {
      const t = rand() * 2 * Math.PI;
      const r = m * 1.08 + rand() * (a - m * 1.08);
      stars += circlePath((cx + r * Math.cos(t)).toFixed(2), (cy + r * Math.sin(t)).toFixed(2), ((0.12 + rand() * 0.22) * k).toFixed(2));
    }
    add(g, 'path', { d: stars }, 'pw-port-star');
    const luna = add(g, 'g', { 'clip-path': url(`luna-${n}`) });
    add(luna, 'circle', { cx, cy, r: m, fill: url('luna') });
    // The seas, roughly where they are on the moon we see.
    let seas = '';
    for (const [u, v, rx, ry, turn] of [
      [-0.48, 0.02, 0.3, 0.42, 12], [-0.22, -0.38, 0.27, 0.22, -15], [0.18, -0.3, 0.16, 0.15, 0], [0.32, 0.02, 0.2, 0.17, 20],
      [0.55, 0.2, 0.12, 0.15, 0], [0.68, -0.32, 0.1, 0.08, 0], [-0.12, 0.4, 0.17, 0.13, -10], [0.12, 0.08, 0.1, 0.12, 0],
    ]) {
      const x = cx + u * m;
      const y = cy + v * m;
      seas += `M ${(x - rx * m).toFixed(2)} ${y.toFixed(2)} a ${(rx * m).toFixed(2)} ${(ry * m).toFixed(2)} ${turn} 1 0 ${(2 * rx * m).toFixed(2)} 0 a ${(rx * m).toFixed(2)} ${(ry * m).toFixed(2)} ${turn} 1 0 ${(-2 * rx * m).toFixed(2)} 0 Z `;
    }
    add(luna, 'path', { d: seas, filter: url(`seas-${n}`) }, 'pw-luna-sea');
    let craters = '';
    let rims = '';
    for (const [u, v, r] of [[-0.1, 0.74, 0.05], [0.42, 0.55, 0.04], [-0.62, -0.42, 0.035], [0.05, -0.62, 0.04], [0.72, 0.38, 0.03], [-0.35, 0.62, 0.03]]) {
      craters += circlePath((cx + u * m).toFixed(2), (cy + v * m).toFixed(2), (r * m).toFixed(2));
      rims += circlePath((cx + u * m - r * m * 0.25).toFixed(2), (cy + v * m - r * m * 0.25).toFixed(2), (r * m * 0.8).toFixed(2));
    }
    add(luna, 'path', { d: rims }, 'pw-luna-rim');
    add(luna, 'path', { d: craters }, 'pw-luna-crater');
    // Night on the moon: the part the sun doesn't reach, with a soft edge.
    add(luna, 'path', { d: moonPath(cx, cy, m * 1.02, (phase + 0.5) % 1), filter: url(`soft-${n}`) }, 'pw-luna-night');
    add(svg, 'circle', { cx, cy, r: a + 0.6 * k, 'stroke-width': 1.5 * k, stroke: url('metal') }, 'pw-port-rim');
    add(svg, 'circle', { cx, cy, r: a - 0.15 * k }, 'pw-port-shadow');
  }

  // A window onto the movement, drawn like a real pocket watch movement at 18,000 beats an
  // hour: the balance wheel with its timing screws and blued Breguet hairspring, under a
  // polished cock with a shock-protected jewel and a regulator; the pallet fork and escape
  // wheel; a wheel of the gear train turning once a minute; a bridge with Geneva stripes;
  // perlage on the plate; rubies in gold chatons; blued screws. The parts cast small shadows
  // on each other. Drawn on a 60 unit circle around (0, 0), then scaled to radius r.
  drawMovementWindow(svg, add, cx, cy, r, shape) {
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

    // The window: round, or the shape of a heart.
    const heart = shape === 'heart';
    const outline = heart
      ? 'M 0 29 C -10 21 -31 9 -31 -7 C -31 -20 -21.5 -28.5 -12 -28.5 C -6 -28.5 -1.8 -25 0 -20.5 C 1.8 -25 6 -28.5 12 -28.5 C 21.5 -28.5 31 -20 31 -7 C 31 9 10 21 0 29 Z'
      : circlePath(0, 0, 30);
    const win = heart ? 'mv-window-heart' : 'mv-window';
    once(win, (id) => add(add(this.defs, 'clipPath', { id }), 'path', { d: outline }));
    once('mv-fade', (id) => add(add(this.defs, 'filter', { id, x: '-30%', y: '-30%', width: '160%', height: '160%' }), 'feGaussianBlur', { stdDeviation: 3.2 }));
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
    // The dial darkens softly toward the window, as if it falls away into the movement.
    add(outer, 'path', { d: outline, filter: url('mv-fade') }, 'pw-window-fade');
    const g = add(outer, 'g', { 'clip-path': url(win) });
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
    add(g, 'path', { d: outline, fill: url('vignette') });
    add(g, 'path', { d: 'M -27 -9 A 28.5 28.5 0 0 1 9 -27 A 34 34 0 0 0 -27 -9 Z', fill: url('sapphire') });
    add(outer, 'path', { d: outline }, 'pw-window-edge');
    add(outer, 'path', { d: outline, fill: 'none', stroke: url('metal') }, heart ? ['pw-window-rim', 'is-fine'] : 'pw-window-rim');
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
    const shaped = SHAPED_STYLES.includes(style);
    const layout = shaped ? style : DIGITAL_LAYOUTS[s.digitalLayout] ? s.digitalLayout : 'wide';
    const box = this.faceEl.createDiv({ cls: ['pocket-watch-digital', `pw-d-${style}`, `pw-l-${layout}`] });
    if (s.blinkColon) box.addClass('pw-blink');
    box.style.fontSize = `${(this.size / 120) * 13}px`;
    if (shaped) {
      this.buildSlim(box, style);
      return;
    }
    // The Philip Pocket monogram, faded into the background behind the time.
    if (s.dialText) {
      const [x0, y0, x1, y1] = MONOGRAM.box;
      box.createSvg('svg', { attr: { viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}` }, cls: 'pw-d-brand' })
        .createSvg('path', { attr: { d: MONOGRAM.path } });
    }

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

  // The slim styles show just the time. Capsule and Column fill up with a focus session or a
  // break (or toward your daily goal), and Capsule has a small light that shows which it is;
  // Hairline draws a fine line under the time instead.
  buildSlim(box, style) {
    const s = this.plugin.settings;
    const d = (this.parts.digital = {});
    if (s.digitalBar || style === 'capsule') this.parts.fill = box.createDiv('pw-d-bar').createDiv('pw-d-fill');
    if (style === 'column') this.parts.fillAxis = 'height';
    if (style === 'capsule') box.createDiv('pw-d-pip');
    const time = box.createDiv('pw-d-time');
    d.hh = time.createSpan('pw-d-hh');
    time.createSpan({ cls: 'pw-d-colon', text: style === 'column' ? '' : ':' });
    d.mm = time.createSpan('pw-d-mm');
    if (s.digitalSeconds) {
      time.createSpan({ cls: ['pw-d-colon', 'is-small'], text: style === 'column' ? '' : ':' });
      d.ss = time.createSpan('pw-d-ss');
    }
    if (!this.h24) d.ampm = time.createSpan('pw-d-ampm');
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
  // the status bar. Null when the box is collapsed, such as a closed sidebar. The watch is
  // measured as it is now, unless its size there is given.
  spotXY(box, spot, w = this.el.offsetWidth, h = this.el.offsetHeight) {
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

  // Over a pane's tab bar, the nearest of its three spots there; over the rest of a pane, the
  // nearest of its eight spots; anywhere else, the nearest spot of the window.
  snapTarget(px, py, left, top) {
    const el = this.groupAt(px, py);
    const id = el && this.groupId(el);
    const bar = id && this.trayEl(el);
    const r = bar && bar.getBoundingClientRect();
    const inTray = r && py >= r.top && py <= r.bottom;
    // The size it will have there: as tall as the tab bar allows, or the size you chose.
    const ow = this.el.offsetWidth;
    const oh = this.el.offsetHeight;
    const scale = inTray ? this.trayFit(bar) / oh : this.plugin.settings.watchSize / this.size;
    const w = ow * scale;
    const h = oh * scale;
    let best = null;
    const consider = (spot, xy, tray) => {
      if (!xy) return;
      const d = Math.hypot(xy.x + w / 2 - (left + ow / 2), xy.y + h / 2 - (top + oh / 2));
      if (!best || d < best.d) best = { id, spot, xy, d, tray, w, h };
    };
    if (inTray) {
      for (const spot of ['l', 'c', 'r']) consider(spot, this.trayXY(this.trayBox(bar), spot, w, h), true);
      return best;
    }
    const box = id ? this.paneBox(el) : this.windowBox();
    for (const spot of SPOTS) consider(spot, this.spotXY(box, spot, w, h), false);
    return best;
  }

  // The bar of tabs at the top of a pane, if it shows.
  trayEl(groupEl) {
    const bar = groupEl.querySelector(':scope > .workspace-tab-header-container');
    return bar && bar.offsetParent !== null && bar.offsetHeight >= 20 ? bar : null;
  }

  // The free part of a tab bar: between the last tab and the buttons at its end.
  trayBox(bar) {
    const r = bar.getBoundingClientRect();
    const spacer = bar.querySelector(':scope > .workspace-tab-header-spacer');
    const free = spacer && spacer.getBoundingClientRect();
    if (free && free.width > 0) return { left: free.left, right: free.right, top: r.top, bottom: r.bottom };
    const tabs = bar.querySelector(':scope > .workspace-tab-header-container-inner');
    return { left: tabs ? tabs.getBoundingClientRect().right : r.left, right: r.right, top: r.top, bottom: r.bottom };
  }

  // A spot in a tab bar: its left end, its middle or its right end, centred top to bottom.
  trayXY(box, spot, w = this.el.offsetWidth, h = this.el.offsetHeight) {
    const gap = 6;
    const x = spot === 'l' ? box.left + gap : spot === 'r' ? box.right - gap - w : box.left + (box.right - box.left - w) / 2;
    return { x: clamp(x, 0, window.innerWidth - w), y: box.top + (box.bottom - box.top - h) / 2 };
  }

  // How tall the watch is in a tab bar. Hairline's bare numerals would look loud at the full
  // height of the bar.
  trayFit(bar) {
    const s = this.plugin.settings;
    return (bar.offsetHeight - 2 * TRAY_PAD) * (s.watchType === 'digital' && s.digitalStyle === 'hairline' ? 0.8 : 1);
  }

  // How tall the watch is in the tab bar it sits in; 0 when it isn't in one.
  trayHeight() {
    const a = this.plugin.settings.watchAnchor;
    if (!a || !a.tray) return 0;
    const el = this.resolveGroup(a.group);
    const bar = el && this.trayEl(el);
    return bar ? this.trayFit(bar) : 0;
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
      if (a && a.tray) {
        const el = this.resolveGroup(a.group);
        const bar = el && this.trayEl(el);
        if (bar) xy = this.trayXY(this.trayBox(bar), a.spot);
        else if (el) tucked = true;
        else xy = this.freeSpot(DEFAULT_WATCH_POS);
      } else if (a && a.window) {
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
  // so dragging it outward makes the watch bigger. In a tab bar the watch fits the bar, and
  // the countdown sits beside it.
  placeGrip() {
    const a = this.plugin.settings.watchAnchor;
    if (a && a.tray) {
      setIfChanged(this.badgeEl, 'data-side', a.spot === 'l' ? 'right' : 'left');
      return;
    }
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

  showGhost(target) {
    if (!target) {
      this.removeGhost();
      return;
    }
    if (!this.ghostEl) {
      this.ghostEl = document.body.createDiv('pocket-watch-ghost');
      this.ghostEl.setAttr('data-type', this.plugin.settings.watchType);
      this.ghostEl.setAttr('data-slim', this.el.getAttribute('data-slim') || '');
    }
    this.ghostEl.style.width = `${target.w}px`;
    this.ghostEl.style.height = `${target.h}px`;
    this.ghostEl.style.left = `${target.xy.x}px`;
    this.ghostEl.style.top = `${target.xy.y}px`;
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
      this.showGhost(target);
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
        s.watchAnchor = target.tray ? { group: target.id, tray: true, spot: target.spot }
          : target.id ? { group: target.id, spot: target.spot } : { window: true, spot: target.spot };
        s.watchPos = null;
      } else {
        const freeX = window.innerWidth - r.width;
        const freeY = window.innerHeight - r.height;
        s.watchAnchor = null;
        s.watchPos = { fx: freeX > 0 ? left / freeX : 0, fy: freeY > 0 ? top / freeY : 0 };
      }
      this.plugin.saveSettings();
      // Moving in or out of a tab bar changes its size.
      this.refresh();
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
    if (!e.altKey || this.trayHeight()) return;
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

// A rounded square r from the centre to each side, as one path starting at 12 and running
// clockwise, so a dash along it fills like the ring on a round watch.
function squarePath(r, rx) {
  const a = 100 - r;
  const b = 100 + r;
  return `M 100 ${a} H ${b - rx} A ${rx} ${rx} 0 0 1 ${b} ${a + rx} V ${b - rx} A ${rx} ${rx} 0 0 1 ${b - rx} ${b} `
    + `H ${a + rx} A ${rx} ${rx} 0 0 1 ${a} ${b - rx} V ${a + rx} A ${rx} ${rx} 0 0 1 ${a + rx} ${a} Z`;
}

// Where a line from the centre at angle a (degrees clockwise from 12) meets the edge of a
// square dial of half-width R with rounded corners, moved in toward the centre by inset.
function edgePoint(R, a, inset) {
  const rad = (a * Math.PI) / 180;
  const ux = Math.abs(Math.sin(rad));
  const uy = Math.abs(Math.cos(rad));
  const rc = R * 0.3;
  let t = R / Math.max(ux, uy);
  if (t * ux > R - rc && t * uy > R - rc) {
    const dot = ux * (R - rc) + uy * (R - rc);
    t = dot + Math.sqrt(dot * dot - 2 * (R - rc) * (R - rc) + rc * rc);
  }
  return polar(t - inset, a);
}

// A ring segment between radii r0 and r1, from angle a0 to a1 (degrees clockwise from 12).
function wedgePath(r0, r1, a0, a1) {
  if (a1 - a0 < 0.05) return '';
  if (a1 - a0 >= 359.95) return `${circlePath(100, 100, r1)} ${circlePath(100, 100, r0)}`;
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = polar(r1, a0);
  const [x2, y2] = polar(r1, a1);
  const [x3, y3] = polar(r0, a1);
  const [x4, y4] = polar(r0, a0);
  const f = (v) => v.toFixed(2);
  return `M ${f(x1)} ${f(y1)} A ${r1} ${r1} 0 ${large} 1 ${f(x2)} ${f(y2)} L ${f(x3)} ${f(y3)} A ${r0} ${r0} 0 ${large} 0 ${f(x4)} ${f(y4)} Z`;
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
    if (this.sessionKey !== focusKey(p)) {
      this.render();
      return;
    }
    if (x && this.focusTimeEl) {
      const left = p.sessionRemaining();
      setText(this.focusTimeEl, `${Math.ceil(left / 60000)} min`);
      setText(this.focusLabelEl, x.paused ? 'Paused' : `${SESSION_NAMES[x.kind]} · until ${fmtTime(new Date(x.endsAt), uses24h(p.settings.clock))}`);
      this.focusFillEl.style.width = `${(left / x.total) * 100}%`;
    }
    if (this.alertTextEl && p.alert) setText(this.alertTextEl, p.alertLabel());
    this.clockEl.setText(fmtShort(p.getDay(today).ms));
    this.stateEl.setText(STATE_LABELS[p.state]);
    const file = p.app.workspace.getActiveFile();
    const inNote = file ? (p.getDay(today).files || {})[file.path] || 0 : 0;
    setText(this.noteEl, file ? `${noteName(file.path)} · ${fmtShort(inNote)} today` : '');
    this.noteEl.toggleClass('is-empty', !file);
    this.headEl.setAttr('data-state', p.state);
    this.pauseBtn.setText(p.paused ? 'Resume tracking' : 'Pause tracking');
    setText(this.outsideLabelEl, p.outside ? 'Tracking outside' : 'Track outside');
    this.outsideBtn.classList.toggle('is-active', p.outside);
    this.outsideBtn.setAttr('aria-pressed', String(p.outside));
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
    this.renderStatsLink(el.createDiv('pocket-watch-section'));
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
    // The note you're in, and your time in it today.
    this.noteEl = left.createDiv('pocket-watch-now-note');
    projectSwitcher(p, left);
    const actions = this.headEl.createDiv('pocket-watch-head-actions');
    this.pauseBtn = actions.createEl('button');
    this.pauseBtn.addEventListener('click', () => p.togglePause());
    // A quick way to keep counting while you read or research in another app.
    this.outsideBtn = actions.createEl('button', {
      cls: 'pocket-watch-outside',
      attr: { 'aria-label': 'Keep counting while you work in other apps, such as a browser or a PDF reader. The idle limit waits until you are back.' },
    });
    setIcon(this.outsideBtn.createSpan('pocket-watch-outside-icon'), 'external-link');
    this.outsideLabelEl = this.outsideBtn.createSpan();
    this.outsideBtn.addEventListener('click', () => p.toggleOutside());

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
    this.sessionKey = focusKey(p);
    this.focusTimeEl = null;
    this.alertTextEl = null;
    el.createEl('h4', { text: 'Focus' });
    const box = el.createDiv('pocket-watch-focus');
    box.setAttr('data-palette', s.sessionColours === 'grey' ? 'grey' : 'colour');
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
    } else if (p.alert) {
      // Time is up: say so, and offer what comes next.
      const done = p.alert.kind === 'focus';
      box.setAttr('data-kind', done ? 'focus' : 'short');
      const top = box.createDiv('pocket-watch-focus-top');
      this.alertTextEl = top.createDiv('pocket-watch-focus-time');
      top.createDiv({ cls: 'pocket-watch-focus-label', text: done ? 'Time for a break' : 'Ready to focus again?' });
      box.createDiv('pocket-watch-focus-bar').createDiv('pocket-watch-focus-fill');
      const row = box.createDiv('pocket-watch-focus-buttons');
      if (done) {
        const next = p.nextBreak();
        button(row, `Break ${p.sessionMinutes(next)} min`, () => p.startSession(next), true);
        button(row, 'Focus again', () => p.startSession('focus'));
      } else {
        button(row, `Focus ${s.focusMinutes} min`, () => p.startSession('focus'), true);
        button(row, 'Another break', () => p.startSession('short'));
      }
      button(row, 'Dismiss', () => p.dismissAlert());
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

    const notes = p.topFiles([this.selected], 6);
    if (notes.length) {
      el.createDiv({ cls: ['pocket-watch-label', 'is-spaced'], text: 'Where the time went' });
      this.renderNotes(el, notes);
    }

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

  // The rest of your stats live on a page of their own.
  renderStatsLink(el) {
    const p = this.plugin;
    const week = p.sumLastDays(7);
    const streak = p.streak();
    const link = el.createEl('button', { cls: 'pocket-watch-stats-link' });
    const icon = link.createDiv('pocket-watch-stats-link-icon');
    setIcon(icon, 'bar-chart-2');
    const words = link.createDiv('pocket-watch-stats-link-text');
    words.createDiv({ cls: 'pocket-watch-stats-link-title', text: 'Open your stats' });
    words.createDiv({ cls: 'pocket-watch-stats-link-sub', text: `${fmtShort(week.ms)} in the last 7 days · ${streak}-day streak` });
    setIcon(link.createDiv('pocket-watch-stats-link-arrow'), 'arrow-up-right');
    link.addEventListener('click', () => p.openStats());
  }

  renderNotes(el, notes) {
    noteBars(this.plugin, el, notes, { onOpen: () => this.plugin.watch && this.plugin.watch.closeShelf() });
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
      if (!SHAPED_STYLES.includes(s.digitalStyle)) dropdown(new Setting(el).setName('Layout'), DIGITAL_LAYOUTS, s.digitalLayout, (v) => change({ digitalLayout: v }));
    } else {
      dropdown(new Setting(el).setName('Face'), faceNames(), s.face, (v) => change({ face: v }));
      dropdown(new Setting(el).setName('Hands'), HANDS, s.hands, (v) => change({ hands: v }));
    }
    el.createDiv({ cls: 'pocket-watch-compare', text: 'Drag the watch onto a pane\'s tab bar to tuck it in there. More options, like what shows at 12, 3, 6 and 9 o\'clock, are in the plugin settings.' });
  }
}

// A note's name as you'd say it: Markdown notes without their extension, other files with it.
function noteName(path) {
  const name = path.slice(path.lastIndexOf('/') + 1);
  return name.endsWith('.md') ? name.slice(0, -3) : name;
}

// What the Focus section shows: a running session, time being up, or neither.
function focusKey(p) {
  const x = p.session;
  if (x) return `${x.kind}|${x.paused}`;
  return p.alert ? `alert|${p.alert.kind}` : '';
}

// What sits at 12, 3, 6 and 9: the face's own set, or your own choice.
function faceSlots(s) {
  const face = ANALOG_FACES[s.face] || ANALOG_FACES.porcelain;
  const slots = {};
  for (const slot of SLOTS) slots[slot.key] = s.complications === 'custom' ? s[slot.key] : face.set[slot.key] || 'none';
  return slots;
}

// A small copy of a watch, such as for the gallery in the settings, drawn by the watch's own
// code with some settings changed.
function drawPreview(plugin, container, patch, now) {
  const preview = Object.create(FloatingWatch.prototype);
  const proxy = Object.create(plugin);
  proxy.settings = Object.assign({}, plugin.settings, patch);
  proxy.session = null;
  proxy.alert = null;
  preview.plugin = proxy;
  preview.el = createDiv();
  preview.badgeEl = createDiv();
  preview.alertDotEl = createDiv();
  preview.faceEl = container;
  preview.size = proxy.settings.watchSize;
  preview.build(now);
  preview.update(now);
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
// Projects
// ---------------------------------------------------------------------------

// The project you're tracking, as a button that changes it, and a lock beside it. While a
// project is tracked and not locked, the lock is suggested, so a stray click can't switch it.
function projectSwitcher(plugin, el) {
  const s = plugin.settings;
  const project = plugin.activeProject();
  const wrap = el.createDiv('pw-project-switch');
  const pick = wrap.createEl('button', { cls: 'pw-project-pick', attr: { 'aria-label': 'Change the project you are tracking' } });
  const dot = pick.createSpan('pw-project-dot');
  if (project) dot.style.background = `var(--pw-p${project.color})`;
  else dot.addClass('is-none');
  pick.createSpan({ cls: 'pw-project-name', text: project ? project.name : 'No project' });
  setIcon(pick.createSpan('pw-project-chevron'), 'chevron-down');
  pick.addEventListener('click', (e) => plugin.showProjectMenu(e));
  if (!project) return wrap;
  const lock = wrap.createEl('button', { cls: 'pw-project-lock' });
  setIcon(lock, s.projectLocked ? 'lock' : 'unlock');
  lock.toggleClass('is-locked', s.projectLocked);
  lock.toggleClass('is-suggested', !s.projectLocked);
  lock.setAttr('aria-label', s.projectLocked
    ? `Locked to ${project.name}: switching asks first. Click to unlock.`
    : 'Lock to this project, so a stray click can\'t switch it (suggested)');
  lock.addEventListener('click', () => plugin.toggleProjectLock());
  return wrap;
}

// A new project, or changes to one: its name and colour, and whether to track it now.
class ProjectModal extends Modal {
  constructor(app, plugin, project) {
    super(app);
    this.plugin = plugin;
    this.project = project || null;
    this.name = project ? project.name : '';
    this.color = project ? project.color : plugin.nextColour();
    this.track = !project;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('pw-project-modal');
    this.titleEl.setText(this.project ? 'Edit project' : 'New project');
    const input = contentEl.createEl('input', { cls: 'pw-project-input', attr: { type: 'text', placeholder: 'Project name, like Proposal', value: this.name } });
    input.addEventListener('input', () => {
      this.name = input.value;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.save();
      }
    });
    contentEl.createDiv({ cls: 'pw-project-modal-label', text: 'Colour' });
    const swatches = contentEl.createDiv({ cls: 'pw-project-swatches', attr: { role: 'radiogroup', 'aria-label': 'Colour' } });
    PROJECT_COLOURS.forEach((name, i) => {
      const slot = i + 1;
      const b = swatches.createEl('button', { cls: 'pw-project-swatch', attr: { role: 'radio', 'aria-label': name, 'aria-checked': String(slot === this.color) } });
      b.style.background = `var(--pw-p${slot})`;
      if (slot === this.color) b.addClass('is-selected');
      b.addEventListener('click', () => {
        this.color = slot;
        swatches.querySelectorAll('.pw-project-swatch').forEach((x, j) => {
          x.toggleClass('is-selected', j === i);
          x.setAttr('aria-checked', String(j === i));
        });
      });
    });
    if (!this.project) {
      new Setting(contentEl).setName('Track it now').setDesc('Your time goes to this project from now on.')
        .addToggle((t) => t.setValue(this.track).onChange((v) => {
          this.track = v;
        }));
    }
    const buttons = contentEl.createDiv('pw-project-modal-buttons');
    if (this.project) {
      const archive = buttons.createEl('button', { text: this.project.archived ? 'Restore' : 'Archive' });
      archive.addEventListener('click', async () => {
        await this.plugin.archiveProject(this.project.id, !this.project.archived);
        this.close();
      });
    }
    buttons.createDiv('pw-project-modal-gap');
    buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
    buttons.createEl('button', { cls: 'mod-cta', text: this.project ? 'Save' : 'Create' }).addEventListener('click', () => this.save());
    window.setTimeout(() => input.focus(), 0);
  }

  async save() {
    const name = this.name.trim();
    if (!name) {
      new Notice('Give the project a name');
      return;
    }
    const project = await this.plugin.saveProject({ name, color: this.color }, this.project && this.project.id);
    this.close();
    if (this.track) await this.plugin.setProject(project.id);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ---------------------------------------------------------------------------
// The stats page
// ---------------------------------------------------------------------------

// Time no project was tracking, as if it were a project of its own.
const NO_PROJECT = '_none';
const EMPTY_SLICE = Object.freeze({ ms: 0, written: 0, deleted: 0, sessions: 0, focusMs: 0 });

const STAT_RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', 'Year'], ['all', 'All time']];

// Steps for an axis of time, the first that needs no more than four of them is used.
const TIME_STEPS = [5, 10, 15, 30, 60, 120, 180, 240, 360, 720, 1440, 2880, 5760, 11520].map((m) => m * 60000);

// Clean steps for an axis of time or of a count, up to and including max.
function axisTicks(max, time) {
  let step;
  if (time) step = TIME_STEPS.find((s) => s * 4 >= max) || TIME_STEPS[TIME_STEPS.length - 1];
  else {
    const raw = Math.max(1, max / 4);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  }
  const ticks = [];
  for (let v = 0; v < max + step; v += step) {
    ticks.push(v);
    if (v >= max) break;
  }
  return ticks;
}

function fmtCount(n) {
  if (Math.abs(n) < 1000) return String(Math.round(n));
  if (Math.abs(n) < 10000) return fmtNum(Math.round(n));
  return `${(n / 1000).toFixed(Math.abs(n) < 100000 ? 1 : 0).replace(/\.0$/, '')}K`;
}

// A bar from a baseline at y0 up (or down) to y, rounded only at its data end.
function barPath(x, w, y0, y) {
  const h = Math.abs(y0 - y);
  if (h < 0.5) return '';
  const r = Math.min(4, w / 2, h);
  if (y < y0) return `M ${x} ${y0} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y0} Z`;
  return `M ${x} ${y0} V ${y - r} Q ${x} ${y} ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y - r} V ${y0} Z`;
}

// A ring segment around (cx, cy), from angle a0 to a1 in degrees clockwise from the top.
function ringPath(cx, cy, r0, r1, a0, a1) {
  const at = (r, a) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + r * Math.sin(rad)).toFixed(2)} ${(cy - r * Math.cos(rad)).toFixed(2)}`;
  };
  return `M ${at(r1, a0)} A ${r1} ${r1} 0 0 1 ${at(r1, a1)} L ${at(r0, a1)} A ${r0} ${r0} 0 0 0 ${at(r0, a0)} Z`;
}

// Notes (or folders) with the time in each, as bars against the longest. A note that still
// exists opens when you click it.
function noteBars(plugin, el, rows, opts = {}) {
  const list = el.createDiv('pocket-watch-notes');
  const max = rows.length ? rows[0][1] : 1;
  for (const [path, ms] of rows) {
    const item = list.createDiv({ cls: 'pocket-watch-note', attr: { 'aria-label': `${path}: ${fmtShort(ms)}` } });
    item.createDiv('pocket-watch-note-fill').style.width = `${(ms / max) * 100}%`;
    const name = item.createDiv('pocket-watch-note-name');
    if (opts.folders) {
      name.createSpan({ text: path || 'Vault root' });
    } else {
      name.createSpan({ text: noteName(path) });
      const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      if (folder) name.createSpan({ cls: 'pocket-watch-note-folder', text: folder });
    }
    item.createDiv({ cls: 'pocket-watch-note-time', text: fmtShort(ms) });
    if (opts.folders) continue;
    const file = plugin.app.vault.getAbstractFileByPath(path);
    if (file && file.extension) {
      item.addClass('is-link');
      item.addEventListener('click', () => {
        plugin.app.workspace.getLeaf(false).openFile(file);
        if (opts.onOpen) opts.onOpen();
      });
    } else {
      item.addClass('is-gone');
    }
  }
}

// Everything you've tracked, on a page of its own in a tab: the past year at a glance, then
// for the range you pick your time against the period before, every day's time against
// your goal, the hours you work, your week, your writing, where the time went, your records
// and a table of every day.
class StatsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.range = '30';
    this.selected = null;
    // The projects shown, by id (NO_PROJECT for time without one); null shows everything.
    this.shown = null;
  }

  getViewType() {
    return VIEW_STATS;
  }

  getDisplayText() {
    return 'Pocket Watch stats';
  }

  getIcon() {
    return 'bar-chart-2';
  }

  async onOpen() {
    this.contentEl.addClass('pocket-watch-stats');
    this.render();
    // Keep up with the day, but never redraw under the mouse.
    this.registerInterval(window.setInterval(() => {
      if (!this.contentEl.matches(':hover')) this.render();
    }, 60000));
  }

  async onClose() {
    window.clearTimeout(this.resizeTimer);
    if (this.tip) this.tip.remove();
  }

  onResize() {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.render(), 150);
  }

  // --- Data ---------------------------------------------------------------

  // One project's share of a day. The share of no project is what's left of the day once
  // every project's share is taken out, so days from before projects all belong to it.
  slice(d, id) {
    if (id !== NO_PROJECT) return (d.projects || {})[id] || EMPTY_SLICE;
    const rest = {
      ms: d.ms, written: d.written, deleted: d.deleted, sessions: d.sessions || 0, focusMs: d.focusMs || 0,
      hours: (d.hours || new Array(24).fill(0)).slice(), files: Object.assign({}, d.files || {}),
    };
    for (const x of Object.values(d.projects || {})) {
      for (const k of ['ms', 'written', 'deleted', 'sessions', 'focusMs']) rest[k] = Math.max(0, rest[k] - (x[k] || 0));
      (x.hours || []).forEach((ms, h) => (rest.hours[h] = Math.max(0, rest.hours[h] - ms)));
      for (const [path, ms] of Object.entries(x.files || {})) {
        rest.files[path] = (rest.files[path] || 0) - ms;
        if (rest.files[path] < 1000) delete rest.files[path];
      }
    }
    return rest;
  }

  // A day as the page shows it: all of it, or only the projects you've turned on.
  day(key) {
    const d = this.plugin.getDay(key);
    if (!this.shown) return d;
    const out = { ms: 0, written: 0, deleted: 0, sessions: 0, focusMs: 0, hours: new Array(24).fill(0), files: {} };
    for (const id of this.shown) {
      const x = this.slice(d, id);
      for (const k of ['ms', 'written', 'deleted', 'sessions', 'focusMs']) out[k] += x[k] || 0;
      (x.hours || []).forEach((ms, h) => (out.hours[h] += ms));
      for (const [path, ms] of Object.entries(x.files || {})) out.files[path] = (out.files[path] || 0) + ms;
    }
    return out;
  }

  topFiles(keys, limit) {
    const sum = {};
    for (const key of keys) {
      for (const [path, ms] of Object.entries(this.day(key).files || {})) sum[path] = (sum[path] || 0) + ms;
    }
    return Object.entries(sum).filter(([, ms]) => ms >= 60000).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }

  currentStreak() {
    let i = this.day(dayKey(daysAgo(0))).ms >= ACTIVE_DAY_MS ? 0 : 1;
    let n = 0;
    while (this.day(dayKey(daysAgo(i))).ms >= ACTIVE_DAY_MS) {
      n++;
      i++;
    }
    return n;
  }

  // Every project with time on the page or still in use, in your order, then no project.
  projectEntries(keys) {
    const p = this.plugin;
    const time = (id) => keys.reduce((sum, k) => sum + this.slice(p.getDay(k), id).ms, 0);
    const entries = p.settings.projects
      .map((x) => ({ id: x.id, name: x.name, color: `var(--pw-p${x.color})`, project: x, ms: time(x.id) }))
      .filter((x) => !x.project.archived || x.ms > 0);
    entries.push({ id: NO_PROJECT, name: 'No project', color: 'var(--pw-p-none)', project: null, ms: time(NO_PROJECT) });
    return entries;
  }

  isShown(id) {
    return !this.shown || this.shown.has(id);
  }

  // What the page is showing, in words.
  showing(entries) {
    if (!this.shown) return 'Showing all projects';
    const names = entries.filter((x) => this.shown.has(x.id)).map((x) => x.name);
    return `Showing ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || 'nothing'}`;
  }

  // The days of the chosen range, oldest first, and as many days again before them.
  rangeKeys() {
    const p = this.plugin;
    let n;
    if (this.range === 'all') {
      const tracked = Object.keys(p.days).filter((k) => p.days[k].ms > 0).sort();
      const first = tracked.length ? keyToDate(tracked[0]) : daysAgo(0);
      n = Math.max(1, Math.round((daysAgo(0) - first) / 86400000) + 1);
    } else {
      n = Number(this.range);
    }
    const keys = [];
    for (let i = n - 1; i >= 0; i--) keys.push(dayKey(daysAgo(i)));
    const before = [];
    if (this.range !== 'all') for (let i = 2 * n - 1; i >= n; i--) before.push(dayKey(daysAgo(i)));
    return { keys, before, n };
  }

  sum(keys) {
    const p = this.plugin;
    const s = { ms: 0, written: 0, deleted: 0, sessions: 0, focusMs: 0, active: 0 };
    for (const key of keys) {
      const d = this.day(key);
      s.ms += d.ms;
      s.written += d.written;
      s.deleted += d.deleted;
      s.sessions += d.sessions || 0;
      s.focusMs += d.focusMs || 0;
      if (d.ms >= ACTIVE_DAY_MS) s.active++;
    }
    return s;
  }

  // The range as points for a chart: a day each, or a week each when it's long.
  series(r) {
    const p = this.plugin;
    const weekly = r.keys.length > 120;
    const out = [];
    for (let i = 0; i < r.keys.length; i += weekly ? 7 : 1) {
      const keys = r.keys.slice(i, weekly ? i + 7 : i + 1);
      const date = keyToDate(keys[0]);
      const s = this.sum(keys);
      out.push({
        key: keys[0],
        keys,
        ms: s.ms,
        written: s.written,
        deleted: s.deleted,
        axis: weekly ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : String(date.getDate()),
        long: weekly
          ? `Week of ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
          : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    }
    return { points: out, weekly };
  }

  // --- Drawing helpers ----------------------------------------------------

  // A tooltip that follows the pointer: the value first, then what it is.
  // Rows, when given, break the value down: [colour, name, value].
  hover(el, value, label, rows) {
    el.addEventListener('pointerenter', () => {
      this.tip.empty();
      this.tip.createDiv({ cls: 'pw-stats-tip-value', text: value });
      if (label) this.tip.createDiv({ cls: 'pw-stats-tip-label', text: label });
      for (const [color, name, v] of rows || []) {
        const row = this.tip.createDiv('pw-stats-tip-row');
        row.createSpan('pw-stats-tip-key').style.background = color;
        row.createSpan({ cls: 'pw-stats-tip-name', text: name });
        row.createSpan({ cls: 'pw-stats-tip-num', text: v });
      }
      this.tip.addClass('is-shown');
    });
    el.addEventListener('pointermove', (e) => {
      const w = this.tip.offsetWidth;
      this.tip.style.left = `${Math.min(e.clientX + 14, window.innerWidth - w - 8)}px`;
      this.tip.style.top = `${e.clientY + 16}px`;
    });
    el.addEventListener('pointerleave', () => this.tip.removeClass('is-shown'));
  }

  // A card with a heading, an optional note beside it, and room for its chart.
  card(parent, title, note) {
    const card = parent.createDiv('pw-stats-card');
    const head = card.createDiv('pw-stats-card-head');
    head.createEl('h2', { text: title });
    if (note) head.createDiv({ cls: 'pw-stats-card-note', text: note });
    return card;
  }

  width(el, fallback = 520) {
    return Math.max(220, el.clientWidth || fallback);
  }

  // Columns from a baseline, with a clean axis, a hairline grid, an optional goal line, and
  // a tooltip on each column. Each point is { value, axis, long, key }.
  columns(card, points, opts) {
    const box = card.createDiv('pw-chart-box');
    const W = this.width(box);
    const H = opts.height || 190;
    const [L, R, T, B] = [40, 8, 12, 22];
    const svg = box.createSvg('svg', { attr: { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, cls: 'pw-chart' });
    const max = Math.max(opts.goal || 0, ...points.map((pt) => pt.value), opts.time ? 30 * 60000 : 1);
    const ticks = axisTicks(max, opts.time);
    const top = ticks[ticks.length - 1];
    const y = (v) => T + (H - T - B) * (1 - v / top);
    for (const t of ticks) {
      svg.createSvg('line', { attr: { x1: L, x2: W - R, y1: y(t), y2: y(t) }, cls: t ? 'pw-chart-grid' : 'pw-chart-base' });
      svg.createSvg('text', { attr: { x: L - 8, y: y(t) }, cls: ['pw-chart-tick', 'is-y'] }).textContent = opts.time ? (t ? fmtCompact(t) : '0') : fmtCount(t);
    }
    const band = (W - L - R) / points.length;
    const bw = Math.max(1.5, Math.min(24, band - 2));
    // Room for each label on the axis, by how long the labels are.
    const room = Math.max(26, Math.max(...points.map((pt) => pt.axis.length)) * 7 + 12);
    const every = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor((W - L - R) / room))));
    points.forEach((pt, i) => {
      const x = L + i * band + (band - bw) / 2;
      if (pt.stack) {
        // Stacked by project, a 2px gap between them, only the top one rounded.
        let base = 0;
        const parts = pt.stack.filter((part) => part.value > 0);
        parts.forEach((part, j) => {
          const y0 = y(base) - (j ? 1 : 0);
          const y1 = y(base + part.value) + (j < parts.length - 1 ? 1 : 0);
          base += part.value;
          if (y0 - y1 < 0.5) return;
          const d = j === parts.length - 1 ? barPath(x, bw, y0, y1) : `M ${x} ${y0} V ${y1} H ${x + bw} V ${y0} Z`;
          svg.createSvg('path', { attr: { d }, cls: ['pw-chart-bar', 'is-stacked'] }).style.fill = part.color;
        });
      } else {
        const d = barPath(x, bw, y(0), y(pt.value));
        if (d) svg.createSvg('path', { attr: { d }, cls: ['pw-chart-bar', pt.key && pt.key === this.selected ? 'is-selected' : ''] });
      }
      const hit = svg.createSvg('rect', { attr: { x: L + i * band, y: T, width: band, height: H - T - B }, cls: 'pw-chart-hit' });
      const rows = pt.stack ? pt.stack.filter((part) => part.value > 0).map((part) => [part.color, part.name, fmtShort(part.value)]) : null;
      this.hover(hit, opts.time ? fmtShort(pt.value) : fmtNum(Math.round(pt.value)), pt.long, rows);
      if (opts.onClick && pt.key) {
        hit.addClass('is-link');
        hit.addEventListener('click', () => opts.onClick(pt.key));
      }
      if ((points.length - 1 - i) % every === 0) {
        svg.createSvg('text', { attr: { x: L + i * band + band / 2, y: H - 6 }, cls: ['pw-chart-tick', 'is-x'] }).textContent = pt.axis;
      }
    });
    if (opts.goal) {
      const gy = y(opts.goal);
      svg.createSvg('line', { attr: { x1: L, x2: W - R, y1: gy, y2: gy }, cls: 'pw-chart-goal' });
      svg.createSvg('text', { attr: { x: W - R, y: gy - 5 }, cls: ['pw-chart-tick', 'is-goal'] }).textContent = `Goal ${fmtShort(opts.goal)}`;
    }
  }

  // --- The page -----------------------------------------------------------

  render() {
    const root = this.contentEl;
    const scroll = root.scrollTop;
    root.empty();
    if (this.tip) this.tip.remove();
    this.tip = document.body.createDiv('pw-stats-tip');
    const r = this.rangeKeys();
    // One project shown: the page takes its colour. Several, or all: the accent colour.
    const one = this.shown && this.shown.size === 1 ? [...this.shown][0] : null;
    const project = one && this.plugin.settings.projects.find((x) => x.id === one);
    root.style.setProperty('--pw-s-bar', one === NO_PROJECT ? 'var(--pw-p-none)' : project ? `var(--pw-p${project.color})` : 'var(--interactive-accent)');
    const page = root.createDiv('pw-stats-page');
    this.renderHeader(page);
    this.renderRange(page, r);
    this.renderYear(page);
    this.renderHero(page, r);
    this.renderProjects(page, r);
    let row = page.createDiv('pw-stats-grid');
    this.renderDaily(row, r);
    this.renderHours(row, r);
    row = page.createDiv('pw-stats-grid');
    this.renderWeekdays(row, r);
    this.renderWriting(row, r);
    row = page.createDiv('pw-stats-grid');
    this.renderWhere(row, r);
    this.renderRecords(row);
    this.renderTable(page, r);
    root.scrollTop = scroll;
    if (this.reveal && this.dayEl) this.dayEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.reveal = false;
  }

  select(key) {
    this.selected = this.selected === key ? null : key;
    this.reveal = !!this.selected;
    this.render();
  }

  renderHeader(page) {
    const p = this.plugin;
    const head = page.createDiv('pw-stats-head');
    const left = head.createDiv();
    left.createDiv({ cls: 'pw-stats-eyebrow', text: 'Pocket Watch' });
    left.createEl('h1', { cls: 'pw-stats-title', text: 'Your time' });
    left.createDiv({ cls: 'pw-stats-sub', text: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) });
    const today = head.createDiv({ cls: 'pw-stats-today', attr: { 'data-state': p.state } });
    today.createDiv({ cls: 'pw-stats-eyebrow', text: 'Today' });
    today.createDiv({ cls: 'pw-stats-today-value', text: fmtShort(p.getDay(dayKey(new Date())).ms) });
    const state = today.createDiv('pw-stats-today-state');
    state.createSpan('pw-stats-dot');
    state.createSpan({ text: STATE_LABELS[p.state] });
    const tracking = today.createDiv('pw-stats-tracking');
    tracking.createSpan({ cls: 'pw-stats-eyebrow', text: 'Project' });
    projectSwitcher(p, tracking);
  }

  // A square for every day of the past year, the columns weeks, ending with this one.
  renderYear(page) {
    const p = this.plugin;
    const card = this.card(page, 'The past year');
    const t = new Date();
    const mon = p.settings.weekStartsMonday;
    const intoWeek = (t.getDay() - (mon ? 1 : 0) + 7) % 7;
    const weeks = 53;
    const first = new Date(t.getFullYear(), t.getMonth(), t.getDate() - intoWeek - (weeks - 1) * 7);
    const todayKey = dayKey(t);
    // A narrow tab scrolls the year sideways rather than shrink the squares past reading.
    const scroller = card.createDiv('pw-heat-scroll');
    const heat = scroller.createDiv('pw-heat');
    for (let i = 0; i < 7; i++) {
      const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
      const label = heat.createDiv({ cls: 'pw-heat-weekday', text: [1, 3, 5].includes(d.getDay()) ? d.toLocaleDateString(undefined, { weekday: 'short' }) : '' });
      label.style.gridRow = String(i + 2);
    }
    let total = 0;
    let active = 0;
    let run = 0;
    let longest = 0;
    let lastLabel = -4;
    for (let w = 0; w < weeks; w++) {
      for (let i = 0; i < 7; i++) {
        const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + i);
        if (date > t) continue;
        const key = dayKey(date);
        if (date.getDate() === 1 && w - lastLabel >= 4 && w < weeks - 2) {
          const label = heat.createDiv({ cls: 'pw-heat-month', text: date.toLocaleDateString(undefined, { month: 'short' }) });
          label.style.gridColumn = `${w + 2} / span 4`;
          lastLabel = w;
        }
        const ms = this.day(key).ms;
        total += ms;
        if (ms >= ACTIVE_DAY_MS) {
          active++;
          longest = Math.max(longest, ++run);
        } else run = 0;
        const level = ms === 0 ? 0 : ms < 30 * 60000 ? 1 : ms < 90 * 60000 ? 2 : ms < 180 * 60000 ? 3 : 4;
        const cell = heat.createDiv({ cls: ['pw-heat-cell', `is-l${level}`] });
        cell.style.gridColumn = String(w + 2);
        cell.style.gridRow = String(i + 2);
        if (key === todayKey) cell.addClass('is-today');
        if (key === this.selected) cell.addClass('is-selected');
        cell.setAttr('aria-label', `${date.toLocaleDateString()}: ${fmtShort(ms)}`);
        this.hover(cell, fmtShort(ms), date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        cell.addEventListener('click', () => this.select(key));
      }
    }
    const foot = card.createDiv('pw-heat-foot');
    foot.createDiv({ text: `${fmtShort(total)} in the past year · ${active} active ${active === 1 ? 'day' : 'days'} · longest streak ${longest} ${longest === 1 ? 'day' : 'days'}` });
    const legend = foot.createDiv('pw-heat-legend');
    legend.createSpan({ text: 'Less' });
    for (let l = 0; l <= 4; l++) legend.createSpan({ cls: ['pw-heat-cell', `is-l${l}`] });
    legend.createSpan({ text: 'More' });
    if (this.selected) this.renderDay(card, this.selected);
    // Open on the latest weeks.
    scroller.scrollLeft = scroller.scrollWidth;
  }

  // One day, picked on the year or on a chart: its numbers, its hours and its notes.
  renderDay(card, key) {
    const p = this.plugin;
    const d = this.day(key);
    const panel = card.createDiv('pw-stats-day');
    this.dayEl = panel;
    const head = panel.createDiv('pw-stats-day-head');
    head.createEl('h3', { text: keyToDate(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) });
    const close = head.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Close' } });
    setIcon(close, 'x');
    close.addEventListener('click', () => this.select(key));
    const tiles = panel.createDiv('pw-stats-tiles');
    const tile = (label, value, sub) => {
      const t = tiles.createDiv('pw-stats-tile');
      t.createDiv({ cls: 'pw-stats-label', text: label });
      t.createDiv({ cls: 'pw-stats-tile-value', text: value });
      if (sub) t.createDiv({ cls: 'pw-stats-tile-sub', text: sub });
    };
    tile('Time', fmtShort(d.ms));
    tile('Words written', fmtNum(d.written), `${fmtNum(d.deleted)} deleted`);
    tile('Focus sessions', String(d.sessions || 0), d.focusMs ? `${fmtShort(d.focusMs)} of focus` : '');
    if (d.hours && d.hours.some((h) => h > 0)) {
      panel.createDiv({ cls: 'pw-stats-label', text: 'Hour by hour' });
      const strip = panel.createDiv('pw-hour-strip');
      const max = Math.max(...d.hours);
      d.hours.forEach((ms, h) => {
        const cell = strip.createDiv('pw-hour-cell');
        cell.style.setProperty('--pw-fill', String(ms / max));
        if (h % 6 === 0) cell.createDiv({ cls: 'pw-hour-label', text: `${pad2(h)}` });
        this.hover(cell, fmtShort(ms), `${pad2(h)}:00 to ${pad2((h + 1) % 24)}:00`);
      });
    }
    const notes = this.topFiles([key], 8);
    if (notes.length) {
      panel.createDiv({ cls: 'pw-stats-label', text: 'Where the time went' });
      noteBars(p, panel, notes);
    }
  }

  renderRange(page, r) {
    const bar = page.createDiv('pw-stats-range');
    const seg = bar.createDiv({ cls: 'pw-stats-seg', attr: { role: 'radiogroup', 'aria-label': 'Range' } });
    for (const [key, name] of STAT_RANGES) {
      const b = seg.createEl('button', { text: name, attr: { role: 'radio', 'aria-checked': String(this.range === key) } });
      if (this.range === key) b.addClass('is-active');
      b.addEventListener('click', () => {
        this.range = key;
        this.render();
      });
    }
    // Turn projects on and off; everything below shows only the ones that are on.
    if (!this.plugin.settings.projects.length) return;
    const entries = this.projectEntries(r.keys);
    const chips = bar.createDiv({ cls: 'pw-stats-chips', attr: { role: 'group', 'aria-label': 'Projects' } });
    for (const entry of entries) {
      const on = this.isShown(entry.id);
      const chip = chips.createEl('button', { cls: 'pw-stats-chip', attr: { 'aria-pressed': String(on) } });
      chip.toggleClass('is-on', on);
      chip.createSpan('pw-stats-chip-dot').style.background = entry.color;
      chip.createSpan({ text: entry.name });
      chip.addEventListener('click', () => {
        const next = new Set(this.shown || entries.map((x) => x.id));
        if (next.has(entry.id)) next.delete(entry.id);
        else next.add(entry.id);
        if (!next.size) return;
        this.shown = entries.every((x) => next.has(x.id)) ? null : next;
        this.render();
      });
    }
    const note = bar.createDiv({ cls: 'pw-stats-showing', text: this.showing(entries) });
    if (this.shown) {
      const all = note.createEl('button', { cls: 'pw-stats-all', text: 'Show all' });
      all.addEventListener('click', () => {
        this.shown = null;
        this.render();
      });
    }
  }

  // Your projects: how your time splits between them in the range, each with its share, and
  // the one you're tracking now. Click one to edit it.
  renderProjects(page, r) {
    const p = this.plugin;
    const card = this.card(page, 'Projects', p.settings.projects.length ? `How your time splits, last ${r.n} days` : '');
    if (!p.settings.projects.length) {
      const empty = card.createDiv('pw-projects-empty');
      empty.createDiv({ text: 'Track your time toward a project, like your proposal now and your dissertation after the deadline. Each gets its own colour, and you can show one, several or all of them here.' });
      empty.createEl('button', { cls: 'mod-cta', text: 'New project' }).addEventListener('click', () => new ProjectModal(this.app, p).open());
      return;
    }
    const entries = this.projectEntries(r.keys).filter((x) => x.project || x.ms > 0);
    const total = entries.reduce((sum, x) => sum + x.ms, 0);
    if (total > 0) {
      const split = card.createDiv('pw-projects-split');
      for (const entry of entries) {
        if (!entry.ms) continue;
        const seg = split.createDiv('pw-projects-seg');
        seg.style.flexGrow = String(entry.ms);
        seg.style.background = entry.color;
        seg.toggleClass('is-off', !this.isShown(entry.id));
        this.hover(seg, fmtShort(entry.ms), `${entry.name}, ${Math.round((entry.ms / total) * 100)}%`);
      }
    }
    const list = card.createDiv('pw-projects');
    const active = p.activeProject();
    for (const entry of entries) {
      const row = list.createDiv('pw-project-row');
      row.toggleClass('is-off', !this.isShown(entry.id));
      row.createSpan('pw-project-dot').style.background = entry.color;
      const name = row.createDiv('pw-project-row-name');
      name.createSpan({ text: entry.name });
      if (entry.project && active && active.id === entry.id) {
        const badge = name.createSpan({ cls: 'pw-project-badge', text: 'Tracking now' });
        if (p.settings.projectLocked) setIcon(badge.createSpan('pw-project-badge-lock'), 'lock');
      }
      if (entry.project && entry.project.archived) name.createSpan({ cls: 'pw-project-archived', text: 'Archived' });
      const share = row.createDiv('pw-project-share');
      share.createDiv('pw-project-share-fill').style.cssText = `width: ${total ? (entry.ms / total) * 100 : 0}%; background: ${entry.color}`;
      row.createDiv({ cls: 'pw-project-time', text: fmtShort(entry.ms) });
      row.createDiv({ cls: 'pw-project-pct', text: total ? `${Math.round((entry.ms / total) * 100)}%` : '' });
      if (entry.project) {
        const edit = row.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Edit ${entry.name}` } });
        setIcon(edit, 'pencil');
        edit.addEventListener('click', () => new ProjectModal(this.app, p, entry.project).open());
      } else row.createDiv('pw-project-edit-gap');
    }
    const foot = card.createDiv('pw-projects-foot');
    foot.createEl('button', { text: 'New project' }).addEventListener('click', () => new ProjectModal(this.app, p).open());
  }

  // Your time in the range, against the same number of days before, with its trend, and
  // the numbers that go with it.
  renderHero(page, r) {
    const p = this.plugin;
    const now = this.sum(r.keys);
    const row = page.createDiv('pw-stats-hero-row');
    const hero = row.createDiv({ cls: ['pw-stats-card', 'pw-stats-hero'] });
    const what = this.shown ? this.showing(this.projectEntries(r.keys)).replace(/^Showing /, 'Time on ') : 'Time in Obsidian';
    hero.createDiv({ cls: 'pw-stats-label', text: this.range === 'all' ? `${what}, all time` : `${what}, last ${r.n} days` });
    hero.createDiv({ cls: 'pw-stats-hero-value', text: fmtShort(now.ms) });
    if (r.before.length) {
      const diff = now.ms - this.sum(r.before).ms;
      const delta = hero.createDiv({ cls: 'pw-stats-delta', attr: { 'data-dir': diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' } });
      delta.setText(diff === 0 ? `The same as the ${r.n} days before` : `${diff > 0 ? '▲' : '▼'} ${fmtShort(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than the ${r.n} days before`);
    }
    // The trend, a point a day (or a week), ending on the latest.
    const { points } = this.series(r);
    const box = hero.createDiv('pw-chart-box');
    const W = this.width(box, 300);
    const H = 54;
    const max = Math.max(1, ...points.map((pt) => pt.ms));
    const xs = (i) => 5 + (points.length > 1 ? (i / (points.length - 1)) * (W - 10) : (W - 10) / 2);
    const ys = (v) => H - 6 - (v / max) * (H - 12);
    const svg = box.createSvg('svg', { attr: { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, cls: 'pw-chart' });
    const line = points.map((pt, i) => `${i ? 'L' : 'M'} ${xs(i).toFixed(1)} ${ys(pt.ms).toFixed(1)}`).join(' ');
    svg.createSvg('path', { attr: { d: `${line} L ${xs(points.length - 1)} ${H} L ${xs(0)} ${H} Z` }, cls: 'pw-spark-area' });
    svg.createSvg('path', { attr: { d: line }, cls: 'pw-spark-line' });
    svg.createSvg('circle', { attr: { cx: xs(points.length - 1), cy: ys(points[points.length - 1].ms), r: 4 }, cls: 'pw-spark-dot' });

    const tiles = row.createDiv({ cls: ['pw-stats-tiles', 'is-side'] });
    const tile = (label, value, sub) => {
      const t = tiles.createDiv({ cls: ['pw-stats-card', 'pw-stats-tile'] });
      t.createDiv({ cls: 'pw-stats-label', text: label });
      t.createDiv({ cls: 'pw-stats-tile-value', text: value });
      if (sub) t.createDiv({ cls: 'pw-stats-tile-sub', text: sub });
    };
    tile('Daily average', fmtShort(now.active ? now.ms / now.active : 0), 'on active days');
    tile('Active days', String(now.active), `of ${r.n}`);
    const streak = this.currentStreak();
    tile('Streak', `${streak} ${streak === 1 ? 'day' : 'days'}`, `best ${this.longestStreak()} days`);
    tile('Words written', fmtCount(now.written), `${fmtCount(now.deleted)} deleted`);
    tile('Focus sessions', String(now.sessions), `${fmtShort(now.focusMs)} of focus`);
    tile('Goal met', `${r.keys.filter((k) => this.day(k).ms >= p.settings.dailyGoalMinutes * 60000).length} days`, `${fmtShort(p.settings.dailyGoalMinutes * 60000)} a day`);
  }

  longestStreak() {
    const p = this.plugin;
    const keys = Object.keys(p.days).filter((k) => this.day(k).ms >= ACTIVE_DAY_MS).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const key of keys) {
      const date = keyToDate(key);
      run = prev && Math.round((date - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = date;
    }
    return best;
  }

  renderDaily(row, r) {
    const { points, weekly } = this.series(r);
    const goal = this.plugin.settings.dailyGoalMinutes * 60000 * (weekly ? 7 : 1);
    const card = this.card(row, weekly ? 'Every week' : 'Every day', weekly ? 'Click a week to see its first day' : 'Click a column to see that day');
    // With several projects on the page, each column stacks them in their colours.
    const p = this.plugin;
    const entries = p.settings.projects.length ? this.projectEntries(r.keys).filter((x) => this.isShown(x.id) && x.ms > 0) : [];
    const stacked = entries.length > 1;
    if (stacked) {
      const legend = card.createDiv('pw-chart-legend');
      for (const entry of entries) {
        const item = legend.createSpan('pw-chart-key');
        item.createSpan('pw-chart-swatch').style.background = entry.color;
        item.createSpan({ text: entry.name });
      }
    }
    this.columns(card, points.map((pt) => ({
      value: pt.ms, axis: pt.axis, long: pt.long, key: pt.key,
      stack: stacked ? entries.map((entry) => ({ color: entry.color, name: entry.name, value: pt.keys.reduce((sum, k) => sum + this.slice(p.getDay(k), entry.id).ms, 0) })) : null,
    })), { time: true, goal, height: 290, onClick: (key) => this.select(key) });
  }

  // A 24-hour dial: midnight at the top, noon at the bottom, a bar for each hour.
  renderHours(row, r) {
    const p = this.plugin;
    const hours = new Array(24).fill(0);
    for (const key of r.keys) {
      const h = this.day(key).hours;
      if (h) h.forEach((ms, i) => (hours[i] += ms));
    }
    const total = hours.reduce((a, b) => a + b, 0);
    const card = this.card(row, 'When you work', total ? 'Midnight at the top, noon at the bottom' : '');
    const box = card.createDiv({ cls: ['pw-chart-box', 'pw-clock-box'] });
    const size = Math.min(280, this.width(box, 280));
    const c = size / 2;
    const r1 = c - 20;
    const r0 = r1 * 0.38;
    const svg = box.createSvg('svg', { attr: { width: size, height: size, viewBox: `0 0 ${size} ${size}` }, cls: ['pw-chart', 'pw-clock'] });
    svg.createSvg('circle', { attr: { cx: c, cy: c, r: r1 }, cls: 'pw-chart-grid' });
    svg.createSvg('circle', { attr: { cx: c, cy: c, r: r0 + (r1 - r0) / 2 }, cls: 'pw-chart-grid' });
    for (let h = 0; h < 24; h++) {
      const a = h * 15;
      const rad = (a * Math.PI) / 180;
      const len = h % 6 === 0 ? 7 : 3;
      svg.createSvg('line', { attr: { x1: c + (r1 + 3) * Math.sin(rad), y1: c - (r1 + 3) * Math.cos(rad), x2: c + (r1 + 3 + len) * Math.sin(rad), y2: c - (r1 + 3 + len) * Math.cos(rad) }, cls: 'pw-clock-tick' });
    }
    for (const h of [0, 6, 12, 18]) {
      const rad = (h * 15 * Math.PI) / 180;
      const rr = r0 - 11;
      svg.createSvg('text', { attr: { x: c + rr * Math.sin(rad), y: c - rr * Math.cos(rad) }, cls: ['pw-chart-tick', 'is-clock'] }).textContent = pad2(h);
    }
    const max = Math.max(1, ...hours);
    let peak = 0;
    hours.forEach((ms, h) => {
      if (ms > hours[peak]) peak = h;
      const rv = r0 + 2 + (r1 - r0 - 2) * (ms / max);
      if (ms > 0) svg.createSvg('path', { attr: { d: ringPath(c, c, r0 + 2, rv, h * 15 + 1.2, h * 15 + 13.8) }, cls: 'pw-clock-bar' });
      const hit = svg.createSvg('path', { attr: { d: ringPath(c, c, r0, r1 + 12, h * 15, h * 15 + 15) }, cls: 'pw-chart-hit' });
      this.hover(hit, fmtShort(ms), `${pad2(h)}:00 to ${pad2((h + 1) % 24)}:00`);
    });
    // The hand points at the hour it is now.
    const t = new Date();
    const rad = (((t.getHours() + t.getMinutes() / 60) * 15) * Math.PI) / 180;
    svg.createSvg('line', { attr: { x1: c, y1: c, x2: c + (r1 + 2) * Math.sin(rad), y2: c - (r1 + 2) * Math.cos(rad) }, cls: 'pw-clock-hand' });
    svg.createSvg('circle', { attr: { cx: c, cy: c, r: 3.5 }, cls: 'pw-clock-pin' });
    if (total) {
      card.createDiv({ cls: 'pw-stats-caption', text: `Your busiest hour is ${pad2(peak)}:00 to ${pad2((peak + 1) % 24)}:00.` });
    } else {
      card.createDiv({ cls: 'pw-stats-caption', text: 'Pocket Watch notes the hours you work from version 1.10. Come back after a session or two.' });
    }
  }

  // Your average time on each day of the week, in the range.
  renderWeekdays(row, r) {
    const p = this.plugin;
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    for (const key of r.keys) {
      const dow = keyToDate(key).getDay();
      sums[dow] += this.day(key).ms;
      counts[dow]++;
    }
    const order = p.settings.weekStartsMonday ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const ref = daysAgo(0);
    const name = (dow, style) => new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay() + dow).toLocaleDateString(undefined, { weekday: style });
    const card = this.card(row, 'Your week', 'Average time on each day');
    this.columns(card, order.map((dow) => ({ value: counts[dow] ? sums[dow] / counts[dow] : 0, axis: name(dow, 'short'), long: `${name(dow, 'long')}s, on average` })), { time: true, height: 170 });
  }

  // Words written above the line and words deleted below it, on one scale.
  renderWriting(row, r) {
    const { points } = this.series(r);
    const now = this.sum(r.keys);
    const net = now.written - now.deleted;
    const card = this.card(row, 'Writing', `${net >= 0 ? '+' : '−'}${fmtNum(Math.abs(net))} words net`);
    const legend = card.createDiv('pw-chart-legend');
    for (const [cls, label] of [['is-written', 'Written'], ['is-deleted', 'Deleted']]) {
      const item = legend.createSpan('pw-chart-key');
      item.createSpan({ cls: ['pw-chart-swatch', cls] });
      item.createSpan({ text: label });
    }
    const box = card.createDiv('pw-chart-box');
    const W = this.width(box);
    const H = 170;
    const [L, R, T, B] = [40, 8, 10, 22];
    const ext = axisTicks(Math.max(10, ...points.map((pt) => Math.max(pt.written, pt.deleted))), false).pop();
    const mid = T + (H - T - B) / 2;
    const half = (H - T - B) / 2;
    const y = (v) => mid - (v / ext) * half;
    const svg = box.createSvg('svg', { attr: { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, cls: 'pw-chart' });
    for (const v of [ext, 0, -ext]) {
      svg.createSvg('line', { attr: { x1: L, x2: W - R, y1: y(v), y2: y(v) }, cls: v ? 'pw-chart-grid' : 'pw-chart-base' });
      svg.createSvg('text', { attr: { x: L - 8, y: y(v) }, cls: ['pw-chart-tick', 'is-y'] }).textContent = v ? `${v > 0 ? '+' : '−'}${fmtCount(Math.abs(v))}` : '0';
    }
    const band = (W - L - R) / points.length;
    const bw = Math.max(1.5, Math.min(24, band - 2));
    const room = Math.max(26, Math.max(...points.map((pt) => pt.axis.length)) * 7 + 12);
    const every = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor((W - L - R) / room))));
    points.forEach((pt, i) => {
      const x = L + i * band + (band - bw) / 2;
      const up = barPath(x, bw, mid - 1, y(pt.written) - 1);
      const down = barPath(x, bw, mid + 1, y(-pt.deleted) + 1);
      if (up) svg.createSvg('path', { attr: { d: up }, cls: ['pw-chart-bar', 'is-written'] });
      if (down) svg.createSvg('path', { attr: { d: down }, cls: ['pw-chart-bar', 'is-deleted'] });
      const hit = svg.createSvg('rect', { attr: { x: L + i * band, y: T, width: band, height: H - T - B }, cls: 'pw-chart-hit' });
      this.hover(hit, `+${fmtNum(pt.written)}  −${fmtNum(pt.deleted)}`, pt.long);
      if ((points.length - 1 - i) % every === 0) {
        svg.createSvg('text', { attr: { x: L + i * band + band / 2, y: H - 6 }, cls: ['pw-chart-tick', 'is-x'] }).textContent = pt.axis;
      }
    });
  }

  renderWhere(row, r) {
    const p = this.plugin;
    const card = this.card(row, 'Where the time went', 'Click a note to open it');
    const notes = this.topFiles(r.keys, 8);
    if (!notes.length) {
      card.createDiv({ cls: 'pw-stats-caption', text: 'Your time in each note shows here once you have spent a minute in one.' });
      return;
    }
    noteBars(p, card, notes);
    const folders = {};
    for (const key of r.keys) {
      for (const [path, ms] of Object.entries(this.day(key).files || {})) {
        const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
        folders[folder] = (folders[folder] || 0) + ms;
      }
    }
    const top = Object.entries(folders).filter(([, ms]) => ms >= 60000).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length > 1) {
      card.createDiv({ cls: 'pw-stats-label', text: 'Folders' });
      noteBars(p, card, top, { folders: true });
    }
  }

  // Your best day, your longest streak and other bests, over everything you've tracked.
  renderRecords(row) {
    const p = this.plugin;
    const card = this.card(row, 'Records', 'Over everything you have tracked');
    const s = { ms: 0, sessions: 0, focusMs: 0, activeDays: 0, bestMs: 0, bestKey: null };
    let wordsKey = null;
    let words = 0;
    let first = null;
    for (const key of Object.keys(p.days)) {
      const d = this.day(key);
      s.ms += d.ms;
      s.sessions += d.sessions || 0;
      s.focusMs += d.focusMs || 0;
      if (d.ms >= ACTIVE_DAY_MS) s.activeDays++;
      if (d.ms > s.bestMs) {
        s.bestMs = d.ms;
        s.bestKey = key;
      }
      if (d.written > words) {
        words = d.written;
        wordsKey = key;
      }
      if (d.ms > 0 && (!first || key < first)) first = key;
    }
    const date = (key) => (key ? keyToDate(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
    const list = card.createDiv('pw-records');
    const record = (label, value, sub) => {
      const item = list.createDiv('pw-record');
      item.createDiv({ cls: 'pw-record-label', text: label });
      const v = item.createDiv('pw-record-value');
      v.createSpan({ text: value });
      if (sub) v.createSpan({ cls: 'pw-record-sub', text: sub });
    };
    record('Best day', fmtShort(s.bestMs), date(s.bestKey));
    record('Most words in a day', fmtNum(words), date(wordsKey));
    record('Longest streak', `${this.longestStreak()} days`);
    record('All time', fmtShort(s.ms), `${s.activeDays} active days`);
    record('Focus sessions', fmtNum(s.sessions), `${fmtShort(s.focusMs)} of focus`);
    record('Tracking since', first ? date(first) : 'Today');
  }

  // Every day of the range in a table, newest first.
  renderTable(page, r) {
    const p = this.plugin;
    const card = page.createDiv('pw-stats-card');
    const details = card.createEl('details', 'pw-stats-details');
    const summary = details.createEl('summary');
    summary.createEl('h2', { text: 'Day by day' });
    summary.createDiv({ cls: 'pw-stats-card-note', text: 'Every day of the range in a table' });
    const keys = r.keys.filter((k) => this.day(k).ms > 0).reverse();
    if (!keys.length) {
      details.createDiv({ cls: 'pw-stats-caption', text: 'Nothing tracked in this range yet.' });
      return;
    }
    const table = details.createEl('table', 'pw-stats-table');
    const head = table.createEl('thead').createEl('tr');
    for (const h of ['Date', 'Time', 'Written', 'Deleted', 'Focus', 'Top note']) head.createEl('th', { text: h });
    const body = table.createEl('tbody');
    for (const key of keys) {
      const d = this.day(key);
      const tr = body.createEl('tr');
      tr.createEl('td', { text: keyToDate(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) });
      tr.createEl('td', { text: fmtShort(d.ms) });
      tr.createEl('td', { text: fmtNum(d.written) });
      tr.createEl('td', { text: fmtNum(d.deleted) });
      tr.createEl('td', { text: d.sessions ? `${d.sessions} (${fmtShort(d.focusMs || 0)})` : '0' });
      const top = this.topFiles([key], 1)[0];
      tr.createEl('td', { text: top ? noteName(top[0]) : '' });
      tr.addEventListener('click', () => this.select(key));
    }
  }
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
    // Keep the place on the page when it is drawn again after a change.
    const scroll = el.scrollTop;
    el.empty();
    el.addClass('pocket-watch-settings');
    this.open = this.open || { customise: false, focus: false, tracking: false };
    const set = (patch, redraw) => p.updateWatch(patch).then(() => redraw && this.display());
    const save = async (key, v) => {
      s[key] = v;
      await p.saveSettings();
      if (p.watch) p.watch.refresh();
    };
    const toggle = (parent, name, key, desc) => {
      const setting = new Setting(parent).setName(name);
      if (desc) setting.setDesc(desc);
      setting.addToggle((t) => t.setValue(s[key]).onChange((v) => set({ [key]: v })));
      return setting;
    };
    const slider = (parent, name, key, [min, max, step], desc) => {
      const setting = new Setting(parent).setName(name);
      if (desc) setting.setDesc(desc);
      setting.addSlider((sl) => sl.setLimits(min, max, step).setValue(s[key]).setDynamicTooltip().onChange((v) => save(key, v)));
      return setting;
    };
    // A section that folds away, and remembers whether it was open.
    const group = (key, name, desc) => {
      const details = el.createEl('details', { cls: 'pocket-watch-group' });
      details.open = !!this.open[key];
      const summary = details.createEl('summary');
      summary.createDiv({ cls: 'pocket-watch-group-name', text: name });
      summary.createDiv({ cls: 'pocket-watch-group-desc', text: desc });
      details.addEventListener('toggle', () => {
        this.open[key] = details.open;
      });
      return details.createDiv('pocket-watch-group-body');
    };

    // A thank-you at the top, for anyone who'd like to support the plugin.
    const support = el.createDiv('pocket-watch-support');
    const words = support.createDiv('pocket-watch-support-text');
    words.createDiv({ cls: 'pocket-watch-support-title', text: 'Enjoying Pocket Watch?' });
    words.createDiv({ cls: 'pocket-watch-support-desc', text: 'It is made by one person in their spare time. A coffee helps keep new watches coming.' });
    const coffee = support.createEl('a', { cls: 'pocket-watch-coffee', attr: { href: SUPPORT_URL, target: '_blank', rel: 'noopener', 'aria-label': 'Buy me a coffee (opens in your browser)' } });
    setIcon(coffee.createSpan('pocket-watch-coffee-icon'), 'coffee');
    coffee.createSpan({ text: 'Buy me a coffee' });

    new Setting(el)
      .setName('Show watch')
      .setDesc('Click the watch for your calendar and stats, and right-click it for focus sessions.')
      .addToggle((t) => t.setValue(s.showWatch).onChange((v) => set({ showWatch: v })));
    this.renderGallery(el, set);
    new Setting(el)
      .setName('Size')
      .setDesc('Or drag the handle on the watch, or hold Alt and scroll over it.')
      .addSlider((sl) => sl
        .setLimits(MIN_SIZE, MAX_SIZE, 2)
        .setValue(s.watchSize)
        .setDynamicTooltip()
        .onChange((v) => set({ watchSize: v })));
    new Setting(el)
      .setName('Position')
      .setDesc('Drag the watch onto a pane and it snaps to a corner or edge. Drop it on a pane\'s tab bar to tuck it in there, sized to fit. Drop it on the ribbon or status bar to snap it to the window, or hold Alt to place it freely.')
      .addButton((b) => b.setButtonText('Reset').onClick(() => set({ watchAnchor: null, watchPos: null })));

    // Customise the watch you are wearing.
    if (s.watchType === 'digital' && SHAPED_STYLES.includes(s.digitalStyle)) {
      const name = DIGITAL_STYLES[s.digitalStyle];
      const body = group('customise', `Customise ${name}`, 'Clock and seconds.');
      dropdown(new Setting(body).setName('Clock'), CLOCKS, s.clock, (v) => set({ clock: v }, true));
      toggle(body, 'Seconds', 'digitalSeconds');
      toggle(body, 'Blinking colon', 'blinkColon');
      if (s.digitalStyle !== 'capsule') {
        toggle(body, s.digitalStyle === 'column' ? 'Fill' : 'Line', 'digitalBar', 'Fills up toward your daily goal, and counts down during a focus session.');
      }
    } else if (s.watchType === 'digital') {
      const body = group('customise', 'Customise the digital watch', 'Layout, clock, and what it shows.');
      dropdown(
        new Setting(body).setName('Layout').setDesc('Wide has the time over a line of details, slim is a single line, tall stacks the hours over the minutes, and compact is just the time.'),
        DIGITAL_LAYOUTS, s.digitalLayout, (v) => set({ digitalLayout: v }, true),
      );
      dropdown(new Setting(body).setName('Clock'), CLOCKS, s.clock, (v) => set({ clock: v }, true));
      toggle(body, 'Monogram', 'dialText', 'The Philip Pocket monogram, faded into the background.');
      toggle(body, 'Seconds', 'digitalSeconds');
      toggle(body, 'Blinking colon', 'blinkColon');
      toggle(body, 'Date', 'digitalDate');
      toggle(body, 'Moon phase', 'digitalMoon');
      toggle(body, "Today's time", 'digitalFocus');
      toggle(body, 'Goal bar', 'digitalBar', 'Fills up toward your daily goal, and counts down during a focus session.');
    } else {
      const face = ANALOG_FACES[s.face] || ANALOG_FACES.porcelain;
      const body = group('customise', `Customise ${face.name}`, 'Case, hands, markers, complications and more.');
      dropdown(new Setting(body).setName('Case'), CASES, s.caseStyle, (v) => set({ caseStyle: v }, true));
      toggle(body, 'Monogram', 'dialText', 'The Philip Pocket monogram, under 12 o\'clock.');
      dropdown(new Setting(body).setName('Hour markers'), MARKERS, s.markers, (v) => set({ markers: v }, true));
      dropdown(new Setting(body).setName('Hands'), HANDS, s.hands, (v) => set({ hands: v }, true));
      dropdown(new Setting(body).setName('Seconds hand'), SECONDS, s.seconds, (v) => set({ seconds: v }));
      dropdown(
        new Setting(body).setName('Complications').setDesc('Each face comes with its own. Choose your own to pick what shows at 12, 3, 6 and 9 o\'clock.'),
        // Your own starts from the face's set.
        COMPLICATION_SETS, s.complications, (v) => set(Object.assign(v === 'custom' ? faceSlots(s) : {}, { complications: v }), true),
      );
      if (s.complications === 'custom') {
        for (const slot of SLOTS) {
          const setting = new Setting(body).setName(slot.name);
          dropdown(setting, COMPLICATIONS, s[slot.key], (v) => set({ [slot.key]: v }, true));
          if (face.window === slot.key) setting.setDesc(`${face.name} shows its movement here.`).setDisabled(true);
          if (face.regulator === slot.key) setting.setDesc(`${face.name} shows the hours here.`).setDisabled(true);
        }
      }
      toggle(body, 'Goal ring', 'goalRing', 'A ring on the bezel that fills up toward your daily goal.');
      dropdown(
        new Setting(body).setName('Movement').setDesc('How the balance wheel moves in Open heart and in the movement window. Lifelike ticks five times a second.'),
        MOVEMENTS, s.movement, (v) => set({ movement: v }),
      );
    }

    // Focus sessions.
    const focus = group('focus', 'Focus sessions', 'Lengths, breaks, colours, and what happens when time is up.');
    slider(focus, 'Focus (minutes)', 'focusMinutes', [5, 90, 5]);
    slider(focus, 'Short break (minutes)', 'shortBreakMinutes', [1, 30, 1]);
    slider(focus, 'Long break (minutes)', 'longBreakMinutes', [5, 60, 5]);
    slider(focus, 'Long break after', 'longBreakEvery', [2, 8, 1], 'How many focus sessions come before a long break.');
    const plain = (name, key, desc) => {
      const setting = new Setting(focus).setName(name);
      if (desc) setting.setDesc(desc);
      setting.addToggle((t) => t.setValue(s[key]).onChange((v) => save(key, v)));
      return setting;
    };
    plain('Start breaks automatically', 'autoStartBreaks');
    plain('Start the next focus session automatically', 'autoStartFocus');
    plain('Countdown under the watch', 'showCountdown', 'The minutes left, and how far past the time you are once it is up.');
    dropdown(
      new Setting(focus).setName('Colours').setDesc('In greyscale, the watch stays as it is while you focus, and a soft fade around it shows a break.'),
      SESSION_COLOURS, s.sessionColours, (v) => set({ sessionColours: v }),
    );
    dropdown(
      new Setting(focus).setName('When time is up').setDesc('It shows until you start the next one or dismiss it, or for a minute when the next one starts on its own.'),
      TIMES_UP, s.timesUp, async (v) => {
        await save('timesUp', v);
        p.previewAlert();
      },
    ).addExtraButton((b) => b.setIcon('eye').setTooltip('Preview').onClick(() => p.previewAlert()));
    plain('Chime', 'chime', 'A soft bell when a session or break ends.')
      .addExtraButton((b) => b.setIcon('volume-2').setTooltip('Play the chime').onClick(() => chime()));

    // Tracking.
    const tracking = group('tracking', 'Tracking', 'Daily goal, idle limit, and your data.');
    new Setting(tracking)
      .setName('Daily goal (minutes)')
      .addSlider((sl) => sl
        .setLimits(15, 480, 15)
        .setValue(s.dailyGoalMinutes)
        .setDynamicTooltip()
        .onChange((v) => set({ dailyGoalMinutes: v })));
    slider(tracking, 'Idle limit (minutes)', 'idleMinutes', [1, 120, 1], 'The timer stops after this long with no typing, clicking, scrolling or mouse movement.');
    new Setting(tracking)
      .setName('Remove idle time')
      .setDesc('When the timer goes idle, take back the minutes before it stopped.')
      .addToggle((t) => t.setValue(s.discardIdleTime).onChange((v) => save('discardIdleTime', v)));
    new Setting(tracking)
      .setName('Only count while Obsidian is focused')
      .addToggle((t) => t.setValue(s.onlyWhenFocused).onChange((v) => save('onlyWhenFocused', v)));
    new Setting(tracking)
      .setName('Week starts on Monday')
      .addToggle((t) => t.setValue(s.weekStartsMonday).onChange((v) => save('weekStartsMonday', v)));
    new Setting(tracking)
      .setName('Reset all data')
      .setDesc('Deletes every tracked day. This cannot be undone.')
      .addButton((b) => b.setButtonText('Reset').setWarning().onClick(async () => {
        if (window.confirm('Delete all Pocket Watch time and word stats?')) {
          await p.resetData();
          new Notice('Pocket Watch data reset');
        }
      }));

    el.scrollTop = scroll;
  }

  // Every watch, drawn by the watch's own code with your choices: click one to wear it.
  renderGallery(el, set) {
    const p = this.plugin;
    const s = p.settings;
    const posed = new Date();
    posed.setHours(10, 9, 36, 0);
    const card = (grid, name, selected, patch, size) => {
      const c = grid.createDiv({ cls: 'pocket-watch-card', attr: { role: 'button', tabindex: '0', 'aria-pressed': String(selected) } });
      if (selected) c.addClass('is-selected');
      drawPreview(p, c.createDiv('pocket-watch-card-watch'), Object.assign({ watchSize: size, movement: 'still', seconds: 'off' }, patch), posed);
      c.createDiv({ cls: 'pocket-watch-card-name', text: name });
      const pick = () => set(patch, true);
      c.addEventListener('click', pick);
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      });
    };
    const gallery = el.createDiv('pocket-watch-gallery');
    gallery.createDiv({ cls: 'pocket-watch-gallery-label', text: 'Analog' });
    let grid = gallery.createDiv('pocket-watch-gallery-grid');
    for (const [key, face] of Object.entries(ANALOG_FACES)) {
      card(grid, face.name, s.watchType === 'analog' && s.face === key, { watchType: 'analog', face: key }, 98);
    }
    gallery.createDiv({ cls: 'pocket-watch-gallery-label', text: 'Digital' });
    grid = gallery.createDiv({ cls: ['pocket-watch-gallery-grid', 'is-digital'] });
    // The slim ones are drawn larger, so they fill their card like the others.
    const slimSize = { hairline: 116, capsule: 124, column: 96 };
    for (const [key, name] of Object.entries(DIGITAL_STYLES)) {
      card(grid, name, s.watchType === 'digital' && s.digitalStyle === key, { watchType: 'digital', digitalStyle: key }, slimSize[key] || 72);
    }
  }
}
