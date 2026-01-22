// ==UserScript==
// @name         VZ: MusicBrainz - Show All Recordings In Works
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-22
// @description  Accumulates all recordings from paginated work recording pages into a single view with sorting and auto-redirect
// @author       Gemini & ChatGPT (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllRecordings.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllRecordings.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/work/*
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Auto-redirect logic to ensure we are on the recording relationship view
    const currentUrl = new URL(window.location.href);
    const params = currentUrl.searchParams;

    if (!params.has('direction') || !params.has('link_type_id')) {
        console.log('[MB Show All Recordings] Redirecting to recording relationship view...');
        params.set('direction', '2');
        params.set('link_type_id', '278');
        // Ensure we start on page 1 if no page is specified
        if (!params.has('page')) {
            params.set('page', '1');
        }
        window.location.replace(currentUrl.toString());
        return; // Stop execution of the rest of the script until reload
    }

    // Target the bdi tag inside the h1 a
    const titleBdi = document.querySelector('h1 a bdi');
    if (!titleBdi) return;

    // Create Main Button
    const btn = document.createElement('button');
    btn.textContent = 'Show all recordings';
    btn.style.marginLeft = '10px';
    btn.style.fontSize = '0.5em';
    btn.style.padding = '2px 6px';
    btn.style.verticalAlign = 'middle';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'transform 0.1s, box-shadow 0.1s';
    btn.type = 'button';

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

    // Append button after the title bdi
    titleBdi.parentNode.insertBefore(btn, titleBdi.nextSibling);

    // State Variables
    let sortAscending = true;
    let lastSortIndex = -1;
    let allRows = [];
    let isLoaded = false;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isLoaded) return;

        console.log('[MB Show All Recordings] Starting accumulation...');

        btn.disabled = true;
        btn.style.color = '#000';
        btn.style.cursor = 'default';
        btn.style.transform = 'translateY(1px)';
        btn.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';

        const baseUrl = window.location.origin + window.location.pathname;
        const direction = params.get('direction');
        const linkTypeId = params.get('link_type_id');

        let maxPage = 1;
        const paginationList = document.querySelector('ul.pagination');
        if (paginationList) {
            const links = Array.from(paginationList.querySelectorAll('li a'));
            links.forEach(link => {
                const p = new URL(link.href, window.location.origin).searchParams.get('page');
                if (p) maxPage = Math.max(maxPage, parseInt(p, 10));
            });
        }

        try {
            for (let p = 1; p <= maxPage; p++) {
                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const targetUrl = `${baseUrl}?direction=${direction}&link_type_id=${linkTypeId}&page=${p}`;
                console.log(`[MB Show All Recordings] Fetching page ${p} of ${maxPage}...`);

                const html = await fetchHtml(targetUrl);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const rows = doc.querySelectorAll('table.tbl tbody tr');
                rows.forEach(row => {
                    if (row.cells.length > 1) {
                        const cleanRow = document.importNode(row, true);
                        allRows.push(cleanRow);
                    }
                });
            }

            isLoaded = true;
            console.log(`[MB Show All Recordings] Successfully loaded ${allRows.length} rows.`);

            btn.textContent = `All ${allRows.length} recordings loaded`;
            btn.style.color = '';
            btn.style.cursor = 'pointer';
            btn.style.transform = '';
            btn.style.boxShadow = '';
            btn.disabled = false;

            const nav = document.querySelector('nav.pagination') || document.querySelector('ul.pagination');
            if (nav) nav.remove();

            renderFinalTable(allRows);
            makeSortable();

        } catch (error) {
            console.error('[MB Show All Recordings] Error:', error);
            btn.textContent = 'Error loading';
            btn.disabled = false;
            btn.style.transform = '';
            btn.style.boxShadow = '';
        }
    });

    function renderFinalTable(rowsToRender) {
        const table = document.querySelector('table.tbl');
        if (!table) return;
        const tableBody = table.querySelector('tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        rowsToRender.forEach(row => tableBody.appendChild(row));
    }

    function makeSortable() {
        const headers = document.querySelectorAll('table.tbl thead th');

        headers.forEach((th, index) => {
            if (th.classList.contains('checkbox-cell')) return;

            th.style.cursor = 'pointer';
            th.style.whiteSpace = 'nowrap';
            th.title = "Click to sort";

            th.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`[MB Show All Recordings] Sorting by column index ${index}...`);
                if (lastSortIndex === index) {
                    sortAscending = !sortAscending;
                } else {
                    sortAscending = true;
                    lastSortIndex = index;
                }

                headers.forEach((h, i) => {
                    const existingIcon = h.querySelector('.sort-icon');
                    if (existingIcon) existingIcon.remove();

                    if (i === index) {
                        const iconSpan = document.createElement('span');
                        iconSpan.className = 'sort-icon';
                        iconSpan.style.fontSize = '1.2em';
                        iconSpan.textContent = sortAscending ? ' ▲' : ' ▼';
                        h.appendChild(iconSpan);
                    }
                });

                allRows.sort((a, b) => {
                    const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                    const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
                    return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });

                renderFinalTable(allRows);
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
