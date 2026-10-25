# Pocket Watch

A fine timepiece that sits over your notes, with a Pomodoro timer for a steady rhythm of focus and breaks, and a quiet log of your writing time.

![Pocket Watch](images/hero.png)

## A timepiece

- **Sixteen watches, each its own.** Every face, signed Philip Pocket, comes with its own hands and complications: a date, small seconds, your words today or a goal dial. Two have a moon phase, each in its own window: Porcelain's classic arch with gold moons, and Midnight's round window onto a realistic moon, with its age in days around it. You can also pick your own.
- **Two painted dials**: Sakura, a cherry branch in gold lacquer with mother-of-pearl blossoms on black, and Nocturne, a mountain lake at dusk whose moon is tonight's moon.
- **Snaps where you put it.** Drag it over a pane and it snaps to a corner or edge. Drop it on the ribbon or status bar to snap it to the window, or hold Alt to place it anywhere.
- **Any size**: drag the handle on the watch, or hold Alt and scroll over it.
- **Click it** for your calendar and stats. Right-click it to start a focus session.

![Sixteen watches](images/make-it-yours.png)

![Two painted dials](images/painted-dials.png)

## Focus and breaks

- **Pomodoro, built in.** Start from the watch, the shelf or the command palette. The bezel counts down, a soft chime marks the end, and your break can begin on its own, with a long break every few sessions.
- **When time is up**, the watch tells you until you respond, with a glow, a wash of colour or a small dot. The label next to it counts the minutes past, and the menu offers the next step.
- **In colour or in greyscale.** In colour, orange is focus and green is a break. In greyscale, the watch is just a watch while you focus, and a soft light fades around it on a break.

![A focus session from start to finish](images/focus-demo.gif)

![When time is up](images/times-up.png)

![In colour, or in quiet greyscale](images/greyscale.png)

## Your time

- **Idle limit**: the timer stops after 30 minutes (or what you choose) with no typing, clicking, scrolling or mouse movement. Reading and scrolling count.
- **Calendar and stats**: time per day, focus sessions, words written and deleted, streaks and a 14-day chart.
- **Status bar**: today's time and the minutes left in a session.

![Sits on top of your notes](images/in-context.png)

## Install

Search for **Pocket Watch** in Settings → Community plugins once it's listed. Until then, download `manifest.json`, `main.js` and `styles.css` from the [latest release](https://github.com/Nexziz/pocket-watch/releases/latest) into `.obsidian/plugins/pocket-watch/` in your vault, then enable **Pocket Watch** in Settings → Community plugins.

## Settings

![Every watch in the settings](images/settings.png)

- **Watch**: every watch in a gallery to pick from, its size, and its position.
- **Customise**: for the watch you picked, its case, signature, hour markers, hands, seconds hand, complications (as designed or your own), goal ring and movement, or for the digital watch its layout, clock and what it shows.
- **Focus sessions**: lengths, long breaks, starting automatically, the countdown label, colour or greyscale, how time being up shows, and the chime.
- **Tracking**: daily goal, idle limit, and more.

<p align="center"><img src="images/open-heart.gif" width="340" alt="The open heart movement at 18,000 beats an hour"></p>

## Words and privacy

Words written and deleted come from how a note's word count changes while you edit it. Chinese, Japanese and Korean characters count as one word each, as in Obsidian's own count.

Pocket Watch works entirely offline. It makes no network requests and only writes its own `data.json` in the plugin folder.

## Credits and license

The Philip Pocket signature is drawn from Imperial Script and Marcellus SC, and its monogram from Great Vibes, all under the [SIL Open Font License](https://openfontlicense.org). The plugin is under the [MIT](LICENSE) license.
