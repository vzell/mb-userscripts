// ==UserScript==
// @name         AA: MusicBrainz - Test Script
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-28
// @description  Test userscript
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/AA.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/AA.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/artist/*
// @match        *://*.musicbrainz.org/release-group/*
// @match        *://*.musicbrainz.org/work/*
// @match        *://*.musicbrainz.org/recording/*
// @match        *://*.musicbrainz.org/label/*
// @match        *://*.musicbrainz.org/series/*
// @match        *://*.musicbrainz.org/place/*/events
// @match        *://*.musicbrainz.org/place/*/performances
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      MIT
// ==/UserScript==

// ==UserScript==
// @name         VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-28
// @description  Consolidated tool to accumulate paginated MusicBrainz lists (Events, Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/artist/*
// @match        *://*.musicbrainz.org/release-group/*
// @match        *://*.musicbrainz.org/work/*
// @match        *://*.musicbrainz.org/recording/*
// @match        *://*.musicbrainz.org/label/*
// @match        *://*.musicbrainz.org/series/*
// @match        *://*.musicbrainz.org/place/*/events
// @match        *://*.musicbrainz.org/place/*/performances
// @grant        GM_xmlhttpRequest
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

// CHANGELOG - The most important updates/versions:
let changelog = [
    {version: '0.9.1+2026-01-28', description: 'Added "Esc" key handling for clearing the filter fields when focused,'},
    {version: '0.9.0+2026-01-28', description: '1st official release version.'}
];

