// ==UserScript==
// @name         VZ: MusicBrainz - Show Cover Art On Main Release Page
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.1.6+2026-01-31
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
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '10000', display: 'flex',
            justifyContent: 'center', alignItems: 'center'
        });

        const container = document.createElement("div");
        container.id = "vzell-ca-config-container";
        // Matching jesus.config.html style
        Object.assign(container.style, {
            backgroundColor: 'silver', border: '2px outset white', padding: '1em',
            color: 'black', fontFamily: 'sans-serif', minWidth: '400px'
        });

        container.innerHTML = `
            <p style="text-align: right; margin: 0px;">
                <a id="mb-ca-reset" style="cursor: pointer;">RESET</a> |
                <a id="mb-ca-close" style="cursor: pointer;">CLOSE</a>
            </p>
            <h4 style="text-shadow: white 0px 0px 8px; font-size: 1.5em; margin-top: 0px;">COVER ART DISPLAY</h4>
            <p>Settings are applied immediately upon saving.</p>
            <table border="2" cellpadding="4" cellspacing="1" style="width: 100%; border-collapse: separate; background: #eee;">
                <thead>
                    <tr style="background-color: #ccc;">
                        <th>setting</th>
                        <th>default setting</th>
                        <th>description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th style="background-color: rgb(204, 204, 204); text-align: left; padding-left: inherit;">
                            <label style="white-space: nowrap; text-shadow: rgb(153, 153, 153) 1px 1px 2px;">
                                Pixel Size: <input type="number" id="mb-ca-size-input" value="${currentSize}" style="width: 60px; margin-left: 5px;">
                            </label>
                        </th>
                        <td style="opacity: 0.666; text-align: center;">${DEFAULT_SIZE}</td>
                        <td style="margin-bottom: 0.4em;">Set the cover image size in pixels</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top: 15px; text-align: right;">
                <button id="mb-ca-save-btn" style="padding: 4px 12px; cursor: pointer; font-weight: bold;">SAVE</button>
            </div>
        `;

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        const closeDialog = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };

        // Event: Save (Stores value and reloads)
        document.getElementById("mb-ca-save-btn").onclick = () => {
            const val = parseInt(document.getElementById("mb-ca-size-input").value, 10);
            if (!isNaN(val) && val > 0) {
                GM_setValue("ca_image_size", val);
                Logger.info('init', `Configuration saved: ${val}px. Reloading...`);
                location.reload();
            }
        };

        // Event: Reset
        document.getElementById("mb-ca-reset").onclick = () => {
            document.getElementById("mb-ca-size-input").value = DEFAULT_SIZE;
        };

        // Event: Close/Cancel
        document.getElementById("mb-ca-close").onclick = closeDialog;

        // Event: Escape Key
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                closeDialog();
                window.removeEventListener("keydown", handleEsc);
            }
        };
        window.addEventListener("keydown", handleEsc);

        overlay.onclick = (e) => { if (e.target === overlay) closeDialog(); };
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

    // --- Main Logic ---
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tabsContainer = document.querySelector("div.tabs");

    if (mbidMatch && tabsContainer) {
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
                    gallery.style.marginTop = "20px";
                    gallery.style.marginBottom = "20px";
                    gallery.style.overflow = "hidden";
                    gallery.style.transition = "max-height 0.4s ease-in-out, opacity 0.3s ease";
                    gallery.style.maxHeight = "2000px";
                    gallery.style.opacity = "1";

                    const caHeader = document.createElement("h2");
                    caHeader.textContent = "Cover art";
                    caHeader.style.cursor = "pointer";
                    caHeader.style.userSelect = "none";

                    caHeader.addEventListener("click", function() {
                        if (gallery.style.maxHeight === "0px") {
                            gallery.style.maxHeight = "2000px";
                            gallery.style.opacity = "1";
                            gallery.style.marginBottom = "20px";
                            gallery.style.marginTop = "20px";
                        } else {
                            gallery.style.maxHeight = "0px";
                            gallery.style.opacity = "0";
                            gallery.style.marginBottom = "0px";
                            gallery.style.marginTop = "0px";
                        }
                    });

                    fragment.appendChild(caHeader);
                    fragment.appendChild(gallery);

                    tabsContainer.after(fragment);
                    Logger.debug('render', "Gallery injected after tabs container.");

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
                }
            })
            .catch(err => {
                Logger.info('init', err.message);
            });
    }
})();
