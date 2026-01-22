// ==UserScript==
// @name         VZ: MusicBrainz - Show All Events
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-22
// @description  Accumulates all events from paginated artist event pages into a single view with timing, stop button, and real-time search filter
// @author       Gemini & ChatGPT (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllEvents.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllEvents.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/artist/*/events
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Target the artist header h1
    const headerH1 = document.querySelector('.artistheader h1');
    if (!headerH1) return;

    // Create Main Button
    const btn = document.createElement('button');
    btn.textContent = 'Show all events';
    btn.style.marginLeft = '10px';
    btn.style.fontSize = '0.5em';
    btn.style.padding = '2px 6px';
    btn.style.verticalAlign = 'middle';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'transform 0.1s, box-shadow 0.1s';
    btn.type = 'button';

    // Create Stop Button (initially hidden)
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

    // Create Search Filter (initially hidden)
    const filterInput = document.createElement('input');
    filterInput.placeholder = 'Filter events...';
    filterInput.style.display = 'none';
    filterInput.style.marginLeft = '10px';
    filterInput.style.fontSize = '0.5em';
    filterInput.style.padding = '2px 6px';
    filterInput.style.verticalAlign = 'middle';
    filterInput.style.border = '1px solid #ccc';
    filterInput.style.borderRadius = '3px';
    filterInput.type = 'text';

    // Create Timer Display
    const timerDisplay = document.createElement('span');
    timerDisplay.style.marginLeft = '10px';
    timerDisplay.style.fontSize = '0.5em';
    timerDisplay.style.color = '#666';
    timerDisplay.style.verticalAlign = 'middle';

    // Inject CSS for button-down effect
    const style = document.createElement('style');
    style.textContent = `
        .mb-show-all-btn:active {
            transform: translateY(1px);
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .mb-show-all-btn:disabled {
            background-color: #ddd !important;
            border-color: #bbb !important;
            cursor: default !important;
        }
    `;
    document.head.appendChild(style);
    btn.classList.add('mb-show-all-btn');

    // Append UI elements to the h1
    headerH1.appendChild(btn);
    headerH1.appendChild(stopBtn);
    headerH1.appendChild(filterInput);
    headerH1.appendChild(timerDisplay);

    // State Variables
    let sortAscending = true;
    let lastSortIndex = -1;
    let allRows = [];
    let isLoaded = false;
    let stopRequested = false;

    // Filter Logic
    filterInput.addEventListener('input', () => {
        const query = filterInput.value.toLowerCase();
        const filteredRows = allRows.filter(row =>
            row.textContent.toLowerCase().includes(query)
        );
        renderFinalTable(filteredRows);
    });

    stopBtn.addEventListener('click', () => {
        stopRequested = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
    });

    btn.addEventListener('click', async () => {
        if (isLoaded) return;

        // Logic to find the maximum page number
        let maxPage = 1;
        const paginationList = document.querySelector('ul.pagination');
        if (paginationList) {
            const links = Array.from(paginationList.querySelectorAll('li a'));
            const nextLinkIndex = links.findIndex(a => a.textContent.trim() === 'Next');

            if (nextLinkIndex > 0) {
                const lastPageLink = links[nextLinkIndex - 1];
                const urlObj = new URL(lastPageLink.href, window.location.origin);
                const pageParam = urlObj.searchParams.get('page');
                if (pageParam) {
                    maxPage = parseInt(pageParam, 10);
                }
            } else if (links.length > 0) {
                links.forEach(link => {
                    const p = new URL(link.href, window.location.origin).searchParams.get('page');
                    if (p) maxPage = Math.max(maxPage, parseInt(p, 10));
                });
            }
        }

        // Popup warning for > 100 pages
        if (maxPage > 100) {
            const proceed = confirm(`Warning: This artist has ${maxPage} pages of events. Proceed?`);
            if (!proceed) return;
        }

        const startFetch = performance.now();
        stopRequested = false;
        allRows = [];

        console.log('[MB Show All Events] Starting accumulation...');

        // Visual "Button Down" state during load
        btn.disabled = true;
        btn.style.color = '#000';
        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop';
        filterInput.style.display = 'none';
        timerDisplay.textContent = 'Fetching pages...';

        const baseUrl = window.location.href.split('?')[0];

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) break;

                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const targetUrl = `${baseUrl}?page=${p}`;
                console.log(`[MB Show All Events] Fetching page ${p} of ${maxPage}...`);

                const html = await fetchHtml(targetUrl);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const rows = doc.querySelectorAll('table.tbl tbody tr');
                rows.forEach(row => {
                    // Check if the row has actual data (skip "No events found" or similar if any)
                    if (row.cells.length > 1) {
                        const cleanRow = document.importNode(row, true);
                        allRows.push(cleanRow);
                    }
                });
            }

            const endFetch = performance.now();
            const fetchTime = ((endFetch - startFetch) / 1000).toFixed(2);

            stopBtn.style.display = 'none';
            timerDisplay.textContent = `Fetch: ${fetchTime}s | Rendering...`;

            // Start Render Timing
            const startRender = performance.now();

            // Update State
            isLoaded = true;

            // Update UI
            btn.textContent = stopRequested ? `Partial: ${allRows.length} loaded` : `All ${allRows.length} events loaded`;
            btn.style.color = '';
            btn.style.cursor = 'pointer';
            btn.style.transform = '';
            btn.style.boxShadow = '';
            btn.disabled = false;
            filterInput.style.display = 'inline-block';

            // Remove Pagination
            const nav = document.querySelector('nav.pagination') || document.querySelector('ul.pagination');
            if (nav) nav.remove();

            // Render
            renderFinalTable(allRows);
            makeSortable();

            const endRender = performance.now();
            const renderTime = ((endRender - startRender) / 1000).toFixed(2);
            timerDisplay.textContent = `(Fetch: ${fetchTime}s, Render: ${renderTime}s)`;

        } catch (error) {
            console.error('[MB Show All Events] Error:', error);
            btn.textContent = 'Error loading';
            btn.style.color = '';
            btn.style.cursor = 'pointer';
            btn.style.transform = '';
            btn.style.boxShadow = '';
            btn.disabled = false;
            stopBtn.style.display = 'none';
        }
    });

    function renderFinalTable(rowsToRender) {
        const table = document.querySelector('table.tbl');
        const tableBody = table.querySelector('tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        rowsToRender.forEach(row => tableBody.appendChild(row));
    }

    function makeSortable() {
        const headers = document.querySelectorAll('table.tbl thead th');

        headers.forEach((th, index) => {
            if (th.classList.contains('checkbox-cell') || th.querySelector('input[type="checkbox"]')) return;

            th.style.cursor = 'pointer';
            th.style.whiteSpace = 'nowrap';
            th.title = "Click to sort";
            th.classList.add('sortable');

            // Add generic sort icon if not already present
            if (!th.querySelector('.sort-icon')) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'sort-icon';
                iconSpan.textContent = ' ↕';
                th.appendChild(iconSpan);
            }

            th.addEventListener('click', () => {
                if (lastSortIndex === index) {
                    sortAscending = !sortAscending;
                } else {
                    sortAscending = true;
                    lastSortIndex = index;
                }

                headers.forEach((h, i) => {
                    const span = h.querySelector('.sort-icon');
                    if (!span) return;

                    if (i === index) {
                        span.textContent = sortAscending ? ' ▲' : ' ▼';
                        span.style.fontSize = '1.2em';
                    } else {
                        span.textContent = ' ↕';
                        span.style.fontSize = '';
                    }
                });

                allRows.sort((a, b) => {
                    const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                    const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
                    // Handle numeric/date sorting roughly via localeCompare
                    return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });

                const query = filterInput.value.toLowerCase();
                const rowsToDisplay = query
                    ? allRows.filter(r => r.textContent.toLowerCase().includes(query))
                    : allRows;

                renderFinalTable(rowsToDisplay);
            });
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
