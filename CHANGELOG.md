# Changelog

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
