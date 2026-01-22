// ==UserScript==
// @name         VZ: MusicBrainz - Show All Recordings
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-22
// @description  Accumulates all recordings from paginated artist recording pages into a single view with sorting
// @author       Gemini
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllRecordings.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllRecordings.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/artist/*/recordings
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

    // Append button to the h1
    headerH1.appendChild(btn);

    // State Variables
    let sortAscending = true;
    let lastSortIndex = -1;
    let allRows = [];
    let isLoaded = false;

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

        // Popup warning for large datasets
        if (maxPage > 100) {
            const proceed = confirm(`Warning: This artist has ${maxPage} pages of recordings. Loading all of them may take a while and could slow down your browser. Do you want to proceed?`);
            if (!proceed) return;
        }

        console.log('[MB Show All Recordings] Starting accumulation...');

        // Visual loading state
        btn.disabled = true;
        btn.style.color = '#000';
        btn.style.cursor = 'default';
        btn.style.transform = 'translateY(1px)';
        btn.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';

        const baseUrl = window.location.href.split('?')[0];

        try {
            for (let p = 1; p <= maxPage; p++) {
                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const targetUrl = `${baseUrl}?page=${p}`;
                console.log(`[MB Show All Recordings] Fetching page ${p} of ${maxPage}...`);

                const html = await fetchHtml(targetUrl);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const rows = doc.querySelectorAll('table.tbl tbody tr');
                rows.forEach(row => {
                    // Filter out "No recordings found" or empty rows
                    if (row.cells.length > 1) {
                        const cleanRow = document.importNode(row, true);
                        allRows.push(cleanRow);
                    }
                });
            }

            // Update State
            isLoaded = true;

            // Update UI
            btn.textContent = `All ${allRows.length} recordings loaded`;
            btn.style.color = '';
            btn.style.cursor = 'pointer';
            btn.style.transform = '';
            btn.style.boxShadow = '';
            btn.disabled = false;

            // Remove Pagination
            const nav = document.querySelector('nav.pagination') || document.querySelector('ul.pagination');
            if (nav) nav.remove();

            // Render
            renderFinalTable(allRows);
            makeSortable();

        } catch (error) {
            console.error('[MB Show All Recordings] Error:', error);
            btn.textContent = 'Error loading';
            btn.style.color = '';
            btn.style.cursor = 'pointer';
            btn.style.transform = '';
            btn.style.boxShadow = '';
            btn.disabled = false;
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
            // Standard MusicBrainz recording tables usually have checkboxes in the first or last columns
            if (th.classList.contains('checkbox-cell') || th.querySelector('input[type="checkbox"]')) return;

            th.style.cursor = 'pointer';
            th.style.whiteSpace = 'nowrap';
            th.title = "Click to sort";

            th.addEventListener('click', () => {
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
