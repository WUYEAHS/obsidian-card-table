<p align="center"><a href="README.md">English</a> · <a href="README.zh-TW.md">繁體中文</a></p>

<img width="90%" alt="Card Table board" src="https://github.com/user-attachments/assets/3d8e6c49-bd63-4588-aecd-7e027b003af5" />

# Card Table

**Turn any markdown note into a dated table of task cards — pick today, this week or this month in one tap, and let everyone leave comments right on the card.**

- **Dates come first.** The filter bar is always on screen: year, day, week, month, overdue, long-term. No date pickers, no pop-up dialogs — one tap narrows the table, ◀ ▶ steps through the days.
- **Every card can hold a conversation.** Comments are signed and timestamped, so a card turns into a small log of what happened. Several people can work in the same note at once.
- **It is still just a note.** Dates, assignees, pins, comments and repeats are plain text. Turn the plugin off and you still have a task list anyone can read.

If Card Table saves you time, you can [buy me a coffee on Ko-fi](https://ko-fi.com/jiajiunwu).

<img width="90%" alt="The note behind the board" src="https://github.com/user-attachments/assets/eda91189-0003-4d9f-a2c2-c552a8676c19" />

## Installation

1. Settings → Community plugins → turn on community plugins.
2. Browse, search for **Card Table**, install and enable it.

Not listed yet? Download `main.js`, `manifest.json` and `styles.css` from the
[latest release](../../releases/latest) into `<your vault>/.obsidian/plugins/card-table/`,
then reload Obsidian and enable **Card Table**.

## Getting started

1. Open a note and run **Open with Card Table** from the command palette, the ribbon icon or the tab's `⋯` menu.
   The note remembers the mode you last used and opens that way next time.
   For a note that has never been opened as a board, the ribbon icon asks first: open this note as a Card Table, or create a new one.
2. A brand new note gets five sections (`## 1` … `## 5`). Sections are shown as colours.
3. Type a title and some content under **New card** and press `Shift + Enter`.
   The card lands on the day, week or month the filter bar is showing.
4. Tap the circle to mark it done, the date to move it, ✎ to edit, 💬 to comment.

## Contents

- [Features](#features)
- [Keyboard](#keyboard)
- [Settings](#settings)
- [The text format](#the-text-format)
- [Card Table and Kanban](#card-table-and-kanban)
- [Design rules](#design-rules)
- [Support](#support)

## Features

### Filtering by time

- **One-tap filters** — the year, This month / This week and Today sit in the first block of the filter bar. Step backwards and forwards with ◀ ▶; the day tile shows the weekday.
- **The year follows you** — the year tile always shows which year you are in, and steps into the next year when a week or month does. Tap the year to jump back to this year.
- **Overdue and Repeating** — one tile, half each. Turn on **All** in settings to add an All tile to the left of the year.
- **This week, your way** — the calendar week, or seven days from today so the overdue start of the week stays out.
- **Show to do / done / archived** — three switches that apply to the list, the counts and the calendar. On a narrow window they fold into a `⋯`.
- **Calendar** — tap a day, or two days for a range. Always opens on the current month.
- **Search without a search box** — the title and content boxes of *New card* filter the table as you type.

### Cards

- **Pinned table** — pinned cards get their own collapsible table above the list, whatever the date filter.
- **Frequent titles** — the titles you use most, one tap to reuse. Pin the ones you use every day; they always come first. Each note keeps its own pins.
- **Edit in place** — title and content in one edit, saved as you type. The cursor starts at the beginning or the end, as you prefer.
- **Sections as colours** — recolour a section from the `⋯` next to Section, and rename it there too (that renames the `## heading` in the note). Turn on section names to see them on every card.
- **Sections as status** — name a section after a state, such as *Waiting*, and turn on section names: every card in it shows *Waiting* (desktop above the done circle, phones after the title). Tap the name to move the card to another section; a done card shows Done instead. A setting can also unpin cards when they are done.
- **Assignees, or solo** — assign cards to people on the list, or turn on solo mode and the assignee fields go away.
- **Repeats** — `🔁 every 2 weeks`. Marking it done moves the date forward and leaves a record line.
- **Archive, then delete** — archiving moves a card to `## Archive`; deleting is only offered after that.
- **Merge** several cards into one, **export** the current filter as a long PNG or print it to PDF.

### Comments and working together

- **Signed, timestamped comments** on every card — each device remembers who is using it (kept on that device, never synced).
- **A richer log** — comments sit with the card they are about, so a card collects the whole story: the task, the follow-ups, the replies.
- **Made for more than one person** — every write is an atomic read-modify-write, so two devices syncing the same note do not overwrite each other. Cards with identical first lines are still told apart.
- Show comments above or below the content, or turn comments off.

### Phone and narrow screens

- A dedicated card layout on phones and narrow panes, not a squeezed table.
- Large tap targets for the date arrows and card actions; room for the floating navigation bar.
- Narrow (readable line width) or wide layout on desktop.

### Language

- English and Traditional Chinese (繁體中文). Follows Obsidian's language, or pick one in settings.

## Keyboard

Formatting keys are **your own**: editing a card uses whatever you have bound in Settings → Hotkeys, exactly like any other note.

| Obsidian command | Inserts |
| --- | --- |
| Toggle bold | `**text**` |
| Toggle italic | `*text*` |
| Toggle highlight | `==text==` |
| Toggle code | `` `text` `` |
| Toggle strikethrough | `~~text~~` |
| Add internal link | `[[text]]` |
| Insert Markdown link | `[text]()` |

Submitting works the same in the new card, the card editor and comments:

| Key | Default | With "Enter to submit" |
| --- | --- | --- |
| `Enter` | New line | Submit |
| `Shift + Enter` | Submit | New line |
| `Ctrl + Enter` / `⌘ + Enter` | Submit | Submit |
| `Esc` | Close the editor | Close the editor |

## Settings

| Setting | What it does |
| --- | --- |
| Solo | Hide assignees everywhere |
| Range on open | Which filter the board starts on |
| Language | Follow Obsidian, English or 繁體中文 |
| Board width | Narrow (like readable line length) or wide |
| Comments | Use comments, and show them above or below the content |
| Bullet | Add `．` in front of content lines |
| Submit key | See [Keyboard](#keyboard) |
| First day of the week | Monday or Sunday |
| Jump after an action | Per action: back to to do, done, archived, pinned, moved to today, added |
| Where a card sits when editing | Leave it, pull it to the top, or let the browser decide |
| Cursor position when editing | Start (default) or end of the text |
| What “This week” means | Calendar week, or seven days from today |
| Show “All” in the time filters | Adds an All tile left of the year (off by default) |
| Show section names | The section heading on each card, used as its status |
| Unpin when marked done | Off by default |

## The text format

That is the whole storage format — everything the table shows comes from lines like these:

```markdown
## 1

- [ ] [Orders] ．Two boxes each, needs to arrive before Friday ＠{2026-09-11} #Alex 📌 ✎{2026-09-10 09:12}
	．Called the supplier, waiting for the quote
	．💬{2026-09-11 14:20|Alex} Quote came back, 8% up on last time

- [x] [Field] ．Check the greening suspect tree again ＠{2026-09-08}
```

| In the note | Means |
| --- | --- |
| `- [ ]` / `- [x]` | One card, not done / done |
| `[Title]` | The card's title || `＠{2026-09-11}` | Date. `＠{2026-09-11 ~ 2026-09-14}` is a range |
| `#Alex` | Assignee (must be on the people list) |
| `📌` | Pinned |
| `✎{2026-09-11 14:20}` | Last touched, to the minute — written by the plugin (older stamps with seconds still read) |
| `💬{2026-09-11 14:20\|Alex} text` | A comment |
| `🔁 every 2 weeks` | Repeats every 2 weeks. `every 3 days`, `every month` and the older `🔁 每2週` also work |
| `#long-term` | No special meaning since 1.5 (it used to mark long-term cards); stays in the note as a plain tag |
| `．` | Optional bullet in front of content lines |
| `## Archive` | The archive section |

Indented lines under a card are its content.

## Card Table and Kanban

Card Table was inspired by the **table view of the [Kanban](https://github.com/mgmeyers/obsidian-kanban) plugin** — the same markdown lists, read as rows instead of lanes. It grew from there into a board built around dates and comments.

Both plugins read a markdown note made of `## headings` and `- [ ]` cards, but they are built around different questions.

| | Kanban | Card Table |
| --- | --- | --- |
| Built around | Stages — which lane is this card in? | Time — what is due today, this week, this month? |
| Moving a card | Drag it to another lane | Change its date, tick it, archive it |
| Everyday view | The whole board | Today (or any day, week, month) in one tap |
| Conversation | — | Signed, timestamped comments on each card |
| Several people | — | Designed for it: per-device identity, atomic writes |
| Phone | — | A dedicated narrow layout |

**Can I use both?** Yes. They can be installed side by side. Card Table only takes over notes you open with it (it remembers each note), and it never switches a Kanban board over on its own. As of 1.4.7 Card Table also unloads cleanly when another plugin such as Kanban intercepts the same Obsidian method.
Pick one plugin per note, though: Card Table writes its own markers (such as `✎{…}`) into the notes it edits.

## Design rules

1. **Every write is one atomic read-modify-write** inside `Vault.process`, so a concurrent write (sync, another tab, the previous action) is never overwritten with a stale copy.
2. **The view never writes its own copy back.** All changes go through one writer.
3. **A card is identified by its first line.** When two first lines match, its position in its section is tried first (checked against the line and the content), then content, the whole line and the edit stamp. If nothing tells them apart, the plugin refuses to write rather than guess.
4. **Writes touch the smallest number of lines possible.** Ticking a checkbox rewrites one line, not the file.

## Support

- Bugs and ideas: [GitHub issues](../../issues)
- Support development: [Ko-fi](https://ko-fi.com/jiajiunwu)

## Licence

MIT
