# ShowAllEntityData — Help

**Consolidates a paginated MusicBrainz listing into one scrollable, filterable,
sortable table.** Forty-odd pages of an artist's events become one table you can
filter three ways, sort by any column, cut down to the columns you care about,
export, and save to disk to reopen later without touching the network again.

This page is the user guide. It is written to be read top to bottom the first
time and jumped into by anchor afterwards. Reference material that most people
will never need is folded into collapsible sections.

> **Two ways to read this.** The ❓ button in the page opens this file on
> GitHub. **Shift-click ❓** renders it inside the page instead, with a
> quick-filter box across the whole text — useful when you want to search rather
> than browse. From the keyboard, the prefix key then **H** opens the in-page
> version, which carries a *📖 Open on GitHub* link of its own.

---

## Contents

- [Getting started](#getting-started)
- [When a fetch does not finish](#when-a-fetch-does-not-finish)
- [The buttons](#the-buttons)
- [Filtering](#filtering)
- [The unique-values dropdown](#the-unique-values-dropdown)
- [Sorting](#sorting)
- [Columns](#columns)
- [Collapsing and expanding](#collapsing-and-expanding)
- [Cover art](#cover-art)
- [The Relationships column](#the-relationships-column)
- [Track lengths](#track-lengths)
- [Save and load](#save-and-load)
- [Export](#export)
- [Statistics](#statistics)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Supported pages](#supported-pages)
- [Page-specific behaviour](#page-specific-behaviour)
- [Troubleshooting](#troubleshooting)

---

## Getting started

1. Open any supported MusicBrainz page — an artist's *Recordings* tab, a release
   group, a series, a tag listing. See [Supported pages](#supported-pages).
2. Press the action button beside the page heading. It is labelled for what it
   will fetch, for example **🧮¹ Show all Events for Artist**. Pages that offer
   more than one listing get one button each, numbered `🧮¹ 🧮² 🧮³` so the
   keyboard can reach them.
3. A progress bar tracks the fetch, page by page. **⏹ Stop** interrupts it and
   keeps whatever has already arrived.
4. When it finishes you get one table, a filter bar, sortable headers, and the
   controls described below.

Pressing the action button a second time reloads the page first. That is
deliberate — it is the cheapest way to get back to a clean state.

---

## When a fetch does not finish

Fetching a large listing is one request per page, and MusicBrainz refuses
requests in bursts when it is busy. Two things follow.

**Refusals are retried.** A page that comes back `503 Service Unavailable` is
tried again after a pause, up to three times; if the server sends a
`Retry-After` header that wait is honoured, up to 30 seconds. Most bursts pass
without you noticing.

**A fetch that still cannot finish says so, and stops at the page that failed.**
The status line turns orange:

```
⚠️ Loaded 3 of 40 pages (287 rows) — INCOMPLETE
```

The rows that did arrive are real and usable — the table is simply smaller than
the listing. Press the action button again to start over.

<details>
<summary>The details worth knowing about an incomplete fetch</summary>

- **The count is of pages actually loaded**, not pages attempted. A run that
  failed on page 4 reports "3 of 40", not "4 of 40".
- **An unknown total says so**: when MusicBrainz's own pagination widget is
  ambiguous, the line reads "of an unknown total" rather than inventing a
  number. "1 of 1 pages" would read as a complete one-page listing.
- **Saving an incomplete fetch is allowed, and the file remembers.** Loading it
  later shows the same orange INCOMPLETE line. Files written before this marker
  existed carry no flag and load as complete, which is the only thing that can
  be assumed about them.
- **Not every warning means missing rows.** On artist release-group pages the
  Official/Non-Official split comes from a separate pre-fetch; if that part
  fails you get every row but no split, and the message says so with ⚠️ without
  calling the data incomplete.
- **Two dialogs can appear before a long fetch** — one when the page count is
  unknown, one when it is very large. Agreeing once is remembered for that run.

</details>

---

## The buttons

The controls beside the page heading are two pull-down menus plus two pinned
buttons:

```
🧮¹ Show all …  |  📦 Data ▾   🛠 View ▾   [ ⚙️ | ❓ ]
```

| Menu | Rows |
|------|------|
| **📦 Data ▾** | 💾 Save to Disk · 📂 Load from Disk · 💾 Export |
| **🛠 View ▾** | 📏 Density · 📊 Statistics · ▌█▌▐█▐▌██▐▌█ Barcode · 🎹 Keyboard Shortcuts |
| **⚙️ ❓** | Settings Manager and this help page — pinned side by side as one control, never in a menu. Shift-click ❓ reads the help in the page. |

Each row shows its own keyboard shortcut on the right. Open a menu with the
mouse or with that shortcut — pressing `Ctrl+D` opens **🛠 View** and then the
Density pull-down for you. Inside an open menu, ↑/↓ move between rows, Home and
End jump to the ends, Enter activates, Escape closes. Opening one menu closes
the other.

On artist release-group pages a third menu appears, **📀 Discography ▾**, whose
own label names the view you are in — *📀 Discography: Official*.

### Beside the table, not in the bar

Two controls act on one table, so they sit beside that table's heading, just
before the global filter box:

```
▼ Events (4174)   ↔️  👁️   🔍[ Global Filter… ]  ☐Aa ☐.* ☐!
```

- **↔️** fits every column to its content; click again to restore. It is tinted
  green while resized, amber when only some sub-tables are.
- **👁️** shows and hides individual columns. `Alt+S` / `Alt+D` select and
  deselect all; navigate with ↑/↓, Tab and Shift-Tab.

Multi-table pages have carried exactly this pair on every sub-heading for a long
time. The page-level pair now reads identically.

---

## Filtering

Three independent levels, and they combine:

| Level | Where | Scope |
|-------|-------|-------|
| **Global** | the big box at the top | every column of every table |
| **Column** | the filter row under each header | one column |
| **Sub-table** | above each sub-table | that sub-table only |

Every input supports plain text, **Aa** case-sensitive, **.*** regular
expressions, and **!** exclude-matches (hide what matches instead of keeping
it). Highlighting works across inline markup, so a phrase split by a link or a
`<bdi>` still matches and still highlights.

A status line under each heading reports what is active and what survived:

```
✓ Filtered 55 rows [GLOBAL:"bruce", SUB-TABLE:"vinyl"]
✓ Sorted by: "Year"▲ (133 rows)
```

<details>
<summary>Filter field states, focus indicators and history</summary>

**Three visual states per input** — idle (empty), active (has text), and error
(an invalid regular expression while **.*** is on, which also writes
`⚠ Invalid regexp: …` into the status area). All three border colours are
configurable, separately for global and sub-table fields.

**Focus indicators.** A focused column filter gets a search-icon prefix
(default `🔍 `) and a light-yellow background. The prefix is decorative — it is
never part of the filter string, cannot be selected or deleted, and is removed
when the field loses focus. A field left with text keeps a persistent
"has a filter" background; a cleared one loses it entirely.

**History and pinned expressions.** Every expression typed into the global
filter or the load pre-filter is kept in an LRU history (default 50). The ▼
toggle opens a panel with two sections: **📌 Pinned**, a permanent list that
never ages out, and the recent history. Clicking an entry applies it; the ★
button pins it. Edit the pinned list from the panel (`Alt+E`) or from ⚙️
Settings.

**Hidden matches are signalled.** When a match is hidden inside a collapsed
multi-row cell, that cell's ▶ expander turns yellow with a red glyph, and so do
the sub-table and global collapse buttons. Expanding reveals the highlighted
content.

**The ⏳ pending-edits toggle** appears whenever a row credits an entity with
open edits on MusicBrainz. It filters to those rows and rings each pending
marker — a ring rather than a fill, because the thing being marked is already
MusicBrainz's own orange marker and painting over it would erase the signal you
pressed the button to find. On multi-table pages each sub-section gets its own
button and the one in the filter bar becomes a three-state master.

**Both filter fields are resizable** via the ⋮ handle to their right.

</details>

**Useful keys:** `Ctrl+Shift+G` clears every filter. `Shift+Esc` clears only the
column filters. `Escape` clears the focused field, then removes focus.

---

## The unique-values dropdown

Every column header carries a **📊** button. It opens a panel listing every
distinct value currently visible in that column, each with a count badge, each
with a checkbox. Checking several ORs them together into one column filter.

**A checked value narrows text you already typed — it does not replace it.** If
the box already holds `bruce` and you check *» join phrase: with*, the field
shows both and the rows are the intersection. The count badge is computed
against what is currently visible, which is why it agrees with the result.

<details>
<summary>What else is in that panel</summary>

**A quick-filter bar** at the top filters the list as you type, highlighting
matches. A collapsed section auto-expands when it contains a match and returns
to its own state when you clear the filter.

**Collapsible sections beyond the plain values**, generated from the cells
themselves:

- **🔠 Structure** — empty / single / collapsed / expanded multi-row cells.
- **🚩 Flags** — page-specific markers such as video, cancelled, title mismatch.
- **🖼️ Artwork presence** — "has artwork" / "no artwork", and separately
  "front-image available" for inline thumbnails. This is the only way to filter
  on artwork presence; typing `no` deliberately does not do it, because it would
  also match an image type containing the word.
- **👤 Entity info** — one sub-section per entity type, plus comments and
  aliases.
- **🔀 Join phrases** and **name variations** — the connective text between two
  credited entities.
- **🎚️ Credit details**, **🎭 Roles**, **📅 Release events**, **💿 Format
  info**, **🏷️ Catalog info**, **🔗 Relationship icons**, **⏳ Pending edits**,
  and a **Relationships — Load state** section on pages carrying that column.

**Keyboard**: ↑/↓/Home/End navigate, Enter or Space toggles, Escape clears the
quick filter and then closes. The panel closes on an outside click.

**Cosmetics worth knowing**: count badges use a uniform monospace width so the
numbers right-align; flag icons are on by default and can be switched off; the
visible row count before scrolling is configurable (default 30) and also drives
whether the panel flips upward.

</details>

---

## Sorting

Click a column header to sort ascending, again for descending, a third time to
restore the original order. The indicator goes `⇅ → ▲ → ▼`.

- **Multi-column sort**: `Ctrl+Click` ▲ or ▼ adds a column to the chain. The
  header shows its position in the chain.
- **Durations sort as durations**, not as text, and `?:??` is pinned last in
  both directions.
- **Large tables** sort through a chunked asynchronous merge sort with a
  progress indicator, so the page stays responsive.
- **On a multi-table page, sorting one sub-table rebuilds only that one.**

---

## Columns

**👁️ Visible** hides and shows columns per table, remembered per page type.
**↔️ Resize** fits every column to its content; columns can also be dragged by
their right edge, and a column can never be dragged narrower than its own
header needs.

<details>
<summary>Extracted, derived and injected columns</summary>

Several page types gain columns this script builds from what is already on the
page — dates split into year/month/day, locations split into venue, city,
region and country, artist credits split from their join phrases, and so on.
They are colour-coded in the header: **extracted** columns (greenish grey) come
from splitting an existing column, **derived** ones (sandy beige) are computed.
Both colours are configurable.

Some columns are fetched rather than derived — see
[The Relationships column](#the-relationships-column) and the Release events
column, both of which load after the table appears and can be filtered and
sorted while they do.

**Default hidden columns per page type** is a table setting in ⚙️ Settings: name
a page type and the columns to start hidden there.

**Numeric columns are aligned** on their digits, and durations on their colon,
so a column of times reads as a column rather than as ragged text.

</details>

---

## Collapsing and expanding

- Click an **h2** heading to collapse its whole section; `Ctrl+2` toggles them
  all. `Ctrl+3` does the same for **h3** sub-section headings.
- A cell holding several items collapses to its first, with a **▶N▤** toggle
  showing how many are hidden. The column header carries a toggle that does the
  whole column.
- Long prose cells (annotations, edit notes) clamp to a few lines with a
  *more* / *less* toggle.
- `Ctrl+Click` a prose toggle, or a column header's toggle, to force-expand —
  including any wiki headings nested inside the cell.

---

## Cover art

On pages that support it, the script pulls covers from the Cover Art Archive
(and event art from the Event Art Archive):

- a **small icon** in its own column,
- an **inline thumbnail** in the Release or Title column,
- a **big picture strip** under each sub-table heading.

<details>
<summary>How the artwork controls behave</summary>

**The big strips start collapsed** and load nothing until you press their
toggle. That is the default because a large discography is hundreds of
requests, and the archive has no bulk endpoint — it is one request per release.

**Per table and page-wide.** Each sub-table heading gets its own artwork
controls, plus a page-wide set: a toggle, a **⟳** reload, a **⚠⟳** that retries
only what failed, and a **📊** artwork summary panel for that table. They render
as one segmented control per source, so CAA and EAA never read as one group.

**The summary panel costs no requests** — it reports what has already been
fetched. While a load is still running it says so, including how deep the queue
is, because on a large listing the metadata lookups are deliberately queued
behind the images and can be a long way off.

**Failures are distinguished from absences.** "The archive has no artwork for
this release" and "the request failed" both render as no artwork, so the ⚠⟳
button's count is the only way to tell them apart. A transient failure is never
written to the cache.

**Cache-hint glyphs** (🟢/🟡/🔵/🗄️/⚠️) can be shown on icons, strip images and
inline thumbnails, reporting where each image came from. Images are cached in
IndexedDB with a configurable TTL and size.

**Sizes and concurrency** — small and big fetch sizes (250 / 500 / 1200), a
maximum display height, and a request concurrency limit — are all settings.

</details>

---

## The Relationships column

An injected column showing each row's entity relationships as icons, fetched
from the MusicBrainz web service after the table appears.

**A large table starts collapsed and fetches nothing.** The threshold is 200
distinct entities by default; set it to `0` to never auto-collapse. Press **▶🔗**
in the column header to load it. This matters: the column is one request per
entity at roughly one per second, so a 2300-row discography is about forty
minutes of trickling requests that you probably did not want.

<details>
<summary>Load states, per-row loading, and retrying</summary>

Each cell shows where it is: `🔗︎` not loaded, `⋯` queued, `◌` loading, `–` no
relationships, `⚠︎` failed, and `⟳` on hover to reload. **Clicking one cell
loads that row alone**, even in a collapsed column — useful when you want one
answer rather than the whole page. The glyphs can be switched off, which also
switches off click-to-load.

**The header toggle carries a `done/total` badge** while anything is
outstanding.

**Whole-page fetching** is used where MusicBrainz allows it — up to 100 rows per
request on artist, label, release-group, recording and area listings — and falls
back to one request per row elsewhere.

**Two retry buttons, and they mean different things.** `🔗⟳` reloads
everything, for when you believe the data is stale. `⚠⟳ N` recovers only what
failed. There is one of each per table and one page-wide. The failed count is
computed from the captured rows, not from what is on screen, so a filter cannot
hide failures from it.

**An automatic follow-up pass** retries failures once the first load drains,
after a 30-second pause, at most twice per page, and never at all when more than
25 entities failed — that many is an outage, and hammering it is not a retry.

**The 📊 dropdown offers a Load state section** — pending / has / none / error —
so you can filter to exactly the rows that failed.

</details>

---

## Track lengths

MusicBrainz renders track lengths rounded to the second. The **⏱** toggle in the
*Length* column header reveals the millisecond precision it already stores.

- On a release tracklist the values are already in the page — no network.
- On work, artist-relationship, place-performance and area-recording pages one
  lookup covers the page.
- Elsewhere the recordings are fetched in batches of 100.

The button reports what happened: `⏳` loading, yellow **retry** when something
transiently failed and is worth clicking again, yellow **partial** when some rows
arrived, and dimmed when MusicBrainz simply has no sub-second length on record.
Those last two are different facts and only one of them is worth a second click.
Answers are cached per recording in IndexedDB, so a recording seen on one page is
free on the next.

A release tracklist also gets a **Recording length** column whenever some track's
recording length disagrees with its track length, and flags the disagreements
with ⚠️ or ❌ past a configurable threshold, with **(N) LENGTH ⚠️** buttons in
the filter bar to isolate them.

---

## Save and load

**💾 Save to Disk** writes the whole dataset as gzip-compressed JSON
(`.json.gz`, roughly 60–80% smaller than plain JSON). Filenames are built to be
recognisable:

```
MB-<pageType>[-<detail>-]<rowCount>-<timestamp>.json.gz
```

**📂 Load from Disk** reopens one, entirely offline. The dialog is three phases —
**Load Data** (`Alt+L`), then an optional **Filter Data** (`Alt+F`) pre-filter,
then **Render Data** (`Alt+R`) — so a large file can be cut down before it is
rendered. The pre-filter accepts the same plain / regexp / exclude modes as
every other filter, keeps its own history, and highlights what it matched.

`Escape` closes the dialog at any phase.

---

## Export

**💾 Export** writes the currently visible rows — after filtering, in the current
sort order, with hidden columns omitted — as CSV, JSON or Emacs Org-Mode.

Settings control what the headers and cells carry: whether unique-value counts
and sort glyphs appear in column headers, whether artwork and title collapse
glyphs are stripped, and whether multi-row collapse icons become bracketed
counts.

---

## Statistics

**📊 Statistics** (or `Ctrl+I`) opens a panel summarising the rendered table:
row and column counts, which columns are original, extracted or derived, how
many cells are multi-row, artwork coverage, and per-column distinct-value
counts.

---

## Keyboard shortcuts

> **Direct `Ctrl`+letter shortcuts are OFF by default.** While they are off —
> the shipped default — every `Ctrl`+letter combination below is suppressed, and
> the **prefix key** is how you reach these actions. Turn them on with *Enable
> Direct Ctrl+Letter Shortcuts* in ⚙️ Settings → 🎹 KEYBOARD SHORTCUTS.
> `Ctrl+2`, `Ctrl+3`, `Ctrl+,`, `Ctrl+Shift+G` and `Ctrl+U` are never affected
> either way.

### The prefix key — always available

Press the prefix (default `Ctrl+M`), release it, then press a letter:

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| `s` | Save to Disk | `g` | Focus global filter |
| `l` | Load from Disk | `c` | Focus next column filter |
| `e` | Export menu | `o` | Toggle multi-row collapse — or **Stop**, during a fetch |
| `d` | Density menu | `q` | Unique-values dropdown |
| `v` | Visible menu | `a` | Toggle cover art for this table |
| `r` | Resize columns | `k` | Keyboard shortcuts reference |
| `i` | Statistics panel | `h` | This help, in the page |
| `b` | Barcode highlighting | `,` | Settings |
| `1`–`9` | Action button by index (the `🧮N` superscript) | | |

`o`, `q` and `a` act on the column filter that was last focused, so they still
work after the prefix key has taken focus away.

### Direct shortcuts

| Keys | Action |
|------|--------|
| `?` or `/` | Keyboard shortcuts reference (outside text inputs) |
| `Ctrl+U` | Unicode character picker (when a text input is focused) |
| `Ctrl+Shift+G` | Clear all filters |
| `Shift+Esc` | Clear all column filters only |
| `Ctrl+2` / `Ctrl+3` | Toggle all h2 / all h3 headings |
| `Ctrl+,` | Settings |
| `Escape` | Clear the focused filter, then remove focus; close open menus |
| `Ctrl+S` `Ctrl+L` `Ctrl+E` | Save · Load · Export — each opens 📦 Data first |
| `Ctrl+D` `Ctrl+I` `Ctrl+B` | Density · Statistics · Barcode — each opens 🛠 View first |
| `Ctrl+R` `Ctrl+V` | Resize columns · Visible columns |
| `Ctrl+K` `Ctrl+G` `Ctrl+C` | Shortcuts reference · Focus global filter · Focus column filter |

<details>
<summary>Shortcuts that act on the focused column filter, and menu navigation</summary>

**With a column filter focused:**

| Keys | Action |
|------|--------|
| `Ctrl+↑` / `Ctrl+↓` | Sort this column ascending / descending |
| `Ctrl+#` | Restore the original row order |
| `Ctrl+O` | Collapse or expand this column's multi-row cells |
| `Ctrl+Q` | Open this column's unique-values dropdown |
| `Ctrl+A` | Toggle cover art for the enclosing table |
| `Ctrl+R` / `Ctrl+V` | Resize / visible columns for the enclosing sub-table |

`Ctrl+↑`, `Ctrl+↓` and `Ctrl+#` carry no letter and always work. The rest follow
the direct-shortcuts setting; prefix-mode `o`, `q` and `a` are the alternatives.

**Inside an open menu:**

| Menu | Keys |
|------|------|
| Visible | ↑/↓ or Tab navigate · Space toggles · `Alt+S` all · `Alt+D` none · `Alt+C` apply · Enter or Escape close |
| Density | ↑/↓ preview · Enter apply · Escape close |
| Export | ↑/↓ choose format · Enter export · Escape close |
| Load dialog | `Alt+L` load · `Alt+F` filter · `Alt+R` render · Escape close |

**Every shortcut on this page is configurable**, including the prefix key itself
— it can be any combination such as `Ctrl+.`, `Alt+X` or `Ctrl+Shift+,`.

</details>

---

## Settings

**⚙️** (or `Ctrl+,`) opens the Settings Manager. A 🔍 field at the top filters
the whole list as you type, highlighting matches in labels and descriptions, and
a *changed only* toggle narrows it to what you have altered.

Settings are saved to your browser's userscript storage. Only values you have
actually changed are stored, so a default improved in a later version reaches
you automatically.

<details>
<summary>The setting groups</summary>

| Group | What is in it |
|-------|---------------|
| 🛠️ Generic | Debug logging; overflow tables in a new tab; artwork diagnostics |
| 🔬 Experimental | Collapsible sidebar |
| 🏷️ Page header and body | Relocating h1 alias blocks, legal names and trailing h2 sections |
| 💬 Tooltips | Rich row-count tooltips and their colours |
| 🔢 Numeric alignment | Digit and colon alignment on numeric and duration columns |
| 🧮 Optional column removal | Drop the Tagger, Rating and checkbox columns |
| 🎹 Keyboard shortcuts | The prefix key, the direct-shortcuts master switch, and 20+ individual bindings |
| 🎨 Table filter configuration | Every filter colour and border state, the focus prefix and focus backgrounds |
| #₁ Unique column values drop down configuration | Badge colours, quick-filter highlight colours, flag icons, visible row count |
| Σ Threshold settings | Auto-expand rows, max page warning, sort progress indicator |
| 📝 Annotation columns | Collapsible prose columns, clamp height, max width, nested heading colours |
| 📖 Annotation section | Auto-expand the native annotation section |
| 🔀 Annotation history | Open *Compare versions* in a new tab |
| 🎨 Edits page | Per-category edit colours, collapse defaults, diff colours, zebra striping |
| ⚡ Performance | Debounce, sort chunk size, render and warning thresholds, history limit |
| 🎨 UI features | Column visibility, density control, sticky headers, default hidden columns per page type |
| 📌 Table stickiness | Sticky column and header configuration |
| 🖌️ Element UI styles | Action button base style, per-button colours (including the two halves of the ⚙️❓ pill), toolbar menu button colours, dividers, filter input styles, header cell colours |
| 🔗 Relationships column | Enable, auto-collapse threshold, cell load-state glyphs, whole-page fetching |
| ↔️ Column resize | Enable resizing; auto-resize on load |
| 📤 Export | What headers and cells carry in an export |
| 📊 Statistics panel | Enable; maximum width and height |
| 💾 Load and save | Edit the pinned filter list |
| 🔍 Expand release and release groups | Inline ▶/▼ expanders |
| ▶️ Expand truncated cells | Whether a clipped cell offers an expander, and how it looks |
| 📑 Show single-table | The client-side sub-table snapshot button and its colours |
| 💿 Release tracklist | Every tracklist column family, credit colours, live-date flagging, the ARs column |
| 🔖 Barcode highlight | Identical-barcode highlighting |
| 🎨 Artist role colours | Main and guest performer label colours |
| 🖼️ CAA/EAA illustrated discography | The whole artwork feature: icons, strips, inline thumbnails, sizes, concurrency |
| 🗄️ Art archive IndexedDB | The image cache: TTL, entry count, store sizes |
| 🎵 Picard tagger | The ♪ column, its collapse default, host and port range |
| ⏱️ Track length precision | Millisecond lengths, the `.000` suffix, the IndexedDB cache and its TTL |
| 📅 Release events column | Enable the asynchronous release-events column |
| ⏱️ Resource timing | Cache-hint indicators and where they appear |
| 🔤 Unicode picker | Enable, shortcut key, and the glyph table |

</details>

<details>
<summary>Saving, resetting, and moving your configuration between browsers</summary>

**The dialog header** reports how many settings exist, how many you have
changed, and the storage backend in use.

**RESET** restores every setting to its default, after a confirmation. **SAVE**
writes your changes; closing with unsaved changes — by Escape, by the close
link, or by clicking outside — asks first.

**💾 / 📂 in the settings dialog** export and import a configuration file. It
carries your settings *and* your workspace: the pinned filter list, per-page-type
and per-sub-table column visibility, filter history, panel geometry, the 📊
dropdown's collapsed sections and the dialog's own layout.

It deliberately does **not** carry install state — which version's migrations
have run — so importing someone else's file cannot disable your own upgrade
path. Importing reloads the page.

**Tables that ship built-in rows** — the Unicode glyph table, the relationship
maps, the default-hidden-columns table — receive rows added in later versions
without resurrecting rows you deleted. The file records which built-in rows you
have been offered, which is what makes the difference detectable; drop that and
an import brings your deletions back.

</details>

---

## Supported pages

<details>
<summary>The full list</summary>

- **Artist** — release groups, releases, recordings, works, events, aliases,
  relationships (including filtered relationship-type pages)
- **Release group, release, recording, work, label, series, place, area,
  instrument, event** — all supported sub-tabs, including release groups with
  MusicBrainz's own h3-grouped sub-tables
- **Release tracklists** (`/release/<mbid>`) — the whole tracklist across every
  medium, consolidated
- **Collections** — your own, subscribed ones, and their entity sub-tabs
- **Tags** — entity tag pages, user tag pages, and the most-popular-tags page
- **Search results** — every entity type
- **Reports** — the `/reports` index and all 117 reports across 14 categories
- **Edit listings** — edit search, per-entity edits, your own edits, open edits,
  subscribed edits, notes received
- **Annotation history** (`/<entity>/<mbid>/annotations`) across ten entity types
- **Auto-editor elections**, **genre**, **instrument** and **edit-type** lists,
  **top CD stubs**, **ISRC** and **privileged account** pages
- **Account pages** (`/account/applications`)
- Also works on the **musicbrainz.eu** mirror

</details>

---

## Page-specific behaviour

<details>
<summary>Release tracklists</summary>

A release page gains **Show all Tracks for Release**, which consolidates every
medium into one table and unpacks each track's relationships into columns:
*Recording of work*, *Recorded at* event and place, *Recorded in area*, *Mixed
at*, *Performer*, the engineer / producer / mixer credit family, phonographic
copyright, *Instruments* and *Vocals*.

**Anything else is discovered automatically.** A relationship type with no
dedicated column gets one named after its own phrase, so a new MusicBrainz
relationship type needs no change here. Two different phrases never merge.

The recorded **work's own** relationships get their own columns too — *Work
lyricist*, *Work composer*, *Work publisher* — kept separate from the
recording's, because they are relationships of a different entity.

Also available: **AcoustIDs** and **ISRCs** columns (both off by default), a
raw **ARs** column, and a flag on live-recording credit dates that disagree with
the recording date.

</details>

<details>
<summary>Multi-table pages</summary>

Pages that group their rows — artist relationships, place performances, a
series, a tag listing — render one heading and one table per group, with a
**Show/Hide all** master toggle.

Each sub-table has its own filter, its own sort, its own ↔️ and 👁️ controls and
its own artwork controls. Sorting one sub-table rebuilds only that one.

Some sub-tables are capped at 100 rows by MusicBrainz itself. The **Show
single-table** button opens such a sub-table in its own tab as a standalone
single table, entirely client-side, with no refetch.

</details>

<details>
<summary>Edit listings, annotations, elections and account pages</summary>

**Edit listings** colour the *Edit#* and *Edit action* cells by edit category and
by whether the edit is open or closed, colour old/new value differences, and
clamp the long *Edit details* and *Edit notes* columns with a *more* toggle.

**Annotation history** pages get Editor and Version-history columns, always
selectable Old/New comparison radios, and a relocated *Compare versions* button
that can open in a new tab.

**Auto-editor election** pages consolidate both the index and individual
elections.

**`/account/applications`** is served with a stricter Content-Security-Policy
than the rest of MusicBrainz. Every dialog, tooltip and panel renders correctly
there; nothing is reduced.

</details>

<details>
<summary>The Picard tagger column</summary>

Tables whose rows link a release gain a **♪** column that sends the release to a
running MusicBrainz Picard. It starts collapsed — the `<th>` and the cells are
there, but the buttons are only built when you press **▶♪** in the header.

Host and port are configurable (`127.0.0.1`, ports 8000–8010 by default). A
release's own tracklist does not get this column: its rows link recordings, not
releases.

</details>

---

## Troubleshooting

**The action button does nothing / the table never appears.** Check whether a
dialog is waiting for you — a large listing asks before fetching, and the answer
is a plain-DOM dialog rather than a browser one, so it may be behind something.

**Filtering stopped responding after a while.** Press the action button again;
it reloads the page and starts clean. That is what the second press is for.

**The Relationships column is empty and nothing is loading.** It is collapsed —
large tables start that way on purpose. Press **▶🔗** in its header, or click a
single cell to load just that row.

**Cover art is missing for some rows.** "No artwork" and "the request failed"
look identical. The **⚠⟳** button's count tells you how many failed; pressing it
retries only those.

**A setting I changed had no effect.** A few settings only decide a *starting*
state — whether a column begins collapsed, whether strips begin closed — and do
not change a table already on screen. Reload the page.

**⚙️ Settings does nothing, and every setting seems to be back at its default.**
That is what a failed shared-library load looks like, and it is deliberately
quiet — nothing errors, the script falls back to built-in values and carries on.
The Settings Manager belongs to the library, so it is the visible symptom.
Reinstall `VZ_MBLibrary.user.js` from the same repository as this script.

---

*Found something this page gets wrong? The script's changelog is in the
Tampermonkey menu under 📜 ChangeLog, and issues belong in the
[repository](https://github.com/vzell/mb-userscripts).*
