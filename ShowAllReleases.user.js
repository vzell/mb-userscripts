// ==UserScript==
// @name         VZ: MusicBrainz - Show All Releases in Group
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Accumulates all releases from paginated release group pages into a single view with filtering and sorting.
// @author       Assistant
// @match        https://musicbrainz.org/release-group/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const headerLink = document.querySelector('.rgheader h1 a');
    if (!headerLink) return;

    // Create Main Button
    const btn = document.createElement('button');
    btn.textContent = 'Show all releases';
    btn.style.marginLeft = '10px';
    btn.style.fontSize = '0.5em';
    btn.style.padding = '2px 6px';
    btn.style.verticalAlign = 'middle';
    btn.type = 'button';

    // Create Container for Filter Buttons (hidden initially)
    const filterContainer = document.createElement('span');
    filterContainer.style.display = 'none';
    filterContainer.style.marginLeft = '10px';
    filterContainer.style.fontSize = '0.8rem';

    headerLink.parentNode.appendChild(btn);
    headerLink.parentNode.appendChild(filterContainer);

    // State Variables
    let sortAscending = true;
    let lastSortIndex = -1;
    let groupedRows = new Map(); // Stores all data
    let currentRenderMap = new Map(); // Stores currently displayed data
    let isLoaded = false;

    btn.addEventListener('click', async () => {
        // If already loaded, this button acts as a "Reset / Show All"
        if (isLoaded) {
            currentRenderMap = groupedRows;
            renderFinalTable(currentRenderMap);
            return;
        }

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

            // CLEAN UP HEADER
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

            // Calculate total count
            let totalCount = 0;
            groupedRows.forEach(rows => totalCount += rows.length);

            // Update State
            isLoaded = true;
            currentRenderMap = groupedRows;

            // Update UI
            btn.textContent = `All ${totalCount} releases`;
            btn.disabled = false; // Re-enable to allow resetting filter

            // Generate Filter Buttons
            generateFilterButtons(groupedRows, filterContainer);
            filterContainer.style.display = 'inline';

            // Remove Nav
            const nav = document.querySelector('nav');
            if (nav) nav.remove();

            // Initial Render
            renderFinalTable(currentRenderMap);
            makeSortable();

        } catch (error) {
            console.error('[MB Show All] Error:', error);
            btn.textContent = 'Error loading';
            btn.disabled = false;
        }
    });

    function generateFilterButtons(dataMap, container) {
        container.innerHTML = ' Load only '; // Reset text

        dataMap.forEach((rows, category) => {
            const count = rows.length;
            const subBtn = document.createElement('button');
            subBtn.type = 'button';
            subBtn.textContent = `${count} ${category}`;
            subBtn.style.marginLeft = '5px';
            subBtn.style.fontSize = '0.85em';
            subBtn.style.padding = '1px 5px';
            subBtn.style.cursor = 'pointer';

            subBtn.addEventListener('click', () => {
                // Create a subset map containing only this category
                const subset = new Map();
                subset.set(category, rows);
                currentRenderMap = subset;
                renderFinalTable(currentRenderMap);
            });

            container.appendChild(subBtn);
        });
    }

    function renderFinalTable(mapToRender) {
        const table = document.querySelector('table.tbl.mergeable-table');
        const tableBody = table.querySelector('tbody');
        if (!tableBody) return;

        // Calculate actual columns remaining for the colspan
        const activeColumns = table.querySelectorAll('thead th').length;
        const subhColspan = activeColumns - 1;

        tableBody.innerHTML = '';

        mapToRender.forEach((rows, category) => {
            const subhTr = document.createElement('tr');
            subhTr.className = 'subh';
            subhTr.innerHTML = `<th></th><th colspan="${subhColspan}">${category}</th>`;
            tableBody.appendChild(subhTr);
            rows.forEach(row => tableBody.appendChild(row));
        });
    }

    function makeSortable() {
        const headers = document.querySelectorAll('table.tbl.mergeable-table thead th');

        headers.forEach((th, index) => {
            if (index === 0 || th.classList.contains('checkbox-cell')) return;
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

                // Update indicators using strict DOM manipulation
                headers.forEach((h, i) => {
                    // Find any existing sort icon in this header and remove it
                    const existingIcon = h.querySelector('.sort-icon');
                    if (existingIcon) {
                        existingIcon.remove();
                    }

                    // Append new icon only to the active header
                    if (i === index) {
                        const iconSpan = document.createElement('span');
                        iconSpan.className = 'sort-icon';
                        iconSpan.style.fontSize = '1.2em';
                        iconSpan.textContent = sortAscending ? ' ▲' : ' ▼';
                        h.appendChild(iconSpan);
                    }
                });

                // Sort ALL lists in the master group to ensure consistency across filters
                groupedRows.forEach((rows) => {
                    rows.sort((a, b) => {
                        const valA = a.cells[index]?.textContent.trim().toLowerCase() || '';
                        const valB = b.cells[index]?.textContent.trim().toLowerCase() || '';
                        return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    });
                });

                // Re-render only what is currently being viewed (filtered or all)
                renderFinalTable(currentRenderMap);
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
