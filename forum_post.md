# VZ: Show All Entity Data — Consolidated View with Filtering & Multi-Sorting

**Userscript for Tampermonkey / Greasemonkey · Works on all major desktop browsers + Firefox/Kiwi on Android**

---

## What it does

MusicBrainz paginates most entity lists to 100 rows per page. This userscript fetches **all pages in the background**, merges them into a single scrollable table, and adds real-time filtering, multi-column sorting, cover art, statistics, and export — without leaving the page.

One click on the action button (e.g. **🧮¹ Artist RGs**) starts the fetch. A live progress bar tracks it. When complete the full dataset is immediately filterable and sortable.

There are three distinct fetch/render modes, each determined by the structure of the source page:

---

### Mode 1 — Paginated flat list → single-table view

**Example pages:** Artist Events, Artist Recordings, Label Releases, Recording Releases, Work Recordings, …

The native MB page shows one flat table with 100 rows per page and numbered pagination at the bottom. The script reads the total page count from the pagination bar, then fetches all remaining pages in sequence using native `fetch()` (same-origin, same cookie session as the active tab). Rows from every page are merged into one flat array, and a single consolidated table is rendered in place of the original.

```
Native:   Artist Events — Page 1 of 7 (100 rows) [2] [3] [4] … [7]
Script:   Artist Events — (683 rows)  ← one table, fully filterable
```

Each row always represents exactly one entity (one event, one recording, etc.). There is only one filter bar and one column-header row. This is **single-table mode**.

---

### Mode 2 — Paginated multi-category source → multi-table view

**Example pages:** Artist Release Groups, Artist Releases (with Official / Unofficial split), Release Group Releases, …

The native MB page already has its rows grouped under `<h3>` section headings (e.g. *Album*, *Single*, *EP*, *Live*, *Compilation*, *Other*), each with its own sub-table on every page. The script fetches all pages — each fetched page contains the same set of section headings — and merges the rows from matching sections across pages together. The result is a set of independent per-category sub-tables, each under its own collapsible `<h3>` header.

```
Native (page 1 of 4):           Script (all pages merged):
  h3 Album       (25 rows)        h3 Album       (87 rows)  ← sub-table with own filter/sort
  h3 Single      (25 rows)        h3 Single      (143 rows) ← sub-table with own filter/sort
  h3 EP          (4 rows)         h3 EP          (12 rows)  ← sub-table with own filter/sort
  …                               …
```

Every sub-table gets its own independent sub-table filter (STF) input, column filters, sort chain, and filter-status display. There is also a shared global filter that narrows all sub-tables simultaneously. This is **multi-table mode**.

For Artist Release Groups specifically, a pre-fetch pass first determines which release-group categories are present in the "Official" view, and the script merges Official and Non-Official sections of the same name (e.g. two separate "Album" sections) into a single unified sub-table, optionally with a *Complete (merged)* button.

---

### Mode 3 — Non-paginated multi-section source → multi-table view with overflow buttons

**Example pages:** Artist Relationships, Label Relationships, Place Performances, Recording Releases (relationship view), …

The native MB page is **not paginated** — there is only ever one page. Instead, it contains one large table whose rows are grouped under `<h3>` headings by relationship type (e.g. *member of band*, *collaborates with*, *produced*, *remixed*). MusicBrainz caps each section at **100 rows** and adds a *"See all N recordings"* link at the bottom of any section that has more. There is no traditional page-N pagination.

The script fetches the single page (maxPage = 1), parses all its sections, and renders them as individual sub-tables under collapsible `<h3>` headers — exactly as in Mode 2. For any section that was truncated by MB's 100-row cap, the trailing "See all N rows" link is converted into a styled **"Show all N rows"** button in that sub-table's `<h3>` header line. Clicking that button either navigates to the full paginated list for that relationship type or opens it in a new tab (configurable), where the script will fetch all pages in Mode 1.

```
Native (1 page, capped):              Script (rendered):
  h3 member of band  (12 rows)          h3 member of band  (12 rows)
  h3 collaborates    (100 rows + link)  h3 collaborates    (100 rows) [Show all 347 rows →]
  h3 produced        (100 rows + link)  h3 produced        (100 rows) [Show all 1,204 rows →]
  …                                     …
```

