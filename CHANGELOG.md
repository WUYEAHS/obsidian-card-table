# Changelog

> [!IMPORTANT]
> **Reminder:** This plugin is still under active development and will change frequently over the next few months. Please back up your data/environment before using it. Bug reports and feedback are highly appreciated!
>
> **Notice:** This project is entirely built by AI agents using Claude. The project developer has limited experience with programming languages.

## 1.7.6

**A bigger board and easier-to-hit buttons.** The desktop board is drawn one step larger and icons are larger, while the table keeps its width; small buttons also react over a larger area.

### Changed
- Board size (CR-1.7.6-02, -03): the whole board scales evenly and the table keeps the same width on screen. New settings group **Accessibility** → **Board size**, 80–120% in 1% steps: 80% is the size before 1.7.6, the default is 100% (a 125% zoom). Desktop and phone keep their own value; phones default to 80%. Canvas and embedded cards are not scaled.
- Icons are drawn larger on top of that on desktop (120%; ✎ ⋯ and the Overdue / Repeating icons 110%). Fixed, not a setting.
- A pinned card's 📌 no longer has a background tint; it is marked by colour only.
- Larger tap targets (1.7.6-U1), drawn as an invisible layer so the layout stays the same: the done bar (16 px wide, stopping before the text), 📌 (16 × 18), the filter arrows (24 px, growing into their own cell only), the fold arrow in block headers (22 × 26), header icon buttons (26 px tall) and ✎ ⋯ on cards (24 px tall). Topic pills, the topic-row arrow and the card date are unchanged — their containers clip them, so enlarging them would change the layout.
- "Convert everything to the new format" (1.7.6-D3) first lists how many old-format cards each note has (`[topic]`, `#person`, old dates, old icons, other) and skips notes with none. The description now mentions `[topic]` → `#topic` and `#person` → `@person`; the warning says other devices need 1.6.3 or later; the done message says where the backup is.
- Phone section settings (1.7.6-U2): the 🗄 archive count sits at the top of the archive half (the two halves are stacked on phones), not in the title bar.

## 1.7.5

**A tidier section settings panel.** Also finishes the small fixes left over from the 1.7.4 design review.

### Changed
- Section settings (⋯ on the new-card block): the section and archive icons with their counts now sit in the title bar (the unclickable gear is gone). Each section row ends in a single ⋯ with Archive / Move cards to… / Delete. **Move cards to…** moves every card into another section and keeps the now-empty section. The "back to automatic colour" button is gone.
- The section list shows 5 sections before it scrolls. Changing a colour keeps your scroll position. Adding a section, restoring an archived section, or archiving one scrolls to the bottom so you can see the new row.
- Archive-zone rows have a single ⋯. Move-out is still in that menu.
- Ticking a card done, or un-ticking it, turns on both To do and Done, so the card stays in view. Turn this off with the two jump settings.
- The section filter pill reads `##name`, like a heading in the note (topics stay `#topic`).
- Section names on cards (the 👁 switch) no longer start with `#`, so they don't look like topics.
- The jump settings are named after what you do: "Card ticked done", "Card back to to do", "Card pinned", "Overdue card 'Move to today'", "New card submitted".
- While you view an archived section, the list title reads "Archived · ##name" instead of a date.
- On desktop, hovering a card no longer shows 📌; hover the colour bar to pin. Mobile is unchanged.
- In detailed edit, clicking anywhere in the tall content box starts typing.
- The today row reads "Today 09-25(Fri)", and the day cell drops the space before the weekday: `9/25(Fri)`. Archive notes are titled "Archive - NAME".

### Removed
- Settings: "Archived → jump to the card" (single-card archiving is gone), "Highlight card on hover", and the duplicate "Show section names" switch. Use the 👁 next to the sections in the board settings instead.

### Fixed
- Cards on a Canvas have the same margin on both sides (Obsidian reserved a 12px scrollbar gap on the right).
- Archived cards keep the ✎ slot empty, so their dates line up with other cards.
- "Show less" sits where "Show more" was (bottom right). The pinned-table 📌 is 13px like the other title icons.
- Archive-zone rows without a ⋯ keep a ⋯-wide gap, so the card counts line up.

## 1.7.4

**The last 1.7: what you edit is what you read.** Closes the 1.7 round; next is 1.8 (mobile layout).

