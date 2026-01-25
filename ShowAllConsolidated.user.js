// ==UserScript==
// @name         VZ: MusicBrainz - Show All Consolidated
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-22
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
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = true;
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

    const isWorkRecordings =
        path.startsWith('/work/') &&
        params.get('direction') === '2' &&
        params.get('link_type_id') === '278';

    const isWorkBase = path.match(/\/work\/[a-f0-9-]{36}$/) && !isWorkRecordings;

    if (isWorkRecordings || isWorkBase) pageType = 'work-recordings';
    else if (path.includes('/events')) pageType = 'events';
    else if (path.includes('/recordings')) pageType = 'recordings';
    else if (path.includes('/releases')) pageType = 'releases';
    else if (path.includes('/works')) pageType = 'works';
    else if (path.includes('/release-group/')) pageType = 'releasegroup-releases';
    else if (path.match(/\/recording\/[a-f0-9-]{36}$/)) pageType = 'releasegroup-releases';
    else if (path.includes('/label')) pageType = 'label';
    else if (path.includes('/series')) pageType = 'series';
    else if (path.includes('/recording')) pageType = 'recording';
    else if (path.includes('/place')) pageType = 'place-events';
    else if (path.match(/\/artist\/[a-f0-9-]{36}$/)) pageType = 'artist-releasegroups';

    if (pageType) logPrefix = `[MB-ShowAll-Debug: ${pageType}]`;
    log('Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        log('Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    const typesWithSplitCD = ['releasegroup-releases', 'releases', 'label', 'series'];
    const typesWithSplitLocation = ['events'];

    // --- UI Elements ---
    const btn = document.createElement('button');
    btn.textContent = `Show all ${pageType.replace('-', ' ')}`;
    btn.style.cssText = 'margin-left:10px; font-size:0.5em; padding:2px 6px; vertical-align:middle; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s;';
    btn.type = 'button';

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.cssText = 'display:none; margin-left:5px; font-size:0.5em; padding:2px 6px; vertical-align:middle; cursor:pointer; background-color:#f44336; color:white; border:1px solid #d32f2f;';

    const filterContainer = document.createElement('span');
    filterContainer.style.cssText = 'display:none; margin-left:10px; vertical-align:middle; white-space:nowrap;';

    const filterWrapper = document.createElement('span');
    filterWrapper.style.cssText = 'position:relative; display:inline-block; vertical-align:middle;';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Filter ${pageType}...`;
    filterInput.style.cssText = 'font-size:0.5em; padding:2px 20px 2px 6px; vertical-align:middle; border:1px solid #ccc; border-radius:3px;';

    const filterClear = document.createElement('span');
    filterClear.textContent = '✕';
    filterClear.style.cssText = 'position:absolute; right:5px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:0.6em; color:#999; user-select:none;';
    filterClear.title = 'Clear filter';

    filterWrapper.appendChild(filterInput);
    filterWrapper.appendChild(filterClear);

    const caseLabel = document.createElement('label');
    caseLabel.style.cssText = 'font-size:0.4em; margin-left:5px; vertical-align:middle; cursor:pointer; font-weight:normal;';
    const caseCheckbox = document.createElement('input');
    caseCheckbox.type = 'checkbox';
    caseCheckbox.style.cssText = 'vertical-align:middle; margin-right:2px;';
    caseLabel.appendChild(caseCheckbox);
    caseLabel.appendChild(document.createTextNode('Cc'));
    caseLabel.title = 'Case Sensitive';

    filterContainer.appendChild(filterWrapper);
    filterContainer.appendChild(caseLabel);

    const timerDisplay = document.createElement('span');
    timerDisplay.style.cssText = 'margin-left:10px; font-size:0.5em; color:#666; vertical-align:middle;';

    const style = document.createElement('style');
    style.textContent = `
        .mb-show-all-btn-active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        button.mb-show-all-btn-loading:disabled {
            cursor: default !important;
            color: buttontext !important;
            background-color: buttonface !important;
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
    `;
    document.head.appendChild(style);

    // If the container is a link (common on Work pages), insert elements AFTER it
    // to prevent them from becoming part of the clickable URL.
    if (headerContainer.tagName === 'A') {
        headerContainer.after(timerDisplay);
        headerContainer.after(filterContainer);
        headerContainer.after(stopBtn);
        headerContainer.after(btn);
    } else {
        headerContainer.appendChild(btn);
        headerContainer.appendChild(stopBtn);
        headerContainer.appendChild(filterContainer);
        headerContainer.appendChild(timerDisplay);
    }

    let allRows = [];
    let groupedRows = new Map();
    let isLoaded = false;
    let stopRequested = false;
    let multiTableSortStates = new Map();

    async function fetchWorkRecordingsMaxPage(workPath) {
        const url = new URL(window.location.origin + workPath);
        url.searchParams.set('direction', '2');
        url.searchParams.set('link_type_id', '278');
        url.searchParams.set('page', '1');
        log('Fetching maxPage for Work recordings from:', url.toString());
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
                }
            }
            log(`Determined maxPage for Work: ${maxPage}`);
            return maxPage;
        } catch (err) {
            log('Error fetching maxPage for Work:', err);
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

    function highlightText(row, query, isCaseSensitive) {
        if (!query) return;
        const flags = isCaseSensitive ? 'g' : 'gi';
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
        row.querySelectorAll('td').forEach(td => {
            const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT, null, false);
            let node;
            const nodesToReplace = [];
            while (node = walker.nextNode()) {
                const val = node.nodeValue;
                const match = isCaseSensitive ? val.includes(query) : val.toLowerCase().includes(query.toLowerCase());
                if (match) {
                    nodesToReplace.push(node);
                }
            }
            nodesToReplace.forEach(textNode => {
                const span = document.createElement('span');
                // Red color and darkyellow background via class defined in style tag
                span.innerHTML = textNode.nodeValue.replace(regex, '<span class="mb-filter-highlight">$1</span>');
                textNode.parentNode.replaceChild(span, textNode);
            });
        });
    }

    function runFilter() {
        const isCaseSensitive = caseCheckbox.checked;
        const query = isCaseSensitive ? filterInput.value : filterInput.value.toLowerCase();
        log(`Filtering rows with query: "${query}" (Case Sensitive: ${isCaseSensitive})`);

        if (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') {
            const filteredMap = new Map();
            let totalFiltered = 0;
            let totalAbsolute = 0;
            groupedRows.forEach((rows, key) => {
                totalAbsolute += rows.length;
                const matches = rows.map(r => r.cloneNode(true)).filter(r => {
                    const text = r.textContent;
                    const hit = isCaseSensitive ? text.includes(query) : text.toLowerCase().includes(query);
                    if (hit && query) highlightText(r, filterInput.value, isCaseSensitive);
                    return hit;
                });
                if (matches.length > 0) {
                    filteredMap.set(key, matches);
                    totalFiltered += matches.length;
                }
            });
            renderGroupedTable(filteredMap, pageType === 'artist-releasegroups', query);
            updateH2Count(totalFiltered, totalAbsolute);
        } else {
            const totalAbsolute = allRows.length;
            const filteredRows = allRows.map(r => r.cloneNode(true)).filter(row => {
                const text = row.textContent;
                const hit = isCaseSensitive ? text.includes(query) : text.toLowerCase().includes(query);
                if (hit && query) highlightText(row, filterInput.value, isCaseSensitive);
                return hit;
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

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoaded) return;

        log('Starting fetch process...');
        let maxPage = 1;
        if (isWorkBase) {
            maxPage = await fetchWorkRecordingsMaxPage(path);
        } else {
            const pagination = document.querySelector('ul.pagination');
            if (pagination) {
                const links = Array.from(pagination.querySelectorAll('li a'));
                const nextIdx = links.findIndex(a => a.textContent.trim() === 'Next');
                if (nextIdx > 0) {
                    const urlObj = new URL(links[nextIdx - 1].href, window.location.origin);
                    const p = urlObj.searchParams.get('page');
                    if (p) maxPage = parseInt(p, 10);
                }
            }
        }

        log('Total pages to fetch:', maxPage);
        if (maxPage > 100 && !confirm(`Warning: This section has ${maxPage} pages. Proceed?`)) return;

        isLoaded = true;
        stopRequested = false;
        allRows = [];
        groupedRows = new Map();

        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => div.style.display = 'none');
        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) table.style.display = 'none';
        });

        if (pageType === 'events' || pageType === 'artist-releasegroups') removeSanojjonasContainers();

        btn.disabled = true;
        btn.classList.add('mb-show-all-btn-loading');
        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        timerDisplay.textContent = 'Fetching...';

        const startTime = performance.now();
        const baseUrl = window.location.origin + path;
        let pagesProcessed = 0;
        let cumulativeFetchTime = 0;

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) {
                    log('Fetch loop stopped at page ' + p);
                    break;
                }
                pagesProcessed++;
                btn.textContent = `Loading page ${p} of ${maxPage}...`;

                const pageStartTime = performance.now();
                const fetchUrl = new URL(baseUrl);
                fetchUrl.searchParams.set('page', p.toString());
                if (pageType === 'work-recordings') {
                    fetchUrl.searchParams.set('direction', '2');
                    fetchUrl.searchParams.set('link_type_id', '278');
                } else {
                    if (params.has('direction')) fetchUrl.searchParams.set('direction', params.get('direction'));
                    if (params.has('link_type_id')) fetchUrl.searchParams.set('link_type_id', params.get('link_type_id'));
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

                        if (mainHeaders.includes(txt)) {
                            mainColIdx = idx;
                        }
                    });
                }

                if (mainColIdx === -1 && pageType === 'releasegroup-releases') mainColIdx = 0;

                let rowsInThisPage = 0;
                if (pageType === 'artist-releasegroups') {
                    doc.querySelectorAll('table.tbl').forEach(table => {
                        let h3 = table.previousElementSibling;
                        while (h3 && h3.nodeName !== 'H3') h3 = h3.previousElementSibling;
                        const category = h3 ? h3.textContent.trim() : 'Other';
                        if (!groupedRows.has(category)) groupedRows.set(category, []);
                        table.querySelectorAll('tbody tr:not(.explanation)').forEach(row => {
                            if (row.cells.length > 1) {
                                const newRow = document.importNode(row, true);
                                [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });
                                groupedRows.get(category).push(newRow);
                                rowsInThisPage++;
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
                                } else if (node.cells.length > 1 && !node.classList.contains('explanation')) {
                                    const newRow = document.importNode(node, true);

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
                                                    tdSplitC.appendChild(countrySpan.cloneNode(true));
                                                }
                                                if (dateSpan) {
                                                    if (i > 0) tdSplitD.appendChild(document.createTextNode(', '));
                                                    tdSplitD.appendChild(document.createTextNode(dateSpan.textContent.trim()));
                                                }
                                            });
                                        }
                                    }

                                    const tdP = document.createElement('td');
                                    const tdA = document.createElement('td');
                                    const tdC = document.createElement('td');

                                    if (typesWithSplitLocation.includes(pageType) && locationIdx !== -1) {
                                        const locCell = newRow.cells[locationIdx];
                                        if (locCell) {
                                            const links = Array.from(locCell.querySelectorAll('a'));
                                            links.forEach(a => {
                                                const href = a.getAttribute('href');
                                                const clonedA = a.cloneNode(true);
                                                if (href.includes('/place/')) {
                                                    tdP.appendChild(clonedA);
                                                } else if (href.includes('/area/')) {
                                                    const flagSpan = a.closest('.flag');
                                                    if (flagSpan) {
                                                        const clonedFlag = flagSpan.cloneNode(true);
                                                        tdC.appendChild(clonedFlag);
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
                                        newRow.appendChild(tdSplitC);
                                        newRow.appendChild(tdSplitD);
                                    } else if (typesWithSplitLocation.includes(pageType)) {
                                        newRow.appendChild(tdP);
                                        newRow.appendChild(tdA);
                                        newRow.appendChild(tdC);
                                    }

                                    if (pageType !== 'artist-releasegroups') {
                                        newRow.appendChild(tdName);
                                        newRow.appendChild(tdComment);
                                    }

                                    if (pageType === 'releasegroup-releases') {
                                        if (!groupedRows.has(currentStatus)) groupedRows.set(currentStatus, []);
                                        groupedRows.get(currentStatus).push(newRow);
                                    } else {
                                        allRows.push(newRow);
                                    }
                                    rowsInThisPage++;
                                }
                            }
                        });
                    }
                }
                const pageEndTime = performance.now();
                const pageDuration = pageEndTime - pageStartTime;
                cumulativeFetchTime += pageDuration;

                const avgPageTime = cumulativeFetchTime / pagesProcessed;
                const remainingPages = maxPage - p;
                const estRemainingSeconds = (avgPageTime * remainingPages) / 1000;

                if (maxPage > 1 && p < maxPage) {
                    timerDisplay.textContent = `Est. remaining: ${estRemainingSeconds.toFixed(1)}s`;
                } else if (p === maxPage) {
                    timerDisplay.textContent = 'Finalizing...';
                }

                log(`Page ${p} processed: ${rowsInThisPage} rows in ${((pageEndTime - pageStartTime) / 1000).toFixed(3)}s`);
            }

            const totalRows = (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') ?
                             Array.from(groupedRows.values()).reduce((a, b) => a + b.length, 0) : allRows.length;

            log(`Finished fetching. Total rows: ${totalRows} across ${pagesProcessed} pages.`);
            updateH2Count(totalRows, totalRows);
            btn.textContent = `Loaded ${totalRows} rows from ${pagesProcessed} pages`;
            btn.disabled = false;
            btn.classList.remove('mb-show-all-btn-loading');
            stopBtn.style.display = 'none';
            filterContainer.style.display = 'inline-block';

            document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());

            if (pageType === 'releasegroup-releases' || pageType === 'artist-releasegroups') {
                renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else {
                renderFinalTable(allRows);
                document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                makeSortable();
            }

            const endRender = performance.now();
            timerDisplay.textContent = `(Fetch/Render: ${((endRender - startTime) / 1000).toFixed(2)}s)`;
            log(`Full process completed in ${((endRender - startTime) / 1000).toFixed(2)}s`);
        } catch (err) {
            log('Critical Error during fetch:', err);
            btn.textContent = 'Error';
            btn.disabled = false;
        }
    });

    function renderFinalTable(rows) {
        log(`Rendering flat table with ${rows.length} rows.`);
        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(r));
    }

    function renderGroupedTable(map, isArtistMain, query = '') {
        log(`Rendering grouped table. Map size: ${map.size}, isArtistMain: ${isArtistMain}`);
        const container = document.getElementById('content') || document.querySelector('table.tbl')?.parentNode;
        if (!container) return;

        let templateHead = null;
        const firstTable = document.querySelector('table.tbl');
        if (firstTable && firstTable.tHead) {
            templateHead = firstTable.tHead.cloneNode(true);
            cleanupHeaders(templateHead);
        }

        container.querySelectorAll('h3, table.tbl, .mb-master-toggle').forEach(el => el.remove());

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

        map.forEach((rows, category) => {
            const h3 = document.createElement('h3');
            h3.className = 'mb-toggle-h3';
            const table = document.createElement('table');
            table.className = 'tbl';
            if (templateHead) table.appendChild(templateHead.cloneNode(true));
            const tbody = document.createElement('tbody');
            table.appendChild(tbody);
            rows.forEach(r => tbody.appendChild(r));

            const catLower = category.toLowerCase();
            const shouldStayOpen = (catLower === 'album' || catLower === 'official') && rows.length < 40;
            table.style.display = (shouldStayOpen || query) ? '' : 'none';

            const totalInCategory = groupedRows.get(category)?.length || rows.length;
            const countDisplay = (rows.length === totalInCategory) ? `(${rows.length})` : `(${rows.length} of ${totalInCategory})`;

            h3.innerHTML = `<span class="mb-toggle-icon">${(shouldStayOpen || query) ? '▼' : '▲'}</span>${category} <span class="mb-row-count-stat">${countDisplay}</span>`;
            container.appendChild(h3);
            container.appendChild(table);

            h3.addEventListener('click', () => {
                const isHidden = table.style.display === 'none';
                table.style.display = isHidden ? '' : 'none';
                h3.querySelector('.mb-toggle-icon').textContent = isHidden ? '▼' : '▲';
            });

            makeTableSortable(table, category);
        });
    }

    function makeTableSortable(table, category) {
        const headers = table.querySelectorAll('thead th');
        if (!multiTableSortStates.has(category)) multiTableSortStates.set(category, { lastSortIndex: -1, sortAscending: true });
        const state = multiTableSortStates.get(category);

        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'pointer';
            if (!th.querySelector('.sort-icon')) {
                const s = document.createElement('span');
                s.className = 'sort-icon';
                s.textContent = ' ↕';
                th.appendChild(s);
            }
            th.onclick = (e) => {
                e.preventDefault();
                const colName = th.textContent.replace(/[↕▲▼]/g, '').trim();
                log(`Sorting category "${category}" by "${colName}" (column ${index})`);
                if (state.lastSortIndex === index) state.sortAscending = !state.sortAscending;
                else { state.sortAscending = true; state.lastSortIndex = index; }
                headers.forEach((h, i) => {
                    const icon = h.querySelector('.sort-icon');
                    if (icon) icon.textContent = (i === index) ? (state.sortAscending ? ' ▲' : ' ▼') : ' ↕';
                });

                const isNumeric = colName === 'Year' || colName === 'Releases';

                const rows = Array.from(table.querySelectorAll('tbody tr'));
                rows.sort((a, b) => {
                    const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                    const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';

                    if (isNumeric) {
                        const numA = parseFloat(valA.replace(/[^0-9.]/g, '')) || 0;
                        const numB = parseFloat(valB.replace(/[^0-9.]/g, '')) || 0;
                        return state.sortAscending ? numA - numB : numB - numA;
                    }
                    return state.sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });
                const tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
                rows.forEach(r => tbody.appendChild(r));
            };
        });
    }

    function makeSortable() {
        if (pageType === 'artist-releasegroups' || pageType === 'releasegroup-releases') return;
        log('Initializing sort handlers for main table.');
        const headers = document.querySelectorAll('table.tbl thead th');
        let lastSortIndex = -1;
        let sortAscending = true;
        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'pointer';
            if (!th.querySelector('.sort-icon')) {
                const s = document.createElement('span');
                s.className = 'sort-icon';
                s.textContent = ' ↕';
                th.appendChild(s);
            }
            th.onclick = (e) => {
                e.preventDefault();
                const colName = th.textContent.replace(/[↕▲▼]/g, '').trim();
                log(`Sorting main table by ${colName} (column ${index})`);
                if (lastSortIndex === index) sortAscending = !sortAscending;
                else { sortAscending = true; lastSortIndex = index; }
                headers.forEach((h, i) => {
                    const icon = h.querySelector('.sort-icon');
                    if (icon) icon.textContent = (i === index) ? (sortAscending ? ' ▲' : ' ▼') : ' ↕';
                });

                const isNumeric = colName === 'Year' || colName === 'Releases';

                allRows.sort((a, b) => {
                    const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                    const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';

                    if (isNumeric) {
                        const numA = parseFloat(valA.replace(/[^0-9.]/g, '')) || 0;
                        const numB = parseFloat(valB.replace(/[^0-9.]/g, '')) || 0;
                        return sortAscending ? numA - numB : numB - numA;
                    }
                    return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });
                const query = filterInput.value.toLowerCase();
                renderFinalTable(query ? allRows.filter(r => r.textContent.toLowerCase().includes(query)) : allRows);
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
