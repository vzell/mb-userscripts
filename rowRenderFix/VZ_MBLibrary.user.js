// ==UserScript==
// @name         VZ: MusicBrainz - Unified Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      3.9.2+2026-02-24
// @description  Unified library for Logging, Settings, Changelog management, and remote content fetching
// @author       Gemini (directed by vzell)
// @license      MIT
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

/*
 * VZ_MBLibrary
 *
 * A unified library to handle:
 * 1. Advanced Logging with timestamps and icons.
 * 2. Settings/Configuration Management (Schema-driven).
 * 3. Changelog UI display.
 * 4. Menu Integration (Tampermonkey & MB Editing menu).
 */

// CHANGELOG
// let changelog_library = [
//     {version: '3.9.2+2026-02-24', description: 'Fix settings row layout still stacking vertically: the multi-line style="..." attribute values inside the settingCardsHtml template literal were being parsed by the browser as block context despite display:flex being set. Root cause isolated to multi-line style attributes inside nested template literal interpolation. Fix: collapsed all three column div style attributes to single-line strings. Also removed overflow-x:hidden from #settings-body which established an unwanted block formatting context that competed with flex layout on child rows.'},
//     {version: '3.9.1+2026-02-24', description: 'Fix two bugs in the 3.9.0 settings modal rewrite: (1) Color picker (iro.js) swatch button did nothing — picker popup was positioned using btn.offsetTop/offsetLeft which are relative to the offset-parent through the scrollable body div; replaced with getBoundingClientRect()-based coordinates relative to container so popup appears directly below the swatch button. (2) Setting rows rendered vertically stacked instead of side-by-side — vz-setting-row flex container lacked flex-wrap:nowrap so columns wrapped; added explicit nowrap and min-width:0 on all three column divs.'},
//     {version: '3.9.0+2026-02-24', description: 'Two changes: (1) Changelog dialog renderer updated from newRenderer.js: renderItem() is now recursive for arbitrary nesting depth; buildContent() accepts an optional filter string for live search; a search input is added to the drag-header. Force-refresh respects the current search filter when re-rendering. (2) Settings modal completely rewritten from table-based layout to a modern flex/div-based card layout to eliminate the ghost shadow/white-row glitch that appeared when collapsing section headers. The ghost was caused by table row height calculations leaking into the scrollable area. The new layout uses div-based section cards with smooth CSS transitions; all features preserved: collapsible sections, draggable/resizable dialog, color picker, keyboard shortcut capture, popup_dialog sub-editor, search, global reset, and unsaved-change detection.'},
//     {version: '3.8.0+2026-02-23', description: 'Changelog dialog renderer rewritten: structured Markdown-inspired layout (## version, ### section, - items with sub-items). buildContent() now accepts an optional filter string parameter for live search. A search input is added to the drag-header so users can type to filter entries in real time. Force-refresh handler respects the current search filter when re-rendering. renderItem() is recursive for arbitrary nesting depth.'},
//     {version: '3.7.0+2026-02-23', description: 'Changelog dialog renderer rewritten: replaced the flat <table>-based layout (version / description columns) with a document-style <div> layout that renders each entry as a version+date header block followed by labelled section groups (🚀 Improvements, 🐛 Fixes, 🧹 Cleanup, ⚙️ Internal, etc.) with <ul> bullet lists and optional nested sub-lists. Both the new {version, date, sections[{label, items[]}]} JSON format and the legacy flat {version, description} string format are handled — legacy entries render as a plain paragraph for backward compat. buildRows() renamed to buildContent(); tbody reference replaced with entriesEl; force-refresh handler updated accordingly.'},
//     {version: '3.6.0+2026-02-23', description: 'Changelog dialog and app-help dialog: debug/info logging added to report cache status (source: static / cache / fresh, entry count, cache age in seconds) every time the respective popup is opened. A "🔄 Force refresh" link is added to the upper-right header of both dialogs; clicking it bypasses the cache, re-fetches from GitHub, updates the in-memory data and re-renders the content in place without closing the dialog. Force-refresh success / failure is logged at info/warn level and reflected in the UI. fetchCachedText gains an optional fourth parameter forceRefresh (default false) that, when true, skips the cache-hit check and goes straight to the network. _changelogMeta object tracks {fromCache, fetchedAt, url, cacheKey, cacheTtlMs} for the last changelog load so that changelogInterface.show() can report accurate cache status.'},
//     {version: '3.5.0+2026-02-23', description: 'Added showCustomDialog / showCustomAlert / showCustomConfirm to the library public API for reuse across consumer scripts. The settings modal now guards against accidental data loss: (1) Escape key, the CLOSE link, and backdrop clicks first check for unsaved changes via a snapshot comparison and present a showCustomConfirm prompt before discarding edits; (2) the RESET link always presents a showCustomConfirm prompt that warns the user all configuration settings will be reset to their default values before proceeding.'},
//     {version: '3.4.0+2026-02-23', description: 'Fix: changelog source diagnostic messages promoted from debug to info level.'},
//     {version: '3.3.0+2026-02-23', description: 'Improved changelog source diagnostics.'},
//     {version: '3.2.0+2026-02-23', description: 'Remote content support moved into library.'},
//     {version: '3.1.0+2026-02-22', description: 'Settings modal ghost-shadow-row eliminated.'},
//     {version: '3.0.0+2026-02-22', description: 'Settings modal overflow:hidden fix + JSDoc.'},
//     {version: '2.9.0+2026-02-22', description: 'Settings modal linear-gradient fix.'},
//     {version: '2.8.0+2026-02-22', description: 'Keyboard shortcut capture uppercases alpha keys.'},
//     {version: '2.7.0+2026-02-22', description: 'Settings modal: all sections start collapsed.'},
//     {version: '2.6.0+2026-02-22', description: 'Settings modal: collapse-all toggle button.'},
//     {version: '2.5.0+2026-02-21', description: 'New setting type "keyboard_shortcut".'},
//     {version: '2.4.0+2026-02-21', description: 'New setting type "popup_dialog".'},
//     {version: '2.3.0+2026-02-16', description: 'Expose settings interface.'},
//     {version: '2.2.0+2026-02-14', description: 'Drag anywhere, Sticky header, Collapsible sections, Real-time search.'},
//     {version: '2.1.0+2026-02-14', description: 'Keep header + footer fixed while entries scroll + Esc key.'},
//     {version: '2.0.0+2026-02-14', description: 'Support dividers + modern UI design.'},
//     {version: '1.1.0+2026-02-11', description: 'Dynamic debug flag via function.'},
//     {version: '1.0.0+2026-02-11', description: 'Expose an additional "warn" method.'},
//     {version: '0.9.3+2026-02-02', description: 'Expose loggerInterface.prefix with getter/setter.'},
//     {version: '0.9.2+2026-01-31', description: '1st official release version.'}
// ];

"use strict";

