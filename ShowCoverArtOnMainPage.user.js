// ==UserScript==
// @name         VZ: MusicBrainz - Show Cover Art On Main Release Page
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.1.3+2026-01-31
// @description  Show all cover art images on the main release page, collapsible with transitions and configurable size
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowCoverArtOnMainPage.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowCoverArtOnMainPage.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/release/*
// @exclude      *://*.musicbrainz.org/release/*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

"use strict";

(function() {

    const DEBUG_ENABLED = true;
    const DEFAULT_SIZE = 250;

    // --- Modernized Logging Framework ---
    const Logger = {
        prefix: '[MB-ShowCoverArtOnMainReleasePage]',
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

    Logger.info('init', "Script loaded and starting...");

    // Backward compatibility wrapper for existing simple log calls
    const log = (msg, data = '') => {
        let icon = 'meta';
        if (msg.includes('Initializing')) icon = 'init';
        if (msg.includes('Fetching') || msg.includes('page')) icon = 'fetch';
        if (msg.includes('cleanup')) icon = 'cleanup';
        if (msg.includes('Filter')) icon = 'filter';
        Logger.debug(icon, msg, data);
    };

    // --- Configuration Logic ---
    const getStoredSize = () => GM_getValue("ca_image_size", DEFAULT_SIZE);

    const showSettingsModal = () => {
        const currentSize = getStoredSize();
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '1000', display: 'flex',
            justifyContent: 'center', alignItems: 'center'
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
            backgroundColor: '#fff', padding: '20px', borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)', border: '1px solid #ccc',
            color: '#000'
        });

        modal.innerHTML = `
            <h3 style="margin-top:0">Cover Art Display Settings</h3>
            <label for="mb-ca-size">Image size (pixels): </label>
            <input type="number" id="mb-ca-size" value="${currentSize}" style="width: 80px; padding: 4px;">
            <div style="margin-top: 20px; text-align: right;">
                <button id="mb-ca-cancel" style="margin-right: 10px;">Cancel</button>
                <button id="mb-ca-save" style="background: #2980b9; color: white; border: none; padding: 5px 15px; cursor: pointer;">Save</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById("mb-ca-save").onclick = () => {
            const val = parseInt(document.getElementById("mb-ca-size").value, 10);
            if (!isNaN(val) && val > 0) {
                GM_setValue("ca_image_size", val);
                location.reload();
            }
        };

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };
        document.getElementById("mb-ca-cancel").onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
    };

    const injectMenuEntry = () => {
        const editMenu = document.querySelector('.editing > ul');
        if (editMenu) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = "javascript:void(0)";
            a.textContent = "Set Cover Art Size";
            a.addEventListener('click', (e) => {
                e.preventDefault();
                showSettingsModal();
            });
            li.appendChild(a);
            editMenu.appendChild(li);
            Logger.debug('init', "Menu entry added to Editing tab");
        }
    };

    // Existing comments should NOT be deleted
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tracklistHeader = document.querySelector("h2.tracklist, h2#tracklist");

    if (mbidMatch && tracklistHeader) {
        injectMenuEntry();
        const mbid = mbidMatch[0];
        const imgSize = getStoredSize();
        Logger.info('init', "Fetching cover art for " + mbid);

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
                    gallery.style.transition = "max-height 0.4s ease-in-out, opacity 0.3s ease";
                    gallery.style.maxHeight = "2000px";
                    gallery.style.opacity = "1";

                    const caHeader = document.createElement("h2");
                    caHeader.textContent = "Cover art (click to toggle)";
                    caHeader.style.cursor = "pointer";
                    caHeader.style.userSelect = "none";

                    caHeader.addEventListener("click", function() {
                        if (gallery.style.maxHeight === "0px") {
                            gallery.style.maxHeight = "2000px";
                            gallery.style.opacity = "1";
                            gallery.style.marginBottom = "20px";
                        } else {
                            gallery.style.maxHeight = "0px";
                            gallery.style.opacity = "0";
                            gallery.style.marginBottom = "0px";
                        }
                    });

                    fragment.appendChild(caHeader);
                    fragment.appendChild(document.createElement("br"));

                    data.images.forEach(img => {
                        const link = document.createElement("a");
                        link.href = img.image;
                        link.target = "_blank";

                        const image = document.createElement("img");
                        image.src = img.thumbnails["250"] || img.thumbnails.small || img.image;
                        image.alt = img.types.join(", ");
                        image.title = img.types.join(", ") + (img.comment ? " (" + img.comment + ")" : "");
                        image.style.maxWidth = `${imgSize}px`;
                        image.style.maxHeight = `${imgSize}px`;
                        image.style.border = "1px solid #ccc";

                        link.appendChild(image);
                        gallery.appendChild(link);
                    });

                    fragment.appendChild(gallery);

                    // Robust insertion logic
                    if (tracklistHeader.parentNode) {
                        tracklistHeader.parentNode.insertBefore(fragment, tracklistHeader);
                        Logger.debug('render', "Gallery injected before tracklist header.");
                    } else {
                        // Fallback to appending to the main content container if parentNode is missing
                        const content = document.getElementById('content');
                        if (content) {
                            content.insertBefore(fragment, tracklistHeader);
                            Logger.debug('render', "Gallery injected via fallback content container.");
                        }
                    }
                }
            })
            .catch(err => {
                Logger.info('init', err.message);
            });
    }
})();
