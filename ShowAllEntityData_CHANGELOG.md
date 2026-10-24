# ShowAllEntityData — Full development log

Every version, newest first, with the technical details behind each change. For what changed for you in each published release, in plain words, see [What's new](ShowAllEntityData_RELEASES.md).

**Months:** [October 2026](ShowAllEntityData_CHANGELOG/2026-10.md) · [September 2026](ShowAllEntityData_CHANGELOG/2026-09.md) · [August 2026](ShowAllEntityData_CHANGELOG/2026-08.md) · [July 2026](ShowAllEntityData_CHANGELOG/2026-07.md) · [June 2026](ShowAllEntityData_CHANGELOG/2026-06.md) · [May 2026](ShowAllEntityData_CHANGELOG/2026-05.md) · [April 2026](ShowAllEntityData_CHANGELOG/2026-04.md) · [March 2026 (1 of 2)](ShowAllEntityData_CHANGELOG/2026-03-1.md) · [March 2026 (2 of 2)](ShowAllEntityData_CHANGELOG/2026-03-2.md) · [February 2026](ShowAllEntityData_CHANGELOG/2026-02.md) · [January 2026](ShowAllEntityData_CHANGELOG/2026-01.md)

This page shows the newest 100 of 1600 versions; the month pages hold all of them.

---

## 9.99.1429 — 2026-10-23

**✨ Improve**

- A fetch now runs inside the button you pressed. It fills blue page by page and reads "■ Stop · 3 / 40"; the line under the heading says which page, how many rows so far and about how long is left. Click it again to stop (or Ctrl+M then O): the page under way finishes and what has arrived is shown, and the status line says "Stopped by you after page n of N … — the rest was not loaded" instead of reading like a complete run. While the rows are being built it is striped (the stripes move only if your system allows motion), then it is the button it was. The other fetch buttons wait meanwhile. The separate red Stop button and the long progress bar beside the heading are gone, and so is the "Stop button colors" setting (its stored value is removed by itself).
- A fetch that could not load every page now leaves a red "🔄 N ▾" on the SAED button, N being the pages missing, also listed under "Needs attention" in the ☰ menu. Its list says which page failed and why, and "↻ Load the N missing pages" carries on from there, keeping the rows you have — what the "↻ Load remaining pages" button at the end of the status line did. It goes away when that load starts, when you press a fetch button again, or when you load a file from disk.

**🐛 Fix**

- On a phone, the ☰ SAED menu could open below the bottom of the screen on a page wider than the screen (a release group's releases, for example); it now opens within what you see, above the button when there is no room below. On a phone the fetch buttons are always in that menu, under "Load", because MusicBrainz pages are laid out at the phone's width.


## 9.99.1428 — 2026-10-23

**🚀 Feature**

- One button in the page heading: the SAED button. Everything the script adds there is now ONE segmented button with up to four parts, each doing its own thing: the page's fetch buttons as before ("🧮¹ Artist \| 🧮² Various Artists"), 📀 Discography with the view it shows (release groups of an artist only), one part per thing that needs your attention (❌ 1 ▾ for errors, ⚠️ 43 ▾ for warnings, each opening its list right under it), and ☰ SAED ▾, the script's menu. 📦 Data ▾, 🛠 View ▾, the ⚙️ and ❓ buttons and the separate WARNING / ERROR buttons are gone into it.
- The ☰ SAED menu has groups with a rule between them: Needs attention (the same lists as the parts on the bar), Data (Save to Disk, Load from Disk, Export ▸), View (Density, Statistics, Keyboard Shortcuts), Help (Settings, Help ↗) and Changelog (What's new ↗, Full development log ↗), with the installed version at its foot. Before anything is loaded there is nothing to view, so View is left out and Keyboard Shortcuts sits under Help. Export ▸ opens its four formats beside the menu when the pointer rests on it (or with → or a click); on a phone or a narrow window they open in place under the row. ↑ ↓ move, → opens, ← or Escape goes back, a second Escape closes the menu.
- Hovering ☰ SAED shows a card with the script's full name, version, library version, script manager and its version, browser, author, and that it was written with AI help from Claude (Anthropic).
- The menu's name is a setting: ⚙️ Settings → 🖌️ ELEMENT UI STYLES → "Name of the ☰ menu" (default "SAED"). The button's colours are "SAED button colors" there (formerly "Toolbar menu button colors").
- On a narrow window (520 px or less) the fetch buttons leave the bar and head the menu as a "Load" group, so the button stays one line.
- Help and the changelog open on GitHub, in a new tab. ❓ Help ↗ (and Ctrl+M then H) opens the help page; Shift-click no longer renders it inside the page. The changelog is two pages: "What's new", the changes of each published version in plain words, and the "Full development log" with every version and its technical details, one page per month. The Tampermonkey menu's "📜 ChangeLog" opens the SAED menu on these two (on the pages the script works on).

**⚡ Performance**

- The changelog is no longer downloaded, stored and read on every page. The library used to fetch the whole changelog (1.75 MB) about once an hour, keep it in the script's storage — which Tampermonkey hands to every page the script runs on — and read it on every page for a dialog most visits never opened: about 9 ms (34 ms on a slow computer) before a page settled and about 6.5 MiB of memory per tab. The stored copies of the changelog and of the help text are deleted when a page starts.

**🔧 Refactor**

- Retired settings: the colours of the Settings ⚙️, Help ❓, Save and Load buttons and the "\|" divider style. Those controls are rows of one menu in one look now; anyone who had chosen their own colours there loses them. Their stored values are deleted when a page starts.


## 9.99.1427 — 2026-10-23

**⚡ Performance**

- Values the script stored once and nothing reads any more are now deleted when a page starts (a moment after it settles, so the page is not slowed). Tampermonkey hands everything a script has stored to every page it runs on, before the script starts, so a leftover is paid for on every page view. Two kinds go: the old plain-text help cache (replaced by the Markdown help in 9.99.1148, up to 50 kB), and the hand-off copies of a table that "Show single-table" leaves behind when the new tab was blocked or closed before it loaded, which can be megabytes each; one older than an hour is deleted, a younger one is kept for a tab that may still be loading. Settings are not touched.


## 9.99.1426 — 2026-10-22

**🚀 Feature**

- An editor's other edit lists get a button too: the accepted, auto-edits, applied, rejected, failed and cancelled edits (/user/&lt;name&gt;/edits/&lt;status&gt;) and the edits they voted on (/user/&lt;name&gt;/votes), the "view" links of a profile's Statistics. Each one loads every page into one table, the way "Show all Edits for User" already did for their edits and open edits.


## 9.99.1425 — 2026-10-22

**✨ Improve**

- Brucebase recent changes: the Flags column is a multi-row column now. A change with two flags ("content source text changed" and "title changed") shows the first one with a ▶ toggle to open the other, and the column header can open or close them all and counts them, like MusicBrainz's list columns.


## 9.99.1424 — 2026-10-22

**🚀 Feature**

- Link previews: an artist's, label's, series' or collection's sidebar "Subscribers" link now has a card and a window, like an editor's subscribers: how many are subscribed, how many anonymously, and their names. The "Found in N user collections" link of any entity has one too: how many collections hold it, how many of them are private, and the first few by name and owner; the window lists every public collection with its owner, and a click on either opens their card.


## 9.99.1423 — 2026-10-22

**🐛 Fix**

- Release and release group collections: the "plus N other private collections" row no longer comes back as a table row after a sort or filter; it stays folded into the line above the table. An entity in no collection no longer offers a Collections button with nothing to show, and neither does a subscribers page without subscribers.


## 9.99.1422 — 2026-10-22

**🚀 Feature**

- New pages: the "Found in N user collections" page of an area, artist, event, instrument, label, place, recording, series or work (the link in its sidebar) becomes a filterable Collection \| Editor table, like a release's. The "Subscribers" page of an artist, label, series or collection becomes a table of its subscribers, like an editor's, with the anonymous subscribers counted in the line above it.


## 9.99.1421 — 2026-10-21

**🚀 Feature**

- Link previews: an editor's own tag (the links of /user/&lt;name&gt;/tags, e.g. /user/vzell/tag/acoustic%20rock) now has a card and a window, read from its page: what that editor tagged with it, how many entities and of which kinds, the first few on the card; in the window each kind's first entries, its "See all" page, and "Everyone's" to open the tag's own card. Works on the tags page as it loads and after its table render.


## 9.99.1420 — 2026-10-21

**✨ Improve**

- Link previews: every box stacked above a hover card now opens with a kind line and a thin line under it, as the card does since 9.99.1418: "Finding", "Note", "Track ≠ recording", "Link title", "Link" (a link's own card, a Relationships icon) or "Filter".


## 9.99.1419 — 2026-10-21

**🚀 Feature**

- Release tracklist: hovering a live track's "\#" cell now also shows the event the track was recorded at, in a card stacked right above the release group card: its name, type, date, place, tour, line-up and the start of its setlist, as the event link's own preview shows them. With the kind line of 9.99.1418, the two cards read "Event" and "Release group". The first hover on a track of an event asks MusicBrainz once, after the release group search and at the same one-a-second pace; the answer is kept like the other previews. A track whose event is only named in its comment shows no event card. New setting "Show the track's event above the "\#" release group card" (💿 RELEASE TRACKLIST), on by default.


## 9.99.1418 — 2026-10-21

**✨ Improve**

- Link previews: every hover card now opens with a kind line, the entity's icon and its kind ("Recording", "Release group", "Event"), the same words as the window's title bar, so the card says what Space will open. Cards of other sites get it too ("Discogs release", "Wikipedia"), without an icon. The icon moved out of the title into that line; the loading and failed cards no longer repeat the kind under the title.
- The release page's release-group cards (the subheader link and the "\#" cell of a live track) now carry MusicBrainz's release-group icon, in the card and in the window's title bar.


## 9.99.1417 — 2026-10-21

**✨ Improve**

- The Length column's header tooltip now follows the ⏱ millisecond toggle. On a release tracklist it used to say "rounded to the nearest second, so 4:50 can be anything from 4:49.500 to 4:50.499" even while the column showed milliseconds. With ⏱ on it now says the value is shown with milliseconds, the precision MusicBrainz keeps, and that ⏱ switches back to whole seconds; the Recording length tooltip says the same. On the other pages with a ⏱ button, the Length description (9.99.1406) changes from "minutes and seconds" to "minutes, seconds and milliseconds" in the same way.


## 9.99.1416 — 2026-10-21

**🐛 Fix**

- Since 9.99.1406, on pages where MusicBrainz marks the Length column itself (an ISRC page, the relationship overviews), the first filter keystroke removed MusicBrainz's own class from the Length header and its new tooltip with it. The jesus2099 clean-up took that tooltip for the "SUPER MIND CONTROL" plugin's, because only one older kind of the script's own tooltips counted as ours. Every tooltip the script writes now counts, so both stay.


## 9.99.1415 — 2026-10-21

**🚀 Feature**

- New page type: one version of an annotation ("View this version" on an annotation history, or "View current revision") gets a "Compare with the current version" button. It shows who wrote the version and when, and a table with one row per paragraph or heading: this version's text, the current version's text, and whether it is the same, changed, only in this version or only in the current version. Point at "changed" to see both texts with the difference marked. Both are read from the page itself.


## 9.99.1414 — 2026-10-21

**✨ Improve**

- The sidebar picture and its copy beside the name now show the same hover card as an image in a CAA/EAA column, instead of a one-line tooltip: an artist's photo, a label's logo or a place's picture from Wikimedia Commons, and an instrument's IROMBOOK drawing, with the picture, where it comes from and its file name.
- Release, release group and event pages: pointing at the cover beside the name, or at the sidebar's own cover, shows the CAA/EAA column's card of every image of the release (or the event's event art), asked for on that first hover; Space shows them all, Shift bigger. A click on either opens them all in the artwork viewer, starting at the front, instead of MusicBrainz's own window; Ctrl-click on the sidebar's cover still opens MusicBrainz's. Event pages now get the cover beside the name too.


## 9.99.1413 — 2026-10-21

**🐛 Fix**

- MusicBrainz's own pop-up windows, such as the one a click on the sidebar's cover opens on release, release group and event pages, now cover the whole page. The script's buttons beside the title, the headings that stay at the top while scrolling and the sidebar handle no longer show through them.


## 9.99.1412 — 2026-10-21

**✨ Improve**

- The live near misses get the rich comparison card: a recording comment that "almost follows 'live, YYYY-MM-DD: Venue, City, …'", and a release, release group title or event name that starts with a date but is not quite in the live form, now show the text over the form it almost has, the difference marked ("live, 1993-4-21: …" over "live, 1993‐04‐21: …", "Live, …" over "live, …", "1975‐02‐05 The Main Point, …" over "1975‐02‐05: The Main Point, …"). Only a fix that cannot be read two ways is proposed, and only when the result is itself in the live form; when there is no single answer ("05.02.1975": which part is the day?), the text shows in one row with the part to rewrite marked.


## 9.99.1411 — 2026-10-21

**✨ Improve**

- Release tracklist: the hover card of a "Live credit without a date" cell now names the date the credit is most likely from: the recording's own "live recording of" date, which the credit was checked against ("⚠️ Live credit without a date: probably 1988-04-27, …"). It stays there after filtering, sorting and loading the page from disk.


## 9.99.1410 — 2026-10-21

**✨ Improve**

- Link previews for annotations: "View annotation history" (under an annotation and in the sidebar, on every kind of page that has one) shows how many versions the annotation has and the latest one's date, editor, changelog and first lines; its window lists every version, newest first, and a version opens its own card. MusicBrainz shows the history only to a logged-in editor, and logged out the card says so. "View this version" and "View current revision" show that version's date, editor, changelog and text. An annotation is copied as plain text, never as markup.


## 9.99.1409 — 2026-10-21

**✨ Improve**

- Release and release group pages: the front cover from the sidebar now also appears at the start of the page heading, as an artist's photo, a label's logo or an instrument's drawing already did, so it stays in sight with the sidebar closed. A click, Enter or Space on it opens all of the release's Cover Art Archive images in the artwork viewer, starting at the front cover; they are asked for on that click only. The sidebar's own cover keeps MusicBrainz's link. Switches: "Sidebar picture: hover card and viewer" and "Sidebar picture beside the name".


## 9.99.1408 — 2026-10-21

**✨ Improve**

- Link previews on an editor's profile, "Tags and ratings": the "view" beside Tags upvoted shows how many tags and genres they voted for and with how many votes, the most used first; a tag opens its own tag card. The "view" beside Ratings shows their ratings as their ratings page does, a few per kind with their stars; an entity opens its own card. The stars on MusicBrainz's page are links that change a rating, and the window never copies them. Downvoted tags have no preview.


## 9.99.1407 — 2026-10-21

**✨ Improve**

- Link previews on an editor's profile: every "view", "N%" and "View all" link of the statistics now has a card and a window. An editor's Open, Accepted, Auto-edits, Applied, Rejected, Failed and Cancelled edits, their Votes, and every edit search ("Last 24 hours", the edit types' percentages) open in the editing-history window, titled by what they list. An edit search is read again on every page load. The two "view list" links show the editor's subscribers (names, and how many are anonymous; a name opens that editor's card) and your authorized and registered applications (name, access, last token, digest authentication). An application's OAuth client ID or secret and its "Revoke access" link are never shown, and that page is never kept after a page load.


## 9.99.1406 — 2026-10-21

**✨ Improve**

- Column header tooltips name their column in bold, with the explanation below it. This applies to every column the script adds (derived, extracted and injected columns such as Event-Date, MB-Name, Recording of), and "Work" / "Perf." (9.99.1404) show their full names there.
- MusicBrainz's own columns now have a header tooltip too, saying what the column holds: Artist, Title, Catalog\#, Country/Date, Format, Tracks, ISRCs, Rating and about 60 more. Where a name means different things the text fits the table: "Type" on an artist's Events page is the kind of event, on a release-group list the primary and secondary types. New setting "Explain MusicBrainz columns in header tooltips" (🎨 UI FEATURES, on). Not on other sites, whose columns these texts do not describe. A pageType can add or override texts with features.columnDescriptions.


## 9.99.1405 — 2026-10-21

**🐛 Fix**

- Fixed a test flake in discogs-links.spec.js ("in the history window: … a support link with its section"): it failed about 1 run in 28 when many tests ran in parallel. The help-centre window asks for the site's icon after the article answers. Under load that icon request (support.discogs.com/favicon.ico) arrived before the check that only the article was requested. The check now leaves the icon request out; icons have their own tests in popup-ext.spec.js. The userscript is unchanged.


## 9.99.1404 — 2026-10-21

**✨ Improve**

- Recording lists: the "Recording of" and "Performance attributes" column headers now read "Work" and "Perf.", so the two columns take less width. Hover a header to see its full name. Menus, the 📊 drop-down, exports and the Default Hidden Columns table still use the full names. To get the full names back in the headers, turn off the new setting "Short column header labels" (🎨 UI FEATURES, on by default).
- Short header labels work for any column. A pageType gets its own with features.columnLabels; the built-in ones are in \_COLUMN\_LABELS. A saved table keeps each labelled column's name, so Load from Disk restores it.


## 9.99.1403 — 2026-10-21

**✨ Improve**

- The sidebar's ◀/▶ handle is there as soon as a supported MusicBrainz page opens, before any button is pressed, with the sidebar open and the page laid out exactly as MusicBrainz draws it. Once a button has rendered the table, "Start with sidebar collapsed" closes it as before. New settings: "Sidebar handle before a button is pressed" (on) and "Start with sidebar collapsed before a button is pressed" (off).


## 9.99.1402 — 2026-10-21

**🚀 Feature**

- Two new switches for the link previews (⚙️ → 🔎 LINK PREVIEWS ON MUSICBRAINZ, both on by default): "Link previews (hover card and Space window)" turns every hover card and Space window off at once, and the script then adds nothing for them to the page; "Link previews also before a button is pressed", off, keeps a supported page as MusicBrainz draws it until a button has rendered the table.


## 9.99.1401 — 2026-10-21

**✨ Improve**

- The Relationships column's ⚠️ WARNING "Several Discogs links in Relationships" is now "Several links to one site in Relationships": two or more different links to ANY one site (two Discogs pages, two amazon.de products, two pages of one Bandcamp artist, …) flag the cell. A site is the host without "www.", so amazon.de and amazon.com, or music.apple.com and itunes.apple.com, stay one link each and never flag. The cell's tooltip and the icon's popup name every site involved with its links. Its two switches keep their saved values; the new setting "Sites allowed more than one link in Relationships" lists hosts that never count.


## 9.99.1400 — 2026-10-21

**🐛 Fix**

- Relationships column: hovering a cell's ⚠️ (several Discogs links) no longer replaces it with the reload ⟳ at the cell's right edge. The ⚠️ stays at the right edge, the ⟳ appears right after the icons as on any other cell, and the cell's tooltip keeps the warning above the reload hint instead of losing it.
- Relationships column: the popup of an icon in such a cell now starts with the warning itself, with the links involved and the icon you point at marked, under a link preview card as well as without one. Only the ⚠️ WARNING menu showed it before.


## 9.99.1399 — 2026-10-20

**✨ Improve**

- A collection's link preview now reads the collection's own page instead of the Web Service, which knows only its name, type, size and owner. The card shows the type, size and number of pages, whether it is public, the owner and the collaborators, the first two lines of the description and the first eight entries. It is still one request, through the same once-a-second gate.
- The collection window (Space) shows the whole description with its links, and the entries 25 at a time with the page's own columns (without the rating stars) and ◀ ▶ to page through them. MusicBrainz shows 100 entries a page, so the next page is read only when the pager gets there. A release or release group collection also shows those 25 entries' covers from the Cover Art Archive. A release group collection's page splits its entries into one table per type; the window lists them together with the type as a column.
- When a collection cannot be read (someone else's private one, or one that was removed), the card says it may be private or no longer exist, and the next hover asks again. Other userscripts' additions to a collection page are never read.


## 9.99.1398 — 2026-10-20

**🚀 Feature**

- Editor profiles (/user/&lt;name&gt;) get a Profile button. It reads the page you are on, nothing is fetched, and shows General information, Edits, Votes, Added entities and, when the profile has it, Tags and ratings as sub-tables under one Profile heading, with the usual filters, sorting and 📊 dropdowns. Counts sort as numbers; a count's share and its "view" link have their own columns; the bio is clamped with a more toggle.
- Blocks other userscripts add to a profile (an Edit Notes list, highlights, flags) stay where they are and are never copied into the tables.


## 9.99.1397 — 2026-10-20

**✨ Improve**

- Pressing an action button a second time still reloads the page (that is what keeps the column filters working), but the reloaded page now runs the same button by itself: no more "⚠️ Page Reloaded" dialog to dismiss and button to press again. A short note beside the status line ("↻ Page reloaded — re-running …") says what is happening and fades after about 3 seconds. The dialog remains only as a fallback when the button cannot be found again.
- The reload now happens before anything else a press does. It used to come after the other sections had already been removed from the visible page and, on an artist's release groups, after a whole pass of page requests for the official headers, all of which the reload then threw away.


## 9.99.1396 — 2026-10-20

**✨ Improve**

- Three more warnings show the rich comparison card instead of a sentence only. "Live title date uses "-"" (release and release group titles, event names, recording comments): the text over the same text with "‐" in its date, only the date's hyphens marked — a hyphen in the venue stays. "Extra title information starts uppercase": the title over the same title with its keywords in lower case, "(Live in Asbury Park 2009)" over "(live in Asbury Park 2009)". "Title truncated with "…"": the title in one row with the "…" marked, since the full title is not on the page. The cards also show in the note box above a link preview.


## 9.99.1395 — 2026-10-20

**🚀 Feature**

- MusicBrainz pages: "Aa Check title style (MB guidelines)" at the top of the ⚠️ WARNING menu checks every title on the page against the MusicBrainz style guide and adds five warnings: "Title not in MB title case" ("Prayer For The Weary" → "Prayer for the Weary"), "ASCII punctuation in title" ("Don't" → "Don’t", " - " → " – ", "..." → "…"), "Series number without comma" ("Broadcasts Vol. 5" → "Broadcasts, Vol. 5"), "Featured artist in title" and "Extra title information to remove" ("(bonus track)", "\[… Cover\]"). Each filters the page from the menu and from the column's 📊 Findings - Warning section, and the hover card shows the title over its MusicBrainz style with only what differs marked. Only certain cases are flagged: titles in another language or in sentence case, live bootleg titles, phrasal "Take On Me", "& The E Street Band", lower-case words in "(…)" and anything in "\[…\]" are left alone.
- The check runs only when asked for, since it costs about 0.2 s per 10,000 different titles; it then stays on for the page until a reload, and the menu row shows how many titles it checked and how long that took. ⚙️ Settings → ⚠️ Findings → "Check title style automatically" (off by default) runs it on every load; each of the five warnings and their tint have their own switches there. The WARNING menu now shows on every MusicBrainz page with titles, to offer the check.

**🔧 Refactor**

- scripts/check-mb-title-case.js --mb-sample runs the checker over the MusicBrainz titles of the snapshots and times it; scripts/mutations/foreign-titles.json: one entry's anchor followed the rename to \_mbSiteTitleTip().


## 9.99.1394 — 2026-10-20

**🐛 Fix**

- Event pages: after "Show all Relationships for Event" the read-only "Sidebar" section now sits above the Relationships tables, as it does above the data on every other page, instead of below all the event tables. On an event page "Relationships" is the table itself, which the placement mistook for a side section.


## 9.99.1393 — 2026-10-20

**🚀 Feature**

- Link preview window: a new "✎ Editing history" button (or press H) shows the entity's editing history in the same window, laid out like a Discogs release's history. Every entity with an MBID has one (not a collection), and so does an editor. The list has one row per edit (date, editor, a coloured type pill, what changed with the editor's note, votes or status), with chips for category and status and a Newest/Oldest switch. Click a row (or use ↑ ↓) to see that edit below: old and new values side by side with MusicBrainz's red/green marks, an edit medium's tracklist split into its old and new halves, a merge as Merge \| Into, an addition or removal in one column, then the edit notes. "Only what changed" is on by default. Cover and event art open in the artwork viewer, "Edit \#…" opens the edit's own card in the window, and ← Back returns.
- "Load page 2 of 7" reads the next 50 edits. A busy entity only says "at least 500", so its footer has no last page. Each page is one request and selecting a row asks for nothing. A page with an open edit is read again next time, because its votes change. Logged out, the window says that MusicBrainz hides editors and notes.
- The sidebar's "Editing history" link and an editor window's "Their edits" link now have a card of their own and open the same window.

**🐛 Fix**

- A dialog no longer closes when a button inside it is pressed with the keyboard (Enter on a focused chip in a Discogs history window, for example) and the button redraws its part of the dialog.

**✨ Improve**

- An edit, editor or tag card that gets MusicBrainz's "Verifying your browser" page instead now says so: open the page once in a tab, then press ⟳.


## 9.99.1392 — 2026-10-20

**🚀 Feature**

- CAA/EAA artwork card: press Space while it shows to see every image, not just the first 12 and a "+N" (Space again goes back to 12). The card cannot scroll, so it shrinks its tiles until it fits the window. Space keeps its usual meaning when nothing is cut off, while you type into a field, and while a link preview card shows.
- CAA/EAA artwork card: hold Shift to draw its tiles bigger (new setting "Tile size in the artwork card while Shift is held", 150 px). This also works when Shift is already down as the pointer reaches the icon, and it combines with Space. The tiles are the thumbnails the card already loads, so this costs no request.
- The same Space and Shift keys work on the artwork cards of the relationship-list covers and of discogs.com's Image column.


## 9.99.1391 — 2026-10-20

**✨ Improve**

- Instrument pages: the IROMBOOK drawing MusicBrainz shows at the top of the sidebar now works like an artist's or label's sidebar picture — a hover card, a click (or Enter/Space) opens it in the artwork viewer, and a small copy leads the page heading on every instrument tab, before and after the table is loaded. The copy shows the whole drawing instead of cropping it, and the viewer bar has no Commons link (a drawing has no Commons page). Same switches: 'Sidebar picture: hover card and viewer' and 'Sidebar picture beside the name'.


## 9.99.1390 — 2026-10-20

**🚀 Feature**

- The "Recording of" and "Performance attributes" columns, so far only on an artist's Recordings page, are now on every list with one recording per row: recording search results, an instrument's Recordings, a series or collection of recordings, an ISRC page, an area's Recordings, a place's Performances, a work's recordings, tagged recordings (yours or everyone's), your rated recordings and an artist credit's recordings. They follow that page's own recording column (Name, Title or Recording) and load only when you click a cell's 🎼 or the header's ▶🎼, as before. A work page and a collection load many rows with one request where that is cheaper; every other page looks up one row per request. Work suggestions stay on the artist's Recordings page, the only list with a single artist. Each page group has its own checkbox under ⚙️ Settings → 🎼 RECORDING OF COLUMN (all on by default), and the first checkbox still turns the columns off everywhere.


## 9.99.1389 — 2026-10-19

**🚀 Feature**

- Tag links get a link preview: hovering any link to a tag page (for example a pill in the "Sidebar" Tags card, or MusicBrainz's own genre and tag lists) shows a card with whether the tag is a genre, how many entities carry it, and how many of each kind. Space opens a window with the counts per kind, each linked to its tag page, and the ten top entities of every kind, which you can click through like any other entity in the window. The card is read from the tag's own page (one request, which the Live page view reuses), because the MusicBrainz web service cannot look up a tag by name. Uses the existing link-preview settings.

**✨ Improve**

- The number on each pill of the "Sidebar" Tags card has a hover card that explains it: the tag's vote total on this entity, where tagging or upvoting adds 1 and a downvote takes 1 away, and MusicBrainz shows a tag only while its total is above 0.


## 9.99.1388 — 2026-10-19

**🐛 Fix**

- Tag pages (/tag/&lt;name&gt;, and an editor's /user/&lt;name&gt;/tag/&lt;name&gt;): "N entities found" stays right under the "Entities tagged as …" heading with the global filter, indented like the sub-section headings, instead of being pushed below the last table.


## 9.99.1387 — 2026-10-19

**🚀 Feature**

- New ⚠️ WARNING "Several Discogs links in Relationships": a Relationships column cell showing two or more different Discogs URLs (a link and the same link with "?…" count once) is tinted with a ⚠️ and listed in the ⚠️ WARNING menu, where one click filters every table to those rows. It is known once the column has loaded, so the count grows while it loads. Two new settings in ⚙️ Settings → ⚠️ FINDINGS turn the finding and its tint on or off.


## 9.99.1386 — 2026-10-19

**✨ Improve**

- The 📊 list of the Relationships column has a new "Relationship icons - Site kind" section: one entry for a site whatever its country or subdomain, so amazon.com, amazon.de and amazon.co.uk are counted together as "amazon.\*". It appears when some site has two or more such hosts; the per-host entries stay.


## 9.99.1385 — 2026-10-19

**✨ Improve**

- The link columns of the Credits/Relationships tables, the event page's tables and the sidebar tables — "URL" (URLs), "Target" (Via release group, Via series) and "Link" (Sidebar: …) — have two new 📊 sections: "Links info - Site", one entry per site with the number of rows linking to it and the same site icon the link shows, and "Links info - Site kind", which counts a site whatever its country or subdomain ("amazon.\*", "bandcamp.\*") when some site has two or more such hosts. Ticking a site marks its address in the link text.


## 9.99.1384 — 2026-10-19

**🐛 Fix**

- The "YouTube Music Lookup" button of the "MBz YouTube Music Lookup" userscript (by @afro) is now removed after the release page's Credits button too, not only after Tracks.


## 9.99.1383 — 2026-10-19

**🐛 Fix**

- Event page: a link in the "URLs" table now shows the site icon the sidebar shows for it, as on the other relationship tables — a review link, for example, had its icon only in the sidebar.


## 9.99.1382 — 2026-10-19

**✨ Improve**

- discogs.com: the 📊 list of a submissions list's "Changed by" column and of a release history's "User" column shows each user's picture after their name, as in the table. A submissions list loads pictures only for rows you have scrolled to, so the list shows the pictures known by then; opening it asks Discogs for none.


## 9.99.1381 — 2026-10-19

**🚀 Feature**

- discogs.com: pointing at a thumbnail in the Image column of a Discogs table shows a card with every image of that release or master — the primary one starred, how many primary and secondary — as the Cover Art column's card does on MusicBrainz. The first time, it is one request to Discogs for that row only (a row you only pass over costs nothing), and the artwork viewer and the link preview then reuse it. New setting ⚙️ Settings → 💿 Discogs → "Image column: all images of a row on hover" (on).


## 9.99.1380 — 2026-10-19

**🐛 Fix**

- discogs.com (and Discogs previews anywhere): with several Discogs tabs open, and above all without a Discogs token, the buttons failed with "HTTP 429 from Discogs" — Discogs allows 25 requests a minute for your whole connection (60 with a token), and each tab spaced only its own requests. All tabs now share one spacing for Discogs' API. When Discogs says the minute's requests are used up, every tab waits a minute and asks again (up to four times; before, one retry 1.5 s later could never succeed), the status line says so, and Stop still stops at once.


## 9.99.1379 — 2026-10-19

**🚀 Feature**

- discogs.com: a user's ratings page (/users/ratings/&lt;name&gt;) gets a "Show all ratings" button: every release the user rated in one table — thumbnail, Artist, Title, Format, Label, Cat\#, Year, Rating (1 to 5, sorted as a number) and Discogs' Data quality, plus the MusicBrainz column when murdos' importer is installed. The rows are read from discogs.com's own pages, 250 a page (Discogs' API has no list of a user's ratings); the sort you chose on the page is kept, and pointing at the button shows how many pages it asks for. A click on a thumbnail opens the artwork viewer, as on the other Discogs pages.
- discogs.com, with murdos' importer installed: the Picard column now shows on every Discogs table whose MusicBrainz column looks up releases — the ratings page too — from the start, not only when MusicBrainz's answers happened to be cached already (so far master and release pages had it, the ratings page never). Opened (▶♪), a row gets its ♪ as soon as MusicBrainz names its release, and the button says which release it sends. Picard is sent the release's MusicBrainz page, not the Discogs page you are on.


## 9.99.1378 — 2026-10-19

**🐛 Fix**

- discogs.com, a list's submissions in Discogs' browser view (the list on the left, a release's history on the right): after "Show all submissions" the page could not be scrolled — only one window's worth of rows was visible, the columns past the right edge were out of reach, and there were no scrollbars. Discogs' own style for that view switches off the window's scrolling (its two panes scroll inside themselves); it is now switched back on for that view only, so the page scrolls down and to the right, and Discogs' panes still work below the table.


## 9.99.1377 — 2026-10-19

**🚀 Feature**

- discogs.com, with the "Import Discogs releases to MusicBrainz" userscript (murdos) installed: every Discogs table whose rows are releases, masters, artists or labels gets a "MusicBrainz" column right after Title or Name — the master's versions, a release's Credits, Companies and Other versions, an artist's discography, a label's releases, a submissions list and a user's lists. Each cell shows, on one line, every MusicBrainz entity linked to that Discogs page (the entity icons that script puts on Discogs' own page only), a yellow search box for each kind without one, a grey icon for an ended link and a count from two links up. A company is first looked for as a MusicBrainz place (a studio, a pressing plant), as that script does. The links come from that script's own cache first (read only, its data is never changed), then from this script's own store, then from MusicBrainz in the background, 100 Discogs links a request, one request a second; a header button (▶ MB) shows the progress and asks again for failed rows, and so does a click on a failed row's ⚠. Settings: "MusicBrainz column (with the Discogs importer userscript)" and "MusicBrainz column: look up missing rows automatically", both on. Without that userscript nothing changes. Mockup: https://claude.ai/artifact/6CmnUoNf4LHd44yxvp3rvu
- 📊 dropdown on that column: a "MusicBrainz - Links" section with the number of MusicBrainz links per row (» MB links: 0, 1, 2, …) and, while rows are still looked up or failed, "pending" and "error"; a ticked entry rings the matched icons and keeps up as answers arrive.


## 9.99.1376 — 2026-10-19

**🐛 Fix**

- Tag pages (/tag/&lt;tag&gt;, /user/&lt;name&gt;/tag/&lt;tag&gt;) whose first section is Artists: the Release groups, Releases and Recordings tables were missing their "Artist" header, so every header from the second column on stood over the wrong column ("MB-Name" over the artist, "Comment" over the title, …), and the cover art card showed the artist as the title and no artist line.
- Tag pages, including a single entity's (/tag/&lt;tag&gt;/release-group, …): the Comment column of a release group, release or recording no longer shows its artist's disambiguation ("Back in Black by AC/DC (Australian hard rock band)" had "Australian hard rock band" as Comment). Only the entity's own comment shows there.


## 9.99.1375 — 2026-10-18

**🚀 Feature**

- discogs.com: a user's page (/user/&lt;name&gt;) gets buttons for their Submissions (as Releases, Artists and Labels), Contributions, Collection and Wantlist, read from Discogs' API, no token needed. A button shows only when the page counts that list, so an empty or private one has none.
- Every link in a Discogs preview window now opens in that same window, with ← Back (Backspace, Alt+←): releases, masters, artists and labels as before, and now users, Discogs searches, support.discogs.com guidelines and other sites too, also in the history window.
- Link previews: a Discogs user shows their public profile (name, location, member since, rank, contributions, collection and wantlist sizes) and, in the window, their Recent activity from their page. A Discogs search shows its results, 25 at a time with "Load 25 more", each one a link. A support.discogs.com guideline opens as the article, scrolled to the section the link names (e.g. §6.12.2) and marked.
- In the edit history, Discogs' separate View and Changes links became one "View changes" button: it shows that revision's changes in the second section ("Change · revision 8 → 10", Discogs' own numbers), and "Back to the latest change" returns. One request per revision, only on the click.

**🐛 Fix**

- discogs.com: a release's history page (/release/&lt;id&gt;/history, also with ?diff=N) gets "Show the changes and the diff": a Changes sub-table (date and time apart, user, action, notes, revision, "View changes") and a Diff sub-table of the revision the page shows (each part of the release, old and new, marked where Discogs marked it). A plain click on "View changes" opens the preview window on that revision's changes.
- A user's picture: pointing at it shows a card with the picture at its largest (500 px, the largest Discogs serves); a click opens it in the artwork viewer.
- Discogs users' own pictures before their names: in a history (page and window) from the page itself, in a submissions list's "Changed by" from their profile — one request per user whose row comes on screen, one at a time, kept like every preview.
- Discogs pages, 📊 dropdown: a release's Credits column gets a "Credit details - Role" section (each Discogs role: Backing Vocals, Guitar, Producer …) and its "\[…\]" modifiers the Attribute section, as MusicBrainz's Instruments column; Cat\# gets MusicBrainz's Catalog\# treatment (several numbers one row each, collapsible, the "Catalog info" sections); Year gets the Date column's sections (Decade, Year).
- Discogs pages: date and time as separate columns, as on MusicBrainz's pages — a submissions list's Changed, and a user's lists' Added and Last changed (the release's dates: when it entered Discogs and when anyone last changed it; the user's own edit date is only in the release's history). The date columns get the Date info sections, the time columns "Time info - Time of day".
- A Discogs search's results with pictures (artists, with a token) now open in the window too, with Back.
- A Discogs release history's Diff table and a user's Artists and Labels tables no longer get two extra cells without a header: the date/time split of another sub-table ran on them.
- On Discogs' older pages (a submissions list, a user's page) the column filter fields no longer run past their columns: Discogs' own stylesheet made them wider by their padding.
- A user's Submissions: one sub-table per kind (Releases, Artists, Labels), whatever page of the list a row came from; they were split into a new sub-table each time the kind changed from one page to the next.
- On a Discogs submissions page the Matched artist column links Discogs' artist search, as the Artist column does, so it gets the preview and opens in the window (Discogs links it by name only).
- On the Discogs pages a plain click on a link in our tables (a title, an artist or label search) no longer leaves the page through the "You are about to leave this page" question: it opens the preview window, and Ctrl/⌘-click a new tab. With link previews off, every such link opens a new tab. Mockup: https://claude.ai/artifact/XRTM8v1aLNj3voVt6RxVJz


## 9.99.1374 — 2026-10-18

**🚀 Feature**

- discogs.com: a list's submissions page (e.g. Submissions from List, /submissions?mode=list&id=…) gets a "Show all submissions" button, in the flat view and in the browser view. It reads every page of the list from discogs.com itself (100 a page; pointing at the button shows how many) into one filterable, sortable table: Artist, Title, Changed by, Changed (date and time; the "6 minutes ago" on hover), Matched artist (the list's artist the release matched) and History. Behind the same "Enable on discogs.com" setting. On these pages our section sits at the very top, above Discogs' header.
- Link previews: a release's edit history. A link to a Discogs release's history page (on discogs.com or on MusicBrainz) gets a card with the last change, how many changes and the data quality, and a window with every change: date, user, what it was (Submit Release, Edit Release, Images, Merge Pending, comments …), the note, and Discogs' own View / Changes / Images links. Filter by kind, newest or oldest first. Below, the latest change as Discogs shows it, old and new side by side with the changes marked: only the parts that changed, or the whole release. The history is read only when you press Space, never on a mere hover; on discogs.com with your own Discogs session.
- On a submissions page, a release title's window opens with its edit history, then the release as on every Discogs page. Once read, the title's card also shows the last change.
- Discogs pages: a click on a thumbnail now opens the artwork viewer on that row's images at full size, all of them (a master's own images for a master). The thumbnail shows at once with "Loading the full size…"; the full images replace it when Discogs' answer arrives, one request per row and only for the rows you look at. A release you already previewed costs nothing. ← → step through the row's images, Shift+← → through the rows. If Discogs does not answer, the viewer says why and offers "Try again". Mockup: https://claude.ai/artifact/Y69bUJTvYSksKTFRMcYJvZ


## 9.99.1373 — 2026-10-18

**🚀 Feature**

- discogs.com: with the new setting "Enable on discogs.com" (⚙️ Settings → 💿 Discogs, off by default), a master, release, artist or label page on discogs.com gets a section of its own above Discogs' page, with the toolbar and filterable, sortable tables. Master: all its versions, the main release marked ★. Release: Tracklist, Credits, Companies, Barcode and Other Identifiers, and Other versions. Artist: the whole discography, one sub-table per Discogs role (Releases, the producer credits, Appearances, Track appearances, Unofficial). Label: the newest 500, 1,000 or 5,000 releases, the oldest 500 or 1,000, or all of them. Every list has a thumbnail column.
- The rows come from Discogs' API through the same readers as the link previews, 100 a request: a request every 2.5 seconds, or every second with your Discogs token. Pointing at a button shows what it costs, and more than 50 pages asks first, as on MusicBrainz.
- On these pages titles link their Discogs pages, a track's credits are one row each with their names linked (a long list collapses), and artists and labels, which Discogs' lists name without saying which one, link Discogs' search. A click on a thumbnail opens the artwork viewer. The section starts at the window's left edge and grows with its widest table; scrolled sideways, the toolbar and the bars stay in view.
- Link previews on discogs.com: with "Preview external links on hover" on, a Discogs link in the table or in the page's content gets the same card and window as on MusicBrainz. Mockup: https://claude.ai/artifact/KTtCM7SaYVHZDaQdNqjUAK

**✨ Improve**

- The "High Page Count" question on another site (the Springsteen sites, Discogs) now says "This list has N pages" instead of calling it a MusicBrainz entity.


## 9.99.1372 — 2026-10-18

**🚀 Feature**

- Link previews: a link to a Discogs artist or label now opens a full window, as release and master links already do. It shows the profile with its links, every image (the ones behind Discogs' "More images" too), the names (groups, aliases, name variations, or the parent label and sublabels), the sites, and a label's contact info.
- Discogs artist window: the Discography, split as on Discogs into Releases, Appearances (on releases, on tracks), Unofficial and Credits. Each section is a table you can close, sort and filter (also by Masters / Releases). The first 100 entries come when the window opens; "Load the other …" brings the rest one page after the other, with a bar, Stop, and a retry for a failed page. Discogs lists the discography by role, so a count reads "so far" until its section is complete. Credits shows what Discogs' API has (the production credits) and links the full list on Discogs. A master's "▸ versions" shows its first 12 versions in place. Tables show 150 rows, then "Show 500 more" or "Show all".
- Discogs label window: the label's releases, newest or oldest first, 5 pages (500 releases) per "Load 5 more pages", since a large label has thousands (Columbia: 396,611). The window says what loading them all would cost. A filter and format chips work on what is loaded.
- Every list is kept for 7 days, like the card: a later window shows it without asking Discogs again. A card never asks for a list. Mockup: https://claude.ai/artifact/WuBNbFTgNHJtxip4xBv6yc


## 9.99.1371 — 2026-10-17

**🐛 Fix**

- Sidebar cards: in the Search card, sites no longer run out of their column into the next one, and a name is no longer broken in two ("Web \| pages"). Each section (By genre, Lyrics, By area, …) is now a box of its own: the groups' names (Classical, Japan, …) form a column on the left, and their sites wrap beside them, each in one piece with its icon. Search the web is one row.


## 9.99.1370 — 2026-10-17

**✨ Improve**

- Sidebar cards: every card now starts open except Search, the long list of search links "mb. ALL LINKS" adds. The setting "… cards that start open" has the new choice "Every card but Search" as its default; if you had kept the old default (only the information card), you get the new one; any other choice you made stays.


## 9.99.1369 — 2026-10-17

**✨ Improve**

- Sidebar cards and the Sidebar tables: each link shows the same site icon in front of its name as the real sidebar (Discogs, AllMusic, Wikidata, …, and the search sites of "mb. ALL LINKS"). In the Credits and Relationships views the URL rows of the relationship tables (a release's own links and its release group's) show it too. Nothing is loaded for it: the page shows these icons already.


## 9.99.1368 — 2026-10-17

**✨ Improve**

- Discogs link previews: in the window every artist, label and company is a link to its Discogs page — in the facts, the credits, the track credits and "Companies, etc.". A click shows that page in the same window, and Back returns. The window's title says what the link is ("Discogs release", "Discogs master", "Discogs artist", "Discogs label"), and after such a click the path, for example "Discogs master › Discogs release"; card and window say it under the title too ("Discogs · master release"). In a master's list of versions, a version's label links Discogs' label search for that name (Discogs gives the versions' labels by name only), in a new tab.


## 9.99.1367 — 2026-10-17

**🚀 Feature**

- Discogs link previews: the window (Space) now shows what the Discogs page shows. For a release and a master: every image (a click opens the artwork viewer), the tracklist with each track's credits (closed at first; "Show all track credits" opens them all) and the notes. For a release also "Companies, etc.", the credits with the tracks they cover, "Barcode and Other Identifiers", the videos, and how many Discogs users have or want it and its data quality. All of it comes in the answer the card already asks for: no extra request. Each heading opens and closes its section. A release's card adds one line saying what its window holds. Mockup: https://claude.ai/artifact/49tucEnfghTCMtyvwN6qaM.
- Discogs master previews: the window lists the master's versions. Discogs sends them 100 at a time, so the window asks for the first 100 when it opens and the rest only when you press "Load the other …", which says how many requests that takes and about how long; "Stop" lets the page under way finish. A bar shows each hundred (from the cache, loaded, failed), a failed page gets its own retry button, and pages already read come from the cache next time. Filter by typing or by the format, country and decade chips, sort by a column heading; the main release and a release this page links are marked. A click on a version shows it in the same window, and Back returns to the master. A card never asks for versions.

**🐛 Fix**

- Preview windows: typing in a field inside the window no longer loses the focus when the window redraws under a resting mouse pointer.


## 9.99.1366 — 2026-10-17

**🐛 Fix**

- Preview windows, Live page: the page is trimmed to its content as soon as its text has arrived, instead of after its last picture. On a slow site the menus, header and footer used to show for as long as the pictures took, and a Brucebase date link's year page (260 pictures) was neither marked nor scrolled to the show until then. It is now scrolled to the show at once, and again once the pictures above it have pushed it down, unless you have scrolled the page yourself by then.


## 9.99.1365 — 2026-10-17

**✨ Improve**

- Event pages (for example a place's Events): the card of an event image, in the big-picture strip or as an inline thumbnail, lists the line-up one artist per line, each with its role, instead of one long comma-separated paragraph.


## 9.99.1364 — 2026-10-17

**🐛 Fix**

- Sidebar cards: with jesus2099's "mb. ALL LINKS" installed, a release page showed two dozen cards all named "Search in the whitelist" or "Search further", each link two or three times, and chips with hundreds of characters of run-together text after them ("DRAM By genreClassicalEletronicPsyDB…"). Each list the script nests inside another one was read as a card of its own, and an item's text included everything listed under it. Now only a section's outer list is a card, and a link's chip shows only the link itself: text another script puts next to it ("edit", "choose languages") is left out, and a link listed under it (the Wikipedia article under a Wikidata link) is a small "› en" link after it. The same applies to the Sidebar tables of the Credits/Relationships view and to "Sidebar as tables".

**✨ Improve**

- Sidebar cards: the script's "Search the web", "Search in the whitelist" and "Search further" lists are one "Search" card, closed at first: an index of each section (By genre, By area, …), its groups in italics and their sites, flowing into as many columns as the width allows. Variants of one site are one entry ("Prog Archives (barcode, name)"), and sections with nothing for this kind of page are named once at the foot. A switch shows one list at a time, and a box finds a site by name, variant, section or group (Esc empties it). Pointing at a link shows its site and full address, also the site behind the script's forwarding page; with link previews on, that box sits above the preview card instead of beside it. In the tables the same links are one "Sidebar: Search" table with the list, section and group of each link.
- Sidebar cards: the facts cards (information, labels, release events) are a column on the left with the link cards beside them, so the section is about as tall as the taller of the two; in a narrow window they stack. The cards have the Liner-notes look: warm paper, hairline rules, small-caps headings. Mockup: https://claude.ai/artifact/V9Pqx5r7K37Qe3PEm93cpc.


## 9.99.1363 — 2026-10-17

**✨ Improve**

- Relationships column: hovering an icon now says what it is (the site, MusicBrainz's relationship type, the full URL) instead of the bare URL. While a filter matches the cell, a box above it lists all the row's links with the filter's marks and marks the icon you point at. The two boxes sit one under the other instead of side by side. With link previews on, the icons get the link's preview card too, with these boxes above it.
- A cover icon in a relationship list (for example "includes:" in a release group's Relationships section) shows the release's artwork card on hover, and a click opens the artwork viewer on its images instead of leaving the page.

**🐛 Fix**

- A click on an image of the big-picture strip above a table opens the artwork viewer instead of asking "You are about to leave this page". The same question no longer comes up for a Ctrl-click or Shift-click, which opens a new tab or window and loses nothing.


## 9.99.1362 — 2026-10-17

**✨ Improve**

- Tooltips that compare two values now show them one under the other and mark only what differs, down to a single letter, an apostrophe ' against ’, or a hyphen ‐ against -. A line under them says in plain words what differs ("1 letter in a different case: w → W", "Only in the recording name: (single version)", "Same words in a different order."). This covers the track/recording name note above a recording's preview card, its badge in the pinned window, and the Title cell's "Track name differs from recording name" warning, which now names both names.
- The same view for the findings that compare two values: Recorded at event and Recorded at place against the recording comment, the release group title against a main-event track, and the Recording date against the comment's date (both dates are now named in the tooltip).
- Track and recording length mismatch: the tooltip shows the hovered cell's length over the other one, digits aligned and the differing ones marked, with the gap as an amber (⚠️) or red (❌) label. Kept through Save to Disk and Load from Disk.
- Titles shown in MusicBrainz style on the Springsteen sites: the tooltip shows the site's text above the title as shown, with the changed letters and marks marked.


## 9.99.1361 — 2026-10-17

**🐛 Fix**

- CAA/EAA column: on large pages the type letters (F B Sp M Bk T) no longer drop to a second line while the artwork is still loading. The column resize ran before most artwork had arrived and sized the column to its header; it now reserves the width of a fully loaded line (icon, count, every type letter with a repeat count) from the start, for the page-wide and the per-sub-table resize.


## 9.99.1360 — 2026-10-16

**✨ Improve**

- Release tracklist with the "ISRC Scout" userscript (by majkinetor): its "ISRC" column now works like the "ISRCs" column. One code per line, the column collapses like the other multi-row columns, codes are shown as CC-XXX-YY-NNNNN with ⚠️ on an invalid one, and the 📊 dropdown has the ISRC Country/Registrant/Year/Designation/Validity sections and the "Invalid ISRC format" warning.
- Release tracklist with "ISRC Scout": its "Links" column can be filtered by platform. Type a platform name ("Spotify") into its filter, or tick one in the new 📊 section "Links info - Platform" (one entry per platform, with its row count and icon); the matching icons are outlined. The number beside 📊 now counts the different platform sets instead of the "2"/"3" link-count badges.
- Release tracklist with "ISRC Scout" and jesus2099's "SUPER MIND CONTROL": the "Links" icons no longer wrap onto a second line. SUPER MIND CONTROL adds a red new-window marker and extra space to every link that opens in a new tab; it is left off these icons, which all open an outside page anyway.


## 9.99.1359 — 2026-10-16

**✨ Improve**

- Link previews: every note about the hovered link and its cell (pending edits, track name differs from recording name, no work linked, the artist's or label's sort name, …) is now stacked above the preview card, one box each, instead of covering the card or being covered by it. Neither the browser's own tooltip nor the cell's "Liner notes" card appears over the card any more; the cell's card comes back once the preview closes.
- Link previews: the card and the Space window show MusicBrainz's own entity glyph in front of the name and in front of the kind ("Recording").


## 9.99.1358 — 2026-10-16

**✨ Improve**

- Annotation history pages show the Editor column first, before Old and New, so the column that stays visible when you scroll sideways is now also the leftmost one. The Old/New radios and "Compare versions" work as before.


## 9.99.1357 — 2026-10-16

**🐛 Fix**

- With sticky page headers on, a table with two or more columns before its sticky column (e.g. Old and New before Editor on Annotation history) no longer shows a white strip over the right edge of the first of them that cut off its 📊 button and filter clear button.


## 9.99.1356 — 2026-10-15

**✨ Improve**

- After "Show all Tracks for Release", the "Sidebar" cards (9.99.1354) open the release's Additional details, Labels and Release events cards too, next to Release information; external links and tags still start closed. Every other page still opens only its first information card. Setting: "… on a release: also Additional details, Labels and Release events" (on), which applies while "… cards that start open" is at Information card.


## 9.99.1355 — 2026-10-15

**🚀 Feature**

- Settings with a fixed set of choices are now a row of buttons, one per choice, instead of a text box or a pair of checkboxes (needs VZ\_MBLibrary 4.4.0). Click one, or use the arrow keys; the Default column names the default choice and the tooltip lists them all. Converted: "Expanded CAA/EAA cell layout" (Grid / Grouped / List), "Viewer: image background" (Dark / Light / Checker), "Viewer: move a zoomed image by", "Artwork viewer image size", and the small and big CAA/EAA image fetch sizes (250 / 500 / 1200 px, which used to accept any number and so could ask the archive for a size it does not have). Your current values are kept. A configuration file with a value that is none of the choices now has that value refused on 📂 Load, like a bad number.


## 9.99.1354 — 2026-10-15

**✨ Improve**

- The "Sidebar" cards (9.99.1352) now start with only the first information card open (Artist information, Release information, …); the others start closed and show ▶ before their title. Ctrl+Click (Cmd+Click) on any card's title opens or closes every card at once, following the one you clicked; a plain click still opens or closes just that card. Hovering a card's title shows what it holds, how many entries, and how it folds. Setting: "… cards that start open" (No card / Information card / Every card; default: Information card).


## 9.99.1353 — 2026-10-15

**✨ Improve**

- The "🗂 Sidebar as tables" button is now off by default: the two new views (9.99.1351, 9.99.1352) show the same information beside the page's own data. Turn it back on with "'Sidebar as tables' button" in ⚙️ Settings; if you had it on because it was the default, it is switched off once.


## 9.99.1352 — 2026-10-15

**🚀 Feature**

- After the page's own button (Tracks, Releases, Artist RGs, …) a "Sidebar" heading now follows the Credits or Relationships section (on a page without one: right above the table). It shows the sidebar's information, labels, release events, external links and tags as small read-only cards: facts as name → value lines side by side, links as chips grouped by kind, tags as pills with their votes. Each card closes on its own. Nothing is loaded. Settings: "Sidebar facts below Credits/Relationships" (on) and "… start the 'Sidebar' section closed" (off).


## 9.99.1351 — 2026-10-15

**🚀 Feature**

- The Credits and Relationships views (and the place, area and instrument pages) now end with the sidebar's groups as tables of their own: "Sidebar: Release information", "Sidebar: Additional details", "Sidebar: Labels", "Sidebar: Release events", "Sidebar: External links", "Sidebar: Tags". They share the heading's filter and can be sorted and filtered like the relationship tables. A sidebar link that is already a relationship row is left out. Settings: "Sidebar tables in the Credits/Relationships view", "… skip links already in a relationship table", "… include external links", "… include tags" (all on).


## 9.99.1350 — 2026-10-15

**🐛 Fix**

- Release "Credits" tables: the "Via release group" table again shows each release group as a "Release group" with its name in Target, our inline cover art and the big-image strip. jesus2099's "mb. SUPER MIND CONTROL" puts a small cover-art link in front of every release-group link. When it had done so before the table was built, that link was taken as the target: the row read "Release", the group's name moved to an extra Details column, a Picard column appeared, and no artwork was shown. Such an icon link is now skipped (also on the event page, which shares the parser).


## 9.99.1349 — 2026-10-14

**✨ Improve**

- Instrument icons from the userscript "MusicBrainz: Instrument Icons Everywhere" (by Lotheric) are now also kept, counted and filterable when that script is set to show them AFTER the instrument name (its new 2026-10-12.2140 option): the 📊 "Instrument info - Icon" section shows "🎻 with instrument icon" again, "» instrument:" entries carry their icon, a copied icon stays on the side the script put it, and an icon that loads after the table is built reaches the underlying rows on multi-table pages too.


## 9.99.1348 — 2026-10-14

**🐛 Fix**

- On a phone, the sidebar's ▶/◀ handle stays inside what the screen shows: MusicBrainz lays its pages out like a desktop page there, and the handle sat at the right edge of the whole page, out of sight and impossible to tap.

**📝 Docs**

- Tests: tests/fixtures/sidebar-collapse-handle.mobile.spec.js (1); two popup-ext.spec.js checks of a Live page now wait for the frame to be set up, column-filter-modes.spec.js compares settled column widths, and a popup-mb area chain and a sticky-page-headers sidebar check wait for the page to settle (timing failures under a full run). Mutations: 2 more in scripts/mutations/sidebar-overhaul.json (1 caught, 1 recorded as untestable: a pinch-zoom), 1 in column-filter-modes.json, caught; 3 stale anchors in scripts/mutations/sticky-page-headers.json repointed, all caught again, and the 43 left in 22 other lists repointed too (scripts/check-mutation-anchors.py: 0 bad). A fixture load no longer waits on a coverartarchive.org thumbnail in the saved page, which redirects to archive.org where no route can block it: tests/support/loadPage.js blocks the art archives' images while the page loads (fixture-load-no-archive-org-wait.spec.js, 2 more tests; 2 mutations in fixture-archive-org.json, caught).


## 9.99.1347 — 2026-10-14

**🐛 Fix**

- On a page wider than the window (a release group's releases, for example), opening the sidebar with its handle shows it at the window's right edge at once. Before, its content stayed out of view and only slid in while you scrolled right.

**✨ Improve**

- The sidebar's ▶/◀ handle sits at the top of the sidebar instead of halfway down the window, and lines up with the sidebar's edge once it has finished sliding.

**📝 Docs**

- Tests: tests/fixtures/sidebar-collapse-handle.spec.js (3); 3 more mutations in scripts/mutations/sidebar-overhaul.json, all caught.


## 9.99.1346 — 2026-10-14

**🐛 Fix**

- Sorted column headers no longer let table text show through while you scroll. On brucespringsteen.it, springsteenlyrics.com, jungleland.it and Brucebase, the header of a sorted non-sticky column (every sorted column after a multi-column sort) was partly transparent, so the rows scrolling under the pinned header showed through it ("gatefold" under "Notes"). The pinned header now has a solid background behind its sort colour.
- jungleland.it: with the pointer resting on the list, its rows no longer cover the toolbar, the status line and the Bootlegs bar pinned at the top of the window.


## 9.99.1345 — 2026-10-14

**🐛 Fix**

- Wide MusicBrainz pages: the collapsed sidebar no longer keeps an invisible strip about 80–120 px wide at the right end of the page. Because of that strip, every pinned h2/h3 bar stopped well short of the window's right edge, rows showed through the gap while the bars were pinned at the top, and the page could scroll past the end of the table. A collapsed sidebar now takes no space at all (it still slides in and out).
- Wide tables now end on the same line as the h2/h3 bars above them, at every horizontal scroll position, instead of running on to the window's right edge. The bars must stay a few pixels narrower than the window to remain pinned; the table, its pinned column headers included, is now cut off at that line too, so no row text shows beside a bar pinned at the top either.


## 9.99.1344 — 2026-10-14

**✨ Improve**

- The "🗂 Sidebar as tables" button (9.99.1342) is also on release, series, place, area and instrument pages. On a release it also shows the additional details, the labels with their catalog numbers, the release events and the release group's external links, each as its own table. Place, area and instrument pages keep the button with 'Relationships as tables' switched off.

**🐛 Fix**

- A saved "Sidebar as tables" view loads back from disk as the same tables, instead of as the page's own table.
- On a page whose header line (the buttons and the status messages) ran just past the window's edge, for example a release group after filtering, the page no longer jumps back and forth several times a second: the sticky page headers switched on and off in a loop.

**📝 Docs**

- Tests: 8 more in tests/fixtures/sidebar-tables.spec.js, on the release, series, place, area and instrument captures; 9 more mutations in scripts/mutations/sidebar-overhaul.json, all caught. Merged main (9.99.1339) into the branch first: the Sidebar button now runs through main's replaceFeatures and button type (DEBUG-NOTES.md 2026-10-14).


## 9.99.1343 — 2026-10-14

**🚀 Feature**

- The link previews of an artist, a label or a place show its picture: when Space opens the window, it shows the Wikimedia Commons file MusicBrainz links as the entity's image or logo, else the one its Wikidata item names (one or two small requests to Wikidata, a label's logo first). Click it for the artwork viewer, with Open on Commons. A hover never asks for it; once known, the card shows it small beside the facts, also after a reload. New setting: Pictures in artist, label and place previews.

**✨ Improve**

- The sidebar picture (9.99.1341) also works with MusicBrainz's own Commons picture, should MusicBrainz switch it back on: today musicbrainz.org shows none, and the picture there comes from another userscript.

**📝 Docs**

- Tests: tests/fixtures/pop-mb-image.spec.js (8) and its mobile twin (1), one more sidebar-picture test; 11 more mutations, all caught. Probe: scripts/probe-wikidata-image.py (DEBUG-NOTES.md 2026-10-11).


## 9.99.1342 — 2026-10-14

**🚀 Feature**

- New "🗂 Sidebar as tables" button on artist, label, event, release group, recording and work pages: it shows the sidebar's information, external links (with site and kind) and tags (genre or tag, with votes) as tables you can filter, sort and use the 📊 dropdown on. It reads the page itself, so nothing is loaded, and the sidebar stays as it is. New setting: 'Sidebar as tables' button.

**📝 Docs**

- Tests: tests/fixtures/sidebar-tables.spec.js (5); 7 more mutations, 6 caught and 1 recorded as covered by another guard.
- Probes: MusicBrainz's commons-image endpoint answers scripts with a browser check and a browser with no picture even where the sidebar shows one (MusicBrainz has its Commons pictures switched off), so the picture in the entity hover card takes another route (9.99.1343; DEBUG-NOTES.md 2026-10-11). Measured: the sidebar part of a render takes about 1.2 ms (tests/MEASUREMENTS.org).


## 9.99.1341 — 2026-10-14

**🚀 Feature**

- The picture MusicBrainz shows at the top of the sidebar (an artist's photo, a label's logo, from Wikimedia Commons) now shows a card with its file name when you point at it and opens in the artwork viewer on a click, Enter or Space, with an Open on Commons link. A small copy sits at the start of the page heading, so it stays in sight with the sidebar closed. Nothing extra is loaded. New settings: Sidebar picture: hover card and viewer, Sidebar picture beside the name.

**📝 Docs**

- Tests: tests/fixtures/sidebar-picture.spec.js (5) and its mobile twin (1); 7 more mutations, all caught.


## 9.99.1340 — 2026-10-14

**✨ Improve**

- The MusicBrainz sidebar remembers which sections you opened: after a table is shown, a section you opened before is open again on the same kind of page, and one you never opened starts closed. Each heading shows how many entries it holds, works with Enter and Space, and Ctrl+Click opens or closes every sidebar section. Open all / Close all sit at the top of the sidebar.
- External links in the sidebar are grouped by kind (Official, Social, Streaming, Concerts, Lyrics, Databases, Stores, Other), each group opening and closing on its own; Genres / Other tags and the Collections lists open and close on their own too. Links are only reordered, never moved, and whatever other userscripts add stays where it is. New settings: Remember open sidebar sections, Open every sidebar section, Sidebar section counts, Group external links by kind.

**🐛 Fix**

- Closing "Artist information" in the sidebar no longer hides the Tags section below it (MusicBrainz wraps Tags in its own element, which was taken as part of the section above).

**📝 Docs**

- New docs/claude/sidebar.md. Tests: tests/fixtures/sidebar-sections.spec.js (8) and its mobile twin (1); 12 mutations, all caught.


## 9.99.1339 — 2026-10-13

**🐛 Fix**

- Pages with sub-tables: a global filter that matches nothing no longer hides every sub-table. When it would empty all of them, they all stay on screen showing "(0 of N)", as before 9.99.1338, so the buttons in their column headers stay reachable. Example: on a release, "11.666" typed into the global filter while lengths are shown in seconds hid the only medium, and with it the ⏱ button that switches to the milliseconds that would have matched. Sub-tables are still hidden while at least one keeps a matching row.


## 9.99.1338 — 2026-10-13

**🚀 Feature**

- Pages with sub-tables: while the global filter or a ⚠️ WARNING / ❌ ERROR menu filter is active, a sub-table with no matching row is hidden, heading line and table together, instead of staying on screen as "(0 of N)". Widen or clear the filter and it comes back as it was, collapsed or expanded, with its artwork strip as you left it. A sub-table with its own filter (a column filter, its 🔍 sub-table filter or its ⏳ toggle) stays visible even when empty, so that filter can still be reached. The row-count tooltip in the page heading says how many sub-tables are hidden. Setting: "Hide Empty Sub-tables While Filtering" (🎨 TABLE FILTER CONFIGURATION, on by default).


## 9.99.1337 — 2026-10-13

**✨ Improve**

- springsteenlyrics.com, jungleland.it, brucespringsteen.it and Brucebase tables: titles get typographic punctuation instead of the keyboard characters — ’ for an apostrophe ("Don’t", "Comin’", "Rock ’n’ Roll", "Spirit of ’76"), “double” and ‘single’ quotation marks, … for "...", — for "--", an en dash for a range ("1975–1985") and a medley's " – ", a hyphen ‐ between words ("Freeze‐Out") and inside a date ("1999‐08‐12"), ″ for inches and × between two numbers. Brucebase Relations names get the same ("D’Angelo"). A setting of its own, "Write typographic punctuation in titles" (on by default): a column filter has to be typed with the same characters, so "don't" no longer finds "Don’t".


## 9.99.1336 — 2026-10-13

**✨ Improve**

- springsteenlyrics.com, jungleland.it, brucespringsteen.it and Brucebase tables: titles are written the way MusicBrainz writes English titles instead of each site's own way — "BORN IN THE USA" and "Born In The U.S.A." become "Born in the USA" and "Born in the U.S.A.", brucespringsteen.it's "BOSS AT HIS BEST (THE)" becomes "The Boss at His Best", jungleland.it's "(Version 2)" becomes "(version 2)". On springsteenlyrics.com this covers the collection, bootleg and CD/vinyl bootleg titles and the lyrics index; on Brucebase the song list and, on a year page, the Venue, City and Country columns (a country of "USA" stays as it is) and every song of Soundcheck and Setlist; notes such as "(with Patti Scialfa)", set labels and bold or italic songs stay as they are. Acronyms (USA, NJ, MTV, PNC, U.S.A.) keep their capitals, and a placeholder such as "\[no title\]" stays as written. Only capital letters change, and a cell that changed shows the site's own text when you rest the pointer on it. New setting "Write titles in MusicBrainz style" (on by default).


## 9.99.1335 — 2026-10-13

**🚀 Feature**

- Brucebase "Relations" (brucebase.wikidot.com/stats:relations): "Show all relations" turns the 28 letter tabs into one filterable, sortable table of the 2,892 people and bands — Name ("Bryan Adams", "The Alliance Singers"), Sort name as the site lists it ("Adams, Bryan"), Type (Person or Band) and Letter.
- Brucebase "Recent changes" (brucebase.wikidot.com/system:recent-changes): three buttons load the last 200, 1,000 or 5,000 changes of the wiki — always 200 per page, whatever the site's own list shows — into one table: Page, Category, Flags (one row per flag with its meaning: new page, source changed, tags changed, file action, …), Date and Time (in your own time zone), Revision, User and Comment. Date is split into day, month, year, weekday and month name like on MusicBrainz pages, and Date and Time get the same 📊 sections as there (Date info - Year, Month, Weekday, …; Time info - Time of day). The site's own form still decides which kinds of change and which category are loaded. Both pages come with "Enable on the Brucebase song list".


## 9.99.1334 — 2026-10-13

**🚀 Feature**

- URL pages (musicbrainz.org/url/&lt;mbid&gt;) get "Show all Relationships for URL": the entities that link the URL, by relationship, as tables — the same relationship tables as on place, area and instrument pages. "URL details" stays as MusicBrainz shows it.

**✨ Improve**

- 📊 dropdown: a new "Entity info - Type" section on the Target and Type columns of a relationship table that mixes kinds ("Via …" tables, the one-table layout, the event page): one entry per kind of related entity — Artist, Release group, Event, Series, URL, … — with its MusicBrainz glyph and the number of rows of that kind. Ticking one leaves only those rows.


## 9.99.1333 — 2026-10-13

**✨ Improve**

- Relationships as tables: a primary alias — the name MusicBrainz adds in parentheses for an entity named in another script, "フジパシフィックミュージック (Fujipacific Music, Inc.)" — gets its own "Primary alias" column instead of landing in Disambiguation.
- Relationships as tables: an artist's membership with a period and what was played — "(from 1964-12 until 1965-06: lead vocals, electric guitar)" — now fills Begin and End (with their day/month/year parts) and a multi-row Credits cell, instead of one Credits cell holding the date too.
- Relationships as tables: Genre and Instrument columns show their glyph once in the header, like the other single-kind columns.
- Relationships as tables: with inline CAA/EAA thumbnails on, a release group or release gets its small cover image before its name and an event its event art image — also in a mixed Target column, each row the picture that fits it.
- Event pages: the relationship tables get the same Begin/End (and their date parts) and Number/Order columns, and read primary aliases and ended URL relationships the same way. A series position such as "(order: 150)" is now Number instead of Details.

**🐛 Fix**

- Relationships as tables, area pages: with "MusicBrainz More Flags Everywhere" installed, an area's parent chain ("Alabama" → "United States") went into a Details column for most rows, and the target kept a trailing comma; it is in Parent area again, and Details is gone.


## 9.99.1332 — 2026-10-13

**🚀 Feature**

- Relationships as tables beyond the event page: place, area and instrument pages get a "Show all Relationships" button (three new page types), and series, work, release group and recording pages, and the artist and label Relationships tab, get one beside their own "Show all…" button (on the Relationships tab it reads "Relationship lists", on a release "Credits"). It turns the native relationship lists into filterable, sortable tables, one per kind of related entity (Artists, Labels, Places, URLs, …), with the same converter as the event page. The page's own button is unchanged and still leaves those lists as a collapsible section; the two are either/or, so the new button leaves the page's main table out of its render (press the other button to get it back).
- A recording's "Related works" and a release's release-group credits each get a "Via …" table ("Via Badlands", "Via release group: Live/1975–85") with a Type column, so the work's or group's relationships are never mistaken for the page's own. A release's credits are read from its own two blocks only, never from the per-medium track credits MusicBrainz adds there in its "Display credits at bottom" layout.
- Dates become Begin and End columns: "(from 1977-06-27 until 1978-05-05)", "(in 1978)", "(on 1978-04-11)", "(until 1931)", "(… to present)", "(ended)", and both are split into B-/E- day, month, year, weekday and month name. A series position becomes Number, or Number and Order when the two differ for some row ("(on 2009-02-01: number: 43) (order: 19)"). An area's parent areas get their own column, and an ended URL relationship, which MusicBrainz shows without a link, is still a URL row with its end date.
- Settings: a new "🔗 RELATIONSHIP SECTIONS" group — "Relationships as tables" (on), "One table for all relationships" (off), "Include related works / the release group" (on). A file saved from one of these renders loads back as that render on the same page.

**🐛 Fix**

- Picard column: a table only gets one when it links to a MusicBrainz release. A URL relationship such as discogs.com/release/… or rateyourmusic.com/release/… no longer counts as one.


## 9.99.1331 — 2026-10-13

**🐛 Fix**

- Brucebase year pages: a setlist the wiki sets in bold as a whole (a tour opener: 2012-03-18, also 1984-06-29, 1999-04-09, 2009-04-01) is one song per row again instead of one long line; each song keeps its bold, and a bold run opening with the separator ("&lt;strong&gt;/ LAND OF HOPE AND DREAMS&lt;/strong&gt; - PEOPLE GET READY") stays one medley row (\_bbSplitInline()).


## 9.99.1330 — 2026-10-13

**✨ Improve**

- Springsteen sites: the detail-page preview works on the page as the site shows it too, before any button — e.g. a song in Brucebase's own song list ("1945" on stats:songs). ‹ › step through the titles visible there; the script's own toolbar is never a target. On a touch screen only the script's table opens the window, so a tap on the site's own link still navigates (\_dpSiteForLink(), \_dpPageLinks()).


---

**Older versions:** [October 2026](ShowAllEntityData_CHANGELOG/2026-10.md) · [September 2026](ShowAllEntityData_CHANGELOG/2026-09.md) · [August 2026](ShowAllEntityData_CHANGELOG/2026-08.md) · [July 2026](ShowAllEntityData_CHANGELOG/2026-07.md) · [June 2026](ShowAllEntityData_CHANGELOG/2026-06.md) · [May 2026](ShowAllEntityData_CHANGELOG/2026-05.md) · [April 2026](ShowAllEntityData_CHANGELOG/2026-04.md) · [March 2026 (1 of 2)](ShowAllEntityData_CHANGELOG/2026-03-1.md) · [March 2026 (2 of 2)](ShowAllEntityData_CHANGELOG/2026-03-2.md) · [February 2026](ShowAllEntityData_CHANGELOG/2026-02.md) · [January 2026](ShowAllEntityData_CHANGELOG/2026-01.md)

*Generated from ShowAllEntityData_CHANGELOG.json by scripts/build-changelog-pages.py — do not edit by hand.*
