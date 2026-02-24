// ==UserScript==
// @name         VZ: MusicBrainz - Auto-Select External Link Types (Unified)
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0.0+2026-02-24
// @description  Auto-Select External Link Types on release, release-group, event, place, and work edit pages.
//               Waits for the "External Links" editor to be rendered before attaching observers.
//               Allows per-entity configuration of URL regex -> Link Type ID mappings.
// @author       vzell
// @homepageURL  https://github.com/vzell/mb-userscripts
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/release/add
// @match        https://musicbrainz.org/release/*/edit
// @match        https://musicbrainz.org/release-group/create
// @match        https://musicbrainz.org/release-group/*/edit
// @match        https://musicbrainz.org/event/create
// @match        https://musicbrainz.org/event/*/edit
// @match        https://musicbrainz.org/place/create
// @match        https://musicbrainz.org/place/*/edit
// @match        https://musicbrainz.org/work/create
// @match        https://musicbrainz.org/work/*/edit
// @require      https://raw.githubusercontent.com/vzell/mb-userscripts/master/VZ_MBLibrary.user.js
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

// CHANGELOG
// [
//   { "version": "1.0.0+2026-02-24",
//     "description": "Initial unified release: merged AutoSelectExternalLinkType scripts for events, places, release-groups, releases, and works into a single file. Replaced inline debug logging with VZ_MBLibrary logger. Added robust waiting logic for the External Links editor container using MutationObserver on document.body before attaching the link-type select observer." }
// ]