The overflow buttons are colour-coded: configurable initial colour (default warm amber) changes to a different colour (default light green) after being clicked, providing a clear visual record of which sections have already been expanded in a separate tab.

---

### Mode 4 — Non-table source pages: `<ul>` list conversion → single or multi-table view

**Example pages:** User Tags, Tag Value pages, Artist Credit overview/entity, User Subscribers, Most Popular Tags, …

Several MusicBrainz pages render their data in `<ul>` lists under `<h2>` or `<h3>` headings rather than as `<table class="tbl">` elements. The standard fetch/filter/sort pipeline requires actual tables, so the script runs a pre-processing step (`applyListToTable`) that rewrites the live DOM before the pipeline begins. Seven distinct source-HTML structures (A–G) are recognised and each is converted to `<table class="tbl">`.

Because the source structure varies so much, these pages produce either a single-table or multi-table result, and may or may not involve pagination. The concrete examples you asked about:

---

**`/user/vzell/tags` — User Tags (two-column tables, multi-table, one page)**

The page has `<h3>Genres</h3><div id="genres"><ul>` and `<h3>Tags</h3><div id="tags"><ul>` (Structure A). Two buttons are offered — *Tags upvoted* and *Tags downvoted* — each fetching with `?show_downvoted=0/1`. Each `<ul>` becomes a two-column `(Genre/Tag | Tag count)` sub-table. The vote/sort form is removed after rendering since the buttons replace it. The vote/sort form on the native page is removed after rendering.

```
Native:   h3 Genres  <ul> (n genre links with vote counts)
          h3 Tags    <ul> (m tag links with vote counts)

Script:   h3 Genres  <table> (Genre | Tag count)
          h3 Tags    <table> (Tag   | Tag count)
          ← each fully filterable + sortable, two buttons for ↑ / ↓ votes
```

---

**`/user/vzell/tag/live` — User Tag Value (per-entity-type sub-tables, multi-table, paginated)**

The page has `<h2>Entities tagged as "live"</h2>` followed by a series of `<h3>Artists</h3><ul>`, `<h3>Releases</h3><ul>`, `<h3>Events</h3><ul>` … pairs (Structure D). Each `<h3>+<ul>` is converted to a single-column table whose header is the singular form of the h3 text (*Artist*, *Release*, *Event*, …). The page may be paginated. Two buttons (*Tag for Entities upvoted / downvoted*) apply a `show_downvoted` param. Per-entity-type column extractors inject synthetic columns (e.g. *Name*, *Comment*, *Artist* split from a composite cell; date part columns *DD/MM/YYYY/Day/Month* for Events; CAA/EAA artwork).

```
Native (one of possibly N pages):    Script (all pages merged):
  h2 Entities tagged as "live"         h3 Artist  <table> (Artist | …) ← own filter/sort
  h3 Artists   <ul> (10 items + link)  h3 Release <table> (Release | …) [Show all 347 rows →]
  h3 Releases  <ul> (10 items + link)  h3 Event   <table> (Event | …)  ← date parts, EAA art
  h3 Events    <ul> (10 items + link)  …
```

Sections truncated by MB's 10-row cap get the same **"Show all N rows"** overflow button in their `<h3>` header as in Mode 3.

---

**`/user/vzell/tag/live/events` — User Tag Value Entity (single table, paginated)**

A sub-page showing only one entity type for a tag (e.g. only Events). The page has `<h2>Events vzell tagged as "live"</h2><ul>…</ul>` (Structure C) — a single h2 anchor followed by one flat `<ul>`. Converted to a one-column table then fetched across all pages exactly as in Mode 1.

---

**`/musicbrainz.org/artist-credit/<id>` — Artist Credit overview (multi-table, one page, overflow buttons)**

