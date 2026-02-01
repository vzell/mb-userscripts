// ==UserScript==
// @name         VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.3.0+2026-01-30
// @description  Consolidated tool to accumulate paginated MusicBrainz lists (Events, Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      file:///V:/home/vzell/git/mb-userscripts/lib/VZMBLibrary.user.js
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
        sa_remove_tagger: {
            label: "Remove Tagger column",
            type: "checkbox",
            default: false,
            description: "Remove the Tagger column from the list"
        },
        sa_remove_rating: {
            label: "Remove Rating column",
            type: "checkbox",
            default: false,
            description: "Remove the Rating column from the list"
        },
        sa_remove_rel: {
            label: "Remove Relationships column",
            type: "checkbox",
            default: true,
            description: "Remove the Relationships column from the list"
        },
        sa_remove_perf: {
            label: "Remove Performance column",
            type: "checkbox",
            default: true,
            description: "Remove the Performance column from the list"
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

    // Call sidebar init immediately
    initSidebarCollapse();

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

    // Logic for the 4 specific Artist views
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
    else if (path.match(/\/recording\/[a-f0-9-]{36}$/)) pageType = 'releasegroup-releases';
    else if (path.includes('/label')) pageType = 'label';
    else if (path.includes('/series')) pageType = 'series';
    else if (path.includes('/recording')) pageType = 'recording';
    else if (path.match(/\/place\/.*\/events/)) pageType = 'place-concerts';
    else if (path.match(/\/place\/.*\/performances/)) pageType = 'place-performances';
    else if (path.includes('/events')) pageType = 'events';

    if (pageType) Lib.prefix = `[VZ-ShowAllEntities: ${pageType}]`;
    Lib.info('init', 'Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        Lib.error('init', 'Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    const typesWithSplitCD = ['releasegroup-releases', 'releases', 'label', 'series'];
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
    caseLabel.style.cssText = 'font-size:0.8em; cursor:pointer; font-weight:normal; display:flex; align-items:center; height:24px; margin:0;';
    const caseCheckbox = document.createElement('input');
    caseCheckbox.type = 'checkbox';
    caseCheckbox.style.cssText = 'margin-right:2px; vertical-align:middle;';
    caseLabel.appendChild(caseCheckbox);
    caseLabel.appendChild(document.createTextNode('Cc'));
    caseLabel.title = 'Case Sensitive Filtering';

    filterContainer.appendChild(filterWrapper);
    filterContainer.appendChild(caseLabel);

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
        .mb-filter-highlight { color: red; background-color: #FFD700; }
        .mb-col-filter-highlight { color: green; background-color: #FFFFE0; font-weight: bold; }
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

    function highlightText(row, query, isCaseSensitive, targetColIndex = -1) {
        if (!query) return;
        const flags = isCaseSensitive ? 'g' : 'gi';
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
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
                const match = isCaseSensitive ? val.includes(query) : val.toLowerCase().includes(query.toLowerCase());
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
        const globalQueryRaw = filterInput.value;
        const globalQuery = isCaseSensitive ? globalQueryRaw : globalQueryRaw.toLowerCase();

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
                    .map(f => ({ val: isCaseSensitive ? f.raw : f.raw.toLowerCase(), idx: f.idx }))
                    .filter(f => f.val);

                const matches = group.rows.map(r => r.cloneNode(true)).filter(r => {

                    // Reset previous highlights (critical for correct filtering)
                    r.querySelectorAll('.mb-filter-highlight, .mb-col-filter-highlight')
                        .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

                    // Global match
                    const text = getCleanVisibleText(r);
                    const globalHit = !globalQuery || (isCaseSensitive ? text.includes(globalQuery) : text.toLowerCase().includes(globalQuery));

                    // Column matches
                    let colHit = true;
                    for (const f of colFilters) {
                        const cellText = getCleanVisibleText(r.cells[f.idx]);
                        if (!(isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val))) {
                            colHit = false;
                            break;
                        }
                    }

                    const finalHit = globalHit && colHit;
                    if (finalHit) {
                        if (globalQuery) highlightText(r, globalQueryRaw, isCaseSensitive);
                        colFilters.forEach(f => highlightText(r, isCaseSensitive ? f.val : f.val, isCaseSensitive, f.idx));
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
                .map(f => ({ val: isCaseSensitive ? f.raw : f.raw.toLowerCase(), idx: f.idx }))
                .filter(f => f.val);

            const filteredRows = allRows.map(row => row.cloneNode(true)).filter(row => {

                // Reset previous highlights
                row.querySelectorAll('.mb-filter-highlight, .mb-col-filter-highlight')
                    .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

                const text = getCleanVisibleText(row);
                const globalHit = !globalQuery || (isCaseSensitive ? text.includes(globalQuery) : text.toLowerCase().includes(globalQuery));

                let colHit = true;
                for (const f of colFilters) {
                    const cellText = getCleanVisibleText(row.cells[f.idx]);
                    if (!(isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val))) {
                        colHit = false;
                        break;
                    }
                }

                const finalHit = globalHit && colHit;
                if (finalHit) {
                    if (globalQuery) highlightText(row, globalQueryRaw, isCaseSensitive);
                    colFilters.forEach(f => highlightText(row, isCaseSensitive ? f.val : f.val, isCaseSensitive, f.idx));
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
    filterClear.addEventListener('click', () => { filterInput.value = ''; runFilter(); });

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
            ['Place', 'Area', 'Country'].forEach(col => {
                if (!headersText.includes(col)) {
                    const th = document.createElement('th');
                    th.textContent = col;
                    th.style.backgroundColor = headerBgColor;
                    theadRow.appendChild(th);
                }
            });
        }

        if (pageType !== 'artist-releasegroups') {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            if (!headersText.includes('MB-Name')) {
                const thN = document.createElement('th');
                thN.textContent = 'MB-Name';
                thN.style.backgroundColor = headerBgColor;
                theadRow.appendChild(thN);
            }
            if (!headersText.includes('Comment')) {
                const thC = document.createElement('th');
                thC.textContent = 'Comment';
                thC.style.backgroundColor = headerBgColor;
                theadRow.appendChild(thC);
            }
        }
    }

    /**
     * Generalized fetching process
     * @param {Event} e - The click event
     * @param {Object} overrideParams - Specific query parameters for artist-releasegroups buttons
     */
    async function startFetchingProcess(e, overrideParams = null) {
        // Fix: Capture currentTarget immediately before any awaits
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
        if (isWorkBase) {
            Lib.info('fetch', 'Context: isWorkBase. Fetching maxPage with specific parameters.');
            maxPage = await fetchMaxPageGeneric(path, { direction: '2', link_type_id: '278' });
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

        isLoaded = true;
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
                const fetchUrl = new URL(baseUrl);
                fetchUrl.searchParams.set('page', p.toString());

                // Apply parameters
                if (pageType === 'work-recordings') {
                    fetchUrl.searchParams.set('direction', '2');
                    fetchUrl.searchParams.set('link_type_id', '278');
                } else if (overrideParams) {
                    Object.keys(overrideParams).forEach(k => fetchUrl.searchParams.set(k, overrideParams[k]));
                } else {
                    if (params.has('direction')) fetchUrl.searchParams.set('direction', params.get('direction'));
                    if (params.has('link_type_id')) fetchUrl.searchParams.set('link_type_id', params.get('link_type_id'));
                    if (params.has('all')) fetchUrl.searchParams.set('all', params.get('all'));
                    if (params.has('va')) fetchUrl.searchParams.set('va', params.get('va'));
                }

                const html = await fetchHtml(fetchUrl.toString());
                const doc = new DOMParser().parseFromString(html, 'text/html');

                let countryDateIdx = -1;
                let locationIdx = -1;
                let mainColIdx = -1;
                let indicesToExclude = [];
                const mainHeaders = ['Recording', 'Event', 'Release', 'Work', 'Title', 'Name'];

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
                        }
                        if (mainHeaders.includes(txt)) mainColIdx = idx;
                    });
                }
                if (mainColIdx === -1 && pageType === 'releasegroup-releases') mainColIdx = 0;

                let rowsInThisPage = 0;
                let pageCategoryMap = new Map();

                if (pageType === 'artist-releasegroups') {
                    doc.querySelectorAll('table.tbl').forEach(table => {
                        let h3 = table.previousElementSibling;
                        while (h3 && h3.nodeName !== 'H3') h3 = h3.previousElementSibling;
                        const category = h3 ? h3.textContent.trim() : 'Other';

                        // Logic to handle grouped data and repeat headers
                        if (category !== lastCategorySeenAcrossPages) {
                            Lib.debug('fetch', `Type Change: "${category}". Rows so far: ${totalRowsAccumulated}`);
                            groupedRows.push({ category: category, rows: [] });
                            lastCategorySeenAcrossPages = category;
                        }
                        const currentGroup = groupedRows[groupedRows.length - 1];

                        table.querySelectorAll('tbody tr:not(.explanation)').forEach(row => {
                            if (row.cells.length > 1) {
                                const newRow = document.importNode(row, true);
                                [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });
                                currentGroup.rows.push(newRow);
                                rowsInThisPage++;
                                totalRowsAccumulated++;
                                pageCategoryMap.set(category, (pageCategoryMap.get(category) || 0) + 1);
                            }
                        });
                    });
                } else {
                    const tableBody = doc.querySelector('table.tbl tbody');
                    if (tableBody) {
                        let currentStatus = 'Unknown';
                        tableBody.childNodes.forEach(node => {
                            if (node.nodeName === 'TR') {
                                if (node.classList.contains('subh')) {
                                    currentStatus = node.textContent.trim() || 'Unknown';
                                    if (pageType === 'releasegroup-releases' && currentStatus !== lastCategorySeenAcrossPages) {
                                        Lib.debug('fetch', `Subgroup Change/Type: "${currentStatus}". Rows so far: ${totalRowsAccumulated}`);
                                    }
                                } else if (node.cells.length > 1 && !node.classList.contains('explanation')) {
                                    const newRow = document.importNode(node, true);

                                    // Extraction logic for MB-Name and Comment
                                    const tdName = document.createElement('td');
                                    const tdComment = document.createElement('td');
                                    if (mainColIdx !== -1 && pageType !== 'artist-releasegroups') {
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

                                    // Handling Location split
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

                                    [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });

                                    if (typesWithSplitCD.includes(pageType)) {
                                        newRow.appendChild(tdSplitC); newRow.appendChild(tdSplitD);
                                    } else if (typesWithSplitLocation.includes(pageType)) {
                                        newRow.appendChild(tdP); newRow.appendChild(tdA); newRow.appendChild(tdC);
                                    }

                                    if (pageType !== 'artist-releasegroups') {
                                        newRow.appendChild(tdName); newRow.appendChild(tdComment);
                                    }

                                    if (pageType === 'releasegroup-releases') {
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

                if (pageType === 'artist-releasegroups' || pageType === 'releasegroup-releases') {
                    const summaryParts = groupedRows.map(g => {
                        const curPageCount = pageCategoryMap.get(g.category) || 0;
                        return `${g.category}: +${curPageCount} (Total: ${g.rows.length})`;
                    });
                    console.log(`  Summary: ${summaryParts.join(' | ')}`);
                }
            }

            totalFetchingTime = performance.now() - fetchingTimeStart;
            let renderingTimeStart = performance.now();

            // --- RENDERING START ---
            Lib.debug('render', 'DOM rendering starting...');

            const totalRows = (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') ?
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
            if (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') {
                groupedRows.forEach(g => { g.originalRows = [...g.rows]; });
                renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else {
                originalAllRows = [...allRows];
                renderFinalTable(allRows);
                document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                const mainTable = document.querySelector('table.tbl');
                if (mainTable) addColumnFilterRow(mainTable);

                makeSortable();

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

            totalRenderingTime = performance.now() - renderingTimeStart;

            // --- RENDERING END ---
            Lib.debug('render', `DOM rendering finished in ${totalRenderingTime.toFixed(2)}ms`);

            const fetchSeconds = (totalFetchingTime / 1000).toFixed(2);
            const renderSeconds = (totalRenderingTime / 1000).toFixed(2);

            statusDisplay.textContent = `Loaded ${pagesProcessed} pages (${totalRows} rows), Fetching: ${fetchSeconds}s, Initial rendering: ${renderSeconds}s`;
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
        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(r));
    }

    function renderGroupedTable(dataArray, isArtistMain, query = '') {
        const container = document.getElementById('content') || document.querySelector('table.tbl')?.parentNode;
        if (!container) return;

        let templateHead = null;
        const firstTable = document.querySelector('table.tbl');
        if (firstTable && firstTable.tHead) {
            templateHead = firstTable.tHead.cloneNode(true);
            cleanupHeaders(templateHead);
        }

        // Identify the target anchor header based on page type
        let targetHeader = null;
        if (pageType === 'artist-releasegroups') {
            targetHeader = document.querySelector('h2.discography');
        } else if (pageType === 'releasegroup-releases') {
            targetHeader = document.querySelector('h2.appears-on-releases') || Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Album'));
        }

        if (!query) {
            // Updated cleanup: remove H3s and tables, but NEVER remove H3s containing 'span.worklink'
            container.querySelectorAll('h3, table.tbl, .mb-master-toggle').forEach(el => {
                if (el.tagName === 'H3' && el.querySelector('span.worklink')) return;
                el.remove();
            });

            if (targetHeader) {
                const masterToggle = document.createElement('span');
                masterToggle.className = 'mb-master-toggle';

                const showSpan = document.createElement('span');
                showSpan.textContent = 'Show';
                showSpan.title = 'Show all sub-tables';
                showSpan.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                    container.querySelectorAll('table.tbl').forEach(t => t.style.display = 'none');
                    container.querySelectorAll('.mb-toggle-h3').forEach(h => {
                        const icon = h.querySelector('.mb-toggle-icon');
                        if (icon) icon.textContent = '▲';
                    });
                };

                let suffixText = ' all Release Types';
                if (pageType === 'artist-releasegroups') {
                    suffixText = ' all ReleaseGroup Types';
                }
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
            let table, h3, tbody;
            if (query && existingTables[index]) {
                table = existingTables[index];
                h3 = table.previousElementSibling;
                tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
            } else {
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

                h3.innerHTML = `<span class="mb-toggle-icon">${shouldStayOpen ? '▼' : '▲'}</span>${group.category} <span class="mb-row-count-stat">(${group.rows.length})</span>`;

                // Placement Logic: If targetHeader exists, insert after it/previous element. Otherwise, append to container.
                if (lastInsertedElement) {
                    lastInsertedElement.after(h3);
                    h3.after(table);
                    lastInsertedElement = table; // Update pointer for the next group
                } else {
                    container.appendChild(h3);
                    container.appendChild(table);
                }

                h3.addEventListener('click', () => {
                    const isHidden = table.style.display === 'none';
                    table.style.display = isHidden ? '' : 'none';
                    h3.querySelector('.mb-toggle-icon').textContent = isHidden ? '▼' : '▲';
                });
                makeTableSortable(table, `${group.category}_${index}`);
            } else if (h3 && h3.classList.contains('mb-toggle-h3')) {
                // Update the count in the header during filtering
                const countStat = h3.querySelector('.mb-row-count-stat');
                const totalInGroup = groupedRows.find(g => g.category === group.category)?.rows.length || 0;
                if (countStat) {
                    countStat.textContent = (group.rows.length === totalInGroup) ? `(${totalInGroup})` : `(${group.rows.length} of ${totalInGroup})`;
                }
            }
        });
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

    function makeTableSortable(table, sortKey) {
        const headers = table.querySelectorAll('thead tr:first-child th');
        // multiTableSortStates.get(sortKey) holds: { lastSortIndex, sortState }
        // sortState: 0 (Original ⇅), 1 (Asc ▲), 2 (Desc ▼)
        if (!multiTableSortStates.has(sortKey)) multiTableSortStates.set(sortKey, { lastSortIndex: -1, sortState: 0 });
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

                // Initial highlighting
                if (state.lastSortIndex === index && state.sortState === targetState) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;
                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Lib.debug('sort', `Sorting grouped table "${sortKey}" by column: "${colName}" (index: ${index}) to state ${targetState}...`);
                    sortTimerDisplay.textContent = 'Sorting...⏳';

                    const groupIndex = parseInt(sortKey.split('_').pop(), 10);
                    const targetGroup = groupedRows[groupIndex];
                    const rowCount = targetGroup?.rows?.length || 0;
                    const showWaitCursor = rowCount > 1000;

                    if (showWaitCursor) document.body.classList.add('mb-sorting-active');

                    setTimeout(() => {
                        const startSort = performance.now();
                        state.lastSortIndex = index;
                        state.sortState = targetState;

                        // Update visuals: Reset all icons in this TH
                        th.querySelectorAll('.sort-icon-btn').forEach(btn => btn.classList.remove('sort-icon-active'));
                        // Highlight only this specific icon
                        span.classList.add('sort-icon-active');

                        if (targetGroup && targetGroup.rows) {
                            if (state.sortState === 0) {
                                targetGroup.rows = [...targetGroup.originalRows];
                            } else {
                                const isNumeric = colName.includes('Year') || colName.includes('Releases');
                                const isAscending = state.sortState === 1;

                                targetGroup.rows.sort((a, b) => {
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
                        }

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

    function makeSortable() {
        if (pageType === 'artist-releasegroups' || pageType === 'releasegroup-releases') return;
        const table = document.querySelector('table.tbl');
        if (!table) return;
        const headers = table.querySelectorAll('thead tr:first-child th');
        let lastSortIndex = -1;
        let sortState = 0; // 0: Original, 1: Asc, 2: Desc

        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'default';

            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            th.innerHTML = '';

            const createIcon = (char, targetState) => {
                const span = document.createElement('span');
                span.className = 'sort-icon-btn';
                // Set Tooltip texts
                if (char === '⇅') span.title = 'Original sort order';
                else if (char === '▲') span.title = 'Ascending sort order';
                else if (char === '▼') span.title = 'Descending sort order';

                if (lastSortIndex === index && sortState === targetState) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;
                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Lib.debug('sort', `Sorting flat table by column: "${colName}" (index: ${index}) to state ${targetState}...`);
                    sortTimerDisplay.textContent = 'Sorting...⏳';

                    const rowCount = allRows.length;
                    const showWaitCursor = rowCount > 1000;

                    if (showWaitCursor) document.body.classList.add('mb-sorting-active');

                    setTimeout(() => {
                        const startSort = performance.now();
                        lastSortIndex = index;
                        sortState = targetState;

                        // Reset visual state for all header buttons in this table
                        table.querySelectorAll('.sort-icon-btn').forEach(btn => btn.classList.remove('sort-icon-active'));
                        // Highlight this one
                        span.classList.add('sort-icon-active');

                        if (sortState === 0) {
                            allRows = [...originalAllRows];
                        } else {
                            const isNumeric = colName.includes('Year') || colName.includes('Releases');
                            const isAscending = sortState === 1;

                            allRows.sort((a, b) => {
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
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: (res) => resolve(res.responseText),
                onerror: reject
            });
        });
    }
})();
