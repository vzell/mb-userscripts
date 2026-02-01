// ==UserScript==
// @name         VZ: MusicBrainz - Release Page Enhancer
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.0+2026-02-01
// @description  Enhance Release Page with show all cover art images on the page itself, collapsible with configurable image size
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      file:///V:/home/vzell/git/mb-userscripts/lib/MBLoggerLib.user.js
// @match        *://*.musicbrainz.org/release/*
// @exclude      *://*.musicbrainz.org/release/*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

/*
 * VZ: MusicBrainz - Accumulate Paginated MusicBrainz Pages With Filtering And Sorting Capabilities
 *

 * is an userscript which enhances MusicBrainz release pages with showing all cover art images on the page itself,
 * collapsible with configurable image size
 *
 * This script has been created by giving the right facts and asking the right questions to Gemini.
 * When Gemini gots stuck, I asked ChatGPT for help, until I got everything right.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome and Firefox.
 */

// CHANGELOG - The most important updates/versions:
let changelog = [
    {version: '0.9.0+2026-02-01', description: '1st official release version.'}
];


(function() {
    'use strict';

    const SCRIPT_ID = "vzell-mb-release-enhancer";
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : "Release Page Enhancer";
    const DEBUG_ENABLED = true;
    const DEFAULT_SIZE = 250;
    const DEFAULT_COLLAPSED = false;

    const Logger = (typeof MBLogger !== 'undefined')
	  ? new MBLogger(SCRIPT_NAME, true)
	  : { info: console.log, debug: console.log, error: console.error };

    Logger.info('init', "Script loaded with external library!");

    // --- Configuration Helpers ---
    const getStoredSize = () => GM_getValue("ca_image_size", DEFAULT_SIZE);
    const getStoredCollapsed = () => GM_getValue("ca_collapsed_by_default", DEFAULT_COLLAPSED);

    const showSettingsModal = () => {
        const currentSize = getStoredSize();
        const isCollapsed = getStoredCollapsed();
        const overlay = document.createElement("div");
        overlay.id = `${SCRIPT_ID}-settings-overlay`;
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '10000', display: 'flex',
            justifyContent: 'center', alignItems: 'center'
        });

        const container = document.createElement("div");
        container.id = `${SCRIPT_ID}-config-container`;
        Object.assign(container.style, {
            backgroundColor: 'silver', border: '2px outset white', padding: '1em',
            color: 'black', fontFamily: 'sans-serif', minWidth: '400px'
        });

        container.innerHTML = `
            <p style="text-align: right; margin: 0px;">
                <a id="${SCRIPT_ID}-reset" style="cursor: pointer;">RESET</a> |
                <a id="${SCRIPT_ID}-close" style="cursor: pointer;">CLOSE</a>
            </p>
            <h4 style="text-shadow: white 0px 0px 8px; font-size: 1.5em; margin-top: 0px;">${SCRIPT_NAME.toUpperCase()}</h4>
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
                                Pixel Size: <input type="number" id="${SCRIPT_ID}-size-input" value="${currentSize}" style="width: 60px; margin-left: 5px;">
                            </label>
                        </th>
                        <td style="opacity: 0.666; text-align: center;">${DEFAULT_SIZE}</td>
                        <td style="margin-bottom: 0.4em;">Set the cover image size in pixels</td>
                    </tr>
                    <tr>
                        <th style="background-color: rgb(204, 204, 204); text-align: left; padding-left: inherit;">
                            <label style="white-space: nowrap; text-shadow: rgb(153, 153, 153) 1px 1px 2px;">
                                Start Collapsed: <input type="checkbox" id="${SCRIPT_ID}-collapse-input" ${isCollapsed ? 'checked' : ''} style="margin-left: 5px;">
                            </label>
                        </th>
                        <td style="opacity: 0.666; text-align: center;">${DEFAULT_COLLAPSED}</td>
                        <td style="margin-bottom: 0.4em;">Cover art gallery starts hidden by default</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top: 15px; text-align: right;">
                <button id="${SCRIPT_ID}-save-btn" style="padding: 4px 12px; cursor: pointer; font-weight: bold;">SAVE</button>
            </div>
        `;

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        const closeDialog = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };

        document.getElementById(`${SCRIPT_ID}-save-btn`).onclick = () => {
            const val = parseInt(document.getElementById(`${SCRIPT_ID}-size-input`).value, 10);
            const coll = document.getElementById(`${SCRIPT_ID}-collapse-input`).checked;
            if (!isNaN(val) && val > 0) {
                GM_setValue("ca_image_size", val);
                GM_setValue("ca_collapsed_by_default", coll);
                Logger.info('init', "Settings saved. Reloading...");
                location.reload();
            }
        };

        document.getElementById(`${SCRIPT_ID}-reset`).onclick = () => {
            document.getElementById(`${SCRIPT_ID}-size-input`).value = DEFAULT_SIZE;
            document.getElementById(`${SCRIPT_ID}-collapse-input`).checked = DEFAULT_COLLAPSED;
        };

        document.getElementById(`${SCRIPT_ID}-close`).onclick = closeDialog;

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
        const editMenuItem = document.querySelector('div.right div.bottom ul.menu li.editing');
        const editMenuUl = editMenuItem ? editMenuItem.querySelector('ul') : null;

        if (editMenuUl) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = "javascript:void(0)";
            a.textContent = SCRIPT_NAME;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                showSettingsModal();
            });
            li.appendChild(a);
            editMenuUl.appendChild(li);
            Logger.debug('init', "Menu entry added.");
        }
    };

    const isOverviewTabActive = () => {
        const activeTab = document.querySelector("ul.tabs li.sel");
        return activeTab && activeTab.textContent.includes("Overview");
    };

    /**
     * Fetch and render the cover art gallery
     */
    async function displayCoverArt(mbid, tabsContainer) {
        try {
            const imgSize = getStoredSize();
            const startCollapsed = getStoredCollapsed();

            Logger.info('fetch', `Fetching cover art for ${mbid}...`);
            const response = await fetch(`https://coverartarchive.org/release/${mbid}`);

            if (!response.ok) {
                if (response.status === 404) {
                    Logger.debug('fetch', "No cover art found.");
                    return;
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.images || data.images.length === 0) return;

            const fragment = document.createDocumentFragment();
            const gallery = document.createElement("div");
            gallery.id = `${SCRIPT_ID}-gallery`;

            Object.assign(gallery.style, {
                display: "flex", flexWrap: "wrap", gap: "10px",
                overflow: "hidden", transition: "max-height 0.4s ease-in-out, opacity 0.3s ease, margin 0.4s ease"
            });

            if (startCollapsed) {
                Object.assign(gallery.style, { maxHeight: "0px", opacity: "0", marginTop: "0px", marginBottom: "0px" });
            } else {
                Object.assign(gallery.style, { maxHeight: "5000px", opacity: "1", marginTop: "20px", marginBottom: "20px" });
            }

            const caHeader = document.createElement("h2");
            caHeader.id = `${SCRIPT_ID}-header`;
            caHeader.textContent = "Cover art";
            caHeader.style.cursor = "pointer";
            caHeader.style.userSelect = "none";
            caHeader.title = startCollapsed ? "Click to show" : "Click to hide";

            caHeader.addEventListener("click", () => {
                const isCollapsed = gallery.style.maxHeight === "0px";
                if (isCollapsed) {
                    Object.assign(gallery.style, { maxHeight: "5000px", opacity: "1", marginBottom: "20px", marginTop: "20px" });
                    caHeader.title = "Click to hide";
                } else {
                    Object.assign(gallery.style, { maxHeight: "0px", opacity: "0", marginBottom: "0px", marginTop: "0px" });
                    caHeader.title = "Click to show";
                }
            });

            fragment.appendChild(caHeader);
            fragment.appendChild(gallery);

            data.images.forEach(img => {
                const link = document.createElement("a");
                link.href = img.image;
                link.target = "_blank";

                const image = document.createElement("img");
                image.src = img.thumbnails["250"] || img.thumbnails.small || img.image;
                image.alt = img.types.join(", ");
                image.title = img.types.join(", ") + (img.comment ? ` (${img.comment})` : "");
                Object.assign(image.style, { maxWidth: `${imgSize}px`, maxHeight: `${imgSize}px`, border: "1px solid #ccc" });

                link.appendChild(image);
                gallery.appendChild(link);
            });

            tabsContainer.after(fragment);
            Logger.debug('render', "Cover art gallery from CA archive successfully rendered.");

        } catch (err) {
            Logger.error('init', `Async error: ${err.message}`);
        }
    }

    // --- Start Execution ---
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tabsContainer = document.querySelector("div.tabs");

    if (mbidMatch && tabsContainer) {
        injectMenuEntry();

        if (isOverviewTabActive()) {
	    Logger.time("Cover Art Render");
            displayCoverArt(mbidMatch[0], tabsContainer);
	    Logger.timeEnd("Cover Art Render", "render");
        } else {
            Logger.debug('init', "Not on Overview tab, skipping gallery logic.");
        }
    }
})();
