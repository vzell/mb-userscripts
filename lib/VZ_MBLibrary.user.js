// ==UserScript==
// @name         VZ: MusicBrainz - Unified Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      4.3.0+2026-09-23
// @description  Unified library for Logging, Settings, Changelog management, and remote content fetching
// @author       vzell
// @tag          AI generated
// @license      MIT
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

/*
 * VZ_MBLibrary
 *
 * A unified library to handle:
 * 1. Advanced Logging with timestamps and icons.
 * 2. Settings/Configuration Management (Schema-driven).
 * 3. Changelog UI display.
 * 4. Menu Integration (Tampermonkey & MB Editing menu).
 */

const LIBRARY_VERSION = '4.3.0+2026-09-23';

// CHANGELOG
// let changelog_library = [
//     {version: '4.3.0+2026-09-23', description: 'Settings dialog, header and tooltips. (1) THE HEADER now identifies what you are running: the script version and the LIBRARY version, side by side as monospace chips, plus a live count of settings and sections and a badge showing how many settings currently differ from their default. The library number is the one that was previously unobtainable — a @require\'d library has no entry of its own in Tampermonkey, so a consumer paired with an older library than its author tested against behaved differently with nothing anywhere saying so; ShowAllEntityData 9.99.1138 against library 4.0.0 is the worked example. The script version comes from GM_info, FEATURE-DETECTED like GM_deleteValue, and degrades to the word "unknown" rather than costing the dialog. RESET and CLOSE became real buttons with glyphs and hover states — they were bare anchors with no href separated by a pipe, which read as two links of equal weight and took no tab stop at all. The advisory line about what SAVE does moved out of the title block into its own tinted note, since it describes an action rather than the dialog. (2) TOOLTIPS on everything interactive. Each setting\'s label, widget, Default cell and Description cell share one tooltip carrying the label, the description, the default and THE GM STORAGE KEY — the key appears nowhere else in the UI and is exactly what someone hand-editing an exported config file needs. Widgets whose behaviour is not obvious say so: a type:\'function\' button runs immediately and has nothing for SAVE to store, and a type:\'table\' editor has its own 💾 Save that writes at once rather than waiting for this dialog\'s. The section header, its ↺, the search box, both toolbar buttons, the three column headers, both column-resize grips, SAVE, the resize corner and the drag bar all gained one. “Collapse all” explains WHY it is disabled while a filter is running, instead of just being dead. (3) FIX: every control except SAVE lives inside the drag handle, and pressing one armed a DRAG — the dialog followed the pointer while you decided whether to release on the button, and the didDrag flag it set (whose job is to suppress the overlay click that ends a drag) could swallow the very click meant to dismiss the dialog. mousedown on the drag handle now ignores form controls and buttons. The search input was already covered by its own stopPropagation from 3.9.0 and keeps it; the two overlap there and neither is removed, since one is structural and picks up a control added later while the other is local and survives someone narrowing the selector.'},
//     {version: '4.2.0+2026-09-23', description: 'Settings dialog: six fixes from ShowAllEntityData/org/config-handling.org F5, all of them frictions that had no error message and no visible symptom. (1) ENTRY POINTS. Three of six were second class: the GM menu item and the MusicBrainz Editing-menu link call showModal() with no arguments, so a type:\'function\' entry\'s button was inert and any button the consumer injects into the dialog never appeared, while the consumer\'s own toolbar button worked. New settingsInterface.configure({functionRegistry, beforeOpen}) — exposed as Lib.configureSettings() — records the intent once and showModal() falls back to it, so every entry point is identical by construction; an explicitly-passed registry still wins, so the 3.15.0 call shape is unchanged. beforeOpen runs before the overlay exists (a consumer may be watching for it with a MutationObserver) and is try/catch guarded, because a consumer\'s broken hook must not cost the user their settings dialog. (2) THE DEFAULT COLUMN told the truth for five of eight entry types: type:\'table\' has no default: at all and printed the literal "undefined", type:\'function\' printed its internal method name, and popup_dialog printed the fixed placeholder "(pipe-sep.)" — the format instead of the value — for the one type whose default is hardest to reconstruct by hand. Now "(seeded from code)", "(an action, not a value)" and the real default respectively. (3) CHANGED-FROM-DEFAULT. Across a large schema there was no way to see what you had altered without exporting the JSON and diffing it against a virgin export. A changed row now carries an orange edge and a bold label, each section header a count badge, and a new "Changed only" toolbar filter shows just those rows; all of it derived live from isSchemaDefault(), recomputed on every widget event rather than tracked, because RESET, the colour pickers and the popup sub-editors write values without a common choke point. (4) SECTION STATE is remembered per section in GM key <scriptId>-section-collapse; every section used to re-collapse on every open. The stored shape records only EXPANDED sections, so an untouched profile and any section added by a later version both keep the all-collapsed default. (5) SEARCH AND COLLAPSE no longer fight. They were two mechanisms both writing row.style.display, last writer winning: a search left every section header standing with nothing under most of them, and revealed a match under a header still drawn collapsed. Visibility is now computed in ONE pass from the needle, the changed-only toggle and each section\'s state; a filter opens the sections holding matches WITHOUT touching their stored state, so clearing it restores the user\'s own layout, and a filter matching nothing says so instead of showing a blank body. (6) SAVE no longer reloads unconditionally — the reload discards whatever the page had built, so it is skipped when nothing changed; the write still happens, since as of 4.1.0 an unchanged SAVE is what prunes a profile an older version had frozen. The header claim "Settings are applied IMMEDIATELY upon saving" was false and is corrected. Also new: a per-section RESET on each header, resetting only that section and only the settings in it that differ, widget-only like the global one; resetSettingWidget() is factored out so the two cannot drift. save(newValues, reload=true) takes the new second argument.'},
//     {version: '4.1.0+2026-09-23', description: 'Settings SAVE is now a DIRTY SET: a value equal to its own schema default is DELETED from GM storage instead of written to it. Previously the SAVE handler wrote every key the dialog rendered, on every save, whether or not anything had changed — so the first time a user pressed SAVE, even having changed nothing, the entire schema froze into their profile and no default shipped afterwards ever reached them again (settingsInterface.init() reads GM_getValue(key, schema.default), so a stored value shadows the schema for ever). Deleting is safe because an absent key and a key stored at the default resolve identically; only the future differs. Measured on ShowAllEntityData: ten settings had already diverged this way and four keys were still stored after being dropped from the schema. New settingsInterface.persist(newValues) does the writes and returns {stored, cleared}; save() is persist() plus the reload, split so the write half is testable at all. New settingsInterface.isSchemaDefault(key, value) makes the comparison, string-wise like hasUnsavedChanges() already did (every non-checkbox widget hands back a string, so a number default of 30 arrives as "30") and case-insensitively for color_picker (the schema writes #FFD700, iro.js writes back #ffd700 — otherwise re-picking the colour a setting already had would pin it for ever). GM_deleteValue is FEATURE-DETECTED: a @require\'d library runs in the consumer\'s sandbox with the consumer\'s grants, and a consumer that has not granted it falls back to GM_setValue, i.e. to this library\'s pre-4.1.0 behaviour, rather than throwing inside SAVE and losing the user\'s edits. Consumer scripts SHOULD add // @grant GM_deleteValue to their own header to get the fix; ShowAllEntityData already grants it, MB_PageEnhancer does not yet.'},
//     {version: '4.0.0+2026-07-31', description: 'BREAKING: Settings dialog and Changelog viewer rendered unstyled/stacked on MusicBrainz /account/* pages, which serve a Content-Security-Policy style-src directive with no unsafe-inline (unlike general content pages, which have no CSP at all). The dialog shells and per-row setting widgets were built via container.innerHTML templates with ~75 inline style="..." attributes, blocked the same way <style> elements are. Converted to id/class selectors targeted by GM_addStyle()-injected stylesheets. Every consumer script now MUST add // @grant GM_addStyle to its own userscript header — without it, GM_addStyle is undefined in that script\'s sandbox and these dialogs throw instead of rendering. Also replaced an onfocus/onblur inline event-handler pair in the changelog search box with a CSS :focus rule (also CSP-restricted).'},
//     {version: '3.19.0+2026-04-01', description: 'Settings dialog: all three columns (Setting, Default, Description) are now individually resizable by dragging the thin col-resize handle placed on the right edge of each sticky column header. The Setting column defaults to 500 px (up from 450 px) and the Default column defaults to 130 px; Description takes all remaining flex space. Column widths are persisted to GM storage under the key "<scriptId>-col-widths" and restored on next open alongside the dialog dimensions. Row cells are stamped with data-vz-settings-col="1" or "2" so _applyColWidth() can bulk-update them efficiently via querySelectorAll without touching any other element.'},
//     {version: '3.18.4+2026-04-01', description: 'settingsEscHandler: added a second case before the tryCloseDialog() fallback. When the active element is any INPUT or TEXTAREA inside the settings container (type=number, type=text in setting rows, sub-grid mb-pd-sub inputs, color-picker text inputs, keyboard-shortcut capture inputs) and is NOT the search field, Escape now only blurs the field (stopImmediatePropagation + preventDefault + blur) instead of closing the whole dialog. The dialog closes only when focus is on a non-input element such as a button, a section header, or the dialog container itself. The table-editor guard and search-field clear/blur logic are unchanged.'},
//     {version: '3.18.3+2026-04-01', description: '_openTableEditor Escape — root-cause fix. settingsEscHandler is a capture-phase listener on document and therefore always fires before any panel-level listener, making panel-side stopPropagation useless. Fix: added an early-return guard at the top of settingsEscHandler that checks document.querySelector("[id^=vz-tbl-editor-]") and returns immediately when that panel contains the active element (including when the panel itself is focused via tabIndex=0). With settingsEscHandler yielding, the panel keydown listener handles the two-step behaviour (Step 1: blur input → focus panel; Step 2: remove panel) using stopImmediatePropagation for safety.'},
//     {version: '3.18.2+2026-04-01', description: '_openTableEditor Escape — redesigned as a two-step panel-level handler. panel.tabIndex=0 makes the panel itself focusable; panel.focus() is called after appending to DOM so Escape works immediately. The keydown listener is on the panel element, not document, so it only fires when focus is inside the panel and settingsEscHandler is never involved. Step 1: if focus is on a text input inside the panel, blur it and move focus to the panel (second Escape will then close). Step 2: if focus is on the panel itself, remove the panel (equivalent to Close button). e.stopPropagation() in both steps prevents the event from bubbling to any parent handler.'},
//     {version: '3.18.1+2026-04-01', description: '_openTableEditor Escape fix: the handler now checks panel.contains(document.activeElement) before intercepting. Escape is only captured when focus is inside the vz-tbl-editor panel; if focus is elsewhere (e.g. in the parent settings dialog search field) the event is left to propagate so settingsEscHandler can act on it normally. Fixes: pressing Escape outside the table editor closed both dialogs instead of only the settings one.'},
//     {version: '3.18.0+2026-04-01', description: '_openTableEditor: Escape key now closes only the table-editor panel instead of the parent settings dialog. A capture-phase keydown listener (_tblEscHandler) is registered on document when the panel opens; it calls stopImmediatePropagation() and e.preventDefault() before removing the panel, so settingsEscHandler never receives the event. The listener self-removes when the panel is closed (either via Escape, the ✕ header button, or the footer Close button), with a MutationObserver as an additional safety net that removes any stale listener if the panel node is removed through any other path.'},
//     {version: '3.17.0+2026-03-31', description: 'Three improvements to the Settings dialog UI for color-related configuration entries: (1) popup_dialog sub-inputs: when a configSchema entry of type popup_dialog declares a colorFields array (e.g. colorFields: [\'bg\', \'color\']), those named sub-fields now render with a live color-preview background on the text input (matching getContrastYIQ contrast logic) and a 🎨 picker button. Clicking the 🎨 button opens the shared iro.js pickerContainer positioned below the button; selecting a color updates the sub-input value, its background preview, and syncs the master hidden input. The preview is also applied on initial render and kept in sync as the user types. (2) Reset logic extended: when resetting a popup_dialog entry whose default parts include color sub-fields, the color preview (background + contrast text color) and 🎨 button background are also reset. (3) Overlay click guard updated: the isPickerBtn test now also matches elements inside [data-pd-picker-for] so clicking a sub-grid picker button never incorrectly closes the dialog.'},
//     {version: '3.16.0+2026-03-27', description: 'Two new config entry types: (1) type:\'function\' — renders a 🔧 button labelled with cfg.label; clicking it calls functionRegistry[cfg.default]() passed in via Lib.showSettings({ functionRegistry: {...} }). Skipped in takeSnapshot, hasUnsavedChanges, save, and reset loops. (2) type:\'table\' — renders a 📋 Edit button; clicking it opens a draggable table-editor panel (_openTableEditor) for the named table. The panel supports add/edit/delete of rows stored as [[col0, col1, ...], ...] in GM_setValue(key). Rows are retrieved via the new Lib.getTableRows(key, defaultRows) public API method. showModal() now accepts a functionRegistry parameter (defaulting to {} when absent). Save/snapshot/reset loops now skip types [\'divider\',\'function\',\'table\']. Also fixed: LIBRARY_VERSION constant was not updated with the @version bump — corrected to 3.16.0+2026-03-27.'},
//     {version: '3.15.0+2026-03-27', description: 'showSettings() public API now accepts an optional opts object with a functionRegistry map ({ \'fnName\': fn, ... }) so consumer scripts can register callable functions for type:\'function\' config entries. Previously showModal() took no arguments and functionRegistry was always undefined in the event-binding code, causing function-type buttons to silently fail. The opts parameter is forwarded to showModal() via settingsInterface.showModal(opts?.functionRegistry || {}).'},
//     {version: '3.14.3+2026-03-04', description: 'Fix two regressions introduced in 3.14.0: (1) Changelog CLOSE link was made conditional (clearing the filter instead of closing when text was present) which broke the link entirely in some code paths. Reverted to unconditional closeDialog() — CLOSE always closes the dialog regardless of filter state. (2) Changelog Escape handler had a spurious third branch that intercepted Escape when the search field was not focused but had text, clearing the filter instead of closing the dialog. Removed that branch. Correct behaviour is now: Escape while search is focused + has text → clear filter; Escape while search is focused + empty → blur field; Escape while search is not focused → close the dialog unconditionally.'},
//     {version: '3.14.0+2026-03-04', description: 'Four UX improvements across Settings and Changelog dialogs: (1) Changelog — red ✕ clear button: a small red ✕ button is appended inside the "🔍 Filter changelog entries…" input (position:absolute, right-aligned). It appears when the field has text and disappears when cleared. Clicking it (or pressing Escape, per existing behaviour) wipes the filter and re-focuses the input. (2) Changelog — CLOSE link smart behaviour: CLOSE no longer unconditionally closes the dialog. When the search field has text, CLOSE now clears the filter (identical to clicking ✕) instead of dismissing the dialog; the dialog closes only when the field is already empty. (3) Changelog — Escape when search is not focused: previously Escape always closed the dialog when the search input was not focused. Now, if the search field has text and is NOT focused, Escape clears the filter (cases 1–3 in clEscHandler) and focuses the input; closing only happens when the field is already empty. (4) Settings — red ✕ clear button: same ✕ button pattern added to the "🔍 Search settings…" input. Clicking it clears the field and triggers the input event (identical to the existing Escape-key behaviour). Search highlighting in settings rows: the settings search handler now highlights the needle in each matching row (label text in col1 via .vz-setting-label, default value in col2, description text in col3) using the same yellow <mark> highlight span as the Changelog. Row data attributes (data-vz-label, data-vz-desc, data-vz-default) are written at build time so the search handler can restore original plain text when the filter is cleared without touching the input widgets (checkboxes, color pickers, etc.) inside col1.'},
//     {version: '3.13.1+2026-02-26', description: 'Fix color picker opening at black when the stored/default color value is a CSS named color (e.g. "green"). iro.js v5 does not accept CSS named colors as its color initialisation option and silently falls back to #000000. Fix: added cssColorToHex() helper that resolves any CSS color value to a 6-digit hex string by writing it to a temporary off-screen element and parsing the browser-computed rgb() result. cssColorToHex() is called in the color picker button onclick handler to normalise the value before passing it to new iro.ColorPicker(). This is a defensive library-level fix; consumer scripts should also use hex defaults (see ShowAllEntityData 9.97.9).'},
//     {version: '3.13.0+2026-02-24', description: 'Four fixes: (1) Changelog and Settings focus-on-open: replaced requestAnimationFrame double-rAF with setTimeout(..., 200) — rAF fires while the browser is still processing the GM-menu-close event which has stolen page focus; the 200ms delay lets the browser return focus to the page before the focus() call is made. (2) Settings search input now focused on open (was missing entirely). (3) lib_content_font_family added to _LIB_PREFS_DEFAULTS and _libPrefs; applied to Changelog container fontFamily; exposed in Library Settings editor as a second field. (4) Both lib_content_font_size and lib_content_font_family are now part of the libPrefs public API so consumer scripts (e.g. App Help dialog in ShowAllEntityData) can read them via Lib.libPrefs.'},
//     {version: '3.12.0+2026-02-24', description: 'Fix Escape key handling in Settings and Changelog dialogs; add Changelog search focus on open; add Library Settings editor; apply lib_content_font_size to Changelog dialog. (1) Escape root-cause fix: both search inputs changed from type="search" to type="text" — browsers natively intercept Escape on type=search inputs, clearing the value before the keydown event fires so the "has text" branch could never trigger. (2) Settings Escape handler: added with capture:true (fires before bubble-phase handlers) and stored as a named reference (settingsEscHandler) so it can be removed when the dialog closes; closeDialog() now also calls document.removeEventListener(..., true) to prevent accumulation across multiple opens. (3) Changelog Escape handler: replaced anonymous window.addEventListener (never cleaned up, accumulates on every open) with a named reference (clEscHandler) added via document.addEventListener(..., true); closeDialog() removes it. Both handlers use stopImmediatePropagation() to block competing handlers when the search field is focused. (4) Changelog focus: changed from entriesWrap.focus() to searchInput.focus() in the double-rAF so the filter field is ready for input immediately after opening. Escape on an empty search field now blurs it and refocuses entriesWrap so keyboard scroll keys continue to work. (5) Library Settings editor: new libSettingsInterface.show() opens a small dialog registered as a "🔧 Library Settings" GM menu item, with a fields[] array that is trivially extensible. Saves to GM storage key "vz-lib-prefs". (6) _libPrefs / _LIB_PREFS_DEFAULTS: developer-editable defaults at the top of the module; lib_content_font_size (default "1.05em") is applied to the Changelog container font-size so all relative em sizes scale automatically.'},
//     {version: '3.11.0+2026-02-24', description: 'Three fixes across Settings and Changelog dialogs: (1) Escape-key in filter fields: when the search/filter input is focused, first Escape clears the text and re-dispatches an input event (so filtered content resets live); second Escape (field now empty) blurs the field; only when the field is not focused does Escape close the dialog. Applies to both the Settings search input and the Changelog search input. (2) Resize-then-release-outside no longer closes the dialog: added didResize flag (mirrors existing didDrag flag), set to true on first mousemove while isResizing; overlay click/mousedown handler skips close and resets the flag when it is set; flag is reset to false on each new resize-handle mousedown. Applied to both Settings (overlay click handler) and Changelog (overlay mousedown handler). (3) Resize cursor lock and text-selection suppression: on resize-handle mousedown a temporary <style> tag is injected into <head> with "* { cursor: nwse-resize !important; user-select: none !important; }" so the cursor never jumps to a different shape and no text is accidentally selected while dragging; the style tag is removed on mouseup. Each dialog uses a unique style element id to avoid conflicts.'},
//     {version: '3.10.0+2026-02-24', description: 'Four improvements: (1) Changelog dialog: removed "CLOSE" button at bottom-right (redundant with CLOSE link and Escape key); scrollable entries area made focusable (tabIndex=0, mouseenter→focus) so ↑↓/PageUp/PageDown/Home/End work natively; double-rAF focus on open so Escape works immediately. (2) Changelog search highlighting: highlightNeedle() helper wraps matches in <mark style="background:#fff176">; applied to version, date, section label, and all item text via renderItem(); needle threaded through the recursion. (3) Changelog meta line: _visibleCount closure variable tracks entries visible after each buildContent() call; updateMetaLine() now emits "(N filtered)" in bold when a filter is active and the visible count differs from the total. (4) Settings AND changelog drag-then-release-outside bug fixed: didDrag flag set on first mousemove while isDragging; overlay click/mousedown handler skips tryCloseDialog()/closeDialog() and resets didDrag when the flag is set, preventing the drag-end event from closing the dialog.'},
//     {version: '3.9.5+2026-02-24', description: 'Widen settings column 1 ("Setting") from 280px to 450px in both the sticky column-header row and the data rows, so that long labels and inline widgets (buttons, inputs) no longer wrap to a second line.'},
//     {version: '3.9.4+2026-02-24', description: 'Fix settings column-header alignment: the sticky "Setting / Default / Description" header row was nested inside the drag-header div which carries 18px left/right padding, making it 36px narrower than the settings rows that live outside that padding. Fix: moved the column-header div out of drag-header and made it a direct flex-sibling between drag-header and settings-body at full container width. Removed border-radius and margin-top from the header row; replaced the all-sides border with explicit left/right/bottom borders to match the settings-body side borders.'},
//     {version: '3.9.3+2026-02-24', description: 'Fix settings row layout: definitive fix for display:flex being stripped. The rendered HTML confirmed display:flex was absent from the computed style even with single-line style attributes. Root cause: Tampermonkey userscript sandbox innerHTML assignment sanitizes certain CSS display values. Fix: setting rows are now built entirely as real DOM elements using document.createElement() + Object.assign(el.style, ...) / el.style.cssText, collected in a DocumentFragment, and appended to #settings-body after container.innerHTML establishes the shell. display:flex set via el.style.display = "flex" in JS cannot be stripped by any HTML parser or content-script sanitizer.'},
//     {version: '3.9.2+2026-02-24', description: 'Fix settings row layout still stacking vertically: collapsed all three column div style attributes to single-line strings and removed overflow-x:hidden from #settings-body.'},
//     {version: '3.9.1+2026-02-24', description: 'Fix two bugs in the 3.9.0 settings modal rewrite: (1) Color picker (iro.js) swatch button did nothing — picker popup was positioned using btn.offsetTop/offsetLeft which are relative to the offset-parent through the scrollable body div; replaced with getBoundingClientRect()-based coordinates relative to container so popup appears directly below the swatch button. (2) Setting rows rendered vertically stacked instead of side-by-side — vz-setting-row flex container lacked flex-wrap:nowrap so columns wrapped; added explicit nowrap and min-width:0 on all three column divs.'},
//     {version: '3.9.0+2026-02-24', description: 'Two changes: (1) Changelog dialog renderer updated from newRenderer.js: renderItem() is now recursive for arbitrary nesting depth; buildContent() accepts an optional filter string for live search; a search input is added to the drag-header. Force-refresh respects the current search filter when re-rendering. (2) Settings modal completely rewritten from table-based layout to a modern flex/div-based card layout to eliminate the ghost shadow/white-row glitch that appeared when collapsing section headers. The ghost was caused by table row height calculations leaking into the scrollable area. The new layout uses div-based section cards with smooth CSS transitions; all features preserved: collapsible sections, draggable/resizable dialog, color picker, keyboard shortcut capture, popup_dialog sub-editor, search, global reset, and unsaved-change detection.'},
//     {version: '3.8.0+2026-02-23', description: 'Changelog dialog renderer rewritten: structured Markdown-inspired layout (## version, ### section, - items with sub-items). buildContent() now accepts an optional filter string parameter for live search. A search input is added to the drag-header so users can type to filter entries in real time. Force-refresh handler respects the current search filter when re-rendering. renderItem() is recursive for arbitrary nesting depth.'},
//     {version: '3.7.0+2026-02-23', description: 'Changelog dialog renderer rewritten: replaced the flat <table>-based layout (version / description columns) with a document-style <div> layout that renders each entry as a version+date header block followed by labelled section groups (🚀 Improvements, 🐛 Fixes, 🧹 Cleanup, ⚙️ Internal, etc.) with <ul> bullet lists and optional nested sub-lists. Both the new {version, date, sections[{label, items[]}]} JSON format and the legacy flat {version, description} string format are handled — legacy entries render as a plain paragraph for backward compat. buildRows() renamed to buildContent(); tbody reference replaced with entriesEl; force-refresh handler updated accordingly.'},
//     {version: '3.6.0+2026-02-23', description: 'Changelog dialog and app-help dialog: debug/info logging added to report cache status (source: static / cache / fresh, entry count, cache age in seconds) every time the respective popup is opened. A "🔄 Force refresh" link is added to the upper-right header of both dialogs; clicking it bypasses the cache, re-fetches from GitHub, updates the in-memory data and re-renders the content in place without closing the dialog. Force-refresh success / failure is logged at info/warn level and reflected in the UI. fetchCachedText gains an optional fourth parameter forceRefresh (default false) that, when true, skips the cache-hit check and goes straight to the network. _changelogMeta object tracks {fromCache, fetchedAt, url, cacheKey, cacheTtlMs} for the last changelog load so that changelogInterface.show() can report accurate cache status.'},
//     {version: '3.5.0+2026-02-23', description: 'Added showCustomDialog / showCustomAlert / showCustomConfirm to the library public API for reuse across consumer scripts. The settings modal now guards against accidental data loss: (1) Escape key, the CLOSE link, and backdrop clicks first check for unsaved changes via a snapshot comparison and present a showCustomConfirm prompt before discarding edits; (2) the RESET link always presents a showCustomConfirm prompt that warns the user all configuration settings will be reset to their default values before proceeding.'},
//     {version: '3.4.0+2026-02-23', description: 'Fix: changelog source diagnostic messages promoted from debug to info level.'},
//     {version: '3.3.0+2026-02-23', description: 'Improved changelog source diagnostics.'},
//     {version: '3.2.0+2026-02-23', description: 'Remote content support moved into library.'},
//     {version: '3.1.0+2026-02-22', description: 'Settings modal ghost-shadow-row eliminated.'},
//     {version: '3.0.0+2026-02-22', description: 'Settings modal overflow:hidden fix + JSDoc.'},
//     {version: '2.9.0+2026-02-22', description: 'Settings modal linear-gradient fix.'},
//     {version: '2.8.0+2026-02-22', description: 'Keyboard shortcut capture uppercases alpha keys.'},
//     {version: '2.7.0+2026-02-22', description: 'Settings modal: all sections start collapsed.'},
//     {version: '2.6.0+2026-02-22', description: 'Settings modal: collapse-all toggle button.'},
//     {version: '2.5.0+2026-02-21', description: 'New setting type "keyboard_shortcut".'},
//     {version: '2.4.0+2026-02-21', description: 'New setting type "popup_dialog".'},
//     {version: '2.3.0+2026-02-16', description: 'Expose settings interface.'},
//     {version: '2.2.0+2026-02-14', description: 'Drag anywhere, Sticky header, Collapsible sections, Real-time search.'},
//     {version: '2.1.0+2026-02-14', description: 'Keep header + footer fixed while entries scroll + Esc key.'},
//     {version: '2.0.0+2026-02-14', description: 'Support dividers + modern UI design.'},
//     {version: '1.1.0+2026-02-11', description: 'Dynamic debug flag via function.'},
//     {version: '1.0.0+2026-02-11', description: 'Expose an additional "warn" method.'},
//     {version: '0.9.3+2026-02-02', description: 'Expose loggerInterface.prefix with getter/setter.'},
//     {version: '0.9.2+2026-01-31', description: '1st official release version.'}
// ];

