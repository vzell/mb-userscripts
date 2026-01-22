// ==UserScript==
// @name         VZ: MusicBrainz - Show All Recordings
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.2+2026-01-22
// @description  Accumulates all recordings from paginated work recording pages into a single view with sorting
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

    // Target the work title bdi inside the h1 link
    const workBdi = document.querySelector('h1 a bdi');
    if (!workBdi) return;

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

    // Append button after the <bdi> tag
    workBdi.parentNode.insertBefore(btn, workBdi.nextSibling);

    // State Variables
    let sortAscending = true;
    let lastSortIndex = -1;
    let allRows = [];
    let isLoaded = false;

    btn.addEventListener('click', async () => {
        if (isLoaded) return;

        console.log('[MB Show All Recordings] Starting accumulation...');

        // Visual "Button Down" state during load
        btn.disabled = true;
        btn.style.color = '#000';
        btn.style.cursor = 'default';
        btn.style.transform = 'translateY(1px)';
        btn.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';

        // Base URL for the recording relationship
        const workUrl = window.location.href.split(/[?#]/)[0];
        const recordingBaseUrl = `${workUrl}?direction=2&link_type_id=278`;

        try {
            // Step 1: Call Page 1 initially
            btn.textContent = 'Checking relationships...';
            let initialHtml = await fetchHtml(`${recordingBaseUrl}&page=1`);
            let parser = new DOMParser();
            let doc = parser.parseFromString(initialHtml, 'text/html');

            // Step 2: Check for "See all <n> relationships" link
            const seeAllLink = Array.from(doc.querySelectorAll('td.treleases a'))
                .find(a => a.textContent.includes('See all') && a.textContent.includes('relationships'));

            if (seeAllLink) {
                console.log('[MB Show All Recordings] Found "See all" link, fetching full list...');
                const fullListUrl = seeAllLink.href;
                initialHtml = await fetchHtml(fullListUrl);
                doc = parser.parseFromString(initialHtml, 'text/html');
            }

            // Step 3: Logic to find the maximum page number from pagination
            let maxPage = 1;
            const paginationList = doc.querySelector('ul.pagination');
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

            // Step 4: Iterate through all pages
            for (let p = 1; p <= maxPage; p++) {
                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const targetUrl = `${recordingBaseUrl}&page=${p}`;
                console.log(`[MB Show All Recordings] Fetching page ${p} of ${maxPage}...`);

                // Use the already fetched doc for the first page of the expanded list
                const pageDoc = (p === 1) ? doc : parser.parseFromString(await fetchHtml(targetUrl), 'text/html');

                const rows = pageDoc.querySelectorAll('table.tbl tbody tr');
                rows.forEach(row => {
                    // Skip the "See all relationships" row and empty rows
                    if (row.cells.length > 1 && !row.querySelector('td.treleases')) {
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

            // Find current table or create container
            let table = document.querySelector('table.tbl');
            if (!table) {
                const contentDiv = document.querySelector('#content');
                const tableContainer = document.createElement('div');
                tableContainer.innerHTML = '<h2>All Recordings</h2><table class="tbl"><thead></thead><tbody></tbody></table>';
                contentDiv.appendChild(tableContainer);
                table = tableContainer.querySelector('table.tbl');
                const sampleHeader = doc.querySelector('table.tbl thead');
                if (sampleHeader) table.querySelector('thead').innerHTML = sampleHeader.innerHTML;
            }

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
        const tableBody = document.querySelector('table.tbl tbody');
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