The page has `<h2>Uses</h2>` followed by `<h3>Release groups</h3><ul>`, `<h3>Releases</h3><ul>`, `<h3>Recordings</h3><ul>` pairs (Structure F). Each `<ul>` holds at most 10 rows; longer sections carry a trailing *"See all N release groups"* `<em><a>` link. Each `<h3>+<ul>` is converted to a one-column table whose header is the singular form of the h3 text. Sections with the trailing "See all" link get an overflow button in the `<h3>` header; the trailing row is removed from the table so the row count display stays accurate. CAA art and Relationships columns are injected per the `entityFeatures` configuration.

```
Native:                                Script:
  h2 Uses                                h3 Release group  <table> (10 rows) [Show all 47 rows →]
    h3 Release groups  <ul> (10 items)   h3 Release        <table> (10 rows) [Show all 312 rows →]
    h3 Releases        <ul> (10 items)   h3 Recording      <table> (10 rows) [Show all 1,204 rows →]
    h3 Recordings      <ul> (10 items)   ← each with CAA art, Relationships column
```

---

**`/artist-credit/<id>/release-groups` — Artist Credit entity sub-page (single table, paginated)**

A sub-page showing only one entity type (e.g. just Release Groups) for a given artist credit. The page has a bare `<ul>` without id or class (Structure G), which is converted to a single-column table whose header is derived from the URL's last path segment (`release-groups` → *Release group*). Then fetched across all pages exactly as in Mode 1. Entity-specific features (CAA art, Relationships column, column extractors) are applied from the `entityFeatures` map.

---

**`/user/vzell/subscribers` — User Subscribers (single table, one page)**

The page has `<h2>Subscribers</h2><ul>…</ul>` (Structure C). Converted to a one-column table (*Subscribers*) and rendered in single-table mode. No pagination.

---

**`/tags` — Most Popular Tags (two-column tables, multi-table, one page)**

The page has `<h2>Genres</h2><ul>` and `<h2>Other Tags</h2><ul>` (the h2 headings are first renamed to h3 so Structure E applies). Each `<ul>` becomes a two-column `(Genre/Tag | Tag count)` sub-table. A single button — *Show most popular tags* — fetches with `?show_list=1`.

---


72 page types across every major MusicBrainz entity:

| Entity | Supported sub-pages |
|---|---|
| **Artist** | Release Groups, Releases, Recordings, Works, Events, Aliases, Relationships (incl. filtered link-type pages) |
| **Release Group / Release / Recording / Work** | Releases, Aliases, Tags, Recordings, Relationships |
| **Label / Series / Place / Area / Instrument / Event** | All supported sub-tabs |
| **Collection** | Own & subscribed collections; Release Group sub-tabs with native h3-grouped sub-tables |
| **Tag** | `/tag/<value>`, `/tag/<value>/<entity>`, user tag pages, Most Popular Tags |
| **Search** | All MB search entity types |

---

## Core features

### Filtering
- **Global filter** — one input filters every column at once
- **Column filters** — per-column row beneath the table header
- **Sub-table filters** — independent inputs per category on multi-table pages (e.g. Artist-Relationships)
- All inputs support **plain text · case-sensitive · regexp · exclude-matches** (tick *Ex* to hide matching rows instead of showing them)
- **Cross-tag highlighting** — matches spanning `<a>`, `<bdi>`, `<span>` boundaries highlight correctly
- **Filter status display** — live summary per sub-table:
  `✓ Filtered 19 rows [GLOBAL:"bruce", SUB-TABLE:"vinyl", 1 COLUMN FILTER ['Release':"version"]]`