"use strict";

const VZ_MBLibrary = (function() {
    return function(scriptId, scriptName, configSchema = null, changelog = null, debugEnabled = true, remoteConfig = null) {
        const timers = new Map();

        // ── Library display preferences ───────────────────────────────────────────
        // Developer defaults: change these values to adjust the built-in defaults.
        // End-users can override them through the "🔧 Library Settings" GM menu item.
        const _LIB_PREFS_DEFAULTS = {
            lib_content_font_size:   '1.3em',  // Content font-size in Changelog and App Help dialogs
            lib_content_font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',  // Content font-family
        };

        /**
         * Returns true when debug logging is currently enabled.
         * Supports both a static boolean and a dynamic function.
         * @returns {boolean}
         */
        const isDebugEnabled = () => {
            if (typeof debugEnabled === 'function') {
                return debugEnabled();
            }
            return debugEnabled;
        };

        // Internal changelog — seeded from the static constructor param, optionally
        // extended/replaced at runtime by initRemoteContent() after an async fetch.
        let _changelog = Array.isArray(changelog) ? [...changelog] : [];

        // Metadata about the last changelog load — used for cache-status logging in the
        // changelog dialog and for re-fetching on "Force refresh".
        const _changelogMeta = {
            fromCache:  null,  // true = served from GM cache, false = fresh network fetch, null = static only
            fetchedAt:  null,  // Date.now() at time of load, or null for static
            url:        null,  // Remote URL used, or null for static
            cacheKey:   null,  // GM storage key used, or null for static
            cacheTtlMs: null   // TTL used during the last fetch, or null for static
        };

        /**
         * Load saved library preferences from GM storage, filling in missing keys
         * with their defaults.  Returns a mutable plain object.
         * @returns {Object}
         */
        const _loadLibPrefs = () => {
            const saved  = (typeof GM_getValue !== 'undefined') ? GM_getValue('vz-lib-prefs', {}) : {};
            const merged = { ..._LIB_PREFS_DEFAULTS };
            for (const key of Object.keys(_LIB_PREFS_DEFAULTS)) {
                if (Object.prototype.hasOwnProperty.call(saved, key)) merged[key] = saved[key];
            }
            return merged;
        };

        const _libPrefs    = _loadLibPrefs();
        const _saveLibPrefs = () => {
            if (typeof GM_setValue !== 'undefined') GM_setValue('vz-lib-prefs', _libPrefs);
        };

        // ── Remote content helpers ────────────────────────────────────────────────

        /**
         * Fetch a URL via GM_xmlhttpRequest.
         * @param {string} url
         * @returns {Promise<string>}
         */
        const fetchRemoteText = function(url) {
            return new Promise((resolve, reject) => {
                if (typeof GM_xmlhttpRequest === 'undefined') {
                    reject(new Error('GM_xmlhttpRequest not available — add @grant GM_xmlhttpRequest'));
                    return;
                }
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    timeout: 10000,
                    onload:    r  => r.status === 200 ? resolve(r.responseText) : reject(new Error(`HTTP ${r.status}`)),
                    onerror:   () => reject(new Error('Network error')),
                    ontimeout: () => reject(new Error('Request timed out'))
                });
            });
        };

        /**
         * Fetch text from a URL with GM_setValue/GM_getValue caching.
         * @param {string}  url
         * @param {string}  cacheKey              GM storage key
         * @param {number}  [cacheTtlMs=3600000]  Cache TTL in milliseconds (default 1 hour)
         * @param {boolean} [forceRefresh=false]   When true, skip cache read and always fetch from network
         * @returns {Promise<{data: string|null, fromCache: boolean, error: string|null}>}
         */
        const fetchCachedText = async function(url, cacheKey, cacheTtlMs = 3600000, forceRefresh = false) {
            if (!forceRefresh) {
                try {
                    const cached = GM_getValue(cacheKey, null);
                    if (cached && (Date.now() - cached.ts) < cacheTtlMs) {
                        const ageS = Math.round((Date.now() - cached.ts) / 1000);
                        loggerInterface.debug('remote', `Cache hit for ${cacheKey} (age ${ageS}s, TTL ${Math.round(cacheTtlMs / 1000)}s)`);
                        return { data: cached.data, fromCache: true, error: null };
                    } else if (cached) {
                        loggerInterface.debug('remote', `Cache stale for ${cacheKey} — will re-fetch`);
                    } else {
                        loggerInterface.debug('remote', `Cache miss for ${cacheKey} — will fetch`);
                    }
                } catch (_) { /* GM_getValue unavailable — skip cache read */ }
            } else {
                loggerInterface.info('remote', `Force refresh requested for ${cacheKey} — bypassing cache`);
            }

            try {
                loggerInterface.debug('remote', `Fetching: ${url}`);
                const data = await fetchRemoteText(url);
                try { GM_setValue(cacheKey, { ts: Date.now(), data }); } catch (_) {}
                loggerInterface.info('remote', `Fetched and cached fresh content for ${cacheKey} (${data.length} bytes)`);
                return { data, fromCache: false, error: null };
            } catch (err) {
                loggerInterface.warn('remote', `Fetch failed for ${url}: ${err.message}`);
                // Serve stale cache as last resort
                try {
                    const stale = GM_getValue(cacheKey, null);
                    if (stale) {
                        loggerInterface.warn('remote', `Serving stale cache for ${cacheKey} as last resort`);
                        return { data: stale.data, fromCache: true, error: 'Network error — showing cached version' };
                    }
                } catch (_) {}
                return { data: null, fromCache: false, error: err.message };
            }
        };

        // ── End remote content helpers ────────────────────────────────────────────

        // --- 1. Logger Logic ---
        const loggerInterface = {
            prefix: `[${scriptName}]`,
            styles: {
                debug: 'color: #7f8c8d; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold;',
                info: 'color: #2980b9; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; font-size: 11px;',
                warn: 'color: #d35400; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fff5e6; padding: 2px 4px; border-radius: 3px;',
                error: 'color: #c0392b; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fceae9; padding: 2px 4px; border-radius: 3px;',
                timer: 'color: #8e44ad; font-family: "Consolas", monospace; font-style: italic; font-weight: bold;',
                timestamp: 'color: #95a5a6; font-size: 9px; font-weight: normal;'
            },
            icons: {
                init: '🚀', fetch: '📥', render: '🎨', filter: '🔍', sort: '⚖️', cleanup: '🧹',
                warn: '⚠️', error: '❌', success: '✅', meta: '🎵', timer: '⏱️', ui: '🖥️'
            },
            /**
             * Returns the current time as an ISO-formatted timestamp string (time portion only).
             * @returns {string}
             */
            getTimestamp() {
                const now = new Date();
                return now.toISOString().split('T')[1].replace('Z', '');
            },
            /**
             * Core log method. Suppresses debug output when debug logging is disabled.
             * @param {string} level  - Log level key ('debug'|'info'|'warn'|'error'|'timer')
             * @param {string} icon   - Icon key from loggerInterface.icons
             * @param {string} msg    - Message text
             * @param {*}      [data] - Optional extra data passed to console.log
             */
            log(level, icon, msg, data = '') {
                if (!isDebugEnabled() && level === 'debug') return;
                const style = this.styles[level] || '';
                const iconChar = this.icons[icon] || '📝';
                const time = this.getTimestamp();
                console.log(`%c${time} %c${this.prefix} ${iconChar} ${msg}`, this.styles.timestamp, style, data);
            },
            /** @param {string} label  Timer label (must match a later timeEnd call) */
            time(label) { timers.set(label, performance.now()); },
            /**
             * Stops a timer started with time() and logs the elapsed milliseconds.
             * @param {string} label
             * @param {string} [icon='timer']
             */
            timeEnd(label, icon = 'timer') {
                const start = timers.get(label);
                if (start) {
                    const duration = (performance.now() - start).toFixed(2);
                    this.log('timer', icon, `${label}: ${duration}ms`);
                    timers.delete(label);
                }
            },
            debug(icon, msg, data) { this.log('debug', icon, msg, data); },
            info(icon, msg, data)  { this.log('info',  icon, msg, data); },
            warn(icon, msg, data)  { this.log('warn',  icon, msg, data); },
            error(icon, msg, data) { this.log('error', 'error', msg, data); }
        };

        // --- 2. Custom Dialog Logic ---

        /**
         * Unified modal dialog for alert and confirm interactions.
         * Self-contained — uses only hardcoded CSS so it works inside the library
         * without access to any consumer-script settings.
         *
         * @param {string}             message       - Body text (supports \n → <br> in confirm mode)
         * @param {string}             [title]       - Dialog header text
         * @param {HTMLElement|null}   [triggerEl]   - Element to position the dialog below (null = centred)
         * @param {'alert'|'confirm'}  [mode]        - 'alert' shows only OK; 'confirm' shows Cancel + OK
         * @returns {Promise<void|boolean>}          - alert: resolves void; confirm: resolves true/false
         */
        const showCustomDialog = function(message, title = 'Notice', triggerEl = null, mode = 'alert') {
            return new Promise((resolve) => {
                const isConfirm = mode === 'confirm';

                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0.35)',
                    zIndex: '20000', display: 'flex', justifyContent: 'center', alignItems: 'center'
                });

                const dlg = document.createElement('div');
                Object.assign(dlg.style, {
                    position: 'absolute', backgroundColor: '#fff', border: '1px solid #ccc',
                    borderRadius: '10px', padding: '0', minWidth: '320px', maxWidth: '500px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '14px', color: '#222', overflow: 'hidden', zIndex: '20001'
                });

                const hdr = document.createElement('div');
                Object.assign(hdr.style, {
                    backgroundColor: '#4a5568', color: '#fff', padding: '10px 14px',
                    fontWeight: '600', fontSize: '13px', letterSpacing: '0.03em'
                });
                hdr.textContent = title;

                const body = document.createElement('div');
                Object.assign(body.style, {
                    padding: '16px 18px', lineHeight: '1.55', color: '#333', whiteSpace: 'pre-wrap'
                });
                if (isConfirm) {
                    body.innerHTML = message.replace(/\n/g, '<br>');
                } else {
                    body.textContent = message;
                }

                const footer = document.createElement('div');
                Object.assign(footer.style, {
                    display: 'flex', justifyContent: 'flex-end', gap: '10px',
                    padding: '10px 14px', borderTop: '1px solid #e8e8e8', backgroundColor: '#f9f9fb'
                });

                const btnBase = {
                    padding: '6px 18px', borderRadius: '6px', border: '1px solid #aaa',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.12s ease'
                };

                let cancelBtn = null;
                if (isConfirm) {
                    cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancel';
                    Object.assign(cancelBtn.style, { ...btnBase, background: '#f0f0f0', color: '#444' });
                    cancelBtn.onmouseover = () => { cancelBtn.style.background = '#e0e0e0'; };
                    cancelBtn.onmouseout  = () => { cancelBtn.style.background = '#f0f0f0'; };
                    cancelBtn.onclick = () => {
                        document.body.removeChild(overlay);
                        document.removeEventListener('keydown', keyHandler, true);
                        resolve(false);
                    };
                    footer.appendChild(cancelBtn);
                }

                const okBtn = document.createElement('button');
                okBtn.textContent = 'OK';
                Object.assign(okBtn.style, { ...btnBase, background: '#4CAF50', color: '#fff', border: '1px solid #43a047' });
                okBtn.onmouseover = () => { okBtn.style.background = '#43a047'; };
                okBtn.onmouseout  = () => { okBtn.style.background = '#4CAF50'; };
                okBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', keyHandler, true);
                    resolve(isConfirm ? true : undefined);
                };
                footer.appendChild(okBtn);

                dlg.appendChild(hdr);
                dlg.appendChild(body);
                dlg.appendChild(footer);
                overlay.appendChild(dlg);
                document.body.appendChild(overlay);

                // Position dialog
                setTimeout(() => {
                    if (triggerEl) {
                        const r  = triggerEl.getBoundingClientRect();
                        const dr = dlg.getBoundingClientRect();
                        let top  = r.bottom + 10;
                        let left = r.left;
                        if (top  + dr.height > window.innerHeight) top  = r.top - dr.height - 10;
                        if (left + dr.width  > window.innerWidth)  left = window.innerWidth - dr.width - 10;
                        if (left < 0) left = 10;
                        dlg.style.left = left + 'px';
                        dlg.style.top  = top  + 'px';
                    } else {
                        dlg.style.left      = '50%';
                        dlg.style.top       = '50%';
                        dlg.style.transform = 'translate(-50%, -50%)';
                    }
                    okBtn.focus();
                }, 0);

                const keyHandler = (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault(); e.stopPropagation();
                        if (isConfirm && cancelBtn) { cancelBtn.click(); } else { okBtn.click(); }
                    } else if (e.key === 'Enter') {
                        e.preventDefault(); e.stopPropagation();
                        okBtn.click();
                    } else if (e.key === 'Tab' && isConfirm && cancelBtn) {
                        e.preventDefault(); e.stopPropagation();
                        if (document.activeElement === okBtn) { cancelBtn.focus(); } else { okBtn.focus(); }
                    }
                };
                // Capture phase so it fires before the settings-modal Escape handler
                document.addEventListener('keydown', keyHandler, true);
            });
        };

        /**
         * Convenience wrapper: alert-style dialog (single OK button).
         * @param {string}           message
         * @param {string}           [title]
         * @param {HTMLElement|null} [triggerEl]
         * @returns {Promise<void>}
         */
        const showCustomAlert = function(message, title = 'Notice', triggerEl = null) {
            return showCustomDialog(message, title, triggerEl, 'alert');
        };

        /**
         * Convenience wrapper: confirm-style dialog (Cancel + OK buttons).
         * @param {string}           message
         * @param {string}           [title]
         * @param {HTMLElement|null} [triggerEl]
         * @returns {Promise<boolean>}
         */
        const showCustomConfirm = function(message, title = 'Confirm', triggerEl = null) {
            return showCustomDialog(message, title, triggerEl, 'confirm');
        };

        // --- 3. Settings Logic ---
        const settingsInterface = {
            values: {},

            /**
             * What a consumer script wants EVERY settings-open to do, registered
             * once via {@link VZ_MBLibrary#configureSettings}.
             *
             * Three of six entry points used to be second class. The GM menu
             * item and the MusicBrainz *Editing* link both call
             * `showModal()` with no arguments, while a consumer's own toolbar
             * button called `showSettings({functionRegistry})` — so via those
             * two menus a `type: 'function'` entry's 🔧 button silently did
             * nothing, and any button the consumer injects into the dialog
             * never appeared at all. Neither failure says anything on screen.
             *
             * Registering the intent on the library instead of passing it at
             * each call site is what makes the six paths identical by
             * construction rather than by everyone remembering.
             *
             * @type {{functionRegistry: Object<string, Function>,
             *         beforeOpen: ?Function}}
             */
            opts: { functionRegistry: {}, beforeOpen: null },

            /**
             * Records what every settings-open should do. Merges, so a later
             * call adds to the registry rather than replacing it.
             *
             * @param {{functionRegistry?: Object<string, Function>,
             *          beforeOpen?: Function}} opts
             */
            configure: function(opts) {
                if (!opts || typeof opts !== 'object') return;
                if (opts.functionRegistry && typeof opts.functionRegistry === 'object') {
                    Object.assign(this.opts.functionRegistry, opts.functionRegistry);
                }
                if (typeof opts.beforeOpen === 'function') {
                    this.opts.beforeOpen = opts.beforeOpen;
                }
            },

            /**
             * Initialise settings values from GM storage, falling back to schema defaults.
             */
            init: function() {
                if (!configSchema) return;
                for (const key in configSchema) {
                    this.values[key] = GM_getValue(key, configSchema[key].default);
                }
            },

            /**
             * Determines whether text on a given hex background should be black or white.
             * Uses the YIQ contrast formula.
             * @param {string} hexcolor - 6-digit hex colour string (with or without leading #)
             * @returns {'black'|'white'}
             */
            getContrastYIQ: function(hexcolor) {
                hexcolor = hexcolor.replace('#', '');
                const r = parseInt(hexcolor.substr(0, 2), 16);
                const g = parseInt(hexcolor.substr(2, 2), 16);
                const b = parseInt(hexcolor.substr(4, 2), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                return (yiq >= 128) ? 'black' : 'white';
            },

            /**
             * Resolves any valid CSS color value (named, hex, rgb, hsl, …) to a
             * 6-digit hex string that iro.js can consume.
             *
             * iro.js v5 does NOT accept CSS named colors (e.g. "green", "red") as
             * its `color` initialisation option — passing one causes it to silently
             * fall back to black (#000000), making the picker open at the wrong
             * colour.  This helper asks the browser itself to resolve the colour by
             * writing it to a temporary off-screen element and reading back the
             * computed style, which the browser always returns as "rgb(r, g, b)".
             * That rgb string is then converted to a hex string.
             *
             * Returns "#000000" if the colour value cannot be resolved (invalid input).
             *
             * @param {string} cssColor - Any CSS colour string (named, hex, rgb, …)
             * @returns {string} A 6-digit hex colour string, e.g. "#008000"
             */
            cssColorToHex: function(cssColor) {
                try {
                    const el = document.createElement('div');
                    el.style.color = cssColor;
                    // Append briefly so the browser resolves the value
                    document.body.appendChild(el);
                    const computed = getComputedStyle(el).color; // always "rgb(r, g, b)"
                    document.body.removeChild(el);
                    // Parse "rgb(r, g, b)" → "#rrggbb"
                    const m = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                    if (!m) return '#000000';
                    return '#' + [m[1], m[2], m[3]]
                        .map(n => parseInt(n, 10).toString(16).padStart(2, '0'))
                        .join('');
                } catch (_) {
                    return '#000000';
                }
            },

            /**
             * Applies a colour preview to a colour-picker text input and its swatch button.
             * @param {string} inputId - DOM id of the colour text input
             * @param {string} color   - CSS colour value (any format the browser accepts)
             */
            applyColorPreview: function(inputId, color) {
                const input = document.getElementById(inputId);
                const btn   = document.getElementById(`${inputId}-picker-btn`);
                if (input) {
                    input.style.backgroundColor = color;
                    input.style.color = this.getContrastYIQ(color);
                }
                if (btn) { btn.style.backgroundColor = color; }
            },

            /**
             * Answers whether a widget value is indistinguishable from the
             * schema default for that key.
             *
             * The comparison is deliberately loose, because the dialog's own
             * widgets are loose: every non-checkbox input hands back a STRING,
             * so a `type: 'number'` default of `30` arrives as `'30'`. That is
             * the same comparison `hasUnsavedChanges()` has always made, and
             * for the same reason.
             *
             * `color_picker` additionally compares case-insensitively. The
             * schema writes its defaults in mixed case (`#FFD700`, `#bababa`)
             * while iro.js writes back lowercase, so re-picking the colour a
             * setting already had would otherwise count as a change and pin it
             * forever — which is the very thing {@link persist} exists to stop.
             *
             * @param {string} key    A configSchema key.
             * @param {*}      value  The widget's value.
             * @returns {boolean}
             */
            isSchemaDefault: function(key, value) {
                const cfg = configSchema && configSchema[key];
                if (!cfg || !('default' in cfg)) return false;
                if (cfg.type === 'checkbox') {
                    return (value === true || value === 'true') ===
                           (cfg.default === true || cfg.default === 'true');
                }
                if (cfg.type === 'color_picker') {
                    return String(value).trim().toLowerCase() ===
                           String(cfg.default).trim().toLowerCase();
                }
                return String(value) === String(cfg.default);
            },

            /**
             * Writes new setting values to GM storage as a DIRTY SET: a value
             * that equals its schema default is DELETED rather than stored.
             *
             * ── Why storage must not hold the defaults ───────────────────────
             *
             * `init()` reads `GM_getValue(key, configSchema[key].default)`, so
             * a stored value shadows the schema for ever. This handler used to
             * write every key the dialog rendered — all of them, on every SAVE,
             * whether or not anything had changed — so the first time a user
             * pressed SAVE, even having changed nothing, the whole schema froze
             * into their profile and no default shipped afterwards ever reached
             * them again. Measured on ShowAllEntityData: ten settings had
             * already diverged that way, and four more keys were still stored
             * after being dropped from the schema entirely. See
             * `ShowAllEntityData/org/config-handling.org` F1.
             *
             * Deleting is safe precisely because of that read: an absent key
             * and a key stored at the default resolve identically TODAY. The
             * only thing that changes is the future — an absent key follows the
             * schema, a stored one does not.
             *
             * ── GM_deleteValue is feature-detected, deliberately ─────────────
             *
             * A `@require`d library runs in the CONSUMER's sandbox with the
             * consumer's grants, and not every consumer grants `GM_deleteValue`
             * (MB_PageEnhancer does not, as of this version). Calling it there
             * would throw inside SAVE and lose the user's edits outright, so an
             * ungranted consumer falls back to `GM_setValue` — i.e. to exactly
             * the behaviour it had before this version. It does NOT silently
             * get a half-applied dirty set.
             *
             * Split out of {@link save} so the write half can be tested at all:
             * `save()` ends in `location.reload()`, which no test can drive
             * without also losing the assertions standing after it.
             *
             * @param {Object} newValues - Plain object mapping setting keys to new values
             * @returns {{stored: number, cleared: number}} Per-key tallies.
             */
            persist: function(newValues) {
                const canDelete = (typeof GM_deleteValue === 'function');
                let stored = 0, cleared = 0;
                for (const key in newValues) {
                    if (canDelete && this.isSchemaDefault(key, newValues[key])) {
                        GM_deleteValue(key);
                        cleared++;
                    } else {
                        GM_setValue(key, newValues[key]);
                        stored++;
                    }
                }
                return { stored, cleared };
            },

            /**
             * Persists new setting values to GM storage and reloads the page.
             *
             * **The reload is skippable, and the dialog skips it when nothing
             * changed.** Consumers read their settings once at startup, so a
             * reload is how a saved change takes effect — but it also discards
             * whatever the page had built, which on ShowAllEntityData can be a
             * fetched table of several thousand rows. Paying that to apply
             * nothing is the kind of small insult that makes a settings dialog
             * unpleasant to open. The write still happens either way: since
             * 4.1.0 it is a dirty set, so an unchanged SAVE is what prunes a
             * profile that an older version had frozen.
             *
             * @param {Object} newValues - Plain object mapping setting keys to new values
             * @param {boolean} [reload=true] - false to persist without reloading
             * @returns {{stored: number, cleared: number}}
             */
            save: function(newValues, reload = true) {
                const { stored, cleared } = this.persist(newValues);
                loggerInterface.info('init',
                    `Settings saved — ${stored} stored, ${cleared} left at their ` +
                    `default.` + (reload ? ' Reloading...' : ' Nothing changed, not reloading.'));
                if (reload) location.reload();
                return { stored, cleared };
            },

            /**
             * Opens the settings configuration modal dialog.
             *
             * The modal is built using a flex/div-based card layout (not a <table>) to
             * avoid the ghost-shadow row glitch that table-row height calculations caused
             * when collapsing section headers.  All features are preserved:
             *   - Collapsible section headers (with ▼/▶ toggle)
             *   - "Collapse all / Uncollapse all" bulk toggle button
             *   - Real-time search filter
             *   - Per-setting widgets: checkbox, number, text, color_picker, popup_dialog,
             *     keyboard_shortcut
             *   - Global RESET with confirmation
             *   - Unsaved-change detection on CLOSE / Escape / backdrop click
             *   - Draggable and resizable dialog with persisted size
             */
            showModal: function(functionRegistry) {
                if (!configSchema) return;

                // Fall back to whatever the consumer registered with
                // `configureSettings()`. An explicitly-passed registry still
                // wins, so the 3.15.0 call shape keeps working — but an EMPTY
                // object counts as "nothing passed", because that is what
                // `showSettings()` used to hand over when called with no opts,
                // and the two have always meant the same thing.
                if (!functionRegistry || typeof functionRegistry !== 'object' ||
                    Object.keys(functionRegistry).length === 0) {
                    functionRegistry = this.opts.functionRegistry || {};
                }

                // Anything the consumer needs armed BEFORE the overlay exists —
                // ShowAllEntityData watches for it with a one-shot
                // MutationObserver to inject its 💾/📂 buttons, so a hook that
                // ran afterwards would be too late. Guarded: a consumer's
                // broken hook must not cost the user their settings dialog.
                if (typeof this.opts.beforeOpen === 'function') {
                    try {
                        this.opts.beforeOpen();
                    } catch (err) {
                        loggerInterface.error('init',
                            `settings beforeOpen hook threw, opening anyway: ${err && err.message}`);
                    }
                }

                const sizeKey      = `${scriptId}-modal-size`;
                const colWidthsKey = `${scriptId}-col-widths`;
                const savedSize    = GM_getValue(sizeKey,      { width: 940, height: 680 });
                const savedColW    = GM_getValue(colWidthsKey, { col1: 500, col2: 130 });
                let _col1W = Math.max(320, savedColW.col1 || 500);
                let _col2W = Math.max(80,  savedColW.col2 || 130);

                // ── Overlay ───────────────────────────────────────────────────────
                const overlay = document.createElement('div');
                overlay.id = `${scriptId}-settings-overlay`;
                Object.assign(overlay.style, {
                    position: 'fixed', inset: '0',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)',
                    zIndex: '10000',
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                });

                // ── Container ─────────────────────────────────────────────────────
                const container = document.createElement('div');
                container.id = `${scriptId}-config-container`;
                Object.assign(container.style, {
                    position: 'relative',
                    backgroundColor: '#f4f6f9',
                    borderRadius: '14px',
                    color: '#222',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    width:     savedSize.width  + 'px',
                    height:    savedSize.height + 'px',
                    minWidth:  '740px',
                    minHeight: '450px',
                    maxWidth:  '95vw',
                    maxHeight: '92vh',
                    display:   'flex',
                    flexDirection: 'column',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
                    border:    '1px solid #d0d5dd',
                    transform: 'scale(0.96)',
                    opacity:   '0',
                    transition: 'all 0.18s ease',
                    overflow:  'hidden'  // clip children — eliminates any bleed artefacts
                });

                // ── HTML-escape helper for attribute values ────────────────────────
                const escAttr = s => String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                // ── Build setting cards ───────────────────────────────────────────
                // Rows are built as real DOM elements (not innerHTML strings) so that
                // display:flex cannot be stripped by the browser's HTML parser or any
                // content-script sanitizer when injected via innerHTML.
                let currentSection = '';
                // ── Version strings for the header ────────────────────────────────
                //
                // A version in the header is not decoration: the ❓ Help and 📜
                // ChangeLog dialogs fetch from a published mirror that can lag
                // the installed script by months, so "which version am I
                // actually running" is a question a user has real cause to ask,
                // and the settings dialog is where they already are.
                //
                // BOTH numbers are shown because a @require'd library is
                // invisible from Tampermonkey's own UI — it has no entry in the
                // installed-scripts list — and a consumer can be paired with an
                // older library than its author tested against. That is not
                // hypothetical: ShowAllEntityData 9.99.1138 ran against library
                // 4.0.0 for anyone who installed from the mirror, and the whole
                // settings dialog behaved differently with no error anywhere.
                //
                // GM_info is FEATURE-DETECTED, like GM_deleteValue: a library
                // running in a consumer's sandbox gets the consumer's grants,
                // and a missing one must cost a line of text, not the dialog.
                const _splitVer = (v) => {
                    const s = String(v || '');
                    const plus = s.indexOf('+');
                    return plus === -1
                        ? { num: s, date: '' }
                        : { num: s.slice(0, plus), date: s.slice(plus + 1) };
                };
                const _libVer = _splitVer(LIBRARY_VERSION);
                const _scriptVer = _splitVer(
                    (typeof GM_info !== 'undefined' && GM_info && GM_info.script)
                        ? GM_info.script.version : '');

                /**
                 * The tooltip every widget, label and Default cell in a row
                 * shares: what the setting does, what it defaults to, and the
                 * GM storage key it is kept under.
                 *
                 * The description is already in column 3, so this looks
                 * redundant — it is not, for three reasons. The dialog is
                 * routinely narrower than its content, so column 3 is the first
                 * thing a user squeezes; the search highlight rewrites column
                 * 3's innerHTML, so the text moves under you while filtering;
                 * and the STORAGE KEY appears nowhere else in the UI at all,
                 * while being exactly what someone editing an exported config
                 * file by hand needs (org/config-handling.org's whole export
                 * half is keyed by it).
                 *
                 * @param {Object} cfg  The configSchema entry.
                 * @param {string} key  Its GM storage key.
                 * @param {string} dflt What the Default column shows.
                 * @param {string} note The Default column's parenthetical, if any.
                 * @returns {string} Plain text, newline-separated.
                 */
                const widgetTitle = (cfg, key, dflt, note) => {
                    const lines = [cfg.label];
                    if (cfg.description) lines.push('', String(cfg.description));
                    lines.push('', note ? `Default: ${note}` : `Default: ${dflt === '' ? '(empty)' : dflt}`);
                    lines.push(`Stored as: ${key}`);
                    return lines.join('\n');
                };

                // Fragment collects all rows; injected once via appendChild after
                // container.innerHTML sets up the shell.
                const settingsFragment = document.createDocumentFragment();
                let rowIndex = 0;
                let _sectionCount = 0;
                let _settingCount = 0;

                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type === 'divider') {
                        currentSection = key;
                        _sectionCount++;
                        const hdr = document.createElement('div');
                        hdr.className = 'vz-section-header';
                        hdr.dataset.section = key;
                        hdr.title = `${cfg.label}\n\nClick to expand or collapse this section.\n` +
                                    'Sections remember whether you left them open.';
                        Object.assign(hdr.style, {
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px',
                            background: 'linear-gradient(to right,#5a6778,#7a94a8,#5a6778)',
                            color: '#fff', fontWeight: '600', fontSize: '0.9em',
                            cursor: 'pointer', userSelect: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.15)'
                        });
                        const arrow = document.createElement('span');
                        arrow.className = 'vz-section-arrow';
                        Object.assign(arrow.style, { fontSize: '0.75em', transition: 'transform 0.2s' });
                        arrow.textContent = '▼';
                        const lbl = document.createElement('span');
                        lbl.textContent = cfg.label;

                        // How many settings in this section differ from their
                        // default. This is the half of "what have I changed?"
                        // that matters: with 38 sections all collapsed, a
                        // per-row marker you can only see by opening every
                        // section is not an answer.
                        const badge = document.createElement('span');
                        badge.className = 'vz-section-changed-badge';
                        badge.dataset.section = key;
                        badge.hidden = true;

                        // Per-section RESET. The global one is all-or-nothing,
                        // which across 238 settings means it is the button you
                        // never dare press.
                        const secReset = document.createElement('button');
                        secReset.type = 'button';
                        secReset.className = 'vz-section-reset';
                        secReset.dataset.section = key;
                        secReset.textContent = '↺';
                        secReset.title = `Reset "${cfg.label}" to defaults\n\n` +
                                         'Only the settings in this section, and only the ones that\n' +
                                         'actually differ — you are told how many first.\n' +
                                         'Nothing is stored until you press SAVE.';

                        hdr.appendChild(arrow);
                        hdr.appendChild(lbl);
                        hdr.appendChild(badge);
                        hdr.appendChild(secReset);
                        settingsFragment.appendChild(hdr);
                        return;
                    }

                    const inputId = `${scriptId}-input-${key}`;
                    _settingCount++;
                    const isCheck         = cfg.type === 'checkbox';
                    const isNumber        = cfg.type === 'number';
                    const isColor         = cfg.type === 'color_picker';
                    const isPopupDialog   = cfg.type === 'popup_dialog';
                    const isKeyboardShort = cfg.type === 'keyboard_shortcut';
                    const isFunction      = cfg.type === 'function';
                    const isTable         = cfg.type === 'table';

                    // ── What the "Default" column should actually say ─────────────
                    // Three entry types have no default a user could compare
                    // against, and each used to print something misleading:
                    //   • table    — has no `default:` at all (rows are seeded
                    //                from code on first use), so String(cfg.default)
                    //                rendered the literal "undefined";
                    //   • function — its `default:` is an INTERNAL METHOD NAME
                    //                resolved through the functionRegistry, so
                    //                the column showed a private identifier;
                    //   • popup_dialog — showed the fixed placeholder
                    //                "(pipe-sep.)", i.e. the format instead of
                    //                the value, for the one type whose default
                    //                is hardest to reconstruct by hand.
                    // The first two now say what they are; the third says what
                    // it IS, which the sub-field editor already labels.
                    //
                    // Computed HERE, ahead of the widget markup, because the
                    // shared row tooltip quotes it — the tooltip is the only
                    // place a user can read the default while the Default
                    // column is scrolled out of view or dragged narrow.
                    const hasComparableDefault = !isTable && !isFunction;
                    const defaultText = hasComparableDefault ? String(cfg.default ?? '') : '';
                    const defaultNote = isTable ? '(seeded from code)'
                                      : isFunction ? '(an action, not a value)'
                                      : '';
                    const rowTitle  = widgetTitle(cfg, key, defaultText, defaultNote);
                    const titleAttr = ` title="${escAttr(rowTitle)}"`;

                    // ── Build the input widget HTML (still as a string — only the
                    //    outer row flex layout needs DOM construction) ──────────────
                    let inputHtml  = '';
                    let subgridEl  = null;  // optional DOM element appended after row

                    if (isCheck) {
                        inputHtml = `<input type="checkbox" id="${inputId}" ${this.values[key] ? 'checked' : ''} class="vz-setting-checkbox"${titleAttr}>`;
                    } else if (isNumber) {
                        inputHtml = `<input type="number" id="${inputId}" value="${escAttr(this.values[key])}" min="${cfg.min || 0}" max="${cfg.max || 100}" class="vz-setting-number"${titleAttr}>`;
                    } else if (isPopupDialog) {
                        const fields       = cfg.fields || [];
                        const currentParts = String(this.values[key]).split('|');
                        // Build one sub-input per field.  Fields listed in cfg.colorFields
                        // get a live-preview background on the text input plus a 🎨 picker
                        // button that reuses the shared pickerContainer infrastructure.
                        const _colorFieldSet = new Set(cfg.colorFields || []);
                        const subInputsHtml = fields.map((fieldName, fi) => {
                            const subVal    = currentParts[fi] !== undefined ? currentParts[fi] : '';
                            const subId     = `${inputId}-sub-${fi}`;
                            const isClrFld  = _colorFieldSet.has(fieldName);
                            // Background/preview colour for color fields is applied after
                            // insertion via _applySubColorPreview() (JS property assignment,
                            // CSP-safe), not baked into this markup string.
                            const subTip = escAttr(
                                `${fieldName} — field ${fi + 1} of ${fields.length} in "${cfg.label}"\n\n` +
                                (isClrFld
                                    ? 'A colour. Type a CSS colour, or use 🎨 to pick one.\n'
                                    : '') +
                                'The fields are stored as one pipe-separated value,\n' +
                                `under ${key}.`);
                            const pickerBtn = isClrFld
                                ? `<button type="button" id="${subId}-picker-btn" data-pd-picker-for="${subId}" ` +
                                  `class="vz-pd-sub-picker-btn" title="Pick a colour for &quot;${escAttr(fieldName)}&quot;">🎨</button>`
                                : '';
                            return `<label class="vz-pd-sub-label" title="${subTip}">` +
                                   `<span class="vz-pd-sub-fieldname">${escAttr(fieldName)}:</span>` +
                                   `<input type="text" id="${subId}" class="mb-pd-sub${isClrFld ? ' mb-pd-sub-color' : ''}" ` +
                                   `data-master="${inputId}" data-index="${fi}" value="${escAttr(subVal)}" title="${subTip}">` +
                                   `${pickerBtn}</label>`;
                        }).join('');
                        inputHtml = `<input type="hidden" id="${inputId}" value="${escAttr(this.values[key])}">` +
                                    `<button type="button" id="${inputId}-toggle" class="vz-pd-toggle-btn" ` +
                                    `title="${escAttr(`Edit the ${fields.length} fields of "${cfg.label}" separately\n\n` +
                                    'They are stored as one pipe-separated value; this opens a\n' +
                                    'row of labelled boxes so you do not have to count pipes.')}">✏️ Edit fields</button>`;

                        subgridEl = document.createElement('div');
                        subgridEl.id = `${inputId}-subgrid`;
                        subgridEl.className = 'mb-pd-subgrid';
                        subgridEl.dataset.section = currentSection;
                        subgridEl.dataset.pdOpen = 'false';
                        Object.assign(subgridEl.style, {
                            display: 'none', padding: '10px 16px 12px 32px',
                            background: '#e8edf5', borderTop: '1px solid #d0d8e8'
                        });
                        subgridEl.innerHTML = `<div class="vz-pd-subgrid-inner">${subInputsHtml}</div>`;
                    } else if (isFunction) {
                        // An ACTION, not a value — it runs as soon as you press
                        // it and SAVE has nothing to do with it. Worth saying,
                        // because every other row in this dialog is a value.
                        inputHtml = `<button type="button" id="${inputId}-fn-btn" class="vz-fn-btn" ` +
                            `title="${escAttr(`${cfg.label}\n\n` + (cfg.description ? cfg.description + '\n\n' : '') +
                            'Runs straight away. This is an action, not a setting —\n' +
                            'there is nothing here for SAVE to store.')}">
                            🔧 ${cfg.label}</button>`;
                    } else if (isTable) {
                        // Its own editor has its own 💾, which writes immediately
                        // and does NOT wait for this dialog's SAVE. Getting that
                        // wrong loses the rows, so it goes in the tooltip.
                        inputHtml = `<button type="button" id="${inputId}-tbl-btn" class="vz-tbl-btn" ` +
                            `title="${escAttr(`${cfg.label}\n\n` + (cfg.description ? cfg.description + '\n\n' : '') +
                            'Opens a table editor with its own 💾 Save, which writes\n' +
                            'immediately — it does not wait for this dialog\'s SAVE.\n' +
                            `Rows are seeded from code on first use.\nStored as: ${key}`)}">
                            📋 Edit ${cfg.table_name || cfg.label}</button>`;
                    } else if (isKeyboardShort) {
                        inputHtml = `<input type="text" id="${inputId}" value="${escAttr(this.values[key])}" readonly class="vz-ks-input" ` +
                            `title="${escAttr(rowTitle + '\n\nRead-only — press 🎹 Capture and then the keys you want.')}">` +
                            `<button type="button" id="${inputId}-capture-btn" data-capturing="false" class="vz-ks-capture-btn" ` +
                            `title="${escAttr(`Record a new shortcut for "${cfg.label}"\n\n` +
                            'Press this, then the key combination. Escape cancels.')}">🎹 Capture</button>`;
                    } else {
                        inputHtml = `<input type="text" id="${inputId}" value="${escAttr(this.values[key])}" class="vz-setting-text"${titleAttr}>`;
                    }

                    if (isColor) {
                        inputHtml += `<button id="${inputId}-picker-btn" type="button" class="vz-color-picker-btn" ` +
                            `title="${escAttr(`Pick a colour for "${cfg.label}"\n\n` +
                            `The box to the left takes any CSS colour typed by hand.\nDefault: ${defaultText || '(empty)'}`)}">🎨</button>`;
                    }

                    // ── Row container — built as a real DOM element ───────────────
                    const cardBg = rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fc';
                    rowIndex++;

                    const row = document.createElement('div');
                    row.className = 'vz-setting-row';
                    row.dataset.section     = currentSection;
                    row.dataset.vzKey       = key;
                    // Store plain-text label + description for search-highlight restore
                    row.dataset.vzLabel     = cfg.label;
                    row.dataset.vzDesc      = String(cfg.description || '');
                    row.dataset.vzDefault   = defaultText;
                    // Set layout via JS property assignment — immune to innerHTML stripping
                    row.style.display        = 'flex';
                    row.style.flexWrap       = 'nowrap';
                    row.style.alignItems     = 'stretch';
                    row.style.background     = cardBg;
                    row.style.borderBottom   = '1px solid #e4e8ef';
                    row.style.minHeight      = '44px';

                    // Column 1 — label + input widget
                    const col1 = document.createElement('div');
                    col1.style.cssText = `flex:0 0 ${_col1W}px;width:${_col1W}px;min-width:0;padding:10px 14px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;border-right:1px solid #e4e8ef;box-sizing:border-box;`;
                    col1.dataset.vzSettingsCol = '1';
                    col1.innerHTML = `<label for="${inputId}" class="vz-setting-label"${titleAttr}>${cfg.label}:</label>${inputHtml}`;

                    // Column 2 — default value
                    const col2 = document.createElement('div');
                    col2.style.cssText = `flex:0 0 ${_col2W}px;width:${_col2W}px;min-width:0;padding:10px;font-size:0.76em;color:#888;text-align:center;border-right:1px solid #e4e8ef;word-break:break-all;display:flex;align-items:center;justify-content:center;box-sizing:border-box;`;
                    col2.dataset.vzSettingsCol = '2';
                    // The column is narrow and word-break:break-all, so a long
                    // default (a font stack, a pipe-separated popup_dialog
                    // value) is legible only as a tooltip.
                    col2.title = rowTitle;
                    if (defaultNote) {
                        col2.innerHTML = `<em>${escAttr(defaultNote)}</em>`;
                    } else {
                        col2.textContent = defaultText;
                    }

                    // Column 3 — description
                    const col3 = document.createElement('div');
                    col3.style.cssText = 'flex:1 1 0;min-width:0;padding:10px 14px;font-size:0.84em;color:#555;line-height:1.5;word-break:break-word;box-sizing:border-box;';
                    col3.title = rowTitle;
                    col3.textContent = cfg.description;

                    row.appendChild(col1);
                    row.appendChild(col2);
                    row.appendChild(col3);
                    settingsFragment.appendChild(row);
                    if (subgridEl) settingsFragment.appendChild(subgridEl);

                    if (isFunction) {
                        const _fnBtn = row.querySelector(`#${inputId}-fn-btn`);
                        if (_fnBtn && cfg.default && functionRegistry[cfg.default]) {
                            _fnBtn.addEventListener('click', e => {
                                e.preventDefault();
                                functionRegistry[cfg.default]();
                            });
                        }
                    }
                    if (isTable) {
                        const _tblBtn = row.querySelector(`#${inputId}-tbl-btn`);
                        if (_tblBtn) {
                            _tblBtn.addEventListener('click', e => {
                                e.preventDefault();
                                _openTableEditor(key, cfg);
                            });
                        }
                    }
                });

                // ── Full container HTML ───────────────────────────────────────────
                // Dialog shell CSS via GM_addStyle (not inline style="..." attributes
                // parsed from the innerHTML string below) — style attributes embedded
                // in HTML markup are subject to page CSP style-src the same as <style>
                // elements, and MusicBrainz's account/* pages block them. Targeted by
                // id/class instead of inline styles; ids reused 1:1 from the markup
                // below, plus a handful of new ids for previously-unstyled wrapper divs.
                document.getElementById(`${scriptId}-settings-modal-style`)?.remove();
                const modalStyleEl = GM_addStyle(`
                    /* ── Header band ────────────────────────────────────────
                       One tinted band carrying identity (name + versions) on
                       the left and the two destructive-ish actions on the
                       right, then a separate advisory line, then the toolbar.
                       It was a flat white strip with RESET and CLOSE as bare
                       text anchors separated by a pipe — which read as two
                       links of equal weight, and was not focusable at all
                       (an anchor with no href takes no tab stop). */
                    [id="${scriptId}-drag-header"] {
                        cursor: move;
                        user-select: none;
                        padding: 12px 18px 10px 18px;
                        background: linear-gradient(180deg,#f7f9fc 0%,#eef2f8 100%);
                        border-bottom: 1px solid #ccd3de;
                        flex-shrink: 0;
                    }
                    [id="${scriptId}-header-row"] {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 14px;
                    }
                    [id="${scriptId}-title"] {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 17px;
                        font-weight: 700;
                        color: #1a2340;
                        letter-spacing: 0.02em;
                        line-height: 1.2;
                    }
                    [id="${scriptId}-title-icon"] {
                        font-size: 15px;
                        opacity: 0.85;
                    }
                    /* Identity line. Monospace so two version numbers of
                       different length stay comparable at a glance. */
                    [id="${scriptId}-version-row"] {
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        gap: 6px;
                        margin-top: 5px;
                    }
                    .vz-hdr-chip {
                        display: inline-flex;
                        align-items: baseline;
                        gap: 5px;
                        font-size: 10.5px;
                        line-height: 1.5;
                        padding: 1px 8px;
                        border-radius: 10px;
                        border: 1px solid #ccd5e2;
                        background: #fff;
                        color: #5a6678;
                        white-space: nowrap;
                        cursor: help;
                    }
                    /* The class above sets display, so it OUTRANKS the UA
                       stylesheet's [hidden] { display: none } — without this
                       the changed badge renders as an empty pill on exactly
                       the profile it exists to say nothing about. The same
                       trap as setting el.hidden while a class owns display. */
                    .vz-hdr-chip[hidden] {
                        display: none;
                    }
                    .vz-hdr-chip b {
                        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                        font-weight: 700;
                        color: #24304a;
                        letter-spacing: -0.01em;
                    }
                    .vz-hdr-chip-lib b {
                        color: #1565a8;
                    }
                    [id="${scriptId}-changed-chip"] {
                        border-color: #e8a45a;
                        background: #fff4e6;
                        color: #8a4500;
                        font-weight: 700;
                    }
                    [id="${scriptId}-reset-close-row"] {
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        flex-shrink: 0;
                    }
                    [id="${scriptId}-reset"],
                    [id="${scriptId}-close"] {
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 0.78em;
                        letter-spacing: 0.04em;
                        padding: 5px 11px;
                        border-radius: 6px;
                        border: 1px solid #c3ccd9;
                        background: #fff;
                        color: #5a6678;
                        text-decoration: none;
                        line-height: 1.4;
                        transition: background 0.15s, border-color 0.15s, color 0.15s;
                    }
                    [id="${scriptId}-reset"]:hover {
                        background: #fff1f0;
                        border-color: #d98b84;
                        color: #a4322a;
                    }
                    [id="${scriptId}-close"]:hover {
                        background: #eef2f8;
                        border-color: #9aa7ba;
                        color: #24304a;
                    }
                    /* The advisory line moved out of the identity block: it is
                       about what SAVE does, not about what this dialog IS, and
                       stacking it under the title made the two read as one
                       thought. */
                    [id="${scriptId}-subtitle"] {
                        display: flex;
                        align-items: flex-start;
                        gap: 6px;
                        font-size: 11.5px;
                        color: #8a4500;
                        font-weight: 600;
                        margin-top: 9px;
                        padding: 6px 9px;
                        border-radius: 6px;
                        border: 1px solid #f0dcc0;
                        background: #fff8ee;
                        line-height: 1.45;
                    }
                    /* ── "what have I changed?" ──────────────────────────────
                       A changed row gets a left accent and its label goes bold;
                       the marker is a ::after on the label so it costs the row
                       no layout and survives the search-highlight rewrite,
                       which replaces the label's innerHTML. */
                    .vz-setting-row.vz-setting-changed {
                        box-shadow: inset 3px 0 0 0 #e07000;
                    }
                    .vz-setting-row.vz-setting-changed .vz-setting-label {
                        font-weight: 700;
                        color: #8a4500;
                    }
                    .vz-section-changed-badge {
                        background: rgba(255,255,255,0.9);
                        color: #8a4500;
                        font-size: 0.72em;
                        font-weight: 700;
                        border-radius: 9px;
                        padding: 1px 7px;
                        white-space: nowrap;
                    }
                    .vz-section-reset {
                        margin-left: auto;
                        cursor: pointer;
                        border: 1px solid rgba(255,255,255,0.45);
                        background: rgba(255,255,255,0.14);
                        color: #fff;
                        border-radius: 5px;
                        font-size: 0.95em;
                        line-height: 1;
                        padding: 3px 7px;
                    }
                    .vz-section-reset:hover {
                        background: rgba(255,255,255,0.3);
                    }
                    [id="${scriptId}-changed-only-btn"][aria-pressed="true"] {
                        background: #fff3e0;
                        border-color: #e07000;
                        color: #8a4500;
                        font-weight: 700;
                    }
                    [id="${scriptId}-no-matches"] {
                        padding: 18px 16px;
                        color: #777;
                        font-size: 0.9em;
                        font-style: italic;
                        text-align: center;
                    }
                    [id="${scriptId}-search-row"] {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-top: 10px;
                    }
                    [id="${scriptId}-search-wrap"] {
                        flex: 1;
                        position: relative;
                        display: flex;
                        align-items: center;
                    }
                    [id="${scriptId}-search"] {
                        width: 100%;
                        padding: 7px 32px 7px 10px;
                        border-radius: 6px;
                        border: 1px solid #c8cdd5;
                        font-size: 0.88em;
                        background: #f8f9fc;
                        outline: none;
                        box-sizing: border-box;
                    }
                    [id="${scriptId}-search-clear"] {
                        position: absolute;
                        right: 7px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        color: #cc2200;
                        cursor: pointer;
                        font-size: 13px;
                        line-height: 1;
                        padding: 0 2px;
                        display: none;
                        opacity: 0.75;
                    }
                    [id="${scriptId}-collapse-all-btn"],
                    [id="${scriptId}-changed-only-btn"] {
                        white-space: nowrap;
                        padding: 6px 12px;
                        font-size: 0.85em;
                        cursor: pointer;
                        border: 1px solid #aaa;
                        border-radius: 5px;
                        background: #eff1f5;
                        flex-shrink: 0;
                    }
                    [id="${scriptId}-col-hdr-row"] {
                        display: flex;
                        gap: 0;
                        background: #e8ecf2;
                        border-left: 1px solid #d0d5dd;
                        border-right: 1px solid #d0d5dd;
                        border-bottom: 1px solid #d0d5dd;
                        flex-shrink: 0;
                        font-size: 0.78em;
                        font-weight: 700;
                        color: #556;
                        letter-spacing: 0.04em;
                        text-transform: uppercase;
                    }
                    [id="${scriptId}-col-hdr-1"] {
                        flex: 0 0 ${_col1W}px;
                        width: ${_col1W}px;
                        padding: 6px 14px;
                        border-right: none;
                        box-sizing: border-box;
                        position: relative;
                    }
                    [id="${scriptId}-col-hdr-2"] {
                        flex: 0 0 ${_col2W}px;
                        width: ${_col2W}px;
                        padding: 6px 10px;
                        text-align: center;
                        border-right: none;
                        box-sizing: border-box;
                        position: relative;
                    }
                    [id="${scriptId}-col-drag-1"],
                    [id="${scriptId}-col-drag-2"] {
                        position: absolute;
                        right: -3px;
                        top: 0;
                        bottom: 0;
                        width: 6px;
                        cursor: col-resize;
                        z-index: 10;
                        background: transparent;
                    }
                    [id="${scriptId}-col-hdr-3"] {
                        flex: 1 1 0;
                        padding: 6px 14px;
                        box-sizing: border-box;
                        border-left: 1px solid #d0d5dd;
                    }
                    [id="${scriptId}-settings-body"] {
                        flex: 1 1 0;
                        overflow-y: auto;
                        background: #f4f6f9;
                        border-left: 1px solid #d0d5dd;
                        border-right: 1px solid #d0d5dd;
                    }
                    [id="${scriptId}-footer"] {
                        flex-shrink: 0;
                        padding: 12px 18px 12px 18px;
                        background: #fff;
                        border-top: 2px solid #ccd0d8;
                        text-align: right;
                    }
                    [id="${scriptId}-save-btn"] {
                        padding: 9px 24px;
                        font-weight: 700;
                        border-radius: 8px;
                        border: 1px solid #3a9c3e;
                        background: #4CAF50;
                        color: #fff;
                        cursor: pointer;
                        font-size: 0.95em;
                        transition: all 0.15s ease;
                    }
                    [id="${scriptId}-resize-handle"] {
                        position: absolute;
                        width: 20px;
                        height: 20px;
                        right: 4px;
                        bottom: 4px;
                        cursor: nwse-resize;
                        opacity: 0.5;
                        background: linear-gradient(135deg,transparent 45%,#999 45%,#999 55%,transparent 55%);
                    }
                    [id="${scriptId}-picker-container"] {
                        position: absolute;
                        display: none;
                        background: #fff;
                        border: 1px solid #ccc;
                        padding: 10px;
                        z-index: 10001;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                        border-radius: 6px;
                    }
                    /* ── Per-row setting widgets ── */
                    .vz-setting-checkbox {
                        width: 16px;
                        height: 16px;
                        cursor: pointer;
                    }
                    .vz-setting-number {
                        width: 90px;
                        height: 26px;
                        padding: 0 6px;
                        box-sizing: border-box;
                        border: 1px solid #c8cdd5;
                        border-radius: 5px;
                        font-size: 0.9em;
                        background: #fff;
                    }
                    .vz-setting-text {
                        width: 170px;
                        padding: 4px 7px;
                        border: 1px solid #c8cdd5;
                        border-radius: 5px;
                        font-size: 0.9em;
                        background: #fff;
                    }
                    .vz-pd-toggle-btn,
                    .vz-fn-btn,
                    .vz-ks-capture-btn {
                        font-size: 0.8em;
                        padding: 3px 9px;
                        cursor: pointer;
                        border: 1px solid #aaa;
                        border-radius: 4px;
                        background: #eff1f5;
                        vertical-align: middle;
                    }
                    .vz-ks-capture-btn {
                        margin-left: 5px;
                    }
                    .vz-tbl-btn {
                        font-size: 0.8em;
                        padding: 3px 10px;
                        cursor: pointer;
                        border: 1px solid #7090c0;
                        border-radius: 4px;
                        background: #e8f0fc;
                        vertical-align: middle;
                    }
                    .vz-ks-input {
                        width: 130px;
                        padding: 4px 7px;
                        border: 1px solid #c8cdd5;
                        border-radius: 5px;
                        font-family: monospace;
                        cursor: default;
                        background: #fff;
                    }
                    .vz-color-picker-btn {
                        margin-left: 6px;
                        width: 26px;
                        height: 26px;
                        border-radius: 4px;
                        cursor: pointer;
                        border: 1px solid #aaa;
                        vertical-align: middle;
                    }
                    .vz-pd-sub-label {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 0.82em;
                    }
                    .vz-pd-sub-fieldname {
                        min-width: 110px;
                        text-align: right;
                        color: #555;
                        font-weight: 600;
                        white-space: nowrap;
                    }
                    .vz-pd-sub-picker-btn {
                        width: 22px;
                        height: 22px;
                        border-radius: 3px;
                        cursor: pointer;
                        border: 1px solid #aaa;
                        padding: 0;
                        flex-shrink: 0;
                        background: #ffffff;
                    }
                    .mb-pd-sub {
                        width: 200px;
                        padding: 3px 6px;
                        border: 1px solid #bbb;
                        border-radius: 4px;
                        font-size: 0.95em;
                        font-family: monospace;
                        background: #fff;
                    }
                    .mb-pd-sub-color {
                        width: 130px;
                    }
                    .vz-pd-subgrid-inner {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px 24px;
                        align-items: center;
                    }
                    .vz-setting-label {
                        font-size: 0.85em;
                        font-weight: 500;
                        color: #334;
                        cursor: pointer;
                        white-space: nowrap;
                        margin-right: 4px;
                    }
                    .vz-search-mark {
                        background: #fff176;
                        border-radius: 2px;
                        padding: 0 1px;
                    }
                `);
                modalStyleEl.id = `${scriptId}-settings-modal-style`;

                container.innerHTML = `
                    <!-- ── Fixed header (drag handle) ── -->
                    <div id="${scriptId}-drag-header"
                         title="Drag anywhere on this bar to move the dialog.">
                        <div id="${scriptId}-header-row">
                            <div>
                                <div id="${scriptId}-title">
                                    <span id="${scriptId}-title-icon" aria-hidden="true">⚙️</span>
                                    <span id="${scriptId}-title-text">${escAttr(scriptName.toUpperCase())}</span>
                                </div>
                                <div id="${scriptId}-version-row">
                                    <span class="vz-hdr-chip vz-hdr-chip-script"
                                          title="${escAttr(`Userscript version${_scriptVer.date ? `, released ${_scriptVer.date}` : ''}\n\n` +
                                          'This is the version installed in your browser.\n' +
                                          'The ❓ Help and 📜 ChangeLog dialogs fetch their text from a\n' +
                                          'published mirror, which can be older than what you are running.')}">script <b>${escAttr(_scriptVer.num || 'unknown')}</b></span>
                                    <span class="vz-hdr-chip vz-hdr-chip-lib"
                                          title="${escAttr(`VZ_MBLibrary version${_libVer.date ? `, released ${_libVer.date}` : ''}\n\n` +
                                          'The shared library that renders this dialog. It is pulled in by\n' +
                                          '@require, so it has no entry of its own in Tampermonkey and this\n' +
                                          'is the only place its version is shown.\n\n' +
                                          'A script paired with an older library than its author tested\n' +
                                          'against behaves differently with no error anywhere — which is\n' +
                                          'exactly why this number is here.')}">library <b>${escAttr(_libVer.num)}</b></span>
                                    <span class="vz-hdr-chip"
                                          title="${escAttr(`${_settingCount} setting${_settingCount === 1 ? '' : 's'} in ` +
                                          `${_sectionCount} section${_sectionCount === 1 ? '' : 's'}\n\n` +
                                          'Use the search box, or ● Changed only, rather than scrolling.')}"><b>${_settingCount}</b> settings · <b>${_sectionCount}</b> sections</span>
                                    <span class="vz-hdr-chip" id="${scriptId}-changed-chip" hidden></span>
                                </div>
                            </div>
                            <div id="${scriptId}-reset-close-row">
                                <button type="button" id="${scriptId}-reset"
                                        title="${escAttr('Reset EVERY setting to its default\n\n' +
                                        'Asks first, and changes only what is on screen — nothing is\n' +
                                        'stored until you press SAVE, so a mis-click is recoverable by\n' +
                                        'closing the dialog.\n\n' +
                                        'To reset one section only, use the ↺ on its header.')}">↺ RESET</button>
                                <button type="button" id="${scriptId}-close"
                                        title="${escAttr('Close without saving (Escape)\n\n' +
                                        'You are asked to confirm if anything has been changed.')}">✕ CLOSE</button>
                            </div>
                        </div>
                        <div id="${scriptId}-subtitle"
                             title="${escAttr('A setting left at its default is not written to storage at all,\n' +
                             'so a later version shipping a better default reaches you.\n' +
                             'Only what you actually change is recorded.')}">
                            <span aria-hidden="true">ⓘ</span>
                            <span>Saving reloads the page to apply your changes.
                            Only settings you change are stored.</span>
                        </div>
                        <!-- search + collapse-all row -->
                        <div id="${scriptId}-search-row">
                            <div id="${scriptId}-search-wrap">
                                <input id="${scriptId}-search"
                                       type="text"
                                       placeholder="🔍 Search settings…"
                                       title="${escAttr('Search settings\n\n' +
                                       'Matches a setting\'s name, its description and its default value.\n' +
                                       'Sections holding a match open themselves while you type, and go\n' +
                                       'back to how you left them when you clear it.\n\n' +
                                       'Escape clears.')}">
                                <button id="${scriptId}-search-clear"
                                        type="button"
                                        title="Clear the search (Escape)">✕</button>
                            </div>
                            <button type="button"
                                    id="${scriptId}-changed-only-btn"
                                    aria-pressed="false"
                                    title="${escAttr('Show only settings that differ from their default\n\n' +
                                    'Combines with the search box. Disabled while nothing differs.')}">
                                ● Changed only
                            </button>
                            <button type="button"
                                    id="${scriptId}-collapse-all-btn"
                                    title="${escAttr('Collapse every section, or expand every section\n\n' +
                                    'The button follows what it will do next. Section state is\n' +
                                    'remembered, so this is also how you get back to a clean slate.')}">
                                ⬆ Collapse all
                            </button>
                        </div>
                    </div>

                    <!-- ── Sticky column headers (outside drag-header so widths match rows) ── -->
                    <div id="${scriptId}-col-hdr-row">
                        <div id="${scriptId}-col-hdr-1"
                             title="${escAttr('The setting\'s name and the control that changes it.\n\n' +
                             'Hover any control for what it does, its default and the\n' +
                             'storage key it is kept under.')}">Setting
                            <span id="${scriptId}-col-drag-1" title="Drag to resize the Setting column"></span>
                        </div>
                        <div id="${scriptId}-col-hdr-2"
                             title="${escAttr('What this setting is worth when you have never touched it.\n\n' +
                             'A row matching this value is not stored at all, so a later\n' +
                             'version shipping a different default reaches you.\n' +
                             'Column widths are remembered between opens.')}">Default
                            <span id="${scriptId}-col-drag-2" title="Drag to resize the Default column"></span>
                        </div>
                        <div id="${scriptId}-col-hdr-3"
                             title="${escAttr('What the setting does. Also searchable from the box above.')}">Description</div>
                    </div>

                    <!-- ── Scrollable content area ── -->
                    <div id="${scriptId}-settings-body">
                    </div>

                    <!-- ── Fixed footer ── -->
                    <div id="${scriptId}-footer">
                        <button id="${scriptId}-save-btn"
                                title="${escAttr('Store your changes and reload the page\n\n' +
                                'The reload is how a changed setting takes effect; it is skipped\n' +
                                'when nothing has changed. Settings left at their default are\n' +
                                'cleared from storage rather than written, so future defaults\n' +
                                'still reach you.')}">
                            SAVE
                        </button>
                    </div>

                    <!-- ── Resize handle ── -->
                    <div id="${scriptId}-resize-handle"
                         title="${escAttr('Drag to resize. The size is remembered between opens.')}">
                    </div>

                    <!-- ── Colour picker popup ── -->
                    <div id="${scriptId}-picker-container">
                    </div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                // Append the DOM-built settings rows (built before container.innerHTML
                // so they exist as real elements with style set via JS, immune to
                // innerHTML sanitization). Must run after body.appendChild so that
                // #settings-body is in the live document.
                document.getElementById(`${scriptId}-settings-body`).appendChild(settingsFragment);

                requestAnimationFrame(() => {
                    container.style.transform = 'scale(1)';
                    container.style.opacity = '1';
                });

                // Focus the search input when the dialog opens so the user can
                // immediately start typing to filter settings.
                // setTimeout used (vs rAF) to handle GM-menu-triggered opens where
                // page focus is momentarily stolen by the browser chrome.
                setTimeout(() => {
                    const searchEl = document.getElementById(`${scriptId}-search`);
                    if (searchEl) searchEl.focus();
                }, 200);

                // ── Dragging & Resizing ───────────────────────────────────────────
                const dragHeader = document.getElementById(`${scriptId}-drag-header`);
                let isDragging = false, isResizing = false, offsetX, offsetY;
                // didDrag / didResize: prevent the overlay click that terminates a
                // drag-or-resize-then-release-outside sequence from closing the dialog.
                let didDrag = false, didResize = false;

                // Injected during resize to lock cursor and suppress text selection globally.
                // Removed on mouseup so normal behaviour is fully restored.
                let resizingStyleEl = null;
                const startResizeCursor = () => {
                    if (resizingStyleEl) return;
                    // GM_addStyle so this is exempt from page CSP style-src restrictions.
                    resizingStyleEl = GM_addStyle('* { cursor: nwse-resize !important; user-select: none !important; -webkit-user-select: none !important; }');
                    resizingStyleEl.id = `${scriptId}-resizing-cursor`;
                };
                const stopResizeCursor = () => {
                    if (resizingStyleEl) { resizingStyleEl.remove(); resizingStyleEl = null; }
                };

                dragHeader.addEventListener('mousedown', e => {
                    // The header is the drag handle, but it also HOLDS every
                    // control except SAVE — RESET, CLOSE, the search box and
                    // the two toolbar buttons all live inside it. Pressing one
                    // armed a drag, so the dialog followed the pointer while
                    // you were deciding whether to release on the button. It
                    // also set `didDrag`, whose job is to suppress the overlay
                    // click that ends a drag — so a press-and-wiggle on CLOSE
                    // could swallow the very click meant to dismiss the dialog.
                    //
                    // **The SEARCH INPUT was already covered** by its own
                    // mousedown stopPropagation a few lines below ("Prevent
                    // dragging when clicking in search input"). The two overlap
                    // there and NEITHER is removed: this one is structural and
                    // picks up a control added later, that one is local and
                    // survives someone narrowing this selector. The overlap is
                    // recorded as an honest `expect: "pass"` in
                    // scripts/mutations/settings-dialog-header.json rather than
                    // left to be found later and tidied away as dead code.
                    if (e.target.closest('input, button, a, select, textarea, label')) return;
                    isDragging = true;
                    didDrag    = false;
                    offsetX = e.clientX - container.offsetLeft;
                    offsetY = e.clientY - container.offsetTop;
                    container.style.position = 'absolute';
                });

                document.addEventListener('mousemove', e => {
                    if (isDragging) {
                        didDrag = true;
                        container.style.left = `${e.clientX - offsetX}px`;
                        container.style.top  = `${e.clientY - offsetY}px`;
                    }
                    if (isResizing) {
                        didResize = true;
                        const rect = container.getBoundingClientRect();
                        container.style.width  = Math.max(740, Math.min(window.innerWidth  * 0.95, e.clientX - rect.left))  + 'px';
                        container.style.height = Math.max(480, Math.min(window.innerHeight * 0.92, e.clientY - rect.top))   + 'px';
                    }
                });

                document.addEventListener('mouseup', () => {
                    if (isResizing) {
                        GM_setValue(sizeKey, { width: container.offsetWidth, height: container.offsetHeight });
                        stopResizeCursor();
                    }
                    isDragging = false;
                    isResizing = false;
                });

                document.getElementById(`${scriptId}-resize-handle`)
                    .addEventListener('mousedown', e => {
                        e.stopPropagation();
                        isResizing = true;
                        didResize  = false;
                        startResizeCursor();
                    });

                // Prevent dragging when clicking in search input
                document.getElementById(`${scriptId}-search`)
                    .addEventListener('mousedown', e => e.stopPropagation());

                // ── Section state, search, "changed only": ONE visibility owner ───
                //
                // These used to be two mechanisms that both wrote
                // `row.style.display` and fought over it, last writer winning.
                // The visible symptoms were that a search left all 38 section
                // headers on screen with nothing under most of them, that a
                // match inside a collapsed section appeared under a header
                // still drawn as collapsed, and that clicking that header then
                // revealed every row in it rather than the matches. Adding a
                // third filter ("changed only") to that arrangement would have
                // made it three.
                //
                // So visibility is computed in one pass from three inputs —
                // the search needle, the changed-only toggle, and each
                // section's own collapsed state — and nothing else assigns
                // `display` to a row, a header or a sub-grid.

                /**
                 * Wraps every case-insensitive occurrence of needle in text with a
                 * yellow <mark> highlight span.  Returns plain-escaped text when needle
                 * is empty.  Safe to insert as innerHTML.
                 * @param {string} text   Plain text to highlight inside
                 * @param {string} needle Already lower-cased search string
                 * @returns {string} HTML string
                 */
                const highlightSettingsNeedle = (text, needle) => {
                    const safe = String(text ?? '')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    if (!needle) return safe;
                    const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return safe.replace(
                        new RegExp(`(${escapedNeedle})`, 'gi'),
                        '<mark class="vz-search-mark">$1</mark>'
                    );
                };

                const settingsSearchInput = document.getElementById(`${scriptId}-search`);
                const settingsClearBtn    = document.getElementById(`${scriptId}-search-clear`);
                const changedOnlyBtn      = document.getElementById(`${scriptId}-changed-only-btn`);
                const collapseAllBtn      = document.getElementById(`${scriptId}-collapse-all-btn`);
                const settingsBodyEl      = document.getElementById(`${scriptId}-settings-body`);
                const changedChipEl       = document.getElementById(`${scriptId}-changed-chip`);

                const sectionHeaderEls = Array.from(document.querySelectorAll('.vz-section-header'));
                const settingRowEls    = Array.from(document.querySelectorAll('.vz-setting-row'));

                // Shown when a filter matches nothing at all. Without it the
                // body is simply blank, which reads as a broken dialog rather
                // than an empty result.
                const noMatchesEl = document.createElement('div');
                noMatchesEl.id = `${scriptId}-no-matches`;
                noMatchesEl.hidden = true;
                if (settingsBodyEl) settingsBodyEl.appendChild(noMatchesEl);

                // ── Per-section collapse state, remembered across opens ────────────
                //
                // Every section used to re-collapse on every open, so finding
                // the one setting you adjust regularly meant the same hunt
                // through 38 headers every time. The stored shape is
                // {sectionKey: false} for an EXPANDED section — absent means
                // collapsed, so a profile that has never touched this, and any
                // section added by a later version, both keep the old
                // all-collapsed behaviour.
                const sectionStateKey = `${scriptId}-section-collapse`;
                let sectionState = {};
                const _storedSectionState = GM_getValue(sectionStateKey, null);
                if (_storedSectionState && typeof _storedSectionState === 'object') {
                    sectionState = _storedSectionState;
                }

                const isSectionCollapsed = (section) => sectionState[section] !== false;
                const setSectionCollapsed = (section, collapsed) => {
                    if (collapsed) delete sectionState[section];
                    else sectionState[section] = false;
                };
                const persistSectionState = () => GM_setValue(sectionStateKey, sectionState);

                // ── "Changed from default" ────────────────────────────────────────

                /**
                 * The value a row's widget currently holds, in the shape
                 * {@link isSchemaDefault} expects — or `undefined` for a row
                 * that has no comparable widget at all (`table` and `function`
                 * render a button, not a value).
                 * @param {HTMLElement} row
                 * @returns {*}
                 */
                const rowWidgetValue = (row) => {
                    const key = row.dataset.vzKey;
                    const cfg = key && configSchema[key];
                    if (!cfg) return undefined;
                    const el = document.getElementById(`${scriptId}-input-${key}`);
                    if (!el) return undefined;
                    return cfg.type === 'checkbox' ? el.checked : el.value;
                };

                /** Whether a row's widget differs from that setting's schema default. */
                const rowIsChanged = (row) => {
                    const value = rowWidgetValue(row);
                    if (value === undefined) return false;
                    return !settingsInterface.isSchemaDefault(row.dataset.vzKey, value);
                };

                let changedOnly = false;

                /**
                 * Re-derives the changed marks, the per-section badges and the
                 * toolbar count from the widgets as they stand right now.
                 *
                 * Deliberately recomputed rather than tracked incrementally:
                 * RESET (global and per-section), the popup-dialog sub-editors
                 * and the colour pickers all write widget values without going
                 * through a single choke point, and a counter maintained at
                 * each of those would be wrong the first time one was missed.
                 * 238 `getElementById` calls is not a cost worth optimising
                 * against correctness here.
                 *
                 * @returns {number} How many settings differ from their default.
                 */
                const refreshChangedMarks = () => {
                    const perSection = {};
                    let total = 0;
                    settingRowEls.forEach(row => {
                        const changed = rowIsChanged(row);
                        row.classList.toggle('vz-setting-changed', changed);
                        row.dataset.vzChanged = changed ? 'true' : 'false';
                        if (changed) {
                            total++;
                            const s = row.dataset.section || '';
                            perSection[s] = (perSection[s] || 0) + 1;
                        }
                    });
                    sectionHeaderEls.forEach(header => {
                        const badge = header.querySelector('.vz-section-changed-badge');
                        if (!badge) return;
                        const n = perSection[header.dataset.section] || 0;
                        badge.textContent = n ? `● ${n}` : '';
                        badge.hidden = n === 0;
                        badge.title = n ? `${n} setting${n === 1 ? '' : 's'} differ from the default` : '';
                    });
                    changedOnlyBtn.textContent = total ? `● Changed only (${total})` : '● Changed only';
                    changedOnlyBtn.disabled = total === 0 && !changedOnly;

                    // The same count in the header, where it is visible with
                    // every section collapsed and without the toolbar in view.
                    // The toolbar button answers "show me them"; this answers
                    // "is there anything to show", which is the question you
                    // have on OPENING the dialog.
                    if (changedChipEl) {
                        changedChipEl.textContent = total
                            ? `● ${total} changed` : '';
                        changedChipEl.hidden = total === 0;
                        changedChipEl.title = total
                            ? `${total} setting${total === 1 ? '' : 's'} differ from the default\n\n` +
                              'Press ● Changed only to see just those.'
                            : '';
                    }
                    return total;
                };

                // ── The single visibility pass ────────────────────────────────────

                /**
                 * Computes what is on screen, from the search needle, the
                 * changed-only toggle and each section's collapsed state.
                 *
                 * **While a filter is active every matching section is drawn
                 * expanded**, whatever its stored state, because a filter that
                 * finds a match and then hides it is worse than one that finds
                 * nothing. The stored state is untouched, so clearing the
                 * filter restores exactly the layout the user left.
                 */
                const applyVisibility = () => {
                    const needle     = (settingsSearchInput.value || '').trim().toLowerCase();
                    const filtering  = needle !== '' || changedOnly;
                    const matchCount = {};
                    let anyMatch = false;

                    // Pass 1 — does each row match, and which sections have one?
                    settingRowEls.forEach(row => {
                        const labelText   = row.dataset.vzLabel   || '';
                        const descText    = row.dataset.vzDesc    || '';
                        const defaultText = row.dataset.vzDefault || '';
                        const hitsNeedle = !needle
                            || labelText.toLowerCase().includes(needle)
                            || descText.toLowerCase().includes(needle)
                            || defaultText.toLowerCase().includes(needle);
                        const hitsChanged = !changedOnly || row.dataset.vzChanged === 'true';
                        const matches = hitsNeedle && hitsChanged;
                        row.dataset.vzMatches = matches ? 'true' : 'false';
                        if (matches) {
                            anyMatch = true;
                            const s = row.dataset.section || '';
                            matchCount[s] = (matchCount[s] || 0) + 1;
                        }
                    });

                    // Pass 2 — headers, and each section's EFFECTIVE collapse.
                    const effectiveCollapsed = {};
                    sectionHeaderEls.forEach(header => {
                        const section = header.dataset.section;
                        const has     = (matchCount[section] || 0) > 0;
                        header.style.display = (!filtering || has) ? 'flex' : 'none';
                        const collapsed = filtering ? false : isSectionCollapsed(section);
                        effectiveCollapsed[section] = collapsed;
                        header.dataset.collapsed = collapsed ? 'true' : 'false';
                        const arrow = header.querySelector('.vz-section-arrow');
                        if (arrow) arrow.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
                    });

                    // Pass 3 — rows, their sub-grids, and the search highlight.
                    settingRowEls.forEach(row => {
                        const matches = row.dataset.vzMatches === 'true';
                        const shown   = matches && !effectiveCollapsed[row.dataset.section];
                        row.style.display = shown ? 'flex' : 'none';

                        const labelText = row.dataset.vzLabel   || '';
                        const descText  = row.dataset.vzDesc    || '';
                        const defText   = row.dataset.vzDefault || '';
                        const labelEl   = row.querySelector('.vz-setting-label');
                        const col2El    = row.children[1];
                        const col3El    = row.children[2];

                        if (shown && needle) {
                            if (labelEl) labelEl.innerHTML = highlightSettingsNeedle(labelText, needle) + ':';
                            if (col2El && defText) col2El.innerHTML = highlightSettingsNeedle(defText, needle);
                            if (col3El) col3El.innerHTML = highlightSettingsNeedle(descText, needle);
                        } else {
                            // Restore originals (plain text — no XSS risk). A col2
                            // holding an <em> is a `table` or `function` row, whose
                            // note is not a value and must survive untouched.
                            if (labelEl) labelEl.textContent = labelText + ':';
                            if (col2El && !col2El.querySelector('em') && defText) {
                                col2El.textContent = defText;
                            }
                            if (col3El) col3El.textContent = descText;
                        }
                    });

                    document.querySelectorAll('.mb-pd-subgrid').forEach(sub => {
                        const section = sub.dataset.section;
                        const owner   = sub.previousElementSibling;
                        const ownerShown = owner && owner.classList.contains('vz-setting-row')
                            && owner.style.display !== 'none';
                        sub.style.display =
                            (ownerShown && !effectiveCollapsed[section] && sub.dataset.pdOpen === 'true')
                                ? '' : 'none';
                    });

                    noMatchesEl.hidden = !(filtering && !anyMatch);
                    if (!noMatchesEl.hidden) {
                        noMatchesEl.textContent = changedOnly && needle
                            ? 'No changed setting matches that search.'
                            : changedOnly
                                ? 'Every setting is at its default.'
                                : 'No setting matches that search.';
                    }

                    const allCollapsed = sectionHeaderEls.every(h => isSectionCollapsed(h.dataset.section));
                    collapseAllBtn.textContent = allCollapsed ? '⬇ Uncollapse all' : '⬆ Collapse all';
                    collapseAllBtn.disabled = filtering;
                    // A disabled control with no explanation is the friction
                    // this whole finding is about, so the tooltip says WHY:
                    // while a filter is running, section state is overridden
                    // and the button would have nothing visible to act on.
                    collapseAllBtn.title = filtering
                        ? 'Unavailable while a filter is active\n\n' +
                          'A filter opens the sections holding matches by itself, without\n' +
                          'changing what you have left open. Clear the search and the\n' +
                          '● Changed only button to use this again.'
                        : (allCollapsed
                            ? 'Expand every section\n\nSection state is remembered between opens.'
                            : 'Collapse every section\n\nSection state is remembered between opens.');
                };

                // ── Wiring ────────────────────────────────────────────────────────

                sectionHeaderEls.forEach(header => {
                    header.addEventListener('click', (e) => {
                        // The per-section RESET lives inside the header, whose
                        // own job is to toggle the section — so a press on ↺
                        // must not also fold away the rows it just reset.
                        //
                        // TWO guards cover this and they are MUTUALLY
                        // REDUNDANT: this one, and the `stopPropagation()` in
                        // the ↺ handler. Either alone suffices, so removing
                        // either alone leaves the spec green; only removing
                        // both reproduces the defect, which is how
                        // `scripts/mutations/settings-dialog.json` records it —
                        // one combined entry plus two honest `expect: "pass"`
                        // singles. Do not tidy either away on the evidence that
                        // its own mutation passes.
                        if (e.target.closest('.vz-section-reset')) return;
                        const section = header.dataset.section;
                        setSectionCollapsed(section, !isSectionCollapsed(section));
                        persistSectionState();
                        applyVisibility();
                    });
                });

                collapseAllBtn.addEventListener('click', () => {
                    const collapseThem = sectionHeaderEls
                        .some(h => !isSectionCollapsed(h.dataset.section));
                    sectionHeaderEls.forEach(h => setSectionCollapsed(h.dataset.section, collapseThem));
                    persistSectionState();
                    applyVisibility();
                });

                changedOnlyBtn.addEventListener('click', () => {
                    changedOnly = !changedOnly;
                    changedOnlyBtn.setAttribute('aria-pressed', changedOnly ? 'true' : 'false');
                    applyVisibility();
                });

                /**
                 * Show or hide the clear button based on whether the search field has text.
                 */
                const updateSettingsClearBtn = () => {
                    settingsClearBtn.style.display = settingsSearchInput.value ? 'block' : 'none';
                };

                settingsSearchInput.addEventListener('input', () => {
                    applyVisibility();
                    updateSettingsClearBtn();
                });

                settingsClearBtn.addEventListener('click', () => {
                    settingsSearchInput.value = '';
                    settingsSearchInput.dispatchEvent(new Event('input'));
                    settingsSearchInput.focus();
                });

                // Any widget edit can change the changed-set, and the sub-editors
                // and colour pickers write values without a common choke point —
                // so this is delegated on the body rather than wired per widget.
                // Re-running the visibility pass is only needed while the
                // changed-only filter is what decides who is on screen.
                if (settingsBodyEl) {
                    ['input', 'change'].forEach(evt => {
                        settingsBodyEl.addEventListener(evt, () => {
                            refreshChangedMarks();
                            if (changedOnly) applyVisibility();
                        });
                    });
                }

                /** Re-derive marks and visibility together — after a RESET, or on open. */
                const refreshSettingsView = () => {
                    refreshChangedMarks();
                    applyVisibility();
                };

                refreshSettingsView();

                // ── popup_dialog field editors ────────────────────────────────────
                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'popup_dialog') return;

                    const inputId    = `${scriptId}-input-${key}`;
                    const masterInput = document.getElementById(inputId);
                    const toggleBtn   = document.getElementById(`${inputId}-toggle`);
                    const subgrid     = document.getElementById(`${inputId}-subgrid`);

                    if (!masterInput || !toggleBtn || !subgrid) return;

                    toggleBtn.addEventListener('click', () => {
                        const willOpen = subgrid.dataset.pdOpen !== 'true';
                        subgrid.style.display  = willOpen ? '' : 'none';
                        subgrid.dataset.pdOpen = willOpen ? 'true' : 'false';
                        toggleBtn.textContent  = willOpen ? '▲ Collapse' : '✏️ Edit fields';
                    });

                    /**
                     * Applies a live color preview to a popup_dialog color sub-input
                     * and its associated 🎨 picker button.
                     * @param {HTMLInputElement} subInput
                     * @param {string} color
                     */
                    const _applySubColorPreview = (subInput, color) => {
                        subInput.style.backgroundColor = color || '';
                        subInput.style.color = color ? this.getContrastYIQ(color) : '';
                        const btn = subgrid.querySelector(`[data-pd-picker-for="${subInput.id}"]`);
                        if (btn) btn.style.backgroundColor = color || '';
                    };

                    // Apply initial previews for any color sub-inputs already in the DOM
                    subgrid.querySelectorAll('.mb-pd-sub-color').forEach(sub => {
                        if (sub.value) _applySubColorPreview(sub, sub.value);
                    });

                    // ── Sub-input change → sync master hidden input + live preview ────
                    subgrid.querySelectorAll('.mb-pd-sub').forEach(sub => {
                        sub.addEventListener('input', () => {
                            const allSubs = Array.from(subgrid.querySelectorAll('.mb-pd-sub'))
                                .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
                            masterInput.value = allSubs.map(s => s.value).join('|');
                            if (sub.classList.contains('mb-pd-sub-color')) {
                                _applySubColorPreview(sub, sub.value.trim());
                            }
                        });
                    });

                    // ── 🎨 picker buttons inside popup_dialog sub-grids ──────────────
                    subgrid.querySelectorAll('[data-pd-picker-for]').forEach(pickerBtn => {
                        pickerBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const subInputId = pickerBtn.dataset.pdPickerFor;
                            const subInput   = document.getElementById(subInputId);
                            if (!subInput) return;

                            // Toggle closed if already open for this sub-input
                            if (pickerContainer.style.display === 'block' &&
                                pickerContainer.dataset.forInput === subInputId) {
                                pickerContainer.style.display = 'none';
                                pickerContainer.dataset.forInput = '';
                                return;
                            }

                            pickerContainer.innerHTML = '';
                            pickerContainer.dataset.forInput = subInputId;
                            pickerContainer.style.display = 'block';

                            const btnRect       = pickerBtn.getBoundingClientRect();
                            const containerRect = container.getBoundingClientRect();
                            pickerContainer.style.top  = `${btnRect.bottom - containerRect.top + 4}px`;
                            pickerContainer.style.left = `${btnRect.left   - containerRect.left}px`;

                            if (typeof iro !== 'undefined') {
                                const rawColor     = subInput.value || '#000000';
                                const hexColor     = this.cssColorToHex(rawColor);
                                const activePicker = new iro.ColorPicker(
                                    `#${scriptId}-picker-container`, { width: 180, color: hexColor }
                                );
                                activePicker.on('color:change', (color) => {
                                    subInput.value = color.hexString;
                                    _applySubColorPreview(subInput, color.hexString);
                                    // Sync master hidden input
                                    const allSubs = Array.from(subgrid.querySelectorAll('.mb-pd-sub'))
                                        .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
                                    masterInput.value = allSubs.map(s => s.value).join('|');
                                });
                            } else {
                                pickerContainer.textContent = 'iro.js missing';
                            }
                        });
                    });
                });

                // ── Keyboard shortcut capture ─────────────────────────────────────
                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'keyboard_shortcut') return;

                    const inputId    = `${scriptId}-input-${key}`;
                    const ksInput    = document.getElementById(inputId);
                    const captureBtn = document.getElementById(`${inputId}-capture-btn`);

                    if (!ksInput || !captureBtn) return;

                    /**
                     * Serialises a KeyboardEvent into a human-readable shortcut string such as
                     * "Ctrl+Shift+M" or "Alt+X". Single alphabetic keys are uppercased for
                     * readability (e.g. "Ctrl+m" → "Ctrl+M").
                     * @param {KeyboardEvent} e
                     * @returns {string|null} The shortcut string, or null if only a bare modifier was pressed
                     */
                    function buildShortcutString(e) {
                        const parts = [];
                        if (e.ctrlKey)  parts.push('Ctrl');
                        if (e.altKey)   parts.push('Alt');
                        if (e.shiftKey) parts.push('Shift');
                        if (e.metaKey && !e.ctrlKey) parts.push('Meta');
                        const rawKey = e.key;
                        if (['Control', 'Alt', 'Shift', 'Meta'].includes(rawKey)) return null;
                        const displayKey = (rawKey.length === 1 && /[a-z]/i.test(rawKey))
                            ? rawKey.toUpperCase()
                            : rawKey;
                        parts.push(displayKey);
                        return parts.join('+');
                    }

                    let captureHandler = null;

                    /**
                     * Activates keyboard-capture mode for the shortcut input widget.
                     * Visually highlights the capture button and registers a capture-phase
                     * keydown listener that intercepts the next non-modifier key combination.
                     * Pressing Escape cancels without changing the stored value.
                     */
                    function enterCaptureMode() {
                        captureBtn.dataset.capturing = 'true';
                        captureBtn.textContent = '⌛ Press keys… (Esc=cancel)';
                        captureBtn.style.background    = '#ffe082';
                        captureBtn.style.borderColor   = '#f9a825';
                        ksInput.style.borderColor      = '#f9a825';

                        captureHandler = function(e) {
                            e.preventDefault(); e.stopPropagation();
                            if (e.key === 'Escape') { exitCaptureMode(null); return; }
                            const combo = buildShortcutString(e);
                            if (combo === null) return;
                            exitCaptureMode(combo);
                        };
                        document.addEventListener('keydown', captureHandler, true);
                    }

                    /**
                     * Deactivates keyboard-capture mode, restores the button, and optionally
                     * writes a new shortcut string into the text input.
                     * @param {string|null} combo - The captured shortcut, or null to cancel
                     */
                    function exitCaptureMode(combo) {
                        captureBtn.dataset.capturing = 'false';
                        captureBtn.textContent = '🎹 Capture';
                        captureBtn.style.background    = '#eff1f5';
                        captureBtn.style.borderColor   = '#aaa';
                        ksInput.style.borderColor      = '#c8cdd5';

                        if (captureHandler) {
                            document.removeEventListener('keydown', captureHandler, true);
                            captureHandler = null;
                        }
                        if (combo !== null) { ksInput.value = combo; }
                    }

                    captureBtn.addEventListener('click', () => {
                        if (captureBtn.dataset.capturing === 'true') {
                            exitCaptureMode(null);
                        } else {
                            enterCaptureMode();
                        }
                    });
                });

                // ── Color picker ──────────────────────────────────────────────────
                const pickerContainer = document.getElementById(`${scriptId}-picker-container`);

                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'color_picker') return;

                    const inputId = `${scriptId}-input-${key}`;
                    const input   = document.getElementById(inputId);
                    const btn     = document.getElementById(`${inputId}-picker-btn`);

                    this.applyColorPreview(inputId, this.values[key]);

                    input.addEventListener('input', e => {
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                            this.applyColorPreview(inputId, e.target.value);
                        }
                    });

                    btn.onclick = (e) => {
                        e.stopPropagation();
                        // If picker is already open for this button, toggle it closed
                        if (pickerContainer.style.display === 'block' &&
                            pickerContainer.dataset.forInput === inputId) {
                            pickerContainer.style.display = 'none';
                            pickerContainer.dataset.forInput = '';
                            return;
                        }
                        pickerContainer.innerHTML = '';
                        pickerContainer.dataset.forInput = inputId;
                        pickerContainer.style.display = 'block';

                        // Position relative to the container using getBoundingClientRect
                        // so the offset is correct regardless of scroll position in the body div.
                        const btnRect       = btn.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        pickerContainer.style.top  = `${btnRect.bottom - containerRect.top + 4}px`;
                        pickerContainer.style.left = `${btnRect.left   - containerRect.left}px`;

                        if (typeof iro !== 'undefined') {
                            // iro.js v5 does not accept CSS named colors (e.g. "green") —
                            // it silently falls back to black.  Normalise to hex first.
                            const rawColor  = input.value || cfg.default || '#000000';
                            const hexColor  = this.cssColorToHex(rawColor);
                            const activePicker = new iro.ColorPicker(`#${scriptId}-picker-container`, {
                                width: 180,
                                color: hexColor
                            });
                            activePicker.on('color:change', (color) => {
                                input.value = color.hexString;
                                this.applyColorPreview(inputId, color.hexString);
                            });
                        } else {
                            loggerInterface.error('error', 'iro.js library not found!');
                            pickerContainer.textContent = 'iro.js missing';
                        }
                    };
                });

                overlay.addEventListener('click', e => {
                    if (e.target === overlay) {
                        // Ignore the click that terminates a drag-or-resize-then-release-outside sequence
                        if (didDrag || didResize) { didDrag = false; didResize = false; return; }
                        tryCloseDialog();
                    }
                    // Hide the color picker when clicking outside it AND outside any picker button
                    const isPickerBtn = (e.target.id && e.target.id.endsWith('-picker-btn')) ||
                                       !!e.target.closest('[data-pd-picker-for]');
                    if (!pickerContainer.contains(e.target) && !isPickerBtn) {
                        pickerContainer.style.display = 'none';
                        pickerContainer.dataset.forInput = '';
                    }
                });

                // ── Column resize drag handles ────────────────────────────────────────
                /**
                 * Applies `w` px to all row cells in the given column (1 or 2) and
                 * to the matching sticky header cell.
                 * @param {number} colNum  - 1 or 2
                 * @param {number} w       - new width in pixels
                 */
                const _applyColWidth = (colNum, w) => {
                    const hdr = document.getElementById(`${scriptId}-col-hdr-${colNum}`);
                    if (hdr) { hdr.style.flex = `0 0 ${w}px`; hdr.style.width = `${w}px`; }
                    document.querySelectorAll(
                        `#${scriptId}-settings-body [data-vz-settings-col="${colNum}"]`
                    ).forEach(el => {
                        el.style.flex  = `0 0 ${w}px`;
                        el.style.width = `${w}px`;
                    });
                };

                let _colDragActive = false;
                let _colDragNum    = 0;
                let _colDragStartX = 0;
                let _colDragStartW = 0;

                [1, 2].forEach(colNum => {
                    const handle = document.getElementById(`${scriptId}-col-drag-${colNum}`);
                    if (!handle) return;
                    handle.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        _colDragActive = true;
                        _colDragNum    = colNum;
                        _colDragStartX = e.clientX;
                        _colDragStartW = colNum === 1 ? _col1W : _col2W;
                        document.body.style.cursor     = 'col-resize';
                        document.body.style.userSelect = 'none';
                    });
                });

                document.addEventListener('mousemove', (e) => {
                    if (!_colDragActive) return;
                    const delta = e.clientX - _colDragStartX;
                    const minW  = _colDragNum === 1 ? 280 : 80;
                    const newW  = Math.max(minW, _colDragStartW + delta);
                    if (_colDragNum === 1) _col1W = newW;
                    else                  _col2W = newW;
                    _applyColWidth(_colDragNum, newW);
                });

                document.addEventListener('mouseup', () => {
                    if (!_colDragActive) return;
                    _colDragActive = false;
                    document.body.style.cursor     = '';
                    document.body.style.userSelect = '';
                    GM_setValue(colWidthsKey, { col1: _col1W, col2: _col2W });
                });

                // ── Unsaved-change detection ──────────────────────────────────────

                /**
                 * Reads all current form-input values into a plain object (baseline snapshot).
                 * @returns {Object}
                 */
                const takeSnapshot = () => {
                    const snap = {};
                    for (const key in configSchema) {
                        if (['divider','function','table'].includes(configSchema[key].type)) continue;
                        const el = document.getElementById(`${scriptId}-input-${key}`);
                        if (!el) continue;
                        snap[key] = configSchema[key].type === 'checkbox' ? el.checked : el.value;
                    }
                    return snap;
                };

                const initialSnapshot = takeSnapshot();

                /**
                 * Returns true when at least one field differs from the baseline snapshot.
                 * @returns {boolean}
                 */
                const hasUnsavedChanges = () => {
                    for (const key in configSchema) {
                        if (['divider','function','table'].includes(configSchema[key].type)) continue;
                        const el = document.getElementById(`${scriptId}-input-${key}`);
                        if (!el) continue;
                        const current = configSchema[key].type === 'checkbox' ? el.checked : el.value;
                        if (String(current) !== String(initialSnapshot[key])) return true;
                    }
                    return false;
                };

                /** Close with unsaved-change guard. */
                const tryCloseDialog = async () => {
                    if (hasUnsavedChanges()) {
                        const confirmed = await showCustomConfirm(
                            'You have unsaved changes.\nDiscard changes and close the settings dialog?',
                            'Unsaved Changes'
                        );
                        if (!confirmed) return;
                    }
                    closeDialog();
                };

                // ── Save / Reset / Close ──────────────────────────────────────────

                // Named reference so it can be removed from the capture-phase listener
                // on dialog close, preventing accumulation across multiple opens.
                let settingsEscHandler = null;

                const closeDialog = () => {
                    if (settingsEscHandler) {
                        document.removeEventListener('keydown', settingsEscHandler, true);
                        settingsEscHandler = null;
                    }
                    container.style.transform = 'scale(0.95)';
                    container.style.opacity   = '0';
                    setTimeout(() => {
                        if (document.body.contains(overlay)) document.body.removeChild(overlay);
                    }, 150);
                };

                document.getElementById(`${scriptId}-save-btn`).onclick = () => {
                    // Whether anything actually moved, asked BEFORE the write —
                    // it is what decides the reload, and the write is what would
                    // make the answer stale.
                    const dirty = hasUnsavedChanges();

                    const newValues = {};
                    for (const key in configSchema) {
                        if (['divider','function','table'].includes(configSchema[key].type)) continue;
                        const input = document.getElementById(`${scriptId}-input-${key}`);
                        newValues[key] = configSchema[key].type === 'checkbox'
                            ? input.checked
                            : input.value;
                    }

                    // The write happens either way. Since 4.1.0 it is a dirty
                    // set, so a SAVE that changed nothing is exactly what prunes
                    // a profile an older version had frozen — skipping it would
                    // remove the only repair path a consumer without its own
                    // migration has. Only the RELOAD is conditional, and that is
                    // the part with a cost: it discards whatever the page had
                    // built, which on a large listing is thousands of rows.
                    this.save(newValues, dirty);
                    closeDialog();
                };

                /**
                 * Puts ONE setting's widget back to its schema default.
                 *
                 * Extracted so the global RESET and the per-section ↺ cannot
                 * drift apart: a type whose reset needs more than assigning
                 * `.value` — a colour's preview, a popup_dialog's sub-fields
                 * and their own previews — would otherwise have to be
                 * remembered in two places, and the second one is where it
                 * gets forgotten.
                 *
                 * Widget-only, like the RESET it came from: nothing is written
                 * to GM storage until the user presses SAVE.
                 *
                 * @param {string} key  A configSchema key.
                 * @returns {boolean}  Whether a widget was actually reset.
                 */
                const resetSettingWidget = (key) => {
                    const cfg = configSchema[key];
                    if (!cfg || ['divider', 'function', 'table'].includes(cfg.type)) return false;
                    const inputId = `${scriptId}-input-${key}`;
                    const input   = document.getElementById(inputId);
                    if (!input) return false;

                    if (cfg.type === 'checkbox') {
                        input.checked = cfg.default;
                        return true;
                    }

                    input.value = cfg.default;

                    if (cfg.type === 'color_picker') {
                        this.applyColorPreview(inputId, cfg.default);
                    } else if (cfg.type === 'popup_dialog') {
                        const parts   = String(cfg.default).split('|');
                        const subgrid = document.getElementById(`${inputId}-subgrid`);
                        if (subgrid) {
                            const subs = Array.from(subgrid.querySelectorAll('.mb-pd-sub'))
                                .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
                            subs.forEach((sub, i) => {
                                const newVal = parts[i] !== undefined ? parts[i] : '';
                                sub.value = newVal;
                                // Restore color preview for color sub-inputs
                                if (sub.classList.contains('mb-pd-sub-color')) {
                                    sub.style.backgroundColor = newVal || '';
                                    sub.style.color = newVal ? this.getContrastYIQ(newVal) : '';
                                    const subBtn = subgrid.querySelector(
                                        `[data-pd-picker-for="${sub.id}"]`
                                    );
                                    if (subBtn) subBtn.style.backgroundColor = newVal || '';
                                }
                            });
                        }
                    }
                    return true;
                };

                document.getElementById(`${scriptId}-reset`).onclick = async () => {
                    const confirmed = await showCustomConfirm(
                        'This will reset ALL configuration settings to their default values.\n\nUnsaved edits will be discarded. Continue?',
                        'Reset All Settings to Defaults'
                    );
                    if (!confirmed) return;

                    for (const key in configSchema) resetSettingWidget(key);
                    refreshSettingsView();
                };

                // ── Per-section RESET ─────────────────────────────────────────────
                //
                // The global RESET is all-or-nothing, which across 238 settings
                // makes it the button nobody dares press: wanting the colours in
                // one section back meant either hand-editing them or discarding
                // every other choice. Scoped to a section it is usable, and it
                // is the same widget-only, still-needs-a-SAVE operation — so a
                // mistaken press costs a CLOSE, not a profile.
                document.querySelectorAll('.vz-section-reset').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();          // do not toggle the section
                        const section = btn.dataset.section;
                        const label   = (configSchema[section] && configSchema[section].label) || section;

                        // Only offer to reset what is actually off its default,
                        // and say how many — "reset 12 settings" and "reset
                        // nothing" are very different presses.
                        const keys = settingRowEls
                            .filter(r => r.dataset.section === section && r.dataset.vzChanged === 'true')
                            .map(r => r.dataset.vzKey);
                        if (keys.length === 0) {
                            await showCustomAlert(
                                `Every setting in "${label}" is already at its default.`,
                                'Nothing to Reset'
                            );
                            return;
                        }

                        const confirmed = await showCustomConfirm(
                            `Reset ${keys.length} setting${keys.length === 1 ? '' : 's'} in ` +
                            `"${label}" to ${keys.length === 1 ? 'its default' : 'their defaults'}?` +
                            `\n\nNothing is saved until you press SAVE.`,
                            'Reset Section to Defaults'
                        );
                        if (!confirmed) return;

                        keys.forEach(resetSettingWidget);
                        refreshSettingsView();
                    });
                });

                document.getElementById(`${scriptId}-close`).onclick = () => tryCloseDialog();

                // Note: a few browser shortcuts (Ctrl+N, Ctrl+T, Ctrl+W) are handled at
                // the OS/browser level and cannot be suppressed by JS.
                //
                // Escape key behaviour (in priority order):
                //   1. Search field focused + has text  → clear text, re-run filter, keep focus
                //   2. Search field focused + empty     → blur the field
                //   3. Otherwise                        → try to close the dialog
                //
                // Using capture:true (third argument) so this handler fires before any
                // bubble-phase listener and before the browser's own native Escape handling.
                // stopImmediatePropagation() in cases 1+2 ensures no other handler reacts.
                const settingsSearchEl = document.getElementById(`${scriptId}-search`);
                const settingsContainer = document.getElementById(`${scriptId}-config-container`);
                settingsEscHandler = (e) => {
                    if (e.key !== 'Escape') return;
                    // If a table-editor panel is open and contains the active element
                    // (including the panel itself when it has focus), let the panel's
                    // own keydown handler deal with Escape — do not touch the settings dialog.
                    const _activeTblPanel = document.querySelector('[id^="vz-tbl-editor-"]');
                    if (_activeTblPanel && _activeTblPanel.contains(document.activeElement)) return;
                    const ae = document.activeElement;
                    if (ae === settingsSearchEl) {
                        // Search field: clear text or blur, do not close the dialog.
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        if (settingsSearchEl.value !== '') {
                            settingsSearchEl.value = '';
                            settingsSearchEl.dispatchEvent(new Event('input'));
                            updateSettingsClearBtn();
                        } else {
                            settingsSearchEl.blur();
                        }
                    } else if (ae &&
                               (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') &&
                               settingsContainer && settingsContainer.contains(ae)) {
                        // Any other input/textarea inside the settings dialog (number,
                        // text, sub-grid text, color-picker text, keyboard-shortcut
                        // capture input, …): blur only — do NOT close the dialog.
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        ae.blur();
                    } else {
                        tryCloseDialog();
                    }
                };
                document.addEventListener('keydown', settingsEscHandler, true);
            }
        };

        // --- 4. Changelog Logic ---
        const changelogInterface = {
            /**
             * Opens the changelog modal dialog.
             *
             * Layout: Markdown-inspired document with v. version headers and Icon section labels.
             * Supports live full-text search via a filter input in the header.
             * Force-refresh link re-fetches from GitHub while respecting the current filter.
             */
            show: function() {
                if (!_changelog || _changelog.length === 0) return;

                // ── Cache-status diagnostic log ───────────────────────────────────
                const metaSource = _changelogMeta.fromCache === null
                    ? 'static'
                    : _changelogMeta.fromCache
                        ? `cache (age ${_changelogMeta.fetchedAt ? Math.round((Date.now() - _changelogMeta.fetchedAt) / 1000) : '?'}s)`
                        : 'fresh network fetch';
                loggerInterface.info('ui', `Displaying changelog: ${_changelog.length} entries, source=${metaSource}`);
                if (_changelogMeta.url) {
                    loggerInterface.debug('ui', `Changelog URL: ${_changelogMeta.url} | cacheKey: ${_changelogMeta.cacheKey}`);
                }

                const sizeKey   = `${scriptId}-changelog-size`;
                const savedSize = GM_getValue(sizeKey, { width: 800, height: 580 });

                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)', zIndex: '3000009', display: 'flex',
                    justifyContent: 'center', alignItems: 'center'
                });

                const container = document.createElement('div');
                Object.assign(container.style, {
                    position: 'relative', backgroundColor: '#ffffff', borderRadius: '14px',
                    padding: '20px', color: '#222',
                    fontFamily: _libPrefs.lib_content_font_family,
                    fontSize:   _libPrefs.lib_content_font_size,
                    width: savedSize.width + 'px', height: savedSize.height + 'px',
                    minWidth: '600px', minHeight: '400px', maxWidth: '95vw', maxHeight: '92vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.35)', border: '1px solid #ddd',
                    transform: 'scale(0.96)', opacity: '0', transition: 'all 0.18s ease'
                });

                // ── Rendering helpers ─────────────────────────────────────────────

                /**
                 * HTML-escapes plain text, then wraps every case-insensitive occurrence
                 * of needle in a <mark> highlight span.
                 *
                 * HTML-escaping is ALWAYS applied first so that any HTML tags present in
                 * changelog description text (e.g. <bdi>, <a href="">, </div>) are
                 * rendered as literal characters rather than being parsed as real markup.
                 * This also prevents malformed HTML in description text from breaking the
                 * structure of the container.innerHTML template (which would silently move
                 * the resize-handle element outside the container and make resizing fail).
                 *
                 * @param {string} text   Plain text (not yet HTML-encoded)
                 * @param {string} needle The search string (already lower-cased); may be empty
                 * @returns {string} HTML-safe string, needle matches wrapped in <mark>
                 */
                const highlightNeedle = (text, needle) => {
                    // Always escape first — this is the critical safety step.
                    const safe = String(text ?? '')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    if (!needle) return safe;
                    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return safe.replace(
                        new RegExp(`(${esc})`, 'gi'),
                        '<mark class="vz-search-mark">$1</mark>'
                    );
                };

                /**
                 * Render one changelog item (string OR {text, sub[]}) as an <li>.
                 * Recursively nests sub-items at increasing depth.
                 * @param {string|{text:string,sub:Array}} item
                 * @param {number} [depth=0]
                 * @param {string} [needle=''] Current search needle for highlighting
                 * @returns {string} HTML string
                 */
                const renderItem = (item, depth = 0, needle = '') => {
                    const itemClass = depth === 0 ? 'cl-item' : 'cl-item-sub';

                    if (typeof item === 'string') {
                        return `<li class="${itemClass}">${highlightNeedle(item, needle)}</li>`;
                    }
                    const subHtml = (item.sub || []).map(s => renderItem(s, depth + 1, needle)).join('');
                    return `<li class="${itemClass}">
                        ${highlightNeedle(item.text, needle)}
                        ${subHtml ? `<ul class="cl-sub-list">${subHtml}</ul>` : ''}
                    </li>`;
                };

                // Tracks the number of entries visible after the last buildContent() call.
                // Used by updateMetaLine() to show a "(N filtered)" hint.
                let _visibleCount = _changelog.length;

                /**
                 * Build the changelog document HTML.
                 *
                 * Output format (Markdown-inspired):
                 *   9.89.0 – 2026-02-23
                 *   🚀 Improvements
                 *   - item text
                 *     - sub-item
                 *   🧹 Cleanup
                 *   - item text
                 *
                 * Accepts an optional filter string — entries not matching the filter
                 * (case-insensitive, full-text JSON match) are omitted.
                 * Matching text inside entries is highlighted with a yellow <mark> span.
                 * Both the new {version, date, sections[]} format and the legacy
                 * {version, description} flat-string format are supported.
                 *
                 * @param {string} [filter='']  Live-search filter string
                 * @returns {string} HTML string for the entries container
                 */
                const buildContent = (filter = '') => {
                    const needle = filter.trim().toLowerCase();

                    /** Returns true when the entry's serialised JSON contains the needle. */
                    const entryMatches = entry => {
                        if (!needle) return true;
                        return JSON.stringify(entry).toLowerCase().includes(needle);
                    };

                    let html = '';
                    let visibleCount = 0;

                    _changelog.forEach(entry => {
                        if (!entryMatches(entry)) return;
                        visibleCount++;

                        // ── version – date ──────────────────────────────────
                        const dateSpan = entry.date
                            ? ` <span class="cl-date"> – ${highlightNeedle(entry.date, needle)}</span>`
                            : '';

                        html += `
                            <div class="cl-entry">
                                <div class="cl-entry-row">
                                    <span class="cl-version">${highlightNeedle(entry.version, needle)}${dateSpan}</span>
                                </div>
                            </div>`;

                        // ── sections (new structured format) ───────────────────
                        if (Array.isArray(entry.sections)) {
                            entry.sections.forEach(section => {
                                const itemsHtml = (section.items || []).map(i => renderItem(i, 0, needle)).join('');
                                html += `
                                    <div class="cl-section cl-section-structured">
                                        <div class="cl-section-label-row">
                                            <span class="cl-section-label">${highlightNeedle(section.label, needle)}</span>
                                        </div>
                                        <ul class="cl-items-list">${itemsHtml}</ul>
                                    </div>`;
                            });

                        // ── legacy flat description (backward compat) ──────────
                        } else {
                            const text = entry.description
                                || (Array.isArray(entry.description_list)
                                    ? entry.description_list.join(' ')
                                    : '');
                            html += `
                                <div class="cl-section cl-section-legacy">
                                    <p class="cl-legacy-text">${highlightNeedle(text, needle)}</p>
                                </div>`;
                        }

                        html += `<div class="cl-divider"></div>`;
                    });

                    if (visibleCount === 0 && needle) {
                        html = `<div class="cl-empty">
                            No entries match <em>${needle.replace(/</g, '&lt;')}</em>
                        </div>`;
                    }

                    // Store for updateMetaLine() — must happen before returning
                    _visibleCount = visibleCount;

                    return html;
                };

                // ── Changelog dialog CSS via GM_addStyle (not inline style="..."
                // attributes parsed from the innerHTML string below) — same CSP
                // exemption reasoning as the settings dialog shell. This dialog can be
                // opened independently of the settings modal, so it carries its own
                // stylesheet (including its own copy of .vz-search-mark) rather than
                // relying on the settings modal's.
                document.getElementById(`${scriptId}-changelog-modal-style`)?.remove();
                const changelogStyleEl = GM_addStyle(`
                    [id="${scriptId}-changelog-drag"] {
                        cursor: move;
                        user-select: none;
                        margin-bottom: 10px;
                    }
                    [id="${scriptId}-changelog-header-row"] {
                        text-align: right;
                        margin: 0 0 6px 0;
                        display: flex;
                        justify-content: flex-end;
                        align-items: center;
                        gap: 10px;
                    }
                    [id="${scriptId}-changelog-refresh"] {
                        cursor: pointer;
                        font-weight: 600;
                        color: #0066cc;
                        font-size: 0.9em;
                    }
                    [id="${scriptId}-changelog-sep"] {
                        color: #bbb;
                    }
                    [id="${scriptId}-changelog-close"] {
                        cursor: pointer;
                        font-weight: 600;
                        color: #555;
                    }
                    [id="${scriptId}-changelog-title"] {
                        margin: 4px 0;
                        font-size: 18px;
                        font-weight: 600;
                        color: #222;
                    }
                    [id="${scriptId}-changelog-meta"] {
                        margin: 4px 0 8px 0;
                        font-size: 0.78em;
                        color: #888;
                    }
                    [id="${scriptId}-changelog-search-wrap"] {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }
                    [id="${scriptId}-changelog-search"] {
                        width: 100%;
                        box-sizing: border-box;
                        padding: 6px 30px 6px 10px;
                        border: 1px solid #c8d4e8;
                        border-radius: 6px;
                        font-size: 0.88em;
                        background: #f4f8ff;
                        color: #222;
                        outline: none;
                        transition: border-color 0.15s, box-shadow 0.15s;
                    }
                    [id="${scriptId}-changelog-search"]:focus {
                        border-color: #4a90d9;
                        box-shadow: 0 0 0 2px rgba(74,144,217,0.2);
                    }
                    [id="${scriptId}-changelog-search-clear"] {
                        position: absolute;
                        right: 7px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        color: #cc2200;
                        cursor: pointer;
                        font-size: 13px;
                        line-height: 1;
                        padding: 0 2px;
                        display: none;
                        opacity: 0.75;
                    }
                    [id="${scriptId}-changelog-entries-wrap"] {
                        flex: 1;
                        overflow-y: auto;
                        background: #f9f9fb;
                        border-radius: 8px;
                    }
                    [id="${scriptId}-changelog-resize"] {
                        position: absolute;
                        width: 20px;
                        height: 20px;
                        right: 6px;
                        bottom: 6px;
                        cursor: nwse-resize;
                        opacity: 0.6;
                        background: linear-gradient(135deg, transparent 45%, #999 45%, #999 55%, transparent 55%);
                    }
                    .vz-search-mark {
                        background: #fff176;
                        border-radius: 2px;
                        padding: 0 1px;
                    }
                    .cl-date {
                        font-weight: 400;
                        color: #6b7c93;
                    }
                    .cl-entry {
                        margin: 0;
                        padding: 9px 18px 3px 18px;
                        border-top: 2px solid #c2d3ee;
                        background: #eaf1fb;
                    }
                    .cl-entry-row {
                        display: flex;
                        align-items: baseline;
                        gap: 5px;
                    }
                    .cl-version {
                        font-size: 0.97em;
                        font-weight: 700;
                        color: #1a3a6a;
                        font-family: monospace;
                        letter-spacing: 0.01em;
                    }
                    .cl-section {
                        background: #fff;
                    }
                    .cl-section-structured {
                        padding: 4px 18px 8px 18px;
                    }
                    .cl-section-legacy {
                        padding: 5px 18px 8px 18px;
                    }
                    .cl-section-label-row {
                        display: flex;
                        align-items: baseline;
                        gap: 4px;
                        margin: 5px 0 3px 0;
                    }
                    .cl-section-label {
                        font-size: 0.86em;
                        font-weight: 700;
                        color: #2c5282;
                        letter-spacing: 0.02em;
                    }
                    .cl-items-list {
                        margin: 0;
                        padding: 0 0 0 16px;
                        list-style: disc;
                    }
                    .cl-legacy-text {
                        margin: 4px 0;
                        font-size: 0.88em;
                        color: #444;
                        line-height: 1.5;
                    }
                    .cl-divider {
                        height: 1px;
                        background: linear-gradient(to right,#c8d8f0 60%,transparent);
                        margin: 0 18px;
                    }
                    .cl-empty {
                        padding: 40px;
                        text-align: center;
                        color: #888;
                        font-size: 0.95em;
                    }
                    .cl-item {
                        margin: 2px 0;
                        padding-left: 0;
                        font-size: 0.90em;
                        color: #1a1a2e;
                        line-height: 1.55;
                    }
                    .cl-item-sub {
                        margin: 2px 0;
                        padding-left: 0;
                        font-size: 0.86em;
                        color: #44445e;
                        line-height: 1.55;
                    }
                    .cl-sub-list {
                        margin: 3px 0 2px 0;
                        padding: 0 0 0 14px;
                        list-style: disc;
                    }
                `);
                changelogStyleEl.id = `${scriptId}-changelog-modal-style`;

                // ── Container HTML ────────────────────────────────────────────────
                container.innerHTML = `
                    <div id="${scriptId}-changelog-drag">
                        <p id="${scriptId}-changelog-header-row">
                            <a id="${scriptId}-changelog-refresh"
                               title="Bypass cache and download the latest changelog from GitHub">
                                🔄 Force refresh
                            </a>
                            <span id="${scriptId}-changelog-sep">|</span>
                            <a id="${scriptId}-changelog-close">
                                CLOSE
                            </a>
                        </p>
                        <h3 id="${scriptId}-changelog-title">
                            ${scriptName.toUpperCase()} — CHANGELOG
                        </h3>
                        <p id="${scriptId}-changelog-meta">
                            ${_changelogMeta.fromCache === null
                                ? `${_changelog.length} entries (static/local)`
                                : `${_changelog.length} entries — source: <strong>${_changelogMeta.fromCache ? '📦 cache' : '🌐 network'}</strong>${_changelogMeta.fetchedAt ? ` · fetched ${Math.round((Date.now() - _changelogMeta.fetchedAt) / 1000)}s ago` : ''}`}
                        </p>
                        <div id="${scriptId}-changelog-search-wrap">
                            <input id="${scriptId}-changelog-search"
                                   type="text"
                                   placeholder="🔍 Filter changelog entries…">
                            <button id="${scriptId}-changelog-search-clear"
                                    type="button"
                                    title="Clear filter (Escape)">✕</button>
                        </div>
                    </div>

                    <div id="${scriptId}-changelog-entries-wrap"
                         tabindex="0">
                        <div id="${scriptId}-changelog-entries">
                            ${buildContent()}
                        </div>
                    </div>

                    <div id="${scriptId}-changelog-resize">
                    </div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                requestAnimationFrame(() => {
                    container.style.transform = 'scale(1)';
                    container.style.opacity = '1';
                });

                // ── Element references ───────────────────────────────────────────
                const entriesEl   = container.querySelector(`#${scriptId}-changelog-entries`);
                const entriesWrap = container.querySelector(`#${scriptId}-changelog-entries-wrap`);
                const metaEl      = container.querySelector(`#${scriptId}-changelog-meta`);
                const searchInput = container.querySelector(`#${scriptId}-changelog-search`);
                const clClearBtn  = container.querySelector(`#${scriptId}-changelog-search-clear`);
                const refreshLink = container.querySelector(`#${scriptId}-changelog-refresh`);
                const closeLink   = container.querySelector(`#${scriptId}-changelog-close`);
                const dragHeader  = container.querySelector(`#${scriptId}-changelog-drag`);

                // Declare drag/resize state here so the overlay-close handler (wired
                // up below) can reference these variables.
                let isDragging = false, isResizing = false, offsetX, offsetY;
                // didDrag / didResize: prevent the overlay mousedown that terminates a
                // drag-or-resize-then-release-outside sequence from closing the dialog.
                let didDrag = false, didResize = false;

                /**
                 * Updates the metadata line below the title with current cache info and,
                 * when a filter is active, the number of visible (filtered) entries.
                 */
                const updateMetaLine = () => {
                    if (!metaEl) return;
                    const filterActive = searchInput && searchInput.value.trim();
                    const filteredPart = filterActive && _visibleCount !== _changelog.length
                        ? ` <strong>(${_visibleCount} filtered)</strong>`
                        : '';
                    metaEl.innerHTML = _changelogMeta.fromCache === null
                        ? `${_changelog.length}${filteredPart} entries (static/local)`
                        : `${_changelog.length}${filteredPart} entries — source: <strong>${_changelogMeta.fromCache ? '📦 cache' : '🌐 network'}</strong>${_changelogMeta.fetchedAt ? ` · fetched ${Math.round((Date.now() - _changelogMeta.fetchedAt) / 1000)}s ago` : ''}`;
                };

                /**
                 * Show or hide the ✕ clear button depending on whether the search
                 * field has any content.  Null-safe: does nothing when clClearBtn
                 * was not found in the DOM.
                 */
                const updateClearBtn = () => {
                    if (clClearBtn) {
                        clClearBtn.style.display = searchInput && searchInput.value ? 'block' : 'none';
                    }
                };

                // ── Close handling (wired up FIRST so later errors cannot prevent ──
                // ── close from working)                                            ──

                // Named reference so it can be removed from the capture-phase listener
                // on dialog close, preventing accumulation across multiple opens.
                let clEscHandler = null;

                const closeDialog = () => {
                    if (clEscHandler) {
                        document.removeEventListener('keydown', clEscHandler, true);
                        clEscHandler = null;
                    }
                    container.style.transform = 'scale(0.96)';
                    container.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(overlay)) document.body.removeChild(overlay);
                    }, 150);
                };

                overlay.addEventListener('mousedown', e => {
                    if (e.target !== overlay) return;
                    // Ignore the mousedown that terminates a drag-or-resize-then-release-outside sequence
                    if (isDragging || isResizing || didDrag || didResize) {
                        didDrag = false; didResize = false;
                        return;
                    }
                    closeDialog();
                });

                // CLOSE link: stopPropagation on mousedown prevents the dragHeader
                // listener from firing, which would set container.style.position =
                // 'absolute' and potentially reposition the container between
                // mousedown and mouseup — causing the browser to drop the click event.
                if (closeLink) {
                    closeLink.addEventListener('mousedown', e => e.stopPropagation());
                    closeLink.addEventListener('click', () => closeDialog());
                }

                // Escape key behaviour (in priority order):
                //   1. Search field focused + has text  → clear text, re-render, keep focus
                //   2. Search field focused + empty     → blur the field (→ entriesWrap)
                //   3. Otherwise (not focused)          → close the dialog unconditionally
                //
                // capture:true ensures this fires before bubble-phase handlers and before
                // the browser's own native Escape handling on the input.
                // stopImmediatePropagation() in cases 1–2 prevents any other handler reacting.
                clEscHandler = (e) => {
                    if (e.key !== 'Escape') return;
                    if (searchInput && document.activeElement === searchInput) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        if (searchInput.value !== '') {
                            searchInput.value = '';
                            searchInput.dispatchEvent(new Event('input'));
                            updateMetaLine();
                            updateClearBtn();
                        } else {
                            searchInput.blur();
                            entriesWrap.focus();
                        }
                    } else {
                        closeDialog();
                    }
                };
                document.addEventListener('keydown', clEscHandler, true);

                // ── Search input ─────────────────────────────────────────────────

                // Prevent dragging when clicking/typing in the search box
                if (searchInput) {
                    searchInput.addEventListener('mousedown', e => e.stopPropagation());
                }

                // Focus the scrollable entries area when the mouse enters it so that
                // keyboard scroll keys (↑ ↓ PageUp PageDown Home End) work natively.
                entriesWrap.style.outline = 'none';
                entriesWrap.addEventListener('mouseenter', () => entriesWrap.focus());

                // Focus the search/filter input when the dialog opens.
                // setTimeout is used instead of requestAnimationFrame because the dialog
                // may be opened from a Tampermonkey GM menu click, which moves browser
                // focus to the browser chrome. A 200 ms delay lets the browser finish
                // its menu-close bookkeeping and return focus to the page first.
                setTimeout(() => { if (searchInput) searchInput.focus(); }, 200);

                if (searchInput) {
                    searchInput.addEventListener('input', () => {
                        entriesEl.innerHTML = buildContent(searchInput.value);
                        updateMetaLine();
                        updateClearBtn();
                    });
                }

                // ── Clear (✕) button ─────────────────────────────────────────────

                // Null-guarded: the button may theoretically be absent if innerHTML
                // parsing failed (e.g. due to a strict CSP stripping the element).
                if (clClearBtn) {
                    clClearBtn.addEventListener('mousedown', e => e.stopPropagation());
                    clClearBtn.addEventListener('click', () => {
                        if (!searchInput) return;
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input'));
                        searchInput.focus();
                    });
                }

                // ── Force refresh ─────────────────────────────────────────────────

                // Same stopPropagation pattern as CLOSE: prevents the dragHeader from
                // activating and jumping the container when this link is clicked.
                if (refreshLink) {
                    refreshLink.addEventListener('mousedown', e => e.stopPropagation());
                    refreshLink.addEventListener('click', async () => {
                        if (!_changelogMeta.url || !_changelogMeta.cacheKey) {
                            loggerInterface.warn('ui', 'Force refresh not available — no remote URL configured (static changelog only)');
                            refreshLink.textContent = '⚠️ No remote URL';
                            setTimeout(() => { refreshLink.textContent = '🔄 Force refresh'; }, 2500);
                            return;
                        }

                        refreshLink.textContent = '⏳ Refreshing…';
                        refreshLink.style.pointerEvents = 'none';
                        refreshLink.style.color = '#888';

                        loggerInterface.info('ui', `Changelog force refresh triggered — fetching from ${_changelogMeta.url}`);

                        const { data, error } = await fetchCachedText(
                            _changelogMeta.url,
                            _changelogMeta.cacheKey,
                            _changelogMeta.cacheTtlMs || 3600000,
                            true /* forceRefresh */
                        );

                        if (data) {
                            try {
                                const entries = JSON.parse(data);
                                _changelog.length = 0;
                                entries.forEach(e => _changelog.push(e));
                                _changelogMeta.fromCache = false;
                                _changelogMeta.fetchedAt = Date.now();
                                // Re-render respecting the current search filter
                                entriesEl.innerHTML = buildContent(searchInput ? searchInput.value : '');
                                updateMetaLine();
                                refreshLink.textContent = '✅ Refreshed';
                                loggerInterface.info('ui', `Changelog force refresh complete: ${_changelog.length} entries loaded from network`);
                            } catch (parseErr) {
                                loggerInterface.warn('ui', `Changelog force refresh: JSON parse error — ${parseErr.message}`);
                                refreshLink.textContent = '⚠️ Parse error';
                            }
                        } else {
                            loggerInterface.warn('ui', `Changelog force refresh failed: ${error}`);
                            refreshLink.textContent = '⚠️ Refresh failed';
                        }

                        setTimeout(() => {
                            refreshLink.textContent = '🔄 Force refresh';
                            refreshLink.style.pointerEvents = '';
                            refreshLink.style.color = '#0066cc';
                        }, 2500);
                    });
                }

                // ── Dragging & Resizing ───────────────────────────────────────────

                // Injected during resize to lock cursor and suppress text selection globally.
                // Removed on mouseup so normal behaviour is fully restored.
                let resizingStyleEl = null;
                const startResizeCursor = () => {
                    if (resizingStyleEl) return;
                    // GM_addStyle so this is exempt from page CSP style-src restrictions.
                    resizingStyleEl = GM_addStyle('* { cursor: nwse-resize !important; user-select: none !important; -webkit-user-select: none !important; }');
                    resizingStyleEl.id = `${scriptId}-cl-resizing-cursor`;
                };
                const stopResizeCursor = () => {
                    if (resizingStyleEl) { resizingStyleEl.remove(); resizingStyleEl = null; }
                };

                dragHeader.addEventListener('mousedown', e => {
                    isDragging = true;
                    didDrag    = false;
                    offsetX = e.clientX - container.offsetLeft;
                    offsetY = e.clientY - container.offsetTop;
                    container.style.position = 'absolute';
                });

                document.addEventListener('mousemove', e => {
                    if (isDragging) {
                        didDrag = true;
                        container.style.left = `${e.clientX - offsetX}px`;
                        container.style.top  = `${e.clientY - offsetY}px`;
                    }
                    if (isResizing) {
                        didResize = true;
                        const rect = container.getBoundingClientRect();
                        container.style.width  = Math.max(600, Math.min(window.innerWidth  * 0.95, e.clientX - rect.left)) + 'px';
                        container.style.height = Math.max(400, Math.min(window.innerHeight * 0.92, e.clientY - rect.top))  + 'px';
                    }
                });

                document.addEventListener('mouseup', () => {
                    if (isResizing) {
                        GM_setValue(sizeKey, { width: container.offsetWidth, height: container.offsetHeight });
                        stopResizeCursor();
                    }
                    isDragging = false; isResizing = false;
                });

                container.querySelector(`#${scriptId}-changelog-resize`)
                    .addEventListener('mousedown', e => {
                        e.stopPropagation();
                        isResizing = true;
                        didResize  = false;
                        startResizeCursor();
                    });
            }
        };

        // --- 5. Library Settings UI ---
        /**
         * Minimal settings editor for library-level display preferences.
         * Opened via the "🔧 Library Settings" GM menu item.
         * Persists values to GM storage under the key "vz-lib-prefs".
         *
         * Designed for future extensibility: additional preference fields can be added
         * by pushing entries into the `fields` array below.
         */
        const libSettingsInterface = {
            show: function() {
                if (document.getElementById('vz-lib-settings-dialog')) return;

                // Field definitions — extend this array to add more preferences.
                const fields = [
                    {
                        key:         'lib_content_font_size',
                        label:       'Content font size',
                        description: 'Font size used inside the Changelog and App Help dialogs. ' +
                                     'Accepts any valid CSS font-size value, e.g. 1.05em, 14px, 110%.',
                        type:        'text',
                        placeholder: _LIB_PREFS_DEFAULTS.lib_content_font_size,
                    },
                    {
                        key:         'lib_content_font_family',
                        label:       'Content font family',
                        description: 'Font family used inside the Changelog and App Help dialogs. ' +
                                     'Accepts any valid CSS font-family value, e.g. "Georgia, serif" or "monospace".',
                        type:        'text',
                        placeholder: _LIB_PREFS_DEFAULTS.lib_content_font_family,
                    },
                ];

                const dialog = document.createElement('div');
                dialog.id = 'vz-lib-settings-dialog';
                Object.assign(dialog.style, {
                    position: 'fixed', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    background: '#fff', border: '1px solid #ccc',
                    borderRadius: '10px', padding: '0',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
                    zIndex: '10010',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    minWidth: '420px', maxWidth: '560px',
                    display: 'flex', flexDirection: 'column',
                });

                // Title bar
                const titleBar = document.createElement('div');
                Object.assign(titleBar.style, {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px 12px', borderBottom: '2px solid #ddd',
                    background: '#f8f8f8', borderRadius: '10px 10px 0 0', flexShrink: '0',
                });
                const titleEl = document.createElement('span');
                titleEl.textContent = '🔧 Library Settings';
                titleEl.style.cssText = 'font-weight:700; font-size:1.1em; color:#222;';
                const closeX = document.createElement('button');
                closeX.textContent = '✕';
                closeX.style.cssText = 'background:none;border:none;font-size:1.2em;cursor:pointer;color:#666;padding:0 4px;line-height:1;';
                titleBar.appendChild(titleEl);
                titleBar.appendChild(closeX);
                dialog.appendChild(titleBar);

                // Body
                const body = document.createElement('div');
                body.style.cssText = 'padding:20px 24px; flex:1; overflow-y:auto;';

                const inputs = {};
                fields.forEach(field => {
                    const row = document.createElement('div');
                    row.style.cssText = 'margin-bottom:18px;';

                    const lbl = document.createElement('label');
                    lbl.style.cssText = 'display:block; font-weight:600; font-size:0.9em; color:#333; margin-bottom:4px;';
                    lbl.textContent = field.label;

                    const input = document.createElement('input');
                    input.type        = field.type;
                    input.value       = _libPrefs[field.key];
                    input.placeholder = field.placeholder || '';
                    input.style.cssText = 'width:100%; box-sizing:border-box; padding:7px 10px; border:1px solid #c8cdd5; border-radius:6px; font-size:0.9em; background:#f8f9fc; outline:none;';
                    input.addEventListener('focus', () => { input.style.borderColor = '#4a90d9'; input.style.boxShadow = '0 0 0 2px rgba(74,144,217,0.2)'; });
                    input.addEventListener('blur',  () => { input.style.borderColor = '#c8cdd5'; input.style.boxShadow = 'none'; });

                    const desc = document.createElement('div');
                    desc.style.cssText = 'font-size:0.82em; color:#777; margin-top:5px; line-height:1.45;';
                    desc.textContent = field.description;

                    row.appendChild(lbl);
                    row.appendChild(input);
                    row.appendChild(desc);
                    body.appendChild(row);
                    inputs[field.key] = input;
                });

                // Default link
                const resetLink = document.createElement('a');
                resetLink.style.cssText = 'font-size:0.82em; color:#888; cursor:pointer; text-decoration:underline;';
                resetLink.textContent = 'Reset to defaults';
                resetLink.addEventListener('click', () => {
                    fields.forEach(f => { inputs[f.key].value = _LIB_PREFS_DEFAULTS[f.key]; });
                });
                body.appendChild(resetLink);
                dialog.appendChild(body);

                // Footer
                const footer = document.createElement('div');
                footer.style.cssText = 'display:flex; justify-content:flex-end; gap:10px; padding:12px 20px; border-top:1px solid #eee; background:#f8f8f8; border-radius:0 0 10px 10px; flex-shrink:0;';

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                cancelBtn.style.cssText = 'padding:7px 18px; border-radius:6px; border:1px solid #aaa; background:#eee; cursor:pointer; font-size:0.95em;';

                const saveBtn = document.createElement('button');
                saveBtn.textContent = 'Save';
                saveBtn.style.cssText = 'padding:7px 18px; border-radius:6px; border:1px solid #546E7A; background:#607D8B; color:#fff; cursor:pointer; font-size:0.95em; font-weight:600;';

                footer.appendChild(cancelBtn);
                footer.appendChild(saveBtn);
                dialog.appendChild(footer);
                document.body.appendChild(dialog);

                const closeDialog = () => {
                    dialog.remove();
                    document.removeEventListener('keydown', onKey, true);
                };

                cancelBtn.addEventListener('click', closeDialog);
                closeX.addEventListener('click', closeDialog);

                saveBtn.addEventListener('click', () => {
                    fields.forEach(f => { _libPrefs[f.key] = inputs[f.key].value.trim() || _LIB_PREFS_DEFAULTS[f.key]; });
                    _saveLibPrefs();
                    closeDialog();
                });

                const onKey = (e) => {
                    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeDialog(); }
                    if (e.key === 'Enter')  { e.preventDefault(); saveBtn.click(); }
                };
                document.addEventListener('keydown', onKey, true);

                // Click-outside close
                setTimeout(() => {
                    const onOutside = (e) => { if (!dialog.contains(e.target)) { closeDialog(); document.removeEventListener('click', onOutside); } };
                    document.addEventListener('click', onOutside);
                }, 100);

                setTimeout(() => inputs[fields[0].key].focus(), 50);
            }
        };

        // --- 6. Setup Menus ---
        /**
         * Registers Tampermonkey menu commands and injects a link into the MB Editing menu.
         * The ChangeLog menu item is only registered here for static changelogs; when
         * remoteConfig is set it is registered by initRemoteContent() after the async fetch.
         */
        const setupMenus = function() {
            if (typeof GM_registerMenuCommand !== 'undefined') {
                if (configSchema) {
                    GM_registerMenuCommand('⚙️ Userscript Settings Manager', () => settingsInterface.showModal());
                }
                if (!remoteConfig && _changelog.length > 0) {
                    GM_registerMenuCommand('📜 ChangeLog', () => changelogInterface.show());
                }
                GM_registerMenuCommand('🔧 Library Settings', () => libSettingsInterface.show());
            }

            // Webpage "Editing" menu integration
            if (configSchema) {
                const editMenuItem = document.querySelector('div.right div.bottom ul.menu li.editing');
                const editMenuUl   = editMenuItem ? editMenuItem.querySelector('ul') : null;

                if (editMenuUl && !document.getElementById(`${scriptId}-menu-link`)) {
                    const li = document.createElement('li');
                    const a  = document.createElement('a');
                    a.id = `${scriptId}-menu-link`;
                    a.href = 'javascript:void(0)';
                    a.textContent = '⚙️ ' + scriptName;
                    a.style.cursor = 'pointer';
                    a.addEventListener('click', (e) => { e.preventDefault(); settingsInterface.showModal(); });
                    li.appendChild(a);
                    editMenuUl.appendChild(li);
                    loggerInterface.debug('init', 'Settings entry added to Editing menu.');
                }
            }
        };

        // --- 6. Remote Content Initialisation ---
        /**
         * If remoteConfig.changelogUrl is provided, fetch the changelog JSON from
         * GitHub (with GM cache), populate _changelog in place, then register the
         * ChangeLog GM menu command.  Called once at construction time; fully async
         * and non-blocking.
         */
        const initRemoteContent = async function() {
            if (!remoteConfig || !remoteConfig.changelogUrl) {
                if (_changelog.length > 0) {
                    loggerInterface.info('remote', `Changelog source: static only (${_changelog.length} entries, no remoteConfig provided)`);
                } else {
                    loggerInterface.info('remote', 'Changelog source: none (no static entries, no remoteConfig provided)');
                }
                return;
            }

            const {
                changelogUrl,
                cacheKeyChangelog = `${scriptId}-remote-changelog`,
                cacheTtlMs = 3600000
            } = remoteConfig;

            // Store fetch coordinates so changelogInterface.show() can force-refresh later.
            _changelogMeta.url        = changelogUrl;
            _changelogMeta.cacheKey   = cacheKeyChangelog;
            _changelogMeta.cacheTtlMs = cacheTtlMs;

            const localCount = _changelog.length;

            const { data, fromCache, error } = await fetchCachedText(changelogUrl, cacheKeyChangelog, cacheTtlMs);

            if (!data) {
                loggerInterface.warn('remote', `Changelog not available remotely: ${error}`);
                if (localCount > 0) {
                    loggerInterface.warn('remote', `Changelog source: falling back to ${localCount} static (local) entries`);
                } else {
                    loggerInterface.warn('remote', 'Changelog source: none (remote failed, no static entries available as fallback)');
                }
                return;
            }

            try {
                const entries = JSON.parse(data);
                // Replace _changelog in place so any existing reference stays valid
                _changelog.length = 0;
                entries.forEach(e => _changelog.push(e));

                _changelogMeta.fromCache = fromCache;
                _changelogMeta.fetchedAt = Date.now();

                loggerInterface.info('remote', `Changelog source: remote — replaced ${localCount} local entr${localCount === 1 ? 'y' : 'ies'} with ${_changelog.length} remote entries (fromCache=${fromCache})`);

                if (typeof GM_registerMenuCommand !== 'undefined' && _changelog.length > 0) {
                    GM_registerMenuCommand('📜 ChangeLog', () => changelogInterface.show());
                }
            } catch (err) {
                loggerInterface.warn('remote', `Failed to parse remote changelog JSON: ${err.message}`);
                if (localCount > 0) {
                    loggerInterface.warn('remote', `Changelog source: falling back to ${localCount} static (local) entries due to parse error`);
                }
            }
        };

        /**
         * Opens a draggable table-editor panel for a type:'table' config entry.
         * Rows stored as GM_setValue(key, [[col0,col1,...], ...]).
         * @param {string} key  GM storage key (e.g. 'sa_rel_discography_mappings')
         * @param {Object} cfg  Config schema entry
         */
        function _openTableEditor(key, cfg) {
            const _pid = 'vz-tbl-editor-' + key;
            const _ex  = document.getElementById(_pid);
            if (_ex) { _ex.parentNode.removeChild(_ex); return; }

            const _cols  = cfg.columns || [];
            const _name  = cfg.table_name || cfg.label || key;
            const _saved = (typeof GM_getValue !== 'undefined') ? GM_getValue(key, []) : [];

            const panel = document.createElement('div');
            panel.id = _pid;
            panel.style.cssText =
                'position:fixed;top:80px;left:50%;transform:translateX(-50%);'
                + 'z-index:2000000;min-width:560px;max-width:90vw;max-height:75vh;'
                + 'display:flex;flex-direction:column;'
                + 'background:#fff;border:1px solid #c0c8d8;border-radius:8px;'
                + 'box-shadow:0 6px 24px rgba(0,0,0,0.25);font-family:sans-serif;font-size:0.9em;';

            // Header (drag handle)
            const hdr = document.createElement('div');
            hdr.style.cssText =
                'display:flex;align-items:center;justify-content:space-between;'
                + 'padding:10px 14px;background:#3d5a78;color:#fff;'
                + 'border-radius:8px 8px 0 0;cursor:move;user-select:none;flex-shrink:0;';
            hdr.innerHTML = `<strong>📋 ${_name}</strong>`;
            const _hClose = document.createElement('button');
            _hClose.textContent = '\u2715';
            _hClose.title = 'Close';
            _hClose.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer;font-size:1.1em;padding:0 4px;';
            _hClose.addEventListener('click', () => panel.parentNode?.removeChild(panel));
            hdr.appendChild(_hClose);
            panel.appendChild(hdr);

            // Scrollable table area
            const _scroll = document.createElement('div');
            _scroll.style.cssText = 'overflow:auto;flex:1;padding:10px 14px;';
            const tbl = document.createElement('table');
            tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.88em;';
            const _thead = tbl.createTHead();
            const _thr   = _thead.insertRow();
            _thr.style.background = '#e8edf5';
            _cols.forEach(c => {
                const th = document.createElement('th');
                th.style.cssText = 'padding:6px 8px;text-align:left;border:1px solid #c0c8d8;font-weight:600;white-space:nowrap;';
                th.textContent = c;
                _thr.appendChild(th);
            });
            const _thDel = document.createElement('th');
            _thDel.style.cssText = 'padding:6px;width:32px;border:1px solid #c0c8d8;';
            _thr.appendChild(_thDel);
            const tbody = tbl.createTBody();
            _scroll.appendChild(tbl);
            panel.appendChild(_scroll);

            // Add one editable row; values[] pre-fills inputs
            function _addRow(values) {
                const tr = tbody.insertRow();
                tr.style.background = tbody.rows.length % 2 === 1 ? '#fff' : '#f8f9fc';
                _cols.forEach((_, ci) => {
                    const td = tr.insertCell();
                    td.style.cssText = 'padding:3px 4px;border:1px solid #d8dde8;';
                    const inp = document.createElement('input');
                    inp.type = 'text';
                    inp.value = (values && values[ci] !== undefined) ? values[ci] : '';
                    inp.style.cssText = 'width:100%;padding:3px 5px;border:1px solid #bbb;border-radius:3px;box-sizing:border-box;font-family:monospace;font-size:0.95em;';
                    td.appendChild(inp);
                });
                const _tdD = tr.insertCell();
                _tdD.style.cssText = 'padding:3px;border:1px solid #d8dde8;text-align:center;';
                const _del = document.createElement('button');
                _del.textContent = '🗑';
                _del.title = 'Delete row';
                _del.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1em;';
                _del.addEventListener('click', () => tbody.removeChild(tr));
                _tdD.appendChild(_del);
            }
            (_saved || []).forEach(r => _addRow(r));

            // Footer
            const foot = document.createElement('div');
            foot.style.cssText =
                'display:flex;justify-content:space-between;align-items:center;'
                + 'padding:8px 14px;border-top:1px solid #e0e4ec;background:#f8f9fc;'
                + 'border-radius:0 0 8px 8px;flex-shrink:0;';
            const _addBtn = document.createElement('button');
            _addBtn.textContent = '+ Add Row';
            _addBtn.style.cssText = 'padding:5px 12px;border:1px solid #7090c0;border-radius:4px;background:#e8f0fc;cursor:pointer;font-size:0.88em;';
            _addBtn.addEventListener('click', () => _addRow(null));
            const _right = document.createElement('div');
            _right.style.cssText = 'display:flex;gap:8px;';
            const _saveBtn = document.createElement('button');
            _saveBtn.textContent = '💾 Save';
            _saveBtn.style.cssText = 'padding:5px 14px;border:1px solid #3d5a78;border-radius:4px;background:#3d5a78;color:#fff;font-weight:600;cursor:pointer;font-size:0.88em;';
            _saveBtn.addEventListener('click', () => {
                const rows = Array.from(tbody.querySelectorAll('tr')).map(tr =>
                    Array.from(tr.querySelectorAll('input[type=text]')).map(i => i.value.trim())
                ).filter(r => r.some(v => v));
                if (typeof GM_setValue !== 'undefined') GM_setValue(key, rows);
                _saveBtn.textContent = '\u2713 Saved';
                setTimeout(() => { _saveBtn.textContent = '💾 Save'; }, 1500);
            });
            const _cls2 = document.createElement('button');
            _cls2.textContent = 'Close';
            _cls2.style.cssText = 'padding:5px 12px;border:1px solid #aaa;border-radius:4px;background:#eff1f5;cursor:pointer;font-size:0.88em;';
            _cls2.addEventListener('click', () => panel.parentNode?.removeChild(panel));
            _right.appendChild(_saveBtn);
            _right.appendChild(_cls2);
            foot.appendChild(_addBtn);
            foot.appendChild(_right);
            panel.appendChild(foot);
            // Make the panel itself focusable so it can receive keyboard events
            // directly (without requiring a child input to be focused).
            panel.tabIndex = 0;
            panel.style.outline = 'none'; // suppress the default focus ring on the container

            document.body.appendChild(panel);

            // Drag support
            let _ox = 0, _oy = 0, _drag = false;
            hdr.addEventListener('mousedown', e => {
                _drag = true;
                const r = panel.getBoundingClientRect();
                _ox = e.clientX - r.left; _oy = e.clientY - r.top;
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!_drag) return;
                panel.style.left = (e.clientX - _ox) + 'px';
                panel.style.top  = (e.clientY - _oy) + 'px';
                panel.style.transform = 'none';
            });
            document.addEventListener('mouseup', () => { _drag = false; });

            // Escape key — two-step behaviour, all handled at the panel level.
            // Because the listener is on the panel (not document), it only fires
            // when focus is inside the panel, so settingsEscHandler is never
            // disturbed regardless of which step executes.
            //
            //   Step 1 — focus is on a text input inside the panel:
            //     Blur the input and move focus to the panel itself so the user
            //     can press Escape a second time to close, or Tab to another input.
            //
            //   Step 2 — focus is on the panel itself (or any non-input child):
            //     Close the panel, equivalent to clicking the footer Close button.
            panel.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                // settingsEscHandler already bailed out via its guard above, but use
                // stopImmediatePropagation as belt-and-braces in case there are other
                // document-level capture handlers.
                e.stopImmediatePropagation();
                e.preventDefault();
                if (document.activeElement !== panel &&
                    panel.contains(document.activeElement)) {
                    // Step 1: an input inside the panel has focus — blur it and move
                    // focus to the panel itself. A second Escape will then close.
                    document.activeElement.blur();
                    panel.focus();
                } else {
                    // Step 2: the panel itself has focus — close it (same as Close button).
                    panel.parentNode?.removeChild(panel);
                }
            });

            // Focus the panel itself after it is added to the DOM so the user can
            // immediately press Escape to close it without clicking first.
            panel.focus();
        }

        // ── Initialisation ────────────────────────────────────────────────────────
        settingsInterface.init();
        setupMenus();
        initRemoteContent(); // non-blocking async

        // ── Public API ────────────────────────────────────────────────────────────
        return {
            // Library's own version
            version: LIBRARY_VERSION,
            // Settings interface
            settings:           settingsInterface.values,
            settingsInterface:  settingsInterface,

            // `|| {}` deliberately absent: an absent registry must reach
            // showModal() as undefined so it falls back to whatever
            // configureSettings() registered, rather than being told "an empty
            // registry, on purpose".
            showSettings:       (opts) => settingsInterface.showModal(opts?.functionRegistry),
            configureSettings:  (opts) => settingsInterface.configure(opts),
            getTableRows:       (key, defaultRows) => {
                if (typeof GM_getValue === 'undefined') return defaultRows || [];
                const rows = GM_getValue(key, defaultRows || []);
                return Array.isArray(rows) ? rows : (defaultRows || []);
            },
            libPrefs:           _libPrefs,
            libSettingsInterface,
            // Logging interface
            log:     loggerInterface.log.bind(loggerInterface),
            debug:   loggerInterface.debug.bind(loggerInterface),
            info:    loggerInterface.info.bind(loggerInterface),
            warn:    loggerInterface.warn.bind(loggerInterface),
            error:   loggerInterface.error.bind(loggerInterface),
            time:    loggerInterface.time.bind(loggerInterface),
            timeEnd: loggerInterface.timeEnd.bind(loggerInterface),
            // Remote content helpers (require @grant GM_xmlhttpRequest in consumer script)
            fetchRemoteText,
            fetchCachedText,
            // Custom dialog helpers — available to all consumer scripts
            showCustomDialog,
            showCustomAlert,
            showCustomConfirm,
            get prefix()    { return loggerInterface.prefix; },
            set prefix(val) { loggerInterface.prefix = val; }
        };
    };
})();
