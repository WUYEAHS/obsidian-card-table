
# Card Table
Read one markdown note as a table of task cards.

Inspired by the kanban table way of working — but there is no board file, no database and
no hidden index. Dates, assignees, pins, comments and repeats are all **plain text inside
the note**. Turn the plugin off and the note is still an ordinary task list you can read
and edit by hand.

<img width="90%" alt="note-and-board" src="https://github.com/user-attachments/assets/3d8e6c49-bd63-4588-aecd-7e027b003af5" />
<img width="90%" alt="note-and-board" src="https://github.com/user-attachments/assets/eda91189-0003-4d9f-a2c2-c552a8676c19" />


```markdown
## 1

- [ ] [Orders] ．Two boxes each, needs to arrive before Friday ＠{2026-09-11} #Alex 📌
	．Called the supplier, waiting for the quote
	．💬{2026-09-11 14:20|Alex} Quote came back, 8% up on last time

- [x] [Field] ．Check the greening suspect tree again ＠{2026-09-08}
```

That is the whole storage format. Everything the table shows comes from those lines.

## What it does

- **One note, one table.** Open any markdown note as a table of cards: date, section, content.
- **Date is the spine.** Filter by today / this week / this month / a range / overdue /
  undated / long-term, and step through days, weeks and months.
- **Edit in place.** Type straight into a card; it saves as you type. Titles, content,
  dates, assignees and comments are all editable from the table.
- **Repeats.** `🔁 每2週` on the first line makes a card repeat. Marking it done pushes the
  date to the next occurrence and leaves a record line instead of ticking it off.
- **Comments.** `💬{date time|who}` lines are shown as a thread under the card.
- **Archive, then delete.** Archiving moves a card to `## Archive` and greys it out;
  deleting is only offered after that.
- **Export.** The current filter can be exported as a long PNG or printed to PDF on a
  white background.

## Design rules this plugin keeps

These are deliberate, and worth knowing before filing an issue:

1. **Every write is one atomic read-modify-write.** The whole file is read, changed and
   written inside `Vault.process`, so a concurrent write (sync, another tab, the previous
   action) can never be overwritten with a stale copy.
2. **The view never writes its own copy back.** `save()` is overridden to do nothing. All
   changes go through the writer, so there is only ever one writer for the file.
3. **A card's identity is its first line.** If two cards end up with an identical first
   line and different content, the plugin refuses to write rather than guessing which one
   you meant.
4. **Writes touch the smallest number of lines possible.** Ticking a checkbox rewrites one
   line, not the file.

## Install

Not in the community plugin list yet.

1. Download `main.js`, `manifest.json` and `styles.css` from the
   [latest release](../../releases/latest).
2. Put them in `<your vault>/.obsidian/plugins/card-table/`.
3. Reload Obsidian and enable **Card Table** in Settings → Community plugins.

## Use

Open a note, then run **Open as card table** from the command palette, or use the tab's
`⋯` menu. Each note remembers which mode you last used it in and opens that way next time.
A brand new board file gets five sections (`## 1` … `## 5`) created for you.

### Keyboard

Formatting keys are **your own**. Editing a card uses whatever you have bound in
Settings → Hotkeys, so it behaves exactly like typing in any other note — rebind
`Toggle bold` and the card editor follows. Commands you have not bound do nothing
here either.

| Obsidian command | Inserts |
| --- | --- |
| Toggle bold | `**text**` |
| Toggle italic | `*text*` |
| Toggle highlight | `==text==` |
| Toggle code | `` `text` `` |
| Toggle strikethrough | `~~text~~` |
| Add internal link | `[[text]]` |
| Insert Markdown link | `[text]()` |

The card editor's own keys:

| Key | Does |
| --- | --- |
| `Enter` | New line |
| `Shift + Enter` / `Ctrl/Cmd + Enter` / `Esc` | Done editing |

## The text format

| In the note | Means |
| --- | --- |
| `- [ ]` / `- [x]` | One card, not done / done |
| `[Title]` | The card's title chip |
| `＠{2026-09-11}` | Date. `＠{2026-09-11 ~ 2026-09-14}` is a range |
| `#Alex` | Assignee (must be on the people list) |
| `📌` | Pinned |
| `✎{2026-09-11 14:20}` | Last touched — written by the plugin |
| `💬{2026-09-11 14:20\|Alex} text` | A comment |
| `🔁 每2週` | Repeats every 2 weeks. `每3天`, `每1月`, `every 2 weeks` also work |
| `#長期` | Long-term, ignores the date filters |
| `## Archive` | The archive section |

Indented lines under a card are its content.

## Licence

MIT
