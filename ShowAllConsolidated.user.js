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

    // Detect Page Type and Target Headers
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

    // Special Redirect Logic for Work Details (ensure we are on relationship view)
    if (pageType === 'work-details' && (!currentUrl.searchParams.has('direction') || !currentUrl.searchParams.has('link_type_id'))) {
        currentUrl.searchParams.set('direction', '2');
        currentUrl.searchParams.set('link_type_id', '278');
        window.location.replace(currentUrl.toString());
        return;
    }

    // --- UI Creation ---
    const btn = document.createElement('button');
    btn.textContent = `Show all ${pageType.replace('-', ' ')}`;
    btn.style.cssText = 'margin-left:10px; font-size:0.5em; padding:2px 6px; vertical-align:middle; cursor:pointer;';
    btn.classList.add('mb-show-all-btn');

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.cssText = 'display:none; margin-left:5px; font-size:0.5em; padding:2px 6px; vertical-align:middle; cursor:pointer; background-color:#f44336; color:white; border:1px solid #d32f2f;';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Filter ${pageType}...`;
    filterInput.style.cssText = 'display:none; margin-left:10px; font-size:0.5em; padding:2px 6px; vertical-align:middle; border:1px solid #ccc; border-radius:3px; width:150px;';

    const timerDisplay = document.createElement('span');
    timerDisplay.style.cssText = 'margin-left:10px; font-size:0.5em; color:#666; vertical-align:middle;';

    const style = document.createElement('style');
    style.textContent = `
        .mb-show-all-btn:active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .mb-show-all-btn:disabled { background-color: #ddd !important; cursor: default !important; }
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
        renderTable(filteredRows);
    });

    btn.addEventListener('click', async () => {
        if (isLoaded) return;

        // 1. Pagination Check
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

        if (maxPage > 100 && !confirm(`This will iterate through ${maxPage} pages. Do you really want to proceed?`)) return;

        // 2. Setup Loading
        isLoaded = true;
        btn.disabled = true;
        stopBtn.style.display = 'inline-block';
        const startTime = performance.now();

        // Hide Jesus2099 Bigbox if present
        const bigBox = document.querySelector('div.jesus2099userjs154481bigbox');
        if (bigBox) bigBox.style.display = 'none';

        // 3. Page Iteration
        const baseUrl = new URL(window.location.href);
        for (let p = 1; p <= maxPage; p++) {
            if (stopRequested) break;

            btn.textContent = `Loading ${p}/${maxPage}...`;
            baseUrl.searchParams.set('page', p);

            try {
                const html = await fetchHtml(baseUrl.toString());
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const pageRows = Array.from(doc.querySelectorAll('table.tbl tbody tr:not(.explanation)'));

                // Filter out empty rows/placeholders
                const validRows = pageRows.filter(r => r.querySelector('td'));
                allRows.push(...validRows);
            } catch (err) {
                console.error('Fetch error:', err);
            }
        }

        const loadEndTime = performance.now();
        const loadTime = ((loadEndTime - startTime) / 1000).toFixed(2);

        // 4. Rendering
        btn.textContent = 'Rendering...';
        const renderStartTime = performance.now();

        renderTable(allRows);

        const renderEndTime = performance.now();
        const renderTime = ((renderEndTime - renderStartTime) / 1000).toFixed(2);

        // 5. Finalize UI
        btn.textContent = `Finished (${allRows.length} items)`;
        stopBtn.style.display = 'none';
        filterInput.style.display = 'inline-block';
        timerDisplay.textContent = `Load: ${loadTime}s | Render: ${renderTime}s`;
    });

    function renderTable(rowsToDisplay) {
        const table = document.querySelector('table.tbl');
        if (!table) return;

        // Clean up pagination/header icons
        document.querySelectorAll('ul.pagination, div.pageselector').forEach(el => el.style.display = 'none');

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        rowsToDisplay.forEach(row => tbody.appendChild(row));

        // Add sorting functionality to headers
        const headers = Array.from(table.querySelectorAll('thead th'));
        headers.forEach((th, index) => {
            if (!th.textContent.trim()) return;

            let icon = th.querySelector('.sort-icon');
            if (!icon) {
                icon = document.createElement('span');
                icon.className = 'sort-icon';
                icon.textContent = ' ↕';
                icon.title = 'Click to sort';
                th.appendChild(icon);
                th.style.cursor = 'pointer';

                th.onclick = () => {
                    if (lastSortIndex === index) sortAscending = !sortAscending;
                    else { sortAscending = true; lastSortIndex = index; }

                    // Update all icons
                    headers.forEach((h, i) => {
                        const s = h.querySelector('.sort-icon');
                        if (s) s.textContent = (i === index) ? (sortAscending ? ' ▲' : ' ▼') : ' ↕';
                    });

                    allRows.sort((a, b) => {
                        const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                        const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
                        return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    });

                    renderTable(filterInput.value ? allRows.filter(r => r.textContent.toLowerCase().includes(filterInput.value.toLowerCase())) : allRows);
                };
            }
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
