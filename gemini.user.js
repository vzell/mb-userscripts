// ==UserScript==
// @name         VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities
// @namespace    https://github.com/vzell/mb-userscripts
// @version      2.3.1+2026-02-06
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
// @match        *://*.musicbrainz.org/work/*
// @match        *://*.musicbrainz.org/recording/*
// @match        *://*.musicbrainz.org/label/*
// @match        *://*.musicbrainz.org/series/*
// @match        *://*.musicbrainz.org/place/*/events
// @match        *://*.musicbrainz.org/place/*/performances
// @match        *://*.musicbrainz.org/area/*
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
    {version: '2.3.1+2026-02-06', description: 'Fix: Headers showing as "Unknown" by improving cell detection in sub-headers.'},
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
              info: console.log, debug: console.log, error: console.error, time: console.time, timeEnd: console.timeEnd
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
    const path = currentUrl.pathname;
    const params = currentUrl.searchParams;

    // --- Configuration: Page Definitions ---
    const pageDefinitions = [
        {
            type: 'search',
            match: (path) => path.includes('/search'),
            buttons: [ { label: 'Show all search results' } ],
            tableMode: 'single'
        },
        {
            type: 'area-artists',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/artists/),
            buttons: [ { label: 'Show all Artists for Areas' } ],
            tableMode: 'single'
        },
        {
            type: 'area-events',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Areas' } ],
            features: { splitLocation: true },
            tableMode: 'single'
        },
        {
            type: 'area-labels',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/labels/),
            buttons: [ { label: 'Show all Labels for Areas' } ],
            tableMode: 'single'
        },
        {
            type: 'area-releases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/releases/),
            buttons: [ { label: 'Show all Releases for Areas' } ],
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'area-places',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/places/),
            buttons: [ { label: 'Show all Places for Areas' } ],
            tableMode: 'single'
        },
        {
            type: 'area-aliases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Areas' } ],
            tableMode: 'single'
        },
        {
            type: 'area-recordings',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/recordings/),
            buttons: [ { label: 'Show all Recordings for Areas' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'area-works',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/works/),
            buttons: [ { label: 'Show all Works for Areas' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'place-performances',
            match: (path) => path.match(/\/place\/[a-f0-9-]{36}\/performances/),
            buttons: [ { label: 'Show all Performances for Recordings' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'work-recordings',
            match: (path) => path.match(/\/work\/[a-f0-9-]{36}$/),
            buttons: [ { label: 'Show all Work Recordings' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'artist-relationships',
            match: (path) => path.match(/\/artist\/[a-f0-9-]{36}\/relationships/),
            buttons: [ { label: 'Show all Relationships for Artists' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'artist-aliases',
            match: (path) => path.match(/\/artist\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Artists' } ],
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'artist-releasegroups',
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}$/) && !path.endsWith('/releases'),
            buttons: [
                { label: 'Official artist RGs', params: { all: '0', va: '0' } },
                { label: 'Non-official artist RGs', params: { all: '1', va: '0' } },
                { label: 'Official various artists RGs', params: { all: '0', va: '1' } },
                { label: 'Non-official various artists RGs', params: { all: '1', va: '1' } }
            ],
            tableMode: 'multi'
        },
        {
            type: 'releases',
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/releases$/),
            buttons: [
                { label: 'Official artist releases', params: { va: '0' } },
                { label: 'Various artist releases', params: { va: '1' } }
            ],
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'recordings',
            match: (path) => path.includes('/recordings'),
            features: { splitCD: false },
            tableMode: 'single'
        },
        {
            type: 'releases',
            match: (path) => path.includes('/releases'),
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'works',
            match: (path) => path.includes('/works'),
            tableMode: 'single'
        },
        {
            type: 'releasegroup-releases',
            match: (path) => path.includes('/release-group/'),
            features: { splitCD: true },
            tableMode: 'multi'
        },
        {
            type: 'recording-releases',
            match: (path) => path.includes('/recording'),
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'label-releases',
            match: (path) => path.includes('/label'),
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'series-releases',
            match: (path) => path.includes('/series'),
            features: { splitCD: true },
            tableMode: 'single'
        },
        {
            type: 'place-concerts',
            match: (path) => path.match(/\/place\/.*\/events/),
            tableMode: 'single'
        },
        {
            type: 'events',
            match: (path) => path.includes('/events'),
            features: { splitLocation: true },
            tableMode: 'single'
        }
    ];

    // --- Initialization Logic ---
    let pageType = '';
    let activeDefinition = null;

    for (const def of pageDefinitions) {
        if (def.match(path, params)) {
            pageType = def.type;
            activeDefinition = def;
            Lib.debug('init', `Detected pageType: ${pageType}`);
            Lib.debug('init', `Detected tableMode: ${activeDefinition ? activeDefinition.tableMode : 'unknown'}`);
            break;
        }
    }

    let headerContainer = document.querySelector('.artistheader h1') ||
                          document.querySelector('.rgheader h1') ||
                          document.querySelector('.labelheader h1') ||
                          document.querySelector('.seriesheader h1') ||
                          document.querySelector('.placeheader h1') ||
                          document.querySelector('.areaheader h1') ||
                          document.querySelector('.recordingheader h1') ||
                          document.querySelector('h1 a bdi')?.parentNode ||
                          document.querySelector('h1');

    if (pageType) Lib.prefix = `[VZ-ShowAllEntities: ${pageType}]`;
    Lib.info('init', 'Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        Lib.error('init', 'Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    const typesWithSplitCD = (activeDefinition && activeDefinition.features?.splitCD) ? [pageType] : [];
    const typesWithSplitLocation = (activeDefinition && activeDefinition.features?.splitLocation) ? [pageType] : [];

    // --- UI Elements ---
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mb-show-all-controls-container';
    controlsContainer.style.cssText = 'display:inline-flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:10px; vertical-align:middle; line-height:1;';

    const allActionButtons = [];

    const buttonsToRender = activeDefinition.buttons || [
        { label: `Show all ${pageType.replace('-', ' ')}` }
    ];

    buttonsToRender.forEach(conf => {
        const eb = document.createElement('button');
        eb.textContent = conf.label;
        eb.style.cssText = 'font-size:0.5em; padding:2px 6px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box;';
        eb.type = 'button';
        eb.onclick = (e) => startFetchingProcess(e, conf.params || null);
        controlsContainer.appendChild(eb);
        allActionButtons.push(eb);
    });

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.cssText = 'display:none; font-size:0.5em; padding:2px 6px; cursor:pointer; background-color:#f44336; color:white; border:1px solid #d32f2f; height:24px; box-sizing:border-box;';

    const statusDisplay = document.createElement('span');
    statusDisplay.style.cssText = 'font-size:0.5em; color:#333; display:flex; align-items:center; height:24px; font-weight:bold;';

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
    controlsContainer.appendChild(timerDisplay);
    controlsContainer.appendChild(sortTimerDisplay);

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
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
    document.head.appendChild(styleSheet);

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
    let seenFetchSubgroups = new Map();

    function performClutterCleanup() {
        Lib.info('cleanup', 'Starting clutter element removal.');
        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => div.remove());
        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) table.remove();
        });
        document.querySelectorAll('p').forEach(p => {
            if (p.textContent.includes('Showing official release groups') || p.textContent.includes('Showing all release groups')) p.remove();
        });
        document.querySelectorAll('div[style*="width: 700px"] > div.slider.multiple-items').forEach(div => {
            const parent = div.parentElement;
            if (parent && parent.style.width === '700px') parent.remove();
        });
        document.querySelectorAll('details').forEach(det => {
            if (det.querySelectorAll('img').length > 5) det.remove();
        });
        if (pageType === 'events' || pageType === 'artist-releasegroups') removeSanojjonasContainers();
    }

    async function fetchMaxPageGeneric(targetPath, queryParams = {}) {
        const url = new URL(window.location.origin + targetPath);
        Object.keys(queryParams).forEach(k => url.searchParams.set(k, queryParams[k]));
        url.searchParams.set('page', '1');
        try {
            const html = await fetchHtml(url.toString());
            const doc = new DOMParser().parseFromString(html, 'text/html');
            let maxPage = 1;
            const pagination = doc.querySelector('ul.pagination');
            if (pagination) {
                const links = Array.from(pagination.querySelectorAll('li a'));
                const nextIdx = links.findIndex(a => a.textContent.trim() === 'Next');
                if (nextIdx > 0) {
                    const p = new URL(links[nextIdx - 1].href, window.location.origin).searchParams.get('page');
                    if (p) maxPage = parseInt(p, 10);
                }
            }
            return maxPage;
        } catch (err) {
            return 1;
        }
    }

    function removeSanojjonasContainers() {
        ['load', 'load2', 'load3', 'load4', 'bottom1', 'bottom2', 'bottom3', 'bottom4', 'bottom5', 'bottom6'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }

    function updateH2Count(filteredCount, totalCount) {
        const table = document.querySelector('table.tbl');
        if (!table) return;
        let targetH2 = null;
        if (pageType === 'artist-releasegroups') targetH2 = document.querySelector('h2.discography');
        else if (pageType === 'releasegroup-releases') targetH2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Album'));
        else if (pageType === 'place-performances') targetH2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Performances'));

        if (targetH2) {
            const existing = targetH2.querySelector('.mb-row-count-stat');
            if (existing) existing.remove();
            const span = document.createElement('span');
            span.className = 'mb-row-count-stat';
            span.textContent = (filteredCount === totalCount) ? `(${totalCount})` : `(${filteredCount} of ${totalCount})`;
            const referenceNode = targetH2.querySelector('.mb-master-toggle') || filterContainer;
            if (referenceNode && referenceNode.parentNode === targetH2) targetH2.insertBefore(span, referenceNode);
            else targetH2.appendChild(span);

            if (!['artist-releasegroups', 'releasegroup-releases', 'place-performances'].includes(pageType)) {
                if (filterContainer.parentNode !== targetH2) {
                    targetH2.appendChild(filterContainer);
                    filterContainer.style.display = 'inline-flex';
                    filterContainer.style.marginLeft = '15px';
                    filterContainer.style.verticalAlign = 'middle';
                }
            }
        }
    }

    function getCleanVisibleText(element) {
        let textParts = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName.toLowerCase();
                    if (['script', 'style', 'head'].includes(tag)) return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let node;
        while (node = walker.nextNode()) if (node.nodeType === 3) textParts.push(node.textContent);
        return textParts.join(' ').replace(/\s+/g, ' ').trim();
    }

    async function startFetchingProcess(event, overrideParams = null) {
        if (isLoaded) {
            location.reload();
            return;
        }

        const activeBtn = event.currentTarget;
        activeBtn.disabled = true;
        activeBtn.classList.add('mb-show-all-btn-loading', 'mb-show-all-btn-active');
        allActionButtons.forEach(b => { if (b !== activeBtn) b.style.display = 'none'; });
        stopBtn.style.display = 'flex';
        progressContainer.style.display = 'inline-block';
        seenFetchSubgroups.clear();

        performClutterCleanup();
        const maxPage = await fetchMaxPageGeneric(path, overrideParams || {});
        if (maxPage > Lib.settings.sa_max_page) {
            if (!confirm(`Warning: This will fetch ${maxPage} pages. Continue?`)) {
                location.reload();
                return;
            }
        }

        const fetchingTimeStart = performance.now();
        const baseUrl = window.location.origin + window.location.pathname;
        let lastCategorySeenAcrossPages = null;
        let totalRowsAccumulated = 0;

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) break;
                const fetchUrl = new URL(baseUrl);
                fetchUrl.searchParams.set('page', p.toString());
                if (overrideParams) Object.keys(overrideParams).forEach(k => fetchUrl.searchParams.set(k, overrideParams[k]));
                else {
                    ['direction', 'link_type_id', 'all', 'va'].forEach(k => {
                        if (params.has(k)) fetchUrl.searchParams.set(k, params.get(k));
                    });
                }

                const html = await fetchHtml(fetchUrl.toString());
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const tableBody = doc.querySelector('table.tbl tbody');

                if (tableBody) {
                    let currentStatus = 'Unknown';
                    tableBody.childNodes.forEach(node => {
                        if (node.nodeName === 'TR') {
                            if (node.classList.contains('subh')) {
                                // IMPROVED HEADER DETECTION: Check for th/td and normalize whitespace
                                const headerCell = node.querySelector('th, td');
                                let rawName = (headerCell ? headerCell.textContent : node.textContent).replace(/\s+/g, ' ').trim() || 'Unknown';

                                if (seenFetchSubgroups.has(rawName)) {
                                    let count = seenFetchSubgroups.get(rawName) + 1;
                                    seenFetchSubgroups.set(rawName, count);
                                    currentStatus = `${rawName} (${count})`;
                                } else {
                                    seenFetchSubgroups.set(rawName, 1);
                                    currentStatus = rawName;
                                }

                                if (['releasegroup-releases', 'place-performances'].includes(pageType) && currentStatus !== lastCategorySeenAcrossPages) {
                                    Lib.debug('fetch', `Subgroup Change: "${currentStatus}".`);
                                }
                                lastCategorySeenAcrossPages = currentStatus;
                            } else if (node.cells.length > 1 && !node.classList.contains('explanation')) {
                                const newRow = document.importNode(node, true);
                                if (activeDefinition.tableMode === 'multi') {
                                    let existingGroup = groupedRows.find(g => g.category === currentStatus);
                                    if (existingGroup) existingGroup.rows.push(newRow);
                                    else groupedRows.push({ category: currentStatus, rows: [newRow] });
                                } else {
                                    allRows.push(newRow);
                                }
                                totalRowsAccumulated++;
                            }
                        }
                    });
                }
                updateProgress(p, maxPage, performance.now() - fetchingTimeStart);
            }

            if (activeDefinition.tableMode === 'multi') {
                groupedRows.forEach(g => { g.originalRows = [...g.rows]; });
                renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else {
                originalAllRows = [...allRows];
                renderFinalTable(allRows);
            }

            finalCleanup();
            makeH2sCollapsible();
            isLoaded = true;
            initSidebarCollapse();

        } catch (err) {
            Lib.error('fetch', 'Error during process:', err);
        } finally {
            activeBtn.disabled = false;
            activeBtn.classList.remove('mb-show-all-btn-loading');
            stopBtn.style.display = 'none';
            progressContainer.style.display = 'none';
        }
    }

    function updateProgress(current, total, elapsed) {
        const percent = (current / total) * 100;
        progressBar.style.width = percent + '%';
        const remaining = (elapsed / current) * (total - current);
        progressText.textContent = `Page ${current}/${total} - Est. ${Math.round(remaining / 1000)}s left`;
    }

    function renderFinalTable(rows) {
        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(r));
        updateH2Count(rows.length, originalAllRows.length);
    }

    function renderGroupedTable(dataArray, isArtistMain) {
        const container = document.getElementById('content') || document.querySelector('table.tbl')?.parentNode;
        if (!container) return;
        container.querySelectorAll('h3, table.tbl, .mb-master-toggle').forEach(el => el.remove());

        dataArray.forEach(group => {
            const h3 = document.createElement('h3');
            h3.className = 'mb-toggle-h3';
            h3.textContent = group.category;
            const table = document.createElement('table');
            table.className = 'tbl';
            const tbody = document.createElement('tbody');
            group.rows.forEach(r => tbody.appendChild(r));
            table.appendChild(tbody);
            container.appendChild(h3);
            container.appendChild(table);
        });
    }

    function makeH2sCollapsible() {
        document.querySelectorAll('h2').forEach(h2 => {
            if (h2.classList.contains('mb-h2-processed')) return;
            h2.classList.add('mb-h2-processed', 'mb-toggle-h2');
            h2.style.cursor = 'pointer';
            h2.addEventListener('click', () => {
                let next = h2.nextElementSibling;
                while (next && next.tagName !== 'H2') {
                    next.style.display = next.style.display === 'none' ? '' : 'none';
                    next = next.nextElementSibling;
                }
            });
        });
    }

    function finalCleanup() {
        document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());
    }

    function fetchHtml(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: (res) => resolve(res.responseText),
                onerror: reject
            });
        });
    }
})();
