<h1 align="center">Pocket Watch</h1>

<p align="center">
  <b>Time tracking, a Pomodoro timer and writing stats for Obsidian, in a fine watch that sits over your notes.</b><br>
  Focus sessions · Time tracking · Writing stats · Projects · Desktop and mobile
</p>

<p align="center">
  <a href="https://github.com/Nexziz/pocket-watch/releases/latest"><img src="https://img.shields.io/github/v/release/Nexziz/pocket-watch?style=flat-square&label=release" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/desktop%20%C2%B7%20phone%20%C2%B7%20tablet-supported-7c5cff?style=flat-square" alt="Desktop, phone and tablet">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" alt="MIT license"></a>
  <a href="https://buymeacoffee.com/nexsiz"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-ffdd00?style=flat-square&logo=buymeacoffee&logoColor=black" alt="Buy me a coffee"></a>
</p>

![Pocket Watch](images/hero.png)

## At a glance

- ⏱️ **Time tracking** that just runs: your time in Obsidian, per day, per note and per project, pausing by itself when you're idle.
- 🍅 **Pomodoro timer** built into the watch: focus sessions, short and long breaks, a soft chime, and a face that paints your session on the dial.
- 📊 **A full stats page** you arrange yourself: a year of days at a glance, trends, your goal, the hours you work, words written, records, and where your time went.
- 🗂️ **Projects** in their own colours, so you can see what your time went toward, and move it if it landed on the wrong one.
- ⌚ **24 analog watches and 12 digital ones**, from porcelain and malachite to a spinning vinyl record and a word clock.
- 📱 **Desktop, phone and tablet**, with each device's time kept apart and added up, so sync never overwrites it.

## The watches

Every watch has its own dial, hands, complications and case: a moon phase, small seconds, today's time or a goal dial. Drag one onto a corner of a pane and it snaps into place. Drop it on a tab bar and it tucks in there, in a bolder mini version that stays readable when it's small. If you'd rather it stayed out of the way, let it fade back when you leave it alone; it comes back when you point at it, and when time is up.

![Twenty-four watches and twelve digital styles](images/make-it-yours.png)

<table>
  <tr>
    <td><img src="images/retro-vinyl-terrazzo.png" alt="Retro, Vinyl and Terrazzo"></td>
    <td><img src="images/square-digital.png" alt="Square digital watches: Tomato, Pixel and Words"></td>
  </tr>
  <tr>
    <td><img src="images/painted-dials.png" alt="Painted dials: Sakura, Nocturne and Koi"></td>
    <td><img src="images/tab-bar.png" alt="Tucked into a tab bar"></td>
  </tr>
</table>

## Pomodoro and focus

- Start a session from the watch, the shelf or the command palette. The bezel counts down, a chime marks the end, and the break can start on its own, with a long break every few sessions.
- The **Pomodoro** face and the **Tomato** watch show how much focus is left and when the break comes, with a dot for each session until the long break.
- When time is up, the watch glows, takes on a colour or shows a small dot until you respond.
- In colour, orange is focus and green is a break. In greyscale the watch stays quiet while you focus.

![A focus session from start to finish](images/focus-demo.gif)

<table>
  <tr>
    <td><img src="images/times-up.png" alt="When time is up"></td>
    <td><img src="images/greyscale.png" alt="In colour or in greyscale"></td>
  </tr>
</table>

## Time tracking and stats

- **Click the watch** for today, your focus sessions and a calendar of your time.
- **Open the stats page** for the past year, the last 7, 30 or 90 days or all time: time against the period before, your daily goal, the hours you work on a 24-hour dial, your week, your writing, the notes and folders your time went to, and your records.
- **Idle limit**: the timer stops after a while with no typing, clicking or scrolling. Reading counts.
- **Track outside Obsidian** with one click, while you research in a browser or a PDF reader.
- **Projects** each have a colour. Switch from the shelf or the command palette, lock the one you're on, show one or several on the stats page, and move time between projects with an undo.
- **Arrange the page**: press *Edit layout*, then drag the cards where you want them, make them wide or narrow, and hide the ones you don't need. Bring them back whenever you like.

![Your stats, with projects and devices](images/stats.png)

## On every device

Pocket Watch runs on desktop, phones and tablets. On a phone it counts while Obsidian is on screen, and the watch sits in the bar at the top of the note, between its buttons, out of the way of your writing. Tap it for your stats, and press and hold it for the menu.

![On a phone: in the header, as Tomato, and the shelf](images/phone.png)

With your vault synced, each device keeps its own record of your time, so your computer and phone never overwrite each other, and the stats page adds them all up. The **Devices** card shows where your time comes from, with the words written on each, and you can rename a device or change its kind.

## Install

Search for **Pocket Watch** in Settings → Community plugins once it's listed. Until then, download `manifest.json`, `main.js` and `styles.css` from the [latest release](https://github.com/Nexziz/pocket-watch/releases/latest) into `.obsidian/plugins/pocket-watch/` in your vault, and enable **Pocket Watch** in Settings → Community plugins.

If you use it on more than one device, update every device to 1.14 or later.

<details>
<summary><b>Settings</b></summary>

- **Watch**: every watch in a gallery to pick from, its size, its position, and whether it fades back when left alone.
- **Customise**: the case, monogram, hour markers, hands, seconds hand, complications, goal ring and movement, or for a digital watch its layout, clock and what it shows.
- **Focus sessions**: lengths, long breaks, starting automatically, colour or greyscale, how time being up shows, and the chime.
- **Tracking**: daily goal, idle limit, and your data.
- **Devices**: rename your devices, or take in or forget an old one.

</details>

## Privacy

Pocket Watch works entirely offline. It makes no network requests and only writes its own `data.json` in the plugin folder. Words written are counted from how a note's word count changes as you edit it. Chinese, Japanese and Korean characters count as one word each, as in Obsidian's own count.

## Support

Pocket Watch is made by one person in their spare time. If it brings you a little joy, a coffee keeps new watches coming. There's also a button at the top of the plugin's settings.

<p align="center">
  <a href="https://buymeacoffee.com/nexsiz"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-ffdd00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy me a coffee"></a>
</p>

<p align="center"><img src="images/open-heart.gif" width="300" alt="The Open heart movement, ticking at 18,000 beats an hour"></p>

## Credits and license

The Philip Pocket monogram is drawn from Great Vibes, under the [SIL Open Font License](https://openfontlicense.org). Pocket Watch is under the [MIT](LICENSE) license.
