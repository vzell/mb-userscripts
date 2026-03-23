// ==UserScript==
// @name         VZ: MusicBrainz - MB Page Enhancer
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.9+2026-03-23
// @description  Enhances MusicBrainz pages with additional features
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/MB_PageEnhancer.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/MB_PageEnhancer.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      https://cdn.jsdelivr.net/gh/vzell/mb-userscripts@master/lib/VZ_MBLibrary.user.js
// @match        *://*.musicbrainz.org/release/*-*-*-*-*
// @exclude      *://*.musicbrainz.org/release/*/*
// @match        *://*.musicbrainz.org/event/*-*-*-*-*
// @exclude      *://*.musicbrainz.org/event/*/*
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

/*
 * VZ: MusicBrainz - MB Page Enhancer
 *
 * is an userscript which enhances MusicBrainz pages with additional features:
 *
 * 1.) release and event pages will show all cover/event art images on the page itself, collapsible with configurable
 * image size.
 *
 * On release pages, artwork is fetched from the Cover Art Archive (coverartarchive.org).
 * On event pages, artwork is fetched from the Event Art Archive (eventartarchive.org).
 *
 * This script has been created by giving the right facts and asking the right questions initially to Gemini. When
 * Gemini gots stuck, I asked ChatGPT for help, until I got everything right. Later when the script increased in size
 * and evolved, I switched to Claude and only now and then asked the other two for help.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome, Firefox, Opera and Brave.
 */

