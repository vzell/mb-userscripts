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

    let sortAscending = true;
    let lastSortIndex = -1;

    btn.addEventListener('click', async () => {
        console.log('[MB Show All] Starting accumulation and header cleanup...');
        btn.disabled = true;
        btn.textContent = 'Loading...';

        const paginationLinks = document.querySelectorAll('ul.pagination li a');
        const urls = new Set([window.location.href]);

        paginationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('page=')) {
                urls.add(new URL(href, window.location.origin).href);
            }
        });

        const groupedRows = new Map();
        let relIdx = -1;
        let tagIdx = -1;

        try {
            const sortedUrls = Array.from(urls).sort();

            for (const url of sortedUrls) {
                const pageNum = new URL(url).searchParams.get('page') || '1';
                console.log(`[MB Show All] Fetching page ${pageNum}...`);

                const html = await fetchHtml(url);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Identify indices once based on the source document
                if (relIdx === -1) {
                    const ths = doc.querySelectorAll('table.tbl.mergeable-table thead th');
                    ths.forEach((th, i) => {
                        const text = th.textContent.trim();
                        if (text === 'Relationships') relIdx = i;
                        if (text === 'Tagger') tagIdx = i;
                    });
                    console.log(`[MB Show All] Found Relationships at ${relIdx}, Tagger at ${tagIdx}`);
                }

                const rows = doc.querySelectorAll('table.tbl.mergeable-table tbody tr');
                let currentCategory = "Unknown";

                rows.forEach(row => {
                    if (row.classList.contains('subh')) {
                        currentCategory = row.querySelector('th[colspan]')?.textContent.trim() || "Unknown";
                    } else {
                        if (!groupedRows.has(currentCategory)) {
                            groupedRows.set(currentCategory, []);
                        }

                        const cleanRow = document.importNode(row, true);
                        // Delete higher index first to maintain index stability
                        if (tagIdx !== -1 && cleanRow.cells[tagIdx]) cleanRow.deleteCell(tagIdx);
                        if (relIdx !== -1 && cleanRow.cells[relIdx]) cleanRow.deleteCell(relIdx);

                        groupedRows.get(currentCategory).push(cleanRow);
                    }
                });
            }

            // CLEAN UP HEADER: Find and remove headers by text to avoid index mismatch
            const thead = document.querySelector('table.tbl.mergeable-table thead');
            if (thead) {
                const headerCells = thead.querySelectorAll('th');
                headerCells.forEach(th => {
                    const text = th.textContent.trim();
                    if (text === 'Relationships' || text === 'Tagger') {
                        th.remove();
                    }
                });
            }

            console.log('[MB Show All] Headers cleaned. Rendering final table.');
            renderFinalTable(groupedRows);
            makeSortable(groupedRows);

            const nav = document.querySelector('nav');
            if (nav) nav.remove();

            btn.textContent = 'All releases loaded';
        } catch (error) {
            console.error('[MB Show All] Error:', error);
            btn.textContent = 'Error loading';
            btn.disabled = false;
        }
    });

    function renderFinalTable(groupedRows) {
        const table = document.querySelector('table.tbl.mergeable-table');
        const tableBody = table.querySelector('tbody');
        if (!tableBody) return;

        // Calculate actual columns remaining for the colspan
        const activeColumns = table.querySelectorAll('thead th').length;
        const subhColspan = activeColumns - 1; // -1 for the checkbox column

        tableBody.innerHTML = '';

        groupedRows.forEach((rows, category) => {
            const subhTr = document.createElement('tr');
            subhTr.className = 'subh';
            subhTr.innerHTML = `<th></th><th colspan="${subhColspan}">${category}</th>`;
            tableBody.appendChild(subhTr);
            rows.forEach(row => tableBody.appendChild(row));
        });
    }

    function makeSortable(groupedRows) {
        const headers = document.querySelectorAll('table.tbl.mergeable-table thead th');

        headers.forEach((th, index) => {
            if (index === 0 || th.classList.contains('checkbox-cell')) return;
            th.style.cursor = 'pointer';
            th.style.whiteSpace = 'nowrap';

            th.addEventListener('click', () => {
                if (lastSortIndex === index) {
                    sortAscending = !sortAscending;
                } else {
                    sortAscending = true;
                    lastSortIndex = index;
                }

                // Update indicators using text content to avoid destroying the header element
                headers.forEach((h, i) => {
                    h.innerHTML = h.innerHTML.replace(/ [▴▾]$/, '');
                    if (i === index) h.innerHTML += sortAscending ? ' ▴' : ' ▾';
                });

                groupedRows.forEach((rows) => {
                    rows.sort((a, b) => {
                        const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                        const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
                        return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
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
