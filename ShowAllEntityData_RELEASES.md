# ShowAllEntityData — What's new

What changed for you in each published release, newest first: new pages, new features and fixes, in plain words. The technical details of every single version are in the [full development log](ShowAllEntityData_CHANGELOG.md).

Releases up to 9.99.746 have no notes of their own here; the development log has them.

---

## 9.99.1426 — 22 October 2026

*Changes since 9.99.1167.*

This is a big one: about four weeks of work and more than 250 changes. The
headlines are a preview card for every link, data checks in two new ⚠️ WARNING
/ ❌ ERROR menus, cover art on release and event pages, relationships as
tables, and support for discogs.com and four Bruce Springsteen sites (both
opt-in).

### Your settings and this update

**Again, you don't have to do anything.** This release adds 177 settings, all
arriving at their defaults, and removes none. ⚙️ Settings gains thirteen new
sections: ⚠️ FINDINGS, 🎫 EVENT PAGE, 🔗 RELATIONSHIP SECTIONS, 🎼 RECORDING OF
COLUMN, 🔎 LINK PREVIEWS ON MUSICBRAINZ, 🔎 EXTERNAL LINK PREVIEWS, 🔎 EVERY
PREVIEW (MusicBrainz links and the sites above), 🔤 TITLES ON THE OTHER SITES,
and one each for discogs.com and the four Springsteen sites (see the end of
this post).

Six defaults changed, all of them colours that go with the new "Liner notes"
tooltip look (see *Enhancements: other* below). **These reach you
automatically, unless you set them yourself.** If you picked one of these
colours, you keep yours.

