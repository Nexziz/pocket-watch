'use strict';

const { Plugin, PluginSettingTab, Setting, MarkdownView, Notice, Menu, ItemView, Modal, SuggestModal, Platform, setIcon, parseYaml } = require('obsidian');

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
  retro: {
    name: 'Retro', case: 'thin', markers: 'quarters', art: 'retro', texture: 'grain',
    brandWidth: 24, hands: 'baton', set: { slotRight: 'date' },
  },
  vinyl: {
    name: 'Vinyl', case: 'platter', markers: 'pips', art: 'vinyl', brandAt: 'top', brandWidth: 22,
    hands: 'pencil', set: {},
  },
  terrazzo: {
    name: 'Terrazzo', case: 'ceramic', markers: 'batons', art: 'terrazzo', brandWidth: 24,
    hands: 'baton', set: {},
  },
  lavender: {
    name: 'Lavender', case: 'polished', markers: 'pips', art: 'lavender', flange: true, applied: true,
    hands: 'leaf', set: {},
  },
  jungle: {
    name: 'Jungle', case: 'polished', markers: 'batons', art: 'jungle', flange: true, applied: true,
    hands: 'dauphine', set: {},
  },
  tourbillon: {
    name: 'Tourbillon', case: 'polished', markers: 'batons', texture: 'sunburst', flange: true, applied: true, tourbillon: 'slotBottom',
    hands: 'dauphine', set: {},
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

// How long the watch waits, in seconds, before it fades back.
const FADES = { 0: 'Off', 5: 'After 5 seconds', 15: 'After 15 seconds', 60: 'After a minute', 300: 'After 5 minutes' };

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
  tomato: 'Tomato',
  pixel: 'Pixel',
  words: 'Words',
  terminal: 'Terminal',
};

// Slim styles that come in a shape of their own and show just the time: Hairline is bare
// numerals in your theme's colours, Capsule a slim pill that fills with the session, and
// Column the hours over the minutes in a narrow strip. The layout doesn't apply to them.
const SHAPED_STYLES = ['hairline', 'capsule', 'column', 'tomato', 'pixel', 'words', 'terminal'];

// The square ones: Tomato, a Pomodoro timer first; Pixel, the time in lights on a dot-matrix
// screen; Words, the time in words; and Terminal, a green screen with a blinking cursor.
const SQUARE_STYLES = ['tomato', 'pixel', 'words', 'terminal'];

// Pixel's digits, three dots wide and five tall, a row at a time.
const PIXEL_DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
};

// Words' letters, eleven by eleven, and where each word sits: [row, column, length].
const WORD_GRID = [
  'ITQISWHALFX',
  'TENZQUARTER',
  'TWENTYXFIVE',
  'MINUTESZTOW',
  'PASTKONETWO',
  'THREEVFOURX',
  'FIVESIXTENB',
  'SEVENYEIGHT',
  'NINEJELEVEN',
  'TWELVEWATCH',
  'POMOOCLOCKS',
];
const WORDS = {
  it: [0, 0, 2], is: [0, 3, 2], half: [0, 6, 4], ten: [1, 0, 3], quarter: [1, 4, 7], twenty: [2, 0, 6], five: [2, 7, 4],
  minutes: [3, 0, 7], to: [3, 8, 2], past: [4, 0, 4], oclock: [10, 4, 6],
  h1: [4, 5, 3], h2: [4, 8, 3], h3: [5, 0, 5], h4: [5, 6, 4], h5: [6, 0, 4], h6: [6, 4, 3], h7: [7, 0, 5],
  h8: [7, 6, 5], h9: [8, 0, 4], h10: [6, 7, 3], h11: [8, 5, 6], h12: [9, 0, 6],
};

const HOUR_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

// The words for a time, to the five minutes before it: "it is twenty five minutes to three".
function timeWords(h, m) {
  const five = Math.floor(m / 5) * 5;
  const hour = (((five > 30 ? h + 1 : h) + 11) % 12) + 1;
  const words = ['it', 'is'];
  const away = five > 30 ? 60 - five : five;
  if (away === 5) words.push('five', 'minutes');
  else if (away === 10) words.push('ten', 'minutes');
  else if (away === 15) words.push('quarter');
  else if (away === 20) words.push('twenty', 'minutes');
  else if (away === 25) words.push('twenty', 'five', 'minutes');
  else if (away === 30) words.push('half');
  if (five) words.push(five > 30 ? 'to' : 'past');
  words.push(`h${hour}`);
  if (!five) words.push('oclock');
  return words;
}

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
  // Fade the watch back after this many seconds alone (0 for never), to this much (percent).
  fadeAfter: 0,
  fadeTo: 35,
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
  // Which placement this device has had: on a phone, version 2 moved the watch into the header.
  watchPlaced: 0,
  // Where the watch sits when dropped freely (Alt), as fractions of the free space
  // to its left and above it, so it keeps its spot when the window is resized.
  watchPos: null,

  // Projects you track your time toward: { id, name, color (1 to 8), archived }. While one is
  // active, everything you track goes to it as well; locking it asks before switching.
  projects: [],
  activeProject: null,
  projectLocked: false,

  // The stats page as you've arranged it: [{ id, wide, hidden }] in order; null as it comes.
  statsLayout: null,
  // The sections and paper of the last report you made.
  report: null,
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

// The parts of the screen a phone keeps for itself: its status bar at the top and its
// gesture bar at the bottom. Measured once.
let insets = null;
function safeInsets() {
  if (insets) return insets;
  const probe = document.body.createDiv();
  probe.style.cssText = 'position: fixed; visibility: hidden; padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px)); padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));';
  const css = getComputedStyle(probe);
  insets = { top: parseFloat(css.paddingTop) || 0, bottom: parseFloat(css.paddingBottom) || 0 };
  probe.remove();
  return insets;
}