const VZ_MBLibrary = (function() {
    return function(scriptId, scriptName, configSchema = null, changelog = null, debugEnabled = true, remoteConfig = null) {
        const timers = new Map();

        /**
         * Returns true when debug logging is currently enabled.
         * Supports both a static boolean and a dynamic function.
         * @returns {boolean}
         */
        const isDebugEnabled = () => {
            if (typeof debugEnabled === 'function') {
                return debugEnabled();
            }
            return debugEnabled;
        };

        // Internal changelog — seeded from the static constructor param, optionally
        // extended/replaced at runtime by initRemoteContent() after an async fetch.
        let _changelog = Array.isArray(changelog) ? [...changelog] : [];

        // Metadata about the last changelog load — used for cache-status logging in the
        // changelog dialog and for re-fetching on "Force refresh".
        const _changelogMeta = {
            fromCache:  null,  // true = served from GM cache, false = fresh network fetch, null = static only
            fetchedAt:  null,  // Date.now() at time of load, or null for static
            url:        null,  // Remote URL used, or null for static
            cacheKey:   null,  // GM storage key used, or null for static
            cacheTtlMs: null   // TTL used during the last fetch, or null for static
        };

        // ── Remote content helpers ────────────────────────────────────────────────

        /**
         * Fetch a URL via GM_xmlhttpRequest.
         * @param {string} url
         * @returns {Promise<string>}
         */
        const fetchRemoteText = function(url) {
            return new Promise((resolve, reject) => {
                if (typeof GM_xmlhttpRequest === 'undefined') {
                    reject(new Error('GM_xmlhttpRequest not available — add @grant GM_xmlhttpRequest'));
                    return;
                }
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    timeout: 10000,
                    onload:    r  => r.status === 200 ? resolve(r.responseText) : reject(new Error(`HTTP ${r.status}`)),
                    onerror:   () => reject(new Error('Network error')),
                    ontimeout: () => reject(new Error('Request timed out'))
                });
            });
        };

        /**
         * Fetch text from a URL with GM_setValue/GM_getValue caching.
         * @param {string}  url
         * @param {string}  cacheKey              GM storage key
         * @param {number}  [cacheTtlMs=3600000]  Cache TTL in milliseconds (default 1 hour)
         * @param {boolean} [forceRefresh=false]   When true, skip cache read and always fetch from network
         * @returns {Promise<{data: string|null, fromCache: boolean, error: string|null}>}
         */
        const fetchCachedText = async function(url, cacheKey, cacheTtlMs = 3600000, forceRefresh = false) {
            if (!forceRefresh) {
                try {
                    const cached = GM_getValue(cacheKey, null);
                    if (cached && (Date.now() - cached.ts) < cacheTtlMs) {
                        const ageS = Math.round((Date.now() - cached.ts) / 1000);
                        loggerInterface.debug('remote', `Cache hit for ${cacheKey} (age ${ageS}s, TTL ${Math.round(cacheTtlMs / 1000)}s)`);
                        return { data: cached.data, fromCache: true, error: null };
                    } else if (cached) {
                        loggerInterface.debug('remote', `Cache stale for ${cacheKey} — will re-fetch`);
                    } else {
                        loggerInterface.debug('remote', `Cache miss for ${cacheKey} — will fetch`);
                    }
                } catch (_) { /* GM_getValue unavailable — skip cache read */ }
            } else {
                loggerInterface.info('remote', `Force refresh requested for ${cacheKey} — bypassing cache`);
            }

            try {
                loggerInterface.debug('remote', `Fetching: ${url}`);
                const data = await fetchRemoteText(url);
                try { GM_setValue(cacheKey, { ts: Date.now(), data }); } catch (_) {}
                loggerInterface.info('remote', `Fetched and cached fresh content for ${cacheKey} (${data.length} bytes)`);
                return { data, fromCache: false, error: null };
            } catch (err) {
                loggerInterface.warn('remote', `Fetch failed for ${url}: ${err.message}`);
                // Serve stale cache as last resort
                try {
                    const stale = GM_getValue(cacheKey, null);
                    if (stale) {
                        loggerInterface.warn('remote', `Serving stale cache for ${cacheKey} as last resort`);
                        return { data: stale.data, fromCache: true, error: 'Network error — showing cached version' };
                    }
                } catch (_) {}
                return { data: null, fromCache: false, error: err.message };
            }
        };

        // ── End remote content helpers ────────────────────────────────────────────

        // --- 1. Logger Logic ---
        const loggerInterface = {
            prefix: `[${scriptName}]`,
            styles: {
                debug: 'color: #7f8c8d; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold;',
                info: 'color: #2980b9; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; font-size: 11px;',
                warn: 'color: #d35400; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fff5e6; padding: 2px 4px; border-radius: 3px;',
                error: 'color: #c0392b; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fceae9; padding: 2px 4px; border-radius: 3px;',
                timer: 'color: #8e44ad; font-family: "Consolas", monospace; font-style: italic; font-weight: bold;',
                timestamp: 'color: #95a5a6; font-size: 9px; font-weight: normal;'
            },
            icons: {
                init: '🚀', fetch: '📥', render: '🎨', filter: '🔍', sort: '⚖️', cleanup: '🧹',
                warn: '⚠️', error: '❌', success: '✅', meta: '🎵', timer: '⏱️', ui: '🖥️'
            },
            /**
             * Returns the current time as an ISO-formatted timestamp string (time portion only).
             * @returns {string}
             */
            getTimestamp() {
                const now = new Date();
                return now.toISOString().split('T')[1].replace('Z', '');
            },
            /**
             * Core log method. Suppresses debug output when debug logging is disabled.
             * @param {string} level  - Log level key ('debug'|'info'|'warn'|'error'|'timer')
             * @param {string} icon   - Icon key from loggerInterface.icons
             * @param {string} msg    - Message text
             * @param {*}      [data] - Optional extra data passed to console.log
             */
            log(level, icon, msg, data = '') {
                if (!isDebugEnabled() && level === 'debug') return;
                const style = this.styles[level] || '';
                const iconChar = this.icons[icon] || '📝';
                const time = this.getTimestamp();
                console.log(`%c${time} %c${this.prefix} ${iconChar} ${msg}`, this.styles.timestamp, style, data);
            },
            /** @param {string} label  Timer label (must match a later timeEnd call) */
            time(label) { timers.set(label, performance.now()); },
            /**
             * Stops a timer started with time() and logs the elapsed milliseconds.
             * @param {string} label
             * @param {string} [icon='timer']
             */
            timeEnd(label, icon = 'timer') {
                const start = timers.get(label);
                if (start) {
                    const duration = (performance.now() - start).toFixed(2);
                    this.log('timer', icon, `${label}: ${duration}ms`);
                    timers.delete(label);
                }
            },
            debug(icon, msg, data) { this.log('debug', icon, msg, data); },
            info(icon, msg, data)  { this.log('info',  icon, msg, data); },
            warn(icon, msg, data)  { this.log('warn',  icon, msg, data); },
            error(icon, msg, data) { this.log('error', 'error', msg, data); }
        };

        // --- 2. Custom Dialog Logic ---

        /**
         * Unified modal dialog for alert and confirm interactions.
         * Self-contained — uses only hardcoded CSS so it works inside the library
         * without access to any consumer-script settings.
         *
         * @param {string}             message       - Body text (supports \n → <br> in confirm mode)
         * @param {string}             [title]       - Dialog header text
         * @param {HTMLElement|null}   [triggerEl]   - Element to position the dialog below (null = centred)
         * @param {'alert'|'confirm'}  [mode]        - 'alert' shows only OK; 'confirm' shows Cancel + OK
         * @returns {Promise<void|boolean>}          - alert: resolves void; confirm: resolves true/false
         */
        const showCustomDialog = function(message, title = 'Notice', triggerEl = null, mode = 'alert') {
            return new Promise((resolve) => {
                const isConfirm = mode === 'confirm';

                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0.35)',
                    zIndex: '20000', display: 'flex', justifyContent: 'center', alignItems: 'center'
                });

                const dlg = document.createElement('div');
                Object.assign(dlg.style, {
                    position: 'absolute', backgroundColor: '#fff', border: '1px solid #ccc',
                    borderRadius: '10px', padding: '0', minWidth: '320px', maxWidth: '500px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '14px', color: '#222', overflow: 'hidden', zIndex: '20001'
                });

                const hdr = document.createElement('div');
                Object.assign(hdr.style, {
                    backgroundColor: '#4a5568', color: '#fff', padding: '10px 14px',
                    fontWeight: '600', fontSize: '13px', letterSpacing: '0.03em'
                });
                hdr.textContent = title;

                const body = document.createElement('div');
                Object.assign(body.style, {
                    padding: '16px 18px', lineHeight: '1.55', color: '#333', whiteSpace: 'pre-wrap'
                });
                if (isConfirm) {
                    body.innerHTML = message.replace(/\n/g, '<br>');
                } else {
                    body.textContent = message;
                }

                const footer = document.createElement('div');
                Object.assign(footer.style, {
                    display: 'flex', justifyContent: 'flex-end', gap: '10px',
                    padding: '10px 14px', borderTop: '1px solid #e8e8e8', backgroundColor: '#f9f9fb'
                });

                const btnBase = {
                    padding: '6px 18px', borderRadius: '6px', border: '1px solid #aaa',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.12s ease'
                };

                let cancelBtn = null;
                if (isConfirm) {
                    cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancel';
                    Object.assign(cancelBtn.style, { ...btnBase, background: '#f0f0f0', color: '#444' });
                    cancelBtn.onmouseover = () => { cancelBtn.style.background = '#e0e0e0'; };
                    cancelBtn.onmouseout  = () => { cancelBtn.style.background = '#f0f0f0'; };
                    cancelBtn.onclick = () => {
                        document.body.removeChild(overlay);
                        document.removeEventListener('keydown', keyHandler, true);
                        resolve(false);
                    };
                    footer.appendChild(cancelBtn);
                }

                const okBtn = document.createElement('button');
                okBtn.textContent = 'OK';
                Object.assign(okBtn.style, { ...btnBase, background: '#4CAF50', color: '#fff', border: '1px solid #43a047' });
                okBtn.onmouseover = () => { okBtn.style.background = '#43a047'; };
                okBtn.onmouseout  = () => { okBtn.style.background = '#4CAF50'; };
                okBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', keyHandler, true);
                    resolve(isConfirm ? true : undefined);
                };
                footer.appendChild(okBtn);

                dlg.appendChild(hdr);
                dlg.appendChild(body);
                dlg.appendChild(footer);
                overlay.appendChild(dlg);
                document.body.appendChild(overlay);

                // Position dialog
                setTimeout(() => {
                    if (triggerEl) {
                        const r  = triggerEl.getBoundingClientRect();
                        const dr = dlg.getBoundingClientRect();
                        let top  = r.bottom + 10;
                        let left = r.left;
                        if (top  + dr.height > window.innerHeight) top  = r.top - dr.height - 10;
                        if (left + dr.width  > window.innerWidth)  left = window.innerWidth - dr.width - 10;
                        if (left < 0) left = 10;
                        dlg.style.left = left + 'px';
                        dlg.style.top  = top  + 'px';
                    } else {
                        dlg.style.left      = '50%';
                        dlg.style.top       = '50%';
                        dlg.style.transform = 'translate(-50%, -50%)';
                    }
                    okBtn.focus();
                }, 0);

                const keyHandler = (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault(); e.stopPropagation();
                        if (isConfirm && cancelBtn) { cancelBtn.click(); } else { okBtn.click(); }
                    } else if (e.key === 'Enter') {
                        e.preventDefault(); e.stopPropagation();
                        okBtn.click();
                    } else if (e.key === 'Tab' && isConfirm && cancelBtn) {
                        e.preventDefault(); e.stopPropagation();
                        if (document.activeElement === okBtn) { cancelBtn.focus(); } else { okBtn.focus(); }
                    }
                };
                // Capture phase so it fires before the settings-modal Escape handler
                document.addEventListener('keydown', keyHandler, true);
            });
        };

        /**
         * Convenience wrapper: alert-style dialog (single OK button).
         * @param {string}           message
         * @param {string}           [title]
         * @param {HTMLElement|null} [triggerEl]
         * @returns {Promise<void>}
         */
        const showCustomAlert = function(message, title = 'Notice', triggerEl = null) {
            return showCustomDialog(message, title, triggerEl, 'alert');
        };

        /**
         * Convenience wrapper: confirm-style dialog (Cancel + OK buttons).
         * @param {string}           message
         * @param {string}           [title]
         * @param {HTMLElement|null} [triggerEl]
         * @returns {Promise<boolean>}
         */
        const showCustomConfirm = function(message, title = 'Confirm', triggerEl = null) {
            return showCustomDialog(message, title, triggerEl, 'confirm');
        };

        // --- 3. Settings Logic ---
        const settingsInterface = {
            values: {},

            /**
             * Initialise settings values from GM storage, falling back to schema defaults.
             */
            init: function() {
                if (!configSchema) return;
                for (const key in configSchema) {
                    this.values[key] = GM_getValue(key, configSchema[key].default);
                }
            },

            /**
             * Determines whether text on a given hex background should be black or white.
             * Uses the YIQ contrast formula.
             * @param {string} hexcolor - 6-digit hex colour string (with or without leading #)
             * @returns {'black'|'white'}
             */
            getContrastYIQ: function(hexcolor) {
                hexcolor = hexcolor.replace('#', '');
                const r = parseInt(hexcolor.substr(0, 2), 16);
                const g = parseInt(hexcolor.substr(2, 2), 16);
                const b = parseInt(hexcolor.substr(4, 2), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                return (yiq >= 128) ? 'black' : 'white';
            },

            /**
             * Applies a colour preview to a colour-picker text input and its swatch button.
             * @param {string} inputId - DOM id of the colour text input
             * @param {string} color   - CSS hex colour value
             */
            applyColorPreview: function(inputId, color) {
                const input = document.getElementById(inputId);
                const btn   = document.getElementById(`${inputId}-picker-btn`);
                if (input) {
                    input.style.backgroundColor = color;
                    input.style.color = this.getContrastYIQ(color);
                }
                if (btn) { btn.style.backgroundColor = color; }
            },

            /**
             * Persists new setting values to GM storage and reloads the page.
             * @param {Object} newValues - Plain object mapping setting keys to new values
             */
            save: function(newValues) {
                for (const key in newValues) { GM_setValue(key, newValues[key]); }
                loggerInterface.info('init', 'Settings saved. Reloading...');
                location.reload();
            },

            /**
             * Opens the settings configuration modal dialog.
             *
             * The modal is built using a flex/div-based card layout (not a <table>) to
             * avoid the ghost-shadow row glitch that table-row height calculations caused
             * when collapsing section headers.  All features are preserved:
             *   - Collapsible section headers (with ▼/▶ toggle)
             *   - "Collapse all / Uncollapse all" bulk toggle button
             *   - Real-time search filter
             *   - Per-setting widgets: checkbox, number, text, color_picker, popup_dialog,
             *     keyboard_shortcut
             *   - Global RESET with confirmation
             *   - Unsaved-change detection on CLOSE / Escape / backdrop click
             *   - Draggable and resizable dialog with persisted size
             */
            showModal: function() {
                if (!configSchema) return;

                const sizeKey   = `${scriptId}-modal-size`;
                const savedSize = GM_getValue(sizeKey, { width: 940, height: 680 });

                // ── Overlay ───────────────────────────────────────────────────────
                const overlay = document.createElement('div');
                overlay.id = `${scriptId}-settings-overlay`;
                Object.assign(overlay.style, {
                    position: 'fixed', inset: '0',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)',
                    zIndex: '10000',
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                });

                // ── Container ─────────────────────────────────────────────────────
                const container = document.createElement('div');
                container.id = `${scriptId}-config-container`;
                Object.assign(container.style, {
                    position: 'relative',
                    backgroundColor: '#f4f6f9',
                    borderRadius: '14px',
                    color: '#222',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    width:     savedSize.width  + 'px',
                    height:    savedSize.height + 'px',
                    minWidth:  '740px',
                    minHeight: '480px',
                    maxWidth:  '95vw',
                    maxHeight: '92vh',
                    display:   'flex',
                    flexDirection: 'column',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
                    border:    '1px solid #d0d5dd',
                    transform: 'scale(0.96)',
                    opacity:   '0',
                    transition: 'all 0.18s ease',
                    overflow:  'hidden'  // clip children — eliminates any bleed artefacts
                });

                // ── HTML-escape helper for attribute values ────────────────────────
                const escAttr = s => String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                // ── Build setting cards ───────────────────────────────────────────
                // Each schema entry produces either a section-header div or a setting-row div.
                // Section-header divs own a data-section attribute; setting-row divs
                // carry a matching data-section so they can be shown/hidden as a group.
                let currentSection = '';
                let settingCardsHtml = '';
                let rowIndex = 0;

                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type === 'divider') {
                        currentSection = key;
                        settingCardsHtml += `
                        <div class="vz-section-header"
                             data-section="${escAttr(key)}"
                             style="
                                display:flex; align-items:center; gap:8px;
                                padding:10px 16px;
                                background:linear-gradient(to right,#5a6778,#7a94a8,#5a6778);
                                color:#fff;
                                font-weight:600;
                                font-size:0.9em;
                                cursor:pointer;
                                user-select:none;
                                border-bottom:1px solid rgba(255,255,255,0.15);
                                border-radius:0;
                             ">
                            <span class="vz-section-arrow" style="font-size:0.75em;transition:transform 0.2s;">▼</span>
                            <span>${cfg.label}</span>
                        </div>`;
                        return;
                    }

                    const inputId = `${scriptId}-input-${key}`;
                    const isCheck          = cfg.type === 'checkbox';
                    const isNumber         = cfg.type === 'number';
                    const isColor          = cfg.type === 'color_picker';
                    const isPopupDialog    = cfg.type === 'popup_dialog';
                    const isKeyboardShort  = cfg.type === 'keyboard_shortcut';

                    const valAttr = isCheck
                        ? (this.values[key] ? 'checked' : '')
                        : `value="${escAttr(this.values[key])}"`;

                    let inputHtml  = '';
                    let subgridHtml = '';

                    if (isCheck) {
                        inputHtml = `<input type="checkbox" id="${inputId}" ${valAttr}
                                     style="width:16px;height:16px;cursor:pointer;">`;
                    } else if (isNumber) {
                        inputHtml = `<input type="number" id="${inputId}" ${valAttr}
                                     min="${cfg.min || 0}" max="${cfg.max || 100}"
                                     style="width:90px;padding:4px 6px;border:1px solid #c8cdd5;
                                            border-radius:5px;font-size:0.9em;background:#fff;">`;
                    } else if (isPopupDialog) {
                        const fields       = cfg.fields || [];
                        const currentParts = String(this.values[key]).split('|');
                        const subInputsHtml = fields.map((fieldName, fi) => `
                            <label style="display:flex;align-items:center;gap:6px;font-size:0.82em;">
                                <span style="min-width:110px;text-align:right;color:#555;font-weight:600;
                                             white-space:nowrap;">${escAttr(fieldName)}:</span>
                                <input type="text"
                                       class="mb-pd-sub"
                                       data-master="${inputId}"
                                       data-index="${fi}"
                                       value="${escAttr(currentParts[fi] !== undefined ? currentParts[fi] : '')}"
                                       style="width:200px;padding:3px 6px;border:1px solid #bbb;
                                              border-radius:4px;font-size:0.95em;font-family:monospace;
                                              background:#fff;">
                            </label>`).join('');

                        inputHtml = `
                            <input type="hidden" id="${inputId}" value="${escAttr(this.values[key])}">
                            <button type="button" id="${inputId}-toggle"
                                    style="font-size:0.8em;padding:3px 9px;cursor:pointer;
                                           border:1px solid #aaa;border-radius:4px;
                                           background:#eff1f5;vertical-align:middle;">
                                ✏️ Edit fields
                            </button>`;

                        subgridHtml = `
                            <div id="${inputId}-subgrid"
                                 class="mb-pd-subgrid"
                                 data-section="${escAttr(currentSection)}"
                                 data-pd-open="false"
                                 style="display:none;padding:10px 16px 12px 32px;
                                        background:#e8edf5;border-top:1px solid #d0d8e8;">
                                <div style="display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;">
                                    ${subInputsHtml}
                                </div>
                            </div>`;
                    } else if (isKeyboardShort) {
                        inputHtml = `
                            <input type="text" id="${inputId}" ${valAttr} readonly
                                   style="width:130px;padding:4px 7px;border:1px solid #c8cdd5;
                                          border-radius:5px;font-family:monospace;cursor:default;
                                          background:#fff;">
                            <button type="button" id="${inputId}-capture-btn"
                                    data-capturing="false"
                                    style="margin-left:5px;font-size:0.8em;padding:3px 9px;
                                           cursor:pointer;border:1px solid #aaa;border-radius:4px;
                                           background:#eff1f5;vertical-align:middle;">
                                🎹 Capture
                            </button>`;
                    } else {
                        inputHtml = `<input type="text" id="${inputId}" ${valAttr}
                                     style="width:170px;padding:4px 7px;border:1px solid #c8cdd5;
                                            border-radius:5px;font-size:0.9em;background:#fff;">`;
                    }

                    if (isColor) {
                        inputHtml += `
                            <button id="${inputId}-picker-btn" type="button"
                                    style="margin-left:6px;width:26px;height:26px;
                                           border-radius:4px;cursor:pointer;border:1px solid #aaa;
                                           vertical-align:middle;">
                                🎨
                            </button>`;
                    }

                    // Alternating card background — subtle, avoids table artefacts
                    const cardBg = rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fc';
                    rowIndex++;

                    settingCardsHtml += `<div class="vz-setting-row" data-section="${escAttr(currentSection)}" style="display:flex;flex-wrap:nowrap;align-items:stretch;background:${cardBg};border-bottom:1px solid #e4e8ef;min-height:44px;"><div style="flex:0 0 280px;width:280px;min-width:0;padding:10px 14px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;border-right:1px solid #e4e8ef;box-sizing:border-box;"><label for="${inputId}" style="font-size:0.85em;font-weight:500;color:#334;cursor:pointer;white-space:nowrap;margin-right:4px;">${cfg.label}:</label>${inputHtml}</div><div style="flex:0 0 130px;width:130px;min-width:0;padding:10px;font-size:0.76em;color:#888;text-align:center;border-right:1px solid #e4e8ef;word-break:break-all;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">${isPopupDialog ? '<em>(pipe-sep.)</em>' : escAttr(String(cfg.default))}</div><div style="flex:1 1 0;min-width:0;padding:10px 14px;font-size:0.84em;color:#555;line-height:1.5;word-break:break-word;box-sizing:border-box;">${cfg.description}</div></div>${subgridHtml}`;
                });

                // ── Full container HTML ───────────────────────────────────────────
                container.innerHTML = `
                    <!-- ── Fixed header (drag handle) ── -->
                    <div id="${scriptId}-drag-header"
                         style="
                            cursor:move;
                            user-select:none;
                            padding:14px 18px 10px 18px;
                            background:#fff;
                            border-bottom:1px solid #d0d5dd;
                            flex-shrink:0;
                         ">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <div>
                                <div style="font-size:17px;font-weight:700;color:#1a2340;letter-spacing:0.01em;">
                                    ${escAttr(scriptName.toUpperCase())}
                                </div>
                                <div style="font-size:12px;color:#e07000;font-weight:600;margin-top:2px;">
                                    Settings are applied IMMEDIATELY upon saving.
                                </div>
                            </div>
                            <div style="display:flex;gap:12px;align-items:center;">
                                <a id="${scriptId}-reset"
                                   style="cursor:pointer;font-weight:600;color:#666;font-size:0.85em;
                                          text-decoration:none;">
                                    RESET
                                </a>
                                <span style="color:#ccc;">|</span>
                                <a id="${scriptId}-close"
                                   style="cursor:pointer;font-weight:600;color:#666;font-size:0.85em;
                                          text-decoration:none;">
                                    CLOSE
                                </a>
                            </div>
                        </div>
                        <!-- search + collapse-all row -->
                        <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
                            <input id="${scriptId}-search"
                                   type="search"
                                   placeholder="🔍 Search settings…"
                                   style="
                                       flex:1;
                                       padding:7px 10px;
                                       border-radius:6px;
                                       border:1px solid #c8cdd5;
                                       font-size:0.88em;
                                       background:#f8f9fc;
                                       outline:none;
                                   ">
                            <button type="button"
                                    id="${scriptId}-collapse-all-btn"
                                    style="
                                        white-space:nowrap;
                                        padding:6px 12px;
                                        font-size:0.85em;
                                        cursor:pointer;
                                        border:1px solid #aaa;
                                        border-radius:5px;
                                        background:#eff1f5;
                                        flex-shrink:0;
                                    ">
                                ⬆ Collapse all
                            </button>
                        </div>
                        <!-- sticky column headers -->
                        <div style="
                            display:flex;
                            gap:0;
                            margin-top:8px;
                            background:#e8ecf2;
                            border-radius:6px 6px 0 0;
                            border:1px solid #d0d5dd;
                            border-bottom:none;
                            overflow:hidden;
                            font-size:0.78em;
                            font-weight:700;
                            color:#556;
                            letter-spacing:0.04em;
                            text-transform:uppercase;
                        ">
                            <div style="flex:0 0 280px;min-width:180px;padding:6px 14px;border-right:1px solid #d0d5dd;">Setting</div>
                            <div style="flex:0 0 130px;min-width:90px;padding:6px 10px;text-align:center;border-right:1px solid #d0d5dd;">Default</div>
                            <div style="flex:1 1 0;padding:6px 14px;">Description</div>
                        </div>
                    </div>

                    <!-- ── Scrollable content area ── -->
                    <div id="${scriptId}-settings-body"
                         style="
                            flex:1 1 0;
                            overflow-y:auto;
                            background:#f4f6f9;
                            border-left:1px solid #d0d5dd;
                            border-right:1px solid #d0d5dd;
                         ">
                        ${settingCardsHtml}
                    </div>

                    <!-- ── Fixed footer ── -->
                    <div style="
                        flex-shrink:0;
                        padding:12px 18px 12px 18px;
                        background:#fff;
                        border-top:2px solid #ccd0d8;
                        text-align:right;
                    ">
                        <button id="${scriptId}-save-btn"
                                style="
                                    padding:9px 24px;
                                    font-weight:700;
                                    border-radius:8px;
                                    border:1px solid #3a9c3e;
                                    background:#4CAF50;
                                    color:#fff;
                                    cursor:pointer;
                                    font-size:0.95em;
                                    transition:all 0.15s ease;
                                ">
                            SAVE
                        </button>
                    </div>

                    <!-- ── Resize handle ── -->
                    <div id="${scriptId}-resize-handle"
                         style="
                            position:absolute;
                            width:20px; height:20px;
                            right:4px; bottom:4px;
                            cursor:nwse-resize;
                            opacity:0.5;
                            background:linear-gradient(135deg,transparent 45%,#999 45%,#999 55%,transparent 55%);
                         ">
                    </div>

                    <!-- ── Colour picker popup ── -->
                    <div id="${scriptId}-picker-container"
                         style="position:absolute;display:none;background:#fff;
                                border:1px solid #ccc;padding:10px;z-index:10001;
                                box-shadow:0 8px 25px rgba(0,0,0,0.2);border-radius:6px;">
                    </div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                requestAnimationFrame(() => {
                    container.style.transform = 'scale(1)';
                    container.style.opacity = '1';
                });

                // ── Dragging ──────────────────────────────────────────────────────
                const dragHeader = document.getElementById(`${scriptId}-drag-header`);
                let isDragging = false, isResizing = false, offsetX, offsetY;

                dragHeader.addEventListener('mousedown', e => {
                    isDragging = true;
                    offsetX = e.clientX - container.offsetLeft;
                    offsetY = e.clientY - container.offsetTop;
                    container.style.position = 'absolute';
                });

                document.addEventListener('mousemove', e => {
                    if (isDragging) {
                        container.style.left = `${e.clientX - offsetX}px`;
                        container.style.top  = `${e.clientY - offsetY}px`;
                    }
                    if (isResizing) {
                        const rect = container.getBoundingClientRect();
                        container.style.width  = Math.max(740, Math.min(window.innerWidth  * 0.95, e.clientX - rect.left))  + 'px';
                        container.style.height = Math.max(480, Math.min(window.innerHeight * 0.92, e.clientY - rect.top))   + 'px';
                    }
                });

                document.addEventListener('mouseup', () => {
                    if (isResizing) {
                        GM_setValue(sizeKey, { width: container.offsetWidth, height: container.offsetHeight });
                    }
                    isDragging = false;
                    isResizing = false;
                });

                document.getElementById(`${scriptId}-resize-handle`)
                    .addEventListener('mousedown', e => { e.stopPropagation(); isResizing = true; });

                // Prevent dragging when clicking in search input
                document.getElementById(`${scriptId}-search`)
                    .addEventListener('mousedown', e => e.stopPropagation());

                // ── Collapsible sections ──────────────────────────────────────────

                /**
                 * Apply a definitive collapsed or expanded state to one settings section.
                 * Toggles the arrow indicator, hides/shows all `.vz-setting-row` divs that
                 * belong to the section, and respects the popup-dialog sub-grid state.
                 * @param {HTMLElement} header    - The `.vz-section-header` div to toggle
                 * @param {boolean}     collapsed - true to collapse, false to expand
                 */
                function applySectionCollapse(header, collapsed) {
                    const section = header.dataset.section;
                    const arrow   = header.querySelector('.vz-section-arrow');

                    if (collapsed) {
                        header.dataset.collapsed = 'true';
                        if (arrow) { arrow.style.transform = 'rotate(-90deg)'; }
                    } else {
                        delete header.dataset.collapsed;
                        if (arrow) { arrow.style.transform = 'rotate(0deg)'; }
                    }

                    // Setting rows
                    document.querySelectorAll(`.vz-setting-row[data-section="${CSS.escape(section)}"]`)
                        .forEach(row => { row.style.display = collapsed ? 'none' : ''; });

                    // popup_dialog sub-grid rows
                    document.querySelectorAll(`.mb-pd-subgrid[data-section="${CSS.escape(section)}"]`)
                        .forEach(row => {
                            if (collapsed) {
                                row.style.display = 'none';
                            } else if (row.dataset.pdOpen === 'true') {
                                row.style.display = '';
                            }
                        });
                }

                document.querySelectorAll('.vz-section-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const nowCollapsed = header.dataset.collapsed !== 'true';
                        applySectionCollapse(header, nowCollapsed);
                    });
                });

                // Default: collapse all on open
                document.querySelectorAll('.vz-section-header')
                    .forEach(header => applySectionCollapse(header, true));

                // Collapse-all toggle button
                let allSectionsCollapsed = true;
                const collapseAllBtn = document.getElementById(`${scriptId}-collapse-all-btn`);
                collapseAllBtn.textContent = '⬇ Uncollapse all';

                collapseAllBtn.addEventListener('click', () => {
                    allSectionsCollapsed = !allSectionsCollapsed;
                    document.querySelectorAll('.vz-section-header')
                        .forEach(header => applySectionCollapse(header, allSectionsCollapsed));
                    collapseAllBtn.textContent = allSectionsCollapsed
                        ? '⬇ Uncollapse all'
                        : '⬆ Collapse all';
                });

                // ── Search ────────────────────────────────────────────────────────
                document.getElementById(`${scriptId}-search`).addEventListener('input', e => {
                    const term = e.target.value.toLowerCase();
                    document.querySelectorAll('.vz-setting-row').forEach(row => {
                        row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
                    });
                });

                // ── popup_dialog field editors ────────────────────────────────────
                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'popup_dialog') return;

                    const inputId    = `${scriptId}-input-${key}`;
                    const masterInput = document.getElementById(inputId);
                    const toggleBtn   = document.getElementById(`${inputId}-toggle`);
                    const subgrid     = document.getElementById(`${inputId}-subgrid`);

                    if (!masterInput || !toggleBtn || !subgrid) return;

                    toggleBtn.addEventListener('click', () => {
                        const willOpen = subgrid.dataset.pdOpen !== 'true';
                        subgrid.style.display  = willOpen ? '' : 'none';
                        subgrid.dataset.pdOpen = willOpen ? 'true' : 'false';
                        toggleBtn.textContent  = willOpen ? '▲ Collapse' : '✏️ Edit fields';
                    });

                    subgrid.querySelectorAll('.mb-pd-sub').forEach(sub => {
                        sub.addEventListener('input', () => {
                            const allSubs = Array.from(subgrid.querySelectorAll('.mb-pd-sub'))
                                .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
                            masterInput.value = allSubs.map(s => s.value).join('|');
                        });
                    });
                });

                // ── Keyboard shortcut capture ─────────────────────────────────────
                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'keyboard_shortcut') return;

                    const inputId    = `${scriptId}-input-${key}`;
                    const ksInput    = document.getElementById(inputId);
                    const captureBtn = document.getElementById(`${inputId}-capture-btn`);

                    if (!ksInput || !captureBtn) return;

                    /**
                     * Serialises a KeyboardEvent into a human-readable shortcut string such as
                     * "Ctrl+Shift+M" or "Alt+X". Single alphabetic keys are uppercased for
                     * readability (e.g. "Ctrl+m" → "Ctrl+M").
                     * @param {KeyboardEvent} e
                     * @returns {string|null} The shortcut string, or null if only a bare modifier was pressed
                     */
                    function buildShortcutString(e) {
                        const parts = [];
                        if (e.ctrlKey)  parts.push('Ctrl');
                        if (e.altKey)   parts.push('Alt');
                        if (e.shiftKey) parts.push('Shift');
                        if (e.metaKey && !e.ctrlKey) parts.push('Meta');
                        const rawKey = e.key;
                        if (['Control', 'Alt', 'Shift', 'Meta'].includes(rawKey)) return null;
                        const displayKey = (rawKey.length === 1 && /[a-z]/i.test(rawKey))
                            ? rawKey.toUpperCase()
                            : rawKey;
                        parts.push(displayKey);
                        return parts.join('+');
                    }

                    let captureHandler = null;

                    /**
                     * Activates keyboard-capture mode for the shortcut input widget.
                     * Visually highlights the capture button and registers a capture-phase
                     * keydown listener that intercepts the next non-modifier key combination.
                     * Pressing Escape cancels without changing the stored value.
                     */
                    function enterCaptureMode() {
                        captureBtn.dataset.capturing = 'true';
                        captureBtn.textContent = '⌛ Press keys… (Esc=cancel)';
                        captureBtn.style.background    = '#ffe082';
                        captureBtn.style.borderColor   = '#f9a825';
                        ksInput.style.borderColor      = '#f9a825';

                        captureHandler = function(e) {
                            e.preventDefault(); e.stopPropagation();
                            if (e.key === 'Escape') { exitCaptureMode(null); return; }
                            const combo = buildShortcutString(e);
                            if (combo === null) return;
                            exitCaptureMode(combo);
                        };
                        document.addEventListener('keydown', captureHandler, true);
                    }

                    /**
                     * Deactivates keyboard-capture mode, restores the button, and optionally
                     * writes a new shortcut string into the text input.
                     * @param {string|null} combo - The captured shortcut, or null to cancel
                     */
                    function exitCaptureMode(combo) {
                        captureBtn.dataset.capturing = 'false';
                        captureBtn.textContent = '🎹 Capture';
                        captureBtn.style.background    = '#eff1f5';
                        captureBtn.style.borderColor   = '#aaa';
                        ksInput.style.borderColor      = '#c8cdd5';

                        if (captureHandler) {
                            document.removeEventListener('keydown', captureHandler, true);
                            captureHandler = null;
                        }
                        if (combo !== null) { ksInput.value = combo; }
                    }

                    captureBtn.addEventListener('click', () => {
                        if (captureBtn.dataset.capturing === 'true') {
                            exitCaptureMode(null);
                        } else {
                            enterCaptureMode();
                        }
                    });
                });

                // ── Color picker ──────────────────────────────────────────────────
                const pickerContainer = document.getElementById(`${scriptId}-picker-container`);

                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'color_picker') return;

                    const inputId = `${scriptId}-input-${key}`;
                    const input   = document.getElementById(inputId);
                    const btn     = document.getElementById(`${inputId}-picker-btn`);

                    this.applyColorPreview(inputId, this.values[key]);

                    input.addEventListener('input', e => {
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                            this.applyColorPreview(inputId, e.target.value);
                        }
                    });

                    btn.onclick = (e) => {
                        e.stopPropagation();
                        // If picker is already open for this button, toggle it closed
                        if (pickerContainer.style.display === 'block' &&
                            pickerContainer.dataset.forInput === inputId) {
                            pickerContainer.style.display = 'none';
                            pickerContainer.dataset.forInput = '';
                            return;
                        }
                        pickerContainer.innerHTML = '';
                        pickerContainer.dataset.forInput = inputId;
                        pickerContainer.style.display = 'block';

                        // Position relative to the container using getBoundingClientRect
                        // so the offset is correct regardless of scroll position in the body div.
                        const btnRect       = btn.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        pickerContainer.style.top  = `${btnRect.bottom - containerRect.top + 4}px`;
                        pickerContainer.style.left = `${btnRect.left   - containerRect.left}px`;

                        if (typeof iro !== 'undefined') {
                            const activePicker = new iro.ColorPicker(`#${scriptId}-picker-container`, {
                                width: 180,
                                color: input.value || cfg.default
                            });
                            activePicker.on('color:change', (color) => {
                                input.value = color.hexString;
                                this.applyColorPreview(inputId, color.hexString);
                            });
                        } else {
                            loggerInterface.error('error', 'iro.js library not found!');
                            pickerContainer.textContent = 'iro.js missing';
                        }
                    };
                });

                overlay.addEventListener('click', e => {
                    if (e.target === overlay) tryCloseDialog();
                    // Hide the color picker when clicking outside it AND outside any picker button
                    const isPickerBtn = e.target.id && e.target.id.endsWith('-picker-btn');
                    if (!pickerContainer.contains(e.target) && !isPickerBtn) {
                        pickerContainer.style.display = 'none';
                        pickerContainer.dataset.forInput = '';
                    }
                });

                // ── Unsaved-change detection ──────────────────────────────────────

                /**
                 * Reads all current form-input values into a plain object (baseline snapshot).
                 * @returns {Object}
                 */
                const takeSnapshot = () => {
                    const snap = {};
                    for (const key in configSchema) {
                        if (configSchema[key].type === 'divider') continue;
                        const el = document.getElementById(`${scriptId}-input-${key}`);
                        if (!el) continue;
                        snap[key] = configSchema[key].type === 'checkbox' ? el.checked : el.value;
                    }
                    return snap;
                };

                const initialSnapshot = takeSnapshot();

                /**
                 * Returns true when at least one field differs from the baseline snapshot.
                 * @returns {boolean}
                 */
                const hasUnsavedChanges = () => {
                    for (const key in configSchema) {
                        if (configSchema[key].type === 'divider') continue;
                        const el = document.getElementById(`${scriptId}-input-${key}`);
                        if (!el) continue;
                        const current = configSchema[key].type === 'checkbox' ? el.checked : el.value;
                        if (String(current) !== String(initialSnapshot[key])) return true;
                    }
                    return false;
                };

                /** Close with unsaved-change guard. */
                const tryCloseDialog = async () => {
                    if (hasUnsavedChanges()) {
                        const confirmed = await showCustomConfirm(
                            'You have unsaved changes.\nDiscard changes and close the settings dialog?',
                            'Unsaved Changes'
                        );
                        if (!confirmed) return;
                    }
                    closeDialog();
                };

                // ── Save / Reset / Close ──────────────────────────────────────────

                const closeDialog = () => {
                    container.style.transform = 'scale(0.95)';
                    container.style.opacity   = '0';
                    setTimeout(() => {
                        if (document.body.contains(overlay)) document.body.removeChild(overlay);
                    }, 150);
                };

                document.getElementById(`${scriptId}-save-btn`).onclick = () => {
                    const newValues = {};
                    for (const key in configSchema) {
                        if (configSchema[key].type === 'divider') continue;
                        const input = document.getElementById(`${scriptId}-input-${key}`);
                        newValues[key] = configSchema[key].type === 'checkbox'
                            ? input.checked
                            : input.value;
                    }
                    this.save(newValues);
                    closeDialog();
                };

                document.getElementById(`${scriptId}-reset`).onclick = async () => {
                    const confirmed = await showCustomConfirm(
                        'This will reset ALL configuration settings to their default values.\n\nUnsaved edits will be discarded. Continue?',
                        'Reset All Settings to Defaults'
                    );
                    if (!confirmed) return;

                    for (const key in configSchema) {
                        if (configSchema[key].type === 'divider') continue;
                        const inputId = `${scriptId}-input-${key}`;
                        const input   = document.getElementById(inputId);
                        if (!input) continue;

                        if (configSchema[key].type === 'checkbox') {
                            input.checked = configSchema[key].default;
                        } else {
                            input.value = configSchema[key].default;

                            if (configSchema[key].type === 'color_picker') {
                                this.applyColorPreview(inputId, configSchema[key].default);
                            } else if (configSchema[key].type === 'popup_dialog') {
                                const parts   = String(configSchema[key].default).split('|');
                                const subgrid = document.getElementById(`${inputId}-subgrid`);
                                if (subgrid) {
                                    const subs = Array.from(subgrid.querySelectorAll('.mb-pd-sub'))
                                        .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
                                    subs.forEach((sub, i) => {
                                        sub.value = parts[i] !== undefined ? parts[i] : '';
                                    });
                                }
                            }
                        }
                    }
                };

                document.getElementById(`${scriptId}-close`).onclick = () => tryCloseDialog();

                // Note: a few browser shortcuts (Ctrl+N, Ctrl+T, Ctrl+W) are handled at
                // the OS/browser level and cannot be suppressed by JS in unprivileged contexts.
                window.addEventListener('keydown', e => {
                    if (e.key === 'Escape') tryCloseDialog();
                });
            }
        };

        // --- 4. Changelog Logic ---
        const changelogInterface = {
            /**
             * Opens the changelog modal dialog.
             *
             * Layout: Markdown-inspired document with ## version headers and ### section labels.
             * Supports live full-text search via a filter input in the header.
             * Force-refresh link re-fetches from GitHub while respecting the current filter.
             */
            show: function() {
                if (!_changelog || _changelog.length === 0) return;

                // ── Cache-status diagnostic log ───────────────────────────────────
                const metaSource = _changelogMeta.fromCache === null
                    ? 'static'
                    : _changelogMeta.fromCache
                        ? `cache (age ${_changelogMeta.fetchedAt ? Math.round((Date.now() - _changelogMeta.fetchedAt) / 1000) : '?'}s)`
                        : 'fresh network fetch';
                loggerInterface.info('ui', `Displaying changelog: ${_changelog.length} entries, source=${metaSource}`);
                if (_changelogMeta.url) {
                    loggerInterface.debug('ui', `Changelog URL: ${_changelogMeta.url} | cacheKey: ${_changelogMeta.cacheKey}`);
                }

                const sizeKey   = `${scriptId}-changelog-size`;
                const savedSize = GM_getValue(sizeKey, { width: 800, height: 580 });

                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)', zIndex: '3000009', display: 'flex',
                    justifyContent: 'center', alignItems: 'center'
                });

                const container = document.createElement('div');
                Object.assign(container.style, {
                    position: 'relative', backgroundColor: '#ffffff', borderRadius: '14px',
                    padding: '20px', color: '#222',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    width: savedSize.width + 'px', height: savedSize.height + 'px',
                    minWidth: '600px', minHeight: '400px', maxWidth: '95vw', maxHeight: '92vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.35)', border: '1px solid #ddd',
                    transform: 'scale(0.96)', opacity: '0', transition: 'all 0.18s ease'
                });

                // ── Rendering helpers ─────────────────────────────────────────────

                /**
                 * Render one changelog item (string OR {text, sub[]}) as an <li>.
                 * Recursively nests sub-items at increasing depth.
                 * @param {string|{text:string,sub:Array}} item
                 * @param {number} [depth=0]
                 * @returns {string} HTML string
                 */
                const renderItem = (item, depth = 0) => {
                    const textColor = depth === 0 ? '#1a1a2e' : '#44445e';
                    const fontSize  = depth === 0 ? '0.90em'  : '0.86em';
                    const leftPad   = '0px';

                    if (typeof item === 'string') {
                        return `<li style="margin:2px 0;padding-left:${leftPad};font-size:${fontSize};color:${textColor};line-height:1.55;">${item}</li>`;
                    }
                    const subHtml = (item.sub || []).map(s => renderItem(s, depth + 1)).join('');
                    return `<li style="margin:2px 0;padding-left:${leftPad};font-size:${fontSize};color:${textColor};line-height:1.55;">
                        ${item.text}
                        ${subHtml ? `<ul style="margin:3px 0 2px 0;padding:0 0 0 14px;list-style:disc;">${subHtml}</ul>` : ''}
                    </li>`;
                };

                /**
                 * Build the changelog document HTML.
                 *
                 * Output format (Markdown-inspired):
                 *   ## 9.89.0 – 2026-02-23
                 *   ### 🚀 Improvements
                 *   - item text
                 *     - sub-item
                 *   ### 🧹 Cleanup
                 *   - item text
                 *
                 * Accepts an optional filter string — entries not matching the filter
                 * (case-insensitive, full-text JSON match) are omitted.
                 * Both the new {version, date, sections[]} format and the legacy
                 * {version, description} flat-string format are supported.
                 *
                 * @param {string} [filter='']  Live-search filter string
                 * @returns {string} HTML string for the entries container
                 */
                const buildContent = (filter = '') => {
                    const needle = filter.trim().toLowerCase();

                    /** Returns true when the entry's serialised JSON contains the needle. */
                    const entryMatches = entry => {
                        if (!needle) return true;
                        return JSON.stringify(entry).toLowerCase().includes(needle);
                    };

                    let html = '';
                    let visibleCount = 0;

                    _changelog.forEach(entry => {
                        if (!entryMatches(entry)) return;
                        visibleCount++;

                        // ── ## version – date ──────────────────────────────────
                        const dateSpan = entry.date
                            ? ` <span style="font-weight:400;color:#6b7c93;"> – ${entry.date}</span>`
                            : '';

                        html += `
                            <div class="cl-entry" style="
                                margin:0;
                                padding:9px 18px 3px 18px;
                                border-top:2px solid #c2d3ee;
                                background:#eaf1fb;
                            ">
                                <div style="display:flex;align-items:baseline;gap:5px;">
                                    <span style="
                                        font-size:0.72em;font-weight:700;color:#8aa4c8;
                                        font-family:monospace;user-select:none;flex-shrink:0;
                                    ">##</span>
                                    <span style="
                                        font-size:0.97em;font-weight:700;color:#1a3a6a;
                                        font-family:monospace;letter-spacing:0.01em;
                                    ">${entry.version}${dateSpan}</span>
                                </div>
                            </div>`;

                        // ── sections (new structured format) ───────────────────
                        if (Array.isArray(entry.sections)) {
                            entry.sections.forEach(section => {
                                const itemsHtml = (section.items || []).map(i => renderItem(i, 0)).join('');
                                html += `
                                    <div class="cl-section" style="padding:4px 18px 8px 18px;background:#fff;">
                                        <div style="display:flex;align-items:baseline;gap:4px;margin:5px 0 3px 0;">
                                            <span style="
                                                font-size:0.70em;font-weight:700;color:#8aa4c8;
                                                font-family:monospace;user-select:none;flex-shrink:0;
                                            ">###</span>
                                            <span style="
                                                font-size:0.86em;font-weight:700;color:#2c5282;
                                                letter-spacing:0.02em;
                                            ">${section.label}</span>
                                        </div>
                                        <ul style="margin:0;padding:0 0 0 16px;list-style:disc;">${itemsHtml}</ul>
                                    </div>`;
                            });

                        // ── legacy flat description (backward compat) ──────────
                        } else {
                            const text = entry.description
                                || (Array.isArray(entry.description_list)
                                    ? entry.description_list.join(' ')
                                    : '');
                            html += `
                                <div class="cl-section" style="padding:5px 18px 8px 18px;background:#fff;">
                                    <p style="margin:4px 0;font-size:0.88em;color:#444;line-height:1.5;">${text}</p>
                                </div>`;
                        }

                        html += `<div style="height:1px;background:linear-gradient(to right,#c8d8f0 60%,transparent);margin:0 18px;"></div>`;
                    });

                    if (visibleCount === 0 && needle) {
                        html = `<div style="padding:40px;text-align:center;color:#888;font-size:0.95em;">
                            No entries match <em>${needle.replace(/</g, '&lt;')}</em>
                        </div>`;
                    }

                    return html;
                };

                // ── Container HTML ────────────────────────────────────────────────
                container.innerHTML = `
                    <div id="${scriptId}-changelog-drag"
                         style="cursor:move;user-select:none;margin-bottom:10px;">
                        <p style="text-align:right;margin:0 0 6px 0;display:flex;justify-content:flex-end;align-items:center;gap:10px;">
                            <a id="${scriptId}-changelog-refresh"
                               style="cursor:pointer;font-weight:600;color:#0066cc;font-size:0.9em;"
                               title="Bypass cache and download the latest changelog from GitHub">
                                🔄 Force refresh
                            </a>
                            <span style="color:#bbb;">|</span>
                            <a id="${scriptId}-changelog-close"
                               style="cursor:pointer;font-weight:600;color:#555;">
                                CLOSE
                            </a>
                        </p>
                        <h3 style="margin:4px 0;font-size:18px;font-weight:600;color:#222;">
                            ${scriptName.toUpperCase()} — CHANGELOG
                        </h3>
                        <p id="${scriptId}-changelog-meta"
                           style="margin:4px 0 8px 0;font-size:0.78em;color:#888;">
                            ${_changelogMeta.fromCache === null
                                ? `${_changelog.length} entries (static/local)`
                                : `${_changelog.length} entries — source: <strong>${_changelogMeta.fromCache ? '📦 cache' : '🌐 network'}</strong>${_changelogMeta.fetchedAt ? ` · fetched ${Math.round((Date.now() - _changelogMeta.fetchedAt) / 1000)}s ago` : ''}`}
                        </p>
                        <input id="${scriptId}-changelog-search"
                               type="search"
                               placeholder="🔍 Filter changelog entries…"
                               style="
                                   width:100%;
                                   box-sizing:border-box;
                                   padding:6px 10px;
                                   border:1px solid #c8d4e8;
                                   border-radius:6px;
                                   font-size:0.88em;
                                   background:#f4f8ff;
                                   color:#222;
                                   outline:none;
                                   transition:border-color 0.15s, box-shadow 0.15s;
                               "
                               onfocus="this.style.borderColor='#4a90d9';this.style.boxShadow='0 0 0 2px rgba(74,144,217,0.2)'"
                               onblur="this.style.borderColor='#c8d4e8';this.style.boxShadow='none'">
                    </div>

                    <div style="flex:1;overflow-y:auto;background:#f9f9fb;border-radius:8px;">
                        <div id="${scriptId}-changelog-entries">
                            ${buildContent()}
                        </div>
                    </div>

                    <div style="
                        position:sticky;bottom:0;background:#fff;
                        padding:12px 0 4px 0;text-align:right;
                        box-shadow:0 -8px 18px rgba(0,0,0,0.08);
                        border-top:1px solid #ddd;
                    ">
                        <button id="${scriptId}-changelog-close-btn"
                            style="padding:8px 18px;font-weight:600;border-radius:8px;border:1px solid #888;background:#eee;cursor:pointer;">
                            CLOSE
                        </button>
                    </div>

                    <div id="${scriptId}-changelog-resize"
                         style="position:absolute;width:20px;height:20px;right:6px;bottom:6px;cursor:nwse-resize;opacity:0.6;
                                background:linear-gradient(135deg, transparent 45%, #999 45%, #999 55%, transparent 55%);">
                    </div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                requestAnimationFrame(() => {
                    container.style.transform = 'scale(1)';
                    container.style.opacity = '1';
                });

                // ── Wire up search input ──────────────────────────────────────────
                const entriesEl   = container.querySelector(`#${scriptId}-changelog-entries`);
                const metaEl      = container.querySelector(`#${scriptId}-changelog-meta`);
                const searchInput = container.querySelector(`#${scriptId}-changelog-search`);

                // Prevent dragging when clicking/typing in the search box
                searchInput.addEventListener('mousedown', e => e.stopPropagation());

                searchInput.addEventListener('input', () => {
                    entriesEl.innerHTML = buildContent(searchInput.value);
                });

                // ── Force refresh ─────────────────────────────────────────────────
                const refreshLink = container.querySelector(`#${scriptId}-changelog-refresh`);

                /**
                 * Updates the metadata line below the title with current cache info.
                 */
                const updateMetaLine = () => {
                    if (!metaEl) return;
                    metaEl.innerHTML = _changelogMeta.fromCache === null
                        ? `${_changelog.length} entries (static/local)`
                        : `${_changelog.length} entries — source: <strong>${_changelogMeta.fromCache ? '📦 cache' : '🌐 network'}</strong>${_changelogMeta.fetchedAt ? ` · fetched ${Math.round((Date.now() - _changelogMeta.fetchedAt) / 1000)}s ago` : ''}`;
                };

                refreshLink.addEventListener('click', async () => {
                    if (!_changelogMeta.url || !_changelogMeta.cacheKey) {
                        loggerInterface.warn('ui', 'Force refresh not available — no remote URL configured (static changelog only)');
                        refreshLink.textContent = '⚠️ No remote URL';
                        setTimeout(() => { refreshLink.textContent = '🔄 Force refresh'; }, 2500);
                        return;
                    }

                    refreshLink.textContent = '⏳ Refreshing…';
                    refreshLink.style.pointerEvents = 'none';
                    refreshLink.style.color = '#888';

                    loggerInterface.info('ui', `Changelog force refresh triggered — fetching from ${_changelogMeta.url}`);

                    const { data, error } = await fetchCachedText(
                        _changelogMeta.url,
                        _changelogMeta.cacheKey,
                        _changelogMeta.cacheTtlMs || 3600000,
                        true /* forceRefresh */
                    );

                    if (data) {
                        try {
                            const entries = JSON.parse(data);
                            _changelog.length = 0;
                            entries.forEach(e => _changelog.push(e));
                            _changelogMeta.fromCache = false;
                            _changelogMeta.fetchedAt = Date.now();
                            // Re-render respecting the current search filter
                            entriesEl.innerHTML = buildContent(searchInput ? searchInput.value : '');
                            updateMetaLine();
                            refreshLink.textContent = '✅ Refreshed';
                            loggerInterface.info('ui', `Changelog force refresh complete: ${_changelog.length} entries loaded from network`);
                        } catch (parseErr) {
                            loggerInterface.warn('ui', `Changelog force refresh: JSON parse error — ${parseErr.message}`);
                            refreshLink.textContent = '⚠️ Parse error';
                        }
                    } else {
                        loggerInterface.warn('ui', `Changelog force refresh failed: ${error}`);
                        refreshLink.textContent = '⚠️ Refresh failed';
                    }

                    setTimeout(() => {
                        refreshLink.textContent = '🔄 Force refresh';
                        refreshLink.style.pointerEvents = '';
                        refreshLink.style.color = '#0066cc';
                    }, 2500);
                });

                // ── Dragging ──────────────────────────────────────────────────────
                const dragHeader = container.querySelector(`#${scriptId}-changelog-drag`);
                let isDragging = false, isResizing = false, offsetX, offsetY;

                dragHeader.addEventListener('mousedown', e => {
                    isDragging = true;
                    offsetX = e.clientX - container.offsetLeft;
                    offsetY = e.clientY - container.offsetTop;
                    container.style.position = 'absolute';
                });

                document.addEventListener('mousemove', e => {
                    if (isDragging) {
                        container.style.left = `${e.clientX - offsetX}px`;
                        container.style.top  = `${e.clientY - offsetY}px`;
                    }
                    if (isResizing) {
                        const rect = container.getBoundingClientRect();
                        container.style.width  = Math.max(600, Math.min(window.innerWidth  * 0.95, e.clientX - rect.left)) + 'px';
                        container.style.height = Math.max(400, Math.min(window.innerHeight * 0.92, e.clientY - rect.top))  + 'px';
                    }
                });

                document.addEventListener('mouseup', () => {
                    if (isResizing) {
                        GM_setValue(sizeKey, { width: container.offsetWidth, height: container.offsetHeight });
                    }
                    isDragging = false; isResizing = false;
                });

                container.querySelector(`#${scriptId}-changelog-resize`)
                    .addEventListener('mousedown', e => { e.stopPropagation(); isResizing = true; });

                // ── Close handling ────────────────────────────────────────────────
                const closeDialog = () => {
                    container.style.transform = 'scale(0.96)';
                    container.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(overlay)) document.body.removeChild(overlay);
                    }, 150);
                };

                overlay.addEventListener('mousedown', e => {
                    if (e.target === overlay && !isDragging && !isResizing) closeDialog();
                });

                container.querySelector(`#${scriptId}-changelog-close`).onclick     = closeDialog;
                container.querySelector(`#${scriptId}-changelog-close-btn`).onclick = closeDialog;
                window.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });
            }
        };

        // --- 5. Setup Menus ---
        /**
         * Registers Tampermonkey menu commands and injects a link into the MB Editing menu.
         * The ChangeLog menu item is only registered here for static changelogs; when
         * remoteConfig is set it is registered by initRemoteContent() after the async fetch.
         */
        const setupMenus = function() {
            if (typeof GM_registerMenuCommand !== 'undefined') {
                if (configSchema) {
                    GM_registerMenuCommand('⚙️ Settings Manager', () => settingsInterface.showModal());
                }
                if (!remoteConfig && _changelog.length > 0) {
                    GM_registerMenuCommand('📜 ChangeLog', () => changelogInterface.show());
                }
            }

            // Webpage "Editing" menu integration
            if (configSchema) {
                const editMenuItem = document.querySelector('div.right div.bottom ul.menu li.editing');
                const editMenuUl   = editMenuItem ? editMenuItem.querySelector('ul') : null;

                if (editMenuUl && !document.getElementById(`${scriptId}-menu-link`)) {
                    const li = document.createElement('li');
                    const a  = document.createElement('a');
                    a.id = `${scriptId}-menu-link`;
                    a.href = 'javascript:void(0)';
                    a.textContent = '⚙️ ' + scriptName;
                    a.style.cursor = 'pointer';
                    a.addEventListener('click', (e) => { e.preventDefault(); settingsInterface.showModal(); });
                    li.appendChild(a);
                    editMenuUl.appendChild(li);
                    loggerInterface.debug('init', 'Settings entry added to Editing menu.');
                }
            }
        };

        // --- 6. Remote Content Initialisation ---
        /**
         * If remoteConfig.changelogUrl is provided, fetch the changelog JSON from
         * GitHub (with GM cache), populate _changelog in place, then register the
         * ChangeLog GM menu command.  Called once at construction time; fully async
         * and non-blocking.
         */
        const initRemoteContent = async function() {
            if (!remoteConfig || !remoteConfig.changelogUrl) {
                if (_changelog.length > 0) {
                    loggerInterface.info('remote', `Changelog source: static only (${_changelog.length} entries, no remoteConfig provided)`);
                } else {
                    loggerInterface.info('remote', 'Changelog source: none (no static entries, no remoteConfig provided)');
                }
                return;
            }

            const {
                changelogUrl,
                cacheKeyChangelog = `${scriptId}-remote-changelog`,
                cacheTtlMs = 3600000
            } = remoteConfig;

            // Store fetch coordinates so changelogInterface.show() can force-refresh later.
            _changelogMeta.url        = changelogUrl;
            _changelogMeta.cacheKey   = cacheKeyChangelog;
            _changelogMeta.cacheTtlMs = cacheTtlMs;

            const localCount = _changelog.length;

            const { data, fromCache, error } = await fetchCachedText(changelogUrl, cacheKeyChangelog, cacheTtlMs);

            if (!data) {
                loggerInterface.warn('remote', `Changelog not available remotely: ${error}`);
                if (localCount > 0) {
                    loggerInterface.warn('remote', `Changelog source: falling back to ${localCount} static (local) entries`);
                } else {
                    loggerInterface.warn('remote', 'Changelog source: none (remote failed, no static entries available as fallback)');
                }
                return;
            }

            try {
                const entries = JSON.parse(data);
                // Replace _changelog in place so any existing reference stays valid
                _changelog.length = 0;
                entries.forEach(e => _changelog.push(e));

                _changelogMeta.fromCache = fromCache;
                _changelogMeta.fetchedAt = Date.now();

                loggerInterface.info('remote', `Changelog source: remote — replaced ${localCount} local entr${localCount === 1 ? 'y' : 'ies'} with ${_changelog.length} remote entries (fromCache=${fromCache})`);

                if (typeof GM_registerMenuCommand !== 'undefined' && _changelog.length > 0) {
                    GM_registerMenuCommand('📜 ChangeLog', () => changelogInterface.show());
                }
            } catch (err) {
                loggerInterface.warn('remote', `Failed to parse remote changelog JSON: ${err.message}`);
                if (localCount > 0) {
                    loggerInterface.warn('remote', `Changelog source: falling back to ${localCount} static (local) entries due to parse error`);
                }
            }
        };

        // ── Initialisation ────────────────────────────────────────────────────────
        settingsInterface.init();
        setupMenus();
        initRemoteContent(); // non-blocking async

        // ── Public API ────────────────────────────────────────────────────────────
        return {
            settings:          settingsInterface.values, // Exposed as simple property
            settingsInterface: settingsInterface,
            showSettings:      () => settingsInterface.showModal(), // for configuration button
            log:     loggerInterface.log.bind(loggerInterface),
            debug:   loggerInterface.debug.bind(loggerInterface),
            info:    loggerInterface.info.bind(loggerInterface),
            warn:    loggerInterface.warn.bind(loggerInterface),
            error:   loggerInterface.error.bind(loggerInterface),
            time:    loggerInterface.time.bind(loggerInterface),
            timeEnd: loggerInterface.timeEnd.bind(loggerInterface),
            // Remote content helpers (require @grant GM_xmlhttpRequest in consumer script)
            fetchRemoteText,
            fetchCachedText,
            // Custom dialog helpers — available to all consumer scripts
            showCustomDialog,
            showCustomAlert,
            showCustomConfirm,
            get prefix()    { return loggerInterface.prefix; },
            set prefix(val) { loggerInterface.prefix = val; }
        };
    };
})();