### Fixed
- Cards sent to a Canvas get a frame as tall as the card really is (the frame used to be 20–40px short on long cards, so they scrolled). Frames already on a Canvas are not changed.
- The live editor is now exactly as wide as the card's reading view, so long content wraps at the same place when you press ✎ (it was 12.6px narrower).
- Sub-items under a to-do line up between reading and editing (the last list case that was off, by 2px). Tuned for Obsidian's default theme; other themes may indent differently.
- The time-filter title bar uses the accent colour only when the cursor is on today.
- The empty strip at the bottom of the board no longer draws a divider line unless it shows "who is using this computer".
- Settings: the attachment-folder description says "in the board's own folder" (1.7.3's behaviour), the jump-after-archive switch and the section-name description match the current layout, the folder field is wide enough for its placeholder, and the edit-time description no longer uses an emoji.
- Section archive / delete buttons in the board settings have proper tooltips (`aria-label`).
## 1.7.3

**Card ID links always land.** A hotfix for 1.7.2.

### Fixed
- Clicking a card-ID link inside a card (`[[board#^ct-…]]` or `[[#^ct-…]]`) now opens the board (reusing its tab) and jumps to that card with a flash. Before, the board opened and stayed where it was. Links to ordinary notes or headings, and Ctrl / Cmd-click, still go to Obsidian.
- Clicking a card on a Canvas no longer says "This card isn't in the current filter". The board loosens only the filter that hides the card: it opens the archive zone, clears the section / assignee filter or a search that excludes it, shows done cards, or moves to the nearest month that contains it. Undated cards are found in the undated table. A notice now appears only when the ID no longer exists.
- Files the plugin creates (Archive notes, new Canvases, conversion backups, exported images) go to `Card Table attachments` inside the board's own folder when the setting is empty. Archives made by 1.7.2 at the vault root are still found. A filled-in folder setting works as before.
- An Archive note with no sections left is no longer filled with five empty sections 1–5.
## 1.7.2

**Archive loop, closed.** Links follow sections that move between the board and its Archive note, restoring is previewed, and Canvas sends come as a grid.

### New
1. **Links follow moved sections** (1.7.2-F1, ADR-002 D8): moving a section out to the Archive note or back updates wikilinks and embeds to its cards (`#^ct-…`) and to its heading in other notes and Canvases (file nodes and `[[…]]` inside text nodes), including cards whose ID was renewed. Aliases and `!` are kept. The confirmation says how many links will be updated. Each note is one atomic write; a note that changed in the meantime, a broken Canvas, markdown-style links `[x](note.md#…)` and links inside the board or Archive themselves are not changed and are listed in a notice. 300 links across 20 notes and 2 Canvases take under a second.
2. **Move back asks first** (1.7.2-F1): the same kind of confirmation as moving out.
3. **Canvas grid and group** (1.7.2-U1): Send to Canvas lays cards out four to a row (column = widest card + 20, row = tallest card + 20). Sending a whole Archive section wraps the cards in a group named after the section; cards already on the Canvas are skipped. An open Canvas is saved before the plugin writes to it, so a card you just dragged keeps its place (1.7.2-R1).

### Changed
1. **Moved-back sections land in the archive zone** (1.7.2-B1): a section moved back from the Archive becomes `## Archive/name` on the board (with ` (moved back date)` if that name is taken) instead of a normal section. Restoring a section with that suffix merges it into `name`.
2. **Restoring is previewed** (CR-1.7.2-02): "Restore this section" no longer writes at once. A dashed row appears at the end of the section list (rename, drag or recolour it; ↩ cancels), the archive row turns dashed and the list shows that section's cards. Pressing ✓ writes it together with your other section changes, merging into a section with the same name.
3. **One folder for plugin files** (CR-1.7.2-03): Archive notes, new Canvases, conversion backups, exported images and layout diagnostics go to `Card Table attachments` (Settings → Note format). A folder you set before is kept; existing files are not moved, and Archive notes next to their board are still found.
4. **Copy card ID** (CR-1.7.2-04): "Copy card" is renamed "Copy card ID" with a shorter notice. A card embed `![[…#^ct-…]]` pasted into a card's content or a comment is written as a link `[[…#^ct-…]]` and shown as one (also in older notes), so cards can point at each other without nested or looping previews. Image and other embeds are untouched.
5. **Embedded cards in notes are at most 320px tall** and scroll inside (CR-1.7.2-04); cards on a Canvas keep their full size.

### Bug fixes
1. Moving back onto a name that already existed wrote a notice text into the heading (`(↩ Moved back to "N" date)`); the dictionary had the key twice (1.7.2-B2).

### Docs
1. README: one table of every syntax (current and still-read older ones), a shorter warning, Archive and Canvas sections, a fairer Kanban comparison, full links (1.7.2-D1–D4).

## 1.7.1

**Archive loop.** Archived sections move to one Archive note that links back to the board, and can move back.

### New
1. **Move out to `<board> Archive.md`** (1.7.1-F1, ADR-002): the → on an archived section appends it to the board's Archive note (created next to the board, or in the "move-out folder"). The section is written as `## name` with `[archived:: date]` below; a name already in the Archive gets ` (date)`. Board and Archive link to each other in their properties (`card-table-archive` / `card-table-source`), so renaming the board keeps them connected. Card IDs that clash with ones already in the Archive get a new ID. The confirmation says how many links in other notes will break (Canvas not counted). The Archive is written first and the section is removed from the board last.
2. **Archive view** (1.7.1-F3, CR-1.7.1-01): a note with `card-table: archive` opens as a board — the top row reads "Archive of `<board>`" with the month range (click it to open the board), the list is one block per section with its month range and archive date, it opens on "All" with done and not-done cards. The Overdue tile is replaced by an **All** tile (nothing in an archive is overdue). Search and the section dot filter work as usual; the send button is disabled and there is no ✎, so no new cards or content edits; ticking and comments still work. The list "⋯" on the board has "Open `<Archive>`".
3. **Move back** (1.7.1-F2): each section's "⋯" in the Archive moves it back to the board (the board is written first). A name already on the board gets ` (moved back date)`. The same "⋯" sends the section to a Canvas.

### Changed
1. The "suffix for moved-out files" setting is gone; files moved out by earlier versions are left as they are.

### Bug fixes
1. Pressing ▶ on the year tile showed `26–27` (the week of 1 January spans two years); the year tile only follows the week when the week is selected (1.7.1-B1).
2. Three CSS warnings from the Obsidian plugin review — `text-indent`, `:has()`, `scrollbar-width/color` — are removed with no visible change (1.7.1-R1).

## 1.7.0

**Small fixes.** A tidier calendar title bar, steadier detailed edit, and time-filter labels that fit.

### Changed
1. **Calendar title bar** (1.7.0-U1, U2): the month switcher moved into the title bar — `[×] ◀ 2026 / 09 ▶ [This month] [Year] [All] ··· [⋯]`. Close is always the × at the top left and returns to where you opened the calendar from (new card or detailed edit). **Year** filters the whole year the calendar is showing. The month's card count moved into the month's tooltip.
2. **Detailed edit keeps the section dot in place** (1.7.0-U3): the dot, frequent topics and repeat menu stay in the title bar instead of moving to a second row.
3. **Undo-done icon** (1.7.0-U5): hovering the colour bar of a done card shows ↶ (it un-completes the card) instead of a check mark.
4. **Alignment tweaks** (1.7.0-U4, U6, U7): the new-card input sits 3px higher; the section dot moved 2px right; the time filter's calendar icon and date now line up with the pinned and list title bars.
5. **Colour bars** (1.7.0-U8, U9): 1.5px slimmer when not hovered (left edge unchanged); title-only cards get a taller bar, as tall as the 📌.

### Bug fixes
1. Time-filter labels that did not fit were never shrunk (the shrink function had been disconnected since 1.6.3), so the week and day tiles overflowed on phones. They shrink again, and on narrow layouts the day tile shows `9/23` without the weekday (1.7.0-B1).

## 1.6.9

**Cards on a Canvas.** Send cards to a Canvas in one step, and cards embedded in a Canvas or note now look like cards.

### New
1. **Send to Canvas** (1.6.9-F1): card "⋯" sends one card, the list "⋯" sends the whole current list. Pick an existing `.canvas` or create a new one next to the note; one frame per card, cards already on that Canvas are skipped, and it works while the Canvas is open. Cards without an ID get one (one write for the whole batch).
2. **Embedded cards look like cards** (1.6.9-F2): in a Canvas, an embed `![[note#^ct-…]]` or a hover preview, the card is drawn with the board's own layout (section colour bar, title, date, content — read-only). Click the card to jump back to it on the board. Double-click in Canvas still edits the raw text.
3. **Frames sized to the content** (CR-1.6.9-01): each new Canvas frame is measured from the rendered card, so long cards get a wider, taller frame and nothing needs scrolling. Frames already on the Canvas keep their size.
4. **Copy card** (CR-1.6.9-02): "Copy card link" is now "Copy card" and copies `![[note#^ct-…]]` — paste it into a Canvas or note to show the whole card; delete the `!` for a plain link.

### Bug fixes
1. A card ID that ended up after a sub-todo (e.g. after manual editing) was not recognised: copying again added a second ID. The board now reads it and moves it back to the card's own line on the next write (1.6.9-B1).
2. Scrolling or zooming a Canvas with many cards left a few of them as raw text; the board now waits longer for Canvas to attach late nodes (1.6.9-B2).

### Notes
- Editing a card on the board does not resize its Canvas frame; scroll inside it or drag it bigger.
- Sending many cards stacks them in one tall column. Layout options are planned for a later version.
- If two devices add an ID to the same card before syncing, the next write keeps one ID and links to the other break. Rare; not fixed in this version.

### Internal
1. Card ID extreme-case check (1.6.9-S1): 13 cases, script `tools/eu-test.js`; two bugs found and fixed (above).

## 1.6.8

**Link to a card.** A card can now be linked from other notes and Canvas, and its ID survives every edit. This release also ships 1.6.7 (drag to reorder sections): its tag was pushed without bumping the version, so no files were attached and nobody received it.

### New
1. **Copy card link** in the card "⋯" menu (also on archived cards). The first time, the card gets an Obsidian block ID (`^ct-` + 6 characters) and `[[note#^ct-…]]` is copied; after that the same link is copied without touching the note. Adding the ID does not change the card's last-edited time. Paste it anywhere; in Canvas, put `!` in front to show the whole card, sub-tasks included.
2. The ID always sits where Obsidian recognises it as the whole card: after `[ed:: …]`, or on its own line before the first sub-item when the card has sub-items. Every write (tick, pin, date, assignee, repeat, title, content, comment, sub-todo, section, archive, restore, convert, merge) puts it back in the right place. If two cards share an ID (copy-paste), the one you press gets a new ID. Merging keeps the main card's ID.
3. (from 1.6.7) Drag a row by its handle in the section settings to reorder sections. Saving moves the `## sections` in your note in one write; card text is not touched. Auto colours stay with their section when positions change.

### Bug fixes
1. Editing a card's content, or "Convert everything to the new format", no longer drops its `^ct-…` ID (links to the card used to break silently).

### Notes
- Versions 1.6.4–1.6.7 read the new ID lines fine, but editing a card's content there still drops the ID — keep all synced devices on 1.6.8.

### Internal
1. The board test now asks Obsidian's own metadata cache, after every write, whether the ID belongs to the card's list item; waits for the actual cache state instead of fixed delays.

## 1.6.6

**One signal, one meaning.** The left edge of a card was reworked so the pin and the section colour no longer fight each other, titles stopped borrowing the section colour, and editing stopped drawing a box.

### Bug fixes
1. A `[#title]` written after a markdown link (`[text](url) [#title]`) is parsed as a title again instead of being swallowed by the link.
2. Typing `#` on the first line while editing a card no longer renders it as a large markdown heading inside the card editor.
3. Filtering by the section dot and then switching to another section now clears the previous section filter, and the `#section` capsule in the list header disappears with it.
4. The colour bar and the card tint now appear as soon as you press ✎ — the editing class was only applied on a full list repaint, so it never showed when editing a single card.

### UX improvements
1. 📌 moved from *on top of* the section colour bar to directly above it; the bar starts lower to make room. Overlapping meant the pin was drawn on a colour that changes per card, so its contrast was unpredictable (it was nearly invisible in dark mode).
2. 📌 is hidden on cards that are not pinned and appears when you hover the row; pinned cards always show it, in the accent colour.
3. The pin icon is larger and no longer clipped — it used to be drawn at 12px inside a 7px box.
4. Title capsules use a neutral colour instead of the section colour, and all three titles on a card are drawn the same way. Section colour is now reserved for the bar and the `#section` name.
5. Editing a card shows a soft background tint instead of a frame, glow and background box; the line under the title input is gone too. Text stays at exactly the same position as when reading.
6. The edit box no longer has a date field — dates are changed from the date cell on the card. When adding a card, a grey line above the submit button shows the date it will get.
7. Card counts are no longer written twice: the total lives in the "⋯" menu, the pinned table shows its own count, and the list and time-filter headers no longer repeat it. Numbers in the "⋯" menu are no longer bolded when selected.
8. The first row of a card (title, date, ✎, ⋯) moved up to line up with the pin.
9. When a card's content starts with the same text as its title, that line is no longer drawn twice.

### Internal
1. Removed dead code left by a cancelled feature (a title-removal helper, its strings, and the CSS for a button that no longer exists).
2. `tools/measure.js` gained checks for the new pin geometry (`M5b`–`M5e`), and `tools/check.js` gained a bounded exception for the pin icon that deliberately overflows its capsule by 1px.

## 1.6.5

**Know what you are looking at.** The board now says, at the top, which day it is, which period is filtered and which section — and the completed filter finally stops flickering.

### Bug fixes
1. Clicking Done / Not done repeatedly no longer makes the popup jump each time — the slide-in animation now plays only when the popup opens.
2. The counts next to Done / Not done follow the current time filter instead of counting the whole note.
3. Picking a date range that crosses a year boundary now shows it on the year tile (`26–27`) instead of a single year.

### UX improvements
1. A new header row at the very top shows today's date, centred and bolder; click it to jump back to today.
2. The time-filter header now shows the period you are actually filtering, with the card count on the right.
3. Each entry in the section menu has a "show only this section" button — pinned cards outside that section are filtered out too; the list header shows a `#section` capsule with an × to clear it, and the section dot gets a frame while it is active.
4. The completed filter is one three-way choice: a counter tile on the left (all / not done, following the time filter) wrapping Done and Not done, with a frame on whichever is selected.
5. The search and assignee capsules moved to the left of the block header, next to the count; the pinned table and the list table are now joined into one block.
6. Typing a title that does not exist in the ☰ panel offers "Add …", and Enter adds it straight away.
7. The section settings panel has an eye toggle for showing the `#section` name on cards.

### Internal
1. Removed 83 more lines of dead code (a title-suggestion dropdown that nothing called since 1.6.3, and its helper).

## 1.6.4

**Cleanup release.** Two bugs fixed, ~490 lines of dead code removed, no new settings or format changes.

### Bug fixes
1. Adding a card while several cards are pinned no longer leaves the board stuck mid-scroll — it now lands on the new card and flashes it, every time.
2. A card ID left behind by Canvas (`^ct-…`, appended after `[ed:: …]`) is now recognized when parsing and kept as-is on every rewrite (title, checkbox, content, date, archive). Cards without one are unaffected; nothing writes a new ID yet.
3. The topic capsule no longer shifts 2px to the right while editing — reading and editing now line up exactly (an inline style was overriding the alignment rule).

### Internal
1. Removed ~490 lines of dead code left over from the pre-1.6.3 table layout, plus unused dictionary keys, an unused import, and superseded helper functions. No behavior change.

## 1.6.3

**One card layout.** The table view is gone — desktop and phone now share the same card layout, desktop is just wider. Titles and assignees moved to `#Title` / `@name`.

### Format
1. Titles are now `#Title` tags on the first line (up to 3); assignees are now `@name`, and a new name is added to the people list automatically. Old `[Title]` and old `#name` (when it was on the people list) are still read; a card switches to the new syntax only when it is changed.

### Bug fixes
1. Collapsing one block (a section table, the time-filter bar) no longer blocks the collapse/expand button on every other block while its animation is still playing.
2. Turning off "jump after adding a card" or "jump after set to today" now actually stops every side effect of the jump (sort order, filter, scroll) — it used to still resort and refilter the list even with the setting off.
3. "Not done" and "Done" in the time-filter bar are independent checkboxes again: turning both on shows both kinds of cards at once, instead of one silently winning.

### UX improvements
1. Card layout lines up to three fixed guides (3 / 18 / 22px) and a 26px block header, on every block.
2. Archive moved into the section settings panel: a section can be moved out to its own note or bulk-deleted, with a filename suffix and folder you can set.
3. Spacing between related controls (card tools, the archive row, block headers, time-filter tiles) is consistently 4px within a group and at least 8px between groups.
4. Every popup on the board is now one of three kinds: an in-place expansion, a menu, or a hover tooltip (confirmation dialogs for destructive actions are the one deliberate exception).

## 1.6.2

**Every button does one thing.** Colours, content and exports, straightened out.

### Bug fixes
1. Picking a colour on a card moves only that card. Section colours are changed in the section panel only.
2. Every section can be picked from a card: up to five as dots, six to ten from a list with their names.
3. On phones, *Change section* is in the card's ⋯ menu, and the colour picker in the section panel stays open.
4. Nested lists, blank lines and spacing are saved exactly as typed, when adding, editing and merging cards.
5. Card content is shown the way Obsidian shows it: dividers, tables, nested lists, links and callouts.
6. Finishing an edit right after an automatic save no longer drops the last change.
7. Opening a card to edit and closing it without changes no longer rewrites the card.
8. A card stays open after you finish editing it, until you change the filter or fold it.
9. Unarchiving asks which section the card goes back to.

### UX improvements
1. "Tap again" confirmations show ✓ with a countdown, for archive and delete. Only delete is red.
2. Editing a card keeps the title and text exactly where they were.
3. Section names appear wherever you pick a section, including New card.
4. Type `#section` in search to see only that section; names with spaces work too.
5. Export makes one phone-width image with larger text and formatted content. PDF export is gone.
6. Links inside cards open on click and show a preview on hover.

### New
1. Settings → *Report a problem* opens a GitHub issue or an email with your versions filled in. No note content is sent.

## 1.6.1

> **Sorry — this is a big update, and the note format changed.** Old notes are
> still read and switch only when a card is changed; settings can convert
> everything in one click (with a backup). The full old-vs-new table is in the
> README. Problems? Email [jiajiunwu.y@gmail.com](mailto:jiajiunwu.y@gmail.com).

**A note format Tasks and Dataview understand**

- Cards are now written with `[key:: value]` fields:
  `- [ ] [pin:: on] [Title] [start:: 2026-09-01] [due:: 2026-09-30] [repeat:: every 2 weeks] #Alex`.
  A single day is just `[due:: …]`. `due`, `start` and `repeat` are the names
  the Tasks plugin reads, and Dataview queries can see every field.
- Below the first line come the content (as you typed it), repeat records
  `[done:: 2026-09-02]` (repeating cards only), comments
  `[cm:: 2026-09-17 09:00|Alex] text`, and last of all the edit time
  `[ed:: 2026-09-17 02:37]`. Times are always written with a four-digit year,
  and the lines the plugin writes have no bullet.
- The format no longer uses emoji. Other fields on the first line (such as
  Tasks' `[completion:: …]`) are kept.
- Older notes keep working. Everything written before 1.6.1 is still read, and
  a card switches to the new format only when it is changed (ticked, edited,
  moved, commented on); nothing else in the note is touched.
- A card without a title keeps its first content line on the first line.
- Kanban still opens these notes, but it only understands its own `@{date}`
  dates, so the dates show as plain text there.
- **Convert everything to the new format** (settings, testing): rewrites every
  old-format card in the notes remembered as Card Tables in one go. Edit times
  are kept, everything outside cards is left alone, and a copy of each note's
  original text is saved next to it first (`name backup-20260916-1420.md`).
  A warning explains the risks before anything is written.
- Card Table 1.6.0 and older cannot read the new format; update every device.

**Editing**

- The automatic bullet setting is gone: content is written exactly as you type
  it. Your own `- `, `* ` and `1. ` are no longer removed, and the board shows a
  bullet only on lines that have one.
- What you see while reading a card is what you see while editing it: content
  lines use the Live Preview editor's font size, line height, bullet dot,
  number and checkbox positions, so nothing jumps when you start editing.
- The card editor, the New card content box and both comment boxes are now
  Obsidian's own editor with Live Preview: bold, highlights, links and to-dos
  render as you type, and undo, every formatting hotkey and `[[` link
  suggestions work exactly as in a note. `Ctrl/⌘ + Enter` still submits. If
  Obsidian ever stops providing the editor, the plain text boxes come back.
  Title boxes stay plain one-line inputs.
- To-dos can be typed as `- [ ]`, `-[ ]`, `[]` or `* - [ ]`; they are all
  written as `- [ ]`, and to-dos inside a card show as checkboxes you can tick.
- Adding a card with only a title no longer copies the title into the content.
- A line starting with `[[link]]` or `[text](url)` is no longer mistaken for a
  title.

**Layout and fixes**

- The month and week tiles no longer underline the range that contains today.
- On phones, the New card content box and the card editor no longer grow a
  large empty area above the text (Obsidian's phone header spacing is now
  switched off inside card editors).
- New command **Export layout diagnostics** writes
  `ZZ-card-table-版面診斷.md` with the editor sizes and styles, for reporting
  phone layout problems.
- Fixed: in a note open in the Kanban plugin, the ribbon icon and the
  **Open with Card Table** command offered only to create a new note; they now
  switch that note to Card Table.

**Other**

- A “What’s new” window opens once after installing or updating: this
  version's highlights, a format table, a button to the one-click conversion,
  a contact email, and every earlier version in a sentence or two. The
  **What’s new in this version** command and **What’s new** at the top of the
  settings open the same window.
- Settings are grouped under headings (General, Time filters, Cards, Adding
  and editing, Jump after an action, Note format, Support).
- The README is shorter: features and settings are summarised by group.

## 1.6.0

**Time filters**

- The year, month, week and day tiles now follow one date. Step the month and
  the week jumps to the first week of that month and the day to the 1st; step
  the week and the day moves to the first day of that week; step the day past
  the end of a week or month and the others follow. From September 15 to
  October 15 is month ▶, week ▶▶, day ▶▶▶, no calendar needed.
- Stepping the year goes to January 1 of that year.
- The tiles show the actual month, week and day (`Oct`, `10/12–10/18`,
  `10/15`) instead of This month / This week / Today, and the month and week tiles
  are underlined when they contain today. Tapping a tile shows the range it names; tapping the
  selected tile again goes back to today.
- Weeks follow the weekdays and can cross months (`9/28–10/4`).
- One setting, **How weeks are counted**, replaces First day of the week and
  What “This week” means: Monday, Sunday, either of them with the current week
  as seven days from today, or from the 1st of each month seven days at a time.
  Existing choices carry over.
- The Time filters header always shows today's date, open or folded; tap it to
  go back to today.
- The year tile is only highlighted while you are viewing the whole year.
- Tile labels are a size smaller, and shrink a little more when a label would
  not fit, so long weeks are never cut off.
- The calendar opens in place of the New card fields instead of as an extra
  block under the filters, and its header shows only a calendar icon and a
  close button.
- Folding and unfolding any block (Time filters, New card, Pinned, the list
  table) slides instead of jumping.
- The list table can be folded, and its header has a filter icon. Its title
  names the day, week or month itself.
- Text in block headers sits a pixel lower so it looks centred, and is no
  longer clipped at the top.

**New card**

- The header `⋯` switches the whole block to **Sections and assignees**, and
  the header shows only a settings icon: sections on the left (name, colour,
  add and delete, between 1 and 10), assignees on the right (an on/off switch
  for solo mode, names, colours, and who uses this computer). Add section,
  Add assignee and Who uses this computer are icons, with their names in
  tooltips. ✓ saves everything at once; ↩ or `⋯` goes back and asks before
  discarding unsaved changes. Deleting a section that still has cards asks
  which section they move to. The Section names and colours pop-up and the
  Manage assignees panel are gone.
- Switching between New card, Sections and assignees and the calendar slides
  the block to its new height and fades the new content in from the side
  (from the right going in, from the left coming back). Nothing moves when the
  system asks for reduced motion.
- Section colours are kept by name and shared by all boards, so saving only
  changes the colours you touched. Sections whose automatic colour would change
  because an earlier section was deleted keep the colour you saw.
- New installs start in solo mode (assignees off).
- An empty title box shows a house icon and an empty content box a pen icon
  instead of placeholder text.
- The title box suggests titles you have used as you type (↓ lists them all,
  ↑ ↓ and Enter or Tab to pick one).
- Typing or picking a title you have used before, exactly as written, switches
  the section to the one that title was last written in; change the text and
  the section goes back to what it was, unless you picked a section yourself in
  between. Frequent title pills take that colour too.
- The date on the Add button leaves out the weekday and the year
  (`12-28 – 01-03`), so ranges fit on phones.
- The ✕ in the title box shows up while you type.
- The whole title box shows a text cursor and focuses the input when clicked,
  and the input no longer inherits a line height that misplaced the caret on
  Windows.
- The New card header no longer shows a tooltip that covered the `⋯` tooltip.
- A small chevron on the section circle shows that it opens a picker; tapping
  the chevron opens it too.
- Phones get frequent titles back as a single `☰` button next to the section
  circle.

**Cards**

- Merging writes each merged card's date on its own line, with that card's
  content under it. Merged content lines keep their indentation instead of
  turning into a single space.
- The Move to today buttons are grey and a size smaller.

## 1.5.2

- The English name is now **Card Table - Dated Tasks**. The community plugin
  directory does not allow a colon in plugin names, so 1.5.1's name was hidden
  from the list. Nothing else changed.

## 1.5.1

- Renamed to **Card Table: Dated Tasks** (卡片看板：任務分類日誌). The plugin id
  stays `card-table`, so settings and updates carry over.
- Hovering a done circle previews the tick, like repeating cards already did.
- The Repeat filter tile has a shorter English label.
- Section names on cards are plain `#name` text, a little smaller, without a
  frame.
- The line between range dates is a crisp `|` character, centred, instead of a
  thin drawn line that blurred at 120% zoom.
- Icons instead of words: the Time filters header (calendar), New card
  header (pen), Pinned header (pin), Overdue (clock alert),
  Repeat (refresh with a dot), the to do / done / archived switches (circle,
  circle check, archive), the Add button and the comment Send / Save buttons
  (send). Names stay in tooltips.
  Each icon falls back to an older Lucide name on older Obsidian versions.
- New card: the Title, Frequent titles, Section, Assignee and Content labels
  are gone, and so are the vertical lines between the fields. The section
  circle sits right after the title box. The assignee box is narrower; its `⋯`
  joined the header
  `⋯`, which now offers Section names and colours and Manage assignees. Short
  fields (frequent titles, the circle) are centred vertically. On phones the
  title box and the content box are the same width. The section names-and-colours `⋯` moved to the right end of the
  New card header (it works while the block is folded, too). The title box looks like the title pill on cards,
  tinted with the chosen section's colour.
- Dates on cards use a fixed-width slot per digit, so themes without
  tabular numbers no longer make dates (and the two lines of a range) start at
  different places. The list table header takes the colour of the time filter it
  came from — Today orange, This week yellow, This month cyan, and so on.
- Fixed: choosing Unassigned in the new card's assignee box jumped back to the
  person this device remembers, and the card was still assigned to them.
- Less space between blocks (the Time filters and New card blocks sit closer
  still) and lower block headers. The to do / done / archived switches are
  narrower now that they are icons.
- The pinned table's `⋯` looks like the New card `⋯`: a plain icon, no frame.
- The range line snaps to whole device pixels after every redraw and resize,
  so it stays sharp at any zoom.
- The folded Time filters header and the list table titles write dates like
  the cards (`09-15(Tue)`, the year only when it is not this year). The folded
  New card header shows just its icon.
- All block headers are the same low height on desktop and phones; the `⋯`
  buttons no longer make them taller.
- Phones: cards sit directly under the table header, separated by a firmer
  divider line (the section colour stripe stays whole), instead of separate
  framed boxes inside the table. The line under the date row runs the full card width.
- Phones: the to do / done / archived switches moved into a `⋯` on the Time
  filters header (it turns accent-coloured when something is hidden), so the
  time filters fit on one row; the optional All filter lives in that same `⋯`.
  Desktop keeps the switches at the end of the filter bar. The Overdue / Repeat
  tile is a little wider, and the date row on each card is lower.

## 1.5.0

**Finding cards**

- Edit stamps are written to the minute again (`✎{2026-09-14 22:27}`), so notes
  are less cluttered. Stamps with seconds from 1.4.6–1.4.9 still read.
- Cards with identical first lines are now found by their position in their
  section first — the nth card under `## Section` — checked against the line
  and the content. If the position is stale (a card was inserted above on
  another device, or moved), the previous content / line / stamp matching is
  used, and an ambiguous card is still never written.

**Time filters**

- Order: year, This month / This week (month on top), Today.
- Overdue and Repeating share one tile, half each. Long-term is gone:
  `#long-term` / `#長期` are plain tags now, and undated long-term cards show
  in No date yet. New cards added under Repeating repeat every week from today.
- New setting: an All tile to the left of the year (off by default).
- New setting: This week can mean seven days from today instead of the
  calendar week, so overdue days earlier in the week stay out.
- Counts, years and labels sit on the same three rows in the year and Today
  tiles; labels are larger and bolder than the counts.

**Cards**

- Sections double as status. Rename a section from the `⋯` next to Section
  (this renames the `##` heading in the note, and its colour follows) — for
  example, name the red one *Waiting*. With the new Show section names setting,
  every card shows its section name: above the done circle on desktop, after
  the title on phones. Tap the name to move the card to another section; a
  done card shows Done instead.
- New setting: unpin a pinned card when it is marked done (off by default).
- The date and the done circle are vertically centred on the same line,
  ranges included. Range dates are left-aligned with the line between them
  centred, and dates in every row are the same width so their edges line up.
- Dates in the current year leave out the year; a date or range touching
  another year keeps it.
- New setting: when editing, put the cursor at the start (default) or end.
- The Date / Section / Content header row above each card table is gone; the
  date column is a little wider for breathing room.

**Other**

- Pinned frequent titles belong to each note. Existing pins move to the notes
  that actually use those titles the first time each note is opened; a new
  note starts with none.
- The ribbon icon asks before turning a note that was never opened as a board
  into one, and offers to create a new Card Table note instead.
- Pressing the section `⋯` or the frequent titles `☰` again closes the panel
  instead of reopening it.

## 1.4.9

- The filter bar is a collapsible block with a **Time filters** header, like
  New card and the pinned table. Folded, the header shows what you are filtering on (for
  example `Today 09-14`). Folding it also closes the calendar.
- The year arrows now span the whole year tile, level with the Today arrows.
  The calendar button moved between them and shows only its icon (the name is
  in the tooltip).

## 1.4.8

- New card: the fields sit right under the New card header, edge to edge —
  Title, Frequent titles and Section on top, Content and Add underneath,
  divided by lines instead of gaps and separate boxes. The panel is shaded like
  the filter bar, so the controls at the top read as one group and the card
  tables below stay light; the fields inside no longer alternate dark and light.
- Blocks clip to their rounded corners: table headers and the last row no
  longer poke out as square corners.
- The Add button is smaller and stays put: fixed height, lined up with the
  content box instead of the "Content" label, and it no longer stretches as the
  content box grows.
- New setting: show or hide the last edited time on cards. The `✎{…}` stamp is
  still written to the note, because it tells identical cards apart.
- README: credits the Kanban plugin's table view as the inspiration.

## 1.4.7

**Filter bar**

- The year and Today arrows are as tall as their tile (desktop too), so they are
  much easier to hit.
- Today shows the weekday underneath: (Mon), (Tue)…
- The year tile keeps its accent border — it tells you which year you are in.
  Stepping a week or month into the next year moves the year along with it, and
  tapping the year jumps back to this year.
- Week and month labels are shorter and no longer lose their end: `9/14–20`,
  `9/28–10/4`, `Oct`.
- On a desktop window too narrow for the whole bar, the to do / done / archived
  switches fold into a `⋯` instead of wrapping to a second row.
- A board pane narrower than 560px (sidebars open, split view) switches to the
  card layout used on phones. Before, only the window width counted, so a
  narrow pane in a wide window got the desktop table with the week and month
  filters cut in half.
- The calendar always opens on the current month.

**New card**

- The destination date moves into the Add button, in a shorter form
  (`09-14(Mon) – 09-20(Sun)`), so a range is no longer cut off. The grey
  shortcut hint under the button is gone; hover the button to see it.
- Picking a section colour closes the colour picker.
- The add area no longer jumps when you switch filters: the content box is
  sized as soon as it is drawn, not a frame later. The Add button fills its
  column down to the bottom.

**Keys**

- One submit key everywhere — new card, card editor, new comment, comment edit:
  `Shift + Enter` or `Ctrl/⌘ + Enter` submits, `Enter` is a new line. Comments
  used to be the other way round.
- New setting to swap it: `Enter` submits, `Shift + Enter` is a new line.

**Settings**

- First day of the week: Monday (default) or Sunday. Sets This week and the
  calendar's first column.
- Jump after pinning, on its own switch.
- Turn comments off. Existing comments stay in the note and come back when
  switched on.
- Pin frequent titles: 📌 on each row of the "more" panel, or right-click a title
  chip. Pinned titles always come first.

**Other**

- Author name is `jiajiunwu` everywhere.
- Card Table no longer removes another plugin's `setViewState` hook (for
  example Kanban's) when it is disabled or reloaded.
- New README in English and Traditional Chinese, and a clearer plugin
  description.

## 1.4.6

**Cards with identical first lines**

- Two cards whose first lines match (same title and text) are now told apart,
  on screen and when writing. Before, editing one put both into edit mode,
  expanding one expanded both, and actions on either could be refused as
  ambiguous.
- When writing, the plugin narrows the candidates step by step: content and
  comments first, then — for cards whose content matches too — the whole first
  line exactly (date, assignee and pin included), then the last-edited stamp.
  It still refuses to write only when all of those tie and the contents differ.
  After every write the card's new first line is remembered, so a second action
  straight after the first (edit the content, then the title) finds the same
  card.
- The last-edited stamp is written to the second: `✎{2026-09-13 14:20:05}`.
  That is the only change to the note — three characters per card, no ids.
  Minute-only stamps keep working.
- The "this line is identical to another card" warning is gone.

**Fixed**

- The title could not be edited: clicking the title box counted as clicking
  outside the editor and closed it. Enter or Esc in the title box now finishes
  editing.
- Finishing an edit could read a title box left over from a previously edited
  card.

**Settings**

- Three independent switches for what happens after a card moves: back to to
  do, marked done, archived. Each decides whether to tick that filter and
  scroll to the card. Archiving used to always do both.
- Solo mode: no assignees. The add row drops the assignee box and frequent
  titles take the space, cards stop showing assignees, and comments are signed
  "me". Existing `#names` in the note are left alone.
- A Support section with a Ko-fi link, also set as the plugin's funding URL.
- Switching the plugin language updates the sidebar icon's tooltip right away.
  Command names still change on the next reload.

**Filters and headers**

- Every filter option (year, day, week, month, all, overdue) is a tile with a
  border — grey when not selected, accent when selected.
- On phones the ◀ ▶ arrows are 26px wide and as tall as the tile.
- Table header titles line up: collapsible tables show an arrow, the others
  keep the same space empty. The pin icon is gone from the pinned header.

## 1.4.5

**Layout**

- New setting: board width. Narrow (default) centres the board at the same width
  as a note with readable line length on — including themes that set their own
  (Minimal's `--line-width` capped at `--max-width`), falling back to Obsidian's
  `--file-line-width`. Wide fills the tab. Also in the list's "…" menu. Desktop
  only.
- Pinned cards get their own table above the list, so the list header's count
  matches the cards under it. The pinned table collapses from its header;
  open or collapsed is remembered per device.
- The desktop list tools (expand all, sort, merge, export) move into a "…"
  menu, as on phones. When there are pinned cards the menu sits on the pinned
  table.
- The add-card area is a table of its own with a header that collapses it.
  Open or collapsed is remembered per device.
- Card actions: the title row ends with Archive · Comment · Edit, Edit rightmost
  (where Comment was). Archived cards show Unarchive · Delete there. The pin
  stays fixed in the date cell's top-left corner however tall the card is. The
  content no longer reserves room on its right for a button.
- The separate "edit title" button is gone — Edit changes title and content
  together.
- The last-edited time sits in the same place on every card. The title row no
  longer wraps (a long title wraps inside its own space), the button group keeps
  a fixed width even on archived cards, and the time has a fixed-width slot.
- New setting: comments above the content (default) or below it.

- The repeat chip ("every 2 weeks") and the "Later" chip look the same.

**Phones**

- The last-edited time moves off the title row into the card's "…" menu.
- A date range that crosses a year drops the weekdays
  (`26-09-13 – 27-03-02`) so it fits on the card's first row.
- Edit no longer focuses the text box. Focusing opened the keyboard, iOS
  scrolled the box into view and the plugin pulled the card back — the jump down
  and back. Tap where you want to type.

**Scrolling**

- Editing the last card no longer yanks the view. Three causes, all fixed: the
  editor is now sized in the same frame it appears in; the scroll position is
  taken before the card is redrawn; and the caret is placed before the box is
  focused (moving it afterwards made the browser scroll to reveal it a few
  hundred milliseconds later).
- Collapsing the last card (finishing an edit, or "less") no longer jumps up
  before it animates.

**Text format**

- New cards are written in English: `🔁 every 2 weeks`, `#long-term`. The older
  `🔁 每2週` and `#長期` keep working.
- New setting: add the `．` bullet to content lines (default on). When off it is
  neither written nor shown. Lines with or without it are read the same.
- The command and file-menu entry use one language: 用卡片日誌開啟 in Chinese,
  Open with Card Table in English.

## 1.4.4

Rebuilds the narrow-screen layout so it no longer needs `!important` or
`display:contents`, and works through a round of phone feedback.

**Review findings**

- `styles.css` has no `!important`, no `display:contents` and no
  `max-width` media queries left (78 → 0, 3 → 0). Narrow screens used to be the
  desktop table flattened with `display:contents`, reordered with `order`, with
  inline styles and theme table borders overridden by force. The plugin now
  decides the layout once per render, marks the board with a class, and draws
  narrow-screen cards as plain `div`s in the order they appear — nothing is left
  to override.
- The pin and the title-edit icon took their colour from inline styles, so their
  hover state needed `!important`. Both are classes now.
- Sync-conflict detection looks only in the note's own folder instead of listing
  every file in the vault. The `[[` link suggester still lists notes — that is
  what it is for.
- The release workflow removes any asset other than `main.js`, `manifest.json`
  and `styles.css` (1.4.3 had `README.md` and `CHANGELOG.md` attached).

**Phones**

- A card's first row is pin · done circle · date ········ assignee · "…", with a
  divider under it. Title, status and repeat sit on the next row with the edit
  button at its right end, so the content uses the full card width when reading
  and when editing.
- Date ranges read across one line (`09-12(Sat) – 09-20(Sun)`, year dropped when
  both ends share it) instead of stacking.
- Editing a comment has Send and Cancel buttons. Before, saving needed Enter,
  which a phone keyboard with an input method never delivers.
- The date picker stays on screen: it wraps, measures itself, and flips above the
  date when there is no room below.
- The "scroll jumps down and back" while editing is gone. Growing a text box no
  longer collapses it to measure (that briefly clamped the scroll position on
  iOS), and a card below the top third of the screen moves up before the
  keyboard can push it.
- The add-card area is two rows: title | section | assignee, then content | send.
- All / overdue, long-term and to do / done share one row under the date strip.
- Bigger ◀ ▶ arrows (chevrons in a 24px target).
- Buttons and text boxes set their own height and corner radius, so Obsidian
  mobile's 44px buttons and pill-shaped inputs no longer show through.
- The list leaves room at the bottom for the floating navigation bar.

**Everywhere**

- "Card Journal Board" is renamed to Card Table (卡片日誌) in the command,
  file menu and settings, and the file menu uses the plugin's own icon.
- The search chip shows only the first line of what you typed, with "…", so it
  stops resizing the list header as you write.
- Larger ◀ ▶ arrows on desktop too (20px, same cell widths).

## 1.4.3

Fixes a highlight bug, gives the narrow-screen card a fixed layout, and tidies
the desktop add row. Checked for overflow and clipping in both languages at both
widths.

**Fixed**

- The flash that marks "this is the card you just acted on" covered the whole
  screen on a phone. Several cells are `display:contents` there, which generates
  no box, so the overlay's `inset:0` resolved against a distant ancestor. It now
  sits on the row.
- Opening the editor on a long card threw the view to the bottom of the editor.
  A new setting decides where the card goes: leave it where it is (default),
  pull it to the top, or let the browser decide.
- `tk-釘列`, `tk-循排` and `tk-補排` were styled in the stylesheet but the classes
  were never added to the elements, so those rules had never applied. The repeat
  chip took no order and sorted ahead of the date.

**Narrow screens**

- A card's fields now sit in fixed places: pin, date, assignee, then "…" hard
  right; title always on the second line. The date comes before the assignee so
  a long name cannot push it out of line.
- Archive and comment collapse into that "…" below 470px, as the list toolbar
  already did.
- "Move to today" is gone from overdue cards — tapping the date does the same
  thing. The undated block keeps its button; it has no other way in.
- The filter toggles move to the end of the stats row and take their own line on
  a real phone, so the counters stop being pushed off-centre.

**Desktop**

- The add row loses 8px of height: the assignee dropdown was 32px against 20–24px
  for everything beside it, so the colour dot and topic chips sat high.
- "Move to today" was a full-width box (97px in a 110px column) because the pill
  helper builds a `div`. It is a chip again.
- The date was 95px of text in 90px of space. Smaller now.
- English "Assignee" becomes "Who" — it did not fit either place it appears.
- Column widths for date, section and set-date follow the language instead of
  being tuned for Chinese and clipping English.

**Review findings**

- Eight `!important` declarations go, by moving cell padding and alignment out of
  inline styles. The net across 1.4.1 → 1.4.3 is 82 → 78, because fixing the
  narrow layout needed new ones. What is left is documented: most of it beats
  inline styles written by `st()`, and some of it beats the user's theme, which
  no selector specificity can reliably outrank.
- `display:contents` is still there (3 uses). Removing it means rendering the
  card list as divs instead of a table on narrow screens — a bigger change than
  this release.
- Drops `scrollbar-width` (the `::-webkit-scrollbar` rule beside it already does
  the job on Chromium, which is all Obsidian runs on) and the two
  `text-decoration` longhands that only tinted the strike-through line.
- Releases carry notes from this file.

## 1.4.2

- Fixes the day/week/month stepper being clipped on a phone: its rule was eaten
  by a later, equal-weight rule, so 306px of controls were squeezed into 136px
  behind `overflow:hidden`.
- Fixes card field order on narrow screens. A card's first line now reads pin,
  assignee, date, title.
- The list toolbar collapses into a single "…" menu on narrow screens, and the
  stat boxes go from three rows to one.
- "Move to today" is hidden on narrow screens — the same thing is one tap away
  on the date itself.
- The add-card column gets a labelled destination date, a button that fills the
  box and carries a word, and a shortcut hint.
- Language detection reads `<html lang>` instead of `localStorage`.
- Releases now carry build provenance attestations.
- Removes four dead `:has(.tk-board)` rules left over from the dataviewjs era.

## 1.4.1

- The view no longer jumps to the top while you type in the bottom card.
- Formatting keys follow your own Obsidian hotkeys instead of a hardcoded table.
- Adding a card scrolls to it again, including when pinned cards push it down.
- Section and Assignee no longer take a row each in English.
- Title and body lose their placeholder text; the body box gets a real label.

## 1.4.0

- First tagged release.
