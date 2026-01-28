// ==UserScript==
// @name         VZ: MusicBrainz - Show All Consolidated
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-28-cleanup-v40
// @description  Consolidated tool to accumulate paginated MusicBrainz lists (Events, Recordings, Releases, Works, etc.) into a single view with timing, stop button, and real-time search and sorting
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
        .mb-master-toggle { color: #0066cc; font-weight: bold; margin-left: 15px; font-size: 0.8em; vertical-align: middle; display: inline-block; }
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
            if (settings.removeRelationships && txt.startsWith('Relationships')) indicesToRemove.push(idx);
            else if (settings.removePerformance && txt.startsWith('Performance Attributes')) indicesToRemove.push(idx);
            else if (settings.removeRating && txt.startsWith('Rating')) indicesToRemove.push(idx);
            else if (settings.removeTagger && txt.startsWith('Tagger')) indicesToRemove.push(idx);
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
            log('Second fetch attempt detected. Setting reload flag and reloading page to ensure filter stability.');
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
        log('Starting fetch process...', overrideParams);

        statusDisplay.textContent = 'Getting number of pages to fetch...';
        let maxPage = 1;

        // Determine maxPage based on context
        if (isWorkBase) {
            maxPage = await fetchMaxPageGeneric(path, { direction: '2', link_type_id: '278' });
        } else if (overrideParams) {
            maxPage = await fetchMaxPageGeneric(path, overrideParams);
        } else {
            const pagination = document.querySelector('ul.pagination');
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
        }

        log('Total pages to fetch:', maxPage);
        if (maxPage > settings.maxPageThreshold && !confirm(`Warning: This section has ${maxPage} pages. Proceed?`)) {
            activeBtn.style.backgroundColor = '';
            activeBtn.style.color = '';
            statusDisplay.textContent = '';
            return;
        }

        isLoaded = true;
        stopRequested = false;
        allRows = [];
        originalAllRows = [];
        groupedRows = [];

        // Remove various clutter elements
        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => div.remove());
        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) table.remove();
        });
        // Remove the release group filter paragraph
        document.querySelectorAll('p').forEach(p => {
            if (p.textContent.includes('Showing official release groups by this artist') ||
                p.textContent.includes('Showing all release groups by this artist')) {
                p.remove();
            }
        });
        // Remove Slick slider containers and large details blocks
        document.querySelectorAll('div[style*="width: 700px"] > div.slider.multiple-items').forEach(div => {
            const parent = div.parentElement;
            if (parent && parent.style.width === '700px') parent.remove();
        });
        // Target details blocks containing many images (likely the cover art gallery)
        document.querySelectorAll('details').forEach(det => {
            if (det.querySelectorAll('img').length > 5) det.remove();
        });

        if (pageType === 'events' || pageType === 'artist-releasegroups') removeSanojjonasContainers();

        // Update UI state
        activeBtn.disabled = true;
        activeBtn.classList.add('mb-show-all-btn-loading');
        allActionButtons.forEach(b => { if (b !== activeBtn) b.disabled = true; });

        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        statusDisplay.textContent = 'Initializing...';

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
                    log('Fetch loop stopped at page ' + p);
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
                        if (settings.removeRelationships && txt.startsWith('Relationships')) indicesToExclude.push(idx);
                        else if (settings.removePerformance && txt.startsWith('Performance Attributes')) indicesToExclude.push(idx);
                        else if (settings.removeRating && txt.startsWith('Rating')) indicesToExclude.push(idx);
                        else if (settings.removeTagger && txt.startsWith('Tagger')) indicesToExclude.push(idx);
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
                            log(`Type Change: "${category}". Rows so far: ${totalRowsAccumulated}`);
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
                                        log(`Subgroup Change/Type: "${currentStatus}". Rows so far: ${totalRowsAccumulated}`);
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
                                                    const countryFullName = abbr ? abbr.getAttribute('title') : '';
                                                    const countryA = countrySpan.querySelector('a');
                                                    const countryHref = countryA ? countryA.getAttribute('href') : '#';
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
                                                if (href.includes('/place/')) {
                                                    tdP.appendChild(clonedA);
                                                } else if (href.includes('/area/')) {
                                                    const flagSpan = a.closest('.flag');
                                                    if (flagSpan) {
                                                        const flagImg = flagSpan.querySelector('img')?.outerHTML || '';
                                                        const abbr = flagSpan.querySelector('abbr');
                                                        const countryCode = abbr ? abbr.textContent.trim() : '';
                                                        const countryFullName = flagSpan.querySelector('abbr').getAttribute('title');
                                                        const countryHref = a.getAttribute('href');
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

                // Update status text with timing
                statusDisplay.textContent = `Loading page ${p} of ${maxPage}... (Estimated remaining time: ${estRemainingSeconds.toFixed(1)}s)`;

                // Update button color based on progress
                const progress = p / maxPage;
                if (progress >= 1.0) {
                    activeBtn.style.backgroundColor = '#ccffcc'; // light green
                } else if (progress >= 0.5) {
                    activeBtn.style.backgroundColor = '#ffe0b2'; // light orange
                } else {
                    activeBtn.style.backgroundColor = '#ffcccc'; // light red
                }

                // Detailed statistics per page fetch
                log(`Page ${p}/${maxPage} processed in ${(pageDuration / 1000).toFixed(2)}s. Rows on page: ${rowsInThisPage}. Total: ${totalRowsAccumulated}`);

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

            const totalRows = (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') ?
                             groupedRows.reduce((acc, g) => acc + g.rows.length, 0) : allRows.length;

            updateH2Count(totalRows, totalRows);

            activeBtn.disabled = false;
            activeBtn.classList.remove('mb-show-all-btn-loading');
            allActionButtons.forEach(b => b.disabled = false);
            stopBtn.style.display = 'none';
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
            }

            // Perform final cleanup of UI artifacts
            finalCleanup();

            // Make all H2s collapsible after rendering
            makeH2sCollapsible();

            totalRenderingTime = performance.now() - renderingTimeStart;

            const fetchSeconds = (totalFetchingTime / 1000).toFixed(2);
            const renderSeconds = (totalRenderingTime / 1000).toFixed(2);

            statusDisplay.textContent = `Loaded ${pagesProcessed} pages (${totalRows} rows), Fetching: ${fetchSeconds}s, Initial rendering: ${renderSeconds}s`;
            timerDisplay.textContent = ''; // Explicitly clear any temp text

            log(`Process complete. Final Row Count: ${totalRowsAccumulated}. Total Time: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);
        } catch (err) {
            log('Critical Error during fetch:', err);
            statusDisplay.textContent = 'Error during load';
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
                showSpan.textContent = 'Show▼';
                showSpan.title = 'Un-Collapse all sub-headings';
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
                hideSpan.textContent = 'Hide▲';
                hideSpan.title = 'Collapse all sub-headings';
                hideSpan.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    container.querySelectorAll('table.tbl').forEach(t => t.style.display = 'none');
                    container.querySelectorAll('.mb-toggle-h3').forEach(h => {
                        const icon = h.querySelector('.mb-toggle-icon');
                        if (icon) icon.textContent = '▲';
                    });
                };

                let suffixText = ' all Release Types or click the individual Type below';
                if (pageType === 'artist-releasegroups') {
                    suffixText = ' all ReleaseGroup Types or click the individual Type below';
                }

                masterToggle.appendChild(showSpan);
                masterToggle.appendChild(document.createTextNode(' / '));
                masterToggle.appendChild(hideSpan);
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
                const shouldStayOpen = (catLower === 'album' || catLower === 'official') && group.rows.length < settings.autoExpandThreshold;
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
        log('Initializing collapsible H2 headers...');
        const allH2s = document.querySelectorAll('h2');

        allH2s.forEach(h2 => {
            if (h2.classList.contains('mb-h2-processed')) return;
            h2.classList.add('mb-h2-processed', 'mb-toggle-h2');
            h2.title = 'Collapse/Uncollapse section';

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

            // Create a wrapper for the clickable "Title (Count)" part
            const clickableTitle = document.createElement('span');
            clickableTitle.style.cursor = 'pointer';

            // Move current children (excluding Master Toggle and Filter) into clickableTitle
            const masterToggle = h2.querySelector('.mb-master-toggle');
            Array.from(h2.childNodes).forEach(child => {
                // Exclude Master Toggle and Filter Container from the collapse trigger wrapper
                if (child !== masterToggle && child !== filterContainer && child !== icon) {
                    clickableTitle.appendChild(child);
                }
            });
            h2.appendChild(clickableTitle);
            if (masterToggle) h2.appendChild(masterToggle);
            // Re-append filter container if it was part of children, to ensure correct order
            if (Array.from(h2.childNodes).includes(filterContainer)) h2.appendChild(filterContainer);

            // Click event for the trigger part (Icon + Title)
            const toggleFn = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isExpanding = icon.textContent === '▲';

                contentNodes.forEach(node => {
                    if (isExpanding) {
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

                icon.textContent = isExpanding ? '▼' : '▲';
            };

            icon.onclick = toggleFn;
            clickableTitle.onclick = toggleFn;
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
                } else if (state.lastSortIndex === -1 && targetState === 0) {
                    span.classList.add('sort-icon-active'); // Default Original state
                }
                span.textContent = char;
                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    log(`Sorting grouped table "${sortKey}" by column: "${colName}" (index: ${index}) to state ${targetState}...`);
                    sortTimerDisplay.textContent = 'Sorting...';

                    requestAnimationFrame(() => {
                        const startSort = performance.now();
                        state.lastSortIndex = index;
                        state.sortState = targetState;

                        // Update visuals: Reset all icons in this TH
                        th.querySelectorAll('.sort-icon-btn').forEach(btn => btn.classList.remove('sort-icon-active'));
                        // Highlight only this specific icon
                        span.classList.add('sort-icon-active');

                        const groupIndex = parseInt(sortKey.split('_').pop(), 10);
                        const targetGroup = groupedRows[groupIndex];

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
                        sortTimerDisplay.textContent = `Sorting: ${duration}s`;
                    });
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
                } else if (lastSortIndex === -1 && targetState === 0) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;
                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    log(`Sorting flat table by column: "${colName}" (index: ${index}) to state ${targetState}...`);
                    sortTimerDisplay.textContent = 'Sorting...';

                    requestAnimationFrame(() => {
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
                        sortTimerDisplay.textContent = `Sorting: ${duration}s`;
                    });
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
        log('Running final cleanup...');

        // Call the specific container removal again
        const sanojIds = ['load', 'load2', 'load3', 'load4', 'bottom1', 'bottom2', 'bottom3', 'bottom4', 'bottom5', 'bottom6'];
        let foundSanoj = false;
        sanojIds.forEach(id => {
            if (document.getElementById(id)) foundSanoj = true;
        });

        if (foundSanoj) {
            log('Sanojjonas elements found during final cleanup. Removing now...');
            removeSanojjonasContainers();
        } else {
            log('No Sanojjonas elements found during final cleanup.');
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
                log(`Found consecutive <br> tags: removed ${removedInThisInstance} tags at instance ${instancesFound}.`);
            }
        }

        if (totalRemoved > 0) {
            log(`Final cleanup complete: Removed a total of ${totalRemoved} consecutive <br> tags across ${instancesFound} locations.`);
        } else {
            log('Final cleanup complete: No consecutive <br> tags found.');
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