(function() {
    'use strict';

    const DEBUG = true;
    let registeredMenuCommandIDs = [];

    // Check if we just reloaded to fix the filter issue
    const reloadFlag = sessionStorage.getItem('mb_show_all_reload_pending');
    if (reloadFlag) {
        sessionStorage.removeItem('mb_show_all_reload_pending');
        alert('The underlying MusicBrainz page has been reloaded to ensure filter stability. Please click the desired "Show all" button again to start the process.');
    }

    // --- Settings & Menu ---
    const settings = {
        removeTagger: GM_getValue("removeTagger", false),
        removeRating: GM_getValue("removeRating", false),
        removeRelationships: GM_getValue("removeRelationships", true),
        removePerformance: GM_getValue("removePerformance", true),
        maxPageThreshold: GM_getValue("maxPageThreshold", 100),
        autoExpandThreshold: GM_getValue("autoExpandThreshold", 60),

        /**
         * Refresh the Tampermonkey menu entries to show current states and values.
         */
        setupMenu: function() {
            for (const id of registeredMenuCommandIDs) {
                try { GM_unregisterMenuCommand(id); } catch (e) { /* ignore */ }
            }
            registeredMenuCommandIDs = [];

            const register = (label, fn) => {
                const id = GM_registerMenuCommand(label, fn);
                registeredMenuCommandIDs.push(id);
            };

            // Boolean Toggles
            const bools = [
                { key: "removeTagger", label: "Remove Tagger Column" },
                { key: "removeRating", label: "Remove Rating Column" },
                { key: "removeRelationships", label: "Remove Relationships Column" },
                { key: "removePerformance", label: "Remove Performance Attributes Column" }
            ];

            bools.forEach(item => {
                const icon = this[item.key] ? "☑" : "☐";
                register(`${icon} ${item.label}`, () => {
                    this[item.key] = !this[item.key];
                    GM_setValue(item.key, this[item.key]);
                    log(`Setting changed: ${item.key} = ${this[item.key]}`);
                    this.setupMenu();
                });
            });

            // Numeric Thresholds (Prompts)
            register(`Max Fetch Page Threshold before Warning: ${this.maxPageThreshold}`, () => {
                const val = prompt("Enter new Max Page Warning Threshold:", this.maxPageThreshold);
                const num = parseInt(val, 10);
                if (!isNaN(num) && num > 0) {
                    this.maxPageThreshold = num;
                    GM_setValue("maxPageThreshold", num);
                    this.setupMenu();
                }
            });

            register(`Table Auto-Expand Threshold for Type Album: ${this.autoExpandThreshold}`, () => {
                const val = prompt("Enter new Auto-Expand Row Threshold:", this.autoExpandThreshold);
                const num = parseInt(val, 10);
                if (!isNaN(num) && num >= 0) {
                    this.autoExpandThreshold = num;
                    GM_setValue("autoExpandThreshold", num);
                    this.setupMenu();
                }
            });

            // Added ChangeLog menu entry mimicking Stig's Art Grabr userscript behavior
            register("ChangeLog", () => {
                let logDiv = document.getElementById('vz-changelog');
                if (!logDiv) {
                    logDiv = document.createElement("div");
                    logDiv.id = "vz-changelog";
                    logDiv.style.cssText = "position:fixed; left:0; right:0; top:10em; z-index:3000009; margin-left:auto; margin-right:auto; min-height:8em; width:50%; background-color:#eee; color:#111; border-radius:5px; padding:1em; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid #ccc; display:none;";

                    const title = document.createElement("b");
                    title.textContent = "VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities ... (click to make the ChangeLog window vanish)";
                    logDiv.appendChild(title);

                    const list = document.createElement("ul");
                    list.style.marginTop = "0.5em";

                    changelog.forEach(entry => {
                        const li = document.createElement("li");
                        li.innerHTML = `<i>${entry.version}</i> - ${entry.description}`;
                        list.appendChild(li);
                    });

                    logDiv.appendChild(list);
                    document.body.appoendChild(logDiv);

                    logDiv.addEventListener('click', () => {
                        logDiv.style.display = 'none';
                    }, false);
                }
                logDiv.style.display = 'block';
            });
        }
    };

    // Initialize Menu
    settings.setupMenu();

    let logPrefix = "[MB-ShowAll-Debug]";
    const log = (msg, data = '') => { if (DEBUG) console.log(`${logPrefix} ${msg}`, data); };

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

    // Determine page type using the requested priority structure
    if (isWorkRecordings || isWorkBase) pageType = 'work-recordings';
    else if (isSpecialArtistView || path.match(/\/artist\/[a-f0-9-]{36}$/)) pageType = 'artist-releasegroups';
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

    if (pageType) logPrefix = `[MB-ShowAll-Debug: ${pageType}]`;
    log('Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        log('Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
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

    const filterContainer = document.createElement('span');
    // Initially hidden; will be displayed when appended to H2
    filterContainer.style.cssText = 'display:none; align-items:center; white-space:nowrap; gap:5px;';

    const filterWrapper = document.createElement('span');
    filterWrapper.style.cssText = 'position:relative; display:inline-block;';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Global Filter...`;
    filterInput.title = 'Enter global filter string';
    filterInput.style.cssText = 'font-size:0.5em; padding:2px 20px 2px 6px; border:2px solid #ccc; border-radius:3px; width:500px; height:24px; box-sizing:border-box; transition:box-shadow 0.2s;';

    const filterClear = document.createElement('span');
    filterClear.textContent = '✕';
    filterClear.style.cssText = 'position:absolute; right:5px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:0.6em; color:#999; user-select:none;';
    filterClear.title = 'Clear global filter';

    filterWrapper.appendChild(filterInput);
    filterWrapper.appendChild(filterClear);

    const caseLabel = document.createElement('label');
    caseLabel.style.cssText = 'font-size:0.4em; cursor:pointer; font-weight:normal; display:flex; align-items:center; height:24px; margin:0;';
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
    // Filter container is NOT appended here anymore; moved to H2 later
    controlsContainer.appendChild(timerDisplay);
    controlsContainer.appendChild(sortTimerDisplay);

    const style = document.createElement('style');
    style.textContent = `
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
        .mb-toggle-h3 { cursor: pointer; user-select: none; border-bottom: 1px solid #eee; padding: 4px 0; margin-left: 1.5em; }
        .mb-toggle-h3:hover { color: #222; background-color: #f9f9f9; }
        .mb-toggle-h2 { cursor: pointer; user-select: none; }
        .mb-toggle-icon { font-size: 0.8em; margin-right: 8px; color: #666; width: 12px; display: inline-block; cursor: pointer; }
        .mb-master-toggle { color: #0066cc; font-weight: bold; margin-left: 15px; font-size: 0.8em; vertical-align: middle; display: inline-block; cursor: default; }
        .mb-master-toggle span { cursor: pointer; }
        .mb-master-toggle span:hover { text-decoration: underline; }
        .mb-filter-highlight { color: red; background-color: #FFD700; }
        .mb-col-filter-highlight { color: green; background-color: #FFFFE0; font-weight: bold; }
        .mb-col-filter-input {
            width: 100%;
            font-size: 0.8em;
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

    async function fetchMaxPageGeneric(targetPath, queryParams = {}) {
        const url = new URL(window.location.origin + targetPath);
        Object.keys(queryParams).forEach(k => url.searchParams.set(k, queryParams[k]));
        url.searchParams.set('page', '1');
        log('Fetching maxPage from:', url.toString());
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
            log(`Determined maxPage: ${maxPage}`);
            return maxPage;
        } catch (err) {
            log('Error fetching maxPage:', err);
            return 1;
        }
    }

    function removeSanojjonasContainers() {
        log('Removing Sanojjonas containers...');
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
        log('Signalling other scripts to stop...');
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

            log(`Updated H2 header count: ${countText}`);
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
                log(`Column filter updated on column ${idx}: "${input.value}"`);
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

        log('runFilter(): active element =', __activeEl?.className || '(none)');

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
                        inp.style.boxShadow = inp.value ? '0 0 2px 2px red' : '';
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

                log(`Attempting focus restore: tableIdx=${tableIdx}, colIdx=${colIdx}`);

                if (allTables[tableIdx]) {
                    const newInput = allTables[tableIdx]
                        .querySelector(`.mb-col-filter-input[data-col-idx="${colIdx}"]`);
                    if (newInput) {
                        newInput.focus();
                        newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
                        log('Restored focus to column filter input');
                    } else {
                        log('Could not find replacement column filter input');
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
                    inp.style.boxShadow = inp.value ? '0 0 2px 2px red' : '';
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
        log('Stop requested by user.');
        stopRequested = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
    });

    filterInput.addEventListener('input', runFilter);

    // Handle Escape key to clear global filter
    filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            filterInput.value = '';
            runFilter();
        }
    });

    caseCheckbox.addEventListener('change', runFilter);

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
            if (settings.removeRelationships && txt.startsWith('Relationships')) indicesToRemove.push(idx);
            else if (settings.removePerformance && txt.startsWith('Performance')) indicesToRemove.push(idx);
            else if (settings.removeRating && (txt.startsWith('Rating') || th.classList.contains('rating'))) indicesToRemove.push(idx);
            else if (settings.removeTagger && (txt.startsWith('Tagger') || th.classList.contains('tagger'))) indicesToRemove.push(idx);
        });

        // Remove from right to left to avoid index shift
        indicesToRemove.sort((a, b) => b - a).forEach(idx => theadRow.deleteCell(idx));
    }

    function cleanupRows(rows) {
        if (!rows || rows.length === 0) return;
        const sampleRow = rows[0];
        const table = sampleRow.closest('table');
        if (!table) return;

        const thead = table.tHead;
        if (!thead) return;
        const headerRow = thead.querySelector('tr');
        const headers = Array.from(headerRow.cells);
        const indicesToRemove = [];

        headers.forEach((th, idx) => {
            const txt = th.textContent.trim();
            if (settings.removeRelationships && txt.startsWith('Relationships')) indicesToRemove.push(idx);
            else if (settings.removePerformance && txt.startsWith('Performance')) indicesToRemove.push(idx);
            else if (settings.removeRating && (txt.startsWith('Rating') || th.classList.contains('rating'))) indicesToRemove.push(idx);
            else if (settings.removeTagger && (txt.startsWith('Tagger') || th.classList.contains('tagger'))) indicesToRemove.push(idx);
        });

        rows.forEach(row => {
            indicesToRemove.sort((a, b) => b - a).forEach(idx => {
                if (row.cells[idx]) row.deleteCell(idx);
            });
        });
    }

    async function startFetchingProcess(event, extraParams = null) {
        if (isLoaded) return;
        event.preventDefault();

        // Signalling other scripts to stop
        stopOtherScripts();

        // Clean up UI leftovers from Sanojjonas script if present
        removeSanojjonasContainers();

        // Check if there's an existing filter applied via URL (to avoid inconsistencies)
        if (params.get('filter.name') || params.get('filter.artist')) {
            if (confirm('A MusicBrainz-native filter is active. This can cause instability when fetching all pages. Would you like to reload the page without filters first?')) {
                sessionStorage.setItem('mb_show_all_reload_pending', 'true');
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('filter.name');
                cleanUrl.searchParams.delete('filter.artist');
                window.location.href = cleanUrl.toString();
                return;
            }
        }

        allActionButtons.forEach(b => {
            b.disabled = true;
            b.classList.add('mb-show-all-btn-loading');
        });
        stopBtn.style.display = 'inline-flex';

        const startTime = performance.now();
        const updateTimer = () => {
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
            timerDisplay.textContent = ` [Fetch: ${elapsed}s]`;
        };
        const timerInterval = setInterval(updateTimer, 100);

        const currentParams = Object.fromEntries(params.entries());
        if (extraParams) Object.assign(currentParams, extraParams);

        const maxPage = await fetchMaxPageGeneric(path, currentParams);

        if (maxPage > settings.maxPageThreshold) {
            if (!confirm(`This will fetch ${maxPage} pages. Continue?`)) {
                allActionButtons.forEach(b => {
                    b.disabled = false;
                    b.classList.remove('mb-show-all-btn-loading');
                });
                stopBtn.style.display = 'none';
                clearInterval(timerInterval);
                timerDisplay.textContent = '';
                return;
            }
        }

        let totalRowsFetched = 0;
        const allFetchedRows = [];
        const groupingData = [];

        for (let p = 1; p <= maxPage; p++) {
            if (stopRequested) break;
            statusDisplay.textContent = `Fetching page ${p}/${maxPage}...`;

            const url = new URL(window.location.origin + path);
            Object.keys(currentParams).forEach(k => url.searchParams.set(k, currentParams[k]));
            url.searchParams.set('page', p.toString());

            try {
                const html = await fetchHtml(url.toString());
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const table = doc.querySelector('table.tbl');

                if (table) {
                    if (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') {
                        // Grouped processing
                        const sections = Array.from(doc.querySelectorAll('h3, table.tbl'));
                        let currentH3 = 'General';

                        sections.forEach(node => {
                            if (node.tagName === 'H3') {
                                currentH3 = node.textContent.trim();
                            } else if (node.tagName === 'TABLE') {
                                const rows = Array.from(node.querySelectorAll('tbody tr')).filter(r => !r.classList.contains('empty'));
                                cleanupRows(rows);

                                let group = groupingData.find(g => g.category === currentH3);
                                if (!group) {
                                    group = { category: currentH3, rows: [] };
                                    groupingData.push(group);
                                }
                                group.rows.push(...rows);
                                totalRowsFetched += rows.length;
                            }
                        });
                    } else {
                        // Flat processing
                        const rows = Array.from(table.querySelectorAll('tbody tr')).filter(r => !r.classList.contains('empty'));
                        cleanupRows(rows);
                        allFetchedRows.push(...rows);
                        totalRowsFetched += rows.length;
                    }
                }
            } catch (err) {
                log(`Error on page ${p}:`, err);
            }
        }

        clearInterval(timerInterval);
        statusDisplay.textContent = stopRequested ? `Stopped at ${totalRowsFetched} rows.` : `Fetched ${totalRowsFetched} rows.`;
        stopBtn.style.display = 'none';

        if (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') {
            groupedRows = groupingData;
            renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            updateH2Count(totalRowsFetched, totalRowsFetched);
        } else {
            allRows = allFetchedRows;
            originalAllRows = [...allRows];
            renderFinalTable(allRows);
            updateH2Count(allRows.length, allRows.length);
        }

        isLoaded = true;
        // The script remains visible for filtering/sorting
    }

    function renderFinalTable(rows) {
        const table = document.querySelector('table.tbl');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        // Clean up main headers once
        cleanupHeaders(table.tHead);
        addColumnFilterRow(table);
        attachSortHandlers(table);

        rows.forEach(r => tbody.appendChild(r));
    }

    function renderGroupedTable(data, isArtistPage = false, source = 'fetch') {
        const mainTable = document.querySelector('table.tbl');
        if (!mainTable) return;

        // Clean up the area where tables usually reside
        const container = mainTable.parentNode;
        const allTbls = Array.from(container.querySelectorAll('table.tbl, h3, .pagination, .mb-toggle-h3, .mb-master-toggle'));

        // If it's a re-run from filtering, we don't want to destroy the Master Toggle
        allTbls.forEach(el => {
            if (el.classList.contains('mb-master-toggle')) return;
            el.remove();
        });

        // Insert Master Toggle at the top if it doesn't exist
        let masterToggle = container.querySelector('.mb-master-toggle');
        if (!masterToggle) {
            masterToggle = document.createElement('div');
            masterToggle.className = 'mb-master-toggle';
            masterToggle.innerHTML = 'Toggle All: <span data-action="expand">Expand</span> | <span data-action="collapse">Collapse</span>';
            masterToggle.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (!action) return;
                const isExpand = action === 'expand';
                container.querySelectorAll('table.tbl').forEach(t => t.style.display = isExpand ? 'table' : 'none');
                container.querySelectorAll('.mb-toggle-icon').forEach(span => span.textContent = isExpand ? '▼' : '▶');
            });

            // Target the appropriate H2 for placement
            let targetH2 = isArtistPage ? document.querySelector('h2.discography') :
                          document.querySelector('h2.appears-on-releases') || Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Album'));

            if (targetH2) {
                targetH2.appendChild(masterToggle);
                targetH2.appendChild(filterContainer);
                filterContainer.style.display = 'inline-flex';
                filterContainer.style.marginLeft = '15px';
                filterContainer.style.verticalAlign = 'middle';
            } else {
                container.prepend(masterToggle);
            }
        }

        data.forEach((group, idx) => {
            if (group.rows.length === 0 && source !== 'fetch') return;

            const h3 = document.createElement('h3');
            h3.className = 'mb-toggle-h3';
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'mb-toggle-icon';
            toggleIcon.textContent = '▼';
            h3.appendChild(toggleIcon);
            h3.appendChild(document.createTextNode(`${group.category} (${group.rows.length})`));

            const tbl = mainTable.cloneNode(true);
            const tb = tbl.querySelector('tbody');
            tb.innerHTML = '';
            group.rows.forEach(r => tb.appendChild(r));

            cleanupHeaders(tbl.tHead);
            addColumnFilterRow(tbl);
            attachSortHandlers(tbl, idx);

            h3.onclick = () => {
                const isHidden = tbl.style.display === 'none';
                tbl.style.display = isHidden ? 'table' : 'none';
                toggleIcon.textContent = isHidden ? '▼' : '▶';
            };

            // Auto-collapse if too many rows
            if (group.rows.length > settings.autoExpandThreshold) {
                tbl.style.display = 'none';
                toggleIcon.textContent = '▶';
            }

            container.appendChild(h3);
            container.appendChild(tbl);
        });

        // Remove any remaining pagination
        document.querySelectorAll('.pagination').forEach(p => p.remove());
    }

    function attachSortHandlers(table, groupIdx = -1) {
        const thead = table.tHead;
        if (!thead || thead.dataset.sortAttached) return;

        const headerRow = thead.querySelector('tr');
        Array.from(headerRow.cells).forEach((th, idx) => {
            const text = th.textContent.trim();
            if (!text || text === 'Rating' || text === 'Tagger') return;

            th.style.cursor = 'pointer';
            th.title = 'Click to sort';

            const sortIcon = document.createElement('span');
            sortIcon.className = 'sort-icon-btn';
            sortIcon.textContent = ' ↕';
            th.appendChild(sortIcon);

            th.onclick = (e) => {
                e.preventDefault();
                const stateKey = groupIdx === -1 ? `flat-${idx}` : `group-${groupIdx}-${idx}`;
                let state = multiTableSortStates.get(stateKey) || 0; // 0: none, 1: asc, 2: desc
                state = (state + 1) % 3;
                multiTableSortStates.set(stateKey, state);

                // UI feedback
                table.querySelectorAll('.sort-icon-active').forEach(el => el.classList.remove('sort-icon-active'));
                if (state > 0) sortIcon.classList.add('sort-icon-active');
                sortIcon.textContent = (state === 1) ? ' ↑' : (state === 2) ? ' ↓' : ' ↕';

                performSort(table, idx, state, groupIdx);
            };
        });
        thead.dataset.sortAttached = 'true';
    }

    function performSort(table, colIdx, state, groupIdx) {
        if (state === 0) {
            // Restore original order for this specific table/group
            if (groupIdx === -1) {
                renderFinalTable(originalAllRows);
            } else {
                runFilter(); // Easiest way to restore state for grouped tables
            }
            return;
        }

        const start = performance.now();
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        rows.sort((a, b) => {
            const valA = a.cells[colIdx]?.textContent.trim().toLowerCase() || '';
            const valB = b.cells[colIdx]?.textContent.trim().toLowerCase() || '';

            // Handle numeric sort for specific columns (Year, Rating, etc.)
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            if (!isNaN(numA) && !isNaN(numB)) {
                return (state === 1) ? numA - numB : numB - numA;
            }

            if (valA < valB) return (state === 1) ? -1 : 1;
            if (valA > valB) return (state === 1) ? 1 : -1;
            return 0;
        });

        rows.forEach(r => tbody.appendChild(r));
        const elapsed = ((performance.now() - start) / 1000).toFixed(3);
        sortTimerDisplay.textContent = ` [Sort: ${elapsed}s]`;
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