| Setting (as it appears in ⚙️ Settings)       | Section                 | Old                    | New                         |
|----------------------------------------------|-------------------------|------------------------|-----------------------------|
| Row-count tooltip — background color         | 💬 TOOLTIPS             | dark (#1e1e2e)         | **cream (#fbf8f1)**         |
| Row-count tooltip — foreground (text) color  | 💬 TOOLTIPS             | light (#cdd6f4)        | **dark (#2b2622)**          |
| Relationships rich tooltip: background color | 🔗 RELATIONSHIPS COLUMN | white (#ffffff)        | **cream (#fbf8f1)**         |
| Relationships rich tooltip: text color       | 🔗 RELATIONSHIPS COLUMN | black (#000000)        | **dark (#2b2622)**          |
| Main performer role colour                   | 🎨 ARTIST ROLE COLOURS  | bright green (#57ff5a) | **darker green (#2e7d32)**  |
| Guest performer role colour                  | 🎨 ARTIST ROLE COLOURS  | orange (#e07000)       | **darker orange (#b35900)** |

**Switched on by default, in case you'd rather not have them.** Each is one
checkbox away:

* **Link previews** (🔎 LINK PREVIEWS ON MUSICBRAINZ, 🔎 EXTERNAL LINK PREVIEWS). This is the biggest change in this release. Resting the pointer on a link shows a card, and each card that appears asks MusicBrainz (or the linked site) for its data. Requests to MusicBrainz share the script's one-request-per-second pace with the Relationships column. "Link previews (hover card and Space window)" turns all of them off at once; "Preview linked entities on hover", "Also preview links outside tables" and "Preview external links on hover" turn off one kind each. If you'd rather have a card only while you hold Ctrl, switch off "Show every preview on a plain hover (without Ctrl)" in 🔎 EVERY PREVIEW. Phones and tablets have their own switches, all **off**.
* **The release group and event cards on a live track's "#" cell** (💿 RELEASE TRACKLIST). The first hover on a track of an event asks MusicBrainz once for its release group and its event.
* **Sticky Page Headers** and **Sticky Filter Bars** (📌 TABLE STICKINESS). Sticky Page Headers stays off on phones and tablets unless you turn on "Sticky Page Headers on touch devices".
* **The ⚠️ WARNING / ❌ ERROR menus** and their yellow/red cell tints (⚠️ FINDINGS). Every tint has its own switch, and turning a tint off keeps the problem in the menu. The title-style check runs only when you ask for it, unless you switch on "Check title style automatically".
* **"Liner notes" tooltips** and **the progress card for background jobs** (💬 TOOLTIPS).
* **The Cover art section and Medium images** on a release tracklist (💿 RELEASE TRACKLIST), **the event page's tables and its Event art section** (🎫 EVENT PAGE).
* **Cc / Rx / Ex switches on every column filter** and **Hide Empty Sub-tables While Filtering** (🎨 TABLE FILTER CONFIGURATION).
* **The sidebar additions** (⭲ COLLABSABLE SIDEBAR): remembered open sections, section counts, external links grouped by kind, the sidebar picture's card and its copy beside the name, the "Sidebar" cards below the page's data, and the sidebar tables in the Credits/Relationships view.
* **Relationships as tables** (🔗 RELATIONSHIP SECTIONS). This only adds a button; nothing changes until you press it.
* **The "Recording of" columns** (🎼 RECORDING OF COLUMN). They load nothing until you ask.
* **Short column header labels** and **Explain MusicBrainz columns in header tooltips** (🎨 UI FEATURES).

Everything for discogs.com and the four Springsteen sites is **off** by
default. While it's off, the script leaves those sites exactly as they are,
and nothing changes on MusicBrainz either way.

**Some settings now look different.** A setting with a fixed set of choices
(for example "Expanded CAA/EAA cell layout": Grid / Grouped / List) is now a
row of buttons instead of a text box. Your current values are kept. The small
and big CAA/EAA image fetch sizes used to accept any number, so they could ask
the archive for a size it doesn't have; now they offer only 250, 500 and
1200 px. The button rows come with the new version of the VZ_MBLibrary
library the script uses. With an older copy of the library these settings
show as text boxes, as before, and work the same.

### New: ⚠️ WARNING / ❌ ERROR --- the page tells you what's wrong with its data

* **Two new menus in the page heading**, ⚠️ WARNING and ❌ ERROR, list every kind of data problem the page has, each with how many rows have it. Click a row and every table and sub-table on the page narrows to the rows with that problem; click it again to show everything. Rows combine with each other and with every other filter, a menu hides itself while the page has nothing of its kind, and its counts always describe the whole page, not just what a filter leaves on screen. Covered: track/recording length mismatches, recordings without a work, video on a medium that cannot carry video, ALL UPPERCASE and truncated titles, track ≠ recording name, 🟠 low data quality, invalid ISRCs/ISWCs/barcodes, pending edits, undated or wrongly dated live-recording credits --- and everything in the bullets below. The menus replace the filter bar's "(N) LENGTH ⚠️/❌" and "(N) WARNING ⚠️ / (N) ERROR ❌" buttons, and unlike those they no longer clear your other filters.
[SCREENSHOT: the ⚠️ WARNING menu open, with its counts]

* **Problems that had no highlight now get one** --- a light yellow tint with ⚠️ (light red with ❌ for errors), each behind its own switch in ⚙️ Settings → ⚠️ FINDINGS.

* **The hover card shows what differs** --- a warning that compares two values shows them one under the other and marks only what differs, down to a single letter, an apostrophe ' against ’, or a hyphen ‐ against -, with a line in plain words below ("1 letter in a different case: w → W", "Only in the recording name: (single version)"). This covers track ≠ recording name, a recording date or venue against the recording comment, a main-event track against the release group title, and track/recording length mismatches (digits lined up, the gap labelled amber or red). A near miss of the live form shows the text over the form it almost has ("live, 1993-4-21: …" over "live, 1993‐04‐21: …"), and a live credit without a date names the date it is most likely from.

* **Check title style against the MusicBrainz guidelines** --- "Aa Check title style (MB guidelines)" at the top of the ⚠️ WARNING menu checks every title on the page and adds five warnings: "Title not in MB title case" ("Prayer For The Weary" → "Prayer for the Weary"), "ASCII punctuation in title" ("Don't" → "Don’t", "..." → "…"), "Series number without comma" ("Broadcasts Vol. 5" → "Broadcasts, Vol. 5"), "Featured artist in title" and "Extra title information to remove" ("(bonus track)"). Only clear cases are flagged: titles in another language or in sentence case, live bootleg titles, a phrasal "Take On Me" or "& The E Street Band" are left alone. It runs only when you click it (about 0.2 s per 10,000 different titles) and stays on for the page until you reload; "Check title style automatically" in ⚠️ FINDINGS runs it on every page.
[SCREENSHOT: a title-style warning card, the title over its MusicBrainz style]

* **Live bootleg titles checked against the style guide** --- release and release group titles that follow the [live bootleg](https://musicbrainz.org/doc/Style/Specific_types_of_releases/Live_bootlegs) form "YYYY-MM-DD[, early show]: Venue, City, State, Country" get a ❌ for an impossible date (month 13, 29 February in a non-leap year) or a near miss ("05.02.1975: …", a missing ": "), and a ⚠️ for a plain "-" instead of "‐" in the date. Titles naming several dates ("1978‐08‐21/22/23: …", "1989‐07‐04 / 1990‐04‐22: …") are understood, and each date is checked on its own. The 📊 dropdown gets matching "Live title info" sections: validity, near misses, date completeness, location completeness and separators.

* **Event names, too** --- every Event column is checked against the live form and the title forms of the [event style guide](https://musicbrainz.org/doc/Style/Event) ("[artist] at [venue]", "[festival] [YYYY]", "[tour]: [city]"), with a ⚠️ for a near miss such as "@" for "at" or " - " for ": ", and matching "Event name info" sections in the 📊 dropdown.

* **Recording comments, too** --- a recording's disambiguation ("live, 2004‐10‐02: Gund Arena, Cleveland, OH, USA") is checked against the [live recordings guideline](https://musicbrainz.org/doc/Style/Recording#Live_recordings), with "Recording comment info" sections in the 📊 dropdown (form, event type, near misses, …). A USA/Canada location whose state is not a two-letter code gets a ⚠️. "rehearsal" now counts as an event type, like "live", and a comment without a colon ("live, Los Angeles, CA, USA") is now split into its location columns too.

* **Release tracklists cross-check their tracks** --- the Recording date against the date in the recording comment; "Recorded at event" and "Recorded at place" against the event and venue the comment names (❌ when none matches); main-event tracks against the release group's live title (⚠️); a Performer credit dated differently from its track (❌) or undated (⚠️), as Vocals and Instruments already were. A track whose recording has no work, and a recording flagged as video on a CD, vinyl or cassette, are flagged as well.

* **Extra title information** --- a trailing "(Live)" or "(Version 1)" that should be lowercase gets a ⚠️ (the keyword list is editable in ⚠️ FINDINGS), and every title's extra title information --- the "single version" in "(single version)" --- is now shown in green italics so it stands apart from the title itself.

* **Artwork and links** --- "Artwork has no Front image" and "Physical release artwork has no Medium image" (any format but Digital Media), and "Several links to one site in Relationships": a Relationships cell with two different links to one site (two Discogs pages, two amazon.de products, …). amazon.de and amazon.com count as different sites, and "Sites allowed more than one link in Relationships" lists sites that never count. These are only known once the column has loaded, so their counts grow while it loads. On the event page, a setlist MBID typed with uppercase letters gets a ⚠️ too.

### New: a preview for every link

* **Rest the pointer on a link and get a card** with the essentials of what it links to: a release (cover, format, date, label, the first tracks), a release group, recording, work, artist, label, area, instrument, event, place, series, ISRC, ISWC, disc ID or collection. A line at the top names the kind ("Recording", "Release group"), with MusicBrainz's own icon. An edit and an editor get one too, read from their pages: votes, status and changes for an edit; edit counts and member-since for an editor, never the personal details a profile may show. It works in every table and, with "Also preview links outside tables", everywhere else on the page: the header, the annotation, the sidebar, relationship lists. A Barcode cell shows the releases that carry the barcode. A catalog number shows the card of the label it belongs to. An entry in the 📊 dropdown that names one entity shows that entity's card. Notes about the cell (pending edits, track ≠ recording name, the filter's matches, …) stack above the card, one box each, instead of covering it.
[SCREENSHOT: a release preview card on hover]

* **Press Space to pin it** into a window you can move and resize, with much more: a release's whole tracklist by medium, every release of a release group (sortable), a recording's credits, an event's whole setlist with its posters, a place's events, a work's recordings, an artist's or label's external links. A click on a link inside the window shows that entity in the same window ("Release group › Release"), and ← Back (or Backspace) goes back. ‹ › and ← → step through the rows of the column the window was opened from, from one sub-table into the next. "Live page" shows the entity's real page inside the window.
[SCREENSHOT: a pinned preview window after drilling down from a release group to a release]

* **Editing history in the window** --- "✎ Editing history" (or H) shows the entity's or editor's edits in the same window, 50 at a time: date, editor, a coloured type pill, what changed, votes or status, with chips for category and status. Click an edit to see it below: old and new values side by side with MusicBrainz's red/green marks, a merge as Merge | Into, then the edit notes. The sidebar's "Editing history" link opens it too. Logged out, the window says that MusicBrainz hides editors and notes.
[SCREENSHOT: the editing history window with one edit opened]

* **Editors, tags, collections and annotations** --- on an editor's profile, every "view" link of the statistics has a card and a window: their open, accepted, applied, rejected, failed and cancelled edits and their votes; their subscribers; their tags, with how many votes each; their ratings. A tag link shows whether it is a genre and how many entities of each kind carry it, and an editor's own tag what that editor tagged with it. A collection shows its type, size, owner and first entries, and the window pages through all of them, with covers for a release collection. An entity's "Subscribers" and "Found in N user collections" links show who subscribes and which collections hold it. "View annotation history" shows how many versions the annotation has and the latest one's text. These are read from MusicBrainz's pages, one request each, because the web service doesn't have them.

* **Pictures and places**: an artist, label or place window shows its picture (the Wikimedia Commons file MusicBrainz links, or the one its Wikidata item names), and a click opens it in the artwork viewer. Areas are named the way MusicBrainz names them, down from the city ("OceanFirst Bank Center in West Long Branch, New Jersey, United States"). An event's setlist is linked: each song links its work, and every artist links the artist page.

* **Links to other sites, too.** A card shows the page's title, site, image and description, and the link's status: a dead link says the page is gone, a moved page shows where it went, and a site's bot check (Cloudflare and similar) is named as such instead of being reported as a dead link. Wikipedia and Wikidata are read through their own services: the article's opening paragraph, the Wikidata item's names. A YouTube video shows its title, channel and thumbnail. A link to one of the four Springsteen sites gets that site's own card, and a Brucebase date link ("reviews:" on an event) shows the one show it names.
[SCREENSHOT: an external link card with its status line]

* **Discogs, in full** --- a Discogs link's window shows what the Discogs page shows. A release or master: every image, the tracklist with each track's credits, the notes, and for a release its companies, identifiers, videos and how many users have or want it. A master lists all its versions, which you can filter by format, country and decade. An artist shows the profile and the whole discography, split into Releases, Appearances, Unofficial and Credits, and a label its releases. A release's history link shows every change, and "View changes" shows a change old and new side by side. Every link in the window (artists, labels, users, Discogs searches, Discogs' own guidelines) opens in the same window, with ← Back. Discogs allows a request every 2.5 seconds, or every second with your own Discogs token (optional, in 🔎 EXTERNAL LINK PREVIEWS). Long lists load the rest only when you press "Load the other …", which says first how many requests that takes.
[SCREENSHOT: a Discogs master window with its versions table]

* **What MusicBrainz knows about a URL**: the "[info]" link after every URL in a relationship list gets a card listing which entities link that URL, by relationship. An external link's pinned window says the same, or "Not in MusicBrainz". URL pages (musicbrainz.org/url/…) also get a "Relationships" button, which shows those entities as tables.

* **About privacy and permissions**: a request to another site is sent **without your cookies**, so the card shows the page everyone sees. The first time a site is contacted, Tampermonkey asks whether the script may. So a site never contacted before is loaded only when you press Space, never by just hovering. After you answer once, its links also load on hover. A card's answer is kept in your browser (24 hours for MusicBrainz, a week for other sites; both adjustable). The Discogs token is sent only to Discogs, shown as dots and never written into a saved configuration file.

* **On a phone or tablet** the previews are off unless you switch on their touch twins. With a twin on, a tap opens the window instead of the page, and ↗ in the window opens the page.

### New: live releases --- which concert is each track from?

* **A medium that mixes concerts says so** --- each track is matched to an event (its "Recorded at event", else the event its recording comment names, else its recording date). A medium whose tracks come from two or more events gets a "🎪 N events" badge in its heading, and the Disambiguation column's 📊 dropdown gets one entry per event, to filter to its tracks.

* **Tracks from other events stand out** --- when the release group has a live title, its date names the main event, and every track from another event gets its own tint in the "#" column plus a small "E1", "E2", … chip, numbered by date (readable without colour, too). Hover the "🎪 N events" badge for a legend. When the tracks carry live event data but the release group title isn't a live title, a ⚠️ after the release group link says why and suggests a title built from the event with the most tracks.
[SCREENSHOT: a release tracklist with E1/E2 chips and the 🎪 badge legend]

* **The release group, one hover away** --- the "(see all versions of this release, 5 available)" link now names the release group ("5 versions available in 1996‐04‐19: ICC Berlin, …"), and hovering it shows the group's card: cover, type, artist and its releases, with this one marked. Press Space to pin it into a window with every release of the group in a sortable table with covers, next to the group's rating, genres, links and annotation.

* **…and the event and release group of each track** --- hover a live track's "#" cell to see two cards: the event the track was recorded at (name, date, place, tour, line-up, the start of its setlist), and the release group for that event --- the release's own group for the main event, otherwise a group named exactly like the event. If there's none, the card says so and lists the closest titles. Alt+click opens the release group, or the search, on musicbrainz.org.

### New: cover art on release and event pages

* **A "Cover art (N)" section above the release tracklist** --- after "Show all Tracks for Release", every Cover Art Archive image of the release, with its types, its comment, ★ on the archive's main front and ⏳ on images still pending approval. Type chips (All, Front, Back, Medium, …; several at once) narrow the sheet, and Grid / By type / Spreads lay it out. Spreads shows "inside left" and "inside right" side by side as one opened gatefold and turns liner/booklet pages two at a time. One request per page at most (none when cached --- the cache is shared with the CAA column --- and none when the release has no art), and "no images" is told apart from "the archive could not be reached", which offers ⟳ Retry.
[SCREENSHOT: the Cover art section in its Spreads layout]

* **A full-screen artwork viewer** --- click any thumbnail: ← → step through the images, ↑ ↓ or the mouse wheel zoom towards the pointer, G shows a grid, I an info panel (types, comment, sizes, edit link), O the original file, P runs a slideshow, Esc closes; on a touch screen, tap and swipe. A plain click on MusicBrainz's own "Cover art (N)" tab now opens the viewer instead of leaving the page (Ctrl-click still goes to the archive).

* **The cover beside the name** --- on release, release group and event pages, the front cover also sits at the start of the page heading, so it stays in sight with the sidebar closed. Pointing at it (or at the sidebar's cover) shows a card with every image, and a click opens them all in the viewer, starting at the front. Ctrl-click on the sidebar's cover still opens MusicBrainz's own window.

* **Medium images in the medium headings** --- disc and record-label images appear as small thumbnails in the heading of the medium they show, wherever that is certain (a single medium; a comment naming exactly one medium, such as "disc 2" or "side C"; or exactly as many uncommented images as media). Anything else is listed in one note instead of being guessed.

* **The same on event pages** --- an "Event art (N)" section with the event's own types (Poster, Ticket, Setlist, …), the hover card and the viewer.

### New: a redesigned CAA/EAA artwork column

* **Images as tiles** --- an expanded artwork cell now shows its images as a grid of 64 px tiles instead of 18 px icons, with types and comment on each and ★ on the main front. A "grouped" layout sorts them by type, "list" is the old layout, and the ▦ button in the column header switches every table at once. Filtering for "Medi" or "outs" still finds the row and marks the matching tile.

* **Type chips at a glance** --- after the image count, one letter per artwork type (F, B, Sp, M, Bk, T; for event art Poster, Banner, Schedule, Setlist, Ticket), filled with a count when the release has that type and hollow when it doesn't.
[SCREENSHOT: a CAA column with type chips and an expanded tile grid]

* **Rich cards and the viewer** --- hovering the artwork icon or the image count shows the release's whole artwork card; press Space to see every image instead of the first 12, and hold Shift to draw the tiles bigger. Hovering one image shows its preview, types, comment and position ("Image 6 of 10 · Medium 2 of 3"). Clicking an image (or the icon) opens the full-screen viewer, where ← → run on into the next row and Shift+← → change rows, through the rows your filters leave visible.

* **An artwork gallery per table** --- the new 🖼 button next to 📊 opens a movable, resizable window with every image of the releases the table currently shows, grouped by release and labelled with format, country/date, label and catalog number. Type chips show only those images and name the releases without one ("No Medium image"), and "Compare two" lines two releases up type by type. It asks the archive for nothing new.

### New: the Event page

* **An event's relationships as tables** --- a new "Relationships" button on any event page turns MusicBrainz's one-target-per-line lists into filterable, sortable tables, one per kind of related entity (Artists, Places, Recordings, Releases, Series, URLs, …), each with the columns that fit it: Relationship, Credits, Artist, Area, Disambiguation, … A performer's credits are split one per row ("lead vocals", "harmonica", "electric guitar"), with the time in its own column. The related series' own relationships get their own "Via <series>" table.
[SCREENSHOT: an event page's relationship tables]

* **The setlist as tables** --- a "Setlist: Line-up" table (every artist, how they're joined, and a billing number), then one table per part of the setlist ("Soundcheck", "Concert", …) with that part's notes under its heading. A medley stays one row listing every work, "Also in" names the other parts that play the same work, "Recording" links the recording made at this event (with a Video column where it's a video), and the artists of a "(with …)" line get their own Additional artists column, linked to the artist. Prefer one table? Switch on "One table for the whole setlist".

* Every part has its own switch in ⚙️ Settings → 🎫 EVENT PAGE.

### New: relationships as tables on many more pages

* **The event page's relationship tables, now nearly everywhere**: place, area, instrument and URL pages get a "Relationships" button. Series, work, release group and recording pages, and the artist and label Relationships tab, get one next to their own button. On a release it's called "Credits". The two buttons are either/or: the new one leaves the page's main table out, and the other button brings it back.
[SCREENSHOT: a work page's relationships as tables]

* **Dates, positions and names get their own columns**: "(from 1977-06-27 until 1978-05-05)" becomes Begin and End (each split into day, month, year and weekday), a series position becomes Number (and Order where the two differ), an area's parent areas become Parent area, and a primary alias in parentheses gets a "Primary alias" column instead of landing in Disambiguation. A band membership with a period and instruments fills Begin/End and a multi-row Credits cell.

* **"Via …" tables**: a recording's related works and a release's release-group credits each get their own table ("Via Badlands", "Via release group: Live/1975–85"), so they are never mistaken for the page's own relationships.

* **More in the 📊 dropdown**: on a table that mixes kinds, "Entity info - Type" has one entry per kind (Artist, Release group, Event, URL, …). On a link column, "Links info - Site" has one entry per site with its icon, and "Links info - Site kind" counts a site whatever its country ("amazon.*"). With inline CAA/EAA thumbnails on, release groups, releases and events get their small cover or event-art image. Prefer one table? Switch on "One table for all relationships".

### New: the sidebar, reorganised

* **It remembers what you opened**: a sidebar section you opened is open again on the next page of the same kind, and one you never opened starts closed. Each heading shows how many entries it holds, Ctrl+Click opens or closes them all, and Open all / Close all sit at the top. The ▶/◀ handle is there as soon as the page opens, before any button is pressed.

* **External links grouped by kind**: Official, Social, Streaming, Concerts, Lyrics, Databases, Stores and Other, each opening and closing on its own. Links are only reordered, never removed, and whatever other userscripts add stays where it is.

* **The sidebar's facts next to the page's data**: after the page's own button (Tracks, Releases, …) a "Sidebar" heading follows, with the sidebar's information, labels, release events, external links and tags as small read-only cards, each link with the sidebar's own site icon. Every card starts open except "Search", the long list of search links jesus2099's "mb. ALL LINKS" adds, which becomes one tidy card with a box to find a site. Ctrl+Click on a card's title opens or closes them all. The Credits and Relationships views also end with the sidebar's groups as real tables ("Sidebar: Release information", "Sidebar: External links", …), which you can filter and sort. A link that already appears as a relationship row is left out.
[SCREENSHOT: the "Sidebar" cards under a release's tracklist]

* **The sidebar picture** (an artist's photo, a label's logo, an instrument's drawing) shows a card when you point at it and opens in the artwork viewer on a click. A small copy also sits at the start of the page heading, so it stays visible when the sidebar is closed.

* A separate "🗂 Sidebar as tables" button exists too, but it is **off** by default, because the two views above already show the same information. Turn it on in ⭲ COLLABSABLE SIDEBAR if you want it.

### New: "Recording of" on every recording list

* **Which work does each recording perform?** Two new columns after the recording's name: "Work" (the work it is a recording of, e.g. "Can't Help Falling in Love (cover/live)", one row per work for a medley) and "Perf." (its performance attributes and date). They are on every list with one recording per row: an artist's Recordings, recording search results, an instrument's or area's Recordings, a place's Performances, a work's recordings, a series or collection of recordings, an ISRC page, tagged and rated recordings, and an artist credit's recordings. Nothing is loaded until you ask: click a cell's 🎼 for one row, or ▶🎼 in the header for all of them, 100 recordings per request where that's cheaper. Answers are kept for 30 days. Each kind of page has its own checkbox in 🎼 RECORDING OF COLUMN.
[SCREENSHOT: the "Recording of" column with a suggested work]

* **A suggestion where the work is missing**: on an artist's Recordings page, a recording without a work gets the artist's work with the closest title, in orange and marked "suggested:". Endings like "(alternate take)", case and quotes are ignored. If the ["MusicBrainz: Batch-add 'performance of' relationships"](https://github.com/murdos/musicbrainz-userscripts/raw/master/batch-add-recording-relationships.user.js) userscript already holds the artist's work list in your browser, that copy is reused (read only). The 📊 dropdown gains "Recording of - Load state" and "Recording of - Suggested work" sections.

### New: a progress card for background jobs, and your browser cache

* **See what a loading column is doing**: the Relationships column, the ⏱ millisecond lengths and the "Recording of" columns now report through one card in the "Liner notes" look. It shows what is being loaded, a progress bar with failures and cache hits, the last few requests with their outcome (a 503 and its retry are visible without opening the console), and buttons such as "Retry failed". It opens under the column's toggle when you start the job. Esc closes it and the job keeps running. A sort that takes more than half a second, or a long filter, shows its progress in the same card.
[SCREENSHOT: the progress card during a Relationships load]

* **💾 Browser cache**: a new overview of everything the script keeps in your browser (cover art, relationships, millisecond lengths, "Recording of" answers, link previews), with how much space each part takes, how old the entries are and how many are past their keep time. You can delete what's expired, clear one part or everything, or delete entries older than 7, 30 or 90 days. Every delete asks first. Open it from ⚙️ Settings (🗄️ ART ARCHIVE INDEXEDDB CACHE), the 📊 Statistics panel, the Tampermonkey menu, or a progress card.

* **Take your cache to another computer**: Export… writes it to one file, and Import… merges it into another browser's cache. Before changing anything, the import shows what it would add or skip, and a newer entry already in the browser is never replaced.

### New: Cc / Rx / Ex on every column filter

* **Case-sensitive, regular-expression and exclude switches per column** --- every column filter now carries its own small Cc / Rx / Ex chips, left of its ✕. That makes filters like "CDs, but no live albums" possible: `CD` in Format plus `live` with Ex in Release. Ex also puts a red stripe down the field's edge, and the 📊 panel of an excluded column says so. Columns narrower than 160 px get one small mode button that opens the same switches. Ctrl+Click on a global or sub-table switch sets it on every column filter it covers. Before, column filters silently borrowed the global (or sub-table) switches.
[SCREENSHOT: a column filter with Ex switched on and its red stripe]

* **Status lines say what's applied** --- the filter status line now shows each part's modes (e.g. `'Release':(ex) "live"`) and the query as typed, so an inverted or regexp column filter no longer looks like a plain one.

### New: more pages

* **Editor profiles** (/user/<name>) get a "Profile" button: General information, Edits, Votes, Added entities and, where the profile has them, Tags and ratings as sub-tables, with counts that sort as numbers. Nothing is fetched; blocks other userscripts add to a profile stay where they are.
* **Every edit list of an editor**: besides their edits and open edits, now also their accepted, auto-edits, applied, rejected, failed and cancelled edits, and the edits they voted on.
* **An entity's "Found in N user collections" page** (areas, artists, events, instruments, labels, places, recordings, series, works) as a Collection | Editor table, and **the "Subscribers" page** of an artist, label, series or collection.
* **One version of an annotation** ("View this version", "View current revision") gets "Compare with the current version": a table with one row per paragraph or heading, this version's text, the current one's, and whether it is the same, changed, or only in one of them.
* **Release tracklists on single-medium links** --- `/release/<mbid>/disc/<n>` (and the `…#<track>` form that points at one track) now work too; the highlighted track stays highlighted after "Show all Tracks", through filtering and sorting.

### New: sticky headers and filter bars

* **The page stays put while a wide table scrolls sideways** --- the MusicBrainz header, the entity header with its buttons, the tabs, every h2/h3 section bar and its expanded content (Credits, Annotation, …), the cover-art strip and the footer now stay in place, and the sticky column stops in line with its table's bar instead of at the window's edge. A table narrow enough to fit the window stays put entirely. It only engages while the page really overflows sideways, and works together with jesus2099's "mb. STICKY HEADER" userstyle.

* **…and while it scrolls down** --- the page heading with its buttons, the section bar with the global filter and the row count, and the column headers stay at the top of the window. On a page with sub-tables, the bar of the sub-table you're in (with its own filter) stays there too, until the next one takes its place.

### Enhancements: the 📊 dropdown

* **Grouped by topic** --- one header per topic ("Entity info", "Title info", …) holds its sub-sections, and entries show just their value ("Bruce Springsteen" instead of "» artist name: Bruce Springsteen" on every line); the quick filter still matches the full text. Sub-sections with more than 15 entries open collapsed (configurable), and one you expand yourself stays expanded. "Unique-Values Dropdown: Group Sections By Topic" brings back the flat layout.
[SCREENSHOT: the 📊 dropdown grouped by topic]

* **Resizable** --- drag the grip in its lower-right corner. The size is remembered per page type and column; double-click the grip to reset it.

* **"Title info" on every title** --- following the [title style guide](https://musicbrainz.org/doc/Style/Titles): medleys, multiple titles joined by " / ", subtitles, series numbering (", Volume 1", ", Pt. II"), format words (EP/LP/CD/Single), extra title information, and style issues (titles cut off with "…", ALL UPPERCASE). Also on Name/Recording/Release/Release group/Work columns (the list is editable), and only for cells that link a title, so an artist like "ABBA" is never read as an uppercase title.

* **More sections** --- "Rating info" (has a rating / none); the same Length info sections on "Recording length" as on "Length", plus a "Track vs recording" section for flagged pairs; "Video info - Medium format"; "Event info" for the Event-Type/Country/Detail/Additional-info columns split from a recording comment (with a "Country form" section, so "USA" vs "United States" spellings stand out); "Relationship icons - Site kind" on the Relationships column, counting amazon.com, amazon.de and amazon.co.uk together; "Editor info - Active for/since" on Annotation history pages; "Reports - Trend" when the Reports Statistics companion script is installed; and "Instrument info - Cross-reference" on the instrument list.

### Enhancements: filtering and scrolling large tables

* **Typing a filter no longer freezes a big table.** The filter now compares and prepares rows a few milliseconds at a time and lets the page respond in between, and every key you type replaces the filter still running. On a 4,000-row page the slowest key fell from about 1.6–1.9 s to 0.1–0.5 s. On a 47-table release-groups page a key no longer waits at all. Each key also costs about a quarter of the painting it used to.

* **Empty sub-tables get out of the way**: while the global filter or a ⚠️ WARNING / ❌ ERROR menu filter is active, a sub-table without a matching row is hidden, heading and all, and comes back exactly as it was when you widen or clear the filter. A sub-table with its own active filter stays visible, and when the filter would empty every sub-table they all stay on screen.

* **Row counts no longer push the buttons around** --- the count next to each heading keeps a fixed width, so "(20)" turning into "(3 of 3)/20" while you type no longer shifts the buttons after it.

### Enhancements: the artwork viewer

* **Every corner reachable**: a zoomed image pans to every edge, and the bottom of a tall image is no longer cut off. "Viewer: move a zoomed image by" chooses between following the mouse and dragging. The bar shows the zoom as a percentage, and 1 shows the actual pixels. On a touch screen, pinch to zoom and drag with one finger.

* **New keys**: R rotates (for sideways spines, OBI strips and booklets), H and V mirror (for a scan of a CD's matrix area read through the disc), F switches to real fullscreen, B cycles the background (dark, light, checkerboard), and D downloads the original file with a sensible name ("04 Other opened gatefold cover, inside left.jpg"). The info panel shows the pixel size and file size of what's on screen. None of this changes anything in the archive.
[SCREENSHOT: the artwork viewer with a rotated booklet scan and the info panel]

* **Images in a preview window open in the viewer**: a release's cover, an event's posters, a picture of a linked page.

### Enhancements: other

* **"Liner notes" tooltips** --- every hover text the script adds is now a small cream card in a serif face, like the insert of a record sleeve, with a bold title line and keyboard shortcuts drawn as keycaps, instead of the browser's plain grey tooltip on buttons, filter boxes, column headers and flagged cells. MusicBrainz's own hover texts and other userscripts' are left alone. Switch it off, or change the delay, in ⚙️ Settings → 💬 TOOLTIPS.
[SCREENSHOT: a "Liner notes" tooltip on a toolbar button]

* **Column headers explain themselves** --- every column header now has a tooltip saying what the column holds, MusicBrainz's own columns too (Artist, Catalog#, Country/Date, Format, ISRCs, … about 70 in all), fitted to the table where a name means different things ("Type" on an Events page is the kind of event). A few long headers are shortened ("Work", "Perf."), with the full name in the tooltip; "Short column header labels" in 🎨 UI FEATURES brings the full names back.

* **Pressing a button a second time just works** --- it still reloads the page, but the reloaded page now runs the same button by itself, with a short "↻ Page reloaded — re-running …" note, instead of a "⚠️ Page Reloaded" dialog to dismiss and the button to press again.

* **Annotations read better** --- wiki headings inside an annotation ("== … ==") become collapsible sub-section bars like Credits' "Release", Ctrl+Click on one toggles every sub-heading of that section, and the redundant "Show less..." link is gone. On Annotation search results, hovering a cover shows the whole annotation in a card. Annotation history pages show the Editor column first.

* **Other userscripts** --- instrument icons from ["MusicBrainz: Instrument Icons Everywhere"](https://github.com/Lotheric/metabrainz-userscripts) (@Lotheric) are no longer lost in the release "Instruments" column and the instrument list, and the 📊 dropdown shows and filters them ("Instrument info - Icon"). With majkinetor's "ISRC Scout", its "ISRC" column works like the "ISRCs" column (one code per line, ⚠️ on an invalid one, the ISRC sections in 📊), and its "Links" column can be filtered by platform ("Spotify").

* **Phones and tablets** --- a tap no longer leaves a hover tooltip stuck on the page, the on-screen keyboard no longer pops up by itself (after a render, a filter's ✕, or opening a 📊 dropdown), and the collapsed sidebar's handle stays within reach. ❓ Help has a new "On a phone or tablet" section.

* **The collapsed sidebar takes no space at all**: wide tables now end on the same line as the section bars above them, and opening the sidebar on a wide page shows it at the window's edge at once.

* The "Add a new alias" link is gone from the consolidated Aliases pages.

### Beyond MusicBrainz: discogs.com (opt-in, off by default)

With "Enable on discogs.com" (⚙️ Settings → 💿 DISCOGS), the same table engine
--- filtering, sorting, the 📊 dropdown, Save to Disk --- works on discogs.com
too. Off, the script leaves discogs.com exactly as it is.

* **Master, release, artist and label pages** get a section of their own above Discogs' page, with filterable, sortable tables. Master: all its versions, the main release marked ★. Release: Tracklist, Credits, Companies, Barcode and Other Identifiers, and Other versions. Artist: the whole discography, one sub-table per Discogs role. Label: its newest 500, 1,000 or 5,000 releases, the oldest 500 or 1,000, or all of them. Every list has a thumbnail column: pointing at a thumbnail shows every image of that release, and a click opens them in the artwork viewer at full size.
[SCREENSHOT: a Discogs master page with its versions as a table]

* **More Discogs pages**: a list's submissions page ("Show all submissions"), a user's page (their submissions, contributions, collection and wantlist), a user's ratings, and a release's history page (the changes, and the diff of the revision it shows). Users' pictures appear beside their names.

* **Which of these are in MusicBrainz?** With murdos' "Import Discogs releases to MusicBrainz" userscript installed, every table whose rows are releases, masters, artists or labels gets a "MusicBrainz" column: every MusicBrainz entity linked to that Discogs page, or a search box where there's none. The links come from that script's own cache first (read only), then from MusicBrainz, 100 Discogs links per request, one request a second. The 📊 dropdown counts the links per row, and a Picard column sends a found release's MusicBrainz page to Picard. Without that userscript nothing changes.

* **Discogs' pace**: the rows come from Discogs' API, 100 a request, one request every 2.5 seconds, or every second with your Discogs token. All your Discogs tabs share that pace, and when Discogs says its per-minute limit is used up, they wait a minute and try again. Pointing at a button shows what it costs, and more than 50 pages asks first, as on MusicBrainz.

### Beyond MusicBrainz: four Bruce Springsteen sites (opt-in, off by default)

The same table engine also works on a few Bruce Springsteen fan sites. Each
site has its own section in ⚙️ Settings and is off by default.

* **springsteenlyrics.com** --- the collection lists (every category, plus the 5000-item "Latest additions"), the bootleg lists including CD/vinyl bootlegs, and the lyrics index (over 3,500 entries across every first letter) each become one table, fetched across all their pages. Dates are split into DD/MM/YYYY/Day/Month and locations into Place/Locality/Region/Country, the way MusicBrainz event pages are. An optional compact bar replaces the site's rows of category/format/country/year buttons with pull-down menus, one date-aware bootleg search box and a Recent list, and once a list is loaded its menus filter the table directly.
* **jungleland.it** --- the bootleg artwork list (list.htm, opened in its own tab) becomes one table with Title, Date (split into DD/MM/YYYY/Day/Month), Year and Version.
* **brucespringsteen.it** --- the record database (records.aspx, opened in its own tab) gets Unofficial and Official buttons that load every record of that kind into one table.
* **Brucebase** --- the song list (stats:songs) turns its 28 letter tabs into one table, one row per song. A new "Events" button on every year page (1949-64 … 2026) turns the year's shows, sessions, rehearsals and cancelled dates into one table, with Date (split into day/month/year/weekday), Type, Venue, City, State, Country, Tour, Soundcheck and Setlist one song per row, Notes and Media; on the start page, "Show all events of all years" loads every year into one table (separate setting: "Enable on the Brucebase year pages (event lists)"). Also the 2,892 people and bands of stats:relations as one table, and the wiki's last 200, 1,000 or 5,000 changes, with dates in your own time zone. The wiki's side bar stays in view while you scroll, and can get the MusicBrainz sidebar's collapse handle ("Collabsable sidebar") or move to the right.
[SCREENSHOT: a Brucebase year page as one table]
* **Titles written the MusicBrainz way**: "BORN IN THE USA" and "Born In The U.S.A." become "Born in the USA" and "Born in the U.S.A.", and "BOSS AT HIS BEST (THE)" becomes "The Boss at His Best". Acronyms keep their capitals, and hovering a changed cell shows the site's own text with the changes marked. Typographic punctuation is a separate switch: "Don’t", "Rock ’n’ Roll", "1975–1985", "Freeze‐Out". With it on, a filter has to be typed with the same characters. Both are in 🔤 TITLES ON THE OTHER SITES, and both are on once a site is enabled.
* **Detail-page previews** --- point at a title to see what its own page adds (a bootleg's tracklist and scans, a song's lyrics and live history, …) without leaving the table, also on the page as the site shows it before you press any button; Space pins it into a window where ‹ › step through the rows. One setting per site, off by default.

### Fixes

* Typing no longer jumps into the global filter when a slow table finishes loading while you're already typing in another field.
* The toolbar's pull-down menus open upward when the toolbar is near the bottom of the window, instead of off-screen. They also close when you click a link and then cancel the "leave this page?" question.
* A click on an image of the big-picture strip above a table opens the artwork viewer instead of asking "You are about to leave this page", and a Ctrl-click or Shift-click no longer asks either.
* After "↻ Load remaining pages", columns could be renamed with a number added ("Title 4"), which broke filters, sorting and column visibility that refer to them by name.
* Ticking a sub-table filter's Cc/Rx/Ex box now re-applies its column filters straight away; a plain global filter no longer matches across two cells ("Rest Bruce" matching the end of one cell and the start of the next); and sub-table status lines no longer contradict themselves.
* Ctrl+A then Backspace in a filter box now clears the filter (it used to do nothing, or empty the box without re-filtering). A global filter holding only spaces can be cleared with its ✕ again.
* The 👁️ column-visibility menu lists "Barcode" instead of "▌█Barcode", and "Barcode" in "Default Hidden Columns per Page Type" now actually hides it. Column headers containing an emoji (🔗, 🖼, 📋 --- added by other userscripts) are no longer mangled.
* Tag pages whose first section is Artists: the Release groups, Releases and Recordings tables had every header from the second column on standing over the wrong column. The Comment column no longer shows the artist's disambiguation instead of the entity's own, and "N entities found" stays under the heading instead of below the last table.
* Escape now cancels the Ctrl+M keyboard prefix and closes its overlay at once.
* MusicBrainz's own header menus (Editing, Search, …) are no longer drawn behind the page's title bar, and MusicBrainz's own pop-up windows (such as the one the sidebar's cover opens) now cover the whole page, with none of the script's buttons showing through.
* The cover-art tooltip works again with the "Right Side Flags Everywhere" userscript installed.
* The ⚠⟳ retry button no longer appears twice on single-table pages, and a plain browser tooltip no longer pops up on top of the rich one.
* The first action button on an artist's Releases tab reads "Artist", not "Artists".
* The "Release"/"Release group" sub-headings in an expanded Credits section are indented under their h2, like other sub-tables.
* The third-party "MBz YouTube Music Lookup" userscript's stray button no longer ends up in the rendered tracklist.
* Report pages and the CD stub list: the status line sits right under the page heading again.
* A page whose header line ran just past the window's edge no longer jumps back and forth several times a second.

---

## 9.99.1167 — 27 September 2026

*Changes since 9.99.746.*

### Your settings and this update --- read this first (60 seconds)

**Short version: you don't have to do anything.** Updating the script never
touches your saved settings. The 49 settings this release adds all arrive
switched to their defaults, and the 4 that were removed simply stop appearing.

Two things are still worth a minute of your time.

**1. Take a backup --- it costs one click.** Open ⚙️ Settings and press
**💾 Save configuration** (bottom left). That writes a small JSON file
containing every setting. **📂 Load configuration** puts it all back later, on
this browser or another one.

**2. Seven defaults changed --- and a changed default does *not* reach you
automatically.**

This is the one thing that genuinely needs your attention, and it is easy to
miss. The first time you ever press **SAVE** in the settings dialog, the script
writes down *every* setting at its current value --- not just the ones you
edited. From then on your copy is pinned: if a later release changes what a
setting's default *is*, you keep the old value, forever, because as far as the
script can tell you chose it.

So if you have ever pressed SAVE --- even once, even without changing
anything --- these seven are still on their old values:

| Setting (as it appears in ⚙️ Settings)    | Section                        | Old          | New                           |
|-------------------------------------------+--------------------------------+--------------+-------------------------------|
| Start with sidebar collapsed              | ⭲ COLLABSABLE SIDEBAR         | off          | **on**                        |
| Show Flag Icons In Unique-Values Dropdown | #₁ UNIQUE COLUMN VALUES …      | off          | **on**                        |
| Auto-resize columns on load               | ↔️ COLUMN RESIZE FEATURE       | off          | **on**                        |
| Auto-expand native “Annotation” section   | 📖 ANNOTATION SECTION          | off          | **on**                        |
| Metadata (JSON) cache TTL (days)          | 🗄️ ART ARCHIVE INDEXEDDB CACHE | 7            | **30**                        |
| Help ❓ button colors                     | 🖌️ ELEMENT UI STYLES           | darker slate | **matches the new ⚙️❓ pill** |
| Settings ⚙️ button colors                 | 🖌️ ELEMENT UI STYLES           | darker slate | **matches the new ⚙️❓ pill** |

The cache TTL is the one I'd actually recommend changing by hand. Cover-art
metadata is now cached for 30 days instead of 7, which noticeably cuts how
often big discography pages re-query the Cover Art Archive. It was only safe
to raise once a separate bug was fixed (a temporary archive outage used to be
remembered as "this release has no cover art"), which is why it waited until
now. The two button-colour rows are purely cosmetic, tied to the toolbar
redesign further down --- there's nothing to "fix" there unless you'd rather
keep the old colours.

**How to check whether any of this applies to you:** open ⚙️ Settings and look
at the greyed-out **Default** column on the right of each row. It always shows
what the setting's default *currently* is. If the widget on the left disagrees
with it and you don't remember making that choice, you're sitting on an old
default --- just set it yourself and press SAVE.

**Please don't use RESET for this.** RESET is all-or-nothing: it returns *every*
setting to its default and your customisations go with it. Change the individual
settings you care about instead. (If you do want a clean slate, press
💾 Save configuration first so you can pick values back out of the file.)

### Enhancements: the settings dialog itself

* **Saving no longer freezes your whole profile on old defaults** --- this is
  the reason the "changed defaults" table above matters at all. Pressing SAVE
  used to write down *every* setting, not just the ones you'd actually
  changed, silently pinning your profile against ever receiving a future
  default change. SAVE now stores only what you've actually changed; a
  one-time repair pass un-freezes any profile already affected by the old
  behaviour (with an Undo, if you'd rather keep your frozen values).

* **💾/📂 now also cover your workspace, not just settings** --- your pinned
  filter list, per-page-type (and per-sub-table) hidden columns, filter
  history, dialog sizes/positions, and which 📊 dropdown sections you keep
  collapsed now travel with Save/Load configuration too, instead of being
  silently left behind when you set up a new browser or profile.

* **See what you've changed, at a glance** --- changed settings get a visual
  highlight and a live count badge per section, a "● Changed only" button
  filters the whole dialog down to just your customisations, and every
  setting now has a tooltip naming its underlying storage key (handy if you
  ever hand-edit a saved configuration file).

### New: consolidated Release tracklists

* **Every track on a release, in one table** --- a new button on any release page pulls every disc/medium's tracklist into a single view you can filter and sort, instead of scrolling through separate native tables per medium. Configurable in settings (on by default).
[SCREENSHOT: the new "Show all Tracks for Release" button and the resulting consolidated tracklist table]

* **No more manual "Load all tracks" clicks** --- MusicBrainz hides a medium's tracklist beyond the first 100 tracks behind its own "Load all tracks..." link; the script now clicks that automatically and waits for every remaining track to arrive (showing a progress bar as it goes) before building the table, so a medium with hundreds of tracks --- e.g. https://musicbrainz.org/release/d288983e-d83c-435a-999f-c48172ad8d0b --- always ends up complete instead of silently cut off at 100.

* **Who recorded it, where, and when** --- the underlying work, recording date, and the event or place a track was recorded (or mixed) at now get their own columns, pulled out of the wall of relationship text MusicBrainz normally buries them in.

* **The recorded work's own credits, too** --- alongside the recording's own credits, a track's underlying work now gets its own set of columns (publisher, composer, lyricist, arranger, and anything else MusicBrainz records against the work), each prefixed "Work" so it's never confused with the recording-level column of the same name. A credit naming several roles at once ("lyricist and composer") splits into each of its own columns automatically, and a work crediting more than one entity ("is based on") lists each on its own row.

* **Engineers, producers, mixers and performers, each in their own column** --- recording engineer, producer, mixer, performer, and copyright/label credits are split out individually, with qualifiers like "additional" or "assistant" shown right next to the name. Those qualifier words now render in italic, coloured text so they stand out from the plain name/role text around them.

* **Instruments and vocals, sorted out** --- who played what and who sang what now show in their own columns instead of being buried in one long credits list. Vocal-range credits like "alto vocals" or "guest baritone vocals" land in the same "Vocals" column as every other vocal credit instead of spawning their own one-off columns.
[SCREENSHOT: release tracklist showing the credit/instrument/vocals columns]

* **Catches live-recording date mix-ups** --- for a track marked "live", a small warning or error icon flags any credit whose date doesn't match the track's own recording date --- handy for spotting data-entry mistakes at a glance.

* **Optional AcoustID/ISRC columns and streaming links** --- turn on dedicated columns for AcoustID fingerprints and ISRC codes if you need them (requires jesus2099's ["mb. INLINE STUFF"](https://github.com/jesus2099/konami-command/raw/master/mb_INLINE-STUFF.user.js) userscript), and see streaming/download links per track when the "MB: Inline per-recording streaming & download links" companion script is installed.

* Added support for **individual ISRC pages** --- an /isrc/<code> page (listing every recording sharing that code) now loads and filters like everything else.

* **A tidier tracklist out of the box** --- the catch-all "ARs" column (which repeats every relationship already broken out into its own column above) is now hidden by default, since its info is duplicated elsewhere --- one click in the column-visibility menu brings it back if you want it. You can now also pre-hide any column, for any page type, the same way (see COLUMN MANAGEMENT below).

* **Multi-recording credits, each on their own line** --- a relationship crediting several different source recordings at once (e.g. a DJ-mix referencing multiple originals) now lists each one on its own row instead of silently merging them together.

* **Multiple credited series on one track, each on its own line** --- a track crediting more than one series at once ("Part of series") now lists each one separately instead of gluing them into one row, and its own 📊 filter dropdown lets you filter by a credited series' own name, comment or numeric position individually.

### New: millisecond-precision track lengths

* **See track lengths down to the millisecond** --- MusicBrainz stores every track length far more precisely than it displays it. A new ⏱ toggle at the left of any "Length" column heading reveals that full precision ("4:50" becomes "4:50.160") and switches back just as easily. On a release page this costs nothing at all --- the numbers are already sitting in the page. On dozens of other pages that list recordings (an artist's or work's recordings, ISRC pages, search results, and more) it's fetched on demand instead, batched into as few requests as the page allows, and remembered afterwards --- both for the rest of your session and, cached locally for up to 30 days, the next time you see that same recording on a *different* page --- so you rarely pay for it twice. If a batch partly fails, the rows that came back are shown right away and the toggle stays retryable for just what's missing.
[SCREENSHOT: the ⏱ toggle and a Length column showing millisecond precision]

* **A second "Recording length" column on release tracklists** --- sitting right next to the release's own "Length", this shows what MusicBrainz has on record for the underlying recording itself, whenever it disagrees with this particular release's own track length, which happens more often than you'd expect (six of eight tracks on *Born to Run*, for instance). Where the two always agree, no extra column is added at all.

* **Flags a track/recording length mismatch automatically** --- when a track's length and its underlying recording's length differ by more than a threshold (configurable in settings), both cells get a ⚠️, or a ❌ past a larger threshold, together with a tooltip spelling out which one is longer and by how much --- handy for catching data-entry mistakes at a glance. New "(N) LENGTH ⚠️"/"(N) LENGTH ❌" buttons in the filter bar jump straight to the flagged tracks.
[SCREENSHOT: a release tracklist with a flagged Length/Recording length pair]

### New: catching bad ISRCs, ISWCs and barcodes

* **ISRC and ISWC codes get checked, not just displayed** --- any ISRC (on a track, a recording, or the individual `/isrc/<code>` page) is now always shown in its proper hyphenated form (`US-S1Z-99-00001`) regardless of how the page itself renders it, and a code that doesn't fit the real ISRC shape gets a ⚠️ right on the cell. Barcodes get the equivalent check-digit validation (EAN-8/UPC-A/EAN-13/GTIN-14), and the same treatment now covers ISWCs, including a new individual `/iswc/<code>` page listing every work sharing that code.
[SCREENSHOT: an ISRC cell with its ⚠️ validity warning]

* **Filter by validity, format, or matching barcodes** --- the 📊 dropdown for any ISRC/ISWC/Barcode column now offers its own breakdown: valid vs. invalid, the code's country/registrant/year/designation segments (for ISRC), and --- for barcodes --- which releases share what MusicBrainz considers the "same" barcode once you allow for a redundant check digit or leading zero.

### New: recovering from MusicBrainz hiccups instead of failing silently

* **A page that fails partway through no longer just looks broken** --- if MusicBrainz's server has a bad moment (a 503, a timeout) three pages into a forty-page fetch, the script used to quietly stop and show you an incomplete table with no indication anything was wrong. It now retries the failed page automatically, and if it still can't get through, says so plainly ("⚠️ Loaded 3 of 40 pages --- INCOMPLETE") instead of pretending the listing is complete. A new "↻ Load remaining pages" button picks up exactly where it left off, rather than re-fetching everything from the start.

* **Cover art and Relationships data recover from a bad request instead of remembering it as "nothing there"** --- a temporary failure fetching artwork or relationship data used to be cached the same way as a genuine "this release has no cover art" or "this entity has no relationships" --- so one bad moment on MusicBrainz's end could leave a column looking permanently empty. Transient failures are no longer cached at all, dedicated "retry only what failed" buttons (⚠⟳) let you recover just the failures instead of re-fetching an entire table, and a conservative automatic retry runs quietly in the background a little while after a page settles.
[SCREENSHOT: the ⚠⟳ retry-failed button next to a Relationships column]

* **A quick artwork summary, per table** --- a new 📊-style panel next to any artwork-carrying table's heading tallies what's there --- how many covers found, their types, how many are the archive's chosen "front"/"back", approval status --- without any extra requests to the Cover Art Archive, since it's built entirely from data the script already fetched.

### New: consolidated Annotation history pages

* **A whole entity's Annotation history in one table** --- every entity type with an Annotation-history page (artist, label, release, release group, recording, work, area, place, series, event, instrument) now gets a "Show Annotation History" button that pulls every past revision into the same filterable/sortable view as everything else, instead of MusicBrainz's own plain listing.
[SCREENSHOT: the new "Show Annotation History" button and consolidated table]

* **More to see about who edited it** --- the Editor column now also shows (and lets you filter by) whether an editor's account has since been deleted, how long they've been an active editor, and their historically-recorded name when it differs from their current one.

* **"Compare versions" made easier** --- the button moved up into the page header for quicker access, opens the comparison in a new tab by default (so you don't lose your place), and any two revisions can now be compared with each other, not just against the newest one.

### Enhancements: a smarter filter dropdown

* **Column filter dropdown reorganised into collapsible sections** --- the little 📊 dropdown's extra filter options (structure, flags, credit details, names, roles, relationship icons, cover-art details, and more added since) are now grouped under clickable, collapsible headings instead of one long undifferentiated list, and the quick-search box searches across all of them at once. The "names" section was later split further into its own collapsible group per entity type (artist, event, place, ...).
[SCREENSHOT: the reorganised unique-values dropdown with its collapsible sections]

--> https://musicbrainz.org/release/6d19588c-0305-4fb0-b687-d4b75a75c3fd -> DVD Video "Recording artist" column -> uvd menu open


* **Smarter name/role/credit filters** --- ready-made filters for individual artist/place/work names, artist roles, and credit details (like "additional", a specific instrument, or a date range) show up wherever they're relevant, without you having to type them out. Later additions cover how several people are joined together in one credit ("&", "with", "feat.", ...) and names a companion script has flagged as differing from an entity's real/canonical name. A newer addition lets you filter by a single credited role even inside a combined credit --- e.g. matching "composer" also matches someone credited as "composer, lyricist" together.

* **New structural filters for release and media details** --- distinct disc formats and sizes, release country/date/weekday, catalog-number prefixes, per-medium track counts, tag-vote counts, and the "(cancelled)" event marker are now each their own filterable, checkable entries where relevant. A newer addition adds a quick High / Low / Not marked filter for MusicBrainz's own release data-quality rating, wherever a Release column --- or a relationship listing's "Title" column pointing at a release --- appears.
[SCREENSHOT: the reorganised 📊 dropdown showing the new Format/Release events/Catalog sections]

* **Multi-select relationship-icon filtering** --- relationship icons in the filter dropdown can now be checked and unchecked like any other filter option, instead of only letting you pick one at a time.

* **Cover-art filter details** --- cover-art and event-art columns get their own filter section for image type and image comment.

* **Country flags show up more consistently** in the filter dropdown for country/area columns when the ["MusicBrainz: More Flags Everywhere"](https://github.com/Lotheric/metabrainz-userscripts/raw/refs/heads/main/MusicBrainz_More_Flags_Everywhere.user.js) userscript (@Lotheric) is installed.

* **Configurable filter dropdown height** --- how many entries show before the dropdown list scrolls is now adjustable in settings.

* **Smoother keyboard/mouse use** --- hovering an entry with the mouse and moving the keyboard cursor no longer show two different highlighted rows at once, and closing the dropdown returns your typing cursor to the filter box you were in.

* **Collapse or expand every filter section at once** --- Ctrl+Click any section heading in the 📊 dropdown to fold or unfold all of them together, instead of one at a time --- handy now that there are quite a few sections.

* **A "Date info" section on every date column** --- any column showing a date (Release date, Begin/End, Recording date, Revision date, election dates, and more) now offers the same rich breakdown: whether it's a complete date, a partial one, or a range; and open lists letting you filter by decade, calendar month, year, or day of the week.
[SCREENSHOT: the new Date info section in a 📊 dropdown]

* **Length columns get their own info section** --- bucket recordings by how long they run (in one-minute bands), by how far they deviate from the page's own average length (live/extended versions are excluded from that average so they don't skew it), or simply by whether they're flagged as a live recording at all.

* **Filter by pending MusicBrainz edits** --- MusicBrainz already highlights an entity that currently has open/pending edits; a new ⏳ toggle in the filter bar narrows the table down to just those rows (on a multi-section page, each section gets its own toggle plus a combined master button), and the 📊 dropdown gains matching "Pending edits" sections so you can filter to one specific in-edit entity by name as well.

* **Two entities that happen to share a name are no longer conflated** --- e.g. two different areas both called "New York" (the city and the state) now get their own separate, independently filterable entries instead of one entry silently matching both.

* **More columns get their own dedicated filter sections** --- an alias's Locale (language + primary flag), instrument-list comments/descriptions, catalog-number prefixes (now recognised in many more real-world formats, and split into individually filterable words), AcoustID link status, CD stub "Added"/"Modified" ages, and native recording-attribute words (live, cover, partial, ...) each now have their own section, the same way names, roles and credit details already did.

* **Editor-detail filtering extended to Elections** --- the same "has this editor account been deleted / how long have they been active / recorded name" breakdown already available on Annotation-history pages now also works for the Candidate/Proposer/Seconder columns on the Elections pages.

### Enhancements: other

* **"Show single-table" button** (on by default) --- on pages that split results across several category sub-tables (relationship listings, place performances, an artist's release groups, a release group's releases), any sub-table that MusicBrainz itself doesn't already paginate behind its own "see all" link gets this button: click it to open that sub-table's already-rendered rows as a plain, single, unified table in a new tab, instead of the usual split-by-category layout.
[SCREENSHOT: the "Show single-table" button next to a relationship category]

* **Friendlier multi-value lists** --- a cell listing several people or tags now reads naturally, e.g. "Jon Landau, Chuck Plotkin and Bruce Springsteen", instead of a plain comma-separated run.

* **Sensible defaults for new installs** --- several settings now default to more useful values out of the box: flag icons in the filter dropdown, more visible dropdown rows, and auto-resizing columns on load are all now on by default. Anyone who already changed one of these keeps their own choice.

* **Pick which columns start hidden, per page type** --- a new settings table lets you decide which columns should start hidden the very first time a given page type's table renders, instead of hiding them by hand every time via the column-visibility menu.

* **Relationships column now loads on demand, and a lot faster when it does** (now also available on an artist's Works listing) --- on a big catalogue (a prolific artist's releases, say) the Relationships column used to quietly fetch data for every single row in the background the moment the page opened, which could take the better part of an hour on the largest pages. It now starts collapsed on any table over a configurable size (200 distinct entities by default), with a ▶🔗/▼🔗 button in the header that tells you up front how many lookups it will cost before you commit to them; small tables keep loading automatically as before, and once loaded the data stays cached so re-expanding it again is instant. On seven of the most common listing types it now fetches up to 100 rows in a single request instead of one request per row, so expanding a large table is dramatically faster than it used to be.
[SCREENSHOT: the collapsed Relationships column with its cost estimate]

* **Load, or reload, just one row** --- each Relationships cell now shows its own tiny load-state glyph (loading / no data / failed / not yet loaded), and clicking a single cell loads just that row --- even in an otherwise-collapsed column. Hovering a loaded cell offers ⟳ to refresh it by hand, and the header toggle shows live progress ("340/2301") while a table is loading. The 📊 dropdown also gains a "Load state" section so you can filter straight to rows that failed or haven't loaded yet.

* **The Picard tagger column also starts collapsed**, for the same reason --- building all those "send to Picard" buttons costs time even when you're not tagging anything. A per-table ▶♪/▼♪ toggle (and a page-wide "Show all Picard" button) reveals them on demand.

* **Multi-release recording search results no longer look broken** --- MusicBrainz's own search results page lists a second, third, etc. release credited to one recording as an unlabeled, misaligned row; those now merge cleanly into that recording's own row as extra list entries, with the same collapse/expand, filtering and inline cover-art support as any other multi-value cell.

* **Cover art no longer flickers and "reloads" on every sort or filter** --- artwork icons, inline thumbnails and the big-picture strips were all being torn down and rebuilt on every table refresh even when nothing about them had actually changed, which made large pages feel like they were constantly re-downloading images. They're now left alone whenever nothing changed, so only genuinely new artwork is ever fetched or repainted.

* **Sorting one section of a multi-section page no longer touches any other section** --- reordering a single sub-table (one artist discography category, one relationship-type group, ...) used to silently rebuild every other sub-table on the page as well; now only the one you sorted is touched, which is both noticeably faster on a big page and leaves everything else exactly as you left it.

* **The unique-values dropdown reopens instantly** --- reopening the same column's 📊 panel with nothing having changed since used to redo several full passes over the table every time; it's now served from a cache instead and typically opens dozens of times faster.

* **Column header buttons are easier to see and use** --- the small ▶🖼/▶⏱/▶♪/▶🔗 toggles, the multi-row-collapse ▶N▤ toggle, the Release-events retry indicator, and the 📊 filter-count badge all now sit on their own light, legible pill regardless of the column's own background colour (a few of them were nearly invisible before), the multi-row and filter-count numbers are noticeably bigger, and the sort arrows are drawn as one connected control instead of three loose glyphs.

* **A tidier toolbar** --- the row of up to 13 buttons above the table is now two pull-down menus, 📦 Data ▾ and 🛠 View ▾, plus a pinned ⚙️❓ pair for Settings and Help. Every keyboard shortcut still does exactly what it always did --- only the buttons themselves moved.
[SCREENSHOT: the new 📦 Data ▾ / 🛠 View ▾ menus]

* **❓ Help now opens as a proper page on GitHub** --- with a table of contents and working section links, instead of the old plain-text dialog. Shift-click ❓ (or press `H`) if you'd rather keep using the in-page version.

* **Shorter, tidier action buttons, with the full text still one hover away** --- the page-load buttons above the table used to spell out "Show all Events for Artist", "Tags for Artist", "Relationships for Label (complete)" every time; they now read "Events", "Tags", "Relationships (complete)", dropping the generic "Show all"/"Show" prefix and anything that just repeated the page's own subject. Hovering any button (or a report page's "Unfiltered"/"Subscribed Only" buttons) shows a small tooltip with the full original description plus its Ctrl-M keyboard shortcut, so nothing is actually lost --- it's one hover away instead of always on screen. Three pages (subscriptions, an artist's release groups, an artist's releases) also gain a bold entity-name prefix ahead of their now-shorter buttons, e.g. "Bruce Springsteen | Releases: Artists / Various Artists".

### Enhancements: report pages

* **More report pages get clean name/comment/alias columns** --- the same clean name/comment/primary-alias splitting other report pages already had now works generically across the whole `/report/...` catalogue, recognising ten different entity-column types (release, release group, recording, label, artist, event, place, series, work, collaborator) wherever they show up --- covering well over a dozen additional reports, not just a fixed list of them.
* **Grouped report rows keep their shared label** --- reports that group several rows under one shared identifier (e.g. "Amazon URLs linked to multiple releases") now correctly carry that identifier down onto every row in the group, instead of leaving it blank or turning it into a stray empty row.
* **Reports Statistics companion script now feeds two new columns** --- when the third-party ["MusicBrainz: Reports Statistics"](https://github.com/chaban-mb/userscripts/raw/main/src/MusicBrainz%20Reports%20Statistics.user.js) (@chaban) script is installed, the Reports index page gets its own "Delta" and "When" columns pulled straight out of that script's own change indicators.

### Enhancements: aliases pages

* **Locale split into language + primary flag** --- an artist's Aliases page now shows the locale's language and whether it's marked primary as two separate, filterable columns.
* **All 11 "Aliases" pages tidied up and unified** --- artist, release, recording, work, label and the rest of the aliases pages now share one consistent, more reliable implementation, fixing a long-standing issue where a row's later columns could silently shift left by one.

### Fixes

* 📂 Load configuration no longer discards hand-edited rows in the five table-type settings (Default Hidden Columns, the three Relationships icon tables, the Unicode Character Picker) when importing a saved configuration file.
* Numeric settings documented as "0 to disable" --- including the Relationships auto-collapse threshold --- now actually honour `0`, and no longer silently revert to their built-in default the moment you've pressed SAVE once.
* Country/state columns correctly tell flagged US/Canada states apart from flagged cities, instead of occasionally mixing the two up.
* The unique-values filter dropdown's flag icons and multi-word entries now space and align correctly.
* Minor: the Series page's Artists listing works again after a regression.
* Fixed several pages (`/instruments`, `/genres`, edit-related pages, and every entity's sub-pages) not loading the script at all when the URL had a trailing slash.
* Added the missing "Show all Tags" button on an Event's tags page --- the one taggable entity type that didn't have it yet.
* Fixed a report (`PlacesWithoutCoordinates`) always showing empty locality/region/country cells.
* Fixed the "Actions" (Edit/Remove) column lingering as an empty header on alias pages after its content was already being hidden.
* Renamed the "MB-Primary alias" column to plain "Primary alias" everywhere, matching MusicBrainz's own wording.
* The video icon column now also appears for the Recordings list on tag/user-tag pages, matching other pages that already had it.
* Recording "Comment" parsing (the Event-Type/Date/Venue/City/Country columns on Work-Recordings/Artist-Recordings-style pages) no longer mixes up the venue, city, and country when the trailing note itself contains a comma, and now correctly understands MusicBrainz's "day A or day B, exact day unclear" date notation instead of losing it.
* The "Join phrases" filter entries (like "&" or "and") no longer disappear from the dropdown after closing and reopening it on an already-filtered column.
* Fixed a couple of places where picking a second filter value on a credit/role column could silently corrupt the data being matched.
* Sub-table filters (the small filter box above one category's own mini-table): fixed the "clear filters" button sometimes not appearing while one of these was active, fixed clearing one after sorting a column leaving the table permanently stuck on the old filtered rows, and fixed cover-art counts/images getting out of sync after a sort with one of these active.
* The "show/hide all sections" toggle on multi-section pages (and the four Discography-view buttons on artist pages) could get out of sync with what was actually visible on screen, and clicking it could then reveal sections that belonged to a different, currently-hidden view. Sorting a column and then switching between Discography views no longer loses the sort highlighting either.
* Cleaned up leftover clutter that a different, unrelated userscript (a tag-aggregation tool) could sometimes leave behind on the page after this script finished rendering.
* Fixed a rare crash triggered by certain other browser extensions/scripts sending unusual keyboard events.
* A few small positioning fixes on the new Annotation history page's relocated "Compare versions" button.
* Several more cases where a filter match narrowed the table correctly but wasn't visually highlighted (a match spanning a name/comment boundary, a chain of linked areas separated by commas, or CAA/EAA image type/comment text) now highlight properly.
* A column hidden via the 👁️ Column Visibility toggle no longer silently reappears, fully populated, after the next filter or sort.
* Fixed several places where a page listing recordings or relationships dropped a credited name --- or the whole cell --- whenever the underlying entity currently has a pending MusicBrainz edit (its own orange highlight), instead of showing it normally.
* Cleaned up more residue left behind by jesus2099's companion userscripts (styling/attributes bleeding into the Length column and its header, and stray millisecond values appearing on pages that don't otherwise support that feature yet), so it never leaks into the consolidated table.
* Sorting by "Length" no longer treats an unknown ("?:??") duration as zero --- unknown-length rows now always sort to the end instead of floating to the top.
* Fixed the CAA/EAA artwork column never actually sorting by artwork presence, and typing "no"/"yes" into its own filter box no longer accidentally doubles as an artwork-presence filter.
* Fixed the "Release events"/"Relationships" columns occasionally swapping their data, and the Relationships column occasionally duplicating its icons, after opening a sub-table's "Show single-table" view.
* Fixed the release data-quality filter section missing on relationship "Title" columns, and the "Recording date" column missing its date-breakdown filter sections, on release tracklists.
* Fixed a handful of third-party userscript interop issues: a stray leftover container from an unrelated script surviving on Series/Events pages, and two different flag-icon userscripts occasionally showing the wrong icon, showing it twice, or showing it in an inconsistent order/position.
* Fixed duplicate and corrupted rows on the "Top CD stubs" listing.
* Fixed the "Recorded at place"/"Mixed at place" columns sometimes repeating one place's date onto every other place credited on the same track.
* Fixed the "Artists with collaboration relationships" report's main column rendering empty.
* Minor: the video icon is centered in its cell again.

---

*Generated from FORUM.org by scripts/build-changelog-pages.py — do not edit by hand.*
