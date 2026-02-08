// ==UserScript==
// @name         VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities
// @namespace    https://github.com/vzell/mb-userscripts
// @version      2.2.1+2026-02-04
// @description  Consolidated tool to accumulate paginated MusicBrainz lists (Events, Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      https://cdn.jsdelivr.net/npm/@jaames/iro@5
// @require      https://cdn.jsdelivr.net/gh/vzell/mb-userscripts@master/lib/VZMBLibrary.user.js
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
 * VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities
 * is an userscript which accumulates paginated MusicBrainz lists (Events, Recordings, Releases, Works, etc.)
 * into a single view with real-time filtering and sorting.
 *
 * This script has been created by giving the right facts and asking the right questions to Gemini.
 * When Gemini gots stuck, I asked ChatGPT for help, until I got everything right.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome and Firefox.
 */

// CHANGELOG
let changelog = [
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

(function() {
    'use strict';

    const SCRIPT_ID = "vzell-mb-show-all-entities";
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : "Show All Entities";
    const DEBUG_ENABLED = true

    // CONFIG SCHEMA
    const configSchema = {
        sa_render_in_new_tab: {
            label: "Render overflow tables in a new tab",
            type: "checkbox",
            default: true,
            description: "Render overflow tables in a new tab"
        },
        sa_collabsable_sidebar: {
            label: "Collabsable sidebar (experimental)",
            type: "checkbox",
            default: false,
            description: "Render sidebar collabsable"
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
        sa_filter_highlight_color: {
            label: "Global Filter Highlight Color",
            type: "color_picker",
            default: "red",
            description: "Text color for global filter matches"
        },
        sa_filter_highlight_bg: {
            label: "Global Filter Highlight Background",
            type: "color_picker",
            default: "#FFD700",
            description: "Background color for global filter matches"
        },
        sa_col_filter_highlight_color: {
            label: "Column Filter Highlight Color",
            type: "color_picker",
            default: "green",
            description: "Text color for column filter matches"
        },
        sa_col_filter_highlight_bg: {
            label: "Column Filter Highlight Background",
            type: "color_picker",
            default: "#FFFFE0",
            description: "Background color for column filter matches"
        }
    };

    // Initialize VZ-MBLibrary (Logger + Settings + Changelog)
    const Lib = (typeof VZMBLibrary !== 'undefined')
          ? new VZMBLibrary(SCRIPT_ID, SCRIPT_NAME, configSchema, changelog, DEBUG_ENABLED)
          : {
              settings: {},
              info: console.log, debug: console.log, error: console.error, warn: console.warn, time: console.time, timeEnd: console.timeEnd
          };

    Lib.info('init', "Script loaded with external library!");

    // --- Sidebar Collapsing & Full Width Stretching Logic ---
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
            #sidebar {
                transition: transform 0.3s ease, width 0.3s ease, opacity 0.3s ease, margin-right 0.3s ease;
            }
            #page, #content {
                transition: margin-right 0.3s ease, padding-right 0.3s ease, width 0.3s ease, max-width 0.3s ease, margin-left 0.3s ease;
            }
            .sidebar-collapsed {
                transform: translateX(100%);
                width: 0 !important;
                min-width: 0 !important;
                opacity: 0 !important;
                margin-right: -${sidebarWidth} !important;
                pointer-events: none;
            }
            /* Force 100% width and remove any MB centering/max-width constraints */
            .mb-full-width-stretching {
                margin-right: 0 !important;
                margin-left: 0 !important;
                padding-right: 10px !important;
                padding-left: 10px !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 100% !important;
                box-sizing: border-box !important;
            }
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
                display: flex; align-items: center; justify-content: center;
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
        `;
        document.head.appendChild(style);

        const handle = document.createElement('div');
        handle.id = 'sidebar-toggle-handle';
        handle.title = 'Toggle Full Width Sidebar';

        const applyStretching = (isCollapsed) => {
            const containers = [document.getElementById("page"), document.getElementById("content")];
            containers.forEach(el => {
                if (el) {
                    if (isCollapsed) el.classList.add('mb-full-width-stretching');
                    else el.classList.remove('mb-full-width-stretching');
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

    // Check if we just reloaded to fix the filter issue
    const reloadFlag = sessionStorage.getItem('mb_show_all_reload_pending');
    if (reloadFlag) {
        sessionStorage.removeItem('mb_show_all_reload_pending');
        alert('The underlying MusicBrainz page has been reloaded to ensure filter stability. Please click the desired "Show all" button again to start the process.');
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
            rowTargetSelector: 'p.pageselector-results' // Specific target for Search pages
        },
        // Instrument pages
        {
            type: 'instrument-artists',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/artists/),
            buttons: [ { label: 'Show all Artists for Instruments' } ],
            tableMode: 'single'
        },
        {
            type: 'instrument-releases',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/releases/),
            buttons: [ { label: 'Show all Releases for Instruments' } ],
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'instrument-recordings',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/recordings/),
            buttons: [ { label: 'Show all Recordings for Instruments' } ],
            tableMode: 'single'
        },
        {
            type: 'instrument-aliases',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Instruments' } ],
            tableMode: 'single'
        },
        // Area pages
        {
            type: 'area-artists',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/artists/),
            buttons: [ { label: 'Show all Artists for Areas' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Artist' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-events',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Areas' } ],
            features: {
                splitLocation: true,
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        },
        {
            type: 'area-labels',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/labels/),
            buttons: [ { label: 'Show all Labels for Areas' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Label' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-releases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/releases/),
            buttons: [ { label: 'Show all Releases for Areas' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        {
            type: 'area-places',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/places/),
            buttons: [ { label: 'Show all Places for Areas' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Place'
            },
            tableMode: 'single'
        },
        {
            type: 'area-aliases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Areas' } ],
            tableMode: 'single'
        },
        {
            type: 'area-recordings-filtered',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/recordings/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Areas (filtered)' } ],
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'area-recordings',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/recordings/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Areas' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'area-works-filtered',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/works/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Works for Areas (filtered)' } ],
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'area-works',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/works/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Works for Areas' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        // Place pages
        {
            type: 'place-events',
            match: (path) => path.match(/\/place\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Places' } ],
            features: {
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        },
        {
            type: 'place-performances-filtered',
            match: (path, params) => path.match(/\/place\/[a-f0-9-]{36}\/performances/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Performances for Recordings (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'place-performances',
            match: (path, params) => path.match(/\/place\/[a-f0-9-]{36}\/performances/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Performances for Recordings' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'place-aliases',
            match: (path) => path.match(/\/place\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Place' } ],
            tableMode: 'single'
        },
        // Series pages
        {
            type: 'series-aliases',
            match: (path) => path.match(/\/series\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Series' } ],
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
        // Labels pages
        {
            type: 'label-aliases',
            match: (path) => path.match(/\/label\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Labels' } ],
            tableMode: 'single'
        },
        {
            type: 'label-relationships-filtered',
            match: (path, params) => path.match(/\/label\/[a-f0-9-]{36}\/relationships/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Labels (filtered)' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'label-relationships',
            match: (path, params) => path.match(/\/label\/[a-f0-9-]{36}\/relationships/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Labels' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'label-releases',
            match: (path) => path.includes('/label'),
            buttons: [ { label: 'Show all Releases for Labels' } ],
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
            buttons: [ { label: 'Show all Relationships (filtered)' } ],
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'artist-relationships',
            // Only match if NO link_type_id is present (the overview page)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/relationships/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Artists' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        // TODO: Needs to be handled separately - actually multi table native, but each table has it's own h2 header
        {
            type: 'artist-aliases',
            match: (path) => path.match(/\/artist\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Artists' } ],
            tableMode: 'multi', // native tables, h2 headers
            non_paginated: true
        },
        {
            type: 'artist-releasegroups',
            // Root artist page (Official/Non-Official/VA views handled by specific buttons)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}$/) && !path.endsWith('/releases'),
            buttons: [
                { label: 'Official artist RGs', params: { all: '0', va: '0' } },
                { label: 'Non-official artist RGs', params: { all: '1', va: '0' } },
                { label: 'Official various artists RGs', params: { all: '0', va: '1' } },
                { label: 'Non-official various artists RGs', params: { all: '1', va: '1' } }
            ],
            tableMode: 'multi' // native tables, h3 headers
        },
        {
            type: 'releases',
            // Artist Releases page (Official/VA views handled by specific buttons)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/releases$/),
            buttons: [
                { label: 'Official artist releases', params: { va: '0' } },
                { label: 'Various artist releases', params: { va: '1' } }
            ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        {
            type: 'recordings',
            match: (path) => path.includes('/recordings'),
            buttons: [ { label: 'Show all Recordings for Artist' } ],
            features: {
                splitCD: false, // Explicitly false (default), but shown for clarity
                extractMainColumn: 'Name'
            },
            tableMode: 'single'
        },
        {
            type: 'releases',
            match: (path) => path.includes('/releases'),
            buttons: [ { label: 'Show all Releases for Artist' } ],
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'works',
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
            buttons: [ { releasegroup: 'Show all Aliases for Releasegroups' } ],
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
        // Releases pages
        {
            type: 'release-discids',
            match: (path) => path.match(/\/release\/[a-f0-9-]{36}\/discids/),
            buttons: [ { label: 'Show all Disc IDs for Releases' } ],
            tableMode: 'multi',
            non_paginated: false
        },
        // Recording pages
        {
            type: 'recording-aliases',
            match: (path) => path.match(/\/recording\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { recording: 'Show all Aliases for Recordings' } ],
            tableMode: 'single'
        },
        {
            type: 'recording-fingerprints',
            match: (path) => path.match(/\/recording\/[a-f0-9-]{36}\/fingerprints/),
            buttons: [ { recording: 'Show all Fingerprints for Recordings' } ],
            tableMode: 'single'
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

    // --- Initialization Logic ---

    // 1. Detect Page Type
    let pageType = '';
    let activeDefinition = null;

    for (const def of pageDefinitions) {
        if (def.match(path, params)) {
            pageType = def.type;
            activeDefinition = def;
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
    Lib.info('init', 'Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        Lib.error('init', 'Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    // 3. Set Feature Flags based on active definition
    const typesWithSplitCD = (activeDefinition && activeDefinition.features?.splitCD) ? [pageType] : [];
    const typesWithSplitLocation = (activeDefinition && activeDefinition.features?.splitLocation) ? [pageType] : [];
    const typesWithSplitArea = (activeDefinition && activeDefinition.features?.splitArea) ? [pageType] : [];

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
        eb.textContent = conf.label;
        eb.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px;';
        eb.type = 'button';
        // If params are defined in config, pass them; otherwise standard fetch
        eb.onclick = (e) => startFetchingProcess(e, conf.params || null);
        controlsContainer.appendChild(eb);
        allActionButtons.push(eb);
    });

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.cssText = 'display:none; font-size:0.8em; padding:2px 6px; cursor:pointer; background-color:#f44336; color:white; border:1px solid #d32f2f; height:24px; box-sizing:border-box; border-radius:6px;';

    const statusDisplay = document.createElement('span');
    statusDisplay.style.cssText = 'font-size:0.6em; color:#333; display:flex; align-items:center; height:24px; font-weight:bold;';

    const progressContainer = document.createElement('div');
    progressContainer.id = 'mb-fetch-progress-container';
    progressContainer.style.cssText = 'display:none; width:300px; height:26px; background-color:#eee; border:1px solid #ccc; border-radius:3px; overflow:hidden; position:relative; vertical-align:middle;';

    const progressBar = document.createElement('div');
    progressBar.id = 'mb-fetch-progress-bar';
    progressBar.style.cssText = 'width:0%; height:100%; transition: width 0.3s, background-color 0.3s; position:absolute; left:0; top:0;';

    const progressText = document.createElement('div');
    progressText.id = 'mb-fetch-progress-text';
    progressText.style.cssText = 'position:absolute; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:black; z-index:1; pointer-events:none; padding: 0 10px; box-sizing: border-box;';

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);

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

    filterContainer.appendChild(filterWrapper);
    filterContainer.appendChild(caseLabel);
    filterContainer.appendChild(regexpLabel);

    const timerDisplay = document.createElement('span');
    timerDisplay.style.cssText = 'font-size:0.5em; color:#666; display:flex; align-items:center; height:24px;';

    const sortTimerDisplay = document.createElement('span');
    sortTimerDisplay.style.cssText = 'font-size:0.5em; color:#666; display:flex; align-items:center; height:24px;';

    controlsContainer.appendChild(stopBtn);
    controlsContainer.appendChild(statusDisplay);
    controlsContainer.appendChild(progressContainer);
    // Filter container is NOT appended here anymore; moved to H2 later
    controlsContainer.appendChild(timerDisplay);
    controlsContainer.appendChild(sortTimerDisplay);

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
        .mb-row-count-stat { color: blue; font-weight: bold; margin-left: 8px; }
        .mb-toggle-h3:hover, .mb-toggle-h2:hover {
            color: #222;
            background-color: #f9f9f9;
        }
        .mb-toggle-h3 { cursor: pointer; user-select: none; border-bottom: 1px solid #eee; padding: 4px 0; margin-left: 1.5em; }
        .mb-toggle-h2 { cursor: pointer; user-select: none; }
        .mb-toggle-icon { font-size: 0.8em; margin-right: 8px; color: #666; width: 12px; display: inline-block; cursor: pointer; }
        .mb-master-toggle { color: #0066cc; font-weight: bold; margin-left: 15px; font-size: 0.8em; vertical-align: middle; display: inline-block; cursor: default; }
        .mb-master-toggle span { cursor: pointer; }
        .mb-master-toggle span:hover { text-decoration: underline; }
        .mb-filter-highlight {
            color: ${Lib.settings.sa_filter_highlight_color};
            background-color: ${Lib.settings.sa_filter_highlight_bg};
        }
        .mb-col-filter-highlight {
            color: ${Lib.settings.sa_col_filter_highlight_color};
            background-color: ${Lib.settings.sa_col_filter_highlight_bg};
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

    let allRows = [];
    let originalAllRows = [];
    let groupedRows = [];
    let isLoaded = false;
    let stopRequested = false;
    let multiTableSortStates = new Map();

    /**
     * Removes various clutter elements from the MusicBrainz page to prepare for consolidated view.
     */
    function performClutterCleanup() {
        Lib.info('cleanup', 'Starting clutter element removal.');

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
        if (removedDetailsCount > 0) Lib.info('cleanup', `Removed ${removedDetailsCount} gallery/details blocks.`);

        if (pageType === 'events' || pageType === 'artist-releasegroups') {
            removeSanojjonasContainers();
        }
    }

    async function fetchMaxPageGeneric(targetPath, queryParams = {}) {
        const url = new URL(window.location.origin + targetPath);
        Object.keys(queryParams).forEach(k => url.searchParams.set(k, queryParams[k]));
        url.searchParams.set('page', '1');
        Lib.info('fetch', `Fetching maxPage from: ${url.toString()}`);
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
            Lib.info('success', `Determined maxPage: ${maxPage}`);
            return maxPage;
        } catch (err) {
            Lib.error('fetch', 'Error fetching maxPage:', err);
            return 1;
        }
    }

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
        Lib.info('cleanup', 'Signalling other scripts to stop...');
        window.stopAllUserScripts = true;
        // Dispatch custom event for scripts listening for inter-script signals
        window.dispatchEvent(new CustomEvent('mb-stop-all-scripts'));
    }

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
     * Helper to get visible text only, explicitly ignoring script/style tags.
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

    function highlightText(row, query, isCaseSensitive, targetColIndex = -1, isRegExp = false) {
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

        const className = targetColIndex === -1 ? 'mb-filter-highlight' : 'mb-col-filter-highlight';

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

    function addColumnFilterRow(table) {
        const thead = table.tHead;
        if (!thead || thead.querySelector('.mb-col-filter-row')) return;

        const originalHeader = thead.querySelector('tr');
        const filterRow = document.createElement('tr');
        filterRow.className = 'mb-col-filter-row';

        Array.from(originalHeader.cells).forEach((cell, idx) => {
            const th = document.createElement('th');
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
                runFilter();
            };

            input.addEventListener('input', (e) => {
                e.stopPropagation();
                Lib.debug('filter', `Column filter updated on column ${idx}: "${input.value}"`);
                runFilter();
            });

            // Handle Escape key to clear column filter
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    input.value = '';
                    runFilter();
                }
            });

            wrapper.appendChild(input);
            wrapper.appendChild(clear);
            th.appendChild(wrapper);
            filterRow.appendChild(th);
        });
        thead.appendChild(filterRow);
    }

    function runFilter() {
        const isCaseSensitive = caseCheckbox.checked;
        const isRegExp = regexpCheckbox.checked;
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

        if (activeDefinition.tableMode === 'multi') {
            const filteredArray = [];
            let totalFiltered = 0;
            let totalAbsolute = 0;

            // Only pick tables that belong to the script to avoid MusicBrainz Info tables
            const tables = Array.from(document.querySelectorAll('table.tbl'))
                .filter(t => t.querySelector('.mb-col-filter-row'));

            groupedRows.forEach((group, groupIdx) => {
                totalAbsolute += group.rows.length;
                const table = tables[groupIdx];
                const colFiltersRaw = table ? Array.from(table.querySelectorAll('.mb-col-filter-input'))
                    .map(inp => {
                        // Apply colored box to column filter if active
                        inp.style.boxShadow = inp.value ? '0 0 2px 2px green' : '';
                        return { raw: inp.value, idx: parseInt(inp.dataset.colIdx, 10) };
                    }) : [];

                const colFilters = colFiltersRaw
                    .map(f => ({ val: (isCaseSensitive || isRegExp) ? f.raw : f.raw.toLowerCase(), idx: f.idx }))
                    .filter(f => f.val);

                const matches = group.rows.map(r => r.cloneNode(true)).filter(r => {
                    // Reset previous highlights (critical for correct filtering)
                    r.querySelectorAll('.mb-filter-highlight, .mb-col-filter-highlight')
                        .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

                    // Global match
                    const text = getCleanVisibleText(r);
                    let globalHit = !globalQuery;
                    if (!globalHit) {
                        if (isRegExp && globalRegex) {
                            globalHit = globalRegex.test(text);
                        } else {
                            globalHit = isCaseSensitive ? text.includes(globalQuery) : text.toLowerCase().includes(globalQuery);
                        }
                    }

                    // Column matches
                    let colHit = true;
                    for (const f of colFilters) {
                        const cellText = getCleanVisibleText(r.cells[f.idx]);
                        let match = false;
                        if (isRegExp) {
                            try {
                                match = new RegExp(f.val, isCaseSensitive ? '' : 'i').test(cellText);
                            } catch (e) {
                                match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                            }
                        } else {
                            match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                        }
                        if (!match) {
                            colHit = false;
                            break;
                        }
                    }

                    const finalHit = globalHit && colHit;
                    if (finalHit) {
                        if (globalQuery) highlightText(r, globalQueryRaw, isCaseSensitive, -1, isRegExp);
                        colFilters.forEach(f => highlightText(r, f.val, isCaseSensitive, f.idx, isRegExp));
                    }
                    return finalHit;
                });

                // Always push to filteredArray, even if matches.length is 0, to maintain the table count and restoration capability
                filteredArray.push({ category: group.category, rows: matches });
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
            const table = document.querySelector('table.tbl');
            const colFiltersRaw = table ? Array.from(table.querySelectorAll('.mb-col-filter-input'))
                .map(inp => {
                    // Apply green box to column filter if active
                    inp.style.boxShadow = inp.value ? '0 0 2px 2px green' : '';
                    return { raw: inp.value, idx: parseInt(inp.dataset.colIdx, 10) };
                }) : [];

            const colFilters = colFiltersRaw
                .map(f => ({ val: (isCaseSensitive || isRegExp) ? f.raw : f.raw.toLowerCase(), idx: f.idx }))
                .filter(f => f.val);

            const filteredRows = allRows.map(row => row.cloneNode(true)).filter(row => {
                // Reset previous highlights
                row.querySelectorAll('.mb-filter-highlight, .mb-col-filter-highlight')
                    .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

                const text = getCleanVisibleText(row);
                let globalHit = !globalQuery;
                if (!globalHit) {
                    if (isRegExp && globalRegex) {
                        globalHit = globalRegex.test(text);
                    } else {
                        globalHit = isCaseSensitive ? text.includes(globalQuery) : text.toLowerCase().includes(globalQuery);
                    }
                }

                let colHit = true;
                for (const f of colFilters) {
                    const cellText = getCleanVisibleText(row.cells[f.idx]);
                    let match = false;
                    if (isRegExp) {
                        try {
                            match = new RegExp(f.val, isCaseSensitive ? '' : 'i').test(cellText);
                        } catch (e) {
                            match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                        }
                    } else {
                        match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                    }
                    if (!match) {
                        colHit = false;
                        break;
                    }
                }

                const finalHit = globalHit && colHit;
                if (finalHit) {
                    if (globalQuery) highlightText(row, globalQueryRaw, isCaseSensitive, -1, isRegExp);
                    colFilters.forEach(f => highlightText(row, f.val, isCaseSensitive, f.idx, isRegExp));
                }
                return finalHit;
            });
            renderFinalTable(filteredRows);
            updateH2Count(filteredRows.length, totalAbsolute);
        }
        // Maintain scroll position after filtering or sorting
        window.scrollTo(0, __scrollY);
    }

    stopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Lib.info('cleanup', 'Stop requested by user.');
        stopRequested = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
    });

    // Handle Escape key to clear global filter
    filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            filterInput.value = '';
            runFilter();
        }
    });

    filterInput.addEventListener('input', runFilter);
    caseCheckbox.addEventListener('change', runFilter);
    regexpCheckbox.addEventListener('change', runFilter);
    filterClear.addEventListener('click', () => {
        filterInput.value = '';
        runFilter();
    });

    /**
     * Cleans up the table headers based on user settings and logs the process.
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
            Lib.info('cleanup', `Removing ${indicesToRemove.length} columns from table.`);
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
     * Generalized fetching process
     * @param {Event} e - The click event
     * @param {Object} overrideParams - Specific query parameters for artist-releasegroups and artist-releases buttons
     */
    async function startFetchingProcess(e, overrideParams = null) {
        // Capture currentTarget immediately before any awaits
        const activeBtn = e.currentTarget;
        e.preventDefault();
        e.stopPropagation();

        // Reload the page if a fetch process has already run to fix column-level filter unresponsiveness
        if (isLoaded) {
            Lib.info('meta', 'Second fetch attempt detected. Setting reload flag and reloading page to ensure filter stability.');
            sessionStorage.setItem('mb_show_all_reload_pending', 'true');
            window.location.reload();
            return;
        }

        // Stop other scripts immediately when an action button is pressed
        stopOtherScripts();

        // Clear existing highlights immediately from DOM for visual feedback
        document.querySelectorAll('.mb-filter-highlight, .mb-col-filter-highlight').forEach(n => {
            n.replaceWith(document.createTextNode(n.textContent));
        });

        // Clear existing filter conditions and UI highlights for a fresh start
        filterInput.value = '';
        filterInput.style.boxShadow = '';
        caseCheckbox.checked = false;
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
        Lib.info('fetch', 'Starting fetch process...', overrideParams);
        statusDisplay.textContent = 'Getting number of pages to fetch...';
        let maxPage = 1;

        // Determine maxPage based on context
        if (activeDefinition && activeDefinition.non_paginated) {
            // For non-paginated types, initially assume maxPage is 1
            Lib.info('fetch', 'Context: Non-paginated page definition. Initially assuming maxPage = 1.');
            maxPage = 1;
        } else if (overrideParams) {
            Lib.info('fetch', 'Context: overrideParams detected. Fetching maxPage with overrides.', overrideParams);
            maxPage = await fetchMaxPageGeneric(path, overrideParams);
        } else {
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
                        Lib.debug('fetch', `Found "Next" link. Extracted page: ${maxPage}`);
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
                        Lib.debug('fetch', `Parsed page numbers from list. Max found: ${maxPage}`);
                    }
                }
            } else {
                Lib.debug('fetch', 'No pagination element found; assuming single page (maxPage = 1).');
            }
        }

        const maxThreshold = Lib.settings.sa_max_page;
        Lib.debug('fetch', `Total pages to fetch: ${maxPage}`);
        if (maxPage > maxThreshold && !confirm(`Warning: This MusicBrainz entity has ${maxPage} pages. It's more than the configured maximum value (${maxThreshold}) and could result in severe performance, memory consumption and timing issues.... Proceed?`)) {
            activeBtn.style.backgroundColor = '';
            activeBtn.style.color = '';
            activeBtn.disabled = false;
            statusDisplay.textContent = '';
            return;
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
        statusDisplay.textContent = 'Initializing...';
        progressContainer.style.display = 'inline-block';
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = '#ffcccc';
        progressText.textContent = '';

        const startTime = performance.now();
        let fetchingTimeStart = performance.now();
        let totalFetchingTime = 0;
        let totalRenderingTime = 0;

        const baseUrl = window.location.origin + window.location.pathname;
        let pagesProcessed = 0;
        let cumulativeFetchTime = 0;
        let lastCategorySeenAcrossPages = null;
        let totalRowsAccumulated = 0;

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) {
                    Lib.info('cleanup', 'Fetch loop stopped at page ' + p);
                    break;
                }
                pagesProcessed++;

                const pageStartTime = performance.now();

                // FIX: Initialize fetchUrl from the full current URL to preserve Search parameters (query, type, etc.)
                const fetchUrl = new URL(window.location.href);
                fetchUrl.searchParams.set('page', p.toString());

                if (overrideParams) {
                    Object.keys(overrideParams).forEach(k => fetchUrl.searchParams.set(k, overrideParams[k]));
                }

                Lib.debug('fetch', `Fetching URL for page ${p}: ${fetchUrl.toString()}`);

                const html = await fetchHtml(fetchUrl.toString());
                const doc = new DOMParser().parseFromString(html, 'text/html');

                let countryDateIdx = -1;
                let locationIdx = -1;
                let areaIdx = -1;
                let mainColIdx = -1;
                let indicesToExclude = [];

                // Retrieve configuration for the main column extraction
                const mainColConfig = activeDefinition.features?.extractMainColumn;

                // If configuration is a specific number, force that index immediately
                if (typeof mainColConfig === 'number') {
                    mainColIdx = mainColConfig;
                    Lib.debug('init', `mainColIdx forced to ${mainColIdx} by configuration.`);
                }
                // Prepare candidates list if config is string or array
                const mainColCandidates = Array.isArray(mainColConfig) ? mainColConfig : (mainColConfig ? [mainColConfig] : []);

                const referenceTable = doc.querySelector('table.tbl');
                if (referenceTable) {
                    referenceTable.querySelectorAll('thead th').forEach((th, idx) => {
                        const txt = th.textContent.trim();
                        if (Lib.settings.sa_remove_rel && txt.startsWith('Relationships')) indicesToExclude.push(idx);
                        else if (Lib.settings.sa_remove_perf && txt.startsWith('Performance Attributes')) indicesToExclude.push(idx);
                        else if (Lib.settings.sa_remove_rating && txt.startsWith('Rating')) indicesToExclude.push(idx);
                        else if (Lib.settings.sa_remove_tagger && txt.startsWith('Tagger')) indicesToExclude.push(idx);
                        else if (typesWithSplitCD.includes(pageType) && txt === 'Country/Date') {
                            countryDateIdx = idx;
                        } else if (typesWithSplitLocation.includes(pageType) && txt === 'Location') {
                            locationIdx = idx;
                        } else if (typesWithSplitArea.includes(pageType) && txt === 'Area') {
                            areaIdx = idx;
                        }

                        // Dynamic detection based on config candidates
                        // We only search if mainColIdx wasn't already forced by a number config
                        if (mainColIdx === -1 && mainColCandidates.includes(txt)) {
                            mainColIdx = idx;
                        }
                    });
                }

                Lib.debug('init', `Determined mainColIdx: ${mainColIdx} for pageType: ${pageType}`);
                Lib.debug(
                    'indices',
                    `Detected indices → mainColIdx=${mainColIdx}, countryDateIdx=${countryDateIdx}, areaIdx=${areaIdx}, locationIdx=${locationIdx}, excluded=[${indicesToExclude.join(',')}]`
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
                                Lib.debug(
                                    'row',
                                    `Row cloned → initial cell count=${newRow.cells.length}`
                                );
                                [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });
                                currentGroup.rows.push(newRow);
                                Lib.debug(
                                    'row',
                                    `Row BEFORE push → cells=${newRow.cells.length}, mainColIdx=${mainColIdx}, countryDateIdx=${countryDateIdx}`
                                );
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
                                        const targetCell = newRow.cells[mainColIdx];
                                        if (targetCell) {
                                            const nameLink = targetCell.querySelector('a bdi')?.closest('a');
                                            if (nameLink) tdName.appendChild(nameLink.cloneNode(true));
                                            const commentBdi = targetCell.querySelector('.comment bdi');
                                            if (commentBdi) tdComment.textContent = commentBdi.textContent.trim();
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

                // Update status text (page count only)
                statusDisplay.textContent = `Loading page ${p} of ${maxPage}... (${totalRowsAccumulated} rows)`;

                // Update progress bar
                const progress = p / maxPage;
                progressBar.style.width = `${progress * 100}%`;
                progressText.textContent = `Estimated remaining time: ${estRemainingSeconds.toFixed(1)}s`;

                // Update color based on progress (red -> orange -> green)
                let bgColor = '#ffcccc'; // light red
                if (progress >= 1.0) bgColor = '#ccffcc'; // light green
                else if (progress >= 0.5) bgColor = '#ffe0b2'; // light orange

                progressBar.style.backgroundColor = bgColor;
                activeBtn.style.backgroundColor = bgColor;

                // Detailed statistics per page fetch
                Lib.info('fetch', `Page ${p}/${maxPage} processed in ${(pageDuration / 1000).toFixed(2)}s. Rows on page: ${rowsInThisPage}. Total: ${totalRowsAccumulated}`);

                if (activeDefinition.tableMode === 'multi') {
                    const summaryParts = groupedRows.map(g => {
                        const curPageCount = pageCategoryMap.get(g.category) || 0;
                        return `${g.category}: +${curPageCount} (Total: ${g.rows.length})`;
                    });
                    Lib.debug('fetch', `  Summary: ${summaryParts.join(' | ')}`);
                }
            }

            totalFetchingTime = performance.now() - fetchingTimeStart;
            let renderingTimeStart = performance.now();

            // --- RENDERING START ---
            Lib.debug('render', 'DOM rendering starting...');

            const totalRows = (activeDefinition.tableMode === 'multi') ?
                             groupedRows.reduce((acc, g) => acc + g.rows.length, 0) : allRows.length;

            updateH2Count(totalRows, totalRows);

            activeBtn.disabled = false;
            activeBtn.classList.remove('mb-show-all-btn-loading');
            allActionButtons.forEach(b => b.disabled = false);
            stopBtn.style.display = 'none';
            progressContainer.style.display = 'none';

            // Only show filter container if it wasn't already appended to H2 (handled in updateH2Count or renderGroupedTable)
            if (!filterContainer.parentNode) {
                filterContainer.style.display = 'inline-flex';
            }

            document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());

            // Backup original order for tri-state sorting
            if (activeDefinition.tableMode === 'multi') {
                groupedRows.forEach(g => { g.originalRows = [...g.rows]; });
                renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else {
                originalAllRows = [...allRows];
                renderFinalTable(allRows);
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
            statusDisplay.textContent = `Loaded ${pagesProcessed} ${pageLabel} (${totalRows} rows), Fetching: ${fetchSeconds}s, Initial rendering: ${renderSeconds}s`;
            timerDisplay.textContent = ''; // Explicitly clear any temp text

            Lib.info('success', `Process complete. Final Row Count: ${totalRowsAccumulated}. Total Time: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);
        } catch (err) {
            Lib.error('fetch', 'Critical Error during fetch:', err);
            statusDisplay.textContent = 'Error during load... (repress the "Show all" button)';
            progressContainer.style.display = 'none';
            activeBtn.disabled = false;
            allActionButtons.forEach(b => b.disabled = false);
            activeBtn.style.backgroundColor = '';
            activeBtn.style.color = '';
        }
    }

    function renderFinalTable(rows) {
        // Access rows.length to get the actual count
        const rowCount = Array.isArray(rows) ? rows.length : 0;
        Lib.info('render', `Starting renderFinalTable with ${rowCount} rows.`);

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

        if (rowCount > 0) {
            rows.forEach(r => tbody.appendChild(r));
        } else {
            Lib.error('render', 'No rows provided to renderFinalTable.');
        }

        Lib.info('render', `Finished renderFinalTable. Injected ${rowCount} rows into DOM.`);
    }

    function renderGroupedTable(dataArray, isArtistMain, query = '') {
        Lib.info('render', `Starting renderGroupedTable with ${dataArray.length} categories. Query: "${query}"`);

        const container = document.getElementById('content') || document.querySelector('table.tbl')?.parentNode;
        if (!container) {
            Lib.error('render', 'Abort: #content container not found.');
            return;
        }

        let templateHead = null;
        const firstTable = document.querySelector('table.tbl');
        if (firstTable && firstTable.tHead) {
            Lib.info('render', 'Cloning table head for template.');
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
            Lib.info('render', 'No query provided; performing initial cleanup of existing elements.');
            // Updated cleanup: remove H3s and tables, but NEVER remove H3s containing 'span.worklink'
            container.querySelectorAll('h3, table.tbl, .mb-master-toggle').forEach(el => {
                if (el.tagName === 'H3' && el.querySelector('span.worklink')) {
                    Lib.info('render', 'Skipping removal of H3 containing worklink.');
                    return;
                }
                el.remove();
            });

            if (targetHeader) {
                Lib.info('render', ` Injecting master toggle and filter container after target header ${targetH2Name}.`);
                const masterToggle = document.createElement('span');
                masterToggle.className = 'mb-master-toggle';

                const showSpan = document.createElement('span');
                showSpan.textContent = 'Show';
                showSpan.title = 'Show all sub-tables';
                showSpan.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Lib.info('render', 'Master toggle: Showing all tables.');
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
                    Lib.info('render', 'Master toggle: Hiding all tables.');
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
            Lib.info('render', `Filtering: Cleaning up overflow tables beyond data length (${dataArray.length}).`);
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
            Lib.info('render', `Processing group: "${group.category}" with ${group.rows.length} rows.`);
            let table, h3, tbody;
            if (query && existingTables[index]) {
                Lib.info('render', `Reusing existing table at index ${index} for group "${group.category}".`);
                table = existingTables[index];
                h3 = table.previousElementSibling;
                tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
            } else {
                Lib.info('render', `Creating new table and H3 for group "${group.category}".`);
                h3 = document.createElement('h3');
                h3.className = 'mb-toggle-h3';
                h3.title = 'Collapse/Uncollapse table section';
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

            group.rows.forEach(r => tbody.appendChild(r));

            if (!query) {
                // Logic changed: Do not hide the table or H3 even if group.rows.length is 0
                table.style.display = '';
                h3.style.display = '';

                const catLower = group.category.toLowerCase();
                const shouldStayOpen = (catLower === 'album' || catLower === 'official') && group.rows.length < Lib.settings.sa_auto_expand;
                table.style.display = shouldStayOpen ? '' : 'none';
                Lib.info('render', `Group "${group.category}" auto-expand status: ${shouldStayOpen}`);

                // Ensure the H3 text reflects the unique name established during fetching and Capitalize the first character
                let h3DisplayName = group.category.charAt(0).toUpperCase() + group.category.slice(1);

                h3.innerHTML = `<span class="mb-toggle-icon">${shouldStayOpen ? '▼' : '▲'}</span>${h3DisplayName} <span class="mb-row-count-stat">(${group.rows.length})</span>`;

                // Placement Logic: If targetHeader exists, insert after it/previous element. Otherwise, append to container.
                if (lastInsertedElement) {
                    lastInsertedElement.after(h3);
                    h3.after(table);
                    lastInsertedElement = table; // Update pointer for the next group
                } else {
                    container.appendChild(h3);
                    container.appendChild(table);
                }

                // Add "Show all" button if a seeAllUrl was found
                if (group.seeAllUrl) {
                    const showAllBtn = document.createElement('button');
                    // Use the stored seeAllCount to update button text
                    const countSuffix = group.seeAllCount ? ` ${group.seeAllCount}` : '';
                    showAllBtn.textContent = `Show all${countSuffix}`;
                    showAllBtn.style.cssText = 'font-size:1em; margin-left:10px; padding:1px 4px; cursor:pointer; vertical-align:middle; border-radius:4px;';
                    showAllBtn.type = 'button';
                    showAllBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const targetUrl = new URL(group.seeAllUrl, window.location.origin).href;
                        Lib.debug('navigation', `Opening overflow table: ${targetUrl} (New tab: ${Lib.settings.sa_render_in_new_tab})`);

                        // Set the URL and trigger the global startFetchingProcess logic
                        if (Lib.settings.sa_render_in_new_tab) {
                            window.open(targetUrl, '_blank');
                        } else {
                            window.location.href = targetUrl;
                        }
                    };
                    h3.appendChild(showAllBtn);
                }

                h3.addEventListener('click', () => {
                    const isHidden = table.style.display === 'none';
                    Lib.info('render', `Toggling table for "${group.category}". New state: ${isHidden ? 'visible' : 'hidden'}`);
                    table.style.display = isHidden ? '' : 'none';
                    h3.querySelector('.mb-toggle-icon').textContent = isHidden ? '▼' : '▲';
                });
                makeTableSortableUnified(table, `${group.category}_${index}`);
            } else if (h3 && h3.classList.contains('mb-toggle-h3')) {
                // Update the count in the header during filtering
                const countStat = h3.querySelector('.mb-row-count-stat');
                const totalInGroup = groupedRows.find(g => g.category === group.category)?.rows.length || 0;
                if (countStat) {
                    countStat.textContent = (group.rows.length === totalInGroup) ? `(${totalInGroup})` : `(${group.rows.length} of ${totalInGroup})`;
                }
            }
        });
        Lib.info('render', 'Finished renderGroupedTable.');
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
            h2.title = 'Click to Collapse/Uncollapse section (Ctrl+Click to toggle all in this column)';
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

        // multiTableSortStates.get(sortKey) holds: { lastSortIndex, sortState }
        // sortState: 0 (Original ⇅), 1 (Asc ▲), 2 (Desc ▼)
        if (!multiTableSortStates.has(sortKey)) {
            multiTableSortStates.set(sortKey, { lastSortIndex: -1, sortState: 0 });
        }
        const state = multiTableSortStates.get(sortKey);

        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'default';

            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            th.innerHTML = ''; // Clear for new icon layout

            const createIcon = (char, targetState) => {
                const span = document.createElement('span');
                span.className = 'sort-icon-btn';
                // Set Tooltip texts
                if (char === '⇅') span.title = 'Original sort order';
                else if (char === '▲') span.title = 'Ascending sort order';
                else if (char === '▼') span.title = 'Descending sort order';

                // Initial highlighting: Check if this specific icon corresponds to the saved state
                if (state.lastSortIndex === index && state.sortState === targetState) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;

                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 1. Identify Target Data
                    let targetRows = [];
                    let originalRows = [];
                    let targetGroup = null;

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

                    // 2. Setup UI Feedback
                    Lib.debug('sort', `Sorting table "${sortKey}" by column: "${colName}" (index: ${index}) to state ${targetState}...`);
                    sortTimerDisplay.textContent = 'Sorting...⏳';

                    const rowCount = targetRows.length;
                    const showWaitCursor = rowCount > 1000;

                    if (showWaitCursor) document.body.classList.add('mb-sorting-active');

                    // 3. Execution (Time-delayed to allow UI render)
                    setTimeout(() => {
                        const startSort = performance.now();

                        // Update State
                        state.lastSortIndex = index;
                        state.sortState = targetState;

                        // Reset visual state for all header buttons in THIS table
                        table.querySelectorAll('.sort-icon-btn').forEach(btn => btn.classList.remove('sort-icon-active'));
                        // Highlight only this specific icon
                        span.classList.add('sort-icon-active');

                        // Perform Sort
                        let sortedData = [];
                        if (state.sortState === 0) {
                            sortedData = [...originalRows];
                        } else {
                            // Clone before sorting to avoid modifying the original array reference in place immediately
                            sortedData = [...targetRows];
                            const isNumeric = colName.includes('Year') || colName.includes('Releases');
                            const isAscending = state.sortState === 1;

                            sortedData.sort((a, b) => {
                                const valA = getCleanVisibleText(a.cells[index]).trim().toLowerCase() || '';
                                const valB = getCleanVisibleText(b.cells[index]).trim().toLowerCase() || '';
                                if (isNumeric) {
                                    const numA = parseFloat(valA.replace(/[^0-9.]/g, '')) || 0;
                                    const numB = parseFloat(valB.replace(/[^0-9.]/g, '')) || 0;
                                    return isAscending ? numA - numB : numB - numA;
                                }
                                return isAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                            });
                        }

                        // Apply Sorted Data back to Source variables
                        if (isMultiTable && targetGroup) {
                            targetGroup.rows = sortedData;
                        } else {
                            allRows = sortedData;
                        }

                        // Re-run filter and render
                        runFilter();

                        const duration = ((performance.now() - startSort) / 1000).toFixed(2);
                        sortTimerDisplay.textContent = `Sorted "${colName}": ${duration}s`;
                        if (showWaitCursor) document.body.classList.remove('mb-sorting-active');

                    }, 50); // A short 50ms delay is enough for the UI to paint the "⏳" icon
                };
                return span;
            };

            th.appendChild(createIcon('⇅', 0));
            th.appendChild(document.createTextNode(` ${colName} `));
            th.appendChild(createIcon('▲', 1));
            th.appendChild(createIcon('▼', 2));
        });
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
            Lib.info('cleanup', `Final cleanup complete: Removed a total of ${totalRemoved} consecutive <br> tags across ${instancesFound} locations.`);
        } else {
            Lib.info('cleanup', 'Final cleanup complete: No consecutive <br> tags found.');
        }
    }

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
})();
