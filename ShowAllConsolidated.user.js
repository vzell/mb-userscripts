// ==UserScript==
// @name         VZ: MusicBrainz - Show All Consolidated
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-26-debug-v16
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
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = true;
    const MAX_PAGE_THRESHOLD = 100;
    const AUTO_EXPAND_THRESHOLD = 60;

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
    filterContainer.style.cssText = 'display:none; align-items:center; white-space:nowrap; gap:5px;';

    const filterWrapper = document.createElement('span');
    filterWrapper.style.cssText = 'position:relative; display:inline-block;';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Global Filter...`;
    filterInput.style.cssText = 'font-size:0.5em; padding:2px 20px 2px 6px; border:1px solid #ccc; border-radius:3px; width:150px; height:24px; box-sizing:border-box; transition:box-shadow 0.2s;';

    const filterClear = document.createElement('span');
    filterClear.textContent = '✕';
    filterClear.style.cssText = 'position:absolute; right:5px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:0.6em; color:#999; user-select:none;';
    filterClear.title = 'Clear filter';

    filterWrapper.appendChild(filterInput);
    filterWrapper.appendChild(filterClear);

    const caseLabel = document.createElement('label');
    caseLabel.style.cssText = 'font-size:0.4em; cursor:pointer; font-weight:normal; display:flex; align-items:center; height:24px; margin:0;';
    const caseCheckbox = document.createElement('input');
    caseCheckbox.type = 'checkbox';
    caseCheckbox.style.cssText = 'margin-right:2px; vertical-align:middle;';
    caseLabel.appendChild(caseCheckbox);
    caseLabel.appendChild(document.createTextNode('Cc'));
    caseLabel.title = 'Case Sensitive';

    filterContainer.appendChild(filterWrapper);
    filterContainer.appendChild(caseLabel);

    const timerDisplay = document.createElement('span');
    timerDisplay.style.cssText = 'font-size:0.5em; color:#666; display:flex; align-items:center; height:24px;';

    const sortTimerDisplay = document.createElement('span');
    sortTimerDisplay.style.cssText = 'font-size:0.5em; color:#666; display:flex; align-items:center; height:24px;';

    controlsContainer.appendChild(stopBtn);
    controlsContainer.appendChild(statusDisplay);
    controlsContainer.appendChild(filterContainer);
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
        .sort-icon { cursor: pointer; margin-left: 4px; color: #0066cc; font-weight: bold; }
        .mb-row-count-stat { color: blue; font-weight: bold; margin-left: 8px; }
        .mb-toggle-h3 { cursor: pointer; user-select: none; border-bottom: 1px solid #eee; padding: 4px 0; }
        .mb-toggle-h3:hover { color: #222; background-color: #f9f9f9; }
        .mb-toggle-icon { font-size: 0.8em; margin-right: 8px; color: #666; width: 12px; display: inline-block; }
        .mb-master-toggle { cursor: pointer; color: #0066cc; font-weight: bold; margin-bottom: 15px; display: inline-block; font-size: 1.1em; }
        .mb-master-toggle:hover { text-decoration: underline; }
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

    function updateH2Count(filteredCount, totalCount) {
        const table = document.querySelector('table.tbl');
        if (!table) return;
        let allH2s = Array.from(document.querySelectorAll('h2'));
        let targetH2 = null;
        for (let i = 0; i < allH2s.length; i++) {
            if (allH2s[i].compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) {
                targetH2 = allH2s[i];
            } else break;
        }
        if (targetH2) {
            const existing = targetH2.querySelector('.mb-row-count-stat');
            if (existing) existing.remove();
            const span = document.createElement('span');
            span.className = 'mb-row-count-stat';
            const countText = (filteredCount === totalCount) ? `(${totalCount})` : `(${filteredCount} of ${totalCount})`;
            span.textContent = countText;
            targetH2.appendChild(span);
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
            input.className = 'mb-col-filter-input';
            input.dataset.colIdx = idx;

            const clear = document.createElement('span');
            clear.className = 'mb-col-filter-clear';
            clear.textContent = '✕';
            clear.onclick = () => { input.value = ''; runFilter(); };

            input.addEventListener('input', () => {
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

            const tables = document.querySelectorAll('table.tbl');
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
                const tables = Array.from(document.querySelectorAll('table.tbl'));
                const tableIdx = tables.findIndex(t => t.contains(__activeEl));

                log(`Attempting focus restore: tableIdx=${tableIdx}, colIdx=${colIdx}`);

                if (tables[tableIdx]) {
                    const newInput = tables[tableIdx]
                          .querySelector(`.mb-col-filter-input[data-col-idx="${colIdx}"]`);

                    if (newInput) {
                        newInput.focus();
                        newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
                        log('Restored focus to column filter input');
                    } else {
                        log('Could not find replacement column filter input');
                    }
                }
                window.scrollTo(0, __scrollY);
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

            const filteredRows = allRows.map(r => r.cloneNode(true)).filter(row => {
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
            if (txt.startsWith('Relationship') || txt.startsWith('Performance Attributes')) {
                indicesToRemove.push(idx);
            }
        });

        indicesToRemove.sort((a, b) => b - a).forEach(idx => theadRow.deleteCell(idx));

        const headerBgColor = '#d3d3d3';

        if (typesWithSplitCD.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[↕▲▼]/g, '').trim());
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
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[↕▲▼]/g, '').trim());
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
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[↕▲▼]/g, '').trim());
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
        if (maxPage > MAX_PAGE_THRESHOLD && !confirm(`Warning: This section has ${maxPage} pages. Proceed?`)) {
            activeBtn.style.backgroundColor = '';
            activeBtn.style.color = '';
            statusDisplay.textContent = '';
            return;
        }

        isLoaded = true;
        stopRequested = false;
        allRows = [];
        groupedRows = [];

        // Hide various clutter elements
        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => div.style.display = 'none');
        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) table.style.display = 'none';
        });
        // Hide Slick slider containers and large details blocks
        document.querySelectorAll('div[style*="width: 700px"] > div.slider.multiple-items').forEach(div => {
            const parent = div.parentElement;
            if (parent && parent.style.width === '700px') parent.style.display = 'none';
        });
        // Target details blocks containing many images (likely the cover art gallery)
        document.querySelectorAll('details').forEach(det => {
            if (det.querySelectorAll('img').length > 5) det.style.display = 'none';
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
                        if (txt.startsWith('Relationship') || txt.startsWith('Performance Attributes')) {
                            indicesToExclude.push(idx);
                        } else if (typesWithSplitCD.includes(pageType) && txt === 'Country/Date') {
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
                                                        const countryFullName = abbr ? abbr.getAttribute('title') : '';
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
            filterContainer.style.display = 'inline-flex';

            document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());

            if (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') {
                renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else {
                renderFinalTable(allRows);
                document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                const mainTable = document.querySelector('table.tbl');
                if (mainTable) addColumnFilterRow(mainTable);
                makeSortable();
            }

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

        if (!query) container.querySelectorAll('h3, table.tbl, .mb-master-toggle').forEach(el => el.remove());

        if (!query) {
            const masterToggle = document.createElement('div');
            masterToggle.className = 'mb-master-toggle';
            masterToggle.textContent = 'Show▼/Hide▲ all types or click the individual type';
            let allCollapsed = true;
            masterToggle.onclick = () => {
                const subTables = container.querySelectorAll('table.tbl');
                const subHeaders = container.querySelectorAll('.mb-toggle-h3');
                allCollapsed = !allCollapsed;
                subTables.forEach(t => t.style.display = allCollapsed ? 'none' : '');
                subHeaders.forEach(h => h.querySelector('.mb-toggle-icon').textContent = allCollapsed ? '▲' : '▼');
            };
            container.appendChild(masterToggle);
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
                table = document.createElement('table');
                table.className = 'tbl';
                if (templateHead) table.appendChild(templateHead.cloneNode(true));
                addColumnFilterRow(table);
                tbody = document.createElement('tbody');
                table.appendChild(tbody);
            }

            group.rows.forEach(r => tbody.appendChild(r));

            // Logic changed: Do not hide the table or H3 even if group.rows.length is 0
            table.style.display = '';
            h3.style.display = '';

            if (!query) {
                const catLower = group.category.toLowerCase();
                const shouldStayOpen = (catLower === 'album' || catLower === 'official') && group.rows.length < AUTO_EXPAND_THRESHOLD;
                table.style.display = shouldStayOpen ? '' : 'none';

                h3.innerHTML = `<span class="mb-toggle-icon">${shouldStayOpen ? '▼' : '▲'}</span>${group.category} <span class="mb-row-count-stat">(${group.rows.length})</span>`;
                container.appendChild(h3);
                container.appendChild(table);

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

    function makeTableSortable(table, sortKey) {
        const headers = table.querySelectorAll('thead tr:first-child th');
        if (!multiTableSortStates.has(sortKey)) multiTableSortStates.set(sortKey, { lastSortIndex: -1, sortAscending: true });
        const state = multiTableSortStates.get(sortKey);

        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'pointer';
            if (!th.querySelector('.sort-icon')) {
                const s = document.createElement('span'); s.className = 'sort-icon'; s.textContent = ' ↕'; th.appendChild(s);
            }
            th.onclick = (e) => {
                e.preventDefault();
                const colName = th.textContent.replace(/[↕▲▼]/g, '').trim();
                log(`Sorting grouped table "${sortKey}" by column: "${colName}" (index: ${index})...`);
                sortTimerDisplay.textContent = 'Sorting...';
                requestAnimationFrame(() => {
                    const startSort = performance.now();
                    if (state.lastSortIndex === index) state.sortAscending = !state.sortAscending;
                    else { state.sortAscending = true; state.lastSortIndex = index; }

                    headers.forEach((h, i) => {
                        const icon = h.querySelector('.sort-icon');
                        if (icon) icon.textContent = (i === index) ? (state.sortAscending ? ' ▲' : ' ▼') : ' ↕';
                    });

                    const isNumeric = th.textContent.includes('Year') || th.textContent.includes('Releases');

                    // Find the actual data group in groupedRows to update it permanently
                    // sortKey is constructed as `${group.category}_${index}`
                    const groupIndex = parseInt(sortKey.split('_').pop(), 10);
                    const targetGroup = groupedRows[groupIndex];

                    if (targetGroup && targetGroup.rows) {
                        targetGroup.rows.sort((a, b) => {
                            const valA = getCleanVisibleText(a.cells[index]).trim().toLowerCase() || '';
                            const valB = getCleanVisibleText(b.cells[index]).trim().toLowerCase() || '';
                            if (isNumeric) {
                                const numA = parseFloat(valA.replace(/[^0-9.]/g, '')) || 0;
                                const numB = parseFloat(valB.replace(/[^0-9.]/g, '')) || 0;
                                return state.sortAscending ? numA - numB : numB - numA;
                            }
                            return state.sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                        });
                    }

                    // runFilter handles the re-rendering of the DOM based on the updated groupedRows
                    runFilter();

                    const duration = ((performance.now() - startSort) / 1000).toFixed(2);
                    sortTimerDisplay.textContent = `Sorting: ${duration}s`;
                    log(`Sort complete: ${state.sortAscending ? 'Asc' : 'Desc'}. Taken: ${duration}s`);
                });
            };
        });
    }

    function makeSortable() {
        if (pageType === 'artist-releasegroups' || pageType === 'releasegroup-releases') return;
        const headers = document.querySelectorAll('table.tbl thead tr:first-child th');
        let lastSortIndex = -1;
        let sortAscending = true;
        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'pointer';
            if (!th.querySelector('.sort-icon')) {
                const s = document.createElement('span'); s.className = 'sort-icon'; s.textContent = ' ↕'; th.appendChild(s);
            }
            th.onclick = (e) => {
                e.preventDefault();
                const colName = th.textContent.replace(/[↕▲▼]/g, '').trim();
                log(`Sorting main table by column: "${colName}" (index: ${index})...`);
                sortTimerDisplay.textContent = 'Sorting...';
                requestAnimationFrame(() => {
                    const startSort = performance.now();
                    if (lastSortIndex === index) sortAscending = !sortAscending;
                    else { sortAscending = true; lastSortIndex = index; }

                    headers.forEach((h, i) => {
                        const icon = h.querySelector('.sort-icon');
                        if (icon) icon.textContent = (i === index) ? (sortAscending ? ' ▲' : ' ▼') : ' ↕';
                    });

                    const isNumeric = th.textContent.includes('Year') || th.textContent.includes('Releases');
                    allRows.sort((a, b) => {
                        const valA = getCleanVisibleText(a.cells[index]).trim().toLowerCase() || '';
                        const valB = getCleanVisibleText(b.cells[index]).trim().toLowerCase() || '';
                        if (isNumeric) {
                            const numA = parseFloat(valA.replace(/[^0-9.]/g, '')) || 0;
                            const numB = parseFloat(valB.replace(/[^0-9.]/g, '')) || 0;
                            return sortAscending ? numA - numB : numB - numA;
                        }
                        return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    });

                    runFilter();
                    const duration = ((performance.now() - startSort) / 1000).toFixed(2);
                    sortTimerDisplay.textContent = `Sorting: ${duration}s`;
                    log(`Sort complete: ${sortAscending ? 'Asc' : 'Desc'}. Taken: ${duration}s`);
                });
            };
        });
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
