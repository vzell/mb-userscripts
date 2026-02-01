// ==UserScript==
// @name         VZ: MusicBrainz - Release Page Enhancer
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.5+2026-02-01
// @description  Enhance Release Page with show all cover art images on the page itself, collapsible with configurable image size
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      file:///V:/home/vzell/git/mb-userscripts/lib/VZMBLibrary.user.js
// @match        *://*.musicbrainz.org/release/*
// @exclude      *://*.musicbrainz.org/release/*/*
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      MIT
// ==/UserScript==

/*
 * VZ: MusicBrainz - Release Page Enhancer
 *
 * is an userscript which enhances MusicBrainz release pages with showing all cover art images on the page itself,
 * collapsible with configurable image size
 *
 * This script has been created by giving the right facts and asking the right questions to Gemini.
 * When Gemini gots stuck, I asked ChatGPT for help, until I got everything right.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome and Firefox.
 */

// CHANGELOG
let changelog = [
    {version: '0.9.5+2026-02-01', description: 'Refactored settings, logging and changelog handling to a library.'},
    {version: '0.9.0+2026-02-01', description: '1st official release version.'}
];

(function() {
    'use strict';

    const SCRIPT_ID = "vzell-mb-release-enhancer";
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : "Release Page Enhancer";
    const DEBUG_ENABLED = true

    // CONFIG SCHEMA
    const configSchema = {
        ca_image_size: {
            label: "Pixel Size",
            type: "number",
            default: 250,
            description: "Set the cover image size in pixels from CA archive"
        },
        ca_collapsed_by_default: {
            label: "Start Collapsed",
            type: "checkbox",
            default: false,
            description: "Cover art gallery starts hidden by default"
        }
    };

    // Initialize VZ-MBLibrary (Logger + Settings + Changelog)
    const Lib = (typeof VZMBLibrary !== 'undefined')
          ? new VZMBLibrary(SCRIPT_ID, SCRIPT_NAME, configSchema, changelog, DEBUG_ENABLED)
          : {
              settings: {}, // Fallback
              info: console.log, debug: console.log, error: console.error, time: console.time, timeEnd: console.timeEnd
          };

    Lib.info('init', "Script loaded with external library!");

    const isOverviewTabActive = () => {
        const activeTab = document.querySelector("ul.tabs li.sel");
        return activeTab && activeTab.textContent.includes("Overview");
    };

    /**
     * Fetch and render the cover art gallery
     */
    async function displayCoverArt(mbid, tabsContainer) {
        try {
            const imgSize = Lib.settings.ca_image_size;
            const startCollapsed = Lib.settings.ca_collapsed_by_default;

            Lib.info('fetch', `Fetching cover art for ${mbid}...`);
            const response = await fetch(`https://coverartarchive.org/release/${mbid}`);

            if (!response.ok) {
                if (response.status === 404) {
                    Lib.debug('fetch', "No cover art found.");
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
            Lib.debug('render', "Cover art gallery from CA archive successfully rendered.");

        } catch (err) {
            Lib.error('init', `Async error: ${err.message}`);
        }
    }

    // --- Start Execution ---
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tabsContainer = document.querySelector("div.tabs");

    if (mbidMatch && tabsContainer) {
        if (isOverviewTabActive()) {
            Lib.time("Cover Art Render");
            displayCoverArt(mbidMatch[0], tabsContainer);
            Lib.timeEnd("Cover Art Render", "render");
        } else {
            Lib.debug('init', "Not on Overview tab, skipping gallery logic.");
        }
    }
})();
