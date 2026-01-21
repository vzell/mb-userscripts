// ==UserScript==
// @name         VZ: MusicBrainz - Show All Releases in Group
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Accumulates all releases from paginated release group pages into a single view.
// @author       Assistant
// @match        https://musicbrainz.org/release-group/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const headerLink = document.querySelector('.rgheader h1 a');
    if (!headerLink) return;

    const btn = document.createElement('button');
    btn.textContent = 'Show all releases';
    btn.style.marginLeft = '10px';
    btn.style.fontSize = '0.5em';
    btn.style.padding = '2px 6px';
    btn.style.verticalAlign = 'middle';
    btn.type = 'button';

    headerLink.parentNode.appendChild(btn);

    // Track sorting state
    let sortAscending = true;
    let lastSortIndex = -1;

    btn.addEventListener('click', async () => {
        console.log('[MB Show All] Button clicked. Starting accumulation...');
        btn.disabled = true;
        btn.textContent = 'Loading...';

        const paginationLinks = document.querySelectorAll('ul.pagination li a');
        const urls = new Set();
        urls.add(window.location.href);

        paginationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('page=')) {
                urls.add(new URL(href, window.location.origin).href);
            }
        });

        console.log(`[MB Show All] Found ${urls.size} pages to fetch.`);

        const groupedRows = new Map();

        try {
            const sortedUrls = Array.from(urls).sort();

            for (const url of sortedUrls) {
                const pageNum = new URL(url).searchParams.get('page') || '1';
                console.log(`[MB Show All] Fetching page ${pageNum}...`);
                btn.textContent = `Fetching page ${pageNum}...`;

                const html = await fetchHtml(url);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const rows = doc.querySelectorAll('table.tbl.mergeable-table tbody tr');

                let currentCategory = "Unknown";

                rows.forEach(row => {
                    if (row.classList.contains('subh')) {
                        currentCategory = row.querySelector('th[colspan]')?.textContent.trim() || "Unknown";
                    } else {
                        if (!groupedRows.has(currentCategory)) {
                            groupedRows.set(currentCategory, []);
                        }
                        groupedRows.get(currentCategory).push(document.importNode(row, true));
                    }
                });
            }

            console.log('[MB Show All] All pages fetched. Categories identified:', Array.from(groupedRows.keys()));
            renderFinalTable(groupedRows);
            makeSortable(groupedRows);

            const nav = document.querySelector('nav');
            if (nav) nav.remove();

            btn.textContent = 'All releases loaded';
            console.log('[MB Show All] UI updated and sorting enabled.');
        } catch (error) {
            console.error('[MB Show All] Error during process:', error);
            btn.textContent = 'Error loading';
            btn.disabled = false;
        }
    });

    function renderFinalTable(groupedRows) {
        const tableBody = document.querySelector('table.tbl.mergeable-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        groupedRows.forEach((rows, category) => {
            const subhTr = document.createElement('tr');
            subhTr.className = 'subh';
            subhTr.innerHTML = `<th></th><th colspan="10">${category}</th>`;
            tableBody.appendChild(subhTr);

            rows.forEach(row => tableBody.appendChild(row));
        });
    }

    function makeSortable(groupedRows) {
        const headers = document.querySelectorAll('table.tbl.mergeable-table thead th');

        headers.forEach((th, index) => {
            if (index === 0) return; // Skip checkbox column

            th.style.cursor = 'pointer';
            th.title = 'Click to sort';

            th.addEventListener('click', () => {
                console.log(`[MB Show All] Sorting by column index ${index}...`);

                if (lastSortIndex === index) {
                    sortAscending = !sortAscending;
                } else {
                    sortAscending = true;
                }
                lastSortIndex = index;

                // Sort the rows within each group
                groupedRows.forEach((rows, category) => {
                    rows.sort((a, b) => {
                        const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                        const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';

                        if (valA < valB) return sortAscending ? -1 : 1;
                        if (valA > valB) return sortAscending ? 1 : -1;
                        return 0;
                    });
                });

                renderFinalTable(groupedRows);
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