(function() {
    'use strict';

    const SCRIPT_BASE_NAME = "MB-PageEnhancer";
    // SCRIPT_ID is derived from SCRIPT_BASE_NAME: CamelCase → kebab-case, lower-cased, prepend "vz-mb-"
    const SCRIPT_ID = 'vz-mb-' + SCRIPT_BASE_NAME.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : SCRIPT_BASE_NAME;
    // Remote URLs for changelog and help text.
    // The changelog is fetched and the GM menu item registered by VZ_MBLibrary
    // (via remoteConfig passed to the constructor below).
    // The help URL is only used lazily by showAppHelp() via Lib.fetchCachedText().
    const REMOTE_BASE          = 'https://raw.githubusercontent.com/vzell/mb-userscripts/master/';
    const REMOTE_HELP_URL      = REMOTE_BASE + SCRIPT_BASE_NAME + '_HELP.txt';
    const REMOTE_CHANGELOG_URL = REMOTE_BASE + SCRIPT_BASE_NAME + '_CHANGELOG.json';
    const REMOTE_CACHE_TTL_MS  = 60 * 60 * 1000; // 1 hour
    const CACHE_KEY_HELP       = SCRIPT_BASE_NAME.toLowerCase() + '-remote-help-text';
    const CACHE_KEY_CHANGELOG  = SCRIPT_BASE_NAME.toLowerCase() + '-remote-changelog';

    // CONFIG SCHEMA
    const configSchema = {
        // ============================================================
        // GENERIC SECTION
        // ============================================================
        divider_generic: {
            type: 'divider',
            label: '🛠️ GENERIC SETTINGS'
        },

        ca_enable_debug_logging: {
            label: "Enable debug logging",
            type: "checkbox",
            default: false,
            description: "Enable debug logging in the browser developer console"
        },

        // ============================================================
        // CAA / EAA ILLUSTRATED SECTION
        // ============================================================
        divider_caa_pics: {
            type: 'divider',
            label: '🖼️ CAA/EAA ILLUSTRATED DISCOGRAPHY'
        },

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

    //--------------------------------------------------------------------------------
    // Initialize VZ-MBLibrary (Logger + Settings + Changelog)
    // Use a ref object to avoid circular dependency during initialization
    const settings = {};
    const remoteConfig = {
        changelogUrl:      REMOTE_CHANGELOG_URL,
        cacheKeyChangelog: CACHE_KEY_CHANGELOG,
        cacheTtlMs:        REMOTE_CACHE_TTL_MS
    };
    const Lib = (typeof VZ_MBLibrary !== 'undefined')
          ? new VZ_MBLibrary(SCRIPT_ID, SCRIPT_NAME, configSchema, null, () => {
              // Dynamic check: returns current value of debug setting
              return settings.ca_enable_debug_logging ?? false;
          }, remoteConfig)
          : {
              settings: {},
              info: console.log, debug: console.log, error: console.error, warn: console.warn, time: console.time, timeEnd: console.timeEnd
          };
    // Get version information dynamically
    const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : 'unknown';
    const libVersion = (Lib && Lib.version) ? Lib.version : 'unknown';
    // Copy settings reference so the callback can access them
    Object.assign(settings, Lib.settings);

    Lib.info('init', `Script v${scriptVersion} loaded (lib v${libVersion}).`);

    const isOverviewTabActive = () => {
        const activeTab = document.querySelector("ul.tabs li.sel");
        return activeTab && activeTab.textContent.includes("Overview");
    };

    // CSS classes used to locate all script-managed headers/galleries (e.g. for Ctrl+Click all-toggle)
    const ART_HEADER_CLASS  = `${SCRIPT_ID}-art-header`;
    const ART_GALLERY_CLASS = `${SCRIPT_ID}-art-gallery`;

    /**
     * Build the tooltip text for a collapsible header.
     * @param {string}  sectionLabel - Display label for the section, e.g. "CAA Art Images" or "Track listing section".
     * @param {boolean} isCollapsed  - Whether the section is currently collapsed.
     * @returns {string} Multi-line tooltip string.
     */
    function makeTooltip(sectionLabel, isCollapsed) {
        const action = isCollapsed ? "show" : "hide";
        return `Click to ${action} ${sectionLabel}\nCtrl+Click to show/hide all Sections`;
    }

    /**
     * Collapse or expand a content div and keep its paired header tooltip in sync.
     * @param {Element} contentEl - The collapsible content div to toggle.
     * @param {Element} headerEl  - The h2 header paired with this content.
     * @param {boolean} collapse  - true = collapse, false = expand.
     */
    function applyGalleryState(contentEl, headerEl, collapse) {
        if (collapse) {
            Object.assign(contentEl.style, { maxHeight: "0px", opacity: "0", marginBottom: "0px", marginTop: "0px" });
        } else {
            Object.assign(contentEl.style, { maxHeight: "5000px", opacity: "1", marginBottom: "20px", marginTop: "20px" });
        }
        headerEl.title = makeTooltip(headerEl._sectionLabel, collapse);
    }

    /**
     * Apply collapsible header styling and click behaviour to an h2 element.
     * Works for both script-created art gallery headers and native MusicBrainz h2 headers.
     * @param {Element} h2           - The h2 element to enhance.
     * @param {Element} contentEl    - The content div that this h2 controls.
     * @param {string}  sectionLabel - Label used in tooltips, e.g. "CAA Art Images" or "Track listing section".
     * @param {boolean} startCollapsed - Initial collapsed state.
     */
    function attachHeaderBehavior(h2, contentEl, sectionLabel, startCollapsed) {
        h2.classList.add(ART_HEADER_CLASS);
        h2._gallery      = contentEl;
        h2._sectionLabel = sectionLabel;
        Object.assign(h2.style, {
            cursor: "pointer",
            userSelect: "none",
            backgroundColor: "#FFE4B5",   // light orange (moccasin)
            padding: "4px 10px",
            borderRadius: "4px"
        });
        h2.title = makeTooltip(sectionLabel, startCollapsed);

        h2.addEventListener("click", (event) => {
            if (event.ctrlKey) {
                // Ctrl+Click: collapse or expand ALL script-managed sections together,
                // driven by the current state of the clicked header's section.
                const willCollapse = contentEl.style.maxHeight !== "0px";
                document.querySelectorAll(`.${ART_HEADER_CLASS}`).forEach(h => {
                    applyGalleryState(h._gallery, h, willCollapse);
                });
            } else {
                // Normal click: toggle only this section.
                const isCollapsed = contentEl.style.maxHeight === "0px";
                applyGalleryState(contentEl, h2, !isCollapsed);
            }
        });
    }

    /**
     * Fetch and render the cover/event art gallery inserted by this script.
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
            artHeader.textContent = artLabel;
            attachHeaderBehavior(artHeader, gallery, `${artShortLabel} Art Images`, startCollapsed);

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

    /**
     * Extend collapsible header behaviour to all native MusicBrainz h2 elements on the page.
     * For each h2 not already managed by this script, all following sibling elements (up to the
     * next h2 or end of parent) are wrapped in a collapsible div and the h2 gets the shared
     * background + Click / Ctrl+Click toggle behaviour.
     */
    function initPageHeaders() {
        const contentArea = document.querySelector("#content") || document.body;
        const nativeH2s = Array.from(contentArea.querySelectorAll("h2"))
            .filter(h2 => !h2.classList.contains(ART_HEADER_CLASS));

        let count = 0;
        nativeH2s.forEach(h2 => {
            // Collect all following siblings within the same parent until the next h2
            const siblings = [];
            let el = h2.nextElementSibling;
            while (el && el.tagName !== "H2") {
                siblings.push(el);
                el = el.nextElementSibling;
            }
            if (siblings.length === 0) return; // nothing to collapse under this header

            // Wrap the collected siblings in a single collapsible container
            const wrapper = document.createElement("div");
            wrapper.classList.add(ART_GALLERY_CLASS);
            Object.assign(wrapper.style, {
                overflow: "hidden",
                transition: "max-height 0.4s ease-in-out, opacity 0.3s ease, margin 0.4s ease",
                maxHeight: "5000px", opacity: "1", marginBottom: "20px", marginTop: "20px"
            });
            // Insert wrapper before the first sibling, then move all siblings into it
            h2.parentNode.insertBefore(wrapper, siblings[0]);
            siblings.forEach(s => wrapper.appendChild(s));

            const sectionLabel = `"${h2.textContent.trim()}" section`;
            attachHeaderBehavior(h2, wrapper, sectionLabel, false);
            count++;
        });

        Lib.debug('init', `initPageHeaders: applied collapsible behaviour to ${count} native h2 header(s).`);
    }

    // --- Start Execution ---
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tabsContainer = document.querySelector("div.tabs");

    if (mbidMatch && tabsContainer) {
        if (isOverviewTabActive()) {
            // Enhance all existing native MB h2 headers first (synchronous)
            initPageHeaders();

            const mbid = mbidMatch[0];
            const isEventPage = location.pathname.startsWith("/event/");
            const archiveUrl    = isEventPage ? `https://eventartarchive.org/event/${mbid}`   : `https://coverartarchive.org/release/${mbid}`;
            const artLabel      = isEventPage ? "Event art"      : "Cover art";
            const artShortLabel = isEventPage ? "EAA"            : "CAA";
            const timerLabel    = isEventPage ? "Event Art Render" : "Cover Art Render";

            // Then fetch and inject the art gallery (asynchronous)
            Lib.time(timerLabel);
            displayArtGallery(mbid, tabsContainer, archiveUrl, artLabel, artShortLabel);
            Lib.timeEnd(timerLabel, "render");
        } else {
            Lib.debug('init', "Not on Overview tab, skipping gallery logic.");
        }
    }
})();
