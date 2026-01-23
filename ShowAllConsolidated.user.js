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
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

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
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = new URL(window.location.href);
    const path = currentUrl.pathname;
    const params = currentUrl.searchParams;

    // --- Redirect: Work -> Recording relationships ---
    if (
        path.startsWith('/work/') &&
        (!params.has('direction') || !params.has('link_type_id'))
    ) {
        params.set('direction', '2');
        params.set('link_type_id', '278');
        params.set('page', '1');
        window.location.replace(currentUrl.toString());
        return;
    }

    console.debug('[ShowAllConsolidated] Initializing script for:', path);

    let pageType = '';
    let headerContainer = document.querySelector('.artistheader h1') ||
                          document.querySelector('.rgheader h1') ||
                          document.querySelector('h1 a bdi')?.parentNode ||
                          document.querySelector('h1');

    const isWorkRecordings =
        path.startsWith('/work/') &&
        params.get('direction') === '2' &&
        params.get('link_type_id') === '278';

    if (isWorkRecordings) pageType = 'work-recordings';
    else if (path.includes('/events')) pageType = 'events';
    else if (path.includes('/recordings')) pageType = 'recordings';
    else if (path.includes('/releases')) pageType = 'releases';
    else if (path.includes('/works')) pageType = 'works';
    else if (path.includes('/release-group/')) pageType = 'rg-details';
    else if (path.includes('/work/')) pageType = 'work-details';
    else if (path.match(/\/artist\/[a-f0-9-]{36}$/)) pageType = 'artist-main';

    console.debug('[ShowAllConsolidated] Detected pageType:', pageType);

    if (!pageType || !headerContainer) {
        console.debug('[ShowAllConsolidated] Required elements not found. Terminating.');
        return;
    }

    // --- UI ---
    const btn = document.createElement('button');
    btn.textContent = `C: Show all ${pageType.replace('-', ' ')}`;
    btn.style.cssText = 'margin-left:10px; font-size:0.5em; padding:2px 6px; vertical-align:middle; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s;';
    btn.type = 'button';

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.cssText = 'display:none; margin-left:5px; font-size:0.5em; padding:2px 6px; vertical-align:middle; cursor:pointer; background-color:#f44336; color:white; border:1px solid #d32f2f;';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Filter ${pageType}...`;
    filterInput.style.cssText = 'display:none; margin-left:10px; font-size:0.5em; padding:2px 6px; vertical-align:middle; border:1px solid #ccc; border-radius:3px;';

    const timerDisplay = document.createElement('span');
    timerDisplay.style.cssText = 'margin-left:10px; font-size:0.5em; color:#666; vertical-align:middle;';

    const style = document.createElement('style');
    style.textContent = `
        .mb-show-all-btn-active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .mb-show-all-btn:disabled { background-color: #ddd !important; border-color: #bbb !important; cursor: default !important; color: #000 !important; }
        .sort-icon { cursor: pointer; margin-left: 4px; }
    `;
    document.head.appendChild(style);

    headerContainer.appendChild(btn);
    headerContainer.appendChild(stopBtn);
    headerContainer.appendChild(filterInput);
    headerContainer.appendChild(timerDisplay);

    let allRows = [];
    let groupedRows = new Map(); // Maps Category (h3) -> Array of Rows
    let isLoaded = false;
    let stopRequested = false;

    // Sorting states for multi-table layout (artist-main)
    let multiTableSortStates = new Map();

    stopBtn.addEventListener('click', () => {
        console.debug('[ShowAllConsolidated] Stop requested by user.');
        stopRequested = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
    });

    filterInput.addEventListener('input', () => {
        const query = filterInput.value.toLowerCase();
        console.debug('[ShowAllConsolidated] Filtering with query:', query);
        if (pageType === 'rg-details' || pageType === 'artist-main') {
            const filteredMap = new Map();
            groupedRows.forEach((rows, key) => {
                const matches = rows.filter(r => r.textContent.toLowerCase().includes(query));
                if (matches.length > 0) filteredMap.set(key, matches);
            });
            renderGroupedTable(filteredMap, pageType === 'artist-main');
        } else {
            renderFinalTable(allRows.filter(row => row.textContent.toLowerCase().includes(query)));
        }
    });

    btn.addEventListener('click', async () => {
        if (isLoaded) return;

        console.debug('[ShowAllConsolidated] Start button clicked.');

        let maxPage = 1;
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

        console.debug('[ShowAllConsolidated] Total pages to fetch:', maxPage);

        if (maxPage > 100 && !confirm(`Warning: This section has ${maxPage} pages. Proceed?`)) return;

        isLoaded = true;
        stopRequested = false;
        allRows = [];
        groupedRows = new Map();

        // Hide all Bigboxes and Batch tables
        console.debug('[ShowAllConsolidated] Hiding auxiliary UI elements.');
        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => div.style.display = 'none');
        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) table.style.display = 'none';
        });

        btn.disabled = true;
        btn.style.color = '#000';
        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        timerDisplay.textContent = 'Fetching...';

        const startTime = performance.now();
        const baseUrl = window.location.origin + path;

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) {
                    console.debug('[ShowAllConsolidated] Loop broken due to stop request.');
                    break;
                }

                console.debug(`[ShowAllConsolidated] Fetching page ${p}...`);
                btn.textContent = `Loading page ${p} of ${maxPage}...`;

                const fetchUrl = new URL(baseUrl);
                fetchUrl.searchParams.set('page', p.toString());
                if (params.has('direction')) fetchUrl.searchParams.set('direction', params.get('direction'));
                if (params.has('link_type_id')) fetchUrl.searchParams.set('link_type_id', params.get('link_type_id'));

                const html = await fetchHtml(fetchUrl.toString());
                const doc = new DOMParser().parseFromString(html, 'text/html');

                let indicesToExclude = [];
                const referenceTable = doc.querySelector('table.tbl');
                if (referenceTable) {
                    referenceTable.querySelectorAll('thead th').forEach((th, idx) => {
                        const txt = th.textContent.trim();
                        if (txt === 'Relationship' || txt === 'Relationships' || txt === 'Performance Attributes') indicesToExclude.push(idx);
                    });
                }

                if (pageType === 'artist-main') {
                    doc.querySelectorAll('table.tbl').forEach(table => {
                        let h3 = table.previousElementSibling;
                        while (h3 && h3.nodeName !== 'H3') h3 = h3.previousElementSibling;
                        const category = h3 ? h3.textContent.trim() : 'Other';

                        if (!groupedRows.has(category)) groupedRows.set(category, []);

                        table.querySelectorAll('tbody tr:not(.explanation)').forEach(row => {
                            if (row.cells.length > 1) {
                                const newRow = document.importNode(row, true);
                                [...indicesToExclude].sort((a, b) => b - a).forEach(idx => {
                                    if (newRow.cells[idx]) newRow.deleteCell(idx);
                                });
                                groupedRows.get(category).push(newRow);
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
                                    [...indicesToExclude].sort((a, b) => b - a).forEach(idx => {
                                        if (newRow.cells[idx]) newRow.deleteCell(idx);
                                    });
                                    if (pageType === 'rg-details') {
                                        if (!groupedRows.has(currentStatus)) groupedRows.set(currentStatus, []);
                                        groupedRows.get(currentStatus).push(newRow);
                                    } else allRows.push(newRow);
                                }
                            }
                        });
                    }
                }
            }

            // Cleanup headers of live tables
            console.debug('[ShowAllConsolidated] Cleaning up table headers.');
            document.querySelectorAll('table.tbl').forEach(table => {
                if (table.tHead) {
                    const toRemove = [];
                    Array.from(table.tHead.rows[0].cells).forEach((th, idx) => {
                        const txt = th.textContent.trim();
                        if (txt === 'Relationship' || txt === 'Relationships' || txt === 'Performance Attributes') toRemove.push(idx);
                    });
                    toRemove.sort((a, b) => b - a).forEach(idx => table.tHead.rows[0].deleteCell(idx));
                }
            });

            const endFetch = performance.now();
            btn.textContent = stopRequested ? 'Partial Load' : 'All Loaded';
            btn.disabled = false;
            stopBtn.style.display = 'none';
            filterInput.style.display = 'inline-block';

            console.debug('[ShowAllConsolidated] Removing pagination elements.');
            document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());

            console.debug('[ShowAllConsolidated] Starting final render.');
            if (pageType === 'rg-details' || pageType === 'artist-main') {
                renderGroupedTable(groupedRows, pageType === 'artist-main');
            } else {
                renderFinalTable(allRows);
            }

            makeSortable();

            const endRender = performance.now();
            timerDisplay.textContent = `(Fetch: ${((endFetch - startTime) / 1000).toFixed(2)}s, Render: ${((endRender - endFetch) / 1000).toFixed(2)}s)`;
            console.debug(`[ShowAllConsolidated] Complete. Fetch: ${timerDisplay.textContent}`);

        } catch (err) {
            console.error('[ShowAllConsolidated] Error during execution:', err);
            btn.textContent = 'Error';
            btn.disabled = false;
        }
    });

    function renderFinalTable(rows) {
        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(r));
    }

    function renderGroupedTable(map, isArtistMain) {
        if (isArtistMain) {
            const container = document.getElementById('content') || document.querySelector('table.tbl')?.parentNode;
            if (!container) return;

            let headerHtml = '';
            const firstTable = container.querySelector('table.tbl');
            if (firstTable && firstTable.tHead) {
                headerHtml = firstTable.tHead.innerHTML;
            } else if (document.querySelector('thead')) {
                headerHtml = document.querySelector('thead').innerHTML;
            }

            console.debug('[ShowAllConsolidated] Cleaning up existing artist-main tables.');
            const existingH3s = container.querySelectorAll('h3');
            const existingTbls = container.querySelectorAll('table.tbl');
            existingH3s.forEach(el => el.remove());
            existingTbls.forEach(el => el.remove());

            const instrumentDiv = document.getElementById('bottom1');
            if (instrumentDiv) {
                console.debug('[ShowAllConsolidated] Removing Instrument Table.');
                instrumentDiv.remove();
            }

            map.forEach((rows, category) => {
                const h3 = document.createElement('h3');
                h3.textContent = category;
                container.appendChild(h3);

                const table = document.createElement('table');
                table.className = 'tbl';
                table.dataset.category = category;
                table.innerHTML = `<thead>${headerHtml}</thead><tbody></tbody>`;
                rows.forEach(r => table.querySelector('tbody').appendChild(r));
                container.appendChild(table);
                makeTableSortable(table, category);
            });
        } else {
            const tbody = document.querySelector('table.tbl tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            const colCount = document.querySelectorAll('table.tbl thead th').length;
            map.forEach((rows, status) => {
                const subh = document.createElement('tr');
                subh.className = 'subh';
                subh.innerHTML = `<th></th><th colspan="${colCount - 1}">${status}</th>`;
                tbody.appendChild(subh);
                rows.forEach(r => tbody.appendChild(r));
            });
        }
    }

    function makeTableSortable(table, category) {
        const headers = table.querySelectorAll('thead th');
        if (!multiTableSortStates.has(category)) {
            multiTableSortStates.set(category, { lastSortIndex: -1, sortAscending: true });
        }
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

            th.onclick = () => {
                console.debug(`[ShowAllConsolidated] Sorting table [${category}] by column [${index}]`);
                if (state.lastSortIndex === index) state.sortAscending = !state.sortAscending;
                else { state.sortAscending = true; state.lastSortIndex = index; }

                headers.forEach((h, i) => {
                    const icon = h.querySelector('.sort-icon');
                    if (icon) icon.textContent = (i === index) ? (state.sortAscending ? ' ▲' : ' ▼') : ' ↕';
                });

                const rows = groupedRows.get(category);
                rows.sort((a, b) => {
                    const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                    const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
                    return state.sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });

                const query = filterInput.value.toLowerCase();
                const tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
                rows.filter(r => r.textContent.toLowerCase().includes(query)).forEach(r => tbody.appendChild(r));
            };
        });
    }

    function makeSortable() {
        if (pageType === 'artist-main') return;

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

            th.onclick = () => {
                console.debug(`[ShowAllConsolidated] Sorting by column [${index}]`);
                if (lastSortIndex === index) sortAscending = !sortAscending;
                else { sortAscending = true; lastSortIndex = index; }

                headers.forEach((h, i) => {
                    const icon = h.querySelector('.sort-icon');
                    if (icon) icon.textContent = (i === index) ? (sortAscending ? ' ▲' : ' ▼') : ' ↕';
                });

                const sortFn = (a, b) => {
                    const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                    const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
                    return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                };

                const query = filterInput.value.toLowerCase();
                if (pageType === 'rg-details') {
                    groupedRows.forEach(rows => rows.sort(sortFn));
                    const filteredMap = new Map();
                    groupedRows.forEach((rows, key) => {
                        const matches = rows.filter(r => r.textContent.toLowerCase().includes(query));
                        if (matches.length > 0) filteredMap.set(key, matches);
                    });
                    renderGroupedTable(filteredMap, false);
                } else {
                    allRows.sort(sortFn);
                    renderFinalTable(query ? allRows.filter(r => r.textContent.toLowerCase().includes(query)) : allRows);
                }
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
