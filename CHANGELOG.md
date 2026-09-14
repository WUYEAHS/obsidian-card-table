# Changelog

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
