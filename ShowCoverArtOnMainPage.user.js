// ==UserScript==
// @name         VZ: MusicBrainz - Show Cover Art On Main Release Page
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.0+2026-01-31
// @description  Shows all cover art images (250px) on the main release page before the tracklist. Collapsible.
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowCoverArtOnMainPage.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowCoverArtOnMainPage.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/release/*
// @exclude      *://*.musicbrainz.org/release/*/*
// @license      MIT
// ==/UserScript==

"use strict";

(function() {

        const DEBUG_ENABLED = true;

    // --- Modernized Logging Framework ---
    const Logger = {
        prefix: '[MB-ShowAll]',
        styles: {
            debug: 'color: #7f8c8d; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold;',
            info: 'color: #2980b9; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; font-size: 11px;',
            error: 'color: #c0392b; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fceae9; padding: 2px 4px; border-radius: 3px;',
            timer: 'color: #8e44ad; font-family: "Consolas", monospace; font-style: italic;'
        },
        icons: {
            init: '🚀',
            fetch: '📥',
            render: '🎨',
            filter: '🔍',
            sort: '⚖️',
            cleanup: '🧹',
            error: '❌',
            success: '✅',
            meta: '🎵'
        },
        log(level, icon, msg, data = '') {
            if (!DEBUG_ENABLED && level === 'debug') return;
            const style = this.styles[level] || '';
            const iconChar = this.icons[icon] || '📝';
            console.log(`%c${this.prefix} ${iconChar} ${msg}`, style, data);
        },
        debug(icon, msg, data) { this.log('debug', icon, msg, data); },
        info(icon, msg, data) { this.log('info', icon, msg, data); },
        error(icon, msg, data) { this.log('error', 'error', msg, data); }
    };

    // Backward compatibility wrapper for existing simple log calls
    const log = (msg, data = '') => {
        let icon = 'meta';
        if (msg.includes('Initializing')) icon = 'init';
        if (msg.includes('Fetching') || msg.includes('page')) icon = 'fetch';
        if (msg.includes('cleanup')) icon = 'cleanup';
        if (msg.includes('Filter')) icon = 'filter';
        Logger.debug(icon, msg, data);
    };

    // Existing comments should NOT be deleted
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
    const tracklistHeader = document.querySelector("h2.tracklist, h2#tracklist");

    if (mbidMatch && tracklistHeader) {
        const mbid = mbidMatch[0];
        Logger.info('init', "ShowCoverArtOnMainPage: Fetching cover art for " + mbid);

        fetch("https://coverartarchive.org/release/" + mbid)
            .then(response => {
                if (response.ok) return response.json();
                throw new Error("No cover art available or API error.");
            })
            .then(data => {
                if (data.images && data.images.length > 0) {
                    const fragment = document.createDocumentFragment();

                    const gallery = document.createElement("div");
                    gallery.id = "consolidated-cover-art-gallery";
                    gallery.style.display = "flex";
                    gallery.style.flexWrap = "wrap";
                    gallery.style.gap = "10px";
                    gallery.style.marginBottom = "20px";
                    gallery.style.overflow = "hidden";

                    // Create the header with toggle logic
                    const caHeader = document.createElement("h2");
                    caHeader.textContent = "Cover art";
                    caHeader.style.cursor = "pointer";
                    caHeader.style.userSelect = "none";
                    caHeader.addEventListener("click", function() {
                        if (gallery.style.display === "none") {
                            gallery.style.display = "flex";
                        } else {
                            gallery.style.display = "none";
                        }
                    });

                    fragment.appendChild(caHeader);

                    // Add a new line after the h2 header
                    fragment.appendChild(document.createElement("br"));

                    data.images.forEach(img => {
                        const link = document.createElement("a");
                        link.href = img.image;
                        link.target = "_blank";

                        const image = document.createElement("img");
                        image.src = img.thumbnails["250"] || img.thumbnails.small || img.image;
                        image.alt = img.types.join(", ");
                        image.title = img.types.join(", ") + (img.comment ? " (" + img.comment + ")" : "");
                        image.style.maxWidth = "250px";
                        image.style.maxHeight = "250px";
                        image.style.border = "1px solid #ccc";

                        link.appendChild(image);
                        gallery.appendChild(link);
                    });

                    fragment.appendChild(gallery);

                    // Insert the fragment before the Tracklist header
                    tracklistHeader.parentNode.insertBefore(fragment, tracklistHeader);
                }
            })
            .catch(err => {
                Logger.info('init', "ShowCoverArtOnMainPage: " + err.message);
            });
    }
})();
