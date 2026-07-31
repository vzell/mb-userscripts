// ==UserScript==
// @name         VZ: MusicBrainz - MB Page Enhancer
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0.10+2026-07-31
// @description  Enhances MusicBrainz pages with additional features
// @author       vzell
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/MB_PageEnhancer.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/MB_PageEnhancer.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      https://raw.githubusercontent.com/vzell/mb-userscripts/master/lib/VZ_MBLibrary.user.js
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
// @grant        GM_addStyle
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

    const SCRIPT_BASE_NAME = "MB_PageEnhancer";
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
    //
    // All keys use the prefix "pe_" (Page Enhancer) to namespace settings
    // for this specific userscript and avoid collisions with other scripts
    // sharing the same VZ_MBLibrary storage backend.
    const configSchema = {
        // ============================================================
        // GENERIC SECTION
        // ============================================================
        divider_generic: {
            type: 'divider',
            label: '🛠️ GENERIC SETTINGS'
        },

        pe_enable_debug_logging: {
            label: "Enable debug logging",
            type: "checkbox",
            default: false,
            description: "Enable debug logging in the browser developer console"
        },

        // ============================================================
        // SECTION TOGGLING
        // ============================================================
        divider_section_toggling: {
            type: 'divider',
            label: '🔀 SECTION TOGGLING'
        },

        pe_enable_section_toggling: {
            label: "Enable Section Toggling",
            type: "checkbox",
            default: true,
            description: "Add click-to-collapse behaviour to all native MusicBrainz h2 section headers on the page"
        },

        pe_combine_medium_buttons: {
            label: "Combine Expand/Collapse Buttons",
            type: "checkbox",
            default: true,
            description: "Replace the separate 'Expand all mediums' and 'Collapse all mediums' buttons with a single toggle button"
        },

        // ============================================================
        // CAA / EAA ILLUSTRATED SECTION
        // ============================================================
        divider_caa_pics: {
            type: 'divider',
            label: '🖼️ CAA/EAA ILLUSTRATED DISCOGRAPHY'
        },

        pe_enable_caa_eaa: {
            label: "Enable CAA/EAA Art Gallery",
            type: "checkbox",
            default: true,
            description: "Fetch and display cover/event art from the Cover Art Archive or Event Art Archive on the page"
        },

        pe_image_size: {
            label: "Pixel Size",
            type: "number",
            default: 250,
            description: "Set the art image size in pixels from the art archive"
        },

        pe_collapsed_by_default: {
            label: "Start Collapsed",
            type: "checkbox",
            default: false,
            description: "Art gallery starts hidden by default"
        },

        // ============================================================
        // ANNOTATION
        // ============================================================
        divider_annotation: {
            type: 'divider',
            label: '📝 ANNOTATION'
        },

        pe_auto_expand_annotation: {
            label: "Auto-expand Annotation",
            type: "checkbox",
            default: true,
            description: "Automatically click 'Show more…' to reveal the full annotation text on page load"
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
              return settings.pe_enable_debug_logging ?? false;
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

    // ============================================================
    // BEGIN: SHARED UTILITIES
    // Helpers used by more than one config section.
    // ============================================================

    /**
     * Return true when the MusicBrainz "Overview" tab is the currently selected tab.
     * @returns {boolean}
     */
    const isOverviewTabActive = () => {
        const activeTab = document.querySelector("ul.tabs li.sel");
        return activeTab && activeTab.textContent.includes("Overview");
    };

    // CSS classes used to locate all script-managed headers/galleries (e.g. for Ctrl+Click all-toggle)
    const ART_HEADER_CLASS  = `${SCRIPT_ID}-art-header`;
    const ART_GALLERY_CLASS = `${SCRIPT_ID}-art-gallery`;

    // ============================================================
    // END: SHARED UTILITIES
    // ============================================================


    // ============================================================
    // BEGIN: SECTION TOGGLING
    // Config keys: pe_enable_section_toggling, pe_combine_medium_buttons
    // Functions  : makeTooltip, applyGalleryState, attachHeaderBehavior, initPageHeaders,
    //              watchTracklistReactUpdate, areMediumsExpanded, installMediumToggle
    // ============================================================

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
     *
     * Expand: animates from 0 to the element's current scrollHeight (so the transition
     * exactly matches real content height), then clears max-height on transitionend so
     * the section can grow freely without an artificial pixel cap.
     *
     * Collapse: if max-height is currently unconstrained (empty string after a previous
     * expand), snapshot the scrollHeight first and force a reflow before animating to 0,
     * so the browser has a concrete start value for the transition.
     *
     * @param {Element} contentEl - The collapsible content div to toggle.
     * @param {Element} headerEl  - The h2 header paired with this content.
     * @param {boolean} collapse  - true = collapse, false = expand.
     */
    function applyGalleryState(contentEl, headerEl, collapse) {
        if (collapse) {
            // If max-height is unconstrained, snapshot the real height first so the
            // browser has a concrete start value for the collapse transition.
            if (!contentEl.style.maxHeight) {
                contentEl.style.maxHeight = contentEl.scrollHeight + "px";
                void contentEl.offsetHeight; // force reflow so the snapshot is committed
            }
            Object.assign(contentEl.style, { maxHeight: "0px", opacity: "0", marginBottom: "0px", marginTop: "0px" });
        } else {
            // Animate to the element's actual content height so the transition duration
            // matches the real visible distance (no artificial 5000 px cap).
            Object.assign(contentEl.style, { maxHeight: contentEl.scrollHeight + "px", opacity: "1", marginBottom: "20px", marginTop: "20px" });
            // Once the expand transition ends, remove max-height so the section can
            // resize freely if its content changes (e.g. lazy-loaded userscript widgets).
            contentEl.addEventListener("transitionend", function onEnd(e) {
                if (e.propertyName === "max-height") {
                    contentEl.style.maxHeight = "";
                    contentEl.removeEventListener("transitionend", onEnd);
                }
            });
        }
        headerEl.title = makeTooltip(headerEl._sectionLabel, collapse);
        Lib.debug('toggle', `${collapse ? "🔽" : "🔼"} Section "${headerEl._sectionLabel}" ${collapse ? "collapsed" : "expanded"}.`);
    }

    /**
     * Apply collapsible header styling and click behaviour to an h2 element.
     * Works for both script-created art gallery headers and native MusicBrainz h2 headers.
     * @param {Element} h2             - The h2 element to enhance.
     * @param {Element} contentEl      - The content div that this h2 controls.
     * @param {string}  sectionLabel   - Label used in tooltips, e.g. "CAA Art Images" or "Track listing section".
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
            // Guard against stale handlers left over after watchTracklistReactUpdate unwraps
            // and re-inits: the wrapper div (contentEl) is detached from the DOM while a new
            // one is created.  Firing on a detached wrapper has no visible effect but would
            // corrupt h2.title via makeTooltip.
            if (!contentEl.isConnected) return;
            // Ignore clicks that bubbled up from an interactive descendant (button, anchor,
            // input, select, textarea).  Other userscripts (e.g. GenerateRecordingCommentForRelease)
            // legitimately append controls *inside* an h2; without this guard their clicks would
            // also fire the collapse/expand logic and hide the section unexpectedly.
            if (event.target !== h2 && event.target.closest('button, a, input, select, textarea')) {
                return;
            }
            if (event.ctrlKey) {
                // Ctrl+Click: collapse or expand ALL script-managed sections together,
                // driven by the current state of the clicked header's section.
                const willCollapse = contentEl.style.maxHeight !== "0px";
                const allHeaders = document.querySelectorAll(`.${ART_HEADER_CLASS}`);
                Lib.debug('toggle', `🖱️  Ctrl+Click on "${sectionLabel}" — ${willCollapse ? "collapsing" : "expanding"} all ${allHeaders.length} section(s).`);
                allHeaders.forEach(h => {
                    applyGalleryState(h._gallery, h, willCollapse);
                });
            } else {
                // Normal click: toggle only this section.
                const isCollapsed = contentEl.style.maxHeight === "0px";
                Lib.debug('toggle', `🖱️  Click on "${sectionLabel}" — ${isCollapsed ? "expanding" : "collapsing"} section.`);
                applyGalleryState(contentEl, h2, !isCollapsed);
            }
        });
    }

    /**
     * Extend collapsible header behaviour to all native MusicBrainz h2 elements on the page.
     * Controlled by the pe_enable_section_toggling setting; exits immediately if disabled.
     *
     * Candidate h2 elements are h2s not already managed by this script AND not inside
     * div.annotation-body (MusicBrainz renders Markdown headings in annotation text as real
     * h2 elements, which must not be treated as section boundaries).
     *
     * For each candidate h2, all following siblings within the same parent are collected into
     * a collapsible div.  The sibling-collection loop stops when it hits:
     *   a) a sibling that IS itself an h2, or
     *   b) a sibling that CONTAINS one of the candidate h2s (e.g. div#bottom-credits).
     * The stop condition only tests candidate h2s (not all h2s), so a container like
     * div.annotation-body — whose only internal h2 is annotation prose excluded from
     * candidates — is correctly swept into the "Annotation" section's collapsible group.
     */
    function initPageHeaders() {
        // Feature-flag guard
        if (!Lib.settings.pe_enable_section_toggling) {
            Lib.debug('init', `🚫 [initPageHeaders] Section toggling is disabled via pe_enable_section_toggling setting — skipping.`);
            return;
        }

        Lib.debug('init', `🔍 [initPageHeaders] Scanning page for native MusicBrainz h2 headers to enhance …`);

        const contentArea = document.querySelector("#content") || document.body;
        const nativeH2s = Array.from(contentArea.querySelectorAll("h2"))
            .filter(h2 => !h2.classList.contains(ART_HEADER_CLASS))
            // Exclude h2 elements that live inside annotation body text.  MusicBrainz
            // renders Markdown annotation content (e.g. "## Heading") as real h2 elements
            // inside div.annotation-body; these are annotation prose, not section headers,
            // and must not be treated as collapsible section boundaries.
            .filter(h2 => !h2.closest('.annotation-body'));

        Lib.debug('init', `📋 [initPageHeaders] Found ${nativeH2s.length} native h2 header(s) (excluding script-managed ones and annotation-body content).`);

        let count   = 0;
        let skipped = 0;
        nativeH2s.forEach(h2 => {
            const headerText = h2.textContent.trim();

            // Collect all following siblings within the same parent until:
            //   a) the next sibling IS itself an h2, OR
            //   b) the next sibling CONTAINS one of the candidate h2 section headers
            //      (e.g. div#bottom-credits which houses its own h2).
            // Stopping at case (b) is critical: including such a wrapper would make two
            // logically independent sections collapse together.
            //
            // Note: the old guard used el.querySelector("h2") (any descendant h2).  That
            // was too broad — it also stopped at div.annotation-body, whose embedded h2
            // is annotation prose and now excluded from nativeH2s, causing the "Annotation"
            // section header itself to be skipped (no siblings collected).  Using
            // nativeH2s.some(nh2 => el.contains(nh2)) only halts at containers that hold
            // a genuine section-header h2, letting annotation-body be included as a
            // collapsible sibling of the "Annotation" h2.
            const siblings = [];
            let el = h2.nextElementSibling;
            while (el && el.tagName !== "H2" && !nativeH2s.some(nh2 => el.contains(nh2))) {
                siblings.push(el);
                el = el.nextElementSibling;
            }

            if (siblings.length === 0) {
                Lib.debug('init', `⏭️  [initPageHeaders] Skipping h2 "${headerText}" — no collapsible content siblings found.`);
                skipped++;
                return;
            }

            // Wrap the collected siblings in a single collapsible container
            const wrapper = document.createElement("div");
            wrapper.classList.add(ART_GALLERY_CLASS);
            Object.assign(wrapper.style, {
                overflow: "hidden",
                transition: "max-height 0.4s ease-in-out, opacity 0.3s ease, margin 0.4s ease",
                maxHeight: "", opacity: "1", marginBottom: "20px", marginTop: "20px"
            });
            // Insert wrapper before the first sibling, then move all siblings into it
            h2.parentNode.insertBefore(wrapper, siblings[0]);
            siblings.forEach(s => wrapper.appendChild(s));

            const sectionLabel = `"${headerText}" section`;
            attachHeaderBehavior(h2, wrapper, sectionLabel, false);
            count++;

            Lib.debug('init', `🏷️  [initPageHeaders] Enhanced h2 "${headerText}" — wrapped ${siblings.length} sibling element(s).`);
        });

        Lib.info('init', `✅ [initPageHeaders] Section toggling applied to ${count} h2 header(s)${skipped > 0 ? `, ${skipped} skipped (no siblings)` : ""}.`);
    }

    /**
     * Prevents section-toggling wrappers from breaking MB's React-managed
     * "Display credits inline / at bottom" toggle button.
     *
     * Root cause: initPageHeaders() inserts extra wrapper <div> elements inside
     * div.tracklist-and-credits, which is a React-managed component. When
     * #toggle-credits is clicked, React reconciles its VDOM against the live DOM,
     * finds our wrapper divs where it expects direct children, and the mismatch
     * causes it to empty the container entirely.
     *
     * Fix: listen for click on #toggle-credits in CAPTURE phase (fires before
     * React's bubble-phase onClick dispatch, but only after the browser has confirmed
     * the full click — unlike mousedown, which fires before mouseup and causes the
     * browser to cancel the subsequent click if the target element moves).
     * React batches its state update and flushes AFTER all event handlers return, so
     * unwrapping here gives React a clean DOM to reconcile against. Re-apply
     * initPageHeaders() via setTimeout(0) after React has synchronously committed.
     */
    function watchTracklistReactUpdate() {
        if (!Lib.settings.pe_enable_section_toggling) return;

        const container = document.querySelector('.tracklist-and-credits');
        if (!container) {
            Lib.debug('init', `⏭️  [watchTracklistReactUpdate] No .tracklist-and-credits found — skipping.`);
            return;
        }

        // Use click in CAPTURE phase (fires before React's bubble-phase onClick dispatch,
        // but only after the browser has already confirmed the click — unlike mousedown,
        // which fires before mouseup and can prevent the click if the target moves).
        // React batches its state update and only flushes AFTER all event handlers return,
        // so unwrapping here lets React reconcile against the original DOM structure.
        container.addEventListener('click', function(e) {
            if (!e.target.closest('#toggle-credits')) return;

            Lib.debug('toggle', `🔄 [watchTracklistReactUpdate] #toggle-credits clicked (capture) — unwrapping before React reconciles.`);

            // Move each wrapper's children back to their original position, then
            // remove the now-empty wrapper div.
            container.querySelectorAll('.' + ART_GALLERY_CLASS).forEach(wrapper => {
                while (wrapper.firstChild) {
                    wrapper.before(wrapper.firstChild);
                }
                wrapper.remove();
            });

            // Strip ART_HEADER_CLASS and our inline styles so React's reconciliation
            // finds a clean h2 matching its VDOM.
            container.querySelectorAll('h2.' + ART_HEADER_CLASS).forEach(h2 => {
                h2.classList.remove(ART_HEADER_CLASS);
                h2.removeAttribute('title');
                ['cursor', 'user-select', 'background-color', 'padding', 'border-radius'].forEach(p => {
                    h2.style.removeProperty(p);
                });
                delete h2._sectionLabel;
            });

            // Undo medium-toggle: remove our combined button, un-hide the originals so
            // React's reconciliation finds the DOM it expects.  React will also restore
            // the " | " text node we deleted (it's in the VDOM), so no manual restoration.
            container.querySelectorAll('[data-vz-medium-toggle]').forEach(b => b.remove());
            container.querySelector('#expand-all-mediums')?.removeAttribute('hidden');
            container.querySelector('#collapse-all-mediums')?.removeAttribute('hidden');

            // Re-apply after React has synchronously committed its DOM update.
            setTimeout(() => {
                Lib.debug('toggle', `🔄 [watchTracklistReactUpdate] Re-applying section toggling after React re-render.`);
                initPageHeaders();
                installMediumToggle();
            }, 0);
        }, true); // capture phase: fires before React's bubble-phase onClick dispatch

        Lib.debug('init', `👁️  [watchTracklistReactUpdate] Watching .tracklist-and-credits for #toggle-credits clicks (capture phase).`);
    }

    /**
     * Return true if medium track rows are currently expanded (visible).
     * Checks the computed display of the first medium table's tbody.
     * @returns {boolean}
     */
    function areMediumsExpanded() {
        const tbody = document.querySelector('table.tbl.medium tbody');
        return tbody ? window.getComputedStyle(tbody).display !== 'none' : true;
    }

    /**
     * Replace the "Expand all mediums" and "Collapse all mediums" buttons with a
     * single toggle button inserted at the same DOM position.
     * Controlled by the pe_combine_medium_buttons setting.
     *
     * The originals are hidden (not removed) so MB's own expand/collapse logic can
     * still be invoked via .click(). The " | " text node between the two original
     * buttons is removed — text nodes always render even when adjacent elements are
     * hidden, which would otherwise leave a dangling double-separator visible.
     *
     * The toggle button carries data-vz-medium-toggle="1" so watchTracklistReactUpdate()
     * can locate and remove it before React reconciles the tracklist container.
     */
    function installMediumToggle() {
        if (!Lib.settings.pe_combine_medium_buttons) {
            Lib.debug('init', `🚫 [installMediumToggle] Combine medium buttons is disabled via pe_combine_medium_buttons setting — skipping.`);
            return;
        }

        const expandBtn   = document.querySelector('#expand-all-mediums');
        const collapseBtn = document.querySelector('#collapse-all-mediums');
        if (!expandBtn || !collapseBtn) {
            Lib.debug('init', `⏭️  [installMediumToggle] #expand-all-mediums / #collapse-all-mediums not found — skipping (event page or not yet rendered).`);
            return;
        }

        let mediumsExpanded = areMediumsExpanded();

        const toggle = document.createElement('button');
        toggle.classList.add('btn-link');
        toggle.type = 'button';
        toggle.dataset.vzMediumToggle = '1';
        toggle.textContent = mediumsExpanded ? 'Collapse all mediums' : 'Expand all mediums';

        toggle.addEventListener('click', () => {
            if (mediumsExpanded) {
                collapseBtn.click();
                toggle.textContent = 'Expand all mediums';
                mediumsExpanded = false;
            } else {
                expandBtn.click();
                toggle.textContent = 'Collapse all mediums';
                mediumsExpanded = true;
            }
        });

        // Place the toggle where the expand button was.
        expandBtn.before(toggle);

        // Hide both originals; they must stay in the DOM so .click() still works.
        expandBtn.hidden = true;
        collapseBtn.hidden = true;

        // Remove the " | " text node between the two now-hidden buttons.
        const sepBetween = collapseBtn.previousSibling;
        if (sepBetween && sepBetween.nodeType === Node.TEXT_NODE &&
                sepBetween.textContent.trim() === '|') {
            sepBetween.remove();
        }

        Lib.info('init', `✅ [installMediumToggle] Medium expand/collapse buttons combined into one toggle.`);
    }

    // ============================================================
    // END: SECTION TOGGLING
    // ============================================================


    // ============================================================
    // BEGIN: CAA / EAA ILLUSTRATED DISCOGRAPHY
    // Config keys: pe_enable_caa_eaa, pe_image_size, pe_collapsed_by_default
    // Functions  : displayArtGallery
    // ============================================================

    /**
     * Fetch and render the cover/event art gallery inserted by this script.
     * Controlled by the pe_enable_caa_eaa setting; exits immediately if disabled.
     * @param {string}  mbid          - The MusicBrainz ID of the entity.
     * @param {Element} tabsContainer - The tabs container element to insert the gallery after.
     * @param {string}  archiveUrl    - Full API URL to fetch art data from (e.g. coverartarchive.org or eventartarchive.org).
     * @param {string}  artLabel      - Human-readable label for the art type, e.g. "Cover art" or "Event art".
     * @param {string}  artShortLabel - Short archive acronym for tooltips, e.g. "CAA" or "EAA".
     */
    async function displayArtGallery(mbid, tabsContainer, archiveUrl, artLabel, artShortLabel) {
        // Feature-flag guard
        if (!Lib.settings.pe_enable_caa_eaa) {
            Lib.debug('fetch', `🚫 [${artShortLabel}] CAA/EAA gallery is disabled via pe_enable_caa_eaa setting — skipping.`);
            return;
        }

        try {
            const imgSize        = Lib.settings.pe_image_size;
            const startCollapsed = Lib.settings.pe_collapsed_by_default;

            Lib.debug('fetch', `⚙️  [${artShortLabel}] Settings: pe_image_size=${imgSize}px, pe_collapsed_by_default=${startCollapsed}`);
            Lib.debug('fetch', `🌐 [${artShortLabel}] Requesting art data from: ${archiveUrl}`);
            Lib.info('fetch',  `🔍 [${artShortLabel}] Fetching ${artLabel.toLowerCase()} for MBID: ${mbid} …`);

            const response = await fetch(archiveUrl);
            Lib.debug('fetch', `📡 [${artShortLabel}] HTTP response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                if (response.status === 404) {
                    Lib.debug('fetch', `🚫 [${artShortLabel}] No ${artLabel.toLowerCase()} found (404 — archive returned no records).`);
                    return;
                }
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            Lib.debug('fetch', `📦 [${artShortLabel}] Archive response parsed — images array length: ${data.images ? data.images.length : 0}`);

            if (!data.images || data.images.length === 0) {
                Lib.warn('fetch', `⚠️  [${artShortLabel}] Response OK but images array is empty — nothing to render.`);
                return;
            }

            Lib.debug('render', `🖼️  [${artShortLabel}] Building gallery DOM for ${data.images.length} image(s) at ${imgSize}px …`);

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
                Lib.debug('render', `🔽 [${artShortLabel}] Gallery will start collapsed (pe_collapsed_by_default = true).`);
            } else {
                Object.assign(gallery.style, { maxHeight: "", opacity: "1", marginTop: "20px", marginBottom: "20px" });
                Lib.debug('render', `🔼 [${artShortLabel}] Gallery will start expanded (pe_collapsed_by_default = false).`);
            }

            const artHeader = document.createElement("h2");
            artHeader.id = `${SCRIPT_ID}-header`;
            artHeader.textContent = artLabel;
            attachHeaderBehavior(artHeader, gallery, `${artShortLabel} Art Images`, startCollapsed);
            Lib.debug('render', `🏷️  [${artShortLabel}] Art gallery header created: "${artLabel}".`);

            fragment.appendChild(artHeader);
            fragment.appendChild(gallery);

            let renderedCount = 0;
            let skippedCount  = 0;
            data.images.forEach((img, idx) => {
                const typeLabel = img.types && img.types.length ? img.types.join(", ") : "(untyped)";
                const thumbSrc  = img.thumbnails?.["250"] || img.thumbnails?.small || img.image;

                if (!thumbSrc) {
                    Lib.warn('render', `⚠️  [${artShortLabel}] Image #${idx + 1} has no usable thumbnail URL — skipping.`);
                    skippedCount++;
                    return;
                }

                const link = document.createElement("a");
                link.href   = img.image;
                link.target = "_blank";

                const image = document.createElement("img");
                image.src   = thumbSrc;
                image.alt   = typeLabel;
                image.title = typeLabel + (img.comment ? ` (${img.comment})` : "");
                Object.assign(image.style, { maxWidth: `${imgSize}px`, maxHeight: `${imgSize}px`, border: "1px solid #ccc" });

                link.appendChild(image);
                gallery.appendChild(link);
                renderedCount++;

                Lib.debug('render', `🖼️  [${artShortLabel}] Image #${idx + 1} → types: "${typeLabel}"${img.comment ? `, comment: "${img.comment}"` : ""}`);
            });

            tabsContainer.after(fragment);

            if (skippedCount > 0) {
                Lib.warn('render', `⚠️  [${artShortLabel}] Gallery render complete: ${renderedCount} image(s) rendered, ${skippedCount} skipped (missing thumbnails).`);
            } else {
                Lib.info('render', `✅ [${artShortLabel}] Gallery render complete: ${renderedCount} image(s) inserted into the page.`);
            }

        } catch (err) {
            Lib.error('init', `💥 [displayArtGallery] Unexpected error: ${err.message}`);
        }
    }

    // ============================================================
    // END: CAA / EAA ILLUSTRATED DISCOGRAPHY
    // ============================================================


    // ============================================================
    // BEGIN: ANNOTATION
    // Config key : pe_auto_expand_annotation
    // Functions  : expandAnnotation
    // ============================================================

    /**
     * Auto-click the MusicBrainz annotation "Show more…" toggle to reveal the full
     * annotation text on page load.
     * Controlled by the pe_auto_expand_annotation setting; exits immediately if disabled
     * or if no toggle link is present on the page.
     */
    function expandAnnotation() {
        if (!Lib.settings.pe_auto_expand_annotation) {
            Lib.debug('init', `🚫 [expandAnnotation] Auto-expand annotation is disabled via pe_auto_expand_annotation setting — skipping.`);
            return;
        }
        const toggle = document.querySelector('div.annotation p a.annotation-toggle');
        if (!toggle) {
            Lib.debug('init', `⏭️  [expandAnnotation] No annotation "Show more…" link found on this page — skipping.`);
            return;
        }
        toggle.click();
        Lib.info('init', `✅ [expandAnnotation] Annotation "Show more…" clicked — full annotation text now visible.`);
    }

    // ============================================================
    // END: ANNOTATION
    // ============================================================


    // ============================================================
    // EXECUTION
    // Entry point: validates URL/DOM preconditions, then dispatches
    // each feature section in order.
    // ============================================================

    Lib.debug('init', `🚀 [main] Starting page enhancement for: ${location.pathname}`);

    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tabsContainer = document.querySelector("div.tabs");

    Lib.debug('init', `🔎 [main] MBID match: ${mbidMatch ? mbidMatch[0] : "none"}, tabs container: ${tabsContainer ? "found" : "not found"}`);

    if (mbidMatch && tabsContainer) {
        if (isOverviewTabActive()) {
            Lib.debug('init', `📄 [main] Overview tab is active — proceeding with page enhancements.`);

            // --------------------------------------------------------
            // STEP 1/3 — ANNOTATION
            // Auto-click "Show more…" to reveal the full annotation (synchronous).
            // Feature-flag guard: pe_auto_expand_annotation (inside expandAnnotation).
            // Runs before section toggling so the annotation body is fully visible
            // when the h2 wrappers are constructed.
            // --------------------------------------------------------
            expandAnnotation();

            // --------------------------------------------------------
            // STEP 2/3 — SECTION TOGGLING
            // Enhance all existing native MB h2 headers (synchronous).
            // Feature-flag guard: pe_enable_section_toggling (inside initPageHeaders).
            // watchTracklistReactUpdate() registers a mousedown guard so that
            // clicking #toggle-credits unwraps our modifications before React's
            // reconciliation runs, preventing the container from being emptied.
            // --------------------------------------------------------
            initPageHeaders();
            installMediumToggle();
            watchTracklistReactUpdate();

            const mbid          = mbidMatch[0];
            const isEventPage   = location.pathname.startsWith("/event/");
            const archiveUrl    = isEventPage ? `https://eventartarchive.org/event/${mbid}`   : `https://coverartarchive.org/release/${mbid}`;
            const artLabel      = isEventPage ? "Event art"        : "Cover art";
            const artShortLabel = isEventPage ? "EAA"              : "CAA";
            const timerLabel    = isEventPage ? "Event Art Render"  : "Cover Art Render";

            Lib.debug('init', `🗂️  [main] Page type: ${isEventPage ? "event" : "release"}, MBID: ${mbid}`);
            Lib.debug('init', `🌐 [main] Archive URL resolved to: ${archiveUrl}`);

            // --------------------------------------------------------
            // STEP 3/3 — CAA / EAA ILLUSTRATED DISCOGRAPHY
            // Fetch and inject the art gallery (asynchronous).
            // Wrapped in an async IIFE so that Lib.timeEnd() fires only
            // *after* the async gallery rendering resolves, giving an
            // accurate wall-clock measurement of the full fetch+render cycle.
            // Feature-flag guard: pe_enable_caa_eaa (inside displayArtGallery).
            // --------------------------------------------------------
            (async () => {
                Lib.time(timerLabel);
                await displayArtGallery(mbid, tabsContainer, archiveUrl, artLabel, artShortLabel);
                Lib.timeEnd(timerLabel, "render");
            })();
        } else {
            Lib.debug('init', `⏭️  [main] Not on Overview tab — skipping all gallery and header logic.`);
        }
    } else {
        if (!mbidMatch)      Lib.warn('init', `⚠️  [main] No valid MBID found in URL — script will not enhance this page.`);
        if (!tabsContainer)  Lib.warn('init', `⚠️  [main] No tabs container (div.tabs) found on page — script will not enhance this page.`);
    }
})();
