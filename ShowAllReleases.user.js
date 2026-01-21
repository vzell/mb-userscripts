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

    const headerContainer = document.querySelector('.rgheader h1 a');
    if (!headerContainer) return;

    // Create the button
    const btn = document.createElement('button');
    btn.textContent = 'Show all releases';
    btn.style.marginLeft = '10px';
    btn.style.fontSize = '0.5em';
    btn.style.verticalAlign = 'middle';
    btn.type = 'button';

    headerContainer.parentNode.appendChild(btn);

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Loading...';

        const paginationLinks = document.querySelectorAll('ul.pagination li a');
        const urls = new Set();
        const baseUrl = window.location.origin + window.location.pathname;

        // Collect all unique page URLs
        paginationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('page=')) {
                urls.add(new URL(href, window.location.origin).href);
            }
        });

        // If no pagination found, we are already on the only page
        if (urls.size === 0) {
            btn.textContent = 'All releases already shown';
            return;
        }

        const sortedUrls = Array.from(urls).sort();
        const tableBody = document.querySelector('table.tbl.mergeable-table tbody');

        if (!tableBody) {
            btn.textContent = 'Table not found';
            return;
        }

        // Clear existing rows to prepare for full list (optional: keep page 1 and skip it in loop)
        tableBody.innerHTML = '';

        try {
            for (const url of sortedUrls) {
                btn.textContent = `Fetching page ${new URL(url).searchParams.get('page')}...`;
                const response = await fetchHtml(url);
                const parser = new DOMParser();
                const doc = parser.parseFromString(response, 'text/html');
                const rows = doc.querySelectorAll('table.tbl.mergeable-table tbody tr');

                rows.forEach(row => {
                    tableBody.appendChild(document.importNode(row, true));
                });
            }

            // Remove pagination UI as it is no longer relevant
            const nav = document.querySelector('nav');
            if (nav && nav.querySelector('.pagination')) {
                nav.remove();
            }

            btn.textContent = 'All releases loaded';
        } catch (error) {
            console.error('Error fetching releases:', error);
            btn.textContent = 'Error loading releases';
            btn.disabled = false;
        }
    });

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