// How long ago: "just now", "5 minutes ago", "yesterday", "12 days ago".
function sinceText(at) {
  if (!at) return 'a while ago';
  const min = Math.floor((Date.now() - at) / 60000);
  if (min < 2) return 'just now';
  if (min < 60) return `${min} minutes ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'an hour ago' : `${h} hours ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

// "1 day", "6 days".
function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
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

// The kinds of device your time can come from, and the icon for each.
const DEVICE_KINDS = { computer: 'Computer', laptop: 'Laptop', phone: 'Phone', tablet: 'Tablet' };
const DEVICE_ICONS = { computer: 'monitor', laptop: 'laptop', phone: 'smartphone', tablet: 'tablet' };

// Settings that belong to each device rather than to the vault: where the watch sits, its
// size, and whether it shows.
const DEVICE_SETTINGS = ['watchAnchor', 'watchPos', 'watchSize', 'showWatch', 'watchPlaced'];

// Changes to every device's time, like moving time to a project, are kept this long, for a
// device that has been away to catch up on.
const CHANGE_DAYS = 180;

// This device as Obsidian sees it, and a name to start with: you can change both.
function deviceGuess() {
  const kind = Platform.isPhone ? 'phone' : Platform.isTablet ? 'tablet' : 'computer';
  const name = kind === 'phone' ? (Platform.isIosApp ? 'iPhone' : 'Android phone')
    : kind === 'tablet' ? (Platform.isIosApp ? 'iPad' : 'Android tablet')
      : Platform.isMacOS ? 'Mac' : Platform.isWin ? 'Windows PC' : Platform.isLinux ? 'Linux PC' : 'Computer';
  return { kind, name };
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// The settings every device shares: all but where the watch sits.
function sharedSettings(s) {
  const out = Object.assign({}, s);
  for (const k of DEVICE_SETTINGS) delete out[k];
  return out;
}

// Days from several devices added up: every count, the hours, the notes, the sittings and
// the projects.
function sumDays(list) {
  const out = {};
  for (const k of SLICE_NUMBERS) out[k] = 0;
  for (const d of list) {
    if (!d) continue;
    addSlice(out, d);
    if (d.sits) out.sits = (out.sits || []).concat(d.sits);
    for (const [id, x] of Object.entries(d.projects || {})) {
      out.projects = out.projects || {};
      if (!out.projects[id]) out.projects[id] = { ms: 0, written: 0, deleted: 0, sessions: 0, focusMs: 0, hours: new Array(24).fill(0), files: {} };
      addSlice(out.projects[id], x);
    }
  }
  return out;
}

// Moves the time on the given days from one project to another, either of which can be no
// project: its minutes, hours of the day, notes, words and focus sessions. Returns what
// restoreDays needs to put it back.
function moveDays(days, keys, from, to) {
  const undo = [];
  for (const key of keys) {
    const day = days[key];
    if (!day) continue;
    const share = projectSlice(day, from);
    if (!share.ms && !share.written && !share.deleted && !share.sessions) continue;
    undo.push([key, JSON.stringify(day.projects || null), JSON.stringify(day.sits || null)]);
    if (to !== NO_PROJECT) addSlice(projectBucket(day, to), share);
    if (from !== NO_PROJECT) delete day.projects[from];
    if (day.projects && !Object.keys(day.projects).length) delete day.projects;
    // The sittings go with the time.
    for (const sit of day.sits || []) if (sitIn(sit, from)) sit[2] = to === NO_PROJECT ? 0 : to;
  }
  return undo;
}

function restoreDays(days, undo) {
  for (const [key, saved, sits] of undo || []) {
    const day = days[key];
    if (!day) continue;
    const projects = JSON.parse(saved);
    if (projects) day.projects = projects;
    else delete day.projects;
    if (sits) day.sits = JSON.parse(sits) || undefined;
  }
}

// Whether a sitting was for a project, or for no project.
function sitIn(sit, id) {
  return id === NO_PROJECT ? !sit[2] : sit[2] === id;
}

// A renamed note keeps its time, and a renamed folder takes its notes' time with it. The time
// you picked a section in a note is kept by the section and the note, and moves too.
function renameDays(days, oldPath, newPath) {
  const renamed = (path) => (path === oldPath ? newPath : path.startsWith(`${oldPath}/`) ? newPath + path.slice(oldPath.length) : null);
  const move = (files, picked) => {
    for (const key of Object.keys(files)) {
      const cut = picked ? key.indexOf(PICK_SEP) : -1;
      if (picked && cut < 0) continue;
      const path = picked ? key.slice(cut + 1) : key;
      const moved = renamed(path);
      if (!moved) continue;
      const next = picked ? key.slice(0, cut + 1) + moved : moved;
      files[next] = (files[next] || 0) + files[key];
      delete files[key];
    }
  };
  for (const day of Object.values(days)) {
    for (const x of [day, ...Object.values(day.projects || {})]) {
      for (const k of SLICE_NOTES) if (x[k]) move(x[k], k === 'picked');
    }
  }
}

// A project's share of a day, made empty when it has none yet.
function projectBucket(day, id) {
  day.projects = day.projects || {};
  if (!day.projects[id]) day.projects[id] = { ms: 0, written: 0, deleted: 0, sessions: 0, focusMs: 0, hours: new Array(24).fill(0), files: {} };
  return day.projects[id];
}

// Applies a change to every device's time to one device's days, and returns its days.
function runChange(change, days, undos) {
  if (change.kind === 'move') undos[change.id] = moveDays(days, change.keys, change.from, change.to);
  else if (change.kind === 'unmove') {
    restoreDays(days, undos[change.of]);
    delete undos[change.of];
  } else if (change.kind === 'rename') renameDays(days, change.from, change.to);
  else if (change.kind === 'reset') return {};
  return days;
}

// ---------------------------------------------------------------------------
// Timelines: a project's sections, from Simple Gantt
// ---------------------------------------------------------------------------

// A project can follow a timeline made with Simple Gantt: a note with a ```simple-gantt block.
// Its phases and tasks become the project's sections, and your time on the project shares out
// among them, day by day:
//   1. time in a note that a task links to goes to that task;
//   2. otherwise, to the section you said you were working on;
//   3. otherwise, when one task is planned for that day (or several, all in one phase), to it;
//   4. otherwise it isn't sorted yet, and you can sort it by the day.
// As you go, only the picks are kept, each with the note it was made in. The rest is worked out
// when the time is shown, so a note you link later brings its earlier time with it.
const TIMELINE_KEY = 'simple-gantt';
const TIMELINE_BLOCK = /^```simple-gantt[^\n]*\n([\s\S]*?)^```[ \t]*$/m;
// Simple Gantt's colours, in the order of the projects' colours.
const TIMELINE_COLOURS = ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red'];
const TIMELINE_TYPES = ['task', 'milestone', 'deadline', 'event', 'location'];
// Time that isn't sorted into a section, and what sits between a pick and its note.
const UNSORTED = '?';
const PICK_SEP = '\t';

function timelineText(v) {
  const s = typeof v === 'string' ? v.trim()
    : typeof v === 'number' || typeof v === 'boolean' ? String(v)
      : v instanceof Date && !isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : '';
  return s || null;
}

function timelineDate(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const m = typeof v === 'string' ? /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v.trim()) : null;
  return m ? dayKey(new Date(+m[1], +m[2] - 1, +m[3])) : null;
}

function timelineYes(v) {
  return v === true || String(v) === 'true';
}

// Ids made from names as Simple Gantt makes them, so both find the same phases and tasks.
function timelineSlug(name) {
  const slug = String(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'phase';
}

// A timeline as Pocket Watch needs it, read the way Simple Gantt reads it: its title and dates,
// its phases and tasks (each a section, by key: p: and the id for a phase, i: for a task), and
// its milestones and deadlines. Buffers and vacations take no time, so they aren't sections.
function readTimeline(raw, path, fallbackTitle) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const tl = {
    path, title: timelineText(r.title) || fallbackTitle || 'Timeline', start: timelineDate(r.start), end: timelineDate(r.end),
    phases: [], tasks: [], marks: [], byKey: new Map(), guesses: new Map(),
  };
  const phaseIds = new Set();
  for (const ph of Array.isArray(r.phases) ? r.phases : []) {
    const o = ph && typeof ph === 'object' ? ph : { name: ph };
    const name = timelineText(o.name) || timelineText(o.id) || 'Phase';
    let id = timelineText(o.id) || timelineSlug(name);
    while (phaseIds.has(id)) id += '-2';
    phaseIds.add(id);
    const c = TIMELINE_COLOURS.indexOf(String(o.color));
    const phase = { key: `p:${id}`, kind: 'phase', id, name, color: (c >= 0 ? c : tl.phases.length % 8) + 1, tasks: [] };
    tl.phases.push(phase);
    tl.byKey.set(phase.key, phase);
  }
  const itemIds = new Set();
  for (const it of Array.isArray(r.items) ? r.items : []) {
    if (!it || typeof it !== 'object') continue;
    const type = TIMELINE_TYPES.includes(String(it.type)) ? String(it.type) : 'task';
    const name = timelineText(it.title) || 'Untitled';
    let id = timelineText(it.id) || timelineSlug(name);
    while (itemIds.has(id)) id += '-2';
    itemIds.add(id);
    const start = timelineDate(it.start) || timelineDate(it.date) || tl.start || dayKey(new Date());
    const given = timelineText(it.phase);
    const phase = given ? tl.phases.find((x) => x.id === given) || tl.phases.find((x) => x.name.toLowerCase() === given.toLowerCase()) : null;
    const progress = Number(String(it.progress == null ? '' : it.progress).replace('%', ''));
    const done = timelineYes(it.done) || (type === 'task' && progress >= 100);
    if (type === 'task' && !timelineYes(it.buffer)) {
      let end = timelineDate(it.end) || start;
      if (end < start) end = start;
      const task = {
        key: `i:${id}`, kind: 'task', id, name, start, end, phase: phase ? phase.id : null, color: phase ? phase.color : 0,
        note: timelineText(it.note), done, doneOn: done ? timelineDate(it.doneOn) : null, dropped: timelineYes(it.dropped),
      };
      tl.tasks.push(task);
      tl.byKey.set(task.key, task);
      if (phase) phase.tasks.push(task);
    } else if (type === 'milestone' || type === 'deadline') {
      tl.marks.push({ id, type, name, date: start, done, phase: phase ? phase.id : null, color: phase ? phase.color : 0 });
    }
  }
  // A phase is planned from its first task to its last.
  for (const ph of tl.phases) {
    if (!ph.tasks.length) continue;
    ph.start = ph.tasks.reduce((a, x) => (x.start < a ? x.start : a), ph.tasks[0].start);
    ph.end = ph.tasks.reduce((a, x) => (x.end > a ? x.end : a), ph.tasks[0].end);
  }
  const starts = tl.tasks.map((x) => x.start).concat(tl.marks.map((x) => x.date)).sort();
  const ends = tl.tasks.map((x) => x.end).concat(tl.marks.map((x) => x.date)).sort();
  if (!tl.start) tl.start = starts[0] || dayKey(new Date());
  if (!tl.end) tl.end = ends[ends.length - 1] || tl.start;
  if (tl.end < tl.start) [tl.start, tl.end] = [tl.end, tl.start];
  return tl;
}

// The timeline in a note's text, or null when it has none or it can't be read.
function parseTimelineNote(text, path, fallbackTitle) {
  const m = TIMELINE_BLOCK.exec(text || '');
  if (!m) return null;
  try {
    return readTimeline(parseYaml(m[1]), path, fallbackTitle);
  } catch (e) {
    return null;
  }
}

// The section a note's time goes to on a day: the task that links to it or, when several do, the
// one planned for that day, else the first.
function noteSection(notes, path, key) {
  const tasks = path ? notes.get(path) : null;
  if (!tasks) return null;
  return (tasks.find((x) => x.start <= key && key <= x.end) || tasks[0]).key;
}

// The section a day's time goes to by the calendar: the one task planned for that day, or the
// phase when every task planned for it is in one phase. A task you finished early stops taking
// time after the day you finished it, and one that Plan B replaced takes none.
function calendarSection(tl, key) {
  if (tl.guesses.has(key)) return tl.guesses.get(key);
  const on = tl.tasks.filter((x) => !x.dropped && x.start <= key && key <= x.end && !(x.doneOn && key > x.doneOn));
  let out = null;
  if (on.length === 1) out = on[0].key;
  else if (on.length > 1 && on[0].phase && on.every((x) => x.phase === on[0].phase)) out = `p:${on[0].phase}`;
  tl.guesses.set(key, out);
  return out;
}

// How one day's time on a project shares out among its timeline's sections: { key: ms }, with
// what's left under UNSORTED. `sorted` is where you sorted that day's leftover time, if you did,
// and `how` adds up what each rule placed: note, pick, date, hand and none.
function shareDay(slice, tl, notes, key, sorted, how) {
  const out = {};
  let left = slice.ms || 0;
  const put = (k, ms, rule) => {
    const take = Math.min(ms, left);
    if (take <= 0) return;
    out[k] = (out[k] || 0) + take;
    left -= take;
    if (how) how[rule] = (how[rule] || 0) + take;
  };
  for (const [path, ms] of Object.entries(slice.files || {})) {
    const k = noteSection(notes, path, key);
    if (k) put(k, ms, 'note');
  }
  for (const [pk, ms] of Object.entries(slice.picked || {})) {
    const cut = pk.indexOf(PICK_SEP);
    const k = cut < 0 ? pk : pk.slice(0, cut);
    // A note linked to a task keeps its time, whatever you picked.
    if ((cut >= 0 && noteSection(notes, pk.slice(cut + 1), key)) || !tl.byKey.has(k)) continue;
    put(k, ms, 'pick');
  }
  if (left >= 1000) {
    const hand = sorted === UNSORTED || tl.byKey.has(sorted) ? sorted : null;
    const k = hand || calendarSection(tl, key) || UNSORTED;
    put(k, left, k === UNSORTED ? 'none' : hand ? 'hand' : 'date');
  }
  return out;
}

// The phases of a timeline with their tasks and time, in the timeline's order. Tasks in no phase
// come last, together.
function sectionTree(tl, res) {
  const time = (x) => res.ms.get(x.key) || 0;
  const rows = tl.phases.map((ph) => ({ section: ph, own: time(ph), tasks: ph.tasks.map((t) => ({ section: t, ms: time(t) })) }));
  const loose = tl.tasks.filter((t) => !t.phase);
  if (loose.length) rows.push({ section: { key: null, kind: 'phase', name: 'Other tasks', color: 0, tasks: loose }, own: 0, tasks: loose.map((t) => ({ section: t, ms: time(t) })) });
  for (const row of rows) row.ms = row.own + row.tasks.reduce((sum, x) => sum + x.ms, 0);
  return rows;
}

// A section's name with its phase, as in "Analysis: Interviews".
function sectionLabel(tl, key) {
  if (key === UNSORTED) return 'Not sorted';
  const x = tl && tl.byKey.get(key);
  if (!x) return 'A section no longer on the timeline';
  const phase = x.kind === 'task' && x.phase ? tl.byKey.get(`p:${x.phase}`) : null;
  return phase ? `${phase.name}: ${x.name}` : x.name;
}

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
    this.dirty = false;
    this.loadRecords((await this.loadData()) || {});

    this.paused = false;
    // Keep counting while you work in another app, such as a browser or a PDF reader.
    this.outside = false;
    this.state = 'tracking';
    this.lastActivity = Date.now();
    this.lastInput = 0;
    this.lastTick = Date.now();
    this.sinceActivityMs = 0;
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
    this.addCommand({ id: 'move-time', name: 'Move time to a project', callback: () => new MoveTimeModal(this.app, this, {}).open() });
    this.addCommand({
      id: 'working-on',
      name: 'Choose what you are working on (a phase or task of the timeline)',
      checkCallback: (checking) => {
        const project = this.activeProject();
        if (!project || !project.timeline) return false;
        if (!checking) this.openSectionPicker(project);
        return true;
      },
    });
    this.addCommand({ id: 'make-report', name: 'Make a PDF report of your time', callback: () => new ReportModal(this.app, this).open() });
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
      if (file) this.count('opens');
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
      this.renameTimeline(oldPath, file.path);
    }));
    // Notes that come and go can change where a task's note link leads.
    this.notesEpoch = 0;
    this.registerEvent(this.app.vault.on('create', () => this.notesEpoch++));
    this.registerEvent(this.app.vault.on('delete', () => this.notesEpoch++));
    // A timeline you change is read again, and what's shown follows it.
    this.registerEvent(this.app.vault.on('modify', (file) => {
      if (this.timelineCache && this.timelineCache.has(file.path)) this.timeline(file.path);
    }));
    // For other plugins, like Simple Gantt: your time on the phases and tasks of a timeline, and
    // the 'pocket-watch:time-changed' event on the workspace when it changes.
    this.api = {
      version: 1,
      timelineHours: (path, raw) => this.timelineHours(path, raw),
      formatTime: (ms) => fmtShort(ms),
    };
    this.registerInterval(window.setInterval(() => this.tick(), 1000));
    // Save, and catch up with your other devices, every half minute; and at once when Obsidian
    // goes to the background, as a phone may close it there.
    this.registerInterval(window.setInterval(() => this.sync(), 30 * 1000));
    this.registerDomEvent(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.sync();
      else this.markActive();
    });

    this.app.workspace.onLayoutReady(() => {
      // A note you make, and links and ticked-off tasks you add. Changes that arrive without
      // you typing or clicking, like sync, don't count.
      const yours = () => Date.now() - this.lastInput < 5000;
      this.registerEvent(this.app.vault.on('create', (file) => {
        if (file.extension === 'md' && yours()) this.count('created');
      }));
      this.linkCounts = new Map();
      this.registerEvent(this.app.metadataCache.on('changed', (file, _data, cache) => {
        const links = ((cache && cache.links) || []).length + ((cache && cache.embeds) || []).length;
        const done = ((cache && cache.listItems) || []).filter((x) => x.task && x.task !== ' ').length;
        const before = this.linkCounts.get(file.path);
        this.linkCounts.set(file.path, { links, done });
        if (!before || !yours()) return;
        if (links > before.links) this.count('links', links - before.links);
        if (done > before.done) this.count('tasks', done - before.done);
      }));
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
    const inNote = (e) => e.target && e.target.closest && e.target.closest('.cm-editor');
    this.registerDomEvent(doc, 'keydown', (e) => {
      input();
      if (inNote(e) && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') this.count('undos');
    }, true);
    // What you type into a note, from the keyboard or from a phone's.
    this.registerDomEvent(doc, 'beforeinput', (e) => {
      if (!inNote(e)) return;
      const type = e.inputType || '';
      if (type === 'insertText' || type === 'insertCompositionText' || type === 'insertLineBreak' || type === 'insertParagraph') {
        this.count('typed', type === 'insertText' && e.data ? e.data.length : 1);
        this.typedAt = Date.now();
      } else if (type.startsWith('delete')) {
        this.count('erased');
        this.typedAt = Date.now();
      } else if (type === 'historyUndo') this.count('undos');
    }, true);
    this.registerDomEvent(doc, 'paste', (e) => {
      if (!inNote(e)) return;
      const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
      this.count('pastes');
      this.count('pasted', countWords(text));
      this.pastedAt = Date.now();
    }, true);
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

  // Keeps today's sittings: a new one after a break of more than a few minutes, or when the
  // project changes.
  sit(day, now) {
    const t = new Date(now);
    const minute = t.getHours() * 60 + t.getMinutes();
    const project = this.activeProject();
    const tag = project ? project.id : 0;
    const sits = day.sits || (day.sits = []);
    const last = sits[sits.length - 1];
    if (last && last[2] === tag && minute >= last[0] && minute - (last[0] + last[1]) <= SITTING_GAP / 60000) {
      last[1] = minute - last[0] + 1;
    } else if (sits.length < 300) {
      sits.push([minute, 1, tag]);
    }
  }

  // Adds to one of today's counts, and to the project you're tracking.
  count(key, n = 1) {
    if (!n) return;
    const day = this.today();
    day[key] = (day[key] || 0) + n;
    const project = this.projectDay(day);
    if (project) project[key] = (project[key] || 0) + n;
    this.dirty = true;
  }

  isFocused() {
    const doc = typeof activeDocument !== 'undefined' ? activeDocument : document;
    // On a phone or tablet Obsidian is in use while it's on screen.
    if (Platform.isMobile) return doc.visibilityState === 'visible';
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
      this.sit(day, now);
      if (state === 'outside') this.count('outsideMs', delta);
      // Typing in the last few seconds: time spent writing, rather than reading or thinking.
      else if (now - (this.typedAt || 0) < 4000) this.count('typingMs', delta);
      let file = null;
      if (state === 'tracking') {
        this.sinceActivityMs += delta;
        // The note you're working in gets the time too. Time outside Obsidian isn't in a note.
        file = this.app.workspace.getActiveFile();
        if (file) {
          day.files = day.files || {};
          day.files[file.path] = (day.files[file.path] || 0) + delta;
          if (project) project.files[file.path] = (project.files[file.path] || 0) + delta;
        }
      }
      // The section of the project's timeline you said you're working on, and the note you're
      // in, so a note linked to a task can still claim its own time later.
      const picked = project && this.pickFor(this.activeProject());
      if (picked) {
        const key = `${picked}${PICK_SEP}${file ? file.path : ''}`;
        for (const x of [day, project]) {
          x.picked = x.picked || {};
          x.picked[key] = (x.picked[key] || 0) + delta;
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
    if (this.session && this.session.kind === 'focus') this.count('stopped');
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
    if (x.kind !== 'focus') this.count('breaks');
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
    const project = this.activeProject();
    if (project && project.timeline) {
      const tl = this.timeline(project.timeline);
      const key = this.pickFor(project);
      const x = key && tl && tl.byKey.get(key);
      menu.addItem((i) => i.setTitle(x ? `Working on ${x.name}…` : 'What are you working on?').setIcon('list-checks').onClick(() => this.openSectionPicker(project)));
    }
    menu.addItem((i) => i.setTitle('Open the shelf').setIcon('calendar-days').onClick(() => this.watch && !this.watch.shelfEl && this.watch.openShelf()));
    menu.addItem((i) => i.setTitle('Open your stats').setIcon('bar-chart-2').onClick(() => this.openStats()));
    menu.addItem((i) => i.setTitle(this.paused ? 'Resume tracking' : 'Pause tracking').setIcon('timer').onClick(() => this.togglePause()));
    menu.addItem((i) => i.setTitle('Track outside Obsidian').setIcon('external-link').setChecked(this.outside).onClick(() => this.toggleOutside()));
    menu.addItem((i) => i.setTitle('Hide the watch').setIcon('eye-off').onClick(() => this.updateWatch({ showWatch: false })));
    menu.showAtMouseEvent(e);
    this.menuAt = Date.now();
  }

  async updateWatch(patch) {
    Object.assign(this.settings, patch);
    await this.saveSettings();
    if (this.watch) this.watch.applySettings();
  }

  // Today on this device, where the time you spend here goes.
  today() {
    const key = dayKey(new Date());
    if (!this.ownDays[key]) this.ownDays[key] = { ms: 0, written: 0, deleted: 0 };
    return this.ownDays[key];
  }

  // A day over all your devices.
  getDay(key) {
    const own = this.ownDays[key];
    const other = this.othersMerged && this.othersMerged[key];
    if (!other) return own || EMPTY_DAY;
    return own ? sumDays([other, own]) : other;
  }

  // Every day over all your devices. With one device these are its own days.
  get days() {
    if (!this.othersMerged || !Object.keys(this.othersMerged).length) return this.ownDays;
    const now = Date.now();
    if (this.mergedCache && now - this.mergedCache.at < 500) return this.mergedCache.days;
    const days = Object.assign({}, this.othersMerged);
    for (const [key, d] of Object.entries(this.ownDays)) days[key] = days[key] ? sumDays([days[key], d]) : d;
    this.mergedCache = { at: now, days };
    return days;
  }

  set days(days) {
    this.ownDays = days;
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
      const day = this.today();
      const project = this.projectDay(day);
      if (diff > 0) day.written += diff;
      else if (diff < 0) day.deleted += -diff;
      if (project && diff > 0) project.written += diff;
      else if (project && diff < 0) project.deleted += -diff;
      if (diff > 0) {
        // When in the day the words come, and which note they go into.
        const hour = new Date().getHours();
        for (const x of project ? [day, project] : [day]) {
          x.wordHours = x.wordHours || new Array(24).fill(0);
          x.wordHours[hour] += diff;
          x.fileWords = x.fileWords || {};
          x.fileWords[path] = (x.fileWords[path] || 0) + diff;
        }
        // The most words written in any one minute, not counting what was pasted.
        if (Date.now() - (this.pastedAt || 0) > 3000) {
          const minute = Math.floor(Date.now() / 60000);
          if (this.minuteAt !== minute) {
            this.minuteAt = minute;
            this.minuteWords = 0;
          }
          this.minuteWords += diff;
          for (const x of project ? [day, project] : [day]) x.fastest = Math.max(x.fastest || 0, this.minuteWords);
        }
      }
      if (diff !== 0) this.dirty = true;
    }, 500));
  }

  // --- Devices ---
  //
  // Each device keeps its own record of your time and only ever writes its own, so sync can
  // carry data.json between your computer and your phone without one overwriting the other's
  // time. What they share is merged by when it was made: the settings, the devices' names,
  // and changes to every device's time, like moving time to a project, which each device
  // applies to its own record when it sees them.

  loadRecords(saved) {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, migrateSettings(saved.settings));
    // Projects are edited in place, so each plugin gets its own copies.
    this.settings.projects = (this.settings.projects || []).map((x) => Object.assign({}, x));
    this.settingsAt = saved.settingsAt || 0;
    this.info = Object.assign({}, saved.info);
    this.changes = (saved.ops || []).filter((x) => x.at > Date.now() - CHANGE_DAYS * 86400000);
    this.removed = Object.assign({}, saved.removed);
    this.others = {};

    let id = this.local('device');
    if (id && this.removed[id]) id = null;
    let own = null;
    if (!saved.devices && (saved.days || saved.settings)) {
      // From before devices: everything so far becomes this device's.
      own = { days: saved.days || {}, session: saved.session, cycle: saved.cycle, alert: saved.alert, layout: pick(this.settings, DEVICE_SETTINGS) };
      this.dirty = true;
    } else if (id) {
      own = saved.devices[id] || null;
      // Sync can bring back an older copy of this device's record than it last saved; the
      // copy kept on the device itself is then newer.
      const kept = this.local('record');
      if (kept && kept.id === id && kept.record && (!own || (kept.record.rev || 0) > (own.rev || 0))) own = kept.record;
    }
    if (!id) {
      id = newId();
      this.local('device', id);
    }
    // A new device starts with its own empty record; changes made before it came are not its.
    if (!own) own = { days: {}, applied: this.changes.map((x) => x.id) };
    this.deviceId = id;
    if (!this.info[id]) {
      const guess = deviceGuess();
      this.info[id] = { name: this.freeName(guess.name), kind: guess.kind, at: Date.now() };
      this.dirty = true;
    }
    for (const [other, record] of Object.entries(saved.devices || {})) {
      if (other !== id && !this.removed[other]) this.others[other] = record;
    }

    this.ownDays = own.days || {};
    // The running focus session or break, if any: { kind, total, endsAt, paused, remaining }.
    this.session = own.session || null;
    // Focus sessions finished since the last long break.
    this.cycle = own.cycle || 0;
    // When a session or break has ended: { kind, endedAt, until }. The watch shows it until you
    // respond, or until its `until` time when the next one started on its own.
    this.alert = own.alert || null;
    this.applied = new Set(own.applied || []);
    this.undos = Object.assign({}, own.undo);
    // What you're working on, on this device, for each project that follows a timeline.
    this.picks = Object.assign({}, own.picks);
    this.rev = own.rev || 0;
    // Where the watch sits is this device's own. A new phone starts with a smaller watch.
    const layout = own.layout || Object.assign(pick(DEFAULT_SETTINGS, DEVICE_SETTINGS), Platform.isPhone ? { watchSize: 84 } : {});
    Object.assign(this.settings, layout);
    // On a phone the watch sits in the bar at the top of the note, between its buttons, out of
    // the way of your writing. Once; drag it elsewhere and it stays there.
    if (Platform.isPhone && (this.settings.watchPlaced || 0) < 2) {
      Object.assign(this.settings, { watchAnchor: { header: true, spot: 'c' }, watchPos: null, watchPlaced: 2 });
      this.dirty = true;
    }
    this.sharedJson = JSON.stringify(sharedSettings(this.settings));
    if (this.applyChanges()) this.dirty = true;
    this.mergeOthers();
  }

  // Kept on this device only, never synced: which device this is, and a copy of its record.
  local(key, value) {
    const name = `pocket-watch-${key}`;
    const app = this.app;
    try {
      if (value === undefined) {
        if (app.loadLocalStorage) return app.loadLocalStorage(name);
        return JSON.parse(window.localStorage.getItem(`${name}-${app.vault.getName()}`));
      }
      if (app.saveLocalStorage) app.saveLocalStorage(name, value);
      else window.localStorage.setItem(`${name}-${app.vault.getName()}`, JSON.stringify(value));
    } catch (e) {
      // Without it, the record in data.json still holds.
    }
    return null;
  }

  freeName(name) {
    const taken = new Set(Object.values(this.info).map((x) => x.name));
    let n = 2;
    let free = name;
    while (taken.has(free)) free = `${name} ${n++}`;
    return free;
  }

  record() {
    return {
      days: this.ownDays, session: this.session, cycle: this.cycle, alert: this.alert, layout: pick(this.settings, DEVICE_SETTINGS),
      picks: this.picks, applied: [...this.applied], undo: this.undos, rev: this.rev, seen: Date.now(),
    };
  }

  // Saves this device's record after taking in what the other devices have saved since.
  async sync() {
    if (this.syncing) {
      this.syncAgain = true;
      return;
    }
    this.syncing = true;
    try {
      do {
        this.syncAgain = false;
        await this.syncOnce();
      } while (this.syncAgain);
    } finally {
      this.syncing = false;
    }
  }

  async syncOnce() {
    // A change to the settings made here is stamped first, so it wins over older ones.
    const shared = JSON.stringify(sharedSettings(this.settings));
    if (shared !== this.sharedJson) {
      this.sharedJson = shared;
      // Always later than the settings it replaces, even within the same millisecond.
      this.settingsAt = Math.max(Date.now(), this.settingsAt + 1);
      this.dirty = true;
    }
    const disk = await this.loadData();
    if (disk && disk.devices) {
      this.absorb(disk);
      // Sync brought back an older copy of this device's record: save it again.
      const mine = disk.devices[this.deviceId];
      if (!mine || (mine.rev || 0) < this.rev) this.dirty = true;
    } else this.dirty = true;
    if (!this.dirty) return;
    this.dirty = false;
    this.rev++;
    const record = this.record();
    const devices = Object.assign({}, this.others, { [this.deviceId]: record });
    await this.saveData({
      version: 2, settings: this.settings, settingsAt: this.settingsAt, info: this.info, devices, ops: this.changes, removed: this.removed,
    });
    this.local('record', { id: this.deviceId, record });
    if (this.settings.projects.some((x) => x.timeline)) this.timeChanged();
  }

  flush() {
    return this.sync();
  }

  // Sync changed data.json: catch up with the other devices at once.
  async onExternalSettingsChange() {
    await this.sync();
  }

  // Takes in what other devices saved: their records, newer settings and names, and changes.
  absorb(disk) {
    let changed = false;
    let settings = false;
    if ((disk.settingsAt || 0) > this.settingsAt && disk.settings) {
      const next = Object.assign({}, DEFAULT_SETTINGS, migrateSettings(disk.settings), pick(this.settings, DEVICE_SETTINGS));
      next.projects = (next.projects || []).map((x) => Object.assign({}, x));
      Object.assign(this.settings, next);
      this.settingsAt = disk.settingsAt;
      this.sharedJson = JSON.stringify(sharedSettings(this.settings));
      changed = settings = true;
    }
    for (const [id, info] of Object.entries(disk.info || {})) {
      if (!this.info[id] || info.at > this.info[id].at) {
        this.info[id] = info;
        changed = true;
      }
    }
    for (const [id, at] of Object.entries(disk.removed || {})) {
      if (this.removed[id]) continue;
      this.removed[id] = at;
      delete this.others[id];
      changed = true;
    }
    if (this.removed[this.deviceId]) this.rejoin();
    for (const [id, record] of Object.entries(disk.devices)) {
      if (id === this.deviceId || this.removed[id]) continue;
      const mine = this.others[id];
      if (mine && (record.rev || 0) < (mine.rev || 0)) continue;
      if (!mine || record.rev !== mine.rev) changed = true;
      this.others[id] = record;
    }
    const known = new Set(this.changes.map((x) => x.id));
    const since = Date.now() - CHANGE_DAYS * 86400000;
    for (const change of disk.ops || []) {
      if (known.has(change.id) || change.at < since) continue;
      this.changes.push(change);
      changed = true;
    }
    if (this.applyChanges()) this.dirty = changed = true;
    if (!changed) return;
    this.mergeOthers();
    if (settings && this.watch) this.watch.applySettings();
    this.refreshProjects();
  }

  // Applies the changes this device hasn't yet to its own record; true when there were any.
  applyChanges() {
    const since = Date.now() - CHANGE_DAYS * 86400000;
    this.changes = this.changes.filter((x) => x.at >= since);
    let any = false;
    for (const change of this.changes) {
      if (this.applied.has(change.id)) continue;
      this.applied.add(change.id);
      this.ownDays = runChange(change, this.ownDays, this.undos);
      any = true;
    }
    // Forget what was applied once the change itself is gone.
    const ids = new Set(this.changes.map((x) => x.id));
    for (const id of this.applied) if (!ids.has(id)) this.applied.delete(id);
    for (const id of Object.keys(this.undos)) if (!ids.has(id)) delete this.undos[id];
    return any;
  }

  // A change to your time on every device: applied here now, and by the others when they see it.
  async change(change) {
    Object.assign(change, { id: newId(), at: Date.now(), by: this.deviceId });
    this.changes.push(change);
    this.applied.add(change.id);
    this.ownDays = runChange(change, this.ownDays, this.undos);
    this.mergeOthers();
    this.dirty = true;
    await this.sync();
    return change;
  }

  // The other devices' days, added up, as they will be once they've applied every change.
  mergeOthers() {
    this.otherViews = {};
    const byDay = {};
    for (const [id, record] of Object.entries(this.others)) {
      const done = new Set(record.applied || []);
      const pending = this.changes.filter((x) => !done.has(x.id) && x.by !== id);
      let days = record.days || {};
      if (pending.length) {
        days = JSON.parse(JSON.stringify(days));
        const undos = JSON.parse(JSON.stringify(record.undo || {}));
        for (const change of pending) days = runChange(change, days, undos);
      }
      this.otherViews[id] = days;
      for (const [key, d] of Object.entries(days)) (byDay[key] = byDay[key] || []).push(d);
    }
    this.othersMerged = {};
    for (const [key, list] of Object.entries(byDay)) this.othersMerged[key] = list.length === 1 ? list[0] : sumDays(list);
    this.mergedCache = null;
  }

  // Another device took this one's time in, or forgot it: carry on as a new device.
  rejoin() {
    const was = this.info[this.deviceId];
    this.deviceId = newId();
    this.local('device', this.deviceId);
    this.ownDays = {};
    this.applied = new Set(this.changes.map((x) => x.id));
    this.undos = {};
    this.rev = 0;
    const guess = deviceGuess();
    this.info[this.deviceId] = { name: this.freeName(was ? was.name : guess.name), kind: was ? was.kind : guess.kind, at: Date.now() };
    this.dirty = true;
    new Notice('Pocket Watch: this device\'s time was taken in by another device. It carries on from here.');
  }

  // Your devices, this one first: { id, name, kind, days, seen, isThis }.
  deviceList() {
    const list = [{ id: this.deviceId, days: this.ownDays, seen: Date.now(), isThis: true }];
    for (const [id, record] of Object.entries(this.others || {})) {
      list.push({ id, days: (this.otherViews && this.otherViews[id]) || record.days || {}, seen: record.seen || 0, isThis: false });
    }
    return list.map((x) => Object.assign(x, this.deviceInfo(x.id)));
  }

  deviceInfo(id) {
    const info = (this.info && this.info[id]) || { name: 'A device', kind: 'computer' };
    return { name: info.name, kind: DEVICE_KINDS[info.kind] ? info.kind : 'computer' };
  }

  async setDevice(id, name, kind) {
    this.info[id] = { name: name.trim() || this.deviceInfo(id).name, kind, at: Date.now() };
    this.dirty = true;
    await this.sync();
    this.refreshProjects();
  }

  // Forget a device you no longer use, or first take its time into this device's own.
  async forgetDevice(id, keep) {
    if (keep) {
      for (const [key, d] of Object.entries((this.otherViews && this.otherViews[id]) || {})) {
        this.ownDays[key] = this.ownDays[key] ? sumDays([this.ownDays[key], d]) : JSON.parse(JSON.stringify(d));
      }
    }
    this.removed[id] = Date.now();
    delete this.others[id];
    this.mergeOthers();
    this.dirty = true;
    await this.sync();
    this.refreshProjects();
    this.tick();
  }

  async saveSettings() {
    this.dirty = true;
    await this.sync();
  }

  async resetData() {
    await this.change({ kind: 'reset' });
    this.tick();
    this.refreshProjects();
  }

  // A renamed note keeps its time, on every device.
  renameInDays(oldPath, newPath) {
    this.change({ kind: 'rename', from: oldPath, to: newPath });
  }

  // A project keeps following its timeline when the note, or its folder, is renamed.
  renameTimeline(oldPath, newPath) {
    this.notesEpoch = (this.notesEpoch || 0) + 1;
    let changed = false;
    for (const x of this.settings.projects) {
      if (!x.timeline) continue;
      const moved = x.timeline === oldPath ? newPath : x.timeline.startsWith(`${oldPath}/`) ? newPath + x.timeline.slice(oldPath.length) : null;
      if (moved) {
        x.timeline = moved;
        changed = true;
      }
    }
    if (this.timelineCache) {
      for (const [path, hit] of [...this.timelineCache]) {
        const moved = path === oldPath ? newPath : path.startsWith(`${oldPath}/`) ? newPath + path.slice(oldPath.length) : null;
        if (!moved) continue;
        this.timelineCache.delete(path);
        if (hit.tl) hit.tl.path = moved;
        this.timelineCache.set(moved, hit);
      }
    }
    if (changed) this.saveSettings();
  }

  // --- Projects ---

  activeProject() {
    const s = this.settings;
    return s.projects.find((x) => x.id === s.activeProject && !x.archived) || null;
  }

  // The active project's share of a day, made when first needed; null when no project is active.
  projectDay(day) {
    const project = this.activeProject();
    return project ? this.projectBucket(day, project.id) : null;
  }

  projectBucket(day, id) {
    return projectBucket(day, id);
  }

  // Move the time on the given days from one project to another, on every device. Returns how
  // much moved, and the change, which undoMove puts back.
  async moveTime(keys, from, to) {
    let moved = 0;
    let days = 0;
    if (from === to) return { moved, days, undo: null };
    for (const key of keys) {
      const share = projectSlice(this.getDay(key), from);
      if (!share.ms && !share.written && !share.deleted && !share.sessions) continue;
      moved += share.ms;
      days++;
    }
    if (!days) return { moved, days, undo: null };
    const change = await this.change({ kind: 'move', keys, from, to });
    this.refreshProjects();
    return { moved, days, undo: change.id };
  }

  async undoMove(id) {
    await this.change({ kind: 'unmove', of: id });
    this.refreshProjects();
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

  // --- Timelines --------------------------------------------------------------

  // The notes in the vault that hold a Simple Gantt timeline, by name.
  timelineFiles() {
    const mc = this.app.metadataCache;
    if (!mc || !this.app.vault.getMarkdownFiles) return [];
    return this.app.vault.getMarkdownFiles().filter((f) => {
      const fm = mc.getFileCache(f) && mc.getFileCache(f).frontmatter;
      return fm && timelineYes(fm[TIMELINE_KEY]);
    }).sort((a, b) => a.basename.localeCompare(b.basename));
  }

  // A timeline read from its note, kept until the note changes. The first time, or after a
  // change, it's read in the background and the page is drawn again once it's in; until then
  // the copy from before, if any, stands in.
  timeline(path) {
    if (!path) return null;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!file || !file.stat) return null;
    const cache = this.timelineCache || (this.timelineCache = new Map());
    const hit = cache.get(path);
    if (hit && hit.mtime === file.stat.mtime) return hit.tl;
    this.loadTimeline(path).then((tl) => {
      if (tl !== (hit && hit.tl)) {
        this.refreshProjects();
        this.timeChanged();
      }
    });
    return hit ? hit.tl : null;
  }

  // The same, waiting for the note to be read.
  loadTimeline(path) {
    const file = path && this.app.vault.getAbstractFileByPath(path);
    if (!file || !file.stat) return Promise.resolve(null);
    const cache = this.timelineCache || (this.timelineCache = new Map());
    const hit = cache.get(path);
    if (hit && hit.mtime === file.stat.mtime) return Promise.resolve(hit.tl);
    const loading = this.timelineLoads || (this.timelineLoads = new Map());
    if (loading.has(path)) return loading.get(path);
    const mtime = file.stat.mtime;
    const job = this.app.vault.cachedRead(file).then((text) => {
      const tl = parseTimelineNote(text, path, file.basename);
      cache.set(path, { mtime, tl });
      return tl;
    }, () => {
      // A note that can't be read isn't tried again until it changes.
      const tl = hit ? hit.tl : null;
      cache.set(path, { mtime, tl });
      return tl;
    }).finally(() => loading.delete(path));
    loading.set(path, job);
    return job;
  }

  // Where a task's note link leads: a note in the vault, or null.
  resolveNote(link, from) {
    const s = String(link).trim().replace(/^!?\[\[/, '').replace(/\]\]$/, '').split('|')[0].split('#')[0].trim();
    if (!s) return null;
    const mc = this.app.metadataCache;
    const hit = mc && mc.getFirstLinkpathDest ? mc.getFirstLinkpathDest(s, from || '') : null;
    if (hit) return hit.path;
    const v = this.app.vault;
    const direct = v.getAbstractFileByPath(s.endsWith('.md') ? s : `${s}.md`);
    return direct && direct.stat ? direct.path : null;
  }

  // The notes a timeline's tasks link to: path to tasks. Worked out again when notes come, go or
  // move.
  timelineNotes(tl) {
    if (tl.notes && tl.notesAt === (this.notesEpoch || 0)) return tl.notes;
    const notes = new Map();
    for (const task of tl.tasks) {
      const path = task.note && this.resolveNote(task.note, tl.path);
      if (!path) continue;
      if (!notes.has(path)) notes.set(path, []);
      notes.get(path).push(task);
    }
    tl.notes = notes;
    tl.notesAt = this.notesEpoch || 0;
    return notes;
  }

  // The projects that follow a timeline.
  timelineProjects(path) {
    return this.settings.projects.filter((x) => x.timeline && x.timeline === path);
  }

  // Your time on a timeline's sections over the days given (every day when none are), from every
  // device and every project given: each section's time and the days it had, how each rule
  // placed it, and the days with time the notes and your picks didn't sort, with where it goes.
  sectionTime(tl, projects, keys) {
    const notes = this.timelineNotes(tl);
    const res = { tl, total: 0, unsorted: 0, ms: new Map(), days: new Map(), how: {}, left: [] };
    const all = this.days;
    for (const key of keys || Object.keys(all).sort()) {
      const d = all[key];
      if (!d || !d.projects) continue;
      for (const project of projects) {
        const slice = d.projects[project.id];
        if (!slice || !slice.ms) continue;
        const sorted = project.sort ? project.sort[key] : null;
        const how = {};
        for (const [k, ms] of Object.entries(shareDay(slice, tl, notes, key, sorted, how))) {
          res.total += ms;
          res.ms.set(k, (res.ms.get(k) || 0) + ms);
          if (!res.days.has(k)) res.days.set(k, new Map());
          const byDay = res.days.get(k);
          byDay.set(key, (byDay.get(key) || 0) + ms);
        }
        for (const [rule, ms] of Object.entries(how)) res.how[rule] = (res.how[rule] || 0) + ms;
        const rest = (how.date || 0) + (how.hand || 0) + (how.none || 0);
        if (rest >= ACTIVE_DAY_MS) {
          const to = sorted === UNSORTED || tl.byKey.has(sorted) ? sorted : calendarSection(tl, key) || UNSORTED;
          res.left.push({ key, project, ms: rest, to, how: how.hand ? 'hand' : how.date ? 'date' : 'none' });
        }
      }
    }
    res.unsorted = res.ms.get(UNSORTED) || 0;
    return res;
  }

  // Sort a day's leftover time on a project into a section (UNSORTED to keep it out of every
  // section, null to let the calendar decide again). Shared by every device.
  async sortDays(project, keys, to) {
    const x = this.settings.projects.find((y) => y.id === project.id);
    if (!x) return;
    x.sort = Object.assign({}, x.sort);
    for (const key of keys) {
      if (to) x.sort[key] = to;
      else delete x.sort[key];
    }
    if (!Object.keys(x.sort).length) delete x.sort;
    await this.saveSettings();
    this.refreshProjects();
    this.timeChanged();
  }

  // What you're working on for a project, on this device: a section's key, or null to let your
  // notes and the calendar decide.
  pickFor(project) {
    return (project && project.timeline && this.picks && this.picks[project.id]) || null;
  }

  async setPick(project, key) {
    if (!project) return;
    this.picks = this.picks || {};
    if (key) this.picks[project.id] = key;
    else delete this.picks[project.id];
    this.dirty = true;
    this.refreshProjects();
    this.timeChanged();
    await this.sync();
  }

  // Choose what you're working on for a project, once its timeline is read.
  async openSectionPicker(project) {
    project = project || this.activeProject();
    if (!project || !project.timeline) {
      new Notice('Link the project to a Simple Gantt timeline first: edit the project and choose its timeline.');
      return;
    }
    const tl = await this.loadTimeline(project.timeline);
    if (!tl) {
      new Notice(`Pocket Watch can't read the timeline in ${project.timeline}.`);
      return;
    }
    new SectionModal(this.app, this, project, tl).open();
  }

  // Let other plugins know your time has changed, at most every few seconds.
  timeChanged() {
    const now = Date.now();
    if (this.changedAt && now - this.changedAt < 5000) return;
    this.changedAt = now;
    this.app.workspace.trigger('pocket-watch:time-changed');
  }

  // Your time on a timeline, for Simple Gantt: its total, what isn't sorted, and each task's and
  // phase's time (a phase's with its tasks'), with how many days each had and the last of them.
  // `raw` is the timeline as Simple Gantt holds it, when it has it to hand. Null when no
  // project follows the timeline.
  timelineHours(path, raw) {
    const projects = this.timelineProjects(path);
    if (!projects.length) return null;
    const file = this.app.vault.getAbstractFileByPath(path);
    const tl = raw ? readTimeline(raw, path, file && file.basename) : this.timeline(path);
    if (!tl) return null;
    const res = this.sectionTime(tl, projects);
    const out = { total: res.total, unsorted: res.unsorted, projects: projects.map((x) => ({ id: x.id, name: x.name, color: x.color })), items: {}, phases: {}, how: res.how };
    // A phase's days are its own and its tasks'.
    const stat = (keys, ms) => {
      const set = new Set();
      for (const k of keys) for (const day of (res.days.get(k) || new Map()).keys()) set.add(day);
      const days = [...set].sort();
      return { ms, days: days.length, first: days[0] || null, last: days[days.length - 1] || null };
    };
    for (const row of sectionTree(tl, res)) {
      for (const t of row.tasks) out.items[t.section.id] = stat([t.section.key], t.ms);
      if (row.section.key) out.phases[row.section.id] = Object.assign(stat([row.section.key, ...row.tasks.map((t) => t.section.key)], row.ms), { own: row.own });
    }
    return out;
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
    // Pointing at the watch, or touching it, brings it back from fading.
    this.touchedAt = Date.now();
    this.el.addEventListener('pointerenter', () => {
      this.hovering = true;
      this.wake();
    });
    this.el.addEventListener('pointerleave', () => {
      this.hovering = false;
      this.touchedAt = Date.now();
    });
    this.el.addEventListener('pointerdown', () => this.wake(), true);
    this.el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // A long press on a touch screen may already have opened it.
      if (Date.now() - (this.plugin.menuAt || 0) > 800) this.plugin.showWatchMenu(e);
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
      // In a tab bar a watch is small, so it is drawn in a simpler, bolder way.
      this.mini = fit > 0 && fit < 72;
      // Within a few percent is close enough, so rounding never has it redrawn every second.
      if (!fit || !this.size || Math.abs(want - this.size) > Math.max(1, this.size * 0.03)) this.size = Math.round(want);
      const key = JSON.stringify([
        s.watchType, this.size, s.face, s.caseStyle, s.dialText, s.markers, s.hands, s.seconds, s.complications, s.slotTop, s.slotRight, s.slotBottom, s.slotLeft,
        s.goalRing, s.movement, s.digitalStyle, s.digitalLayout, s.clock, s.digitalSeconds, s.blinkColon,
        s.digitalDate, s.digitalMoon, s.digitalFocus, s.digitalBar, s.longBreakEvery, dayKey(now), this.mini,
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
    this.fade();
    if (this.dashboard) this.dashboard.refreshLive();
    this.place();
  }

  // Fades the watch back once it's been left alone for a while. It comes back while you point
  // at it or touch it, while its shelf is open, and while time is up.
  fade() {
    const s = this.plugin.settings;
    const alone = s.fadeAfter > 0 && !this.hovering && !this.shelfEl && !this.dragging && !this.plugin.alert
      && Date.now() - (this.touchedAt || 0) > s.fadeAfter * 1000;
    this.el.classList.toggle('is-faded', alone);
    this.el.style.setProperty('--pw-fade', String(clamp(s.fadeTo, 5, 95) / 100));
  }

  wake() {
    this.touchedAt = Date.now();
    if (this.el.hasClass('is-faded')) this.fade();
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
      else if (live.type === 'cage' && !live.sweep) turn(live.el, sec * 6);
    }

    const d = parts.digital;
    if (d) {
      setDigits(d.hh, this.h24 ? pad2(h) : String(h % 12 || 12));
      setDigits(d.mm, pad2(m));
      if (d.ss) setDigits(d.ss, pad2(sec));
      if (d.ampm) setText(d.ampm, h < 12 ? 'AM' : 'PM');
    }
    if (parts.pomo) this.updatePomodoro(now);
    if (parts.square) this.updateSquare(now, progress);
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
    // How much of the watch is case: from a thin rim to a broad dive bezel.
    const R = sq ? 84 : { thin: 95, dive: 80, platter: 87.5, ceramic: 85 }[face.case] || 89.5;
    const k = R / 89.5;
    this.uid = ++drawings;
    const slots = faceSlots(s);
    const used = {};
    for (const slot of SLOTS) used[slot.hour] = slots[slot.key] !== 'none' || face.window === slot.key || face.regulator === slot.key || face.tourbillon === slot.key;

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
    const mini = !!this.mini;
    if (mini) svg.addClass('is-mini');
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
    else {
      if (!sq) this.drawCaseFinish(svg, add, face.case, R);
      disc(svg, R + 1.1, { 'stroke-width': 2.2, stroke: url('bezel-rev') }, 'pw-bezel-step');
    }

    // The ring on the bezel shows the daily goal, or the countdown during a focus session. On
    // a square case it runs round the square from 12.
    const [ringR, ringW] = sq ? [91.6, 2.8] : {
      thin: [97, 2], dive: [83, 1.8], platter: [90.3, 1.8], ceramic: [90.4, 2.6],
    }[face.case] || [94.6, 2.8];
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
    else if (face.art === 'retro') this.drawRetro(svg, add, R, k);
    else if (face.art === 'vinyl') this.drawVinyl(svg, add, text, R, k);
    else if (face.art === 'terrazzo') this.drawTerrazzo(svg, add, R);
    else if (face.art === 'lavender') this.drawLavender(svg, add, R);
    else if (face.art === 'jungle') this.drawJungle(svg, add, R);
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
    // Small, the watch keeps its dial and hands, and bold marks at the hours take the place of
    // the markers, monogram and complications, which would be too fine to read.
    if (mini) {
      this.drawMiniMarkers(svg, add, R, sq);
    } else {
      this.drawMarkers(svg, add, text, markers, R, k, used, face);
      if (s.dialText) this.drawBrand(svg, add, face, markers, R, k, used);
    }

    if (face.window && !mini) {
      const slot = SLOTS.find((x) => x.key === face.window);
      const [cx, cy] = polar(R * 0.415, slot.hour * 30);
      this.drawMovementWindow(svg, add, cx, cy, R * 0.345, face.windowShape);
    }
    if (face.tourbillon && !mini) {
      const slot = SLOTS.find((x) => x.key === face.tourbillon);
      const [cx, cy] = polar(R * 0.44, slot.hour * 30);
      this.drawTourbillon(svg, add, cx, cy, R * 0.33, now);
    }
    let hourDial = null;
    if (face.regulator && !mini) {
      const slot = SLOTS.find((x) => x.key === face.regulator);
      hourDial = polar(R * 0.45, slot.hour * 30);
      this.drawHourDial(svg, add, text, hourDial[0], hourDial[1], k);
    }
    for (const slot of SLOTS) {
      const type = slots[slot.key];
      if (mini || face.window === slot.key || face.regulator === slot.key || face.tourbillon === slot.key || !type || type === 'none' || !COMPLICATIONS[type]) continue;
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
    let style = s.hands !== 'face' && HANDS[s.hands] ? s.hands : face.hands || 'leaf';
    // Small, the hands are broader, and the finer styles become batons.
    if (mini && ['breguet', 'pencil', 'arrow'].includes(style)) style = 'baton';
    const hk = mini ? k * 1.8 : k;
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
      this.drawHand(body, add, style, R * (mini ? 0.56 : 0.52), hk, true);
    }
    [this.parts.minute, body] = hand('minute');
    // On a square dial the minute hand reaches further, toward the markers along the edge.
    this.drawHand(body, add, style, R * (sq ? 0.88 : mini ? 0.84 : 0.8), hk, false);
    if (s.seconds !== 'off' && !mini) {
      [this.parts.second, body] = hand('second');
      add(body, 'line', { x1: 0, y1: 18 * k, x2: 0, y2: -R * 0.88 });
      add(body, 'rect', { x: -1.5 * k, y: 9 * k, width: 3 * k, height: 9.5 * k, rx: 1.5 * k });
      add(body, 'circle', { cx: 0, cy: 0, r: 2.6 * k });
      if (s.seconds === 'sweep') sweep(this.parts.second, now);
    }
    // A domed cap over the hands, with a glint.
    add(svg, 'circle', { cx: 100, cy: 100, r: (mini ? 7 : 4.8) * k, fill: url('cap') }, 'pw-cap');
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

  // Bold marks at the hours for a small watch, longest at 12, 3, 6 and 9.
  drawMiniMarkers(svg, add, R, sq) {
    for (let i = 0; i < 12; i++) {
      const major = i % 3 === 0;
      const len = major ? 19 : 11;
      const [x1, y1] = sq ? edgePoint(R, i * 30, 6) : polar(R - 6, i * 30);
      const [x2, y2] = sq ? edgePoint(R, i * 30, 6 + len) : polar(R - 6 - len, i * 30);
      add(svg, 'line', { x1, y1, x2, y2 }, major ? ['pw-index', 'is-mini', 'is-major'] : ['pw-index', 'is-mini']);
    }
  }

  // The finish of a bezel: a platter is slim dark metal with the strobe dots of a turntable
  // round it; ceramic is matte and speckled, with a fine groove cut into it.
  drawCaseFinish(svg, add, kind, R) {
    if (kind === 'platter') {
      for (const [r, n, h] of [[93.2, 100, 1.7], [96.3, 90, 2]]) {
        let d = '';
        for (let j = 0; j < n; j++) {
          const a = (j / n) * 2 * Math.PI;
          const w = 0.62;
          const [ux, uy] = [Math.sin(a), -Math.cos(a)];
          const [tx, ty] = [Math.cos(a) * w, Math.sin(a) * w];
          const [x0, y0] = [100 + ux * (r - h / 2), 100 + uy * (r - h / 2)];
          const [x1, y1] = [100 + ux * (r + h / 2), 100 + uy * (r + h / 2)];
          d += `M ${(x0 - tx).toFixed(2)} ${(y0 - ty).toFixed(2)} L ${(x1 - tx).toFixed(2)} ${(y1 - ty).toFixed(2)} L ${(x1 + tx).toFixed(2)} ${(y1 + ty).toFixed(2)} L ${(x0 + tx).toFixed(2)} ${(y0 + ty).toFixed(2)} Z `;
        }
        add(svg, 'path', { d }, 'pw-case-strobe');
      }
    } else if (kind === 'ceramic') {
      const rand = rng(67);
      let d = '';
      for (let j = 0; j < 220; j++) {
        const a = rand() * 2 * Math.PI;
        const r = R + 2.5 + rand() * (97.5 - R - 2.5);
        d += circlePath(100 + r * Math.sin(a), 100 - r * Math.cos(a), 0.18 + rand() * 0.32);
      }
      add(svg, 'path', { d }, 'pw-case-fleck');
      add(svg, 'circle', { cx: 100, cy: 100, r: 95.4 }, 'pw-case-groove');
    }
  }

  // Retro: a warm cream dial from the seventies, with four bands in brown, rust, orange and
  // mustard sweeping across it in a long curve, as on a stereo or a station wagon.
  drawRetro(svg, add, R, k) {
    const g = add(svg, 'g', { 'clip-path': `url(#${this.id('dial-clip')})` }, 'pw-retro');
    const [cx, cy] = [100 - R * 0.95, 100 + R * 1.62];
    const w = 8.6 * k;
    ['brown', 'rust', 'orange', 'mustard'].forEach((tone, i) => {
      const r = R * 1.9 - i * (w + 1.6 * k);
      add(g, 'circle', { cx, cy, r, 'stroke-width': w }, ['pw-retro-band', `is-${tone}`]);
    });
  }

  // Vinyl: a black record, its grooves catching the light in two soft wedges, and a label
  // in the middle that turns slowly while the movement runs.
  drawVinyl(svg, add, text, R, k) {
    const g = add(svg, 'g', { 'clip-path': `url(#${this.id('dial-clip')})` }, 'pw-vinyl');
    const r0 = R * 0.36;
    const rand = rng(41);
    let fine = '';
    let deep = '';
    // A smooth run-out round the label and a smooth lead-in at the edge.
    for (let r = r0 + 6 * k; r < R - 4 * k; r += 0.85 * k) {
      // A few wider, darker grooves between the tracks.
      if (rand() < 0.045) {
        deep += circlePath(100, 100, r);
        r += 1.2 * k;
      } else {
        fine += circlePath(100, 100, r);
      }
    }
    add(g, 'path', { d: fine }, 'pw-vinyl-groove');
    add(g, 'path', { d: deep }, ['pw-vinyl-groove', 'is-gap']);
    // The light falls across it from the top left and shows on the far side too, as two
    // narrow fans that fade out to either side.
    for (const a of [302, 122]) {
      for (let off = -20; off < 20; off += 2) {
        const f = 1 - Math.abs(off + 1) / 20;
        add(g, 'path', { d: wedgePath(r0 + 5 * k, R, a + off, a + off + 2.05), opacity: (0.15 * f * f).toFixed(3) }, 'pw-vinyl-sheen');
      }
    }
    const label = add(svg, 'g', {}, ['pw-vinyl-label', 'pw-mv-spin', 'is-record']);
    add(label, 'circle', { cx: 100, cy: 100, r: r0 }, 'pw-vinyl-paper');
    add(label, 'circle', { cx: 100, cy: 100, r: r0 - 2.2 * k }, 'pw-vinyl-rim');
    add(label, 'circle', { cx: 100, cy: 100, r: r0 * 0.42 }, 'pw-vinyl-rim');
    if (!this.mini) {
      text(label, 100, 100 - r0 * 0.66, 4.3 * k, 'SIDE A', 'pw-vinyl-text');
      text(label, 100, 100 + r0 * 0.68, 4.3 * k, '33⅓ RPM', 'pw-vinyl-text');
    }
    add(label, 'path', { d: `M ${100 - r0 * 0.8} ${100 - 1.6 * k} H ${100 - r0 * 0.5} M ${100 + r0 * 0.5} ${100 - 1.6 * k} H ${100 + r0 * 0.8} M ${100 - r0 * 0.74} ${100 + 1.6 * k} H ${100 - r0 * 0.5} M ${100 + r0 * 0.5} ${100 + 1.6 * k} H ${100 + r0 * 0.74}` }, 'pw-vinyl-lines');
  }

  // Terrazzo: chips of marble and stone in terracotta, sage, ochre, rose and slate, set in a
  // warm white ground with fine dark flecks, and polished.
  drawTerrazzo(svg, add, R) {
    const g = add(svg, 'g', { 'clip-path': `url(#${this.id('dial-clip')})` }, 'pw-terrazzo');
    const rand = rng(53);
    const chip = (x, y, r, cls) => {
      const n = 5 + Math.floor(rand() * 3);
      const turn = rand() * Math.PI * 2;
      const stretch = 0.6 + rand() * 0.5;
      let d = '';
      for (let i = 0; i < n; i++) {
        const t = turn + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.7;
        const rr = r * (0.65 + rand() * 0.45);
        const px = x + rr * Math.cos(t);
        const py = y + rr * Math.sin(t) * stretch;
        d += `${i ? 'L' : 'M'} ${px.toFixed(2)} ${py.toFixed(2)} `;
      }
      add(g, 'path', { d: `${d}Z`, transform: `rotate(${(rand() * 180).toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})` }, cls);
    };
    const tones = ['terracotta', 'sage', 'ochre', 'rose', 'slate', 'terracotta', 'sage', 'cream'];
    for (let i = 0; i < 96; i++) {
      const big = rand() < 0.2;
      chip(100 - R + rand() * 2 * R, 100 - R + rand() * 2 * R, big ? 5 + rand() * 4.5 : 1.6 + rand() * 3.2, ['pw-chip', `is-${tones[i % tones.length]}`]);
    }
    for (let i = 0; i < 150; i++) chip(100 - R + rand() * 2 * R, 100 - R + rand() * 2 * R, 0.35 + rand() * 0.7, ['pw-chip', rand() < 0.6 ? 'is-fleck' : 'is-grey']);
    this.gradient(add, 'radialGradient', 'polish', { cx: '30%', cy: '26%', r: '75%' }, [['0%', 'rgba(255,255,255,0.35)'], ['60%', 'rgba(255,255,255,0.05)'], ['100%', 'rgba(255,255,255,0)']]);
    add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: `url(#${this.id('polish')})` }, 'pw-stone-polish');
  }

  // Lavender, painted: rows of lavender running away to the hills of Provence at sunset,
  // a farmhouse with a lamp lit among cypresses, and the low sun glowing through the haze.
  // The field is laid in with short dabs of the brush, finer toward the horizon, and the
  // nearest stalks are painted flower by flower.
  drawLavender(svg, add, R) {
    const url = (name) => `url(#${this.id(name)})`;
    const g = add(svg, 'g', { 'clip-path': url('dial-clip') });
    const rand = rng(83);
    const H = 90;
    const [vx, sunX, sunY] = [108, 126, H - 5];
    const f1 = (v) => v.toFixed(1);
    const lin = (name, y1, y2, stops) => this.gradient(add, 'linearGradient', name, { gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0, y1, y2 }, stops);
    lin('lav-sky', 8, H, [['0%', '#3c3d84'], ['26%', '#6556a3'], ['50%', '#a97fb6'], ['70%', '#e7979a'], ['86%', '#f9b989'], ['100%', '#ffdc9c']]);
    lin('lav-soil', H, 192, [['0%', '#d99a86'], ['16%', '#7d5058'], ['50%', '#45293a'], ['100%', '#24161f']]);
    lin('lav-row', H, 192, [['0%', '#c6a6d8'], ['14%', '#9a78c4'], ['50%', '#6c4aa6'], ['100%', '#432c7a']]);
    lin('lav-far', 72, H, [['0%', '#a48ab9'], ['100%', '#d6a4ae']]);
    lin('lav-near', 80, H + 1, [['0%', '#7d679e'], ['100%', '#a3819f']]);
    this.gradient(add, 'radialGradient', 'lav-sun', { cx: '45%', cy: '40%', r: '60%' }, [['0%', '#fffdf0'], ['70%', '#fff0bf'], ['100%', '#ffd88a']]);
    this.gradient(add, 'radialGradient', 'lav-glow', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(255,236,186,0.85)'], ['25%', 'rgba(255,214,160,0.42)'], ['100%', 'rgba(255,190,150,0)']]);
    this.gradient(add, 'linearGradient', 'lav-haze', { x1: 0, x2: 0, y1: 0, y2: 1 }, [['0%', 'rgba(255,205,170,0)'], ['45%', 'rgba(255,205,170,0.55)'], ['100%', 'rgba(220,170,210,0)']]);
    const soft = add(this.defs, 'filter', { id: this.id('lav-soft'), x: '-50%', y: '-50%', width: '200%', height: '200%' });
    add(soft, 'feGaussianBlur', { stdDeviation: 1.1 });

    // The sky, laid in with long horizontal strokes, lighter and darker.
    add(g, 'rect', { x: 0, y: 0, width: 200, height: H + 1, fill: url('lav-sky') });
    const strokes = ['', ''];
    for (let i = 0; i < 70; i++) {
      const y = 8 + rand() * (H - 12);
      const x = rand() * 200 - 20;
      const len = 18 + rand() * 40;
      const bend = (rand() - 0.5) * 3;
      strokes[i % 2] += brushPath([[x, y], [x + len * 0.33, y + bend], [x + len * 0.66, y - bend], [x + len, y + (rand() - 0.5) * 2]], 1.2 + rand() * 2.2, 0.3, 8);
    }
    add(g, 'path', { d: strokes[0] }, ['pw-lav-sky-stroke', 'is-light']);
    add(g, 'path', { d: strokes[1] }, ['pw-lav-sky-stroke', 'is-dark']);

    // The sun low over the hills, and its glow.
    add(g, 'circle', { cx: sunX, cy: sunY, r: 46, fill: url('lav-glow') });
    add(g, 'circle', { cx: sunX, cy: sunY, r: 7.2, fill: url('lav-sun') }, 'pw-lav-sun');

    // Clouds in long soft streaks: violet above, lit rose and gold underneath by the sun.
    const streak = (x, y, len, w) => {
      const half = len / 2;
      const c = x + half;
      return brushPath([[c, y], [c - half * 0.4, y + 0.3], [c - half * 0.75, y - 0.2], [x, y + 0.5]], w, 0.4, 10)
        + brushPath([[c, y], [c + half * 0.4, y - 0.3], [c + half * 0.75, y + 0.2], [x + len, y - 0.4]], w, 0.4, 10);
    };
    let cloud = '';
    let lit = '';
    for (const [x, y, len, w] of [[-6, 30, 74, 4.2], [96, 22, 90, 3.6], [24, 48, 58, 3.4], [120, 44, 72, 3.2], [58, 64, 52, 2.6], [150, 66, 50, 2.2], [4, 72, 40, 2]]) {
      cloud += streak(x, y, len, w);
      lit += streak(x + len * 0.12, y + w * 0.42, len * 0.78, w * 0.5);
    }
    add(g, 'path', { d: cloud }, 'pw-lav-cloud');
    add(g, 'path', { d: lit }, 'pw-lav-cloud-lit');

    // Hills, hazy in the distance, a little firmer nearer.
    const ridge = (points, seed, rough) => {
      const r = rng(seed);
      let pts = points;
      for (let pass = 0; pass < 2; pass++) {
        const next = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          next.push(pts[i], [(x1 + x2) / 2 + (r() - 0.5) * rough, (y1 + y2) / 2 + (r() - 0.5) * rough]);
        }
        next.push(pts[pts.length - 1]);
        pts = next;
        rough /= 2;
      }
      return pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${f1(x)} ${f1(y)}`).join(' ');
    };
    add(g, 'path', { d: `${ridge([[-5, 82], [22, 76], [44, 79], [70, 73], [96, 78], [120, 80], [146, 75], [172, 79], [205, 76]], 5, 3)} L 205 ${H + 1} L -5 ${H + 1} Z`, fill: url('lav-far') });
    add(g, 'path', { d: `${ridge([[-5, 86], [18, 83], [40, 86], [62, 84], [84, 87], [130, 88], [158, 84], [182, 86], [205, 83]], 11, 2)} L 205 ${H + 1} L -5 ${H + 1} Z`, fill: url('lav-near') });

    // On the horizon: a farmhouse among cypresses, with a lamp lit, and a row of trees.
    const [fx, fy] = [46, H - 0.6];
    let dark = '';
    const cypress = (x, base, h, w) => `M ${f1(x - w)} ${f1(base)} C ${f1(x - w * 1.1)} ${f1(base - h * 0.5)} ${f1(x - w * 0.4)} ${f1(base - h * 0.9)} ${f1(x)} ${f1(base - h)} C ${f1(x + w * 0.4)} ${f1(base - h * 0.9)} ${f1(x + w * 1.1)} ${f1(base - h * 0.5)} ${f1(x + w)} ${f1(base)} Z `;
    for (const [x, h, w] of [[fx - 9, 15, 1.5], [fx - 6.6, 11, 1.3], [fx + 14, 13, 1.4], [fx + 16.4, 9.5, 1.2], [176, 10, 1.2]]) dark += cypress(x, fy + 0.5, h, w);
    for (let x = 136; x < 168; x += 2.4 + rand() * 2) {
      const r = 1.6 + rand() * 1.6;
      dark += circlePath(f1(x), f1(fy - r * 0.7), f1(r));
    }
    add(g, 'path', { d: dark }, 'pw-lav-tree');
    add(g, 'path', { d: `M ${fx - 4} ${fy} L ${fx - 4} ${fy - 4.4} L ${fx + 8} ${fy - 4.4} L ${fx + 8} ${fy} Z` }, 'pw-lav-wall');
    add(g, 'path', { d: `M ${fx + 8} ${fy} L ${fx + 8} ${fy - 4.4} L ${fx + 11} ${fy - 3.4} L ${fx + 11} ${fy} Z` }, 'pw-lav-wall-lit');
    add(g, 'path', { d: `M ${fx - 5} ${fy - 4.2} L ${fx + 1.5} ${fy - 7.4} L ${fx + 9} ${fy - 4.6} L ${fx + 11.5} ${fy - 3.3} L ${fx + 8} ${fy - 4.4} Z` }, 'pw-lav-roof');
    add(g, 'rect', { x: fx + 2.2, y: fy - 3, width: 1.3, height: 1.4 }, 'pw-lav-lamp');
    add(g, 'circle', { cx: fx + 2.85, cy: fy - 2.3, r: 2.6, filter: url('lav-soft') }, 'pw-lav-lamp-glow');

    // The field: earth between the rows, then the rows running to a point on the horizon.
    add(g, 'rect', { x: 0, y: H, width: 200, height: 200 - H, fill: url('lav-soil') });
    const Y = 320;
    const pitch = 34;
    const share = 0.34;
    let rows = '';
    for (let i = -16; i <= 16; i++) {
      const c = vx + i * pitch;
      rows += `M ${vx} ${H} L ${f1(c - pitch * share)} ${Y} L ${f1(c + pitch * share)} ${Y} Z `;
    }
    add(g, 'path', { d: rows, fill: url('lav-row') });
    // A warm haze where the field meets the hills.
    add(g, 'rect', { x: 0, y: H - 6, width: 200, height: 16, fill: url('lav-haze') });

    // Dabs of the brush along the rows: short and round in the distance, longer up close,
    // where they become the spikes of the flowers themselves. Each row is a rounded mound,
    // light along its crown, deep on the side away from the sun and touched with the
    // sunset on the side toward it. Dabs of a tone and size share one stroked path.
    const dabs = {};
    const dab = (tone, band, d) => {
      const key = `${tone} ${band}`;
      dabs[key] = (dabs[key] || '') + d;
    };
    for (let y = H + 2.5; y < 197; y += Math.max(0.75, (y - H) * 0.06)) {
      const depth = (y - H) / (Y - H);
      const spacing = pitch * depth;
      const half = pitch * share * depth;
      const near = Math.min(1, (y - H) / 75);
      const band = Math.min(5, Math.floor(near * 6));
      const width = 0.55 + band * 0.2;
      const len = 0.3 + (y - H) * 0.08 * (0.4 + near * 0.9);
      const chord = 2 * Math.sqrt(Math.max(0, R * R - (y - 100) * (y - 100)));
      const n = Math.ceil(chord / (width * (1.25 - near * 0.4)));
      for (let j = 0; j < n; j++) {
        const x = 100 - chord / 2 - 2 + rand() * (chord + 4);
        const row = Math.round((x - vx) / spacing);
        const off = (x - (vx + row * spacing)) / half;
        if (Math.abs(off) > 1.02 || (Math.abs(off) > 0.8 && rand() < 0.4 * near)) {
          if (rand() < 0.25) dab('soil', band, `M${f1(x)} ${f1(y)}l${f1((rand() - 0.5) * len)} ${f1(-len * 0.3)}`);
          continue;
        }
        // Taller on the crown of the row, fanning out a little at its sides.
        const l = len * (0.6 + rand() * 0.5) * (1.1 - Math.min(1, Math.abs(off)) * 0.35);
        const lean = off * l * 0.12 + (x - vx) * 0.004 * l + (rand() - 0.5) * l * 0.12;
        const r = rand();
        const toSun = (sunX - x) * off > 0;
        const glow = Math.max(0, 1 - Math.abs(x - sunX) / 110) * Math.max(0, 1 - near * 1.6);
        let tone;
        if (Math.abs(off) < 0.45) tone = r < 0.2 + (1 - near) * 0.4 ? 'pale' : r < 0.75 ? 'light' : 'mid';
        else if (toSun) tone = r < 0.06 * (1 - near) + glow * 0.5 ? 'warm' : r < 0.55 ? 'light' : 'mid';
        else tone = r < 0.5 * near + 0.1 ? 'deep' : 'mid';
        dab(tone, band, `M${f1(x)} ${f1(y)}l${f1(lean)} ${f1(-l)}`);
      }
    }
    for (const tone of ['soil', 'deep', 'mid', 'light', 'pale', 'warm']) {
      for (let band = 0; band < 6; band++) {
        const d = dabs[`${tone} ${band}`];
        if (d) add(g, 'path', { d, 'stroke-width': (0.55 + band * 0.2).toFixed(2) }, ['pw-lav-dab', `is-${tone}`]);
      }
    }

    // The nearest stalks, painted flower by flower: a thin green stem, then little whorls
    // of buds that get smaller toward the tip.
    const oval = (x, y, rx, ry) => `M ${f1(x - rx)} ${f1(y)} a ${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0 a ${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0 Z `;
    const stems = [];
    const buds = { deep: '', mid: '', light: '', pale: '' };
    let lights = '';
    for (const [x0, top, bend] of [[18, 140, 5], [30, 150, -3], [41, 136, 4], [54, 152, 6], [67, 142, -4], [135, 146, 4], [147, 133, -6], [159, 148, 3], [171, 139, -2], [183, 152, -5], [84, 160, 3], [118, 158, -3]]) {
      const curve = [[x0, 206], [x0 + bend * 0.2, 190], [x0 + bend * 0.7, top + 16], [x0 + bend, top]];
      stems.push(brushPath(curve, 1, 0.45, 12));
      const flower = 0.4;
      let i = 0;
      for (let t = 1 - flower; t <= 1.001; t += 0.034, i++) {
        const [x, y] = bezier(curve, t);
        const size = 1 + (1 - (t - (1 - flower)) / flower) * 1.05;
        // A whorl every few steps, with a gap of stem between the lower ones.
        if (t < 1 - flower * 0.55 && i % 3 === 2) continue;
        for (const side of [-1, 0, 1]) {
          const bx = x + side * size * (0.75 + rand() * 0.3);
          const by = y + (rand() - 0.5) * size * 0.5 - Math.abs(side) * size * 0.2;
          const tone = side === 0 ? 'mid' : ['deep', 'mid', 'light'][Math.floor(rand() * 3)];
          buds[tone] += oval(bx, by, size * 0.58, size * 0.95);
          if (rand() < 0.45) lights += oval(bx - size * 0.15, by - size * 0.35, size * 0.22, size * 0.35);
        }
      }
      const [tx, ty] = bezier(curve, 1);
      buds.pale += oval(tx, ty - 0.8, 0.6, 1.2);
    }
    add(g, 'path', { d: stems.join(' ') }, 'pw-lav-stem');
    for (const tone of ['deep', 'mid', 'light', 'pale']) add(g, 'path', { d: buds[tone] }, ['pw-lav-bud', `is-${tone}`]);
    add(g, 'path', { d: lights }, 'pw-lav-bud-light');
  }

  // Jungle, painted in gouache: palm fronds in the shade behind, a banana leaf, monstera
  // leaves split and holed as they grow, a red hibiscus, and a blue morpho butterfly
  // resting in a patch of sun that comes down through the canopy.
  drawJungle(svg, add, R) {
    const url = (name) => `url(#${this.id(name)})`;
    const g = add(svg, 'g', { 'clip-path': url('dial-clip') });
    const rand = rng(67);
    const f2 = (v) => v.toFixed(2);
    const pt = ([x, y]) => `${f2(x)} ${f2(y)}`;
    this.gradient(add, 'radialGradient', 'jun-ground', { gradientUnits: 'userSpaceOnUse', cx: 104, cy: 92, r: 104 }, [['0%', '#3f6f43'], ['40%', '#1f4a33'], ['100%', '#081d15']]);
    this.gradient(add, 'radialGradient', 'jun-sun', { cx: '50%', cy: '50%', r: '50%' }, [['0%', 'rgba(244,255,190,0.32)'], ['100%', 'rgba(244,255,190,0)']]);
    this.gradient(add, 'linearGradient', 'jun-monstera', { x1: 0, y1: 0, x2: 0.4, y2: 1 }, [['0%', '#6fb468'], ['45%', '#3d8a4e'], ['100%', '#1f5a36']]);
    this.gradient(add, 'linearGradient', 'jun-monstera-dark', { x1: 0, y1: 0, x2: 0.4, y2: 1 }, [['0%', '#4d9157'], ['50%', '#2b6c42'], ['100%', '#164a2d']]);
    this.gradient(add, 'linearGradient', 'jun-banana', { x1: 0, y1: 0, x2: 1, y2: 0.3 }, [['0%', '#2f7a45'], ['55%', '#5aa157'], ['100%', '#88c069']]);
    this.gradient(add, 'linearGradient', 'jun-morpho', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', '#7fe0ff'], ['40%', '#2b8ff0'], ['100%', '#14309e']]);
    const blur = add(this.defs, 'filter', { id: this.id('jun-soft'), x: '-50%', y: '-50%', width: '200%', height: '200%' });
    add(blur, 'feGaussianBlur', { stdDeviation: 3 });
    const shade = add(this.defs, 'filter', { id: this.id('jun-shade'), x: '-20%', y: '-20%', width: '140%', height: '140%' });
    add(shade, 'feDropShadow', { dx: 1.2, dy: 2, stdDeviation: 1.8, 'flood-color': '#02100a', 'flood-opacity': 0.7 });

    // The shade of the forest, with sun coming down through a gap in the canopy.
    add(g, 'rect', { x: 0, y: 0, width: 200, height: 200, fill: url('jun-ground') });
    for (const [x, y, rx, ry] of [[96, 70, 46, 30], [124, 98, 30, 20], [70, 104, 22, 14]]) {
      add(g, 'ellipse', { cx: x, cy: y, rx, ry, fill: url('jun-sun') });
    }

    // A path like brushPath's, but as wide as the profile says along the way.
    const blade = (chain, W, profile, steps = 40) => {
      const left = [];
      const right = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const [x, y] = chainAt(chain, t);
        const [ax, ay] = chainAt(chain, Math.max(0, t - 0.004));
        const [bx, by] = chainAt(chain, Math.min(1, t + 0.004));
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const w = (W * profile(t)) / 2;
        left.push(pt([x - ((by - ay) / len) * w, y + ((bx - ax) / len) * w]));
        right.unshift(pt([x + ((by - ay) / len) * w, y - ((bx - ax) / len) * w]));
      }
      return `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
    };
    // Where a chain is at t, and which way it is heading.
    const frame = (chain, t) => {
      const [x, y] = chainAt(chain, t);
      const [ax, ay] = chainAt(chain, Math.max(0, t - 0.005));
      const [bx, by] = chainAt(chain, Math.min(1, t + 0.005));
      const len = Math.hypot(bx - ax, by - ay) || 1;
      return { x, y, tx: (bx - ax) / len, ty: (by - ay) / len };
    };

    // Heart-shaped leaves, the way taro and philodendron grow: a pointed tip, two rounded
    // lobes at the base and veins curving out from the midrib.
    const heartLeaf = (bx, by, toward, L, W, cls) => {
      const turn = (Math.atan2(toward[0] - bx, -(toward[1] - by)) * 180) / Math.PI;
      const leaf = add(g, 'g', { transform: `translate(${f2(bx)} ${f2(by)}) rotate(${f2(turn)})` });
      const h = W / 2;
      add(leaf, 'path', { d: `M 0 ${-L} C ${h * 0.55} ${-L * 0.78} ${h * 1.05} ${-L * 0.42} ${h * 0.96} ${-L * 0.05} C ${h * 0.9} ${L * 0.16} ${h * 0.42} ${L * 0.2} ${h * 0.12} ${L * 0.04} L 0 0 L ${-h * 0.12} ${L * 0.04} C ${-h * 0.42} ${L * 0.2} ${-h * 0.9} ${L * 0.16} ${-h * 0.96} ${-L * 0.05} C ${-h * 1.05} ${-L * 0.42} ${-h * 0.55} ${-L * 0.78} 0 ${-L} Z` }, ['pw-jun-heart', cls]);
      let v = `M 0 ${L * 0.02} Q ${L * 0.02} ${-L * 0.5} 0 ${-L * 0.96} `;
      for (const side of [-1, 1]) {
        for (let k = 0; k < 5; k++) {
          const y0 = -L * (0.08 + k * 0.17);
          v += `M 0 ${f2(y0)} Q ${f2(side * h * 0.45)} ${f2(y0 - L * 0.06)} ${f2(side * h * (0.8 - k * 0.12))} ${f2(y0 - L * (0.16 + k * 0.02))} `;
        }
      }
      add(leaf, 'path', { d: v }, ['pw-jun-heart-vein', cls]);
    };
    for (const [bx, by, tx, ty, L, W, cls] of [
      [126, -8, 112, 56, 62, 52, 'is-back'], [54, 132, 92, 78, 66, 54, 'is-back'], [158, 128, 122, 76, 64, 50, 'is-back'],
      [100, 214, 100, 136, 70, 58, 'is-back'], [-6, 58, 50, 40, 48, 40, 'is-back'], [200, 76, 150, 92, 48, 40, 'is-back'],
      [86, 118, 110, 66, 44, 36, 'is-mid'], [196, 196, 150, 160, 54, 44, 'is-mid'], [12, 104, 50, 92, 40, 32, 'is-mid'],
    ]) heartLeaf(bx, by, [tx, ty], L, W, cls);

    // Palm fronds far back in the shade: a stem with narrow leaflets down both sides.
    const frond = (curve, reach, cls) => {
      const chain = [curve];
      let d = brushPath(curve, 1.6, 0.4);
      for (let t = 0.06; t < 0.98; t += 0.034) {
        const f = frame(chain, t);
        const l = reach * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.08)), 0.7) * (0.85 + rand() * 0.25);
        for (const side of [-1, 1]) {
          const a = Math.atan2(f.ty, f.tx) + side * (0.95 + rand() * 0.2);
          const tip = [f.x + Math.cos(a) * l, f.y + Math.sin(a) * l];
          // The leaflets droop under their weight.
          const mid = [f.x + Math.cos(a) * l * 0.5, f.y + Math.sin(a) * l * 0.5 + l * 0.12];
          d += brushPath([[f.x, f.y], mid, mid, [tip[0], tip[1] + l * 0.12]], 2.6, 0.2, 8);
        }
      }
      add(g, 'path', { d }, ['pw-jun-frond', cls]);
    };
    frond([[214, 60], [184, 46], [156, 42], [124, 52]], 22, 'is-far');
    frond([[206, 200], [186, 170], [174, 142], [170, 110]], 22, 'is-far');
    frond([[-10, 146], [16, 132], [40, 128], [66, 134]], 20, 'is-mid');

    // A banana leaf from the left: a broad blade with a pale midrib, fine veins running out
    // from it to the edge, and the tears the wind has made between them.
    const banana = [[[-14, 92], [10, 70], [34, 50], [58, 30]], [[58, 30], [70, 20], [82, 14], [96, 12]]];
    const bananaProfile = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + t * 0.96)), 0.55) * (t < 0.05 ? t / 0.05 : 1);
    const bg = add(g, 'g', { filter: url('jun-shade') });
    add(bg, 'path', { d: blade(banana, 40, bananaProfile), fill: url('jun-banana') }, 'pw-jun-banana');
    let veins = '';
    let tears = '';
    for (let t = 0.04; t < 0.97; t += 0.022) {
      const f = frame(banana, t);
      const w = (40 * bananaProfile(t)) / 2;
      for (const side of [-1, 1]) {
        const nx = -f.ty * side;
        const ny = f.tx * side;
        // The veins sweep toward the tip as they go out.
        const ex = f.x + nx * w * 0.98 + f.tx * w * 0.32;
        const ey = f.y + ny * w * 0.98 + f.ty * w * 0.32;
        veins += `M ${pt([f.x, f.y])} L ${pt([ex, ey])} `;
        if (rand() < 0.16) {
          const depth = 0.35 + rand() * 0.5;
          const sx = f.x + nx * w * (1 - depth) + f.tx * w * 0.32 * (1 - depth);
          const sy = f.y + ny * w * (1 - depth) + f.ty * w * 0.32 * (1 - depth);
          tears += brushPath([[ex + nx, ey + ny], [ex, ey], [sx, sy], [sx, sy]], 1.3, 0.1, 6);
        }
      }
    }
    add(bg, 'path', { d: veins }, 'pw-jun-banana-vein');
    add(bg, 'path', { d: tears }, 'pw-jun-tear');
    add(bg, 'path', { d: brushPath(banana, 2.6, 0.6) }, 'pw-jun-banana-rib');

    // A monstera leaf: heart-shaped, with slits running in from the edge between its veins
    // and holes along the midrib. A mask cuts them, so what lies behind shows through.
    let leaves = 0;
    const monstera = (bx, by, toward, L, gradient, slits) => {
      const [tx, ty] = toward;
      const turn = (Math.atan2(tx - bx, -(ty - by)) * 180) / Math.PI;
      const leaf = add(g, 'g', { transform: `translate(${f2(bx)} ${f2(by)}) rotate(${f2(turn)})`, filter: url('jun-shade') });
      const a = 0.5 * L;
      const notch = 0.13 * L;
      const outline = [];
      for (let i = 0; i <= 96; i++) {
        const th = (i / 96) * 2 * Math.PI;
        const b = (th < Math.PI ? 0.49 : 0.46) * L;
        let x = b * Math.sin(th);
        let y = -0.5 * L - a * Math.cos(th);
        const tip = Math.max(0, 1 - Math.min(th, 2 * Math.PI - th) / 0.55);
        y -= 0.07 * L * tip * tip;
        x *= 1 - 0.25 * tip;
        y += notch * -Math.exp(-Math.pow((th - Math.PI) / 0.24, 2));
        outline.push([x, y]);
      }
      const edge = (th) => outline[Math.round((((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * 96)];
      const body = `M ${outline.map(pt).join(' L ')} Z`;
      const id = this.id(`jun-leaf-${leaves++}`);
      const mask = add(this.defs, 'mask', { id, maskUnits: 'userSpaceOnUse', x: -L, y: -1.3 * L, width: 2 * L, height: 1.6 * L });
      add(mask, 'path', { d: body, fill: '#fff' });
      const base = -notch;
      const rib = (k) => [0, base - (0.06 + k * 0.118) * 0.9 * L];
      const ribs = [];
      for (const side of [-1, 1]) {
        for (let k = 0; k < 7; k++) {
          const th = side > 0 ? 2.6 - k * 0.35 : 2 * Math.PI - (2.6 - k * 0.35);
          ribs.push({ side, k, from: rib(k), to: edge(th) });
        }
      }
      // Slits between the veins, from the edge most of the way to the midrib.
      for (const side of [-1, 1]) {
        const mine = ribs.filter((v) => v.side === side);
        for (let k = 0; k < 6; k++) {
          if (k >= slits || (k === 0 && L < 60)) continue;
          const A = mine[k];
          const B = mine[k + 1];
          const out = [(A.to[0] + B.to[0]) / 2 * 1.2, (A.to[1] + B.to[1]) / 2 - L * 0.02];
          const reach = 0.26 + rand() * 0.14;
          const inner = [(A.from[0] + B.from[0]) / 2 + (out[0] - (A.from[0] + B.from[0]) / 2) * reach, (A.from[1] + B.from[1]) / 2 + (out[1] - (A.from[1] + B.from[1]) / 2) * reach];
          const dx = out[0] - inner[0];
          const dy = out[1] - inner[1];
          const len = Math.hypot(dx, dy) || 1;
          const [nx, ny] = [-dy / len, dx / len];
          const wi = L * 0.006;
          const wo = L * (0.045 + rand() * 0.02);
          add(mask, 'path', { d: `M ${pt([inner[0] - nx * wi, inner[1] - ny * wi])} Q ${pt([inner[0] - nx * wi * 2 - dx * 0.05, inner[1] - ny * wi * 2 - dy * 0.05])} ${pt([inner[0] + nx * wi, inner[1] + ny * wi])} L ${pt([out[0] + nx * wo, out[1] + ny * wo])} L ${pt([out[0] - nx * wo, out[1] - ny * wo])} Z`, fill: '#000' });
          // An oval hole nearer the midrib.
          if (k > 0 && k < 5 && rand() < 0.75) {
            const hx = (A.from[0] + B.from[0]) / 2 + dx * -0.15 + (out[0] - inner[0]) * 0.0;
            const hy = (A.from[1] + B.from[1]) / 2;
            const cx = hx + side * L * 0.06;
            const cy = hy - L * 0.01;
            add(mask, 'ellipse', { cx: f2(cx), cy: f2(cy), rx: f2(L * (0.022 + rand() * 0.012)), ry: f2(L * (0.045 + rand() * 0.02)), transform: `rotate(${f2(side * (62 + rand() * 12))} ${f2(cx)} ${f2(cy)})`, fill: '#000' });
          }
        }
      }
      const cut = add(leaf, 'g', { mask: `url(#${id})` });
      add(cut, 'path', { d: body, fill: url(gradient) }, 'pw-jun-leaf');
      // Gouache: broad strokes of lighter and darker green across the leaf.
      let lightStrokes = '';
      for (let i = 0; i < 9; i++) {
        const y0 = -L * (0.1 + rand() * 0.8);
        const x0 = (rand() - 0.5) * L * 0.7;
        lightStrokes += brushPath([[x0, y0], [x0 + L * 0.1, y0 - L * 0.04], [x0 + L * 0.2, y0 - L * 0.06], [x0 + L * 0.3, y0 - L * 0.1]], L * 0.05, L * 0.01, 8);
      }
      add(cut, 'path', { d: lightStrokes }, 'pw-jun-leaf-stroke');
      let veinPath = '';
      for (const v of ribs) {
        const c = [(v.from[0] + v.to[0]) / 2, (v.from[1] + v.to[1]) / 2 - L * 0.06];
        veinPath += `M ${pt(v.from)} Q ${pt(c)} ${pt(v.to)} `;
      }
      add(cut, 'path', { d: veinPath, 'stroke-width': f2(L * 0.012) }, 'pw-jun-leaf-vein');
      add(cut, 'path', { d: brushPath([[0, base], [L * 0.01, base - L * 0.3], [-L * 0.01, -L * 0.7], [0, -L * 1.05]], L * 0.045, L * 0.008) }, 'pw-jun-leaf-rib');
      // The stalk, running off the dial.
      add(leaf, 'path', { d: brushPath([[0, base + L * 0.02], [L * 0.02, L * 0.25], [L * 0.05, L * 0.5], [L * 0.08, L * 0.8]], L * 0.045, L * 0.06) }, 'pw-jun-stalk');
    };
    monstera(176, 36, [112, 74], 74, 'jun-monstera-dark', 6);
    monstera(206, 118, [150, 116], 46, 'jun-monstera-dark', 4);
    monstera(28, 188, [86, 118], 84, 'jun-monstera', 6);

    // A hibiscus: five crinkled petals, red at the heart, and a long column of stamens.
    const [hx, hy, hr] = [144, 154, 19];
    this.gradient(add, 'radialGradient', 'jun-petal', { gradientUnits: 'userSpaceOnUse', cx: hx, cy: hy, r: hr }, [['0%', '#7d0f2a'], ['22%', '#c3233d'], ['60%', '#ef5246'], ['100%', '#ff9a7c']]);
    const flower = add(g, 'g', { filter: url('jun-shade') });
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 18 + (rand() - 0.5) * 10) * (Math.PI / 180);
      const spread = 0.78;
      const p = (ang, rr) => [hx + Math.cos(ang) * rr, hy + Math.sin(ang) * rr];
      let d = `M ${pt([hx, hy])} `;
      d += `C ${pt(p(a - spread * 0.4, hr * 0.5))} ${pt(p(a - spread, hr * 0.85))} ${pt(p(a - spread * 0.7, hr))} `;
      for (let j = 1; j <= 4; j++) d += `Q ${pt(p(a - spread * 0.7 + (j - 0.5) * spread * 0.35, hr * (1.08 + (j % 2) * 0.05)))} ${pt(p(a - spread * 0.7 + j * spread * 0.35, hr * (0.98 + rand() * 0.06)))} `;
      d += `C ${pt(p(a + spread, hr * 0.85))} ${pt(p(a + spread * 0.4, hr * 0.5))} ${pt([hx, hy])} Z`;
      add(flower, 'path', { d, fill: url('jun-petal') }, 'pw-jun-petal');
      add(flower, 'path', { d: `M ${pt(p(a, hr * 0.15))} Q ${pt(p(a + 0.1, hr * 0.5))} ${pt(p(a + 0.05, hr * 0.88))}` }, 'pw-jun-petal-vein');
    }
    // The deep red heart, where the petals overlap.
    add(flower, 'circle', { cx: hx, cy: hy, r: hr * 0.42, fill: url('jun-petal') });
    let heart = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 + 18) * (Math.PI / 180);
      heart += `M ${pt([hx, hy])} L ${pt([hx + Math.cos(a) * hr * 0.4, hy + Math.sin(a) * hr * 0.4])} `;
    }
    add(flower, 'path', { d: heart }, 'pw-jun-petal-vein');
    const column = [[hx, hy], [hx - 4, hy - 6], [hx - 9, hy - 10], [hx - 15, hy - 13]];
    add(flower, 'path', { d: brushPath(column, 1.4, 0.9, 10) }, 'pw-jun-column');
    let pollen = '';
    for (let i = 0; i < 12; i++) {
      const [px, py] = bezier(column, 0.55 + rand() * 0.4);
      pollen += circlePath(f2(px + (rand() - 0.5) * 3.4), f2(py + (rand() - 0.5) * 3.4), '0.55');
    }
    add(flower, 'path', { d: pollen }, 'pw-jun-pollen');
    let stigma = '';
    for (let i = 0; i < 5; i++) stigma += circlePath(f2(hx - 15.6 + Math.cos(i * 1.26) * 1.4), f2(hy - 13.4 + Math.sin(i * 1.26) * 1.4), '0.7');
    add(flower, 'path', { d: stigma }, 'pw-jun-stigma');

    // A blue morpho butterfly, wings open in the sun.
    const morpho = add(g, 'g', { transform: 'translate(62 70) rotate(-24) scale(0.68)', filter: url('jun-shade') });
    for (const side of [-1, 1]) {
      const wing = add(morpho, 'g', { transform: `scale(${side} 1)` });
      add(wing, 'path', { d: 'M 0.6 -1 C 4 -9 12 -15 19 -13.5 C 21 -10 19 -5 16 -1.5 C 10 1 4 1 0.6 0.6 Z' }, 'pw-jun-wing-edge');
      add(wing, 'path', { d: 'M 0.8 -1 C 4 -8 11 -12.6 17 -11.6 C 18 -9 16.5 -5.5 14 -2.6 C 9 -0.4 4 -0.2 0.8 0.2 Z', fill: url('jun-morpho') });
      add(wing, 'path', { d: 'M 0.6 0.8 C 5 0.6 12 1.6 14 5 C 14.6 9 11 13 6.5 13 C 3 12 1 7 0.6 0.8 Z' }, 'pw-jun-wing-edge');
      add(wing, 'path', { d: 'M 0.8 1.2 C 5 1.2 10.6 2.4 12.2 5.2 C 12.6 8.4 10 11 6.6 11.2 C 3.6 10.4 1.6 6.6 0.8 1.2 Z', fill: url('jun-morpho') });
      add(wing, 'path', { d: circlePath(16.4, -10.4, 0.7) + circlePath(14.6, -11.6, 0.5) + circlePath(12.6, 9.6, 0.5) }, 'pw-jun-wing-spot');
    }
    add(morpho, 'ellipse', { cx: 0, cy: 0.6, rx: 0.9, ry: 6.2 }, 'pw-jun-body');
    add(morpho, 'path', { d: 'M -0.3 -5.2 Q -2 -9 -4 -11 M 0.3 -5.2 Q 2 -9 4 -11' }, 'pw-jun-antenna');

    // Sun dappling the leaves.
    for (let i = 0; i < 7; i++) {
      add(g, 'ellipse', { cx: f2(40 + rand() * 130), cy: f2(30 + rand() * 140), rx: f2(5 + rand() * 9), ry: f2(3 + rand() * 5), filter: url('jun-soft') }, 'pw-jun-dapple');
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
    pomo.dots = [];
    this.parts.pomo = pomo;
    if (this.mini) return;
    pomo.readout = text(svg, 100, 100 + 12.5 * k, 10 * k, '', 'pw-pomo-readout');
    pomo.caption = text(svg, 100, 100 + 20.5 * k, 3.9 * k, '', 'pw-pomo-caption');
    const n = clamp(this.plugin.settings.longBreakEvery, 1, 8);
    for (let i = 0; i < n; i++) {
      const x = 100 + (i - (n - 1) / 2) * 4.6 * k;
      pomo.dots.push(add(svg, 'circle', { cx: x, cy: 100 + 26 * k, r: 1.35 * k }, 'pw-pomo-dot'));
    }
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
    if (pomo.readout) {
      setText(pomo.readout, readout);
      setText(pomo.caption, caption);
    }
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
      const opening = face.window || face.tourbillon;
      const windowHour = opening ? SLOTS.find((x) => x.key === opening).hour : -1;
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

  // A flying tourbillon in an opening in the dial: the cage carrying the balance, the
  // escapement and the hairspring turns once a minute over a fixed wheel, and one of its
  // arms is blued and points to the seconds on a scale printed round the opening. The
  // balance swings and the escape wheel turns inside it while the movement runs.
  drawTourbillon(svg, add, cx, cy, r, now) {
    const url = (name) => `url(#${this.id(name)})`;
    const s = this.plugin.settings;
    const scale = (r / 30).toFixed(4);
    const place = `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${scale})`;
    this.gradient(add, 'radialGradient', 'tb-plate', { cx: '40%', cy: '35%', r: '75%' }, [['0%', '#5d6570'], ['100%', '#1f242b']]);
    this.gradient(add, 'linearGradient', 'tb-steel', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', '#fafbfc'], ['50%', '#c8ced6'], ['100%', '#7a828d']]);
    this.gradient(add, 'linearGradient', 'tb-blued', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', '#7fa4e8'], ['50%', '#2c56b0'], ['100%', '#14285a']]);
    this.gradient(add, 'linearGradient', 'tb-gold', { x1: 0, y1: 0, x2: 1, y2: 1 }, [['0%', '#f7e4a8'], ['50%', '#d2a54e'], ['100%', '#8a6325']]);
    this.gradient(add, 'radialGradient', 'tb-vignette', { cx: '50%', cy: '50%', r: '50%' }, [['62%', 'rgba(0,0,0,0)'], ['100%', 'rgba(0,0,0,0.65)']]);
    this.gradient(add, 'linearGradient', 'tb-sapphire', { x1: 0, y1: 0, x2: 0.6, y2: 1 }, [['0%', 'rgba(255,255,255,0.24)'], ['100%', 'rgba(255,255,255,0)']]);
    const fade = add(this.defs, 'filter', { id: this.id('tb-fade'), x: '-30%', y: '-30%', width: '160%', height: '160%' });
    add(fade, 'feGaussianBlur', { stdDeviation: 3 });
    const lift = add(this.defs, 'filter', { id: this.id('tb-lift'), x: '-30%', y: '-30%', width: '160%', height: '160%' });
    add(lift, 'feDropShadow', { dx: 0.8, dy: 1.4, stdDeviation: 0.8, 'flood-color': '#000', 'flood-opacity': 0.6 });
    add(add(this.defs, 'clipPath', { id: this.id('tb-window') }), 'circle', { cx: 0, cy: 0, r: 30 });

    // The seconds scale printed round the opening, and the dial falling away into it.
    const outer = add(svg, 'g', { transform: place });
    let fine = '';
    let major = '';
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 * Math.PI) / 180;
      const big = i % 15 === 0;
      const r2 = big ? 36 : i % 5 === 0 ? 34.6 : 33.4;
      const seg = `M ${(31.8 * Math.sin(a)).toFixed(2)} ${(-31.8 * Math.cos(a)).toFixed(2)} L ${(r2 * Math.sin(a)).toFixed(2)} ${(-r2 * Math.cos(a)).toFixed(2)} `;
      if (i % 5 === 0) major += seg;
      else fine += seg;
    }
    add(outer, 'path', { d: fine }, ['pw-tb-scale', 'is-fine']);
    add(outer, 'path', { d: major }, 'pw-tb-scale');
    add(outer, 'circle', { cx: 0, cy: 0, r: 30, filter: url('tb-fade') }, 'pw-window-fade');

    // Under the cage: the plate, grained in circles, and the fixed wheel the cage runs round.
    const under = add(outer, 'g', { 'clip-path': url('tb-window') });
    add(under, 'circle', { cx: 0, cy: 0, r: 31, fill: url('tb-plate') });
    for (let rr = 1.5; rr < 30; rr += 0.9) add(under, 'circle', { cx: 0, cy: 0, r: rr }, 'pw-tb-graining');
    let ring = '';
    for (let i = 0; i < 80; i++) {
      const a0 = (i / 80) * 2 * Math.PI;
      const step = (2 * Math.PI) / 80;
      const at = (rr, a) => `${(rr * Math.sin(a)).toFixed(2)} ${(-rr * Math.cos(a)).toFixed(2)}`;
      ring += `${i ? 'L' : 'M'} ${at(26.2, a0)} L ${at(27.6, a0 + step * 0.2)} L ${at(27.6, a0 + step * 0.5)} L ${at(26.2, a0 + step * 0.7)} `;
    }
    ring += `Z ${circlePath(0, 0, 23.6)}`;
    add(under, 'path', { d: ring, 'fill-rule': 'evenodd', fill: url('tb-gold'), filter: url('tb-lift') }, 'pw-tb-wheel');
    add(under, 'circle', { cx: 0, cy: 0, r: 25 }, 'pw-tb-wheel-ring');

    // The cage, turned by update() or swept round once a minute.
    const turnEl = add(svg, 'g', {}, 'pw-turn');
    turnEl.style.transformOrigin = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
    const live = { type: 'cage', el: turnEl, sweep: s.movement !== 'still' };
    this.parts.live.push(live);
    if (live.sweep) sweep(turnEl, now);
    else turn(turnEl, now.getSeconds() * 6);
    const cage = add(turnEl, 'g', { transform: place, filter: url('tb-lift') });
    // The lower frame of the cage.
    add(cage, 'circle', { cx: 0, cy: 0, r: 21.6 }, 'pw-tb-frame');
    // The escape wheel, whose pinion runs round the fixed wheel, and the pallet fork.
    const escape = add(cage, 'g', {}, ['pw-mv-spin', 'is-escape']);
    add(escape, 'path', { d: gearPath(0, 19, 5.2, 15, true), 'fill-rule': 'evenodd', fill: url('tb-steel') }, 'pw-mv-steel');
    const fork = add(cage, 'g', {}, 'pw-mv-fork');
    add(fork, 'circle', { cx: 0, cy: 13.5, r: 6, fill: 'none' });
    add(fork, 'path', { d: 'M -3.2 16.6 L 0 11.4 L 3.2 16.6 M 0 11.4 L 0 7.6' }, ['pw-mv-lever', 'is-outline']);
    add(fork, 'path', { d: 'M -3.2 16.6 L 0 11.4 L 3.2 16.6 M 0 11.4 L 0 7.6' }, 'pw-mv-lever');
    // The blued hairspring, breathing with the balance.
    const spring = add(cage, 'g', {}, 'pw-mv-hairspring');
    add(spring, 'circle', { cx: 0, cy: 0, r: 9.5, fill: 'none' });
    let d = '';
    for (let t = 0; t <= 18 * Math.PI; t += 0.2) {
      const rr = 1.8 + (t / (18 * Math.PI)) * 7.2;
      d += `${d ? ' L' : 'M'} ${(rr * Math.cos(t)).toFixed(2)} ${(rr * Math.sin(t)).toFixed(2)}`;
    }
    add(spring, 'path', { d }, 'pw-mv-spring');
    // The balance: a gold rim with timing screws on two arms.
    const balance = add(cage, 'g', {}, 'pw-mv-balance');
    add(balance, 'circle', { cx: 0, cy: 0, r: 14.6, fill: 'none' });
    add(balance, 'circle', { cx: 0, cy: 0, r: 12.4, fill: 'none', stroke: url('tb-gold') }, 'pw-mv-rim');
    add(balance, 'circle', { cx: 0, cy: 0, r: 13.5 }, 'pw-mv-rim-shine');
    add(balance, 'path', { d: 'M -11.4 0 L 11.4 0', stroke: url('tb-gold') }, 'pw-mv-arm');
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      add(balance, 'circle', { cx: (13.8 * Math.cos(a)).toFixed(2), cy: (13.8 * Math.sin(a)).toFixed(2), r: 0.8, fill: url('tb-gold') }, 'pw-mv-rim-screw');
    }
    // The upper cage: three arms like a lyre, polished, meeting at a jewelled hub. The arm
    // at the top is blued and runs out to point at the seconds.
    for (let i = 0; i < 3; i++) {
      const g = add(cage, 'g', { transform: `rotate(${i * 120})` });
      const arm = 'M -1.6 -3 C -4.6 -9 -5.4 -15 -2.6 -21.8 L 2.6 -21.8 C 5.4 -15 4.6 -9 1.6 -3 Z M -1.2 -8 C -2.6 -12 -2.6 -15.5 -1 -19 L 1 -19 C 2.6 -15.5 2.6 -12 1.2 -8 Z';
      add(g, 'path', { d: arm, 'fill-rule': 'evenodd', fill: url(i ? 'tb-steel' : 'tb-blued') }, 'pw-tb-arm');
      add(g, 'circle', { cx: 0, cy: -21.6, r: 1.3 }, 'pw-mv-screw');
      if (!i) add(g, 'path', { d: 'M -1 -22 L 0 -29 L 1 -22 Z', fill: url('tb-blued') }, 'pw-tb-arm');
    }
    add(cage, 'circle', { cx: 0, cy: 0, r: 21.6 }, 'pw-tb-frame-top');
    add(cage, 'circle', { cx: 0, cy: 0, r: 3.6, fill: url('tb-steel') }, 'pw-tb-arm');
    add(cage, 'circle', { cx: 0, cy: 0, r: 2.3, fill: url('tb-gold') }, 'pw-mv-chaton');
    add(cage, 'circle', { cx: 0, cy: 0, r: 1.25 }, 'pw-mv-ruby');
    add(cage, 'circle', { cx: -0.45, cy: -0.45, r: 0.4 }, 'pw-mv-glint');

    // The sapphire over it all, and the polished edge of the opening.
    const top = add(svg, 'g', { transform: place });
    add(top, 'circle', { cx: 0, cy: 0, r: 30, fill: url('tb-vignette') });
    add(top, 'path', { d: 'M -27 -9 A 28.5 28.5 0 0 1 9 -27 A 34 34 0 0 0 -27 -9 Z', fill: url('tb-sapphire') });
    add(top, 'circle', { cx: 0, cy: 0, r: 30 }, 'pw-window-edge');
    add(top, 'circle', { cx: 0, cy: 0, r: 30, fill: 'none', stroke: url('metal') }, ['pw-window-rim', 'is-fine']);
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
    // Small, as in a tab bar, a digital watch shows just the time.
    const layout = shaped ? style : this.mini ? 'compact' : DIGITAL_LAYOUTS[s.digitalLayout] ? s.digitalLayout : 'wide';
    const box = this.faceEl.createDiv({ cls: ['pocket-watch-digital', `pw-d-${style}`, `pw-l-${layout}`] });
    if (this.mini) box.addClass('is-mini');
    if (s.blinkColon) box.addClass('pw-blink');
    box.style.fontSize = `${(this.size / 120) * 13}px`;
    if (SQUARE_STYLES.includes(style)) {
      this.buildSquare(box, style);
      return;
    }
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

  // The square styles draw themselves; update() moves them along with updateSquare().
  buildSquare(box, style) {
    const s = this.plugin.settings;
    const sq = (this.parts.square = { style, mini: !!this.mini });
    if (style === 'pixel' && sq.mini) {
      // Small, the lights make a single line, the hours and minutes side by side.
      const svg = box.createSvg('svg', { attr: { viewBox: '0 0 190 70' }, cls: 'pw-px-screen' });
      sq.cols = 19;
      sq.cells = [];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 19; col++) {
          sq.cells.push(svg.createSvg('circle', { attr: { cx: col * 10 + 5, cy: row * 10 + 5, r: 4 }, cls: 'pw-px' }));
        }
      }
      for (const cy of [25, 45]) svg.createSvg('circle', { attr: { cx: 95, cy, r: 4 }, cls: ['pw-px', 'is-on', 'pw-d-colon'] });
      return;
    }
    if (style === 'terminal') {
      // A green screen: a prompt, the time large, the date, a bar of hashes that fills toward
      // your goal or runs down with a session, and what you're doing, with the cursor after it.
      // Small, just the time and the cursor.
      const screen = box.createDiv('pw-tm-screen');
      if (!sq.mini) screen.createDiv({ cls: ['pw-tm-line', 'is-prompt'], text: '~ $ now' });
      const big = screen.createDiv('pw-tm-big');
      sq.hm = big.createSpan();
      // The seconds over am or pm, small beside the time.
      const side = big.createSpan('pw-tm-side');
      if (s.digitalSeconds && !sq.mini) sq.ss = side.createSpan();
      sq.ampm = side.createSpan();
      if (sq.mini) {
        big.createSpan('pw-tm-cursor');
        return;
      }
      sq.date = screen.createDiv('pw-tm-line');
      if (s.digitalBar) sq.bar = screen.createDiv({ cls: ['pw-tm-line', 'is-bar'] });
      const status = screen.createDiv({ cls: ['pw-tm-line', 'is-status'] });
      status.createSpan({ cls: 'pw-tm-arrow', text: '> ' });
      sq.status = status.createSpan();
      status.createSpan('pw-tm-cursor');
      return;
    }
    if (style === 'words' && sq.mini) {
      // Small, just the words that are lit, on two lines.
      sq.lines = [box.createDiv('pw-w-line'), box.createDiv({ cls: ['pw-w-line', 'is-hour'] })];
      return;
    }
    if (style === 'tomato') {
      // A ring round the edge for the session, a small tomato with the session's name, the
      // time left large, a dot for each session until the long break, and the time below.
      const svg = box.createSvg('svg', { attr: { viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, cls: 'pw-t-ring' });
      const d = 'M 50 3 H 79 A 18 18 0 0 1 97 21 V 79 A 18 18 0 0 1 79 97 H 21 A 18 18 0 0 1 3 79 V 21 A 18 18 0 0 1 21 3 Z';
      svg.createSvg('path', { attr: { d }, cls: 'pw-t-track' });
      sq.ring = svg.createSvg('path', { attr: { d, pathLength: 100, 'stroke-dasharray': '0 100' }, cls: 'pw-t-progress' });
      if (s.dialText) {
        const [x0, y0, x1, y1] = MONOGRAM.box;
        box.createSvg('svg', { attr: { viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}` }, cls: 'pw-d-brand' })
          .createSvg('path', { attr: { d: MONOGRAM.path } });
      }
      const head = box.createDiv('pw-t-head');
      const icon = head.createSvg('svg', { attr: { viewBox: '0 0 20 20' }, cls: 'pw-t-icon' });
      icon.createSvg('circle', { attr: { cx: 10, cy: 11.5, r: 7 }, cls: 'pw-t-fruit' });
      icon.createSvg('path', { attr: { d: 'M 10 5.2 L 7 2.8 L 8.6 5.6 L 5.2 5.4 L 8.4 6.8 L 10 9 L 11.6 6.8 L 14.8 5.4 L 11.4 5.6 L 13 2.8 Z' }, cls: 'pw-t-leaf' });
      sq.caption = head.createSpan('pw-t-caption');
      sq.big = box.createDiv('pw-t-big');
      const dots = box.createDiv('pw-t-dots');
      sq.dots = [];
      for (let i = 0; i < clamp(s.longBreakEvery, 1, 8); i++) sq.dots.push(dots.createSpan('pw-t-dot'));
      sq.foot = box.createDiv('pw-t-foot');
    } else if (style === 'pixel') {
      // Fifteen by fifteen lights: the hours over the minutes, a row along the bottom that
      // fills toward your goal or with a session, and with seconds a light running round the edge.
      const glass = box.createDiv('pw-px-glass');
      const svg = glass.createSvg('svg', { attr: { viewBox: '0 0 150 150' }, cls: 'pw-px-screen' });
      sq.cols = 15;
      sq.cells = [];
      for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
          sq.cells.push(svg.createSvg('circle', { attr: { cx: col * 10 + 5, cy: row * 10 + 5, r: 4 }, cls: 'pw-px' }));
        }
      }
      sq.colon = svg.createSvg('circle', { attr: { cx: 75, cy: 65, r: 4 }, cls: ['pw-px', 'is-on', 'pw-d-colon'] });
      sq.ampm = glass.createDiv('pw-px-ampm');
    } else {
      // Eleven by eleven letters that spell out the time, and a light in each corner for the
      // minutes since the last five.
      const glass = box.createDiv('pw-w-glass');
      const grid = glass.createDiv('pw-w-grid');
      sq.cells = [];
      for (const line of WORD_GRID) for (const ch of line) sq.cells.push(grid.createSpan({ cls: 'pw-w-cell', text: ch }));
      sq.corners = ['tl', 'tr', 'br', 'bl'].map((at) => glass.createSpan({ cls: 'pw-w-corner', attr: { 'data-at': at } }));
    }
  }

  updateSquare(now, progress) {
    const p = this.plugin;
    const s = p.settings;
    const sq = this.parts.square;
    const h = now.getHours();
    const m = now.getMinutes();
    if (sq.style === 'tomato') {
      const x = p.session;
      const every = Math.max(1, s.longBreakEvery);
      let big;
      let caption;
      let foot;
      const clock = this.h24 ? `${pad2(h)}:${pad2(m)}` : `${h % 12 || 12}:${pad2(m)}`;
      if (x) {
        const secs = Math.ceil(p.sessionRemaining() / 1000);
        big = `${Math.floor(secs / 60)}:${pad2(secs % 60)}`;
        caption = x.paused ? 'Paused' : x.kind === 'focus' ? 'Focus' : x.kind === 'long' ? 'Long break' : 'Break';
        foot = clock;
      } else if (p.alert) {
        const over = Math.floor((Date.now() - p.alert.endedAt) / 60000);
        big = over >= 1 ? `+${over}` : '0:00';
        caption = p.alert.kind === 'focus' ? 'Break time' : 'Focus time';
        foot = clock;
      } else {
        big = clock;
        caption = `Ready · ${s.focusMinutes} min`;
        foot = fmtShort(p.getDay(dayKey(now)).ms);
      }
      setText(sq.big, big);
      setText(sq.caption, caption);
      setText(sq.foot, foot);
      setIfChanged(sq.ring, 'stroke-dasharray', `${(progress * 100).toFixed(2)} 100`);
      const done = x && x.kind === 'long' ? every : p.cycle % every;
      sq.dots.forEach((dot, i) => setIfChanged(dot, 'class', `pw-t-dot${i < done ? ' is-done' : x && x.kind === 'focus' && i === done ? ' is-now' : ''}`));
    } else if (sq.style === 'pixel') {
      const on = new Set();
      const hh = this.h24 ? pad2(h) : String(h % 12 || 12).padStart(2, ' ');
      const draw = (digits, top, left) => [...digits].forEach((ch, i) => {
        const rows = PIXEL_DIGITS[ch];
        if (!rows) return;
        rows.forEach((bits, r) => [...bits].forEach((bit, c) => {
          if (bit === '1') on.add((top + r) * sq.cols + left + i * 4 + c);
        }));
      });
      if (sq.mini) {
        draw(hh, 1, 1);
        draw(pad2(m), 1, 11);
      } else {
        draw(hh, 1, 4);
        draw(pad2(m), 7, 4);
      }
      const bar = new Set();
      if (s.digitalBar && !sq.mini) {
        const lit = Math.round(progress * 13);
        for (let c = 0; c < lit; c++) bar.add(13 * 15 + 1 + c);
      }
      // The seconds run round the edge, one light at a time.
      let sec = -1;
      if (s.digitalSeconds && !sq.mini) {
        const edge = [];
        for (let c = 0; c < 14; c++) edge.push(c);
        for (let r = 0; r < 14; r++) edge.push(r * 15 + 14);
        for (let c = 14; c > 0; c--) edge.push(14 * 15 + c);
        for (let r = 14; r > 0; r--) edge.push(r * 15);
        sec = edge[Math.floor((now.getSeconds() / 60) * edge.length)];
      }
      sq.cells.forEach((cell, i) => setIfChanged(cell, 'class', `pw-px${on.has(i) ? ' is-on' : bar.has(i) ? ' is-bar' : i === sec ? ' is-sec' : ''}`));
      if (sq.ampm) setText(sq.ampm, this.h24 ? '' : h < 12 ? 'AM' : 'PM');
    } else if (sq.style === 'terminal') {
      setText(sq.hm, `${this.h24 ? pad2(h) : h % 12 || 12}:${pad2(m)}`);
      if (sq.ss) setText(sq.ss, pad2(now.getSeconds()));
      setText(sq.ampm, this.h24 ? '' : h < 12 ? 'am' : 'pm');
      if (sq.mini) return;
      setText(sq.date, now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toLowerCase());
      if (sq.bar) {
        const part = clamp(progress, 0, 1);
        const lit = Math.round(part * 10);
        setText(sq.bar, `[${'#'.repeat(lit)}${'.'.repeat(10 - lit)}] ${Math.round(part * 100)}%`);
      }
      const x = p.session;
      let status;
      if (x) {
        const secs = Math.ceil(p.sessionRemaining() / 1000);
        status = `${x.paused ? 'paused' : x.kind === 'focus' ? 'focus' : 'break'} ${Math.floor(secs / 60)}:${pad2(secs % 60)}`;
      } else if (p.alert) {
        status = p.alert.kind === 'focus' ? 'break time' : 'focus time';
      } else {
        status = `today ${fmtShort(p.getDay(dayKey(now)).ms)}`;
      }
      setText(sq.status, status);
    } else if (sq.mini) {
      // "twenty five to" over "three", or "three" over "o'clock".
      const words = timeWords(h, m).slice(2).filter((w) => w !== 'minutes');
      const hour = words.find((w) => w.startsWith('h'));
      const name = HOUR_WORDS[Number(hour.slice(1))];
      const rest = words.filter((w) => w !== hour && w !== 'oclock').join(' ');
      setText(sq.lines[0], rest || name);
      setText(sq.lines[1], rest ? name : "o'clock");
    } else {
      const lit = new Set();
      for (const word of timeWords(h, m)) {
        const [row, col, len] = WORDS[word];
        for (let i = 0; i < len; i++) lit.add(row * 11 + col + i);
      }
      sq.cells.forEach((cell, i) => setIfChanged(cell, 'class', `pw-w-cell${lit.has(i) ? ' is-on' : ''}`));
      sq.corners.forEach((corner, i) => corner.toggleClass('is-on', i < m % 5));
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
    if (Platform.isPhone) return { header: true, spot: 'c' };
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
    const top = header ? Math.max(r.top + header.offsetHeight, header.getBoundingClientRect().bottom) : r.top;
    return { left: r.left, top, right: r.right, bottom: Math.min(r.bottom, this.safeBottom()), scrollbar: 6 };
  }

  windowBox() {
    const r = (document.querySelector('.app-container') || document.body).getBoundingClientRect();
    return { left: r.left, top: Math.max(r.top, safeInsets().top), right: r.right, bottom: Math.min(r.bottom, this.safeBottom()), scrollbar: 0 };
  }

  // How far down the watch and the shelf can go: above a phone's bar of buttons at the bottom
  // and its system bar.
  safeBottom() {
    const H = window.innerHeight;
    const bottom = H - safeInsets().bottom;
    if (!Platform.isMobile) return bottom;
    if (this.bottomAt && Date.now() - this.bottomAt.t < 500 && this.bottomAt.h === H) return this.bottomAt.y;
    // Looking up from the bottom of the screen, the note starts where the phone's floating bar
    // of buttons and its gesture bar end.
    const mine = (e) => this.el.contains(e) || (this.shelfEl && this.shelfEl.contains(e)) || (this.ghostEl && this.ghostEl.contains(e));
    let edge = H;
    let clear = 0;
    for (let y = H - 2; y > H * 0.6 && clear < 40; y -= 6) {
      const el = document.elementsFromPoint(window.innerWidth / 2, y).find((e) => !mine(e));
      if (el && el.closest('.workspace-leaf-content') && !el.closest('.view-header')) clear += 6;
      else {
        clear = 0;
        edge = y;
      }
    }
    const found = Math.min(bottom, edge >= H - 2 ? H : edge - 6);
    this.bottomAt = { t: Date.now(), h: H, y: found };
    return found;
  }

  // On a phone, the bar at the top of the note you're in, with its floating buttons.
  headerEl() {
    if (!Platform.isPhone) return null;
    const visible = (e) => e && e.offsetParent !== null && e.getBoundingClientRect().height > 0;
    const active = document.querySelector('.workspace-split.mod-root .workspace-leaf.mod-active .view-header');
    if (visible(active)) return active;
    return Array.from(document.querySelectorAll('.workspace-split.mod-root .view-header')).find(visible) || null;
  }

  // The widest free room in that bar, between its buttons and any title, and as tall as its
  // buttons.
  headerBox(header) {
    const r = header.getBoundingClientRect();
    const parts = [];
    for (const el of header.querySelectorAll('.clickable-icon, button, .view-header-title, .view-header-breadcrumb, .view-header-title-parent')) {
      if (el.offsetParent === null) continue;
      let b = el.getBoundingClientRect();
      // A title takes as much room as its words, not the whole width it's given.
      if (!el.matches('.clickable-icon, button')) {
        const range = document.createRange();
        range.selectNodeContents(el);
        b = range.getBoundingClientRect();
      }
      if (b.width > 0 && b.height > 0) parts.push(b);
    }
    // Room round each button, for the rounded island it sits in.
    const pad = 12;
    const blocks = parts.map((b) => [b.left - pad, b.right + pad]).sort((a, b) => a[0] - b[0]);
    let x = r.left + 6;
    let best = null;
    for (const [a, b] of blocks) {
      if (!best || a - x > best.right - best.left) best = { left: x, right: a };
      x = Math.max(x, b);
    }
    if (!best || r.right - 6 - x > best.right - best.left) best = { left: x, right: r.right - 6 };
    const buttons = parts.filter((b) => b.height < r.height + 1);
    const tall = buttons.length ? Math.max(...buttons.map((b) => b.height)) : r.height - 8;
    const mid = buttons.length ? buttons.reduce((sum, b) => sum + b.top + b.height / 2, 0) / buttons.length : r.top + r.height / 2;
    const h = clamp(tall + 6, 28, 46);
    return { left: best.left, right: Math.max(best.left, best.right), top: mid - h / 2, bottom: mid + h / 2 };
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
    // On a phone, drop it on the bar at the top of the note to tuck it in there.
    const header = this.headerEl();
    if (header && py <= header.getBoundingClientRect().bottom + 16) {
      const box = this.headerBox(header);
      const scale = this.headerFit(box) / this.el.offsetHeight;
      const w = this.el.offsetWidth * scale;
      const h = this.el.offsetHeight * scale;
      let best = null;
      for (const spot of ['l', 'c', 'r']) {
        const xy = this.trayXY(box, spot, w, h);
        const d = Math.abs(xy.x + w / 2 - px);
        if (!best || d < best.d) best = { header: true, spot, xy, d, w, h };
      }
      return best;
    }
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

  headerFit(box) {
    const s = this.plugin.settings;
    return (box.bottom - box.top) * (s.watchType === 'digital' && s.digitalStyle === 'hairline' ? 0.8 : 1);
  }

  // How tall the watch is in the tab bar or header it sits in; 0 when it isn't in one.
  trayHeight() {
    const a = this.plugin.settings.watchAnchor;
    if (a && a.header) {
      const header = this.headerEl();
      return header ? this.headerFit(this.headerBox(header)) : 0;
    }
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
      if (a && a.header) {
        const header = this.headerEl();
        xy = header ? this.trayXY(this.headerBox(header), a.spot) : this.freeSpot(DEFAULT_WATCH_POS);
      } else if (a && a.tray) {
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
    if (a && a.header) {
      setIfChanged(this.badgeEl, 'data-side', 'below');
      return;
    }
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
    const top = safeInsets().top;
    return { x: pos.fx * Math.max(0, window.innerWidth - w), y: top + pos.fy * Math.max(0, this.safeBottom() - top - h) };
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
    // On a touch screen, a long press opens the menu that a right-click opens elsewhere.
    let pressed = false;
    const press = e.pointerType === 'touch' ? window.setTimeout(() => {
      if (this.dragging || Date.now() - (this.plugin.menuAt || 0) < 800) return;
      pressed = true;
      this.plugin.showWatchMenu(e);
    }, 500) : null;

    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!this.dragging && Math.hypot(dx, dy) < (e.pointerType === 'touch' ? 8 : 4)) return;
      window.clearTimeout(press);
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
      window.clearTimeout(press);
      if (!this.dragging) {
        if (!pressed) this.toggleShelf();
        return;
      }
      this.dragging = false;
      this.el.removeClass('is-dragging');
      this.removeGhost();
      const s = this.plugin.settings;
      if (target) {
        s.watchAnchor = target.header ? { header: true, spot: target.spot }
          : target.tray ? { group: target.id, tray: true, spot: target.spot }
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
    this.touchedAt = Date.now();
  }

  // Open toward whichever side of the window has more room, next to the watch.
  placeShelf() {
    const s = this.shelfEl;
    const gap = 8;
    // On a phone the shelf is a sheet across the screen, under the header and above the bar
    // of buttons at the bottom.
    if (Platform.isPhone) {
      const header = this.headerEl();
      const top = Math.max(safeInsets().top, header ? header.getBoundingClientRect().bottom : 0) + 6;
      s.style.left = `${gap}px`;
      s.style.width = `${Math.min(480, window.innerWidth - 2 * gap)}px`;
      s.style.top = `${top}px`;
      s.style.maxHeight = `${Math.max(200, this.safeBottom() - top - gap)}px`;
      s.setAttr('data-side', 'below');
      return;
    }
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
  // And for a project that follows a timeline, what you're working on.
  sectionSwitcher(plugin, el);
  return wrap;
}

// What you're working on, for a project that follows a timeline: a phase or task, or Automatic,
// when your notes and the calendar decide. Click it to choose.
function sectionSwitcher(plugin, el) {
  const project = plugin.activeProject();
  if (!project || !project.timeline) return null;
  const tl = plugin.timeline(project.timeline);
  const key = plugin.pickFor(project);
  const x = key && tl ? tl.byKey.get(key) : null;
  const b = el.createEl('button', {
    cls: 'pw-section-pick',
    attr: { 'aria-label': x ? `Working on ${sectionLabel(tl, key)}. Click to change.` : 'Choose what you are working on. Until you do, your notes and the timeline\'s dates decide.' },
  });
  const dot = b.createSpan('pw-section-dot');
  if (x && x.color) dot.style.background = `var(--pw-p${x.color})`;
  else dot.addClass('is-auto');
  b.createSpan({ cls: 'pw-section-label', text: 'Working on' });
  // Until the timeline is read, a pick shows as "…" rather than as Automatic.
  b.createSpan({ cls: 'pw-section-name', text: x ? x.name : key && !tl ? '…' : 'Automatic' });
  setIcon(b.createSpan('pw-project-chevron'), 'chevron-down');
  b.addEventListener('click', () => plugin.openSectionPicker(project));
  return b;
}

// "3 Feb – 14 Mar", and how long that is: "6 weeks", "4 days".
function spanText(start, end) {
  const a = keyToDate(start);
  const b = keyToDate(end);
  const o = { day: 'numeric', month: 'short' };
  const sameYear = a.getFullYear() === b.getFullYear() && a.getFullYear() === new Date().getFullYear();
  const f = (d) => d.toLocaleDateString(undefined, sameYear ? o : Object.assign({ year: 'numeric' }, o));
  return start === end ? f(a) : `${f(a)} – ${f(b)}`;
}

function spanLength(start, end) {
  const days = Math.round((keyToDate(end) - keyToDate(start)) / 86400000) + 1;
  if (days < 14) return plural(days, 'day');
  const weeks = Math.round(days / 7);
  return plural(weeks, 'week');
}

// Choose what you're working on: a phase or a task of the project's timeline, or Automatic.
// What's planned for today comes first; type to find the rest.
class SectionModal extends SuggestModal {
  constructor(app, plugin, project, tl) {
    super(app);
    this.plugin = plugin;
    this.project = project;
    this.tl = tl;
    this.res = plugin.sectionTime(tl, [project]);
    this.current = plugin.pickFor(project);
    this.setPlaceholder('What are you working on? Type to find a phase or task');
    if (this.modalEl) this.modalEl.addClass('pw-section-modal');
  }

  getSuggestions(query) {
    const tl = this.tl;
    const q = query.trim().toLowerCase();
    const today = dayKey(new Date());
    const now = tl.tasks.filter((t) => !t.dropped && !t.done && t.start <= today && today <= t.end);
    const list = [{ key: null, auto: true }];
    for (const t of now) list.push({ key: t.key, section: t, today: true });
    for (const ph of tl.phases) {
      list.push({ key: ph.key, section: ph });
      for (const t of ph.tasks) if (!now.includes(t)) list.push({ key: t.key, section: t, inPhase: true });
    }
    for (const t of tl.tasks) if (!t.phase && !now.includes(t)) list.push({ key: t.key, section: t });
    if (!q) return list;
    return list.filter((x) => (x.auto ? 'automatic' : sectionLabel(tl, x.key)).toLowerCase().includes(q));
  }

  renderSuggestion(x, el) {
    el.addClass('pw-section-suggestion');
    el.toggleClass('is-in-phase', !!x.inPhase);
    el.toggleClass('is-current', (x.key || null) === (this.current || null));
    const dot = el.createSpan('pw-section-dot');
    if (x.section && x.section.color) dot.style.background = `var(--pw-p${x.section.color})`;
    else dot.addClass('is-auto');
    const text = el.createDiv('pw-section-text');
    if (x.auto) {
      text.createDiv({ cls: 'pw-section-title', text: 'Automatic' });
      text.createDiv({ cls: 'pw-section-note', text: 'Time in a note a task links to goes to that task, and other time to what the timeline plans for the day.' });
    } else {
      const s = x.section;
      const phase = s.kind === 'task' && s.phase ? this.tl.byKey.get(`p:${s.phase}`) : null;
      text.createDiv({ cls: 'pw-section-title', text: s.name });
      const bits = [];
      if (x.today) bits.push(phase ? `Today, in ${phase.name}` : 'Planned for today');
      else if (s.kind === 'phase') bits.push(`Phase, ${plural(s.tasks.length, 'task')}`);
      if (s.start) bits.push(spanText(s.start, s.end));
      if (s.done) bits.push('Done');
      text.createDiv({ cls: 'pw-section-note', text: bits.join(' · ') });
      let ms = this.res.ms.get(s.key) || 0;
      if (s.kind === 'phase') for (const t of s.tasks) ms += this.res.ms.get(t.key) || 0;
      if (ms >= 60000) el.createDiv({ cls: 'pw-section-time', text: fmtShort(ms) });
    }
    if ((x.key || null) === (this.current || null)) setIcon(el.createSpan('pw-section-check'), 'check');
  }

  onChooseSuggestion(x) {
    this.plugin.setPick(this.project, x.key);
    new Notice(x.key ? `Working on ${sectionLabel(this.tl, x.key)}` : 'Your notes and the timeline decide where your time goes');
  }
}

// Sort the time your notes and picks didn't: for each day, the section its leftover time goes
// to. Until you choose, the timeline's dates decide where they can. Undo puts back what was
// there when you opened it.
class SortModal extends Modal {
  constructor(app, plugin, project, tl, keys) {
    super(app);
    this.plugin = plugin;
    this.project = project;
    this.tl = tl;
    this.keys = keys;
    this.before = Object.assign({}, project.sort);
    this.limit = 60;
  }

  onOpen() {
    this.modalEl.addClass('pw-sort-modal');
    this.titleEl.setText('Sort your time');
    this.render();
  }

  // The phases and tasks to choose from, in the timeline's order, after the choices given first.
  options(select, first) {
    const tl = this.tl;
    for (const [value, text] of first) select.createEl('option', { text, attr: { value } });
    for (const row of sectionTree(tl, { ms: new Map() })) {
      const group = select.createEl('optgroup', { attr: { label: row.section.name } });
      if (row.section.key) group.createEl('option', { text: `${row.section.name} (the phase)`, attr: { value: row.section.key } });
      for (const t of row.tasks) group.createEl('option', { text: t.section.name, attr: { value: t.section.key } });
    }
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    const res = this.plugin.sectionTime(this.tl, [this.project], this.keys);
    const project = this.plugin.settings.projects.find((x) => x.id === this.project.id) || this.project;
    const days = res.left.slice().sort((a, b) => (a.key < b.key ? 1 : -1));
    contentEl.createDiv({
      cls: 'pw-sort-intro',
      text: 'The time below wasn\'t in a note linked to a task, and you hadn\'t said what you were working on. Choose where each day\'s time goes. Where the timeline plans one task for the day, that\'s where it goes until you choose.',
    });
    if (!days.length) {
      contentEl.createDiv({ cls: 'pw-sort-empty', text: 'Nothing to sort over these days.' });
    } else {
      const all = contentEl.createDiv('pw-sort-all');
      all.createSpan({ text: `All ${plural(Math.min(days.length, this.limit), 'day')} below` });
      const pickAll = all.createEl('select', { cls: 'dropdown', attr: { 'aria-label': 'Put the time on every day below in one section' } });
      this.options(pickAll, [['', 'Put them all in…']]);
      pickAll.addEventListener('change', async () => {
        if (!pickAll.value) return;
        await this.plugin.sortDays(project, days.slice(0, this.limit).map((x) => x.key), pickAll.value);
        this.render();
      });
      const list = contentEl.createDiv('pw-sort-list');
      for (const x of days.slice(0, this.limit)) {
        const row = list.createDiv('pw-sort-row');
        row.createDiv({ cls: 'pw-sort-date', text: keyToDate(x.key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) });
        row.createDiv({ cls: 'pw-sort-time', text: fmtShort(x.ms) });
        const select = row.createEl('select', { cls: 'dropdown', attr: { 'aria-label': `Where the time on ${x.key} goes` } });
        const guess = calendarSection(this.tl, x.key);
        this.options(select, guess ? [['', `By the dates: ${sectionLabel(this.tl, guess)}`], [UNSORTED, 'Not sorted']] : [['', 'Not sorted']]);
        select.value = (project.sort && project.sort[x.key]) || '';
        row.toggleClass('is-unsorted', x.to === UNSORTED);
        select.addEventListener('change', async () => {
          await this.plugin.sortDays(project, [x.key], select.value || null);
          this.render();
        });
      }
      if (days.length > this.limit) {
        const more = contentEl.createEl('button', { cls: 'pw-sort-more', text: `Show ${Math.min(60, days.length - this.limit)} more days` });
        more.addEventListener('click', () => {
          this.limit += 60;
          this.render();
        });
      }
    }
    const buttons = contentEl.createDiv('pw-project-modal-buttons');
    const changed = JSON.stringify(project.sort || {}) !== JSON.stringify(this.before);
    if (changed) {
      buttons.createEl('button', { text: 'Undo changes' }).addEventListener('click', async () => {
        const x = this.plugin.settings.projects.find((y) => y.id === project.id);
        if (x) {
          x.sort = Object.keys(this.before).length ? Object.assign({}, this.before) : undefined;
          if (!x.sort) delete x.sort;
          await this.plugin.saveSettings();
          this.plugin.refreshProjects();
          this.plugin.timeChanged();
        }
        this.render();
      });
    }
    buttons.createDiv('pw-project-modal-gap');
    buttons.createEl('button', { cls: 'mod-cta', text: 'Done' }).addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}

// A new project, or changes to one: its name and colour, and whether to track it now.
// Rename a device or change what kind it is; and for another device, take its time into
// this one or forget it, for a device you no longer use.
class DeviceModal extends Modal {
  constructor(app, plugin, device) {
    super(app);
    this.plugin = plugin;
    this.device = device;
    this.name = device.name;
    this.kind = device.kind;
  }

  onOpen() {
    const { contentEl } = this;
    const x = this.device;
    contentEl.addClass('pw-project-modal');
    this.titleEl.setText(x.isThis ? 'This device' : x.name);
    const input = contentEl.createEl('input', { cls: 'pw-project-input', attr: { type: 'text', placeholder: 'A name, like Work laptop', value: this.name } });
    input.addEventListener('input', () => {
      this.name = input.value;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.save();
      }
    });
    contentEl.createDiv({ cls: 'pw-project-modal-label', text: 'Kind' });
    const kinds = contentEl.createDiv({ cls: 'pw-device-kinds', attr: { role: 'radiogroup', 'aria-label': 'Kind' } });
    for (const [key, label] of Object.entries(DEVICE_KINDS)) {
      const b = kinds.createEl('button', { cls: 'pw-device-kind', attr: { role: 'radio', 'aria-checked': String(key === this.kind) } });
      setIcon(b.createSpan(), DEVICE_ICONS[key]);
      b.createSpan({ text: label });
      b.toggleClass('is-selected', key === this.kind);
      b.addEventListener('click', () => {
        this.kind = key;
        kinds.querySelectorAll('.pw-device-kind').forEach((el) => {
          const on = el === b;
          el.toggleClass('is-selected', on);
          el.setAttr('aria-checked', String(on));
        });
      });
    }
    if (!x.isThis) {
      contentEl.createDiv({ cls: 'pw-device-note', text: `Last here ${sinceText(x.seen)}. If you no longer use it, or it's this device from before a reinstall, take its time into this device, or forget it.` });
    }
    const buttons = contentEl.createDiv('pw-project-modal-buttons');
    if (!x.isThis) {
      buttons.createEl('button', { text: 'Take its time' }).addEventListener('click', async () => {
        if (!window.confirm(`Add ${x.name}'s time to this device, and remove ${x.name}?`)) return;
        await this.plugin.forgetDevice(x.id, true);
        this.close();
      });
      buttons.createEl('button', { cls: 'mod-warning', text: 'Forget' }).addEventListener('click', async () => {
        if (!window.confirm(`Forget ${x.name} and the time tracked on it? This cannot be undone.`)) return;
        await this.plugin.forgetDevice(x.id, false);
        this.close();
      });
    }
    buttons.createDiv('pw-project-modal-gap');
    buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
    buttons.createEl('button', { cls: 'mod-cta', text: 'Save' }).addEventListener('click', () => this.save());
  }

  async save() {
    await this.plugin.setDevice(this.device.id, this.name, this.kind);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class ProjectModal extends Modal {
  constructor(app, plugin, project) {
    super(app);
    this.plugin = plugin;
    this.project = project || null;
    this.name = project ? project.name : '';
    this.color = project ? project.color : plugin.nextColour();
    this.timeline = project ? project.timeline || null : null;
    this.track = !project;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('pw-project-modal');
    this.titleEl.setText(this.project ? 'Edit project' : 'New project');
    const input = contentEl.createEl('input', { cls: 'pw-project-input', attr: { type: 'text', placeholder: 'Project name, like Garden journal', value: this.name } });
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
    // A Simple Gantt timeline the project follows: its phases and tasks become its sections.
    const files = this.plugin.timelineFiles();
    if (files.length || this.timeline) {
      new Setting(contentEl).setName('Timeline')
        .setDesc('A Simple Gantt timeline. Its phases and tasks become this project\'s sections, and your time on the project is shared out among them.')
        .addDropdown((d) => {
          d.addOption('', 'None');
          for (const f of files) d.addOption(f.path, f.basename);
          if (this.timeline && !files.some((f) => f.path === this.timeline)) d.addOption(this.timeline, `${this.timeline} (not found)`);
          d.setValue(this.timeline || '').onChange((v) => {
            this.timeline = v || null;
          });
        });
    }
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
    const project = await this.plugin.saveProject({ name, color: this.color, timeline: this.timeline || null }, this.project && this.project.id);
    this.close();
    if (this.track) await this.plugin.setProject(project.id);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// Move time to the project it belongs to: from no project (or another project) to the right
// one, over a day, a range of days or a span between two dates. It says how much will move
// before it does, and the notice afterwards can undo it.
class MoveTimeModal extends Modal {
  constructor(app, plugin, opts) {
    super(app);
    this.plugin = plugin;
    const active = plugin.activeProject();
    const firstOther = plugin.settings.projects.find((x) => !x.archived && x.id !== opts.from);
    this.from = opts.from || NO_PROJECT;
    this.to = opts.to || (this.from === NO_PROJECT ? (active || firstOther || {}).id : NO_PROJECT) || NO_PROJECT;
    this.day = opts.day || null;
    this.span = opts.day ? 'day' : opts.span || '30';
    this.start = opts.day || dayKey(daysAgo(29));
    this.end = opts.day || dayKey(daysAgo(0));
  }

  name(id) {
    const project = this.plugin.settings.projects.find((x) => x.id === id);
    return project ? project.name : 'No project';
  }

  // The days the move covers, oldest first.
  keys() {
    const p = this.plugin;
    if (this.span === 'day') return [this.day];
    if (this.span === 'all') return Object.keys(p.days).sort();
    if (this.span === 'custom') {
      const [a, b] = [this.start, this.end].sort();
      return Object.keys(p.days).filter((k) => k >= a && k <= b).sort();
    }
    const keys = [];
    for (let i = Number(this.span) - 1; i >= 0; i--) keys.push(dayKey(daysAgo(i)));
    return keys;
  }

  onOpen() {
    const p = this.plugin;
    const { contentEl } = this;
    contentEl.addClass('pw-move-modal');
    this.titleEl.setText('Move time to a project');
    contentEl.createDiv({ cls: 'pw-move-intro', text: 'Time you tracked without a project, or on the wrong one, can move to the one it belongs to.' });
    const options = (withNone, includeArchived) => {
      const o = {};
      for (const x of p.settings.projects) if (includeArchived || !x.archived) o[x.id] = x.archived ? `${x.name} (archived)` : x.name;
      if (withNone) o[NO_PROJECT] = 'No project';
      return o;
    };
    const fromOptions = Object.assign({ [NO_PROJECT]: 'No project' }, options(false, true));
    dropdown(new Setting(contentEl).setName('From'), fromOptions, this.from, (v) => {
      this.from = v;
      this.update();
    });
    dropdown(new Setting(contentEl).setName('To'), options(true, false), this.to, (v) => {
      this.to = v;
      this.update();
    });
    const spans = {};
    if (this.day) spans.day = keyToDate(this.day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    Object.assign(spans, { 7: 'The last 7 days', 30: 'The last 30 days', 90: 'The last 90 days', 365: 'The last year', all: 'All time', custom: 'Between two dates' });
    dropdown(new Setting(contentEl).setName('Days'), spans, this.span, (v) => {
      this.span = v;
      this.update();
    });
    this.datesEl = new Setting(contentEl).setName('Between').setDesc('From the first date to the second, both included.');
    for (const key of ['start', 'end']) {
      const input = this.datesEl.controlEl.createEl('input', { cls: 'pw-move-date', attr: { type: 'date', value: this[key] } });
      input.addEventListener('change', () => {
        if (input.value) this[key] = input.value;
        this.update();
      });
    }
    this.previewEl = contentEl.createDiv('pw-move-preview');
    const buttons = contentEl.createDiv('pw-project-modal-buttons');
    buttons.createDiv('pw-project-modal-gap');
    buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
    this.moveBtn = buttons.createEl('button', { cls: 'mod-cta', text: 'Move' });
    this.moveBtn.addEventListener('click', () => this.move());
    this.update();
  }

  // How much the move would carry, said before you make it.
  update() {
    const p = this.plugin;
    this.datesEl.settingEl.toggleClass('is-hidden', this.span !== 'custom');
    let ms = 0;
    let days = 0;
    for (const key of this.keys()) {
      const share = projectSlice(p.getDay(key), this.from);
      if (share.ms >= 1000) {
        ms += share.ms;
        days++;
      }
    }
    const same = this.from === this.to;
    this.previewEl.empty();
    if (same) this.previewEl.setText('Pick a different project to move it to.');
    else if (!ms) this.previewEl.setText(`There's no time on ${this.name(this.from)} on these days.`);
    else {
      this.previewEl.createSpan({ cls: 'pw-move-amount', text: fmtShort(ms) });
      this.previewEl.createSpan({ text: ` on ${days} ${days === 1 ? 'day' : 'days'} moves from ${this.name(this.from)} to ${this.name(this.to)}.` });
    }
    this.moveBtn.disabled = same || !ms;
  }

  async move() {
    const p = this.plugin;
    const result = await p.moveTime(this.keys(), this.from, this.to);
    this.close();
    if (!result.days) return;
    const note = createFragment();
    note.createSpan({ text: `Moved ${fmtShort(result.moved)} to ${this.name(this.to)}. ` });
    const undo = note.createEl('a', { text: 'Undo', attr: { href: '#' } });
    const notice = new Notice(note, 10000);
    undo.addEventListener('click', async (e) => {
      e.preventDefault();
      await p.undoMove(result.undo);
      notice.hide();
      new Notice('Moved it back');
    });
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

// The counts a day keeps, for itself and for each project's share of it: time, words and
// focus sessions; keys typed, Backspace and Delete presses, pastes (and the words pasted)
// and undos; notes opened and made, links added and tasks ticked off; breaks taken and focus
// sessions stopped early; time outside Obsidian, and time spent typing.
const SLICE_NUMBERS = [
  'ms', 'written', 'deleted', 'sessions', 'focusMs', 'typed', 'erased', 'pastes', 'pasted', 'undos',
  'opens', 'created', 'links', 'tasks', 'breaks', 'stopped', 'outsideMs', 'typingMs',
];
// Counts by the hour of the day, and by note. `picked` is the time you said you were working on
// a section of the project's timeline, by the section and the note you were in.
const SLICE_HOURS = ['hours', 'wordHours'];
const SLICE_NOTES = ['files', 'fileWords', 'picked'];
const EMPTY_SLICE = Object.freeze(Object.fromEntries(SLICE_NUMBERS.map((k) => [k, 0])));

// A sitting: time at it without a break of more than this, as [start minute, minutes, project].
const SITTING_GAP = 5 * 60000;

// One project's share of a day. The share of no project is what's left of the day once
// every project's share is taken out, so days from before projects all belong to it.
function projectSlice(d, id) {
  const sits = d.sits ? d.sits.filter((sit) => sitIn(sit, id)) : null;
  if (id !== NO_PROJECT) {
    const share = (d.projects || {})[id];
    return share ? (sits ? Object.assign({}, share, { sits }) : share) : EMPTY_SLICE;
  }
  const rest = { fastest: d.fastest || 0 };
  if (sits) rest.sits = sits;
  for (const k of SLICE_NUMBERS) rest[k] = d[k] || 0;
  for (const k of SLICE_HOURS) rest[k] = (d[k] || new Array(24).fill(0)).slice();
  for (const k of SLICE_NOTES) rest[k] = Object.assign({}, d[k] || {});
  for (const x of Object.values(d.projects || {})) {
    for (const k of SLICE_NUMBERS) rest[k] = Math.max(0, rest[k] - (x[k] || 0));
    for (const k of SLICE_HOURS) (x[k] || []).forEach((v, h) => (rest[k][h] = Math.max(0, rest[k][h] - v)));
    for (const k of SLICE_NOTES) {
      for (const [path, v] of Object.entries(x[k] || {})) {
        rest[k][path] = (rest[k][path] || 0) - v;
        if (rest[k][path] < (k === 'fileWords' ? 1 : 1000)) delete rest[k][path];
      }
    }
  }
  return rest;
}

// Adds one share of a day into another: its counts, hours and notes, and its fastest minute.
function addSlice(into, from) {
  for (const k of SLICE_NUMBERS) into[k] = (into[k] || 0) + (from[k] || 0);
  for (const k of SLICE_HOURS) {
    if (!from[k]) continue;
    into[k] = into[k] || new Array(24).fill(0);
    from[k].forEach((v, h) => (into[k][h] += v));
  }
  for (const k of SLICE_NOTES) {
    if (!from[k]) continue;
    into[k] = into[k] || {};
    for (const [path, v] of Object.entries(from[k])) into[k][path] = (into[k][path] || 0) + v;
  }
  if (from.fastest) into.fastest = Math.max(into.fastest || 0, from.fastest);
}

// The cards of the stats page in their usual order, and whether each spans the page.
const STATS_CARDS = [
  { id: 'year', name: 'The past year', wide: true },
  { id: 'summary', name: 'Your time', wide: true },
  { id: 'projects', name: 'Projects', wide: true },
  { id: 'sections', name: 'Sections', wide: true },
  { id: 'devices', name: 'Devices', wide: true },
  { id: 'daily', name: 'Every day', wide: false },
  { id: 'hours', name: 'When you work', wide: false },
  { id: 'week', name: 'Your week', wide: false },
  { id: 'writing', name: 'Writing', wide: false },
  { id: 'where', name: 'Where the time went', wide: false },
  { id: 'habits', name: 'How you work', wide: true },
  { id: 'records', name: 'Records', wide: false },
  { id: 'table', name: 'Day by day', wide: true },
];

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
      if (!this.contentEl.matches(':hover') && !this.editing) this.render();
    }, 60000));
  }

  async onClose() {
    window.clearTimeout(this.resizeTimer);
    if (this.tip) this.tip.remove();
  }

  onResize() {
    if (this.dragging) return;
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.render(), 150);
  }

  // --- Data ---------------------------------------------------------------

  slice(d, id) {
    return projectSlice(d, id);
  }

  // A day as the page shows it: all of it, or only the projects you've turned on.
  day(key) {
    return this.only(this.plugin.getDay(key));
  }

  only(d) {
    if (!this.shown) return d;
    const out = { hours: new Array(24).fill(0), files: {}, sits: [] };
    for (const k of SLICE_NUMBERS) out[k] = 0;
    for (const id of this.shown) {
      const x = this.slice(d, id);
      addSlice(out, x);
      if (x.sits) out.sits = out.sits.concat(x.sits);
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
        // An empty class name throws in Obsidian, so the selected one gets its class on its own.
        if (d) svg.createSvg('path', { attr: { d }, cls: 'pw-chart-bar' }).toggleClass('is-selected', !!pt.key && pt.key === this.selected);
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
    page.toggleClass('is-editing', !!this.editing);
    this.renderHeader(page);
    this.renderRange(page, r);
    if (this.editing) this.renderEditBar(page);
    // The cards, in the order you've put them, each wide or narrow.
    const board = page.createDiv('pw-stats-board');
    const draw = {
      year: (el) => this.renderYear(el),
      summary: (el) => this.renderHero(el, r),
      projects: (el) => this.renderProjects(el, r),
      sections: (el) => this.renderSections(el, r),
      devices: (el) => this.renderDevices(el, r),
      daily: (el) => this.renderDaily(el, r),
      hours: (el) => this.renderHours(el, r),
      week: (el) => this.renderWeekdays(el, r),
      writing: (el) => this.renderWriting(el, r),
      where: (el) => this.renderWhere(el, r),
      habits: (el) => this.renderHabits(el, r),
      records: (el) => this.renderRecords(el),
      table: (el) => this.renderTable(el, r),
    };
    // Sections only once there's a timeline to follow, made with Simple Gantt.
    const timelines = this.plugin.settings.projects.some((x) => x.timeline) || this.plugin.timelineFiles().length > 0;
    for (const item of this.layout()) {
      if (item.hidden || (item.id === 'sections' && !timelines)) continue;
      const cell = board.createDiv({ cls: ['pw-stats-cell', item.wide ? 'is-wide' : 'is-narrow'], attr: { 'data-card': item.id } });
      draw[item.id](cell);
      if (this.editing) this.cardTools(cell, item);
    }
    // In a single column, wide and narrow are the same.
    board.toggleClass('is-single', getComputedStyle(board).gridTemplateColumns.split(' ').length < 2);
    root.scrollTop = scroll;
    if (this.reveal && this.dayEl) this.dayEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.reveal = false;
  }

  // --- Arranging the page -------------------------------------------------

  // The cards as you've arranged them, [{ id, wide, hidden }], with any new ones in their usual
  // place.
  layout() {
    const saved = Array.isArray(this.plugin.settings.statsLayout) ? this.plugin.settings.statsLayout : [];
    const list = [];
    for (const x of saved) {
      const card = STATS_CARDS.find((c) => c.id === x.id);
      if (card && !list.some((y) => y.id === card.id)) list.push({ id: card.id, wide: typeof x.wide === 'boolean' ? x.wide : card.wide, hidden: !!x.hidden });
    }
    STATS_CARDS.forEach((card, i) => {
      if (!list.some((y) => y.id === card.id)) list.splice(Math.min(i, list.length), 0, { id: card.id, wide: card.wide, hidden: false });
    });
    return list;
  }

  async saveLayout(list) {
    this.plugin.settings.statsLayout = list ? list.map((x) => ({ id: x.id, wide: x.wide, hidden: x.hidden })) : null;
    await this.plugin.saveSettings();
    this.render();
  }

  changeCard(id, patch) {
    const list = this.layout();
    Object.assign(list.find((x) => x.id === id), patch);
    this.saveLayout(list);
  }

  // While arranging: what to do, the hidden cards to bring back, and Done.
  renderEditBar(page) {
    const bar = page.createDiv('pw-stats-editbar');
    const text = bar.createDiv('pw-stats-editbar-text');
    text.createDiv({ cls: 'pw-stats-editbar-title', text: 'Arrange your page' });
    text.createDiv({ cls: 'pw-stats-card-note', text: 'Drag a card by its handle to move it. Hide the ones you don\'t need, and make the others wide or narrow.' });
    const hidden = this.layout().filter((x) => x.hidden);
    if (hidden.length) {
      const tray = bar.createDiv('pw-stats-hidden');
      tray.createSpan({ cls: 'pw-stats-eyebrow', text: 'Hidden' });
      for (const x of hidden) {
        const name = STATS_CARDS.find((c) => c.id === x.id).name;
        const b = tray.createEl('button', { cls: 'pw-stats-chip', attr: { 'aria-label': `Show ${name} again` } });
        setIcon(b.createSpan('pw-stats-chip-icon'), 'plus');
        b.createSpan({ text: name });
        b.addEventListener('click', () => this.changeCard(x.id, { hidden: false }));
      }
    }
    const actions = bar.createDiv('pw-stats-editbar-actions');
    if (this.plugin.settings.statsLayout) {
      actions.createEl('button', { text: 'Reset' }).addEventListener('click', () => {
        if (window.confirm('Put every card back where it was at first?')) this.saveLayout(null);
      });
    }
    actions.createEl('button', { cls: 'mod-cta', text: 'Done' }).addEventListener('click', () => {
      this.editing = false;
      this.render();
    });
  }

  // A card's handle, and its buttons to make it wide or narrow and to hide it.
  cardTools(cell, item) {
    const name = STATS_CARDS.find((c) => c.id === item.id).name;
    const tools = cell.createDiv('pw-stats-cell-tools');
    const grip = tools.createEl('button', { cls: ['clickable-icon', 'pw-stats-grip'], attr: { 'aria-label': `Drag to move ${name}` } });
    setIcon(grip, 'grip-vertical');
    grip.addEventListener('pointerdown', (e) => this.dragCard(e, cell));
    const size = tools.createEl('button', { cls: ['clickable-icon', 'pw-stats-size'], attr: { 'aria-label': item.wide ? `Make ${name} narrow` : `Make ${name} wide` } });
    setIcon(size, item.wide ? 'minimize-2' : 'maximize-2');
    size.addEventListener('click', () => this.changeCard(item.id, { wide: !item.wide }));
    const hide = tools.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Hide ${name}` } });
    setIcon(hide, 'eye-off');
    hide.addEventListener('click', () => this.changeCard(item.id, { hidden: true }));
  }

  // Drag a card by its handle: the card it passes over makes way, and the new order is kept
  // when you let go. Near the top or bottom of the page, the page scrolls.
  dragCard(e, cell) {
    if (e.button !== 0) return;
    e.preventDefault();
    const board = cell.parentElement;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    this.dragging = true;
    cell.addClass('is-moving');
    let x = e.clientX;
    let y = e.clientY;
    let passed = null;
    const follow = () => {
      const over = document.elementsFromPoint(x, y).map((el) => el.closest('.pw-stats-cell')).find((el) => el && el !== cell && el.parentElement === board);
      if (!over) {
        passed = null;
        return;
      }
      if (over === passed) return;
      const cards = Array.from(board.children);
      board.insertBefore(cell, cards.indexOf(cell) < cards.indexOf(over) ? over.nextSibling : over);
      passed = over;
    };
    const scroller = this.contentEl;
    const timer = window.setInterval(() => {
      const r = scroller.getBoundingClientRect();
      const dy = y < r.top + 56 ? -14 : y > r.bottom - 56 ? 14 : 0;
      if (!dy) return;
      scroller.scrollTop += dy;
      follow();
    }, 16);
    const move = (ev) => {
      x = ev.clientX;
      y = ev.clientY;
      follow();
    };
    const up = () => {
      window.clearInterval(timer);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      this.dragging = false;
      cell.removeClass('is-moving');
      // The new order of the cards on the page, with the hidden ones where they were.
      const order = Array.from(board.children).map((el) => el.getAttribute('data-card'));
      const list = this.layout();
      const byId = Object.fromEntries(list.map((x) => [x.id, x]));
      let i = 0;
      const next = list.map((x) => (x.hidden ? x : byId[order[i++]]));
      if (next.some((x, j) => x.id !== list[j].id)) this.saveLayout(next);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
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
    // Time that day without a project can go to the one it belongs to.
    const loose = p.settings.projects.length ? projectSlice(p.getDay(key), NO_PROJECT).ms : 0;
    if (loose >= 60000) {
      const line = panel.createDiv('pw-stats-loose');
      line.createSpan('pw-project-dot').style.background = 'var(--pw-p-none)';
      line.createSpan({ text: `${fmtShort(loose)} on no project this day` });
      const move = line.createEl('button', { text: 'Move to a project' });
      move.addEventListener('click', () => new MoveTimeModal(this.app, p, { from: NO_PROJECT, day: key }).open());
    }
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
    // A PDF of your time, for a project or all of it; and arranging the page.
    const actions = this.editing ? null : bar.createDiv('pw-stats-actions');
    if (!this.editing) {
      const report = actions.createEl('button', { cls: 'pw-stats-edit', attr: { 'aria-label': 'Make a one-page PDF report of your time, to print or attach' } });
      setIcon(report.createSpan('pw-stats-edit-icon'), 'file-text');
      report.createSpan({ text: 'PDF report' });
      report.addEventListener('click', () => new ReportModal(this.app, this.plugin, { ids: this.shown ? [...this.shown] : undefined }).open());
    }
    // Arrange the page: move cards, hide them, make them wide or narrow.
    if (!this.editing) {
      const edit = actions.createEl('button', { cls: 'pw-stats-edit', attr: { 'aria-label': 'Move the cards around, hide them, or bring them back' } });
      setIcon(edit.createSpan('pw-stats-edit-icon'), 'layout-dashboard');
      edit.createSpan({ text: 'Edit layout' });
      edit.addEventListener('click', () => {
        this.editing = true;
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
      empty.createDiv({ text: 'Track your time toward a project, like a novel you are drafting and a garden journal on the side. Each gets its own colour, and you can show one, several or all of them here.' });
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
      if (entry.ms > 0) {
        const move = row.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': entry.project ? `Move ${entry.name}'s time to another project` : 'Move this time to a project' } });
        setIcon(move, 'arrow-right-left');
        move.addEventListener('click', () => new MoveTimeModal(this.app, p, { from: entry.id, span: this.range }).open());
      } else row.createDiv('pw-project-edit-gap');
      if (entry.project) {
        const edit = row.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Edit ${entry.name}` } });
        setIcon(edit, 'pencil');
        edit.addEventListener('click', () => new ProjectModal(this.app, p, entry.project).open());
      } else row.createDiv('pw-project-edit-gap');
    }
    const foot = card.createDiv('pw-projects-foot');
    foot.createEl('button', { text: 'New project' }).addEventListener('click', () => new ProjectModal(this.app, p).open());
  }

  // The phases and tasks of the timeline each project you're looking at follows, with your time
  // on each over the days shown, when each was planned, and the time not sorted yet.
  renderSections(page, r) {
    const p = this.plugin;
    const followed = p.settings.projects.filter((x) => x.timeline && this.isShown(x.id));
    const card = this.card(page, 'Sections', followed.length ? `Your time on each phase and task, last ${r.n} days` : '');
    if (!followed.length) {
      const empty = card.createDiv('pw-projects-empty');
      const some = p.settings.projects.some((x) => x.timeline);
      empty.createDiv({
        text: some
          ? 'None of the projects shown follows a timeline.'
          : 'Link a project to one of your Simple Gantt timelines, and its phases and tasks show here, each with the time you spent on it.',
      });
      const project = p.activeProject() || p.settings.projects.find((x) => !x.archived);
      if (!some) {
        empty.createEl('button', { cls: 'mod-cta', text: project ? `Link ${project.name} to a timeline` : 'New project' })
          .addEventListener('click', () => new ProjectModal(this.app, p, project || undefined).open());
      }
      return;
    }
    for (const project of followed) {
      const block = card.createDiv('pw-sections');
      const tl = p.timeline(project.timeline);
      const head = block.createDiv('pw-sections-head');
      head.createSpan('pw-project-dot').style.background = `var(--pw-p${project.color})`;
      head.createSpan({ cls: 'pw-sections-project', text: project.name });
      const open = head.createEl('button', { cls: 'pw-sections-timeline', text: tl ? tl.title : project.timeline.replace(/\.md$/, ''), attr: { 'aria-label': 'Open the timeline\'s note' } });
      open.addEventListener('click', () => this.app.workspace.openLinkText(project.timeline, '', false));
      const edit = head.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Edit ${project.name}, or link it to another timeline` } });
      setIcon(edit, 'pencil');
      edit.addEventListener('click', () => new ProjectModal(this.app, p, project).open());
      if (!tl) {
        const there = this.app.vault.getAbstractFileByPath(project.timeline);
        block.createDiv({ cls: 'pw-sections-missing', text: there ? 'Reading the timeline…' : `Can't find the timeline at ${project.timeline}. Edit the project to link it again.` });
        continue;
      }
      const res = p.sectionTime(tl, [project], r.keys);
      const rows = sectionTree(tl, res);
      const total = res.total;
      if (total > 0) {
        const split = block.createDiv('pw-projects-split');
        for (const row of rows) {
          if (!row.ms) continue;
          const seg = split.createDiv('pw-projects-seg');
          seg.style.flexGrow = String(row.ms);
          seg.style.background = row.section.color ? `var(--pw-p${row.section.color})` : 'var(--pw-p-none)';
          this.hover(seg, fmtShort(row.ms), `${row.section.name}, ${Math.round((row.ms / total) * 100)}%`);
        }
        if (res.unsorted) {
          const seg = split.createDiv({ cls: ['pw-projects-seg', 'is-unsorted'] });
          seg.style.flexGrow = String(res.unsorted);
          this.hover(seg, fmtShort(res.unsorted), `Not sorted, ${Math.round((res.unsorted / total) * 100)}%`);
        }
      }
      const pick = p.pickFor(project);
      const list = block.createDiv('pw-projects');
      const most = Math.max(1, ...rows.map((x) => x.ms));
      const line = (cls, color, name, note, ms, share, o = {}) => {
        const row = list.createDiv({ cls: ['pw-project-row', 'pw-section-row', cls] });
        const dot = row.createSpan('pw-project-dot');
        if (color) dot.style.background = color;
        else dot.addClass('is-none');
        const label = row.createDiv('pw-project-row-name');
        label.createSpan({ cls: 'pw-section-row-title', text: name });
        if (o.done) setIcon(label.createSpan({ cls: 'pw-section-done', attr: { 'aria-label': 'Done' } }), 'check');
        if (o.picked) label.createSpan({ cls: 'pw-project-badge', text: 'Working on' });
        if (note) label.createSpan({ cls: 'pw-section-when', text: note });
        const bar = row.createDiv('pw-project-share');
        bar.createDiv('pw-project-share-fill').style.cssText = `width: ${(share * 100).toFixed(1)}%; background: ${color || 'var(--pw-p-none)'}`;
        row.createDiv({ cls: 'pw-project-time', text: ms >= 60000 ? fmtShort(ms) : '–' });
        row.toggleClass('is-empty', ms < 60000);
        return row;
      };
      for (const group of rows) {
        const color = group.section.color ? `var(--pw-p${group.section.color})` : null;
        const ph = group.section;
        const row = line('is-phase', color, ph.name, ph.start ? `${spanText(ph.start, ph.end)} · ${spanLength(ph.start, ph.end)}` : '', group.ms, group.ms / most, { picked: !!pick && pick === ph.key });
        row.createDiv({ cls: 'pw-project-pct', text: total && group.ms ? `${Math.round((group.ms / total) * 100)}%` : '' });
        if (group.own >= 60000 && group.tasks.length) {
          line('is-task', color, `${ph.name} in general`, '', group.own, group.own / most).createDiv('pw-project-pct');
        }
        for (const t of group.tasks) {
          const task = t.section;
          const days = res.days.get(task.key);
          const n = days ? [...days.values()].filter((ms) => ms >= ACTIVE_DAY_MS).length : 0;
          const tr = line('is-task', color, task.name, spanText(task.start, task.end), t.ms, t.ms / most, { done: task.done, picked: pick === task.key });
          tr.createDiv({ cls: 'pw-project-pct', text: n ? plural(n, 'day') : '' });
          if (task.dropped) tr.addClass('is-dropped');
        }
      }
      if (res.unsorted >= 60000 || res.left.length) {
        const row = line('is-unsorted', null, 'Not sorted', res.unsorted >= 60000 ? 'Not in a linked note, not picked, and no single task planned for the day' : '', res.unsorted, res.unsorted / most);
        const sort = row.createEl('button', { cls: 'pw-sections-sort', text: 'Sort…', attr: { 'aria-label': 'Choose where each day\'s time goes' } });
        sort.addEventListener('click', () => new SortModal(this.app, p, project, tl, r.keys).open());
      }
      // How the time was placed.
      const how = res.how;
      const bits = [['note', 'in linked notes'], ['pick', 'picked'], ['date', 'by the dates'], ['hand', 'sorted by hand']]
        .filter(([k]) => (how[k] || 0) >= 60000).map(([k, text]) => `${fmtShort(how[k])} ${text}`);
      const foot = block.createDiv('pw-sections-foot');
      foot.createSpan({ cls: 'pw-sections-how', text: bits.length ? bits.join(' · ') : 'No time on this project over these days.' });
      if (p.activeProject() && p.activeProject().id === project.id) sectionSwitcher(p, foot);
    }
  }

  // Where your time comes from: this computer, your phone, and any other device, with the
  // words written on each. Click one to rename it or change what kind of device it is.
  renderDevices(page, r) {
    const p = this.plugin;
    const devices = p.deviceList().map((x) => {
      let ms = 0;
      let written = 0;
      for (const key of r.keys) {
        const d = x.days[key];
        if (!d) continue;
        const part = this.only(d);
        ms += part.ms;
        written += part.written || 0;
      }
      return Object.assign(x, { ms, written });
    });
    const total = devices.reduce((sum, x) => sum + x.ms, 0);
    const card = this.card(page, 'Devices', devices.length > 1 ? `Where your time comes from, last ${r.n} days` : '');
    // Shades of the page's colour, the most used device the strongest.
    const order = devices.slice().sort((a, b) => b.ms - a.ms);
    const shade = (x) => `color-mix(in srgb, var(--pw-s-bar) ${[100, 62, 38, 24][Math.min(3, order.indexOf(x))]}%, transparent)`;
    if (devices.length > 1 && total > 0) {
      const split = card.createDiv('pw-projects-split');
      for (const x of order) {
        if (!x.ms) continue;
        const seg = split.createDiv('pw-projects-seg');
        seg.style.flexGrow = String(x.ms);
        seg.style.background = shade(x);
        this.hover(seg, fmtShort(x.ms), `${x.name}, ${Math.round((x.ms / total) * 100)}%`);
      }
    }
    const list = card.createDiv('pw-projects');
    for (const x of devices) {
      const row = list.createDiv({ cls: ['pw-project-row', 'pw-device-row'] });
      setIcon(row.createSpan('pw-device-icon'), DEVICE_ICONS[x.kind]);
      const name = row.createDiv('pw-project-row-name');
      name.createSpan({ text: x.name });
      if (x.isThis) name.createSpan({ cls: 'pw-project-badge', text: 'This device' });
      else name.createSpan({ cls: 'pw-device-seen', text: `Last here ${sinceText(x.seen)}` });
      const share = row.createDiv('pw-project-share');
      share.createDiv('pw-project-share-fill').style.cssText = `width: ${total ? (x.ms / total) * 100 : 0}%; background: ${shade(x)}`;
      row.createDiv({ cls: 'pw-project-time', text: fmtShort(x.ms) });
      row.createDiv({ cls: 'pw-device-words', text: `${fmtNum(x.written)} words` });
      row.createDiv({ cls: 'pw-project-pct', text: total ? `${Math.round((x.ms / total) * 100)}%` : '' });
      const edit = row.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Rename ${x.name}, or change its kind` } });
      setIcon(edit, 'pencil');
      edit.addEventListener('click', () => new DeviceModal(this.app, p, x).open());
    }
    if (devices.length === 1) {
      card.createDiv({ cls: 'pw-devices-hint', text: 'Use Pocket Watch on your phone or another computer with this vault, and their time shows here too, each on its own row.' });
    }
  }

  // How you work, from what Pocket Watch counts as you go: keys and Backspace, pastes and
  // undos, time typing, sittings and when they start, notes opened and made, links and tasks.
  renderHabits(page, r) {
    const sum = {};
    for (const k of SLICE_NUMBERS) sum[k] = 0;
    const sits = [];
    for (const key of r.keys) {
      const d = this.day(key);
      for (const k of SLICE_NUMBERS) sum[k] += d[k] || 0;
      for (const x of d.sits || []) sits.push(x);
    }
    const card = this.card(page, 'How you work', `Counted from version 1.17, last ${r.n} days`);
    const tiles = card.createDiv({ cls: ['pw-stats-tiles', 'is-habits'] });
    const tile = (label, value, sub) => {
      const t = tiles.createDiv('pw-stats-tile');
      t.createDiv({ cls: 'pw-stats-label', text: label });
      t.createDiv({ cls: 'pw-stats-tile-value', text: value });
      if (sub) t.createDiv({ cls: 'pw-stats-tile-sub', text: sub });
    };
    const avgSit = sits.length ? sits.reduce((a, x) => a + x[1], 0) / sits.length : 0;
    const longest = sits.reduce((a, x) => Math.max(a, x[1]), 0);
    const starts = sits.map((x) => x[0]).sort((a, b) => a - b);
    tile('Keys typed', fmtNum(sum.typed), sum.written ? `${(sum.typed / sum.written).toFixed(1)} for each word` : '');
    tile('Backspace', fmtNum(sum.erased), sum.typed ? `1 in ${Math.max(1, Math.round((sum.typed + sum.erased) / Math.max(1, sum.erased)))} keys` : '');
    tile('Typing', sum.ms ? `${Math.round((sum.typingMs / sum.ms) * 100)}%` : '-', 'of the time; the rest, reading and thinking');
    tile('Sittings', fmtNum(sits.length), sits.length ? `${fmtShort(avgSit * 60000)} each, the longest ${fmtShort(longest * 60000)}` : '');
    tile('Usual start', starts.length ? clockText(starts[Math.floor(starts.length / 2)]) : '-', starts.length ? `earliest ${clockText(starts[0])}` : '');
    tile('Pastes and undos', `${fmtNum(sum.pastes)} · ${fmtNum(sum.undos)}`, sum.pasted ? `${fmtNum(sum.pasted)} words pasted` : '');
    tile('Notes', `${fmtNum(sum.opens)} opened`, `${fmtNum(sum.created)} made`);
    tile('Links and tasks', `${fmtNum(sum.links)} · ${fmtNum(sum.tasks)}`, 'links added, tasks done');
    tile('Breaks', fmtNum(sum.breaks), sum.stopped ? `${fmtNum(sum.stopped)} sessions stopped early` : 'no sessions stopped early');
    if (sum.outsideMs) tile('Outside Obsidian', fmtShort(sum.outsideMs), 'reading and research');
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
    tile('Streak', plural(streak, 'day'), `best ${plural(this.longestStreak(), 'day')}`);
    tile('Words written', fmtCount(now.written), `${fmtCount(now.deleted)} deleted`);
    tile('Focus sessions', String(now.sessions), `${fmtShort(now.focusMs)} of focus`);
    tile('Goal met', plural(r.keys.filter((k) => this.day(k).ms >= p.settings.dailyGoalMinutes * 60000).length, 'day'), `${fmtShort(p.settings.dailyGoalMinutes * 60000)} a day`);
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
    record('Longest streak', plural(this.longestStreak(), 'day'));
    record('All time', fmtShort(s.ms), plural(s.activeDays, 'active day'));
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
// Reports: a page of your work, as a PDF
// ---------------------------------------------------------------------------

// The widths of Helvetica and Helvetica Bold, which every PDF reader has, for the characters
// from space to tilde, in thousandths of the font size.
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// The characters of the PDF fonts' encoding (WinAnsi) beyond Latin-1, by their Unicode.
const WIN_ANSI = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};
const FROM_WIN_ANSI = Object.fromEntries(Object.entries(WIN_ANSI).map(([u, b]) => [b, Number(u)]));

// Widths of the other characters that aren't a letter with an accent, [regular, bold].
const WIDE_CHARS = {
  0x80: [556, 556], 0x85: [1000, 1000], 0x91: [222, 278], 0x92: [222, 278], 0x93: [333, 500], 0x94: [333, 500],
  0x95: [350, 350], 0x96: [556, 556], 0x97: [1000, 1000], 0x99: [1000, 1000], 0xa0: [278, 278], 0xa9: [737, 737],
  0xb0: [400, 400], 0xb7: [278, 278], 0xc6: [1000, 1000], 0xd7: [584, 584], 0xd8: [778, 778], 0xdf: [611, 611],
  0xe6: [889, 889], 0xf8: [611, 611],
};

// A string in the fonts' encoding. Characters they don't have, like emoji, are left out.
function pdfChars(str) {
  let out = '';
  for (const ch of String(str).normalize('NFC')) {
    const c = ch.codePointAt(0);
    if ((c >= 32 && c <= 126) || (c >= 160 && c <= 255)) out += ch;
    else if (WIN_ANSI[c]) out += String.fromCharCode(WIN_ANSI[c]);
    else if (c === 0x202f || c === 0x2009 || c === 0x2007) out += ' ';
    else if (c === 0x2212) out += '-';
  }
  return out.replace(/\s+/g, ' ');
}

function charWidth(code, bold) {
  if (code >= 32 && code <= 126) return (bold ? HELVETICA_BOLD : HELVETICA)[code - 32];
  if (WIDE_CHARS[code]) return WIDE_CHARS[code][bold ? 1 : 0];
  // A letter with an accent is as wide as the letter.
  const base = String.fromCharCode(code).normalize('NFD').charCodeAt(0);
  return base >= 32 && base <= 126 ? charWidth(base, bold) : 556;
}

function textWidth(str, size, bold, track = 0) {
  let w = 0;
  for (let i = 0; i < str.length; i++) w += charWidth(str.charCodeAt(i), bold);
  return (w * size) / 1000 + track * Math.max(0, str.length - 1);
}

// Points on a circle: angles go clockwise from 12 o'clock, in degrees.
function onCircle(cx, cy, r, a) {
  const t = (a * Math.PI) / 180;
  return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
}

// Adds an arc to a path, as cubic curves of at most a quarter turn.
function arcTo(d, cx, cy, r, a0, a1) {
  const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
  for (let i = 0; i < steps; i++) {
    const s = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    const e = ((a0 + ((a1 - a0) * (i + 1)) / steps) * Math.PI) / 180;
    const k = (4 / 3) * Math.tan((e - s) / 4) * r;
    d.push(['C',
      cx + r * Math.sin(s) + k * Math.cos(s), cy - r * Math.cos(s) + k * Math.sin(s),
      cx + r * Math.sin(e) - k * Math.cos(e), cy - r * Math.cos(e) - k * Math.sin(e),
      cx + r * Math.sin(e), cy - r * Math.cos(e)]);
  }
  return d;
}

function circleD(cx, cy, r) {
  return arcTo([['M', cx, cy - r]], cx, cy, r, 0, 360).concat([['Z']]);
}

function wedgeD(cx, cy, r0, r1, a0, a1) {
  const d = [['M', ...onCircle(cx, cy, r1, a0)]];
  arcTo(d, cx, cy, r1, a0, a1);
  d.push(['L', ...onCircle(cx, cy, r0, a1)]);
  arcTo(d, cx, cy, r0, a1, a0);
  d.push(['Z']);
  return d;
}

function roundRectD(x, y, w, h, r) {
  const k = r * 0.4477;
  return [['M', x + r, y], ['L', x + w - r, y], ['C', x + w - k, y, x + w, y + k, x + w, y + r], ['L', x + w, y + h - r],
    ['C', x + w, y + h - k, x + w - k, y + h, x + w - r, y + h], ['L', x + r, y + h], ['C', x + k, y + h, x, y + h - k, x, y + h - r],
    ['L', x, y + r], ['C', x, y + k, x + k, y, x + r, y], ['Z']];
}

// A bar from a baseline at y0 up to y1, rounded only at its top.
function barD(x, y0, w, y1, r) {
  r = Math.min(r, w / 2, Math.max(0, y0 - y1));
  const k = r * 0.4477;
  return [['M', x, y0], ['L', x, y1 + r], ['C', x, y1 + k, x + k, y1, x + r, y1], ['L', x + w - r, y1],
    ['C', x + w - k, y1, x + w, y1 + k, x + w, y1 + r], ['L', x + w, y0], ['Z']];
}

// One page of a report: shapes and text in points, from the top left, which become both the
// preview and the PDF.
class ReportPage {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.ops = [];
  }

  path(d, style) {
    this.ops.push(Object.assign({ t: 'path', d }, style));
  }

  rect(x, y, w, h, fill, r = 0) {
    if (w <= 0 || h <= 0) return;
    const d = r > 0 ? roundRectD(x, y, w, h, Math.min(r, w / 2, h / 2)) : [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
    this.path(d, { fill });
  }

  line(x1, y1, x2, y2, stroke, width = 0.5, extra) {
    this.path([['M', x1, y1], ['L', x2, y2]], Object.assign({ stroke, width }, extra));
  }

  circle(cx, cy, r, style) {
    this.path(circleD(cx, cy, r), style);
  }

  // Text on its baseline, to the left, centre or right of x, cut short with an ellipsis to fit
  // max. Returns how wide it is.
  text(x, y, str, o = {}) {
    const size = o.size || 8;
    const bold = !!o.bold;
    const track = o.track || 0;
    let s = pdfChars(o.upper ? String(str).toUpperCase() : str);
    if (o.max && textWidth(s, size, bold, track) > o.max) {
      while (s.length && textWidth(`${s}\x85`, size, bold, track) > o.max) s = s.slice(0, -1);
      s = `${s.replace(/\s+$/, '')}\x85`;
    }
    const w = textWidth(s, size, bold, track);
    const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    if (s) this.ops.push({ t: 'text', x: left, y, s, size, bold, track, color: o.color || '#1c2230' });
    return w;
  }
}

// The page drawn in SVG, for the preview.
function drawReportSvg(parent, pg) {
  const svg = parent.createSvg('svg', { attr: { viewBox: `0 0 ${pg.w} ${pg.h}` }, cls: 'pw-report-page' });
  svg.createSvg('rect', { attr: { width: pg.w, height: pg.h, fill: '#ffffff' } });
  const r2 = (v) => Math.round(v * 100) / 100;
  for (const op of pg.ops) {
    if (op.t === 'path') {
      const d = op.d.map(([c, ...v]) => `${c}${v.map(r2).join(' ')}`).join('');
      const attr = { d, fill: op.fill || 'none' };
      if (op.stroke) Object.assign(attr, { stroke: op.stroke, 'stroke-width': op.width, 'stroke-linecap': op.cap || 'butt', 'stroke-linejoin': 'round' });
      if (op.dash) attr['stroke-dasharray'] = op.dash.join(' ');
      svg.createSvg('path', { attr });
    } else {
      const text = Array.from(op.s, (ch) => String.fromCodePoint(FROM_WIN_ANSI[ch.charCodeAt(0)] || ch.charCodeAt(0))).join('');
      const t = svg.createSvg('text', {
        attr: { x: r2(op.x), y: r2(op.y), 'font-family': 'Helvetica, Arial, "Liberation Sans", sans-serif', 'font-size': op.size, 'font-weight': op.bold ? 700 : 400, fill: op.color, 'letter-spacing': op.track || 0 },
      });
      t.textContent = text;
    }
  }
  return svg;
}

// A string for a PDF content stream: brackets and backslashes escaped, and anything outside
// plain ASCII written in octal, so the whole file stays ASCII.
function pdfEscape(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 40 || c === 41 || c === 92) out += `\\${s[i]}`;
    else if (c < 32 || c > 126) out += `\\${c.toString(8).padStart(3, '0')}`;
    else out += s[i];
  }
  return out;
}

function pdfContent(pg) {
  const n = (v) => String(Math.round(v * 100) / 100);
  const rgb = (hex) => {
    const v = parseInt(hex.slice(1), 16);
    return `${n(((v >> 16) & 255) / 255)} ${n(((v >> 8) & 255) / 255)} ${n((v & 255) / 255)}`;
  };
  // Turn the page so it can be drawn from the top left, as on screen.
  const out = [`1 0 0 -1 0 ${n(pg.h)} cm`, '1 j'];
  for (const op of pg.ops) {
    if (op.t === 'path') {
      if (op.fill) out.push(`${rgb(op.fill)} rg`);
      if (op.stroke) out.push(`${rgb(op.stroke)} RG ${n(op.width || 0.5)} w ${op.cap === 'round' ? 1 : 0} J [${(op.dash || []).map(n).join(' ')}] 0 d`);
      out.push(op.d.map(([c, ...v]) => (c === 'Z' ? 'h' : `${v.map(n).join(' ')} ${{ M: 'm', L: 'l', C: 'c' }[c]}`)).join(' '));
      out.push(op.fill && op.stroke ? 'B' : op.fill ? 'f' : 'S');
    } else {
      // Text is turned back the right way up.
      out.push(`BT /${op.bold ? 'F2' : 'F1'} ${n(op.size)} Tf ${n(op.track)} Tc ${rgb(op.color)} rg 1 0 0 -1 ${n(op.x)} ${n(op.y)} Tm (${pdfEscape(op.s)}) Tj ET`);
    }
  }
  return out.join('\n');
}

// The pages as a PDF file.
function makePdf(pages, title) {
  const objs = [null, null];
  const add = (s) => objs.push(s);
  const regular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  for (const pg of pages) {
    const stream = pdfContent(pg);
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pg.w} ${pg.h}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objs[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  const t = new Date();
  const stamp = `${t.getFullYear()}${pad2(t.getMonth() + 1)}${pad2(t.getDate())}${pad2(t.getHours())}${pad2(t.getMinutes())}${pad2(t.getSeconds())}`;
  const info = add(`<< /Title (${pdfEscape(pdfChars(title))}) /Creator (Pocket Watch for Obsidian) /Producer (Pocket Watch) /CreationDate (D:${stamp}) >>`);
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}

// What a report covers: a project, time without one, or all your time.
const REPORT_ALL = '_all';

// Print colours for the projects' eight colours (as in a light theme), for time without a
// project, and for all your time or several projects together.
const REPORT_COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const REPORT_NONE = '#8b8a84';
const REPORT_INK = '#34405a';

const REPORT_LEVELS = { essentials: 'Essentials', balanced: 'Balanced', everything: 'Everything' };
const REPORT_LEVEL_NOTES = {
  essentials: 'The big numbers, every day of the work, and your weeks. Plenty of room to breathe.',
  balanced: 'Adds your words as they added up, the hours and days you work, and three highlights.',
  everything: 'Adds the notes your time went to, your records and some fun facts. A full page.',
};
const PAPERS = { a4: { name: 'A4', size: [595.28, 841.89] }, letter: { name: 'US Letter', size: [612, 792] } };

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// A report's colours, from the colour of its project: tints of it on white paper, and a
// deeper shade of it for text.
function reportTheme(color) {
  return {
    accent: color, deep: mixHex(color, '#101420', 0.3), tint: (t) => mixHex('#ffffff', color, t),
    panel: mixHex('#ffffff', color, 0.045), ink: '#1c2230', muted: '#5f6877', faint: '#9aa1ac', line: '#e3e6ea', empty: '#edeff2',
  };
}

// "A", "A and B", "A, B and C".
function andList(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function reportNum(n) {
  return Math.round(n).toLocaleString('en-GB');
}

function reportDate(key, style = 'long') {
  const o = style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : style === 'month' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' };
  return keyToDate(key).toLocaleDateString('en-GB', o);
}

function reportSlice(d, id) {
  return id === REPORT_ALL ? d : projectSlice(d, id);
}

function reportInfo(p, id) {
  if (id === REPORT_ALL) return { id, name: 'All my time', color: REPORT_INK };
  if (id === NO_PROJECT) return { id, name: 'No project', color: REPORT_NONE };
  const x = p.settings.projects.find((y) => y.id === id);
  return { id, name: x ? x.name : 'A project', color: REPORT_COLOURS[((x ? x.color : 1) - 1 + 8) % 8] };
}

// The first and last day with time for these, or null when there's none.
function reportSpan(p, ids) {
  const keys = Object.keys(p.days).sort().filter((k) => ids.some((id) => reportSlice(p.getDay(k), id).ms >= ACTIVE_DAY_MS));
  return keys.length ? [keys[0], keys[keys.length - 1]] : null;
}

// Everything a page shows, for the projects on it, from one day to another.
function reportData(p, ids, from, to) {
  const keys = [];
  for (let d = keyToDate(from); dayKey(d) <= to && keys.length < 3700; d.setDate(d.getDate() + 1)) keys.push(dayKey(d));
  const series = ids.map((id) => {
    const info = reportInfo(p, id);
    info.days = keys.map((k) => {
      const x = reportSlice(p.getDay(k), id);
      const d = { hours: x.hours || null, wordHours: x.wordHours || null, files: x.files || {}, fileWords: x.fileWords || {}, sits: x.sits || [], fastest: x.fastest || 0 };
      for (const n of SLICE_NUMBERS) d[n] = x[n] || 0;
      return d;
    });
    for (const k of SLICE_NUMBERS) info[k] = info.days.reduce((sum, d) => sum + d[k], 0);
    for (const k of SLICE_HOURS) {
      info[k] = new Array(24).fill(0);
      for (const d of info.days) if (d[k]) d[k].forEach((v, h) => (info[k][h] += v));
    }
    return info;
  });
  const days = keys.map((key, i) => {
    const parts = series.map((x) => x.days[i]);
    const day = { key, parts };
    for (const k of SLICE_NUMBERS) day[k] = parts.reduce((sum, d) => sum + d[k], 0);
    day.notes = new Set(parts.flatMap((d) => Object.keys(d.files))).size;
    day.fastest = Math.max(0, ...parts.map((d) => d.fastest));
    day.sits = parts.flatMap((d) => d.sits);
    // When the day's work began and ended: from its sittings, or from its hours before
    // sittings were kept.
    if (day.sits.length) {
      day.start = Math.min(...day.sits.map((x) => x[0]));
      day.end = Math.max(...day.sits.map((x) => x[0] + x[1]));
    } else {
      const hours = new Array(24).fill(0);
      for (const d of parts) if (d.hours) d.hours.forEach((ms, h) => (hours[h] += ms));
      const busy = hours.map((ms, h) => (ms >= 5 * 60000 ? h : -1)).filter((h) => h >= 0);
      if (busy.length) {
        day.start = busy[0] * 60;
        day.end = (busy[busy.length - 1] + 1) * 60;
        day.rough = true;
      }
    }
    return day;
  });
  const r = { keys, series, days, from, to };
  for (const k of SLICE_NUMBERS) r[k] = series.reduce((sum, x) => sum + x[k], 0);
  r.net = r.written - r.deleted;
  const worked = days.filter((d) => d.ms >= ACTIVE_DAY_MS);
  r.worked = worked.length;
  r.first = worked.length ? worked[0].key : from;
  r.last = worked.length ? worked[worked.length - 1].key : to;
  r.average = r.worked ? r.ms / r.worked : 0;
  r.best = days.reduce((a, d) => (d.ms > a.ms ? d : a), { ms: 0, key: from });
  r.wordiest = days.reduce((a, d) => (d.written > a.written ? d : a), { written: 0, key: from });
  let run = 0;
  r.streak = 0;
  r.streakEnd = from;
  for (const d of days) {
    run = d.ms >= ACTIVE_DAY_MS ? run + 1 : 0;
    if (run > r.streak) {
      r.streak = run;
      r.streakEnd = d.key;
    }
  }
  r.hours = new Array(24).fill(0);
  for (const x of series) x.hours.forEach((ms, h) => (r.hours[h] += ms));
  r.hoursMs = r.hours.reduce((a, b) => a + b, 0);
  r.peakHour = r.hours.indexOf(Math.max(...r.hours));
  // The average for each day of the week, Monday first or Sunday first as you like.
  const order = p.settings.weekStartsMonday ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  r.week = order.map((dow) => {
    const these = days.filter((d) => keyToDate(d.key).getDay() === dow);
    const n = Math.max(1, these.length);
    return { dow, parts: series.map((_, i) => these.reduce((sum, d) => sum + d.parts[i].ms, 0) / n) };
  });
  // Night, morning, afternoon and evening, from the hours.
  r.dayparts = [[0, 'Night', '0 to 6'], [6, 'Morning', '6 to 12'], [12, 'Afternoon', '12 to 18'], [18, 'Evening', '18 to 24']]
    .map(([h, name, span]) => ({ name, span, ms: r.hours.slice(h, h + 6).reduce((a, b) => a + b, 0) }));
  // The notes and folders the time went to, and which project had most of each note.
  const notes = {};
  series.forEach((x, i) => {
    for (const d of x.days) {
      for (const [path, ms] of Object.entries(d.files)) {
        const n = notes[path] || (notes[path] = { path, ms: 0, by: series.map(() => 0) });
        n.ms += ms;
        n.by[i] += ms;
      }
    }
  });
  r.notes = Object.values(notes).filter((n) => n.ms >= 60000).sort((a, b) => b.ms - a.ms);
  const months = {};
  for (const d of days) months[d.key.slice(0, 7)] = (months[d.key.slice(0, 7)] || 0) + d.ms;
  const top = Object.entries(months).sort((a, b) => b[1] - a[1])[0];
  r.busiestMonth = top && top[1] > 0 ? { key: `${top[0]}-01`, ms: top[1] } : null;

  for (const k of SLICE_HOURS) {
    r[k] = new Array(24).fill(0);
    for (const x of series) x[k].forEach((v, h) => (r[k][h] += v));
  }
  r.fastest = days.reduce((a, d) => (d.fastest > a.n ? { n: d.fastest, key: d.key } : a), { n: 0, key: from });
  r.busiestNotes = days.reduce((a, d) => (d.notes > a.n ? { n: d.notes, key: d.key } : a), { n: 0, key: from });
  r.mostKeys = days.reduce((a, d) => (d.typed > a.n ? { n: d.typed, key: d.key } : a), { n: 0, key: from });
  r.mostSessions = days.reduce((a, d) => (d.sessions > a.n ? { n: d.sessions, key: d.key } : a), { n: 0, key: from });
  // Sittings: every stretch at it, and the longest.
  r.sits = days.flatMap((d) => d.sits.map((x) => ({ key: d.key, start: x[0], len: x[1] })));
  r.longestSit = r.sits.reduce((a, x) => (x.len > a.len ? x : a), { len: 0, key: from, start: 0 });
  // The earliest start and the latest finish.
  const timed = days.filter((d) => d.start != null && d.ms >= ACTIVE_DAY_MS);
  r.timed = timed;
  r.earliest = timed.reduce((a, d) => (!a || d.start < a.start ? d : a), null);
  r.latest = timed.reduce((a, d) => (!a || d.end > a.end ? d : a), null);
  const median = (list) => {
    const v = list.slice().sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  };
  r.usualStart = median(timed.map((d) => d.start));
  r.usualEnd = median(timed.map((d) => d.end));
  // The longest break between two days of work.
  r.gap = { days: 0, from, to };
  let prev = null;
  for (const d of worked) {
    if (prev) {
      const n = Math.round((keyToDate(d.key) - keyToDate(prev)) / 86400000) - 1;
      if (n > r.gap.days) r.gap = { days: n, from: prev, to: d.key };
    }
    prev = d.key;
  }
  // The busiest week.
  const weeks = {};
  for (const d of days) {
    const date = keyToDate(d.key);
    const back = (date.getDay() - (p.settings.weekStartsMonday ? 1 : 0) + 7) % 7;
    const start = dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - back));
    weeks[start] = (weeks[start] || 0) + d.ms;
  }
  const bw = Object.entries(weeks).sort((a, b) => b[1] - a[1])[0];
  r.busiestWeek = bw && bw[1] > 0 ? { key: bw[0], ms: bw[1] } : null;
  // Words written in each note, and the folders the notes are in.
  const words = {};
  for (const x of series) for (const d of x.days) for (const [path, n] of Object.entries(d.fileWords)) words[path] = (words[path] || 0) + n;
  for (const n of r.notes) n.words = words[n.path] || 0;
  const folders = {};
  for (const n of r.notes) {
    const path = n.path.includes('/') ? n.path.slice(0, n.path.lastIndexOf('/')) : '';
    const f = folders[path] || (folders[path] = { path, ms: 0, words: 0, notes: 0 });
    f.ms += n.ms;
    f.words += n.words;
    f.notes += 1;
  }
  r.folders = Object.values(folders).sort((a, b) => b.ms - a.ms);
  // Month by month.
  const byMonth = {};
  for (const d of days) {
    const m = byMonth[d.key.slice(0, 7)] || (byMonth[d.key.slice(0, 7)] = { key: `${d.key.slice(0, 7)}-01`, ms: 0, days: 0, written: 0, sessions: 0, best: 0 });
    m.ms += d.ms;
    m.written += d.written;
    m.sessions += d.sessions;
    m.best = Math.max(m.best, d.ms);
    if (d.ms >= ACTIVE_DAY_MS) m.days += 1;
  }
  r.months = Object.values(byMonth);
  // Milestones: the day the time, and the words, first passed a round number.
  r.milestones = [];
  let ms = 0;
  let wrote = 0;
  const hourMarks = [1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
  const wordMarks = [1000, 5000, 10000, 20000, 30000, 40000, 50000, 75000, 100000, 125000, 150000, 200000, 250000, 300000];
  for (const d of days) {
    const before = [ms, wrote];
    ms += d.ms;
    wrote += d.written;
    for (const h of hourMarks) if (before[0] < h * 3600000 && ms >= h * 3600000) r.milestones.push({ key: d.key, what: `${reportNum(h)} ${h === 1 ? 'hour' : 'hours'} of work` });
    for (const w of wordMarks) if (before[1] < w && wrote >= w) r.milestones.push({ key: d.key, what: `${reportNum(w)} words written` });
  }
  if (r.worked) r.milestones.unshift({ key: r.first, what: 'The first day of work' });
  if (r.sessions) {
    const first = days.find((d) => d.sessions > 0);
    if (first) r.milestones.push({ key: first.key, what: 'The first focus session' });
  }
  r.milestones.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  // The weekend's share, and full moons in the range.
  r.weekendMs = days.filter((d) => [0, 6].includes(keyToDate(d.key).getDay())).reduce((sum, d) => sum + d.ms, 0);
  r.fullMoons = 0;
  for (let i = 1; i < keys.length; i++) {
    const a = moonPhase(keyToDate(keys[i - 1]));
    const b = moonPhase(keyToDate(keys[i]));
    if (a < 0.5 && b >= 0.5) r.fullMoons++;
  }
  // Where the work was done, when there's more than one device.
  r.devices = typeof p.deviceList === 'function' ? p.deviceList().map((dv) => {
    let dms = 0;
    let dwords = 0;
    for (const k of keys) {
      const d = dv.days[k];
      if (!d) continue;
      for (const id of ids) {
        const x = reportSlice(d, id);
        dms += x.ms || 0;
        dwords += x.written || 0;
      }
    }
    return { name: dv.name, kind: dv.kind, ms: dms, written: dwords };
  }).filter((dv) => dv.ms > 0).sort((a, b) => b.ms - a.ms) : [];
  return r;
}

// Words too common to be anyone's favourite, in English and Norwegian.
const STOP_WORDS = new Set(`a about above after again against all also am an and any are as at be because been before being
below between both but by can could did do does doing down during each even few for from further had has have having he her
here hers him his how i if in into is it its itself just let like made make many may me might more most much must my no nor not
now of off on once one only or other our ours out over own same she should so some such than that the their them then there
these they this those through to too under until up upon very was we were what when where which while who whom why will with
within without would yet you your also however therefore thus used using use well within can't don't it's that's there's
og i jeg det at en et den til er som på de med han av ikke der så var meg seg men ett har om vi min mitt ha hadde hun nå over
da ved fra du ut sin dem oss opp man kan hans hvor eller hva skal selv sjøl her alle vil bli ble blitt kunne inn når være
kom noen noe ville dere deres kun ja etter ned skulle denne for deg si sine sitt mot å meget hvorfor dette disse uten hvordan
ingen din ditt blir samme hvilken hvilke sånn inni mellom vår hver hvem vors hvis både bare enn fordi før mange også slik vært`.split(/\s+/));

// Well-known books, with about how many words each has, to measure the writing against.
const BOOKS = [['Of Mice and Men', 29160], ['The Great Gatsby', 47094], ['Frankenstein', 74800], ['Pride and Prejudice', 122000], ['Moby-Dick', 206000]];

// The text of the notes a report covers, read now: how many words they hold, the words used
// most, the longest, how long the sentences are, and what's in them: questions, citations,
// footnotes, links and headings.
async function analyseText(app, paths) {
  const t = { notes: 0, words: 0, chars: 0, sentences: 0, questions: 0, exclaims: 0, dashes: 0, citations: 0, footnotes: 0, links: 0, headings: 0, quotes: 0, longest: '' };
  const freq = new Map();
  for (const path of paths.slice(0, 500)) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file || file.extension !== 'md') continue;
    let text;
    try {
      text = await app.vault.cachedRead(file);
    } catch (e) {
      continue;
    }
    t.notes += 1;
    // Leave out the properties at the top, and code.
    text = text.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
    t.headings += (text.match(/^#{1,6}\s/gm) || []).length;
    t.quotes += (text.match(/^>\s?\S/gm) || []).length;
    t.links += (text.match(/\[\[[^\]]+\]\]/g) || []).length + (text.match(/\]\((?:https?:|[^)]+\.md)/g) || []).length;
    t.footnotes += (text.match(/^\[\^[^\]]+\]:/gm) || []).length;
    // Citations: [@key], \cite{key}, and (Author, 2020) or (Author et al. 2020).
    t.citations += (text.match(/\[@[^\]]+\]|\\cite\w*\{[^}]+\}|\((?:see )?[A-Z][\p{L}'-]+(?:\s(?:et al\.?|and|&)\s?[A-Z]?[\p{L}'-]*)?,?\s(?:19|20)\d\d[a-z]?(?:[,:;][^)]*)?\)/gu) || []).length;
    const plain = text
      .replace(/!?\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (m, a, b) => b || a.split('/').pop())
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[#>*_~=[\]|]/g, ' ');
    t.questions += (plain.match(/\?/g) || []).length;
    t.exclaims += (plain.match(/!/g) || []).length;
    t.dashes += (plain.match(/\u2014|\u2013| -- /g) || []).length;
    t.sentences += (plain.match(/[.!?]+(?=\s|$)/g) || []).length;
    for (const raw of plain.match(/[\p{L}][\p{L}'\u2019-]*/gu) || []) {
      const w = raw.toLowerCase().replace(/['\u2019-]+$/, '');
      t.words += 1;
      t.chars += w.length;
      if (w.length > t.longest.length && w.length < 30 && !w.includes('-')) t.longest = w;
      if (w.length >= 4 && !STOP_WORDS.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  t.unique = freq.size;
  t.top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return t;
}

// A time of day from minutes after midnight: "09:40".
function clockText(min) {
  const m = Math.round(min);
  return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;
}

// A page of time, in days or weeks, each with its projects' share.
function reportPeriods(p, r) {
  if (r.days.length <= 35) {
    return { weekly: false, list: r.days.map((d) => ({ key: d.key, parts: d.parts.map((x) => x.ms) })) };
  }
  const list = [];
  const startsMonday = p.settings.weekStartsMonday;
  for (const d of r.days) {
    const date = keyToDate(d.key);
    const back = (date.getDay() - (startsMonday ? 1 : 0) + 7) % 7;
    const start = dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - back));
    if (!list.length || list[list.length - 1].key !== start) list.push({ key: start, parts: r.series.map(() => 0) });
    d.parts.forEach((x, i) => (list[list.length - 1].parts[i] += x.ms));
  }
  return { weekly: true, list };
}

// What kind of worker the hours say you are.
function reportPersona(r) {
  const top = r.dayparts.reduce((a, b) => (b.ms > a.ms ? b : a));
  const share = r.hoursMs ? Math.round((top.ms / r.hoursMs) * 100) : 0;
  const name = { Night: 'A night owl', Morning: 'An early bird', Afternoon: 'An afternoon person', Evening: 'An evening writer' }[top.name];
  return { name, part: top.name, share };
}

// --- Drawing the page ----------------------------------------------------

function reportPanel(pg, box, th) {
  pg.rect(box.x, box.y, box.w, box.h, th.panel, 7);
}

// A section's name, small and spaced out, with a short line in the project's colour.
function reportHeading(pg, x, y, text, th, right) {
  pg.rect(x, y - 6.2, 2.4, 7.2, th.accent, 1.2);
  pg.text(x + 7, y, text, { size: 6.8, bold: true, track: 0.9, upper: true, color: th.muted });
  if (right) pg.text(right.x, y, right.text, { size: 6.8, color: th.faint, align: 'right' });
}

function drawMonogram(pg, x, y, width, color) {
  const [x0, y0, x1] = MONOGRAM.box;
  const k = width / (x1 - x0);
  const tokens = MONOGRAM.path.match(/[MLQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const d = [];
  let i = 0;
  let cmd = '';
  let px = 0;
  let py = 0;
  const num = () => Number(tokens[i++]);
  const at = (vx, vy) => [x + (vx - x0) * k, y + (vy - y0) * k];
  while (i < tokens.length) {
    if (/[A-Z]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === 'Z') {
      d.push(['Z']);
      continue;
    }
    if (cmd === 'M' || cmd === 'L') {
      px = num();
      py = num();
      d.push([cmd, ...at(px, py)]);
    } else if (cmd === 'Q') {
      // A quadratic curve, as the cubic one a PDF draws.
      const qx = num();
      const qy = num();
      const ex = num();
      const ey = num();
      d.push(['C', ...at(px + (2 / 3) * (qx - px), py + (2 / 3) * (qy - py)), ...at(ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey)), ...at(ex, ey)]);
      px = ex;
      py = ey;
    } else if (cmd === 'C') {
      const c = [num(), num(), num(), num(), num(), num()];
      d.push(['C', ...at(c[0], c[1]), ...at(c[2], c[3]), ...at(c[4], c[5])]);
      px = c[4];
      py = c[5];
    } else i++;
  }
  pg.path(d, { fill: color });
}

function drawReportHead(pg, th, r, o) {
  const M = o.margin;
  const band = o.landscape ? 84 : 98;
  pg.rect(0, 0, pg.w, band, th.tint(0.085));
  pg.rect(0, 0, pg.w, 3, th.accent);
  // A small monogram in the corner.
  drawMonogram(pg, pg.w - M - 26, 24, 26, th.accent);
  pg.text(M, 30, 'Time report', { size: 6.6, bold: true, track: 1.6, upper: true, color: th.deep });
  const maxW = pg.w - 2 * M - 60;
  let size = o.landscape ? 22 : 24;
  while (size > 14 && textWidth(pdfChars(o.title), size, true) > maxW) size -= 1;
  const base = 30 + 7 + size * 0.8;
  pg.text(M, base, o.title, { size, bold: true, color: th.ink, max: maxW });
  const span = r.keys.length;
  const sub = `${reportDate(r.from)} to ${reportDate(r.to)}  \u00b7  ${reportNum(span)} ${span === 1 ? 'day' : 'days'}`;
  pg.text(M, base + 15, sub, { size: 8.6, color: th.muted, max: maxW });
  if (o.note) pg.text(M, base + 28, o.note, { size: 8.2, bold: true, color: th.deep, max: maxW });
  return band;
}

// The top of a page after the first: the title, small, under a thin line in the colour.
function drawReportHeadSmall(pg, th, o) {
  pg.rect(0, 0, pg.w, 3, th.accent);
  pg.text(o.margin, 26, o.title, { size: 9.5, bold: true, color: th.ink, max: pg.w - 2 * o.margin - 60 });
  pg.text(pg.w - o.margin, 26, 'Time report, continued', { size: 6.4, color: th.faint, align: 'right' });
  return 38;
}

function drawReportFoot(pg, th, o) {
  const M = o.margin;
  const y = pg.h - 18;
  pg.line(M, y - 9, pg.w - M, y - 9, th.line, 0.5);
  pg.text(M, y, 'Made with Pocket Watch', { size: 5.4, color: th.faint });
  const made = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  pg.text(pg.w - M, y, `${made}${o.pages > 1 ? `  \u00b7  ${o.page + 1} of ${o.pages}` : ''}`, { size: 5.4, color: th.faint, align: 'right' });
}

// The time spent, large, and the numbers beside it.
function drawReportHero(pg, box, th, r, level) {
  const big = Math.min(level === 'essentials' ? 46 : level === 'balanced' ? 41 : 38, box.h * 0.42);
  pg.text(box.x, box.y + 8, 'Time spent', { size: 6.8, bold: true, track: 0.9, upper: true, color: th.muted });
  const base = box.y + 12 + big * 0.78;
  const hours = Math.floor(r.ms / 3600000);
  const mins = Math.floor(r.ms / 60000) % 60;
  // Hours and minutes large, their units smaller, as on a watch.
  let x = box.x;
  x += pg.text(x, base, reportNum(hours), { size: big, bold: true, color: th.deep });
  x += pg.text(x + 2, base, 'h', { size: big * 0.45, bold: true, color: th.deep }) + 8;
  x += pg.text(x, base, pad2(mins), { size: big, bold: true, color: th.deep });
  pg.text(x + 2, base, 'm', { size: big * 0.45, bold: true, color: th.deep });
  const lines = [`on ${reportNum(r.worked)} ${r.worked === 1 ? 'day' : 'days'}, ${fmtShort(r.average)} on a typical one`];
  if (r.series.length > 1) lines.push(andList(r.series.map((x) => x.name)));
  lines.forEach((t, i) => pg.text(box.x, base + 15 + i * 12, t, { size: 8.5, color: th.muted, max: box.w * 0.4 }));

  const tiles = [
    ['Words written', reportNum(r.written), r.deleted ? `${reportNum(r.deleted)} deleted` : 'none deleted'],
    ['Days worked', reportNum(r.worked), `of ${reportNum(r.keys.length)}`],
    ['Longest streak', `${r.streak} ${r.streak === 1 ? 'day' : 'days'}`, r.streak ? `to ${reportDate(r.streakEnd, 'short')}` : ''],
    ['Best day', fmtShort(r.best.ms), r.best.ms ? reportDate(r.best.key, 'short') : ''],
    ['Focus sessions', reportNum(r.sessions), `${fmtShort(r.focusMs)} of focus`],
    ['Words an hour', r.ms >= 600000 ? reportNum(r.written / (r.ms / 3600000)) : '-', 'while working'],
    ['Notes', reportNum(r.notes.length), r.opens ? `opened ${reportNum(r.opens)} times` : 'worked in'],
    r.sits.length ? ['Sittings', reportNum(r.sits.length), `${fmtShort((r.sits.reduce((sum, x) => sum + x.len, 0) / r.sits.length) * 60000)} each`] : ['Longest break', `${r.gap.days} ${r.gap.days === 1 ? 'day' : 'days'}`, 'between two days of work'],
    r.typed ? ['Keys typed', reportNum(r.typed), `${reportNum(r.erased)} Backspace`] : ['Busiest month', r.busiestMonth ? reportDate(r.busiestMonth.key, 'month') : '-', r.busiestMonth ? fmtShort(r.busiestMonth.ms) : ''],
  ].slice(0, level === 'essentials' ? 4 : level === 'balanced' ? 6 : 9);
  const cols = level === 'essentials' ? 2 : 3;
  const x0 = box.x + box.w * 0.44;
  const cw = (box.x + box.w - x0) / cols;
  const rows = Math.ceil(tiles.length / cols);
  const rh = box.h / rows;
  tiles.forEach(([label, value, sub], i) => {
    const cx = x0 + (i % cols) * cw + 10;
    const cy = box.y + Math.floor(i / cols) * rh;
    pg.line(cx - 10, cy + 2, cx - 10, cy + rh - 6, th.line, 0.7);
    pg.text(cx, cy + 9, label, { size: 6.2, bold: true, track: 0.7, upper: true, color: th.muted, max: cw - 14 });
    const vs = Math.min(18, rh * 0.36);
    pg.text(cx, cy + 12 + vs * 0.85, value, { size: vs, bold: true, color: th.ink, max: cw - 14 });
    if (sub) pg.text(cx, cy + 12 + vs * 0.85 + 10.5, sub, { size: 7, color: th.faint, max: cw - 14 });
  });
}

// Every day of the work, a square for each, darker for the days with more time.
function drawReportCalendar(pg, box, th, r, detail = 'everything') {
  reportPanel(pg, box, th);
  const pad = 12;
  const x = box.x + pad;
  const y = box.y + pad + 6;
  reportHeading(pg, x, y, 'Every day of the work', th);
  // How much is a lot: a quarter of the days you worked had more than the top step.
  const sorted = r.days.filter((d) => d.ms >= ACTIVE_DAY_MS).map((d) => d.ms).sort((a, b) => a - b);
  const q = (f) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))] || 0;
  const steps = [q(0.25), q(0.5), q(0.75)];
  const level = (ms) => (ms < ACTIVE_DAY_MS ? 0 : ms <= steps[0] ? 1 : ms <= steps[1] ? 2 : ms <= steps[2] ? 3 : 4);
  const shades = [0, 0.3, 0.52, 0.76, 1];
  const colour = (d) => {
    const l = level(d.ms);
    if (!l) return th.empty;
    let top = 0;
    d.parts.forEach((x, i) => {
      if (x.ms > d.parts[top].ms) top = i;
    });
    const c = r.series.length > 1 ? r.series[top].color : th.accent;
    return mixHex('#ffffff', c, shades[l]);
  };
  // The legend.
  const lx = box.x + box.w - pad;
  let at = lx - pg.text(lx, y, 'More', { size: 6.3, color: th.faint, align: 'right' }) - 4;
  for (let l = 4; l >= 0; l--) {
    at -= 7.5;
    pg.rect(at, y - 6, 6.2, 6.2, l ? mixHex('#ffffff', th.accent, shades[l]) : th.empty, 1.4);
  }
  pg.text(at - 4, y, 'Less', { size: 6.3, color: th.faint, align: 'right' });

  const startsMonday = pg.weekStartsMonday;
  const first = keyToDate(r.keys[0]);
  const back = (first.getDay() - (startsMonday ? 1 : 0) + 7) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - back);
  const weeks = Math.ceil((back + r.keys.length) / 7);
  if (weeks <= 6) {
    drawReportMonth(pg, box, th, r, { colour, start, weeks, top: y + 10, pad });
    return;
  }
  const labelW = 14;
  const top = y + 18;
  const cell = Math.max(2, Math.min((box.w - 2 * pad - labelW) / weeks, (box.y + box.h - pad - 12 - top) / 7, 13));
  const size = cell * 0.82;
  const gx = x + labelW;
  const names = startsMonday ? ['M', '', 'W', '', 'F', '', ''] : ['', 'M', '', 'W', '', 'F', ''];
  names.forEach((n, i) => n && pg.text(x, top + i * cell + size * 0.8, n, { size: Math.min(6, size), color: th.faint }));
  const byKey = new Map(r.days.map((d) => [d.key, d]));
  let lastEnd = -100;
  for (let w = 0; w < weeks; w++) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
      const key = dayKey(date);
      const d = byKey.get(key);
      if (!d) continue;
      pg.rect(gx + w * cell, top + i * cell, size, size, colour(d), Math.min(1.8, size * 0.24));
      // A month's name over the week its first day falls in.
      if (date.getDate() === 1 || (w === 0 && i === back)) {
        const label = date.getMonth() === 0 || w === 0 ? date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : date.toLocaleDateString('en-GB', { month: 'short' });
        const lxw = gx + w * cell;
        if (lxw > lastEnd + 5) lastEnd = lxw + pg.text(lxw, top - 4, label, { size: 6.3, color: th.muted });
      }
    }
  }
  const caption = `${reportNum(r.worked)} days worked  ·  longest streak ${r.streak} ${r.streak === 1 ? 'day' : 'days'}  ·  ${fmtShort(r.average)} on a typical day`;
  pg.text(x, Math.min(box.y + box.h - pad + 2, top + 7 * cell + 11), caption, { size: 6.8, color: th.muted });
  // With room to spare beside the days, the months: a column for each.
  const months = [];
  for (const d of r.days) {
    const key = d.key.slice(0, 7);
    if (!months.length || months[months.length - 1].key !== key) months.push({ key, ms: 0 });
    months[months.length - 1].ms += d.ms;
  }
  const mx = Math.max(gx + weeks * cell + 24, lastEnd + 14);
  if (detail === 'essentials' || months.length < 3 || box.x + box.w - pad - mx < 90 || (box.x + box.w - pad - mx) / months.length < 7) return;
  const band = Math.min(18, (box.x + box.w - pad - mx) / months.length);
  const mw = band * 0.7;
  const mTop = top;
  const mBottom = top + 7 * cell - 2;
  const most = Math.max(1, ...months.map((m) => m.ms));
  pg.text(mx, top - 4, 'By month', { size: 6.3, color: th.muted });
  months.forEach((m, i) => {
    const bx = mx + i * band + (band - mw) / 2;
    const h = (mBottom - mTop - 9) * (m.ms / most);
    pg.rect(bx, mBottom - 9 - (mBottom - mTop - 9), mw, mBottom - mTop - 9, th.empty, 1.5);
    if (m.ms) pg.path(barD(bx, mBottom - 9, mw, mBottom - 9 - h, 1.5), { fill: m.ms === most ? th.deep : th.tint(0.6) });
    pg.text(bx + mw / 2, mBottom + 0.5, keyToDate(`${m.key}-01`).toLocaleDateString('en-GB', { month: 'narrow' }), { size: 5.6, color: m.ms === most ? th.deep : th.faint, bold: m.ms === most, align: 'center' });
  });
}

// A few weeks, as a calendar: a row for each week, with each day's date and its time.
function drawReportMonth(pg, box, th, r, o) {
  const x = box.x + o.pad;
  const w = box.w - 2 * o.pad;
  const colW = w / 7;
  const top = o.top + 10;
  const rowH = Math.min(30, (box.y + box.h - o.pad - 14 - top) / o.weeks);
  const ref = o.start;
  for (let i = 0; i < 7; i++) {
    const name = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + i).toLocaleDateString('en-GB', { weekday: 'short' });
    pg.text(x + i * colW + 3, top - 3, name, { size: 6.3, color: th.muted });
  }
  const byKey = new Map(r.days.map((d) => [d.key, d]));
  for (let wk = 0; wk < o.weeks; wk++) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + wk * 7 + i);
      const d = byKey.get(dayKey(date));
      if (!d) continue;
      const cx = x + i * colW;
      const cy = top + wk * rowH;
      const fill = o.colour(d);
      pg.rect(cx + 1, cy + 1, colW - 2, rowH - 2, fill, 3);
      const dark = fill !== th.empty && parseInt(fill.slice(1, 3), 16) * 0.3 + parseInt(fill.slice(3, 5), 16) * 0.59 + parseInt(fill.slice(5, 7), 16) * 0.11 < 150;
      const label = date.getDate() === 1 || (wk === 0 && i === (r.days[0] && keyToDate(r.days[0].key).getDay() - (pg.weekStartsMonday ? 1 : 0) + 7) % 7)
        ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : String(date.getDate());
      pg.text(cx + 5, cy + 9, label, { size: 6.2, color: dark ? '#ffffff' : th.muted });
      if (d.ms >= ACTIVE_DAY_MS && rowH > 16) pg.text(cx + colW - 5, cy + rowH - 5, fmtShort(d.ms), { size: 7, bold: true, color: dark ? '#ffffff' : th.ink, align: 'right' });
    }
  }
  const caption = `${reportNum(r.worked)} days worked  ·  longest streak ${r.streak} ${r.streak === 1 ? 'day' : 'days'}  ·  ${fmtShort(r.average)} on a typical day`;
  pg.text(x, top + o.weeks * rowH + 11, caption, { size: 6.8, color: th.muted });
}

// Time each week (or day), stacked by project, with the average marked.
function drawReportBars(pg, box, th, r, p) {
  reportPanel(pg, box, th);
  const pad = 12;
  const { weekly, list } = reportPeriods(p, r);
  const totals = list.map((x) => x.parts.reduce((a, b) => a + b, 0));
  const busy = totals.filter((t) => t > 0);
  const avg = busy.length ? busy.reduce((a, b) => a + b, 0) / busy.length : 0;
  reportHeading(pg, box.x + pad, box.y + pad + 6, weekly ? 'Time each week' : 'Time each day', th, { x: box.x + box.w - pad, text: `${fmtShort(avg)} in a typical ${weekly ? 'week' : 'day'} you worked` });
  const x0 = box.x + pad + 24;
  const x1 = box.x + box.w - pad;
  const y0 = box.y + box.h - pad - 10;
  const y1 = box.y + pad + 20;
  const max = Math.max(...totals, 30 * 60000);
  const ticks = axisTicks(max, true);
  const topV = ticks[ticks.length - 1];
  const yy = (v) => y0 - (y0 - y1) * (v / topV);
  for (const t of ticks) {
    pg.line(x0, yy(t), x1, yy(t), t ? th.line : mixHex(th.line, '#000000', 0.15), t ? 0.5 : 0.7);
    pg.text(x0 - 5, yy(t) + 2.2, t ? fmtCompact(t) : '0', { size: 6, color: th.faint, align: 'right' });
  }
  const band = (x1 - x0) / list.length;
  const bw = Math.max(0.8, Math.min(16, band * 0.72));
  list.forEach((period, i) => {
    let base = 0;
    const parts = period.parts.map((v, j) => [v, j]).filter(([v]) => v > 0);
    parts.forEach(([v, j], k) => {
      const ya = yy(base);
      const yb = yy(base + v);
      base += v;
      const colour = r.series.length > 1 ? r.series[j].color : th.accent;
      if (ya - yb < 0.3) return;
      const bx = x0 + i * band + (band - bw) / 2;
      if (k === parts.length - 1) pg.path(barD(bx, ya, bw, yb, Math.min(1.6, bw / 2)), { fill: colour });
      else pg.rect(bx, yb, bw, ya - yb - (k ? 0 : 0), colour);
    });
  });
  if (avg) pg.line(x0, yy(avg), x1, yy(avg), th.deep, 0.6, { dash: [2, 2] });
  // Months along the bottom, or every few days.
  let last = -100;
  list.forEach((period, i) => {
    const date = keyToDate(period.key);
    const label = weekly
      ? (i === 0 || date.getDate() <= 7 ? date.toLocaleDateString('en-GB', { month: 'short' }) : '')
      : (i === 0 || i % Math.ceil(list.length / 8) === 0 ? reportDate(period.key, 'short') : '');
    const lx = x0 + i * band;
    if (label && lx - last > textWidth(pdfChars(label), 6, false) + 5) {
      pg.text(lx, y0 + 9, label, { size: 6, color: th.faint });
      last = lx;
    }
  });
}

// The words written, as they added up over the work.
function drawReportWords(pg, box, th, r) {
  reportPanel(pg, box, th);
  const pad = 12;
  reportHeading(pg, box.x + pad, box.y + pad + 6, 'Words, adding up', th);
  if (!r.written) {
    pg.text(box.x + pad, box.y + box.h / 2, 'No words were counted on these days.', { size: 7.5, color: th.faint });
    return;
  }
  pg.text(box.x + box.w - pad, box.y + pad + 7, reportNum(r.written), { size: 11, bold: true, color: th.deep, align: 'right' });
  const x0 = box.x + pad + 24;
  const x1 = box.x + box.w - pad;
  const y0 = box.y + box.h - pad - 10;
  const y1 = box.y + pad + 22;
  const runs = r.series.map((x) => {
    let sum = 0;
    return x.days.map((d) => (sum += d.written));
  });
  const max = Math.max(10, ...runs.map((run) => run[run.length - 1] || 0));
  const ticks = axisTicks(max, false);
  const topV = ticks[ticks.length - 1];
  const yy = (v) => y0 - (y0 - y1) * (v / topV);
  const xx = (i) => x0 + (x1 - x0) * (r.days.length > 1 ? i / (r.days.length - 1) : 0);
  for (const t of ticks) {
    pg.line(x0, yy(t), x1, yy(t), th.line, 0.5);
    pg.text(x0 - 5, yy(t) + 2.2, fmtCount(t), { size: 6, color: th.faint, align: 'right' });
  }
  runs.forEach((run, j) => {
    const colour = r.series.length > 1 ? r.series[j].color : th.accent;
    // At most one point for each point's width of the chart.
    const every = Math.max(1, Math.floor(run.length / ((x1 - x0) / 1.5)));
    const pts = [];
    for (let i = 0; i < run.length; i += every) pts.push([xx(i), yy(run[i])]);
    pts.push([xx(run.length - 1), yy(run[run.length - 1])]);
    if (r.series.length === 1) pg.path([['M', x0, y0], ...pts.map((pt) => ['L', ...pt]), ['L', x1, y0], ['Z']], { fill: th.tint(0.16) });
    pg.path([['M', ...pts[0]], ...pts.slice(1).map((pt) => ['L', ...pt])], { stroke: colour, width: 1.3, cap: 'round' });
    const end = pts[pts.length - 1];
    pg.circle(end[0], end[1], 2, { fill: colour });
  });
  pg.text(x0, y0 + 9, reportDate(r.from, 'short'), { size: 6, color: th.faint });
  pg.text(x1, y0 + 9, reportDate(r.to, 'short'), { size: 6, color: th.faint, align: 'right' });
}

// The hours of the day you worked, round a 24-hour dial: midnight at the top.
function drawReportDial(pg, box, th, r) {
  reportPanel(pg, box, th);
  const pad = 12;
  reportHeading(pg, box.x + pad, box.y + pad + 6, 'When you worked', th);
  // Room for the dial between the heading and the caption, with its hours round the outside.
  const top = box.y + pad + 14;
  const room = box.y + box.h - pad - 12 - top;
  const r1 = Math.max(10, Math.min((box.w - 2 * pad) / 2, room / 2) - 12);
  const cx = box.x + box.w / 2;
  const cy = top + room / 2;
  const r0 = r1 * 0.24;
  pg.circle(cx, cy, r1, { stroke: th.line, width: 0.6 });
  pg.circle(cx, cy, (r0 + r1) / 2, { stroke: th.line, width: 0.4, dash: [1, 1.6] });
  for (let h = 0; h < 24; h++) {
    const [ax, ay] = onCircle(cx, cy, r1 + 1.5, h * 15);
    const [bx, by] = onCircle(cx, cy, r1 + (h % 6 ? 3 : 5), h * 15);
    pg.line(ax, ay, bx, by, th.faint, 0.5);
  }
  const max = Math.max(1, ...r.hours);
  for (let h = 0; h < 24; h++) {
    let from = r0 + 1;
    r.series.forEach((x, j) => {
      const v = x.hours[h];
      if (!v) return;
      const to = from + (r1 - r0 - 1) * (v / max);
      pg.path(wedgeD(cx, cy, from, to, h * 15 + 1.2, h * 15 + 13.8), { fill: r.series.length > 1 ? x.color : h === r.peakHour ? th.deep : th.accent });
      from = to;
    });
  }
  for (const h of [0, 6, 12, 18]) {
    const [lx, ly] = onCircle(cx, cy, r1 + 10, h * 15);
    pg.text(lx, ly + 2, pad2(h), { size: 5.8, color: th.faint, align: 'center' });
  }
  const caption = r.hoursMs ? `Busiest from ${pad2(r.peakHour)}:00 to ${pad2((r.peakHour + 1) % 24)}:00` : r.ms ? 'Hours are noted from version 1.10' : 'No time on these days';
  pg.text(cx, box.y + box.h - pad + 1, caption, { size: 6.8, color: th.muted, align: 'center' });
}

// Your average day of the week.
function drawReportWeek(pg, box, th, r) {
  reportPanel(pg, box, th);
  const pad = 12;
  reportHeading(pg, box.x + pad, box.y + pad + 6, 'Your week', th);
  const totals = r.week.map((d) => d.parts.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const peak = totals.some((t) => t > 0) ? totals.indexOf(Math.max(...totals)) : -1;
  const x0 = box.x + pad;
  const x1 = box.x + box.w - pad;
  const y0 = box.y + box.h - pad - 22;
  const y1 = box.y + pad + 30;
  const band = (x1 - x0) / 7;
  const bw = Math.min(18, band * 0.6);
  const ref = daysAgo(0);
  r.week.forEach((d, i) => {
    const bx = x0 + i * band + (band - bw) / 2;
    let base = 0;
    const parts = d.parts.map((v, j) => [v, j]).filter(([v]) => v > 0);
    parts.forEach(([v, j], k) => {
      const ya = y0 - (y0 - y1) * (base / max);
      const yb = y0 - (y0 - y1) * ((base + v) / max);
      base += v;
      const colour = r.series.length > 1 ? r.series[j].color : i === peak ? th.deep : th.tint(0.55);
      if (k === parts.length - 1) pg.path(barD(bx, ya, bw, yb, 2), { fill: colour });
      else pg.rect(bx, yb, bw, ya - yb, colour);
    });
    if (totals[i]) pg.text(bx + bw / 2, y0 - (y0 - y1) * (totals[i] / max) - 4, fmtCompact(totals[i]), { size: 5.8, color: i === peak ? th.deep : th.faint, bold: i === peak, align: 'center' });
    const name = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay() + d.dow).toLocaleDateString('en-GB', { weekday: 'short' });
    pg.text(bx + bw / 2, y0 + 9, name, { size: 6.3, color: i === peak ? th.ink : th.faint, bold: i === peak, align: 'center' });
  });
  pg.line(x0, y0, x1, y0, th.line, 0.7);
  const best = peak >= 0 && new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay() + r.week[peak].dow).toLocaleDateString('en-GB', { weekday: 'long' });
  pg.text(box.x + box.w / 2, box.y + box.h - pad + 1, best ? `Most on ${best}s, on average` : 'No time on these days', { size: 6.8, color: th.muted, align: 'center' });
}

// Night, morning, afternoon or evening: when the time went, and what that makes you.
function drawReportDayparts(pg, box, th, r) {
  reportPanel(pg, box, th);
  const pad = 12;
  reportHeading(pg, box.x + pad, box.y + pad + 6, 'Time of day', th);
  const persona = reportPersona(r);
  if (!r.hoursMs) persona.part = '';
  // In a short card, the name and its share on one line.
  const compact = box.h < 124;
  pg.text(box.x + pad, box.y + pad + (compact ? 22 : 25), r.hoursMs ? persona.name : 'Not yet known', { size: compact ? 10 : 12.5, bold: true, color: th.deep, max: box.w - 2 * pad });
  if (!compact) pg.text(box.x + pad, box.y + pad + 36, r.hoursMs ? `${persona.share}% of your time was in the ${persona.part.toLowerCase()}` : '', { size: 6.8, color: th.muted, max: box.w - 2 * pad });
  const top = box.y + pad + (compact ? 28 : 48);
  const rowH = Math.max(9.5, Math.min(17, (box.y + box.h - pad - top) / 4));
  const max = Math.max(1, ...r.dayparts.map((d) => d.ms));
  r.dayparts.forEach((d, i) => {
    const y = top + i * rowH;
    const w = pg.text(box.x + pad, y + 7.5, d.name, { size: 7, bold: d.name === persona.part, color: th.ink });
    pg.text(box.x + pad + w + 3, y + 7.5, d.span.replace(' to ', '-'), { size: 5.6, color: th.faint });
    const bx = box.x + pad + 66;
    const bw = box.w - 2 * pad - 66 - 26;
    pg.rect(bx, y + 3, bw, 5, th.empty, 2.5);
    if (d.ms) pg.rect(bx, y + 3, Math.max(5, bw * (d.ms / max)), 5, d.name === persona.part ? th.deep : th.tint(0.6), 2.5);
    pg.text(box.x + box.w - pad, y + 7.5, r.hoursMs ? `${Math.round((d.ms / r.hoursMs) * 100)}%` : '', { size: 6.8, bold: d.name === persona.part, color: th.ink, align: 'right' });
  });
}

// The notes your time went to.
function drawReportNotes(pg, box, th, r, level = 'everything') {
  reportPanel(pg, box, th);
  const pad = 12;
  reportHeading(pg, box.x + pad, box.y + pad + 6, 'Where the time went', th, { x: box.x + box.w - pad, text: r.notes.length ? `${reportNum(r.notes.length)} ${r.notes.length === 1 ? 'note' : 'notes'}` : '' });
  if (!r.notes.length) {
    pg.text(box.x + pad, box.y + pad + 30, 'No notes were recorded on these days.', { size: 7.5, color: th.faint });
    return;
  }
  const top = box.y + pad + 20;
  const rowH = 15.5;
  const n = Math.max(1, Math.min(level === 'essentials' ? 5 : level === 'balanced' ? 8 : 40, Math.floor((box.y + box.h - pad - top) / rowH)));
  const max = r.notes[0].ms;
  const nameW = (box.w - 2 * pad) * 0.5;
  r.notes.slice(0, n).forEach((note, i) => {
    const y = top + i * rowH;
    const folder = note.path.includes('/') ? note.path.slice(0, note.path.lastIndexOf('/')) : '';
    const w = pg.text(box.x + pad, y + 8, noteName(note.path), { size: 7.3, color: th.ink, max: nameW });
    if (folder) pg.text(box.x + pad + w + 4, y + 8, folder, { size: 6, color: th.faint, max: Math.max(0, nameW - w - 4) });
    const bx = box.x + pad + nameW + 8;
    const bw = box.w - 2 * pad - nameW - 8 - (level === 'everything' ? 76 : 40);
    let top2 = 0;
    note.by.forEach((v, j) => {
      if (v > note.by[top2]) top2 = j;
    });
    pg.rect(bx, y + 3.5, bw, 5, th.empty, 2.5);
    pg.rect(bx, y + 3.5, Math.max(5, bw * (note.ms / max)), 5, r.series.length > 1 ? r.series[top2].color : i === 0 ? th.deep : th.tint(0.62), 2.5);
    pg.text(box.x + box.w - pad, y + 8, fmtShort(note.ms), { size: 7.3, bold: true, color: th.ink, align: 'right' });
    if (level === 'everything' && note.words) pg.text(box.x + box.w - pad - 40, y + 8, `${reportNum(note.words)} w`, { size: 6, color: th.faint, align: 'right' });
  });
}

// Three things worth knowing, large.
function drawReportHighlights(pg, box, th, r) {
  const persona = reportPersona(r);
  const items = [
    [`${(r.ms / (37.5 * 3600000)).toFixed(1)}`, 'working weeks', 'of 37.5 hours each'],
    r.net > 0 ? [reportNum(Math.max(1, r.net / 300)), 'pages of writing', 'at 300 words a page'] : [reportNum(r.sessions), 'focus sessions', `${fmtShort(r.focusMs)} of focus`],
    r.hoursMs ? [`${persona.share}%`, `in the ${persona.part.toLowerCase()}`, persona.name] : [`${r.streak}`, 'days in a row', 'your longest streak'],
  ];
  const gap = 10;
  const w = (box.w - gap * 2) / 3;
  const big = Math.min(26, box.h * 0.34);
  items.forEach(([value, label, sub], i) => {
    const x = box.x + i * (w + gap);
    pg.rect(x, box.y, w, box.h, th.tint(0.1), 8);
    pg.rect(x, box.y + 10, 2.4, box.h - 20, th.accent, 1.2);
    const vy = box.y + box.h / 2 + big * 0.18;
    const vw = pg.text(x + 14, vy, value, { size: big, bold: true, color: th.deep });
    pg.text(x + 14 + vw + 6, vy - big * 0.3, label, { size: 8.5, bold: true, color: th.ink, max: w - vw - 26 });
    pg.text(x + 14 + vw + 6, vy - big * 0.3 + 11, sub, { size: 7, color: th.muted, max: w - vw - 26 });
  });
}

// With several projects on the page: how the time split between them.
function drawReportSplit(pg, box, th, r) {
  reportPanel(pg, box, th);
  const pad = 12;
  reportHeading(pg, box.x + pad, box.y + pad + 6, 'Projects', th);
  const total = Math.max(1, r.ms);
  const bx = box.x + pad;
  const bw = box.w - 2 * pad;
  let x = bx;
  const sorted = r.series.slice().sort((a, b) => b.ms - a.ms);
  for (const s of sorted) {
    const w = bw * (s.ms / total);
    if (w > 0.5) pg.rect(x, box.y + pad + 14, Math.max(0.5, w - 1.5), 7, s.color, 2);
    x += w;
  }
  const cols = Math.min(sorted.length, 3);
  const cw = bw / cols;
  sorted.forEach((s, i) => {
    const cx = bx + (i % cols) * cw;
    const cy = box.y + pad + 36 + Math.floor(i / cols) * 24;
    pg.circle(cx + 3, cy - 2.6, 3, { fill: s.color });
    pg.text(cx + 10, cy, s.name, { size: 7.8, bold: true, color: th.ink, max: cw - 16 });
    pg.text(cx + 10, cy + 10, `${fmtShort(s.ms)}  ·  ${Math.round((s.ms / total) * 100)}%  ·  ${reportNum(s.written)} words`, { size: 6.8, color: th.muted, max: cw - 16 });
  });
}


// --- More sections -------------------------------------------------------

// A section's card and heading; returns the room inside it, under the heading.
function reportCard(pg, box, th, title, right) {
  reportPanel(pg, box, th);
  const pad = 12;
  reportHeading(pg, box.x + pad, box.y + pad + 6, title, th, right ? { x: box.x + box.w - pad, text: right } : null);
  return { x: box.x + pad, y: box.y + pad + 16, w: box.w - 2 * pad, h: box.h - 2 * pad - 16 };
}

// Numbers in a grid: [label, value, note].
function reportStats(pg, room, th, items, cols) {
  // Only as many rows as fit, each at least tall enough for its label and value.
  items = items.slice(0, Math.max(cols, Math.floor(room.h / 24) * cols));
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const cw = room.w / cols;
  const rh = room.h / rows;
  const vs = Math.max(9, Math.min(15, rh * 0.36));
  items.forEach(([label, value, note], i) => {
    const x = room.x + (i % cols) * cw;
    const y = room.y + Math.floor(i / cols) * rh;
    pg.text(x, y + 8, label, { size: 6, bold: true, track: 0.6, upper: true, color: th.muted, max: cw - 8 });
    pg.text(x, y + 10 + vs * 0.92, value, { size: vs, bold: true, color: th.ink, max: cw - 8 });
    if (note && rh > vs + 22) pg.text(x, y + 10 + vs * 0.92 + 9.5, note, { size: 6.4, color: th.faint, max: cw - 8 });
  });
}

// Rows of a label and its value, with hairlines between; as many as fit.
function reportRows(pg, room, th, rows, rowH = 13.6) {
  const n = Math.max(0, Math.min(rows.length, Math.floor(room.h / rowH)));
  rows.slice(0, n).forEach(([label, value], i) => {
    const y = room.y + i * rowH;
    if (i) pg.line(room.x, y, room.x + room.w, y, th.line, 0.5);
    const lw = pg.text(room.x, y + 9.3, label, { size: 6.9, color: th.muted, max: room.w * 0.55 });
    pg.text(room.x + room.w, y + 9.3, value, { size: 7.1, bold: true, color: th.ink, align: 'right', max: room.w - lw - 10 });
  });
  return n;
}

// Bars in a list: a name (and a note), a bar for its share, and its value.
function reportBarList(pg, room, th, items, o = {}) {
  const rowH = o.rowH || 15;
  const n = Math.max(0, Math.min(items.length, Math.floor(room.h / rowH)));
  const max = Math.max(1, ...items.map((x) => x.value));
  const nameW = room.w * (o.nameShare || 0.46);
  const valueW = o.valueW || 38;
  items.slice(0, n).forEach((x, i) => {
    const y = room.y + i * rowH;
    const w = pg.text(room.x, y + 8, x.name, { size: 7.1, color: th.ink, max: nameW });
    if (x.note) pg.text(room.x + w + 4, y + 8, x.note, { size: 5.8, color: th.faint, max: Math.max(0, nameW - w - 4) });
    const bx = room.x + nameW + 8;
    const bw = room.w - nameW - 8 - valueW;
    pg.rect(bx, y + 3.5, bw, 5, th.empty, 2.5);
    if (x.value > 0) pg.rect(bx, y + 3.5, Math.max(5, bw * (x.value / max)), 5, x.color || (i === 0 ? th.deep : th.tint(0.62)), 2.5);
    pg.text(room.x + room.w, y + 8, x.text, { size: 7.1, bold: true, color: th.ink, align: 'right' });
  });
  return n;
}

function reportEmpty(pg, room, th, text) {
  pg.text(room.x, room.y + 14, text, { size: 7.2, color: th.faint, max: room.w });
}

const LEVEL_RANK = { off: 0, essentials: 1, balanced: 2, everything: 3 };

// When each day's work began and ended, as a bar from start to finish, with the usual times.
function drawReportDay(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Your working day', r.usualStart != null ? `usually ${clockText(r.usualStart)} to ${clockText(r.usualEnd)}` : '');
  const timed = r.days.filter((d) => d.start != null && d.ms >= ACTIVE_DAY_MS);
  if (!timed.length) return reportEmpty(pg, room, th, 'No working hours on these days yet.');
  const lo = Math.max(0, Math.floor(Math.min(...timed.map((d) => d.start)) / 60) - 1);
  const hi = Math.min(24, Math.ceil(Math.max(...timed.map((d) => d.end)) / 60) + 1);
  const x0 = room.x + 26;
  const x1 = room.x + room.w;
  const y0 = room.y + 4;
  const y1 = room.y + room.h - 12;
  const yy = (min) => y0 + (y1 - y0) * ((min / 60 - lo) / Math.max(1, hi - lo));
  const step = hi - lo > 12 ? 4 : 2;
  for (let h = Math.ceil(lo / step) * step; h <= hi; h += step) {
    pg.line(x0, yy(h * 60), x1, yy(h * 60), th.line, 0.5);
    pg.text(x0 - 5, yy(h * 60) + 2.2, `${pad2(h % 24)}:00`, { size: 5.8, color: th.faint, align: 'right' });
  }
  const band = (x1 - x0) / r.days.length;
  const bw = Math.max(0.8, Math.min(9, band * 0.66));
  r.days.forEach((d, i) => {
    if (d.start == null || d.ms < ACTIVE_DAY_MS) return;
    const x = x0 + i * band + (band - bw) / 2;
    const top = yy(d.start);
    const bottom = Math.max(top + 1.2, yy(d.end));
    pg.rect(x, top, bw, bottom - top, d.rough ? th.tint(0.32) : th.tint(0.62), Math.min(1.5, bw / 2));
    // The sittings within the day, darker.
    if (level !== 'essentials') for (const sit of d.sits) pg.rect(x, yy(sit[0]), bw, Math.max(0.8, yy(sit[0] + sit[1]) - yy(sit[0])), th.accent, Math.min(1, bw / 2));
  });
  if (LEVEL_RANK[level] >= 2 && r.usualStart != null) {
    for (const [min, label] of [[r.usualStart, 'start'], [r.usualEnd, 'finish']]) {
      pg.line(x0, yy(min), x1, yy(min), th.deep, 0.6, { dash: [2, 2] });
      pg.text(x1 - 2, yy(min) - 2.5, `usual ${label} ${clockText(min)}`, { size: 5.8, bold: true, color: th.deep, align: 'right' });
    }
  }
  let last = -100;
  r.days.forEach((d, i) => {
    const date = keyToDate(d.key);
    if (i && date.getDate() !== 1) return;
    const label = date.toLocaleDateString('en-GB', { month: 'short' });
    const lx = x0 + i * band;
    if (lx - last > 22) {
      pg.text(lx, y1 + 9, label, { size: 5.8, color: th.faint });
      last = lx;
    }
  });
}

// The stretches of time you sat at it: how long they lasted.
function drawReportSittings(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Sittings', r.sits.length ? `${reportNum(r.sits.length)} in all` : '');
  if (!r.sits.length) return reportEmpty(pg, room, th, 'Sittings are counted from version 1.17 on.');
  const total = r.sits.reduce((sum, x) => sum + x.len, 0);
  const avg = total / r.sits.length;
  const perDay = r.sits.length / Math.max(1, new Set(r.sits.map((x) => x.key)).size);
  pg.text(room.x, room.y + 18, fmtShort(avg * 60000), { size: 18, bold: true, color: th.deep });
  pg.text(room.x, room.y + 29, `a typical sitting, ${perDay.toFixed(1)} a day`, { size: 6.6, color: th.muted, max: room.w });
  if (level === 'essentials') return;
  const buckets = [['Under 15m', 0, 15], ['15 to 30m', 15, 30], ['30m to 1h', 30, 60], ['1 to 2h', 60, 120], ['Over 2h', 120, 1e9]];
  const counts = buckets.map(([, a, b]) => r.sits.filter((x) => x.len >= a && x.len < b).length);
  const items = buckets.map(([name], i) => ({ name, value: counts[i], text: reportNum(counts[i]), color: counts[i] === Math.max(...counts) ? th.deep : th.tint(0.58) }));
  const listRoom = { x: room.x, y: room.y + 38, w: room.w, h: room.h - 38 - (level === 'everything' ? 14 : 0) };
  reportBarList(pg, listRoom, th, items, { rowH: Math.min(14, listRoom.h / 5), nameShare: 0.36, valueW: 22 });
  if (level === 'everything' && r.longestSit.len) {
    pg.text(room.x, room.y + room.h - 1, `Longest: ${fmtShort(r.longestSit.len * 60000)} from ${clockText(r.longestSit.start)}, ${reportDate(r.longestSit.key, 'short')}`, { size: 6.4, color: th.muted, max: room.w });
  }
}

// How the writing went: words an hour, what was kept, keys, Backspace, pastes and undos.
function drawReportWriting(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'How you write');
  const hours = r.ms / 3600000;
  const items = [];
  if (r.written) items.push(['Words an hour', hours >= 0.2 ? reportNum(r.written / hours) : '-', 'while working']);
  if (r.written) items.push(['Kept', `${Math.max(0, Math.round((r.net / r.written) * 100))}%`, `${reportNum(r.deleted)} words deleted`]);
  if (r.worked) items.push(['Words a day', reportNum(r.written / r.worked), 'on days you worked']);
  if (r.typed) items.push(['Keys typed', reportNum(r.typed), `${(r.typed / Math.max(1, r.written)).toFixed(1)} for each word`]);
  if (r.erased) items.push(['Backspace', reportNum(r.erased), `1 in ${Math.max(1, Math.round((r.typed + r.erased) / r.erased))} keys`]);
  if (r.fastest.n) items.push(['Fastest minute', `${reportNum(r.fastest.n)} words`, reportDate(r.fastest.key, 'short')]);
  if (r.typingMs) items.push(['Typing', `${Math.round((r.typingMs / Math.max(1, r.ms)) * 100)}%`, 'of the time; the rest, reading and thinking']);
  if (r.pastes) items.push(['Pastes', reportNum(r.pastes), `${reportNum(r.pasted)} words pasted`]);
  if (r.undos) items.push(['Undos', reportNum(r.undos), 'changes of mind']);
  if (!items.length) return reportEmpty(pg, room, th, 'No writing was counted on these days.');
  const count = level === 'essentials' ? 3 : level === 'balanced' ? 6 : 9;
  const shown = items.slice(0, count);
  const chart = level === 'everything' && r.wordHours.some((v) => v > 0) && room.h > 46 + 48;
  const cols = room.w > 300 ? 3 : 2;
  const statsRoom = { x: room.x, y: room.y, w: room.w, h: chart ? room.h - 46 : room.h };
  reportStats(pg, statsRoom, th, shown, Math.min(cols, shown.length));
  if (chart) {
    // Words by the hour of the day.
    const max = Math.max(1, ...r.wordHours);
    const y0 = room.y + room.h - 8;
    const bw = room.w / 24;
    pg.text(room.x, y0 - 30, 'Words by the hour', { size: 5.8, bold: true, color: th.muted });
    r.wordHours.forEach((v, h) => {
      const hgt = 22 * (v / max);
      if (v) pg.path(barD(room.x + h * bw + bw * 0.15, y0, bw * 0.7, y0 - hgt, 1), { fill: v === max ? th.deep : th.tint(0.55) });
      if (h % 6 === 0) pg.text(room.x + h * bw, y0 + 7, pad2(h), { size: 5.4, color: th.faint });
    });
  }
}

// The notes themselves, read now: how much they hold and the words used most.
function drawReportText(pg, box, th, r, level) {
  const t = r.text;
  const room = reportCard(pg, box, th, 'The text itself', t && t.notes ? `${reportNum(t.notes)} ${t.notes === 1 ? 'note' : 'notes'} read` : '');
  if (!t) return reportEmpty(pg, room, th, 'Reading your notes\x85');
  if (!t.words) return reportEmpty(pg, room, th, 'There are no notes to read for these days.');
  const items = [
    ['Words in the notes', reportNum(t.words), 'as they are today'],
    ['Reading time', fmtShort((t.words / 238) * 60000), 'at 238 words a minute'],
    ['Favourite word', t.top.length ? t.top[0][0] : '-', t.top.length ? `${reportNum(t.top[0][1])} times` : ''],
    ['Different words', reportNum(t.unique), `${Math.round((t.unique / Math.max(1, t.words)) * 1000) / 10}% of them`],
    ['A sentence', `${Math.round(t.words / Math.max(1, t.sentences))} words`, 'on average'],
    ['Longest word', t.longest || '-', t.longest ? `${t.longest.length} letters` : ''],
  ].slice(0, level === 'essentials' ? 3 : 6);
  const cols = room.w > 300 ? 3 : 2;
  const extra = level === 'everything';
  const statRows = Math.ceil(items.length / cols);
  const statsH = extra ? Math.min(room.h * 0.52, statRows * 34) : room.h;
  reportStats(pg, { x: room.x, y: room.y, w: room.w, h: statsH }, th, items, cols);
  if (!extra) return;
  // The words used most, and what's in the text.
  const y = room.y + statsH + 4;
  const half = (room.w - 10) / 2;
  const words = t.top.slice(0, 8).map(([w, n], i) => ({ name: w, value: n, text: reportNum(n), color: i === 0 ? th.deep : th.tint(0.6) }));
  pg.text(room.x, y + 4, 'Words used most', { size: 5.8, bold: true, color: th.muted });
  reportBarList(pg, { x: room.x, y: y + 8, w: half, h: room.y + room.h - y - 8 }, th, words, { rowH: 11.5, nameShare: 0.45, valueW: 24 });
  const counts = [['Citations', t.citations], ['Footnotes', t.footnotes], ['Links', t.links], ['Headings', t.headings], ['Questions asked', t.questions], ['Quotations', t.quotes], ['Dashes', t.dashes], ['Exclamations', t.exclaims]]
    .filter(([, n]) => n > 0).map(([label, n]) => [label, reportNum(n)]);
  pg.text(room.x + half + 10, y + 4, 'In the text', { size: 5.8, bold: true, color: th.muted });
  reportRows(pg, { x: room.x + half + 10, y: y + 8, w: half, h: room.y + room.h - y - 8 }, th, counts, 11.5);
}

// The folders (and so the chapters, or the parts) the time went to.
function drawReportFolders(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Folders and chapters', r.folders.length ? `${reportNum(r.folders.length)} ${r.folders.length === 1 ? 'folder' : 'folders'}` : '');
  if (!r.folders.length) return reportEmpty(pg, room, th, 'No notes were recorded on these days.');
  const total = Math.max(1, r.folders.reduce((sum, f) => sum + f.ms, 0));
  const n = level === 'essentials' ? 4 : level === 'balanced' ? 7 : 12;
  const items = r.folders.slice(0, n).map((f, i) => ({
    name: f.path ? f.path.split('/').pop() : 'The top of the vault',
    note: level === 'everything' ? `${reportNum(f.notes)} ${f.notes === 1 ? 'note' : 'notes'}${f.words ? `, ${reportNum(f.words)} words` : ''}` : '',
    value: f.ms,
    text: `${fmtShort(f.ms)}  ${Math.round((f.ms / total) * 100)}%`,
    color: i === 0 ? th.deep : th.tint(0.6),
  }));
  reportBarList(pg, room, th, items, { valueW: 58, nameShare: 0.42 });
}

// Focus sessions: how many, how long, breaks taken and sessions stopped early.
function drawReportFocus(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Focus sessions');
  if (!r.sessions && !r.stopped) return reportEmpty(pg, room, th, 'No focus sessions on these days.');
  const items = [
    ['Sessions', reportNum(r.sessions), `${fmtShort(r.focusMs)} of focus`],
    ['Of your time', `${Math.round((r.focusMs / Math.max(1, r.ms)) * 100)}%`, 'was in a session'],
    ['A typical session', fmtShort(r.focusMs / Math.max(1, r.sessions)), ''],
    ['Most in a day', reportNum(r.mostSessions.n), r.mostSessions.n ? reportDate(r.mostSessions.key, 'short') : ''],
    ['Breaks taken', reportNum(r.breaks), ''],
    ['Finished', r.sessions + r.stopped ? `${Math.round((r.sessions / (r.sessions + r.stopped)) * 100)}%` : '-', r.stopped ? `${reportNum(r.stopped)} stopped early` : 'none stopped early'],
  ].slice(0, level === 'essentials' ? 2 : level === 'balanced' ? 4 : 6);
  reportStats(pg, room, th, items, 2);
}

// Milestones: the first day, and the days the time and the words passed round numbers.
function drawReportMilestones(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Milestones');
  if (!r.milestones.length) return reportEmpty(pg, room, th, 'No milestones yet.');
  const n = level === 'essentials' ? 3 : level === 'balanced' ? 6 : 40;
  const fit = Math.floor(room.h / 13.6);
  const list = r.milestones.slice(-Math.min(n, fit));
  reportRows(pg, room, th, list.map((x) => [x.what, reportDate(x.key)]));
}

// Month by month, as a table.
function drawReportMonths(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Month by month');
  const cols = [['Month', (m) => reportDate(m.key, 'month')], ['Time', (m) => fmtShort(m.ms)]];
  if (LEVEL_RANK[level] >= 2) cols.push(['Days', (m) => reportNum(m.days)], ['Words', (m) => reportNum(m.written)]);
  if (level === 'everything') cols.push(['Sessions', (m) => reportNum(m.sessions)]);
  if (level === 'everything' && room.w > 300) cols.push(['Best day', (m) => fmtShort(m.best)]);
  const rowH = 12.4;
  const fit = Math.max(1, Math.floor((room.h - rowH) / rowH));
  const months = r.months.length > fit ? r.months.slice(-fit) : r.months;
  const most = Math.max(1, ...months.map((m) => m.ms));
  const w0 = room.w * (cols.length > 2 ? 0.3 : 0.5);
  const cw = (room.w - w0) / (cols.length - 1);
  const colX = (i) => (i === 0 ? room.x : room.x + w0 + cw * i);
  cols.forEach(([name], i) => pg.text(colX(i), room.y + 7, name, { size: 5.4, bold: true, upper: true, track: 0.4, color: th.muted, align: i ? 'right' : 'left', max: i ? cw - 3 : w0 }));
  months.forEach((m, j) => {
    const y = room.y + rowH * (j + 1);
    pg.line(room.x, y, room.x + room.w, y, th.line, 0.5);
    // A faint bar behind each month, for its time.
    pg.rect(room.x, y + 2, (w0 - 6) * (m.ms / most), rowH - 4, th.tint(0.13), 1.5);
    cols.forEach(([, value], i) => pg.text(colX(i), y + 8.6, value(m), { size: 6.8, bold: i === 1, color: i ? th.ink : th.muted, align: i ? 'right' : 'left', max: i ? cw - 4 : w0 - 8 }));
  });
  if (months.length < r.months.length) pg.text(room.x, room.y + room.h, `The ${r.months.length - months.length} months before are left out.`, { size: 5.8, color: th.faint });
}

// The records of the work.
function drawReportRecords(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Records');
  const rows = [];
  if (r.worked) rows.push(['First day', reportDate(r.first)], ['Last day', reportDate(r.last)]);
  if (r.best.ms) rows.push(['Longest day', `${fmtShort(r.best.ms)}, ${reportDate(r.best.key, 'short')}`]);
  if (r.wordiest.written) rows.push(['Most words in a day', `${reportNum(r.wordiest.written)}, ${reportDate(r.wordiest.key, 'short')}`]);
  if (r.streak) rows.push(['Longest streak', `${r.streak} ${r.streak === 1 ? 'day' : 'days'}, to ${reportDate(r.streakEnd, 'short')}`]);
  if (r.busiestWeek) rows.push(['Busiest week', `${fmtShort(r.busiestWeek.ms)}, from ${reportDate(r.busiestWeek.key, 'short')}`]);
  if (r.busiestMonth) rows.push(['Busiest month', `${reportDate(r.busiestMonth.key, 'month')}, ${fmtShort(r.busiestMonth.ms)}`]);
  if (r.gap.days) rows.push(['Longest break', `${r.gap.days} ${r.gap.days === 1 ? 'day' : 'days'}, to ${reportDate(r.gap.to, 'short')}`]);
  if (r.longestSit.len) rows.push(['Longest sitting', `${fmtShort(r.longestSit.len * 60000)}, ${reportDate(r.longestSit.key, 'short')}`]);
  if (r.earliest) rows.push(['Earliest start', `${clockText(r.earliest.start)}, ${reportDate(r.earliest.key, 'short')}`]);
  if (r.latest) rows.push(['Latest finish', `${clockText(r.latest.end)}, ${reportDate(r.latest.key, 'short')}`]);
  if (r.busiestNotes.n) rows.push(['Most notes in a day', `${reportNum(r.busiestNotes.n)}, ${reportDate(r.busiestNotes.key, 'short')}`]);
  if (r.fastest.n) rows.push(['Fastest minute', `${reportNum(r.fastest.n)} words, ${reportDate(r.fastest.key, 'short')}`]);
  if (r.mostKeys.n) rows.push(['Most keys in a day', `${reportNum(r.mostKeys.n)}, ${reportDate(r.mostKeys.key, 'short')}`]);
  if (!rows.length) return reportEmpty(pg, room, th, 'No records yet.');
  reportRows(pg, room, th, rows.slice(0, level === 'essentials' ? 4 : level === 'balanced' ? 7 : rows.length));
}

// The work put another way, for fun.
function reportFunFacts(r) {
  const facts = [];
  const hours = r.ms / 3600000;
  if (r.ms) facts.push(['In working weeks', `${(r.ms / (37.5 * 3600000)).toFixed(1)} weeks of 37.5 hours`]);
  if (r.net > 0) facts.push(['On paper', `about ${reportNum(Math.max(1, r.net / 300))} pages, at 300 words a page`]);
  if (r.net > 0) {
    const book = BOOKS.slice().reverse().find(([, n]) => r.net >= n) || BOOKS[0];
    const times = r.net / book[1];
    facts.push(['As long as', times >= 1 ? `${times.toFixed(1)} times ${book[0]}` : `${Math.round(times * 100)}% of ${book[0]}`]);
    facts.push(['Read aloud', `${fmtShort((r.net / 150) * 60000)}, at 150 words a minute`]);
  }
  if (r.ms) {
    const d = Math.floor(r.ms / 86400000);
    const h = Math.floor((r.ms % 86400000) / 3600000);
    facts.push(['Without stopping', `${d ? `${d} ${d === 1 ? 'day' : 'days'} and ` : ''}${h} ${h === 1 ? 'hour' : 'hours'} on end`]);
    facts.push(['The Earth went', `${reportNum((hours * 107226) / 1e6)} million km round the Sun meanwhile`]);
    facts.push(['Coffee', `${reportNum(Math.max(1, hours / 2))} cups, at one every two hours`]);
    facts.push(['Your heart', `beat about ${reportNum((hours * 60 * 70) / 1e6 * 10) / 10} million times`]);
  }
  if (r.fullMoons) facts.push(['Full moons', `${r.fullMoons} rose while you were at it`]);
  if (r.ms && r.weekendMs) facts.push(['Weekends', `${Math.round((r.weekendMs / r.ms) * 100)}% of the time`]);
  if (r.timed.length) {
    const early = r.timed.filter((d) => d.start < 8 * 60).length;
    const late = r.timed.filter((d) => d.end > 22 * 60).length;
    if (early) facts.push(['Early starts', `${early} ${early === 1 ? 'day' : 'days'} before 08:00`]);
    if (late) facts.push(['Late nights', `${late} ${late === 1 ? 'day' : 'days'} after 22:00`]);
  }
  if (r.typed) facts.push(['If keys were steps', `${reportNum((r.typed * 0.75) / 1000)} km on foot`]);
  if (r.erased) facts.push(['Backspace', `pressed ${reportNum(r.erased)} times`]);
  if (r.notes.length) facts.push(['Notes', `${reportNum(r.notes.length)} worked in${r.opens ? `, opened ${reportNum(r.opens)} times` : ''}`]);
  if (r.created) facts.push(['New notes', `${reportNum(r.created)} made`]);
  if (r.links || r.tasks) facts.push(['Links and tasks', `${reportNum(r.links)} links added, ${reportNum(r.tasks)} tasks done`]);
  if (r.outsideMs) facts.push(['Outside Obsidian', `${fmtShort(r.outsideMs)} of reading and research`]);
  return facts;
}

function drawReportFun(pg, box, th, r, level) {
  const room = reportCard(pg, box, th, 'Fun facts');
  const facts = reportFunFacts(r);
  if (!facts.length) return reportEmpty(pg, room, th, 'Nothing to tell yet.');
  reportRows(pg, room, th, facts.slice(0, level === 'essentials' ? 3 : level === 'balanced' ? 6 : facts.length));
}

// Where the work was done: this computer, a phone, another computer.
function drawReportDevices(pg, box, th, r) {
  const room = reportCard(pg, box, th, 'Devices');
  if (r.devices.length < 2) return reportEmpty(pg, room, th, r.devices.length ? `All of it on ${r.devices[0].name}.` : 'No devices yet.');
  const total = Math.max(1, r.devices.reduce((sum, d) => sum + d.ms, 0));
  const items = r.devices.map((d, i) => ({ name: d.name, note: d.written ? `${reportNum(d.written)} words` : '', value: d.ms, text: `${Math.round((d.ms / total) * 100)}%`, color: [th.deep, th.tint(0.62), th.tint(0.4), th.tint(0.28)][Math.min(3, i)] }));
  reportBarList(pg, room, th, items, { valueW: 26 });
}

// The sections a report can show, in the order they fill the page. Each can be off, or show
// the essentials, a balanced amount, or everything; with it, how much of the page's width it
// takes and how tall it wants to be. The presets set every section at once.
// --- The timeline ------------------------------------------------------------

// The timelines the projects on a page follow, each with your time on its phases and tasks over
// the report's days. With all your time, every project that follows one.
function reportTimelines(p, ids, keys) {
  const projects = p.settings.projects.filter((x) => x.timeline && (ids.includes(REPORT_ALL) || ids.includes(x.id)));
  const byPath = new Map();
  for (const x of projects) {
    if (!byPath.has(x.timeline)) byPath.set(x.timeline, []);
    byPath.get(x.timeline).push(x);
  }
  const out = [];
  for (const [path, list] of byPath) {
    const tl = p.timeline(path);
    if (!tl) continue;
    const res = p.sectionTime(tl, list, keys);
    out.push({ tl, res, rows: sectionTree(tl, res), projects: list });
  }
  return out;
}

function timelineInk(color) {
  return color ? REPORT_COLOURS[(color - 1 + 8) % 8] : REPORT_NONE;
}

// How tall a timeline wants to be: a list of its phases, a chart of them, or a chart of every
// phase and task.
function reportTimelineHeight(t, level) {
  const unsorted = t.res.unsorted >= 60000 ? 1 : 0;
  const phases = t.rows.length + unsorted;
  if (level === 'essentials') return 60 + 15 * phases;
  const tasks = level === 'everything' ? t.rows.reduce((sum, row) => sum + row.tasks.length + (row.own >= 60000 && row.tasks.length ? 1 : 0), 0) : 0;
  return Math.min(700, 74 + 18 * phases + 12.5 * tasks);
}

function reportTimelinesHeight(r, level) {
  return r.timelines.reduce((sum, t) => sum + reportTimelineHeight(t, level), 0) + 11 * Math.max(0, r.timelines.length - 1);
}

// "3 Feb – 14 Mar 2027".
function reportSpanText(start, end) {
  const a = keyToDate(start);
  const b = keyToDate(end);
  const f = (d, year) => d.toLocaleDateString('en-GB', year ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
  if (start === end) return f(a, true);
  return `${f(a, a.getFullYear() !== b.getFullYear())} – ${f(b, true)}`;
}

// The timeline the work followed. With essentials, each phase with its time. Otherwise a chart:
// each phase (and with everything, each task) as planned, a light bar from its first day to its
// last, with the days you worked on it standing on it, taller for longer days, and your time on
// it at the end of the row. Deadlines run through it in red, milestones sit on it as diamonds.
function drawReportTimeline(pg, box, th, r, level) {
  const list = r.timelines;
  const total = list.reduce((sum, t) => sum + reportTimelineHeight(t, level), 0);
  const gap = 11;
  const room = box.h - gap * (list.length - 1);
  let y = box.y;
  for (const t of list) {
    const h = list.length === 1 ? box.h : room * (reportTimelineHeight(t, level) / total);
    const b = { x: box.x, y, w: box.w, h };
    if (level === 'essentials') drawTimelineList(pg, b, th, t, list.length > 1);
    else drawTimelineChart(pg, b, th, t, level, list.length > 1);
    y += h + gap;
  }
}

function timelineHow(res) {
  const how = res.how;
  return [['note', 'in linked notes'], ['pick', 'picked'], ['date', 'by the dates'], ['hand', 'sorted by hand']]
    .filter(([k]) => (how[k] || 0) >= 60000).map(([k, text]) => `${fmtShort(how[k])} ${text}`).join('  ·  ');
}

function drawTimelineList(pg, box, th, t, named) {
  const { tl, res, rows } = t;
  const room = reportCard(pg, box, th, named ? `The timeline: ${tl.title}` : 'The timeline', `${fmtShort(res.total)} over ${plural(rows.length, 'phase')}`);
  const items = rows.map((row) => ({
    name: row.section.name,
    note: row.section.start ? reportSpanText(row.section.start, row.section.end) : '',
    value: row.ms,
    text: row.ms >= 60000 ? `${fmtShort(row.ms)} · ${Math.round((row.ms / Math.max(1, res.total)) * 100)}%` : '–',
    color: timelineInk(row.section.color),
  }));
  if (res.unsorted >= 60000) items.push({ name: 'Not sorted', note: '', value: res.unsorted, text: `${fmtShort(res.unsorted)} · ${Math.round((res.unsorted / Math.max(1, res.total)) * 100)}%`, color: REPORT_NONE });
  const n = reportBarList(pg, { x: room.x, y: room.y + 2, w: room.w, h: room.h - 12 }, th, items, { rowH: 15, nameShare: 0.44, valueW: 64 });
  const how = timelineHow(res);
  if (how && room.h - 12 >= n * 15 + 6) pg.text(room.x, room.y + room.h - 1, how, { size: 5.8, color: th.faint, max: room.w });
}

function drawTimelineChart(pg, box, th, t, level, named) {
  const { tl, res, rows } = t;
  // The chart runs over the plan, and over any day you worked outside it.
  let from = tl.start;
  let to = tl.end;
  for (const byDay of res.days.values()) {
    for (const key of byDay.keys()) {
      if (key < from) from = key;
      if (key > to) to = key;
    }
  }
  const room = reportCard(pg, box, th, named ? `The timeline: ${tl.title}` : 'The timeline', `${reportSpanText(tl.start, tl.end)}  ·  ${fmtShort(res.total)}`);
  const d0 = keyToDate(from);
  const span = Math.max(1, Math.round((keyToDate(to) - d0) / 86400000) + 1);
  const nameW = Math.min(150, room.w * 0.27);
  const valueW = 62;
  const gx = room.x + nameW + 8;
  const gw = Math.max(40, room.w - nameW - 8 - valueW - 6);
  const at = (key) => Math.round((keyToDate(key) - d0) / 86400000);
  const X = (key) => gx + gw * (at(key) / span);
  const X1 = (key) => gx + gw * ((at(key) + 1) / span);
  const dayW = gw / span;

  // The rows: each phase, and with everything its tasks, and the time not sorted.
  const phaseDays = (row) => {
    const sum = new Map();
    for (const key of [row.section.key, ...row.tasks.map((x) => x.section.key)]) {
      for (const [day, ms] of res.days.get(key) || []) sum.set(day, (sum.get(day) || 0) + ms);
    }
    return sum;
  };
  let lines = [];
  for (const row of rows) {
    lines.push({ kind: 'phase', row, color: row.section.color, days: phaseDays(row) });
    if (level !== 'everything') continue;
    if (row.own >= 60000 && row.tasks.length) lines.push({ kind: 'task', name: `${row.section.name} in general`, ms: row.own, color: row.section.color, days: res.days.get(row.section.key) || new Map() });
    for (const x of row.tasks) lines.push({ kind: 'task', task: x.section, name: x.section.name, ms: x.ms, color: x.section.color, days: res.days.get(x.section.key) || new Map() });
  }
  if (res.unsorted >= 60000) lines.push({ kind: 'phase', unsorted: true, color: 0, days: res.days.get(UNSORTED) || new Map() });
  const axisH = 14;
  const footH = 14;
  const avail = room.h - axisH - footH;
  let heights = lines.map((x) => (x.kind === 'phase' ? 18 : 12.5));
  let need = heights.reduce((a, b) => a + b, 0);
  // Too many to fit: the tasks go first, then the rows tighten.
  if (need > avail && level === 'everything' && avail < need * 0.72) {
    lines = lines.filter((x) => x.kind === 'phase');
    heights = lines.map(() => 18);
    need = heights.reduce((a, b) => a + b, 0);
  }
  const k = Math.min(1, avail / Math.max(1, need));
  heights = heights.map((h) => h * k);

  // Months along the top, with a faint line at each.
  const top = room.y + axisH;
  const bottom = top + heights.reduce((a, b) => a + b, 0);
  const months = [];
  for (let m = new Date(d0.getFullYear(), d0.getMonth(), 1); dayKey(m) <= to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(new Date(m));
  const every = Math.max(1, Math.ceil(months.length / Math.max(1, Math.floor(gw / 26))));
  months.forEach((m, i) => {
    const key = dayKey(m);
    const x = key < from ? gx : X(key);
    if (key >= from) pg.line(x, top - 2, x, bottom, th.line, 0.4);
    if (i % every) return;
    const month = m.toLocaleDateString('en-GB', { month: 'short' });
    const mid = Math.min(gx + gw, X1(dayKey(new Date(m.getFullYear(), m.getMonth() + 1, 0))));
    // The year with January and the first month, when there's room for it.
    const withYear = m.getMonth() === 0 || i === 0 ? `${month} ${String(m.getFullYear()).slice(2)}` : month;
    const fits = (t) => textWidth(pdfChars(t.toUpperCase()), 5.4, true, 0.3) <= mid - x - 3;
    const label = fits(withYear) ? withYear : month;
    if (mid - x > 14) pg.text(x + 2, top - 4, label, { size: 5.4, bold: true, upper: true, track: 0.3, color: th.muted, max: Math.max(10, mid - x - 3) });
  });

  // Each row: its name, its plan, the days worked on it, and its time.
  const most = (kind) => Math.max(1, ...lines.filter((x) => x.kind === kind).flatMap((x) => [...x.days.values()]));
  const max = { phase: most('phase'), task: most('task') };
  let yy = top;
  lines.forEach((line, i) => {
    const h = heights[i];
    const phase = line.kind === 'phase';
    const ink = timelineInk(line.color);
    const mid = yy + h / 2;
    if (i && phase) pg.line(room.x, yy, room.x + room.w, yy, th.line, 0.5);
    const name = line.unsorted ? 'Not sorted' : phase ? line.row.section.name : line.name;
    if (phase) pg.circle(room.x + 3, mid - 0.4, 2.6, { fill: ink });
    pg.text(room.x + (phase ? 9 : 14), mid + 2.4, name, { size: phase ? 7.2 : 6.4, bold: phase && !line.unsorted, color: line.unsorted || !phase ? th.muted : th.ink, max: nameW - (phase ? 9 : 14) });
    // The plan: a light bar from the first day to the last.
    const plan = line.unsorted ? null : phase ? line.row.section : line.task;
    const barH = Math.max(3, (phase ? 10 : 6) * Math.min(1, h / (phase ? 18 : 12.5)));
    const by = mid - barH / 2;
    if (plan && plan.start) pg.rect(X(plan.start), by, Math.max(1.2, X1(plan.end) - X(plan.start)), barH, mixHex('#ffffff', ink, phase ? 0.24 : 0.18), Math.min(2.5, barH / 2));
    // The days you worked on it, standing on the bar's baseline.
    for (const [day, ms] of line.days) {
      if (day < from || day > to || ms < 60000) continue;
      const hh = Math.max(1, barH * Math.min(1, ms / max[line.kind]));
      pg.rect(X(day) + dayW * 0.1, by + barH - hh, Math.max(0.6, dayW * 0.8), hh, ink);
    }
    // A tick after what's done.
    if (plan && plan.done) {
      const cx = Math.min(X1(plan.end) + 2.5, gx + gw - 5);
      pg.path([['M', cx, mid], ['L', cx + 1.5, mid + 1.6], ['L', cx + 4, mid - 1.8]], { stroke: ink, width: 0.9, cap: 'round' });
    }
    // Its time, and its share of all of it.
    const ms = line.unsorted ? res.unsorted : phase ? line.row.ms : line.ms;
    const w = pg.text(room.x + room.w, mid + 2.4, ms >= 60000 ? fmtShort(ms) : '–', { size: phase ? 7.4 : 6.6, bold: phase, color: ms >= 60000 ? th.ink : th.faint, align: 'right' });
    if (phase && ms >= 60000 && res.total) pg.text(room.x + room.w - w - 4, mid + 2.4, `${Math.round((ms / res.total) * 100)}%`, { size: 6, color: th.faint, align: 'right' });
    yy += h;
  });

  // Milestones as diamonds on their phase's row, deadlines as red lines through it all.
  const rowOf = new Map();
  yy = top;
  lines.forEach((line, i) => {
    if (line.kind === 'phase' && !line.unsorted && line.row.section.key) rowOf.set(line.row.section.id, yy + heights[i] / 2);
    yy += heights[i];
  });
  for (const mark of tl.marks) {
    if (mark.date < from || mark.date > to) continue;
    const x = (X(mark.date) + X1(mark.date)) / 2;
    if (mark.type === 'deadline') {
      pg.line(x, top - 2, x, bottom, '#d0403c', 0.7, { dash: [2, 1.6] });
      pg.text(x - 2, room.y + 4, mark.name, { size: 5.4, bold: true, color: '#d0403c', align: 'right', max: Math.max(20, x - gx - 2) });
    } else {
      const cy = mark.phase && rowOf.has(mark.phase) ? rowOf.get(mark.phase) : top + 4;
      const s = 3;
      pg.path([['M', x, cy - s], ['L', x + s, cy], ['L', x, cy + s], ['L', x - s, cy], ['Z']], { fill: mark.done ? timelineInk(mark.color) : '#ffffff', stroke: timelineInk(mark.color), width: 0.8 });
    }
  }

  // What the marks mean, and how the time was placed.
  const fy = room.y + room.h - 2;
  pg.rect(room.x, fy - 5, 12, 5, mixHex('#ffffff', th.accent, 0.24), 2);
  let x = room.x + 15 + pg.text(room.x + 15, fy, 'planned', { size: 5.8, color: th.faint });
  [3, 5, 2.5, 4].forEach((hh, i) => pg.rect(x + 8 + i * 2, fy - hh, 1.3, hh, th.accent));
  x += 18 + pg.text(x + 18, fy, 'days you worked on it', { size: 5.8, color: th.faint });
  const how = timelineHow(res);
  if (how) pg.text(room.x + room.w, fy, how, { size: 5.8, color: th.faint, align: 'right', max: Math.max(0, room.x + room.w - x - 22) });
}

const REPORT_SECTIONS = [
  { id: 'summary', name: 'The big numbers', preset: ['essentials', 'balanced', 'everything'], span: 1, h: { essentials: 110, balanced: 96, everything: 124 } },
  { id: 'timeline', name: 'The timeline', preset: ['essentials', 'balanced', 'everything'], span: 1, h: (c, level, r) => reportTimelinesHeight(r, level), skip: (r) => !r.timelines.length },
  { id: 'calendar', name: 'Every day of the work', preset: ['essentials', 'balanced', 'everything'], span: 1, h: (c) => c.calendar },
  { id: 'weekly', name: 'Time each week', preset: ['essentials', 'balanced', 'everything'], span: { essentials: 1, balanced: 0.6, everything: 0.6 }, h: { essentials: 190, balanced: 152, everything: 150 }, grow: true },
  { id: 'words', name: 'Words, adding up', preset: ['off', 'balanced', 'everything'], span: 0.4, h: 150, skip: (r) => !r.written },
  { id: 'day', name: 'Your working day', preset: ['off', 'off', 'everything'], span: 1, h: { essentials: 118, balanced: 136, everything: 150 } },
  { id: 'dial', name: 'When you worked', preset: ['off', 'balanced', 'everything'], span: 1 / 3, h: 142 },
  { id: 'week', name: 'Your week', preset: ['off', 'balanced', 'everything'], span: 1 / 3, h: 142 },
  { id: 'dayparts', name: 'Time of day', preset: ['off', 'balanced', 'everything'], span: 1 / 3, h: 142, skip: (r) => !r.hoursMs },
  { id: 'writing', name: 'How you write', preset: ['off', 'off', 'everything'], span: 0.5, h: { essentials: 86, balanced: 124, everything: 196 }, skip: (r) => !r.written && !r.typed },
  { id: 'text', name: 'The text itself', preset: ['off', 'off', 'everything'], span: 0.5, h: { essentials: 86, balanced: 124, everything: 196 } },
  { id: 'sittings', name: 'Sittings', preset: ['off', 'off', 'everything'], span: 1 / 3, h: { essentials: 80, balanced: 140, everything: 150 }, skip: (r) => !r.sits.length },
  { id: 'focus', name: 'Focus sessions', preset: ['off', 'off', 'everything'], span: 1 / 3, h: { essentials: 80, balanced: 120, everything: 150 }, skip: (r) => !r.sessions && !r.stopped },
  { id: 'devices', name: 'Devices', preset: ['off', 'off', 'everything'], span: 1 / 3, h: 100, skip: (r) => r.devices.length < 2 },
  { id: 'notes', name: 'Where the time went', preset: ['off', 'off', 'everything'], span: 0.5, h: { essentials: 108, balanced: 156, everything: 196 }, grow: true },
  { id: 'folders', name: 'Folders and chapters', preset: ['off', 'off', 'everything'], span: 0.5, h: { essentials: 96, balanced: 140, everything: 196 } },
  { id: 'milestones', name: 'Milestones', preset: ['off', 'off', 'everything'], span: 0.5, h: { essentials: 80, balanced: 124, everything: 196 }, grow: true },
  { id: 'months', name: 'Month by month', preset: ['off', 'off', 'everything'], span: 0.5, h: (c, level, r) => Math.min(260, 50 + 12.4 * r.months.length) },
  { id: 'records', name: 'Records', preset: ['off', 'off', 'everything'], span: 0.5, h: { essentials: 86, balanced: 128, everything: 220 } },
  { id: 'facts', name: 'Fun facts', preset: ['off', 'off', 'everything'], span: 0.5, h: { essentials: 72, balanced: 114, everything: 220 } },
  { id: 'highlights', name: 'Highlights', preset: ['essentials', 'balanced', 'off'], span: 1, h: { essentials: 78, balanced: 68, everything: 68 } },
];
const REPORT_PRESETS = ['essentials', 'balanced', 'everything'];
const REPORT_PAGES = { fit: 'Best fit', one: 'One page', full: 'Full size' };
const REPORT_PAGE_NOTES = {
  fit: 'Tightens a little to stay on one page, and goes on to another when it has to.',
  one: 'Everything on one page, however much it has to tighten.',
  full: 'Each section at its full size, on as many pages as it needs.',
};

// Every section's level for one of the presets.
function reportPreset(level) {
  const i = Math.max(0, REPORT_PRESETS.indexOf(level));
  return Object.fromEntries(REPORT_SECTIONS.map((x) => [x.id, x.preset[i]]));
}

// The pages for one group of projects: the header, the sections in rows, a page after another
// when they don't fit.
function drawReportPages(p, ids, o) {
  const size = (PAPERS[o.paper] || PAPERS.a4).size;
  const landscape = o.orientation === 'landscape';
  const [W, H] = landscape ? [size[1], size[0]] : size;
  const r = reportData(p, ids, o.from, o.to);
  r.text = o.texts ? o.texts[ids.join(',')] || null : null;
  r.timelines = reportTimelines(p, ids, r.keys);
  const th = reportTheme(r.series.length === 1 ? r.series[0].color : REPORT_INK);
  const margin = landscape ? 32 : 36;
  const named = andList(r.series.map((x) => x.name));
  const title = [o.title, named, 'Your time'].find((t) => t && pdfChars(t).trim());
  const levels = o.sections || reportPreset(o.level);
  const weekStartsMonday = p.settings.weekStartsMonday;
  const first = keyToDate(r.keys[0]);
  const back = (first.getDay() - (weekStartsMonday ? 1 : 0) + 7) % 7;
  const weeks = Math.ceil((back + r.keys.length) / 7);
  const cell = Math.min(13, (W - 2 * margin - 38) / weeks);
  const calendar = weeks <= 6 ? 60 + weeks * 26 : Math.min(56 + 7 * cell, landscape ? 124 : 150);
  // A landscape page is wider and shorter: more sections side by side, each a little shorter.
  const wide = landscape ? 0.72 : 1;
  const short = landscape ? 0.82 : 1;
  const value = (v, level) => (typeof v === 'function' ? v({ calendar }, level, r) : typeof v === 'object' ? v[level] : v);

  // The sections that are on and have something to show.
  const items = [];
  for (const sec of REPORT_SECTIONS) {
    const level = levels[sec.id] || 'off';
    if (level === 'off' || (sec.skip && sec.skip(r))) continue;
    const span = value(sec.span, level);
    items.push({ sec, level, span: span >= 1 ? 1 : span * wide, h: sec.id === 'calendar' ? calendar : value(sec.h, level) * short });
    // With several projects on a page, how they split comes right after the big numbers.
    if (sec.id === 'summary' && r.series.length > 1) {
      items.push({ sec: { id: 'projects' }, level: 'balanced', span: 1, h: 48 + 24 * Math.ceil(r.series.length / 3) });
    }
  }
  if (!items.length) items.push({ sec: REPORT_SECTIONS[0], level: 'balanced', span: 1, h: 96 });
  // Rows across the page: each as wide as the page, as tall as its tallest section.
  const rows = [];
  let row = [];
  let used = 0;
  for (const item of items) {
    if (row.length && used + item.span > 1.001) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(item);
    used += item.span;
  }
  if (row.length) rows.push(row);
  const plan = rows.map((items) => ({ items, h: Math.max(...items.map((x) => x.h)), grow: items.some((x) => x.sec.grow) }));

  const draw = {
    summary: (pg, b, lv) => drawReportHero(pg, b, th, r, lv),
    projects: (pg, b) => drawReportSplit(pg, b, th, r),
    timeline: (pg, b, lv) => drawReportTimeline(pg, b, th, r, lv),
    calendar: (pg, b, lv) => drawReportCalendar(pg, b, th, r, lv),
    weekly: (pg, b) => drawReportBars(pg, b, th, r, p),
    words: (pg, b) => drawReportWords(pg, b, th, r),
    day: (pg, b, lv) => drawReportDay(pg, b, th, r, lv),
    dial: (pg, b) => drawReportDial(pg, b, th, r),
    week: (pg, b) => drawReportWeek(pg, b, th, r),
    dayparts: (pg, b) => drawReportDayparts(pg, b, th, r),
    writing: (pg, b, lv) => drawReportWriting(pg, b, th, r, lv),
    text: (pg, b, lv) => drawReportText(pg, b, th, r, lv),
    sittings: (pg, b, lv) => drawReportSittings(pg, b, th, r, lv),
    focus: (pg, b, lv) => drawReportFocus(pg, b, th, r, lv),
    devices: (pg, b) => drawReportDevices(pg, b, th, r),
    notes: (pg, b, lv) => drawReportNotes(pg, b, th, r, lv),
    folders: (pg, b, lv) => drawReportFolders(pg, b, th, r, lv),
    milestones: (pg, b, lv) => drawReportMilestones(pg, b, th, r, lv),
    months: (pg, b, lv) => drawReportMonths(pg, b, th, r, lv),
    records: (pg, b, lv) => drawReportRecords(pg, b, th, r, lv),
    facts: (pg, b, lv) => drawReportFun(pg, b, th, r, lv),
    highlights: (pg, b) => drawReportHighlights(pg, b, th, r),
  };
  const gap = 11;
  const bottom = H - 34;
  const newPage = (firstPage) => {
    const pg = new ReportPage(W, H);
    pg.weekStartsMonday = weekStartsMonday;
    pg.theme = th;
    const top = firstPage ? drawReportHead(pg, th, r, { margin, title, note: o.note, landscape }) : drawReportHeadSmall(pg, th, { margin, title });
    pg.top = top + 14;
    return pg;
  };
  const drawRow = (pg, row, y, h) => {
    const total = W - 2 * margin - gap * (row.items.length - 1);
    const spans = row.items.reduce((sum, x) => sum + x.span, 0);
    let x = margin;
    for (const item of row.items) {
      const w = (total * item.span) / spans;
      draw[item.sec.id](pg, { x, y, w, h }, item.level);
      x += w + gap;
    }
  };
  const pages = [];
  let pg = newPage(true);
  pages.push(pg);
  const need = plan.reduce((sum, x) => sum + x.h, 0) + gap * (plan.length - 1);
  const room = bottom - pg.top;
  const mode = REPORT_PAGES[o.pages] ? o.pages : 'fit';
  const k = Math.min(1, room / need);
  if (mode === 'one' || (mode === 'fit' && k >= 0.76)) {
    // One page: tightened to fit, or with the room to spare shared out.
    let spare = Math.max(0, room - need * k);
    const heights = plan.map((x) => x.h * k);
    const growing = plan.filter((x) => x.grow);
    for (const x of growing) {
      const add = Math.min(x.h * 0.5, spare / growing.length);
      heights[plan.indexOf(x)] += add;
    }
    spare = Math.max(0, room - heights.reduce((a, b) => a + b, 0) - gap * (plan.length - 1));
    const air = Math.min(18, spare / Math.max(1, plan.length - 1));
    let y = pg.top;
    plan.forEach((row, i) => {
      drawRow(pg, row, y, heights[i]);
      y += heights[i] + gap + air;
    });
  } else {
    let y = pg.top;
    for (const row of plan) {
      if (y + row.h > bottom && y > pg.top) {
        pg = newPage(false);
        pages.push(pg);
        y = pg.top;
      }
      drawRow(pg, row, y, Math.min(row.h, bottom - y));
      y += row.h + gap;
    }
  }
  return pages;
}

// The pages of a report: for each project, or for all of them together, with the footer and
// page numbers last, once the pages are known.
function buildReport(p, o) {
  const groups = o.together || o.ids.length === 1 ? [o.ids] : o.ids.map((id) => [id]);
  const pages = groups.flatMap((ids) => drawReportPages(p, ids, Object.assign({}, o, { title: groups.length > 1 ? '' : o.title })));
  const margin = (pg) => (pg.w > pg.h ? 32 : 36);
  pages.forEach((pg, i) => drawReportFoot(pg, pg.theme, { margin: margin(pg), page: i, pages: pages.length }));
  return pages;
}

// A page of a report as a PNG image, drawn from its SVG at the scale given.
async function reportPng(pg, scale) {
  const svg = drawReportSvg(createDiv(), pg);
  svg.setAttribute('width', String(Math.round(pg.w * scale)));
  svg.setAttribute('height', String(Math.round(pg.h * scale)));
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pg.w * scale);
  canvas.height = Math.round(pg.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

// Choose what a report covers, which sections it shows and how much of each, its dates and
// title, and its paper; with the pages as they will print beside it. Then save it as a PDF,
// or as images, in the vault.
class ReportModal extends Modal {
  constructor(app, plugin, o = {}) {
    super(app);
    this.plugin = plugin;
    const p = plugin;
    const active = p.activeProject();
    const start = (o.ids || []).filter((id) => this.choices().some((x) => x.id === id));
    const ids = start.length ? start : active && reportSpan(p, [active.id]) ? [active.id] : [REPORT_ALL];
    // Last time's choices of sections and paper, or the Everything preset.
    const saved = p.settings.report || {};
    const sections = Object.assign(reportPreset('everything'), saved.sections || {});
    this.o = {
      ids, together: false, sections, title: '', note: '',
      paper: PAPERS[saved.paper] ? saved.paper : 'a4',
      orientation: saved.orientation === 'landscape' ? 'landscape' : 'portrait',
      pages: REPORT_PAGES[saved.pages] ? saved.pages : 'fit',
      texts: {},
    };
    this.textCache = {};
    this.setSpan();
  }

  choices() {
    const p = this.plugin;
    const list = p.settings.projects.filter((x) => !x.archived || reportSpan(p, [x.id])).map((x) => reportInfo(p, x.id));
    if (p.settings.projects.length && reportSpan(p, [NO_PROJECT])) list.push(reportInfo(p, NO_PROJECT));
    list.push(reportInfo(p, REPORT_ALL));
    return list;
  }

  setSpan() {
    const span = reportSpan(this.plugin, this.o.ids) || [dayKey(daysAgo(29)), dayKey(daysAgo(0))];
    this.o.from = span[0];
    this.o.to = span[1];
  }

  groups() {
    const o = this.o;
    return o.together || o.ids.length === 1 ? [o.ids] : o.ids.map((id) => [id]);
  }

  onOpen() {
    this.modalEl.addClass('pw-report-modal');
    this.titleEl.setText('A report of your time');
    const body = this.contentEl.createDiv('pw-report');
    this.optionsEl = body.createDiv('pw-report-options');
    const right = body.createDiv('pw-report-side');
    this.countEl = right.createDiv('pw-report-count');
    this.previewEl = right.createDiv('pw-report-preview');
    this.renderOptions();
    this.renderPreview();
  }

  onClose() {
    window.clearTimeout(this.timer);
    this.contentEl.empty();
  }

  section(name, note) {
    const el = this.optionsEl.createDiv('pw-report-section');
    el.createDiv({ cls: 'pw-report-label', text: name });
    if (note) el.createDiv({ cls: 'pw-report-note', text: note });
    return el;
  }

  segment(parent, options, value, onPick, cls) {
    const seg = parent.createDiv({ cls: ['pw-stats-seg', cls || ''].filter(Boolean), attr: { role: 'radiogroup' } });
    for (const [key, name] of Object.entries(options)) {
      const b = seg.createEl('button', { text: name, attr: { role: 'radio', 'aria-checked': String(key === value) } });
      b.toggleClass('is-active', key === value);
      b.addEventListener('click', () => onPick(key));
    }
    return seg;
  }

  update(patch, redraw = true) {
    Object.assign(this.o, patch);
    if (redraw) this.renderOptions();
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.renderPreview(), redraw ? 0 : 200);
  }

  renderOptions() {
    const el = this.optionsEl;
    const scroll = el.scrollTop;
    el.empty();
    const o = this.o;
    const groups = this.groups();

    const what = this.section('What it covers', 'One project, or several. Each prints in its own colour.');
    const chips = what.createDiv('pw-stats-chips');
    for (const x of this.choices()) {
      const on = o.ids.includes(x.id);
      const chip = chips.createEl('button', { cls: 'pw-stats-chip', attr: { 'aria-pressed': String(on) } });
      chip.toggleClass('is-on', on);
      chip.createSpan('pw-stats-chip-dot').style.background = x.color;
      chip.createSpan({ text: x.name });
      chip.addEventListener('click', () => {
        let ids;
        if (x.id === REPORT_ALL) ids = [REPORT_ALL];
        else {
          ids = o.ids.filter((id) => id !== REPORT_ALL);
          ids = on ? ids.filter((id) => id !== x.id) : ids.concat(x.id);
          if (!ids.length) ids = [REPORT_ALL];
        }
        this.o.ids = ids;
        this.setSpan();
        this.update({});
      });
    }
    if (o.ids.length > 1) {
      this.segment(what, { apart: 'Pages for each', together: 'All together' }, o.together ? 'together' : 'apart', (v) => this.update({ together: v === 'together' }));
    }

    // Every section, each with how much it shows; and the presets, which set them all.
    const shows = this.section('What it shows', 'Start from a preset, then turn each section off, or show its essentials, a balanced amount, or everything.');
    const preset = REPORT_PRESETS.find((lv) => REPORT_SECTIONS.every((x) => (o.sections[x.id] || 'off') === reportPreset(lv)[x.id]));
    this.segment(shows, Object.fromEntries(REPORT_PRESETS.map((lv) => [lv, REPORT_LEVELS[lv]])), preset || '', (v) => this.update({ sections: reportPreset(v) }));
    const list = shows.createDiv('pw-report-sections');
    const short = { off: 'Off', essentials: 'Ess.', balanced: 'Bal.', everything: 'All' };
    const timelines = this.plugin.settings.projects.some((x) => x.timeline);
    for (const sec of REPORT_SECTIONS) {
      // The timeline, once a project follows one.
      if (sec.id === 'timeline' && !timelines) continue;
      const row = list.createDiv('pw-report-row');
      const level = o.sections[sec.id] || 'off';
      row.toggleClass('is-off', level === 'off');
      row.createSpan({ cls: 'pw-report-row-name', text: sec.name });
      const seg = this.segment(row, short, level, (v) => this.update({ sections: Object.assign({}, o.sections, { [sec.id]: v }) }), 'is-small');
      seg.setAttr('aria-label', sec.name);
      const names = ['Off', 'Essentials', 'Balanced', 'Everything'];
      seg.querySelectorAll('button').forEach((b, i) => b.setAttr('aria-label', `${sec.name}: ${names[i]}`));
    }

    const dates = this.section('Dates');
    const row = dates.createDiv('pw-report-dates');
    const date = (value, onChange) => {
      const input = row.createEl('input', { attr: { type: 'date', value } });
      input.addEventListener('change', () => input.value && onChange(input.value));
      return input;
    };
    date(o.from, (v) => this.update(v <= o.to ? { from: v } : { from: o.to, to: v }));
    row.createSpan({ cls: 'pw-report-note', text: 'to' });
    date(o.to, (v) => this.update(v >= o.from ? { to: v } : { from: v, to: o.from }));
    const whole = dates.createEl('button', { cls: 'pw-report-link', text: 'From the first day to the last' });
    whole.addEventListener('click', () => {
      this.setSpan();
      this.update({});
    });

    const words = this.section('Title and note');
    const fallback = andList(o.ids.map((id) => reportInfo(this.plugin, id).name));
    const title = words.createEl('input', { cls: 'pw-project-input', attr: { type: 'text', placeholder: groups.length > 1 ? 'Each part has its project\'s name' : fallback, value: o.title } });
    title.disabled = groups.length > 1;
    title.addEventListener('input', () => this.update({ title: title.value }, false));
    const note = words.createEl('input', { cls: 'pw-project-input', attr: { type: 'text', placeholder: 'Your name, or a line about the work', value: o.note } });
    note.addEventListener('input', () => this.update({ note: note.value }, false));

    const paper = this.section('Paper');
    this.segment(paper, Object.fromEntries(Object.entries(PAPERS).map(([k, v]) => [k, v.name])), o.paper, (v) => this.update({ paper: v }));
    this.segment(paper, { portrait: 'Portrait', landscape: 'Landscape' }, o.orientation, (v) => this.update({ orientation: v }));
    this.segment(paper, REPORT_PAGES, o.pages, (v) => this.update({ pages: v }));
    paper.createDiv({ cls: 'pw-report-note', text: REPORT_PAGE_NOTES[o.pages] });

    const buttons = el.createDiv('pw-project-modal-buttons');
    buttons.createDiv('pw-project-modal-gap');
    buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
    const image = buttons.createEl('button', { text: 'Save as images' });
    image.addEventListener('click', () => this.save(image, 'png'));
    const save = buttons.createEl('button', { cls: 'mod-cta', text: 'Save PDF' });
    save.addEventListener('click', () => this.save(save, 'pdf'));
    this.saveButtons = [image, save];
    el.scrollTop = scroll;
  }

  // The text of the notes, read once for each part of the report and its dates.
  async readTexts() {
    const o = this.o;
    const texts = {};
    for (const ids of this.groups()) {
      const key = `${ids.join(',')}|${o.from}|${o.to}`;
      if (!this.textCache[key]) {
        const paths = reportData(this.plugin, ids, o.from, o.to).notes.map((n) => n.path);
        this.textCache[key] = await analyseText(this.app, paths);
      }
      texts[ids.join(',')] = this.textCache[key];
    }
    return texts;
  }

  pages() {
    return buildReport(this.plugin, Object.assign({}, this.o, { title: this.o.title.trim(), note: this.o.note.trim() }));
  }

  // The timelines the projects follow, read from their notes.
  loadTimelines() {
    const p = this.plugin;
    const paths = [...new Set(p.settings.projects.filter((x) => x.timeline).map((x) => x.timeline))];
    return Promise.all(paths.map((path) => p.loadTimeline(path)));
  }

  renderPreview() {
    const el = this.previewEl;
    if (!el) return;
    const o = this.o;
    // Draw again once the timelines are read.
    if (!this.timelinesRead) {
      this.timelinesRead = true;
      this.loadTimelines().then(() => this.renderPreview(), () => {});
    }
    const reading = (o.sections.text || 'off') !== 'off';
    const missing = reading && this.groups().some((ids) => !this.textCache[`${ids.join(',')}|${o.from}|${o.to}`]);
    if (reading && !missing) o.texts = Object.fromEntries(this.groups().map((ids) => [ids.join(','), this.textCache[`${ids.join(',')}|${o.from}|${o.to}`]]));
    const scroll = el.scrollTop;
    el.empty();
    const pages = this.pages();
    for (const pg of pages) drawReportSvg(el, pg).toggleClass('is-landscape', pg.w > pg.h);
    el.scrollTop = scroll;
    setText(this.countEl, `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}, ${PAPERS[o.paper].name} ${o.orientation}`);
    if (this.saveButtons) this.saveButtons[1].setText(pages.length > 1 ? `Save PDF, ${pages.length} pages` : 'Save PDF');
    // Read the notes for The text itself, then draw again.
    if (missing && !this.reading) {
      this.reading = true;
      this.readTexts().then((texts) => {
        this.reading = false;
        o.texts = texts;
        this.renderPreview();
      }, () => {
        // Notes that can't be read leave the section without them, rather than waiting.
        this.reading = false;
        for (const ids of this.groups()) this.textCache[`${ids.join(',')}|${o.from}|${o.to}`] = this.textCache[`${ids.join(',')}|${o.from}|${o.to}`] || { notes: 0, words: 0, top: [] };
        this.renderPreview();
      });
    }
  }

  // Saves a file where attachments go in this vault, or at the top of the vault.
  async saveFile(name, bytes) {
    const app = this.app;
    let path = null;
    try {
      if (app.fileManager.getAvailablePathForAttachment) path = await app.fileManager.getAvailablePathForAttachment(name);
    } catch (e) {
      path = null;
    }
    if (!path) {
      path = name;
      for (let n = 2; app.vault.getAbstractFileByPath(path); n++) path = name.replace(/(\.\w+)$/, ` ${n}$1`);
    }
    const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    if (folder && !app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
    return app.vault.createBinary(path, bytes.buffer);
  }

  async save(button, kind) {
    for (const b of this.saveButtons) b.disabled = true;
    const p = this.plugin;
    const o = this.o;
    try {
      // Remember the sections and the paper for next time.
      p.settings.report = { sections: Object.assign({}, o.sections), paper: o.paper, orientation: o.orientation, pages: o.pages };
      p.saveSettings();
      if ((o.sections.text || 'off') !== 'off') o.texts = await this.readTexts();
      await this.loadTimelines();
      const pages = this.pages();
      const title = o.title.trim() || andList(o.ids.map((id) => reportInfo(p, id).name));
      const base = `${title} - time report ${dayKey(new Date())}`.replace(/[\\/:*?"<>|#^[\]]/g, '-');
      let first;
      if (kind === 'pdf') first = await this.saveFile(`${base}.pdf`, makePdf(pages, title));
      else {
        // Each page as an image, at 216 dots to the inch.
        for (let i = 0; i < pages.length; i++) {
          const file = await this.saveFile(pages.length > 1 ? `${base} (page ${i + 1}).png` : `${base}.png`, await reportPng(pages[i], 3));
          first = first || file;
        }
      }
      this.close();
      new Notice(kind === 'pdf' ? `Saved your report as ${first.path}` : `Saved your report as ${pages.length} ${pages.length === 1 ? 'image' : 'images'}, starting with ${first.path}`);
      await this.app.workspace.getLeaf(true).openFile(first);
    } catch (e) {
      for (const b of this.saveButtons) b.disabled = false;
      new Notice(`Pocket Watch couldn't save the report: ${e.message}`);
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
      .setDesc(Platform.isMobile ? 'Tap the watch for your calendar and stats, and press and hold it for focus sessions.' : 'Click the watch for your calendar and stats, and right-click it for focus sessions.')
      .addToggle((t) => t.setValue(s.showWatch).onChange((v) => set({ showWatch: v })));
    this.renderGallery(el, set);
    new Setting(el)
      .setName('Size')
      .setDesc(Platform.isMobile ? 'How big the watch is on this device.' : 'Or drag the handle on the watch, or hold Alt and scroll over it. Each device keeps its own.')
      .addSlider((sl) => sl
        .setLimits(MIN_SIZE, MAX_SIZE, 2)
        .setValue(s.watchSize)
        .setDynamicTooltip()
        .onChange((v) => set({ watchSize: v })));
    new Setting(el)
      .setName('Position')
      .setDesc(Platform.isMobile ? 'Drag the watch onto the bar at the top of the note to tuck it in between its buttons, or to a corner or edge.' : 'Drag the watch onto a pane and it snaps to a corner or edge. Drop it on a pane\'s tab bar to tuck it in there, sized to fit. Drop it on the ribbon or status bar to snap it to the window, or hold Alt to place it freely.')
      .addButton((b) => b.setButtonText('Reset').onClick(() => set({ watchAnchor: null, watchPos: null })));
    dropdown(
      new Setting(el).setName('Fade when left alone').setDesc('The watch fades back after a while, and comes back when you point at it or touch it, while its shelf is open, and when time is up.'),
      FADES, String(s.fadeAfter), (v) => set({ fadeAfter: Number(v) }, true),
    );
    if (s.fadeAfter > 0) slider(el, 'How much shows when faded', 'fadeTo', [10, 90, 5]);

    // Customise the watch you are wearing.
    if (s.watchType === 'digital' && SQUARE_STYLES.includes(s.digitalStyle)) {
      const name = DIGITAL_STYLES[s.digitalStyle];
      const style = s.digitalStyle;
      const body = group('customise', `Customise ${name}`, {
        tomato: 'The time left in a session, large, with the session round the edge.',
        pixel: 'The time in lights, and what else it shows.',
        words: 'The time in words, to the five minutes before it, with a light in a corner for each minute since.',
        terminal: 'A green screen: the time, the date, a bar toward your goal and what you\'re doing, with a cursor after it.',
      }[style]);
      if (style !== 'words') dropdown(new Setting(body).setName('Clock'), CLOCKS, s.clock, (v) => set({ clock: v }, true));
      if (style === 'tomato') toggle(body, 'Monogram', 'dialText', 'The Philip Pocket monogram, faded into the tile.');
      if (style === 'pixel') {
        toggle(body, 'Seconds', 'digitalSeconds', 'A light that runs round the edge once a minute.');
        toggle(body, 'Blinking dot', 'blinkColon', 'The dot between the hours and the minutes blinks.');
        toggle(body, 'Bottom row', 'digitalBar', 'Fills up toward your daily goal, and counts down during a focus session.');
      }
      if (style === 'words') new Setting(body).setName('Colour').setDesc('The words take on the colour of a focus session or a break while one runs.');
      if (style === 'terminal') {
        toggle(body, 'Seconds', 'digitalSeconds');
        toggle(body, 'Blinking cursor', 'blinkColon');
        toggle(body, 'Bar', 'digitalBar', 'Fills up toward your daily goal, and runs down during a focus session.');
      }
    } else if (s.watchType === 'digital' && SHAPED_STYLES.includes(s.digitalStyle)) {
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
        new Setting(body).setName('Movement').setDesc('How the balance wheel moves in Open heart and in the movement window, and how Vinyl\'s record turns. Lifelike ticks five times a second.'),
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
      .setDesc('Deletes every tracked day, on every device. This cannot be undone.')
      .addButton((b) => b.setButtonText('Reset').setWarning().onClick(async () => {
        if (window.confirm('Delete all Pocket Watch time and word stats?')) {
          await p.resetData();
          new Notice('Pocket Watch data reset');
        }
      }));

    // Your devices: rename them, change their kind, or take in or forget an old one.
    const devices = group('devices', 'Devices', 'The computers and phones your time comes from.');
    for (const x of p.deviceList()) {
      const setting = new Setting(devices).setName(x.name)
        .setDesc(`${DEVICE_KINDS[x.kind]}${x.isThis ? ', this device' : `, last here ${sinceText(x.seen)}`}`);
      setIcon(setting.nameEl.createSpan({ cls: ['pw-device-icon', 'is-inline'] }), DEVICE_ICONS[x.kind]);
      setting.nameEl.prepend(setting.nameEl.lastChild);
      setting.addExtraButton((b) => b.setIcon('pencil').setTooltip('Rename, or change its kind').onClick(() => {
        const modal = new DeviceModal(this.app, p, x);
        modal.onClose = () => {
          modal.contentEl.empty();
          this.display();
        };
        modal.open();
      }));
    }

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
    const slimSize = { hairline: 116, capsule: 124, column: 96, tomato: 84, pixel: 84, words: 84, terminal: 84 };
    for (const [key, name] of Object.entries(DIGITAL_STYLES)) {
      card(grid, name, s.watchType === 'digital' && s.digitalStyle === key, { watchType: 'digital', digitalStyle: key }, slimSize[key] || 72);
    }
  }
}
