// ==UserScript==
// @name         VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.7.1+2026-02-03
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
    {version: '1.7.1+2026-02-03', description: 'Add support for RegExp filtering with an additional "Rx" checkbox.'},
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

    let pageType = '';
    let headerContainer = document.querySelector('.artistheader h1') ||
                          document.querySelector('.rgheader h1') ||
                          document.querySelector('.labelheader h1') ||
                          document.querySelector('.seriesheader h1') ||
                          document.querySelector('.placeheader h1') ||
                          document.querySelector('.recordingheader h1') ||
                          document.querySelector('h1 a bdi')?.parentNode ||
                          document.querySelector('h1');

    // Logic for Work pages
    const isWorkRecordings =
        path.startsWith('/work/') &&
        params.get('direction') === '2' &&
        params.get('link_type_id') === '278';
    const isWorkBase = path.match(/\/work\/[a-f0-9-]{36}$/) && !isWorkRecordings;

    // Logic for the 4 specific Artist Release Groups views
    const isOfficialArtist =
        path.startsWith('/artist/') &&
        params.get('all') === '0' &&
        params.get('va') === '0';
    const isOfficialArtistBase = path.match(/\/artist\/[a-f0-9-]{36}$/) && !isOfficialArtist;

    const isNonOfficialArtist =
        path.startsWith('/artist/') &&
        params.get('all') === '1' &&
        params.get('va') === '0';
    const isNonOfficialArtistBase = path.match(/\/artist\/[a-f0-9-]{36}$/) && !isNonOfficialArtist;

    const isOfficialVariousArtists =
        path.startsWith('/artist/') &&
        params.get('all') === '0' &&
        params.get('va') === '1';
    const isOfficialVariousArtistsBase = path.match(/\/artist\/[a-f0-9-]{36}$/) && !isOfficialVariousArtists;

    const isNonOfficialVariousArtists =
        path.startsWith('/artist/') &&
        params.get('all') === '1' &&
        params.get('va') === '1';
    const isNonOfficialVariousArtistsBase = path.match(/\/artist\/[a-f0-9-]{36}$/) && !isNonOfficialVariousArtists;

    const isSpecialArtistView = isOfficialArtist || isNonOfficialArtist || isOfficialVariousArtists || isNonOfficialVariousArtists;

    // Logic for the 2 specific Artist Releases views
    const isOfficialArtistReleases =
        path.match(/\/artist\/[a-f0-9-]{36}\/releases$/) &&
        params.get('va') === '0';
    const isOfficialArtistReleasesBase = path.match(/\/artist\/[a-f0-9-]{36}\/releases$/) && !isOfficialArtistReleases;

    const isVariousArtistReleases =
        path.match(/\/artist\/[a-f0-9-]{36}\/releases$/) &&
        params.get('va') === '1';
    const isVariousArtistReleasesBase = path.match(/\/artist\/[a-f0-9-]{36}\/releases$/) && !isVariousArtistReleases;

    const isSpecialReleasesView = isOfficialArtistReleases || isVariousArtistReleases;

    // Determine page type using the requested priority structure
    if (isWorkRecordings || isWorkBase) pageType = 'work-recordings';
    else if (isSpecialArtistView || path.match(/\/artist\/[a-f0-9-]{36}$/)) pageType = 'artist-releasegroups';
    else if (isSpecialReleasesView || path.match(/\/artist\/[a-f0-9-]{36}\/releases$/)) pageType = 'releases'; // Updated for Releases
    else if (path.includes('/recordings')) pageType = 'recordings';
    else if (path.includes('/releases')) pageType = 'releases';
    else if (path.includes('/works')) pageType = 'works';
    else if (path.includes('/release-group/')) pageType = 'releasegroup-releases';
    else if (path.includes('/recording')) pageType = 'recording-releases';
    else if (path.includes('/label')) pageType = 'label-releases';
    else if (path.includes('/series')) pageType = 'series-releases';
    else if (path.match(/\/place\/.*\/events/)) pageType = 'place-concerts';
    else if (path.match(/\/place\/.*\/performances/)) pageType = 'place-performances';
    else if (path.includes('/events')) pageType = 'events';

    if (pageType) Lib.prefix = `[VZ-ShowAllEntities: ${pageType}]`;
    Lib.info('init', 'Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        Lib.error('init', 'Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    const typesWithSplitCD = ['releasegroup-releases', 'releases', 'recording-releases', 'label-releases', 'series-releases'];
    const typesWithSplitLocation = ['events'];

    // --- UI Elements ---
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mb-show-all-controls-container';
    controlsContainer.style.cssText = 'display:inline-flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:10px; vertical-align:middle; line-height:1;';

    const allActionButtons = [];

    if (pageType === 'artist-releasegroups') {
        const extraConfigs = [
            { title: 'Official artist RGs', params: { all: '0', va: '0' } },
            { title: 'Non-official artist RGs', params: { all: '1', va: '0' } },
            { title: 'Official various artists RGs', params: { all: '0', va: '1' } },
            { title: 'Non-official various artists RGs', params: { all: '1', va: '1' } }
        ];

        extraConfigs.forEach(conf => {
            const eb = document.createElement('button');
            eb.textContent = conf.title;
            eb.style.cssText = 'font-size:0.5em; padding:2px 6px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box;';
            eb.type = 'button';
            eb.onclick = (e) => startFetchingProcess(e, conf.params);
            controlsContainer.appendChild(eb);
            allActionButtons.push(eb);
        });
    } else if (pageType === 'releases' && path.includes('/artist/')) {
        // Support for Artist Releases specific views
        const releaseConfigs = [
            { title: 'Official artist releases', params: { va: '0' } },
            { title: 'Various artist releases', params: { va: '1' } }
        ];

        releaseConfigs.forEach(conf => {
            const eb = document.createElement('button');
            eb.textContent = conf.title;
            eb.style.cssText = 'font-size:0.5em; padding:2px 6px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box;';
            eb.type = 'button';
            eb.onclick = (e) => startFetchingProcess(e, conf.params);
            controlsContainer.appendChild(eb);
            allActionButtons.push(eb);
        });
    } else {
        const mainBtn = document.createElement('button');
        mainBtn.textContent = `Show all ${pageType.replace('-', ' ')}`;
        mainBtn.style.cssText = 'font-size:0.5em; padding:2px 6px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box;';
        mainBtn.type = 'button';
        mainBtn.onclick = (e) => startFetchingProcess(e);
        controlsContainer.appendChild(mainBtn);
        allActionButtons.push(mainBtn);
    }

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
        const table = document.querySelector('table.tbl');
        if (!table) return;
        let allH2s = Array.from(document.querySelectorAll('h2'));
        let targetH2 = null;

        if (pageType === 'artist-releasegroups') {
            targetH2 = document.querySelector('h2.discography');
        } else if (pageType === 'releasegroup-releases') {
            targetH2 = document.querySelector('h2.appears-on-releases') || Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Album'));
        }

        if (!targetH2) {
            for (let i = 0; i < allH2s.length; i++) {
                if (allH2s[i].compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    targetH2 = allH2s[i];
                } else break;
            }
        }

        if (targetH2) {
            const existing = targetH2.querySelector('.mb-row-count-stat');
            if (existing) existing.remove();
            const span = document.createElement('span');
            span.className = 'mb-row-count-stat';
            const countText = (filteredCount === totalCount) ? `(${totalCount})` : `(${filteredCount} of ${totalCount})`;
            span.textContent = countText;

            // Positioning Logic: Ensure the row count stays immediately after header text, before Master Toggle or Global Filter
            const referenceNode = targetH2.querySelector('.mb-master-toggle') || filterContainer;
            if (referenceNode && referenceNode.parentNode === targetH2) {
                targetH2.insertBefore(span, referenceNode);
            } else {
                targetH2.appendChild(span);
            }

            // Append global filter here for non-grouped pages (Artist/RG pages handle this in renderGroupedTable)
            if (pageType !== 'artist-releasegroups' && pageType !== 'releasegroup-releases') {
                if (filterContainer.parentNode !== targetH2) {
                    targetH2.appendChild(filterContainer);
                    filterContainer.style.display = 'inline-flex';
                    filterContainer.style.marginLeft = '15px';
                    filterContainer.style.verticalAlign = 'middle';
                }
            }

            Lib.debug('render', `Updated H2 header count: ${countText}`);
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

        // Apply red box to global filter if active
        filterInput.style.boxShadow = globalQueryRaw ? '0 0 2px 2px red' : '';

        const __activeEl = document.activeElement;
        const __scrollY = window.scrollY;

        Lib.debug('filter', 'runFilter(): active element =', __activeEl?.className || '(none)');

        if (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') {
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
                        // Apply red box to column filter if active
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
                    // Apply red box to column filter if active
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

    function cleanupHeaders(headerElement) {
        if (!headerElement) return;
        const theadRow = (headerElement.tagName === 'THEAD') ? headerElement.querySelector('tr') : headerElement;
        if (!theadRow) return;

        const headers = Array.from(theadRow.cells);
        const indicesToRemove = [];
        headers.forEach((th, idx) => {
            const txt = th.textContent.trim();
            if (Lib.settings.sa_remove_rel && txt.startsWith('Relationships')) indicesToRemove.push(idx);
            else if (Lib.settings.sa_remove_perf && txt.startsWith('Performance Attributes')) indicesToRemove.push(idx);
            else if (Lib.settings.sa_remove_rating && txt.startsWith('Rating')) indicesToRemove.push(idx);
            else if (Lib.settings.sa_remove_tagger && txt.startsWith('Tagger')) indicesToRemove.push(idx);
        });

        indicesToRemove.sort((a, b) => b - a).forEach(idx => theadRow.deleteCell(idx));

        const headerBgColor = '#d3d3d3';
        if (typesWithSplitCD.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            if (!headersText.includes('Country')) {
                const thC = document.createElement('th');
                thC.textContent = 'Country';
                thC.style.backgroundColor = headerBgColor;
                theadRow.appendChild(thC);
            }
            if (!headersText.includes('Date')) {
                const thD = document.createElement('th');
                thD.textContent = 'Date';
                thD.style.backgroundColor = headerBgColor;
                theadRow.appendChild(thD);
            }
        }
        if (typesWithSplitLocation.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            if (!headersText.includes('Location')) {
                const thL = document.createElement('th');
                thL.textContent = 'Location';
                thL.style.backgroundColor = headerBgColor;
                theadRow.appendChild(thL);
            }
        }
    }

    // ... [Remaining script logic follows standard implementation from ShowAllConsolidated.user.js] ...

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
