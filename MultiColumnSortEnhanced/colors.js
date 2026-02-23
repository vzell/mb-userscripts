// ==UserScript==
// @name         VZ: MusicBrainz - Show All Entity Data In A Consolidated View
// @namespace    https://github.com/vzell/mb-userscripts
// @version      9.56.0+2026-02-20
// @description  Consolidation tool to accumulate paginated and non-paginated (tables with subheadings) MusicBrainz table lists (Events, Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllEntityData.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllEntityData.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      https://cdn.jsdelivr.net/npm/@jaames/iro@5
// @require      https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js
// @require      file:///V:/home/vzell/git/mb-userscripts/lib/VZ_MBLibrary.user.js
// @match        *://*.musicbrainz.org/artist/*
// @match        *://*.musicbrainz.org/release-group/*
// @match        *://*.musicbrainz.org/release/*
// @match        *://*.musicbrainz.org/work/*
// @match        *://*.musicbrainz.org/recording/*
// @match        *://*.musicbrainz.org/label/*
// @match        *://*.musicbrainz.org/series/*
// @match        *://*.musicbrainz.org/place/*
// @match        *://*.musicbrainz.org/area/*
// @match        *://*.musicbrainz.org/instrument/*
// @match        *://*.musicbrainz.org/event/*
// @match        *://*.musicbrainz.org/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      MIT
// ==/UserScript==

/*
 * VZ: MusicBrainz - Show All Entity Data In A Consolidated View
 *
 * A userscript which accumulates paginated and non-paginated (tables with subheadings) MusicBrainz table lists (Events,
 * Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting.
 *
 * This script has been created by giving the right facts and asking the right questions to Gemini.
 * When Gemini gots stuck, I asked ChatGPT for help, until I got everything right.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome and Firefox.
 */

// CHANGELOG
let changelog = [
    {version: '9.56.0+2026-02-20', description: 'Enhancement: Visual column-group tinting for multi-column sort mode. When two or more columns are in the multi-sort chain each sorted column gets a distinct pastel tint applied to every body cell (td) and its header cell (th) in that column: amber (priority 1), sky-blue (2), mint (3), mauve (4), peach (5), teal (6), lavender (7), vanilla (8). Tints use rgba semi-transparency so the existing even/odd zebra-stripe row backgrounds remain visible underneath. A slightly more opaque variant is used for header cells so the priority is visually anchored. Tints are applied/updated by a new applyMultiSortColumnTints() helper and fully removed by clearMultiSortColumnTints() — which is called on: plain click (entering single-sort mode), ⇅ click (restoring original order), and in the single-column visual update branch. Tints are also re-applied on every runFilter() re-render via the existing trailing updateMultiSortVisuals block. Works independently per table on both single-table and multi-table pages.'},
    {version: '9.55.0+2026-02-20', description: 'Enhancement: Multi-column sort lifted to all page types. Previously Ctrl+Click multi-sort was restricted to single-table pages; multi-table pages only supported single-column sort per sub-table. Now every sub-table on a multi-table page is independently multi-sortable with the same full feature set: (1) Ctrl+Click ▲/▼ adds/updates/removes a column from that sub-table\'s own multi-sort chain; (2) auto-seeding from existing single-sort state works per sub-table; (3) plain click clears the chain for that sub-table and returns to single-sort; (4) ⇅ restores original order and clears the chain; (5) superscript priority numbers (¹²³…) are rendered on the active icons; (6) the h3 .mb-sort-status span shows "Multi-sorted by: …" text matching the single-table display. All isMultiTable guards removed from: sort-state update, debug log, visual update, isRestore determination, compareFn selection, status display, and the trailing updateMultiSortVisuals call. Tooltips unified across both page types.'},
    {version: '9.54.0+2026-02-20', description: 'Enhancement: Multi-column sort UX — auto-seed chain from existing single-sort. Previously, starting a multi-sort session required Ctrl+clicking the already-sorted column first to add it to the chain before adding further columns. Now, when the user Ctrl+clicks any sort icon on a column that is NOT the currently sorted one, the existing single-sort column is automatically promoted as priority 1 in the multi-sort chain, and the newly Ctrl+clicked column is added as priority 2. If the user Ctrl+clicks the same column that is already sorted, behaviour is unchanged (normal add/update/remove cycle). Plain clicks still clear the chain and enter single-sort mode as before.'},
    {version: '9.53.0+2026-02-20', description: 'Refactor + Enhancement (3 items): (1) showCustomAlert and showCustomConfirm merged into a single showCustomDialog(message, title, triggerButton, mode) function (mode: "alert"|"confirm"). Both original functions remain as thin wrappers so all call sites are unchanged. (2) All visual parameters of the custom popup dialog are now fully configurable via 6 new condensed pipe-separated config strings in a new "🪟 CUSTOM POPUP UI" section of configSchema: sa_popup_dialog_style, sa_popup_header_style, sa_popup_message_style, sa_popup_ok_btn_style, sa_popup_cancel_btn_style, sa_popup_btn_gap. Helper functions parseCondensedStyle / popupDialogCSS / popupHeaderCSS / popupMessageCSS / popupOkBtnCSS / popupCancelBtnCSS extract the values at render time so changes in settings take effect immediately. (3) Default values increase readability: header font-size 1.3em→1.5em, message font-size 1.05em→1.2em / line-height 1.6→1.7 / color #555→#444, border-radius 8px→10px, padding 24px→28px, max-width 550px→600px. A new stub section "🖌️ UI APPEARANCE (future)" documents the planned extension point for configuring all other UI elements (action buttons, filter inputs, subtable controls, checkboxes, etc.) via the same condensed-string pattern.'},
    {version: '9.52.0+2026-02-20', description: 'UI Fix (3 items): (1) mb-subtable-clear-btn is now always rendered to the left of span.mb-filter-status in all three subtable-controls construction sites (new-h3, reuse-existing-h3, and filter-time branches). (2) Buttons mb-toggle-prefilter-btn, mb-toggle-filter-highlight-btn, mb-clear-column-filters-btn (new ID), and mb-clear-all-filters-btn (new ID) now share the same rounded-corner visual style as mb-subtable-clear-btn (border-radius:4px, background:#f0f0f0, border:1px solid #ccc, vertical-align:middle) while preserving their individual font-size and display values. (3) Added unique IDs mb-clear-column-filters-btn and mb-clear-all-filters-btn to the two previously ID-less filter clear buttons.'},
    {version: '9.51.0+2026-02-20', description: 'UI Fix (3 items): (1) "Show all <n>" sub-table overflow button: added class mb-show-all-subtable-btn (styled like mb-subtable-clear-btn), and moved it to the beginning of span.mb-subtable-controls so it appears visually where the controls span starts. (2) Stop button repositioned in the h1 controls bar: now appears right before the first divider (mb-button-divider-initial), between the action buttons and Save/Load group. Also added type="button" and consistent inline-flex styling. (3) Ctrl-M + o keyboard shortcut: activates the Stop button, but ONLY while the Stop button is visible (i.e. during an active fetch). The shortcut is registered when the button becomes visible and deregistered when it is hidden again.'},
    {version: '9.50.0+2026-02-20', description: 'Bug fix: Invalid CSS selector prevented to read the state of the global filter input. So the highlight toggle button and the keyboard shortcut Ctrl-Shift-G were not working.'},
    {version: '9.49.0+2026-02-19', description: 'Removed "info" logging for upcoming release.'},
    {version: '9.48.0+2026-02-19', description: 'Feature: Multi-column sorting for single-table page types. (1) New createMultiColumnComparator(sortColumns, headers) function inserted alongside createSortComparator. (2) makeTableSortableUnified rewritten: state now carries a multiSortColumns:[{colIndex,direction}] array alongside lastSortIndex/sortState. Interaction model: plain click on any sort icon → single-sort mode (clears multiSortColumns, sorts by that column alone); Ctrl+Click on ▲ or ▼ → adds the column to multiSortColumns (or updates direction / removes it if already present); clicking ⇅ always restores original order and clears multiSortColumns regardless of Ctrl. Visual feedback: active icons in multi-sort mode are annotated with superscript priority numbers (¹²³…) via updateMultiSortVisuals(). Sort-status display shows "Multi-sorted by: \"Col1\"▲, \"Col2\"▼ (N rows in Xms)". Multi-table pages are unaffected (still single-column only). Tooltips updated to reflect Ctrl+Click behaviour. Removed stale progressBar/progressText/progressContainer references that were cleaned up in 9.45.0.'},
    {version: '9.47.0+2026-02-19', description: 'UI Fix: On multi-table pages the h3 sub-table control order is corrected. Previously: clearBtn → filterStatus → sortStatus → showAllBtn. Now: filterStatus → sortStatus → clearBtn → showAllBtn — status text appears immediately after the row-count, action buttons are grouped at the end. Fixed in both the new-h3 and the reuse-existing-h3 branches of renderGroupedTable.'},
    {version: '9.46.0+2026-02-19', description: 'Bug fixes: (1) Sort debug log now includes the direction icon (▲/▼/⇅) before the column index, matching the sort-status-display text. (2) Filter status display in single-table mode no longer queries tbody tr count from the DOM after an async chunked render (which only has 500 rows inserted at that point); it now uses filteredRows.length from the in-memory array, giving the correct total immediately. (3) Same fix eliminates the mismatch between the H2 row-count span (correct) and the filter-status-display (was wrong) when a global filter is active after sorting.'},
    {version: '9.45.0+2026-02-19', description: 'UI Polish: (1) Fixed vertical alignment of mb-global-status-display and mb-info-display — both now use display:inline/font-size:0.95em and rely on the parent inline-flex align-items:center instead of carrying their own height/flex context; margin-left on infoDisplay removed since parent gap handles spacing. (2) Removed mb-fetch-progress-container (and its bar/text children) and the never-used timerDisplay span from the h1 controls bar; live per-page fetch progress is now shown in globalStatusDisplay in the subheader instead. (3) Button-group separators: initialDivider (Show-all → Save/Load) is no longer removed by ensureSettingsButtonIsLast so it persists after load; a new mb-button-divider-before-shortcuts span is inserted before 🎹 at initial setup and kept pinned immediately before 🎹 by ensureSettingsButtonIsLast on every subsequent button addition, covering both the Load→🎹 (initial page) and Export→🎹 (after-load) cases.'},
    {version: '9.44.0+2026-02-19', description: 'UI Fix: statusDisplaysContainer is now injected inline into the existing <p class="subheader"> line (present on all non-search pages) so it sits on the same line as the subheader text (e.g. "~Country"). Its left edge is dynamically aligned to the first action button via getBoundingClientRect(); if the subheader text already reaches or passes that point a fixed 10px gap is used instead. On search pages (no subheader) it falls back to a dedicated block line below the h1. A resize listener keeps alignment correct in both modes.'},
    {version: '9.43.0+2026-02-19', description: 'UI Enhancement: statusDisplaysContainer is now always rendered as a block div directly below the h1 header row. Its left edge is dynamically aligned with the first "Show all" action button using getBoundingClientRect() so it tracks any entity-name length. A resize listener keeps alignment correct when the viewport changes. Removed the three separate per-page-type placement branches (search / subheader / fallback) in favour of a single universal strategy.'},
    {version: '9.42.0+2026-02-19', description: 'Refactor: Extract getColFilters() and testRowMatch() helpers to eliminate duplicated row-matching logic shared between multi-table and single-table branches of runFilter().'},
    {version: '9.41.0+2026-02-19', description: 'Add new global filter exclusion checkbox.'},
    {version: '9.40.0+2026-02-19', description: 'Enhancement: Configurable keyboard shortcut prefix. (1) New configSchema section "🎹 KEYBOARD SHORTCUTS" with sa_keyboard_shortcut_prefix setting (default: "Ctrl+M", type: keyboard_shortcut). Accepts any combination like "Ctrl+.", "Alt+X", "Ctrl+Shift+,". (2) Added helper functions parsePrefixShortcut(), getPrefixDisplay(), isPrefixKeyEvent() to centralise prefix parsing and matching. "Ctrl" in the config always matches both Ctrl and Meta/Cmd for cross-platform compatibility. (3) Refactored keydown handler: hardcoded (e.ctrlKey||e.metaKey)&&e.key===\'m\' replaced by isPrefixKeyEvent(e). (4) All button tooltips, tooltip overlay header, shortcuts-help dialog entry, debug log messages, and APP_HELP_TEXT now reflect the configured prefix dynamically via getPrefixDisplay().' },
    {version: '9.39.0+2026-02-19', description: 'Added ❓ application help button (always visible, right of ⚙️): opens a scrollable popup dialog presenting a full feature overview of the script, closeable via "Close" button or Escape key.' },
    {version: '9.38.0+2026-02-19', description: 'Fix & Enhancement: (1) "Page Reloaded" popup now positioned below the triggering "Show all" action button after final page render, consistent with other dialogs. (2) "📂 Load Table Data" dialog repositioned below the "📂 Load from Disk" button; added Alt-L shortcut to confirm/load from within the dialog. (3) Fixed OK button focus and Tab keyboard navigation in all custom popup dialogs: removed outline:none from buttons so focus outline is visible, ensuring keyboard navigation between OK and Cancel works. (4) Renamed "⌨️ Shortcuts" button to "🎹"; button is now visible immediately on page entry (before action button click), positioned left of the ⚙️ settings button.' },
    {version: '9.37.0+2026-02-19', description: 'The "Load from Disk" option now defaults to Gzipped files (*.gz).' },
    {version: '9.36.0+2026-02-19', description: 'Reordered source code: configuration and pageType definitions at the beginning of the file.' },
    {version: '9.35.0+2026-02-18', description: 'Enhancement: Replaced three native browser dialogs with custom styled implementations. (1) Page reload alert: custom dialog when MusicBrainz page is reloaded for filter stability. (2) High page count warning: custom confirm dialog instead of native when entity has more pages than configured threshold - user can proceed or cancel with keyboard support (Enter=proceed, Escape=cancel). (3) Page type mismatch: custom confirm dialog when loading file from different page type with clear warning and user choice. (4) Invalid regex alert: custom alert for invalid regex pattern in load filter. All custom dialogs match userscript styling (white background, button styling, centered, shadow, z-index 10001), support keyboard shortcuts (Enter=OK, Escape=Cancel), and auto-focus OK button for accessibility.'},
    {version: '9.34.0+2026-02-18', description: 'Enhancement: Comprehensive Ctrl-M Emacs-style keybinding system with tooltip. (1) Press Ctrl-M and release to enter mode, then press key: 1-9 select action buttons, a-z select additional buttons (up to 35). (2) Function shortcuts: r=Auto-Resize, t=Stats Panel, s=Save to Disk, d=Density, v=Visible Columns, e=Export, l=Load from Disk, ?=Show Help. (3) Configurable tooltip (default enabled) displays all available shortcuts when Ctrl-M is pressed, positioned in upper right of content div without overlapping sidebar. (4) Underlined keyboard shortcuts in button text for visual reference. (5) Tooltip auto-hides when mode exits (Escape, timeout, or selection). (6) Extended key support (1-9, a-z, A-Z, ,;.:-_+*<>#\'?!%&/()=) for future extensions.'},
    {version: '9.33.1+2026-02-17', description: 'Enhancement: Added action shortcuts and h3 Ctrl+Click functionality. (1) Ctrl+M: Triggers the first "Show all" action button on the page - useful for pages with multiple action buttons (chooses first one). (2) h3 Headers: Added Ctrl+Click support to toggle ALL h3 headers (types) simultaneously, matching h2 functionality. Regular click still toggles individual h3. Updated tooltip: "Click to Collapse/Uncollapse table section (Ctrl+Click to toggle all types)". (3) Added Ctrl+M to shortcuts help dialog.'},
    {version: '9.33.0+2026-02-17', description: 'Major Enhancement: Extended keyboard shortcuts and smart button visibility. (1) "Visible Columns": Added "Choose <u>c</u>urrent configuration" button with Alt-C shortcut. (2) Collapse shortcuts: Ctrl-2 toggles all h2 headers, Ctrl-3 toggles all h3 headers (types) - mimics existing Ctrl-click and Show/Hide all functionality. (3) Smart button visibility: "Toggle highlighting", "Clear all COLUMN filters", and "Clear ALL filters" buttons now only appear when filters are actually active. (4) Updated Shortcuts help with comprehensive sections for all menu-specific and global shortcuts including new View & Layout section.'},
    {version: '9.32.0+2026-02-17', description: 'Enhancement: Extended keyboard navigation for menus. (1) "Visible Columns": Added Ctrl+V to open menu, Tab cycles through checkboxes and buttons, Alt-S triggers "Select All", Alt-D triggers "Deselect All" (only when menu open). Buttons now show underlined letters (<u>S</u>elect All, <u>D</u>eselect All). (2) "Density": Added Ctrl+D to open menu. (3) "Export": Close button in export complete popup now auto-focused for quick dismissal with Enter or Space.'},
    {version: '9.31.0+2026-02-17', description: 'Enhancement: Added keyboard navigation to pull-down menus. (1) "Visible Columns": Up/Down to navigate checkboxes, Space/Shift to toggle selection, Enter to close. Auto-focus first checkbox on open. (2) "Density": Up/Down to navigate options with immediate table preview, Enter to apply and close. Auto-focus current density on open. (3) "Export": Up/Down to navigate formats, Enter to execute and close. Auto-focus first option on open. All menus now have visual focus indicators and support keyboard-only operation.'},
    {version: '9.30.0+2026-02-17', description: 'Fix: "Collapsable Sidebar" and "Auto-Resize Columns" feature break "Stick Table Headers" feature.'},
    {version: '9.26.1+2026-02-16', description: 'Fix & Enhancement: (1) Removed redundant "Unhighlight prefilter" button (functionality now in dynamic prefilter toggle button). (2) Fixed "Toggle highlighting" button restore functionality - now correctly restores filter highlights by re-running runFilter() instead of manual highlight re-application. (3) Added 🎨 emoji to dynamic prefilter button text (e.g., "🎨 2 rows prefiltered: \'Westfalenhalle\'").'},
    {version: '9.26.0+2026-02-16', description: 'Major Enhancement - Split Toggle Functionality: (1) Created separate prefilter toggle button that only appears when data is loaded from disk with a prefilter. Shows dynamic text like "2 rows prefiltered: \'Westfalenhalle\'" and only toggles prefilter highlighting. (2) "Toggle highlighting" button now only toggles global filter and column filter highlighting, not prefilter. (3) Separate tracking for prefilter and filter highlight states with independent save/restore functions. (4) Both buttons change background color to their respective highlight colors when highlighting is disabled.'},
    {version: '9.25.0+2026-02-16', description: 'Major Enhancement: (1) "Unhighlight all" button renamed to "Toggle highlighting" with toggle functionality - click once to remove all highlights, click again to restore them. (2) Prefilter information now displayed in button text instead of separate span (e.g., "2 rows prefiltered: \'Westfalenhalle\'"). (3) Button changes background color to highlight color when highlighting is disabled, providing visual feedback. (4) Improved highlight save/restore using re-application of highlighting parameters rather than DOM manipulation.'},
    {version: '9.24.2+2026-02-16', description: 'Fix: Prefiltering when loading from disk now works correctly. Updated fileInput.onchange handler to read filter parameters (query, case sensitivity, regex) from UI elements before calling loadTableDataFromDisk().'},
    {version: '9.24.1+2026-02-16', description: 'Fix: Resolved "Cannot access settingsBtn before initialization" error by moving settingsBtn declaration before its first usage in controlsContainer.'},
    {version: '9.24.0+2026-02-16', description: 'UI Enhancement: (1) Clear column filter buttons now render ✗ symbol in red for better visibility - refactored into createClearColumnFiltersButton() helper function to avoid code duplication. (2) Settings button (⚙️) relocated: initially appears after Load from Disk button, then always as last button after data is loaded. (3) Added dividers " | " between button groups: initially between action buttons and Save to Disk; after data load between Load from Disk and Auto-Resize.'},
    {version: '9.23.0+2026-02-16', description: 'UI Restructuring: Moved global status display and info display from h1 header to subheader area. Now appears one line below h1 header inside <p class="subheader"> after entity link (for all page types except search). For search pages, displays immediately below h1. Aligns with controls container for consistent layout.'},
    {version: '9.22.0+2026-02-16', description: 'Enhancement: Added dedicated infoDisplay area for general status messages (Auto-resize, Density, Export, Load operations) separate from filtering/sorting status. These messages no longer overwrite filter/sort status and appear in their own display area after the global status display.'},
    {version: '9.21.1+2026-02-16', description: 'Fix: Escape key two-press behavior in filter fields now works correctly. Removed conflicting old Escape handlers that were immediately clearing and blurring the field. First press now properly clears and keeps focus, second press blurs as intended.'},
    {version: '9.21.0+2026-02-16', description: 'UI Enhancements: (1) Escape key in filter fields: first press clears field but keeps focus, second press removes focus. (2) Shortcuts help dialog redesigned with modern white background, organized sections, and better readability - no more dark overlay. (3) Added "Click outside or press Escape to close" text to Shortcuts, Density, and Export menus for consistency.'},
    {version: '9.20.2+2026-02-16', description: 'Enhancement: (1) Ctrl-C now intelligently skips checkbox columns and number columns (#), focusing on the first actual data column filter. (2) All Ctrl/Cmd keyboard shortcuts now work even when typing in input fields, enabling seamless cycling between filter fields without losing focus. Only ? and / shortcuts require not typing in input fields.'},
    {version: '9.20.1+2026-02-16', description: 'Fix: Ctrl-C keyboard shortcut now works correctly - fixed incorrect CSS class selector (was mb-filter-row, should be mb-col-filter-row). Automatically skips checkbox columns and focuses on first actual filter input field.'},
    {version: '9.20.0+2026-02-16', description: 'Enhancement: (1) Added Ctrl-C keyboard shortcut to focus first column filter field. On multi-table pages, repeatedly pressing Ctrl-C cycles through all tables. (2) Export button dropdown menu now uses same styling as Density button for consistency - includes header and descriptive text for each format.'},
    {version: '9.19.0+2026-02-16', description: 'Fix: Fixed button duplication bug when loading data from disk. Buttons from Auto-Resize to Export in the h1 header line are no longer doubled after data load finishes. All button-adding functions now check for existing buttons before creating new ones.'},
    {version: '9.18.0+2026-02-15', description: 'Major enhancements: (1) Settings button now works by triggering menu link. (2) Export button renamed to "Export" with dropdown menu offering CSV, JSON, and Emacs Org-Mode formats. (3) Save to Disk now uses gzip compression (.json.gz) for ~60-80% file size reduction with minimal performance cost. Load from Disk automatically detects and decompresses .gz files. Added pako library for compression.'},
    {version: '9.17.1+2026-02-15', description: 'Fix: Moved ⚙️ Settings button to h1 header (entity name header) instead of h2 header as originally intended. Button floats right and remains at far right edge when window resizes.'},
    {version: '9.17.0+2026-02-15', description: 'Fix: ⚙️ Settings button now properly positioned at far right of h2 header with float:right (responsive to window size). Fixed Ctrl-F shortcut to properly focus global filter. Fixed Stats panel to show correct statistics across all tables (Total/Visible/Hidden Columns, Filtered Out rows, Global Filter value).'},
    {version: '9.16.0+2026-02-15', description: 'UI Polish: Added tooltips to unhighlight buttons, clear filter buttons, and all Show all/RG/release buttons. Added global ⚙️ Settings button in h2 header (right-aligned) to open settings manager dialog.'},
    {version: '9.15.0+2026-02-15', description: 'Fix: Sub-table status displays (filter/sort) now properly appear in h3 headers on multi-table pages (like release-group pages). Previously only showed on initial render, not when filtering. Global filter status now displays correctly in h2 header for all multi-table page types.'},
    {version: '9.14.0+2026-02-15', description: 'Enhancement: "Visible Columns" button now displays in red when not all columns are visible, providing visual feedback about hidden columns.'},
    {version: '9.13.0+2026-02-15', description: 'Fix: Hiding/showing columns after Auto-Resize now properly updates column widths and table layout. Previously caused text wrapping and misalignment. Hidden columns now properly removed from width calculation, shown columns re-measured. Status message now shows correct visible column count (not summed across tables).'},
    {version: '9.12.0+2026-02-15', description: 'Fix: Auto-Resize now properly handles hidden columns from Visible Columns feature. Previously caused rendering glitches where content spread across wrong columns. Now skips hidden columns entirely during measurement and sizing.'},
    {version: '9.11.0+2026-02-15', description: 'Fix: Auto-Resize now includes sorting symbol widths (⇅, ▲, ▼) in column header measurement. Previously columns with short data could be sized too narrow, cutting off header content.'},
    {version: '9.10.0+2026-02-15', description: 'Fix: Column visibility menu now auto-sizes to content without scrollbars. Status display font sizes adjusted to better correspond with h2/h3 header text heights.'},
    {version: '9.9.0+2026-02-15', description: 'Enhancement: Column visibility menu now has a draggable header and additional separator with close instructions.'},
    {version: '9.8.0+2026-02-15', description: 'Enhancement: Separate sorting and filtering status displays with different fonts for clarity. Applied to both single-table and multi-table pages.'},
    {version: '9.7.0+2026-02-15', description: 'Add: Sub-table specific status displays and clear filter buttons in h3 headers on multi-table pages.'},
    {version: '9.6.0+2026-02-15', description: 'Fix: Add toggle column visibility to ALL tables on multitable pages.'},
    {version: '9.5.0+2026-02-15', description: 'Reintroduce browser native "confirm" instead of modal dialog, otherwise execution hangs.'},
    {version: '9.4.0+2026-02-15', description: 'Reorderd action buttons in a more logic workflow.'},
    {version: '9.3.0+2026-02-15', description: 'Fix: Better sidebar toggling to get more real estate for data container when sidebar is collapsed.'},
    {version: '9.2.0+2026-02-15', description: 'Fix: Status display now correctly shows sorting/filtering results with table name and column info. Fixed ReferenceError that caused "Sort failed" and "Filtering..." to persist incorrectly.'},
    {version: '9.1.0+2026-02-15', description: 'Add new clear all filter button, global AND column level.'},
    {version: '9.0.0+2026-02-15', description: 'New status display handling, global and sorting/filtering related.'},
    {version: '8.0.0+2026-02-15', description: 'Function descriptions throughout.'},
    {version: '7.4.0+2026-02-14', description: 'New configuration dialog with sections and dividers. Make all UI features opinionated.'},
    {version: '7.3.2+2026-02-14', description: 'Fix: Resize handles now persist after clicking "Restore Width" button. Previously handles were removed during restore and not re-added, preventing further manual resizing. Now handles are automatically restored so users can continue resizing columns after restoration.'},
    {version: '7.3.1+2026-02-14', description: 'Fix: Manual column resizing now works correctly on initial page load. Fixed undefined variable bug that prevented drag-to-resize from functioning when resize handles were added automatically.'},
    {version: '7.3.0+2026-02-14', description: 'Enhancement: Manual column resizing now enabled immediately on page render - no need to click Auto-Resize first. Button labels improved: "👁️ Visible Columns" (was "Columns"), "Export 💾" (was "Export CSV"). Users can now drag column edges to resize as soon as table loads.'},
    {version: '7.2.0+2026-02-14', description: 'Feature: Added manual column resizing - drag column edges with mouse to adjust widths (like Excel/Sheets). Resize handles appear after auto-resize or when manually adjusting. Button changes to "Restore Width" during manual resizing. Restore button restores both auto-resized and manually adjusted columns to original state. Visual feedback with hover highlights and green active indicator.'},
    {version: '7.1.1+2026-02-14', description: 'Fix: Auto-Resize Columns now accurately measures cells with images, icons, and links. Previously used text-only measurement which caused columns with flag icons (like Country/Date) to be artificially wider. Now clones actual cell content preserving HTML structure for precise width calculation.'},
    {version: '7.1.0+2026-02-14', description: 'Enhancement: Auto-Resize Columns now has toggle functionality - click once to resize, click again to restore original widths. Button changes to "↔️ Restore Width" when active with green highlight. Original table state is preserved and fully restored including colgroup, table layout, and scroll settings.'},
    {version: '7.0.0+2026-02-13', description: 'Feature: Added Auto-Resize Columns - automatically calculates optimal column widths to prevent text wrapping. Click "↔️ Auto-Resize" to fit each column to its content. Enables horizontal scrolling in content area while keeping sidebar fixed. Perfect for wide tables with many columns.'},
    {version: '6.9.0+2026-02-13', description: 'Feature: Added Table Density Control - choose between Compact (fit more rows), Normal (balanced), or Comfortable (easier reading) spacing options using "📏 Density" button. Adjusts padding, font size, and line height for optimal viewing based on personal preference.'},
    {version: '6.8.0+2026-02-13', description: 'Feature: Added Quick Stats Panel - displays table statistics including row counts, column counts, filter status, memory usage, and more. Click "📊 Stats" button or any visible/hidden item counts. Perfect for understanding data at a glance.'},
    {version: '6.7.0+2026-02-13', description: 'Feature: Added keyboard shortcuts for power users - Ctrl+F (focus filter), Ctrl+Shift+F (clear filters), Ctrl+E (export CSV), Ctrl+S (save), Ctrl+L (load), Escape (clear focused filter), ?/slash (show help). Includes "⌨️ Shortcuts" help button.'},
    {version: '6.6.0+2026-02-13', description: 'Feature: Added CSV export - export visible rows and columns to CSV file using the "📥 Export CSV" button. Automatically generates filename with timestamp and page type. Perfect for using data in Excel, Google Sheets, or other applications.'},
    {version: '6.5.0+2026-02-13', description: 'UI: Added column visibility toggle - users can now show/hide individual columns using the "👁️ Columns" button. Includes Select All/Deselect All options for quick control. Perfect for customizing view and focusing on relevant data.'},
    {version: '6.4.0+2026-02-13', description: 'UI: Added sticky table headers - column headers and filter row remain visible while scrolling through large tables. Improves usability when working with thousands of rows.'},
    {version: '6.3.0+2026-02-13', description: 'Performance: Optimized table sorting with async chunked merge sort algorithm for large tables (>5000 rows). Added progress bar for sorts over 10k rows. Improved sort timing display with color-coded indicators. Better numeric column detection.'},
    {version: '6.2.0+2026-02-13', description: 'Performance: Added debounced filtering with configurable delay (default 300ms) to prevent UI freezing with large tables. Added filter timing display in status line showing execution time with color-coded performance indicators.'},
    {version: '6.1.0+2026-02-13', description: 'Fixed Regexp filtering with column filter when decorating symbols like "▶" are in front.'},
    {version: '6.0.0+2026-02-13', description: 'Fixed Regexp filtering with global filter not take into account each column separately.'},
    {version: '5.0.0+2026-02-13', description: 'Implemented a chunked renderer with progess updates when a configurable number of fetched rows is exceeded.'},
    {version: '4.5.0+2026-02-13', description: 'Add large dataset handling by directly offering for saving to disk instead of rendering.'},
    {version: '4.4.2+2026-02-13', description: 'Add popup dialog to enter prefilter string instead of showing it on the main page all the time.'},
    {version: '4.4.1+2026-02-12', description: 'Add highlightning of pre-filter expression.'},
    {version: '4.4.0+2026-02-12', description: 'Add "pre filter when loading" functionality.'},
    {version: '4.3.1+2026-02-12', description: 'Fix: Remove duplicate filter row when loading from disk. Fix: Restore alternating even/odd row backgrounds.'},
    {version: '4.3.0+2026-02-12', description: 'Add offline storage/cache feature: Save table data to disk and load from disk to avoid re-fetching from MusicBrainz.'},
    {version: '4.2.0+2026-02-11', description: 'Refactor removing columns with a removalMap object.'},
    {version: '4.1.0+2026-02-11', description: 'Pass a function to the library constructor that dynamically checks the debug logging flag.'},
    {version: '4.0.0+2026-02-11', description: 'Userscript renamed to better reflect current functionality.'},
    {version: '3.3.0+2026-02-11', description: 'Fix broken Aliases pages resulting in column misalignment.'},
    {version: '3.2.0+2026-02-10', description: 'Fix Artist-Aliases pages not rendering the "Artist credits" table with sorting/filtering.'},
    {version: '3.1.0+2026-02-10', description: 'Fix overflow tables for Area-Releases pages in the case of Relationship subtable.'},
    {version: '3.0.0+2026-02-10', description: 'Add support for Area-Releases pages with multiple different initial table data.'},
    {version: '2.7.0+2026-02-09', description: 'Transform search results paragraph into collapsible H2 header.'},
    {version: '2.6.0+2026-02-08', description: 'Add "Area splitting".'},
    {version: '2.5.1+2026-02-08', description: 'Fix URL construction to preserve query parameters (fixes Search pages). Added extra debugging for table detection.'},
    {version: '2.5.0+2026-02-08', description: 'Fix support for Search pages: target .pageselector-results instead of h2 for row counts/filters.'},
    {version: '2.4.0+2026-02-07', description: 'Fix detection of filtered MusicBrainz pages (link_type_id) to allow proper pagination instead of treating them as overview pages (e.g. Artist-Relationships.'},
    {version: '2.3.0+2026-02-05', description: 'Handle multitable pages of type "non_paginated" like Place-Performances.'},
    {version: '2.2.1+2026-02-04', description: 'Refactor column removal in final rendered table. Supports now "Release events" column from jesus2099 Super Mind Control script.'},
    {version: '2.2.0+2026-02-04', description: 'Support for "Show all Performances for Recordings".'},
    {version: '2.1.0+2026-02-04', description: 'Refactor the single- and multi-table on one page sorting functions.'},
    {version: '2.0.0+2026-02-03', description: 'Refactor the pageType detection.'},
    {version: '1.8.0+2026-02-03', description: 'Add support for RegExp filtering with an additional "Rx" checkbox.'},
    {version: '1.7.0+2026-02-02', description: 'Make sidebar collapse conditional on setting and only init after process completion.'},
    {version: '1.6.2+2026-02-02', description: 'Fix pageType Recording-Releases (button text was wrong).'},
    {version: '1.6.1+2026-02-02', description: 'Expose loggerInterface.prefix with getter/setter.'},
    {version: '1.6.0+2026-02-02', description: 'Add color picker for variables which represent a color.'},
    {version: '1.5.0+2026-02-01', description: 'Refactored settings, logging and changelog handling to a library.'},
    {version: '1.4.0+2026-02-01', description: 'Refactored settings to a schema-driven framework.'},
    {version: '1.3.0+2026-01-30', description: 'Implemented Ctrl+Click on headers to toggle all headers within the same container (sidebar vs main content).'},
    {version: '1.2.0+2026-01-30', description: 'Added collapsable sidebar functionality with a handle on the vertical line.'},
    {version: '1.1.0+2026-01-30', description: 'Increased the size of the filter input boxes and text. Several other small UI improvements.'},
    {version: '1.0.0+2026-01-30', description: 'Support "Official" and "Various Artists" on Artis-Releases pages.'},
    {version: '0.9.4+2026-01-29', description: 'Modernized logging framework with colors, icons, and structured levels.'},
    {version: '0.9.3+2026-01-29', description: 'Added visual progress bar with centered estimated time and dynamic coloring.'},
    {version: '0.9.2+2026-01-29', description: 'Show busy cursor for long running sort operations (> 1000 table rows)'},
    {version: '0.9.1+2026-01-29', description: 'Added "Esc" key handling for clearing the filter fields when focused; Added "ChangeLog" userscript manager menu entry.'},
    {version: '0.9.0+2026-01-28', description: '1st official release version.'}
];

// APPLICATION HELP TEXT
const APP_HELP_TEXT = `\
VZ: MusicBrainz — Show All Entity Data In A Consolidated View
=============================================================

PURPOSE
-------
Consolidates paginated and non-paginated MusicBrainz table lists (Events,
Recordings, Releases, Works, Artists, Labels, Release Groups, and more) into a
single scrollable, filterable, sortable view.

SUPPORTED PAGES
---------------
• Artist:   Release Groups, Releases, Recordings, Works, Events, Aliases,
            Relationships (including filtered link_type_id pages)
• Release Group, Release, Recording, Work, Label, Series, Place, Area,
  Instrument, Event pages — all supported sub-tabs
• Search result pages (all entity types)

GETTING STARTED
---------------
1. Navigate to any supported MusicBrainz entity page (e.g. an Artist's
   Recordings tab).
2. Click the "Show all …" action button in the controls bar to start fetching
   all pages from the MusicBrainz database.
3. A real-time progress bar tracks the fetch; click "Stop" (or Ctrl-M, then o) to abort
   at any time.
4. When complete, the consolidated table appears with filtering, sorting, and
   all UI features active.

ACTION BUTTONS
--------------
• 💾 Save to Disk    — save the current dataset as a compressed .json.gz file
• 📂 Load from Disk  — load a previously saved dataset (with optional
                       pre-filter); Alt-L inside the dialog to confirm
• ↔️ Auto-Resize     — fit all columns to their content (toggle to restore)
• 📊 Stats           — show a statistics panel (row/column counts, memory, …)
• 📏 Density         — choose Compact / Normal / Comfortable row spacing
• 👁️ Visible Columns — show/hide individual table columns; Alt-S / Alt-D to
                       select/deselect all
• Export 💾          — export visible data as CSV, JSON, or Emacs Org-Mode
• 🎹                 — show keyboard shortcuts reference (or press ?)
• ⚙️                 — open the Settings Manager to configure all options
• ❓                 — show this help dialog

FILTERING
---------
• Global Filter — type in the large input box to filter all columns at once
• Column Filters — per-column filter row below the table header
• Both support plain text, case-sensitive (Cc checkbox), and RegExp (Rx
  checkbox) matching
• Ctrl-C  — focus first column filter; repeated presses cycle through tables
• Ctrl-F  — focus global filter field
• Escape  — first press clears focused filter, second press removes focus
• 🎨 Toggle highlighting — toggle highlight colours on/off for active filters
• Pre-filter — enter a filter expression in the "Filter data load…" field
  before loading from disk to load only matching rows

SORTING
-------
• Click any column header (⇅) to sort ascending; click again for descending
• Visual indicator changes to ▲ / ▼ on the active sort column
• Large tables use an async chunked merge-sort with a progress bar

COLLAPSING / EXPANDING
-----------------------
• Click an h2 header to collapse/expand its table section
• Ctrl-Click an h2 to toggle all h2 headers simultaneously
• Click an h3 header to collapse/expand its type group
• Ctrl-Click an h3 to toggle all h3 headers simultaneously
• Show All / Hide All links per section
• Ctrl-2 — keyboard shortcut to toggle all h2 headers
• Ctrl-3 — keyboard shortcut to toggle all h3 headers

KEYBOARD SHORTCUTS (global)
----------------------------
  ?  or  /       Show keyboard shortcuts help (🎹)
  Ctrl-F          Focus global filter
  Ctrl-C          Focus first column filter (cycles through tables)
  Ctrl-Shift-F    Clear all filters
  Ctrl-S          Save to Disk
  Ctrl-L          Load from Disk dialog
  Ctrl-E          Open Export menu
  Ctrl-D          Open Density menu
  Ctrl-V          Open Visible Columns menu
  Ctrl-2          Toggle all h2 section headers
  Ctrl-3          Toggle all h3 type headers
  Escape          Clear focused filter / close open menus

CTRL-M PREFIX SHORTCUTS  (configurable via ⚙️ → "Keyboard Shortcut Prefix")
---------------------------------------------------------------------------
  The prefix key (default: Ctrl+M) can be changed in ⚙️ Settings to any
  combination such as "Ctrl+.", "Alt+X", "Ctrl+Shift+,".
  Press the prefix key, release, then press:
    r  Auto-Resize Columns
    t  Show Stats Panel
    s  Save to Disk
    d  Open Density Menu
    v  Open Visible Columns Menu
    e  Open Export Menu
    l  Load from Disk
    ?  Show Keyboard Shortcuts Help
    1–9 / a–z  Trigger the corresponding action button by index

SAVE & LOAD (Offline Cache)
----------------------------
• Datasets are saved as gzip-compressed JSON (.json.gz) — ~60–80% smaller
  than plain JSON.
• When loading, enter an optional pre-filter expression (plain text or RegExp)
  to load only matching rows — useful for very large datasets.
• Load filter history (last N expressions, configurable) is accessible via the
  ▼ dropdown in the Load dialog.
• Pre-filtered rows are highlighted with 🎨; toggle highlighting with the
  dynamic prefilter button.

COLUMN MANAGEMENT
-----------------
• 👁️ Visible Columns menu — check/uncheck any column; Select All (Alt-S) /
  Deselect All (Alt-D); button turns red when columns are hidden
• Manual resize — drag column edges with the mouse at any time
• Auto-Resize — calculates optimal widths including images/icons/links;
  acts as a toggle (restores original widths on second click)

DENSITY CONTROL
---------------
  Compact     — tighter padding, smaller font, more rows visible
  Normal      — default MusicBrainz-like spacing
  Comfortable — larger padding for easier reading
  Navigate with ↑/↓ in the menu; immediate live preview; Enter to apply

EXPORT
------
  CSV          — comma-separated, compatible with Excel / Google Sheets
  JSON         — structured JSON array of visible rows
  Emacs Org-Mode — pipe-delimited Org table format

SETTINGS (⚙️)
--------------
All options are configurable via the Settings Manager:
• Enable/disable any UI feature (export, stats, density, column resize, …)
• Configure highlight colours for pre-filter, global filter, column filters
• Set maximum page threshold for the high-page-count warning
• Toggle debug logging (browser console)
• Configure load filter history limit
• Enable experimental collapsible sidebar
• Optional column removal (Tagger, Rating, Relationships, Performance, …)

SIDEBAR
-------
• The page sidebar can be optionally collapsed (experimental setting) to give
  more horizontal space to the data table.
• Sticky table headers remain visible while scrolling through large tables.

PAGE RELOAD NOTICE
------------------
When MusicBrainz applies a URL filter that would interfere with pagination,
the script automatically reloads the page to strip the filter. After reload
an ⚠️ Page Reloaded notice appears and automatically re-clicks the "Show all"
button after 2 seconds (or immediately when you click OK / press Enter).
Press Escape on that notice to cancel the auto-action.
`;

(function() {
    'use strict';

    //--------------------------------------------------------------------------------

    const SCRIPT_ID = "vzell-mb-show-all-entities";
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : "Show All Entities";

    // CONFIG SCHEMA
    const configSchema = {
        // ============================================================
        // GENERIC SECTION
        // ============================================================
        divider_: {
            type: 'divider',
            label: '🛠️ Generic settings'
        },

        sa_enable_debug_logging: {
            label: "Enable debug logging",
            type: "checkbox",
            default: false,
            description: "Enable debug logging in the browser developer console"
        },

        sa_load_history_limit: {
            label: 'Load Filter History Limit',
            type: 'number',
            default: 10,
            min: 0,
            max: 50,
            description: 'Number of previous filter expressions to remember in the load dialog.'
        },

        // ============================================================
        // EXPERIMENTAL FEATURES SECTION
        // ============================================================
        divider_experimental: {
            type: 'divider',
            label: '🔬 EXPERIMENTAL FEATURES'
        },

        sa_collabsable_sidebar: {
            label: "Collabsable sidebar (experimental)",
            type: "checkbox",
            default: false,
            description: "Render sidebar collabsable"
        },
        // ============================================================
        // OPTIONAL COLUMN REMOVAL FROM FINAL RENDERED PAGE SECTION
        // ============================================================
        divider_column_removal: {
            type: 'divider',
            label: '🧮 OPTIONAL COLUMN REMOVAL FROM FINAL RENDERED PAGE'
        },

        sa_remove_tagger: {
            label: "Remove Tagger column",
            type: "checkbox",
            default: false,
            description: "Remove the Tagger column from the final rendered tables"
        },

        sa_remove_release_events: {
            label: 'Remove "Release events" column from "Place-Performances" pages',
            type: "checkbox",
            default: true,
            description: "Remove the 'Release events' column from the final rendered tables (coming from the jesus2099 'mb. SUPER MIND CONTROL Ⅱ X TURBO' userscript"
        },

        sa_remove_rating: {
            label: "Remove Rating column",
            type: "checkbox",
            default: false,
            description: "Remove the Rating column from the final rendered tables"
        },

        sa_remove_rel: {
            label: "Remove Relationships column",
            type: "checkbox",
            default: true,
            description: "Remove the Relationships column from the final rendered tables"
        },

        sa_remove_perf: {
            label: "Remove Performance column",
            type: "checkbox",
            default: true,
            description: "Remove the Performance column from the final rendered tables"
        },

        // ============================================================
        // UI FEATURES SECTION
        // ============================================================
        divider_ui_features: {
            type: 'divider',
            label: '🎨 UI FEATURES'
        },

        sa_enable_column_visibility: {
            label: 'Enable Column Visibility Toggle',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "👁️ Visible Columns" button for toggling column visibility'
        },

        sa_enable_export: {
            label: 'Enable Export',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "Export 💾" button for exporting data to different formats (CSV/JSON/Org-Mode)'
        },

        sa_enable_keyboard_shortcuts: {
            label: 'Enable Keyboard Shortcuts',
            type: 'checkbox',
            default: true,
            description: 'Enable keyboard shortcuts and show the "⌨️ Shortcuts" help button'
        },

        sa_enable_keyboard_shortcut_tooltip: {
            label: 'Enable Keyboard Shortcut Tooltip',
            type: 'checkbox',
            default: true,
            description: 'Enable keyboard shortcut tooltip for the prefix shortcut map'
        },

        // ============================================================
        // KEYBOARD SHORTCUTS SECTION
        // ============================================================
        divider_keyboard_shortcuts: {
            type: 'divider',
            label: '🎹 KEYBOARD SHORTCUTS'
        },

        sa_keyboard_shortcut_prefix: {
            label: "Keyboard Shortcut Prefix",
            type: "keyboard_shortcut",
            default: "Ctrl+M",
            description: "Keyboard shortcut prefix key combination (expects a second key press to be complete, e.g. Ctrl+M, Ctrl+., Alt+X, Ctrl+Shift+,)"
        },

        sa_enable_stats_panel: {
            label: 'Enable Quick Stats Panel',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "📊 Stats" button for displaying table statistics'
        },

        sa_enable_density_control: {
            label: 'Enable Table Density Control',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "📏 Density" button for adjusting table spacing'
        },

        sa_enable_column_resizing: {
            label: 'Enable Column Resizing',
            type: 'checkbox',
            default: true,
            description: 'Enable manual column resizing with mouse drag and "↔️ Auto-Resize" button'
        },

        sa_enable_save_load: {
            label: 'Enable Save/Load to Disk',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "💾 Save" and "📂 Load" buttons for disk persistence'
        },

        sa_enable_sticky_headers: {
            label: 'Enable Sticky Headers',
            type: 'checkbox',
            default: true,
            description: 'Keep table headers visible when scrolling'
        },

        // ============================================================
        // FILTER HIGHLIGHT COLORS SECTION
        // ============================================================
        divider_filter_colors: {
            type: 'divider',
            label: '🎨 FILTER HIGHLIGHT COLORS'
        },

        sa_pre_filter_highlight_color: {
            label: "Global Prefilter Highlight Color",
            type: "color_picker",
            default: "green",
            description: "Text color for global prefilter matches"
        },

        sa_pre_filter_highlight_bg: {
            label: "Global Prefilter Highlight Background",
            type: "color_picker",
            default: "#FFFFE0",
            description: "Background color for global prefilter matches"
        },

        sa_global_filter_highlight_color: {
            label: "Global Filter Highlight Color",
            type: "color_picker",
            default: "red",
            description: "Text color for global filter matches"
        },

        sa_global_filter_highlight_bg: {
            label: "Global Filter Highlight Background",
            type: "color_picker",
            default: "#FFD700",
            description: "Background color for global filter matches"
        },

        sa_column_filter_highlight_color: {
            label: "Column Filter Highlight Color",
            type: "color_picker",
            default: "red",
            description: "Text color for column filter matches"
        },

        sa_column_filter_highlight_bg: {
            label: "Column Filter Highlight Background",
            type: "color_picker",
            default: "#add8e6",
            description: "Background color for column filter matches"
        },

        // ============================================================
        // PERFORMANCE SETTINGS SECTION
        // ============================================================
        divider_performance: {
            type: 'divider',
            label: '⚡ PERFORMANCE SETTINGS'
        },

        sa_filter_debounce_delay: {
            label: "Filter debounce delay (ms)",
            type: "number",
            default: 300,
            min: 0,
            max: 2000,
            description: "Delay before applying filter after typing stops"
        },

        sa_sort_chunk_size: {
            label: "Sort chunk size",
            type: "number",
            default: 5000,
            min: 1000,
            max: 50000,
            description: "Rows to process at once when sorting large tables"
        },

        sa_render_threshold: {
            label: "Large Dataset Threshold",
            type: "number",
            default: 5000,
            description: "Row count threshold to prompt save-or-render dialog (0 to disable)"
        },

        sa_chunked_render_threshold: {
            label: "Chunked Rendering Threshold",
            type: "number",
            default: 1000,
            description: "Row count to trigger progressive chunked rendering (0 to always use simple render)"
        },

        sa_sort_progress_threshold: {
            label: "Show sort progress above (rows)",
            type: "number",
            default: 10000,
            min: 1000,
            max: 100000,
            description: "Show progress indicator when sorting tables with more than this many rows"
        },

        sa_render_overflow_tables_in_new_tab: {
            label: "Render overflow tables in a new tab",
            type: "checkbox",
            default: true,
            description: "Render overflow tables in a new tab"
        },

        sa_max_page: {
            label: "Max Page Warning",
            type: "number",
            default: 50,
            description: "Warning threshold for page fetching"
        },
        sa_auto_expand: {
            label: "Auto-Expand Rows",
            type: "number",
            default: 50,
            description: "Row count threshold to auto-expand tables"
        },

        // ============================================================
        // CUSTOM POPUP UI SECTION
        // Condensed config string format:
        //   dialog:   bg|border|borderRadius|padding|shadow|zIndex|fontFamily|minWidth|maxWidth
        //   header:   fontWeight|fontSize|marginBottom|paddingBottom|borderBottom|color
        //   message:  marginBottom|lineHeight|color|fontSize
        //   okBtn:    padding|bg|color|border|borderRadius|fontSize|fontWeight|bgHover
        //   cancelBtn:padding|bg|color|border|borderRadius|fontSize|fontWeight|bgHover
        //   btnGap:   gap
        // ============================================================
        divider_popup_ui: {
            type: 'divider',
            label: '🪟 CUSTOM POPUP UI'
        },

        sa_popup_dialog_style: {
            label: 'Popup dialog container style',
            type: 'text',
            default: 'white|1px solid #ccc|10px|28px|0 8px 32px rgba(0,0,0,0.2)|10001|-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif|380px|600px',
            description: 'Condensed style for the popup dialog container: bg|border|borderRadius|padding|boxShadow|zIndex|fontFamily|minWidth|maxWidth'
        },

        sa_popup_header_style: {
            label: 'Popup header style',
            type: 'text',
            default: '700|1.5em|18px|14px|2px solid #ddd|#222',
            description: 'Condensed style for the popup header: fontWeight|fontSize|marginBottom|paddingBottom|borderBottom|color'
        },

        sa_popup_message_style: {
            label: 'Popup message style',
            type: 'text',
            default: '24px|1.7|#444|1.2em',
            description: 'Condensed style for the popup message: marginBottom|lineHeight|color|fontSize'
        },

        sa_popup_ok_btn_style: {
            label: 'Popup OK button style',
            type: 'text',
            default: '10px 22px|#4CAF50|white|1px solid #45a049|5px|1.1em|600|#45a049',
            description: 'Condensed style for the OK button: padding|bg|color|border|borderRadius|fontSize|fontWeight|bgHover'
        },

        sa_popup_cancel_btn_style: {
            label: 'Popup Cancel button style',
            type: 'text',
            default: '10px 22px|#f0f0f0|#333|1px solid #ccc|5px|1.1em|500|#e0e0e0',
            description: 'Condensed style for the Cancel button: padding|bg|color|border|borderRadius|fontSize|fontWeight|bgHover'
        },

        sa_popup_btn_gap: {
            label: 'Popup button gap',
            type: 'text',
            default: '12px',
            description: 'Gap between buttons in the popup dialog button row'
        },

        // ============================================================
        // UI APPEARANCE SECTION
        // Future home for configurable styles of all UI elements:
        // buttons (action bar, filter bar, subtable controls),
        // checkboxes, input fields, status displays, dividers, etc.
        // Each element type will get its own condensed config string.
        // ============================================================
        divider_ui_appearance: {
            type: 'divider',
            label: '🖌️ UI APPEARANCE (future)'
        }

        // Placeholder — to be expanded with entries like:
        //   sa_ui_action_btn_style   → condensed style for h1 action buttons
        //   sa_ui_filter_input_style → condensed style for the global filter input
        //   sa_ui_subtable_btn_style → condensed style for mb-subtable-clear-btn / mb-show-all-subtable-btn
        //   sa_ui_checkbox_style     → condensed style for checkboxes in the filter bar
        //   etc.

    };

    //--------------------------------------------------------------------------------

    // Initialize VZ-MBLibrary (Logger + Settings + Changelog)
    // Use a ref object to avoid circular dependency during initialization
    const settings = {};
    const Lib = (typeof VZ_MBLibrary !== 'undefined')
          ? new VZ_MBLibrary(SCRIPT_ID, SCRIPT_NAME, configSchema, changelog, () => {
              // Dynamic check: returns current value of debug setting
              return settings.sa_enable_debug_logging ?? true;
          })
          : {
              settings: {},
              info: console.log, debug: console.log, error: console.error, warn: console.warn, time: console.time, timeEnd: console.timeEnd
          };

    // Copy settings reference so the callback can access them
    Object.assign(settings, Lib.settings);
    Lib.info('init', "Script loaded with external library!");

    //--------------------------------------------------------------------------------

    // Check if we just reloaded to fix the filter issue — dialog shown later, after buttons are in DOM
    const reloadFlag = sessionStorage.getItem('mb_show_all_reload_pending');
    if (reloadFlag) {
        sessionStorage.removeItem('mb_show_all_reload_pending');
    }

    const currentUrl = new URL(window.location.href);
    const basePath = currentUrl.origin + currentUrl.pathname;
    const path = currentUrl.pathname;
    const params = currentUrl.searchParams;
    const isFilteredRelationshipPage = params.has('link_type_id');

    Lib.debug('init', `URL: ${currentUrl}`);
    Lib.debug('init', `URL basepath: ${basePath}`);
    Lib.debug('init', `URL path: ${path}`);
    Lib.debug('init', `Query parameters: ${params}`);
    Lib.debug('init', `Has "link_type_id": ${isFilteredRelationshipPage}`);

    // --- Configuration: Page Definitions ---

    // There are different types of MusicBrainz pages
    // | Page type               | multiple tables           | paginated | table header                         |
    // |-------------------------+---------------------------+-----------+--------------------------------------|
    // | Artist-Releasegroups    | native                    | x         | h2, not repeating on paginated pages |
    // | Releasegroup-Releases   | single table, subgrouping | x         | h2, repeating on paginated pages     |
    // | Place-Performances, ... | single table, subgrouping |           | h2, repeating on single page         |
    // | Events                  | single table              | x         | h3,                                  |
    // | Search                  | single table              | x         | p.pageselector-results               |

    // Define all supported page types, their detection logic, and specific UI configurations here.
    const pageDefinitions = [
        // Search pages
        {
            type: 'search',
            match: (path) => path.includes('/search'),
            buttons: [ { label: 'Show all Search results' } ],
            tableMode: 'single',
            features: {
                extractMainColumn: 'Name', // Specific header
                transformToH2: true        // New flag to trigger <h2> transformation
            },
            rowTargetSelector: 'p.pageselector-results' // Specific target for Search pages
        },
        // Instrument pages
        {
            type: 'instrument-artists',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/artists/),
            buttons: [ { label: 'Show all Artists for Instrument' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Artist' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'instrument-releases',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/releases/),
            buttons: [ { label: 'Show all Releases for Instrument' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'instrument-recordings',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/recordings/),
            buttons: [ { label: 'Show all Recordings for Instrument' } ],
            features: {
                extractMainColumn: 'Name' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'instrument-aliases',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Instrument' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        // Area pages
        {
            type: 'area-artists',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/artists/),
            buttons: [ { label: 'Show all Artists for Area' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Artist' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-events',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Area' } ],
            features: {
                splitLocation: true,
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        },
        {
            type: 'area-labels',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/labels/),
            buttons: [ { label: 'Show all Labels for Area' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Label' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-releases-filtered',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/releases/) && params.has('link_type_id'),
            buttons: [
                {
                    label: 'Show all Release Relationships for Area (filtered)',
                    targetHeader: 'Relationships',
                    tableMode: 'single',
                    non_paginated: false,
                    extractMainColumn: 'Title'
                }
            ]
        },
        {
            type: 'area-releases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/releases/) && !params.has('link_type_id'),
            buttons: [
                {
                    label: 'Show all Releases for Area',
                    targetHeader: 'Releases',
                    tableMode: 'single',
                    extractMainColumn: 'Release',
                    features: {
                        splitCD: true
                    }
                },
                {
                    label: 'Show all Release Relationships for Area',
                    targetHeader: 'Relationships',
                    tableMode: 'multi',
                    non_paginated: true,
                    extractMainColumn: 'Title'
                }
            ]
        },
        {
            type: 'area-places',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/places/),
            buttons: [ { label: 'Show all Places for Area' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Place'
            },
            tableMode: 'single'
        },
        {
            type: 'area-aliases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Area' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-recordings-filtered',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/recordings/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Area (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'area-recordings',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/recordings/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Area' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'area-works-filtered',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/works/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Works for Area (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'area-works',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/works/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Works for Area' } ],
            tableMode: 'multi',
            features: {
                extractMainColumn: 'Title'
            },
            non_paginated: true
        },
        // Place pages
        {
            type: 'place-aliases',
            match: (path) => path.match(/\/place\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Place' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'place-events',
            match: (path) => path.match(/\/place\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Place' } ],
            features: {
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        },
        {
            type: 'place-performances-filtered',
            match: (path, params) => path.match(/\/place\/[a-f0-9-]{36}\/performances/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Performances for Place (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'place-performances',
            match: (path, params) => path.match(/\/place\/[a-f0-9-]{36}\/performances/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Performances for Place' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        // Series pages
        {
            type: 'series-aliases',
            match: (path) => path.match(/\/series\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Series' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'series-releases',
            match: (path) => path.includes('/series'),
            buttons: [ { label: 'Show all Releases for Series' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        // Label pages
        {
            type: 'label-aliases',
            match: (path) => path.match(/\/label\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Label' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'label-relationships-filtered',
            match: (path, params) => path.match(/\/label\/[a-f0-9-]{36}\/relationships/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Label (filtered)' } ],
            features: {
                extractMainColumn: 'Title' // Specific header
            },
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'label-relationships',
            match: (path, params) => path.match(/\/label\/[a-f0-9-]{36}\/relationships/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Label' } ],
            features: {
                extractMainColumn: 'Title' // Specific header
            },
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'label-releases',
            match: (path) => path.includes('/label'),
            buttons: [ { label: 'Show all Releases for Label' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        // Work pages
        {
            type: 'work-aliases',
            match: (path) => path.match(/\/work\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Work' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'work-recordings-filtered',
            match: (path, params) => path.match(/\/work\/[a-f0-9-]{36}/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Work (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'work-recordings',
            match: (path, params) => path.match(/\/work\/[a-f0-9-]{36}/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Work' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        // Artist pages
        {
            type: 'artist-relationships-filtered',
            // Check for link_type_id to identify the paginated "See all" view. This MUST come before the general 'artist-relationships' match.
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/relationships/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Artist (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'artist-relationships',
            // Only match if NO link_type_id is present (the overview page)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/relationships/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Artist' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        // TODO: Needs to be handled separately - actually multi table native, but each table has it's own h2 header
        {
            type: 'artist-aliases',
            match: (path) => path.match(/\/artist\/[a-f0-9-]{36}\/aliases/),
            buttons: [
                {
                    label: 'Show all Aliases for Artist',
                    targetHeader: 'Aliases',
                    tableMode: 'single',
                    extractMainColumn: 'Locale'
                },
                {
                    label: 'Show all Artist Credits for Artist',
                    targetHeader: 'Artist credits',
                    tableMode: 'single'
                }
            ],
        },
        {
            type: 'artist-releasegroups',
            // Root artist page (Official/Non-Official/VA views handled by specific buttons)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}$/) && !path.endsWith('/releases'),
            buttons: [
                { label: '🧮 Official artist RGs', params: { all: '0', va: '0' } },
                { label: '🧮 Non-official artist RGs', params: { all: '1', va: '0' } },
                { label: '🧮 Official various artists RGs', params: { all: '0', va: '1' } },
                { label: '🧮 Non-official various artists RGs', params: { all: '1', va: '1' } }
            ],
            tableMode: 'multi' // native tables, h3 headers
        },
        {
            type: 'artist-releases',
            // Artist Releases page (Official/VA views handled by specific buttons)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/releases$/),
            buttons: [
                { label: '🧮 Official artist releases', params: { va: '0' } },
                { label: '🧮 Various artist releases', params: { va: '1' } }
            ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        {
            type: 'artist-recordings',
            match: (path) => path.includes('/recordings'),
            buttons: [ { label: 'Show all Recordings for Artist' } ],
            features: {
                splitCD: false, // Explicitly false (default), but shown for clarity
                extractMainColumn: 'Name'
            },
            tableMode: 'single'
        },
        {
            type: 'artist-works',
            match: (path) => path.includes('/works'),
            buttons: [ { label: 'Show all Works for Artist' } ],
            features: {
                extractMainColumn: 'Work'
            },
            tableMode: 'single'
        },
        // ReleaseGroups pages
        {
            type: 'releasegroup-aliases',
            match: (path) => path.match(/\/release-group\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Releasegroup' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'releasegroup-releases',
            match: (path) => path.includes('/release-group/'),
            buttons: [ { label: 'Show all Releases for ReleaseGroup' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'multi',
            non_paginated: false
        },
        // Release pages
        {
            type: 'release-aliases',
            match: (path) => path.match(/\/release\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Release' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'release-discids',
            match: (path) => path.match(/\/release\/[a-f0-9-]{36}\/discids/),
            buttons: [ { label: 'Show all Disc IDs for Release' } ],
            tableMode: 'multi',
            non_paginated: false
        },
        // Recording pages
        {
            type: 'recording-aliases',
            match: (path) => path.match(/\/recording\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Recording' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'recording-fingerprints',
            match: (path) => path.match(/\/recording\/[a-f0-9-]{36}\/fingerprints/),
            buttons: [ { label: 'Show all Fingerprints for Recording' } ],
            tableMode: 'single'
            //rowTargetSelector: '.acoustid-fingerprints table.tbl'
        },
        {
            type: 'recording-releases',
            match: (path) => path.includes('/recording'),
            buttons: [ { label: 'Show all Releases for Recording' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release title'
            },
            tableMode: 'multi',
            non_paginated: false
        },
        // Event pages
        {
            type: 'event-aliases',
            match: (path) => path.match(/\/event\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Event' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'events',
            match: (path) => path.includes('/events'),
            buttons: [ { label: 'Show all Events for Artist' } ],
            features: {
                splitLocation: true,
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        }
    ];

    //--------------------------------------------------------------------------------

    // Initialize prefix-shortcut Emacs-style handler for action button selection and function shortcuts
    // Press prefix key, release, then press 1-9/a-z/A-Z/special chars to select button or call function
    let ctrlMModeActive = false;
    let ctrlMModeTimeout;
    let ctrlMFunctionMap = {}; // Will be populated after functions are defined
    let ctrlMTooltipElement = null;

    /**
     * Parse a shortcut prefix string such as "Ctrl+M", "Ctrl+.", "Alt+Shift+X"
     * into its component parts.
     * @param {string} str - The shortcut string to parse
     * @returns {{ ctrl: boolean, meta: boolean, alt: boolean, shift: boolean, key: string }}
     */
    function parsePrefixShortcut(str) {
        const parts = (str || 'Ctrl+M').trim().split('+');
        let key = parts.pop().trim();
        // A trailing '+' (e.g. "Ctrl++") means the actual key character is '+'
        if (key === '') key = '+';
        const mods = parts.map(p => p.trim().toLowerCase());
        return {
            ctrl:  mods.includes('ctrl'),
            meta:  mods.includes('meta') || mods.includes('cmd') || mods.includes('super'),
            alt:   mods.includes('alt'),
            shift: mods.includes('shift'),
            key:   key
        };
    }

    /**
     * Returns the display string for the configured prefix shortcut (e.g. "Ctrl+M").
     * Falls back to "Ctrl+M" when the setting is not yet available.
     * @returns {string}
     */
    function getPrefixDisplay() {
        if (typeof Lib !== 'undefined' && Lib.settings && Lib.settings.sa_keyboard_shortcut_prefix) {
            return Lib.settings.sa_keyboard_shortcut_prefix;
        }
        return 'Ctrl+M';
    }

    /**
     * Returns true when a keyboard event matches the configured prefix shortcut.
     * When "Ctrl" appears in the prefix it matches BOTH Ctrl and Meta/Cmd keys,
     * preserving cross-platform (Mac/Windows/Linux) compatibility.
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    function isPrefixKeyEvent(e) {
        const p = parsePrefixShortcut(getPrefixDisplay());
        // Ctrl in the config: match either Ctrl or Meta/Cmd (Mac)
        const ctrlMatch  = p.ctrl  ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
        const altMatch   = p.alt   ? e.altKey                 : !e.altKey;
        const shiftMatch = p.shift ? e.shiftKey               : !e.shiftKey;
        const keyMatch   = e.key.toLowerCase() === p.key.toLowerCase();
        return ctrlMatch && altMatch && shiftMatch && keyMatch;
    }

    function showCtrlMTooltip(actionButtons, buttonKeys) {
        if (typeof Lib === 'undefined' || !Lib.settings.sa_enable_keyboard_shortcut_tooltip) {
            return; // Tooltip disabled in settings or Lib not available
        }

        // Remove existing tooltip if any
        hideCtrlMTooltip();

        const contentDiv = document.getElementById('content');
        const sidebarDiv = document.getElementById('sidebar');
        if (!contentDiv) return;

        // Create tooltip element
        ctrlMTooltipElement = document.createElement('div');
        ctrlMTooltipElement.id = 'mb-ctrl-m-tooltip';
        ctrlMTooltipElement.style.cssText = `
            position: fixed;
            background-color: #f0f0f0;
            border: 1px solid #999;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 0.75em;
            max-width: 250px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            line-height: 1.4;
        `;

        // Build tooltip content
        let tooltipHTML = '<strong>' + getPrefixDisplay() + ' Shortcuts:</strong><br/>';

        // Action buttons
        if (actionButtons.length > 0) {
            tooltipHTML += '<strong>Buttons:</strong><br/>';
            for (let i = 0; i < Math.min(actionButtons.length, 9); i++) {
                const key = buttonKeys[i];
                const text = actionButtons[i].textContent.trim().substring(0, 20);
                tooltipHTML += `<div style="margin-left: 4px;"><strong>${key}</strong>: ${text}${actionButtons[i].textContent.trim().length > 20 ? '...' : ''}</div>`;
            }
            if (actionButtons.length > 9) {
                tooltipHTML += `<div style="margin-left: 4px; font-size: 0.9em; color: #666;">+ ${actionButtons.length - 9} more (a-${String.fromCharCode(97 + Math.min(actionButtons.length - 10, 25))})</div>`;
            }
            tooltipHTML += '<br/>';
        }

        // Function shortcuts
        tooltipHTML += '<strong>Functions:</strong><br/>';
        const sortedFunctions = Object.entries(ctrlMFunctionMap)
            .sort((a, b) => a[0].localeCompare(b[0]));
        for (const [key, entry] of sortedFunctions) {
            tooltipHTML += `<div style="margin-left: 4px;"><strong>${key}</strong>: ${entry.description}</div>`;
        }

        ctrlMTooltipElement.innerHTML = tooltipHTML;
        document.body.appendChild(ctrlMTooltipElement);

        // Position in upper right of content div, not overlapping sidebar
        setTimeout(() => {
            if (contentDiv && sidebarDiv) {
                const contentRect = contentDiv.getBoundingClientRect();
                const sidebarRect = sidebarDiv.getBoundingClientRect();
                const tooltipRect = ctrlMTooltipElement.getBoundingClientRect();

                // Position in upper right, respecting sidebar
                let left = Math.min(contentRect.right - tooltipRect.width - 10, window.innerWidth - tooltipRect.width - 10);
                left = Math.max(left, contentRect.left + 10); // Don't go too far left

                if (sidebarDiv) {
                    // Ensure doesn't overlap sidebar
                    left = Math.min(left, sidebarRect.left - tooltipRect.width - 10);
                }

                ctrlMTooltipElement.style.left = left + 'px';
                ctrlMTooltipElement.style.top = (contentRect.top + 10) + 'px';
            }
        }, 0);
    }

    function hideCtrlMTooltip() {
        if (ctrlMTooltipElement) {
            ctrlMTooltipElement.remove();
            ctrlMTooltipElement = null;
        }
    }

    document.addEventListener('keydown', (e) => {
        // Prefix key: enter prefix mode for button selection and function shortcuts
        if (isPrefixKeyEvent(e)) {
            e.preventDefault();

            // If already in mode, exit
            if (ctrlMModeActive) {
                ctrlMModeActive = false;
                clearTimeout(ctrlMModeTimeout);
                hideCtrlMTooltip();
                if (typeof Lib !== 'undefined' && Lib.debug) {
                    Lib.debug('shortcuts', `Exited ${getPrefixDisplay()} mode`);
                } else {
                    console.log(`[ShowAllEntityData] Exited ${getPrefixDisplay()} mode`);
                }
                return;
            }

            // Get available action buttons
            const actionButtons = Array.from(document.querySelectorAll('button'))
                .filter(btn => btn.textContent.includes('Show all') || btn.textContent.includes('🧮'));

            // Enter prefix mode
            ctrlMModeActive = true;

            // Build list of available keys for action buttons (1-9, a-z, A-Z, special)
            let buttonKeys = [];
            if (actionButtons.length > 0) {
                for (let i = 0; i < actionButtons.length && i < 9; i++) {
                    buttonKeys.push((i + 1).toString());
                }
                for (let i = 9; i < actionButtons.length && i < 35; i++) {
                    buttonKeys.push(String.fromCharCode(97 + (i - 9))); // a-z
                }
            }

            // Show tooltip if enabled
            if (typeof Lib !== 'undefined' && Lib.settings.sa_enable_keyboard_shortcut_tooltip) {
                showCtrlMTooltip(actionButtons, buttonKeys);
            }

            // Log helpful message with available buttons
            if (typeof Lib !== 'undefined' && Lib.debug) {
                if (buttonKeys.length > 0) {
                    Lib.debug('shortcuts', `Entered ${getPrefixDisplay()} mode. ${actionButtons.length} action button(s): ${buttonKeys.join(', ')}`);
                    actionButtons.forEach((btn, idx) => {
                        const key = buttonKeys[idx] || '?';
                        Lib.debug('shortcuts', `  ${key}: ${btn.textContent.trim()}`);
                    });
                }
                Lib.debug('shortcuts', 'Function shortcuts: r=Auto-Resize, t=Stats, s=Save, d=Density, v=Visible Columns, e=Export, l=Load, ?=Help' + (ctrlMFunctionMap['o'] ? ', o=Stop' : ''));
                Lib.debug('shortcuts', 'Press any key or Escape to cancel');
            } else {
                if (buttonKeys.length > 0) {
                    console.log(`[ShowAllEntityData] Entered ${getPrefixDisplay()} mode. ${actionButtons.length} action button(s): ${buttonKeys.join(', ')}`);
                    actionButtons.forEach((btn, idx) => {
                        const key = buttonKeys[idx] || '?';
                        console.log(`[ShowAllEntityData]   ${key}: ${btn.textContent.trim()}`);
                    });
                }
                console.log('[ShowAllEntityData] Function shortcuts: r=Auto-Resize, t=Stats, s=Save, d=Density, v=Visible Columns, e=Export, l=Load, ?=Help' + (ctrlMFunctionMap['o'] ? ', o=Stop' : ''));
            }

            // Auto-exit after 5 seconds
            clearTimeout(ctrlMModeTimeout);
            ctrlMModeTimeout = setTimeout(() => {
                ctrlMModeActive = false;
                hideCtrlMTooltip();
                if (typeof Lib !== 'undefined' && Lib.debug) {
                    Lib.debug('shortcuts', `Exited ${getPrefixDisplay()} mode (timeout)`);
                }
            }, 5000);
            return;
        }

        // If in prefix mode and a single character key is pressed (no modifiers)
        if (ctrlMModeActive && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
            const key = e.key.toLowerCase();
            const keyOriginal = e.key;

            // Extended valid key range: 1-9, a-z, A-Z, and special characters
            const validCharacters = '123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ,;.:-_+*<>#\'?!%&/()=';
            const isValidKey = validCharacters.includes(keyOriginal);

            if (!isValidKey) {
                return; // Not a recognized key
            }

            e.preventDefault();

            // Check if it's a function shortcut (non-numeric)
            if (ctrlMFunctionMap[key]) {
                const funcEntry = ctrlMFunctionMap[key];
                // Call the function if it exists
                if (typeof funcEntry.fn === 'function') {
                    funcEntry.fn();
                    if (typeof Lib !== 'undefined' && Lib.debug) {
                        Lib.debug('shortcuts', `Function "${funcEntry.description}" triggered via ${getPrefixDisplay()} then '${keyOriginal}'`);
                    } else {
                        console.log(`[ShowAllEntityData] Function "${funcEntry.description}" triggered`);
                    }
                } else {
                    if (typeof Lib !== 'undefined' && Lib.warn) {
                        Lib.warn('shortcuts', `Function "${funcEntry.description}" not available`);
                    } else {
                        console.warn(`[ShowAllEntityData] Function not available`);
                    }
                }
                ctrlMModeActive = false;
                clearTimeout(ctrlMModeTimeout);
                hideCtrlMTooltip();
                return;
            }

            // Check if it's a numeric action button shortcut
            let buttonIndex = -1;
            if (keyOriginal >= '1' && keyOriginal <= '9') {
                buttonIndex = parseInt(keyOriginal) - 1;
            } else if (key >= 'a' && key <= 'z') {
                buttonIndex = 9 + (key.charCodeAt(0) - 97); // a=9, b=10, etc.
            }

            if (buttonIndex >= 0) {
                const actionButtons = Array.from(document.querySelectorAll('button'))
                    .filter(btn => btn.textContent.includes('Show all') || btn.textContent.includes('🧮'));

                if (buttonIndex < actionButtons.length) {
                    const selectedButton = actionButtons[buttonIndex];
                    selectedButton.click();
                    if (typeof Lib !== 'undefined' && Lib.debug) {
                        Lib.debug('shortcuts', `Action button ${buttonIndex + 1} selected via ${getPrefixDisplay()} then '${keyOriginal}': "${selectedButton.textContent.trim()}"`);
                    } else {
                        console.log(`[ShowAllEntityData] Action button ${buttonIndex + 1} clicked: "${selectedButton.textContent.trim()}"`);
                    }
                } else {
                    if (typeof Lib !== 'undefined' && Lib.warn) {
                        Lib.warn('shortcuts', `No action button at position ${buttonIndex + 1} (${actionButtons.length} available)`);
                    } else {
                        console.warn(`[ShowAllEntityData] No action button at position ${buttonIndex + 1}`);
                    }
                }
            }

            ctrlMModeActive = false;
            clearTimeout(ctrlMModeTimeout);
            hideCtrlMTooltip();
            return;
        }

        // Escape key exits prefix mode without selecting
        if (e.key === 'Escape' && ctrlMModeActive) {
            e.preventDefault();
            ctrlMModeActive = false;
            clearTimeout(ctrlMModeTimeout);
            hideCtrlMTooltip();
            if (typeof Lib !== 'undefined' && Lib.debug) {
                Lib.debug('shortcuts', `Exited ${getPrefixDisplay()} mode (Escape pressed)`);
            } else {
                console.log(`[ShowAllEntityData] Exited ${getPrefixDisplay()} mode`);
            }
            return;
        }

        // Any other key with modifiers exits prefix mode
        if (ctrlMModeActive && (e.ctrlKey || e.metaKey || e.altKey) && e.key !== 'Escape') {
            ctrlMModeActive = false;
            clearTimeout(ctrlMModeTimeout);
            hideCtrlMTooltip();
        }
    });

    /**
     * Debounce utility function - delays execution until after wait milliseconds have elapsed
     * since the last time the debounced function was invoked.
     * @param {Function} func - The function to debounce
     * @param {number} wait - The number of milliseconds to delay
     * @param {boolean} immediate - If true, trigger the function on the leading edge instead of trailing
     * @returns {Function} The debounced function
     */
    function debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    /**
     * Optimized sorting for large arrays using a stable, in-place sort with chunking
     * @param {Array} array - Array to sort
     * @param {Function} compareFn - Comparison function
     * @param {Function} progressCallback - Optional callback for progress updates (percent)
     * @returns {Promise<Array>} Sorted array
     */
    async function sortLargeArray(array, compareFn, progressCallback) {
        const size = array.length;

        // For small arrays, use native sort
        if (size < 1000) {
            array.sort(compareFn);
            return array;
        }

        // For medium arrays, use native sort with yield
        if (size < 5000) {
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
            array.sort(compareFn);
            return array;
        }

        // For large arrays, use Tim Sort (merge sort variant) with chunking
        // This provides stable O(n log n) performance with better cache locality
        const chunkSize = Math.min(Lib.settings.sa_sort_chunk_size || 5000, size);

        // Step 1: Sort chunks
        const numChunks = Math.ceil(size / chunkSize);
        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, size);
            const chunk = array.slice(start, end);
            chunk.sort(compareFn);

            // Copy sorted chunk back
            for (let j = 0; j < chunk.length; j++) {
                array[start + j] = chunk[j];
            }

            if (progressCallback) {
                const progress = Math.round((i + 1) / numChunks * 50); // First 50% is chunk sorting
                progressCallback(progress);
            }

            // Yield to UI every chunk
            if (i % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Step 2: Merge sorted chunks
        let currentSize = chunkSize;
        let mergeStep = 0;
        const maxMergeSteps = Math.ceil(Math.log2(numChunks));

        while (currentSize < size) {
            for (let start = 0; start < size; start += currentSize * 2) {
                const mid = Math.min(start + currentSize, size);
                const end = Math.min(start + currentSize * 2, size);

                if (mid < end) {
                    merge(array, start, mid, end, compareFn);
                }
            }

            mergeStep++;
            if (progressCallback) {
                const progress = 50 + Math.round((mergeStep / maxMergeSteps) * 50); // Last 50% is merging
                progressCallback(progress);
            }

            currentSize *= 2;

            // Yield to UI
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return array;
    }

    /**
     * Merge two sorted portions of an array
     * @param {Array} array - The array
     * @param {number} start - Start index of first portion
     * @param {number} mid - End index of first portion (start of second)
     * @param {number} end - End index of second portion
     * @param {Function} compareFn - Comparison function
     */
    function merge(array, start, mid, end, compareFn) {
        const left = array.slice(start, mid);
        const right = array.slice(mid, end);

        let i = 0, j = 0, k = start;

        while (i < left.length && j < right.length) {
            if (compareFn(left[i], right[j]) <= 0) {
                array[k++] = left[i++];
            } else {
                array[k++] = right[j++];
            }
        }

        while (i < left.length) {
            array[k++] = left[i++];
        }

        while (j < right.length) {
            array[k++] = right[j++];
        }
    }

    /**
     * Create a comparison function for table sorting
     * @param {number} index - Column index
     * @param {boolean} isAscending - Sort direction
     * @param {boolean} isNumeric - Whether to use numeric comparison
     * @returns {Function} Comparison function
     */
    function createSortComparator(index, isAscending, isNumeric) {
        return (a, b) => {
            const valA = getCleanVisibleText(a.cells[index]).trim().toLowerCase() || '';
            const valB = getCleanVisibleText(b.cells[index]).trim().toLowerCase() || '';

            if (isNumeric) {
                const numA = parseFloat(valA.replace(/[^0-9.-]/g, '')) || 0;
                const numB = parseFloat(valB.replace(/[^0-9.-]/g, '')) || 0;
                return isAscending ? numA - numB : numB - numA;
            }

            const result = valA.localeCompare(valB, undefined, {numeric: true, sensitivity: 'base'});
            return isAscending ? result : -result;
        };
    }

    /**
     * Creates a multi-column comparator for sorting by multiple columns in priority order.
     * Each entry in sortColumns carries { colIndex, direction } where direction 1 = asc, 2 = desc.
     *
     * @param {{ colIndex: number, direction: number }[]} sortColumns
     * @param {NodeList} headers - TH elements of the table's first header row
     * @returns {Function} Comparator suitable for Array.sort / sortLargeArray
     */
    function createMultiColumnComparator(sortColumns, headers) {
        return (a, b) => {
            for (const sortCol of sortColumns) {
                const idx = sortCol.colIndex;
                const isAscending = sortCol.direction === 1;

                const valA = getCleanVisibleText(a.cells[idx]).trim().toLowerCase() || '';
                const valB = getCleanVisibleText(b.cells[idx]).trim().toLowerCase() || '';

                // Derive column name for numeric detection (strip sort icons and superscripts)
                const hdrName = headers[idx]
                    ? headers[idx].textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim()
                    : '';
                const isNumeric = hdrName.includes('Year') || hdrName.includes('Releases') ||
                                  hdrName.includes('Track') || hdrName.includes('Length') ||
                                  hdrName.includes('Rating') || hdrName.includes('#');

                let result;
                if (isNumeric) {
                    const numA = parseFloat(valA.replace(/[^0-9.-]/g, '')) || 0;
                    const numB = parseFloat(valB.replace(/[^0-9.-]/g, '')) || 0;
                    result = numA - numB;
                } else {
                    result = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                }

                if (result !== 0) return isAscending ? result : -result;
            }
            return 0; // all compared columns are equal
        };
    }

    /**
     * Applies sticky positioning to table headers so they remain visible while scrolling
     * Adds CSS styles that make both the main header row and filter row stick to the top of the viewport
     */
    function applyStickyHeaders() {
        // Check if styles already added
        if (document.getElementById('mb-sticky-headers-style')) {
            Lib.debug('ui', 'Sticky headers styles already applied');
            return;
        }

        const style = document.createElement('style');
        style.id = 'mb-sticky-headers-style';
        style.textContent = `
            /* Ensure the table borders play nicely with sticky elements */
            table.tbl {
                border-collapse: separate;
                border-spacing: 0;
            }

            /* Make the entire thead sticky as a single solid block */
            table.tbl thead {
                position: sticky;
                top: 0;
                /* z-index 100 keeps it below the sidebar (105) but above table content */
                z-index: 100;
            }

            /* Ensure headers have a solid background so scrolling content doesn't bleed through */
            table.tbl thead th {
                background-color: #f2f2f2; /* Default MusicBrainz header color */
                border-bottom: 1px solid #ddd;
                border-top: 1px solid #ddd;
                background-clip: padding-box;
                position: relative;
            }

            /* Filter row specific styling */
            table.tbl thead tr.mb-col-filter-row th {
                background-color: #f9f9f9;
                border-bottom: 2px solid #ccc;
                border-top: none;
            }

            /* Ensure resizer handles stay above the header background but below dropdowns */
            .column-resizer {
                z-index: 101 !important;
            }

            /* Prevent visual glitches during scroll */
            table.tbl thead th {
                will-change: transform;
            }
        `;

        document.head.appendChild(style);
        Lib.debug('ui', 'Sticky headers enabled - column headers will remain visible while scrolling');
    }

    /**
     * Toggle visibility of a column across all tables
     * @param {HTMLTableElement} table - Reference table (not used, kept for compatibility)
     * @param {number} columnIndex - Index of the column to toggle
     * @param {boolean} show - True to show, false to hide
     */
    function toggleColumn(table, columnIndex, show) {
        const display = show ? '' : 'none';

        // Toggle column in ALL tables on the page (for multi-table pages)
        const allTables = document.querySelectorAll('table.tbl');
        allTables.forEach(currentTable => {
            // Toggle header cells in all header rows (main header + filter row)
            const headers = currentTable.querySelectorAll('thead tr');
            headers.forEach(row => {
                if (row.cells[columnIndex]) {
                    row.cells[columnIndex].style.display = display;
                }
            });

            // Toggle all cells in the column for all body rows
            const rows = currentTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (row.cells[columnIndex]) {
                    row.cells[columnIndex].style.display = display;
                }
            });

            // If auto-resize is active, update the colgroup and table width
            if (isAutoResized) {
                const colgroup = currentTable.querySelector('colgroup');
                if (colgroup && colgroup.children[columnIndex]) {
                    const col = colgroup.children[columnIndex];
                    if (show) {
                        // Need to re-measure this column to get proper width
                        // Create temporary measurement container
                        const measureDiv = document.createElement('div');
                        measureDiv.style.cssText = `
                            position: absolute;
                            visibility: hidden;
                            white-space: nowrap;
                            font-family: inherit;
                            font-size: inherit;
                            padding: 4px 8px;
                        `;
                        document.body.appendChild(measureDiv);

                        let maxWidth = 0;

                        // Measure header
                        const th = headers[0]?.cells[columnIndex];
                        if (th) {
                            const contentClone = th.cloneNode(true);
                            const styles = window.getComputedStyle(th);
                            measureDiv.style.fontSize = styles.fontSize;
                            measureDiv.style.fontWeight = styles.fontWeight;
                            measureDiv.style.padding = styles.padding;
                            measureDiv.style.fontFamily = styles.fontFamily;
                            measureDiv.innerHTML = '';
                            measureDiv.appendChild(contentClone);
                            maxWidth = Math.max(maxWidth, measureDiv.offsetWidth);
                        }

                        // Measure sample data cells (up to 100 rows)
                        const dataRows = currentTable.querySelectorAll('tbody tr');
                        const sampleSize = Math.min(dataRows.length, 100);
                        const sampleStep = Math.max(1, Math.floor(dataRows.length / sampleSize));

                        for (let i = 0; i < dataRows.length; i += sampleStep) {
                            const row = dataRows[i];
                            if (row.style.display === 'none') continue;
                            const cell = row.cells[columnIndex];
                            if (cell) {
                                const contentClone = cell.cloneNode(true);
                                const styles = window.getComputedStyle(cell);
                                measureDiv.style.fontSize = styles.fontSize;
                                measureDiv.style.fontWeight = styles.fontWeight;
                                measureDiv.style.padding = styles.padding;
                                measureDiv.style.fontFamily = styles.fontFamily;
                                measureDiv.innerHTML = '';
                                measureDiv.appendChild(contentClone);
                                maxWidth = Math.max(maxWidth, measureDiv.offsetWidth);
                            }
                        }

                        document.body.removeChild(measureDiv);

                        // Set the measured width
                        const finalWidth = Math.ceil(maxWidth + 20);
                        col.style.width = `${finalWidth}px`;
                        col.style.display = '';

                        Lib.debug('ui', `Column ${columnIndex} shown and re-measured: ${finalWidth}px`);
                    } else {
                        // Hide column in colgroup
                        col.style.width = '0px';
                        col.style.display = 'none';
                    }
                }

                // Recalculate table width based on currently visible columns
                const firstRow = currentTable.querySelector('tbody tr');
                if (firstRow) {
                    const columnCount = firstRow.cells.length;
                    const columnWidths = [];

                    // Get current widths from colgroup
                    if (colgroup) {
                        for (let i = 0; i < columnCount; i++) {
                            const col = colgroup.children[i];
                            const th = headers[0]?.cells[i];
                            const isVisible = th && th.style.display !== 'none';

                            if (col && isVisible) {
                                const width = parseInt(col.style.width) || 0;
                                columnWidths.push(width);
                            }
                        }
                    }

                    // Calculate new total width
                    const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
                    if (totalWidth > 0) {
                        currentTable.style.width = `${totalWidth}px`;
                        currentTable.style.minWidth = `${totalWidth}px`;
                        Lib.debug('ui', `Table width updated to ${totalWidth}px after toggling column ${columnIndex}`);
                    }
                }
            }
        });

        Lib.debug('ui', `Column ${columnIndex} ${show ? 'shown' : 'hidden'} in ${allTables.length} table(s)`);
    }

    /**
     * Create a clear column filters button with a red ✗ symbol
     * This is a helper function to avoid code duplication across multiple locations
     * @param {HTMLTableElement} table - The table this button will clear filters for
     * @param {string} categoryName - The name of the table category for logging
     * @returns {HTMLButtonElement} The created button element
     */
    function createClearColumnFiltersButton(table, categoryName) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'mb-subtable-clear-btn';
        clearBtn.type = 'button';
        clearBtn.title = 'Clear all column filters for this table';
        clearBtn.style.display = 'none'; // Initially hidden

        // Create red ✗ symbol
        const xSymbol = document.createElement('span');
        xSymbol.textContent = '✗ ';
        xSymbol.style.color = 'red';
        xSymbol.style.fontSize = '1.0em';
        xSymbol.style.fontWeight = 'bold';

        clearBtn.appendChild(xSymbol);
        clearBtn.appendChild(document.createTextNode('Clear all COLUMN filters'));

        clearBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearSubTableColumnFilters(table, categoryName);
        };

        return clearBtn;
    }

    /**
     * Ensure settings button is always the last button in controls container
     * Also adds a divider before the Auto-Resize button after data is loaded
     */
    function ensureSettingsButtonIsLast() {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) return;

        const settingsBtn = controlsContainer.querySelector('button[title*="Open settings manager"]');
        if (!settingsBtn) return;

        // Move settings button to the end if it's not already
        if (settingsBtn.nextSibling) {
            controlsContainer.appendChild(settingsBtn);
        }

        // Ensure ❓ app-help button is always the very last button (right of ⚙️)
        const appHelpBtn = document.getElementById('mb-app-help-btn');
        if (appHelpBtn) {
            controlsContainer.appendChild(appHelpBtn);
        }

        // Ensure 🎹 shortcuts button is immediately before ⚙️ settings button
        const shortcutsBtn = document.getElementById('mb-shortcuts-help-btn');
        if (shortcutsBtn && shortcutsBtn.nextSibling !== settingsBtn) {
            controlsContainer.insertBefore(shortcutsBtn, settingsBtn);
        }

        // Keep the ' | ' divider pinned immediately before 🎹 (covers both the initial
        // Load→🎹 gap and the post-load Export→🎹 gap without needing separate dividers).
        if (shortcutsBtn) {
            let beforeShortcutsDivider = controlsContainer.querySelector('.mb-button-divider-before-shortcuts');
            if (!beforeShortcutsDivider) {
                beforeShortcutsDivider = document.createElement('span');
                beforeShortcutsDivider.textContent = ' | ';
                beforeShortcutsDivider.className = 'mb-button-divider-before-shortcuts';
                beforeShortcutsDivider.style.cssText = 'color:#999; margin:0 4px;';
            }
            // Re-insert (or insert for the first time) immediately before shortcutsBtn
            if (shortcutsBtn.previousSibling !== beforeShortcutsDivider) {
                controlsContainer.insertBefore(beforeShortcutsDivider, shortcutsBtn);
            }
        }

        // Add divider between Load from Disk and Auto-Resize if not already present.
        // Note: the initialDivider (between action buttons and Save/Load) is intentionally
        // kept — it remains relevant both on the initial page and after load.
        const loadBtn = Array.from(controlsContainer.querySelectorAll('button')).find(btn => btn.textContent.includes('Load from Disk'));
        const resizeBtn = Array.from(controlsContainer.querySelectorAll('button')).find(btn => btn.textContent.includes('Auto-Resize') || btn.textContent.includes('Restore Width'));

        if (loadBtn && resizeBtn && !controlsContainer.querySelector('.mb-button-divider-after-load')) {
            // Add divider after Load from Disk button
            const divider = document.createElement('span');
            divider.textContent = ' | ';
            divider.className = 'mb-button-divider-after-load';
            divider.style.cssText = 'color:#999; margin:0 4px;';
            loadBtn.after(divider);
        }
    }

    /**
     * Add a column visibility toggle button and menu to the controls
     * Allows users to show/hide columns in the table
     * @param {HTMLTableElement} table - The table to add controls for
     */
    function addColumnVisibilityToggle(table) {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) {
            Lib.warn('ui', 'Controls container not found, cannot add column visibility toggle');
            return;
        }

        // Check if button already exists
        const existingBtn = Array.from(controlsContainer.querySelectorAll('button')).find(btn => btn.textContent.includes('Visible Columns'));
        if (existingBtn) {
            Lib.debug('ui', 'Column visibility toggle already exists, skipping');
            return;
        }

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = '👁️ <u>V</u>isible Columns';
        toggleBtn.title = `Show/hide table columns (${getPrefixDisplay()}, then v)`;
        toggleBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        toggleBtn.type = 'button';

        // Create dropdown menu container
        const menu = document.createElement('div');
        menu.className = 'mb-column-visibility-menu';
        menu.style.cssText = `
            display: none;
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 250px;
            max-width: 500px;
            width: auto;
        `;

        // Create draggable header
        const header = document.createElement('div');
        header.style.cssText = `
            background: #f5f5f5;
            padding: 8px 10px;
            margin: -10px -10px 10px -10px;
            border-bottom: 1px solid #ccc;
            cursor: move;
            user-select: none;
            font-weight: 600;
            border-radius: 4px 4px 0 0;
        `;
        header.textContent = 'Column Visibility';

        // Add dragging functionality
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && menu.style.display === 'block') {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                menu.style.left = `${e.clientX - initialX}px`;
                menu.style.top = `${e.clientY - initialY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'move';
            }
        });

        // Create scrollable content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'padding: 0 10px 10px 10px; max-height: 60vh; overflow-y: auto;';

        menu.appendChild(header);
        menu.appendChild(contentWrapper);

        // Get headers from the first row (skip filter row)
        const headerRow = table.querySelector('thead tr:first-child');
        if (!headerRow) {
            Lib.warn('ui', 'No header row found for column visibility toggle');
            return;
        }

        const headers = Array.from(headerRow.cells);

        // Store checkbox states
        const checkboxes = [];

        // Function to update button color based on column visibility
        const updateButtonColor = () => {
            const allChecked = checkboxes.every(cb => cb.checked);
            if (allChecked) {
                // All columns visible - default color
                toggleBtn.style.backgroundColor = '';
                toggleBtn.style.color = '';
                toggleBtn.style.border = '';
            } else {
                // Some columns hidden - red color
                toggleBtn.style.backgroundColor = '#dc3545';
                toggleBtn.style.color = 'white';
                toggleBtn.style.border = '1px solid #bd2130';
            }
        };

        // Create checkbox for each column
        headers.forEach((th, index) => {
            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            if (!colName) return; // Skip empty headers

            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'margin: 5px 0; white-space: nowrap; display: flex; align-items: center;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.id = `mb-col-vis-${index}`;
            checkbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
            checkbox.dataset.columnIndex = index;

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = colName;
            label.style.cssText = 'cursor: pointer; user-select: none; flex: 1;';

            checkbox.addEventListener('change', () => {
                toggleColumn(table, index, checkbox.checked);

                // Count visible columns
                const visibleCount = checkboxes.filter(cb => cb.checked).length;
                Lib.debug('ui', `Column "${colName}" ${checkbox.checked ? 'shown' : 'hidden'}. ${visibleCount}/${checkboxes.length} columns visible`);

                // Update button color
                updateButtonColor();
            });

            checkboxes.push(checkbox);

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            contentWrapper.appendChild(wrapper);
        });

        // Add separator
        const separator = document.createElement('div');
        separator.style.cssText = 'margin: 10px 0; padding-top: 10px; border-top: 1px solid #ddd;';
        contentWrapper.appendChild(separator);

        // Add "Select All" / "Deselect All" buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 5px;';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.innerHTML = '<u>S</u>elect All';
        selectAllBtn.style.cssText = 'font-size: 0.8em; padding: 4px 8px; cursor: pointer; flex: 1; border-radius: 3px;';
        selectAllBtn.type = 'button';
        selectAllBtn.tabIndex = 0;
        selectAllBtn.onclick = (e) => {
            e.stopPropagation();
            checkboxes.forEach(cb => {
                if (!cb.checked) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change'));
                }
            });
            // Update button color after all checkboxes processed
            updateButtonColor();
        };

        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.innerHTML = '<u>D</u>eselect All';
        deselectAllBtn.style.cssText = 'font-size: 0.8em; padding: 4px 8px; cursor: pointer; flex: 1; border-radius: 3px;';
        deselectAllBtn.type = 'button';
        deselectAllBtn.tabIndex = 0;
        deselectAllBtn.onclick = (e) => {
            e.stopPropagation();
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    cb.checked = false;
                    cb.dispatchEvent(new Event('change'));
                }
            });
            // Update button color after all checkboxes processed
            updateButtonColor();
        };

        buttonRow.appendChild(selectAllBtn);
        buttonRow.appendChild(deselectAllBtn);
        contentWrapper.appendChild(buttonRow);

        // Add "Choose current configuration" button
        const chooseConfigBtn = document.createElement('button');
        chooseConfigBtn.innerHTML = 'Choose <u>c</u>urrent configuration';
        chooseConfigBtn.style.cssText = 'font-size: 0.8em; padding: 4px 8px; cursor: pointer; width: 100%; margin-top: 5px; border-radius: 3px;';
        chooseConfigBtn.type = 'button';
        chooseConfigBtn.tabIndex = 0;
        chooseConfigBtn.onclick = (e) => {
            e.stopPropagation();
            // Just close the menu - current configuration is already applied
            menu.style.display = 'none';
            Lib.debug('ui', 'Chose current column configuration');
        };
        contentWrapper.appendChild(chooseConfigBtn);

        // Add second separator
        const separator2 = document.createElement('div');
        separator2.style.cssText = 'margin: 10px 0; padding-top: 10px; border-top: 1px solid #ddd;';
        contentWrapper.appendChild(separator2);

        // Add close instruction text
        const closeText = document.createElement('div');
        closeText.textContent = 'Click outside or press Escape to close';
        closeText.style.cssText = 'font-size: 0.9em; color: #666; text-align: center; font-style: italic;';
        contentWrapper.appendChild(closeText);

        // Keyboard navigation state
        let selectedCheckboxIndex = 0;

        // Function to update checkbox focus styling
        const updateCheckboxFocus = (index) => {
            checkboxes.forEach((cb, i) => {
                const wrapper = cb.parentElement;
                if (i === index) {
                    wrapper.style.background = '#e3f2fd';
                    wrapper.style.borderRadius = '3px';
                    cb.focus();
                } else {
                    wrapper.style.background = '';
                }
            });
        };

        // Keyboard handler for menu
        const menuKeyHandler = (e) => {
            if (menu.style.display !== 'block') return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedCheckboxIndex = (selectedCheckboxIndex + 1) % checkboxes.length;
                    updateCheckboxFocus(selectedCheckboxIndex);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    selectedCheckboxIndex = (selectedCheckboxIndex - 1 + checkboxes.length) % checkboxes.length;
                    updateCheckboxFocus(selectedCheckboxIndex);
                    break;

                case ' ':
                case 'Shift':
                    e.preventDefault();
                    const cb = checkboxes[selectedCheckboxIndex];
                    cb.checked = !cb.checked;
                    cb.dispatchEvent(new Event('change'));
                    break;

                case 'Tab':
                    // Allow natural Tab navigation to buttons
                    break;

                case 's':
                case 'S':
                    if (e.altKey) {
                        e.preventDefault();
                        selectAllBtn.click();
                    }
                    break;

                case 'd':
                case 'D':
                    if (e.altKey) {
                        e.preventDefault();
                        deselectAllBtn.click();
                    }
                    break;

                case 'c':
                case 'C':
                    if (e.altKey) {
                        e.preventDefault();
                        chooseConfigBtn.click();
                    }
                    break;

                case 'Enter':
                    e.preventDefault();
                    menu.style.display = 'none';
                    break;
            }
        };
        document.addEventListener('keydown', menuKeyHandler);

        // Toggle menu visibility
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = menu.style.display === 'block';

            if (isVisible) {
                menu.style.display = 'none';
            } else {
                menu.style.display = 'block';

                // Position menu below button (only on first open or when not manually moved)
                if (xOffset === 0 && yOffset === 0) {
                    const rect = toggleBtn.getBoundingClientRect();
                    menu.style.top = `${rect.bottom + 5}px`;
                    menu.style.left = `${rect.left}px`;
                    xOffset = rect.left;
                    yOffset = rect.bottom + 5;
                    initialX = 0;
                    initialY = 0;
                }

                // Reset selection and set focus to first checkbox
                selectedCheckboxIndex = 0;
                setTimeout(() => updateCheckboxFocus(0), 10);
            }
        };

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== toggleBtn) {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('click', closeMenu);

        // Close menu on Escape key
        const closeMenuOnEscape = (e) => {
            if (e.key === 'Escape' && menu.style.display === 'block') {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('keydown', closeMenuOnEscape);

        // Append to controls container
        controlsContainer.appendChild(toggleBtn);
        Lib.debug('ui', 'Column visibility toggle added to controls');
        ensureSettingsButtonIsLast();

        // Append menu to body
        document.body.appendChild(menu);
    }

    /**
     * Export table data to CSV format
     * Exports only visible rows and columns
     * Generates filename with timestamp and page type
     */
    function exportTableToCSV() {
        const table = document.querySelector('table.tbl');
        if (!table) {
            alert('No table found to export');
            Lib.error('export', 'No table found for CSV export');
            return;
        }

        Lib.debug('export', 'Starting CSV export...');

        const rows = [];
        let totalCells = 0;

        // Get headers from first row
        const headerRow = table.querySelector('thead tr:first-child');
        if (headerRow) {
            const headers = [];
            Array.from(headerRow.cells).forEach(cell => {
                // Skip hidden columns
                if (cell.style.display === 'none') return;

                // Clean header text (remove sort icons)
                let headerText = cell.textContent.replace(/[⇅▲▼]/g, '').trim();
                // Remove extra whitespace
                headerText = headerText.replace(/\s+/g, ' ');
                headers.push(headerText);
            });
            rows.push(headers);
            totalCells += headers.length;
            Lib.debug('export', `Exported ${headers.length} headers: ${headers.join(', ')}`);
        }

        // Get data rows (only visible ones)
        const dataRows = table.querySelectorAll('tbody tr');
        let rowsExported = 0;
        let rowsSkipped = 0;

        dataRows.forEach(row => {
            // Skip hidden rows (filtered out)
            if (row.style.display === 'none') {
                rowsSkipped++;
                return;
            }

            const cells = [];
            Array.from(row.cells).forEach((cell, index) => {
                // Skip hidden columns
                if (cell.style.display === 'none') return;

                // Get text content and clean it up
                let text = cell.textContent.trim();

                // Remove extra whitespace
                text = text.replace(/\s+/g, ' ');

                // Escape quotes (CSV standard: " becomes "")
                text = text.replace(/"/g, '""');

                // Wrap in quotes if contains comma, newline, or quote
                if (text.includes(',') || text.includes('\n') || text.includes('"')) {
                    text = `"${text}"`;
                }

                cells.push(text);
            });

            if (cells.length > 0) {
                rows.push(cells);
                totalCells += cells.length;
                rowsExported++;
            }
        });

        Lib.debug('export', `Exported ${rowsExported} data rows, skipped ${rowsSkipped} hidden rows`);

        // Create CSV string
        const csv = rows.map(row => row.join(',')).join('\n');

        // Create Blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const pageName = pageType || 'table';
        const filename = `musicbrainz-${pageName}-${timestamp}.csv`;
        link.download = filename;

        // Trigger download
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);

        // Update status
        const infoDisplay = document.getElementById('mb-info-display');
        if (infoDisplay) {
            infoDisplay.textContent = `✓ Exported ${rowsExported} rows to ${filename}`;
            infoDisplay.style.color = 'green';
        }

        Lib.debug('export', `CSV export complete: ${filename} (${rowsExported} rows, ${totalCells} cells)`);

        // --- INFO POPUP TO ALERT USER (WITH FADE OUT) ---
        const infoPopup = document.createElement('div');
        infoPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #888;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            font-family: sans-serif;
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        const msg = document.createElement('div');
        msg.textContent = 'CSV export complete. Please monitor your browser for the file download.';
        msg.style.marginBottom = '15px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid #555;
            background-color: #f0f0f0;
        `;
        closeBtn.type = 'button';

        // Close function with fade out
        const closePopup = () => {
            infoPopup.style.opacity = '0';
            // Remove from DOM after transition
            setTimeout(() => {
                if (infoPopup.parentNode) infoPopup.parentNode.removeChild(infoPopup);
                document.removeEventListener('keydown', onEscape);
            }, 300); // match the CSS transition duration
        };

        // Button click closes popup
        closeBtn.addEventListener('click', closePopup);

        // Escape key closes popup
        const onEscape = (e) => {
            if (e.key === 'Escape') closePopup();
        };
        document.addEventListener('keydown', onEscape);

        infoPopup.appendChild(msg);
        infoPopup.appendChild(closeBtn);
        document.body.appendChild(infoPopup);

        // Focus the Close button
        setTimeout(() => closeBtn.focus(), 50);
    }

    /**
     * Export table to JSON format
     */
    function exportTableToJSON() {
        const table = document.querySelector('table.tbl');
        if (!table) {
            alert('No table found to export');
            Lib.error('export', 'No table found for JSON export');
            return;
        }

        Lib.debug('export', 'Starting JSON export...');

        const data = { headers: [], rows: [] };

        // Get headers from first row
        const headerRow = table.querySelector('thead tr:first-child');
        if (headerRow) {
            Array.from(headerRow.cells).forEach(cell => {
                if (cell.style.display === 'none') return;
                let headerText = cell.textContent.replace(/[⇅▲▼]/g, '').trim().replace(/\s+/g, ' ');
                data.headers.push(headerText);
            });
        }

        // Get data rows (only visible ones)
        const dataRows = table.querySelectorAll('tbody tr');
        let rowsExported = 0;

        dataRows.forEach(row => {
            if (row.style.display === 'none') return;

            const rowData = {};
            Array.from(row.cells).forEach((cell, index) => {
                if (cell.style.display === 'none') return;
                const headerIndex = Array.from(row.cells).filter((c, i) => i <= index && c.style.display !== 'none').length - 1;
                const headerName = data.headers[headerIndex] || `Column${index}`;
                rowData[headerName] = cell.textContent.trim().replace(/\s+/g, ' ');
            });

            if (Object.keys(rowData).length > 0) {
                data.rows.push(rowData);
                rowsExported++;
            }
        });

        // Create JSON string
        const json = JSON.stringify(data, null, 2);

        // Create Blob and download
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const pageName = pageType || 'table';
        const filename = `musicbrainz-${pageName}-${timestamp}.json`;
        link.download = filename;

        link.click();
        URL.revokeObjectURL(url);

        Lib.debug('export', `JSON export complete: ${filename} (${rowsExported} rows)`);
        showExportNotification('JSON', filename, rowsExported);
    }

    /**
     * Export table to Emacs Org-Mode format
     */
    function exportTableToOrgMode() {
        const table = document.querySelector('table.tbl');
        if (!table) {
            alert('No table found to export');
            Lib.error('export', 'No table found for Org-Mode export');
            return;
        }

        Lib.debug('export', 'Starting Org-Mode export...');

        const rows = [];

        // Get headers from first row
        const headerRow = table.querySelector('thead tr:first-child');
        if (headerRow) {
            const headers = [];
            Array.from(headerRow.cells).forEach(cell => {
                if (cell.style.display === 'none') return;
                let headerText = cell.textContent.replace(/[⇅▲▼]/g, '').trim().replace(/\s+/g, ' ');
                headers.push(headerText);
            });
            rows.push('| ' + headers.join(' | ') + ' |');
            rows.push('|' + headers.map(() => '---').join('|') + '|');
        }

        // Get data rows (only visible ones)
        const dataRows = table.querySelectorAll('tbody tr');
        let rowsExported = 0;

        dataRows.forEach(row => {
            if (row.style.display === 'none') return;

            const cells = [];
            Array.from(row.cells).forEach(cell => {
                if (cell.style.display === 'none') return;
                let text = cell.textContent.trim().replace(/\s+/g, ' ');
                // Escape pipe characters in org-mode
                text = text.replace(/\|/g, '\\vert');
                cells.push(text);
            });

            if (cells.length > 0) {
                rows.push('| ' + cells.join(' | ') + ' |');
                rowsExported++;
            }
        });

        // Create org-mode string
        const orgMode = rows.join('\n');

        // Create Blob and download
        const blob = new Blob([orgMode], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const pageName = pageType || 'table';
        const filename = `musicbrainz-${pageName}-${timestamp}.org`;
        link.download = filename;

        link.click();
        URL.revokeObjectURL(url);

        Lib.debug('export', `Org-Mode export complete: ${filename} (${rowsExported} rows)`);
        showExportNotification('Org-Mode', filename, rowsExported);
    }

    /**
     * Show export notification popup
     */
    function showExportNotification(format, filename, rowCount) {
        const infoDisplay = document.getElementById('mb-info-display');
        if (infoDisplay) {
            infoDisplay.textContent = `✓ Exported ${rowCount} rows to ${filename}`;
            infoDisplay.style.color = 'green';
        }

        const infoPopup = document.createElement('div');
        infoPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #888;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            font-family: sans-serif;
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        const msg = document.createElement('div');
        msg.textContent = `${format} export complete. Please monitor your browser for the file download.`;
        msg.style.marginBottom = '15px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 4px;
            background: #4CAF50;
            color: white;
            border: none;
            font-size: 0.9em;
        `;

        const closePopup = () => {
            infoPopup.style.opacity = '0';
            setTimeout(() => {
                if (infoPopup.parentNode) infoPopup.parentNode.removeChild(infoPopup);
                document.removeEventListener('keydown', onEscape);
            }, 300);
        };

        closeBtn.addEventListener('click', closePopup);

        const onEscape = (e) => {
            if (e.key === 'Escape') closePopup();
        };
        document.addEventListener('keydown', onEscape);

        infoPopup.appendChild(msg);
        infoPopup.appendChild(closeBtn);
        document.body.appendChild(infoPopup);

        // Focus the Close button
        setTimeout(() => closeBtn.focus(), 50);
    }

    /**
     * Add export button with dropdown menu to the controls
     */
    function addExportButton() {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) {
            Lib.warn('ui', 'Controls container not found, cannot add export button');
            return;
        }

        // Check if button already exists
        const existingBtn = Array.from(controlsContainer.querySelectorAll('button')).find(btn => btn.textContent.includes('Export'));
        if (existingBtn) {
            Lib.debug('ui', 'Export button already exists, skipping');
            return;
        }

        const exportBtn = document.createElement('button');
        exportBtn.innerHTML = '<u>E</u>xport 💾';
        exportBtn.title = `Export visible rows and columns to various formats (${getPrefixDisplay()}, then e)`;
        exportBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        exportBtn.type = 'button';

        // Create dropdown menu with Density-style formatting
        const exportMenu = document.createElement('div');
        exportMenu.style.cssText = `
            display: none;
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 220px;
        `;

        // Create menu header
        const menuHeader = document.createElement('div');
        menuHeader.style.cssText = 'font-weight: 600; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #ddd; color: #333;';
        menuHeader.textContent = 'Export Format';
        exportMenu.appendChild(menuHeader);

        const exportFormats = [
            { label: 'CSV', description: 'Comma-separated values for Excel/Sheets', handler: exportTableToCSV },
            { label: 'JSON', description: 'JavaScript Object Notation', handler: exportTableToJSON },
            { label: 'Org-Mode', description: 'Emacs Org-Mode table format', handler: exportTableToOrgMode }
        ];

        // Store menu items for keyboard navigation
        const exportMenuItems = [];

        exportFormats.forEach(format => {
            const menuItem = document.createElement('button');
            menuItem.type = 'button';
            menuItem.dataset.formatLabel = format.label;
            menuItem.style.cssText = `
                display: block;
                width: 100%;
                padding: 8px 12px;
                margin: 3px 0;
                cursor: pointer;
                border: 1px solid #ddd;
                background: white;
                text-align: left;
                border-radius: 4px;
                transition: all 0.2s;
            `;

            // Create label
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = 'font-weight: 600; margin-bottom: 2px;';
            labelDiv.textContent = format.label;

            // Create description
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size: 0.85em; color: #666;';
            descDiv.textContent = format.description;

            menuItem.appendChild(labelDiv);
            menuItem.appendChild(descDiv);

            // Hover effect
            menuItem.onmouseover = () => {
                menuItem.style.background = '#f5f5f5';
            };
            menuItem.onmouseout = () => {
                menuItem.style.background = 'white';
            };

            // Click handler
            menuItem.onclick = () => {
                format.handler();
                exportMenu.style.display = 'none';
            };

            exportMenuItems.push({ element: menuItem, handler: format.handler });
            exportMenu.appendChild(menuItem);
        });

        // Keyboard navigation state
        let selectedExportIndex = 0;

        // Function to update export menu focus
        const updateExportFocus = (index) => {
            exportMenuItems.forEach((item, i) => {
                if (i === index) {
                    item.element.style.background = '#e3f2fd';
                    item.element.style.borderColor = '#2196F3';
                    item.element.focus();
                } else {
                    item.element.style.background = 'white';
                    item.element.style.borderColor = '#ddd';
                }
            });
        };

        // Keyboard handler for export menu
        const exportMenuKeyHandler = (e) => {
            if (exportMenu.style.display !== 'block') return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedExportIndex = (selectedExportIndex + 1) % exportMenuItems.length;
                    updateExportFocus(selectedExportIndex);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    selectedExportIndex = (selectedExportIndex - 1 + exportMenuItems.length) % exportMenuItems.length;
                    updateExportFocus(selectedExportIndex);
                    break;

                case 'Enter':
                    e.preventDefault();
                    exportMenuItems[selectedExportIndex].handler();
                    exportMenu.style.display = 'none';
                    break;
            }
        };
        document.addEventListener('keydown', exportMenuKeyHandler);

        // Add separator and close instruction text
        const separator = document.createElement('div');
        separator.style.cssText = 'border-top: 1px solid #ddd; margin: 8px 0 8px 0;';
        exportMenu.appendChild(separator);

        const closeText = document.createElement('div');
        closeText.textContent = 'Click outside or press Escape to close';
        closeText.style.cssText = 'font-size: 0.85em; color: #999; text-align: center; font-style: italic; padding: 4px 0;';
        exportMenu.appendChild(closeText);

        // Toggle menu visibility
        exportBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = exportMenu.style.display === 'block';

            if (isVisible) {
                exportMenu.style.display = 'none';
            } else {
                exportMenu.style.display = 'block';

                // Position menu below button
                const rect = exportBtn.getBoundingClientRect();
                exportMenu.style.top = `${rect.bottom + 5}px`;
                exportMenu.style.left = `${rect.left}px`;

                // Reset selection and set focus to first option
                selectedExportIndex = 0;
                setTimeout(() => updateExportFocus(0), 10);
            }
        };

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!exportMenu.contains(e.target) && e.target !== exportBtn) {
                exportMenu.style.display = 'none';
            }
        };
        document.addEventListener('click', closeMenu);

        // Close menu on Escape key
        const closeMenuOnEscape = (e) => {
            if (e.key === 'Escape' && exportMenu.style.display === 'block') {
                exportMenu.style.display = 'none';
            }
        };
        document.addEventListener('keydown', closeMenuOnEscape);

        controlsContainer.appendChild(exportBtn);
        Lib.debug('ui', 'Export button with dropdown menu added to controls');
        ensureSettingsButtonIsLast();

        // Append menu to body
        document.body.appendChild(exportMenu);
    }

    /**
     * Clear all filters (global and column filters)
     */
    function clearAllFilters() {
        // Clear global filter
        const filterInput = document.querySelector('input[placeholder*="Global Filter"]');
        if (filterInput) {
            filterInput.value = '';
        }

        // Clear all column filters
        document.querySelectorAll('.mb-col-filter-input').forEach(input => {
            input.value = '';
        });

        // Re-run filter to update display
        if (typeof runFilter === 'function') {
            runFilter();
        }

        Lib.debug('shortcuts', 'All filters cleared');

        // Show feedback in filter status
        const filterStatusDisplay = document.getElementById('mb-filter-status-display');
        if (filterStatusDisplay) {
            filterStatusDisplay.textContent = '✓ All filters cleared';
            filterStatusDisplay.style.color = 'green';
        }
    }

    /**
     * Custom alert dialog - matches userscript styling
     */
    /**
     * Custom alert dialog - positioned below triggering button
     * @param {string} message - Alert message
     * @param {string} title - Dialog title
     * @param {HTMLElement} triggerButton - Button that triggered the alert (for positioning)
     */
    /**
     * Parse a condensed config string (pipe-separated) into an array of trimmed parts.
     * @param {string} raw - The raw config string value from settings
     * @param {string} defaultRaw - Fallback default string
     * @returns {string[]}
     */
    function parseCondensedStyle(raw, defaultRaw) {
        const src = (typeof raw === 'string' && raw.trim()) ? raw : defaultRaw;
        return src.split('|').map(s => s.trim());
    }

    /**
     * Build a CSS object for the popup dialog container from the condensed config string.
     * Format: bg|border|borderRadius|padding|boxShadow|zIndex|fontFamily|minWidth|maxWidth
     */
    function popupDialogCSS() {
        const defaults = 'white|1px solid #ccc|10px|28px|0 8px 32px rgba(0,0,0,0.2)|10001|-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif|380px|600px';
        const [bg, border, borderRadius, padding, boxShadow, zIndex, fontFamily, minWidth, maxWidth] =
            parseCondensedStyle(Lib.settings.sa_popup_dialog_style, defaults);
        return `position:fixed; background:${bg}; border:${border}; border-radius:${borderRadius}; padding:${padding}; box-shadow:${boxShadow}; z-index:${zIndex}; font-family:${fontFamily}; min-width:${minWidth}; max-width:${maxWidth};`;
    }

    /**
     * Build a CSS object for the popup header from the condensed config string.
     * Format: fontWeight|fontSize|marginBottom|paddingBottom|borderBottom|color
     */
    function popupHeaderCSS() {
        const defaults = '700|1.5em|18px|14px|2px solid #ddd|#222';
        const [fontWeight, fontSize, marginBottom, paddingBottom, borderBottom, color] =
            parseCondensedStyle(Lib.settings.sa_popup_header_style, defaults);
        return `font-weight:${fontWeight}; font-size:${fontSize}; margin-bottom:${marginBottom}; padding-bottom:${paddingBottom}; border-bottom:${borderBottom}; color:${color};`;
    }

    /**
     * Build a CSS object for the popup message from the condensed config string.
     * Format: marginBottom|lineHeight|color|fontSize
     */
    function popupMessageCSS() {
        const defaults = '24px|1.7|#444|1.2em';
        const [marginBottom, lineHeight, color, fontSize] =
            parseCondensedStyle(Lib.settings.sa_popup_message_style, defaults);
        return `margin-bottom:${marginBottom}; line-height:${lineHeight}; color:${color}; font-size:${fontSize}; word-wrap:break-word;`;
    }

    /**
     * Build CSS + hover color for the OK button from the condensed config string.
     * Format: padding|bg|color|border|borderRadius|fontSize|fontWeight|bgHover
     * @returns {{ css: string, hoverBg: string, normalBg: string }}
     */
    function popupOkBtnCSS() {
        const defaults = '10px 22px|#4CAF50|white|1px solid #45a049|5px|1.1em|600|#45a049';
        const [padding, bg, color, border, borderRadius, fontSize, fontWeight, bgHover] =
            parseCondensedStyle(Lib.settings.sa_popup_ok_btn_style, defaults);
        return {
            css: `padding:${padding}; background-color:${bg}; color:${color}; border:${border}; border-radius:${borderRadius}; font-size:${fontSize}; font-weight:${fontWeight}; cursor:pointer; transition:background-color 0.2s;`,
            normalBg: bg,
            hoverBg: bgHover
        };
    }

    /**
     * Build CSS + hover color for the Cancel button from the condensed config string.
     * Format: padding|bg|color|border|borderRadius|fontSize|fontWeight|bgHover
     * @returns {{ css: string, hoverBg: string, normalBg: string }}
     */
    function popupCancelBtnCSS() {
        const defaults = '10px 22px|#f0f0f0|#333|1px solid #ccc|5px|1.1em|500|#e0e0e0';
        const [padding, bg, color, border, borderRadius, fontSize, fontWeight, bgHover] =
            parseCondensedStyle(Lib.settings.sa_popup_cancel_btn_style, defaults);
        return {
            css: `padding:${padding}; background-color:${bg}; color:${color}; border:${border}; border-radius:${borderRadius}; font-size:${fontSize}; font-weight:${fontWeight}; cursor:pointer; transition:background-color 0.2s;`,
            normalBg: bg,
            hoverBg: bgHover
        };
    }

    /**
     * Unified custom dialog — replaces the old showCustomAlert and showCustomConfirm.
     *
     * @param {string}      message       - The body text (supports \n → <br> if isConfirm)
     * @param {string}      [title]       - Dialog header text
     * @param {HTMLElement} [triggerButton] - Element used to position the dialog below
     * @param {'alert'|'confirm'} [mode]  - 'alert' shows only OK; 'confirm' shows Cancel + OK
     * @returns {Promise<void|boolean>}   - alert: resolves undefined; confirm: resolves true/false
     */
    function showCustomDialog(message, title = 'Notice', triggerButton = null, mode = 'alert') {
        return new Promise((resolve) => {
            const isConfirm = mode === 'confirm';

            const dialogDiv = document.createElement('div');
            dialogDiv.style.cssText = popupDialogCSS();

            // Header
            const headerDiv = document.createElement('div');
            headerDiv.style.cssText = popupHeaderCSS();
            headerDiv.textContent = title;
            dialogDiv.appendChild(headerDiv);

            // Message
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = popupMessageCSS();
            if (isConfirm) {
                msgDiv.innerHTML = message.replace(/\n/g, '<br>');
            } else {
                msgDiv.textContent = message;
            }
            dialogDiv.appendChild(msgDiv);

            // Button container
            const btnGap = (Lib.settings.sa_popup_btn_gap || '12px').trim();
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = `display:flex; justify-content:flex-end; gap:${btnGap};`;

            let cancelBtn = null;

            if (isConfirm) {
                // Cancel button
                cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                const cancelStyle = popupCancelBtnCSS();
                cancelBtn.style.cssText = cancelStyle.css;
                cancelBtn.onmouseover = () => { cancelBtn.style.backgroundColor = cancelStyle.hoverBg; };
                cancelBtn.onmouseout  = () => { cancelBtn.style.backgroundColor = cancelStyle.normalBg; };
                cancelBtn.onclick = () => {
                    dialogDiv.remove();
                    document.removeEventListener('keydown', keyHandler);
                    resolve(false);
                };
                btnContainer.appendChild(cancelBtn);
            }

            // OK button
            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            const okStyle = popupOkBtnCSS();
            okBtn.style.cssText = okStyle.css;
            okBtn.onmouseover = () => { okBtn.style.backgroundColor = okStyle.hoverBg; };
            okBtn.onmouseout  = () => { okBtn.style.backgroundColor = okStyle.normalBg; };
            okBtn.onclick = () => {
                dialogDiv.remove();
                document.removeEventListener('keydown', keyHandler);
                resolve(isConfirm ? true : undefined);
            };
            btnContainer.appendChild(okBtn);

            dialogDiv.appendChild(btnContainer);
            document.body.appendChild(dialogDiv);

            // Position below trigger button or center screen
            setTimeout(() => {
                if (triggerButton) {
                    const btnRect = triggerButton.getBoundingClientRect();
                    const dialogRect = dialogDiv.getBoundingClientRect();
                    let top  = btnRect.bottom + 10;
                    let left = btnRect.left;

                    if (top + dialogRect.height > window.innerHeight) {
                        top = btnRect.top - dialogRect.height - 10;
                    }
                    if (left + dialogRect.width > window.innerWidth) {
                        left = window.innerWidth - dialogRect.width - 10;
                    }
                    if (left < 0) left = 10;

                    dialogDiv.style.left = left + 'px';
                    dialogDiv.style.top  = top  + 'px';
                } else {
                    dialogDiv.style.left      = '50%';
                    dialogDiv.style.top       = '50%';
                    dialogDiv.style.transform = 'translate(-50%, -50%)';
                }

                okBtn.focus();
            }, 0);

            // Keyboard handler
            const keyHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (isConfirm && cancelBtn) {
                        cancelBtn.click();
                    } else {
                        okBtn.click();
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    okBtn.click();
                } else if (e.key === 'Tab' && isConfirm && cancelBtn) {
                    e.preventDefault();
                    if (document.activeElement === cancelBtn) {
                        okBtn.focus();
                    } else {
                        cancelBtn.focus();
                    }
                }
            };
            document.addEventListener('keydown', keyHandler);
        });
    }

    /**
     * Convenience wrapper: alert-style dialog (single OK button).
     * @param {string} message
     * @param {string} [title]
     * @param {HTMLElement} [triggerButton]
     * @returns {Promise<void>}
     */
    function showCustomAlert(message, title = 'Notice', triggerButton = null) {
        return showCustomDialog(message, title, triggerButton, 'alert');
    }

    /**
     * Convenience wrapper: confirm-style dialog (Cancel + OK buttons).
     * @param {string} message
     * @param {string} [title]
     * @param {HTMLElement} [triggerButton]
     * @returns {Promise<boolean>}
     */
    function showCustomConfirm(message, title = 'Confirm', triggerButton = null) {
        return showCustomDialog(message, title, triggerButton, 'confirm');
    }

    /**
     * Show keyboard shortcuts help dialog
     */
    function showShortcutsHelp() {
        const existing = document.getElementById('mb-shortcuts-help');
        if (existing) {
            existing.remove();
            return;
        }

        const helpDiv = document.createElement('div');
        helpDiv.id = 'mb-shortcuts-help';
        helpDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-width: 450px;
            max-width: 550px;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = 'font-weight: 600; font-size: 1.2em; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #ddd; color: #333;';
        header.textContent = '🎹 Keyboard Shortcuts';
        helpDiv.appendChild(header);

        // Create shortcuts sections
        const sections = [
            {
                title: 'Filter & Search',
                shortcuts: [
                    { keys: 'Ctrl/Cmd + G', desc: 'Focus global filter' },
                    { keys: 'Ctrl/Cmd + C', desc: 'Focus first column filter (cycle through tables)' },
                    { keys: 'Ctrl/Cmd + Shift + G', desc: 'Clear all filters' },
                    { keys: 'Escape', desc: 'Clear focused filter (press twice to blur)' }
                ]
            },
            {
                title: 'View & Layout',
                shortcuts: [
                    { keys: 'Ctrl/Cmd + V', desc: 'Open "Visible Columns" menu' },
                    { keys: 'Ctrl/Cmd + D', desc: 'Open "Density" menu' },
                    { keys: 'Ctrl/Cmd + 2', desc: 'Toggle collapse all h2 headers' },
                    { keys: 'Ctrl/Cmd + 3', desc: 'Toggle collapse all h3 headers (types)' },
                    { keys: getPrefixDisplay(), desc: 'Enter prefix mode (then a second key selects action / function)' }
                ]
            },
            {
                title: 'Visible Columns Menu (when open)',
                shortcuts: [
                    { keys: 'Up/Down', desc: 'Navigate checkboxes' },
                    { keys: 'Space/Shift', desc: 'Toggle checkbox' },
                    { keys: 'Tab', desc: 'Cycle to buttons' },
                    { keys: 'Alt + S', desc: 'Select All' },
                    { keys: 'Alt + D', desc: 'Deselect All' },
                    { keys: 'Alt + C', desc: 'Choose current configuration' },
                    { keys: 'Enter/Escape', desc: 'Close menu' }
                ]
            },
            {
                title: 'Density Menu (when open)',
                shortcuts: [
                    { keys: 'Up/Down', desc: 'Navigate options (live preview)' },
                    { keys: 'Enter', desc: 'Apply and close' },
                    { keys: 'Escape', desc: 'Close menu' }
                ]
            },
            {
                title: 'Export Menu (when open)',
                shortcuts: [
                    { keys: 'Up/Down', desc: 'Navigate formats' },
                    { keys: 'Enter', desc: 'Execute and close' },
                    { keys: 'Escape', desc: 'Close menu' }
                ]
            },
            {
                title: 'Data Export & Management',
                shortcuts: [
                    { keys: 'Ctrl/Cmd + E', desc: 'Open export menu (CSV, JSON, Org-Mode)' },
                    { keys: 'Ctrl/Cmd + S', desc: 'Save to disk (JSON)' },
                    { keys: 'Ctrl/Cmd + L', desc: 'Load from disk' }
                ]
            },
            {
                title: 'Settings',
                shortcuts: [
                    { keys: 'Ctrl/Cmd + ,', desc: 'Open settings dialog' }
                ]
            },
            {
                title: 'Help',
                shortcuts: [
                    { keys: '? or /', desc: 'Show this help' }
                ]
            }
        ];

        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.style.cssText = 'margin-bottom: 15px;';

            const sectionTitle = document.createElement('div');
            sectionTitle.style.cssText = 'font-weight: 600; color: #555; margin-bottom: 8px; font-size: 0.95em;';
            sectionTitle.textContent = section.title;
            sectionDiv.appendChild(sectionTitle);

            section.shortcuts.forEach(shortcut => {
                const shortcutDiv = document.createElement('div');
                shortcutDiv.style.cssText = 'display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9em;';

                const keysSpan = document.createElement('span');
                keysSpan.style.cssText = 'font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; color: #333;';
                keysSpan.textContent = shortcut.keys;

                const descSpan = document.createElement('span');
                descSpan.style.cssText = 'color: #666; margin-left: 15px;';
                descSpan.textContent = shortcut.desc;

                shortcutDiv.appendChild(keysSpan);
                shortcutDiv.appendChild(descSpan);
                sectionDiv.appendChild(shortcutDiv);
            });

            helpDiv.appendChild(sectionDiv);
        });

        // Add note
        const note = document.createElement('div');
        note.style.cssText = 'margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.85em; color: #666; font-style: italic;';
        note.innerHTML = '<strong>Note:</strong> Ctrl shortcuts work everywhere, even in input fields.<br>? and / only work when not typing in input fields.';
        helpDiv.appendChild(note);

        // Add close instruction text
        const closeText = document.createElement('div');
        closeText.textContent = 'Click outside or press Escape to close';
        closeText.style.cssText = 'font-size: 0.85em; color: #999; text-align: center; font-style: italic; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;';
        helpDiv.appendChild(closeText);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: transparent;
            border: none;
            color: #999;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 1.2em;
            transition: all 0.2s;
            line-height: 1;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.background = '#f5f5f5';
            closeBtn.style.color = '#333';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'transparent';
            closeBtn.style.color = '#999';
        };
        closeBtn.onclick = () => helpDiv.remove();

        helpDiv.appendChild(closeBtn);
        document.body.appendChild(helpDiv);

        // Close on Escape
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                helpDiv.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);

        // Close on click outside (after a short delay to prevent immediate close)
        setTimeout(() => {
            const closeOnClickOutside = (e) => {
                if (!helpDiv.contains(e.target)) {
                    helpDiv.remove();
                    document.removeEventListener('click', closeOnClickOutside);
                }
            };
            document.addEventListener('click', closeOnClickOutside);
        }, 100);

        Lib.debug('shortcuts', 'Keyboard shortcuts help displayed');
    }

    /**
     * Show application help dialog
     * Displays the full feature overview from APP_HELP_TEXT in a scrollable popup
     */
    function showAppHelp() {
        const existing = document.getElementById('mb-app-help-dialog');
        if (existing) {
            existing.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'mb-app-help-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border: 1px solid #ccc;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 8px 40px rgba(0,0,0,0.25);
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: min(720px, 94vw);
            max-height: 82vh;
            display: flex;
            flex-direction: column;
        `;

        // Draggable title bar
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px 12px;
            border-bottom: 2px solid #ddd;
            cursor: move;
            user-select: none;
            flex-shrink: 0;
            border-radius: 10px 10px 0 0;
            background: #f8f8f8;
        `;

        const titleText = document.createElement('span');
        titleText.textContent = '❓ Application Help & Feature Overview';
        titleText.style.cssText = 'font-weight: 700; font-size: 1.15em; color: #222;';
        titleBar.appendChild(titleText);

        const closeX = document.createElement('button');
        closeX.textContent = '✕';
        closeX.title = 'Close (Escape)';
        closeX.style.cssText = `
            background: none;
            border: none;
            font-size: 1.2em;
            cursor: pointer;
            color: #666;
            padding: 0 4px;
            line-height: 1;
        `;
        titleBar.appendChild(closeX);
        dialog.appendChild(titleBar);

        // Scrollable content area
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            overflow-y: auto;
            padding: 20px 24px;
            flex: 1;
            font-size: 0.92em;
            line-height: 1.65;
            color: #333;
        `;

        // Render APP_HELP_TEXT as HTML with basic formatting
        const pre = document.createElement('pre');
        pre.style.cssText = `
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            font-size: 0.97em;
            line-height: 1.65;
        `;
        pre.textContent = typeof APP_HELP_TEXT !== 'undefined' ? APP_HELP_TEXT : '(Help text not available)';
        contentArea.appendChild(pre);
        dialog.appendChild(contentArea);

        // Footer with Close button
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            padding: 12px 20px;
            border-top: 1px solid #eee;
            flex-shrink: 0;
            background: #f8f8f8;
            border-radius: 0 0 10px 10px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 8px 24px;
            background-color: #607D8B;
            color: white;
            border: 1px solid #546E7A;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 500;
            transition: background-color 0.2s;
        `;
        closeBtn.onmouseover = () => { closeBtn.style.backgroundColor = '#546E7A'; };
        closeBtn.onmouseout = () => { closeBtn.style.backgroundColor = '#607D8B'; };
        footer.appendChild(closeBtn);
        dialog.appendChild(footer);

        document.body.appendChild(dialog);

        const closeDialog = () => {
            dialog.remove();
            document.removeEventListener('keydown', keyHandler);
        };

        closeBtn.onclick = closeDialog;
        closeX.onclick = closeDialog;

        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDialog();
            }
        };
        document.addEventListener('keydown', keyHandler);

        // Make draggable
        let isDragging = false;
        let dragOffsetX = 0, dragOffsetY = 0;
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target === closeX) return;
            isDragging = true;
            const rect = dialog.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            dialog.style.transform = 'none';
            dialog.style.left = rect.left + 'px';
            dialog.style.top = rect.top + 'px';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            dialog.style.left = (e.clientX - dragOffsetX) + 'px';
            dialog.style.top = (e.clientY - dragOffsetY) + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });

        // Focus Close button for immediate keyboard access
        setTimeout(() => closeBtn.focus(), 0);

        Lib.debug('ui', 'Application help dialog displayed');
    }

    /**
     * Initialize keyboard shortcuts for common actions
     * Provides power-user functionality for quick access to features
     */
    function initKeyboardShortcuts() {
        // Prevent duplicate initialization
        if (document._mbKeyboardShortcutsInitialized) {
            Lib.debug('shortcuts', 'Keyboard shortcuts already initialized');
            return;
        }

        // Track current table index for Ctrl-C cycling
        let currentTableIndex = -1;

        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input or textarea
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            // Only ? and / shortcuts don't work when typing (for obvious reasons)
            if ((e.key === '?' || e.key === '/') && isTyping) {
                return;
            }

            // Ctrl/Cmd + , : Open settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                Lib.showSettings();
                Lib.debug('shortcuts', 'Settings dialog opened via Ctrl+,');
            }

            // Ctrl/Cmd + G: Focus global filter
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault();
                const filterInput = document.querySelector('input[placeholder*="Global Filter"]');
                if (filterInput) {
                    filterInput.focus();
                    filterInput.select();
                    Lib.debug('shortcuts', 'Global filter focused via Ctrl+G');
                }
            }

            // Ctrl/Cmd + C: Focus first column filter (cycle through tables, skip checkbox/number columns)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                const tables = document.querySelectorAll('table.tbl');
                if (tables.length === 0) {
                    Lib.warn('shortcuts', 'No tables found for column filter focus');
                    return;
                }

                // Cycle to next table
                currentTableIndex = (currentTableIndex + 1) % tables.length;
                const currentTable = tables[currentTableIndex];

                // Find the first column filter input in this table (skip checkbox/number columns)
                const filterRow = currentTable.querySelector('thead tr.mb-col-filter-row');
                if (filterRow) {
                    const headerRow = currentTable.querySelector('thead tr:first-child');
                    const allFilterInputs = filterRow.querySelectorAll('input.mb-col-filter-input');

                    // Find first filter input that doesn't correspond to checkbox-cell or number-column
                    let targetInput = null;
                    for (let i = 0; i < allFilterInputs.length; i++) {
                        const input = allFilterInputs[i];
                        const colIdx = parseInt(input.dataset.colIdx);
                        const headerCell = headerRow.cells[colIdx];

                        // Skip if header is checkbox-cell or number-column
                        if (headerCell &&
                            !headerCell.classList.contains('checkbox-cell') &&
                            !headerCell.classList.contains('number-column')) {
                            targetInput = input;
                            break;
                        }
                    }

                    if (targetInput) {
                        targetInput.focus();
                        targetInput.select();
                        Lib.debug('shortcuts', `First column filter focused via Ctrl+C (table ${currentTableIndex + 1}/${tables.length})`);
                    } else {
                        Lib.warn('shortcuts', `No suitable column filter input found in table ${currentTableIndex + 1}`);
                    }
                } else {
                    Lib.warn('shortcuts', `No filter row found in table ${currentTableIndex + 1}`);
                }
            }

            // Ctrl/Cmd + Shift + G: Clear all filters
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
                e.preventDefault();
                clearAllFilters();
            }

            // Ctrl/Cmd + E: Export menu
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                const exportBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Export'));
                if (exportBtn) {
                    exportBtn.click();
                    Lib.debug('shortcuts', 'Export menu triggered via Ctrl+E');
                } else {
                    Lib.warn('shortcuts', 'Export button not found');
                }
            }

            // Ctrl/Cmd + S: Save to disk (JSON)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const saveBtn = document.querySelector('button[title*="Save current table data"]');
                if (saveBtn) {
                    saveBtn.click();
                    Lib.debug('shortcuts', 'Save to disk triggered via Ctrl+S');
                } else {
                    Lib.warn('shortcuts', 'Save button not found');
                }
            }

            // Ctrl/Cmd + L: Load from disk
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                const loadBtn = document.querySelector('button[title*="Load table data from disk"]');
                if (loadBtn) {
                    loadBtn.click();
                    Lib.debug('shortcuts', 'Load from disk triggered via Ctrl+L');
                } else {
                    Lib.warn('shortcuts', 'Load button not found');
                }
            }

            // Ctrl/Cmd + V: Open Visible Columns menu
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                const visibleColumnsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Visible Columns'));
                if (visibleColumnsBtn) {
                    visibleColumnsBtn.click();
                    Lib.debug('shortcuts', 'Visible Columns menu opened via Ctrl+V');
                } else {
                    Lib.warn('shortcuts', 'Visible Columns button not found');
                }
            }

            // Ctrl/Cmd + D: Open Density menu
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                const densityBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Density'));
                if (densityBtn) {
                    densityBtn.click();
                    Lib.debug('shortcuts', 'Density menu opened via Ctrl+D');
                } else {
                    Lib.warn('shortcuts', 'Density button not found');
                }
            }

            // Ctrl/Cmd + 2: Toggle collapse all h2 headers
            if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                e.preventDefault();
                const h2s = document.querySelectorAll('h2.mb-toggle-h2');
                if (h2s.length > 0) {
                    // Determine if we should expand or collapse based on the first h2's state
                    const firstIcon = h2s[0].querySelector('.mb-toggle-icon');
                    const isExpanding = firstIcon && firstIcon.textContent === '▲';

                    h2s.forEach(h2 => {
                        if (typeof h2._mbToggle === 'function') {
                            h2._mbToggle(isExpanding);
                        }
                    });
                    Lib.debug('shortcuts', `All h2 headers ${isExpanding ? 'expanded' : 'collapsed'} via Ctrl+2`);
                } else {
                    Lib.warn('shortcuts', 'No collapsible h2 headers found');
                }
            }

            // Ctrl/Cmd + 3: Toggle collapse all h3 headers
            if ((e.ctrlKey || e.metaKey) && e.key === '3') {
                e.preventDefault();
                const h3s = document.querySelectorAll('.mb-toggle-h3');
                if (h3s.length > 0) {
                    // Determine if we should expand or collapse based on the first h3's state
                    const firstIcon = h3s[0].querySelector('.mb-toggle-icon');
                    const isExpanding = firstIcon && firstIcon.textContent === '▲';

                    // Trigger show or hide all functionality
                    const tables = document.querySelectorAll('table.tbl');
                    if (isExpanding) {
                        // Show all
                        tables.forEach(t => t.style.display = '');
                        h3s.forEach(h => {
                            const icon = h.querySelector('.mb-toggle-icon');
                            if (icon) icon.textContent = '▼';
                        });
                        Lib.debug('shortcuts', 'All h3 headers (types) shown via Ctrl+3');
                    } else {
                        // Hide all
                        tables.forEach(t => t.style.display = 'none');
                        h3s.forEach(h => {
                            const icon = h.querySelector('.mb-toggle-icon');
                            if (icon) icon.textContent = '▲';
                        });
                        Lib.debug('shortcuts', 'All h3 headers (types) hidden via Ctrl+3');
                    }
                } else {
                    Lib.warn('shortcuts', 'No collapsible h3 headers found');
                }
            }

            // Escape: Clear focused filter (first press) or blur (second press)
            if (e.key === 'Escape' &&
                (e.target.matches('.mb-col-filter-input') ||
                 e.target.matches('input[placeholder*="Global Filter"]'))) {
                if (
                    e.target.classList.contains('mb-col-filter-input') ||
                    (e.target.placeholder && e.target.placeholder.includes('Global Filter'))
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();   // ← IMPORTANT

                    const isColumn = e.target.classList.contains('mb-col-filter-input');
                    const filterType = isColumn ? 'Column' : 'Global';

                    if (e.target.value.trim() === '') {
                        // Second press → blur
                        e.target.blur();
                        Lib.debug('shortcuts', `${filterType} filter blurred via Escape (second press)`);
                    } else {
                        // First press → clear and keep focus
                        e.target.value = '';
                        runFilter();
                        e.target.setSelectionRange(0, 0);
                        Lib.debug('shortcuts', `${filterType} filter cleared via Escape (first press, focus kept)`);
                    }

                    return; // ← prevent any further Escape handling
                }
            }

            // ? or /: Show shortcuts help
            if ((e.key === '?' || e.key === '/') && !isTyping) {
                e.preventDefault();
                showShortcutsHelp();
            }
        });

        document._mbKeyboardShortcutsInitialized = true;
        Lib.debug('shortcuts', 'Keyboard shortcuts initialized');
    }

    /**
     * Add keyboard shortcuts help button to UI
     */
    function addShortcutsHelpButton() {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) {
            Lib.warn('ui', 'Controls container not found, cannot add shortcuts help button');
            return;
        }

        // Check if button already exists (by id set at initial render)
        if (document.getElementById('mb-shortcuts-help-btn')) {
            Lib.debug('ui', 'Shortcuts help button already exists, skipping');
            return;
        }

        const helpBtn = document.createElement('button');
        helpBtn.id = 'mb-shortcuts-help-btn';
        helpBtn.textContent = '🎹';
        helpBtn.title = 'Show keyboard shortcuts (or press ?)';
        helpBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        helpBtn.type = 'button';
        helpBtn.onclick = showShortcutsHelp;

        // Insert before the settings button so 🎹 stays to its left
        const settingsBtn = controlsContainer.querySelector('button[title*="Open settings manager"]');
        if (settingsBtn) {
            controlsContainer.insertBefore(helpBtn, settingsBtn);
        } else {
            controlsContainer.appendChild(helpBtn);
        }
        Lib.debug('ui', 'Keyboard shortcuts help button added to controls');
        ensureSettingsButtonIsLast();
    }

    /**
     * Show table statistics panel
     * Displays useful information about the current table state
     */
    function showStatsPanel() {
        // Check if panel already exists (toggle behavior)
        const existing = document.getElementById('mb-stats-panel');
        if (existing) {
            existing.remove();
            return;
        }

        const tables = document.querySelectorAll('table.tbl');
        if (tables.length === 0) {
            alert('No table found to show statistics');
            Lib.warn('stats', 'No table found for statistics panel');
            return;
        }

        // Collect statistics across ALL tables
        let totalRowCount = 0;
        let visibleRowCount = 0;
        let totalColumnCount = 0;
        let visibleColumnCount = 0;

        tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr');
            totalRowCount += rows.length;
            visibleRowCount += Array.from(rows).filter(r => r.style.display !== 'none').length;
        });

        // Get column count from first table's header row (not filter row)
        const firstTable = tables[0];
        const headerRow = firstTable.querySelector('thead tr:first-child');
        if (headerRow) {
            const headers = Array.from(headerRow.cells);
            totalColumnCount = headers.length;
            visibleColumnCount = headers.filter(h => h.style.display !== 'none').length;
        }

        // Calculate memory estimate (rough)
        const avgRowSize = 100; // bytes per row (rough estimate)
        const memoryKB = Math.round(totalRowCount * avgRowSize / 1024);

        // Get filter status
        const globalFilterInput = document.querySelector('input[placeholder*="Global Filter"]');
        const globalFilter = globalFilterInput?.value || '';
        const columnFilters = Array.from(document.querySelectorAll('.mb-col-filter-input'))
            .filter(inp => inp.value)
            .length;

        // Calculate percentages
        const rowPercentage = totalRowCount > 0
            ? Math.round((visibleRowCount / totalRowCount) * 100)
            : 100;
        const colPercentage = totalColumnCount > 0
            ? Math.round((visibleColumnCount / totalColumnCount) * 100)
            : 100;

        // Count hidden items
        const hiddenRows = totalRowCount - visibleRowCount;
        const hiddenColumns = totalColumnCount - visibleColumnCount;

        // Create panel
        const statsPanel = document.createElement('div');
        statsPanel.id = 'mb-stats-panel';
        statsPanel.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: white;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 0.9em;
            min-width: 280px;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        statsPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                <strong style="font-size: 1.1em; color: #4CAF50;">📊 Table Statistics</strong>
                <button id="mb-stats-close" style="background: none; border: none; font-size: 1.3em; cursor: pointer; color: #666; padding: 0; line-height: 1;">✕</button>
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px 15px; line-height: 1.8;">
                <div style="font-weight: 600;">Total Rows:</div>
                <div>${totalRowCount.toLocaleString()}</div>

                <div style="font-weight: 600;">Visible Rows:</div>
                <div>${visibleRowCount.toLocaleString()} <span style="color: #666; font-size: 0.9em;">(${rowPercentage}%)</span></div>

                <div style="font-weight: 600;">Filtered Out:</div>
                <div style="color: ${hiddenRows > 0 ? '#f44336' : '#666'};">${hiddenRows.toLocaleString()}</div>

                <div style="font-weight: 600;">Total Columns:</div>
                <div>${totalColumnCount}</div>

                <div style="font-weight: 600;">Visible Columns:</div>
                <div>${visibleColumnCount} <span style="color: #666; font-size: 0.9em;">(${colPercentage}%)</span></div>

                <div style="font-weight: 600;">Hidden Columns:</div>
                <div style="color: ${hiddenColumns > 0 ? '#f44336' : '#666'};">${hiddenColumns}</div>

                <div style="font-weight: 600;">Memory Usage:</div>
                <div>~${memoryKB.toLocaleString()} KB</div>

                <div style="font-weight: 600;">Global Filter:</div>
                <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${globalFilter}">${globalFilter ? `"${globalFilter}"` : '<em style="color: #999;">none</em>'}</div>

                <div style="font-weight: 600;">Column Filters:</div>
                <div>${columnFilters || 0} active</div>

                <div style="font-weight: 600;">Page Type:</div>
                <div style="font-family: monospace; font-size: 0.85em;">${pageType || 'unknown'}</div>
            </div>
            <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 0.85em; color: #666; text-align: center;">
                Click outside or press Escape to close
            </div>
        `;

        document.body.appendChild(statsPanel);

        // Close button handler
        document.getElementById('mb-stats-close').onclick = () => {
            statsPanel.remove();
        };

        // Close on Escape
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                statsPanel.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);

        // Close on click outside (after a short delay)
        setTimeout(() => {
            const closeOnClickOutside = (e) => {
                if (!statsPanel.contains(e.target)) {
                    statsPanel.remove();
                    document.removeEventListener('click', closeOnClickOutside);
                }
            };
            document.addEventListener('click', closeOnClickOutside);
        }, 100);

        Lib.debug('stats', `Statistics panel displayed: ${visibleRows.length}/${allRows.length} rows, ${visibleColumns}/${totalColumns} columns`);
    }

    /**
     * Add statistics panel button to UI
     */
    function addStatsButton() {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) {
            Lib.warn('ui', 'Controls container not found, cannot add stats button');
            return;
        }

        // Check if button already exists
        const existingBtn = Array.from(controlsContainer.querySelectorAll('button')).find(btn => btn.textContent.includes('Stats'));
        if (existingBtn) {
            Lib.debug('ui', 'Stats button already exists, skipping');
            return;
        }

        const statsBtn = document.createElement('button');
        statsBtn.innerHTML = '📊 S<u>t</u>ats';
        statsBtn.title = `Show table statistics (${getPrefixDisplay()}, then t)`;
        statsBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        statsBtn.type = 'button';
        statsBtn.onclick = showStatsPanel;

        controlsContainer.appendChild(statsBtn);
        Lib.debug('ui', 'Stats button added to controls');
        ensureSettingsButtonIsLast();
    }

    /**
     * Table density configurations
     * Defines padding, font size, and line height for different density levels
     */
    const densityOptions = {
        compact: {
            label: 'Compact',
            padding: '2px 6px',
            fontSize: '0.85em',
            lineHeight: '1.2',
            description: 'Tight spacing - fits more rows on screen'
        },
        normal: {
            label: 'Normal',
            padding: '4px 8px',
            fontSize: '1em',
            lineHeight: '1.5',
            description: 'Default spacing - balanced view'
        },
        comfortable: {
            label: 'Comfortable',
            padding: '8px 12px',
            fontSize: '1em',
            lineHeight: '1.8',
            description: 'Relaxed spacing - easier to read'
        }
    };

    // Track current density (default is normal)
    let currentDensity = 'normal';

    /**
     * Apply density settings to table
     * @param {string} densityKey - Key from densityOptions (compact, normal, comfortable)
     */
    function applyTableDensity(densityKey) {
        if (!densityOptions[densityKey]) {
            Lib.warn('density', `Unknown density option: ${densityKey}`);
            return;
        }

        const config = densityOptions[densityKey];
        const tables = document.querySelectorAll('table.tbl');

        if (tables.length === 0) {
            Lib.warn('density', 'No tables found to apply density');
            return;
        }

        tables.forEach(table => {
            // Apply to all cells (headers and data)
            table.querySelectorAll('td, th').forEach(cell => {
                cell.style.padding = config.padding;
                cell.style.fontSize = config.fontSize;
                cell.style.lineHeight = config.lineHeight;
            });
        });

        currentDensity = densityKey;

        // Update status display
        const infoDisplay = document.getElementById('mb-info-display');
        if (infoDisplay) {
            infoDisplay.textContent = `✓ Table density: ${config.label}`;
            infoDisplay.style.color = 'green';
        }

        Lib.debug('density', `Applied ${config.label} density to ${tables.length} table(s)`);
    }

    /**
     * Show table density menu and add density control button
     */
    function addDensityControl() {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) {
            Lib.warn('ui', 'Controls container not found, cannot add density button');
            return;
        }

        // Check if button already exists
        const existingBtn = Array.from(controlsContainer.querySelectorAll('button')).find(btn => btn.textContent.includes('Density'));
        if (existingBtn) {
            Lib.debug('ui', 'Density control button already exists, skipping');
            return;
        }

        // Create button
        const densityBtn = document.createElement('button');
        densityBtn.innerHTML = '📏 <u>D</u>ensity';
        densityBtn.title = `Change table density (spacing) (${getPrefixDisplay()}, then d)`;
        densityBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        densityBtn.type = 'button';

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'mb-density-menu';
        menu.style.cssText = `
            display: none;
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 220px;
        `;

        // Create menu header
        const menuHeader = document.createElement('div');
        menuHeader.style.cssText = 'font-weight: 600; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #ddd; color: #333;';
        menuHeader.textContent = 'Table Density';
        menu.appendChild(menuHeader);

        // Store menu options for keyboard navigation
        const menuOptions = [];

        // Create option for each density
        Object.entries(densityOptions).forEach(([key, config]) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.dataset.densityKey = key;
            option.style.cssText = `
                display: block;
                width: 100%;
                padding: 8px 12px;
                margin: 3px 0;
                cursor: pointer;
                border: 1px solid #ddd;
                background: white;
                text-align: left;
                border-radius: 4px;
                transition: all 0.2s;
            `;

            // Create label with icon
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = 'font-weight: 600; margin-bottom: 2px;';
            labelDiv.textContent = config.label;

            // Create description
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size: 0.85em; color: #666;';
            descDiv.textContent = config.description;

            option.appendChild(labelDiv);
            option.appendChild(descDiv);

            // Highlight current selection
            if (key === currentDensity) {
                option.style.background = '#e8f5e9';
                option.style.borderColor = '#4CAF50';
                option.style.fontWeight = '600';
            }

            // Hover effect
            option.onmouseover = () => {
                if (key !== currentDensity) {
                    option.style.background = '#f5f5f5';
                }
            };
            option.onmouseout = () => {
                if (key !== currentDensity) {
                    option.style.background = 'white';
                }
            };

            // Click handler
            option.onclick = () => {
                applyTableDensity(key);
                menu.style.display = 'none';

                // Update button styles
                menu.querySelectorAll('button').forEach(btn => {
                    btn.style.background = 'white';
                    btn.style.borderColor = '#ddd';
                    btn.style.fontWeight = 'normal';
                });
                option.style.background = '#e8f5e9';
                option.style.borderColor = '#4CAF50';
                option.style.fontWeight = '600';
            };

            menuOptions.push(option);
            menu.appendChild(option);
        });

        // Keyboard navigation state
        let selectedOptionIndex = Object.keys(densityOptions).indexOf(currentDensity);

        // Function to update option focus and preview
        const updateOptionFocus = (index, applyImmediately = false) => {
            menuOptions.forEach((opt, i) => {
                if (i === index) {
                    opt.style.background = '#e3f2fd';
                    opt.style.borderColor = '#2196F3';
                    opt.focus();
                    if (applyImmediately) {
                        // Immediately apply the density for preview
                        applyTableDensity(opt.dataset.densityKey);
                    }
                } else {
                    // Reset to default or current selection styling
                    const isCurrentDensity = opt.dataset.densityKey === currentDensity;
                    opt.style.background = isCurrentDensity ? '#e8f5e9' : 'white';
                    opt.style.borderColor = isCurrentDensity ? '#4CAF50' : '#ddd';
                }
            });
        };

        // Keyboard handler for density menu
        const densityMenuKeyHandler = (e) => {
            if (menu.style.display !== 'block') return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedOptionIndex = (selectedOptionIndex + 1) % menuOptions.length;
                    updateOptionFocus(selectedOptionIndex, true);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    selectedOptionIndex = (selectedOptionIndex - 1 + menuOptions.length) % menuOptions.length;
                    updateOptionFocus(selectedOptionIndex, true);
                    break;

                case 'Enter':
                    e.preventDefault();
                    const selectedOption = menuOptions[selectedOptionIndex];
                    applyTableDensity(selectedOption.dataset.densityKey);
                    menu.style.display = 'none';
                    // Update visual state of selected option
                    menuOptions.forEach(opt => {
                        const isSelected = opt === selectedOption;
                        opt.style.background = isSelected ? '#e8f5e9' : 'white';
                        opt.style.borderColor = isSelected ? '#4CAF50' : '#ddd';
                        opt.style.fontWeight = isSelected ? '600' : 'normal';
                    });
                    break;
            }
        };
        document.addEventListener('keydown', densityMenuKeyHandler);

        // Add separator and close instruction text
        const separator = document.createElement('div');
        separator.style.cssText = 'border-top: 1px solid #ddd; margin: 8px 0 8px 0;';
        menu.appendChild(separator);

        const closeText = document.createElement('div');
        closeText.textContent = 'Click outside or press Escape to close';
        closeText.style.cssText = 'font-size: 0.85em; color: #999; text-align: center; font-style: italic; padding: 4px 0;';
        menu.appendChild(closeText);

        // Toggle menu visibility
        densityBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = menu.style.display === 'block';

            if (isVisible) {
                menu.style.display = 'none';
            } else {
                menu.style.display = 'block';

                // Position menu below button
                const rect = densityBtn.getBoundingClientRect();
                menu.style.top = `${rect.bottom + 5}px`;
                menu.style.left = `${rect.left}px`;

                // Reset selection to current density and set focus
                selectedOptionIndex = Object.keys(densityOptions).indexOf(currentDensity);
                setTimeout(() => updateOptionFocus(selectedOptionIndex, false), 10);
            }
        };

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== densityBtn) {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('click', closeMenu);

        // Close menu on Escape key
        const closeMenuOnEscape = (e) => {
            if (e.key === 'Escape' && menu.style.display === 'block') {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('keydown', closeMenuOnEscape);

        // Append to controls container
        controlsContainer.appendChild(densityBtn);
        Lib.debug('ui', 'Density control button added to controls');
        ensureSettingsButtonIsLast();

        // Append menu to body
        document.body.appendChild(menu);
    }

    // Track auto-resize state
    let isAutoResized = false;
    let isManuallyResized = false;
    const originalTableStates = new Map(); // Store original states per table

    /**
     * Make table columns resizable with mouse drag
     * Adds resize handles to column headers
     * @param {HTMLTableElement} table - The table to make resizable
     */
    function makeColumnsResizable(table) {
        const headers = table.querySelectorAll('thead tr:first-child th');

        headers.forEach((th, index) => {
            // Skip if already has resizer
            if (th.querySelector('.column-resizer')) return;

            // Create resize handle
            const resizer = document.createElement('div');
            resizer.className = 'column-resizer';
            resizer.style.cssText = `
                position: absolute;
                right: 0;
                top: 0;
                width: 8px;
                height: 100%;
                cursor: col-resize;
                user-select: none;
                z-index: 1;
                background: transparent;
            `;

            // Visual indicator on hover
            resizer.addEventListener('mouseenter', () => {
                resizer.style.background = 'rgba(0, 0, 0, 0.1)';
            });
            resizer.addEventListener('mouseleave', () => {
                if (!resizer.classList.contains('resizing')) {
                    resizer.style.background = 'transparent';
                }
            });

            let startX, startWidth, colIndex;

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                startX = e.pageX;
                startWidth = th.offsetWidth;
                colIndex = index;

                resizer.classList.add('resizing');
                resizer.style.background = 'rgba(76, 175, 80, 0.3)';

                // Store original state if not already stored
                if (!isManuallyResized && !isAutoResized) {
                    // Get all tables and store their states
                    const allTables = document.querySelectorAll('table.tbl');
                    allTables.forEach(tbl => {
                        originalTableStates.set(tbl, storeOriginalTableState(tbl));
                    });
                }

                isManuallyResized = true;

                // Update button to show restore option
                updateResizeButtonState(true);

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);

                // Prevent text selection during resize
                document.body.style.userSelect = 'none';

                Lib.debug('resize', `Started resizing column ${colIndex} from width ${startWidth}px`);
            });

            function onMouseMove(e) {
                const delta = e.pageX - startX;
                const newWidth = Math.max(30, startWidth + delta); // Min width 30px

                // Apply width to the column
                setColumnWidth(table, colIndex, newWidth);
            }

            function onMouseUp(e) {
                resizer.classList.remove('resizing');
                resizer.style.background = 'transparent';

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Re-enable text selection
                document.body.style.userSelect = '';

                const finalWidth = th.offsetWidth;
                Lib.debug('resize', `Finished resizing column ${colIndex} to ${finalWidth}px`);

                // Update status
                const infoDisplay = document.getElementById('mb-info-display');
                if (infoDisplay) {
                    infoDisplay.textContent = `✓ Column ${colIndex + 1} resized to ${finalWidth}px`;
                    infoDisplay.style.color = 'green';
                }
            }

            // Make th position relative for absolute positioning of resizer
            th.style.position = 'relative';
            th.appendChild(resizer);
        });

        Lib.debug('resize', `Made ${headers.length} columns resizable`);
    }

    /**
     * Set width for a specific column across all rows
     * @param {HTMLTableElement} table - The table
     * @param {number} colIndex - Column index
     * @param {number} width - Width in pixels
     */
    function setColumnWidth(table, colIndex, width) {
        // Ensure table has fixed layout
        table.style.tableLayout = 'fixed';

        // Use colgroup for efficient column sizing
        let colgroup = table.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            table.insertBefore(colgroup, table.firstChild);

            // Create col elements for all columns
            const firstRow = table.querySelector('tbody tr');
            const colCount = firstRow ? firstRow.cells.length : 0;
            for (let i = 0; i < colCount; i++) {
                const col = document.createElement('col');
                colgroup.appendChild(col);
            }
        }

        // Set width on the specific col element
        const cols = colgroup.querySelectorAll('col');
        if (cols[colIndex]) {
            cols[colIndex].style.width = `${width}px`;
        }
    }

    /**
     * Update resize button state to reflect manual/auto resize status
     * @param {boolean} isResized - Whether table is currently resized
     */
    function updateResizeButtonState(isResized) {
        const resizeBtn = document.querySelector('button[title*="Auto-resize"], button[title*="Restore original"]');

        if (!resizeBtn) return;

        if (isResized) {
            resizeBtn.innerHTML = '↔️ <u>R</u>estore Width';
            resizeBtn.title = `Restore original column widths (click to toggle / ${getPrefixDisplay()}, then r)`;
            resizeBtn.style.background = '#e8f5e9';
            resizeBtn.style.borderColor = '#4CAF50';
        } else {
            resizeBtn.innerHTML = '↔️ Auto-<u>R</u>esize';
            resizeBtn.title = `Auto-resize columns to optimal width (click to toggle / ${getPrefixDisplay()}, then r)`;
            resizeBtn.style.background = '';
            resizeBtn.style.borderColor = '';
        }
    }

    /**
     * Store original table state before resizing
     * @param {HTMLTableElement} table - The table element
     * @returns {Object} Original state object
     */
    function storeOriginalTableState(table) {
        const state = {
            tableWidth: table.style.width,
            tableMinWidth: table.style.minWidth,
            tableLayout: table.style.tableLayout,
            colgroup: null
        };

        // Store colgroup if it exists
        const colgroup = table.querySelector('colgroup');
        if (colgroup) {
            state.colgroup = colgroup.cloneNode(true);
        }

        return state;
    }

    /**
     * Restore original table state
     * @param {HTMLTableElement} table - The table element
     * @param {Object} state - Original state object
     */
    function restoreOriginalTableState(table, state) {
        // Restore table styles
        table.style.width = state.tableWidth || '';
        table.style.minWidth = state.tableMinWidth || '';
        table.style.tableLayout = state.tableLayout || '';

        // Remove current colgroup
        const currentColgroup = table.querySelector('colgroup');
        if (currentColgroup) {
            currentColgroup.remove();
        }

        // Restore original colgroup if it existed
        if (state.colgroup) {
            table.insertBefore(state.colgroup.cloneNode(true), table.firstChild);
        }
    }

    /**
     *
     * Restore original content/sidebar state
     */
    function restoreOriginalScrollState() {
        const content = document.getElementById('content');
        const sidebar = document.getElementById('sidebar');
        const page = document.getElementById('page');

        if (content) {
            content.style.overflowX = '';
            content.style.overflowY = '';
        }

        if (sidebar) {
            sidebar.style.position = '';
            sidebar.style.left = '';
            sidebar.style.top = '';
            sidebar.style.alignSelf = '';
            sidebar.style.zIndex = '';
            sidebar.style.backgroundColor = '';
            sidebar.style.boxShadow = '';
        }

        if (page) {
            page.style.minWidth = '';
            page.style.width = '';
        }
    }

    /**
     * Auto-resize table columns to optimal width (with toggle)
     * First click: Resize columns to optimal width
     * Second click: Restore original column widths
     * Also handles manual resizing - restores to original state
     */
    /**
     * Toggles auto-resize mode for table columns
     * First click: auto-resizes columns to fit content
     * Second click: restores original column widths
     */
    function toggleAutoResizeColumns() {
        const tables = document.querySelectorAll('table.tbl');

        if (tables.length === 0) {
            alert('No tables found to resize');
            Lib.warn('resize', 'No tables found for auto-resize');
            return;
        }

        const resizeBtn = document.querySelector('button[title*="Auto-resize"], button[title*="Restore original"]');

        // Toggle: If already resized (auto or manual), restore original state
        if (isAutoResized || isManuallyResized) {
            Lib.debug('resize', 'Restoring original column widths...');

            tables.forEach((table, tableIndex) => {
                const state = originalTableStates.get(table);
                if (state) {
                    restoreOriginalTableState(table, state);
                    Lib.debug('resize', `Table ${tableIndex}: Restored original state`);
                }

                // Remove resize handles
                table.querySelectorAll('.column-resizer').forEach(resizer => {
                    resizer.remove();
                });

                // Re-add resize handles so users can resize again
                if (Lib.settings.sa_enable_column_resizing) {
                    makeColumnsResizable(table);
                }
            });

            // Restore scroll state
            restoreOriginalScrollState();

            // Clear stored states
            originalTableStates.clear();
            isAutoResized = false;
            isManuallyResized = false;

            // Update button appearance
            updateResizeButtonState(false);

            // Update status display
            const infoDisplay = document.getElementById('mb-info-display');
            if (infoDisplay) {
                infoDisplay.textContent = '✓ Restored original column widths';
                infoDisplay.style.color = 'green';
            }

            Lib.debug('resize', 'Original column widths restored');
            return;
        }

        // First click: Auto-resize columns
        Lib.debug('resize', `Auto-resizing ${tables.length} table(s)...`);

        const startTime = performance.now();
        let totalColumnsResized = 0;
        let tableCount = 0;

        // Store original states before modifying
        tables.forEach(table => {
            originalTableStates.set(table, storeOriginalTableState(table));
        });

        // Enable horizontal scrolling in content area
        const content = document.getElementById('content');
        const sidebar = document.getElementById('sidebar');
        const page = document.getElementById('page');

        if (content) {
            // Make content expand to fit wide tables without breaking vertical sticky headers
            content.style.overflowX = 'visible';
            content.style.overflowY = 'visible';

            // Prevent sidebar from scrolling out of view horizontally and vertically
            if (sidebar) {
                sidebar.style.position = 'sticky';
                sidebar.style.left = '0';
                sidebar.style.top = '0';
                sidebar.style.alignSelf = 'flex-start';
                sidebar.style.zIndex = '105'; // Must be above sticky table headers (z-index: 100)
                sidebar.style.backgroundColor = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
                sidebar.style.boxShadow = '2px 0 5px rgba(0,0,0,0.1)';
            }

            // Allow the page container to expand beyond viewport width
            if (page) {
                page.style.minWidth = '100%';
                page.style.width = 'fit-content';
            }

            Lib.debug('resize', 'Enabled horizontal scrolling at window level to preserve sticky headers');
        }

        tables.forEach((table, tableIndex) => {
            // Remove any existing width constraints
            table.style.width = 'auto';
            table.style.tableLayout = 'auto';

            // Get all columns by checking first row
            const firstRow = table.querySelector('tbody tr');
            if (!firstRow) {
                Lib.warn('resize', `Table ${tableIndex} has no data rows, skipping`);
                return;
            }

            const columnCount = firstRow.cells.length;
            const columnWidths = new Array(columnCount).fill(0);
            const columnVisible = new Array(columnCount).fill(false);

            // Determine which columns are visible by checking the first header row
            const headers = table.querySelectorAll('thead th');
            headers.forEach((th, colIndex) => {
                if (colIndex >= columnCount) return;
                // A column is visible if its header is not hidden
                columnVisible[colIndex] = th.style.display !== 'none';
            });

            // Create temporary measurement container
            const measureDiv = document.createElement('div');
            measureDiv.style.cssText = `
                position: absolute;
                visibility: hidden;
                white-space: nowrap;
                font-family: inherit;
                font-size: inherit;
                padding: 4px 8px;
            `;
            document.body.appendChild(measureDiv);

            // Measure header widths (ONLY for visible columns)
            headers.forEach((th, colIndex) => {
                if (colIndex >= columnCount) return;

                // Skip hidden columns
                if (!columnVisible[colIndex]) {
                    Lib.debug('resize', `Header ${colIndex}: Skipped (hidden)`);
                    return;
                }

                // Clone the entire content to preserve HTML structure (images, links, etc.)
                const contentClone = th.cloneNode(true);

                // DO NOT remove sort icons - they need to be measured as they're always present in headers
                // The sorting symbols (⇅, ▲, ▼) take up space and must be included in width calculation

                // Copy styles for accurate measurement
                const styles = window.getComputedStyle(th);
                measureDiv.style.fontSize = styles.fontSize;
                measureDiv.style.fontWeight = styles.fontWeight;
                measureDiv.style.padding = styles.padding;
                measureDiv.style.fontFamily = styles.fontFamily;

                // Clear previous content and add the clone
                measureDiv.innerHTML = '';
                measureDiv.appendChild(contentClone);

                const width = measureDiv.offsetWidth;

                columnWidths[colIndex] = Math.max(columnWidths[colIndex], width);

                Lib.debug('resize', `Header ${colIndex}: "${th.textContent.trim()}" = ${width}px`);
            });

            // Measure data cell widths (sample rows for performance, ONLY visible columns)
            const rows = table.querySelectorAll('tbody tr');
            const sampleSize = Math.min(rows.length, 100); // Sample up to 100 rows
            const sampleStep = Math.max(1, Math.floor(rows.length / sampleSize));

            for (let i = 0; i < rows.length; i += sampleStep) {
                const row = rows[i];

                // Skip hidden rows
                if (row.style.display === 'none') continue;

                Array.from(row.cells).forEach((cell, colIndex) => {
                    if (colIndex >= columnCount) return;

                    // Skip hidden columns
                    if (!columnVisible[colIndex]) return;

                    // Clone the entire content to preserve HTML structure (images, links, etc.)
                    const contentClone = cell.cloneNode(true);

                    // Copy styles for accurate measurement
                    const styles = window.getComputedStyle(cell);
                    measureDiv.style.fontSize = styles.fontSize;
                    measureDiv.style.fontWeight = styles.fontWeight;
                    measureDiv.style.padding = styles.padding;
                    measureDiv.style.fontFamily = styles.fontFamily;

                    // Clear previous content and add the clone
                    measureDiv.innerHTML = '';
                    measureDiv.appendChild(contentClone);

                    const width = measureDiv.offsetWidth;

                    columnWidths[colIndex] = Math.max(columnWidths[colIndex], width);
                });
            }

            // Clean up measurement div
            document.body.removeChild(measureDiv);

            // Apply widths to table columns
            // Use colgroup for better performance
            let colgroup = table.querySelector('colgroup');
            if (!colgroup) {
                colgroup = document.createElement('colgroup');
                table.insertBefore(colgroup, table.firstChild);
            } else {
                colgroup.innerHTML = ''; // Clear existing cols
            }

            let visibleColumnCount = 0;
            columnWidths.forEach((width, index) => {
                const col = document.createElement('col');

                // Only set width for VISIBLE columns
                if (columnVisible[index]) {
                    // Add some padding to the calculated width
                    const finalWidth = Math.ceil(width + 20); // 20px extra for comfort
                    col.style.width = `${finalWidth}px`;
                    visibleColumnCount++;
                    Lib.debug('resize', `Table ${tableIndex}, Column ${index}: ${finalWidth}px (visible)`);
                } else {
                    // For hidden columns, don't set a width - let them stay at their natural (hidden) size
                    col.style.width = '0px';
                    col.style.display = 'none';
                    Lib.debug('resize', `Table ${tableIndex}, Column ${index}: 0px (hidden)`);
                }

                colgroup.appendChild(col);
            });

            // Set table to use fixed layout for consistency
            table.style.tableLayout = 'fixed';

            // Calculate total table width (only from visible columns)
            const totalWidth = columnWidths.reduce((sum, w, idx) => {
                return columnVisible[idx] ? sum + w + 20 : sum;
            }, 0);
            table.style.width = `${totalWidth}px`;
            table.style.minWidth = `${totalWidth}px`;

            // Track statistics for status message
            if (visibleColumnCount > 0) {
                tableCount++;
                // Only set totalColumnsResized from the first table (all tables have same columns)
                if (totalColumnsResized === 0) {
                    totalColumnsResized = visibleColumnCount;
                }
            }

            // Add manual resize handles
            if (Lib.settings.sa_enable_column_resizing) {
                makeColumnsResizable(table);
            }

            Lib.debug('resize', `Table ${tableIndex}: Resized ${columnCount} columns, total width: ${totalWidth}px`);
        });

        const duration = (performance.now() - startTime).toFixed(0);

        // Mark as resized
        isAutoResized = true;

        // Update button appearance to show active state
        updateResizeButtonState(true);

        // Update status display
        const infoDisplay = document.getElementById('mb-info-display');
        if (infoDisplay) {
            let message = `✓ Auto-resized ${totalColumnsResized} visible column${totalColumnsResized !== 1 ? 's' : ''}`;
            if (tableCount > 1) {
                message += ` across ${tableCount} tables`;
            }
            message += ` in ${duration}ms (drag column edges to adjust)`;
            infoDisplay.textContent = message;
            infoDisplay.style.color = 'green';
        }

        Lib.debug('resize', `Auto-resize complete: ${totalColumnsResized} visible columns across ${tableCount} table(s) in ${duration}ms`);
    }

    /**
     * Add auto-resize columns button to UI
     */
    function addAutoResizeButton() {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) {
            Lib.warn('ui', 'Controls container not found, cannot add auto-resize button');
            return;
        }

        // Check if button already exists
        const existingBtn = Array.from(controlsContainer.querySelectorAll('button')).find(btn => btn.textContent.includes('Auto-Resize'));
        if (existingBtn) {
            Lib.debug('ui', 'Auto-resize button already exists, skipping');
            return;
        }

        const resizeBtn = document.createElement('button');
        resizeBtn.innerHTML = '↔️ Auto-<u>R</u>esize';
        resizeBtn.title = `Auto-resize columns to optimal width (${getPrefixDisplay()}, then r)`;
        resizeBtn.style.cssText = 'font-size:0.9em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        resizeBtn.type = 'button';
        resizeBtn.onclick = toggleAutoResizeColumns;

        controlsContainer.appendChild(resizeBtn);
        Lib.debug('ui', 'Auto-resize button added to controls');
        ensureSettingsButtonIsLast();
    }

    // --- Sidebar Collapsing & Full Width Stretching Logic ---
    /**
     * Initializes the sidebar collapse/expand functionality with smooth transitions
     *
     * Creates a toggle handle on the right edge of the sidebar that allows collapsing
     * the sidebar to free up horizontal space for content. When collapsed, content
     * containers expand to full width for better visibility of wide tables.
     *
     * Adds CSS transitions and event handlers for smooth sidebar collapse/expand animation
     */
    function initSidebarCollapse() {
        if (!Lib.settings.sa_collabsable_sidebar) return; // Only available if true

        const sidebar = document.getElementById("sidebar");
        const page = document.getElementById("page");
        const content = document.getElementById("content");

        if (!sidebar) return;

        Lib.debug('init', 'Initializing aggressive full-width sidebar toggle.');

        const sidebarWidth = '240px';

        const style = document.createElement('style');
        style.textContent = `
            /* Sidebar with proper overflow handling */
            #sidebar {
                transition: transform 0.3s ease, width 0.3s ease, opacity 0.3s ease, margin-right 0.3s ease;
                overflow-y: auto;
                overflow-x: hidden;
                box-sizing: border-box;
            }

            /* Content containers with proper width transitions and overflow handling */
            #page, #content {
                transition: margin-right 0.3s ease, padding-right 0.3s ease, width 0.3s ease, max-width 0.3s ease, margin-left 0.3s ease;
                box-sizing: border-box;
            }

            /* Ensure content can scroll when needed without overlapping sidebar */
            #content {
                /* overflow-x: auto; REMOVED: Breaks vertical sticky headers */
                /* overflow-y: auto; REMOVED: Breaks vertical sticky headers */
            }

            /* Collapsed sidebar state */
            .sidebar-collapsed {
                transform: translateX(100%);
                width: 0 !important;
                min-width: 0 !important;
                opacity: 0 !important;
                margin-right: -${sidebarWidth} !important;
                pointer-events: none;
                overflow: hidden !important;
            }

            /* Force 100% width and remove any MB centering/max-width constraints */
            /* This ensures content uses all available space when sidebar is collapsed */
            .mb-full-width-stretching {
                margin-right: 0 !important;
                margin-left: 0 !important;
                padding-right: 10px !important;
                padding-left: 10px !important;
                /* width: calc(100vw - 20px) !important; REMOVED to allow horizontal stretch */
                /* max-width: calc(100vw - 20px) !important; REMOVED to allow horizontal stretch */
                width: fit-content !important;
                min-width: calc(100vw - 20px) !important;
                box-sizing: border-box !important;
            }

            /* When sidebar is visible, leave room for it */
            body:not(.sidebar-is-collapsed) #page {
                margin-right: ${sidebarWidth};
            }

            body:not(.sidebar-is-collapsed) #content {
                /* Ensure content doesn't overlap with sidebar scrollbar */
                padding-right: 10px;
            }

            /* Toggle handle */
            #sidebar-toggle-handle {
                position: fixed;
                right: ${sidebarWidth};
                top: 50%;
                transform: translateY(-50%);
                width: 14px;
                height: 80px;
                background-color: #f2f2f2;
                border: 1px solid #ccc;
                border-right: none;
                border-radius: 8px 0 0 8px;
                cursor: pointer;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: right 0.3s ease;
                box-shadow: -2px 0 5px rgba(0,0,0,0.1);
            }

            #sidebar-toggle-handle::after {
                content: '▶';
                font-size: 9px;
                color: #555;
            }

            .handle-collapsed {
                right: 0 !important;
            }

            .handle-collapsed::after {
                content: '◀' !important;
            }

            /* Body class to track sidebar state */
            body.sidebar-is-collapsed #page,
            body.sidebar-is-collapsed #content {
                margin-right: 0 !important;
            }
        `;
        document.head.appendChild(style);

        const handle = document.createElement('div');
        handle.id = 'sidebar-toggle-handle';
        handle.title = 'Toggle Full Width Sidebar';

        const applyStretching = (isCollapsed) => {
            const containers = [document.getElementById("page"), document.getElementById("content")];

            // Add/remove body class to track sidebar state
            if (isCollapsed) {
                document.body.classList.add('sidebar-is-collapsed');
            } else {
                document.body.classList.remove('sidebar-is-collapsed');
            }

            containers.forEach(el => {
                if (el) {
                    if (isCollapsed) {
                        el.classList.add('mb-full-width-stretching');
                    } else {
                        el.classList.remove('mb-full-width-stretching');
                    }
                }
            });
        };

        handle.addEventListener('click', () => {
            const isCollapsing = !sidebar.classList.contains('sidebar-collapsed');
            sidebar.classList.toggle('sidebar-collapsed');
            handle.classList.toggle('handle-collapsed');
            applyStretching(isCollapsing);
            Lib.debug('meta', `Sidebar ${isCollapsing ? 'collapsed' : 'expanded'}. Full width applied.`);
        });

        document.body.appendChild(handle);

        // Observer to handle dynamic content replacement by the "Show All" logic
        const observer = new MutationObserver(() => {
            if (sidebar.classList.contains('sidebar-collapsed')) {
                applyStretching(true);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Initialization Logic ---

    // 1. Detect Page Type
    let pageType = '';
    let baseDefinition = null;   // Store the permanent base definition
    let activeDefinition = null; // Will be updated dynamically during fetch

    for (const def of pageDefinitions) {
        if (def.match(path, params)) {
            pageType = def.type;
            baseDefinition = def;   // Save the base reference
            activeDefinition = def; // Set default active definition
            // Add debug logs for tablemode and pagetype at the beginning of execution
            Lib.debug('init', `Detected pageType: ${pageType}`);
            Lib.debug('init', `Detected tableMode: ${activeDefinition ? activeDefinition.tableMode : 'unknown'}`);
            break; // Stop at first match (priority based on array order)
        }
    }

    // 2. Locate Header
    // Refactored to handle "Search" pages (generic h1) and typical entity headers
    let headerContainer = document.querySelector('.artistheader h1') ||
                          document.querySelector('.rgheader h1') ||
                          document.querySelector('.labelheader h1') ||
                          document.querySelector('.seriesheader h1') ||
                          document.querySelector('.placeheader h1') ||
                          document.querySelector('.areaheader h1') ||
                          document.querySelector('.recordingheader h1') ||
                          document.querySelector('h1 a bdi')?.parentNode ||
                          document.querySelector('#content h1') || // Often catches search result headers
                          document.querySelector('h1');

    if (pageType) Lib.prefix = `[VZ-ShowAllEntities: ${pageType}]`;
    Lib.debug('init', 'Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        Lib.error('init', 'Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    // 3. Set Feature Flags based on active definition
    // These are evaluated dynamically during fetch based on button-specific features
    let typesWithSplitCD = [];
    let typesWithSplitLocation = [];
    let typesWithSplitArea = [];

    // --- UI Elements ---
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mb-show-all-controls-container';
    controlsContainer.style.cssText = 'display:inline-flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:10px; vertical-align:middle; line-height:1;';

    const allActionButtons = [];

    // 4. Generate Buttons
    const buttonsToRender = activeDefinition.buttons || [
        { label: `Show all ${pageType.replace('-', ' ')}` } // Default fallback
    ];

    buttonsToRender.forEach(conf => {
        const eb = document.createElement('button');
        // Concatenate "🧮 " if label starts with "Show all"
        eb.textContent = conf.label.startsWith('Show all') ? '🧮 ' + conf.label : conf.label;
        eb.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; display: inline-flex; align-items: center; justify-content: center;';
        eb.type = 'button';

        // Add tooltip based on button label
        if (conf.label.includes('Show all')) {
            // Extract entity types from label (e.g., "Show all Releases for ReleaseGroup")
            eb.title = `Fetch all the table data from the MusicBrainz backend database`;
        } else if (conf.label.includes('Official artist RGs')) {
            eb.title = 'Fetch all official artist release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Non-official artist RGs')) {
            eb.title = 'Fetch all non-official artist release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Official various artists RGs')) {
            eb.title = 'Fetch all official various artists release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Non-official various artists RGs')) {
            eb.title = 'Fetch all non-official various artists release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Official artist releases')) {
            eb.title = 'Fetch all official artist releases from the MusicBrainz backend database';
        } else if (conf.label.includes('Various artist releases')) {
            eb.title = 'Fetch all various artist releases from the MusicBrainz backend database';
        }

        // Pass the entire config object
        eb.onclick = (e) => startFetchingProcess(e, conf, activeDefinition);
        controlsContainer.appendChild(eb);
        allActionButtons.push(eb);
    });

    // Add divider between action buttons and Save to Disk button
    const initialDivider = document.createElement('span');
    initialDivider.textContent = ' | ';
    initialDivider.className = 'mb-button-divider-initial';
    initialDivider.style.cssText = 'color:#999; margin:0 4px;';
    controlsContainer.appendChild(initialDivider);

    // Add Save to Disk button
    const saveToDiskBtn = document.createElement('button');
    saveToDiskBtn.innerHTML = '💾 <u>S</u>ave to Disk';
    saveToDiskBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; background-color:#4CAF50; color:white; border:1px solid #45a049; display:none; display: inline-flex; align-items: center; justify-content: center;';
    saveToDiskBtn.type = 'button';
    saveToDiskBtn.title = `Save current table data to disk as Gzipped JSON (${getPrefixDisplay()}, then s)`;
    saveToDiskBtn.onclick = () => saveTableDataToDisk();
    saveToDiskBtn.style.display = 'none'; // - Changed from 'inline-flex' or similar to 'none'

    if (Lib.settings.sa_enable_save_load) {
        controlsContainer.appendChild(saveToDiskBtn);
    }

    // Add Load from Disk button with hidden file input
    const loadFromDiskBtn = document.createElement('button');
    loadFromDiskBtn.innerHTML = '📂 <u>L</u>oad from Disk';
    loadFromDiskBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; background-color:#2196F3; color:white; border:1px solid #0b7dda; display: inline-flex; align-items: center; justify-content: center;';
    loadFromDiskBtn.type = 'button';
    loadFromDiskBtn.title = `Load table data from disk (JSON file) (${getPrefixDisplay()}, then l)`;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = ".gz,application/gzip";
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Read filter parameters from UI elements
        const filterQueryRaw = preFilterInput.value.trim();
        const isCaseSensitive = preFilterCaseCheckbox.checked;
        const isRegExp = preFilterRxCheckbox.checked;

        loadTableDataFromDisk(file, filterQueryRaw, isCaseSensitive, isRegExp);
    };

    loadFromDiskBtn.onclick = () => showLoadFilterDialog(loadFromDiskBtn);

    if (Lib.settings.sa_enable_save_load) {
        controlsContainer.appendChild(loadFromDiskBtn);
        controlsContainer.appendChild(fileInput);
    }

    // Add global settings/configuration button
    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = '⚙️';
    settingsBtn.type = 'button';
    settingsBtn.title = 'Open settings manager to configure script behavior';
    settingsBtn.onclick = () => {
        console.log('Settings button clicked');
        console.log('Lib object:', Lib);
        console.log('Lib.showSettings type:', typeof Lib?.showSettings);
        console.log('Lib.settingsInterface:', Lib?.settingsInterface);

        // Try method 1: Direct showSettings() call
        if (Lib && typeof Lib.showSettings === 'function') {
            console.log('Using Lib.showSettings()');
            Lib.showSettings();
            return;
        }

        // Try method 2: settingsInterface.showModal()
        if (Lib && Lib.settingsInterface && typeof Lib.settingsInterface.showModal === 'function') {
            console.log('Using Lib.settingsInterface.showModal()');
            Lib.settingsInterface.showModal();
            return;
        }

        // Try method 3: Find and click menu link (fallback)
        console.log('Trying fallback: finding menu link');
        const links = document.querySelectorAll('a[href="#"]');
        let settingsLink = null;
        for (const link of links) {
            if (link.textContent.includes('Settings Manager') || link.textContent.includes('⚙️')) {
                settingsLink = link;
                break;
            }
        }
        if (settingsLink) {
            console.log('Found menu link, clicking it');
            settingsLink.click();
        } else {
            console.error('No settings access method available');
            alert('Settings interface not available. Please use the menu: Editing → ⚙️ Settings Manager');
        }
    };

    // Add shortcuts button (always visible, left of settings button)
    if (Lib.settings.sa_enable_keyboard_shortcuts !== false) {
        const shortcutsBtn = document.createElement('button');
        shortcutsBtn.id = 'mb-shortcuts-help-btn';
        shortcutsBtn.textContent = '🎹';
        shortcutsBtn.title = 'Show keyboard shortcuts (or press ?)';
        shortcutsBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; display: inline-flex; align-items: center; justify-content: center;';
        shortcutsBtn.type = 'button';
        shortcutsBtn.onclick = showShortcutsHelp;
        // Separator between the functional buttons (Load from Disk) and the utility group (🎹 ⚙️ ❓)
        const beforeShortcutsDivider = document.createElement('span');
        beforeShortcutsDivider.textContent = ' | ';
        beforeShortcutsDivider.className = 'mb-button-divider-before-shortcuts';
        beforeShortcutsDivider.style.cssText = 'color:#999; margin:0 4px;';
        controlsContainer.appendChild(beforeShortcutsDivider);
        controlsContainer.appendChild(shortcutsBtn);
    }

    // Add settings button to controls container (always last on initial render)
    settingsBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; background-color:#607D8B; color:white; border:1px solid #546E7A; display: inline-flex; align-items: center; justify-content: center;';
    controlsContainer.appendChild(settingsBtn);

    // Add application help button (always visible, right of ⚙️ settings button)
    const appHelpBtn = document.createElement('button');
    appHelpBtn.id = 'mb-app-help-btn';
    appHelpBtn.textContent = '❓';
    appHelpBtn.title = 'Show application help and feature overview';
    appHelpBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; background-color:#78909C; color:white; border:1px solid #607D8B; display: inline-flex; align-items: center; justify-content: center;';
    appHelpBtn.type = 'button';
    appHelpBtn.onclick = showAppHelp;
    controlsContainer.appendChild(appHelpBtn);

    // --- Pre-load Filter UI elements ---
    const preFilterContainer = document.createElement('span');
    preFilterContainer.style.cssText = 'display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding-left:6px; border-left:1px solid #ccc; vertical-align:middle; height:24px;';

    const preFilterInput = document.createElement('input');
    preFilterInput.type = 'text';
    preFilterInput.placeholder = 'Filter data load...';
    preFilterInput.title = 'Filter rows while loading from disk. Remember you must have at least saved a dataset before to the filesystem (with the "Save to Disk" button)';
    preFilterInput.style.cssText = 'font-size:1.oem; padding:2px 4px; border:1px solid #ccc; border-radius:3px; width:150px; height:24px; box-sizing:border-box;';

    const preFilterCaseLabel = document.createElement('label');
    preFilterCaseLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; display: flex; align-items: center; margin: 0; user-select: none;';
    const preFilterCaseCheckbox = document.createElement('input');
    preFilterCaseCheckbox.type = 'checkbox';
    preFilterCaseCheckbox.style.marginRight = '2px';
    preFilterCaseLabel.appendChild(preFilterCaseCheckbox);
    preFilterCaseLabel.appendChild(document.createTextNode('Cc'));
    preFilterCaseLabel.title = 'Case Sensitive (Load)';

    const preFilterRxLabel = document.createElement('label');
    preFilterRxLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; display: flex; align-items: center; margin: 0; user-select: none;';
    const preFilterRxCheckbox = document.createElement('input');
    preFilterRxCheckbox.type = 'checkbox';
    preFilterRxCheckbox.style.marginRight = '2px';
    preFilterRxLabel.appendChild(preFilterRxCheckbox);
    preFilterRxLabel.appendChild(document.createTextNode('Rx'));
    preFilterRxLabel.title = 'RegExp (Load)';

    const preFilterMsg = document.createElement('span');
    preFilterMsg.id = 'mb-preload-filter-msg';
    preFilterMsg.style.cssText = 'font-size:0.8em; color:red; margin-left:4px; font-weight:bold; white-space:nowrap; display:none;';

    const stopBtn = document.createElement('button');
    stopBtn.innerHTML = 'St<u>o</u>p';
    stopBtn.type = 'button';
    stopBtn.style.cssText = 'display:none; font-size:0.8em; padding:2px 6px; cursor:pointer; background-color:#f44336; color:white; border:1px solid #d32f2f; height:24px; box-sizing:border-box; border-radius:6px; inline-flex; align-items:center; justify-content:center;';
    stopBtn.title = 'Stop the current data fetching process from the MusicBrainz backend database';

    const globalStatusDisplay = document.createElement('span');
    globalStatusDisplay.id = 'mb-global-status-display';
    globalStatusDisplay.style.cssText = 'font-size:0.95em; color:#333; font-weight:bold; vertical-align:middle;';

    const infoDisplay = document.createElement('span');
    infoDisplay.id = 'mb-info-display';
    infoDisplay.style.cssText = 'font-size:0.95em; color:#333; font-weight:bold; vertical-align:middle;';


    const progressContainer = null; // removed from controls bar; fetch progress shown in globalStatusDisplay

    const filterContainer = document.createElement('span');
    // Initially hidden; will be displayed when appended to H2
    filterContainer.style.cssText = 'display:none; align-items:center; white-space:nowrap; gap:5px;';

    const filterWrapper = document.createElement('span');
    filterWrapper.className = 'mb-filter-wrapper';
    filterWrapper.style.cssText = 'position:relative; display:inline-block;';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Global Filter...`;
    filterInput.title = 'Enter global filter string';
    filterInput.style.cssText = 'font-size:1em; padding:2px 20px 2px 6px; border:2px solid #ccc; border-radius:3px; width:500px; height:24px; box-sizing:border-box; transition:box-shadow 0.2s;';

    const filterClear = document.createElement('span');
    filterClear.textContent = '✕';
    filterClear.style.cssText = 'position:absolute; right:5px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:0.6em; color:#999; user-select:none;';
    filterClear.title = 'Clear global filter';

    filterWrapper.appendChild(filterInput);
    filterWrapper.appendChild(filterClear);

    const caseLabel = document.createElement('label');
    caseLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; font-weight: normal; display: flex; align-items: center; height: 24px; margin: 0px;';
    const caseCheckbox = document.createElement('input');
    caseCheckbox.type = 'checkbox';
    caseCheckbox.style.cssText = 'margin-right: 2px; vertical-align: middle;';
    caseLabel.appendChild(caseCheckbox);
    caseLabel.appendChild(document.createTextNode('Cc'));
    caseLabel.title = 'Case Sensitive Filtering';

    const regexpLabel = document.createElement('label');
    regexpLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; font-weight: normal; display: flex; align-items: center; height: 24px; margin: 0px;';
    const regexpCheckbox = document.createElement('input');
    regexpCheckbox.type = 'checkbox';
    regexpCheckbox.style.cssText = 'margin-right: 2px; vertical-align: middle;';
    regexpLabel.appendChild(regexpCheckbox);
    regexpLabel.appendChild(document.createTextNode('Rx'));
    regexpLabel.title = 'RegExp Filtering';

    const excludeLabel = document.createElement('label');
    excludeLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; font-weight: normal; display: flex; align-items: center; height: 24px; margin: 0px;';
    const excludeCheckbox = document.createElement('input');
    excludeCheckbox.type = 'checkbox';
    excludeCheckbox.style.cssText = 'margin-right: 2px; vertical-align: middle;';
    excludeLabel.appendChild(excludeCheckbox);
    excludeLabel.appendChild(document.createTextNode('Ex'));
    excludeLabel.title = 'Exclude matches (Global Filter)';

    filterContainer.appendChild(filterWrapper);
    filterContainer.appendChild(caseLabel);
    filterContainer.appendChild(regexpLabel);
    filterContainer.appendChild(excludeLabel);
    filterContainer.appendChild(preFilterMsg);

    // Create prefilter toggle button (only visible when data loaded from disk with prefilter)
    const prefilterToggleBtn = document.createElement('button');
    prefilterToggleBtn.id = 'mb-toggle-prefilter-btn';
    prefilterToggleBtn.textContent = 'Prefilter'; // Will be updated dynamically
    prefilterToggleBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; cursor:pointer; transition: background-color 0.3s; display:none; border-radius:4px; background:#f0f0f0; border:1px solid #ccc; vertical-align:middle;';
    prefilterToggleBtn.title = 'Toggle prefilter highlighting on/off';

    /**
     * Update the prefilter toggle button text and appearance
     * @param {number} count - Number of prefiltered rows
     * @param {string} query - The prefilter query string
     * @param {boolean} show - Whether to show the button
     */
    function updatePrefilterToggleButton(count = 0, query = '', show = false) {
        prefilterInfo = { count, query };

        if (show && count > 0 && query) {
            // Show prefilter info in button text with emoji
            prefilterToggleBtn.textContent = `🎨 ${count} row${count === 1 ? '' : 's'} prefiltered: "${query}"`;
            prefilterToggleBtn.style.display = 'inline-block';
            prefilterToggleBtn.title = 'Toggle prefilter highlighting on/off';
        } else {
            // Hide button when no prefilter
            prefilterToggleBtn.style.display = 'none';
        }

        // Update button appearance based on prefilter highlighting state
        updatePrefilterButtonAppearance();
    }

    /**
     * Update prefilter button background color based on highlighting state
     */
    function updatePrefilterButtonAppearance() {
        if (prefilterHighlightEnabled) {
            // Highlighting is ON - use default button style
            prefilterToggleBtn.style.backgroundColor = '';
            prefilterToggleBtn.style.color = '';
            prefilterToggleBtn.style.border = '';
        } else {
            // Highlighting is OFF - use highlight background color to indicate it will restore highlighting
            const highlightBg = Lib.settings.sa_pre_filter_highlight_bg || '#ffeb3b';
            prefilterToggleBtn.style.backgroundColor = highlightBg;
            prefilterToggleBtn.style.color = '#000';
            prefilterToggleBtn.style.border = '1px solid #ccc';
        }
    }

    prefilterToggleBtn.onclick = () => {
        if (prefilterHighlightEnabled) {
            // Currently highlighted - save state and remove prefilter highlights only
            savePrefilterHighlightState();
            document.querySelectorAll('.mb-pre-filter-highlight')
                .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

            prefilterHighlightEnabled = false;
            updatePrefilterButtonAppearance();
            Lib.debug('highlight', 'Prefilter highlights removed (saved state for restoration)');
        } else {
            // Currently not highlighted - restore prefilter highlights
            restorePrefilterHighlightState();
            prefilterHighlightEnabled = true;
            updatePrefilterButtonAppearance();
            Lib.debug('highlight', 'Prefilter highlights restored');
        }
    };
    filterContainer.appendChild(prefilterToggleBtn);

    // Create filter toggle button (for global and column filter highlighting)
    const unhighlightAllBtn = document.createElement('button');
    unhighlightAllBtn.id = 'mb-toggle-filter-highlight-btn';
    unhighlightAllBtn.textContent = '🎨 Toggle highlighting';
    unhighlightAllBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; cursor:pointer; transition: background-color 0.3s; display: none; border-radius:4px; background:#f0f0f0; border:1px solid #ccc; vertical-align:middle;';
    unhighlightAllBtn.title = 'Toggle filter highlighting on/off (global filter and column filters)';

    /**
     * Update filter highlight button background color based on highlighting state
     */
    function updateFilterHighlightButtonAppearance() {
        if (filterHighlightEnabled) {
            // Highlighting is ON - use default button style
            unhighlightAllBtn.style.backgroundColor = '';
            unhighlightAllBtn.style.color = '';
            unhighlightAllBtn.style.border = '';
        } else {
            // Highlighting is OFF - use highlight background color to indicate it will restore highlighting
            const highlightBg = Lib.settings.sa_global_filter_highlight_bg || Lib.settings.sa_column_filter_highlight_bg || '#90caf9';
            unhighlightAllBtn.style.backgroundColor = highlightBg;
            unhighlightAllBtn.style.color = '#000';
            unhighlightAllBtn.style.border = '1px solid #ccc';
        }
    }

    unhighlightAllBtn.onclick = () => {
        if (filterHighlightEnabled) {
            // Currently highlighted - save state and remove filter highlights only
            saveFilterHighlightState();
            document.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight')
                .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

            filterHighlightEnabled = false;
            updateFilterHighlightButtonAppearance();
            Lib.debug('highlight', 'Filter highlights removed (saved state for restoration)');
        } else {
            // Currently not highlighted - restore filter highlights
            restoreFilterHighlightState();
            filterHighlightEnabled = true;
            updateFilterHighlightButtonAppearance();
            Lib.debug('highlight', 'Filter highlights restored');
        }
    };
    filterContainer.appendChild(unhighlightAllBtn);

    const xSymbol = document.createElement('span');
    xSymbol.textContent = '✗ ';
    xSymbol.style.color = 'red';
    xSymbol.style.fontSize = '1.0em';
    xSymbol.style.fontWeight = 'bold';

    const clearColumnFiltersBtn = document.createElement('button');
    clearColumnFiltersBtn.appendChild(xSymbol);
    clearColumnFiltersBtn.appendChild(document.createTextNode('Clear all COLUMN filters'));
    clearColumnFiltersBtn.id = 'mb-clear-column-filters-btn';
    clearColumnFiltersBtn.style.cssText = 'font-size:0.9em; padding:2px 6px; cursor:pointer; display: none; border-radius:4px; background:#f0f0f0; border:1px solid #ccc; vertical-align:middle;';
    clearColumnFiltersBtn.title = 'Clear all column-specific filter inputs';
    clearColumnFiltersBtn.onclick = () => {
        // Clear all column filters only
        document.querySelectorAll('.mb-col-filter-input').forEach(input => {
            input.value = '';
        });

        // Re-run filter to update display
        if (typeof runFilter === 'function') {
            runFilter();
        }

        Lib.debug('filter', 'All column filters cleared');

        // Show feedback in filter status
        const filterStatusDisplay = document.getElementById('mb-filter-status-display');
        if (filterStatusDisplay) {
            filterStatusDisplay.textContent = '✓ All column filters cleared';
            filterStatusDisplay.style.color = 'green';
        }
    };
    filterContainer.appendChild(clearColumnFiltersBtn);

    const clearAllFiltersBtn = document.createElement('button');
    // Attach a CLONE of the symbol to the second button
    clearAllFiltersBtn.appendChild(xSymbol.cloneNode(true));
    clearAllFiltersBtn.appendChild(document.createTextNode('Clear ALL filters'));
    clearAllFiltersBtn.id = 'mb-clear-all-filters-btn';
    clearAllFiltersBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; cursor:pointer; display: none; border-radius:4px; background:#f0f0f0; border:1px solid #ccc; vertical-align:middle;';
    clearAllFiltersBtn.title = 'Clear both global filter and all column filters';
    clearAllFiltersBtn.onclick = () => {
        // Clear global filter
        filterInput.value = '';
        filterClear.click(); // This will trigger the clear handler

        // Also call the main clearAllFilters function
        clearAllFilters();
    };
    filterContainer.appendChild(clearAllFiltersBtn);

    /**
     * Update visibility of filter-related buttons based on whether filters are active
     */
    function updateFilterButtonsVisibility() {
        // Check if global filter has value
        const globalFilterActive = filterInput.value.trim() !== '';

        // Check if any column filters have values
        const columnFilters = document.querySelectorAll('.mb-col-filter-input');
        const columnFiltersActive = Array.from(columnFilters).some(input => input.value.trim() !== '');

        // Check if there are any highlights present
        const highlightsPresent = document.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight').length > 0;

        // Show/hide Toggle highlighting button
        unhighlightAllBtn.style.display = highlightsPresent ? 'inline-block' : 'none';

        // Show/hide Clear all COLUMN filters button
        clearColumnFiltersBtn.style.display = columnFiltersActive ? 'inline-block' : 'none';

        // Show/hide Clear ALL filters button
        clearAllFiltersBtn.style.display = (globalFilterActive || columnFiltersActive) ? 'inline-block' : 'none';

        // Update visibility for sub-table clear buttons
        document.querySelectorAll('.mb-subtable-clear-btn').forEach(btn => {
            // Find the associated table
            const h3 = btn.closest('.mb-subtable-controls')?.parentElement;
            if (h3) {
                const table = h3.nextElementSibling;
                if (table && table.tagName === 'TABLE') {
                    // Check if this table has any active column filters
                    const tableColFilters = table.querySelectorAll('.mb-col-filter-input');
                    const tableHasFilters = Array.from(tableColFilters).some(input => input.value.trim() !== '');
                    btn.style.display = tableHasFilters ? 'inline-block' : 'none';
                }
            }
        });
    }

    // Make this function globally accessible so runFilter can call it
    window.updateFilterButtonsVisibility = updateFilterButtonsVisibility;

    const statusDisplay = document.createElement('span');
    statusDisplay.id = 'mb-status-display';
    statusDisplay.style.cssText = 'font-size:0.9em; color:#333; display:flex; align-items:center; height:24px; font-weight:bold; gap:4px;';

    // Create separate filter and sort status displays
    const filterStatusDisplay = document.createElement('span');
    filterStatusDisplay.id = 'mb-filter-status-display';
    filterStatusDisplay.className = 'mb-filter-status';

    const sortStatusDisplay = document.createElement('span');
    sortStatusDisplay.id = 'mb-sort-status-display';
    sortStatusDisplay.className = 'mb-sort-status';

    statusDisplay.appendChild(filterStatusDisplay);
    statusDisplay.appendChild(sortStatusDisplay);

    filterContainer.appendChild(statusDisplay);

    /**
     * Clear all column filters for a specific table
     * @param {HTMLElement} table - The table element whose filters should be cleared
     * @param {string} tableName - Name of the table (for logging and status)
     */
    function clearSubTableColumnFilters(table, tableName) {
        if (!table) return;

        // Clear all column filter inputs in this specific table
        table.querySelectorAll('.mb-col-filter-input').forEach(input => {
            input.value = '';
        });

        // Re-run filter to update display
        if (typeof runFilter === 'function') {
            runFilter();
        }

        Lib.debug('filter', `Column filters cleared for table: ${tableName}`);

        // Show feedback in the sub-table specific filter status display
        const h3 = table.previousElementSibling;
        if (h3 && h3.classList.contains('mb-toggle-h3')) {
            const filterStatusDisplay = h3.querySelector('.mb-filter-status');
            if (filterStatusDisplay) {
                filterStatusDisplay.textContent = `✓ All column filters cleared`;
                filterStatusDisplay.style.color = 'green';
                // Auto-clear the message after 2 seconds
                setTimeout(() => {
                    filterStatusDisplay.textContent = '';
                }, 2000);
            }
        }
    }

    controlsContainer.insertBefore(stopBtn, initialDivider);
    // Filter container is NOT appended here anymore; moved to H2 later

    const style = document.createElement('style');
    style.textContent = `
        .mb-sorting-active, .mb-sorting-active * { cursor: wait !important; }
        .mb-show-all-btn-active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        button.mb-show-all-btn-loading:disabled {
            cursor: default !important;
            color: buttontext !important;
            opacity: 1 !important;
            border: 1px solid #767676 !important;
        }
        .sort-icon-btn { cursor: pointer; padding: 0 2px; font-weight: bold; transition: color 0.1s; color: black; border-radius: 2px; }
        .sort-icon-active { color: Green !important; background-color: #FFFF00 !important; }

        /* Multi-sort column group tinting — semi-transparent so even/odd zebra striping shows through */
        /* Each priority level gets its own hue; colours are intentionally soft/pastel */
        .mb-mscol-0 { background-color: rgba(255, 200,  80, 0.30) !important; }   /* amber   — priority 1 */
        .mb-mscol-1 { background-color: rgba( 80, 180, 255, 0.30) !important; }   /* sky     — priority 2 */
        .mb-mscol-2 { background-color: rgba(120, 230, 120, 0.30) !important; }   /* mint    — priority 3 */
        .mb-mscol-3 { background-color: rgba(230, 120, 230, 0.30) !important; }   /* mauve   — priority 4 */
        .mb-mscol-4 { background-color: rgba(255, 160, 100, 0.30) !important; }   /* peach   — priority 5 */
        .mb-mscol-5 { background-color: rgba(100, 230, 210, 0.30) !important; }   /* teal    — priority 6 */
        .mb-mscol-6 { background-color: rgba(180, 160, 255, 0.30) !important; }   /* lavender— priority 7 */
        .mb-mscol-7 { background-color: rgba(255, 220, 180, 0.30) !important; }   /* vanilla — priority 8 */

        /* Header cell highlight for sorted columns — slightly more opaque than body cells */
        .mb-mscol-hdr-0 { background-color: rgba(255, 200,  80, 0.55) !important; }
        .mb-mscol-hdr-1 { background-color: rgba( 80, 180, 255, 0.55) !important; }
        .mb-mscol-hdr-2 { background-color: rgba(120, 230, 120, 0.55) !important; }
        .mb-mscol-hdr-3 { background-color: rgba(230, 120, 230, 0.55) !important; }
        .mb-mscol-hdr-4 { background-color: rgba(255, 160, 100, 0.55) !important; }
        .mb-mscol-hdr-5 { background-color: rgba(100, 230, 210, 0.55) !important; }
        .mb-mscol-hdr-6 { background-color: rgba(180, 160, 255, 0.55) !important; }
        .mb-mscol-hdr-7 { background-color: rgba(255, 220, 180, 0.55) !important; }
        .mb-row-count-stat { color: blue; font-weight: bold; margin-left: 8px; }
        .mb-toggle-h3:hover, .mb-toggle-h2:hover {
            color: #222;
            background-color: #f9f9f9;
        }
        .mb-toggle-h3 { cursor: pointer; user-select: none; border-bottom: 1px solid #eee; padding: 4px 0; margin-left: 1.5em; }
        .mb-subtable-controls { display: inline-flex; align-items: center; gap: 8px; margin-left: 12px; }
        .mb-subtable-clear-btn { font-size: 0.8em; padding: 2px 6px; cursor: pointer; vertical-align: middle; border-radius: 4px; background: #f0f0f0; border: 1px solid #ccc; }
        .mb-subtable-clear-btn:hover { background: #e0e0e0; }
        .mb-show-all-subtable-btn { font-size: 0.8em; padding: 2px 6px; cursor: pointer; vertical-align: middle; border-radius: 4px; background: #f0f0f0; border: 1px solid #ccc; }
        .mb-show-all-subtable-btn:hover { background: #e0e0e0; }
        .mb-subtable-status-display { font-size: 0.85em; color: #333; font-weight: bold; vertical-align: middle; }
        .mb-filter-status { font-family: 'Courier New', monospace; font-size: 1.1em; margin-right: 8px; }
        .mb-sort-status { font-family: 'Arial', sans-serif; font-size: 1.0em; font-style: italic; }
        .mb-toggle-h2 { cursor: pointer; user-select: none; }
        .mb-toggle-icon { font-size: 0.8em; margin-right: 8px; color: #666; width: 12px; display: inline-block; cursor: pointer; }
        .mb-master-toggle { color: #0066cc; font-weight: bold; margin-left: 15px; font-size: 0.8em; vertical-align: middle; display: inline-block; cursor: default; }
        .mb-master-toggle span { cursor: pointer; }
        .mb-master-toggle span:hover { text-decoration: underline; }
        .mb-column-filter-highlight {
            color: ${Lib.settings.sa_column_filter_highlight_color};
            background-color: ${Lib.settings.sa_column_filter_highlight_bg};
        }
        .mb-global-filter-highlight {
            color: ${Lib.settings.sa_global_filter_highlight_color};
            background-color: ${Lib.settings.sa_global_filter_highlight_bg};
        }
        .mb-pre-filter-highlight {
            color: ${Lib.settings.sa_pre_filter_highlight_color};
            background-color: ${Lib.settings.sa_pre_filter_highlight_bg};
            font-weight: bold;
        }
        .mb-col-filter-input {
            width: 100%;
            font-size: 1em;
            padding: 1px 18px 1px 4px;
            box-sizing: border-box;
            transition: box-shadow 0.2s;
            display: block;
        }
        .mb-col-filter-wrapper {
            position: relative;
            width: 100%;
            display: block;
        }
        .mb-col-filter-clear {
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #999;
            font-size: 0.8em;
            user-select: none;
        }
        .mb-col-filter-row th {
            padding: 2px 4px !important;
        }
    `;
    document.head.appendChild(style);

    if (headerContainer.tagName === 'A') {
        headerContainer.after(controlsContainer);
    } else {
        headerContainer.appendChild(controlsContainer);
    }

    // Show deferred "Page Reloaded" dialog now that action buttons are in the DOM
    if (reloadFlag) {
        const firstActionBtn = allActionButtons.length > 0 ? allActionButtons[0] : null;
        showCustomAlert(
            'The underlying MusicBrainz page has been reloaded to ensure filter stability. Please click the desired "Show all" button again to start the process.',
            '⚠️ Page Reloaded',
            firstActionBtn
        );
    }

    // Create a separate container for status displays (globalStatusDisplay and infoDisplay).
    // display is inline-flex so it flows naturally inside a <p> or a standalone block line.
    const statusDisplaysContainer = document.createElement('div');
    statusDisplaysContainer.id = 'mb-status-displays-container';
    statusDisplaysContainer.style.cssText = 'display:inline-flex; align-items:center; gap:8px; line-height:1; vertical-align:middle;';
    statusDisplaysContainer.appendChild(globalStatusDisplay);
    statusDisplaysContainer.appendChild(infoDisplay);

    // A zero-width sentinel span is injected immediately before statusDisplaysContainer in the
    // same parent so getBoundingClientRect() on it gives us the exact pixel position where the
    // preceding text ends. This works for both the subheader and the standalone-block cases.
    const _statusSentinel = document.createElement('span');
    _statusSentinel.id = 'mb-status-sentinel';
    _statusSentinel.style.cssText = 'display:inline-block; width:0; height:0; overflow:hidden; vertical-align:middle;';

    // Minimum gap (px) between the end of existing subheader text and statusDisplaysContainer
    // when the subheader text already reaches or overshoots the button column.
    const STATUS_MIN_GAP = 10;

    const _subheader = document.querySelector('p.subheader');

    if (_subheader) {
        // Non-search pages: inject inline at the end of the existing subheader paragraph.
        // The subheader already occupies the line below h1 (e.g. "~Country"), so no extra
        // block wrapper is needed — statusDisplaysContainer simply continues that line.
        _subheader.appendChild(_statusSentinel);
        _subheader.appendChild(statusDisplaysContainer);
    } else {
        // Search pages (and any other page without a subheader): create a dedicated block
        // line directly below the h1 so statusDisplaysContainer gets its own row.
        const statusWrapper = document.createElement('div');
        statusWrapper.id = 'mb-status-displays-wrapper';
        statusWrapper.style.cssText = 'margin-top:2px;';
        statusWrapper.appendChild(_statusSentinel);
        statusWrapper.appendChild(statusDisplaysContainer);

        const _h1ForStatus = headerContainer.tagName === 'H1'
            ? headerContainer
            : headerContainer.closest('h1') || headerContainer;
        if (_h1ForStatus.nextSibling) {
            _h1ForStatus.parentNode.insertBefore(statusWrapper, _h1ForStatus.nextSibling);
        } else {
            _h1ForStatus.parentNode.appendChild(statusWrapper);
        }
    }

    /**
     * Aligns statusDisplaysContainer's left edge with the first action button by measuring
     * the sentinel's left edge (= end of existing sibling text) and the button's left edge,
     * both via getBoundingClientRect() so any entity-name or subheader-text length is handled.
     *
     * Two cases:
     *   sentinelLeft < btnLeft  →  margin-left pushes statusDisplaysContainer to align with button
     *   sentinelLeft >= btnLeft →  subheader text already reaches / passes the button column,
     *                              so only the minimum gap is applied
     *
     * Called once after initial paint and on every resize event.
     */
    function alignStatusToFirstButton() {
        if (!allActionButtons[0]) return;
        const btnLeft = allActionButtons[0].getBoundingClientRect().left;
        const sentinelLeft = _statusSentinel.getBoundingClientRect().left;
        const offset = Math.max(STATUS_MIN_GAP, btnLeft - sentinelLeft);
        statusDisplaysContainer.style.marginLeft = offset + 'px';
    }

    // Defer until after the browser has performed initial layout so rects are accurate.
    requestAnimationFrame(alignStatusToFirstButton);
    window.addEventListener('resize', alignStatusToFirstButton);

    let allRows = [];
    let originalAllRows = [];
    let groupedRows = [];
    let isLoaded = false;
    let stopRequested = false;
    let multiTableSortStates = new Map();

    // Track highlight toggle states separately
    let prefilterHighlightEnabled = true;
    let filterHighlightEnabled = true;
    let savedPrefilterHighlights = { hasContent: false };
    let savedFilterHighlights = { hasContent: false };
    let prefilterInfo = { count: 0, query: '' };

    /**
     * Shows a modernized dialog to enter pre-filter criteria before loading data from disk.
     * Includes history of previous filter expressions and triggers the file loading process.
     */
    async function showLoadFilterDialog(triggerButton = null) {
        const historyLimit = Lib.settings.sa_load_history_limit || 10;
        let history = GM_getValue('sa_load_filter_history', []);

        // Remove any existing dialog
        const existingOverlay = document.getElementById('sa-load-dialog-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.id = 'sa-load-dialog-overlay';
        dialog.style.cssText = 'position:fixed; background:#fff; padding:24px; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.3); width:380px; font-family:sans-serif; border:1px solid #ccc; z-index:20000;';

        dialog.innerHTML = `
            <div style="margin-bottom:18px; border-bottom:1px solid #eee; padding-bottom:12px;">
                <h3 style="margin:0; color:#222; font-size:1.2em;">📂 Load Table Data</h3>
                <p style="margin:5px 0 0; color:#666; font-size:0.95em;">Filter rows while loading from disk. Remember you must have at least saved a dataset before to the filesystem (with the "Save to Disk" button)</p>
            </div>

            <div style="margin-bottom:15px; position:relative;">
                <div style="display:flex; gap:4px;">
                    <input id="sa-load-filter-input" type="text" placeholder="Search expression..."
                        style="flex:1; padding:8px 12px; border:1px solid #ccc; border-radius:6px; font-size:1em; outline:none;">
                    ${history.length > 0 ? `
                    <button id="sa-load-history-toggle" title="Show history" style="padding:0 8px; background:#f0f0f0; border:1px solid #ccc; border-radius:6px; cursor:pointer;">▼</button>
                    ` : ''}
                </div>
                <div id="sa-load-history-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:20001; max-height:150px; overflow-y:auto; margin-top:4px;">
                    ${history.map(item => `<div class="sa-history-item" style="padding:8px 12px; cursor:pointer; font-size:0.9em; border-bottom:1px dotted #eee;">${item}</div>`).join('')}
                </div>
            </div>

            <div style="display:flex; gap:20px; justify-content:center; margin-bottom:20px; background:#f9f9f9; padding:10px; border-radius:8px;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9em; font-weight:600;">
                    <input type="checkbox" id="sa-load-case"> Case Sensitive
                </label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9em; font-weight:600;">
                    <input type="checkbox" id="sa-load-regex"> Regular Expression
                </label>
            </div>

            <div style="display:flex; gap:12px;">
                <button id="sa-load-confirm" style="flex:2; padding:10px; background:#4CAF50; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;"><u>L</u>oad Data</button>
                <button id="sa-load-cancel" style="flex:1; padding:10px; background:#f0f0f0; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer;">Cancel</button>
            </div>
        `;

        document.body.appendChild(dialog);

        // Position below trigger button or center screen
        setTimeout(() => {
            if (triggerButton) {
                const btnRect = triggerButton.getBoundingClientRect();
                const dlgRect = dialog.getBoundingClientRect();
                let top = btnRect.bottom + 10;
                let left = btnRect.left;

                if (top + dlgRect.height > window.innerHeight) {
                    top = btnRect.top - dlgRect.height - 10;
                }
                if (left + dlgRect.width > window.innerWidth) {
                    left = window.innerWidth - dlgRect.width - 10;
                }
                if (left < 0) left = 10;

                dialog.style.left = left + 'px';
                dialog.style.top = top + 'px';
            } else {
                dialog.style.left = '50%';
                dialog.style.top = '50%';
                dialog.style.transform = 'translate(-50%, -50%)';
            }
        }, 0);

        const input = dialog.querySelector('#sa-load-filter-input');
        if (input) {
            const MIN_DIALOG_WIDTH = 380;
            const MAX_DIALOG_MARGIN = 40;

            const measureTextWidth = (text) => {
                const span = document.createElement('span');
                span.style.cssText = `
                    visibility:hidden;
                    position:absolute;
                    white-space:pre;
                    font-size:${getComputedStyle(input).fontSize};
                    font-family:${getComputedStyle(input).fontFamily};
                    font-weight:${getComputedStyle(input).fontWeight};
                `;
                span.textContent = text;
                document.body.appendChild(span);
                const width = span.offsetWidth + 40;
                document.body.removeChild(span);
                return width;
            };

            const resizeDialog = () => {
                const requiredWidth = measureTextWidth(input.value || input.placeholder);
                const maxWidth = window.innerWidth - MAX_DIALOG_MARGIN;
                dialog.style.width = `${Math.min(Math.max(MIN_DIALOG_WIDTH, requiredWidth), maxWidth)}px`;
            };

            resizeDialog();
            input.addEventListener('input', resizeDialog);
            window.addEventListener('resize', resizeDialog);
        }

        const historyToggle = dialog.querySelector('#sa-load-history-toggle');
        const historyDropdown = dialog.querySelector('#sa-load-history-dropdown');

        input.focus();

        // Inject hover styles
        const styleId = 'sa-load-popup-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .sa-history-item:hover { background: #f0f0f0 !important; }
                #sa-load-confirm:hover { background: #45a049 !important; }
                #sa-load-cancel:hover { background: #e0e0e0 !important; }
            `;
            document.head.appendChild(style);
        }

        const closeDialog = () => {
            dialog.remove();
            document.removeEventListener('keydown', handleKey);
        };

        const confirmLoad = () => {
            const query = input.value.trim();
            const useCase = dialog.querySelector('#sa-load-case').checked;
            const useRegex = dialog.querySelector('#sa-load-regex').checked;

            if (query && historyLimit > 0) {
                let updatedHistory = [query, ...history.filter(h => h !== query)].slice(0, historyLimit);
                GM_setValue('sa_load_filter_history', updatedHistory);
                Lib.debug('cache', `Updated load filter history. Current count: ${updatedHistory.length}`);
            }

            if (typeof preFilterInput !== 'undefined') {
                preFilterInput.value = query;
                if (typeof preFilterCaseLabel !== 'undefined') {
                    preFilterCaseLabel.querySelector('input').checked = useCase;
                }
                if (typeof preFilterRegexLabel !== 'undefined') {
                    preFilterRegexLabel.querySelector('input').checked = useRegex;
                }
            }

            closeDialog();
            Lib.debug('cache', 'Load confirmed. Triggering file selector...');
            fileInput.click();
        };

        const handleKey = (e) => {
            if (e.key === 'Escape') {
                Lib.debug('ui', 'Load dialog closed via Escape key');
                closeDialog();
            } else if (e.altKey && e.key === 'l') {
                // Alt-L: confirm load (mirrors the underlined L in "Load Data" button)
                e.preventDefault();
                confirmLoad();
            } else if (e.key === 'Tab') {
                // Tab cycles between the two action buttons when they have focus
                const confirmBtn = dialog.querySelector('#sa-load-confirm');
                const cancelBtn = dialog.querySelector('#sa-load-cancel');
                if (document.activeElement === confirmBtn) {
                    e.preventDefault();
                    cancelBtn.focus();
                } else if (document.activeElement === cancelBtn) {
                    e.preventDefault();
                    confirmBtn.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKey);

        // History Logic
        if (historyToggle) {
            historyToggle.onclick = (e) => {
                e.stopPropagation();
                historyDropdown.style.display = historyDropdown.style.display === 'none' ? 'block' : 'none';
            };
            dialog.querySelectorAll('.sa-history-item').forEach(el => {
                el.onclick = () => {
                    input.value = el.textContent;
                    historyDropdown.style.display = 'none';
                };
            });
        }

        // Close dropdown when clicking elsewhere
        window.onclick = (e) => {
            if (historyDropdown && !historyDropdown.contains(e.target) && e.target !== historyToggle) {
                historyDropdown.style.display = 'none';
            }
        };

        // Close dialog when clicking outside it
        document.addEventListener('mousedown', (e) => {
            if (!dialog.contains(e.target)) {
                closeDialog();
            }
        }, { once: true });

        dialog.querySelector('#sa-load-confirm').onclick = confirmLoad;
        dialog.querySelector('#sa-load-cancel').onclick = closeDialog;
    }

    /**
     * Normalizes alias table structure by removing invisible action columns and ensuring proper formatting
     * @param {HTMLTableElement} table - The alias table element to normalize
     */
    function normalizeAliasTable(table) {
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(tr => {
            // Remove invisible actions column (body only)
            const actionsTd = tr.querySelector('td.actions');
            if (actionsTd) {
                actionsTd.remove();
            }

            // Expand first cell if it spans Alias + Sort name
            const firstTd = tr.querySelector('td[colspan="2"]');
            if (firstTd) {
                firstTd.removeAttribute('colspan');

                const sortNameTd = document.createElement('td');
                sortNameTd.textContent = ''; // MB leaves this empty on alias pages

                firstTd.after(sortNameTd);
            }
        });

        Lib.debug('cleanup', 'Normalized alias table structure (actions removed, colspan expanded).');
    }

    /**
     * Filters tables from a document/container based on a preceding header text
     * @param {Document|HTMLElement} doc - The document or container element to search in
     * @param {string} targetHeader - The header text to look for (case-insensitive partial match)
     * @returns {Array<HTMLTableElement>} Array of table elements found after the target header
     */
    function parseDocumentForTables(doc, targetHeader) {
        let tablesToProcess = [];

        if (targetHeader) {
            const headers = Array.from(doc.querySelectorAll('h2'));
            const foundH2 = headers.find(h => h.textContent.trim().toLowerCase().includes(targetHeader.toLowerCase()));

            if (foundH2) {
                Lib.debug('parse', `Found header ${foundH2}`);
                let next = foundH2.nextElementSibling;
                while (next && next.nodeName !== 'H2') {
                    if (next.classList.contains('tbl')) {
                        Lib.debug('parse', `Found table...`);
                        tablesToProcess.push(next);
                    } else {
                        const innerTables = next.querySelectorAll('table.tbl');
                        if (innerTables.length > 0) tablesToProcess.push(...Array.from(innerTables));
                    }
                    next = next.nextElementSibling;
                }
            }
        } else {
            Lib.debug('parse', 'No targetHeader provided; returning all tables found in container.');
            tablesToProcess = Array.from(doc.querySelectorAll('table.tbl'));
        }

        Lib.debug('parse', `parseDocumentForTables: Found ${tablesToProcess.length} total tables. Target header filter: "${targetHeader || 'none'}"`);
        return tablesToProcess;
    }

    /**
     * Removes various clutter elements from the MusicBrainz page to prepare for consolidated view.
     */
    function performClutterCleanup() {
        Lib.debug('cleanup', 'Starting clutter element removal.');

        // Remove Jesus2099 bigbox elements
        const bigBoxCount = document.querySelectorAll('div.jesus2099userjs154481bigbox').length;
        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => div.remove());
        if (bigBoxCount > 0) Lib.debug('cleanup', `Removed ${bigBoxCount} jesus2099 bigbox elements.`);

        // Remove relationship helper tables
        let relationTablesCount = 0;
        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) {
                table.remove();
                relationTablesCount++;
            }
        });
        if (relationTablesCount > 0) Lib.debug('cleanup', `Removed ${relationTablesCount} relation helper tables.`);

        // Remove the release group filter paragraph
        let filterParaRemoved = false;
        document.querySelectorAll('p').forEach(p => {
            if (p.textContent.includes('Showing official release groups by this artist') || p.textContent.includes('Showing all release groups by this artist')) {
                p.remove();
                filterParaRemoved = true;
            }
        });
        if (filterParaRemoved) Lib.debug('cleanup', 'Removed artist release group filter description paragraph.');

        // Remove Slick slider containers
        const sliderCount = document.querySelectorAll('div[style*="width: 700px"] > div.slider.multiple-items').length;
        document.querySelectorAll('div[style*="width: 700px"] > div.slider.multiple-items').forEach(div => {
            const parent = div.parentElement;
            if (parent && parent.style.width === '700px') parent.remove();
        });
        if (sliderCount > 0) Lib.debug('cleanup', `Removed ${sliderCount} Slick slider containers.`);

        // Target details blocks containing many images (likely the cover art gallery)
        let removedDetailsCount = 0;
        document.querySelectorAll('details').forEach(det => {
            const imgCount = det.querySelectorAll('img').length;
            if (imgCount > 5) {
                det.remove();
                removedDetailsCount++;
                Lib.debug('cleanup', `Removed <details> block containing ${imgCount} images.`);
            }
        });
        if (removedDetailsCount > 0) Lib.debug('cleanup', `Removed ${removedDetailsCount} gallery/details blocks.`);

        if (pageType === 'events' || pageType === 'artist-releasegroups') {
            removeSanojjonasContainers();
        }
    }

    /**
     * Fetches the maximum page number by making a request to a URL and parsing its pagination
     * @param {string} targetPath - The path to fetch (relative to site origin)
     * @param {Object} queryParams - Query parameters to include in the URL
     * @returns {Promise<number>} The maximum page number found, defaults to 1 on error
     */
    async function fetchMaxPageGeneric(targetPath, queryParams = {}) {
        const url = new URL(window.location.origin + targetPath);
        Object.keys(queryParams).forEach(k => url.searchParams.set(k, queryParams[k]));
        url.searchParams.set('page', '1');
        Lib.debug('fetch', `Fetching maxPage from: ${url.toString()}`);
        try {
            const html = await fetchHtml(url.toString());
            const doc = new DOMParser().parseFromString(html, 'text/html');
            let maxPage = 1;
            const pagination = doc.querySelector('ul.pagination');
            if (pagination) {
                const links = Array.from(pagination.querySelectorAll('li a'));
                const nextIdx = links.findIndex(a => a.textContent.trim() === 'Next');
                if (nextIdx > 0) {
                    const urlObj = new URL(links[nextIdx - 1].href, window.location.origin);
                    const p = urlObj.searchParams.get('page');
                    if (p) maxPage = parseInt(p, 10);
                } else if (links.length > 0) {
                    const pageNumbers = links
                        .map(a => {
                            const p = new URL(a.href, window.location.origin).searchParams.get('page');
                            return p ? parseInt(p, 10) : 1;
                        })
                        .filter(num => !isNaN(num));
                    if (pageNumbers.length > 0) maxPage = Math.max(...pageNumbers);
                }
            }
            Lib.debug('success', `Determined maxPage: ${maxPage}`);
            return maxPage;
        } catch (err) {
            Lib.error('fetch', 'Error fetching maxPage:', err);
            return 1;
        }
    }

    /**
     * Removes specific DOM elements created by other MusicBrainz userscripts (Sanojjonas containers)
     * to prevent conflicts and clean up the page
     */
    function removeSanojjonasContainers() {
        Lib.debug('cleanup', 'Removing Sanojjonas containers...');
        const idsToRemove = ['load', 'load2', 'load3', 'load4', 'bottom1', 'bottom2', 'bottom3', 'bottom4', 'bottom5', 'bottom6'];
        idsToRemove.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }

    /**
     * Signals other scripts (like FUNKEY ILLUSTRATED RECORDS) to stop their loops.
     */
    function stopOtherScripts() {
        Lib.debug('cleanup', 'Signalling other scripts to stop...');
        window.stopAllUserScripts = true;
        // Dispatch custom event for scripts listening for inter-script signals
        window.dispatchEvent(new CustomEvent('mb-stop-all-scripts'));
    }

    /**
     * Updates the H2 header row count display to show filtered vs total rows
     * @param {number} filteredCount - Number of rows currently visible after filtering
     * @param {number} totalCount - Total number of rows in the table
     */
    function updateH2Count(filteredCount, totalCount) {
        Lib.debug('render', `Starting updateH2Count: filtered=${filteredCount}, total=${totalCount}`);

        const table = document.querySelector('table.tbl');
        if (!table) {
            Lib.debug('render', 'Aborting updateH2Count: No table.tbl found on page.');
            return;
        }

        let allH2s = Array.from(document.querySelectorAll('h2'));
        let targetH2 = null;

        Lib.debug('render', `Searching for target H2. Current pageType: ${pageType}`);

        // Prioritize explicit selector from definition (e.g., for Search pages which have no h2)
        if (activeDefinition && activeDefinition.rowTargetSelector) {
            targetH2 = document.querySelector(activeDefinition.rowTargetSelector);
            if (targetH2) {
                Lib.debug('render', `Target found using rowTargetSelector: ${activeDefinition.rowTargetSelector}`);
            }
        }

        if (!targetH2) {
            Lib.debug('render', 'Target H2 not found by specific type, falling back to document position logic.');
            for (let i = 0; i < allH2s.length; i++) {
                if (allH2s[i].compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    targetH2 = allH2s[i];
                } else {
                    Lib.debug('render', `Stopping H2 search at index ${i}: table no longer follows this header.`);
                    break;
                }
            }
        }

        if (targetH2) {
            // Transformation logic for non-H2 targets (e.g. search results paragraph)
            if (activeDefinition.features?.transformToH2 && targetH2.tagName !== 'H2') {

                // Get the method value from the URL
                const urlParams = new URLSearchParams(window.location.search);
                const methodValue = urlParams.get('method'); // e.g., "direct"

                let prefix = ""; // Initialize prefix as empty string
                if (pageType === 'search' && methodValue) {
                    // Format the string (Capitalize first letter + " search: ")
                    prefix = methodValue.charAt(0).toUpperCase() + methodValue.slice(1) + " search: ";
                    Lib.debug('render', `Search method identified: "${prefix}..."`);
                }

                Lib.debug('render', `Transforming ${targetH2.tagName} to H2 per configuration.`);
                const newH2 = document.createElement('h2');

                // Prepend the prefix to the original content
                newH2.innerHTML = prefix + targetH2.innerHTML;

                targetH2.replaceWith(newH2);
                targetH2 = newH2; // Update reference for subsequent operations
            }

            // Safe access to textContent
            let targetH2Name = targetH2.textContent ? targetH2.textContent.trim().substring(0, 30) : 'Unknown Header';
            Lib.debug('render', `Target element identified: "${targetH2Name}..."`);

            const existing = targetH2.querySelector('.mb-row-count-stat');
            if (existing) {
                Lib.debug('render', 'Removing existing row count stat span.');
                existing.remove();
            }

            const span = document.createElement('span');
            span.className = 'mb-row-count-stat';
            const countText = (filteredCount === totalCount) ? `(${totalCount})` : `(${filteredCount} of ${totalCount})`;
            span.textContent = countText;

            // Positioning Logic: Ensure the row count stays immediately after header text, before Master Toggle or Global Filter
            const referenceNode = targetH2.querySelector('.mb-master-toggle') || filterContainer;
            if (referenceNode && referenceNode.parentNode === targetH2) {
                Lib.debug('render', `Inserting count span before referenceNode: ${referenceNode.className || referenceNode.tagName}`);
                targetH2.insertBefore(span, referenceNode);
            } else {
                Lib.debug('render', 'No valid referenceNode found inside targetH2; appending count span to end.');
                targetH2.appendChild(span);
            }

            if (activeDefinition.tableMode !== 'multi') {

                if (filterContainer.parentNode !== targetH2) {
                    Lib.debug('render', 'Appending filterContainer to targetH2.');
                    targetH2.appendChild(filterContainer);
                    filterContainer.style.display = 'inline-flex';
                    filterContainer.style.marginLeft = '15px';
                    filterContainer.style.verticalAlign = 'middle';
                } else {
                    Lib.debug('render', 'filterContainer is already attached to targetH2.');
                }
            }

            Lib.debug('render', `Updated header/target ${targetH2Name} count: ${countText}`);
        } else {
            Lib.debug('render', 'Failed to identify a target H2 header for count update.');
        }
    }

    /**
     * Helper to get visible text only, explicitly ignoring script/style tags
     * @param {HTMLElement} element - The element to extract text from
     * @returns {string} The visible text content with whitespace joined
     */
    function getCleanVisibleText(element) {
        let textParts = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName.toLowerCase();
                    if (tag === 'script' || tag === 'style' || tag === 'head') return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE) textParts.push(node.nodeValue);
        }
        return textParts.join(' ');
    }

    /**
     * Get clean visible text for column filtering, skipping decorative elements
     * This function filters out common decorative content like:
     * - Expand/collapse icons (▶, ▼, ►, etc.)
     * - Image placeholder elements (empty spans with background-images)
     * - Pure whitespace text nodes
     */
    function getCleanColumnText(element) {
        let textParts = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName.toLowerCase();
                    // Skip script, style, head
                    if (tag === 'script' || tag === 'style' || tag === 'head') return NodeFilter.FILTER_REJECT;

                    // Skip elements that are purely decorative (image placeholders)
                    if (node.classList && (
                        node.classList.contains('artwork-icon') ||
                        node.classList.contains('caa-icon') ||
                        node.classList.contains('icon')
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                // Skip text nodes that are just decorative icons or pure whitespace
                const trimmed = text.trim();
                if (trimmed && !isDecorativeIcon(trimmed)) {
                    textParts.push(text);
                }
            }
        }
        return textParts.join(' ');
    }

    /**
     * Check if a string is just a decorative icon character
     */
    function isDecorativeIcon(text) {
        // Common decorative characters used in the UI
        const decorativeChars = ['▶', '▼', '►', '◄', '▲', '▾', '⏵', '⏷', '⏴', '⏶', '●', '○', '■', '□'];
        return decorativeChars.includes(text);
    }

    /**
     * Save the current prefilter highlight state before removing highlights
     * Captures prefilter highlighting parameters to enable accurate restoration
     */
    function savePrefilterHighlightState() {
        // Save prefilter highlighting parameters
        savedPrefilterHighlights = {
            prefilter: prefilterInfo.query ? {
                query: prefilterInfo.query,
                count: prefilterInfo.count,
                caseSensitive: preFilterCaseCheckbox.checked,
                isRegex: preFilterRxCheckbox.checked
            } : null,
            hasContent: !!prefilterInfo.query
        };

        Lib.debug('highlight', `Saved prefilter highlight state: ${savedPrefilterHighlights.hasContent ? 'has prefilter' : 'no prefilter'}`);
    }

    /**
     * Restore previously saved prefilter highlights by re-applying highlighting
     */
    function restorePrefilterHighlightState() {
        if (!savedPrefilterHighlights.hasContent) {
            Lib.debug('highlight', 'No saved prefilter highlight state to restore');
            return;
        }

        // Restore prefilter highlighting
        if (savedPrefilterHighlights.prefilter) {
            const { query, caseSensitive, isRegex } = savedPrefilterHighlights.prefilter;
            Lib.debug('highlight', `Restoring prefilter highlight for: "${query}"`);

            const tables = document.querySelectorAll('table.tbl');
            tables.forEach(table => {
                table.querySelectorAll('tbody tr').forEach(row => {
                    highlightText(row, query, caseSensitive, -1, isRegex, 'prefilter');
                });
            });
        }

        Lib.debug('highlight', 'Prefilter highlights restored');
    }

    /**
     * Save the current filter highlight state before removing highlights
     * Captures global and column filter highlighting parameters
     */
    function saveFilterHighlightState() {
        // Save global filter parameters
        const globalFilterInput = document.querySelector('input[placeholder*="Global Filter"]');
        const globalQuery = globalFilterInput ? globalFilterInput.value.trim() : '';

        // Save column filter parameters
        const columnFilters = [];
        document.querySelectorAll('.mb-col-filter-input').forEach((input, index) => {
            if (input.value.trim()) {
                columnFilters.push({
                    index: index,
                    query: input.value.trim(),
                    caseSensitive: false, // Column filters don't have case sensitivity toggle
                    isRegex: false
                });
            }
        });

        savedFilterHighlights = {
            globalFilter: globalQuery ? { query: globalQuery } : null,
            columnFilters: columnFilters,
            hasContent: !!(globalQuery || columnFilters.length > 0)
        };

        Lib.debug('highlight', `Saved filter highlight state: global=${!!globalQuery}, columns=${columnFilters.length}`);
    }

    /**
     * Restore previously saved filter highlights by re-applying highlighting
     */
    /**
     * Restore previously saved filter highlights by re-running the current filters
     * This automatically re-applies both filtering and highlighting
     */
    function restoreFilterHighlightState() {
        if (!savedFilterHighlights.hasContent) {
            Lib.debug('highlight', 'No saved filter highlight state to restore');
            return;
        }

        // Simply re-run the filter which will automatically re-apply highlighting
        // The filter inputs still have their values, so this will restore everything
        Lib.debug('highlight', 'Restoring filter highlights by re-running filters');

        if (typeof runFilter === 'function') {
            runFilter();
            Lib.debug('highlight', 'Filter highlights restored via runFilter()');
        } else {
            Lib.warn('highlight', 'runFilter function not available');
        }
    }

    /**
     * Highlights matching text in table rows based on filter query
     * @param {HTMLTableRowElement} row - The table row to highlight text in
     * @param {string} query - The search query to highlight
     * @param {boolean} isCaseSensitive - Whether the search should be case-sensitive
     * @param {number} targetColIndex - Specific column index to highlight (-1 for all columns)
     * @param {boolean} isRegExp - Whether to treat the query as a regular expression
     * @param {string} highlightType - Type of highlight: 'auto', 'prefilter', 'global', or 'column'
     */
    function highlightText(row, query, isCaseSensitive, targetColIndex = -1, isRegExp = false, highlightType = 'auto') {
        if (!query) return;
        let regex;
        const flags = isCaseSensitive ? 'g' : 'gi';

        if (isRegExp) {
            try {
                regex = new RegExp(`(${query})`, flags);
            } catch (e) {
                // Fallback to literal if regexp is invalid
                regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
            }
        } else {
            regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
        }

        let className;

        if (highlightType === 'prefilter') {
            className = 'mb-pre-filter-highlight';
        } else if (highlightType === 'global') {
            className = 'mb-global-filter-highlight';
        } else if (highlightType === 'column') {
            className = 'mb-column-filter-highlight';
        } else {
            // default automatic behaviour (existing logic)
            className = targetColIndex === -1
                ? 'mb-global-filter-highlight'
                : 'mb-column-filter-highlight';
        }

        row.querySelectorAll('td').forEach((td, idx) => {
            if (targetColIndex !== -1 && idx !== targetColIndex) return;

            const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    const parentTag = node.parentNode?.tagName?.toLowerCase();
                    if (parentTag === 'script' || parentTag === 'style') return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }, false);

            let node;
            const nodesToReplace = [];
            while (node = walker.nextNode()) {
                const val = node.nodeValue;
                let match = false;
                if (isRegExp) {
                    try {
                        match = new RegExp(query, isCaseSensitive ? '' : 'i').test(val);
                    } catch (e) {
                        match = isCaseSensitive ? val.includes(query) : val.toLowerCase().includes(query.toLowerCase());
                    }
                } else {
                    match = isCaseSensitive ? val.includes(query) : val.toLowerCase().includes(query.toLowerCase());
                }
                if (match) nodesToReplace.push(node);
            }
            nodesToReplace.forEach(textNode => {
                const span = document.createElement('span');
                span.innerHTML = textNode.nodeValue.replace(regex, `<span class="${className}">$1</span>`);
                textNode.parentNode.replaceChild(span, textNode);
            });
        });
    }

    /**
     * Adds a filter row beneath the table header with input fields for per-column filtering
     * @param {HTMLTableElement} table - The table to add column filters to
     */
    function addColumnFilterRow(table) {
        const thead = table.tHead;
        if (!thead || thead.querySelector('.mb-col-filter-row')) return;

        const originalHeader = thead.querySelector('tr');
        const filterRow = document.createElement('tr');
        filterRow.className = 'mb-col-filter-row';

        Array.from(originalHeader.cells).forEach((cell, idx) => {
            const th = document.createElement('th');
            // Ensure the filter cell starts with the same visibility as the header cell
            th.style.display = cell.style.display;
            // Maintain alignment by matching the display logic of header
            th.style.width = cell.style.width;

            if (cell.querySelector('input[type="checkbox"]')) {
                filterRow.appendChild(th);
                return;
            }

            const wrapper = document.createElement('span');
            wrapper.className = 'mb-col-filter-wrapper';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '...';
            input.title = 'Enter column filter string';
            input.className = 'mb-col-filter-input';
            input.dataset.colIdx = idx;

            const clear = document.createElement('span');
            clear.className = 'mb-col-filter-clear';
            clear.textContent = '✕';
            clear.title = 'Clear column filter';
            clear.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.value = '';
                runFilter(); // Immediate for explicit clear action
            };

            // Use debounced version for typing in column filters
            const debouncedColumnFilter = debounce(() => {
                Lib.debug('filter', `Column filter updated on column ${idx}: "${input.value}"`);
                runFilter();
            }, Lib.settings.sa_filter_debounce_delay || 300);

            input.addEventListener('input', (e) => {
                e.stopPropagation();
                debouncedColumnFilter();
            });

            wrapper.appendChild(input);
            wrapper.appendChild(clear);
            th.appendChild(wrapper);
            filterRow.appendChild(th);
        });
        thead.appendChild(filterRow);
    }

    /**
     * Reads column filter inputs from a table, applies the active boxShadow indicator,
     * and returns a ready-to-use colFilters array (empty array when table is null).
     *
     * @param {HTMLElement|null} table         - The <table> element containing .mb-col-filter-input elements.
     * @param {boolean}          isCaseSensitive
     * @param {boolean}          isRegExp
     * @returns {{ val: string, idx: number }[]}
     */
    function getColFilters(table, isCaseSensitive, isRegExp) {
        if (!table) return [];
        return Array.from(table.querySelectorAll('.mb-col-filter-input'))
            .map(inp => {
                inp.style.boxShadow = inp.value ? '0 0 2px 2px green' : '';
                return { raw: inp.value, idx: parseInt(inp.dataset.colIdx, 10) };
            })
            .map(f => ({ val: (isCaseSensitive || isRegExp) ? f.raw : f.raw.toLowerCase(), idx: f.idx }))
            .filter(f => f.val);
    }

    /**
     * Tests whether a single (already-cloned) row passes the current global + column filters.
     * Resets previous highlight markup, applies fresh highlights on a hit, and returns the result.
     *
     * @param {HTMLTableRowElement} row
     * @param {{
     *   globalQuery:    string,
     *   globalQueryRaw: string,
     *   globalRegex:    RegExp|null,
     *   isCaseSensitive: boolean,
     *   isRegExp:       boolean,
     *   isExclude:      boolean,
     *   colFilters:     { val: string, idx: number }[]
     * }} ctx
     * @returns {boolean}
     */
    function testRowMatch(row, ctx) {
        const { globalQuery, globalQueryRaw, globalRegex,
                isCaseSensitive, isRegExp, isExclude, colFilters } = ctx;

        // Reset previous highlights (critical for correct re-filtering)
        row.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight')
            .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

        // --- Global filter ---
        let globalHit = !globalQuery;
        if (!globalHit) {
            let matchFound = false;
            if (isRegExp && globalRegex) {
                // Test each cell individually so anchored patterns like ^Thunder Road work correctly
                matchFound = Array.from(row.cells).some(cell =>
                    globalRegex.test(getCleanColumnText(cell))
                );
            } else {
                const text = getCleanVisibleText(row);
                matchFound = isCaseSensitive
                    ? text.includes(globalQuery)
                    : text.toLowerCase().includes(globalQuery);
            }
            globalHit = isExclude ? !matchFound : matchFound;
        }

        // --- Column filters ---
        let colHit = true;
        for (const f of colFilters) {
            const cellText = getCleanColumnText(row.cells[f.idx]);
            let match = false;
            if (isRegExp) {
                try {
                    match = new RegExp(f.val, isCaseSensitive ? '' : 'i').test(cellText);
                } catch (e) {
                    match = isCaseSensitive
                        ? cellText.includes(f.val)
                        : cellText.toLowerCase().includes(f.val);
                }
            } else {
                match = isCaseSensitive
                    ? cellText.includes(f.val)
                    : cellText.toLowerCase().includes(f.val);
            }
            if (!match) { colHit = false; break; }
        }

        const finalHit = globalHit && colHit;
        if (finalHit) {
            // Highlighting on excluded matches would be misleading, so skip it
            if (globalQuery && !isExclude) highlightText(row, globalQueryRaw, isCaseSensitive, -1, isRegExp);
            colFilters.forEach(f => highlightText(row, f.val, isCaseSensitive, f.idx, isRegExp));
        }
        return finalHit;
    }

    /**
     * Executes the filtering logic across all table rows based on global and column-specific filters
     * Handles both single-table and multi-table page modes, applies highlighting, and updates row visibility
     */
    function runFilter() {
        const filterStartTime = performance.now();

        // Show filtering indicator in filter status display
        const filterStatusDisplay = document.getElementById('mb-filter-status-display');
        if (filterStatusDisplay) {
            filterStatusDisplay.textContent = '⏳ Filtering...';
            filterStatusDisplay.style.color = 'orange';
        }

        const isCaseSensitive = caseCheckbox.checked;
        const isRegExp = regexpCheckbox.checked;
        const isExclude = excludeCheckbox.checked;
        const globalQueryRaw = filterInput.value;
        const globalQuery = (isCaseSensitive || isRegExp) ? globalQueryRaw : globalQueryRaw.toLowerCase();

        let globalRegex = null;
        if (globalQueryRaw && isRegExp) {
            try {
                globalRegex = new RegExp(globalQueryRaw, isCaseSensitive ? '' : 'i');
                filterInput.style.border = '2px solid #ccc'; // Reset to standard if valid
            } catch (e) {
                filterInput.style.border = '2px solid red'; // Visual cue for invalid Regex
            }
        } else {
            filterInput.style.border = '2px solid #ccc';
        }

        // Apply colored box to global filter if active
        filterInput.style.boxShadow = globalQueryRaw ? '0 0 2px 2px red' : '';

        const __activeEl = document.activeElement;
        const __scrollY = window.scrollY;

        Lib.debug('filter', 'runFilter(): active element =', __activeEl?.className || '(none)');

        // Shared context object passed to testRowMatch()
        const matchCtx = { globalQuery, globalQueryRaw, globalRegex,
                           isCaseSensitive, isRegExp, isExclude, colFilters: [] };

        let filteredArray = []; // Declare outside to be accessible in status display
        let singleTableFilteredCount = 0; // Tracks filtered row count for single-table mode
        if (activeDefinition.tableMode === 'multi') {
            let totalFiltered = 0;
            let totalAbsolute = 0;

            // Only pick tables that belong to the script to avoid MusicBrainz Info tables
            const tables = Array.from(document.querySelectorAll('table.tbl'))
                .filter(t => t.querySelector('.mb-col-filter-row'));

            groupedRows.forEach((group, groupIdx) => {
                totalAbsolute += group.rows.length;
                matchCtx.colFilters = getColFilters(tables[groupIdx], isCaseSensitive, isRegExp);
                const matches = group.rows.map(r => r.cloneNode(true)).filter(r => testRowMatch(r, matchCtx));

                // Always push to filteredArray, even if matches.length is 0, to maintain the table count and restoration capability
                filteredArray.push({ category: group.category || group.key || 'Unknown', rows: matches });
                totalFiltered += matches.length;
            });

            renderGroupedTable(filteredArray, pageType === 'artist-releasegroups', globalQuery || 're-run');

            /* Restore focus & scroll for column filters */
            if (__activeEl && __activeEl.classList.contains('mb-col-filter-input')) {
                const colIdx = __activeEl.dataset.colIdx;
                const allTables = Array.from(document.querySelectorAll('table.tbl'))
                    .filter(t => t.querySelector('.mb-col-filter-row'));
                const tableIdx = allTables.findIndex(t => t.contains(__activeEl));
                Lib.debug('filter', `Attempting focus restore: tableIdx=${tableIdx}, colIdx=${colIdx}`);
                if (allTables[tableIdx]) {
                    const newInput = allTables[tableIdx]
                        .querySelector(`.mb-col-filter-input[data-col-idx="${colIdx}"]`);
                    if (newInput) {
                        newInput.focus();
                        newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
                        Lib.debug('filter', 'Restored focus to column filter input');
                    } else {
                        Lib.debug('filter', 'Could not find replacement column filter input');
                    }
                }
            }
            updateH2Count(totalFiltered, totalAbsolute);
        } else {
            const totalAbsolute = allRows.length;
            matchCtx.colFilters = getColFilters(document.querySelector('table.tbl'), isCaseSensitive, isRegExp);
            const filteredRows = allRows.map(row => row.cloneNode(true)).filter(row => testRowMatch(row, matchCtx));
            singleTableFilteredCount = filteredRows.length; // capture before async render
            renderFinalTable(filteredRows);
            updateH2Count(filteredRows.length, totalAbsolute);
        }
        // Maintain scroll position after filtering or sorting
        window.scrollTo(0, __scrollY);

        // Calculate and display filter timing
        const filterEndTime = performance.now();
        const filterDuration = (filterEndTime - filterStartTime).toFixed(0);

        if (filterStatusDisplay) {
            const rowCount = activeDefinition.tableMode === 'multi'
                ? filteredArray.reduce((sum, g) => sum + g.rows.length, 0)
                : singleTableFilteredCount; // use in-memory count; DOM may still be rendering chunks

            // Build filter info string
            const filterParts = [];
            if (globalQuery) {
                filterParts.push(`global:"${globalQuery}"`);
            }

            // Count active column filters
            const activeColFilters = document.querySelectorAll('.mb-col-filter-input');
            const activeColCount = Array.from(activeColFilters).filter(inp => inp.value).length;
            if (activeColCount > 0) {
                filterParts.push(`${activeColCount} column filter${activeColCount > 1 ? 's' : ''}`);
            }

            const filterInfo = filterParts.length > 0 ? ` [${filterParts.join(', ')}]` : '';

            // On multi-table pages: show only global filter info in main status
            // On single-table pages: show all filter info
            if (activeDefinition.tableMode === 'multi') {
                const globalFilterInfo = globalQuery ? ` [global:"${globalQuery}"]` : '';
                filterStatusDisplay.textContent = `✓ Global filter${globalFilterInfo}`;
                filterStatusDisplay.style.color = 'green';

                // Update each sub-table filter status display with its specific info
                const tables = Array.from(document.querySelectorAll('table.tbl'))
                    .filter(t => t.querySelector('.mb-col-filter-row'));

                tables.forEach((table, tableIdx) => {
                    const h3 = table.previousElementSibling;
                    if (h3 && h3.classList.contains('mb-toggle-h3')) {
                        const subFilterStatus = h3.querySelector('.mb-filter-status');
                        if (subFilterStatus) {
                            // Count active column filters in this specific table
                            const tableColFilters = Array.from(table.querySelectorAll('.mb-col-filter-input'))
                                .filter(inp => inp.value);

                            const group = filteredArray[tableIdx];
                            const rowsInTable = group ? group.rows.length : 0;

                            if (tableColFilters.length > 0) {
                                const colFilterInfo = tableColFilters.map(inp => {
                                    const colIdx = parseInt(inp.dataset.colIdx, 10);
                                    const headers = table.querySelectorAll('thead tr:first-child th');
                                    const colName = headers[colIdx] ? headers[colIdx].textContent.replace(/[⇅▲▼]/g, '').trim() : `Col ${colIdx}`;
                                    return `${colName}:"${inp.value}"`;
                                }).join(', ');
                                subFilterStatus.textContent = `✓ Filtered ${rowsInTable} rows [${colFilterInfo}]`;
                                subFilterStatus.style.color = 'green';
                            } else {
                                subFilterStatus.textContent = '';
                            }
                        }
                    }
                });
            } else {
                // Single table mode: show all filter info
                filterStatusDisplay.textContent = `✓ Filtered ${rowCount} rows in ${filterDuration}ms${filterInfo}`;
                filterStatusDisplay.style.color = filterDuration > 1000 ? 'red' : (filterDuration > 500 ? 'orange' : 'green');
            }
        }

        Lib.debug('filter', `Filter completed in ${filterDuration}ms`);

        // Update filter button visibility based on active filters
        if (typeof window.updateFilterButtonsVisibility === 'function') {
            window.updateFilterButtonsVisibility();
        }
    }

    stopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Lib.debug('cleanup', 'Stop requested by user.');
        stopRequested = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
    });

    // Create debounced version of runFilter based on user configuration
    const debouncedRunFilter = debounce(runFilter, Lib.settings.sa_filter_debounce_delay || 300);

    // Use debounced version for input events
    filterInput.addEventListener('input', debouncedRunFilter);

    // Use immediate version for checkbox changes (no typing involved)
    caseCheckbox.addEventListener('change', runFilter);
    regexpCheckbox.addEventListener('change', runFilter);
    excludeCheckbox.addEventListener('change', runFilter);

    // Use immediate version for clear button (explicit user action)
    filterClear.addEventListener('click', () => {
        filterInput.value = '';
        runFilter();
    });

    /**
     * Cleans up table headers by removing columns based on user settings
     * @param {HTMLTableSectionElement|HTMLTableRowElement} headerElement - The thead element or header row to clean up
     */
    function cleanupHeaders(headerElement) {
        if (!headerElement) return;
        const theadRow = (headerElement.tagName === 'THEAD') ? headerElement.querySelector('tr') : headerElement;
        if (!theadRow) return;

        Lib.debug(
            'cleanup',
            `cleanupHeaders() called → existing headers=[${Array.from(theadRow.cells).map(th => th.textContent.trim()).join(' | ')}]`
        );

        const headers = Array.from(theadRow.cells);
        const indicesToRemove = [];

        // Map header text prefixes to their corresponding library settings keys
        const removalMap = {
            'Relationships': 'sa_remove_rel',
            'Performance Attributes': 'sa_remove_perf',
            'Rating': 'sa_remove_rating',
            'Tagger': 'sa_remove_tagger',
            'Release events': 'sa_remove_release_events'
        };

        headers.forEach((th, idx) => {
            const txt = th.textContent.trim();

            for (const [headerPrefix, settingKey] of Object.entries(removalMap)) {
                if (txt.startsWith(headerPrefix)) {
                    const isEnabled = Lib.settings[settingKey];
                    if (isEnabled) {
                        Lib.debug('cleanup', `Marking column ${idx} ("${txt}") for removal. Match: "${headerPrefix}", Setting: "${settingKey}"`);
                        indicesToRemove.push(idx);
                    } else {
                        Lib.debug('cleanup', `Skipping removal of column ${idx} ("${txt}"). Setting "${settingKey}" is disabled.`);
                    }
                    break;
                }
            }
        });

        if (indicesToRemove.length > 0) {
            Lib.debug('cleanup', `Removing ${indicesToRemove.length} columns from table.`);
            // Sort descending to ensure index stability during deletion
            indicesToRemove.sort((a, b) => b - a).forEach(idx => {
                const colName = theadRow.cells[idx]?.textContent.trim() || `index ${idx}`;
                theadRow.deleteCell(idx);
                Lib.debug('cleanup', `Successfully deleted column: ${colName}`);
            });
        } else {
            Lib.debug('cleanup', 'No columns were matched for removal based on current settings.');
        }

        const headerBgColor = '#d3d3d3';

        if (typesWithSplitCD.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            if (!headersText.includes('Country')) {
                const thC = document.createElement('th');
                thC.textContent = 'Country';
                thC.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: Country');
                theadRow.appendChild(thC);
            }
            if (!headersText.includes('Date')) {
                const thD = document.createElement('th');
                thD.textContent = 'Date';
                thD.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: Date');
                theadRow.appendChild(thD);
            }
        }

        if (typesWithSplitLocation.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            ['Place', 'Area', 'Country'].forEach(col => {
                if (!headersText.includes(col)) {
                    const th = document.createElement('th');
                    th.textContent = col;
                    th.style.backgroundColor = headerBgColor;
                    Lib.debug('cleanup', `Injecting synthetic header: ${col}`);
                    theadRow.appendChild(th);
                }
            });
        }

        if (typesWithSplitArea.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            ['MB-Area', 'Country'].forEach(col => {
                if (!headersText.includes(col)) {
                    const th = document.createElement('th');
                    th.textContent = col;
                    th.style.backgroundColor = headerBgColor;
                    Lib.debug('cleanup', `Injecting synthetic header: ${col}`);
                    theadRow.appendChild(th);
                }
            });
        }

        // Check if the generic split feature is enabled for this page definition
        const mainColConfig = activeDefinition.features?.extractMainColumn;
        const isMainColEnabled = mainColConfig !== undefined && mainColConfig !== null;

        // On pages where the configuration is enabled, create the "MB-Name" and "Comment" columns
        if (isMainColEnabled) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            if (!headersText.includes('MB-Name')) {
                const thN = document.createElement('th');
                thN.textContent = 'MB-Name';
                thN.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: MB-Name');
                theadRow.appendChild(thN);
            }
            if (!headersText.includes('Comment')) {
                const thC = document.createElement('th');
                thC.textContent = 'Comment';
                thC.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: Comment');
                theadRow.appendChild(thC);
            }
        }
    }

    /**
     * Determines the maximum page number by parsing the pagination UI on the current page
     * @returns {number} The maximum page number found, defaults to 1 if no pagination is present
     */
    function determineMaxPageFromDOM() {
        let maxPage = 1;

        Lib.debug('fetch', 'Context: Standard pagination. Parsing "ul.pagination" from current page.');
        const pagination = document.querySelector('ul.pagination');
        if (pagination) {
            const links = Array.from(pagination.querySelectorAll('li a'));
            const nextIdx = links.findIndex(a => a.textContent.trim() === 'Next');
            if (nextIdx > 0) {
                const urlObj = new URL(links[nextIdx - 1].href, window.location.origin);
                const p = urlObj.searchParams.get('page');
                if (p) {
                    maxPage = parseInt(p, 10);
                    Lib.debug('fetch', `determineMaxPageFromDOM: Found "Next" link. Extracted page: ${maxPage}`);
                }
            } else if (links.length > 0) {
                const pageNumbers = links
                      .map(a => {
                          const p = new URL(a.href, window.location.origin).searchParams.get('page');
                          return p ? parseInt(p, 10) : 1;
                      })
                      .filter(num => !isNaN(num));
                if (pageNumbers.length > 0) {
                    maxPage = Math.max(...pageNumbers);
                    Lib.debug('fetch', `determineMaxPageFromDOM: Parsed page numbers from list. Max found: ${maxPage}`);
                }
            }
            return maxPage;
        } else {
            return maxPage;
            Lib.debug('fetch', 'determineMaxPageFromDOM: No pagination element found; assuming single page (maxPage = 1).');
        }
    }

    /**
     * Shows a modal dialog asking user whether to render, save, or cancel when dataset is large
     * @param {number} totalRows - The total number of rows fetched
     * @param {number} pagesProcessed - The number of pages that were fetched
     * @returns {Promise<string>} - Returns 'render', 'save', or 'cancel'
     */
    function showRenderDecisionDialog(totalRows, pagesProcessed) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            // Create modal dialog
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                text-align: center;
            `;

            const pageLabel = (pagesProcessed === 1) ? 'page' : 'pages';

            dialog.innerHTML = `
                <h2 style="margin-top: 0; color: #333;">Large Dataset Fetched</h2>
                <p style="font-size: 16px; margin: 20px 0;">
                    Successfully fetched <strong>${totalRows.toLocaleString()} rows</strong> from <strong>${pagesProcessed} ${pageLabel}</strong>.
                </p>
                <p style="font-size: 14px; color: #666; margin: 20px 0;">
                    Rendering this many rows may take a considerable amount of time and could impact your browser performance
                    or even make your browser completely unusable. You can instead SAVE the data directly to disk and LOAD it
                    with a PRE-FILTER condition LATER (to decrease the number of rows to make the rendering feasible) or proceed with rendering now.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 25px;">
                    <button id="mb-dialog-save" style="
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: bold;
                    ">💾 Save to Disk</button>
                    <button id="mb-dialog-render" style="
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        background: #2196F3;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: bold;
                    ">🎨 Render Now</button>
                    <button id="mb-dialog-cancel" style="
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: bold;
                    ">❌ Cancel</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Add button event listeners
            document.getElementById('mb-dialog-save').onclick = () => {
                document.body.removeChild(overlay);
                resolve('save');
            };

            document.getElementById('mb-dialog-render').onclick = () => {
                document.body.removeChild(overlay);
                resolve('render');
            };

            document.getElementById('mb-dialog-cancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve('cancel');
            };

            // Allow ESC key to cancel
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', escHandler);
                    resolve('cancel');
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * Generalized fetching process that handles data retrieval and rendering for all page types
     * @param {Event} e - The click event from the button
     * @param {Object} buttonConfig - Button-specific configuration including params and features
     * @param {Object} baseDef - Base page definition from PAGE_DEFINITIONS
     */
    async function startFetchingProcess(e, buttonConfig, baseDef) {
        // MERGE LOGIC: Combine base definition with button-specific overrides
        // We create a new object to avoid polluting the original definition
        const mergedFeatures = {
            ...(baseDef.features || {}),
            ...(buttonConfig.features || {})
        };

        // Handle specific case: 'extractMainColumn' might be at root of button config (per your example)
        // but the script expects it inside 'features'.
        if (buttonConfig.extractMainColumn) {
            mergedFeatures.extractMainColumn = buttonConfig.extractMainColumn;
        }

        // Update the GLOBAL activeDefinition so helper functions (cleanupHeaders, etc.) see the changes
        activeDefinition = {
            ...baseDef,
            ...buttonConfig,
            features: mergedFeatures
        };

        // Update feature flags based on the merged activeDefinition
        typesWithSplitCD = (activeDefinition.features?.splitCD) ? [pageType] : [];
        typesWithSplitLocation = (activeDefinition.features?.splitLocation) ? [pageType] : [];
        typesWithSplitArea = (activeDefinition.features?.splitArea) ? [pageType] : [];

        const activeBtn = e.target;
        // Now access properties from the NEW activeDefinition
        const overrideParams = activeDefinition.params || null;
        const targetHeader = activeDefinition.targetHeader || null;

        e.preventDefault();
        e.stopPropagation();

        // UI Cleanup: If targeting a specific header, remove ONLY those h2 headers and
        // their associated tables from the current page which are part of the OTHER button configurations.
        if (targetHeader && activeDefinition && activeDefinition.buttons) {
            const otherHeaders = activeDefinition.buttons
                .map(b => b.targetHeader)
                .filter(oh => oh && oh !== targetHeader);

            if (otherHeaders.length > 0) {
                const container = document.getElementById('content') || document.body;

                // Specifically target h2 headers that belong to other configurations
                container.querySelectorAll('h2').forEach(h => {
                    const headerText = h.textContent.trim();
                    const isOtherConfigHeader = otherHeaders.some(oh => headerText.startsWith(oh));

                    if (isOtherConfigHeader) {
                        Lib.debug('cleanup', `Removing other configured section starting with header: "${headerText}"`);

                        // Remove everything starting with the h2 header AND eventual optional elements after it PLUS
                        // the final table
                        let next = h.nextElementSibling;
                        let tableRemoved = false;

                        while (next && !tableRemoved) {
                            let toRemove = next;
                            next = next.nextElementSibling;

                            // Safety check: stop if we hit another H2 header before finding a table to prevent over-deletion
                            // Note: H3 headers are allowed as they're often subsections within the main H2 section
                            if (toRemove.tagName === 'H2') {
                                Lib.debug('cleanup', `Stopping cleanup at next H2 header before finding table. This may indicate incomplete section removal.`);
                                break;
                            }

                            // Check if this sibling is the final table to remove
                            if (toRemove.tagName === 'TABLE' && toRemove.classList.contains('tbl')) {
                                tableRemoved = true;
                            }

                            toRemove.remove();
                        }

                        // Finally remove the header itself
                        h.remove();
                    }
                });
                Lib.debug('cleanup', `Cleaned UI to target header: "${targetHeader}"`);
            }
        }

        // Reload the page if a fetch process has already run to fix column-level filter unresponsiveness
        if (isLoaded) {
            Lib.debug('meta', 'Second fetch attempt detected. Setting reload flag and reloading page to ensure filter stability.');
            sessionStorage.setItem('mb_show_all_reload_pending', 'true');
            window.location.reload();
            return;
        }

        // Stop other scripts immediately when an action button is pressed
        stopOtherScripts();

        // Clear existing highlights immediately from DOM for visual feedback
        document.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight').forEach(n => {
            n.replaceWith(document.createTextNode(n.textContent));
        });

        // Clear existing filter conditions and UI highlights for a fresh start
        filterInput.value = '';
        filterInput.style.boxShadow = '';
        caseCheckbox.checked = false;
        excludeCheckbox.checked = false;
        document.querySelectorAll('.mb-col-filter-input').forEach(inp => {
            inp.value = '';
            inp.style.boxShadow = '';
        });

        // Reset all buttons back to original grey background
        allActionButtons.forEach(btn => {
            btn.style.backgroundColor = '';
            btn.style.color = '';
        });

        // Set initial starting color for active button
        activeBtn.style.backgroundColor = '#ffcccc'; // light red
        activeBtn.style.color = 'black';

        // Removed isLoaded block to allow re-fetching
        Lib.debug('fetch', 'Starting fetch process...', overrideParams);
        globalStatusDisplay.textContent = 'Getting number of pages to fetch...';
        let maxPage = 1;

        // Determine maxPage based on context
        if (activeDefinition && activeDefinition.non_paginated) {
            // For non-paginated types, initially assume maxPage is 1
            Lib.debug('fetch', 'Context: Non-paginated page definition. Initially assuming maxPage = 1.');
            maxPage = 1;
            globalStatusDisplay.textContent = 'Getting number of pages to fetch... Non-paginated page definition. Initially assuming 1';
        } else if (overrideParams) {
            Lib.debug('fetch', 'Context: overrideParams detected. Fetching maxPage with overrides.', overrideParams);
            maxPage = await fetchMaxPageGeneric(path, overrideParams);
            globalStatusDisplay.textContent = `Getting number of pages to fetch... Paginated page definition extracted from URL with queryParameters: ${maxPage}`;
        } else {
            Lib.debug('fetch', 'Context: Paginated page definition. Fetching maxPage from DOM.');
            maxPage = determineMaxPageFromDOM();
            globalStatusDisplay.textContent = `Getting number of pages to fetch... Paginated page definition. Fetching maxPage from DOM: ${maxPage}`;
        }

        // --- USERSCRIPT WARNING POPUP ---
        const maxThreshold = Lib.settings.sa_max_page;
        Lib.debug('fetch', `Total pages to fetch: ${maxPage}`);

        // If page count is above threshold, show modal
        if (maxPage > maxThreshold) {
            const proceedConfirmed = await showCustomConfirm(
                `Warning: This MusicBrainz entity has ${maxPage} pages. It's more than the configured maximum value (${maxThreshold}) and could result in severe performance, memory consumption and timing issues.\n\nProceed?`,
                '⚠️ High Page Count',
                activeBtn
            );
            if (!proceedConfirmed) {
                Lib.warn('warn', `High page count detected (${maxPage}). User canceled fetch.`);
                activeBtn.style.backgroundColor = '';
                activeBtn.style.color = '';
                activeBtn.disabled = false;
                infoDisplay.textContent = '';
                return;
            }
        }

        stopRequested = false;
        allRows = [];
        originalAllRows = [];
        groupedRows = [];

        // Run refactored clutter removal
        performClutterCleanup();

        if (pageType === 'events' || pageType === 'artist-releasegroups') removeSanojjonasContainers();

        // Update UI state
        activeBtn.disabled = true;
        activeBtn.classList.add('mb-show-all-btn-loading');
        allActionButtons.forEach(b => { if (b !== activeBtn) b.disabled = true; });

        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        ctrlMFunctionMap['o'] = { fn: () => stopBtn.click(), description: 'Stop fetching' };
        globalStatusDisplay.textContent = 'Loading…';
        globalStatusDisplay.style.color = '#999';

        const startTime = performance.now();
        let fetchingTimeStart = performance.now();
        let totalFetchingTime = 0;
        let totalRenderingTime = 0;

        const baseUrl = window.location.origin + window.location.pathname;
        const currentUrlParams = new URLSearchParams(window.location.search);
        const currentPageNum = parseInt(currentUrlParams.get('page') || '1', 10);

        let pagesProcessed = 0;
        let cumulativeFetchTime = 0;
        let lastCategorySeenAcrossPages = null;
        let totalRowsAccumulated = 0;

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) {
                    Lib.debug('cleanup', 'Fetch loop stopped at page ' + p);
                    break;
                }
                pagesProcessed++;

                const pageStartTime = performance.now();

                // Initialize fetchUrl from the full current URL to preserve Search parameters (query, type, etc.)
                const fetchUrl = new URL(window.location.href);
                fetchUrl.searchParams.set('page', p.toString());

                if (overrideParams) {
                    Object.keys(overrideParams).forEach(k => fetchUrl.searchParams.set(k, overrideParams[k]));
                }

                let doc;
                try {
                    // If this page matches the current browser page and no specific overrides are requested, use the
                    // existing document instead of a redundant network fetch.
                    if (p === currentPageNum && (!overrideParams || Object.keys(overrideParams).length === 0)) {
                        Lib.debug('fetch', `Page ${p} is current page. Using existing document.`);
                        doc = document;
                   } else {
                        Lib.debug('fetch', `Fetching URL for page ${p}: ${fetchUrl.toString()}`);
                        const html = await fetchHtml(fetchUrl.toString());
                        doc = new DOMParser().parseFromString(html, "text/html");
                    }

                    if (!doc) {
                        throw new Error(`Failed to obtain document for page ${p}`);
                    }
                } catch (e) {
                    Lib.error('fetch', `Error fetching/parsing page ${p}:`, e);
                    break; // Stop fetching further pages on error
                }

                let countryDateIdx = -1;
                let locationIdx = -1;
                let areaIdx = -1;
                let mainColIdx = -1;
                let indicesToExclude = [];
                const headerNames = []; // Array to store header names for debugging

                // Retrieve configuration for the main column extraction
                const mainColConfig = activeDefinition.features?.extractMainColumn;

                // If configuration is a specific number, force that index immediately
                if (typeof mainColConfig === 'number') {
                    mainColIdx = mainColConfig;
                    Lib.debug('init', `mainColIdx forced to ${mainColIdx} by configuration.`);
                }
                // Prepare candidates list if config is string or array
                const mainColCandidates = Array.isArray(mainColConfig) ? mainColConfig : (mainColConfig ? [mainColConfig] : []);

                // Use parseDocumentForTables to filter which tables we actually process
                const tablesToProcess = parseDocumentForTables(doc, targetHeader);

                // Alias pageTypes that REQUIRE table normalization
                const ALIAS_PAGES_WITH_ACTIONS_COLUMN = new Set([
                    'instrument-aliases',
                    'label-aliases',
                    'place-aliases',
                    'series-aliases',
                    'event-aliases',
                    'area-aliases',
                    // add more here when discovered
                ]);

                // Alias pageTypes that explicitly do NOT need normalization
                const ALIAS_PAGES_WITHOUT_ACTIONS_COLUMN = new Set([
                    'artist-aliases',
                ]);

                // 🔥 Alias pages need structural normalization BEFORE row extraction
                // 🔥 Alias pages with known broken table structure
                if (
                    pageType.endsWith('-aliases') &&
                    ALIAS_PAGES_WITH_ACTIONS_COLUMN.has(pageType) &&
                    !ALIAS_PAGES_WITHOUT_ACTIONS_COLUMN.has(pageType)
                ) {
                    tablesToProcess.forEach(normalizeAliasTable);
                }

                if (tablesToProcess.length === 0) {
                    Lib.debug('fetch', `No tables found matching "${targetHeader}" on page ${p} to parse. Skipping.`);
                    continue;
                } else {
                    Lib.debug('fetch', `Found matching table "${tablesToProcess[0]}" on page ${p} to process.`);
                }

                // Use the first matching table to establish indices/headers if not already done
                const referenceTable = tablesToProcess[0];

                if (referenceTable) {
                    // Map header text prefixes to their corresponding library settings keys
                    // This matches the structure in cleanupHeaders for consistency
                    const removalMap = {
                        'Relationships': 'sa_remove_rel',
                        'Performance Attributes': 'sa_remove_perf',
                        'Rating': 'sa_remove_rating',
                        'Tagger': 'sa_remove_tagger',
                        'Release events': 'sa_remove_release_events'
                    };

                    referenceTable.querySelectorAll('thead th').forEach((th, idx) => {
                        const txt = th.textContent.trim();
                        headerNames[idx] = txt; // Store the name

                        // Check for columns to exclude
                        for (const [headerPrefix, settingKey] of Object.entries(removalMap)) {
                            if (txt.startsWith(headerPrefix) && Lib.settings[settingKey]) {
                                indicesToExclude.push(idx);
                                break; // A column can only be excluded once
                            }
                        }

                        // Check for special column types (independent of removal checks)
                        if (typesWithSplitCD.includes(pageType) && txt === 'Country/Date') {
                            countryDateIdx = idx;
                        }
                        if (typesWithSplitLocation.includes(pageType) && txt === 'Location') {
                            locationIdx = idx;
                        }
                        if (typesWithSplitArea.includes(pageType) && txt === 'Area') {
                            areaIdx = idx;
                        }

                        // Dynamic detection based on config candidates
                        // We only search if mainColIdx wasn't already forced by a number config
                        if (mainColIdx === -1 && mainColCandidates.includes(txt)) {
                            mainColIdx = idx;
                        }
                    });
                }

                // Updated Debug Output with Column Names
                Lib.debug(
                    'indices',
                    `Detected indices → mainColIdx=${mainColIdx} (${headerNames[mainColIdx] || 'N/A'}), countryDateIdx=${countryDateIdx} (${headerNames[countryDateIdx] || 'N/A'}), areaIdx=${areaIdx} (${headerNames[areaIdx] || 'N/A'}), locationIdx=${locationIdx} (${headerNames[locationIdx] || 'N/A'}), excluded=[${indicesToExclude.join(',')}] for pageType: ${pageType}`
                );

                let rowsInThisPage = 0;
                let pageCategoryMap = new Map();

                if (pageType === 'artist-releasegroups') {
                    doc.querySelectorAll('table.tbl').forEach(table => {
                        let h3 = table.previousElementSibling;
                        while (h3 && h3.nodeName !== 'H3') h3 = h3.previousElementSibling;
                        const category = h3 ? h3.textContent.trim() : 'Other';

                        // Logic to handle grouped data and repeating headers over multiple paginated pages (e.g. "Album + Live")
                        if (category !== lastCategorySeenAcrossPages) {
                            Lib.debug('fetch', `Type Change: "${category}". Rows so far: ${totalRowsAccumulated}`);
                            groupedRows.push({ category: category, rows: [] });
                            lastCategorySeenAcrossPages = category;
                        }
                        const currentGroup = groupedRows[groupedRows.length - 1];

                        table.querySelectorAll('tbody tr:not(.explanation)').forEach(row => {
                            if (row.cells.length > 1) {
                                const newRow = document.importNode(row, true);
                                // Lib.debug(
                                //     'row',
                                //     `Row cloned → initial cell count=${newRow.cells.length}`
                                // );
                                [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });
                                currentGroup.rows.push(newRow);
                                // Lib.debug(
                                //     'row',
                                //     `Row BEFORE push → cells=${newRow.cells.length}, mainColIdx=${mainColIdx}, countryDateIdx=${countryDateIdx}`
                                // );
                                rowsInThisPage++;
                                totalRowsAccumulated++;
                                pageCategoryMap.set(category, (pageCategoryMap.get(category) || 0) + 1);
                            }
                        });
                    });
                } else {
                    // Try to find tbody. If not found, fall back to table (useful for non-standard tables like some search results)
                    const tableBody = doc.querySelector('table.tbl tbody') || doc.querySelector('table.tbl');

                    if (tableBody) {
                        Lib.debug('parse', `Table body found. Processing child nodes. Total nodes: ${tableBody.childNodes.length}`);
                        let currentStatus = 'Unknown';
                        let seenFetchSubgroups = new Map();  // needed for unique subgroup header names

                        tableBody.childNodes.forEach(node => {
                            if (node.nodeName === 'TR') {
                                if (node.classList.contains('subh')) {

                                    const th = node.querySelector('th');

                                    // Prefer anchor text if present (MusicBrainz usually puts the label here)
                                    let rawName =
                                        th?.querySelector('a')?.textContent?.trim() ||
                                        th?.textContent?.trim() ||
                                        node.textContent?.trim() ||
                                        'Unknown';

                                    // Normalize whitespace
                                    rawName = rawName.replace(/\s+/g, ' ');

                                    if (seenFetchSubgroups.has(rawName)) {
                                        let count = seenFetchSubgroups.get(rawName) + 1;
                                        seenFetchSubgroups.set(rawName, count);
                                        currentStatus = `${rawName} (${count})`;
                                    } else {
                                        seenFetchSubgroups.set(rawName, 1);
                                        currentStatus = rawName;
                                    }

                                    if ((activeDefinition.tableMode === 'multi') && currentStatus !== lastCategorySeenAcrossPages) {
                                        Lib.debug('fetch', `Subgroup Change/Type: "${currentStatus}". Rows so far: ${totalRowsAccumulated}`);
                                    }
                                } else if (node.cells.length > 1 && !node.classList.contains('explanation')) {
                                    // Remove artificial non-data rows on non-paginated pages which have a link "See all <number of rows> relationships" to the full dataset instead
                                    if (activeDefinition && activeDefinition.non_paginated) {
                                        const seeAllCell = node.querySelector('td[colspan]');
                                        if (seeAllCell) {
                                            const link = seeAllCell.querySelector('a');
                                            if (link && link.textContent.toLowerCase().includes('see all')) {
                                                Lib.debug('parse', `Skipping "See all" relationship row.`);

                                                // Capture the URL and the count to allow "Show all <n>" button creation in the h3 header for overflow tables
                                                const currentGroup = groupedRows.find(g => g.category === currentStatus);
                                                if (currentGroup) {
                                                    const linkText = link.textContent;
                                                    currentGroup.seeAllUrl = link.getAttribute('href');

                                                    // Extract the number of rows from the link text
                                                    const match = linkText.match(/See all ([\d,.]+) relationships/i);
                                                    currentGroup.seeAllCount = match ? match[1] : null;

                                                    Lib.debug('parse', `Stored "See All" URL and Count for ${currentStatus}: ${currentGroup.seeAllUrl} (${currentGroup.seeAllCount}) `);
                                                }
                                                return; // Skip adding this row to data structures
                                            }
                                        }
                                    }

                                    const newRow = document.importNode(node, true);

                                    // Extraction logic for MB-Name and Comment
                                    const tdName = document.createElement('td');
                                    const tdComment = document.createElement('td');

                                    // If a main column was identified (via config or detection), perform the extraction
                                    if (mainColIdx !== -1) {
                                        // When accessing a row, resolve logical column → real cell
                                        const targetCell = getCellByLogicalIndex(newRow, mainColIdx);
                                        if (targetCell) {
                                            // 1. Extract Name
                                            // Priority: Specific Entity Link (a > bdi) -> First Link -> First Meaningful Text
                                            const nameLink = targetCell.querySelector('a bdi')?.closest('a');
                                            if (nameLink) {
                                                tdName.appendChild(nameLink.cloneNode(true));
                                            } else {
                                                // Fallback: Scan child nodes for the first non-comment content
                                                let foundName = false;
                                                for (const node of targetCell.childNodes) {
                                                    // Skip comments and scripts
                                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                                        if (node.classList.contains('comment') || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue;
                                                        if (node.tagName === 'A') {
                                                            tdName.appendChild(node.cloneNode(true));
                                                            foundName = true;
                                                            break;
                                                        }
                                                    } else if (node.nodeType === Node.TEXT_NODE) {
                                                        const txt = node.textContent.trim();
                                                        // Check for meaningful text (ignoring common separators like parens often wrapping comments)
                                                        if (txt && txt !== '(' && txt !== ')' && txt !== ',') {
                                                            tdName.textContent = txt;
                                                            foundName = true;
                                                            break;
                                                        }
                                                    }
                                                }
                                                // Fallback if iteration found nothing (e.g. complex nesting): get text excluding comments
                                                if (!foundName) {
                                                    const clone = targetCell.cloneNode(true);
                                                    clone.querySelectorAll('.comment').forEach(el => el.remove());
                                                    tdName.textContent = clone.textContent.trim();
                                                }
                                            }

                                            // 2. Extract Comment
                                            // Priority: .comment > bdi -> .comment text
                                            const commentSpan = targetCell.querySelector('.comment');
                                            if (commentSpan) {
                                                // If bdi exists (standard entity comment), use it; otherwise use the span text (simple comment)
                                                const val = commentSpan.querySelector('bdi') || commentSpan;
                                                tdComment.textContent = val.textContent.trim();
                                            }
                                        }
                                    }

                                    // Handling Country/Date split
                                    const tdSplitC = document.createElement('td');
                                    const tdSplitD = document.createElement('td');
                                    if (typesWithSplitCD.includes(pageType) && countryDateIdx !== -1) {
                                        const cdCell = newRow.cells[countryDateIdx];
                                        if (cdCell) {
                                            const events = Array.from(cdCell.querySelectorAll('.release-event'));
                                            events.forEach((ev, i) => {
                                                const countrySpan = ev.querySelector('.release-country');
                                                const dateSpan = ev.querySelector('.release-date');
                                                if (countrySpan) {
                                                    if (i > 0) tdSplitC.appendChild(document.createTextNode(', '));
                                                    const flagImg = countrySpan.querySelector('img')?.outerHTML || '';
                                                    const abbr = countrySpan.querySelector('abbr');
                                                    const countryCode = abbr ? abbr.textContent.trim() : '';
                                                    const countryFullName = abbr?.getAttribute('title') || '';
                                                    const countryA = countrySpan.querySelector('a');
                                                    const countryHref = countryA?.getAttribute('href') || '#';
                                                    const spanContainer = document.createElement('span');
                                                    spanContainer.className = countrySpan.className;
                                                    if (countryFullName && countryCode) {
                                                        spanContainer.innerHTML = `${flagImg} <a href="${countryHref}">${countryFullName} (${countryCode})</a>`;
                                                    } else {
                                                        spanContainer.innerHTML = countrySpan.innerHTML;
                                                    }
                                                    tdSplitC.appendChild(spanContainer);
                                                }
                                                if (dateSpan) {
                                                    if (i > 0) tdSplitD.appendChild(document.createTextNode(', '));
                                                    tdSplitD.appendChild(document.createTextNode(dateSpan.textContent.trim()));
                                                }
                                            });
                                        }
                                    }

                                    // Handling Location split (Place, Area and Country)
                                    const tdP = document.createElement('td');
                                    const tdA = document.createElement('td');
                                    const tdC = document.createElement('td');
                                    if (typesWithSplitLocation.includes(pageType) && locationIdx !== -1) {
                                        const locCell = newRow.cells[locationIdx];
                                        if (locCell) {
                                            locCell.querySelectorAll('a').forEach(a => {
                                                const href = a.getAttribute('href');
                                                const clonedA = a.cloneNode(true);
                                                if (href && href.includes('/place/')) {
                                                    tdP.appendChild(clonedA);
                                                } else if (href && href.includes('/area/')) {
                                                    const flagSpan = a.closest('.flag');
                                                    if (flagSpan) {
                                                        const flagImg = flagSpan.querySelector('img')?.outerHTML || '';
                                                        const abbr = flagSpan.querySelector('abbr');
                                                        const countryCode = abbr ? abbr.textContent.trim() : '';
                                                        const countryFullName = abbr?.getAttribute('title') || '';
                                                        const countryHref = a.getAttribute('href') || '#';
                                                        const span = document.createElement('span');
                                                        span.className = flagSpan.className;
                                                        if (countryFullName && countryCode) {
                                                            span.innerHTML = `${flagImg} <a href="${countryHref}">${countryFullName} (${countryCode})</a>`;
                                                        } else {
                                                            span.innerHTML = flagSpan.innerHTML;
                                                        }
                                                        tdC.appendChild(span);
                                                    } else {
                                                        if (tdA.hasChildNodes()) tdA.appendChild(document.createTextNode(', '));
                                                        tdA.appendChild(clonedA);
                                                    }
                                                }
                                            });
                                        }
                                    }

                                    // Handling Area split (MB-Area and Country)
                                    const tdAreaOnly = document.createElement('td');
                                    const tdCountryOnly = document.createElement('td');
                                    if (typesWithSplitArea.includes(pageType) && areaIdx !== -1) {
                                        const areaCell = newRow.cells[areaIdx];
                                        if (areaCell) {
                                            const nodes = Array.from(areaCell.childNodes);
                                            // Identify the node that contains the flag (the country)
                                            const countryNodeIndex = nodes.findIndex(node =>
                                                node.nodeType === 1 && (node.classList.contains('flag') || node.querySelector('.flag'))
                                            );

                                            nodes.forEach((node, idx) => {
                                                if (idx === countryNodeIndex) {
                                                    // This is the country node, move to Country column
                                                    tdCountryOnly.appendChild(node.cloneNode(true));
                                                } else {
                                                    // Check if this node is a comma/whitespace separator adjacent to the country
                                                    // We skip these to avoid dangling commas like "Philadelphia, "
                                                    const isCommaSeparator = node.nodeType === 3 && node.textContent.trim() === ',';
                                                    const isAdjacentToCountry = (idx === countryNodeIndex - 1 || idx === countryNodeIndex + 1);

                                                    if (isCommaSeparator && isAdjacentToCountry) {
                                                        return;
                                                    }

                                                    // All other nodes (smaller areas, aliases, separators) go to MB-Area
                                                    tdAreaOnly.appendChild(node.cloneNode(true));
                                                }
                                            });

                                            // Cleanup: Remove any leading/trailing commas or empty text nodes from the new cells
                                            const trimCell = (cell) => {
                                                while (cell.firstChild && cell.nodeType === 1 && (cell.firstChild.nodeType === 3 && (cell.firstChild.textContent.trim() === ',' || !cell.firstChild.textContent.trim()))) {
                                                    cell.removeChild(cell.firstChild);
                                                }
                                                while (cell.lastChild && cell.nodeType === 1 && (cell.lastChild.nodeType === 3 && (cell.lastChild.textContent.trim() === ',' || !cell.lastChild.textContent.trim()))) {
                                                    cell.removeChild(cell.lastChild);
                                                }
                                            };

                                            trimCell(tdAreaOnly);
                                            trimCell(tdCountryOnly);
                                        }
                                    }

                                    [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });

                                    if (typesWithSplitCD.includes(pageType)) {
                                        newRow.appendChild(tdSplitC);
                                        newRow.appendChild(tdSplitD);
                                    } else if (typesWithSplitLocation.includes(pageType)) {
                                        newRow.appendChild(tdP);
                                        newRow.appendChild(tdA);
                                        newRow.appendChild(tdC);
                                    } else if (typesWithSplitArea.includes(pageType)) {
                                        newRow.appendChild(tdAreaOnly);
                                        newRow.appendChild(tdCountryOnly);
                                    }

                                    if (pageType !== 'artist-releasegroups') {
                                        newRow.appendChild(tdName); newRow.appendChild(tdComment);
                                    }

                                    if (activeDefinition.tableMode === 'multi') {
                                        // Check if this category group already exists to consolidate subgroup tables
                                        let existingGroup = groupedRows.find(g => g.category === currentStatus);
                                        if (existingGroup) {
                                            existingGroup.rows.push(newRow);
                                        } else {
                                            groupedRows.push({ category: currentStatus, rows: [newRow] });
                                        }
                                        lastCategorySeenAcrossPages = currentStatus;
                                        pageCategoryMap.set(currentStatus, (pageCategoryMap.get(currentStatus) || 0) + 1);
                                    } else {
                                        allRows.push(newRow);
                                    }

                                    rowsInThisPage++;
                                    totalRowsAccumulated++;
                                }
                            }
                        });
                    } else {
                        Lib.debug('parse', 'No table body found in fetched document.');
                    }
                }
                const pageDuration = performance.now() - pageStartTime;
                cumulativeFetchTime += pageDuration;
                const avgPageTime = cumulativeFetchTime / pagesProcessed;
                const estRemainingSeconds = (avgPageTime * (maxPage - p)) / 1000;

                // Update color on action button based on progress (red -> orange -> green)
                const progress = p / maxPage;
                let bgColor = '#ffcccc'; // light red
                if (progress >= 1.0) bgColor = '#ccffcc'; // light green
                else if (progress >= 0.5) bgColor = '#ffe0b2'; // light orange
                activeBtn.style.backgroundColor = bgColor;

                // Show live progress in the subheader status display
                globalStatusDisplay.textContent =
                    `Loading page ${p} of ${maxPage}… (${totalRowsAccumulated} rows) — ` +
                    `est. ${estRemainingSeconds.toFixed(1)}s remaining`;
                globalStatusDisplay.style.color = progress >= 1.0 ? 'green' : (progress >= 0.5 ? 'orange' : '#c00');

                // Detailed statistics per page fetch
                Lib.debug('fetch', `Page ${p}/${maxPage} processed in ${(pageDuration / 1000).toFixed(2)}s. Rows on page: ${rowsInThisPage}. Total: ${totalRowsAccumulated}`);

                if (activeDefinition.tableMode === 'multi') {
                    const summaryParts = groupedRows.map(g => {
                        const curPageCount = pageCategoryMap.get(g.category) || 0;
                        return `${g.category}: +${curPageCount} (Total: ${g.rows.length})`;
                    });
                    Lib.debug('fetch', `  Summary: ${summaryParts.join(' | ')}`);
                }
            }

            totalFetchingTime = performance.now() - fetchingTimeStart;

            // Calculate total rows before rendering
            const totalRows = (activeDefinition.tableMode === 'multi') ?
                             groupedRows.reduce((acc, g) => acc + g.rows.length, 0) : allRows.length;

            // --- LARGE DATASET HANDLING ---
            // If the dataset is very large, offer the user a choice before rendering
            const renderThreshold = Lib.settings.sa_render_threshold || 5000;
            if (renderThreshold > 0 && totalRows > renderThreshold) {
                const userChoice = await showRenderDecisionDialog(totalRows, pagesProcessed);

                if (userChoice === 'save') {
                    // User chose to save directly without rendering
                    Lib.debug('cache', 'User chose to save data directly without rendering.');
                    globalStatusDisplay.textContent = `Fetched ${totalRows} rows. Saving to disk...`;

                    // Mark as loaded so saveTableDataToDisk can proceed
                    isLoaded = true;
                    saveTableDataToDisk();

                    // Clean up UI
                    activeBtn.disabled = false;
                    activeBtn.classList.remove('mb-show-all-btn-loading');
                    allActionButtons.forEach(b => b.disabled = false);
                    stopBtn.style.display = 'none';
                    delete ctrlMFunctionMap['o'];

                    const fetchSeconds = (totalFetchingTime / 1000).toFixed(2);
                    const pageLabel = (pagesProcessed === 1) ? 'page' : 'pages';
                    globalStatusDisplay.textContent = `Fetched ${pagesProcessed} ${pageLabel} (${totalRows} rows) in ${fetchSeconds}s - Saved to disk without rendering`;
                    globalStatusDisplay.style.color = 'green';

                    Lib.debug('success', `Process complete. Data saved without rendering. Row Count: ${totalRows}. Fetch Time: ${fetchSeconds}s`);
                    return; // Exit without rendering
                } else if (userChoice === 'cancel') {
                    // User cancelled
                    Lib.debug('cache', 'User cancelled the operation.');
                    activeBtn.disabled = false;
                    activeBtn.classList.remove('mb-show-all-btn-loading');
                    allActionButtons.forEach(b => b.disabled = false);
                    stopBtn.style.display = 'none';
                    delete ctrlMFunctionMap['o'];
                    globalStatusDisplay.textContent = 'Operation cancelled';
                    return;
                }
                // If userChoice === 'render', continue with normal rendering below
            }

            let renderingTimeStart = performance.now();

            // --- RENDERING START ---
            Lib.debug('render', 'DOM rendering starting...');

            updateH2Count(totalRows, totalRows);

            activeBtn.disabled = false;
            activeBtn.classList.remove('mb-show-all-btn-loading');
            allActionButtons.forEach(b => b.disabled = false);
            stopBtn.style.display = 'none';
            delete ctrlMFunctionMap['o'];

            // Only show filter container if it wasn't already appended to H2 (handled in updateH2Count or renderGroupedTable)
            if (!filterContainer.parentNode) {
                filterContainer.style.display = 'inline-flex';
            }

            document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());

            // Backup original order for tri-state sorting
            if (activeDefinition.tableMode === 'multi') {
                groupedRows.forEach(g => { g.originalRows = [...g.rows]; });
                await renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else {
                originalAllRows = [...allRows];
                await renderFinalTable(allRows);
                document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                const mainTable = document.querySelector('table.tbl');
                if (mainTable) addColumnFilterRow(mainTable);

                if (mainTable) makeTableSortableUnified(mainTable, 'main_table');

                // Series page: disable sorting UI for the "#" (number) column - (DOM-only cleanup; no logic changes)
                if (location.pathname.startsWith('/series/')) {
                    document.querySelectorAll('th.number-column').forEach(th => {
                        // Remove alert();l sort icon buttons inside the "#" header
                        th.querySelectorAll('.sort-icon-btn').forEach(span => span.remove());
                        // Ensure the header text is exactly "#"
                        th.textContent = '#';
                    });
                }
            }

            // Perform final cleanup of UI artifacts
            finalCleanup();

            // Make all H2s collapsible after rendering
            makeH2sCollapsible();

            // Apply sticky headers for better scrolling experience
            if (Lib.settings.sa_enable_sticky_headers) {
                applyStickyHeaders();
            }

            // Add auto-resize columns button
            if (Lib.settings.sa_enable_column_resizing) {
                addAutoResizeButton();

                // Enable manual column resizing on all tables immediately
                document.querySelectorAll('table.tbl').forEach(table => {
                    makeColumnsResizable(table);
                });
            }

            // Add column visibility toggle for all tables
            if (Lib.settings.sa_enable_column_visibility) {
                document.querySelectorAll('table.tbl').forEach((table, index) => {
                    // Only add toggle for the first table to avoid duplicate buttons
                    if (index === 0) {
                        addColumnVisibilityToggle(table);
                    }
                });
            }

            // Add density control
            if (Lib.settings.sa_enable_density_control) {
                addDensityControl();
            }

            // Add stats panel button
            if (Lib.settings.sa_enable_stats_panel) {
                addStatsButton();
            }

            // Initialize keyboard shortcuts
            if (Lib.settings.sa_enable_keyboard_shortcuts) {
                initKeyboardShortcuts();
                addShortcutsHelpButton();
            }

            // Add export to CSV button
            if (Lib.settings.sa_enable_export) {
                addExportButton();
            }

            isLoaded = true;
            // Initialize sidebar collapse only now if enabled
            if (Lib.settings.sa_collabsable_sidebar) {
                initSidebarCollapse();
            }

            totalRenderingTime = performance.now() - renderingTimeStart;

            // --- RENDERING END ---
            Lib.debug('render', `DOM rendering finished in ${totalRenderingTime.toFixed(2)}ms`);

            const fetchSeconds = (totalFetchingTime / 1000).toFixed(2);
            const renderSeconds = (totalRenderingTime / 1000).toFixed(2);

            const pageLabel = (pagesProcessed === 1) ? 'page' : 'pages';
            globalStatusDisplay.textContent = `Loaded ${pagesProcessed} ${pageLabel} (${totalRows} rows) from MusicBrainz backend database, Fetching time: ${fetchSeconds}s`;

            Lib.debug('success', `Process complete. Final Row Count: ${totalRowsAccumulated}. Total Time: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);
        } catch (err) {
            Lib.error('fetch', 'Critical Error during fetch:', err);
            globalStatusDisplay.textContent = 'Error during load… (repress the "Show all" button)';
            activeBtn.disabled = false;
            allActionButtons.forEach(b => b.disabled = false);
            activeBtn.style.backgroundColor = '';
            activeBtn.style.color = '';
        }
    }

    /**
     * High-performance batch renderer for large datasets
     * Uses DocumentFragment, chunked rendering, and progress updates
     * @param {Array<HTMLTableRowElement>} rows - Array of table row elements to render
     */
    async function renderFinalTable(rows) {
        const rowCount = Array.isArray(rows) ? rows.length : 0;
        Lib.debug('render', `Starting renderFinalTable with ${rowCount} rows.`);

        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) {
            Lib.error('render', 'Abort: #tbody container not found.');
            return;
        }

        tbody.innerHTML = '';

        const table = tbody.closest('table');
        const thCount = table?.querySelectorAll('thead th')?.length || 0;
        const tdCount = rows[0]?.cells?.length || 0;

        Lib.debug(
            'render',
            `Final table structure → headers=${thCount}, rowCells=${tdCount}`
        );

        if (rowCount === 0) {
            Lib.error('render', 'No rows provided to renderFinalTable.');
            return;
        }

        // Use threshold setting for when to enable chunked rendering
        const chunkThreshold = Lib.settings.sa_chunked_render_threshold || 1000;

        // For small datasets, use fast simple append
        if (chunkThreshold === 0 || rowCount < chunkThreshold) {
            rows.forEach(r => tbody.appendChild(r));
            Lib.debug('render', `Fast render: Injected ${rowCount} rows into DOM.`);
        } else {
            // For large datasets, use chunked async rendering with progress
            await renderRowsChunked(tbody, rows, 'single');
        }

        // Show the save button now that data is rendered
        if (Lib.settings.sa_enable_save_load) {
            saveToDiskBtn.style.display = 'inline-block';
        }
    }

    /**
     * Chunked async renderer with progress updates
     * Renders rows in batches to avoid blocking the UI thread
     * @param {HTMLTableSectionElement} tbody - The table body element to render into
     * @param {Array<HTMLTableRowElement>} rows - Array of table row elements to render
     * @param {string} mode - Rendering mode: 'single' for single table or 'multi' for grouped tables
     */
    async function renderRowsChunked(tbody, rows, mode = 'single') {
        const totalRows = rows.length;
        const chunkSize = 500; // Render 500 rows at a time
        const chunks = Math.ceil(totalRows / chunkSize);

        Lib.debug('render', `Chunked render: ${totalRows} rows in ${chunks} chunks of ${chunkSize}`);

        // Show progress indicator
        const progressMsg = document.createElement('div');
        progressMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            z-index: 9999;
            font-size: 16px;
            text-align: center;
        `;
        progressMsg.innerHTML = `
            <div style="margin-bottom: 10px;">🎨 Rendering rows...</div>
            <div id="mb-render-progress" style="font-size: 14px;">0 / ${totalRows.toLocaleString()}</div>
        `;
        document.body.appendChild(progressMsg);
        const progressText = document.getElementById('mb-render-progress');

        let rowsRendered = 0;

        for (let i = 0; i < chunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, totalRows);
            const chunk = rows.slice(start, end);

            // Use DocumentFragment for efficient batch insert
            const fragment = document.createDocumentFragment();
            chunk.forEach(row => fragment.appendChild(row));
            tbody.appendChild(fragment);

            rowsRendered += chunk.length;

            // Update progress
            progressText.textContent = `${rowsRendered.toLocaleString()} / ${totalRows.toLocaleString()}`;

            // Yield to browser to keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Remove progress indicator
        document.body.removeChild(progressMsg);

        Lib.debug('render', `Chunked render complete: ${totalRows} rows rendered in ${chunks} chunks.`);
    }

    /**
     * Renders multiple tables grouped by category (e.g., Official, Various Artists) with H3 headers
     * @param {Array} dataArray - Array of grouped data objects, each containing a label and rows
     * @param {boolean} isArtistMain - Whether this is the main artist page (affects rendering logic)
     * @param {string} query - Optional pre-filter query to apply during rendering
     * @returns {Promise<void>}
     */
    async function renderGroupedTable(dataArray, isArtistMain, query = '') {
        Lib.debug('render', `Starting renderGroupedTable with ${dataArray.length} categories. Query: "${query}"`);

        const container = document.getElementById('content') || document.querySelector('table.tbl')?.parentNode;
        if (!container) {
            Lib.error('render', 'Abort: #content container not found.');
            return;
        }

        let templateHead = null;
        const firstTable = document.querySelector('table.tbl');
        if (firstTable && firstTable.tHead) {
            Lib.debug('render', 'Cloning table head for template.');
            templateHead = firstTable.tHead.cloneNode(true);
            cleanupHeaders(templateHead);
        } else {
            Lib.error('render', 'No template table head found.');
        }

        let allH2s = Array.from(document.querySelectorAll('h2'));
        let targetHeader = null;

        Lib.debug('render', `Searching for target H2. Current pageType: ${pageType}`);

        if (!targetHeader) {
            Lib.debug('render', 'Target H2 not found by specific type, falling back to document position logic.');
            for (let i = 0; i < allH2s.length; i++) {
                if (allH2s[i].compareDocumentPosition(firstTable) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    targetHeader = allH2s[i];
                } else {
                    Lib.debug('render', `Stopping H2 search at index ${i}: table no longer follows this header.`);
                    break;
                }
            }
        }

        let targetH2Name = targetHeader ? targetHeader.textContent.trim().substring(0, 30) : 'Unknown';

        if (!query) {
            Lib.debug('render', 'No query provided; performing initial cleanup of existing elements.');
            // Updated cleanup: remove H3s and tables, but NEVER remove H3s containing 'span.worklink'
            container.querySelectorAll('h3, table.tbl, .mb-master-toggle').forEach(el => {
                if (el.tagName === 'H3' && el.querySelector('span.worklink')) {
                    Lib.debug('render', 'Skipping removal of H3 containing worklink.');
                    return;
                }
                el.remove();
            });

            if (targetHeader) {
                Lib.debug('render', ` Injecting master toggle and filter container after target header ${targetH2Name}.`);
                const masterToggle = document.createElement('span');
                masterToggle.className = 'mb-master-toggle';

                const showSpan = document.createElement('span');
                showSpan.textContent = 'Show';
                showSpan.title = 'Show all sub-tables';
                showSpan.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Lib.debug('render', 'Master toggle: Showing all tables.');
                    container.querySelectorAll('table.tbl').forEach(t => t.style.display = '');
                    container.querySelectorAll('.mb-toggle-h3').forEach(h => {
                        const icon = h.querySelector('.mb-toggle-icon');
                        if (icon) icon.textContent = '▼';
                    });
                };

                const hideSpan = document.createElement('span');
                hideSpan.textContent = 'Hide';
                hideSpan.title = 'Hide all sub-tables';
                hideSpan.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Lib.debug('render', 'Master toggle: Hiding all tables.');
                    container.querySelectorAll('table.tbl').forEach(t => t.style.display = 'none');
                    container.querySelectorAll('.mb-toggle-h3').forEach(h => {
                        const icon = h.querySelector('.mb-toggle-icon');
                        if (icon) icon.textContent = '▲';
                    });
                };

                let suffixText = ' all Types';
                masterToggle.appendChild(document.createTextNode('[ '));
                masterToggle.appendChild(showSpan);
                masterToggle.appendChild(document.createTextNode(' | '));
                masterToggle.appendChild(hideSpan);
                masterToggle.appendChild(document.createTextNode(' ]'));
                masterToggle.appendChild(document.createTextNode(suffixText));

                targetHeader.appendChild(masterToggle);

                // Append global filter here for grouped pages
                targetHeader.appendChild(filterContainer);
                filterContainer.style.display = 'inline-flex';
                filterContainer.style.marginLeft = '15px';
                filterContainer.style.verticalAlign = 'middle';
            }
        }

        const existingTables = container.querySelectorAll('table.tbl');

        if (query) {
            Lib.debug('render', `Filtering: Cleaning up overflow tables beyond data length (${dataArray.length}).`);
            existingTables.forEach((table, idx) => {
                if (idx >= dataArray.length) {
                    const h3 = table.previousElementSibling;
                    if (h3 && h3.classList.contains('mb-toggle-h3')) h3.remove();
                    table.remove();
                }
            });
        }

        // Track where to insert the elements
        let lastInsertedElement = targetHeader;

        dataArray.forEach((group, index) => {
            // Defensive check: ensure category exists
            const categoryName = group.category || group.key || 'Unknown';
            Lib.debug('render', `Processing group: "${categoryName}" with ${group.rows.length} rows.`);
            let table, h3, tbody;
            if (query && existingTables[index]) {
                Lib.debug('render', `Reusing existing table at index ${index} for group "${categoryName}".`);
                table = existingTables[index];
                h3 = table.previousElementSibling;
                tbody = table.querySelector('tbody');
                tbody.innerHTML = '';

                // Ensure sub-table controls exist even when reusing h3
                if (h3 && !h3.querySelector('.mb-subtable-controls')) {
                    Lib.debug('render', `Adding missing sub-table controls to existing h3 for "${categoryName}"`);
                    const subTableControls = document.createElement('span');
                    subTableControls.className = 'mb-subtable-controls';

                    const clearSubBtn = createClearColumnFiltersButton(table, categoryName);

                    const subFilterStatus = document.createElement('span');
                    subFilterStatus.className = 'mb-filter-status';
                    subFilterStatus.dataset.tableName = categoryName;
                    subFilterStatus.dataset.tableIndex = index.toString();

                    const subSortStatus = document.createElement('span');
                    subSortStatus.className = 'mb-sort-status';
                    subSortStatus.dataset.tableName = categoryName;
                    subSortStatus.dataset.tableIndex = index.toString();

                    subTableControls.appendChild(clearSubBtn);
                    subTableControls.appendChild(subFilterStatus);
                    subTableControls.appendChild(subSortStatus);
                    h3.appendChild(subTableControls);
                }
            } else {
                Lib.debug('render', `Creating new table and H3 for group "${categoryName}".`);
                h3 = document.createElement('h3');
                h3.className = 'mb-toggle-h3';
                h3.title = 'Click to Collapse/Uncollapse table section (Ctrl+Click to toggle ALL types)';
                h3.style.cursor = 'pointer';
                h3.style.userSelect = 'none';

                // Note: Sub-table controls will be added later in the if (!query) block
                // when h3.innerHTML is set, to avoid being wiped out

                table = document.createElement('table');
                table.className = 'tbl';
                // Apply indentation to the table to match the sub-header
                table.style.marginLeft = '1.5em';
                table.style.width = 'calc(100% - 1.5em)';
                if (templateHead) table.appendChild(templateHead.cloneNode(true));
                addColumnFilterRow(table);
                tbody = document.createElement('tbody');
                table.appendChild(tbody);
            }

            // Optimize: Use DocumentFragment for large groups
            const chunkThreshold = Lib.settings.sa_chunked_render_threshold || 1000;
            if (chunkThreshold > 0 && group.rows.length >= chunkThreshold) {
                const fragment = document.createDocumentFragment();
                group.rows.forEach(r => fragment.appendChild(r));
                tbody.appendChild(fragment);
            } else {
                group.rows.forEach(r => tbody.appendChild(r));
            }

            if (!query) {
                // Logic changed: Do not hide the table or H3 even if group.rows.length is 0
                table.style.display = '';
                h3.style.display = '';

                // Defensive check: ensure category exists, fallback to "Unknown"
                const categoryName = group.category || group.key || 'Unknown';
                const catLower = categoryName.toLowerCase();
                const shouldStayOpen = (catLower === 'album' || catLower === 'official') && group.rows.length < Lib.settings.sa_auto_expand;
                table.style.display = shouldStayOpen ? '' : 'none';
                Lib.debug('render', `Group "${categoryName}" auto-expand status: ${shouldStayOpen}`);

                // Ensure the H3 text reflects the unique name established during fetching and Capitalize the first or second character
                let h3DisplayName = categoryName;
                if (h3DisplayName.length > 0) {
                    // Check if the first character is the typographic opening double quote “
                    if (h3DisplayName.startsWith('“') && h3DisplayName.length > 1) {
                        h3DisplayName = h3DisplayName[0] + h3DisplayName.charAt(1).toUpperCase() + h3DisplayName.slice(2);
                    } else {
                        h3DisplayName = h3DisplayName.charAt(0).toUpperCase() + h3DisplayName.slice(1);
                    }
                }

                h3.innerHTML = `<span class="mb-toggle-icon">${shouldStayOpen ? '▼' : '▲'}</span>${h3DisplayName} <span class="mb-row-count-stat">(${group.rows.length})</span>`;

                // Add sub-table controls: Clear button and separate status displays
                const subTableControls = document.createElement('span');
                subTableControls.className = 'mb-subtable-controls';

                // Create clear column filters button for this sub-table
                const clearSubBtn = createClearColumnFiltersButton(table, categoryName);

                // Create separate filter and sort status displays for this sub-table
                const subFilterStatus = document.createElement('span');
                subFilterStatus.className = 'mb-filter-status';
                subFilterStatus.dataset.tableName = categoryName;
                subFilterStatus.dataset.tableIndex = index.toString();

                const subSortStatus = document.createElement('span');
                subSortStatus.className = 'mb-sort-status';
                subSortStatus.dataset.tableName = categoryName;
                subSortStatus.dataset.tableIndex = index.toString();

                subTableControls.appendChild(clearSubBtn);
                subTableControls.appendChild(subFilterStatus);
                subTableControls.appendChild(subSortStatus);
                h3.appendChild(subTableControls);

                // Placement Logic: If targetHeader exists, insert after it/previous element. Otherwise, append to container.
                if (lastInsertedElement) {
                    lastInsertedElement.after(h3);
                    h3.after(table);
                    lastInsertedElement = table; // Update pointer for the next group
                } else {
                    container.appendChild(h3);
                    container.appendChild(table);
                }

                // Add "Show all" button if a seeAllUrl was found — inserted at the beginning of subTableControls
                if (group.seeAllUrl) {
                    const showAllBtn = document.createElement('button');
                    // Use the stored seeAllCount to update button text
                    const countSuffix = group.seeAllCount ? ` ${group.seeAllCount}` : '';
                    showAllBtn.textContent = `Show all${countSuffix}`;
                    showAllBtn.className = 'mb-show-all-subtable-btn';
                    showAllBtn.type = 'button';
                    showAllBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const targetUrl = new URL(group.seeAllUrl, window.location.origin).href;
                        Lib.debug('navigation', `Opening overflow table: ${targetUrl} (New tab: ${Lib.settings.sa_render_overflow_tables_in_new_tab})`);

                        // Set the URL and trigger the global startFetchingProcess logic
                        if (Lib.settings.sa_render_overflow_tables_in_new_tab) {
                            window.open(targetUrl, '_blank');
                        } else {
                            window.location.href = targetUrl;
                        }
                    };
                    subTableControls.insertBefore(showAllBtn, subTableControls.firstChild);
                }

                h3.addEventListener('click', (e) => {
                    // Prevent triggering if clicking on interactive elements (buttons)
                    if (['A', 'BUTTON', 'INPUT', 'LABEL', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) ||
                        e.target.closest('.mb-subtable-controls')) {
                        return;
                    }

                    e.preventDefault();
                    e.stopPropagation();

                    if (e.ctrlKey || e.metaKey) {
                        // Ctrl+Click: Toggle ALL h3 headers
                        const isExpanding = table.style.display === 'none';
                        const allH3s = document.querySelectorAll('.mb-toggle-h3');
                        const allTables = document.querySelectorAll('table.tbl');

                        if (isExpanding) {
                            // Show all
                            allTables.forEach(t => t.style.display = '');
                            allH3s.forEach(h => {
                                const icon = h.querySelector('.mb-toggle-icon');
                                if (icon) icon.textContent = '▼';
                            });
                            Lib.debug('render', 'All h3 headers (types) shown via Ctrl+Click');
                        } else {
                            // Hide all
                            allTables.forEach(t => t.style.display = 'none');
                            allH3s.forEach(h => {
                                const icon = h.querySelector('.mb-toggle-icon');
                                if (icon) icon.textContent = '▲';
                            });
                            Lib.debug('render', 'All h3 headers (types) hidden via Ctrl+Click');
                        }
                    } else {
                        // Normal click: Toggle just this h3
                        const isHidden = table.style.display === 'none';
                        Lib.debug('render', `Toggling table for "${categoryName}". New state: ${isHidden ? 'visible' : 'hidden'}`);
                        table.style.display = isHidden ? '' : 'none';
                        h3.querySelector('.mb-toggle-icon').textContent = isHidden ? '▼' : '▲';
                    }
                });
                makeTableSortableUnified(table, `${categoryName}_${index}`);
            } else if (h3 && h3.classList.contains('mb-toggle-h3')) {
                // Update the count in the header during filtering
                const countStat = h3.querySelector('.mb-row-count-stat');
                const totalInGroup = groupedRows.find(g => (g.category || g.key || 'Unknown') === categoryName)?.rows.length || 0;
                if (countStat) {
                    countStat.textContent = (group.rows.length === totalInGroup) ? `(${totalInGroup})` : `(${group.rows.length} of ${totalInGroup})`;
                }

                // Ensure sub-table controls exist (they may be missing if table was created during initial filter)
                if (!h3.querySelector('.mb-subtable-controls')) {
                    Lib.debug('render', `Adding missing sub-table controls during filtering for "${categoryName}"`);
                    const subTableControls = document.createElement('span');
                    subTableControls.className = 'mb-subtable-controls';

                    const clearSubBtn = createClearColumnFiltersButton(table, categoryName);

                    const subFilterStatus = document.createElement('span');
                    subFilterStatus.className = 'mb-filter-status';
                    subFilterStatus.dataset.tableName = categoryName;
                    subFilterStatus.dataset.tableIndex = index.toString();

                    const subSortStatus = document.createElement('span');
                    subSortStatus.className = 'mb-sort-status';
                    subSortStatus.dataset.tableName = categoryName;
                    subSortStatus.dataset.tableIndex = index.toString();

                    subTableControls.appendChild(clearSubBtn);
                    subTableControls.appendChild(subFilterStatus);
                    subTableControls.appendChild(subSortStatus);
                    h3.appendChild(subTableControls);
                }
            }
        });
        Lib.debug('render', 'Finished renderGroupedTable.');

        // Show the save button now that data is rendered
        if (Lib.settings.sa_enable_save_load) {
            saveToDiskBtn.style.display = 'inline-block';
        }
    }

    /**
     * Logic to make all H2 headers collapsible.
     */
    function makeH2sCollapsible() {
        Lib.debug('render', 'Initializing collapsible H2 headers...');
        // Capture all H2s currently in the document to allow peer filtering later
        const allH2s = Array.from(document.querySelectorAll('h2'));

        allH2s.forEach(h2 => {
            if (h2.classList.contains('mb-h2-processed')) return;
            h2.classList.add('mb-h2-processed', 'mb-toggle-h2');
            h2.title = 'Click to Collapse/Uncollapse section (Ctrl+Click to toggle ALL sections)';
            h2.style.cursor = 'pointer'; // Make entire H2 header indicate clickability
            h2.style.userSelect = 'none'; // Prevent text selection when clicking

            // Find elements between this H2 and the next H2
            const contentNodes = [];
            let next = h2.nextElementSibling;
            while (next && next.tagName !== 'H2') {
                contentNodes.push(next);
                next = next.nextElementSibling;
            }

            // Identify if this is the target H2 with row-count stat
            const isMainDataHeader = !!h2.querySelector('.mb-row-count-stat');
            const icon = document.createElement('span');
            icon.className = 'mb-toggle-icon';
            icon.textContent = isMainDataHeader ? '▼' : '▲';
            h2.prepend(icon);

            // Hide content if not the main data header
            if (!isMainDataHeader) {
                contentNodes.forEach(node => node.style.display = 'none');
            }

            // Re-append filter container if it was part of children, to ensure correct order
            // (Note: We do NOT wrap children in a span anymore, to ensure the H2 background remains clickable)
            if (Array.from(h2.childNodes).includes(filterContainer)) h2.appendChild(filterContainer);

            // 1. Define Toggle Function on the Element
            h2._mbToggle = (forceExpand) => {
                const isCurrentlyExpanded = icon.textContent === '▼';
                const shouldExpand = (forceExpand !== undefined) ? forceExpand : !isCurrentlyExpanded;

                if (shouldExpand === isCurrentlyExpanded) return;

                contentNodes.forEach(node => {
                    if (shouldExpand) {
                        // Expansion logic: always show headers, but check H3 state for tables
                        if (node.tagName === 'H3' && node.classList.contains('mb-toggle-h3')) {
                            node.style.display = '';
                        } else if (node.tagName === 'TABLE' && node.classList.contains('tbl')) {
                            const prevH3 = node.previousElementSibling;
                            if (prevH3 && prevH3.classList.contains('mb-toggle-h3')) {
                                const subIcon = prevH3.querySelector('.mb-toggle-icon');
                                // Only show table if sub-heading is currently marked as expanded (▼)
                                if (subIcon && subIcon.textContent === '▼') {
                                    node.style.display = '';
                                }
                            } else {
                                node.style.display = '';
                            }
                        } else {
                            node.style.display = '';
                        }
                    } else {
                        // Collapse logic: hide everything under this H2
                        node.style.display = 'none';
                    }
                });

                icon.textContent = shouldExpand ? '▼' : '▲';
            };

            // 2. Click event for the entire H2 header
            const toggleFn = (e) => {
                // GUARD CLAUSE: Don't toggle if clicking on interactive elements (Filter input, Master Toggle links, Checkboxes)
                if (['A', 'BUTTON', 'INPUT', 'LABEL', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) ||
                    e.target.closest('.mb-master-toggle') ||
                    (filterContainer && filterContainer.contains(e.target))) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                const isExpanding = icon.textContent === '▲';

                if (e.ctrlKey) {
                    // Logic to toggle all peers in the same container (sidebar vs main)
                    const sidebar = document.getElementById('sidebar');
                    const isInsideSidebar = sidebar && sidebar.contains(h2);

                    const peers = allH2s.filter(peer => {
                        if (!document.body.contains(peer)) return false;
                        const peerInSidebar = sidebar && sidebar.contains(peer);
                        return peerInSidebar === isInsideSidebar;
                    });

                    peers.forEach(peer => {
                        if (typeof peer._mbToggle === 'function') {
                            peer._mbToggle(isExpanding);
                        }
                    });
                } else {
                    h2._mbToggle(isExpanding);
                }
            };

            // Attach event listener directly to the H2 container
            h2.addEventListener('click', toggleFn);
        });
    }

    /**
     * Unified sorting logic for both single and multi-table pages.
     * Handles UI highlighting, wait cursors, and state persistence.
     *
     * @param {HTMLElement} table - The table element to attach sorters to.
     * @param {string} sortKey - Unique key for state persistence (e.g., "Album_0" or "main_table").
     */
    function makeTableSortableUnified(table, sortKey) {
        // Determine mode based on active definition
        const isMultiTable = activeDefinition && activeDefinition.tableMode === 'multi';

        const headers = table.querySelectorAll('thead tr:first-child th');

        // State shape: { lastSortIndex, sortState, multiSortColumns }
        // sortState: 0 = original ⇅, 1 = asc ▲, 2 = desc ▼
        // multiSortColumns: [{ colIndex, direction }] in priority order (supported on ALL page types)
        if (!multiTableSortStates.has(sortKey)) {
            multiTableSortStates.set(sortKey, {
                lastSortIndex: -1,
                sortState: 0,
                multiSortColumns: []
            });
        }
        const state = multiTableSortStates.get(sortKey);

        // --- Helper: render tiny superscript priority numbers (¹²³…) -------
        const getSuperscript = (n) => {
            const sup = ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];
            return String(n).split('').map(d => sup[parseInt(d)]).join('');
        };

        // --- Helper: refresh all sort-icon visuals for the current multi-sort state ---
        const updateMultiSortVisuals = () => {
            // First clear every icon
            table.querySelectorAll('.sort-icon-btn').forEach(btn => {
                btn.classList.remove('sort-icon-active');
                btn.textContent = btn.textContent.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '');
            });
            if (state.multiSortColumns.length === 0) return;
            // Mark each active column with its priority superscript
            state.multiSortColumns.forEach((sortCol, idx) => {
                const th = headers[sortCol.colIndex];
                if (!th) return;
                const orderSup = getSuperscript(idx + 1);
                th.querySelectorAll('.sort-icon-btn').forEach(icon => {
                    const bare = icon.textContent.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '');
                    if ((bare === '▲' && sortCol.direction === 1) ||
                        (bare === '▼' && sortCol.direction === 2)) {
                        icon.classList.add('sort-icon-active');
                        icon.textContent = bare + orderSup;
                    }
                });
            });
        };

        // --- Helper: apply column-group background tints for all active multi-sort columns ---
        // Semi-transparent colours overlay the existing even/odd zebra striping without erasing it.
        const applyMultiSortColumnTints = () => {
            // Clear any existing tint classes first so a re-apply starts clean
            clearMultiSortColumnTints();
            if (state.multiSortColumns.length === 0) return;

            const palette = [
                'mb-mscol-0', 'mb-mscol-1', 'mb-mscol-2', 'mb-mscol-3',
                'mb-mscol-4', 'mb-mscol-5', 'mb-mscol-6', 'mb-mscol-7'
            ];
            const hdrPalette = [
                'mb-mscol-hdr-0', 'mb-mscol-hdr-1', 'mb-mscol-hdr-2', 'mb-mscol-hdr-3',
                'mb-mscol-hdr-4', 'mb-mscol-hdr-5', 'mb-mscol-hdr-6', 'mb-mscol-hdr-7'
            ];

            state.multiSortColumns.forEach((sortCol, priorityIdx) => {
                const colIdx = sortCol.colIndex;
                const bodyClass = palette[priorityIdx % palette.length];
                const hdrClass  = hdrPalette[priorityIdx % hdrPalette.length];

                // Tint all tbody cells in this column
                table.querySelectorAll(`tbody tr`).forEach(tr => {
                    const cell = tr.cells[colIdx];
                    if (cell) cell.classList.add(bodyClass);
                });

                // Tint the header cell (main header row only, not the filter row)
                const mainHeaderRow = table.querySelector('thead tr:first-child');
                if (mainHeaderRow) {
                    const th = mainHeaderRow.cells[colIdx];
                    if (th) th.classList.add(hdrClass);
                }
            });
        };

        // --- Helper: remove all multi-sort column tint classes from this table ---
        const clearMultiSortColumnTints = () => {
            const allTintClasses = [
                'mb-mscol-0','mb-mscol-1','mb-mscol-2','mb-mscol-3',
                'mb-mscol-4','mb-mscol-5','mb-mscol-6','mb-mscol-7',
                'mb-mscol-hdr-0','mb-mscol-hdr-1','mb-mscol-hdr-2','mb-mscol-hdr-3',
                'mb-mscol-hdr-4','mb-mscol-hdr-5','mb-mscol-hdr-6','mb-mscol-hdr-7'
            ];
            table.querySelectorAll('tbody td, thead tr:first-child th').forEach(cell => {
                cell.classList.remove(...allTintClasses);
            });
        };

        // --- Helper: derive clean column name from a th element ---------------
        const getCleanColName = (th) =>
            th ? th.textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim() : '';

        // --- Helper: is a column name numeric? ---------------------------------
        const isNumericCol = (name) =>
            name.includes('Year') || name.includes('Releases') || name.includes('Track') ||
            name.includes('Length') || name.includes('Rating') || name.includes('#');

        // -----------------------------------------------------------------------
        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'default';

            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            th.innerHTML = ''; // clear for new icon layout

            const createIcon = (char, targetState) => {
                const span = document.createElement('span');
                span.className = 'sort-icon-btn';

                // Tooltips reflect the Ctrl+Click multi-sort model on all page types
                if (char === '⇅') span.title = 'Restore original order (clears multi-sort)';
                else if (char === '▲') span.title = 'Sort ascending — Ctrl+Click to add to multi-column sort';
                else if (char === '▼') span.title = 'Sort descending — Ctrl+Click to add to multi-column sort';

                // Restore active indicator for single-column state after re-render
                // (multi-sort visuals are restored by the updateMultiSortVisuals call at the end)
                if (state.multiSortColumns.length === 0 &&
                    state.lastSortIndex === index && state.sortState === targetState) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;

                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // === Identify target data ===
                    let targetRows = [], originalRows = [], targetGroup = null;
                    if (isMultiTable) {
                        const groupIndex = parseInt(sortKey.split('_').pop(), 10);
                        targetGroup = groupedRows[groupIndex];
                        if (targetGroup) {
                            targetRows = targetGroup.rows;
                            originalRows = targetGroup.originalRows;
                        }
                    } else {
                        targetRows = allRows;
                        originalRows = originalAllRows;
                    }

                    const rowCount = targetRows.length;
                    const showWaitCursor = rowCount > 1000;
                    const isCtrl = e.ctrlKey || e.metaKey;

                    // === Update sort state ===
                    if (isCtrl && targetState !== 0) {
                        // Ctrl+Click on ▲ or ▼: add / update / remove from multi-sort chain.
                        //
                        // Special case: if we are entering multi-sort from a plain single-sort
                        // state (chain is empty but a column is already sorted), automatically
                        // promote that existing sorted column as priority 1 in the chain, then
                        // append the newly Ctrl+clicked column as priority 2.  This means the
                        // user never has to re-click the first column just to seed the chain.
                        if (state.multiSortColumns.length === 0 &&
                            state.lastSortIndex !== -1 &&
                            state.lastSortIndex !== index &&
                            state.sortState !== 0) {
                            // Seed chain with the already-sorted column
                            state.multiSortColumns.push({ colIndex: state.lastSortIndex, direction: state.sortState });
                            Lib.debug('sort', `Seeded multi-sort chain with already-sorted column ${state.lastSortIndex} (direction ${state.sortState})`);
                        }

                        const existing = state.multiSortColumns.findIndex(c => c.colIndex === index);
                        if (existing !== -1) {
                            if (state.multiSortColumns[existing].direction === targetState) {
                                // Same direction clicked again → remove this column
                                state.multiSortColumns.splice(existing, 1);
                                Lib.debug('sort', `Removed column ${index} from multi-sort (${state.multiSortColumns.length} remain)`);
                            } else {
                                // Different direction → update direction only
                                state.multiSortColumns[existing].direction = targetState;
                                Lib.debug('sort', `Updated column ${index} direction in multi-sort`);
                            }
                        } else {
                            state.multiSortColumns.push({ colIndex: index, direction: targetState });
                            Lib.debug('sort', `Added column ${index} to multi-sort (position ${state.multiSortColumns.length})`);
                        }
                        state.lastSortIndex = index;
                        state.sortState = targetState;
                    } else {
                        // Plain click (no Ctrl), or ⇅ clicked:
                        // always single-sort mode — clear the multi-sort chain.
                        state.multiSortColumns = [];
                        clearMultiSortColumnTints();
                        state.lastSortIndex = targetState === 0 ? -1 : index;
                        state.sortState = targetState;
                    }

                    // === Debug log ===
                    if (state.multiSortColumns.length > 1) {
                        const colList = state.multiSortColumns.map(c =>
                            `"${getCleanColName(headers[c.colIndex])}"${c.direction === 1 ? '▲' : '▼'}`
                        ).join(', ');
                        Lib.debug('sort', `Multi-sorting table "${sortKey}" by [${colList}]. Row count: ${rowCount}`);
                    } else {
                        const icon = targetState === 0 ? '⇅' : (targetState === 1 ? '▲' : '▼');
                        Lib.debug('sort', `Sorting table "${sortKey}" by column: "${getCleanColName(headers[index])}" ${icon} (index: ${index}) to state ${targetState}. Row count: ${rowCount}`);
                    }

                    // === Status display: show "Sorting…" immediately ===
                    const sortStatusDisplay = document.getElementById('mb-sort-status-display');
                    if (sortStatusDisplay) {
                        sortStatusDisplay.textContent = '⏳ Sorting...';
                        sortStatusDisplay.style.color = 'orange';
                    }

                    if (showWaitCursor) document.body.classList.add('mb-sorting-active');

                    (async () => {
                        try {
                            const startSort = performance.now();

                            // === Visual update ===
                            if (state.multiSortColumns.length > 0) {
                                updateMultiSortVisuals();
                                applyMultiSortColumnTints();
                            } else {
                                // Single-column: one active icon, remove all tints
                                clearMultiSortColumnTints();
                                table.querySelectorAll('.sort-icon-btn').forEach(btn => {
                                    btn.classList.remove('sort-icon-active');
                                    btn.textContent = btn.textContent.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '');
                                });
                                span.classList.add('sort-icon-active');
                            }

                            // === Perform sort ===
                            const isRestore = state.multiSortColumns.length === 0 &&
                                              (state.sortState === 0 || targetState === 0);

                            let sortedData;
                            if (isRestore) {
                                sortedData = [...originalRows];
                            } else {
                                sortedData = [...targetRows];
                                let compareFn;

                                if (state.multiSortColumns.length > 1) {
                                    // True multi-column sort
                                    compareFn = createMultiColumnComparator(state.multiSortColumns, headers);
                                } else if (state.multiSortColumns.length === 1) {
                                    // Single entry in chain (Ctrl+clicked one column)
                                    const col = state.multiSortColumns[0];
                                    const cn = getCleanColName(headers[col.colIndex]);
                                    compareFn = createSortComparator(col.colIndex, col.direction === 1, isNumericCol(cn));
                                } else {
                                    // Plain single-column sort
                                    const cn = getCleanColName(headers[index]);
                                    compareFn = createSortComparator(index, state.sortState === 1, isNumericCol(cn));
                                }

                                await sortLargeArray(sortedData, compareFn, null);
                            }

                            // === Apply sorted data ===
                            if (isMultiTable && targetGroup) {
                                targetGroup.rows = sortedData;
                            } else {
                                allRows = sortedData;
                            }

                            runFilter();

                            const durationMs = (performance.now() - startSort).toFixed(0);
                            const colorByDuration = durationMs > 2000 ? 'red' : (durationMs > 1000 ? 'orange' : 'green');

                            // === Update status display ===
                            if (sortStatusDisplay) {
                                if (isMultiTable) {
                                    // Sub-table sort status written into the h3's own .mb-sort-status span
                                    const h3 = table.previousElementSibling;
                                    if (h3 && h3.classList.contains('mb-toggle-h3')) {
                                        const subSortStatus = h3.querySelector('.mb-sort-status');
                                        if (subSortStatus) {
                                            if (isRestore) {
                                                subSortStatus.textContent = `✓ Restored to original order (${rowCount} rows)`;
                                                subSortStatus.style.color = 'green';
                                            } else if (state.multiSortColumns.length > 1) {
                                                const colNames = state.multiSortColumns.map(c => {
                                                    const n = getCleanColName(headers[c.colIndex]);
                                                    return `"${n}"${c.direction === 1 ? '▲' : '▼'}`;
                                                }).join(', ');
                                                subSortStatus.textContent = `✓ Multi-sorted by: ${colNames} (${rowCount} rows in ${durationMs}ms)`;
                                                subSortStatus.style.color = colorByDuration;
                                            } else {
                                                const col = state.multiSortColumns.length === 1 ? state.multiSortColumns[0] : null;
                                                const dispIdx  = col ? col.colIndex : index;
                                                const dispIcon = col ? (col.direction === 1 ? '▲' : '▼')
                                                                     : (state.sortState === 1 ? '▲' : '▼');
                                                subSortStatus.textContent = `✓ Sorted by column "${getCleanColName(headers[dispIdx])}" ${dispIcon}: ${rowCount} rows in ${durationMs}ms`;
                                                subSortStatus.style.color = colorByDuration;
                                            }
                                        }
                                    }
                                    sortStatusDisplay.textContent = ''; // clear main display on multi-table pages
                                } else if (isRestore) {
                                    sortStatusDisplay.textContent = `✓ Restored to original order (${rowCount} rows)`;
                                    sortStatusDisplay.style.color = 'green';
                                } else if (state.multiSortColumns.length > 1) {
                                    const colNames = state.multiSortColumns.map(c => {
                                        const n = getCleanColName(headers[c.colIndex]);
                                        return `"${n}"${c.direction === 1 ? '▲' : '▼'}`;
                                    }).join(', ');
                                    sortStatusDisplay.textContent = `✓ Multi-sorted by: ${colNames} (${rowCount} rows in ${durationMs}ms)`;
                                    sortStatusDisplay.style.color = colorByDuration;
                                } else {
                                    // Single-column (including the single-entry Ctrl+Click chain)
                                    const col = state.multiSortColumns.length === 1 ? state.multiSortColumns[0] : null;
                                    const dispIdx  = col ? col.colIndex : index;
                                    const dispIcon = col ? (col.direction === 1 ? '▲' : '▼')
                                                         : (state.sortState === 1 ? '▲' : '▼');
                                    sortStatusDisplay.textContent = `✓ Sorted by column "${getCleanColName(headers[dispIdx])}" ${dispIcon}: ${rowCount} rows in ${durationMs}ms`;
                                    sortStatusDisplay.style.color = colorByDuration;
                                }
                            }

                            Lib.debug('sort', `Sort completed in ${durationMs}ms for ${rowCount} rows`);

                        } catch (error) {
                            Lib.error('sort', 'Error during sort:', error);
                            if (sortStatusDisplay) {
                                sortStatusDisplay.textContent = '✗ Sort failed';
                                sortStatusDisplay.style.color = 'red';
                            }
                        } finally {
                            if (showWaitCursor) document.body.classList.remove('mb-sorting-active');
                        }
                    })();
                };
                return span;
            };

            th.appendChild(createIcon('⇅', 0));
            th.appendChild(document.createTextNode(` ${colName} `));
            th.appendChild(createIcon('▲', 1));
            th.appendChild(createIcon('▼', 2));
        });

        // Restore multi-sort visuals and column tints if state already has columns in the chain
        // (called on every re-render triggered by runFilter after a sort)
        if (state.multiSortColumns.length > 0) {
            updateMultiSortVisuals();
            applyMultiSortColumnTints();
        }
    }

    /**
     * Removes all consecutive <br> tags found in the document,
     * leaving only a single <br> if multiple were found together.
     * Logs the occurrences and count of tags removed.
     */
    function finalCleanup() {
        Lib.debug('cleanup', 'Running final cleanup...');

        // Call the specific container removal again
        const sanojIds = ['load', 'load2', 'load3', 'load4', 'bottom1', 'bottom2', 'bottom3', 'bottom4', 'bottom5', 'bottom6'];
        let foundSanoj = false;
        sanojIds.forEach(id => {
            if (document.getElementById(id)) foundSanoj = true;
        });

        if (foundSanoj) {
            Lib.debug('cleanup', 'Sanojjonas elements found during final cleanup. Removing now...');
            removeSanojjonasContainers();
        } else {
            Lib.debug('cleanup', 'No Sanojjonas elements found during final cleanup.');
        }

        const brs = document.querySelectorAll('br');
        let totalRemoved = 0;
        let instancesFound = 0;

        for (let i = 0; i < brs.length; i++) {
            // Check if element is still in DOM (might have been removed in previous iteration)
            if (!brs[i].parentNode) continue;

            let removedInThisInstance = 0;
            let next = brs[i].nextSibling;

            // Check for consecutive <br> tags, ignoring empty whitespace nodes
            while (next && (next.nodeName === 'BR' || (next.nodeType === 3 && !/[^\t\n\r ]/.test(next.textContent)))) {
                let toRemove = next;
                next = next.nextSibling;
                if (toRemove.nodeName === 'BR') {
                    toRemove.remove();
                    removedInThisInstance++;
                }
            }

            if (removedInThisInstance > 0) {
                instancesFound++;
                totalRemoved += removedInThisInstance;
                Lib.debug('cleanup', `Found consecutive <br> tags: removed ${removedInThisInstance} tags at instance ${instancesFound}.`);
            }
        }

        if (totalRemoved > 0) {
            Lib.debug('cleanup', `Final cleanup complete: Removed a total of ${totalRemoved} consecutive <br> tags across ${instancesFound} locations.`);
        } else {
            Lib.debug('cleanup', 'Final cleanup complete: No consecutive <br> tags found.');
        }
    }

    /**
     * Cleans up original page elements (like pagination) after data is loaded directly from disk.
     * This ensures that irrelevant navigation or structural elements from the initial page load
     * do not clutter the consolidated view when bypassing the standard fetch process.
     * Designed to be easily expandable for future UI cleanup requirements.
     */
    function cleanupAfterInitialLoad() {
        Lib.debug('cleanup', 'Running cleanup after initial data load from disk...');

        // 1. Remove pagination elements
        const paginationElements = document.querySelectorAll('ul.pagination, nav.pagination, .pageselector');
        if (paginationElements.length > 0) {
            paginationElements.forEach(el => el.remove());
            Lib.debug('cleanup', `Removed ${paginationElements.length} pagination elements.`);
        }

        // --- Expandable section for future cleanup tasks ---

        // 2. Add future element removals here:
        // const otherElements = document.querySelectorAll('.some-other-class');
        // if (otherElements.length > 0) {
        //     otherElements.forEach(el => el.remove());
        //     Lib.debug('cleanup', `Removed ${otherElements.length} other elements.`);
        // }
    }

    /**
     * Gets a table cell by its logical column index, accounting for cells with colspan attributes
     * @param {HTMLTableRowElement} row - The table row to search in
     * @param {number} logicalIdx - The logical column index (0-based)
     * @returns {HTMLTableCellElement|null} The cell at the logical index, or null if not found
     */
    function getCellByLogicalIndex(row, logicalIdx) {
        let col = 0;
        for (const cell of row.cells) {
            const span = cell.colSpan || 1;
            if (col + span > logicalIdx) return cell;
            col += span;
        }
        return null;
    }

    /**
     * Fetches HTML content from a URL using GM_xmlhttpRequest
     * @param {string} url - The URL to fetch
     * @returns {Promise<string>} Promise that resolves with the HTML response text
     */
    function fetchHtml(url) {
        Lib.debug('fetch', `Initiating fetch for URL: ${url}`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: (res) => resolve(res.responseText),
                onerror: reject
            });
        });
    }

    /**
     * Serializes current table data (allRows or groupedRows) to JSON and triggers download
     */
    function saveTableDataToDisk() {
        Lib.debug('cache', 'Starting table data serialization...');

        if (!isLoaded) {
            alert('No data loaded yet. Please fetch data first before saving.');
            return;
        }

        try {
            let dataToSave = {
                version: '1.0',
                url: window.location.href,
                pageType: pageType,
                timestamp: Date.now(),
                timestampReadable: new Date().toISOString(),
                tableMode: activeDefinition.tableMode,
                rowCount: 0,
                headers: null,
                rows: null,
                groups: null
            };

            // Serialize table headers (exclude the filter row)
            const firstTable = document.querySelector('table.tbl');
            if (firstTable && firstTable.tHead) {
                const headerRows = Array.from(firstTable.tHead.querySelectorAll('tr'))
                    .filter(row => !row.classList.contains('mb-col-filter-row')); // Exclude filter row
                dataToSave.headers = headerRows.map(row => {
                    return Array.from(row.cells).map(cell => ({
                        html: cell.innerHTML,
                        colSpan: cell.colSpan || 1,
                        rowSpan: cell.rowSpan || 1,
                        tagName: cell.tagName
                    }));
                });
            }

            // Serialize based on table mode
            if (activeDefinition.tableMode === 'multi' && groupedRows.length > 0) {
                // Multi-table mode: serialize grouped data
                dataToSave.groups = groupedRows.map(group => ({
                    key: group.key,
                    category: group.category,
                    rows: group.rows.map(row => {
                        return Array.from(row.cells).map(cell => ({
                            html: cell.innerHTML,
                            colSpan: cell.colSpan || 1,
                            rowSpan: cell.rowSpan || 1
                        }));
                    })
                }));
                dataToSave.rowCount = groupedRows.reduce((sum, g) => sum + g.rows.length, 0);
                Lib.debug('cache', `Serialized ${dataToSave.groups.length} groups with ${dataToSave.rowCount} total rows.`);
            } else if (allRows.length > 0) {
                // Single-table mode: serialize allRows
                dataToSave.rows = allRows.map(row => {
                    return Array.from(row.cells).map(cell => ({
                        html: cell.innerHTML,
                        colSpan: cell.colSpan || 1,
                        rowSpan: cell.rowSpan || 1
                    }));
                });
                dataToSave.rowCount = allRows.length;
                Lib.debug('cache', `Serialized ${dataToSave.rowCount} rows.`);
            } else {
                alert('No table data available to save.');
                return;
            }

            // Create JSON blob and trigger download
            const jsonStr = JSON.stringify(dataToSave, null, 2);

            // Compress with gzip using pako library
            const startTime = performance.now();
            const compressedData = pako.gzip(jsonStr);
            const compressionTime = performance.now() - startTime;

            const originalSize = new Blob([jsonStr]).size;
            const compressedSize = compressedData.length;
            const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

            Lib.debug('cache', `Compression: ${originalSize.toLocaleString()} bytes → ${compressedSize.toLocaleString()} bytes (${compressionRatio}% smaller) in ${compressionTime.toFixed(2)}ms`);

            const blob = new Blob([compressedData], { type: 'application/gzip' });
            const url = URL.createObjectURL(blob);

            // Generate filename based on page type and timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `mb-${pageType}-${timestamp}.json.gz`;

            triggerStandardDownload(url, filename);
            infoDisplay.textContent = `✓ Serialized ${dataToSave.rowCount} rows to ${filename}`;
            infoDisplay.style.color = 'green';


        } catch (err) {
            Lib.error('cache', 'Failed to serialize table data:', err);
            alert('Failed to save data: ' + err.message);
        }
    }

    /**
     * Standard download fallback using an anchor element with user notification
     * @param {string} url - The blob URL to download from
     * @param {string} filename - The filename to save as
     */
    function triggerStandardDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        Lib.debug('cache', `Data saved to ${filename}`);

        // --- INFO POPUP TO ALERT USER (WITH FADE OUT) ---
        const infoPopup = document.createElement('div');
        infoPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #888;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            font-family: sans-serif;
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        const msg = document.createElement('div');
        msg.textContent = 'Saving of JSON table data to the filesystem initiated. Please monitor your browser for the file download.';
        msg.style.marginBottom = '15px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid #555;
            background-color: #f0f0f0;
        `;
        closeBtn.type = 'button';

        // Close function with fade out
        const closePopup = () => {
            infoPopup.style.opacity = '0';
            // Remove from DOM after transition
            setTimeout(() => {
                if (infoPopup.parentNode) infoPopup.parentNode.removeChild(infoPopup);
                document.removeEventListener('keydown', onEscape);
            }, 300); // match the CSS transition duration
        };

        // Button click closes popup
        closeBtn.addEventListener('click', closePopup);

        // Escape key closes popup
        const onEscape = (e) => {
            if (e.key === 'Escape') closePopup();
        };
        document.addEventListener('keydown', onEscape);

        infoPopup.appendChild(msg);
        infoPopup.appendChild(closeBtn);
        document.body.appendChild(infoPopup);
    }

    /**
     * Loads table data from a JSON file and re-hydrates the page
     * @param {File} file - The JSON file containing saved table data
     * @param {string} filterQueryRaw - Pre-filter query string to apply during load
     * @param {boolean} isCaseSensitive - Whether the pre-filter should be case-sensitive
     * @param {boolean} isRegExp - Whether the pre-filter should be treated as a regular expression
     */
    async function loadTableDataFromDisk(file, filterQueryRaw = '', isCaseSensitive = false, isRegExp = false) {
        if (!file) {
            Lib.warn('cache', 'No file selected.');
            return;
        }

        const filterQuery = (isCaseSensitive || isRegExp) ? filterQueryRaw : filterQueryRaw.toLowerCase();

        // Clear previous status message
        preFilterMsg.textContent = '';

        let globalRegex = null;
        if (filterQueryRaw && isRegExp) {
            try {
                globalRegex = new RegExp(filterQueryRaw, isCaseSensitive ? '' : 'i');
            } catch (e) {
                await showCustomAlert(
                    'Invalid Regular Expression in load filter field. Load aborted.',
                    '❌ Invalid Regex',
                    loadFromDiskBtn
                );
                // Reset file input so change event fires again if they pick same file
                fileInput.value = '';
                return;
            }
        }

        Lib.debug('cache', `Loading data from file: ${file.name}. Prefilter active: ${!!filterQueryRaw}`);

        const reader = new FileReader();

        // Determine if file is compressed based on extension
        const isCompressed = file.name.endsWith('.gz');

        reader.onload = async (e) => {
            try {
                let jsonString;

                if (isCompressed) {
                    // Decompress gzipped file
                    const startTime = performance.now();
                    const compressedData = new Uint8Array(e.target.result);
                    const decompressedData = pako.ungzip(compressedData, { to: 'string' });
                    const decompressionTime = performance.now() - startTime;

                    Lib.debug('cache', `Decompressed ${compressedData.length.toLocaleString()} bytes → ${decompressedData.length.toLocaleString()} bytes in ${decompressionTime.toFixed(2)}ms`);
                    jsonString = decompressedData;
                } else {
                    // Plain JSON file
                    jsonString = e.target.result;
                }

                const data = JSON.parse(jsonString);

                // Validation: Check if the file matches the current page type
                if (data.pageType !== pageType) {
                    const loadAnywayConfirmed = await showCustomConfirm(
                        `Warning: This file appears to be for "${data.pageType}", but you are on a "${pageType}" page.\n\nTry loading anyway?`,
                        '⚠️ Page Type Mismatch',
                        loadFromDiskBtn
                    );
                    if (!loadAnywayConfirmed) {
                        fileInput.value = '';
                        return;
                    }
                }

                // Validate data structure
                if (!data.version || !data.pageType || !data.timestamp) {
                    throw new Error('Invalid data file: missing required fields');
                }

                Lib.debug('cache', `Loaded data version ${data.version} from ${data.timestampReadable} (File total: ${data.rowCount} rows)`);

                // Prepare the page for re-hydration
                performClutterCleanup();
                cleanupAfterInitialLoad();

                // Restore table headers if they were saved
                if (data.headers && data.headers.length > 0) {
                    const firstTable = document.querySelector('table.tbl');
                    if (firstTable) {
                        if (firstTable.tHead) firstTable.tHead.remove();
                        const thead = document.createElement('thead');
                        data.headers.forEach(headerRowCells => {
                            // Skip filter rows
                            const hasFilterInputs = headerRowCells.some(cell => cell.html && cell.html.includes('mb-col-filter-input'));
                            if (hasFilterInputs) return;

                            const tr = document.createElement('tr');
                            headerRowCells.forEach(cellData => {
                                const cell = document.createElement(cellData.tagName || 'th');
                                cell.innerHTML = cellData.html;
                                if (cellData.colSpan > 1) cell.colSpan = cellData.colSpan;
                                if (cellData.rowSpan > 1) cell.rowSpan = cellData.rowSpan;
                                tr.appendChild(cell);
                            });
                            thead.appendChild(tr);
                        });
                        firstTable.insertBefore(thead, firstTable.firstChild);
                    }
                }

                let loadedRowCount = 0;

                // Helper to check if a row matches the pre-load filter
                const rowMatchesFilter = (tr) => {
                    if (!filterQueryRaw) return true;
                    if (isRegExp && globalRegex) {
                        // For regex patterns, test against each cell individually
                        return Array.from(tr.cells).some(cell => {
                            const cellText = getCleanColumnText(cell);
                            return globalRegex.test(cellText);
                        });
                    } else {
                        // For non-regex, test against concatenated row text
                        const text = getCleanVisibleText(tr);
                        return isCaseSensitive ? text.includes(filterQuery) : text.toLowerCase().includes(filterQuery);
                    }
                };

                // Reconstruct rows from serialized data with Filtering
                if (data.tableMode === 'multi' && data.groups) {
                    groupedRows = [];
                    data.groups.forEach(group => {
                        const reconstructedRows = [];
                        group.rows.forEach((rowCells, rowIndex) => {
                            const tr = document.createElement('tr');
                            tr.className = rowIndex % 2 === 0 ? 'even' : 'odd';
                            rowCells.forEach(cellData => {
                                const td = document.createElement('td');
                                td.innerHTML = cellData.html;
                                if (cellData.colSpan > 1) td.colSpan = cellData.colSpan;
                                if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
                                tr.appendChild(td);
                            });

                            if (rowMatchesFilter(tr)) {
                                reconstructedRows.push(tr);
                            }
                        });

                        groupedRows.push({
                            key: group.key,
                            category: group.category || group.key,
                            rows: reconstructedRows,
                            originalRows: [...reconstructedRows]
                        });
                        loadedRowCount += reconstructedRows.length;
                    });
                    allRows = [];
                } else if (data.rows) {
                    allRows = [];
                    data.rows.forEach((rowCells, rowIndex) => {
                        const tr = document.createElement('tr');
                        tr.className = rowIndex % 2 === 0 ? 'even' : 'odd';
                        rowCells.forEach(cellData => {
                            const td = document.createElement('td');
                            td.innerHTML = cellData.html;
                            if (cellData.colSpan > 1) td.colSpan = cellData.colSpan;
                            if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
                            tr.appendChild(td);
                        });

                        if (rowMatchesFilter(tr)) {
                            allRows.push(tr);
                        }
                    });
                    loadedRowCount = allRows.length;
                    groupedRows = [];
                } else {
                    throw new Error('Invalid data file: no rows or groups found');
                }

                isLoaded = true;
                if (data.tableMode) activeDefinition.tableMode = data.tableMode;
                if (activeDefinition.tableMode !== 'multi') originalAllRows = [...allRows];

                // Render
                if (activeDefinition.tableMode === 'multi' && groupedRows.length > 0) {
                    await renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
                } else if (allRows.length > 0 || loadedRowCount === 0) {
                    await renderFinalTable(allRows);
                    document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                    const mainTable = document.querySelector('table.tbl');
                    if (mainTable) {
                        addColumnFilterRow(mainTable);
                        makeTableSortableUnified(mainTable, 'main_table');
                    }
                }

                // Apply prefilter highlight after rendering (if prefilter was used)
                if (filterQueryRaw) {
                    Lib.debug('cache', `Applying prefilter highlight for: "${filterQueryRaw}"`);

                    const tables = document.querySelectorAll('table.tbl');

                    tables.forEach(table => {
                        table.querySelectorAll('tbody tr').forEach(row => {
                            highlightText(row, filterQueryRaw, isCaseSensitive, -1, isRegExp, 'prefilter');
                        });
                    });
                }

                finalCleanup();
                makeH2sCollapsible();
                if (Lib.settings.sa_enable_sticky_headers) {
                    applyStickyHeaders();
                }

                // Add auto-resize columns button
                if (Lib.settings.sa_enable_column_resizing) {
                    addAutoResizeButton();
                }

                // Add column visibility toggle for loaded table
                if (Lib.settings.sa_enable_column_visibility) {
                    const mainTable = document.querySelector('table.tbl');
                    if (mainTable) {
                        addColumnVisibilityToggle(mainTable);
                    }
                }

                // Add density control
                if (Lib.settings.sa_enable_density_control) {
                    addDensityControl();
                }

                // Add stats panel button
                if (Lib.settings.sa_enable_stats_panel) {
                    addStatsButton();
                }

                // Initialize keyboard shortcuts (if not already initialized)
                if (Lib.settings.sa_enable_keyboard_shortcuts) {
                    if (!document._mbKeyboardShortcutsInitialized) {
                        initKeyboardShortcuts();
                        document._mbKeyboardShortcutsInitialized = true;
                    }
                    addShortcutsHelpButton();
                }

                // Add export button
                if (Lib.settings.sa_enable_export) {
                    addExportButton();
                }

                updateH2Count(loadedRowCount, loadedRowCount);

                // Show main filter container (if hidden)
                if (!filterContainer.parentNode) filterContainer.style.display = 'inline-flex';

                if (Lib.settings.sa_enable_save_load) {
                    saveToDiskBtn.style.display = 'inline-block';
                }

                // --- Update UI Feedback for Pre-Filter ---
                if (filterQueryRaw) {
                    // Update the prefilter toggle button with prefilter info and show it
                    updatePrefilterToggleButton(loadedRowCount, filterQueryRaw, true);
                    // Hide the old prefilter message span (no longer needed)
                    preFilterMsg.style.display = 'none';
                    // Reset the input field
                    preFilterInput.value = '';
                    // Reset highlighting states
                    prefilterHighlightEnabled = true;
                    filterHighlightEnabled = true;
                    savedPrefilterHighlights = { hasContent: false };
                    savedFilterHighlights = { hasContent: false };
                } else {
                    // No prefilter, hide prefilter button
                    updatePrefilterToggleButton(0, '', false);
                    preFilterMsg.style.display = 'none';
                }

                const rowLabel = loadedRowCount === 1 ? 'row' : 'rows';
                Lib.debug('cache', `Successfully loaded ${loadedRowCount} ${rowLabel} from disk!`);
                infoDisplay.textContent = `✓ Loaded ${loadedRowCount} ${rowLabel} from file ${file.name} | Active Pre-Filter: ${!!filterQueryRaw}`;
                infoDisplay.style.color = 'green';

                // Reset file input
                fileInput.value = '';

            } catch (err) {
                Lib.error('cache', 'Failed to load data from file:', err);
                alert('Failed to load data: ' + err.message);
                fileInput.value = '';
            }
        };

        reader.onerror = () => {
            Lib.error('cache', 'Failed to read file');
            alert('Failed to read file');
            fileInput.value = '';
        };

        // Read as ArrayBuffer for compressed files, as text for plain JSON
        if (isCompressed) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    }

    // Wrapper functions for prefix-mode menu shortcuts
    function openExportMenu() {
        const exportBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Export'));
        if (exportBtn) {
            exportBtn.click();
        }
    }

    function openVisibleColumnsMenu() {
        const visibleColumnsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Visible Columns'));
        if (visibleColumnsBtn) {
            visibleColumnsBtn.click();
        }
    }

    function openDensityMenu() {
        const densityBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Density'));
        if (densityBtn) {
            densityBtn.click();
        }
    }

    // Populate prefix-mode function mapping after all functions are defined
    ctrlMFunctionMap = {
        'r': { fn: toggleAutoResizeColumns, description: 'Auto-Resize Columns' },
        't': { fn: showStatsPanel, description: 'Show Stats Panel' },
        's': { fn: saveTableDataToDisk, description: 'Save to Disk' },
        'd': { fn: openDensityMenu, description: 'Open Density Menu' },
        'v': { fn: openVisibleColumnsMenu, description: 'Open Visible Columns Menu' },
        'e': { fn: openExportMenu, description: 'Open Export Menu' },
        'l': { fn: () => showLoadFilterDialog(document.querySelector('button[title*="Load table data from disk"]')), description: 'Load from Disk' },
        '?': { fn: showShortcutsHelp, description: 'Show Shortcuts Help' }
    };
})();
