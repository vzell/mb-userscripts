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

    let pageType = '';
    let headerContainer = document.querySelector('.artistheader h1') || 
                          document.querySelector('.rgheader h1') || 
                          document.querySelector('h1 a bdi')?.parentNode;

    if (path.includes('/events')) pageType = 'events';
    else if (path.includes('/recordings')) pageType = 'recordings';
    else if (path.includes('/releases')) pageType = 'releases';
    else if (path.includes('/works')) pageType = 'works';
    else if (path.includes('/release-group/')) pageType = 'rg-details';
    else if (path.includes('/work/')) pageType = 'work-details';
    else if (path.match(/\/artist\/[a-f0-9-]{36}$/)) pageType = 'artist-main';

    if (!pageType || !headerContainer) return;

    // --- UI ---
    const btn = document.createElement('button');
    btn.textContent = `C: Show all ${pageType.replace('-', ' ')}`;
    btn.style.cssText = 'margin-left:10px; font-size:0.5em; padding:2px 6px; vertical-align:middle; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s;';
    btn.type = 'button';
    btn.classList.add('mb-show-all-btn');

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
        .mb-show-all-btn:active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .mb-show-all-btn:disabled { background-color: #ddd !important; border-color: #bbb !important; cursor: default !important; color: #000 !important; }
        .sort-icon { cursor: pointer; margin-left: 4px; }
    `;
    document.head.appendChild(style);

    headerContainer.appendChild(btn);
    headerContainer.appendChild(stopBtn);
    headerContainer.appendChild(filterInput);
    headerContainer.appendChild(timerDisplay);

    let allRows = []; 
    let groupedRows = new Map(); // For rg-details grouping
    let isLoaded = false;
    let stopRequested = false;
    let sortAscending = true;
    let lastSortIndex = -1;

    stopBtn.addEventListener('click', () => {
        stopRequested = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
    });

    filterInput.addEventListener('input', () => {
        const query = filterInput.value.toLowerCase();
        if (pageType === 'rg-details') {
            const filteredMap = new Map();
            groupedRows.forEach((rows, status) => {
                const matches = rows.filter(r => r.textContent.toLowerCase().includes(query));
                if (matches.length > 0) filteredMap.set(status, matches);
            });
            renderGroupedTable(filteredMap);
        } else {
            renderFinalTable(allRows.filter(row => row.textContent.toLowerCase().includes(query)));
        }
    });

    btn.addEventListener('click', async () => {
        if (isLoaded) return;

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

        if (maxPage > 100 && !confirm(`Warning: This section has ${maxPage} pages. Proceed?`)) return;

        isLoaded = true;
        stopRequested = false;
        allRows = [];
        groupedRows = new Map();

        // UI Cleanups
        const bigBox = document.querySelector('div.jesus2099userjs154481bigbox');
        if (bigBox) bigBox.style.display = 'none';

        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) table.style.display = 'none';
        });

        btn.disabled = true;
        btn.style.color = '#000';
        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        timerDisplay.textContent = 'Fetching...';

        const startTime = performance.now();
        const baseUrl = window.location.href.split('?')[0];

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) break;
                
                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const html = await fetchHtml(`${baseUrl}?page=${p}`);
                const doc = new DOMParser().parseFromString(html, 'text/html');
                
                let indicesToExclude = [];
                const ths = doc.querySelectorAll('table.tbl thead th');
                ths.forEach((th, idx) => {
                    const txt = th.textContent.trim();
                    if (txt === 'Relationship' || txt === 'Relationships' || txt === 'Performance Attributes') {
                        indicesToExclude.push(idx);
                    }
                });

                const tableBody = doc.querySelector('table.tbl tbody');
                if (!tableBody) continue;

                let currentStatus = 'Unknown';
                const nodes = Array.from(tableBody.childNodes);

                nodes.forEach(node => {
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
                            } else {
                                allRows.push(newRow);
                            }
                        }
                    }
                });
            }

            // Cleanup Headers
            const liveTable = document.querySelector('table.tbl');
            if (liveTable?.tHead) {
                const liveHeaders = Array.from(liveTable.tHead.rows[0].cells);
                const liveIndicesToRemove = [];
                liveHeaders.forEach((th, idx) => {
                    const txt = th.textContent.trim();
                    if (txt === 'Relationship' || txt === 'Relationships' || txt === 'Performance Attributes') {
                        liveIndicesToRemove.push(idx);
                    }
                });
                liveIndicesToRemove.sort((a, b) => b - a).forEach(idx => liveTable.tHead.rows[0].deleteCell(idx));
            }

            const endFetch = performance.now();
            const fetchTime = ((endFetch - startTime) / 1000).toFixed(2);

            btn.textContent = stopRequested ? 'Partial Load' : 'All Loaded';
            btn.disabled = false;
            stopBtn.style.display = 'none';
            filterInput.style.display = 'inline-block';

            document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());

            if (pageType === 'rg-details') {
                renderGroupedTable(groupedRows);
            } else {
                renderFinalTable(allRows);
            }
            
            makeSortable();

            const endRender = performance.now();
            const renderTime = ((endRender - endFetch) / 1000).toFixed(2);
            timerDisplay.textContent = `(Fetch: ${fetchTime}s, Render: ${renderTime}s)`;

        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.textContent = 'Error';
        }
    });

    function renderFinalTable(rows) {
        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(r));
    }

    function renderGroupedTable(map) {
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

    function makeSortable() {
        const headers = document.querySelectorAll('table.tbl thead th');
        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'pointer';
            th.title = 'Click to sort';
            
            if (!th.querySelector('.sort-icon')) {
                const s = document.createElement('span');
                s.className = 'sort-icon';
                s.textContent = ' ↕';
                th.appendChild(s);
            }

            th.onclick = () => {
                if (lastSortIndex === index) sortAscending = !sortAscending;
                else { sortAscending = true; lastSortIndex = index; }
                
                headers.forEach((h, i) => {
                    const icon = h.querySelector('.sort-icon');
                    if (icon) {
                        icon.textContent = (i === index) ? (sortAscending ? ' ▲' : ' ▼') : ' ↕';
                        icon.style.fontSize = (i === index) ? '1.2em' : '';
                    }
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
                    groupedRows.forEach((rows, status) => {
                        const matches = rows.filter(r => r.textContent.toLowerCase().includes(query));
                        if (matches.length > 0) filteredMap.set(status, matches);
                    });
                    renderGroupedTable(filteredMap);
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
