// ==UserScript==
// @name         VZ: MusicBrainz - Show All Releases
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.1+2026-01-22
// @description  Accumulates all releases from paginated artist release pages into a single view with sorting
// @author       Gemini & ChatGPT (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllReleases.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllReleases.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/artist/*/releases
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
    btn.textContent = 'Show all releases';
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

    // Append button to the h1 (appearing after the artist name link)
    headerH1.appendChild(btn);

    // State Variables
    let sortAscending = true;
    let lastSortIndex = -1;
    let allRows = []; // Stores all data (flat list for Releases)
    let isLoaded = false;

    btn.addEventListener('click', async () => {
        if (isLoaded) return;

        console.log('[MB Show All Releases] Starting accumulation...');

        // Additionally make the "<div class="jesus2099userjs154481bigbox"> container invisible
        const bigBox = document.querySelector('div.jesus2099userjs154481bigbox');
        if (bigBox) {
            bigBox.style.display = 'none';
        }

        // Visual "Button Down" state during load
        btn.disabled = true;
        btn.style.color = '#000';
        btn.style.cursor = 'default';
        btn.style.transform = 'translateY(1px)';
        btn.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';

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
                // Fallback: get the highest page number from any link if "Next" isn't found
                links.forEach(link => {
                    const p = new URL(link.href, window.location.origin).searchParams.get('page');
                    if (p) maxPage = Math.max(maxPage, parseInt(p, 10));
                });
            }
        }

        const baseUrl = window.location.href.split('?')[0];
        let relIdx = -1;

        try {
            // Iterate from 1 to maxPage
            for (let p = 1; p <= maxPage; p++) {
                // Update button text with current progress
                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const targetUrl = `${baseUrl}?page=${p}`;
                console.log(`[MB Show All Releases] Fetching page ${p} of ${maxPage}...`);

                const html = await fetchHtml(targetUrl);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Identify index for "Relationships" once
                // Note: Releases table structure might differ slightly from Works,
                // but we search for the specific header text to be safe.
                if (relIdx === -1) {
                    const ths = doc.querySelectorAll('table.tbl thead th');
                    ths.forEach((th, i) => {
                        const text = th.textContent.trim();
                        if (text === 'Relationships') relIdx = i;
                    });
                }

                const rows = doc.querySelectorAll('table.tbl tbody tr');
                rows.forEach(row => {
                    // Check if row actually has data (ignore placeholders/empty rows)
                    if (row.cells.length > 1) {
                        const cleanRow = document.importNode(row, true);
                        // Remove Relationships cell if found
                        if (relIdx !== -1 && cleanRow.cells[relIdx]) {
                            cleanRow.deleteCell(relIdx);
                        }
                        allRows.push(cleanRow);
                    }
                });
            }

            // CLEAN UP HEADER
            const table = document.querySelector('table.tbl');
            const thead = table.querySelector('thead');
            if (thead) {
                const headerCells = thead.querySelectorAll('th');
                headerCells.forEach(th => {
                    const text = th.textContent.trim();
                    if (text === 'Relationships') {
                        th.remove();
                    }
                });
            }

            // Update State
            isLoaded = true;

            // Update UI
            btn.textContent = `All ${allRows.length} releases loaded`;
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
            console.error('[MB Show All Releases] Error:', error);
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
            if (th.classList.contains('checkbox-cell')) return;

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
