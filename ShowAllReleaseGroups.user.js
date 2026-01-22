// ==UserScript==
// @name         VZ: MusicBrainz - Show All Release Groups
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.1+2026-01-22
// @description  Accumulates all release groups from paginated artist pages into a single view grouped by type
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @match        https://musicbrainz.org/artist/*
// @exclude      https://musicbrainz.org/artist/*/releases
// @exclude      https://musicbrainz.org/artist/*/recordings
// @exclude      https://musicbrainz.org/artist/*/works
// @exclude      https://musicbrainz.org/artist/*/events
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
    btn.textContent = 'Show all release groups';
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

    headerH1.appendChild(btn);

    let isLoaded = false;
    // Map to store rows grouped by their H3 header text
    const releaseGroupsByType = new Map();

    btn.addEventListener('click', async () => {
        if (isLoaded) return;

        console.log('[MB Show All Release Groups] Starting accumulation...');

        // Hide bigbox containers immediately
        hideBigBoxes();

        btn.disabled = true;
        btn.style.transform = 'translateY(1px)';
        btn.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';

        // Logic to find max page
        let maxPage = 1;
        const paginationList = document.querySelector('ul.pagination');
        if (paginationList) {
            const links = Array.from(paginationList.querySelectorAll('li a'));
            const nextLinkIndex = links.findIndex(a => a.textContent.trim() === 'Next');
            if (nextLinkIndex > 0) {
                const urlObj = new URL(links[nextLinkIndex - 1].href, window.location.origin);
                const pageParam = urlObj.searchParams.get('page');
                if (pageParam) maxPage = parseInt(pageParam, 10);
            }
        }

        const baseUrl = window.location.href.split('?')[0];

        try {
            for (let p = 1; p <= maxPage; p++) {
                btn.textContent = `Loading page ${p} of ${maxPage}...`;
                const targetUrl = `${baseUrl}?page=${p}`;
                const html = await fetchHtml(targetUrl);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Process headers and tables
                const headers = doc.querySelectorAll('#content h3');
                headers.forEach(h3 => {
                    const typeTitle = h3.textContent.trim();
                    const table = h3.nextElementSibling;

                    if (table && table.tagName === 'TABLE' && table.classList.contains('tbl')) {
                        if (!releaseGroupsByType.has(typeTitle)) {
                            // Clone table structure (header) once
                            const tableClone = document.importNode(table, true);
                            const tbody = tableClone.querySelector('tbody');
                            if (tbody) tbody.innerHTML = '';

                            // Remove Relationships header
                            const relIdx = findRelColumnIndex(tableClone);
                            if (relIdx !== -1) {
                                tableClone.querySelectorAll('thead th')[relIdx].remove();
                            }

                            releaseGroupsByType.set(typeTitle, {
                                table: tableClone,
                                relIndex: relIdx
                            });
                        }

                        const state = releaseGroupsByType.get(typeTitle);
                        const rows = table.querySelectorAll('tbody tr');
                        rows.forEach(row => {
                            if (row.cells.length > 1) {
                                const cleanRow = document.importNode(row, true);
                                if (state.relIndex !== -1 && cleanRow.cells[state.relIndex]) {
                                    cleanRow.deleteCell(state.relIndex);
                                }
                                state.table.querySelector('tbody').appendChild(cleanRow);
                            }
                        });
                    }
                });
            }

            renderFinalContent();
            hideBigBoxes(); // Ensure newly added boxes are hidden

            isLoaded = true;
            btn.textContent = `All release groups loaded`;
            btn.disabled = false;
            btn.style.transform = '';
            btn.style.boxShadow = '';

        } catch (error) {
            console.error('[MB Show All Release Groups] Error:', error);
            btn.textContent = 'Error loading';
            btn.disabled = false;
        }
    });

    function findRelColumnIndex(tableElement) {
        const ths = tableElement.querySelectorAll('thead th');
        let index = -1;
        ths.forEach((th, i) => {
            if (th.textContent.trim() === 'Relationships') index = i;
        });
        return index;
    }

    function hideBigBoxes() {
        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => {
            div.style.display = 'none';
        });
    }

    function renderFinalContent() {
        const container = document.querySelector('#content');
        if (!container) return;

        // Clear existing tables/headers/pagination from the main content area
        const nav = document.querySelector('nav.pagination') || document.querySelector('ul.pagination');
        if (nav) nav.remove();

        // Remove existing release group headers and tables to replace with consolidated ones
        const existingH3s = container.querySelectorAll('h3');
        const existingTbls = container.querySelectorAll('table.tbl');
        existingH3s.forEach(el => el.remove());
        existingTbls.forEach(el => el.remove());

        // Append consolidated data
        releaseGroupsByType.forEach((data, title) => {
            const h3 = document.createElement('h3');
            h3.textContent = title;
            container.appendChild(h3);
            container.appendChild(data.table);
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
