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

    // --- Configuration & Detection ---
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

    // --- UI Creation ---
    const btn = document.createElement('button');
    // Prepend "C: " to distinguish from non-consolidated scripts
    btn.textContent = `C: Show all ${pageType.replace('-', ' ')}`;
    btn.style.marginLeft = '10px';
    btn.style.fontSize = '0.5em';
    btn.style.padding = '2px 6px';
    btn.style.verticalAlign = 'middle';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'transform 0.1s, box-shadow 0.1s';
    btn.type = 'button';
    btn.classList.add('mb-show-all-btn');

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.display = 'none';
    stopBtn.style.marginLeft = '5px';
    stopBtn.style.fontSize = '0.5em';
    stopBtn.style.padding = '2px 6px';
    stopBtn.style.verticalAlign = 'middle';
    stopBtn.style.cursor = 'pointer';
    stopBtn.style.backgroundColor = '#f44336';
    stopBtn.style.color = 'white';
    stopBtn.style.border = '1px solid #d32f2f';
    stopBtn.type = 'button';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Filter ${pageType}...`;
    filterInput.style.display = 'none';
    filterInput.style.marginLeft = '10px';
    filterInput.style.fontSize = '0.5em';
    filterInput.style.padding = '2px 6px';
    filterInput.style.verticalAlign = 'middle';
    filterInput.style.border = '1px solid #ccc';
    filterInput.style.borderRadius = '3px';
    filterInput.type = 'text';

    const timerDisplay = document.createElement('span');
    timerDisplay.style.marginLeft = '10px';
    timerDisplay.style.fontSize = '0.5em';
    timerDisplay.style.color = '#666';
    timerDisplay.style.verticalAlign = 'middle';

    const style = document.createElement('style');
    style.textContent = `
        .mb-show-all-btn:active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .mb-show-all-btn:disabled { background-color: #ddd !important; border-color: #bbb !important; cursor: default !important; }
        .sort-icon { cursor: pointer; margin-left: 4px; }
    `;
    document.head.appendChild(style);

    headerContainer.appendChild(btn);
    headerContainer.appendChild(stopBtn);
    headerContainer.appendChild(filterInput);
    headerContainer.appendChild(timerDisplay);

    // --- State & Logic ---
    let allRows = [];
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
        const filteredRows = allRows.filter(row => row.textContent.toLowerCase().includes(query));
        renderFinalTable(filteredRows);
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
                maxPage = parseInt(urlObj.searchParams.get('page') || '1', 10);
            }
        }

        if (maxPage > 100 && !confirm(`Warning: This section has ${maxPage} pages. Proceed?`)) return;

        isLoaded = true;
        stopRequested = false;
        allRows = [];

        // Visual state during load
        btn.disabled = true;
        btn.style.color = '#000';
        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop';
        filterInput.style.display = 'none';
        timerDisplay.textContent = 'Fetching pages...';

        const startTime = performance.now();
        const baseUrl = window.location.href.split('?')[0];

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) break;

                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const targetUrl = `${baseUrl}?page=${p}`;

                const html = await fetchHtml(targetUrl);
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const pageRows = Array.from(doc.querySelectorAll('table.tbl tbody tr:not(.explanation)'));

                pageRows.forEach(row => {
                    if (row.cells.length > 1) {
                        allRows.push(document.importNode(row, true));
                    }
                });
            }

            const endFetch = performance.now();
            const fetchTime = ((endFetch - startTime) / 1000).toFixed(2);

            stopBtn.style.display = 'none';
            timerDisplay.textContent = `Fetch: ${fetchTime}s | Rendering...`;

            const startRender = performance.now();

            // UI Finalization
            btn.textContent = stopRequested ? `Partial: ${allRows.length} loaded` : `All ${allRows.length} loaded`;
            btn.style.color = '';
            btn.disabled = false;
            filterInput.style.display = 'inline-block';

            // Remove existing pagination
            document.querySelectorAll('ul.pagination, nav.pagination, div.pageselector').forEach(el => el.remove());

            renderFinalTable(allRows);
            makeSortable();

            const endRender = performance.now();
            const renderTime = ((endRender - startRender) / 1000).toFixed(2);
            timerDisplay.textContent = `(Fetch: ${fetchTime}s, Render: ${renderTime}s)`;

        } catch (err) {
            console.error('Error:', err);
            btn.disabled = false;
            btn.textContent = 'Error loading';
        }
    });

    function renderFinalTable(rowsToRender) {
        const table = document.querySelector('table.tbl');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        rowsToRender.forEach(row => tbody.appendChild(row));
    }

    function makeSortable() {
        const headers = document.querySelectorAll('table.tbl thead th');
        headers.forEach((th, index) => {
            if (th.classList.contains('checkbox-cell') || th.querySelector('input[type="checkbox"]')) return;

            th.style.cursor = 'pointer';
            th.title = "Click to sort";

            if (!th.querySelector('.sort-icon')) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'sort-icon';
                iconSpan.textContent = ' ↕';
                th.appendChild(iconSpan);
            }

            th.onclick = () => {
                if (lastSortIndex === index) sortAscending = !sortAscending;
                else { sortAscending = true; lastSortIndex = index; }

                headers.forEach((h, i) => {
                    const s = h.querySelector('.sort-icon');
                    if (s) {
                        if (i === index) {
                            s.textContent = sortAscending ? ' ▲' : ' ▼';
                            s.style.fontSize = '1.2em';
                        } else {
                            s.textContent = ' ↕';
                            s.style.fontSize = '';
                        }
                    }
                });

                allRows.sort((a, b) => {
                    const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                    const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
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
                method: "GET",
                url: url,
                onload: (res) => resolve(res.responseText),
                onerror: (err) => reject(err)
            });
        });
    }
})();
