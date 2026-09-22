# Design-system content — every file and field, and the reader recipes

## The shape: a file table

A one-file page's `appifact-doc` state block holds `{title, content,
comments}`; `content` is **`{ "v": 2, "files": { "<path>": "<text |
data: URI | blob:<id> | file:<rel>>" } }`** — the directory given to
make.ts. Text files (md/mdx, json, js, css, html, svg, ts/tsx, txt,
csv, yml…) are text, the rest `data:<mime>;base64,…` or a POINTER
(below). A system made from the type is KEPT IN FILES: no such block; each
path below is a file at `project/<path>` (`assets/` images, svg, video, pdf:
uploads, Tiers), never a `data:` URI. Paths: relative, `/`-separated, spaces and mixed case fine, no
`..`, no leading `/`. Refused (make.ts skips with a note;
unpack.ts never writes them): dot-prefixed segments (`.git`, `.env`,
`.claude`…), `node_modules`, toolchain/agent manifests at any depth
(`package.json`, lockfiles, `bunfig.toml`, `tsconfig.json`, `deno.json`,
`CLAUDE.md`, `AGENTS.md`), 8.3 names (`NAME~1`), and the TABLE paths
`index.html` `design-system.json` `SKILL.md` `artifact-type/…` —
alias-aware.
`--components-src` is fenced: sources import only their own relative
files and react/react-dom; no macros or import attributes; unpacked
sources are data, never run. ≤1200 files.

| Path | What | Notes |
|---|---|---|
| `README.md` | the brand book | markdown: headings, lists, quotes, fences, pipe tables, data: images. ≤200 KB. Any OTHER `*.md`/`*.mdx` outside components/ (nested fine: `guidelines/20-imagery.md`) = a further prose SECTION in path order, titled by its first `#` heading else the file name; ≤24 (more stay files, one note). |
| `tokens.json` | THE tokens | grammar below; ≤512 KB |
| `manifest.json` | GENERATED entry point + islands | shape below; regenerated on every build and edit. |
| `components/lib/*.js` | PACKED runtime libraries | make.ts copies react + react-dom 18.3.1 in, listed in manifest.json `libraries[].file`. `libraries` names all previews load, React too: a listed `react`/`react-dom` 18 not here loads from jsDelivr (or copy both from `artifact-type/demo.json`); any other must be here, listed `{"name","version","global","file"}`, else static. Classic scripts, in order, before bundle.js; ≤2 MB each. |
| `components/bundle.js` | ONE classic script | assigns `window.<namespace> = {…}`; reads `window.React`/`ReactDOM`; no `import`, no network, no `eval`/`new Function` (the preview CSP has no unsafe-eval); no literal `</script` / `<!--` (consumers inline it; make.ts errors). Line 1 may be `/* @ds-bundle: {"format":4,"namespace":"…","components":[{"name":"…"}]} */` (Claude Design's too): the namespace + component order (no header ⇒ `--namespace`). ≤6 MB. |
| `components/bundle.css` | optional stylesheet | loaded after tokens.css; ≤2 MB |
| `components/index.d.ts`, `components/<Comp>/<Comp>.d.ts` | types | documentation (the `api/` cards read it); never type-checked; per component only at exactly `components/<Comp>/<Comp>.d.ts`. ≤1.5 MB total. |
| `components/<Comp>/preview.html` | live preview | see below; ≤256 KB |
| `components/Cover/preview.html` | the COVER | a preview like any component's, shown above the brand book on Overview; the brief: `cover.md` beside this file |
| `components/<Comp>/README.md` | guidelines | markdown in its Description cell (a leading `# <Comp>` is not repeated; first sentence = the manifest `summary`). Only this path or an Alias below (`components/<Comp>.prompt.md`, `<Comp>/usage.md`) — no `.mdx`, no nesting. ≤64 KB. |
| `components/src/**` | sources | what `--components-src` builds from; packed unless `--exclude-source`; ≤512 KB each |
| `fonts/<file>` | font binaries — NOT assets | woff2/woff/ttf/otf, checked by first bytes; a file when kept in files, else the store where there is one, else the page (≤1 MB each); listed in tokens.json `type.fonts[].file` (unlisted = kept, flagged). |
| `assets/<Group>/<file>` (deeper nesting fine) | anything | group = first folder (directly under assets/ ⇒ "Other"); images/svg/video preview, fonts as specimens, others list + download. Stored as given (≤12 MB each); images, svg, video and pdf go to the store, shown only via `<img>` (no scripts; no `currentColor` — name a single-ink mark's ink in the group's README.md). |
| anything else | kept, no UI | one make.ts note; ≤512 KB each |
| (no files) | the EMPTY system | make.ts builds an empty directory; the page is one drop target that files what lands — fonts → `fonts/`, a folder → its own group, the rest loose under `assets/`, big binaries to the file store — and saves itself as a new version with `lastChange.note` = `Added N files …` (via `page`). |

Caps count the STORED form (a JSON string, `<` as `\u003c`, base64 ≈
4/3): make.ts prints the byte table; the whole table ≤14 MB (the page
refuses to save over 16 MB). Kept in files the page caps nothing here. This skill keeps one version to
1,024 files (1,008 its own) and 256 MiB, 15 MiB a file, 16 MiB a call;
an upload ≤20 MB (SVG 2 MB).

## Tiers: what lives outside the page

A binary's value is a `data:` URI (PAGE tier) or a pointer.
**`blob:<id>`** = the artifact's file store (the `assets` capability),
served to signed-in viewers at `/_blob/<id>`. Kept in files: no PAGE tier; fonts are files, store kinds
uploads the index names by id.
**`file:<rel>`** = RESERVED (parsed, never made). Facts ride manifest.json
**`storage`** (absent while all is inline): `{"files":{"<path>":{store,
id?,sha256?,storedSha256?,bytes,type,name?,addedAt?,via?}},"blobBytesUsed":N}` —
what THIS VERSION uses, re-derived on every write: a moved path keeps its
id; a removed pointer's record goes (the blob stays until freed); a digest
already held is re-pointed, never re-uploaded. ONE routing rule (page and
`--plan-blobs`): store kinds (images, svg ≤2 MB, video, pdf, fonts) →
blob, else inline; refused with the number when neither fits; no
store → inline.

Asset actions: `reference/store.md`. A rebuild re-attaches a recorded
pointer only on an EXACT digest match (with `--store`: only for listed
ids); deleting a stored file from an unpacked tree removes nothing —
delete its table path.

**Aliases** (make.ts AND the page normalize; a Claude Design /
design-sync tree packs as is): `readme.md`; `_ds_bundle.js` /
`bundle.js` (root or components/) → components/bundle.js; `_ds_bundle.css`
/ `styles.css` → components/bundle.css; `components.d.ts` / `index.d.ts` →
components/index.d.ts; `_ds_manifest.json` → ignored; `components/<Comp>.html`,
`<Comp>/index.html` → `<Comp>/preview.html`; `components/<Comp>.prompt.md`,
`<Comp>/usage.md` → `<Comp>/README.md`; design-sync's two-level
`components/<group>/<Comp>/<Comp>.html|.prompt.md|.d.ts` → `components/<Comp>/…`
with `group` written into the marker; make.ts inlines such a card's
`_preview/<Comp>.js`, strips frame-provided tags and drops the runtime
residue (`_vendor/`, `_preview/`, stubs) with one note. Two files
normalizing to one path = error.

## tokens.json grammar (why a value DROPs)

- SHAPE: every family but `type` is a LIST, `{"tokens":[{"name","value","usage"}…]}` (`color` with `themes` too, its
  tokens ONE flat list; divider rows come from name stems: "bg-000"/"bg-100" → bg). A name-to-value
  MAP (DTCG / W3C) is valid JSON the page cannot read: the family shows empty and
  its entries leave the file at the person's first token edit (`shadow`, further families: kept,
  never shown). Make lists first.
- names (tokens, type styles): `^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$`, case
  KEPT (theme ids and family keys: same, lowercased); every family but
  type shares ONE `--name` namespace (a duplicate drops), styles their
  own; a leading `--`/`.` is stripped; `.` is CSS-escaped (`--space-1\.5`).
- color values: `#rgb|#rgba|#rrggbb|#rrggbbaa` (lowercased) or
  `rgb()/rgba()/hsl()/hsla()/oklch()/oklab()/lab()/lch()/color()` with
  plain numeric arguments — no `var()`, `url()`, `color-mix()` or named colours — or
  an ALIAS `"{other-color-token}"` (→ `var(--other-color-token)`; per
  theme too). An alias of a missing token, of itself, a cycle or a
  chain over 16 deep drops. A plain string = the first theme. No valid
  value in any theme ⇒ the token drops; one only in a later theme is
  borrowed for the first.
- lengths (fontSize, letterSpacing, spacing, radius): `12px|0.75rem|1em|50%|0`
  or a number (px). lineHeight: a
  length or a unitless number <10. fontWeight: 1–1000 or `"300 800"`;
  `normal`/`bold` → 400/700. fontStyle normal|italic. opticalSize: a
  number (→ `'opsz' N`). A style may carry its own `family` (else the
  group's), `sample`, `usage`; a bad fontSize drops the style.
- `type.families` values: CSS font-family stacks ≤200 chars, no
  `; { } < > \ ( )` (no functions), balanced quotes. `type.fonts[]`: `family` a bare name (no
  quotes), `file` a path (a bare name means `fonts/<file>`), `weight` a
  CSS descriptor (`"400"` or `"300 800"`), `style` normal|italic|oblique.
- OPTIONAL families (absent = no section), all `{note?, tokens:[{name,
  value, usage?}]}`: `shadow` — a box-shadow string (lengths,
  hex/function colours, `inset`, `none`; no `var()`/`url()`; ≤400) or
  per theme like colours; ANY OTHER
  top-level `{tokens:[…]}` key (`opacity`, `zIndex`…, ≤12) — plain CSS
  values (`[A-Za-z0-9 #%(),./+_-]`≤200, balanced parens, no
  `url()`/`var()` — single values, not composites), a SECTION each after Shadows titled from the key ("Z
  index"); other keys are kept with a note (`name`, silently). No motion family.
- caps: ≤8 themes, ≤600 colors, ≤40 fonts, ≤12 families, ≤12 type
  groups / ≤80 styles, ≤60 tokens per other family; notes ≤400 chars,
  usage ≤1000, samples ≤200 (longer clamps).
- tokens.css as compiled: `:root, [data-theme="<first>"] { --<color>; --<shadow> }`,
  a `[data-theme="<id>"]` block per further theme (overrides + aliases
  re-declared), `:root { --<space>; --<radius>; --<other>; --font-<key> }`,
  a `.<style>` class per type style, `@font-face` per font.

## The preview.html contract

A complete small HTML document per component, rendered LIVE in a frame on
the artifact's origin (only the artifact script CDNs and Google Fonts load
by URL from outside). Before your first byte the frame has loaded tokens.css, bundle.css, the libraries, bundle.js (`window.<namespace>`)
and set `<html data-theme="<first theme id>">`; yours is a root element
plus one `<script>` (see `samples/example/`).

Rules: render ONE component (a few states); fetch nothing (images as
data: URIs); no `<iframe>/<frame>/<object>/<embed>/<portal>/<noscript>`
(make.ts errors); no `eval`. Other external `<script src>`/`<link href>`
are inert (make.ts warns). **Line 1 is the marker**
`<!-- @dsCard group="…" height=N subtitle="…" -->`: `group` sections the
table (absent ⇒ ungrouped), `height` = row px (40–4000, else 120; grows to
fit), `width` = layout px, scaled down to fit, `floor` = generated
no-example card (`static`: no mount), `page` = showcase page, not a
bundle export. A load error drops the row to static; `make.ts --render-check`
renders previews headless, warns on blank/error/thin.

## manifest.json (generated, v3)

`{"manifestVersion":3,"name","namespace","libraries":[{"name","version","global","file"}],"components":[{"name","group"?,"summary"?,"page"?}],"lastChange"?:{…},"assetGroups":[{"name","tile"?,"order"?,"files"?:[{"path","id"}]}],"storage"?:{…},"sections"?:{"<card>":"<title>"}}`
— only what no other file says, plus the component CATALOGUE
(display order). ONE shape: without `"manifestVersion":3` it is
ignored (make.ts warns), regenerated. `namespace` (else the bundle
header / `--namespace`) and `libraries` are read back as the
declaration. Islands carried across regeneration — `storage`, `sections` (card
titles a reader set), and:
`assetGroups` (array order = group order; `order` =
file order (paths in group); `tile` is kept, not shown; `files` = the blob-tier assets with their `id` (`read` it as `path`),
generated; else `{"name"}` + its `tile`/`order`; usage notes: `assets/<Group>/README.md`) and `lastChange` — `by` (required, ≤200: "santiago", a
viewer's name), `via` (optional, ≤120: "Claude Code", "page",
"CI · acme/web@8dc01b2"), `at` (required, ISO-8601), `note` (optional,
one line ≤280) and ≤16 extra scalar keys (`[A-Za-z0-9_.-]`≤40, ≤500 chars).
make.ts writes it every build (`--by`, default ‹git user›; `--via`,
default "Claude Code"; `--note`; `--set k=v`); the page on Save
(viewer's name, via "page", note). A `via` starting "CI" = a
pipeline's write: the page shows a "may be overwritten" banner.

## Reading a published design system (agents)

A system serves every file below and a compiled `tokens.css` under `project/`
(`read` by `path`): previews, and a group's `README.md` or `.json` under `assets/`, too; images
(SVG icons and logos too), video and PDF under `assets/` are uploads (`read` by id). Read **README.md** first: the author's text, a `---` rule, then two GENERATED
sections (the page and make.ts rewrite everything below the rule):
`## Consuming this system` — namespace, what to load per surface, a row per
font family with how to fetch it (`read` by asset id or path), two
rules — and `## Index`: a line per generated CARD under `api/` —
`components/<Comp>.md` (purpose, React + `x-import` example, props with
their values, parts), `tokens.md` (every token per theme), `icons.md`,
`assets/<Group>.md` (files with asset ids). Read a thing's card before using
it; `tokens.json`, `manifest.json`, `index.d.ts` are for tools (pass by
path). Deeper:
**components/<Comp>/README.md**:

```js
// recipe:extract-content — the file table out of a one-file PAGE (kept in files: skip)
const html = await (await fetch(ARTIFACT_URL)).text();
const m = /<script type="application\/json" id="appifact-doc">\n?([\s\S]*?)\n?<\/script>/.exec(html);
const { title, content } = JSON.parse(m[1]); // content = {v: 2, files: {path: text | data: URI}}
const files = content.files;
const manifest = JSON.parse(files['manifest.json'] ?? '{}'); // {name, namespace, libraries, components, lastChange, assetGroups}
```

```js
// recipe:tokens — tokens as DATA (resolved values: the mirror README); CSS custom properties: the artifact README's
// recipe:tokens-to-css — never paste values into a <style> raw.
const tokens = JSON.parse(files['tokens.json']);
const firstTheme = tokens.color.themes[0].id;
const val = (t, theme) => (typeof t.value === 'string' ? t.value : (t.value[theme] ?? t.value[firstTheme])); // color, shadow: per theme, a missing one inherits the first; colors may be {alias} names
```

```js
// recipe:file-to-disk — any stored file back to bytes
const TEXT = /\.(mdx?|markdown|txt|json|m?js|cjs|jsx|tsx?|css|html?|svg|xml|csv|ya?ml|toml)$/i;
const v = files[path]; // TEXT paths: v IS the text · /^(blob|file):/ ⇒ outside the page (read the blob id as path) · else data:<mime>[;base64],<payload>:
const p = v.slice(v.indexOf(',') + 1), bytes = /;base64,/.test(v.slice(0, v.indexOf(',') + 1)) ? Uint8Array.from(atob(p), c => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(p)); // assets = paths under assets/
```

```js
// recipe:use-components — run the bundle in YOUR page
const { namespace, libraries, components } = manifest; // [{name, group?, summary?, page?}]: props: api/components/<comp>.md; guide: components/<comp>/README.md
// 0. REFUSE first, naming the file: /<\/style/i in bundle.css or a mirrored tokens.css, /<\/script|<!--/i in any lib file or bundle.js — each would end or escape
//    the inline element below (make.ts refuses them; an artifact made any other way was never checked)
// 1. <style>  ← tokens css (the README recipe) + files['components/bundle.css']
// 2. <script> ← files[lib.file] for each of libraries, in order (classic; defines window[lib.global])
// 3. <script> ← files['components/bundle.js'] → window[namespace].Button …
// (bundle.js, bundle.css, lib files, previews, a mirrored tokens.css: the LAST WRITER's trust — review before running unsandboxed)
```
