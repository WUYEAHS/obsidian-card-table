<p align="center"><a href="README.md">English</a> · <a href="README.zh-TW.md">繁體中文</a></p>

<img width="90%" alt="Card Table - Dated Tasks board" src="https://github.com/user-attachments/assets/37b5914d-21df-48c9-a949-2a59c9fef3e9" />
<img width="30%" alt="Card Table - Dated Tasks on a phone" src="https://github.com/user-attachments/assets/2e09a693-d1c4-4196-bdea-693612a90d99" />

# Card Table - Dated Tasks

**A task-first card journal.** Every task is a card, and the cards form a table — time filters show today, this week or this month in one tap, typing searches titles and content, sections mark each task's status, and several people can work on the same board.

Use the same board two ways, whichever suits you:

- **Table mode** — one card per row; a glance tells you what is next.
- **Immersive mode** (coming in 1.7) — open a single card full-page to read it, then edit it as if it were a note of its own.

From 1.6.1 cards are written with the same `[key:: value]` fields as the [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) and [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugins, so their queries see your cards' dates and repeats too.

- **Time filters.** Year, month, week, day, overdue and repeat are always on screen, and the four date tiles follow one date. No date pickers, no pop-up dialogs — ◀ ▶ reach any day in a few taps.
- **Instant search.** Type a title or some content under New card and the table filters as you type.
- **Sections.** A section is a colour and a status — name the red one *Waiting* and every card in it is waiting.
- **Working together.** Every card takes signed, timestamped comments, and every write is atomic, so two syncing devices never overwrite each other.
- **Still plain text.** Dates, assignees, pins, comments and repeats live in the note. Turn the plugin off and you still have a task list anyone can read.

If Card Table saves you time, you can [buy me a coffee on Ko-fi](https://ko-fi.com/jiajiunwu).



## Installation

1. Settings → Community plugins → turn on community plugins.
2. Browse, search for **Card Table - Dated Tasks**, install and enable it.

Not listed yet? Download `main.js`, `manifest.json` and `styles.css` from the
[latest release](../../releases/latest) into `<your vault>/.obsidian/plugins/card-table/`,
then reload Obsidian and enable **Card Table - Dated Tasks**.

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
- [Card Table, Tasks and Kanban](#card-table-tasks-and-kanban)
- [Design rules](#design-rules)
- [Support](#support)

## Features

### Time filters
- **Linked tiles** — year, month, week and day follow one date; step any of them and the others follow.
- **Overdue and repeat** — one tap each, next to the date tiles.
- **Calendar** — pick a day or a range when the tiles are not enough. Weeks can start on Monday, Sunday, today or the 1st.

### Search
- **Type to filter** — the New card title and content boxes filter the table as you type.
- **Frequent titles** — reuse a title in one tap; a used title brings back its last section.

### Cards
- **Edit in place** — Obsidian's Live Preview editor right in the card, saved as you type; to-dos inside a card can be ticked.
- **Pinned, repeating, archived** — a pinned table on top, `[repeat:: every 2 weeks]`, archive before delete.
- **Merge and export** — combine several cards into one, or export the current view to PNG or PDF.

### Sections
- **Colour and status in one** — name the red section *Waiting* and every card in it is waiting.
- **Managed in place** — rename, recolour, add or delete sections from the New card `⋯`.

### Working together
- **Comments** — signed and timestamped, kept with the card they are about.
- **Assignees or solo** — assign cards to people, or switch assignees off.
- **Safe with sync** — every write is atomic, so two devices never overwrite each other.

### Phones and layout
- **A real phone layout** — cards, not a squeezed table.
- **Narrow or wide** on desktop; light and dark follow your Obsidian theme.

### Plain text
- **Tasks- and Dataview-friendly fields** — `[due:: …]`, `[start:: …]`, `[repeat:: …]`; older notes keep working.
- **English and 繁體中文.**

## Keyboard

Formatting keys are **your own**: editing a card uses whatever you have bound in Settings → Hotkeys, exactly like any other note — the card editor *is* Obsidian's editor, with Live Preview, undo and `[[` suggestions.

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

Grouped the same way as in the plugin; **What's new** at the top lists what every version added.

| Group | What you can set |
| --- | --- |
| General | Language, who uses this device, solo mode |
| Time filters | Range on open, how weeks are counted, an All tile |
| Cards | Board width, how done cards look, section names, last edited time, comments and where they go |
| Adding and editing | Submit key (see [Keyboard](#keyboard)), cursor and card position when editing, unpin when done |
| Jump after an action | Whether each action scrolls to the card |
| Note format | Convert every old card to the new format (backs up first) |

## The text format

That is the whole storage format — everything the table shows comes from lines like these:

```markdown
## 1

- [ ] [pin:: on] [Orders] [start:: 2026-09-11] [due:: 2026-09-14] #Alex
	Two boxes each, needs to arrive before Friday
	- [ ] Call the supplier
	[cm:: 2026-09-11 14:20|Alex] Quote came back, 8% up on last time
	[ed:: 2026-09-11 14:20]

- [x] [Field] [due:: 2026-09-08] [repeat:: every 2 weeks]
	Check the greening suspect tree again
	[done:: 2026-08-25]
	[ed:: 2026-09-08 08:30]
```

The first line is the card: pin, title, dates, repeat, assignee. Below it come the content (written exactly as you type it — no automatic bullets), repeat records, comments, and last of all the edit time. The lines the plugin writes itself have no bullet either.

| In the note | Means |
| --- | --- |
| `- [ ]` / `- [x]` | One card, not done / done |
| `[pin:: on]` | Pinned |
| `[Title]` | The card's title |
| `[due:: 2026-09-11]` | Date. A range is `[start:: 2026-09-11] [due:: 2026-09-14]` |
| `[repeat:: every 2 weeks]` | Repeats every 2 weeks. `every 3 days` and `every month` work too |
| `#Alex` | Assignee (must be on the people list) |
| content lines | One line each; bullets are optional (`- `, `* `, `1. `). `- [ ]` shows as a checkbox you can tick |
| `[done:: 2026-08-25]` | Repeating cards only: that occurrence was marked done (other cards just use the checkbox) |
| `[cm:: 2026-09-11 14:20\|Alex] text` | A comment |
| `[ed:: 2026-09-11 14:20]` | Last edited, always the card's last line — written by the plugin |
| `## Archive` | The archive section |

Other fields on the first line (for example `[completion:: …]` or `[priority:: …]` written by Tasks) are kept as they are.

**Older notes keep working and change only when touched.** The pre-1.6.1 syntax — `＠{2026-09-11 ~ 2026-09-14}`, `✎{…}`, `📌`, `🔁 every 2 weeks` (and `🔁 每2週`), `💬{…}`, and the `．` bullet — is still read.
A card switches to the new syntax only when you edit it, tick it or change its date; nothing else in the note is touched.
To switch every card at once, use **Convert everything to the new format** in settings (it backs up each note first).
Card Table 1.6.0 and older cannot read the new syntax, so update every device that opens these notes. `#long-term` has had no special meaning since 1.5 and stays as a plain tag.

## Card Table, Tasks and Kanban

**Tasks and Dataview.** Card Table writes `due`, `start` and `repeat` the way the [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) plugin reads them in its Dataview format, and every `[key:: value]` field is visible to [Dataview](https://github.com/blacksmithgu/obsidian-dataview) queries. Repeats are handled by Card Table itself (mark this time done), so let Card Table tick repeating cards.

**Kanban.** Card Table was inspired by the **table view of the [Kanban](https://github.com/mgmeyers/obsidian-kanban) plugin** — the same markdown lists, read as rows instead of lanes. It grew from there into a board built around dates and comments.

| | Kanban | Card Table |
| --- | --- | --- |
| Built around | Stages — which lane is this card in? | Time — what is due today, this week, this month? |
| Moving a card | Drag it to another lane | Change its date, tick it, archive it |
| Everyday view | The whole board | Today (or any day, week, month) in one tap |
| Conversation | — | Signed, timestamped comments on each card |
| Several people | — | Designed for it: per-device identity, atomic writes |
| Phone | — | A dedicated narrow layout |

**Can I use both?** Yes. Card Table only takes over notes you open with it (it remembers each note), and it never switches a Kanban board over on its own; it also unloads cleanly when Kanban intercepts the same Obsidian method.
Both read `## headings` and `- [ ]` cards, so a Card Table note opens in Kanban too, but Kanban only understands its own `@{date}` dates — Card Table's `[due:: …]` fields show as plain text there.

## Design rules

1. **Every write is one atomic read-modify-write** inside `Vault.process`, so a concurrent write (sync, another tab, the previous action) is never overwritten with a stale copy.
2. **The view never writes its own copy back.** All changes go through one writer.
3. **A card is identified by its title and first content line.** When two cards match, its position in its section is tried first (checked against the line and the content), then content, the whole line and the edit stamp. If nothing tells them apart, the plugin refuses to write rather than guess.
4. **Writes touch the smallest number of lines possible.** Ticking a checkbox changes that line and the edit time, not the file.

## Support

- Bugs and ideas: [GitHub issues](../../issues)
- Support development: [Ko-fi](https://ko-fi.com/jiajiunwu)

## Licence

MIT