- **Hidden-match indicator** — when a match is inside a collapsed multi-row cell (Label, Catalog#, …) the `▶` expand button turns yellow/red as a signal
- **Filter history + Pinned Filters** — LRU dropdown of recent expressions; permanently pin any expression that never ages out

### Sorting
- Click any column header to sort ▲/▼; click ⇅ again to restore original order
- **Multi-column sort** — Ctrl+Click adds a column to the chain; superscript numbers (¹²³) show priority
- Async chunked merge-sort with progress indicator for large tables

### Cover Art (CAA/EAA)
- **Icon column** — tiny thumbnail in the CAA/EAA column
- **Big picture strip** — horizontal scrollable strip of large images above each sub-table; per-strip 🖼️ toggle
- **Inline thumbnails** — 20×20 px thumbnail inside every Release/Title cell with hover tooltip
- Three-tier cache: memory → IndexedDB (configurable TTL) → network
- Cache-hint indicators (🟢 memory / 🔵 IDB / 🟡 network / ⚠️ unknown) on images and badges

### Relationships column
- Asynchronously fetches WS2 relationship data and injects favicon icons into an extra column
- **Filter-aware rich tooltip** — appears on icon hover *only* when the active filter matches that cell
- **Filter-match highlighting** — matching icons receive a coloured border so the match is immediately visible
- 7-day IndexedDB cache with ⟳ retry button

### Expand Release Groups
- Inline ▶/▼ toggle on every release-group link expands a sub-table of all releases for that RG
- Each release row gets its own ▶/▼ for track listings

### Pre-filter Load (offline cache)
- **Save to Disk** — gzip-compressed JSON (~60–80% smaller than plain JSON); filename encodes page type, row count, and timestamp
- **Load from Disk** — three-phase dialog: Load → Filter → Render; enter a regexp pre-filter before rendering to import only matching rows
- Pre-filtered rows are highlighted with 🎨; toggle on/off with a dedicated button

### Column management
- **👁️ Visible** — show/hide any column (Alt+S / Alt+D select/deselect all)
- **↔️ Resize** — fits columns to content; acts as a toggle
- **📏 Density** — Compact / Normal / Comfortable row spacing with live preview
- **📤 Export** — CSV · JSON · Emacs Org-Mode

### Statistics panel (📊)
- Draggable, resizable overlay with global metrics (row counts, column origins, filter summary, resize state, artwork loading times, memory estimate) and per-sub-table column breakdown

### Unique-values dropdown (📊 in every column header)
- Lists all distinct non-empty values in that column with occurrence counts; click any to apply it as a column filter instantly

### Settings (⚙️)
- 70+ configurable options across 20+ groups: keyboard shortcuts, colours, CAA sizes, debounce timers, density, column alignment, filter history limits, and more
- Live search field in the Settings dialog

---

## Keyboard shortcuts (all configurable)

**Direct chords:**

| Shortcut | Action |
|---|---|
| `?` or `/` | Keyboard shortcuts reference |
| `Ctrl+K` | Keyboard shortcuts reference (always active) |
| `Ctrl+G` | Focus global filter |
| `Ctrl+C` | Focus first column filter (cycles through sub-tables) |
| `Ctrl+Shift+G` | Clear all filters |
| `Shift+Esc` | Clear all column filters only |
| `Ctrl+S` | Save to Disk |
| `Ctrl+L` | Load from Disk |
| `Ctrl+E` | Export menu |
| `Ctrl+R` | Toggle Resize |
| `Ctrl+D` | Density menu |
| `Ctrl+V` | Visible columns menu |
| `Ctrl+I` | Statistics panel |
| `Ctrl+2` / `Ctrl+3` | Toggle all h2 / h3 headers |
| `Ctrl+,` | Settings |
| `Ctrl+U` | Unicode character picker (when a text input is focused) |

**Prefix mode** (default `Ctrl+M`, then release, then press):

`s` Save · `l` Load · `r` Resize · `v` Visible · `d` Density · `i` Statistics · `e` Export · `k` Shortcuts · `,` Settings · `h` Help · `o` Stop (during fetch) · `1`–`9` / `a`–`z` Action buttons by index

**Column-filter-focused shortcuts** (active only when a column filter has focus):

`Ctrl+↑/↓` Sort asc/desc · `Ctrl+#` Unsort · `Ctrl+O` Toggle multi-row collapse · `Ctrl+Q` Unique-values dropdown · `Ctrl+A` Toggle CAA/EAA art · `Ctrl+R` Resize sub-table · `Ctrl+V` Visible sub-table

---

## Installation

Requires [Tampermonkey](https://www.tampermonkey.net/) (or compatible userscript manager).

1. Install Tampermonkey for your browser
2. Click the install link: **[GitHub — vzell/mb-userscripts](https://github.com/vzell/mb-userscripts)**
3. The shared library (`VZ_MBLibrary.user.js`) must be installed first — it is listed as a dependency and Tampermonkey will prompt for it automatically

**Tested on:** Firefox (Windows/macOS/Linux/Android), Chrome, Edge, Kiwi Browser (Android)

---

## Version

Current: **9.99.587** (2026-05-11)

Recent highlights:
- Fixed fetch on **Firefox for Android** (Tampermonkey background-context cookie isolation — `GM_xmlhttpRequest` replaced by native `fetch()`)
- Fixed spurious filter/highlight matches in multi-row cells (Catalog#, Label) — count badge digits no longer participate in cross-tag matching
- Removed unconditional filter-status overwrites from all "Clear filters" buttons
- Full JSDoc audit + HELP file resync

Full changelog in the Tampermonkey menu → *📜 ChangeLog*.

---

## Feedback & issues

- **Bug reports / feature requests:** [GitHub Issues](https://github.com/vzell/mb-userscripts/issues)
- Questions and discussion welcome here in this thread

---
---

# Screenshot suggestions

Below are concrete scenarios to capture. Each is chosen to show a distinct feature in a single glance — no two shots demonstrate the same thing.

---

## 1 — The "before and after" opener

**Purpose:** Instantly communicates the core value proposition.

**Setup:**
- Navigate to a prolific artist with many release groups, e.g. David Bowie (`/artist/5441c29d-3602-4898-887c-f911f4a3ed28`)
- **Before:** Screenshot the native MB page showing "Page 1 of 7" with 100 rows and disabled pagination arrows
- **After:** Click 🧮¹ Artist RGs, wait for fetch, screenshot the completed single-table view showing all ~580 rows in one scrollable table with the progress bar gone and the filter input focused

**What to highlight:** The row count badge in the h2 header (`Release Groups (583)`) vs the native `100 rows, page 1 of 7`.

---

## 2 — Multi-level filtering with status display

**Purpose:** Shows the three filter layers working together and the live status line.

**Setup:**
- Release Group page for a big artist, e.g. Bruce Springsteen's releases (`/release-group/c497fc44-ddaf-3cce-a9b4-bfec958a0f3c`)
- Fetch all releases
- Type `bruce` in the Global filter, `vinyl` in the sub-table filter, `version` in the Release column filter
- Screenshot the status line reading:
  `✓ Filtered 19 rows [GLOBAL:"bruce", SUB-TABLE:"vinyl", 1 COLUMN FILTER ['Release':"version"]]`
- Make sure the orange/green/coloured filter input borders are visible, and highlighted matches are visible in the table

**What to highlight:** The three coloured filter input borders (global = orange, sub-table = green), the compact status line, and the yellow cross-tag highlights in the Release cell.

---

## 3 — CAA illustrated discography

**Purpose:** The most visually striking feature — makes the table look like a media browser.

**Setup:**
- An artist with many releases that have cover art, e.g. The Beatles (`/artist/b10bbbfc-cf9e-42a0-ae36-7c7fb49a5b5c`) → Releases tab
- Enable all three CAA modes in ⚙️: icon column, big picture strip, inline thumbnails
- Fetch all releases
- Scroll to a section with rich cover art (e.g. Albums)
- Screenshot showing the big picture strip above the table + inline thumbnails in the Release column cells + the 🖼️ toggle button in the h3 header

**What to highlight:** The horizontal art strip, the tiny inline thumbnails beside release names, and the cache-hint emoji overlays (🟢/🔵) on the strip images.

---

## 4 — Multi-column sort with superscript priority chain

**Purpose:** Demonstrates a power feature not obvious from the description.

**Setup:**
- Any large releases table (e.g. label releases for a major label)
- Fetch all
- Ctrl+Click several column headers to build a 3-column sort chain: e.g. YYYY▲ → Format▲ → Country▲
- Screenshot the table header showing `YYYY ▲¹`, `Format ▲²`, `Country ▲³` superscripts
- The rows should be visibly sorted by year groups, then format within each year

**What to highlight:** The superscript numbers on the column headers and the visibly re-ordered data.

---

## 5 — Hidden-match indicator on collapsed multi-row cells

**Purpose:** Shows a subtle but important UX feature unique to this script.

**Setup:**
- Bruce Springsteen release group page (`/release-group/c497fc44-ddaf-3cce-a9b4-bfec958a0f3c`)
- Filter by `12` in the sub-table filter (matches `12" Vinyl` in Format)
- Find a row whose Catalog# column has multiple values and one of them matches — the `▶` expand button should be yellow/red
- Screenshot that specific row with the yellow/red `▶` beside the collapsed Catalog# cell

**What to highlight:** The yellow cell-collapse button with red glyph clearly contrasting with normal grey buttons in other rows.

---

## 6 — Unique-values dropdown as instant column filter

**Purpose:** Shows discoverability — many users don't expect this feature.

**Setup:**
- Any releases table with a Format or Country column
- Click the 📊 icon in the "Format" column header
- The dropdown opens showing all distinct formats with `(n)` occurrence badges right-aligned in monospace
- Screenshot the open dropdown with the quick-filter input focused and several items visible

**What to highlight:** The `(123)` occurrence badges (right-aligned, uniform width), the quick-filter bar at the top, and a value being hovered/selected.

---

## 7 — Statistics panel

**Purpose:** Appeals to data-oriented users; shows depth of introspection.

**Setup:**
- Fetch a large artist with many release groups (e.g. Miles Davis)
- Open the Statistics panel (📊 button or Ctrl+I)
- Drag it to a position where both the panel and the table behind it are visible
- Expand one sub-table's per-column breakdown to show the index/name/visibility/sort/unique-count breakdown

**What to highlight:** The draggable panel floating over the table, the global metrics section (row count, column counts, filter summary), and the per-column detail rows tinted by column origin colour.

---

## 8 — Settings dialog with live search

**Purpose:** Conveys the depth of configurability without overwhelming.

**Setup:**
- Open ⚙️ Settings (Ctrl+,)
- Type `filter` in the search field at the top
- Screenshot with matching settings highlighted and non-matching ones dimmed/hidden

**What to highlight:** The search field with active highlighting, the breadth of matching options visible, and the section headings still showing context.

---

## 9 — Mobile (Firefox/Kiwi on Android)

**Purpose:** Demonstrates cross-platform support; differentiates from desktop-only scripts.

**Setup:**
- On an Android device (Firefox or Kiwi Browser), navigate to a small artist page
- Fetch the release groups
- Screenshot the completed table in portrait orientation
- If possible, show the filter input with the on-screen keyboard open

**What to highlight:** The fact that it works at all on mobile, and that the table is horizontally scrollable with the sticky first column remaining visible.

---

## 10 — Expand Release Groups inline

**Purpose:** Shows a completely separate sub-feature that is genuinely useful on its own.

**Setup:**
- Any artist with multiple release groups (e.g. a medium-sized band)
- Fetch the release groups
- Click the ▶ button on one release group row to expand it
- Expand a second release row's track listing (nested ▶)
- Screenshot showing: outer table row, expanded release sub-table, expanded track listing — three levels of nesting in one view

**What to highlight:** The three visual levels (RG row → release sub-table → track rows), the ▼ icons on the two expanded rows, and the collapse buttons.

---

## Posting order recommendation

For the forum thread, consider sequencing the screenshots as:

1. **Before/After** (shot 1) — hook
2. **CAA Illustrated Discography** (shot 3) — visual wow
3. **Multi-level Filtering + Status** (shot 2) — core feature
4. **Unique-values Dropdown** (shot 6) — discoverability
5. **Expand Release Groups** (shot 10) — bonus feature
6. **Multi-column Sort** (shot 4) — power user
7. **Hidden-match Indicator** (shot 5) — detail
8. **Statistics Panel** (shot 7) — depth
9. **Settings / Search** (shot 8) — configurability
10. **Mobile** (shot 9) — cross-platform closer
