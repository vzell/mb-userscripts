// ==UserScript==
// @name         VZ: MusicBrainz - Release Page Enhancer
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.7+2026-03-23
// @description  Enhance Release and Event Pages with show all cover/event art images on the page itself, collapsible with configurable image size
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      https://cdn.jsdelivr.net/gh/vzell/mb-userscripts@master/lib/VZMBLibrary.user.js
// @match        *://*.musicbrainz.org/release/*-*-*-*-*
// @exclude      *://*.musicbrainz.org/release/*/*
// @match        *://*.musicbrainz.org/event/*-*-*-*-*
// @exclude      *://*.musicbrainz.org/event/*/*
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
 * is an userscript which enhances MusicBrainz release and event pages with showing all cover/event art
 * images on the page itself, collapsible with configurable image size.
 *
 * On release pages, artwork is fetched from the Cover Art Archive (coverartarchive.org).
 * On event pages, artwork is fetched from the Event Art Archive (eventartarchive.org).
 *
 * This script has been created by giving the right facts and asking the right questions to Gemini.
 * When Gemini gots stuck, I asked ChatGPT for help, until I got everything right.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome and Firefox.
 */

// CHANGELOG
let changelog = [
    {version: '0.9.7+2026-03-23', description: 'Enhanced gallery headers: CAA/EAA-aware tooltips, light-orange background, Ctrl+Click to toggle all galleries at once.'},
    {version: '0.9.6+2026-03-23', description: 'Added event art support via Event Art Archive (eventartarchive.org) for MusicBrainz event pages.'},
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
            description: "Set the art image size in pixels from the art archive"
        },
        ca_collapsed_by_default: {
            label: "Start Collapsed",
            type: "checkbox",
            default: false,
            description: "Art gallery starts hidden by default"
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

    // CSS classes used to locate all script-managed headers/galleries (e.g. for Ctrl+Click all-toggle)
    const ART_HEADER_CLASS  = `${SCRIPT_ID}-art-header`;
    const ART_GALLERY_CLASS = `${SCRIPT_ID}-art-gallery`;

    /**
     * Build the tooltip text for an art gallery header.
     * @param {string}  artShortLabel - Short archive identifier, "CAA" or "EAA".
     * @param {boolean} isCollapsed   - Whether the gallery is currently collapsed.
     * @returns {string} Multi-line tooltip string.
     */
    function makeTooltip(artShortLabel, isCollapsed) {
        const action = isCollapsed ? "show" : "hide";
        return `Click to ${action} ${artShortLabel} Art Images\nCtrl+Click to show/hide all Art Images`;
    }

    /**
     * Collapse or expand a gallery div and update its paired header's tooltip.
     * @param {Element} galleryEl  - The gallery div to toggle.
     * @param {Element} headerEl   - The h2 header paired with this gallery.
     * @param {boolean} collapse   - true = collapse, false = expand.
     */
    function applyGalleryState(galleryEl, headerEl, collapse) {
        if (collapse) {
            Object.assign(galleryEl.style, { maxHeight: "0px", opacity: "0", marginBottom: "0px", marginTop: "0px" });
        } else {
            Object.assign(galleryEl.style, { maxHeight: "5000px", opacity: "1", marginBottom: "20px", marginTop: "20px" });
        }
        headerEl.title = makeTooltip(headerEl._artShortLabel, collapse);
    }

    /**
     * Fetch and render the art gallery.
     * @param {string}  mbid          - The MusicBrainz ID of the entity.
     * @param {Element} tabsContainer - The tabs container element to insert the gallery after.
     * @param {string}  archiveUrl    - Full API URL to fetch art data from (e.g. coverartarchive.org or eventartarchive.org).
     * @param {string}  artLabel      - Human-readable label for the art type, e.g. "Cover art" or "Event art".
     * @param {string}  artShortLabel - Short archive acronym for tooltips, e.g. "CAA" or "EAA".
     */
    async function displayArtGallery(mbid, tabsContainer, archiveUrl, artLabel, artShortLabel) {
        try {
            const imgSize = Lib.settings.ca_image_size;
            const startCollapsed = Lib.settings.ca_collapsed_by_default;

            Lib.info('fetch', `Fetching ${artLabel.toLowerCase()} for ${mbid}...`);
            const response = await fetch(archiveUrl);

            if (!response.ok) {
                if (response.status === 404) {
                    Lib.debug('fetch', `No ${artLabel.toLowerCase()} found.`);
                    return;
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.images || data.images.length === 0) return;

            const fragment = document.createDocumentFragment();

            const gallery = document.createElement("div");
            gallery.id = `${SCRIPT_ID}-gallery`;
            gallery.classList.add(ART_GALLERY_CLASS);
            Object.assign(gallery.style, {
                display: "flex", flexWrap: "wrap", gap: "10px",
                overflow: "hidden", transition: "max-height 0.4s ease-in-out, opacity 0.3s ease, margin 0.4s ease"
            });
            if (startCollapsed) {
                Object.assign(gallery.style, { maxHeight: "0px", opacity: "0", marginTop: "0px", marginBottom: "0px" });
            } else {
                Object.assign(gallery.style, { maxHeight: "5000px", opacity: "1", marginTop: "20px", marginBottom: "20px" });
            }

            const artHeader = document.createElement("h2");
            artHeader.id = `${SCRIPT_ID}-header`;
            artHeader.classList.add(ART_HEADER_CLASS);
            artHeader.textContent = artLabel;
            // Store refs on the element so the Ctrl+Click all-loop can update each header's tooltip
            artHeader._gallery        = gallery;
            artHeader._artShortLabel  = artShortLabel;
            Object.assign(artHeader.style, {
                cursor: "pointer",
                userSelect: "none",
                backgroundColor: "#FFE4B5",   // light orange (moccasin)
                padding: "4px 10px",
                borderRadius: "4px"
            });
            artHeader.title = makeTooltip(artShortLabel, startCollapsed);

            artHeader.addEventListener("click", (event) => {
                if (event.ctrlKey) {
                    // Ctrl+Click: toggle ALL script-managed galleries to match this one's next state
                    const willCollapse = gallery.style.maxHeight !== "0px";
                    document.querySelectorAll(`.${ART_HEADER_CLASS}`).forEach(h => {
                        applyGalleryState(h._gallery, h, willCollapse);
                    });
                } else {
                    // Normal click: toggle only this gallery
                    const isCollapsed = gallery.style.maxHeight === "0px";
                    applyGalleryState(gallery, artHeader, !isCollapsed);
                }
            });

            fragment.appendChild(artHeader);
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
            Lib.debug('render', `${artLabel} gallery successfully rendered.`);

        } catch (err) {
            Lib.error('init', `Async error: ${err.message}`);
        }
    }

    // --- Start Execution ---
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tabsContainer = document.querySelector("div.tabs");

    if (mbidMatch && tabsContainer) {
        if (isOverviewTabActive()) {
            const mbid = mbidMatch[0];
            const isEventPage = location.pathname.startsWith("/event/");
            const archiveUrl    = isEventPage ? `https://eventartarchive.org/event/${mbid}`   : `https://coverartarchive.org/release/${mbid}`;
            const artLabel      = isEventPage ? "Event art"      : "Cover art";
            const artShortLabel = isEventPage ? "EAA"            : "CAA";
            const timerLabel    = isEventPage ? "Event Art Render" : "Cover Art Render";

            Lib.time(timerLabel);
            displayArtGallery(mbid, tabsContainer, archiveUrl, artLabel, artShortLabel);
            Lib.timeEnd(timerLabel, "render");
        } else {
            Lib.debug('init', "Not on Overview tab, skipping gallery logic.");
        }
    }
})();
