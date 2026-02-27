// ==UserScript==
// @name         VZ: MusicBrainz - Show All Entity Data In A Consolidated View
// @namespace    https://github.com/vzell/mb-userscripts
// @version      9.97.22+2026-02-26
// @description  Consolidation tool to accumulate paginated and non-paginated (tables with subheadings) MusicBrainz table lists (Events, Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting
// @author       vzell
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
// @match        *://*.musicbrainz.org/search?query=*
// @connect      raw.githubusercontent.com
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
 * Recordings, Releases, Works, etc.) into a single view with real-time multi-column sorting and filtering.
 *
 * This script has been created by giving the right facts and asking the right questions initially to Gemini. When
 * Gemini gots stuck, I asked ChatGPT for help, until I got everything right. Later when the script increased in size
 * and evolved, I switched to Claude and only now and then asked the other two for help.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome, Firefox, Opera and Brave.
 */

(function() {
    'use strict';

    const SCRIPT_BASE_NAME = "ShowAllEntityData";
    // SCRIPT_ID is derived from SCRIPT_BASE_NAME: CamelCase → kebab-case, lower-cased, prepend "vz-mb-"
    const SCRIPT_ID = 'vz-mb-' + SCRIPT_BASE_NAME.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : SCRIPT_BASE_NAME;

    // Remote URLs for changelog and help text.
    // The changelog is fetched and the GM menu item registered by VZ_MBLibrary
    // (via remoteConfig passed to the constructor below).
    // The help URL is only used lazily by showAppHelp() via Lib.fetchCachedText().
    const REMOTE_BASE          = 'https://raw.githubusercontent.com/vzell/mb-userscripts/master/';
    const REMOTE_HELP_URL      = REMOTE_BASE + SCRIPT_BASE_NAME + '_HELP.txt';
    const REMOTE_CHANGELOG_URL = REMOTE_BASE + SCRIPT_BASE_NAME + '_CHANGELOG.json';
    const REMOTE_CACHE_TTL_MS  = 60 * 60 * 1000; // 1 hour
    const CACHE_KEY_HELP       = SCRIPT_BASE_NAME.toLowerCase() + '-remote-help-text';
    const CACHE_KEY_CHANGELOG  = SCRIPT_BASE_NAME.toLowerCase() + '-remote-changelog';


    // CONFIG SCHEMA
    const configSchema = {
        // ============================================================
        // GENERIC SECTION
        // ============================================================
        divider_: {
            type: 'divider',
            label: '🛠️ GENERIC SETTINGS'
        },

        sa_enable_debug_logging: {
            label: "Enable debug logging",
            type: "checkbox",
            default: false,
            description: "Enable debug logging in the browser developer console"
        },

        sa_render_overflow_tables_in_new_tab: {
            label: "Render overflow tables in a new tab",
            type: "checkbox",
            default: true,
            description: "Render sub-tables on pages like 'Artist-Relastionships' in a new tab. These are limited to 100 rows by default."
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
            default: true,
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

        sa_remove_rating: {
            label: "Remove Rating column",
            type: "checkbox",
            default: false,
            description: "Remove the Rating column from the final rendered tables"
        },

        sa_remove_release_events: {
            label: 'Remove "Release events" column from "Place-Performances" pages',
            type: "checkbox",
            default: true,
            description: "Remove the 'Release events' column from the final rendered tables (coming from the jesus2099 'mb. SUPER MIND CONTROL Ⅱ X TURBO' userscript"
        },

        sa_remove_rel: {
            label: "Remove Relationships column",
            type: "checkbox",
            default: true,
            description: "Remove the Relationships column from the final rendered tables (comes from another userscript) "
        },

        sa_remove_perf: {
            label: "Remove Performance column",
            type: "checkbox",
            default: true,
            description: "Remove the Performance column from the final rendered tables (comes from another userscript) "
        },

        // ============================================================
        // KEYBOARD SHORTCUTS SECTION
        // ============================================================
        divider_keyboard_shortcuts: {
            type: 'divider',
            label: '🎹 KEYBOARD SHORTCUTS'
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

        sa_keyboard_shortcut_prefix: {
            label: "Keyboard Shortcut Prefix",
            type: "keyboard_shortcut",
            default: "Ctrl+M",
            description: "Keyboard shortcut prefix key combination (expects a second key press to be complete, e.g. Ctrl+M, Ctrl+., Alt+X, Ctrl+Shift+,)"
        },

        // ---- Configurable direct shortcuts ----
        // Every entry below controls a single-chord shortcut (no prefix second-key needed).
        // Use the 🎹 Capture button to record a new combination. Changes take effect after Save.

        sa_shortcut_save_to_disk: {
            label: "Shortcut: Save to Disk",
            type: "keyboard_shortcut",
            default: "Ctrl+S",
            description: "Save the current table data to disk as Gzipped JSON (default: Ctrl+S)"
        },

        sa_shortcut_load_from_disk: {
            label: "Shortcut: Load from Disk",
            type: "keyboard_shortcut",
            default: "Ctrl+L",
            description: "Open the Load-from-disk dialog (default: Ctrl+L)"
        },

        sa_shortcut_auto_resize: {
            label: "Shortcut: Toggle Auto-Resize Columns",
            type: "keyboard_shortcut",
            default: "Ctrl+R",
            description: "Toggle automatic column-width optimisation (default: Ctrl+R; also available as prefix-mode sub-key r)"
        },

        sa_shortcut_open_visible_columns: {
            label: "Shortcut: Open Visible Columns Menu",
            type: "keyboard_shortcut",
            default: "Ctrl+V",
            description: "Open the Visible Columns menu (default: Ctrl+V)"
        },

        sa_shortcut_open_density: {
            label: "Shortcut: Open Density Menu",
            type: "keyboard_shortcut",
            default: "Ctrl+D",
            description: "Open the table Density (row-spacing) menu (default: Ctrl+D)"
        },

        sa_shortcut_open_statistics: {
            label: "Shortcut: Open Statistics Menu",
            type: "keyboard_shortcut",
            default: "Ctrl+I",
            description: "Open the page Statistics menu (default: Ctrl+I)"
        },

        sa_shortcut_open_export: {
            label: "Shortcut: Open Export Menu",
            type: "keyboard_shortcut",
            default: "Ctrl+E",
            description: "Open the Export menu (CSV / JSON / Org-Mode) (default: Ctrl+E)"
        },

        sa_shortcut_open_settings: {
            label: "Shortcut: Open Settings",
            type: "keyboard_shortcut",
            default: "Ctrl+,",
            description: "Open the Settings dialog (default: Ctrl+,)"
        },

        sa_shortcut_focus_global_filter: {
            label: "Shortcut: Focus Global Filter",
            type: "keyboard_shortcut",
            default: "Ctrl+G",
            description: "Move keyboard focus to the global filter input (default: Ctrl+G)"
        },

        sa_shortcut_focus_column_filter: {
            label: "Shortcut: Focus Column Filter",
            type: "keyboard_shortcut",
            default: "Ctrl+C",
            description: "Focus the first column filter of the next table, cycling through all tables (default: Ctrl+C)"
        },

        sa_shortcut_clear_filters: {
            label: "Shortcut: Clear All Filters",
            type: "keyboard_shortcut",
            default: "Ctrl+Shift+G",
            description: "Clear every active filter (global + all column filters) at once (default: Ctrl+Shift+G)"
        },

        sa_shortcut_toggle_h2: {
            label: "Shortcut: Toggle h2 Headers",
            type: "keyboard_shortcut",
            default: "Ctrl+2",
            description: "Toggle collapse / expand of all h2 section headers (default: Ctrl+2)"
        },

        sa_shortcut_toggle_h3: {
            label: "Shortcut: Toggle h3 Headers",
            type: "keyboard_shortcut",
            default: "Ctrl+3",
            description: "Toggle collapse / expand of all h3 type headers (sub-tables) (default: Ctrl+3)"
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
            default: "#008000",
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

        sa_col_filter_focus_bg: {
            label: "Column Filter Focus Background",
            type: "color_picker",
            default: "#fffde7",
            description: "Background color of a column filter input while it has keyboard focus"
        },

        sa_col_filter_active_bg: {
            label: "Column Filter Active Background",
            type: "color_picker",
            default: "#fff9c4",
            description: "Background color kept on a column filter input after losing focus when it still contains a filter string"
        },

        sa_col_filter_focus_prefix: {
            label: "Column Filter Focus Prefix",
            type: "text",
            default: "🔍 ",
            description: "Decorative prefix prepended to a column filter field while it has focus (stripped before the value is used as a filter string)"
        },

        // ============================================================
        // PERFORMANCE SETTINGS SECTION
        // ============================================================
        divider_performance: {
            type: 'divider',
            label: '⚡ PERFORMANCE SETTINGS'
        },

        sa_load_history_limit: {
            label: 'Load Filter History Limit',
            type: 'number',
            default: 50,
            min: 0,
            max: 50,
            description: 'Number of previous filter expressions to remember in the load dialog.'
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

        sa_render_warning_threshold: {
            label: "Render Warning Threshold",
            type: "number",
            default: 10000,
            description: "Row count above which a confirmation dialog warns about potentially slow rendering before proceeding (0 to disable). Checked after the large-dataset threshold dialog."
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
        // UI FEATURES SECTION
        // ============================================================
        divider_ui_features: {
            type: 'divider',
            label: '🎨 UI FEATURES'
        },

        sa_enable_save_load: {
            label: 'Enable Save/Load to Disk',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "💾 Save" and "📂 Load" buttons for disk persistence'
        },

        sa_enable_column_resizing: {
            label: 'Enable Column Resizing',
            type: 'checkbox',
            default: true,
            description: 'Enable manual column resizing with mouse drag and "↔️ Auto-Resize" button'
        },

        sa_enable_column_visibility: {
            label: 'Enable Column Visibility Toggle',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "👁️ Visible Columns" button for toggling column visibility'
        },

        sa_enable_density_control: {
            label: 'Enable Table Density Control',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "📏 Density" button for adjusting table spacing'
        },

        sa_enable_stats_panel: {
            label: 'Enable Quick Stats Panel',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "📊 Statistics" button for displaying table statistics'
        },

        sa_enable_export: {
            label: 'Enable Export',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "💾 Export" button for exporting data to different formats (CSV/JSON/Org-Mode)'
        },

        sa_enable_sticky_headers: {
            label: 'Enable Sticky Headers',
            type: 'checkbox',
            default: true,
            description: 'Keep table headers visible when scrolling'
        },

        // ============================================================
        // UI APPEARANCE SECTION
        // Condensed pipe-separated config strings for every interactive
        // UI element in the script. Format is documented per entry.
        // ============================================================
        divider_ui_appearance: {
            type: 'divider',
            label: '🖌️ ELEMENT UI STYLES'
        },

        // --- H1 action bar: base shape shared by all buttons ---
        sa_ui_action_btn_style: {
            label: 'Action button base style',
            type: 'popup_dialog',
            fields: ['fontSize', 'padding', 'height', 'borderRadius'],
            default: '0.8em|2px 8px|24px|6px',
            description: 'Base style for all h1 action-bar buttons: fontSize|padding|height|borderRadius'
        },

        // --- H1 action bar: per-button colour overrides ---
        sa_ui_save_btn_style: {
            label: 'Save button colors',
            type: 'popup_dialog',
            fields: ['bg', 'color', 'border', 'bgHover'],
            default: '#4CAF50|white|1px solid #45a049|#45a049',
            description: 'Save-to-Disk button: bg|color|border|bgHover'
        },

        sa_ui_load_btn_style: {
            label: 'Load button colors',
            type: 'popup_dialog',
            fields: ['bg', 'color', 'border', 'bgHover'],
            default: '#2196F3|white|1px solid #0b7dda|#0b7dda',
            description: 'Load-from-Disk button: bg|color|border|bgHover'
        },

        sa_ui_stop_btn_style: {
            label: 'Stop button colors',
            type: 'popup_dialog',
            fields: ['bg', 'color', 'border'],
            default: '#f44336|white|1px solid #d32f2f',
            description: 'Stop button: bg|color|border'
        },

        sa_ui_settings_btn_style: {
            label: 'Settings ⚙️ button colors',
            type: 'popup_dialog',
            fields: ['bg', 'color', 'border'],
            default: '#607D8B|white|1px solid #546E7A',
            description: 'Settings button: bg|color|border'
        },

        sa_ui_help_btn_style: {
            label: 'Help ❓ button colors',
            type: 'popup_dialog',
            fields: ['bg', 'color', 'border'],
            default: '#78909C|white|1px solid #607D8B',
            description: 'Application-help button: bg|color|border'
        },

        // --- Button-group separator dividers ---
        sa_ui_button_divider_style: {
            label: 'Button divider style',
            type: 'popup_dialog',
            fields: ['color', 'margin'],
            default: '#999|0 4px',
            description: 'Pipe separator between button groups: color|margin'
        },

        // --- Global filter input (large input in the H2 bar) ---
        sa_global_filter_border_idle: {
            label: 'Global filter border — idle (empty)',
            type: 'color_picker',
            default: '#000000',
            description: 'Border color of the global filter input when the field is empty (no active filter)'
        },

        sa_global_filter_border_active: {
            label: 'Global filter border — active (has filter text)',
            type: 'color_picker',
            default: 'orange',
            description: 'Border color of the global filter input while it holds a valid filter string'
        },

        // --- Sub-table filter input border colors ---
        sa_subtable_filter_border_idle: {
            label: 'Sub-table filter border — idle (empty)',
            type: 'color_picker',
            default: '#cccccc',
            description: 'Border color of a sub-table filter input when the field is empty (no active filter)'
        },

        sa_subtable_filter_border_active: {
            label: 'Sub-table filter border — active (has filter text)',
            type: 'color_picker',
            default: '#008000',
            description: 'Border color of a sub-table filter input while it holds a valid filter string'
        },

        // --- Shared error border color for all filter inputs with Rx mode ---
        sa_filter_border_error: {
            label: 'Filter border — error (invalid regexp) — all filter types',
            type: 'color_picker',
            default: '#cc0000',
            description: 'Border color applied to any filter input (global, sub-table, or column) when the Rx checkbox is on and the entered expression is not a valid regular expression. The border width is also increased to 4 px to make the error color clearly visible.'
        },

        sa_global_filter_initial_width: {
            label: 'Global filter initial width (px)',
            type: 'number',
            default: 500,
            min: 100,
            max: 2000,
            description: 'Initial width in pixels of the global filter input; the field can be widened by dragging the resize handle at its right edge'
        },

        sa_subtable_filter_initial_width: {
            label: 'Sub-table filter initial width (px)',
            type: 'number',
            default: 320,
            min: 100,
            max: 2000,
            description: 'Initial width in pixels of each sub-table filter input; the field can be widened by dragging the resize handle at its right edge'
        },

        sa_ui_global_filter_input_style: {
            label: 'Global filter input style',
            type: 'popup_dialog',
            fields: ['fontSize', 'padding', 'border', 'borderRadius', 'width', 'height'],
            default: '1em|2px 6px|2px solid #000|3px|500px|24px',
            description: 'Global filter input: fontSize|padding|border|borderRadius|width|height (border color is overridden by the three "Global filter border" color pickers; initial width is overridden by "Global filter initial width")'
        },

        // --- Pre-load filter input (small input in the H1 controls bar) ---
        sa_ui_prefilter_input_style: {
            label: 'Pre-load filter input style',
            type: 'popup_dialog',
            fields: ['fontSize', 'padding', 'border', 'borderRadius', 'width', 'height'],
            default: '1em|2px 4px|1px solid #ccc|3px|150px|24px',
            description: 'Pre-load filter input: fontSize|padding|border|borderRadius|width|height'
        },

        // --- Per-column filter inputs (thead row) ---
        sa_ui_column_filter_input_style: {
            label: 'Column filter input style',
            type: 'popup_dialog',
            fields: ['fontSize', 'padding'],
            default: '1em|1px 18px 1px 4px',
            description: 'Per-column filter inputs: fontSize|padding'
        },

        // --- Sub-table control buttons (Clear Filters / Show all N) ---
        sa_ui_subtable_btn_style: {
            label: 'Sub-table button style',
            type: 'popup_dialog',
            fields: ['fontSize', 'padding', 'borderRadius', 'bg', 'border', 'bgHover'],
            default: '0.8em|2px 6px|4px|#f0f0f0|1px solid #ccc|#e0e0e0',
            description: 'mb-subtable-clear-btn / mb-show-all-subtable-btn: fontSize|padding|borderRadius|bg|border|bgHover'
        },

        // --- Filter-bar utility buttons (Prefilter toggle, Toggle highlighting, Clear filters) ---
        sa_ui_filter_bar_btn_style: {
            label: 'Filter bar utility button style',
            type: 'popup_dialog',
            fields: ['fontSize', 'padding', 'borderRadius', 'bg', 'border'],
            default: '0.8em|2px 6px|4px|#f0f0f0|1px solid #ccc',
            description: 'Filter-bar utility buttons (prefilter toggle, highlight toggle, clear buttons): fontSize|padding|borderRadius|bg|border'
        },

        // --- Checkboxes and their labels in filter bars ---
        sa_ui_checkbox_style: {
            label: 'Filter bar checkbox style',
            type: 'popup_dialog',
            fields: ['fontSize', 'marginRight'],
            default: '0.8em|2px',
            description: 'Checkboxes (Cc / Rx / Ex) in filter bars: fontSize|marginRight'
        }

    };

    //--------------------------------------------------------------------------------

    // Initialize VZ-MBLibrary (Logger + Settings + Changelog)
    // Use a ref object to avoid circular dependency during initialization
    const settings = {};
    const remoteConfig = {
        changelogUrl:      REMOTE_CHANGELOG_URL,
        cacheKeyChangelog: CACHE_KEY_CHANGELOG,
        cacheTtlMs:        REMOTE_CACHE_TTL_MS
    };

    const Lib = (typeof VZ_MBLibrary !== 'undefined')
          ? new VZ_MBLibrary(SCRIPT_ID, SCRIPT_NAME, configSchema, null, () => {
              // Dynamic check: returns current value of debug setting
              return settings.sa_enable_debug_logging ?? false;
          }, remoteConfig)
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

    // --- ColumnDataExtractor: Column Extraction & Transformation Registry ---
    //
    // Each named function receives the *source* <td> element from the fetched page
    // and returns an ordered array of freshly-created <td> elements — one per
    // synthetic column declared in the corresponding `columnExtractors` descriptor.
    //
    // Contract:
    //   extractorFn(sourceCell: HTMLTableCellElement): HTMLTableCellElement[]
    //
    // The returned array MUST have the same length as the `syntheticColumns` array
    // in the associated descriptor; extra elements are ignored, missing ones yield
    // an empty <td> placeholder so the table row stays structurally consistent.
    //
    // Adding a new extractor:
    //   1. Add a function here with a descriptive camelCase name.
    //   2. Reference it by that name string in the `columnExtractors` array inside
    //      the relevant pageDefinitions `features` object.
    //   3. Declare the synthetic column header names in `syntheticColumns`.

    const ColumnDataExtractor = {

        /**
         * splitCountryDate — splits a "Country/Date" cell into separate Country and
         * Date cells.  Source structure: .release-event > (.release-country +
         * .release-date), repeated once per release event.
         * Synthetic columns: ['Country', 'Date']
         */
        splitCountryDate(sourceCell) {
            const tdC = document.createElement('td');
            const tdD = document.createElement('td');
            if (sourceCell) {
                const events = Array.from(sourceCell.querySelectorAll('.release-event'));
                events.forEach((ev, i) => {
                    const countrySpan = ev.querySelector('.release-country');
                    const dateSpan    = ev.querySelector('.release-date');
                    if (countrySpan) {
                        if (i > 0) tdC.appendChild(document.createTextNode(', '));
                        const flagImg       = countrySpan.querySelector('img')?.outerHTML || '';
                        const abbr          = countrySpan.querySelector('abbr');
                        const countryCode   = abbr ? abbr.textContent.trim() : '';
                        const countryFull   = abbr?.getAttribute('title') || '';
                        const countryHref   = countrySpan.querySelector('a')?.getAttribute('href') || '#';
                        const spanContainer = document.createElement('span');
                        spanContainer.className = countrySpan.className;
                        if (countryFull && countryCode) {
                            spanContainer.innerHTML = `${flagImg} <a href="${countryHref}">${countryFull} (${countryCode})</a>`;
                        } else {
                            spanContainer.innerHTML = countrySpan.innerHTML;
                        }
                        tdC.appendChild(spanContainer);
                    }
                    if (dateSpan) {
                        if (i > 0) tdD.appendChild(document.createTextNode(', '));
                        tdD.appendChild(document.createTextNode(dateSpan.textContent.trim()));
                    }
                });
            }
            return [tdC, tdD];
        },

        /**
         * splitLocation — splits a "Location" cell (venue / city / country) into
         * three separate cells: Place, Area, and Country.
         * Place  ← links whose href contains '/place/'
         * Area   ← links whose href contains '/area/' but without a flag wrapper
         * Country← links whose href contains '/area/' wrapped in a .flag span
         * Synthetic columns: ['Place', 'Area', 'Country']
         */
        splitLocation(sourceCell) {
            const tdP = document.createElement('td');
            const tdA = document.createElement('td');
            const tdC = document.createElement('td');
            if (sourceCell) {
                sourceCell.querySelectorAll('a').forEach(a => {
                    const href     = a.getAttribute('href');
                    const clonedA  = a.cloneNode(true);
                    if (href && href.includes('/place/')) {
                        tdP.appendChild(clonedA);
                    } else if (href && href.includes('/area/')) {
                        const flagSpan = a.closest('.flag');
                        if (flagSpan) {
                            const flagImg     = flagSpan.querySelector('img')?.outerHTML || '';
                            const abbr        = flagSpan.querySelector('abbr');
                            const countryCode = abbr ? abbr.textContent.trim() : '';
                            const countryFull = abbr?.getAttribute('title') || '';
                            const countryHref = a.getAttribute('href') || '#';
                            const span        = document.createElement('span');
                            span.className    = flagSpan.className;
                            if (countryFull && countryCode) {
                                span.innerHTML = `${flagImg} <a href="${countryHref}">${countryFull} (${countryCode})</a>`;
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
            return [tdP, tdA, tdC];
        },

        /**
         * splitArea — splits an "Area" cell into MB-Area and Country cells.
         * The country is identified by a .flag span; all remaining sibling nodes go
         * to MB-Area.  Leading/trailing comma separators adjacent to the country node
         * are stripped from both output cells.
         * Synthetic columns: ['MB-Area', 'Country']
         */
        splitArea(sourceCell) {
            const tdArea    = document.createElement('td');
            const tdCountry = document.createElement('td');

            /** Remove leading/trailing comma-or-whitespace text nodes from a cell. */
            const trimCell = (cell) => {
                const isTrimTarget = (n) =>
                    n.nodeType === Node.TEXT_NODE &&
                    (n.textContent.trim() === ',' || !n.textContent.trim());
                while (cell.firstChild && isTrimTarget(cell.firstChild)) cell.removeChild(cell.firstChild);
                while (cell.lastChild  && isTrimTarget(cell.lastChild))  cell.removeChild(cell.lastChild);
            };

            if (sourceCell) {
                const nodes            = Array.from(sourceCell.childNodes);
                const countryNodeIndex = nodes.findIndex(n =>
                    n.nodeType === Node.ELEMENT_NODE &&
                    (n.classList.contains('flag') || n.querySelector('.flag'))
                );
                nodes.forEach((n, idx) => {
                    if (idx === countryNodeIndex) {
                        tdCountry.appendChild(n.cloneNode(true));
                    } else {
                        const isCommaSep = n.nodeType === Node.TEXT_NODE && n.textContent.trim() === ',';
                        const isAdjacent = (idx === countryNodeIndex - 1 || idx === countryNodeIndex + 1);
                        if (isCommaSep && isAdjacent) return; // skip dangling comma
                        tdArea.appendChild(n.cloneNode(true));
                    }
                });
                trimCell(tdArea);
                trimCell(tdCountry);
            }
            return [tdArea, tdCountry];
        },

        /**
         * sumTracks — sums the numeric parts of a "Tracks" cell whose content is a
         * '+'-separated list such as "9 + 7 + 8 + 10 + 11 + 9 + 10 + 12".
         * Returns a single right-aligned cell containing the integer total.
         * Synthetic columns: ['Total Tracks']
         */
        sumTracks(sourceCell) {
            const tdTotal = document.createElement('td');
            if (sourceCell) {
                const text  = sourceCell.textContent || '';
                const nums  = text.split('+').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                const total = nums.reduce((acc, n) => acc + n, 0);
                if (nums.length > 0) {
                    tdTotal.textContent    = String(total);
                    tdTotal.style.cssText  = 'text-align:right; font-variant-numeric:tabular-nums;';
                }
            }
            return [tdTotal];
        },

        /**
         * extractFormatTypes — strips the leading numeric quantity factor (e.g. "8×",
         * "2x") from each media-type token in a "Format" cell and converts the
         * " + " separator between distinct types to ", ".
         *
         * Input examples  →  Output examples
         *   "8×12\" Vinyl"  →  "12\" Vinyl"
         *   "2xCD-R"        →  "CD-R"
         *   "2xCD-R + DVD"  →  "CD-R, DVD"
         *
         * The quantity prefix pattern is: one-or-more digits followed by a lowercase
         * ASCII 'x' or the Unicode multiplication sign '×' (U+00D7).  Tokens with no
         * prefix are kept verbatim (e.g. a bare "DVD" remains "DVD").
         *
         * Synthetic columns: ['Format Types']
         */
        extractFormatTypes(sourceCell) {
            const tdTypes = document.createElement('td');
            if (sourceCell) {
                const text  = sourceCell.textContent || '';
                const types = text
                    .split(' + ')
                    .map(part => part.trim().replace(/^\d+[x\u00D7]/, '').trim())
                    .filter(t => t.length > 0);
                tdTypes.textContent = types.join(', ');
            }
            return [tdTypes];
        }
    };

    /**
     * Derives the runtime extractor descriptor list from a merged activeDefinition object.
     *
     * Canonical form: features.columnExtractors is an array of descriptor objects:
     *   { sourceColumn: string, extractor: string, syntheticColumns: string[] }
     *
     * Legacy form: features.splitCD / splitLocation / splitArea boolean flags are
     * automatically translated so any page definitions not yet migrated keep working.
     *
     * Each returned descriptor gains a `colIdx` property initialised to -1; the actual
     * column index is filled in per-page during the header-scanning pass inside the fetch loop.
     *
     * @param {object} def - Merged activeDefinition (the resolved page definition object)
     * @returns {Array<{sourceColumn: string, extractor: string, syntheticColumns: string[], colIdx: number}>}
     */
    function buildActiveColumnExtractors(def) {
        const features = def?.features || {};
        const result   = [];

        // ── Canonical columnExtractors declarations (preferred form) ──
        if (Array.isArray(features.columnExtractors)) {
            features.columnExtractors.forEach(entry => result.push({ ...entry, colIdx: -1 }));
        }

        // ── Legacy boolean-flag translations ─────────────────────────
        // Only add the translated entry when not already covered by an explicit
        // columnExtractors entry targeting the same source column.
        if (features.splitCD && !result.some(e => e.sourceColumn === 'Country/Date')) {
            result.push({ sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'],    colIdx: -1 });
        }
        if (features.splitLocation && !result.some(e => e.sourceColumn === 'Location')) {
            result.push({ sourceColumn: 'Location',     extractor: 'splitLocation',    syntheticColumns: ['Place', 'Area', 'Country'], colIdx: -1 });
        }
        if (features.splitArea && !result.some(e => e.sourceColumn === 'Area')) {
            result.push({ sourceColumn: 'Area',         extractor: 'splitArea',        syntheticColumns: ['MB-Area', 'Country'], colIdx: -1 });
        }

        return result;
    }

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
                columnExtractors: [
                    { sourceColumn: 'Area', extractor: 'splitArea', syntheticColumns: ['MB-Area', 'Country'] }
                ],
                extractMainColumn: 'Artist' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'instrument-releases',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/releases/),
            buttons: [ { label: 'Show all Releases for Instrument' } ],
            features: {
                columnExtractors: [
                    { sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'] }
                ],
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
                columnExtractors: [
                    { sourceColumn: 'Area', extractor: 'splitArea', syntheticColumns: ['MB-Area', 'Country'] }
                ],
                extractMainColumn: 'Artist' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-events',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Area' } ],
            features: {
                columnExtractors: [
                    { sourceColumn: 'Location', extractor: 'splitLocation', syntheticColumns: ['Place', 'Area', 'Country'] }
                ],
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        },
        {
            type: 'area-labels',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/labels/),
            buttons: [ { label: 'Show all Labels for Area' } ],
            features: {
                columnExtractors: [
                    { sourceColumn: 'Area', extractor: 'splitArea', syntheticColumns: ['MB-Area', 'Country'] }
                ],
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
                        columnExtractors: [
                            { sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'] }
                        ]
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
                columnExtractors: [
                    { sourceColumn: 'Area', extractor: 'splitArea', syntheticColumns: ['MB-Area', 'Country'] }
                ],
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
                columnExtractors: [
                    { sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'] },
                    {
                        sourceColumn:    'Tracks',
                        extractor:       'sumTracks',
                        syntheticColumns: ['Total Tracks']
                    },
                    { sourceColumn: 'Format', extractor: 'extractFormatTypes', syntheticColumns: ['Format Types'] }
                ],
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
                columnExtractors: [
                    { sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'] },
                    {
                        sourceColumn:    'Tracks',
                        extractor:       'sumTracks',
                        syntheticColumns: ['Total Tracks']
                    },
                    { sourceColumn: 'Format', extractor: 'extractFormatTypes', syntheticColumns: ['Format Types'] }
                ],
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
                { label: '🧮 Official RGs', params: { all: '0', va: '0' } },
                { label: '🧮 Non-official RGs', params: { all: '1', va: '0' } },
                { label: '🧮 Official VA RGs', params: { all: '0', va: '1' } },
                { label: '🧮 Non-official VA RGs', params: { all: '1', va: '1' } }
            ],
            tableMode: 'multi' // native tables, h3 headers
        },
        {
            type: 'artist-releases',
            // Artist Releases page (Official/VA views handled by specific buttons)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/releases$/),
            buttons: [
                { label: '🧮 Official releases', params: { va: '0' } },
                { label: '🧮 VA releases', params: { va: '1' } }
            ],
            features: {
                columnExtractors: [
                    { sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'] }
                ],
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        {
            type: 'artist-recordings',
            match: (path) => path.includes('/recordings'),
            buttons: [ { label: 'Show all Recordings for Artist' } ],
            features: {
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
                columnExtractors: [
                    { sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'] },
                    {
                        sourceColumn:    'Tracks',
                        extractor:       'sumTracks',
                        syntheticColumns: ['Total Tracks']
                    },
                    { sourceColumn: 'Format', extractor: 'extractFormatTypes', syntheticColumns: ['Format Types'] }
                ],
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
                columnExtractors: [
                    { sourceColumn: 'Country/Date', extractor: 'splitCountryDate', syntheticColumns: ['Country', 'Date'] }
                ],
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
                columnExtractors: [
                    { sourceColumn: 'Location', extractor: 'splitLocation', syntheticColumns: ['Place', 'Area', 'Country'] }
                ],
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

    /**
     * Returns true when a keyboard event matches a configured single-chord shortcut.
     * Mirrors isPrefixKeyEvent logic but reads an arbitrary setting key.
     * "Ctrl" in the stored value matches both Ctrl and Meta/Cmd for cross-platform compat.
     * @param {KeyboardEvent} e
     * @param {string} settingKey - The configSchema key to read (e.g. 'sa_shortcut_open_export')
     * @param {string} fallback   - Default shortcut string when the setting is absent
     * @returns {boolean}
     */
    function isShortcutEvent(e, settingKey, fallback) {
        const raw = (typeof Lib !== 'undefined' && Lib.settings && Lib.settings[settingKey])
            ? Lib.settings[settingKey]
            : fallback;
        const p = parsePrefixShortcut(raw);
        const ctrlMatch  = p.ctrl  ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
        const altMatch   = p.alt   ? e.altKey                 : !e.altKey;
        const shiftMatch = p.shift ? e.shiftKey               : !e.shiftKey;
        const keyMatch   = e.key.toLowerCase() === p.key.toLowerCase();
        return ctrlMatch && altMatch && shiftMatch && keyMatch;
    }

    /**
     * Returns the display string for a configured single-chord shortcut.
     * Falls back to the supplied default when the setting is not yet available.
     * @param {string} settingKey - The configSchema key to read
     * @param {string} fallback   - Value to return when setting is absent
     * @returns {string}
     */
    function getShortcutDisplay(settingKey, fallback) {
        if (typeof Lib !== 'undefined' && Lib.settings && Lib.settings[settingKey]) {
            return Lib.settings[settingKey];
        }
        return fallback;
    }

    /**
     * Displays a floating tooltip listing all Ctrl+M prefix-mode shortcuts.
     * Shows numbered button shortcuts (1–9 / a–z) and named function shortcuts
     * from ctrlMFunctionMap. Positions the tooltip in the upper-right corner of the
     * page content area, avoiding overlap with the sidebar.
     * No-ops when the tooltip is disabled in settings or when Lib is unavailable.
     * @param {HTMLButtonElement[]} actionButtons - The action buttons shown in the h1 bar
     * @param {string[]} buttonKeys - Parallel array of key labels ('1','2',…,'a','b',…) for each button
     */
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
        for (const [key, entry] of Object.entries(ctrlMFunctionMap)) {
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

    /**
     * Removes the Ctrl+M prefix-mode tooltip from the DOM if it is currently visible.
     * Safe to call even when no tooltip is present.
     */
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
                    console.log(`[VZ-${SCRIPT_BASE_NAME}] Exited ${getPrefixDisplay()} mode`);
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
                Lib.debug('shortcuts', 'Function shortcuts: r=Resize, i=Statistics, s=Save, d=Density, v=Visible, e=Export, l=Load, k=Shortcuts Help, h=App Help, ,=Settings' + (ctrlMFunctionMap['o'] ? ', o=Stop' : ''));
                Lib.debug('shortcuts', 'Press any key or Escape to cancel');
            } else {
                if (buttonKeys.length > 0) {
                    console.log(`[VZ-${SCRIPT_BASE_NAME}] Entered ${getPrefixDisplay()} mode. ${actionButtons.length} action button(s): ${buttonKeys.join(', ')}`);
                    actionButtons.forEach((btn, idx) => {
                        const key = buttonKeys[idx] || '?';
                        console.log(`[VZ-${SCRIPT_BASE_NAME}]   ${key}: ${btn.textContent.trim()}`);
                    });
                }
                console.log('[ShowAllEntityData] Function shortcuts: r=Resize, i=Statistics, s=Save, d=Density, v=Visible, e=Export, l=Load, k=Shortcuts Help, h=App Help, ,=Settings' + (ctrlMFunctionMap['o'] ? ', o=Stop' : ''));
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
                        console.log(`[VZ-${SCRIPT_BASE_NAME}] Function "${funcEntry.description}" triggered`);
                    }
                } else {
                    if (typeof Lib !== 'undefined' && Lib.warn) {
                        Lib.warn('shortcuts', `Function "${funcEntry.description}" not available`);
                    } else {
                        console.warn(`[VZ-${SCRIPT_BASE_NAME}] Function not available`);
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
                        console.log(`[VZ-${SCRIPT_BASE_NAME}] Action button ${buttonIndex + 1} clicked: "${selectedButton.textContent.trim()}"`);
                    }
                } else {
                    if (typeof Lib !== 'undefined' && Lib.warn) {
                        Lib.warn('shortcuts', `No action button at position ${buttonIndex + 1} (${actionButtons.length} available)`);
                    } else {
                        console.warn(`[VZ-${SCRIPT_BASE_NAME}] No action button at position ${buttonIndex + 1}`);
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
                console.log(`[VZ-${SCRIPT_BASE_NAME}] Exited ${getPrefixDisplay()} mode`);
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
                                  hdrName.includes('#');

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
        clearBtn.title = 'Clear all filters for this sub-table (column filters and sub-table filter)';
        clearBtn.style.display = 'none'; // Initially hidden

        // Create red ✗ symbol
        const xSymbol = document.createElement('span');
        xSymbol.textContent = '✗ ';
        xSymbol.style.color = 'red';
        xSymbol.style.fontSize = '1.0em';
        xSymbol.style.fontWeight = 'bold';

        const clearBtnLabel = document.createElement('span');
        clearBtnLabel.className = 'mb-subtable-clear-btn-label';
        clearBtnLabel.textContent = 'Clear all filters'; // updated dynamically by updateFilterButtonsVisibility()

        clearBtn.appendChild(xSymbol);
        clearBtn.appendChild(clearBtnLabel);

        clearBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearSubTableColumnFilters(table, categoryName);
        };

        return clearBtn;
    }

    /**
     * Create a standalone "Toggle highlighting" button for a sub-table.
     * Used in defensive code-paths where the full createSubTableFilterContainer()
     * closure is not available (e.g. when .mb-subtable-controls was missing and
     * must be rebuilt).  The button derives its id from the sanitised category
     * name so updateFilterButtonsVisibility() can locate it via
     * [id$="-toggle-filter-highlight-btn"].
     *
     * Toggle behaviour (stateful via the button's dataset):
     *   ON  → call runFilter() to re-apply all column-filter highlights.
     *   OFF → strip .mb-subtable-filter-highlight + .mb-column-filter-highlight
     *         from the associated table rows.
     *
     * @param {HTMLTableElement} table
     * @param {string}           categoryName
     * @returns {HTMLButtonElement}
     */
    function createSubTableHighlightButton(table, categoryName) {
        const safeId = categoryName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const btn = document.createElement('button');
        btn.id = `mb-stf-${safeId}-toggle-filter-highlight-btn`;
        btn.type = 'button';
        btn.title = 'Toggle filter highlighting on/off (sub-table filter and column filters)';
        btn.textContent = '🎨 Toggle highlighting';
        // Initially hidden — shown by updateFilterButtonsVisibility() when active.
        btn.style.cssText = 'font-size:0.8em; padding:2px 6px; border-radius:4px; background:rgb(240,240,240); border:1px solid rgb(204,204,204); cursor:pointer; vertical-align:middle; transition:background-color 0.3s; display:none;';
        btn.dataset.highlightEnabled = 'true';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const enabled = btn.dataset.highlightEnabled !== 'false';
            if (enabled) {
                // Currently ON → switch OFF
                btn.dataset.highlightEnabled = 'false';
                btn.style.backgroundColor = '#90ee90';
                btn.style.color = '#000';
                if (table) {
                    table.querySelectorAll(
                        '.mb-subtable-filter-highlight, .mb-column-filter-highlight'
                    ).forEach(n => n.replaceWith(document.createTextNode(n.textContent)));
                }
            } else {
                // Currently OFF → switch ON
                btn.dataset.highlightEnabled = 'true';
                btn.style.backgroundColor = '';
                btn.style.color = '';
                if (typeof runFilter === 'function') runFilter();
            }
        });

        return btn;
    }

    /**
     * Ensure settings button is always the last button in controls container
     * Also adds a divider before the Auto-Resize button after data is loaded
     */
    function ensureSettingsButtonIsLast() {
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (!controlsContainer) return;

        const settingsBtn = document.getElementById('mb-settings-btn');
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
                beforeShortcutsDivider.style.cssText = uiButtonDividerCSS();
            }
            // Re-insert (or insert for the first time) immediately before shortcutsBtn
            if (shortcutsBtn.previousSibling !== beforeShortcutsDivider) {
                controlsContainer.insertBefore(beforeShortcutsDivider, shortcutsBtn);
            }
        }

        // Add divider between Load from Disk and Auto-Resize if not already present.
        // Note: the initialDivider (between action buttons and Save/Load) is intentionally
        // kept — it remains relevant both on the initial page and after load.
        const loadBtn = document.getElementById('mb-load-from-disk-btn');
        const resizeBtn = document.getElementById('mb-resize-btn');

        if (loadBtn && resizeBtn && !controlsContainer.querySelector('.mb-button-divider-after-load')) {
            // Add divider after Load from Disk button
            const divider = document.createElement('span');
            divider.textContent = ' | ';
            divider.className = 'mb-button-divider-after-load';
            divider.style.cssText = uiButtonDividerCSS();
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
        const existingBtn = document.getElementById('mb-visible-btn');
        if (existingBtn) {
            Lib.debug('ui', 'Column visibility toggle already exists, skipping');
            return;
        }

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'mb-visible-btn';
        toggleBtn.innerHTML = makeButtonHTML('Visible', 'V', '👁️');
        toggleBtn.title = `Show/hide table columns (${getPrefixDisplay()}, then V)`;
        toggleBtn.style.cssText = uiActionBtnBaseCSS();
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

        // Base style shared by all three action buttons in the menu.
        // We use explicit border/background so that browser-default :focus outline
        // and our manual focus highlight are both clearly visible.
        const menuBtnBase = 'font-size:0.8em; padding:4px 8px; cursor:pointer; border-radius:3px; border:1px solid #bbb; background:#f5f5f5; transition:background 0.15s, border-color 0.15s;';
        const menuBtnFocused  = 'background:#d0e8ff; border-color:#5b9bd5;';   // blue tint when focused
        const menuBtnActive   = 'background:#a8c8f0; border-color:#3a7abf;';   // darker on press

        /**
         * Applies or removes the keyboard-focus highlight on an action button.
         * @param {HTMLButtonElement} btn - The button to style
         * @param {boolean} focused - true = highlight on, false = restore default
         */
        const setMenuBtnFocus = (btn, focused) => {
            btn.style.cssText = menuBtnBase + (focused ? menuBtnFocused : '') + (btn === chooseConfigBtnRef ? 'width:100%; margin-top:5px;' : 'flex:1;');
        };

        // Forward reference so setMenuBtnFocus can distinguish chooseConfigBtn
        let chooseConfigBtnRef = null;

        const selectAllBtn = document.createElement('button');
        selectAllBtn.innerHTML = makeButtonHTML('Select All', 'S');
        selectAllBtn.style.cssText = menuBtnBase + 'flex:1;';
        selectAllBtn.type = 'button';
        selectAllBtn.tabIndex = 0;
        // Visual feedback on mouse press/release
        selectAllBtn.addEventListener('mousedown', () => { selectAllBtn.style.cssText = menuBtnBase + menuBtnActive + 'flex:1;'; });
        selectAllBtn.addEventListener('mouseup',   () => { selectAllBtn.style.cssText = menuBtnBase + 'flex:1;'; });
        selectAllBtn.addEventListener('mouseleave',() => { selectAllBtn.style.cssText = menuBtnBase + 'flex:1;'; });
        selectAllBtn.onclick = (e) => {
            e.stopPropagation();
            checkboxes.forEach(cb => {
                if (!cb.checked) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change'));
                }
            });
            updateButtonColor();
        };

        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.innerHTML = makeButtonHTML('Deselect All', 'D');
        deselectAllBtn.style.cssText = menuBtnBase + 'flex:1;';
        deselectAllBtn.type = 'button';
        deselectAllBtn.tabIndex = 0;
        deselectAllBtn.addEventListener('mousedown', () => { deselectAllBtn.style.cssText = menuBtnBase + menuBtnActive + 'flex:1;'; });
        deselectAllBtn.addEventListener('mouseup',   () => { deselectAllBtn.style.cssText = menuBtnBase + 'flex:1;'; });
        deselectAllBtn.addEventListener('mouseleave',() => { deselectAllBtn.style.cssText = menuBtnBase + 'flex:1;'; });
        deselectAllBtn.onclick = (e) => {
            e.stopPropagation();
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    cb.checked = false;
                    cb.dispatchEvent(new Event('change'));
                }
            });
            updateButtonColor();
        };

        buttonRow.appendChild(selectAllBtn);
        buttonRow.appendChild(deselectAllBtn);
        contentWrapper.appendChild(buttonRow);

        // Add "Choose current configuration" button
        const chooseConfigBtn = document.createElement('button');
        chooseConfigBtnRef = chooseConfigBtn;   // resolve forward reference
        chooseConfigBtn.innerHTML = makeButtonHTML('Choose current configuration', 'c');
        chooseConfigBtn.style.cssText = menuBtnBase + 'width:100%; margin-top:5px;';
        chooseConfigBtn.type = 'button';
        chooseConfigBtn.tabIndex = 0;
        chooseConfigBtn.addEventListener('mousedown', () => { chooseConfigBtn.style.cssText = menuBtnBase + menuBtnActive + 'width:100%; margin-top:5px;'; });
        chooseConfigBtn.addEventListener('mouseup',   () => { chooseConfigBtn.style.cssText = menuBtnBase + 'width:100%; margin-top:5px;'; });
        chooseConfigBtn.addEventListener('mouseleave',() => { chooseConfigBtn.style.cssText = menuBtnBase + 'width:100%; margin-top:5px;'; });
        chooseConfigBtn.onclick = (e) => {
            e.stopPropagation();
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

        // Keyboard navigation state — tracks the currently-highlighted checkbox index
        let selectedCheckboxIndex = 0;

        /**
         * Highlights the checkbox row at `index` with a blue tint and moves browser
         * focus to that checkbox input.  All other rows are reset to no highlight.
         * @param {number} index - Index into the checkboxes array
         */
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

        // All focusable items: checkboxes first, then the three action buttons.
        // Used by both Tab/Shift-Tab and ArrowDown/ArrowUp for full-cycle navigation.
        const menuFocusables = [...checkboxes, selectAllBtn, deselectAllBtn, chooseConfigBtn];

        /**
         * Moves keyboard focus to the item at `idx` in menuFocusables and applies
         * the appropriate visual highlight.
         * - For checkboxes: blue row background via updateCheckboxFocus().
         * - For action buttons: darker-gray background + border via setMenuBtnFocus();
         *   all other buttons are reset to their default style.
         * @param {number} idx - Index into menuFocusables
         */
        const moveFocusTo = (idx) => {
            // Clear button highlights first
            [selectAllBtn, deselectAllBtn].forEach(b => { b.style.cssText = menuBtnBase + 'flex:1;'; });
            chooseConfigBtn.style.cssText = menuBtnBase + 'width:100%; margin-top:5px;';

            if (idx < checkboxes.length) {
                // Moving onto a checkbox — clear checkbox highlight for buttons, use row helper
                selectedCheckboxIndex = idx;
                updateCheckboxFocus(idx);
            } else {
                // Moving onto an action button — clear checkbox row highlights
                checkboxes.forEach(cb => { cb.parentElement.style.background = ''; });
                const btn = menuFocusables[idx];
                const isChoose = btn === chooseConfigBtn;
                btn.style.cssText = menuBtnBase + menuBtnFocused + (isChoose ? 'width:100%; margin-top:5px;' : 'flex:1;');
                btn.focus();
            }
        };

        // Keyboard handler for menu
        const menuKeyHandler = (e) => {
            if (menu.style.display !== 'block') return;

            switch (e.key) {
                case 'ArrowDown': {
                    // Arrow keys cycle through ALL focusables (checkboxes + buttons).
                    e.preventDefault();
                    const cur = menuFocusables.indexOf(document.activeElement);
                    moveFocusTo(cur === -1 ? 0 : (cur + 1) % menuFocusables.length);
                    break;
                }

                case 'ArrowUp': {
                    e.preventDefault();
                    const cur = menuFocusables.indexOf(document.activeElement);
                    moveFocusTo(cur === -1 ? menuFocusables.length - 1 : (cur - 1 + menuFocusables.length) % menuFocusables.length);
                    break;
                }

                case ' ': {
                    // Space toggles the focused checkbox; ignored when a button has focus
                    // (buttons already handle Space natively via their click handler).
                    const focused = document.activeElement;
                    if (focused && focused.type === 'checkbox') {
                        e.preventDefault();
                        focused.checked = !focused.checked;
                        focused.dispatchEvent(new Event('change'));
                    }
                    break;
                }

                case 'Tab': {
                    // Trap focus inside the menu: cycle through all focusables.
                    // Shift+Tab reverses.
                    e.preventDefault();
                    let focusedIdx = menuFocusables.indexOf(document.activeElement);
                    if (focusedIdx === -1) focusedIdx = 0;
                    const nextIdx = e.shiftKey
                        ? (focusedIdx - 1 + menuFocusables.length) % menuFocusables.length
                        : (focusedIdx + 1) % menuFocusables.length;
                    moveFocusTo(nextIdx);
                    break;
                }

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

                case 'Enter': {
                    e.preventDefault();
                    const focused = document.activeElement;
                    // If a menu action button (Select All / Deselect All / Choose current) has
                    // focus, fire its click handler; then close the menu.
                    if (focused === selectAllBtn || focused === deselectAllBtn || focused === chooseConfigBtn) {
                        focused.click();
                    } else {
                        // Enter on a checkbox row closes the menu (existing behaviour).
                        menu.style.display = 'none';
                    }
                    break;
                }
            }
        };
        // Use capture phase (true) so our Tab preventDefault fires BEFORE the
        // browser processes the native focus-traversal that happens at target
        // phase — a bubble-phase listener is too late to block it.
        document.addEventListener('keydown', menuKeyHandler, true);

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

                // Reset selection and move focus to first checkbox
                selectedCheckboxIndex = 0;
                setTimeout(() => moveFocusTo(0), 10);
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

        // Update status bar
        const infoDisplay = document.getElementById('mb-info-display');
        if (infoDisplay) {
            infoDisplay.textContent = `✓ Exported ${rowsExported} rows to ${filename}`;
            infoDisplay.style.color = 'green';
        }

        Lib.debug('export', `CSV export complete: ${filename} (${rowsExported} rows exported, ${rowsSkipped} skipped, ${totalCells} cells)`);

        // Shared notification popup (focus + Escape handled inside)
        const csvTotalRows = rowsExported + rowsSkipped;
        showExportNotification('CSV', filename, rowsExported, csvTotalRows);
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
        let rowsSkipped = 0;

        dataRows.forEach(row => {
            if (row.style.display === 'none') { rowsSkipped++; return; }

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

        Lib.debug('export', `JSON export complete: ${filename} (${rowsExported} rows exported, ${rowsSkipped} skipped)`);
        const jsonTotalRows = rowsExported + rowsSkipped;
        showExportNotification('JSON', filename, rowsExported, jsonTotalRows);
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
        let rowsSkipped = 0;

        dataRows.forEach(row => {
            if (row.style.display === 'none') { rowsSkipped++; return; }

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

        Lib.debug('export', `Org-Mode export complete: ${filename} (${rowsExported} rows exported, ${rowsSkipped} skipped)`);
        const orgTotalRows = rowsExported + rowsSkipped;
        showExportNotification('Org-Mode', filename, rowsExported, orgTotalRows);
    }

    /**
     * Show a transient centered popup with a message and a Close button.
     * The popup fades out on close (Escape key or button click).
     * An optional status bar element is updated at the same time.
     *
     * @param {string}      message        - Text to display inside the popup body.
     * @param {string|null} statusText     - When non-null, written to the #mb-info-display bar.
     */
    function showDownloadNotification(message, statusText = null) {
        if (statusText !== null) {
            const infoDisplay = document.getElementById('mb-info-display');
            if (infoDisplay) {
                infoDisplay.textContent = statusText;
                infoDisplay.style.color = 'green';
            }
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
        msg.textContent = message;
        msg.style.marginBottom = '15px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.type = 'button';
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

        const onEscape = (e) => { if (e.key === 'Escape') closePopup(); };

        closeBtn.addEventListener('click', closePopup);
        document.addEventListener('keydown', onEscape);

        infoPopup.appendChild(msg);
        infoPopup.appendChild(closeBtn);
        document.body.appendChild(infoPopup);

        // Focus the Close button so keyboard users can dismiss immediately with Enter/Space
        setTimeout(() => closeBtn.focus(), 50);
    }

    /**
     * Show export-complete notification popup and update the status bar.
     *
     * @param {string} format    - Export format label, e.g. 'CSV', 'JSON', 'Org-Mode'.
     * @param {string} filename  - The filename that was written.
     * @param {number} rowCount  - Number of rows exported.
     * @param {number} totalRows - Total rows before filtering (0 = same as rowCount).
     */
    function showExportNotification(format, filename, rowCount, totalRows = 0) {
        const isFiltered = totalRows > rowCount;
        const rowSummary = isFiltered
            ? `${rowCount.toLocaleString()} of ${totalRows.toLocaleString()} rows (${totalRows - rowCount} filtered out)`
            : `${rowCount.toLocaleString()} rows`;

        showDownloadNotification(
            `${format} export complete: ${rowSummary}. Please monitor your browser for the file download.`,
            `✓ Exported ${rowSummary} to ${filename}`
        );
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
        const existingBtn = document.getElementById('mb-export-btn');
        if (existingBtn) {
            Lib.debug('ui', 'Export button already exists, skipping');
            return;
        }

        const exportBtn = document.createElement('button');
        exportBtn.id = 'mb-export-btn';
        exportBtn.innerHTML = makeButtonHTML('Export', 'E', '💾');
        exportBtn.title = `Export visible rows and columns to various formats (${getPrefixDisplay()}, then E)`;
        exportBtn.style.cssText = uiActionBtnBaseCSS();
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
        const filterInput = document.getElementById('mb-global-filter-input');
        if (filterInput) {
            filterInput.value = '';
        }

        // Clear all column filters
        document.querySelectorAll('.mb-col-filter-input').forEach(input => {
            input.value = '';
            input.style.backgroundColor = '';
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

    // ── UI Appearance CSS helpers ────────────────────────────────────────────────
    // Each helper reads from Lib.settings at call time so live setting changes
    // are reflected without a page reload.  The returned string is assigned to
    // element.style.cssText (or interpolated into an injected <style> block).

    /**
     * Base CSS shared by every button in the h1 action bar.
     * Config: sa_ui_action_btn_style — fontSize|padding|height|borderRadius
     */

    /**
     * Build the innerHTML for a button that has one underlined accelerator character.
     *
     * @param {string}      text          - Full visible button label, e.g. "Save to Disk".
     * @param {string}      underlineChar - Single character inside `text` to underline
     *                                     (first occurrence is used), e.g. "S".
     * @param {string|null} [icon]        - Optional leading emoji/icon, e.g. "💾".
     *                                     When supplied it is prepended with a space separator.
     * @returns {string} HTML string of the form
     *   <span>[icon ]before<span style="text-decoration:underline">char</span>after</span>
     */
    function makeButtonHTML(text, underlineChar, icon) {
        const idx = text.indexOf(underlineChar);
        let label;
        if (idx === -1) {
            label = text;
        } else {
            label = text.slice(0, idx) +
                '<span style="text-decoration:underline">' + underlineChar + '</span>' +
                text.slice(idx + underlineChar.length);
        }
        const content = icon ? icon + ' ' + label : label;
        return '<span>' + content + '</span>';
    }

    function uiActionBtnBaseCSS() {
        const defaults = '0.8em|2px 8px|24px|6px';
        const [fontSize, padding, height, borderRadius] =
            parseCondensedStyle(Lib.settings.sa_ui_action_btn_style, defaults);
        return `font-size:${fontSize}; padding:${padding}; height:${height}; border-radius:${borderRadius}; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center;`;
    }

    /**
     * Full CSS for the Save-to-Disk button (base + color overrides).
     * Config: sa_ui_save_btn_style — bg|color|border|bgHover
     * Returns { css, normalBg, hoverBg }
     */
    function uiSaveBtnCSS() {
        const defaults = '#4CAF50|white|1px solid #45a049|#45a049';
        const [bg, color, border, bgHover] =
            parseCondensedStyle(Lib.settings.sa_ui_save_btn_style, defaults);
        return {
            css: `${uiActionBtnBaseCSS()} background-color:${bg}; color:${color}; border:${border};`,
            normalBg: bg,
            hoverBg: bgHover
        };
    }

    /**
     * Full CSS for the Load-from-Disk button (base + color overrides).
     * Config: sa_ui_load_btn_style — bg|color|border|bgHover
     * Returns { css, normalBg, hoverBg }
     */
    function uiLoadBtnCSS() {
        const defaults = '#2196F3|white|1px solid #0b7dda|#0b7dda';
        const [bg, color, border, bgHover] =
            parseCondensedStyle(Lib.settings.sa_ui_load_btn_style, defaults);
        return {
            css: `${uiActionBtnBaseCSS()} background-color:${bg}; color:${color}; border:${border};`,
            normalBg: bg,
            hoverBg: bgHover
        };
    }

    /**
     * Full CSS for the Stop button.
     * Config: sa_ui_stop_btn_style — bg|color|border
     * Note: display is kept at 'none' by the caller and toggled dynamically.
     */
    function uiStopBtnCSS() {
        const defaults = '#f44336|white|1px solid #d32f2f';
        const [bg, color, border] =
            parseCondensedStyle(Lib.settings.sa_ui_stop_btn_style, defaults);
        return `${uiActionBtnBaseCSS()} background-color:${bg}; color:${color}; border:${border}; display:none;`;
    }

    /**
     * Full CSS for the Settings ⚙️ button.
     * Config: sa_ui_settings_btn_style — bg|color|border
     */
    function uiSettingsBtnCSS() {
        const defaults = '#607D8B|white|1px solid #546E7A';
        const [bg, color, border] =
            parseCondensedStyle(Lib.settings.sa_ui_settings_btn_style, defaults);
        return `${uiActionBtnBaseCSS()} background-color:${bg}; color:${color}; border:${border};`;
    }

    /**
     * Full CSS for the Help ❓ button.
     * Config: sa_ui_help_btn_style — bg|color|border
     */
    function uiHelpBtnCSS() {
        const defaults = '#78909C|white|1px solid #607D8B';
        const [bg, color, border] =
            parseCondensedStyle(Lib.settings.sa_ui_help_btn_style, defaults);
        // user-select:none prevents some browsers from rendering a text-insertion
        // caret inside the button when the ❓ emoji is treated as a selectable glyph.
        return `${uiActionBtnBaseCSS()} background-color:${bg}; color:${color}; border:${border}; user-select:none; -webkit-user-select:none;`;
    }

    /**
     * CSS for button-group separator spans (" | ").
     * Config: sa_ui_button_divider_style — color|margin
     */
    function uiButtonDividerCSS() {
        const defaults = '#999|0 4px';
        const [color, margin] =
            parseCondensedStyle(Lib.settings.sa_ui_button_divider_style, defaults);
        return `color:${color}; margin:${margin};`;
    }

    /**
     * CSS for the large global filter input in the H2 bar.
     * Config: sa_ui_global_filter_input_style — fontSize|padding|border|borderRadius|width|height
     * The three dedicated "Global filter border" color pickers and sa_global_filter_initial_width
     * take precedence over the border and width fields of the condensed style string.
     * The initial render always uses the *idle* border color (field starts empty).
     */
    function uiGlobalFilterInputCSS() {
        const defaults = '1em|2px 6px|2px solid #000|3px|500px|24px';
        const [fontSize, padding, _border, borderRadius, _width, height] =
            parseCondensedStyle(Lib.settings.sa_ui_global_filter_input_style, defaults);
        const borderColor = Lib.settings.sa_global_filter_border_idle || '#000';
        const width       = (Lib.settings.sa_global_filter_initial_width ?? 500) + 'px';
        return `font-size:${fontSize}; padding:${padding}; border:2px solid ${borderColor}; border-radius:${borderRadius}; width:${width}; height:${height}; box-sizing:border-box; transition:box-shadow 0.2s;`;
    }

    /** Border color when the global filter input is empty / idle. */
    function gfBorderIdle()      { return Lib.settings.sa_global_filter_border_idle   || '#000'; }
    /** Border color when the global filter input holds a valid filter string. */
    function gfBorderActive()    { return Lib.settings.sa_global_filter_border_active || 'orange'; }
    /** Border color when the sub-table filter input is empty / idle. */
    function stfBorderIdle()     { return Lib.settings.sa_subtable_filter_border_idle   || '#cccccc'; }
    /** Border color when the sub-table filter input holds a valid filter string. */
    function stfBorderActive()   { return Lib.settings.sa_subtable_filter_border_active || '#008000'; }
    /** Shared error border color for any filter input with an invalid regexp. */
    function filterBorderError() { return Lib.settings.sa_filter_border_error || '#cc0000'; }

    /**
     * Apply `color` (and optional border `width`) to the global filter input and its two
     * attached edge strips (✕ and ⋮).  Keeps the three sibling elements visually unified.
     * @param {string} color    - Any CSS colour value.
     * @param {string} [width]  - CSS border-width; defaults to '2px'; use '4px' for error state.
     */
    function setGlobalFilterBorder(color, width) {
        const w = width || '2px';
        filterInput.style.borderColor = color;
        filterInput.style.borderWidth = w;
        const clearEl = document.getElementById('mb-global-filter-clear');
        const dragEl  = document.getElementById('mb-global-filter-drag');
        if (clearEl) {
            clearEl.style.borderTopColor = color; clearEl.style.borderBottomColor = color;
            clearEl.style.borderTopWidth = w;     clearEl.style.borderBottomWidth = w;
        }
        if (dragEl) {
            dragEl.style.borderTopColor    = color; dragEl.style.borderBottomColor = color; dragEl.style.borderRightColor = color;
            dragEl.style.borderTopWidth    = w;     dragEl.style.borderBottomWidth = w;     dragEl.style.borderRightWidth = w;
        }
    }

    /**
     * Apply `color` (and optional border `width`) to a sub-table filter <input> and its two
     * edge strips (✕ and ⋮).  Keeps the three sibling elements visually unified.
     * @param {HTMLInputElement} input   - The sub-table filter input element.
     * @param {string}           color  - Any CSS colour value.
     * @param {string}          [width] - CSS border-width; defaults to '2px'; use '4px' for error state.
     */
    function setSubTableFilterBorder(input, color, width) {
        const w   = width || '2px';
        input.style.borderColor = color;
        input.style.borderWidth = w;
        const wrap = input.closest('.mb-subtable-filter-wrapper');
        if (wrap) {
            // The ✕ and ⋮ strips are the two siblings immediately after the <input>
            const strips = Array.from(wrap.children).slice(1);
            strips.forEach((s, i) => {
                s.style.borderTopColor    = color; s.style.borderBottomColor = color;
                s.style.borderTopWidth    = w;     s.style.borderBottomWidth = w;
                // The second strip (drag handle) also has a right border
                if (i === 1) { s.style.borderRightColor = color; s.style.borderRightWidth = w; }
            });
        }
    }

    /**
     * CSS for the small pre-load filter input in the H1 controls bar.
     * Config: sa_ui_prefilter_input_style — fontSize|padding|border|borderRadius|width|height
     */
    function uiPrefilterInputCSS() {
        const defaults = '1em|2px 4px|1px solid #ccc|3px|150px|24px';
        const [fontSize, padding, border, borderRadius, width, height] =
            parseCondensedStyle(Lib.settings.sa_ui_prefilter_input_style, defaults);
        return `font-size:${fontSize}; padding:${padding}; border:${border}; border-radius:${borderRadius}; width:${width}; height:${height}; box-sizing:border-box;`;
    }

    /**
     * CSS values for per-column filter inputs (used in the injected <style> block).
     * Config: sa_ui_column_filter_input_style — fontSize|padding
     * Returns { fontSize, padding }
     */
    function uiColumnFilterInputVals() {
        const defaults = '1em|1px 18px 1px 4px';
        const [fontSize, padding] =
            parseCondensedStyle(Lib.settings.sa_ui_column_filter_input_style, defaults);
        return { fontSize, padding };
    }

    /**
     * CSS values for sub-table clear / show-all buttons (used in the injected <style> block).
     * Config: sa_ui_subtable_btn_style — fontSize|padding|borderRadius|bg|border|bgHover
     * Returns { fontSize, padding, borderRadius, bg, border, bgHover }
     */
    function uiSubtableBtnVals() {
        const defaults = '0.8em|2px 6px|4px|#f0f0f0|1px solid #ccc|#e0e0e0';
        const [fontSize, padding, borderRadius, bg, border, bgHover] =
            parseCondensedStyle(Lib.settings.sa_ui_subtable_btn_style, defaults);
        return { fontSize, padding, borderRadius, bg, border, bgHover };
    }

    /**
     * CSS for the filter-bar utility buttons (prefilter toggle, highlight toggle, clear).
     * Config: sa_ui_filter_bar_btn_style — fontSize|padding|borderRadius|bg|border
     * Note: display is managed separately by updateFilterButtonsVisibility().
     */
    function uiFilterBarBtnCSS() {
        const defaults = '0.8em|2px 6px|4px|#f0f0f0|1px solid #ccc';
        const [fontSize, padding, borderRadius, bg, border] =
            parseCondensedStyle(Lib.settings.sa_ui_filter_bar_btn_style, defaults);
        return `font-size:${fontSize}; padding:${padding}; border-radius:${borderRadius}; background:${bg}; border:${border}; cursor:pointer; vertical-align:middle;`;
    }

    /**
     * CSS for checkbox inputs (Cc / Rx / Ex) in filter bars.
     * Config: sa_ui_checkbox_style — fontSize|marginRight
     * Returns { fontSize, marginRight }
     */
    function uiCheckboxVals() {
        const defaults = '0.8em|2px';
        const [fontSize, marginRight] =
            parseCondensedStyle(Lib.settings.sa_ui_checkbox_style, defaults);
        return { fontSize, marginRight };
    }

    /**
     * CSS for checkbox wrapper labels in filter bars.
     * Derived from sa_ui_checkbox_style fontSize field.
     */
    function uiCheckboxLabelCSS() {
        const { fontSize } = uiCheckboxVals();
        return `font-size:${fontSize}; cursor:pointer; display:flex; align-items:center; margin:0; user-select:none;`;
    }

    /**
     * CSS for filter-bar checkbox inputs (marginRight from settings).
     */
    function uiCheckboxInputCSS() {
        const { marginRight } = uiCheckboxVals();
        return `margin-right:${marginRight}; vertical-align:middle;`;
    }

    // ── NOTE: Custom popup dialogs are now provided by VZ_MBLibrary via
    // Lib.showCustomAlert() and Lib.showCustomConfirm(). The former local
    // implementations (showCustomDialog, showCustomAlert, showCustomConfirm) and
    // their associated CSS helpers (popupDialogCSS, popupHeaderCSS, …) have been
    // removed. The configSchema entries under "🪟 POPUP UI STYLES" have also been
    // removed as they are no longer needed.

    /**
     * Creates a reusable, draggable info-dialog shell shared by all lightweight popup
     * info dialogs (Keyboard Shortcuts, Application Help, …).
     *
     * Built-in features
     *  - Draggable title bar with title text, optional extra controls, and a ✕ close button
     *  - Focusable scrollable content area: ↑ ↓ PageUp PageDown Home End work natively
     *    while the mouse hovers over the area (mouseenter auto-focuses it)
     *  - Sticky close-hint footer ("Click outside or press Escape to close")
     *  - Escape-key and click-outside close handlers — all document listeners cleaned up
     *    on close so there are no lingering event handlers
     *  - Toggle behaviour: if a dialog with the same id already exists it is removed
     *    and null is returned — the caller should just return at that point
     *
     * @param {Object}          opts
     * @param {string}          opts.id               Unique element id for the dialog div
     * @param {string}          opts.title            Title text shown in the header bar
     * @param {string}         [opts.width]           Explicit CSS width (overrides min/max-width)
     * @param {string}         [opts.minWidth='450px'] CSS min-width
     * @param {string}         [opts.maxWidth='580px'] CSS max-width
     * @param {string}         [opts.maxHeight='82vh'] CSS max-height
     * @param {string}         [opts.borderRadius='8px'] CSS border-radius
     * @param {number}         [opts.zIndex=10000]    CSS z-index
     * @param {boolean}        [opts.centerV=true]    true → vertically centred (translate -50%,-50%);
     *                                                false → top:60px (below page header)
     * @param {HTMLElement[]}  [opts.titleBarExtras]  Elements inserted left of the ✕ button
     * @returns {{ dialog: HTMLElement, scrollArea: HTMLElement, close: Function,
     *             titleBarRight: HTMLElement } | null}
     *   Returns null when the dialog was toggled closed (existing instance removed).
     */
    function createInfoDialog(opts) {
        const existing = document.getElementById(opts.id);
        if (existing) { existing.remove(); return null; }

        const r  = opts.borderRadius || '8px';
        const cV = opts.centerV !== false;

        const dialog = document.createElement('div');
        dialog.id = opts.id;
        dialog.style.cssText = `
            position: fixed;
            top: ${cV ? '50%' : '60px'};
            left: 50%;
            transform: ${cV ? 'translate(-50%, -50%)' : 'translateX(-50%)'};
            background: white;
            border: 1px solid #ccc;
            border-radius: ${r};
            padding: 0;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: ${opts.zIndex || 10000};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            ${opts.width
                ? `width: ${opts.width};`
                : `min-width: ${opts.minWidth || '450px'}; max-width: ${opts.maxWidth || '580px'};`}
            max-height: ${opts.maxHeight || '82vh'};
            display: flex;
            flex-direction: column;
        `;

        // ── Title bar ──────────────────────────────────────────────────────────
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
            border-radius: ${r} ${r} 0 0;
            background: #f8f8f8;
        `;

        const titleEl = document.createElement('span');
        titleEl.textContent = opts.title;
        titleEl.style.cssText = 'font-weight: 700; font-size: 1.15em; color: #222;';
        titleBar.appendChild(titleEl);

        const titleBarRight = document.createElement('div');
        titleBarRight.style.cssText = 'display: flex; align-items: center; gap: 12px; flex-shrink: 0;';
        (opts.titleBarExtras || []).forEach(el => titleBarRight.appendChild(el));

        const closeX = document.createElement('button');
        closeX.textContent = '✕';
        closeX.title = 'Close (Escape)';
        closeX.style.cssText = `
            background: none; border: none; font-size: 1.2em; cursor: pointer;
            color: #666; padding: 0 4px; line-height: 1;
            user-select: none; -webkit-user-select: none;
        `;
        titleBarRight.appendChild(closeX);
        titleBar.appendChild(titleBarRight);
        dialog.appendChild(titleBar);

        // ── Scrollable content area ────────────────────────────────────────────
        // tabIndex=0 makes the div a focusable keyboard target so scroll keys
        // (↑ ↓ PageUp PageDown Home End) are delivered to it by the browser natively.
        // mouseenter auto-focuses it so hovering the mouse is enough to activate scrolling.
        const scrollArea = document.createElement('div');
        scrollArea.tabIndex = 0;
        scrollArea.style.cssText = 'overflow-y: auto; flex: 1; outline: none;';
        scrollArea.addEventListener('mouseenter', () => scrollArea.focus());
        dialog.appendChild(scrollArea);

        // ── Sticky close-hint footer ───────────────────────────────────────────
        const closeFooter = document.createElement('div');
        closeFooter.style.cssText = `
            flex-shrink: 0;
            border-top: 1px solid #eee;
            padding: 8px 20px 12px;
            border-radius: 0 0 ${r} ${r};
        `;
        const closeHint = document.createElement('div');
        closeHint.textContent = 'Click outside or press Escape to close';
        closeHint.style.cssText = 'font-size: 0.85em; color: #999; text-align: center; font-style: italic;';
        closeFooter.appendChild(closeHint);
        dialog.appendChild(closeFooter);

        document.body.appendChild(dialog);

        // ── Close / listener cleanup ───────────────────────────────────────────
        const closeDialog = () => {
            dialog.remove();
            document.removeEventListener('keydown',   onKeyDown);
            document.removeEventListener('click',     onClickOutside);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup',   onMouseUp);
        };

        closeX.onclick = closeDialog;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
        };
        document.addEventListener('keydown', onKeyDown);

        // Delay 100 ms so the click that opened the dialog doesn't immediately close it
        const onClickOutside = (e) => { if (!dialog.contains(e.target)) closeDialog(); };
        setTimeout(() => document.addEventListener('click', onClickOutside), 100);

        // ── Dragging ───────────────────────────────────────────────────────────
        let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;

        titleBar.addEventListener('mousedown', (e) => {
            // Do not start dragging when the click target is a button or link
            // (covers the ✕ close button and any extra controls like Force-refresh)
            if (e.target.closest('button, a')) return;
            isDragging = true;
            const rect = dialog.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            // Snap out of CSS-transform centred positioning to absolute pixel coordinates
            dialog.style.transform = 'none';
            dialog.style.left = rect.left + 'px';
            dialog.style.top  = rect.top  + 'px';
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            dialog.style.left = (e.clientX - dragOffsetX) + 'px';
            dialog.style.top  = (e.clientY - dragOffsetY) + 'px';
        };
        const onMouseUp = () => { isDragging = false; };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);

        return { dialog, scrollArea, close: closeDialog, titleBarRight };
    }

    /**
     * Show keyboard shortcuts help dialog
     */
    function showShortcutsHelp() {
        const result = createInfoDialog({
            id:           'mb-shortcuts-help',
            title:        '🎹 Keyboard Shortcuts',
            minWidth:     '450px',
            maxWidth:     '580px',
            maxHeight:    '82vh',
            borderRadius: '8px',
            zIndex:       10000,
        });
        if (!result) return; // toggled closed

        const { scrollArea } = result;
        scrollArea.style.padding = '16px 20px';

        // Create shortcuts sections.
        // Configurable entries read the live setting via getShortcutDisplay() so the
        // help dialog always reflects whatever the user has saved in Settings.
        const sections = [
            {
                title: 'Filter & Search',
                shortcuts: [
                    { keys: getShortcutDisplay('sa_shortcut_focus_global_filter', 'Ctrl+G'), desc: 'Focus global filter' },
                    { keys: getShortcutDisplay('sa_shortcut_focus_column_filter', 'Ctrl+C'), desc: 'Focus first column filter (cycle through tables)' },
                    { keys: getShortcutDisplay('sa_shortcut_clear_filters', 'Ctrl+Shift+G'), desc: 'Clear all filters' },
                    { keys: 'Shift+Esc', desc: 'Clear all COLUMN filters (global action)' },
                    { keys: 'Ctrl+Shift+Esc', desc: 'Clear ALL filters — global + column (global action)' },
                    { keys: 'Escape', desc: 'Clear focused filter (press twice to blur)' }
                ]
            },
            {
                title: 'View & Layout',
                shortcuts: [
                    { keys: getShortcutDisplay('sa_shortcut_auto_resize', 'Ctrl+R'), desc: 'Toggle resize columns (also: prefix mode then r)' },
                    { keys: getShortcutDisplay('sa_shortcut_open_visible_columns', 'Ctrl+V'), desc: 'Open "Visible" menu' },
                    { keys: getShortcutDisplay('sa_shortcut_open_density', 'Ctrl+D'), desc: 'Open "Density" menu' },
                    { keys: getShortcutDisplay('sa_shortcut_open_statistics', 'Ctrl+I'), desc: 'Open "Statistics" panel' },
                    { keys: getShortcutDisplay('sa_shortcut_toggle_h2', 'Ctrl+2'), desc: 'Toggle collapse all h2 headers' },
                    { keys: getShortcutDisplay('sa_shortcut_toggle_h3', 'Ctrl+3'), desc: 'Toggle collapse all h3 headers (types)' }
                ]
            },
            {
                title: 'Data Export & Management',
                shortcuts: [
                    { keys: getShortcutDisplay('sa_shortcut_save_to_disk', 'Ctrl+S'), desc: 'Save to disk (JSON)' },
                    { keys: getShortcutDisplay('sa_shortcut_load_from_disk', 'Ctrl+L'), desc: 'Load from disk' },
                    { keys: getShortcutDisplay('sa_shortcut_open_export', 'Ctrl+E'), desc: 'Open export menu (CSV, JSON, Org-Mode)' }
                ]
            },
            {
                title: 'Visible Menu (when open)',
                shortcuts: [
                    { keys: 'Up/Down or Tab/Shift-Tab', desc: 'Navigate items (checkboxes and buttons)' },
                    { keys: 'Space', desc: 'Toggle focused checkbox' },
                    { keys: 'Alt + S', desc: 'Select All' },
                    { keys: 'Alt + D', desc: 'Deselect All' },
                    { keys: 'Alt + C', desc: 'Choose current configuration' },
                    { keys: 'Enter', desc: 'Trigger focused button / close menu' },
                    { keys: 'Escape', desc: 'Close menu' }
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
                title: 'Keyboard Shortcuts',
                shortcuts: [
                    { keys: getPrefixDisplay(), desc: 'Enter prefix mode (then a second key selects action / function)' }
                ]
            },
            {
                title: 'Settings',
                shortcuts: [
                    { keys: getShortcutDisplay('sa_shortcut_open_settings', 'Ctrl+,'), desc: 'Open settings dialog' },
                    { keys: `${getPrefixDisplay()}, then ,`, desc: 'Open settings dialog (prefix mode)' }
                ]
            },
            {
                title: 'Help',
                shortcuts: [
                    { keys: '? or /', desc: 'Show this shortcuts help' },
                    { keys: 'Ctrl+K', desc: 'Show keyboard shortcuts help' },
                    { keys: `${getPrefixDisplay()}, then K`, desc: 'Show shortcuts help (prefix mode)' },
                    { keys: `${getPrefixDisplay()}, then H`, desc: 'Show app help (prefix mode)' }
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

            scrollArea.appendChild(sectionDiv);
        });

        // Note at the bottom of the scrollable area
        const note = document.createElement('div');
        note.style.cssText = 'margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.85em; color: #666; font-style: italic;';
        note.innerHTML = '<strong>Note:</strong> Ctrl shortcuts work everywhere, even in input fields.<br>? and / only work when not typing in input fields.';
        scrollArea.appendChild(note);

        Lib.debug('shortcuts', 'Keyboard shortcuts help displayed');
    }

    /**
     * Show application help dialog
     * Displays the full feature overview (fetched from GitHub) in a scrollable popup.
     * Shows a loading spinner while fetching; uses GM cache (TTL 1 h) to avoid redundant
     * network requests.  Falls back to a Retry button if both fetch and cache miss.
     */
    async function showAppHelp() {
        // Build the Force-refresh link first so it can be injected as a titleBarExtra
        const refreshLink = document.createElement('a');
        refreshLink.textContent = '🔄 Force refresh';
        refreshLink.title = 'Bypass cache and download the latest help text from GitHub';
        refreshLink.style.cssText = `
            font-size: 0.82em; font-weight: 600; color: #0066cc;
            cursor: pointer; text-decoration: none;
            user-select: none; white-space: nowrap;
        `;

        const result = createInfoDialog({
            id:             'mb-app-help-dialog',
            title:          '❓ Application Help & Feature Overview',
            width:          'min(720px, 94vw)',
            maxHeight:      '82vh',
            borderRadius:   '10px',
            zIndex:         10002,
            centerV:        false,        // position below page header at top:60px
            titleBarExtras: [refreshLink],
        });
        if (!result) return; // toggled closed

        const { dialog, scrollArea: contentArea, close: closeDialog } = result;
        Object.assign(contentArea.style, {
            padding:    '20px 24px',
            fontSize:   Lib.libPrefs.lib_content_font_size,
            fontFamily: Lib.libPrefs.lib_content_font_family,
            lineHeight: '1.65',
            color:      '#333',
        });

        const pre = document.createElement('pre');
        pre.style.cssText = `
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            font-size: 0.97em;
            line-height: 1.65;
        `;

        // Loading indicator shown while fetch is in progress
        const loadingEl = document.createElement('div');
        loadingEl.style.cssText = 'text-align:center; padding: 40px 0; color: #888; font-size: 1em;';
        loadingEl.textContent = '⏳ Loading help text…';
        contentArea.appendChild(loadingEl);

        // ── Fetch help text (with cache) and render ───────────────────────────
        /**
         * Render the fetched text or an error/retry UI inside contentArea.
         * @param {boolean} [forceRefresh=false] - When true, bypass cache and fetch fresh from GitHub.
         */
        async function loadAndRender(forceRefresh = false) {
            loadingEl.textContent = forceRefresh ? '⏳ Force-fetching latest help text…' : '⏳ Loading help text…';
            loadingEl.style.color = '#888';

            Lib.info('ui', `Application help: fetching from ${REMOTE_HELP_URL} (forceRefresh=${forceRefresh})`);

            const { data, fromCache, error } = await Lib.fetchCachedText(REMOTE_HELP_URL, CACHE_KEY_HELP, REMOTE_CACHE_TTL_MS, forceRefresh);

            // Remove loading indicator and any existing content
            if (contentArea.contains(loadingEl)) contentArea.removeChild(loadingEl);
            if (contentArea.contains(pre))       contentArea.removeChild(pre);

            if (data) {
                pre.textContent = data;
                if (fromCache && error) {
                    // Stale cache — add a subtle warning banner
                    const warn = document.createElement('div');
                    warn.style.cssText = 'background:#fff3cd; border:1px solid #ffc107; border-radius:4px; padding:6px 10px; margin-bottom:12px; font-size:0.88em; color:#856404;';
                    warn.textContent = `⚠️ ${error} — content may be outdated.`;
                    contentArea.appendChild(warn);
                }
                contentArea.appendChild(pre);
                const sourceLabel = fromCache ? '📦 cache' : '🌐 network (fresh)';
                Lib.info('ui', `Application help displayed: ${data.length} bytes, source=${sourceLabel}${error ? ' (stale, ' + error + ')' : ''}`);
            } else {
                // Both fetch and cache failed — show error with Retry button
                const errEl = document.createElement('div');
                errEl.style.cssText = 'text-align:center; padding:30px; color:#c62828;';
                errEl.innerHTML = `<div style="font-size:1.1em; margin-bottom:12px;">⚠️ Could not load help text</div>
<div style="color:#555; margin-bottom:18px; font-size:0.9em;">${error}</div>`;
                const retryBtn = document.createElement('button');
                retryBtn.textContent = '↺ Retry';
                retryBtn.style.cssText = 'padding:7px 20px; border-radius:6px; border:1px solid #888; cursor:pointer; background:#eee; font-size:0.95em;';
                retryBtn.onclick = () => {
                    contentArea.innerHTML = '';
                    contentArea.appendChild(loadingEl);
                    loadAndRender();
                };
                errEl.appendChild(retryBtn);
                contentArea.appendChild(errEl);
                Lib.warn('ui', `Application help unavailable: ${error}`);
            }
        }

        // Wire Force refresh link
        refreshLink.addEventListener('click', async () => {
            refreshLink.textContent = '⏳ Refreshing…';
            refreshLink.style.pointerEvents = 'none';
            refreshLink.style.color = '#888';
            contentArea.innerHTML = '';
            contentArea.appendChild(loadingEl);
            await loadAndRender(true);
            refreshLink.textContent = '✅ Refreshed';
            setTimeout(() => {
                refreshLink.textContent = '🔄 Force refresh';
                refreshLink.style.pointerEvents = '';
                refreshLink.style.color = '#0066cc';
            }, 2500);
        });

        Lib.info('ui', 'Application help dialog opened');
        loadAndRender();
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
            if (isShortcutEvent(e, 'sa_shortcut_open_settings', 'Ctrl+,')) {
                e.preventDefault();
                Lib.showSettings();
                Lib.debug('shortcuts', 'Settings dialog opened via ' + getShortcutDisplay('sa_shortcut_open_settings', 'Ctrl+,'));
            }

            // Focus global filter
            if (isShortcutEvent(e, 'sa_shortcut_focus_global_filter', 'Ctrl+G')) {
                e.preventDefault();
                const filterInput = document.getElementById('mb-global-filter-input');
                if (filterInput) {
                    filterInput.focus();
                    filterInput.select();
                    Lib.debug('shortcuts', 'Global filter focused via ' + getShortcutDisplay('sa_shortcut_focus_global_filter', 'Ctrl+G'));
                }
            }

            // Focus first column filter (cycle through tables, skip checkbox/number columns)
            if (isShortcutEvent(e, 'sa_shortcut_focus_column_filter', 'Ctrl+C')) {
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
                        // No .select() here: the focus handler (applyColFilterFocusStyle)
                        // prepends the search prefix and positions the cursor after it.
                        Lib.debug('shortcuts', `First column filter focused via ${getShortcutDisplay('sa_shortcut_focus_column_filter', 'Ctrl+C')} (table ${currentTableIndex + 1}/${tables.length})`);
                    } else {
                        Lib.warn('shortcuts', `No suitable column filter input found in table ${currentTableIndex + 1}`);
                    }
                } else {
                    Lib.warn('shortcuts', `No filter row found in table ${currentTableIndex + 1}`);
                }
            }

            // Clear all filters
            if (isShortcutEvent(e, 'sa_shortcut_clear_filters', 'Ctrl+Shift+G')) {
                e.preventDefault();
                clearAllFilters();
            }

            // Open export menu
            if (isShortcutEvent(e, 'sa_shortcut_open_export', 'Ctrl+E')) {
                e.preventDefault();
                const exportBtn = document.getElementById('mb-export-btn');
                if (exportBtn) {
                    exportBtn.click();
                    Lib.debug('shortcuts', 'Export menu triggered via ' + getShortcutDisplay('sa_shortcut_open_export', 'Ctrl+E'));
                } else {
                    Lib.warn('shortcuts', 'Export button not found');
                }
            }

            // Save to disk (JSON)
            if (isShortcutEvent(e, 'sa_shortcut_save_to_disk', 'Ctrl+S')) {
                e.preventDefault();
                const saveBtn = document.getElementById('mb-save-to-disk-btn');
                if (saveBtn) {
                    saveBtn.click();
                    Lib.debug('shortcuts', 'Save to disk triggered via ' + getShortcutDisplay('sa_shortcut_save_to_disk', 'Ctrl+S'));
                } else {
                    Lib.warn('shortcuts', 'Save button not found');
                }
            }

            // Load from disk
            if (isShortcutEvent(e, 'sa_shortcut_load_from_disk', 'Ctrl+L')) {
                e.preventDefault();
                const loadBtn = document.getElementById('mb-load-from-disk-btn');
                if (loadBtn) {
                    loadBtn.click();
                    Lib.debug('shortcuts', 'Load from disk triggered via ' + getShortcutDisplay('sa_shortcut_load_from_disk', 'Ctrl+L'));
                } else {
                    Lib.warn('shortcuts', 'Load button not found');
                }
            }

            // Open Visible Columns menu
            if (isShortcutEvent(e, 'sa_shortcut_open_visible_columns', 'Ctrl+V')) {
                e.preventDefault();
                const visibleColumnsBtn = document.getElementById('mb-visible-btn');
                if (visibleColumnsBtn) {
                    visibleColumnsBtn.click();
                    Lib.debug('shortcuts', 'Visible menu opened via ' + getShortcutDisplay('sa_shortcut_open_visible_columns', 'Ctrl+V'));
                } else {
                    Lib.warn('shortcuts', 'Visible button not found');
                }
            }

            // Open Density menu
            if (isShortcutEvent(e, 'sa_shortcut_open_density', 'Ctrl+D')) {
                e.preventDefault();
                const densityBtn = document.getElementById('mb-density-btn');
                if (densityBtn) {
                    densityBtn.click();
                    Lib.debug('shortcuts', 'Density menu opened via ' + getShortcutDisplay('sa_shortcut_open_density', 'Ctrl+D'));
                } else {
                    Lib.warn('shortcuts', 'Density button not found');
                }
            }

            // Toggle collapse all h2 headers
            if (isShortcutEvent(e, 'sa_shortcut_toggle_h2', 'Ctrl+2')) {
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
                    Lib.debug('shortcuts', `All h2 headers ${isExpanding ? 'expanded' : 'collapsed'} via ${getShortcutDisplay('sa_shortcut_toggle_h2', 'Ctrl+2')}`);
                } else {
                    Lib.warn('shortcuts', 'No collapsible h2 headers found');
                }
            }

            // Toggle collapse all h3 headers
            if (isShortcutEvent(e, 'sa_shortcut_toggle_h3', 'Ctrl+3')) {
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
                        Lib.debug('shortcuts', `All h3 headers (types) shown via ${getShortcutDisplay('sa_shortcut_toggle_h3', 'Ctrl+3')}`);
                    } else {
                        // Hide all
                        tables.forEach(t => t.style.display = 'none');
                        h3s.forEach(h => {
                            const icon = h.querySelector('.mb-toggle-icon');
                            if (icon) icon.textContent = '▲';
                        });
                        Lib.debug('shortcuts', `All h3 headers (types) hidden via ${getShortcutDisplay('sa_shortcut_toggle_h3', 'Ctrl+3')}`);
                    }
                } else {
                    Lib.warn('shortcuts', 'No collapsible h3 headers found');
                }
            }

            // Open Statistics panel (configurable, default Ctrl+I)
            if (isShortcutEvent(e, 'sa_shortcut_open_statistics', 'Ctrl+I')) {
                e.preventDefault();
                const statsBtnEl = document.getElementById('mb-stats-btn');
                if (statsBtnEl) {
                    statsBtnEl.click();
                    Lib.debug('shortcuts', 'Statistics panel opened via ' + getShortcutDisplay('sa_shortcut_open_statistics', 'Ctrl+I'));
                } else {
                    Lib.warn('shortcuts', 'Stats button not found');
                }
            }

            // Show keyboard shortcuts help (hard-wired Ctrl+K)
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toUpperCase() === 'K') {
                e.preventDefault();
                showShortcutsHelp();
                Lib.debug('shortcuts', 'Shortcuts help opened via Ctrl+K');
            }

            // Toggle auto-resize columns (direct shortcut; also available as prefix sub-key 'r')
            if (isShortcutEvent(e, 'sa_shortcut_auto_resize', 'Ctrl+R')) {
                e.preventDefault();
                if (typeof toggleAutoResizeColumns === 'function') {
                    toggleAutoResizeColumns();
                    Lib.debug('shortcuts', 'Auto-Resize Columns toggled via ' + getShortcutDisplay('sa_shortcut_auto_resize', 'Ctrl+R'));
                } else {
                    Lib.warn('shortcuts', 'toggleAutoResizeColumns not available');
                }
            }

            // Shift+Esc: clear all COLUMN filters (equivalent to clicking the
            // "Clear all COLUMN filters" button in the controls bar — global action)
            if (e.key === 'Escape' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                const clearColBtn = document.getElementById('mb-clear-column-filters-btn');
                if (clearColBtn) {
                    clearColBtn.click();
                    Lib.debug('shortcuts', 'All column filters cleared via Shift+Esc');
                } else {
                    // Fallback: clear directly (button may be hidden)
                    document.querySelectorAll('.mb-col-filter-input').forEach(inp => {
                        inp.value = '';
                        inp.style.backgroundColor = '';
                    });
                    if (typeof runFilter === 'function') runFilter();
                    Lib.debug('shortcuts', 'All column filters cleared via Shift+Esc (direct fallback)');
                }
            }

            // Ctrl+Shift+Esc: clear ALL filters — global filter + sub-table filters + all
            // column filters (equivalent to clicking "Clear ALL filters" button)
            if (e.key === 'Escape' && (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                const clearAllBtn = document.getElementById('mb-clear-all-filters-btn');
                if (clearAllBtn) {
                    clearAllBtn.click();
                    Lib.debug('shortcuts', 'All filters cleared via Ctrl+Shift+Esc');
                } else {
                    // Fallback: clear directly (button may be hidden)
                    clearAllFilters();
                    Lib.debug('shortcuts', 'All filters cleared via Ctrl+Shift+Esc (direct fallback)');
                }
            }

            // Plain Escape (no modifier except possibly handled above):
            // Clear focused filter (first press) or blur (second press).
            // The Shift+Esc and Ctrl+Shift+Esc cases above have already returned via
            // stopPropagation, so this block only fires for unmodified Escape.
            if (e.key === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey &&
                (e.target.matches('.mb-col-filter-input') ||
                 e.target.id === 'mb-global-filter-input')) {
                if (
                    e.target.classList.contains('mb-col-filter-input') ||
                    (e.target.placeholder && e.target.placeholder.includes('Global Filter'))
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();   // ← IMPORTANT

                    const isColumn = e.target.classList.contains('mb-col-filter-input');
                    const filterType = isColumn ? 'Column' : 'Global';

                    // For column filters, consider the field "empty" when only the
                    // focus prefix remains (no actual user-entered filter content).
                    const effectiveValue = isColumn
                        ? stripColFilterPrefix(e.target.value).trim()
                        : e.target.value.trim();

                    if (effectiveValue === '') {
                        // Second press → blur (blur handler strips prefix and clears bg)
                        e.target.blur();
                        Lib.debug('shortcuts', `${filterType} filter blurred via Escape (second press)`);
                    } else {
                        // First press → clear user content but keep focus
                        if (isColumn) {
                            // Retain the focus prefix; position cursor right after it
                            const _pfx = Lib.settings.sa_col_filter_focus_prefix ?? '🔍 ';
                            e.target.value = _pfx;
                            e.target.setSelectionRange(_pfx.length, _pfx.length);
                        } else {
                            e.target.value = '';
                            e.target.setSelectionRange(0, 0);
                        }
                        runFilter();
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
        helpBtn.title = `Show keyboard shortcuts (or press ? / ${getPrefixDisplay()}, then K)`;
        helpBtn.style.cssText = uiActionBtnBaseCSS();
        helpBtn.type = 'button';
        helpBtn.onclick = showShortcutsHelp;

        // Insert before the settings button so 🎹 stays to its left
        const settingsBtn = document.getElementById('mb-settings-btn');
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
        const subTableCount = tables.length;

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
        const globalFilterInput = document.getElementById('mb-global-filter-input');
        const globalFilter = globalFilterInput?.value || '';
        const columnFilters = Array.from(document.querySelectorAll('.mb-col-filter-input'))
            .filter(inp => stripColFilterPrefix(inp.value))
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
                <div style="font-weight: 600;">Sub-Tables:</div>
                <div>${subTableCount} ${subTableCount === 1 ? 'table' : 'tables'}</div>

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
        const existingBtn = document.getElementById('mb-stats-btn');
        if (existingBtn) {
            Lib.debug('ui', 'Statistics button already exists, skipping');
            return;
        }

        const statsBtn = document.createElement('button');
        statsBtn.id = 'mb-stats-btn';
        statsBtn.innerHTML = makeButtonHTML('Statistics', 'i', '📊');
        statsBtn.title = `Show table statistics (${getPrefixDisplay()}, then I)`;
        statsBtn.style.cssText = uiActionBtnBaseCSS();
        statsBtn.type = 'button';
        statsBtn.onclick = showStatsPanel;

        controlsContainer.appendChild(statsBtn);
        Lib.debug('ui', 'Statistics button added to controls');
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
        const existingBtn = document.getElementById('mb-density-btn');
        if (existingBtn) {
            Lib.debug('ui', 'Density control button already exists, skipping');
            return;
        }

        // Create button
        const densityBtn = document.createElement('button');
        densityBtn.id = 'mb-density-btn';
        densityBtn.innerHTML = makeButtonHTML('Density', 'D', '📏');
        densityBtn.title = `Change table density (spacing) (${getPrefixDisplay()}, then D)`;
        densityBtn.style.cssText = uiActionBtnBaseCSS();
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
        const resizeBtn = document.getElementById('mb-resize-btn');

        if (!resizeBtn) return;

        if (isResized) {
            resizeBtn.innerHTML = makeButtonHTML('Restore', 'R', '↔️');
            resizeBtn.title = `Restore original column widths (click to toggle / ${getPrefixDisplay()}, then R)`;
            resizeBtn.style.background = '#e8f5e9';
            resizeBtn.style.borderColor = '#4CAF50';
        } else {
            resizeBtn.innerHTML = makeButtonHTML('Resize', 'R', '↔️');
            resizeBtn.title = `Auto-resize columns to optimal width (click to toggle / ${getPrefixDisplay()}, then R)`;
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

        const resizeBtn = document.getElementById('mb-resize-btn');

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
        const existingBtn = document.getElementById('mb-resize-btn');
        if (existingBtn) {
            Lib.debug('ui', 'Auto-resize button already exists, skipping');
            return;
        }

        const resizeBtn = document.createElement('button');
        resizeBtn.id = 'mb-resize-btn';
        resizeBtn.innerHTML = makeButtonHTML('Resize', 'R', '↔️');
        resizeBtn.title = `Auto-resize columns to optimal width (${getPrefixDisplay()}, then R)`;
        resizeBtn.style.cssText = uiActionBtnBaseCSS();
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

    if (pageType) Lib.prefix = `[VZ-${SCRIPT_BASE_NAME}: ${pageType}]`;
    Lib.debug('init', 'Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        Lib.error('init', 'Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    // 3. Set Feature Flags based on active definition
    // These are evaluated dynamically during fetch based on button-specific features
    // Runtime extractor list populated by buildActiveColumnExtractors() in startFetchingProcess.
    // Each entry: { sourceColumn, extractor, syntheticColumns, colIdx }
    // colIdx is resolved per-page during header scanning and reset to -1 between pages.
    let activeColumnExtractors = [];

    // --- UI Elements ---
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mb-show-all-controls-container';
    controlsContainer.style.cssText = 'display:inline-flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:10px; vertical-align:middle; line-height:1;';

    const allActionButtons = [];

    // 4. Generate Buttons
    const buttonsToRender = activeDefinition.buttons || [
        { label: `Show all ${pageType.replace('-', ' ')}` } // Default fallback
    ];

    // Superscript numerals for Ctrl-M + 1..9 mnemonic display on action buttons
    const SUPERSCRIPT_DIGITS = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

    buttonsToRender.forEach((conf, btnIndex) => {
        const eb = document.createElement('button');
        // Build button label with Ctrl-M+N superscript mnemonic (¹²³…) after the 🧮 emoji.
        // Handles two cases:
        //   (a) label starts with "Show all"  → prefix is "🧮N ", rest is the label as-is
        //   (b) label already starts with "🧮 " → insert superscript between emoji and space
        //   (c) any other label                 → leave unchanged (no emoji, no superscript)
        const superscript = btnIndex < SUPERSCRIPT_DIGITS.length ? SUPERSCRIPT_DIGITS[btnIndex] : '';
        let labelText;
        if (conf.label.startsWith('Show all')) {
            labelText = `🧮${superscript} ` + conf.label;
        } else if (conf.label.startsWith('🧮 ')) {
            // Insert superscript between 🧮 and the following space
            labelText = `🧮${superscript}` + conf.label.slice(1); // slice(1) removes the bare space kept by slice of '🧮 ...'
            // '🧮 '.slice(1) would give ' ...' which is wrong — use slice(2) since '🧮 ' is emoji+space (2 codepoints but emoji is 2 UTF-16 units)
            // Safer: rebuild properly
            labelText = `🧮${superscript} ` + conf.label.replace(/^🧮\s*/, '');
        } else {
            labelText = conf.label;
        }
        eb.textContent = labelText;
        eb.style.cssText = uiActionBtnBaseCSS();
        eb.type = 'button';

        // Add tooltip based on button label
        if (conf.label.includes('Show all')) {
            // Extract entity types from label (e.g., "Show all Releases for ReleaseGroup")
            eb.title = `Fetch all the table data from the MusicBrainz backend database`;
        } else if (conf.label.includes('Official RGs')) {
            eb.title = 'Fetch all official artist release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Non-official RGs')) {
            eb.title = 'Fetch all non-official artist release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Official VA RGs')) {
            eb.title = 'Fetch all official various artists release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Non-official VA RGs')) {
            eb.title = 'Fetch all non-official various artists release groups from the MusicBrainz backend database';
        } else if (conf.label.includes('Official releases')) {
            eb.title = 'Fetch all official artist releases from the MusicBrainz backend database';
        } else if (conf.label.includes('VA releases')) {
            eb.title = 'Fetch all various artists releases from the MusicBrainz backend database';
        }

        // Append Ctrl-M + N prefix-mode shortcut hint to tooltip (buttons 1–9 only)
        if (superscript && eb.title) {
            eb.title += ` (${getPrefixDisplay()}, then ${btnIndex + 1})`;
        }

        // Pass the entire config object
        eb.onclick = (e) => startFetchingProcess(e, conf, activeDefinition);
        controlsContainer.appendChild(eb);
        allActionButtons.push(eb);
    });

    // Add divider between action buttons and Save to Disk button
    const initialDivider = document.createElement('span');
    initialDivider.id = 'mb-button-divider-initial';
    initialDivider.textContent = ' | ';
    initialDivider.className = 'mb-button-divider-initial';
    initialDivider.style.cssText = uiButtonDividerCSS();
    controlsContainer.appendChild(initialDivider);

    // Add Save to Disk button
    const saveToDiskBtn = document.createElement('button');
    saveToDiskBtn.id = 'mb-save-to-disk-btn';
    saveToDiskBtn.innerHTML = makeButtonHTML('Save to Disk', 'S', '💾');
    const _saveStyle = uiSaveBtnCSS();
    saveToDiskBtn.style.cssText = _saveStyle.css;
    saveToDiskBtn.onmouseover = () => { saveToDiskBtn.style.backgroundColor = _saveStyle.hoverBg; };
    saveToDiskBtn.onmouseout  = () => { saveToDiskBtn.style.backgroundColor = _saveStyle.normalBg; };
    saveToDiskBtn.type = 'button';
    saveToDiskBtn.title = `Save current table data to disk as Gzipped JSON (${getPrefixDisplay()}, then S)`;
    saveToDiskBtn.onclick = () => saveTableDataToDisk();
    saveToDiskBtn.style.display = 'none';

    if (Lib.settings.sa_enable_save_load) {
        controlsContainer.appendChild(saveToDiskBtn);
    }

    // Add Load from Disk button with hidden file input
    const loadFromDiskBtn = document.createElement('button');
    loadFromDiskBtn.id = 'mb-load-from-disk-btn';
    loadFromDiskBtn.innerHTML = makeButtonHTML('Load from Disk', 'L', '📂');
    const _loadStyle = uiLoadBtnCSS();
    loadFromDiskBtn.style.cssText = _loadStyle.css;
    loadFromDiskBtn.onmouseover = () => { loadFromDiskBtn.style.backgroundColor = _loadStyle.hoverBg; };
    loadFromDiskBtn.onmouseout  = () => { loadFromDiskBtn.style.backgroundColor = _loadStyle.normalBg; };
    loadFromDiskBtn.type = 'button';
    loadFromDiskBtn.title = `Load table data from disk (JSON file) (${getPrefixDisplay()}, then L)`;

    const fileInput = document.createElement('input');
    fileInput.id = 'mb-file-input';
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
        const isExclude = preFilterExcludeCheckbox.checked;

        loadTableDataFromDisk(file, filterQueryRaw, isCaseSensitive, isRegExp, isExclude);
    };

    loadFromDiskBtn.onclick = () => showLoadFilterDialog(loadFromDiskBtn);

    if (Lib.settings.sa_enable_save_load) {
        controlsContainer.appendChild(loadFromDiskBtn);
        controlsContainer.appendChild(fileInput);
    }

    // Add global settings/configuration button
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'mb-settings-btn';
    settingsBtn.textContent = '⚙️';
    settingsBtn.type = 'button';
    settingsBtn.title = `Open userscript settings manager to configure script behavior (${getPrefixDisplay()}, then ,)`;
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
            if (link.textContent.includes('Userscript Settings Manager') || link.textContent.includes('⚙️')) {
                settingsLink = link;
                break;
            }
        }
        if (settingsLink) {
            console.log('Found menu link, clicking it');
            settingsLink.click();
        } else {
            console.error('No settings access method available');
            alert('Settings interface not available. Please use the menu: Editing → ⚙️ Userscript Settings Manager');
        }
    };

    // Add shortcuts button (always visible, left of settings button)
    if (Lib.settings.sa_enable_keyboard_shortcuts !== false) {
        const shortcutsBtn = document.createElement('button');
        shortcutsBtn.id = 'mb-shortcuts-help-btn';
        shortcutsBtn.textContent = '🎹';
        shortcutsBtn.title = `Show keyboard shortcuts (or press ? / ${getPrefixDisplay()}, then K)`;
        shortcutsBtn.style.cssText = uiActionBtnBaseCSS();
        shortcutsBtn.type = 'button';
        shortcutsBtn.onclick = showShortcutsHelp;
        // Separator between the functional buttons (Load from Disk) and the utility group (🎹 ⚙️ ❓)
        const beforeShortcutsDivider = document.createElement('span');
        beforeShortcutsDivider.textContent = ' | ';
        beforeShortcutsDivider.className = 'mb-button-divider-before-shortcuts';
        beforeShortcutsDivider.style.cssText = uiButtonDividerCSS();
        controlsContainer.appendChild(beforeShortcutsDivider);
        controlsContainer.appendChild(shortcutsBtn);
    }

    // Add settings button to controls container (always last on initial render)
    settingsBtn.style.cssText = uiSettingsBtnCSS();
    controlsContainer.appendChild(settingsBtn);

    // Add application help button (always visible, right of ⚙️ settings button)
    const appHelpBtn = document.createElement('button');
    appHelpBtn.id = 'mb-app-help-btn';
    appHelpBtn.textContent = '❓';
    appHelpBtn.title = `Show application help and feature overview (${getPrefixDisplay()}, then H)`;
    appHelpBtn.style.cssText = uiHelpBtnCSS();
    appHelpBtn.type = 'button';
    appHelpBtn.onclick = showAppHelp;
    controlsContainer.appendChild(appHelpBtn);

    // --- Fetch progress bar (shown during data loading, hidden otherwise) ---
    const fetchProgressWrap = document.createElement('span');
    fetchProgressWrap.id = 'mb-fetch-progress-wrap';
    fetchProgressWrap.style.cssText = 'display:none; align-items:center; vertical-align:middle;';

    // Custom progress bar: outer track + inner fill + label all stacked in one element
    const fetchProgressOuter = document.createElement('span');
    fetchProgressOuter.id = 'mb-fetch-progress-outer';
    fetchProgressOuter.style.cssText = [
        'display:inline-block',
        'position:relative',
        'width:auto',
        'min-width:420px',
        'max-width:750px',
        'height:20px',
        'background:#e0e0e0',
        'border-radius:4px',
        'overflow:hidden',
        'vertical-align:middle',
        'border:1px solid #bbb',
    ].join(';');

    const fetchProgressFill = document.createElement('span');
    fetchProgressFill.id = 'mb-fetch-progress-fill';
    fetchProgressFill.style.cssText = [
        'display:block',
        'position:absolute',
        'top:0',
        'left:0',
        'height:100%',
        'width:0%',
        'background:#ffcccc',     // light red — initial colour before first progress update
        'transition:width 0.2s ease, background 0.3s ease',
        'border-radius:3px 0 0 3px',
    ].join(';');

    const fetchProgressLabel = document.createElement('span');
    fetchProgressLabel.id = 'mb-fetch-progress-label';
    fetchProgressLabel.style.cssText = [
        'position:absolute',
        'top:0',
        'left:0',
        'width:100%',
        'height:100%',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'font-size:0.75em',
        'font-weight:bold',
        'color:#333',           // dark text — always readable on the light pastel fill colours
        'white-space:nowrap',
        'pointer-events:none',
    ].join(';');

    fetchProgressOuter.appendChild(fetchProgressFill);
    fetchProgressOuter.appendChild(fetchProgressLabel);
    fetchProgressWrap.appendChild(fetchProgressOuter);
    controlsContainer.appendChild(fetchProgressWrap);

    // --- Pre-load Filter UI elements ---
    const preFilterContainer = document.createElement('span');
    preFilterContainer.id = 'mb-prefilter-container';
    preFilterContainer.style.cssText = 'display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding-left:6px; border-left:1px solid #ccc; vertical-align:middle; height:24px;';

    const preFilterInput = document.createElement('input');
    preFilterInput.id = 'mb-prefilter-input';
    preFilterInput.type = 'text';
    preFilterInput.placeholder = 'Filter data load...';
    preFilterInput.title = 'Filter rows while loading from disk. Remember you must have at least saved a dataset before to the filesystem (with the "Save to Disk" button)';
    preFilterInput.style.cssText = uiPrefilterInputCSS();

    const preFilterCaseLabel = document.createElement('label');
    preFilterCaseLabel.id = 'mb-prefilter-case-label';
    preFilterCaseLabel.style.cssText = uiCheckboxLabelCSS();
    const preFilterCaseCheckbox = document.createElement('input');
    preFilterCaseCheckbox.id = 'mb-prefilter-case-checkbox';
    preFilterCaseCheckbox.type = 'checkbox';
    preFilterCaseCheckbox.style.cssText = uiCheckboxInputCSS();
    preFilterCaseLabel.appendChild(preFilterCaseCheckbox);
    preFilterCaseLabel.appendChild(document.createTextNode('Cc'));
    preFilterCaseLabel.title = 'Case Sensitive (Load)';

    const preFilterRxLabel = document.createElement('label');
    preFilterRxLabel.id = 'mb-prefilter-rx-label';
    preFilterRxLabel.style.cssText = uiCheckboxLabelCSS();
    const preFilterRxCheckbox = document.createElement('input');
    preFilterRxCheckbox.id = 'mb-prefilter-rx-checkbox';
    preFilterRxCheckbox.type = 'checkbox';
    preFilterRxCheckbox.style.cssText = uiCheckboxInputCSS();
    preFilterRxLabel.appendChild(preFilterRxCheckbox);
    preFilterRxLabel.appendChild(document.createTextNode('Rx'));
    preFilterRxLabel.title = 'RegExp (Load)';

    const preFilterExcludeLabel = document.createElement('label');
    preFilterExcludeLabel.id = 'mb-prefilter-exclude-label';
    preFilterExcludeLabel.style.cssText = uiCheckboxLabelCSS();
    const preFilterExcludeCheckbox = document.createElement('input');
    preFilterExcludeCheckbox.id = 'mb-prefilter-exclude-checkbox';
    preFilterExcludeCheckbox.type = 'checkbox';
    preFilterExcludeCheckbox.style.cssText = uiCheckboxInputCSS();
    preFilterExcludeLabel.appendChild(preFilterExcludeCheckbox);
    preFilterExcludeLabel.appendChild(document.createTextNode('Ex'));
    preFilterExcludeLabel.title = 'Exclude matches (Load) — rows matching the filter expression are excluded instead of kept';

    const preFilterMsg = document.createElement('span');
    preFilterMsg.id = 'mb-preload-filter-msg';
    preFilterMsg.style.cssText = 'font-size:0.8em; color:red; margin-left:4px; font-weight:bold; white-space:nowrap; display:none;';

    const stopBtn = document.createElement('button');
    stopBtn.id = 'mb-stop-btn';
    stopBtn.innerHTML = makeButtonHTML('Stop', 'o');
    stopBtn.type = 'button';
    stopBtn.style.cssText = uiStopBtnCSS();
    stopBtn.title = 'Stop the current data fetching process from the MusicBrainz backend database';

    const globalStatusDisplay = document.createElement('span');
    globalStatusDisplay.id = 'mb-global-status-display';
    globalStatusDisplay.style.cssText = 'font-size:0.95em; color:#333; font-weight:bold; vertical-align:middle;';

    const infoDisplay = document.createElement('span');
    infoDisplay.id = 'mb-info-display';
    infoDisplay.style.cssText = 'font-size:0.95em; color:#333; font-weight:bold; vertical-align:middle;';

    const filterContainer = document.createElement('span');
    filterContainer.id = 'mb-filter-container';
    // Initially hidden; will be displayed when appended to H2
    filterContainer.style.cssText = 'display:none; align-items:center; white-space:nowrap; gap:5px;';

    const filterWrapper = document.createElement('span');
    filterWrapper.id = 'mb-global-filter-wrapper';
    filterWrapper.className = 'mb-filter-wrapper';
    filterWrapper.style.cssText = 'display:inline-flex; align-items:stretch; position:relative;';

    const filterInput = document.createElement('input');
    filterInput.id = 'mb-global-filter-input';
    filterInput.placeholder = activeDefinition && activeDefinition.tableMode === 'multi'
        ? `🔍 Global Filter… works across all sub-tables`
        : `🔍 Global Filter…`;
    filterInput.title = 'Enter global filter string';
    filterInput.style.cssText = uiGlobalFilterInputCSS();
    // Remove default border-radius on the right so the x/handle attach flush
    filterInput.style.borderRadius = '3px 0 0 3px';

    // ── Clear (✕) button — narrow strip to the right of the input ──────────
    const filterClear = document.createElement('span');
    filterClear.id = 'mb-global-filter-clear';
    filterClear.textContent = '✕';
    filterClear.style.cssText = [
        'display:inline-flex; align-items:center; justify-content:center;',
        'width:18px; flex-shrink:0;',
        'cursor:pointer; user-select:none;',
        'font-size:0.65em; color:#999;',
        'border:2px solid ' + gfBorderIdle() + '; border-left:none; border-right:none;',
        'background:#fafafa;',
        'transition:color 0.15s, background 0.15s;'
    ].join(' ');
    filterClear.title = 'Clear global filter (✕)';
    filterClear.onmouseenter = () => { filterClear.style.color = '#c00'; filterClear.style.background = '#fee'; };
    filterClear.onmouseleave = () => { filterClear.style.color = '#999'; filterClear.style.background = '#fafafa'; };

    // ── Resize drag handle — narrow strip to the right of the ✕ button ─────
    const filterDragHandle = document.createElement('span');
    filterDragHandle.id = 'mb-global-filter-drag';
    filterDragHandle.title = 'Drag to resize filter field';
    filterDragHandle.style.cssText = [
        'display:inline-flex; align-items:center; justify-content:center;',
        'width:10px; flex-shrink:0;',
        'cursor:col-resize; user-select:none;',
        'border:2px solid ' + gfBorderIdle() + '; border-left:none;',
        'border-radius:0 3px 3px 0;',
        'background:#f0f0f0;',
        'font-size:7px; color:#aaa; letter-spacing:-1px;'
    ].join(' ');
    filterDragHandle.textContent = '⋮';

    filterDragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const startX     = e.clientX;
        const startWidth = filterInput.offsetWidth;
        const onMove = (ev) => {
            const newW = Math.max(60, startWidth + (ev.clientX - startX));
            filterInput.style.width = newW + 'px';
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
    });

    filterWrapper.appendChild(filterInput);
    filterWrapper.appendChild(filterClear);
    filterWrapper.appendChild(filterDragHandle);

    const caseLabel = document.createElement('label');
    caseLabel.id = 'mb-global-filter-case-label';
    caseLabel.style.cssText = `${uiCheckboxLabelCSS()} font-weight:normal; height:24px;`;
    const caseCheckbox = document.createElement('input');
    caseCheckbox.id = 'mb-global-filter-case-checkbox';
    caseCheckbox.type = 'checkbox';
    caseCheckbox.style.cssText = uiCheckboxInputCSS();
    caseLabel.appendChild(caseCheckbox);
    caseLabel.appendChild(document.createTextNode('Cc'));
    caseLabel.title = 'Case Sensitive Filtering';

    const regexpLabel = document.createElement('label');
    regexpLabel.id = 'mb-global-filter-rx-label';
    regexpLabel.style.cssText = `${uiCheckboxLabelCSS()} font-weight:normal; height:24px;`;
    const regexpCheckbox = document.createElement('input');
    regexpCheckbox.id = 'mb-global-filter-rx-checkbox';
    regexpCheckbox.type = 'checkbox';
    regexpCheckbox.style.cssText = uiCheckboxInputCSS();
    regexpLabel.appendChild(regexpCheckbox);
    regexpLabel.appendChild(document.createTextNode('Rx'));
    regexpLabel.title = 'RegExp Filtering';

    const excludeLabel = document.createElement('label');
    excludeLabel.id = 'mb-global-filter-exclude-label';
    excludeLabel.style.cssText = `${uiCheckboxLabelCSS()} font-weight:normal; height:24px;`;
    const excludeCheckbox = document.createElement('input');
    excludeCheckbox.id = 'mb-global-filter-exclude-checkbox';
    excludeCheckbox.type = 'checkbox';
    excludeCheckbox.style.cssText = uiCheckboxInputCSS();
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
    prefilterToggleBtn.style.cssText = `${uiFilterBarBtnCSS()} transition:background-color 0.3s; display:none;`;
    prefilterToggleBtn.title = 'Toggle prefilter highlighting on/off';

    /**
     * Update the prefilter toggle button text and appearance
     * @param {number} count - Number of rows kept (or excluded) after prefiltering
     * @param {string} query - The prefilter query string
     * @param {boolean} show - Whether to show the button
     * @param {number} totalRows - Total rows in the loaded file (before filtering)
     * @param {boolean} isExclude - When true, rows matching the query were excluded
     */
    function updatePrefilterToggleButton(count = 0, query = '', show = false, totalRows = 0, isExclude = false) {
        prefilterInfo = { count, query };

        if (show && query) {
            // Show prefilter info in button text with emoji, always including total row count
            const rowWord = count === 1 ? 'row' : 'rows';
            const totalPart = totalRows > 0 ? ` out of ${totalRows}` : '';
            const action = isExclude ? 'excluded' : 'prefiltered';
            prefilterToggleBtn.textContent = `🎨 ${count}${totalPart} ${rowWord} ${action}: "${query}"`;
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
    unhighlightAllBtn.style.cssText = `${uiFilterBarBtnCSS()} transition:background-color 0.3s; display:none;`;
    unhighlightAllBtn.title = 'Toggle filter highlighting on/off (global/sub-table filters and ALL column filters in all sub-tables)';

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
            // Currently highlighted - save state and remove filter/subtable highlights
            saveFilterHighlightState();
            document.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight')
                .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));
            // Also remove subtable-filter highlights
            document.querySelectorAll('.mb-subtable-filter-highlight')
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
    clearColumnFiltersBtn.style.cssText = `${uiFilterBarBtnCSS()} display:none;`;
    clearColumnFiltersBtn.title = 'Clear all column-specific filter inputs — global action (Shift+Esc)';
    clearColumnFiltersBtn.onclick = () => {
        // Clear all column filters only
        document.querySelectorAll('.mb-col-filter-input').forEach(input => {
            input.value = '';
            input.style.backgroundColor = '';
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
    clearAllFiltersBtn.style.cssText = `${uiFilterBarBtnCSS()} display:none;`;
    clearAllFiltersBtn.title = 'Clear global/sub-table filters and ALL column filters in all sub-tables — global action (Ctrl+Shift+Esc)';
    clearAllFiltersBtn.onclick = () => {
        // Clear global filter
        filterInput.value = '';
        filterClear.click(); // This will trigger the clear handler

        // Clear all sub-table specific filter fields
        document.querySelectorAll('.mb-subtable-filter-container input[type="text"]').forEach(input => {
            if (input.value) {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: false }));
            }
        });

        // Also call the main clearAllFilters function
        clearAllFilters();
    };
    filterContainer.appendChild(clearAllFiltersBtn);

    /**
     * Update visibility of filter-related buttons based on whether filters are active.
     *
     * Global bar buttons:
     *   clearColumnFiltersBtn — visible whenever at least one column filter is active.
     *   clearAllFiltersBtn    — visible whenever the global filter OR at least one
     *                           sub-table (STF) filter is active.
     *
     * Per-subtable buttons (re-evaluated for every .mb-subtable-clear-btn):
     *   .mb-subtable-clear-btn  — shown when ANY filter (column or STF) is active for
     *                             that sub-table; its label is set dynamically:
     *                             • STF active (alone or with columns) → "Clear all filters"
     *                             • column-only active (no STF)        → "Clear all COLUMN filters"
     *   .mb-stf-clear-col-btn   — shown only when BOTH the STF input AND at least one
     *                             column filter are active for this sub-table, giving the
     *                             user a way to clear just the column level while keeping
     *                             the STF filter.  Disappears as soon as column filters
     *                             are gone (via updateFilterButtonsVisibility after runFilter).
     */
    function updateFilterButtonsVisibility() {
        // Check if global filter has value
        const globalFilterActive = filterInput.value.trim() !== '';

        // Check if any column filters have values.
        // Use stripColFilterPrefix so a focused-but-empty field carrying the decorative
        // prefix is not counted as active.
        const columnFilters = document.querySelectorAll('.mb-col-filter-input');
        const columnFiltersActive = Array.from(columnFilters).some(
            inp => stripColFilterPrefix(inp.value).trim() !== ''
        );

        // Check if any sub-table (STF) filter inputs have values.
        const stfFilters = document.querySelectorAll('.mb-subtable-filter-container input[type="text"]');
        const stfFiltersActive = Array.from(stfFilters).some(inp => inp.value.trim() !== '');

        // Global "Toggle highlighting" button: visible whenever ANY filter string is
        // present (global, sub-table, or column) — regardless of whether highlight
        // spans are currently in the DOM (spans may be absent when highlighting is
        // toggled OFF, but the button must still be reachable to turn it back ON).
        unhighlightAllBtn.style.display =
            (globalFilterActive || columnFiltersActive || stfFiltersActive)
                ? 'inline-block' : 'none';

        // "Clear all COLUMN filters" — visible only when at least one column
        // filter has text.  Not shown for a pure-STF or pure-global scenario.
        clearColumnFiltersBtn.style.display = columnFiltersActive ? 'inline-block' : 'none';

        // "Clear ALL filters" — visible when the global filter OR at least one STF
        // filter is active.  Column-only active is already covered by
        // clearColumnFiltersBtn; this button is not needed in that case.
        clearAllFiltersBtn.style.display =
            (globalFilterActive || stfFiltersActive)
                ? 'inline-block' : 'none';

        // Update visibility, labels, and in-panel clear button for per-subtable controls.
        document.querySelectorAll('.mb-subtable-clear-btn').forEach(btn => {
            // Find the associated h3 and table
            const h3 = btn.closest('.mb-subtable-controls')?.parentElement;
            if (!h3) return;

            const table = h3.nextElementSibling;
            if (!table || table.tagName !== 'TABLE') return;

            // Check if this table has any active column filters.
            // Use stripColFilterPrefix so a focused-but-empty field (which carries
            // only the decorative prefix "🔍 ") is NOT treated as having a filter.
            const tableColFilters = table.querySelectorAll('.mb-col-filter-input');
            const tableHasColFilters = Array.from(tableColFilters).some(
                input => stripColFilterPrefix(input.value).trim() !== ''
            );

            // Also consider the sub-table filter input active state.
            const stfInput = h3.querySelector('.mb-subtable-filter-container input[type="text"]');
            const stfActive = stfInput ? stfInput.value.trim() !== '' : false;

            // Show the clear button whenever ANY filter (column or sub-table) is
            // active for this table; hide it when nothing remains to clear.
            const anyFilterActive = tableHasColFilters || stfActive;
            btn.style.display = anyFilterActive ? 'inline-block' : 'none';

            // Dynamically relabel the button so it accurately describes what it clears:
            //   STF active (alone or with columns) → "Clear all filters"
            //   column-only active (no STF)        → "Clear all COLUMN filters"
            const labelSpan = btn.querySelector('.mb-subtable-clear-btn-label');
            if (labelSpan) {
                if (stfActive) {
                    labelSpan.textContent = 'Clear all filters';
                    btn.title = 'Clear all filters for this sub-table (column filters and sub-table filter)';
                } else {
                    labelSpan.textContent = 'Clear all COLUMN filters';
                    btn.title = 'Clear all COLUMN filters for this sub-table';
                }
            }

            // Drive the per-subtable highlight-toggle button with the same condition.
            const highlightBtn = h3.querySelector('[id$="-toggle-filter-highlight-btn"]');
            if (highlightBtn) {
                highlightBtn.style.display = anyFilterActive ? 'inline-block' : 'none';
            }

            // Drive the in-panel "Clear all COLUMN filters" button (.mb-stf-clear-col-btn):
            // shown only when BOTH STF AND column filters are active, so the user can
            // clear just the column level while keeping the STF.  Disappears as soon as
            // column filters are cleared (updateFilterButtonsVisibility is called by runFilter).
            const clearColStfBtn = h3.querySelector('.mb-stf-clear-col-btn');
            if (clearColStfBtn) {
                clearColStfBtn.style.display = (stfActive && tableHasColFilters) ? 'inline-block' : 'none';
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
            input.style.backgroundColor = '';
        });

        // Also clear the sub-table (STF) filter input for this table and restore
        // any rows it was hiding, so that clicking the button while only the STF
        // is active produces a complete reset without leaving orphaned stf-hidden rows.
        const h3stf = table.previousElementSibling;
        if (h3stf && h3stf.classList.contains('mb-toggle-h3')) {
            const stfInput = h3stf.querySelector('.mb-subtable-filter-container input[type="text"]');
            if (stfInput && stfInput.value.trim() !== '') {
                stfInput.value = '';
                // Restore rows hidden by the stf filter
                table.querySelectorAll('tbody tr[data-mb-stf-hidden]').forEach(row => {
                    row.style.display = '';
                    delete row.dataset.mbStfHidden;
                });
                // Remove stf highlight spans
                table.querySelectorAll('.mb-subtable-filter-highlight').forEach(n => {
                    n.replaceWith(document.createTextNode(n.textContent));
                });
                // Reset stf input visual state
                stfInput.style.boxShadow = '';
                setSubTableFilterBorder(stfInput, stfInput.value ? stfBorderActive() : stfBorderIdle());
            }
        }

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

        /* Multi-sort column group tinting — two alternating shades per priority, semi-transparent   */
        /* so even/odd zebra striping remains visible underneath.                                    */
        /* 'a' shade = first value-run, 'b' shade = next value-run (alternates on each value change) */
        .mb-mscol-0a { background-color: rgba(255, 200,  80, 0.22) !important; }  /* amber   light  */
        .mb-mscol-0b { background-color: rgba(255, 200,  80, 0.44) !important; }  /* amber   dark   */
        .mb-mscol-1a { background-color: rgba( 80, 180, 255, 0.22) !important; }  /* sky     light  */
        .mb-mscol-1b { background-color: rgba( 80, 180, 255, 0.44) !important; }  /* sky     dark   */
        .mb-mscol-2a { background-color: rgba(120, 230, 120, 0.22) !important; }  /* mint    light  */
        .mb-mscol-2b { background-color: rgba(120, 230, 120, 0.44) !important; }  /* mint    dark   */
        .mb-mscol-3a { background-color: rgba(230, 120, 230, 0.22) !important; }  /* mauve   light  */
        .mb-mscol-3b { background-color: rgba(230, 120, 230, 0.44) !important; }  /* mauve   dark   */
        .mb-mscol-4a { background-color: rgba(255, 160, 100, 0.22) !important; }  /* peach   light  */
        .mb-mscol-4b { background-color: rgba(255, 160, 100, 0.44) !important; }  /* peach   dark   */
        .mb-mscol-5a { background-color: rgba(100, 230, 210, 0.22) !important; }  /* teal    light  */
        .mb-mscol-5b { background-color: rgba(100, 230, 210, 0.44) !important; }  /* teal    dark   */
        .mb-mscol-6a { background-color: rgba(180, 160, 255, 0.22) !important; }  /* lavender light */
        .mb-mscol-6b { background-color: rgba(180, 160, 255, 0.44) !important; }  /* lavender dark  */
        .mb-mscol-7a { background-color: rgba(255, 220, 180, 0.22) !important; }  /* vanilla  light */
        .mb-mscol-7b { background-color: rgba(255, 220, 180, 0.44) !important; }  /* vanilla  dark  */

        /* Header cell highlight — solid hue at 60% so the priority anchor is clearly visible */
        .mb-mscol-hdr-0 { background-color: rgba(255, 200,  80, 0.60) !important; }
        .mb-mscol-hdr-1 { background-color: rgba( 80, 180, 255, 0.60) !important; }
        .mb-mscol-hdr-2 { background-color: rgba(120, 230, 120, 0.60) !important; }
        .mb-mscol-hdr-3 { background-color: rgba(230, 120, 230, 0.60) !important; }
        .mb-mscol-hdr-4 { background-color: rgba(255, 160, 100, 0.60) !important; }
        .mb-mscol-hdr-5 { background-color: rgba(100, 230, 210, 0.60) !important; }
        .mb-mscol-hdr-6 { background-color: rgba(180, 160, 255, 0.60) !important; }
        .mb-mscol-hdr-7 { background-color: rgba(255, 220, 180, 0.60) !important; }
        .mb-row-count-stat { color: blue; font-weight: bold; margin-left: 8px; }
        .mb-toggle-h3:hover, .mb-toggle-h2:hover {
            color: #222;
            background-color: #f9f9f9;
        }
        .mb-toggle-h3 { cursor: pointer; user-select: none; border-bottom: 1px solid #eee; padding: 4px 0; margin-left: 1.5em; }
        .mb-subtable-controls { display: inline-flex; align-items: baseline; gap: 8px; margin-left: 12px; vertical-align: middle; }
        .mb-subtable-clear-btn { font-size: ${uiSubtableBtnVals().fontSize}; padding: ${uiSubtableBtnVals().padding}; cursor: pointer; vertical-align: middle; border-radius: ${uiSubtableBtnVals().borderRadius}; background: ${uiSubtableBtnVals().bg}; border: ${uiSubtableBtnVals().border}; }
        .mb-subtable-clear-btn:hover { background: ${uiSubtableBtnVals().bgHover}; }
        .mb-show-all-subtable-btn { font-size: ${uiSubtableBtnVals().fontSize}; padding: ${uiSubtableBtnVals().padding}; cursor: pointer; vertical-align: middle; border-radius: ${uiSubtableBtnVals().borderRadius}; background: ${uiSubtableBtnVals().bg}; border: ${uiSubtableBtnVals().border}; }
        .mb-show-all-subtable-btn:hover { background: ${uiSubtableBtnVals().bgHover}; }
        .mb-subtable-status-display { font-size: 0.85em; color: #333; font-weight: bold; vertical-align: middle; }
        .mb-filter-status { font-family: 'Courier New', monospace; font-size: 1.0em; vertical-align: middle; margin-right: 4px; }
        .mb-sort-status { font-family: 'Arial', sans-serif; font-size: 1.0em; font-style: italic; vertical-align: middle; }
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
            font-size: ${uiColumnFilterInputVals().fontSize};
            padding: ${uiColumnFilterInputVals().padding};
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
        /* Sub-table specific filter container */
        .mb-subtable-filter-container {
            display: none;
            align-items: center;
            gap: 4px;
            margin-left: 8px;
            vertical-align: middle;
            white-space: nowrap;
        }
        .mb-subtable-filter-container.visible {
            display: inline-flex;
        }
        .mb-subtable-filter-wrapper {
            position: relative;
            display: inline-flex;
            align-items: stretch;
        }
        .mb-subtable-filter-toggle-icon {
            cursor: pointer;
            font-size: 0.9em;
            vertical-align: middle;
            margin-left: 6px;
            user-select: none;
            opacity: 0.7;
            transition: opacity 0.15s;
        }
        .mb-subtable-filter-toggle-icon:hover {
            opacity: 1.0;
        }
        .mb-subtable-filter-toggle-icon.active {
            opacity: 1.0;
            filter: drop-shadow(0 0 2px rgba(0,100,255,0.5));
        }
        .mb-subtable-filter-highlight {
            background-color: #90ee90;
            color: #000;
        }
    `;
    document.head.appendChild(style);

    if (headerContainer.tagName === 'A') {
        headerContainer.after(controlsContainer);
    } else {
        headerContainer.appendChild(controlsContainer);
    }

    // Blur the native MusicBrainz search / header query input so that keyboard
    // shortcuts registered by this script are immediately reachable without the
    // user having to manually click away from the text field first.
    const _initialQueryInput = document.getElementById('headerid-query');
    if (_initialQueryInput) {
        _initialQueryInput.blur();
        Lib.debug('init', 'Blurred #headerid-query input on page entry');
    }

    // Show deferred "Page Reloaded" dialog now that action buttons are in the DOM
    if (reloadFlag) {
        const firstActionBtn = allActionButtons.length > 0 ? allActionButtons[0] : null;
        Lib.showCustomAlert(
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
    // Registry of per-table tint functions so renderFinalTable can re-apply tints after re-render
    let multiSortTintRegistry = new Map(); // sortKey → { applyTints, clearTints }

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
                    <input id="sa-load-filter-input" type="text" placeholder="Filter expression..."
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
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9em; font-weight:600;" title="Exclude rows that match the filter expression instead of keeping them">
                    <input type="checkbox" id="sa-load-exclude"> Exclude Matches
                </label>
            </div>

            <div style="display:flex; gap:12px;">
                <button id="sa-load-confirm" style="flex:2; padding:10px; background:#4CAF50; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">${makeButtonHTML('Load Data', 'L')}</button>
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

        /**
         * Validates all load-dialog inputs — including the optional RegExp filter —
         * shows inline feedback on error and keeps the dialog open for correction.
         * Only on success closes the dialog and triggers the file picker.
         *
         * Changed sync → async to allow awaiting Lib.showCustomAlert() while the
         * dialog is still in the DOM (so the user can correct the pattern without
         * having to reopen the dialog from scratch).
         *
         * @returns {Promise<void>}
         */
        const confirmLoad = async () => {
            const query = input.value.trim();
            const useCase = dialog.querySelector('#sa-load-case').checked;
            const useRegex = dialog.querySelector('#sa-load-regex').checked;
            const useExclude = dialog.querySelector('#sa-load-exclude').checked;

            // --- Regex pre-validation: must happen while the dialog is still open ---
            if (query && useRegex) {
                try {
                    // Test-compile only; the result is not needed here.
                    new RegExp(query, useCase ? '' : 'i');
                } catch (e) {
                    // Highlight the offending input field so the user sees at a glance
                    // what needs to be corrected.
                    input.style.borderColor = 'red';
                    input.focus();

                    await Lib.showCustomAlert(
                        `Invalid Regular Expression: ${e.message}`,
                        '❌ Invalid Regex',
                        dialog.querySelector('#sa-load-confirm')
                    );
                    // Dialog stays open — return without closing so the user can fix the pattern.
                    return;
                }
            }

            // Input is valid — clear any previous error styling on the filter field.
            input.style.borderColor = '';

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
                if (typeof preFilterExcludeLabel !== 'undefined') {
                    preFilterExcludeLabel.querySelector('input').checked = useExclude;
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
    function updateH2Count(filteredCount, totalCount, absoluteTotal = null) {
        Lib.debug('render', `Starting updateH2Count: filtered=${filteredCount}, total=${totalCount}, absoluteTotal=${absoluteTotal}`);

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
            let countText;
            if (absoluteTotal !== null && absoluteTotal !== totalCount) {
                // 3-tier: (locally of globally)/absoluteTotal
                countText = `(${filteredCount} of ${totalCount})/${absoluteTotal}`;
            } else {
                countText = (filteredCount === totalCount) ? `(${totalCount})` : `(${filteredCount} of ${totalCount})`;
            }
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
        const globalFilterInput = document.getElementById('mb-global-filter-input');
        const globalQuery = globalFilterInput ? globalFilterInput.value.trim() : '';

        // Save column filter parameters
        const columnFilters = [];
        document.querySelectorAll('.mb-col-filter-input').forEach((input, index) => {
            const filterVal = stripColFilterPrefix(input.value).trim();
            if (filterVal) {
                columnFilters.push({
                    index: index,
                    query: filterVal,
                    caseSensitive: false, // Column filters don't have case sensitivity toggle
                    isRegex: false
                });
            }
        });

        // Also capture active STF (sub-table) filter queries so that
        // restoreFilterHighlightState() knows there is something to restore
        // even when no global or column filters are set.
        const stfFilters = [];
        document.querySelectorAll('.mb-subtable-filter-container input[type="text"]').forEach(inp => {
            if (inp.value.trim()) stfFilters.push(inp.value.trim());
        });

        savedFilterHighlights = {
            globalFilter: globalQuery ? { query: globalQuery } : null,
            columnFilters: columnFilters,
            stfFilters: stfFilters,
            hasContent: !!(globalQuery || columnFilters.length > 0 || stfFilters.length > 0)
        };

        Lib.debug('highlight', `Saved filter highlight state: global=${!!globalQuery}, columns=${columnFilters.length}, stf=${stfFilters.length}`);
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

    // ── Column filter focus-mode visual helpers ──────────────────────────────

    /**
     * Strip the decorative focus prefix (sa_col_filter_focus_prefix setting) from a raw
     * column-filter input value, returning only the user-supplied filter string.
     *
     * @param {string} value - Raw HTMLInputElement.value (may begin with the configured prefix)
     * @returns {string} The filter string without the decorative prefix.
     */
    function stripColFilterPrefix(value) {
        const prefix = Lib.settings.sa_col_filter_focus_prefix ?? '🔍 ';
        return value.startsWith(prefix) ? value.slice(prefix.length) : value;
    }

    /**
     * Apply the focus-mode visual state to a column filter input:
     * prepend the search-icon prefix (if absent) and tint the background.
     * Positions the text cursor right after the prefix so the user can type immediately.
     *
     * @param {HTMLInputElement} input
     */
    function applyColFilterFocusStyle(input) {
        const prefix = Lib.settings.sa_col_filter_focus_prefix ?? '🔍 ';
        // Strip any already-present prefix so we can reason about the real content
        const existing = input.value.startsWith(prefix) ? input.value.slice(prefix.length) : input.value;
        if (existing === '') {
            // Empty field: leave value empty so the placeholder is visible.
            // Embed the prefix in the placeholder itself so the user can see the search icon.
            input.value = '';
            input.placeholder = prefix + 'Filter on this column…';
        } else {
            // Field already contains a filter string: prepend the prefix into the value
            // (same behaviour as before — prefix is visible inline with the text).
            input.value = prefix + existing;
            const pos = prefix.length + existing.length;
            input.setSelectionRange(pos, pos);
            // Placeholder is invisible when value is non-empty, but keep it consistent.
            input.placeholder = prefix + 'Filter on this column…';
        }
        input.style.backgroundColor = Lib.settings.sa_col_filter_focus_bg || '#fffde7';
    }

    /**
     * Remove the focus-mode visual state from a column filter input on blur:
     * always strip the decorative prefix so the stored value is the clean filter
     * string.  The background tint is only cleared when the field is empty — if
     * the user has typed an actual filter string the "active" background colour
     * (sa_col_filter_active_bg) is kept as a persistent visual indicator that
     * this column has an active filter.
     *
     * @param {HTMLInputElement} input
     */
    function removeColFilterFocusStyle(input) {
        input.value = stripColFilterPrefix(input.value);
        // Restore the neutral placeholder now that focus is gone
        input.placeholder = '…';
        if (input.value.trim() === '') {
            // No filter content — clear the background entirely
            input.style.backgroundColor = '';
        } else {
            // Filter content present — switch to the "active" background colour
            input.style.backgroundColor = Lib.settings.sa_col_filter_active_bg || '#fff9c4';
        }
    }

    /**
     * keydown guard that prevents keyboard actions from destroying the decorative
     * focus prefix inside a column filter input.  Attach as a 'keydown' listener
     * on each .mb-col-filter-input element while it has focus.
     *
     * Rules enforced:
     *  • Backspace  — blocked when the cursor (or selection start) is at or before
     *                 the end of the prefix, so the prefix characters can never be
     *                 consumed by backwards deletion.
     *  • Delete     — blocked when the selection end is within or before the prefix
     *                 range, so forward deletion cannot eat prefix characters either.
     *  • ArrowLeft  — clamped: if moving left would place the caret inside the
     *                 prefix the caret is pinned just after the prefix instead.
     *                 Shift+ArrowLeft (extend selection leftward) is clamped the
     *                 same way so the prefix cannot be included in a selection.
     *  • Home       — repositioned to just after the prefix rather than column 0
     *                 (Shift+Home likewise, to prevent selecting over the prefix).
     *  • Ctrl+A     — rewritten to select only the user content (after the prefix).
     *
     * @param {HTMLInputElement} input - The column filter input element.
     * @param {KeyboardEvent}    e     - The keydown event.
     */
    function guardColFilterPrefixKeydown(input, e) {
        const prefix = Lib.settings.sa_col_filter_focus_prefix ?? '🔍 ';
        const pfxLen = prefix.length;

        // Skip entirely when the input doesn't currently carry the prefix
        // (this is a safety guard; the listener is only active while focused,
        // so applyColFilterFocusStyle should always have set the prefix already).
        if (!input.value.startsWith(prefix)) return;

        const selStart = input.selectionStart;
        const selEnd   = input.selectionEnd;

        switch (e.key) {
            case 'Backspace': {
                // Block when cursor or selection start is within/at the prefix boundary
                if (selStart <= pfxLen) {
                    e.preventDefault();
                    // Ensure caret is placed right after the prefix
                    input.setSelectionRange(pfxLen, pfxLen);
                }
                break;
            }

            case 'Delete': {
                // Block when the selection could consume prefix characters
                if (selEnd <= pfxLen) {
                    e.preventDefault();
                    input.setSelectionRange(pfxLen, pfxLen);
                } else if (selStart < pfxLen) {
                    // Partial overlap: allow the Delete but pin the selection start
                    e.preventDefault();
                    // Remove only the portion after the prefix
                    const after = input.value.slice(pfxLen);
                    const deleteLen = selEnd - pfxLen;
                    input.value = prefix + after.slice(deleteLen);
                    input.setSelectionRange(pfxLen, pfxLen);
                }
                break;
            }

            case 'ArrowLeft': {
                const newPos = e.shiftKey ? selStart - 1 : selEnd - 1;
                if (newPos < pfxLen) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Extend selection only to the prefix boundary
                        input.setSelectionRange(pfxLen, selEnd);
                    } else {
                        input.setSelectionRange(pfxLen, pfxLen);
                    }
                }
                break;
            }

            case 'Home': {
                e.preventDefault();
                if (e.shiftKey) {
                    // Shift+Home: extend selection back to just after prefix
                    input.setSelectionRange(pfxLen, selEnd);
                } else {
                    input.setSelectionRange(pfxLen, pfxLen);
                }
                break;
            }

            case 'a':
            case 'A': {
                // Ctrl+A / Cmd+A: select only the user-editable content
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    input.setSelectionRange(pfxLen, input.value.length);
                }
                break;
            }

            default:
                break;
        }
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
            input.placeholder = '…';
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
                // Clicking ✕ is identical to pressing Escape the first time while
                // the field is focused: clear any user-entered text, keep the field
                // focused with the decorative prefix in place.
                //
                // The blur event fires before onclick (because the click moves focus
                // away from the input), so by the time we arrive here the prefix has
                // already been stripped by removeColFilterFocusStyle.  We therefore:
                //   1. Clear the value (no prefix at this point).
                //   2. Re-focus the input — this synchronously triggers the 'focus'
                //      listener which calls applyColFilterFocusStyle, restoring the
                //      prefix and the focus-background tint.
                //   3. Run the filter immediately.
                input.value = '';
                input.focus(); // → applyColFilterFocusStyle adds prefix + focus bg
                runFilter();
            };

            // Use debounced version for typing in column filters
            const debouncedColumnFilter = debounce(() => {
                Lib.debug('filter', `Column filter updated on column ${idx}: "${stripColFilterPrefix(input.value)}"`);
                runFilter();
            }, Lib.settings.sa_filter_debounce_delay || 300);

            input.addEventListener('input', (e) => {
                e.stopPropagation();
                // If the user just started typing into a focused-but-empty field the prefix
                // was deliberately kept out of the value (so the placeholder hint was visible).
                // The moment any real character arrives we prepend the prefix so the focus
                // guard and stripColFilterPrefix work correctly for the rest of the session.
                const prefix = Lib.settings.sa_col_filter_focus_prefix ?? '🔍 ';
                if (document.activeElement === input && input.value !== '' && !input.value.startsWith(prefix)) {
                    const typed = input.value;
                    input.value = prefix + typed;
                    // Keep caret at the end
                    input.setSelectionRange(input.value.length, input.value.length);
                }
                debouncedColumnFilter();
            });

            // Focus: prepend search-icon prefix and tint the background
            input.addEventListener('focus', () => applyColFilterFocusStyle(input));

            // Keydown: prevent Backspace/Delete/ArrowLeft from consuming the prefix
            input.addEventListener('keydown', (e) => guardColFilterPrefixKeydown(input, e));

            // Blur: strip prefix and clear the background tint so the stored
            // value is always the clean filter string (no visual artefacts)
            input.addEventListener('blur', () => removeColFilterFocusStyle(input));

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
    /**
     * Helper: find the .mb-filter-status span for a given <table> element.
     * Returns null when the h3 / span cannot be found.
     */
    function getTableFilterStatusSpan(tbl) {
        const h3 = tbl ? tbl.previousElementSibling : null;
        return h3 ? h3.querySelector('.mb-filter-status') : null;
    }

    /**
     * Reads column filter inputs from a table, validates any regexp patterns, updates
     * visual state on each input, and returns an array of active {val, idx} filter descriptors.
     *
     * Three fixes relative to the previous version:
     *  1. In regexp mode `val` is kept as-is (not lowercased) — the 'i' flag in
     *     testRowMatch handles case-insensitivity; lowercasing the pattern breaks
     *     character classes like [A-Z].
     *  2. Regexp validation errors are collected in `result._rxErrors` so that
     *     callers without an h3-backed status span (single-table pages) can still
     *     display them.
     *  3. When an h3-backed status span IS found (multi-table pages), the error is
     *     also written there directly — and the span is tagged `colRxError` so the
     *     post-filter status-update loop knows not to overwrite it.
     *
     * @param {HTMLElement|null} table
     * @param {boolean}          isCaseSensitive
     * @param {boolean}          isRegExp
     * @returns {Array<{val:string, idx:number}>}  — with an `._rxErrors` property
     *          (array of formatted error strings) attached for single-table callers.
     */
    function getColFilters(table, isCaseSensitive, isRegExp) {
        if (!table) {
            const empty = [];
            empty._rxErrors = [];
            return empty;
        }

        // For multi-table pages each table has an h3 with a .mb-filter-status span.
        // For single-table pages this returns null — errors are returned via ._rxErrors.
        const statusSpan = getTableFilterStatusSpan(table);

        // Clear any previous regexp-error message left by a prior call.
        if (statusSpan && statusSpan.dataset.colRxError) {
            statusSpan.textContent = '';
            delete statusSpan.dataset.colRxError;
        }

        const result = [];
        result._rxErrors = []; // Collected error strings for callers that lack a statusSpan

        Array.from(table.querySelectorAll('.mb-col-filter-input')).forEach(inp => {
            const raw = stripColFilterPrefix(inp.value);

            if (!raw) {
                // Empty field: clear any error styling and skip
                inp.style.boxShadow   = '';
                inp.style.borderColor = '';
                inp.style.borderWidth = '';
                return;
            }

            // Helper: resolve the human-readable column name for error messages.
            const colIdx  = parseInt(inp.dataset.colIdx, 10);
            const headers = table.querySelectorAll('thead tr:first-child th');
            const colName = headers[colIdx]
                ? headers[colIdx].textContent.replace(/[⇅▲▼⁰-⁹]/g, '').trim()
                : `Col ${colIdx}`;

            if (isRegExp) {
                // Validate the regexp before accepting it
                try {
                    new RegExp(raw, isCaseSensitive ? '' : 'i'); // dry-run
                    // Valid: normal active indicator
                    inp.style.boxShadow   = '0 0 2px 2px green';
                    inp.style.borderColor = '';
                    inp.style.borderWidth = '';
                    // ── Bug-fix 1: keep `val` as the raw pattern — do NOT lowercase
                    // regexp patterns. The 'i' flag in testRowMatch handles case.
                    // Lowercasing would break character-class ranges like [A-Z].
                    const val = isRegExp ? raw : (isCaseSensitive ? raw : raw.toLowerCase());
                    result.push({ val, idx: colIdx });
                } catch (e) {
                    // Invalid: 4 px error border
                    inp.style.boxShadow   = '';
                    inp.style.borderColor = filterBorderError();
                    inp.style.borderWidth = '4px';
                    const msg = `⚠ Column "${colName}": invalid regexp: ${e.message}`;
                    // ── Multi-table: write directly to the h3 status span and tag it
                    //    so the post-filter loop knows not to overwrite it.
                    if (statusSpan) {
                        statusSpan.textContent = msg;
                        statusSpan.style.color = filterBorderError();
                        statusSpan.dataset.colRxError = '1';
                    }
                    // ── Single-table (and multi-table): also collect for the caller.
                    result._rxErrors.push(msg);
                    // Skip this filter so it doesn't silently break row-matching
                }
            } else {
                inp.style.boxShadow   = '0 0 2px 2px green';
                inp.style.borderColor = '';
                inp.style.borderWidth = '';
                const val = isCaseSensitive ? raw : raw.toLowerCase();
                result.push({ val, idx: colIdx });
            }
        });

        return result;
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
        let regexpError = null; // holds the Error message when the pattern is invalid
        if (globalQueryRaw && isRegExp) {
            try {
                globalRegex = new RegExp(globalQueryRaw, isCaseSensitive ? '' : 'i');
                // Valid regexp (or non-regexp mode): show active border
                setGlobalFilterBorder(gfBorderActive());
            } catch (e) {
                regexpError = e.message; // remember for the status display
                setGlobalFilterBorder(filterBorderError(), '4px');
            }
        } else if (globalQueryRaw) {
            // Plain text filter with content
            setGlobalFilterBorder(gfBorderActive());
        } else {
            // Empty field — back to idle border
            setGlobalFilterBorder(gfBorderIdle());
        }

        // Show regexp parse error immediately in the status display (before the filter pass runs)
        if (regexpError && filterStatusDisplay) {
            filterStatusDisplay.textContent = `⚠ Invalid regexp: ${regexpError}`;
            filterStatusDisplay.style.color = filterBorderError();
            // Don't run the actual filter pass when the pattern is broken
            return;
        }

        // Apply box-shadow glow to global filter when active
        filterInput.style.boxShadow = globalQueryRaw ? `0 0 2px 2px ${gfBorderActive()}` : '';

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

            // Re-apply any active sub-table filters after global/column filter re-renders rows
            reapplyAllSubTableFilters();

            // After subtable filters ran, recalculate h2 count to reflect the
            // 3-tier (locally / globally / absolute-total) format when needed.
            updateH2CountFromSubtables();
        } else {
            const totalAbsolute = allRows.length;
            matchCtx.colFilters = getColFilters(document.querySelector('table.tbl'), isCaseSensitive, isRegExp);
            // ── Bug-fix 3: in single-table mode there is no h3 before the table,
            //    so getColFilters cannot write regexp errors to a sub-table status span.
            //    Capture any errors here so we can show them in filterStatusDisplay.
            const _singleColRxErrors = matchCtx.colFilters._rxErrors || [];
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
            const activeColCount = Array.from(activeColFilters).filter(inp => stripColFilterPrefix(inp.value)).length;
            if (activeColCount > 0) {
                filterParts.push(`${activeColCount} column filter${activeColCount > 1 ? 's' : ''}`);
            }

            const filterInfo = filterParts.length > 0 ? ` [${filterParts.join(', ')}]` : '';

            // On multi-table pages: show only global filter info in main status
            // On single-table pages: show all filter info
            if (activeDefinition.tableMode === 'multi') {
                const globalFilterInfo = globalQuery ? ` [global:"${globalQuery}"]` : '';

                // Build a label that reflects the active filter modes
                const activeModeParts = [];
                if (isRegExp)        activeModeParts.push('Regexp');
                if (isCaseSensitive) activeModeParts.push('Case-sensitive');
                if (isExclude)       activeModeParts.push('Exclude');
                const modeLabel = activeModeParts.length > 0
                    ? activeModeParts.join(' ') + ' filter'
                    : 'Global filter';

                filterStatusDisplay.textContent = `✓ ${modeLabel}${globalFilterInfo}`;
                filterStatusDisplay.style.color = 'green';

                // Update each sub-table filter status display with its specific info
                const tables = Array.from(document.querySelectorAll('table.tbl'))
                    .filter(t => t.querySelector('.mb-col-filter-row'));

                tables.forEach((table, tableIdx) => {
                    const h3 = table.previousElementSibling;
                    if (h3 && h3.classList.contains('mb-toggle-h3')) {
                        const subFilterStatus = h3.querySelector('.mb-filter-status');
                        if (subFilterStatus) {
                            // If getColFilters wrote a regexp-error message here, do NOT
                            // overwrite it with a success message — leave the error visible.
                            if (subFilterStatus.dataset.colRxError) return;

                            // Count active column filters in this specific table
                            const tableColFilters = Array.from(table.querySelectorAll('.mb-col-filter-input'))
                                .filter(inp => stripColFilterPrefix(inp.value));

                            const group = filteredArray[tableIdx];
                            const rowsInTable = group ? group.rows.length : 0;

                            if (tableColFilters.length > 0) {
                                const colFilterInfo = tableColFilters.map(inp => {
                                    const colIdx = parseInt(inp.dataset.colIdx, 10);
                                    const headers = table.querySelectorAll('thead tr:first-child th');
                                    const colName = headers[colIdx] ? headers[colIdx].textContent.replace(/[⇅▲▼]/g, '').trim() : `Col ${colIdx}`;
                                    return `${colName}:"${stripColFilterPrefix(inp.value)}"`;
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
                // Single table mode: show modeLabel and all filter info
                const singleActiveModeParts = [];
                if (isRegExp)        singleActiveModeParts.push('Regexp');
                if (isCaseSensitive) singleActiveModeParts.push('Case-sensitive');
                if (isExclude)       singleActiveModeParts.push('Exclude');
                const singleModeLabel = singleActiveModeParts.length > 0
                    ? singleActiveModeParts.join(' ') + ' filter'
                    : 'Global filter';
                // ── Bug-fix 3 continued: if any column regexp was invalid, show the
                //    first error instead of the success message so the user knows why
                //    their filter did not narrow the rows as expected.
                if (typeof _singleColRxErrors !== 'undefined' && _singleColRxErrors.length > 0) {
                    filterStatusDisplay.textContent = _singleColRxErrors[0];
                    filterStatusDisplay.style.color = filterBorderError();
                } else {
                    filterStatusDisplay.textContent = `✓ ${singleModeLabel}: ${rowCount} rows in ${filterDuration}ms${filterInfo}`;
                    filterStatusDisplay.style.color = filterDuration > 1000 ? 'red' : (filterDuration > 500 ? 'orange' : 'green');
                }
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

        // Inject synthetic column headers for every active column extractor.
        // Each extractor may declare one or more synthetic columns; we only add a
        // header when it is not already present (idempotent across re-renders).
        activeColumnExtractors.forEach(entry => {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            entry.syntheticColumns.forEach(colName => {
                if (!headersText.includes(colName)) {
                    const th = document.createElement('th');
                    th.textContent = colName;
                    th.style.backgroundColor = headerBgColor;
                    Lib.debug('cleanup', `Injecting synthetic header: ${colName} (via extractor: ${entry.extractor})`);
                    theadRow.appendChild(th);
                }
            });
        });

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
        // Build the unified column extractor list from the merged activeDefinition.
        // This replaces the former typesWithSplitCD/Location/Area boolean-flag arrays.
        activeColumnExtractors = buildActiveColumnExtractors(activeDefinition);

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
            inp.style.backgroundColor = '';
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
            const proceedConfirmed = await Lib.showCustomConfirm(
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

        // Show the inline fetch progress bar
        fetchProgressWrap.style.display = 'inline-flex';
        fetchProgressFill.style.width = '0%';
        fetchProgressFill.style.background = '#ffcccc'; // light red, matching action-button palette
        fetchProgressLabel.textContent = 'Loading…';
        fetchProgressLabel.style.color = '#333';

        const startTime = performance.now();
        let fetchingTimeStart = performance.now();
        let totalFetchingTime = 0;
        let totalRenderingTime = 0;

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

                    // Reset column indices for all active extractors before scanning each page.
                    // Headers may theoretically vary across pages; resetting prevents stale indices.
                    activeColumnExtractors.forEach(entry => { entry.colIdx = -1; });

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

                        // Resolve source-column indices for active column extractors
                        activeColumnExtractors.forEach(entry => {
                            if (txt === entry.sourceColumn) entry.colIdx = idx;
                        });

                        // Dynamic detection based on config candidates
                        // We only search if mainColIdx wasn't already forced by a number config
                        if (mainColIdx === -1 && mainColCandidates.includes(txt)) {
                            mainColIdx = idx;
                        }
                    });
                }

                // Updated Debug Output with Column Names and Extractor summary
                const extractorSummary = activeColumnExtractors.length
                    ? activeColumnExtractors.map(e => `${e.extractor}("${e.sourceColumn}"@${e.colIdx})`).join(', ')
                    : 'none';
                Lib.debug(
                    'indices',
                    `Detected indices → mainColIdx=${mainColIdx} (${headerNames[mainColIdx] || 'N/A'}), extractors=[${extractorSummary}], excluded=[${indicesToExclude.join(',')}] for pageType: ${pageType}`
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

                                    // --- Run all active column extractors BEFORE column deletion.
                                    // colIdx references into newRow are only valid while the cell
                                    // count matches the fetched DOM; deleteCell() below shifts them.
                                    // Each extractor returns an array of new <td> elements (one per
                                    // declared syntheticColumn).  We accumulate them here and append
                                    // them after deletion so they land at the end of the row.
                                    const extractedSyntheticCells = activeColumnExtractors.map(entry => {
                                        if (entry.colIdx === -1) {
                                            // Source column not present on this page — emit empty cells
                                            return entry.syntheticColumns.map(() => document.createElement('td'));
                                        }
                                        const sourceCell = newRow.cells[entry.colIdx];
                                        if (!sourceCell) {
                                            Lib.warn('extract', `colIdx ${entry.colIdx} out of range for extractor "${entry.extractor}" (row has ${newRow.cells.length} cells)`);
                                            return entry.syntheticColumns.map(() => document.createElement('td'));
                                        }
                                        if (typeof ColumnDataExtractor[entry.extractor] !== 'function') {
                                            Lib.error('extract', `Unknown extractor function: "${entry.extractor}"`);
                                            return entry.syntheticColumns.map(() => document.createElement('td'));
                                        }
                                        const result = ColumnDataExtractor[entry.extractor](sourceCell);
                                        // Pad or trim to declared syntheticColumns length for structural consistency
                                        while (result.length < entry.syntheticColumns.length) result.push(document.createElement('td'));
                                        return result.slice(0, entry.syntheticColumns.length);
                                    });

                                    // Delete excluded columns (descending order preserves index stability)
                                    [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });

                                    // Append synthetic cells from all extractors in declaration order
                                    extractedSyntheticCells.forEach(cells => cells.forEach(td => newRow.appendChild(td)));

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

                // Drive the inline progress bar in the h1 controls line
                const fillPct = Math.round(progress * 100);
                // Use the same light-toned palette as the action button backgrounds:
                // light red → light orange → light green (mirrors #ffcccc / #ffe0b2 / #ccffcc).
                const fillColor = progress >= 1.0 ? '#ccffcc' : (progress >= 0.5 ? '#ffe0b2' : '#ffcccc');
                fetchProgressFill.style.width = `${fillPct}%`;
                fetchProgressFill.style.background = fillColor;
                fetchProgressLabel.textContent =
                    `Loading page ${p} of ${maxPage}... (${totalRowsAccumulated} rows) - ${estRemainingSeconds.toFixed(1)}s left`;

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
                    fetchProgressWrap.style.display = 'none';

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
                    fetchProgressWrap.style.display = 'none';
                    return;
                }
                // If userChoice === 'render', continue with normal rendering below
            }

            // --- RENDER WARNING THRESHOLD ---
            // A lighter second gate: if row count exceeds the warning threshold, confirm
            // before rendering to let the user bail out of a potentially slow operation.
            const renderWarnThreshold = Lib.settings.sa_render_warning_threshold ?? 10000;
            if (renderWarnThreshold > 0 && totalRows > renderWarnThreshold) {
                const proceed = await Lib.showCustomConfirm(
                    `You are about to render ${totalRows.toLocaleString()} rows into the page.\n\n` +
                    `This is above your configured warning threshold of ${renderWarnThreshold.toLocaleString()} rows ` +
                    `and may cause the browser to become slow or unresponsive during rendering.\n\n` +
                    `Proceed with rendering?`,
                    '⚠️ Large Render Warning',
                    activeBtn
                );
                if (!proceed) {
                    Lib.warn('render', `User aborted render at warning threshold (${totalRows} rows).`);
                    activeBtn.disabled = false;
                    activeBtn.classList.remove('mb-show-all-btn-loading');
                    allActionButtons.forEach(b => b.disabled = false);
                    stopBtn.style.display = 'none';
                    delete ctrlMFunctionMap['o'];
                    globalStatusDisplay.textContent = `Render cancelled (${totalRows.toLocaleString()} rows fetched — use "Load from disk" to render later)`;
                    globalStatusDisplay.style.color = 'orange';
                    fetchProgressWrap.style.display = 'none';
                    return;
                }
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
            fetchProgressWrap.style.display = 'none';

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
            // Focus the global filter input after rendering so users can start
            // typing a filter query immediately without a manual click.
            setTimeout(() => {
                const _gfi = document.getElementById('mb-global-filter-input') ||
                             document.querySelector('.mb-global-filter input');
                if (_gfi) {
                    _gfi.focus();
                    Lib.debug('ui', 'Auto-focused global filter input after final render');
                }
            }, 150);
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
            globalStatusDisplay.textContent = `Loaded ${pagesProcessed} ${pageLabel} (${totalRows} rows) from MusicBrainz, Fetching time: ${fetchSeconds}s, Rendering time: ${renderSeconds}s`;
            fetchProgressWrap.style.display = 'none';

            Lib.debug('success', `Process complete. Final Row Count: ${totalRowsAccumulated}. Total Time: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);
        } catch (err) {
            Lib.error('fetch', 'Critical Error during fetch:', err);
            globalStatusDisplay.textContent = 'Error during load… (repress the "Show all" button)';
            fetchProgressWrap.style.display = 'none';
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

        // Re-apply multi-sort column tints if a multi-sort is active for this table.
        // renderFinalTable replaces all tbody content with fresh clones that carry no tint
        // classes, so tints must be repainted after every render.
        const tintEntry = multiSortTintRegistry.get('main_table');
        if (tintEntry) tintEntry.applyTints();
    }

    /**
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
     * Creates and returns a per-subtable filter container (toggle icon + filter UI).
     *
     * The returned object exposes:
     *   - toggleIcon  : the 🔍 span that the caller inserts after mb-row-count-stat
     *   - container   : the filter UI span (.mb-subtable-filter-container) that the caller appends
     *
     * The toggle icon starts in "off" state; clicking it shows/hides the container and
     * wires up keyboard handling.  Each call produces entirely independent DOM nodes so
     * that multiple subtables never share state.
     *
     * @param {string}          categoryName  - Human-readable subtable name (e.g. "Album")
     * @param {HTMLTableElement} table         - The <table> this filter applies to
     * @returns {{ toggleIcon: HTMLElement, container: HTMLElement, highlightBtn: HTMLButtonElement, clearAllStfBtn: HTMLButtonElement }}
     */
    function createSubTableFilterContainer(categoryName, table) {
        // Sanitize categoryName to a safe id fragment (strip non-alphanumeric)
        const safeId = categoryName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const pfx    = `mb-stf-${safeId}`;

        // ── Toggle icon (🔍) ──────────────────────────────────────────────────
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'mb-subtable-filter-toggle-icon';
        toggleIcon.textContent = '🔍';
        toggleIcon.title = 'Toggle filter elements on/off for this section';
        toggleIcon.setAttribute('role', 'button');
        toggleIcon.setAttribute('aria-label', `Toggle sub-table filter for "${categoryName}"`);

        // ── Filter input wrapper ───────────────────────────────────────────────
        const filterWrapper = document.createElement('span');
        filterWrapper.className = 'mb-subtable-filter-wrapper';

        const filterInput = document.createElement('input');
        filterInput.id = `${pfx}-input`;
        filterInput.type = 'text';
        filterInput.placeholder = `Filter "${categoryName}"… just in this sub-table`;
        filterInput.title = `Filter rows in the "${categoryName}" sub-table`;
        const _stfW = (Lib.settings.sa_subtable_filter_initial_width ?? 320) + 'px';
        filterInput.style.cssText = `font-size:1em; padding:2px 6px; border:2px solid ${stfBorderIdle()}; border-radius:3px 0 0 3px; width:${_stfW}; height:24px; box-sizing:border-box; transition:box-shadow 0.2s;`;

        // ── Clear (✕) strip ───────────────────────────────────────────────────
        const clearBtn = document.createElement('span');
        clearBtn.id = `${pfx}-clear`;
        clearBtn.title = `Clear filter for "${categoryName}"`;
        clearBtn.textContent = '✕';
        clearBtn.style.cssText = [
            'display:inline-flex; align-items:center; justify-content:center;',
            'width:18px; flex-shrink:0;',
            'cursor:pointer; user-select:none;',
            'font-size:0.65em; color:rgb(153,153,153);',
            `border:2px solid ${stfBorderIdle()}; border-left:none; border-right:none;`,
            'background:#fafafa;',
            'transition:color 0.15s, background 0.15s;'
        ].join(' ');
        clearBtn.onmouseenter = () => { clearBtn.style.color = '#c00'; clearBtn.style.background = '#fee'; };
        clearBtn.onmouseleave = () => { clearBtn.style.color = 'rgb(153,153,153)'; clearBtn.style.background = '#fafafa'; };

        // ── Resize drag handle ────────────────────────────────────────────────
        const stfDragHandle = document.createElement('span');
        stfDragHandle.title = 'Drag to resize filter field';
        stfDragHandle.style.cssText = [
            'display:inline-flex; align-items:center; justify-content:center;',
            'width:10px; flex-shrink:0;',
            'cursor:col-resize; user-select:none;',
            `border:2px solid ${stfBorderIdle()}; border-left:none;`,
            'border-radius:0 3px 3px 0;',
            'background:#f0f0f0;',
            'font-size:7px; color:#aaa; letter-spacing:-1px;'
        ].join(' ');
        stfDragHandle.textContent = '⋮';

        stfDragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX     = e.clientX;
            const startWidth = filterInput.offsetWidth;
            const onMove = (ev) => {
                const newW = Math.max(60, startWidth + (ev.clientX - startX));
                filterInput.style.width = newW + 'px';
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup',   onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup',   onUp);
        });

        filterWrapper.appendChild(filterInput);
        filterWrapper.appendChild(clearBtn);
        filterWrapper.appendChild(stfDragHandle);

        // ── Case-sensitive checkbox ───────────────────────────────────────────
        const caseCheckbox = document.createElement('input');
        caseCheckbox.id = `${pfx}-case-checkbox`;
        caseCheckbox.type = 'checkbox';
        caseCheckbox.style.cssText = 'margin-right:2px; vertical-align:middle;';

        const caseLabel = document.createElement('label');
        caseLabel.id = `${pfx}-case-label`;
        caseLabel.htmlFor = caseCheckbox.id;
        caseLabel.title = 'Case Sensitive Filtering';
        caseLabel.style.cssText = 'font-size:0.8em; cursor:pointer; display:flex; align-items:center; margin:0; user-select:none; font-weight:normal; height:24px;';
        caseLabel.appendChild(caseCheckbox);
        caseLabel.appendChild(document.createTextNode('Cc'));

        // ── RegExp checkbox ───────────────────────────────────────────────────
        const rxCheckbox = document.createElement('input');
        rxCheckbox.id = `${pfx}-rx-checkbox`;
        rxCheckbox.type = 'checkbox';
        rxCheckbox.style.cssText = 'margin-right:2px; vertical-align:middle;';

        const rxLabel = document.createElement('label');
        rxLabel.id = `${pfx}-rx-label`;
        rxLabel.htmlFor = rxCheckbox.id;
        rxLabel.title = 'RegExp Filtering';
        rxLabel.style.cssText = 'font-size:0.8em; cursor:pointer; display:flex; align-items:center; margin:0; user-select:none; font-weight:normal; height:24px;';
        rxLabel.appendChild(rxCheckbox);
        rxLabel.appendChild(document.createTextNode('Rx'));

        // ── Exclude checkbox ──────────────────────────────────────────────────
        const exCheckbox = document.createElement('input');
        exCheckbox.id = `${pfx}-ex-checkbox`;
        exCheckbox.type = 'checkbox';
        exCheckbox.style.cssText = 'margin-right:2px; vertical-align:middle;';

        const exLabel = document.createElement('label');
        exLabel.id = `${pfx}-ex-label`;
        exLabel.htmlFor = exCheckbox.id;
        exLabel.title = `Exclude matches (Filter for "${categoryName}")`;
        exLabel.style.cssText = 'font-size:0.8em; cursor:pointer; display:flex; align-items:center; margin:0; user-select:none; font-weight:normal; height:24px;';
        exLabel.appendChild(exCheckbox);
        exLabel.appendChild(document.createTextNode('Ex'));

        // ── "Clear ALL COLUMN filters" button (inside STF panel) ────────────────
        // Visible only while the STF input contains text.  Clicking it clears only
        // the column-level filter inputs for this table — the STF input itself is
        // left untouched so the sub-table filter keeps filtering.
        const clearAllStfBtn = document.createElement('button');
        clearAllStfBtn.id = `${pfx}-clear-all-btn`;
        clearAllStfBtn.className = 'mb-stf-clear-col-btn';
        clearAllStfBtn.type = 'button';
        clearAllStfBtn.title = 'Clear all COLUMN filters for this sub-table (sub-table filter is kept)';
        // Create red ✗ symbol
        const _xSym = document.createElement('span');
        _xSym.textContent = '✗ ';
        _xSym.style.cssText = 'color:red; font-size:1em; font-weight:bold;';
        clearAllStfBtn.appendChild(_xSym);
        clearAllStfBtn.appendChild(document.createTextNode('Clear all COLUMN filters'));
        // Initially hidden — shown by updateInputStyle() when STF input has text
        clearAllStfBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; border-radius:4px; background:rgb(240,240,240); border:1px solid rgb(204,204,204); cursor:pointer; vertical-align:middle; display:none;';

        // ── Highlight toggle button ───────────────────────────────────────────
        const highlightBtn = document.createElement('button');
        highlightBtn.id = `${pfx}-toggle-filter-highlight-btn`;
        highlightBtn.type = 'button';
        highlightBtn.title = 'Toggle filter highlighting on/off (sub-table filter and column filters)';
        highlightBtn.textContent = '🎨 Toggle highlighting';
        // Initially hidden — shown by updateFilterButtonsVisibility() as soon as any
        // filter (subtable input or column filter) is active for this subtable.
        highlightBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; border-radius:4px; background:rgb(240,240,240); border:1px solid rgb(204,204,204); cursor:pointer; vertical-align:middle; transition:background-color 0.3s; display:none;';

        // ── Container ─────────────────────────────────────────────────────────
        const container = document.createElement('span');
        container.className = 'mb-subtable-filter-container';
        container.dataset.categoryName = categoryName;
        container.appendChild(filterWrapper);
        container.appendChild(caseLabel);
        container.appendChild(rxLabel);
        container.appendChild(exLabel);
        // NOTE: highlightBtn is intentionally NOT appended to the container here;
        // it lives in subTableControls so it remains visible even when the
        // subtable-filter panel is collapsed and only column filters are active.
        container.appendChild(clearAllStfBtn); // inside the collapsible panel

        // ── State ─────────────────────────────────────────────────────────────
        let highlightEnabled = true;

        /**
         * Updates the border/shadow of the filter input to reflect active state.
         */
        /**
         * Updates the border/shadow of the sub-table filter input to reflect its current state.
         * Idle (empty) → stfBorderIdle(); active (has text) → stfBorderActive().
         * Error state is set separately by applySubFilter when regexp is invalid.
         * NOTE: clearAllStfBtn visibility is intentionally NOT managed here — it is
         * controlled by updateFilterButtonsVisibility().
         */
        function updateInputStyle() {
            if (filterInput.value) {
                filterInput.style.boxShadow = `0 0 2px 2px ${stfBorderActive()}`;
                setSubTableFilterBorder(filterInput, stfBorderActive());
            } else {
                filterInput.style.boxShadow = '';
                setSubTableFilterBorder(filterInput, stfBorderIdle());
            }
        }

        /**
         * Updates the row-count badge in the h3 preceding this subtable.
         *
         * Three display modes:
         *   No active filter  → (total)
         *   Global filter only → (globally_filtered of total)
         *   Subtable filter   → (locally_filtered of globally_filtered)/total
         *
         * "total" is the unfiltered row count stored in table.dataset.mbTotalRows at
         * initial render time and never overwritten by subsequent filter passes.
         * "globally_filtered" (denominator) = visible rows + rows hidden only by the
         *   subtable filter (data-mb-stf-hidden).
         * "locally_filtered" (numerator) = rows currently visible (not hidden by anything).
         */
        function updateSubTableRowCount() {
            const h3 = table.previousElementSibling;
            if (!h3) return;
            const countStat = h3.querySelector('.mb-row-count-stat');
            if (!countStat) return;

            const allTbodyRows = Array.from(table.querySelectorAll('tbody tr'));

            // Total rows in unfiltered subtable (stored at initial render)
            const total = parseInt(table.dataset.mbTotalRows || '0', 10) || allTbodyRows.length;

            // Denominator: rows visible before the subtable filter ran
            // = currently visible + rows hidden only by this subtable filter
            const denominator = allTbodyRows.filter(r =>
                r.style.display !== 'none' || r.dataset.mbStfHidden
            ).length;

            // Numerator: rows currently visible (passes all filters)
            const visible = allTbodyRows.filter(r => r.style.display !== 'none').length;

            if (filterInput.value) {
                // Subtable filter active: (locally of globally)/total
                // When globally_filtered already equals total, omit the /total suffix
                // to avoid redundant information (mirrors the h3 initial-render behaviour).
                if (denominator === total) {
                    countStat.textContent = `(${visible} of ${denominator})`;
                } else {
                    countStat.textContent = `(${visible} of ${denominator})/${total}`;
                }
            } else {
                // No subtable filter active: (globally_filtered of total) or plain (total)
                countStat.textContent = (denominator === total) ? `(${denominator})` : `(${denominator} of ${total})`;
            }
        }

        /**
         * Runs the subtable-specific filter against the currently visible rows
         * of the associated table.  Rows that pass the filter are shown; those
         * that fail are hidden.  Active filter-string matches are highlighted
         * with the .mb-subtable-filter-highlight class.
         */
        function applySubFilter() {
            const raw     = filterInput.value;
            const useCase = caseCheckbox.checked;
            const useRx   = rxCheckbox.checked;
            const useEx   = exCheckbox.checked;

            updateInputStyle();

            if (!table) return;

            // ── Step 1: Always restore rows that were hidden by a PREVIOUS subtable
            //    filter run.  This is essential when the user edits (or deletes chars
            //    from) the filter string: rows hidden by the old filter must be
            //    re-evaluated against the new string.
            //    We only restore rows that carry our own stf-hidden marker; rows
            //    hidden by the global / column filters (no marker) are untouched.
            table.querySelectorAll('tbody tr[data-mb-stf-hidden]').forEach(row => {
                row.style.display = '';
                delete row.dataset.mbStfHidden;
            });

            // ── Step 2: Always clear existing subtable highlights (all rows)
            table.querySelectorAll('.mb-subtable-filter-highlight').forEach(n => {
                n.replaceWith(document.createTextNode(n.textContent));
            });

            // Nothing to filter — we already restored rows above, so just return.
            if (!raw) {
                updateSubTableRowCount();
                return;
            }

            // ── Step 3: Build matcher regex ───────────────────────────────────
            let regex = null;
            if (useRx) {
                try {
                    regex = new RegExp(`(${raw})`, useCase ? 'g' : 'gi');
                    // Valid regexp — restore active border (may have previously been error)
                    setSubTableFilterBorder(filterInput, stfBorderActive());
                    // Clear any previous regexp error from the sub-table status span
                    const _h3ok = table ? table.previousElementSibling : null;
                    const _stOk = _h3ok ? _h3ok.querySelector('.mb-filter-status') : null;
                    if (_stOk && _stOk.dataset.rxError) {
                        _stOk.textContent = '';
                        delete _stOk.dataset.rxError;
                    }
                } catch (e) {
                    // Invalid regexp — bold 4 px error border + message in the sub-table status span
                    setSubTableFilterBorder(filterInput, filterBorderError(), '4px');
                    filterInput.style.boxShadow = '';
                    const _h3err = table ? table.previousElementSibling : null;
                    const _stErr = _h3err ? _h3err.querySelector('.mb-filter-status') : null;
                    if (_stErr) {
                        _stErr.textContent = `⚠ Invalid regexp: ${e.message}`;
                        _stErr.style.color = filterBorderError();
                        _stErr.dataset.rxError = '1';
                    }
                    return; // Invalid regexp – abort without hiding any rows
                }
            } else {
                regex = new RegExp(`(${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, useCase ? 'g' : 'gi');
            }

            const query = (useCase || useRx) ? raw : raw.toLowerCase();

            // ── Step 4: Evaluate every row that is currently visible (i.e. not
            //    hidden by the global / column filter — those rows have no stf-hidden
            //    marker and their display is already 'none' from the outer filter).
            Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
                // Skip rows hidden by global/column filter (they have no stf-hidden
                // marker but their display is 'none').
                if (row.style.display === 'none') return;

                // ── Test the row ───────────────────────────────────────────────
                let matchFound = false;
                if (useRx) {
                    try {
                        matchFound = Array.from(row.cells).some(cell =>
                            new RegExp(raw, useCase ? '' : 'i').test(cell.textContent || '')
                        );
                    } catch (e) {
                        matchFound = false;
                    }
                } else {
                    const text = Array.from(row.cells).map(c => c.textContent || '').join('\t');
                    matchFound = useCase ? text.includes(query) : text.toLowerCase().includes(query);
                }

                const show = useEx ? !matchFound : matchFound;

                if (!show) {
                    // Mark and hide — our own marker distinguishes this from global/column hiding
                    row.dataset.mbStfHidden = '1';
                    row.style.display = 'none';
                } else {
                    // Row passes: apply highlight if enabled and not in exclude mode
                    if (highlightEnabled && !useEx) {
                        row.querySelectorAll('td').forEach(td => {
                            // Merge any adjacent text-node fragments that were left by a
                            // previous highlight cycle (each cleared span is replaced with a
                            // new text node, splitting e.g. "band" into "b"+"and").
                            // Without this, a multi-character pattern never matches any single
                            // fragment and highlighting silently disappears after the first char.
                            td.normalize();

                            // Collect text nodes first (before mutating the DOM) to
                            // avoid invalidating the TreeWalker mid-traversal.
                            const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT, {
                                acceptNode: (n) => {
                                    const tag = n.parentNode?.tagName?.toLowerCase();
                                    return (tag === 'script' || tag === 'style')
                                        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
                                }
                            }, false);
                            let node;
                            const hits = [];
                            while ((node = walker.nextNode())) {
                                let match = false;
                                if (useRx) {
                                    try { match = new RegExp(raw, useCase ? '' : 'i').test(node.nodeValue); }
                                    catch (e) { /* ignore */ }
                                } else {
                                    match = useCase
                                        ? node.nodeValue.includes(raw)
                                        : node.nodeValue.toLowerCase().includes(query);
                                }
                                if (match) hits.push(node);
                            }
                            // Replace matching text nodes with highlight-wrapped spans.
                            // Using a DocumentFragment avoids leaving orphaned wrapper
                            // spans when the same cell is re-processed across filter runs.
                            hits.forEach(textNode => {
                                const frag = document.createDocumentFragment();
                                const tmp  = document.createElement('span');
                                tmp.innerHTML = textNode.nodeValue.replace(
                                    regex,
                                    '<span class="mb-subtable-filter-highlight">$1</span>'
                                );
                                while (tmp.firstChild) frag.appendChild(tmp.firstChild);
                                textNode.parentNode.replaceChild(frag, textNode);
                            });
                        });
                    }
                }
            });

            updateSubTableRowCount();
            // Sync h2 badge with 3-tier subtable totals
            if (typeof updateH2CountFromSubtables === 'function') updateH2CountFromSubtables();
            // Show/hide the per-subtable "Clear all filters" and "Toggle highlighting"
            // buttons based on whether the STF input (or any column filter) is now active.
            if (typeof window.updateFilterButtonsVisibility === 'function') {
                window.updateFilterButtonsVisibility();
            }
        }

        /**
         * Restores rows hidden by this subtable filter (data-mb-stf-hidden attribute)
         * and removes all subtable-filter highlights.
         * Does NOT affect rows hidden by global/column filters.
         */
        function clearSubFilter() {
            if (!table) return;
            // Restore rows our filter hid
            table.querySelectorAll('tbody tr[data-mb-stf-hidden]').forEach(row => {
                row.style.display = '';
                delete row.dataset.mbStfHidden;
            });
            // Remove highlight spans — replaceWith a plain text node to keep content
            table.querySelectorAll('.mb-subtable-filter-highlight').forEach(n => {
                n.replaceWith(document.createTextNode(n.textContent));
            });

            updateInputStyle();      // ← reset green border / box-shadow
            updateSubTableRowCount();
            // Sync h2 badge with 3-tier subtable totals
            if (typeof updateH2CountFromSubtables === 'function') updateH2CountFromSubtables();
            // Update per-subtable button visibility now that the STF is empty
            if (typeof window.updateFilterButtonsVisibility === 'function') {
                window.updateFilterButtonsVisibility();
            }
        }

        // ── "Clear ALL COLUMN filters" button handler ────────────────────────────
        clearAllStfBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Clear only column-level filter inputs for this table.
            // The STF input is intentionally left alone so the sub-table filter
            // continues to filter rows while the column filters are wiped.
            if (table) {
                table.querySelectorAll('.mb-col-filter-input').forEach(inp => {
                    inp.value = '';
                    inp.style.backgroundColor = '';
                    inp.style.boxShadow = '';
                });
            }
            // Re-run the global filter so column-filter row visibility is refreshed.
            if (typeof runFilter === 'function') runFilter();
            Lib.debug('filter', `STF in-panel "Clear all COLUMN filters" clicked for "${categoryName}": column filters cleared, STF kept`);
        });

        // ── Event wiring ─────────────────────────────────────────────────────
        const debouncedApply = debounce(applySubFilter, Lib.settings.sa_filter_debounce_delay || 300);
        filterInput.addEventListener('input', debouncedApply);

        [caseCheckbox, rxCheckbox, exCheckbox].forEach(cb => {
            cb.addEventListener('change', applySubFilter);
        });

        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterInput.value = '';
            clearSubFilter();
        });

        // Escape key: first press clears the input; second press blurs
        filterInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (filterInput.value.trim() !== '') {
                filterInput.value = '';
                clearSubFilter();
            } else {
                filterInput.blur();
            }
        });

        // Highlight toggle button
        highlightBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            highlightEnabled = !highlightEnabled;
            if (highlightEnabled) {
                highlightBtn.style.backgroundColor = '';
                highlightBtn.style.color = '';
                // Re-apply sub-table filter highlights
                applySubFilter();
                // Re-apply column filter highlights for this table (via runFilter)
                if (typeof runFilter === 'function') runFilter();
                Lib.debug('highlight', `Sub-table filter highlighting ON for "${categoryName}"`);
            } else {
                highlightBtn.style.backgroundColor = '#90ee90';
                highlightBtn.style.color = '#000';
                // Remove ALL filter highlights from this table (subtable + column)
                if (table) {
                    table.querySelectorAll(
                        '.mb-subtable-filter-highlight, .mb-column-filter-highlight'
                    ).forEach(n => {
                        n.replaceWith(document.createTextNode(n.textContent));
                    });
                }
                Lib.debug('highlight', `Sub-table filter highlighting OFF for "${categoryName}"`);
            }
        });

        // ── Toggle-icon wiring ────────────────────────────────────────────────
        toggleIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isVisible = container.classList.contains('visible');
            if (isVisible) {
                container.classList.remove('visible');
                toggleIcon.classList.remove('active');
                // Clear the filter when closing
                if (filterInput.value) {
                    filterInput.value = '';
                    clearSubFilter();
                }
                Lib.debug('filter', `Sub-table filter hidden for "${categoryName}"`);
            } else {
                container.classList.add('visible');
                toggleIcon.classList.add('active');
                setTimeout(() => filterInput.focus(), 50);
                Lib.debug('filter', `Sub-table filter shown for "${categoryName}"`);
            }
        });

        return { toggleIcon, container, highlightBtn, clearAllStfBtn };
    }

    /**
     * Recalculates and updates the h2 row-count badge from current DOM state of all
     * subtables after global + subtable filters have been applied.
     *
     * Mirrors the 3-tier format used by updateSubTableRowCount():
     *   No active subtable filter → relies on prior updateH2Count() call (no-op here)
     *   Subtable filter active    → (sum_locally_visible of sum_globally_visible)/sum_total
     *
     * Sums over all script-owned subtables (those with a .mb-col-filter-row in their thead).
     */
    function updateH2CountFromSubtables() {
        const tables = Array.from(document.querySelectorAll('table.tbl'))
            .filter(t => t.querySelector('.mb-col-filter-row'));

        if (tables.length === 0) return;

        const anySubtableFilterActive = Array.from(
            document.querySelectorAll('.mb-subtable-filter-container.visible input[type="text"]')
        ).some(inp => inp.value.trim() !== '');

        if (!anySubtableFilterActive) return; // h2 already correct from updateH2Count()

        let sumTotal    = 0;
        let sumDenominator = 0;
        let sumVisible  = 0;

        tables.forEach(table => {
            const total = parseInt(table.dataset.mbTotalRows || '0', 10);
            const allRows = Array.from(table.querySelectorAll('tbody tr'));
            const denominator = allRows.filter(r =>
                r.style.display !== 'none' || r.dataset.mbStfHidden
            ).length;
            const visible = allRows.filter(r => r.style.display !== 'none').length;

            sumTotal       += total || allRows.length;
            sumDenominator += denominator;
            sumVisible     += visible;
        });

        // Pass (locally, globally, absolute-total) to updateH2Count
        updateH2Count(sumVisible, sumDenominator, sumTotal);
    }

    /**
     * Re-applies all active subtable filters after a global/column filter run, so that
     * rows newly made visible by global filter changes are still correctly filtered by
     * their subtable filter.  Calls applySubFilter() via the container's stored closure.
     *
     * Called at the end of runFilter() for multi-table pages.
     */
    function reapplyAllSubTableFilters() {
        document.querySelectorAll('.mb-subtable-filter-container.visible').forEach(container => {
            // Find the input inside this container and dispatch an input event to re-run its filter
            const input = container.querySelector('input[type="text"]');
            if (input && input.value) {
                input.dispatchEvent(new Event('input', { bubbles: false }));
            }
        });
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
                    const highlightSubBtn = createSubTableHighlightButton(table, categoryName);

                    const subFilterStatus = document.createElement('span');
                    subFilterStatus.className = 'mb-filter-status';
                    subFilterStatus.dataset.tableName = categoryName;
                    subFilterStatus.dataset.tableIndex = index.toString();

                    const subSortStatus = document.createElement('span');
                    subSortStatus.className = 'mb-sort-status';
                    subSortStatus.dataset.tableName = categoryName;
                    subSortStatus.dataset.tableIndex = index.toString();

                    subTableControls.appendChild(clearSubBtn);
                    subTableControls.appendChild(highlightSubBtn);
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

            // After rows are in the DOM: re-apply any active multi-sort tints for this table.
            // This covers the reuse-existing-table branch (query truthy) where
            // makeTableSortableUnified is NOT called, so the trailing restore block never fires.
            // The new-table branch handles itself via makeTableSortableUnified's trailing block.
            if (query && existingTables[index]) {
                const tintKey = `${categoryName}_${index}`;
                const tintEntry = multiSortTintRegistry.get(tintKey);
                if (tintEntry) tintEntry.applyTints();
            }

            if (!query) {
                // Logic changed: Do not hide the table or H3 even if group.rows.length is 0
                table.style.display = '';
                h3.style.display = '';

                // Defensive check: ensure category exists, fallback to "Unknown"
                const categoryName = group.category || group.key || 'Unknown';
                const catLower = categoryName.toLowerCase();
                // Auto-expand when: only a single sub-table on the page, OR the well-known
                // categories 'album'/'official' have a small enough row count.
                const isSingleSubTable = dataArray.length === 1;
                const shouldStayOpen = isSingleSubTable ||
                    ((catLower === 'album' || catLower === 'official') && group.rows.length < Lib.settings.sa_auto_expand);
                table.style.display = shouldStayOpen ? '' : 'none';
                Lib.debug('render', `Group "${categoryName}" auto-expand status: ${shouldStayOpen} (singleSubTable=${isSingleSubTable})`);

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
                // Store the unfiltered total row count for this subtable so that
                // updateSubTableRowCount() can reference it after global/subtable filtering.
                table.dataset.mbTotalRows = group.rows.length;

                // ── Sub-table filter toggle icon + filter container ────────────────
                const stfResult = createSubTableFilterContainer(categoryName, table);
                // Insert toggle icon immediately after the mb-row-count-stat span
                const rowCountStat = h3.querySelector('.mb-row-count-stat');
                if (rowCountStat) {
                    rowCountStat.after(stfResult.toggleIcon);
                } else {
                    h3.appendChild(stfResult.toggleIcon);
                }
                // Append the filter container (initially hidden) to the h3
                h3.appendChild(stfResult.container);

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
                subTableControls.appendChild(stfResult.highlightBtn);
                subTableControls.appendChild(subFilterStatus);
                subTableControls.appendChild(subSortStatus);
                h3.appendChild(subTableControls);
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
                    // Allow clicks on the read-only status spans inside .mb-subtable-controls to pass through
                    const isStatusSpan = e.target.closest('.mb-filter-status') || e.target.closest('.mb-sort-status');
                    // Prevent triggering if clicking on interactive elements (buttons) or other parts of the controls bar
                    if (['A', 'BUTTON', 'INPUT', 'LABEL', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) ||
                        (!isStatusSpan && e.target.closest('.mb-subtable-controls')) ||
                        e.target.closest('.mb-subtable-filter-container') ||
                        e.target.classList.contains('mb-subtable-filter-toggle-icon')) {
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
                    const highlightSubBtn = createSubTableHighlightButton(table, categoryName);

                    const subFilterStatus = document.createElement('span');
                    subFilterStatus.className = 'mb-filter-status';
                    subFilterStatus.dataset.tableName = categoryName;
                    subFilterStatus.dataset.tableIndex = index.toString();

                    const subSortStatus = document.createElement('span');
                    subSortStatus.className = 'mb-sort-status';
                    subSortStatus.dataset.tableName = categoryName;
                    subSortStatus.dataset.tableIndex = index.toString();

                    subTableControls.appendChild(clearSubBtn);
                    subTableControls.appendChild(highlightSubBtn);
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

        // Strip any stale processed state from a previous invocation (e.g. after "Load from Disk"
        // on an already-rendered page).  The h2 DOM nodes are reused across re-renders, so their
        // mb-h2-processed marker, injected toggle icon, and old click handler must be reset before
        // we re-register everything with fresh contentNodes closures.
        allH2s.forEach(h2 => {
            h2.classList.remove('mb-h2-processed', 'mb-toggle-h2');
            const oldIcon = h2.querySelector(':scope > .mb-toggle-icon');
            if (oldIcon) oldIcon.remove();
            if (h2._mbClickHandler) {
                h2.removeEventListener('click', h2._mbClickHandler);
                h2._mbClickHandler = null;
            }
            h2._mbToggle = null;
        });

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
                // Detect clicks on the read-only status spans BEFORE the guard clause so they are
                // explicitly exempted from the filterContainer.contains() block below.
                // Both spans live inside filterContainer but are read-only labels that must propagate
                // the toggle rather than be silently blocked.
                // This mirrors the h3 handler pattern (isStatusSpan / !isStatusSpan guard).
                //
                // Detect a click on the ".mb-master-toggle" text label ("all Types") BEFORE the guard.
                // The interactive Show/Hide child <span>s each call e.stopPropagation() so they never
                // reach this handler; only clicks on the surrounding text node (whose event target is
                // the .mb-master-toggle element itself, not a child) arrive here.
                // Text nodes are not event targets — e.target will be .mb-master-toggle when the user
                // clicks the plain text, but will be the child <span> when clicking Show/Hide.
                //
                // Toggle semantics for all exempted areas (identical — normal header behaviour):
                //   plain click  → toggle THIS h2 only
                //   Ctrl+click   → toggle ALL h2 peers
                const isMasterToggleLabelClick = e.target.classList.contains('mb-master-toggle');
                const isStatusClick = e.target.closest('#mb-filter-status-display') ||
                                      e.target.closest('#mb-sort-status-display');

                // GUARD CLAUSE: Don't toggle if clicking on interactive elements (Filter input, Master Toggle links, Checkboxes).
                // isStatusClick spans and the master-toggle label text are exempted.
                // Note: Show/Hide <span>s inside .mb-master-toggle already call stopPropagation()
                //       so they never reach this handler — no additional guard needed for them.
                if (['A', 'BUTTON', 'INPUT', 'LABEL', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) ||
                    (!isMasterToggleLabelClick && e.target.closest('.mb-master-toggle')) ||
                    e.target.closest('.mb-subtable-filter-container') ||
                    e.target.classList.contains('mb-subtable-filter-toggle-icon') ||
                    (!isStatusClick && filterContainer && filterContainer.contains(e.target))) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                const isExpanding = icon.textContent === '▲';

                // All-toggle when Ctrl is held (anywhere on the h2 header).
                // Plain clicks — including on either status span — toggle only this h2.
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

            // Attach event listener directly to the H2 container.
            // Store the reference on the element so makeH2sCollapsible() can remove it on
            // the next invocation (e.g. after "Load from Disk" on an already-rendered page).
            h2._mbClickHandler = toggleFn;
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
        // Within each sorted column the tint alternates between two shades whenever the cell
        // value changes, making equal-value runs visually obvious.
        // Semi-transparent colours overlay the existing even/odd zebra striping.
        const applyMultiSortColumnTints = () => {
            // Clear any existing tint classes first so a re-apply starts clean
            clearMultiSortColumnTints();
            if (state.multiSortColumns.length === 0) return;

            // Two-shade pairs per priority (light / slightly-darker of the same hue)
            // Index 0 = first shade (run starts), index 1 = second shade (run changes)
            const bodyPairs = [
                ['mb-mscol-0a', 'mb-mscol-0b'],   // amber
                ['mb-mscol-1a', 'mb-mscol-1b'],   // sky-blue
                ['mb-mscol-2a', 'mb-mscol-2b'],   // mint
                ['mb-mscol-3a', 'mb-mscol-3b'],   // mauve
                ['mb-mscol-4a', 'mb-mscol-4b'],   // peach
                ['mb-mscol-5a', 'mb-mscol-5b'],   // teal
                ['mb-mscol-6a', 'mb-mscol-6b'],   // lavender
                ['mb-mscol-7a', 'mb-mscol-7b'],   // vanilla
            ];
            const hdrClasses = [
                'mb-mscol-hdr-0','mb-mscol-hdr-1','mb-mscol-hdr-2','mb-mscol-hdr-3',
                'mb-mscol-hdr-4','mb-mscol-hdr-5','mb-mscol-hdr-6','mb-mscol-hdr-7'
            ];

            const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
            const mainHeaderRow = table.querySelector('thead tr:first-child');

            state.multiSortColumns.forEach((sortCol, priorityIdx) => {
                const colIdx = sortCol.colIndex;
                const pair   = bodyPairs[priorityIdx % bodyPairs.length];
                const hdrCls = hdrClasses[priorityIdx % hdrClasses.length];

                // Walk rows, flip shade each time the cell text value changes
                let shadeIdx  = 0;
                let lastValue = null;
                bodyRows.forEach(tr => {
                    const cell = tr.cells[colIdx];
                    if (!cell) return;
                    const cellValue = cell.textContent.trim();
                    if (lastValue !== null && cellValue !== lastValue) {
                        shadeIdx = 1 - shadeIdx; // toggle between 0 and 1
                    }
                    lastValue = cellValue;
                    cell.classList.add(pair[shadeIdx]);
                });

                // Tint the header cell
                if (mainHeaderRow) {
                    const th = mainHeaderRow.cells[colIdx];
                    if (th) th.classList.add(hdrCls);
                }
            });
        };

        // --- Helper: remove all multi-sort column tint classes from this table ---
        const clearMultiSortColumnTints = () => {
            const allTintClasses = [
                'mb-mscol-0a','mb-mscol-0b','mb-mscol-1a','mb-mscol-1b',
                'mb-mscol-2a','mb-mscol-2b','mb-mscol-3a','mb-mscol-3b',
                'mb-mscol-4a','mb-mscol-4b','mb-mscol-5a','mb-mscol-5b',
                'mb-mscol-6a','mb-mscol-6b','mb-mscol-7a','mb-mscol-7b',
                'mb-mscol-hdr-0','mb-mscol-hdr-1','mb-mscol-hdr-2','mb-mscol-hdr-3',
                'mb-mscol-hdr-4','mb-mscol-hdr-5','mb-mscol-hdr-6','mb-mscol-hdr-7'
            ];
            table.querySelectorAll('tbody td, thead tr:first-child th').forEach(cell => {
                cell.classList.remove(...allTintClasses);
            });
        };

        // Register this table's tint functions so external callers (renderFinalTable) can
        // re-apply after replacing tbody content with fresh rows.
        multiSortTintRegistry.set(sortKey, { applyTints: applyMultiSortColumnTints, clearTints: clearMultiSortColumnTints });

        // --- Helper: derive clean column name from a th element ---------------
        const getCleanColName = (th) =>
            th ? th.textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim() : '';

        // --- Helper: is a column name numeric? ---------------------------------
        const isNumericCol = (name) =>
            name.includes('Year') || name.includes('Releases') || name.includes('Track') ||
            name.includes('Length') || name.includes('#');

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

                            // === Visual update (icons + superscripts only — tints applied after runFilter below) ===
                            if (state.multiSortColumns.length > 0) {
                                updateMultiSortVisuals();
                            } else {
                                // Single-column: one active icon
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

                            // Apply or clear column tints AFTER runFilter() so the fresh tbody
                            // rows are already in the DOM when we paint.
                            if (state.multiSortColumns.length > 0) {
                                applyMultiSortColumnTints();
                            } else {
                                clearMultiSortColumnTints();
                            }

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
        // (called on every re-render triggered by renderGroupedTable after a sort on multi-table pages)
        if (state.multiSortColumns.length > 0) {
            updateMultiSortVisuals();
            applyMultiSortColumnTints();
        } else {
            clearMultiSortColumnTints();
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

            triggerStandardDownload(url, filename, dataToSave.rowCount);
            infoDisplay.textContent = `✓ Serialized ${dataToSave.rowCount.toLocaleString()} rows to ${filename}`;
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
    /**
     * Trigger a browser file download for a Blob object-URL and show a notification popup.
     *
     * @param {string} url       - Object URL created via URL.createObjectURL().
     * @param {string} filename  - Suggested save filename.
     * @param {number} rowCount  - Number of rows saved (0 = unknown / not shown).
     */
    function triggerStandardDownload(url, filename, rowCount = 0) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        Lib.debug('cache', `Data saved to ${filename}`);

        const rowNote = rowCount > 0 ? ` ${rowCount.toLocaleString()} rows saved.` : '';
        showDownloadNotification(
            `Saving of JSON table data to the filesystem initiated.${rowNote} Please monitor your browser for the file download.`
        );
    }

    /**
     * Loads table data from a JSON file and re-hydrates the page
     * @param {File} file - The JSON file containing saved table data
     * @param {string} filterQueryRaw - Pre-filter query string to apply during load
     * @param {boolean} isCaseSensitive - Whether the pre-filter should be case-sensitive
     * @param {boolean} isRegExp - Whether the pre-filter should be treated as a regular expression
     * @param {boolean} isExclude - When true, rows MATCHING the filter are excluded instead of kept
     */
    async function loadTableDataFromDisk(file, filterQueryRaw = '', isCaseSensitive = false, isRegExp = false, isExclude = false) {
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
                // confirmLoad() pre-validates the pattern before closing the dialog;
                // this catch is a defensive fallback for direct programmatic callers only.
                globalRegex = new RegExp(filterQueryRaw, isCaseSensitive ? '' : 'i');
            } catch (e) {
                Lib.error('cache', `Invalid regex reached loadTableDataFromDisk (should have been caught by confirmLoad): ${e.message}`);
                fileInput.value = '';
                return;
            }
        }

        Lib.debug('cache', `Loading data from file: ${file.name}. Prefilter active: ${!!filterQueryRaw}${filterQueryRaw ? `, exclude: ${isExclude}` : ''}`);

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
                    const loadAnywayConfirmed = await Lib.showCustomConfirm(
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

                // Prepare the page for re-hydration.
                // First, strip any focus-mode prefix and background tint from column
                // filter inputs that may still be in the DOM (e.g. if a field had
                // focus when the Load dialog was confirmed).
                document.querySelectorAll('.mb-col-filter-input').forEach(inp => {
                    inp.value = '';
                    inp.style.backgroundColor = '';
                });
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
                    let matched;
                    if (isRegExp && globalRegex) {
                        // For regex patterns, test against each cell individually
                        matched = Array.from(tr.cells).some(cell => {
                            const cellText = getCleanColumnText(cell);
                            return globalRegex.test(cellText);
                        });
                    } else {
                        // For non-regex, test against concatenated row text
                        const text = getCleanVisibleText(tr);
                        matched = isCaseSensitive ? text.includes(filterQuery) : text.toLowerCase().includes(filterQuery);
                    }
                    // isExclude: keep rows that do NOT match; normal: keep rows that DO match
                    return isExclude ? !matched : matched;
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

                // Reset global filter to a clean state after every disk load.
                // If the page was already rendered with an active filter before the load,
                // the filterInput still holds the old value; the newly loaded rows are not
                // affected by it until the user interacts with the filter widget.  Clear the
                // value now and immediately re-run the filter so:
                //   (a) the loaded rows are all visible (no stale filter applied),
                //   (b) filter-status / sort-status displays are cleared,
                //   (c) "Toggle highlighting" and "Clear ALL filters" buttons are hidden.
                filterInput.value = '';
                filterInput.style.boxShadow = '';
                filterStatusDisplay.textContent = '';
                sortStatusDisplay.textContent = '';
                if (typeof runFilter === 'function') {
                    runFilter();
                }
                if (typeof window.updateFilterButtonsVisibility === 'function') {
                    window.updateFilterButtonsVisibility();
                }

                // Reset all sort state after every disk load.
                // If the page was already rendered with active column sorts (including
                // multi-column sorts with cell tints), the sort-icon highlights and tinted
                // cells persist in the DOM after re-render because makeTableSortableUnified()
                // only adds new sort buttons — it does not undo previously applied DOM state.
                // Steps:
                //   (a) call clearTints() from the tint registry for every known sortKey to
                //       remove multi-sort background colours from data cells,
                //   (b) strip .sort-icon-active from all sort icon buttons,
                //   (c) reset every sort-state entry in multiTableSortStates to neutral,
                //   (d) clear per-h3 sort status spans,
                //   (e) clear both Maps so stale keys from the previous render don't accumulate.
                multiSortTintRegistry.forEach(({ clearTints }) => {
                    try { clearTints(); } catch (_) { /* ignore if table no longer in DOM */ }
                });
                document.querySelectorAll('.sort-icon-btn').forEach(btn => {
                    btn.classList.remove('sort-icon-active');
                });
                document.querySelectorAll('.mb-sort-status').forEach(el => {
                    el.textContent = '';
                });
                multiTableSortStates.clear();
                multiSortTintRegistry.clear();

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
                    // Pass the file's total row count and isExclude so the label always shows "N out of T"
                    updatePrefilterToggleButton(loadedRowCount, filterQueryRaw, true, data.rowCount || 0, isExclude);
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
    /**
     * Opens the Export pull-down menu by programmatically clicking the Export button in the h1 bar.
     * Used as the Ctrl+M + "e" prefix-mode shortcut target.
     */
    function openExportMenu() {
        const exportBtn = document.getElementById('mb-export-btn');
        if (exportBtn) {
            exportBtn.click();
        }
    }

    /**
     * Opens the Visible Columns pull-down menu by programmatically clicking the Visible Columns button.
     * Used as the Ctrl+M + "v" prefix-mode shortcut target.
     */
    function openVisibleColumnsMenu() {
        const visibleColumnsBtn = document.getElementById('mb-visible-btn');
        if (visibleColumnsBtn) {
            visibleColumnsBtn.click();
        }
    }

    /**
     * Opens the Density pull-down menu by programmatically clicking the Density button in the h1 bar.
     * Used as the Ctrl+M + "d" prefix-mode shortcut target.
     */
    function openDensityMenu() {
        const densityBtn = document.getElementById('mb-density-btn');
        if (densityBtn) {
            densityBtn.click();
        }
    }

    // Populate prefix-mode function mapping after all functions are defined
    ctrlMFunctionMap = {
        's': { fn: saveTableDataToDisk, description: 'Save to Disk' },
        'l': { fn: () => showLoadFilterDialog(document.getElementById('mb-load-from-disk-btn')), description: 'Load from Disk' },
        'r': { fn: toggleAutoResizeColumns, description: 'Auto Resize Columns' },
        'v': { fn: openVisibleColumnsMenu, description: 'Open Visible Columns Menu' },
        'd': { fn: openDensityMenu, description: 'Open Density Menu' },
        'i': { fn: showStatsPanel, description: 'Show Statistics Panel' },
        'e': { fn: openExportMenu, description: 'Open Export Menu' },
        'k': { fn: showShortcutsHelp, description: 'Show Keyboard Shortcuts Help' },
        ',': { fn: () => Lib.showSettings(), description: 'Open Settings' },
        'h': { fn: showAppHelp, description: 'Show App Help' }
    };
})();
