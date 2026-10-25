'use strict';

const { Plugin, PluginSettingTab, Setting, MarkdownView, Notice, Menu } = require('obsidian');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// Each analog face is a watch of its own: a case, hour markers, hands and a set of
// complications (set: what sits at 12, 3, 6 and 9), and optionally a decoration, a dial
// finish (texture), a painting (art), a flange with a minute track, polished metal (applied)
// markers, a window onto the movement in one slot, and serif printing. The Philip Pocket signature is printed
// under 12 (brandWidth and brandClear size and place it); brand: 'script' prints just
// "Philip", brand: 'monogram' the interlaced PP, brandAt: 'six' moves it above 6, brandInk
// prints it rather than applying it in metal on a light dial, and
// model: false leaves out the face's name. Its colours live in styles.css under
// .pocket-watch-face-<key>.
const ANALOG_FACES = {
  porcelain: {
    name: 'Porcelain', case: 'polished', markers: 'batons', decor: 'minute-dots', texture: 'enamel', serif: true,
    hands: 'leaf', set: { slotRight: 'weekday-date', slotBottom: 'moon' },
  },
  linen: {
    name: 'Linen', case: 'polished', markers: 'roman', decor: 'railroad', texture: 'guilloche', serif: true,
    hands: 'breguet', set: { slotBottom: 'seconds' },
  },
  slate: {
    name: 'Slate', case: 'polished', markers: 'quarters', texture: 'brushed', flange: true, applied: true,
    hands: 'sword', set: { slotRight: 'date', slotBottom: 'words' },
  },
  midnight: {
    name: 'Midnight', case: 'polished', markers: 'dots', decor: 'aventurine', texture: 'sunburst', flange: true, applied: true,
    hands: 'dauphine', set: { slotBottom: 'moon-age' },
  },
  sakura: {
    name: 'Sakura', case: 'polished', markers: 'pips', art: 'sakura', flange: true, applied: true, brand: 'monogram',
    hands: 'dauphine', set: {},
  },
  nocturne: {
    name: 'Nocturne', case: 'polished', markers: 'pips', art: 'nocturne', flange: true, applied: true, brand: 'script',
    hands: 'leaf', set: {},
  },
  meteorite: {
    name: 'Meteorite', case: 'polished', markers: 'batons', art: 'meteorite', texture: 'grain', flange: true, applied: true, brandInk: true,
    hands: 'dauphine', set: { slotBottom: 'seconds' },
  },
  openheart: {
    name: 'Open heart', case: 'polished', markers: 'batons', texture: 'azurage', flange: true, applied: true, window: 'slotBottom',
    hands: 'dauphine', set: {},
  },
  bauhaus: {
    name: 'Bauhaus', case: 'thin', markers: 'arabic', decor: 'minute-ticks',
    hands: 'baton', set: { slotRight: 'date' },
  },
  void: {
    name: 'Void', case: 'thin', markers: 'minimal', applied: true, brand: 'script', model: false,
    hands: 'baton', set: {},
  },
  field: {
    name: 'Field', case: 'polished', markers: 'arabic', decor: 'inner-24', texture: 'grain', brandWidth: 36,
    hands: 'sword', set: { slotRight: 'date', slotBottom: 'focus' },
  },
  sector: {
    name: 'Sector', case: 'polished', markers: 'arabic', decor: 'sector', texture: 'grain', serif: true,
    hands: 'leaf', set: { slotBottom: 'goal' },
  },
  panda: {
    name: 'Panda', case: 'polished', markers: 'batons', texture: 'sunburst', applied: true, brandInk: true,
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
  theme: {
    name: 'Match theme', case: 'thin', markers: 'batons', decor: 'minute-dots', model: false,
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

// The Philip Pocket wordmark, as outlines so it looks the same everywhere: "Philip" in
// Imperial Script, its i dots turned into four-pointed glints, over POCKET in Marcellus SC
// set wide between two tapered rules. Both typefaces are under the SIL Open Font License.
// Units are font units at a size of 100: the script's baseline is at y 0, and x 102.6 is the
// middle of POCKET, which is where the mark is centred.
const BRAND = {
  centre: 102.6,
  box: [-27.4, -66.8, 232.5, 47.0],
  script: 'M13.1 5.6Q10.2 5.6 9.1 5.3Q6.2 4.5 6.2 3.4Q6.2 2.8 7.5 2.8Q8.1 2.8 9.1 3Q10 3.1 11.2 3.3Q13.8 3.9 15.1 3.9Q22.2 3.9 28.4 -2.6Q30.7 -5.1 33.1 -8.7Q35.5 -12.2 37.7 -16.8Q39.4 -20.3 41.1 -23.9Q42.7 -27.5 44.3 -31.1Q56.2 -55.7 68.3 -63Q61.1 -65.4 52.1 -65.4Q41.8 -65.4 33.5 -62.1Q23.8 -58.2 19.2 -50.4Q16.3 -45.5 16.3 -40.6Q16.3 -35.5 19.4 -32.1Q22.7 -28.7 27.8 -28.7Q33.5 -28.7 37.9 -32.8Q42.2 -36.8 42.2 -42.6Q42.2 -46.5 40.1 -49Q37.8 -51.6 34.1 -51.6Q31 -51.6 28.9 -49.8Q26.5 -47.7 26.5 -44.8Q26.5 -42.4 29.1 -42.4Q29.2 -42.4 29.4 -42.6Q29.5 -42.8 29.9 -43Q30.2 -42.9 30.2 -42.6Q30.2 -41.6 29 -41.6Q25.7 -41.6 25.7 -44.9Q25.7 -48.1 28.5 -50.5Q31.3 -52.8 34.5 -52.8Q38.6 -52.8 41.6 -50Q44.3 -47.2 44.3 -42.9Q44.3 -36.3 39.2 -31.8Q34.1 -27.5 27.5 -27.5Q21.5 -27.5 17.2 -31.3Q13 -35.1 13 -41.2Q13 -45.3 15 -49.3Q19.5 -58.4 31.2 -63Q40.7 -66.7 52.7 -66.7Q62.4 -66.7 70.5 -64.3Q75.5 -66.8 80.8 -66.8Q83.3 -66.8 85.7 -66Q88.6 -64.8 88.6 -62.5Q88.6 -60 87.2 -60Q86.8 -60 86.8 -61.8Q86.8 -65.5 80.5 -65.5Q76.6 -65.5 72.4 -63.7Q88.5 -58.1 88.5 -45.4Q88.5 -34.2 78.6 -27.6Q70.1 -21.8 58.3 -21.8Q57.3 -21.8 56.1 -21.9Q54.9 -22 53.4 -22.2Q49.4 -22.6 49.4 -23.4Q49.4 -24.2 49.9 -24.2H50H49.9Q49.9 -24.1 51.3 -23.8Q52.6 -23.4 54.8 -23.4Q64.9 -23.4 73.8 -29.2Q83.6 -35.8 83.6 -45.5Q83.6 -57 70 -62.4Q59.4 -55.9 50.3 -32.9Q49.5 -30.7 48.4 -27.5Q47.2 -24.2 45.3 -19.9Q41.1 -10.2 34.2 -4.1Q27.3 2.1 18 4.9Q15.9 5.6 13.1 5.6Z M75.4 1.6 75.2 1.5Q81.2 -18.5 91.1 -37Q105.5 -63.9 118.3 -63.9Q123 -63.9 123 -59.3Q123 -53.8 116.8 -46.7Q111.6 -41 105.7 -37.5Q101.1 -34.8 95.1 -32.7Q94.2 -32.4 93.8 -32.5Q90.7 -27 88.2 -21.8Q85.8 -16.6 83.9 -11.6Q88.1 -19.6 92.9 -25.1Q99.8 -33 105.9 -33Q110.9 -33 110.9 -29.4Q110.9 -25.9 104.2 -16.3Q98.3 -8 98.3 -3.1Q98.3 -0.6 100.5 -0.6Q102.2 -0.6 104.4 -1.7Q106.6 -2.8 109 -5.3Q112.1 -8.7 113.8 -11.6Q115.4 -14.5 116.7 -16.9Q117 -17.4 117.3 -17.3Q117.6 -17.2 117.4 -16.7Q115.9 -13.6 113.8 -10.2Q111.8 -6.9 109.6 -4.6Q106.8 -1.6 104 -0.5Q101.3 0.6 98.7 0.6Q93.4 0.6 93.4 -4.5Q93.4 -9 96.9 -14.9Q97.7 -16.2 99.3 -18.5Q101 -20.8 103.5 -24.1Q107 -28.8 107 -30.2Q107 -32 104.7 -32Q100.3 -32 94.2 -25.3Q90.1 -20.8 86.6 -14.8Q85 -12.1 83.3 -8.4Q81.6 -4.7 79.7 0L79.5 0.1Q78.7 -0.4 78 -0.4Q76.2 -0.4 75.4 1.6Z M94.3 -33.4Q94.7 -33.4 95.1 -33.5Q97.4 -34 99.8 -35.1Q102.3 -36.2 104.8 -37.8Q107.5 -39.6 110.2 -42Q112.9 -44.3 115.6 -47.3Q122.2 -54.5 122.2 -59.5Q122.2 -63 118.7 -63Q114.1 -63 105.1 -50.6Q102.4 -46.8 99.7 -42.5Q96.9 -38.2 94.3 -33.4Z M120.3 1Q113.7 1 113.7 -6.3Q113.7 -11.6 116.8 -17.5L124.3 -32.2H124.6Q124.9 -31.8 125.8 -31.8Q127.7 -31.8 130.8 -34.1L131 -33.9L122.5 -17.4Q117.2 -7.2 117.2 -3.2Q117.2 -1.4 118.2 -0.7Q119.2 0 120.5 0Q121.9 0 123.2 -0.6Q124.6 -1.2 125.6 -1.9Q128.3 -4 130.2 -6.8Q132 -9.5 133.4 -12.3Q134.8 -15.1 135.9 -17Q136.2 -17.5 136.5 -17.4Q136.8 -17.2 136.6 -16.7Q134.6 -12.5 132.2 -8.1Q129.8 -3.7 126.1 -1.1Q124.8 -0.2 123.4 0.4Q121.9 1 120.3 1Z M142.4 0.8Q134.3 0.8 134.3 -9.9Q134.3 -16.3 137.1 -24.8Q138.4 -28.7 139.9 -32.3Q141.4 -35.9 143.1 -39Q145.2 -42.8 147.5 -46.2Q149.8 -49.7 152.4 -52.8Q159.9 -62.1 165.2 -62.1Q167.4 -62.1 167.4 -60Q167.4 -57.2 165.1 -51.4Q157.4 -32.3 140.1 -16.6Q138.4 -10.3 138.4 -6.5Q138.4 0 142.5 0Q143.9 0 145.2 -0.6Q146.5 -1.1 147.5 -1.8Q150.2 -3.9 152.1 -6.7Q154 -9.5 155.4 -12.3Q156.8 -15.1 157.9 -17Q158.2 -17.5 158.5 -17.4Q158.8 -17.2 158.6 -16.7Q156.6 -12.5 154.2 -8.1Q151.8 -3.7 148.1 -1.1Q145.4 0.8 142.4 0.8Z M140.4 -17.6Q142.4 -19.3 144.6 -21.8Q146.8 -24.3 149.3 -27.5Q151.8 -30.7 154.4 -34.6Q157 -38.5 159.6 -43Q166.6 -54.9 166.6 -59.6Q166.6 -61.3 165.5 -61.3Q161.8 -61.3 152.3 -45.4Q149.8 -40.9 147.8 -36.7Q145.4 -31.4 143.6 -26.7Q141.7 -21.9 140.4 -17.6Z M161.5 1Q154.9 1 154.9 -6.3Q154.9 -11.6 158 -17.5L165.5 -32.2H165.8Q166.1 -31.8 167 -31.8Q168.9 -31.8 172 -34.1L172.2 -33.9L163.7 -17.4Q158.4 -7.2 158.4 -3.2Q158.4 -1.4 159.4 -0.7Q160.4 0 161.7 0Q163.1 0 164.4 -0.6Q165.8 -1.2 166.8 -1.9Q169.5 -4 171.3 -6.8Q173.2 -9.5 174.6 -12.3Q176 -15.1 177.1 -17Q177.4 -17.5 177.7 -17.4Q178 -17.2 177.8 -16.7Q175.8 -12.5 173.4 -8.1Q171 -3.7 167.3 -1.1Q166 -0.2 164.6 0.4Q163.1 1 161.5 1Z M147.9 25.8Q145.7 25.8 143.6 24.2Q141.6 22.6 141 20.3L141.1 20.1L141.6 19.9H141.8Q143 24.5 146.3 24.5Q150.2 24.5 156.1 18Q160.5 13.3 163.7 8Q165.6 4.9 168 0.3Q170.4 -4.3 173.4 -10.4Q176.5 -16.7 178.9 -21.4Q181.3 -26 183 -28.9Q184.1 -30.9 185.6 -32.8Q187.1 -34.7 188.9 -36.6Q193.7 -41.8 196.6 -41.8Q198.6 -41.8 198.6 -40Q198.6 -38.3 196.7 -37.8L195.1 -37.6Q192.1 -37.3 189.9 -35.4Q188.5 -34.2 186.7 -31.9Q184.8 -29.5 182.5 -25.9Q178.4 -19.5 176.3 -12.5Q186.5 -31.7 194.8 -31.7Q200.9 -31.7 200.9 -24.1Q200.9 -15.5 194.3 -8Q190.9 -4.2 187.4 -2.2Q183.8 -0.2 179.5 0.1Q181.5 0.4 183.3 0.4Q187 0.4 190.3 -0.9Q193.6 -2.1 196.4 -4.3Q199.3 -6.6 201.8 -9.9Q204.2 -13.1 206 -16.8Q206.3 -17.4 206.6 -17.4Q207.2 -17.4 206.7 -16.4Q205.1 -13.4 203.4 -10.8Q201.6 -8.1 199.6 -6Q197.2 -3.6 193.1 -1.1Q188.9 1.4 182.9 1.4Q181.2 1.4 179.2 1Q177.2 0.6 176 -0.4Q175.1 -1.2 174.9 -2.4Q174.7 -3.6 174.6 -5.3Q174.1 -3.4 173.2 -1Q172.3 1.5 171.1 4.4Q169.8 7.7 168.7 10Q167.6 12.2 166.8 13.4Q158 25.8 147.9 25.8Z M178.3 -0.3Q181.7 -0.3 186.6 -6.1Q190.5 -10.5 192.7 -14.8Q196.7 -22.8 196.7 -28.2Q196.7 -31.1 194.3 -31.1Q188.7 -31.1 181.8 -20.5Q178.6 -15.6 177.1 -11.7Q175.6 -7.8 175.6 -4.7Q175.6 -0.3 178.3 -0.3Z',
  glints: 'M 132.7 -49.7 L 133.7 -43.5 L 139.9 -42.5 L 133.7 -41.4 L 132.7 -35.2 L 131.6 -41.4 L 125.4 -42.5 L 131.6 -43.5 Z M 173.8 -49.7 L 174.9 -43.5 L 181.1 -42.5 L 174.9 -41.4 L 173.8 -35.2 L 172.8 -41.4 L 166.6 -42.5 L 172.8 -43.5 Z',
  caps: 'M45.4 41.1Q46.3 41.3 47.1 41.1Q47.8 41 48.4 40.6Q48.9 40.1 49.2 39.4Q49.5 38.6 49.5 37.5Q49.5 36.8 49.4 36.2Q49.2 35.6 48.9 35.1Q48.6 34.7 48.1 34.5Q47.7 34.2 47 34.2Q46.6 34.2 46.3 34.2Q46 34.3 45.8 34.3Q45.6 34.4 45.4 34.4Z M43.5 33.7Q43.7 33.7 43.9 33.7Q44 33.8 44.3 33.8Q44.5 33.8 44.7 33.8Q45.1 33.8 45.7 33.7Q46.3 33.6 47.3 33.6Q48.1 33.6 48.9 33.8Q49.7 34.1 50.2 34.6Q50.8 35.1 51.1 35.8Q51.4 36.5 51.4 37.5Q51.4 38.7 50.9 39.6Q50.4 40.5 49.6 41.1Q48.8 41.6 47.7 41.8Q46.6 42 45.4 41.8V43.4Q45.4 44.2 45.5 44.8Q45.5 45.3 45.5 45.8Q45.5 46.2 45.6 46.5Q45.6 46.8 45.7 47V47H43.5V47Q43.5 46.8 43.6 46.5Q43.6 46.2 43.7 45.8Q43.7 45.3 43.7 44.8Q43.7 44.2 43.7 43.4V37.3Q43.7 36.5 43.7 36Q43.7 35.4 43.7 34.9Q43.6 34.5 43.6 34.2Q43.5 33.9 43.5 33.7Z M69.3 33.5Q70.8 33.5 72.1 34Q73.4 34.5 74.4 35.4Q75.4 36.3 75.9 37.6Q76.4 38.9 76.4 40.4Q76.4 41.3 76.2 42.2Q76 43 75.6 43.8Q75.2 44.5 74.7 45.2Q74.1 45.8 73.3 46.3Q72.6 46.8 71.7 47Q70.8 47.3 69.8 47.3Q68.2 47.3 66.9 46.8Q65.6 46.3 64.7 45.4Q63.7 44.5 63.2 43.2Q62.6 41.9 62.6 40.4Q62.6 39.5 62.8 38.6Q63 37.8 63.4 37Q63.8 36.2 64.4 35.6Q65 34.9 65.7 34.5Q66.4 34 67.3 33.7Q68.2 33.5 69.3 33.5Z M69.8 46.5Q70.8 46.5 71.7 46.1Q72.5 45.7 73.2 45Q73.8 44.3 74.1 43.3Q74.5 42.3 74.5 41Q74.5 39.6 74.1 38.3Q73.8 37.1 73.1 36.2Q72.5 35.3 71.5 34.8Q70.6 34.3 69.3 34.3Q68.2 34.3 67.4 34.7Q66.5 35 65.9 35.7Q65.3 36.4 65 37.4Q64.6 38.5 64.6 39.7Q64.6 41.2 64.9 42.4Q65.3 43.6 65.9 44.5Q66.6 45.4 67.5 45.9Q68.5 46.5 69.8 46.5Z M99.3 35.7 99.2 35.8Q98.5 35.1 97.5 34.7Q96.4 34.3 95.2 34.3Q94.1 34.3 93.1 34.7Q92.1 35 91.4 35.7Q90.7 36.4 90.3 37.4Q89.9 38.5 89.9 39.7Q89.9 41.2 90.3 42.4Q90.7 43.6 91.4 44.5Q92.1 45.4 93.2 45.9Q94.3 46.5 95.8 46.5Q96.3 46.5 96.9 46.3Q97.4 46.2 97.9 46Q98.4 45.8 98.8 45.5Q99.2 45.2 99.6 44.8L99.7 44.8L98.9 46.7Q98.2 47 97.4 47.1Q96.6 47.3 95.7 47.3Q94 47.3 92.6 46.8Q91.1 46.3 90.1 45.4Q89.1 44.5 88.5 43.2Q88 41.9 88 40.4Q88 39.5 88.2 38.6Q88.4 37.8 88.8 37Q89.3 36.2 89.9 35.6Q90.6 34.9 91.4 34.5Q92.2 34 93.2 33.7Q94.2 33.5 95.3 33.5Q97.1 33.5 98.6 34Z M111.4 47Q111.4 46.8 111.5 46.5Q111.5 46.2 111.6 45.8Q111.6 45.3 111.6 44.8Q111.6 44.2 111.6 43.4V37.3Q111.6 36.5 111.6 36Q111.6 35.4 111.6 34.9Q111.5 34.5 111.5 34.2Q111.4 33.9 111.4 33.7V33.7H113.6V33.7Q113.5 33.9 113.5 34.2Q113.4 34.5 113.4 34.9Q113.4 35.4 113.4 36Q113.3 36.5 113.3 37.3V39.4L118.8 35Q119.7 34.2 119.7 33.7H122.3V33.7Q121.7 33.9 121.2 34.2Q120.6 34.6 120 35.1L115.2 39.1L120.9 45.5Q121.3 45.8 121.6 46.1Q121.8 46.3 122 46.5Q122.2 46.6 122.4 46.8Q122.5 46.9 122.7 47V47H120Q119.9 46.9 119.9 46.8Q119.8 46.7 119.7 46.5Q119.5 46.4 119.4 46.2Q119.3 46.1 119.2 46L113.3 39.6V43.4Q113.3 44.2 113.4 44.8Q113.4 45.3 113.4 45.8Q113.4 46.2 113.5 46.5Q113.5 46.8 113.6 47V47H111.4Z M133.7 33.7Q134.8 33.7 136 33.7Q137.1 33.7 138.1 33.7Q139 33.6 139.7 33.6Q140.4 33.6 140.6 33.5L140.2 34.8Q139.8 34.7 139.4 34.6Q139.1 34.6 138.6 34.5Q138.1 34.5 137.4 34.5Q137.2 34.5 136.9 34.5Q136.6 34.5 136.3 34.5Q136 34.5 135.6 34.6V39.6Q136.6 39.6 137.3 39.6Q138.1 39.5 138.6 39.5Q139.3 39.4 139.8 39.3L139.5 40.7Q138.8 40.6 138.2 40.5Q137.6 40.5 136.9 40.4Q136.2 40.4 135.6 40.4V46.2Q136.7 46.2 137.6 46.1Q138.5 46 139.2 45.9Q140 45.7 140.7 45.6L140.4 47.1Q140.3 47.1 140.1 47.1Q139.9 47 139.6 47Q139.3 47 139 47Q138.7 47 138.4 47Q138.2 47 138 47Q137.8 47 137.7 47H133.7V47Q133.7 46.8 133.8 46.5Q133.8 46.2 133.8 45.8Q133.9 45.3 133.9 44.8Q133.9 44.2 133.9 43.4V37.3Q133.9 36.5 133.9 36Q133.9 35.4 133.8 34.9Q133.8 34.5 133.8 34.2Q133.7 33.9 133.7 33.7V33.7Z M156.5 34.5Q155.4 34.5 154.5 34.6Q153.6 34.7 153 34.8Q152.2 35 151.6 35.1L151.9 33.6Q152 33.6 152.2 33.6Q152.5 33.6 152.7 33.7Q153 33.7 153.3 33.7Q153.6 33.7 153.9 33.7Q154.2 33.7 154.4 33.7Q154.6 33.7 154.7 33.7H160Q160.1 33.7 160.3 33.7Q160.5 33.7 160.7 33.7Q161 33.7 161.3 33.7Q161.6 33.7 161.9 33.7Q162.2 33.6 162.4 33.6Q162.6 33.6 162.7 33.6L163 35.1Q162.4 35 161.6 34.8Q161 34.7 160.1 34.6Q159.2 34.5 158.2 34.5V43.4Q158.2 44.2 158.2 44.8Q158.2 45.3 158.2 45.8Q158.3 46.2 158.3 46.5Q158.4 46.8 158.4 47V47H156.2V47Q156.3 46.8 156.3 46.5Q156.4 46.2 156.4 45.8Q156.4 45.3 156.4 44.8Q156.5 44.2 156.5 43.4Z',
  rules: 'M -23.9 40.1 L 30.1 39.1 L 30.1 41.3 L -23.9 40.2 Z M -27.4 40.2 L -25.6 38.3 L -23.9 40.2 L -25.6 42 Z M 229 40.1 L 175 39.1 L 175 41.3 L 229 40.2 Z M 232.5 40.2 L 230.8 38.3 L 229 40.2 L 230.8 42 Z',
};

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
};

// Every face drawn gets its own number, so the ids of its gradients never clash with another's.
let drawings = 0;

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
    this.days = saved.days || {};
    // The running focus session or break, if any: { kind, total, endsAt, paused, remaining }.
    this.session = saved.session || null;
    // Focus sessions finished since the last long break.
    this.cycle = saved.cycle || 0;
    // When a session or break has ended: { kind, endedAt, until }. The watch shows it until you
    // respond, or until its `until` time when the next one started on its own.
    this.alert = saved.alert || null;

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
    const key = JSON.stringify([
      s.watchType, s.watchSize, s.face, s.caseStyle, s.dialText, s.markers, s.hands, s.seconds, s.complications, s.slotTop, s.slotRight, s.slotBottom, s.slotLeft,
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
    this.uid = ++drawings;
    const slots = faceSlots(s);
    const used = {};
    for (const slot of SLOTS) used[slot.hour] = slots[slot.key] !== 'none' || face.window === slot.key;

    // The crown or the pocket watch bow sits outside the case, so the drawing grows to fit it.
    const caseStyle = CASES[s.caseStyle] ? s.caseStyle : 'crown';
    const box = caseStyle === 'crown' ? [0, 0, 208, 200] : caseStyle === 'bow' ? [0, -28, 200, 228] : [0, 0, 200, 200];
    const svg = this.faceEl.createSvg('svg', {
      attr: { viewBox: box.join(' '), width: (s.watchSize * box[2]) / 200, height: (s.watchSize * box[3]) / 200 },
      cls: ['pocket-watch-svg', `pocket-watch-face-${faceKey}`, `pw-case-${face.case}`],
    });
    const [dotX, dotY] = polar(94, 45);
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

    // Dial: its painting and finish, then shading where it meets the case, then the flange.
    if (face.art === 'sakura') this.drawSakura(svg, add, R);
    else if (face.art === 'nocturne') this.drawNocturne(svg, add, R, now);
    else if (face.art === 'meteorite') this.drawMeteorite(svg, add, R);
    if (face.texture) this.drawTexture(svg, add, face.texture, R);
    if (face.decor) this.drawDecor(svg, add, text, face.decor, R, k, used);
    add(svg, 'circle', { cx: 100, cy: 100, r: R, fill: url('dial-shade') }, 'pw-dial-shade');
    add(svg, 'circle', { cx: 100, cy: 100, r: R }, 'pw-alert-wash');
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

    if (s.dialText) this.drawBrand(svg, add, text, face, markers, R, k, used);

    if (face.window) {
      const slot = SLOTS.find((x) => x.key === face.window);
      const [cx, cy] = polar(R * 0.415, slot.hour * 30);
      this.drawMovementWindow(svg, add, cx, cy, R * 0.345);
    }
    for (const slot of SLOTS) {
      const type = slots[slot.key];
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
    const style = s.hands !== 'face' && HANDS[s.hands] ? s.hands : face.hands || 'leaf';
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

  // The Philip Pocket signature under 12, clear of the hour markers, with the model's name
  // beneath it; above 6 when something sits at 12. Faces with polished metal markers have it
  // in the same metal, as if applied. A face can ask for just the script, for the monogram,
  // or for it at 6.
  drawBrand(svg, add, text, face, markers, R, k, used) {
    const atSix = face.brandAt === 'six' || used[0];
    if (atSix && used[6]) return;
    const kind = face.brand || 'full';
    // On light dials metal would not show, so the signature is printed there.
    const metal = face.applied && !face.brandInk;
    const width = (face.brandWidth || { full: 48, script: 40, monogram: 22 }[kind]) * k;
    // The part of the drawing to fit: the whole lockup, the script alone, or the monogram.
    const [left, top, right, bottom] = kind === 'monogram' ? MONOGRAM.box : kind === 'script' ? [6, BRAND.box[1], 207, 26] : BRAND.box;
    const scale = width / (right - left);
    const height = (bottom - top) * scale;
    const modelSize = 3.6 * k;
    const model = face.model !== false && kind === 'full' ? (face.model || face.name).toUpperCase() : '';
    const block = height + (model ? modelSize * 2.2 : 0);
    // How far in from the edge the markers reach at 12 (or 6).
    const clear = (face.brandClear || {
      batons: 24, dots: 21, arabic: face.decor === 'inner-24' ? 41 : 27, quarters: 41, roman: 30, lume: 25, minimal: 22, pips: 15,
    }[markers] || 17) * k;
    // At 6 the name sits lowest, so it keeps a little more room from the marker below it.
    const y0 = atSix ? 100 + R - clear - 4 * k - block : 100 - R + clear;
    const x = kind === 'monogram' ? 100 : kind === 'script' ? 100 - ((left + right) / 2) * scale : 100 - BRAND.centre * scale;
    const g = add(svg, 'g', {
      transform: `translate(${x.toFixed(2)} ${(y0 - top * scale).toFixed(2)}) scale(${scale.toFixed(4)})`,
    }, metal ? ['pw-brand-mark', 'is-applied', 'pw-raised'] : 'pw-brand-mark');
    const fill = metal ? { fill: `url(#${this.id('brand-metal')})` } : {};
    if (metal) {
      this.gradient(add, 'linearGradient', 'brand-metal', { x1: 0, x2: 0, y1: top, y2: bottom, gradientUnits: 'userSpaceOnUse' }, [['0%', 'pw-metal-a'], ['55%', 'pw-metal-b'], ['100%', 'pw-metal-c']]);
    }
    if (kind === 'monogram') {
      add(g, 'path', Object.assign({ d: MONOGRAM.path }, fill), 'pw-brand-script');
      return;
    }
    add(g, 'path', Object.assign({ d: BRAND.script }, fill), 'pw-brand-script');
    add(g, 'path', { d: BRAND.glints }, 'pw-brand-glint');
    if (kind === 'full') {
      add(g, 'path', Object.assign({ d: BRAND.caps }, fill), 'pw-brand-caps');
      add(g, 'path', Object.assign({ d: BRAND.rules }, fill), 'pw-brand-rules');
    }
    if (model) text(svg, 100, y0 + height + modelSize * 1.5, modelSize, model, face.serif ? ['pw-model', 'is-serif'] : 'pw-model');
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

    // The branch, in raised gold with a light catching its upper edge.
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
    const bark = add(g, 'g', {}, 'pw-bark');
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
    add(g, 'path', { d: lenticels }, 'pw-bark-mark');
    for (const [x, y, rx, ry, a] of [[44, 147, 1.6, 0.7, -30], [83, 129, 1.4, 0.6, -18], [121, 120, 1.2, 0.5, -30], [149, 104, 0.9, 0.45, -55]]) {
      add(g, 'ellipse', { cx: x, cy: y, rx, ry, transform: `rotate(${a} ${x} ${y})` }, 'pw-bark-knot');
    }

    // Buds, closed in their gold calyxes.
    const petal = (L, W) => `M 0 0 C ${-W * 0.55} ${-L * 0.25} ${-W * 0.62} ${-L * 0.85} ${-W * 0.22} ${-L} Q ${-W * 0.08} ${-L * 1.03} 0 ${-L * 0.86} Q ${W * 0.08} ${-L * 1.03} ${W * 0.22} ${-L} C ${W * 0.62} ${-L * 0.85} ${W * 0.55} ${-L * 0.25} 0 0 Z`;
    for (const [x, y, turn] of [[186, 46, 50], [60, 92, -55], [174, 131, 105], [38, 118, -75], [178, 84, 80], [13, 146, -95]]) {
      const b = add(g, 'g', { transform: `translate(${x} ${y}) rotate(${turn})` });
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
      const b = add(g, 'g', { transform: `translate(${x} ${y}) rotate(${turn})` }, 'pw-blossom');
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
      .setDesc('Drag the watch onto a pane and it snaps to a corner or edge. Drop it on the ribbon or status bar to snap it to the window, or hold Alt to place it freely.')
      .addButton((b) => b.setButtonText('Reset').onClick(() => set({ watchAnchor: null, watchPos: null })));

    // Customise the watch you are wearing.
    if (s.watchType === 'digital') {
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
      toggle(body, 'Signature', 'dialText', 'Philip Pocket and the name of the face, under 12 o\'clock.');
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
    for (const [key, name] of Object.entries(DIGITAL_STYLES)) {
      card(grid, name, s.watchType === 'digital' && s.digitalStyle === key, { watchType: 'digital', digitalStyle: key }, 72);
    }
  }
}
