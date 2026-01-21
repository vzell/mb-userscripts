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

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Loading...';

        const paginationLinks = document.querySelectorAll('ul.pagination li a');
        const urls = new Set();
        // Ensure we include the current page as well
        urls.add(window.location.href);

        paginationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('page=')) {
                urls.add(new URL(href, window.location.origin).href);
            }
        });

        // Map to store: Key = Subheader Text (e.g., "Official"), Value = Array of TR elements
        const groupedRows = new Map();

        try {
            const sortedUrls = Array.from(urls).sort();

            for (const url of sortedUrls) {
                btn.textContent = `Fetching ${new URL(url).searchParams.get('page') || '1'}...`;
                const html = await fetchHtml(url);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const rows = doc.querySelectorAll('table.tbl.mergeable-table tbody tr');

                let currentCategory = "Unknown";

                rows.forEach(row => {
                    if (row.classList.contains('subh')) {
                        // Extract category name from the second TH
                        currentCategory = row.querySelector('th[colspan]')?.textContent.trim() || "Unknown";
                    } else {
                        if (!groupedRows.has(currentCategory)) {
                            groupedRows.set(currentCategory, []);
                        }
                        groupedRows.get(currentCategory).push(document.importNode(row, true));
                    }
                });
            }

            renderFinalTable(groupedRows);

            const nav = document.querySelector('nav');
            if (nav) nav.remove();

            btn.textContent = 'All releases loaded';
        } catch (error) {
            console.error('Error fetching releases:', error);
            btn.textContent = 'Error loading';
            btn.disabled = false;
        }
    });

    function renderFinalTable(groupedRows) {
        const tableBody = document.querySelector('table.tbl.mergeable-table tbody');
        if (!tableBody) return;

        // Clear existing content
        tableBody.innerHTML = '';

        // Iterate through the Map and rebuild the table
        groupedRows.forEach((rows, category) => {
            // Create the subheader row
            const subhTr = document.createElement('tr');
            subhTr.className = 'subh';
            subhTr.innerHTML = `<th></th><th colspan="9">${category}</th>`;
            tableBody.appendChild(subhTr);

            // Append all release rows for this category
            rows.forEach(row => tableBody.appendChild(row));
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
