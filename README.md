# Pocket Watch

An Obsidian plugin that tracks how long you spend in Obsidian.

- **Floating watch**: a small analog or digital watch that sits on top of your notes. Drag it wherever you like; it remembers the spot. It counts minutes, not seconds, so it stays calm while you work. The rim turns orange when you go idle and grey when paused.
- **Shelf**: click the watch and a shelf opens with everything else. Click outside it or press Escape to close it.
- **Idle limit**: the timer stops after a set time with no typing, clicking, scrolling or mouse movement (30 minutes by default; set it with the slider). Any activity starts it again. Reading and scrolling count as activity.
- **Calendar**: each day shows the time you spent. Click a day to see its time and word stats compared with today.
- **Stats**: last 7 and 30 days, all time, daily average, streak, best day, words written and deleted, and a 14-day bar chart.
- Today's time also shows in the status bar. The clock icon in the ribbon opens the shelf, and there are commands to open the shelf, show or hide the watch, and pause the timer.

## Install

1. In your vault, open the folder `.obsidian/plugins/` (create `plugins` if it's missing).
2. Make a folder called `pocket-watch` in it and copy `manifest.json`, `main.js` and `styles.css` there.
3. In Obsidian, open Settings → Community plugins, turn off Restricted mode if it's on, and enable **Pocket Watch**.

Your data is stored in `.obsidian/plugins/pocket-watch/data.json`.

## Settings

- **Show floating watch** and **Watch style** (analog or digital)
- **Reset watch position**: move the watch back to the bottom right corner.
- **Idle limit**: minutes without activity before the timer stops (1 to 120).
- **Remove idle time**: when the timer goes idle, take back the minutes that passed without activity.
- **Only count while Obsidian is focused**: pause while another app is in front (on by default).
- **Week starts on Monday**
- **Reset all data**

## How words are counted

Words written and words deleted come from how a note's word count changes while you edit it. Chinese, Japanese and Korean characters count as one word each, the same way Obsidian's own word count does it. Changes that arrive while you aren't typing or clicking (for example from sync) are not counted.