(function () {
    'use strict';

    // ── Library initialisation ─────────────────────────────────────────────────
    // VZ_MBLibrary is injected via @require. Instantiate it with our script identity.

    /** @type {ReturnType<typeof VZ_MBLibrary>} */
    const lib = VZ_MBLibrary(
        'vz-autoselect-link-type',          // scriptId
        'VZ:AutoSelectLinkType',            // scriptName
        null,                               // configSchema  (none — we manage our own localStorage)
        null,                               // changelog     (static entries in file header)
        true                                // debugEnabled
    );

    const log = lib;   // convenience alias — use log.debug / log.info / log.warn / log.error

    // ── Entity-type registry ───────────────────────────────────────────────────

    /**
     * @typedef {Object} LinkTypeOption
     * @property {string} id   - MusicBrainz relationship type ID
     * @property {string} name - Human-readable label
     */

    /**
     * @typedef {Object} LinkMapping
     * @property {string} regex       - JavaScript RegExp source string (case-insensitive)
     * @property {string} typeId      - MusicBrainz relationship type ID to select
     * @property {string} [description] - Optional human-readable explanation
     */

    /**
     * @typedef {Object} EntityConfig
     * @property {string}           entityType      - Slug used in the MB URL (e.g. "release")
     * @property {string}           storageKey      - localStorage key for persisted mappings
     * @property {string}           logTag          - Short tag appended to debug messages
     * @property {LinkTypeOption[]} linkTypeOptions - Available relationship types for this entity
     * @property {LinkMapping[]}    defaultMappings - Shipped default URL -> type-ID mappings
     */

    /** @type {EntityConfig[]} */
    const ENTITY_CONFIGS = [
        {
            entityType: 'release',
            storageKey: 'MB_AutoSelect_Mappings_Releases',
            logTag:     'releases',
            linkTypeOptions: [
                { id: '288',  name: 'discography entry' },
                { id: '301',  name: 'license' },
                { id: '79',   name: 'purchase for mail-order' },
                { id: '74',   name: 'purchase for download' },
                { id: '75',   name: 'download for free' },
                { id: '85',   name: 'stream for free' },
                { id: '980',  name: 'streaming page' },
                { id: '906',  name: 'crowdfunding page' },
                { id: '729',  name: 'show notes' },
                { id: '78',   name: 'cover art' },
            ],
            defaultMappings: [
                {
                    regex: '^(https://www\\.springsteenlyrics\\.com/(bootlegs|collection)\\.php\\?item=\\d+)(&.*)?$',
                    typeId: '288',
                    description: 'SpringsteenLyrics bootlegs and collection entries'
                },
                {
                    regex: 'https://www\\.jungleland\\.it/html/.*\\.htm$',
                    typeId: '288',
                    description: 'Jungleland discography page'
                },
                {
                    regex: 'https://web.archive.org/web/.*/http://bruceboots.com/',
                    typeId: '288',
                    description: 'BruceBoots via archive.org'
                },
                {
                    regex: 'https://archive.org/details/bs.*',
                    typeId: '288',
                    description: 'Springsteen bootleg entry via archive.org'
                },
                {
                    regex: 'https://www\\.nugs\\.net/live-download-of-bruce-springsteen-.*/.*\\.html$',
                    typeId: '74',
                    description: 'Nugs.net primary Bruce Springsteen URL'
                },
            ]
        },
        {
            entityType: 'release-group',
            storageKey: 'MB_AutoSelect_Mappings_Release_Groups',
            logTag:     'release-groups',
            linkTypeOptions: [
                { id: '287',  name: 'standalone website' },
                { id: '1169', name: 'discography entry' },
                { id: '1190', name: 'fan pages' },
                { id: '94',   name: 'reviews' },
                { id: '907',  name: 'crowdfunding page' },
            ],
            defaultMappings: [
                {
                    regex: '^(https://www\\.springsteenlyrics\\.com/bootlegs\\.php\\?cmd=list)(&category=.*)(&page=\\d+)?$',
                    typeId: '1169',
                    description: 'SpringsteenLyrics bootleg entry'
                },
            ]
        },
        {
            entityType: 'event',
            storageKey: 'MB_AutoSelect_Mappings_Events',
            logTag:     'events',
            linkTypeOptions: [
                { id: '782',  name: 'official homepages' },
                { id: '904',  name: 'crowdfunding page' },
                { id: '898',  name: 'patronage page' },
                { id: '808',  name: 'poster' },
                { id: '842',  name: 'reviews' },
                { id: '783',  name: 'social networking' },
                { id: '1197', name: 'ticketing page' },
                { id: '804',  name: 'video channel' },
                { id: '1254', name: 'purchase artwork' },
            ],
            defaultMappings: [
                {
                    regex: 'http://brucebase\\.wikidot\\.com/.*#.*',
                    typeId: '842',
                    description: 'BruceBase event entry'
                },
            ]
        },
        {
            entityType: 'place',
            storageKey: 'MB_AutoSelect_Mappings_Places',
            logTag:     'places',
            linkTypeOptions: [
                { id: '363',  name: 'official homepages' },
                { id: '627',  name: 'blogs' },
                { id: '396',  name: 'picture' },
                { id: '429',  name: 'social networking' },
                { id: '495',  name: 'video channel' },
                { id: '909',  name: 'crowdfunding page' },
                { id: '1191', name: 'fan page' },
                { id: '984',  name: 'history page' },
                { id: '900',  name: 'patronage page' },
                { id: '1195', name: 'ticketing page' },
            ],
            defaultMappings: [
                {
                    regex: 'http://brucebase\\.wikidot\\.com/venue:.*',
                    typeId: '1191',
                    description: 'BruceBase place entry'
                },
            ]
        },
        {
            entityType: 'work',
            storageKey: 'MB_AutoSelect_Mappings_Works',
            logTag:     'works',
            linkTypeOptions: [
                { id: '939',  name: 'license' },
                { id: '913',  name: 'purchase score for mail-order' },
                { id: '912',  name: 'purchase score for download' },
                { id: '274',  name: 'purchase score for free' },
                { id: '921',  name: 'work list entry' },
                { id: '908',  name: 'crowdfunding page' },
                { id: '1188', name: 'fan pages' },
            ],
            defaultMappings: [
                {
                    regex: 'http://brucebase\\.wikidot\\.com/song:.*',
                    typeId: '921',
                    description: 'BruceBase song entry'
                },
                {
                    regex: 'https://www\\.springsteenlyrics\\.com/lyrics\\.php\\?song=.*',
                    typeId: '921',
                    description: 'SpringsteenLyrics song entry'
                },
            ]
        }
    ];

    // ── Detect active entity type from current URL ─────────────────────────────

    /**
     * Resolves which EntityConfig applies to the current page.
     * Matches the URL path against /<entityType>/(create|<uuid>/edit).
     *
     * @returns {EntityConfig|null} The matching config, or null if unrecognised.
     */
    function detectEntityConfig() {
        const path = window.location.pathname;
        for (const cfg of ENTITY_CONFIGS) {
            // e.g. /release/... or /release-group/...
            const pattern = new RegExp(`^/${cfg.entityType}(/|$)`, 'i');
            if (pattern.test(path)) {
                log.debug('init', `Detected entity type: ${cfg.entityType}`, path);
                return cfg;
            }
        }
        log.warn('warn', 'Could not detect entity type from URL', path);
        return null;
    }

    // ── Persistence ────────────────────────────────────────────────────────────

    /**
     * Loads link mappings from localStorage for the given entity config.
     * Falls back to the built-in defaults when nothing is stored or parsing fails.
     *
     * @param {EntityConfig} cfg
     * @returns {LinkMapping[]}
     */
    function loadMappings(cfg) {
        try {
            const stored = localStorage.getItem(cfg.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    log.debug('meta', `[${cfg.logTag}] Loaded ${parsed.length} mappings from localStorage`);
                    return parsed;
                }
            }
        } catch (e) {
            log.error('error', `[${cfg.logTag}] Failed to parse stored mappings — using defaults`, e);
        }
        log.info('init', `[${cfg.logTag}] No stored mappings found — using ${cfg.defaultMappings.length} defaults`);
        return [...cfg.defaultMappings];
    }

    /**
     * Persists link mappings to localStorage and updates the in-memory array.
     *
     * @param {EntityConfig}  cfg
     * @param {LinkMapping[]} mappings
     * @param {LinkMapping[]} targetArray - The live array that should be updated in place.
     */
    function saveMappings(cfg, mappings, targetArray) {
        try {
            localStorage.setItem(cfg.storageKey, JSON.stringify(mappings));
            // Update live array in place so existing references stay valid
            targetArray.length = 0;
            mappings.forEach(m => targetArray.push(m));
            log.info('success', `[${cfg.logTag}] Saved and activated ${mappings.length} link mappings`);
        } catch (e) {
            log.error('error', `[${cfg.logTag}] Failed to save mappings to localStorage`, e);
        }
    }

    // ── Core URL-matching logic ────────────────────────────────────────────────

    /**
     * Tests a URL against the active mapping list and returns the matching typeId.
     *
     * @param {string}        url      - The URL to test.
     * @param {LinkMapping[]} mappings - Active mapping list.
     * @param {string}        logTag   - Entity tag for log messages.
     * @returns {string|null} The typeId string, or null when no mapping matched.
     */
    function getLinkTypeForUrl(url, mappings, logTag) {
        for (const mapping of mappings) {
            try {
                if (new RegExp(mapping.regex, 'i').test(url)) {
                    log.debug('filter', `[${logTag}] URL matched mapping "${mapping.description || mapping.regex}" → typeId ${mapping.typeId}`);
                    return mapping.typeId;
                }
            } catch (e) {
                log.warn('warn', `[${logTag}] Invalid regex "${mapping.regex}" skipped`, e);
            }
        }
        return null;
    }

    // ── URL cleaning (release-specific) ───────────────────────────────────────

    /**
     * Regex used to strip trailing query parameters from SpringsteenLyrics URLs.
     * Applied only on "release" pages during paste.
     */
    const REGEX_SPRINGSTEEN_CLEAN = /^(https?:\/\/www\.springsteenlyrics\.com\/(bootlegs|collection)\.php\?\w+=\d+)(&.*)?$/i;

    /**
     * Strips unwanted trailing parameters from a URL if a cleaning rule applies.
     * Currently only handles SpringsteenLyrics URLs on release pages.
     *
     * @param {string} rawUrl    - The pasted URL.
     * @param {string} entityType
     * @returns {string} Cleaned URL (may be equal to rawUrl when no rule matched).
     */
    function cleanUrl(rawUrl, entityType) {
        if (entityType === 'release') {
            const m = rawUrl.match(REGEX_SPRINGSTEEN_CLEAN);
            if (m) {
                log.debug('cleanup', `[${entityType}] Cleaned SpringsteenLyrics URL: ${rawUrl} → ${m[1]}`);
                return m[1];
            }
        }
        return rawUrl;
    }

    // ── React input helper ─────────────────────────────────────────────────────

    /**
     * Sets the value on a React-controlled input/select element and fires the
     * synthetic events React needs to register the change.
     *
     * @param {HTMLElement} element - Target DOM element.
     * @param {string}      value   - New value to set.
     */
    function setReactValue(element, value) {
        try {
            const lastValue = element.value;
            element.value = value;
            const tracker = element._valueTracker;
            if (tracker) tracker.setValue(lastValue);
            element.dispatchEvent(new Event('input',  { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
            log.error('error', 'setReactValue failed', e);
        }
    }

    // ── Per-entity runtime context factory ────────────────────────────────────

    /**
     * Creates the runtime context (state + handlers) for a single entity type.
     * All mutable state is encapsulated here, making each entity fully independent.
     *
     * @param {EntityConfig} cfg - Entity configuration object.
     * @returns {Object} Context object with an `initialize()` method.
     */
    function createEntityContext(cfg) {
        /** @type {LinkMapping[]} Live mapping list, kept in sync with localStorage. */
        const linkMappings = loadMappings(cfg);

        /** Stores URL + typeId data between paste and the subsequent DOM mutation. */
        let lastCleanedUrlData = null;

        /** Guards against opening the config modal more than once. */
        let isModalOpen = false;

        // ── Paste handler ────────────────────────────────────────────────────────

        /**
         * Intercepts paste events on "Add link" inputs, optionally cleans the URL,
         * and records the desired typeId so the mutation observer can apply it.
         *
         * @param {ClipboardEvent} e
         */
        function handlePaste(e) {
            const target = e.target;
            if (
                target.tagName !== 'INPUT' ||
                !target.placeholder ||
                (!target.placeholder.includes('Add link') && !target.placeholder.includes('Add another link'))
            ) {
                return;
            }

            const rawPaste = (e.clipboardData || window.clipboardData).getData('text');
            log.debug('fetch', `[${cfg.logTag}] Paste detected: ${rawPaste}`);

            const cleaned = cleanUrl(rawPaste, cfg.entityType);

            if (cleaned !== rawPaste) {
                // Prevent default paste, then insert the cleaned URL ourselves
                e.preventDefault();
                if (document.queryCommandSupported('insertText')) {
                    document.execCommand('insertText', false, cleaned);
                } else {
                    setReactValue(target, cleaned);
                }
            }

            const typeId = getLinkTypeForUrl(cleaned, linkMappings, cfg.logTag);
            if (typeId) {
                lastCleanedUrlData = { url: cleaned, typeId };
                log.info('success', `[${cfg.logTag}] Paste matched — will auto-select typeId ${typeId}`);
            } else {
                lastCleanedUrlData = null;
                log.debug('filter', `[${cfg.logTag}] Pasted URL did not match any mapping`);
            }
        }

        // ── DOM mutation handler ─────────────────────────────────────────────────

        /**
         * Reacts to newly added DOM nodes inside the External Links editor.
         * When a `select.link-type` element appears after a matched paste, the
         * handler sets its value to the desired typeId and shifts focus forward.
         *
         * @param {MutationRecord[]} mutations
         */
        function handleMutations(mutations) {
            for (const mutation of mutations) {
                if (!mutation.addedNodes.length) continue;

                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;

                    const selectEl = node.matches('select.link-type')
                        ? node
                        : node.querySelector('select.link-type');

                    if (!selectEl || !lastCleanedUrlData) continue;

                    log.debug('render', `[${cfg.logTag}] select.link-type appeared — scheduling typeId assignment`);

                    const { typeId } = lastCleanedUrlData;
                    lastCleanedUrlData = null; // consume immediately to avoid double-firing

                    setTimeout(() => {
                        const option = cfg.linkTypeOptions.find(o => o.id === typeId);
                        if (!option) {
                            log.warn('warn', `[${cfg.logTag}] typeId ${typeId} not found in linkTypeOptions`);
                            return;
                        }

                        if (selectEl.value !== typeId) {
                            setReactValue(selectEl, typeId);
                            log.info('success', `[${cfg.logTag}] Link type set to ${typeId} (${option.name})`);
                        } else {
                            log.debug('meta', `[${cfg.logTag}] Link type already set to ${typeId} — skipping`);
                        }

                        // Move focus to the next "Add …" input for faster data entry
                        const editor = selectEl.closest('#external-links-editor');
                        if (editor) {
                            const nextInput = editor.querySelector('input[placeholder^="Add"]');
                            if (nextInput && nextInput !== document.activeElement) {
                                nextInput.focus();
                                log.debug('ui', `[${cfg.logTag}] Focus moved to next link input`);
                            }
                        }
                    }, 5);
                }
            }
        }

        // ── External-links editor: wait & attach ─────────────────────────────────

        /**
         * Waits for the `#external-links-editor` element to appear in the DOM
         * (it is rendered asynchronously by the MB React front-end) and then
         * attaches a MutationObserver on its <tbody>.
         *
         * A top-level MutationObserver on `document.body` is used instead of
         * a polling interval so that we react immediately when the element
         * appears, without burning CPU in a tight loop.
         *
         * @param {Function} onReady - Called with the `<tbody>` element when found.
         */
        function waitForExternalLinksEditor(onReady) {
            // Check whether the container is already in the DOM
            const existing = document.getElementById('external-links-editor');
            if (existing) {
                const tbody = existing.querySelector('tbody');
                if (tbody) {
                    log.debug('init', `[${cfg.logTag}] #external-links-editor already present — attaching immediately`);
                    onReady(tbody);
                    return;
                }
            }

            log.info('init', `[${cfg.logTag}] Waiting for #external-links-editor to appear…`);

            const bodyObserver = new MutationObserver((_mutations, obs) => {
                const editor = document.getElementById('external-links-editor');
                if (!editor) return;

                const tbody = editor.querySelector('tbody');
                if (!tbody) return;

                obs.disconnect();
                log.info('success', `[${cfg.logTag}] #external-links-editor rendered — observer attached`);
                onReady(tbody);
            });

            bodyObserver.observe(document.body, { childList: true, subtree: true });
        }

        // ── Config button ────────────────────────────────────────────────────────

        /**
         * Injects the ⚙️ Configure mappings button next to the "External links" legend.
         * Waits for the legend element to appear if it is not yet in the DOM.
         */
        function insertConfigButton() {
            const tryInsert = () => {
                const legend = Array.from(document.querySelectorAll('fieldset.information > legend'))
                    .find(l => l.textContent.trim() === 'External links');

                if (legend && !document.getElementById('mb-autosel-config-button')) {
                    const btn = document.createElement('button');
                    btn.id = 'mb-autosel-config-button';
                    btn.type = 'button';
                    btn.innerHTML = '⚙️ Configure mappings';
                    btn.style.cssText = [
                        'margin-left:10px',
                        'background:#f0f0f0',
                        'border:1px solid #ccc',
                        'padding:2px 8px',
                        'border-radius:3px',
                        'font-weight:normal',
                        'cursor:pointer',
                        'font-size:0.8em',
                        'line-height:1.2',
                        'vertical-align:middle'
                    ].join(';');
                    btn.onmouseover = () => { btn.style.backgroundColor = '#e0e0e0'; };
                    btn.onmouseout  = () => { btn.style.backgroundColor = '#f0f0f0'; };
                    btn.onclick = showConfigModal;
                    legend.appendChild(btn);
                    log.debug('ui', `[${cfg.logTag}] Config button injected`);
                    return true;
                }
                return false;
            };

            if (!tryInsert()) {
                // Legend not yet in DOM — use a short-lived observer
                const obs = new MutationObserver((_m, o) => {
                    if (tryInsert()) o.disconnect();
                });
                obs.observe(document.body, { childList: true, subtree: true });
            }
        }

        // ── Configuration modal ──────────────────────────────────────────────────

        /**
         * Renders the mapping rows into the main modal body element.
         *
         * @param {HTMLElement} container         - The modal body element to render into.
         * @param {Function}    openEditCallback  - Callback to open the edit sub-modal.
         */
        function renderMappings(container, openEditCallback) {
            container.innerHTML = '';

            const table = document.createElement('table');
            table.className = 'tbl';
            table.style.width = '100%';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>URL Regex Pattern</th>
                        <th style="width:160px;">Maps To</th>
                        <th style="width:250px;">Description</th>
                        <th style="width:90px;">Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');
            linkMappings.forEach((mapping, idx) => {
                const opt  = cfg.linkTypeOptions.find(o => o.id === mapping.typeId);
                const name = opt ? opt.name.replace(/&nbsp;/g, '').trim() : `Unknown ID (${mapping.typeId})`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace;font-size:0.9em;max-width:300px;word-break:break-all;vertical-align:top;padding-right:10px;">${escHtml(mapping.regex)}</td>
                    <td style="vertical-align:top;">${escHtml(name)} (${escHtml(mapping.typeId)})</td>
                    <td style="vertical-align:top;">${escHtml(mapping.description || '')}</td>
                    <td style="vertical-align:top;">
                        <button class="nobutton icon edit-item"   type="button" data-index="${idx}" title="Edit">✏️</button>
                        <button class="nobutton icon remove-item" type="button" data-index="${idx}" title="Delete">❌</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            table.addEventListener('click', (e) => {
                const btn = e.target.closest('button.nobutton[data-index]');
                if (!btn) return;

                const idx = parseInt(btn.dataset.index, 10);
                if (isNaN(idx)) return;

                if (btn.classList.contains('edit-item')) {
                    log.debug('ui', `[${cfg.logTag}] Edit mapping at index ${idx}`);
                    openEditCallback(idx);
                } else if (btn.classList.contains('remove-item')) {
                    log.debug('ui', `[${cfg.logTag}] Delete mapping at index ${idx}`);
                    deleteMapping(idx, container, openEditCallback);
                }
            });

            container.appendChild(table);

            const addBtn = document.createElement('button');
            addBtn.className = 'submit';
            addBtn.textContent = 'Add New Mapping';
            addBtn.type = 'button';
            addBtn.style.marginTop = '15px';
            addBtn.onclick = () => openEditCallback(null);
            container.appendChild(addBtn);
        }

        /**
         * Removes the mapping at the given index, saves, and re-renders the table.
         *
         * @param {number}      idx              - Index to remove.
         * @param {HTMLElement} container        - Main modal body element.
         * @param {Function}    openEditCallback
         */
        function deleteMapping(idx, container, openEditCallback) {
            linkMappings.splice(idx, 1);
            saveMappings(cfg, [...linkMappings], linkMappings);
            renderMappings(container, openEditCallback);
        }

        /**
         * Opens the add/edit sub-modal for a single mapping.
         *
         * @param {number|null} editIdx            - Index of the mapping to edit, or null to add.
         * @param {Function}    reEnableMainEscape - Restores ESC on the parent modal when this closes.
         */
        function openEditModal(editIdx, reEnableMainEscape) {
            const isEditing   = editIdx !== null;
            const current     = isEditing
                ? { ...linkMappings[editIdx] }
                : { regex: '', typeId: cfg.linkTypeOptions[0].id, description: '' };

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10002;display:flex;justify-content:center;align-items:center;';

            const box = document.createElement('div');
            box.style.cssText = 'background:white;padding:20px;border-radius:5px;box-shadow:0 4px 6px rgba(0,0,0,0.1);width:500px;max-height:90vh;overflow-y:auto;';

            const optionsHtml = cfg.linkTypeOptions
                .map(o => `<option value="${escHtml(o.id)}" ${current.typeId === o.id ? 'selected' : ''}>${escHtml(o.name.replace(/&nbsp;/g, '').trim())} (${escHtml(o.id)})</option>`)
                .join('');

            box.innerHTML = `
                <h2>${isEditing ? 'Edit Mapping' : 'Add New Mapping'}</h2>
                <div id="vz-edit-esc-warn" style="min-height:25px;"></div>
                <p style="color:grey;font-size:0.9em;">Use JavaScript RegExp syntax. Escape special characters as needed.</p>
                <div style="margin-bottom:10px;">
                    <label for="vz-edit-regex" style="display:block;margin-bottom:5px;"><strong>URL Regex Pattern:</strong></label>
                    <input id="vz-edit-regex" type="text" value="${escHtml(current.regex)}" style="width:98%;padding:5px;border:1px solid #ccc;">
                </div>
                <div style="margin-bottom:10px;">
                    <label for="vz-edit-desc" style="display:block;margin-bottom:5px;"><strong>Description (optional):</strong></label>
                    <input id="vz-edit-desc" type="text" value="${escHtml(current.description || '')}" style="width:98%;padding:5px;border:1px solid #ccc;">
                </div>
                <div style="margin-bottom:20px;">
                    <label for="vz-edit-type" style="display:block;margin-bottom:5px;"><strong>Maps To Link Type:</strong></label>
                    <select id="vz-edit-type" style="padding:5px;border:1px solid #ccc;width:100%;">${optionsHtml}</select>
                </div>
                <button id="vz-edit-save"   class="submit" type="button" style="margin-right:10px;">${isEditing ? 'Save Changes' : 'Add Mapping'}</button>
                <button id="vz-edit-cancel" class="btn"    type="button">Cancel</button>
            `;

            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const regexInput   = box.querySelector('#vz-edit-regex');
            const descInput    = box.querySelector('#vz-edit-desc');
            const typeSelect   = box.querySelector('#vz-edit-type');
            const warnEl       = box.querySelector('#vz-edit-esc-warn');

            const snapshot = { regex: current.regex, typeId: current.typeId, description: current.description || '' };
            let isDirtyConfirmed = false;
            let warnTimeout = null;

            const isDirty = () =>
                regexInput.value.trim() !== snapshot.regex ||
                typeSelect.value        !== snapshot.typeId ||
                descInput.value.trim()  !== snapshot.description;

            const closeEdit = () => {
                document.removeEventListener('keydown', escHandler);
                if (warnTimeout) clearTimeout(warnTimeout);
                overlay.remove();
                reEnableMainEscape();
            };

            const escHandler = (e) => {
                if (e.key !== 'Escape') return;
                e.preventDefault();
                e.stopImmediatePropagation();

                if (!isDirty()) { closeEdit(); return; }

                if (isDirtyConfirmed) {
                    closeEdit();
                } else {
                    isDirtyConfirmed = true;
                    warnEl.innerHTML = '<p style="color:#c0392b;background:#fbebeb;padding:5px;border-radius:3px;text-align:center;font-weight:bold;margin:0;">Unsaved changes. Press Esc again or Cancel to discard.</p>';
                    if (warnTimeout) clearTimeout(warnTimeout);
                    warnTimeout = setTimeout(() => {
                        if (overlay.isConnected) { isDirtyConfirmed = false; warnEl.innerHTML = ''; }
                    }, 3000);
                }
            };
            document.addEventListener('keydown', escHandler);

            box.querySelector('#vz-edit-cancel').onclick = closeEdit;

            box.querySelector('#vz-edit-save').onclick = () => {
                const regex       = regexInput.value.trim();
                const typeId      = typeSelect.value;
                const description = descInput.value.trim();

                if (!regex || !typeId) {
                    log.warn('warn', `[${cfg.logTag}] Edit modal: regex and typeId are required`);
                    return;
                }
                try {
                    new RegExp(regex, 'i');
                } catch (err) {
                    log.error('error', `[${cfg.logTag}] Invalid regex: ${err.message}`);
                    return;
                }

                const updated = { regex, typeId, description };
                if (isEditing) {
                    linkMappings[editIdx] = updated;
                } else {
                    linkMappings.push(updated);
                }
                saveMappings(cfg, [...linkMappings], linkMappings);
                closeEdit();

                const mainBody = document.getElementById('mb-autosel-modal-content');
                if (mainBody) renderMappings(mainBody, window.__mb_autosel_openEditModal);
            };
        }

        /**
         * Opens the main configuration modal.
         * Manages the ESC key handler hierarchy between the main and edit sub-modals.
         */
        function showConfigModal() {
            if (isModalOpen) return;
            isModalOpen = true;
            log.debug('ui', `[${cfg.logTag}] Config modal opened`);

            const overlay = document.createElement('div');
            overlay.id = 'mb-autosel-modal-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;justify-content:center;align-items:flex-start;';

            const box = document.createElement('div');
            box.style.cssText = 'background:white;padding:20px;border-radius:5px;box-shadow:0 5px 15px rgba(0,0,0,0.5);width:80%;max-width:1000px;margin-top:50px;max-height:80vh;overflow-y:auto;';
            box.innerHTML = `
                <h1 style="border-bottom:1px solid #ccc;padding-bottom:10px;">MusicBrainz Auto-Select Configuration</h1>
                <p>Define URL patterns (JavaScript RegExp) that automatically select a link type when a matching URL is pasted. Entity: <strong>${escHtml(cfg.entityType)}</strong></p>
                <div id="mb-autosel-modal-content"></div>
                <div style="padding-top:20px;text-align:right;">
                    <button id="mb-autosel-close-btn" class="submit" type="button">Close</button>
                </div>
            `;

            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const closeMain = () => {
                document.removeEventListener('keydown', mainEscHandler);
                overlay.remove();
                isModalOpen = false;
                log.debug('ui', `[${cfg.logTag}] Config modal closed`);
            };

            const mainEscHandler = (e) => {
                if (e.key === 'Escape') { e.preventDefault(); closeMain(); }
            };

            const disableMainEsc  = () => document.removeEventListener('keydown', mainEscHandler);
            const reEnableMainEsc = () => document.addEventListener('keydown', mainEscHandler);

            const hierarchicalOpenEdit = (idx) => {
                disableMainEsc();
                openEditModal(idx, reEnableMainEsc);
            };

            // Make accessible to renderMappings' event delegation (delete re-renders)
            window.__mb_autosel_openEditModal = hierarchicalOpenEdit;

            const modalBody = document.getElementById('mb-autosel-modal-content');
            renderMappings(modalBody, hierarchicalOpenEdit);
            reEnableMainEsc();

            document.getElementById('mb-autosel-close-btn').onclick = closeMain;
        }

        // ── Public initialise ────────────────────────────────────────────────────

        /**
         * Bootstraps the entity context:
         * 1. Attaches the paste listener (capture phase).
         * 2. Injects the ⚙️ config button.
         * 3. Waits for #external-links-editor and then attaches the mutation observer.
         */
        function initialize() {
            log.info('init', `[${cfg.logTag}] Initialising — ${linkMappings.length} active mapping(s)`);

            // 1. Paste listener
            document.addEventListener('paste', handlePaste, true);

            // 2. Config button
            requestAnimationFrame(insertConfigButton);

            // 3. Wait for the External Links editor, then watch for new link rows
            waitForExternalLinksEditor((tbody) => {
                const rowObserver = new MutationObserver(handleMutations);
                rowObserver.observe(tbody, { childList: true, subtree: true });
                log.debug('init', `[${cfg.logTag}] MutationObserver attached to External Links tbody`);
            });
        }

        return { initialize };
    }

    // ── Utility ────────────────────────────────────────────────────────────────

    /**
     * Escapes a string for safe insertion into an HTML attribute or text node.
     *
     * @param {string} str
     * @returns {string}
     */
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── Entry point ────────────────────────────────────────────────────────────

    /**
     * Main entry point. Resolves the active entity configuration and boots
     * its context once the page DOM is fully loaded.
     */
    function main() {
        log.info('init', 'VZ AutoSelectExternalLinkType starting', window.location.pathname);

        const cfg = detectEntityConfig();
        if (!cfg) {
            log.warn('warn', 'No matching entity config — script will not run on this page');
            return;
        }

        const ctx = createEntityContext(cfg);

        // Wait for full DOM before initialising (run-at: document-idle still fires
        // before all React components have mounted, so we defer to window.load).
        if (document.readyState === 'complete') {
            ctx.initialize();
        } else {
            window.addEventListener('load', () => ctx.initialize(), { once: true });
        }
    }

    main();

})();
