// ==UserScript==
// @name         VZ: MusicBrainz - Unified Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      3.2.0+2026-02-23
// @description  Unified library for Logging, Settings, and Changelog management
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
//     {version: '3.2.0+2026-02-23', description: 'Settings modal ghost-row root-cause fix: each collapsed section-header <tr> was contributing exactly 1px to a cumulative white ghost strip below the table. The border-bottom:1px solid rgba(255,255,255,0.2) on the <tr> (or <td> from v3.1) was the source — in border-collapse:collapse mode not all browsers consistently collapse TR-level borders, so each one rendered as a distinct 1px strip when the adjacent config-rows were display:none. Fix: removed all border-bottom declarations from both the <tr> and <td> in the section-header template; instead injected a scoped <style> block into the container with two rules — .section-header:not(.collapsed) > td { border-bottom: 1px solid rgba(255,255,255,0.2) } and .section-header.collapsed > td { border-bottom: none }. CSS class toggling already applied by applySectionCollapse means the border is present only when the section is expanded (where it provides visual separation from the config rows below) and completely absent when collapsed (so zero pixels are contributed to the ghost row).'},
//     {version: '3.1.0+2026-02-22', description: 'Settings modal ghost-shadow-row eliminated: the sticky Save-button footer had box-shadow:0 -8px 18px rgba(0,0,0,0.08) which cast an upward shadow into the scrollable content <div>. When sections are collapsed, the scroll area shrinks and the shadow bleeds further — each additionally-collapsed section made the ghost strip slightly taller. Fix: removed box-shadow from the footer entirely; the separator is now a slightly stronger border-top:2px solid #cdd which provides a clean visual line with no overflow bleed.'},
//     {version: '3.0.0+2026-02-22', description: 'Two improvements: (1) Settings modal shadow fix: added overflow:hidden (alongside existing overflow-y:auto) to the scrollable content <div> so the sticky footer\'s upward box-shadow (0 -8px 18px rgba(0,0,0,0.08)) is clipped before it bleeds into the empty scroll area when all sections are collapsed — this eliminates the ghost shadow strip visible from the resize-handle area rightward. (2) JSDoc documentation added to all previously undocumented inner functions: applySectionCollapse (settings modal), buildShortcutString, enterCaptureMode, exitCaptureMode (keyboard-shortcut capture widget).'},
//     {version: '2.9.0+2026-02-22', description: 'Settings modal shadow fix: moved the linear-gradient background from the <tr> element of each collapsible section-header row to its <td colspan="3"> child. A background on a <tr> is painted behind the cell area, but during resize transitions the browser may render the gradient beyond the visible TD bounds (from the resize-handle position leftward), producing a ghost shadow strip. Painting the gradient directly on the <td> confines it to the cell\'s own box and eliminates the artifact entirely.'},
//     {version: '2.8.0+2026-02-22', description: 'Keyboard shortcut capture widget: buildShortcutString now uppercases single alphabetic key characters (a-z → A-Z) before writing the combo into the text input, so capturing Ctrl+M records "Ctrl+M" rather than "Ctrl+m". Non-letter keys (digits, punctuation, function keys, etc.) are stored verbatim as before.'},
//     {version: '2.7.0+2026-02-22', description: 'Settings modal: all collapsible sections now start collapsed by default when the modal opens. The collapse-all bulk button label is initialised to "⬇ Uncollapse all sections" and allSectionsCollapsed is set to true immediately after the section-header click handlers are wired up, so the first click on the button correctly expands all sections.'},
//     {version: '2.6.0+2026-02-22', description: 'Settings modal: "⬆ Collapse all sections" / "⬇ Uncollapse all sections" toggle button added right-aligned next to the search input. The per-section collapse/expand logic is extracted into a shared applySectionCollapse(header, shouldCollapse) helper used by both individual header clicks and the new bulk button, keeping behaviour (arrow glyph, config-row visibility, mb-pd-subgrid open-state awareness) identical to the previous per-click implementation.'},
//     {version: '2.5.0+2026-02-21', description: 'New setting type "keyboard_shortcut": schema entries with type="keyboard_shortcut" render a readonly text input plus a 🎹 Capture button. Clicking Capture enters key-interception mode (capture-phase keydown listener); the next key combination pressed (e.g. Ctrl+Shift+M, Alt+X) is serialised to a "Mod+Mod+Key" string matching parsePrefixShortcut() expectations and written into the text input. Esc or a second click on the button cancels capture without changing the value. Pure modifier keypresses (Ctrl alone, etc.) are ignored — the widget waits for a non-modifier key. The existing save/reset handlers work unchanged since the widget value is stored in a standard text input.'},
//     {version: '2.4.0+2026-02-21', description: 'New setting type "popup_dialog": schema entries with type="popup_dialog" and a fields:[...] array get a custom sub-editor in the settings modal instead of a plain text box. The hidden master <input> holds the full pipe-joined value (save handler unchanged). An "✏️ Edit fields" toggle button reveals a sub-grid <tr> with one labelled text-input per pipe-field. Sub-input changes sync back to the master hidden input in real time. Section collapse/expand correctly respects the toggle\'s open/closed state via data-pd-open tracking. Reset repopulates all sub-inputs. HTML attribute values are double-quote escaped to handle font-family strings safely.'},
//     {version: '2.3.0+2026-02-16', description: 'Expose settings interface for configuration button in main userscript'},
//     {version: '2.2.0+2026-02-14', description: 'Drag anywhere, Sticky table header, Collapsible logical sections, Real-time search'},
//     {version: '2.1.0+2026-02-14', description: 'Keep header + footer fixed while entries scroll + Esc key handling'},
//     {version: '2.0.0+2026-02-14', description: 'Support dividers + modern UI design'},
//     {version: '1.1.0+2026-02-11', description: 'Enable passing a function to the library constructor that dynamically checks the debug logging flag'},
//     {version: '1.0.0+2026-02-11', description: 'Expose an additional "warn" method'},
//     {version: '0.9.3+2026-02-02', description: 'Expose loggerInterface.prefix with getter/setter'},
//     {version: '0.9.2+2026-01-31', description: '1st official release version.'}
// ];

"use strict";

const VZ_MBLibrary = (function() {
    return function(scriptId, scriptName, configSchema = null, changelog = null, debugEnabled = true) {
        const timers = new Map();
        // Support both static boolean and dynamic function for debug checking
        const isDebugEnabled = () => {
            if (typeof debugEnabled === 'function') {
                return debugEnabled();
            }
            return debugEnabled;
        };

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
            getTimestamp() {
                const now = new Date();
                return now.toISOString().split('T')[1].replace('Z', ''); // e.g., 14:20:05.123
            },
            log(level, icon, msg, data = '') {
                if (!isDebugEnabled() && level === 'debug') return;
                const style = this.styles[level] || '';
                const iconChar = this.icons[icon] || '📝';
                const time = this.getTimestamp();
                console.log(`%c${time} %c${this.prefix} ${iconChar} ${msg}`, this.styles.timestamp, style, data);
            },
            time(label) { timers.set(label, performance.now()); },
            timeEnd(label, icon = 'timer') {
                const start = timers.get(label);
                if (start) {
                    const duration = (performance.now() - start).toFixed(2);
                    this.log('timer', icon, `${label}: ${duration}ms`);
                    timers.delete(label);
                }
            },
            debug(icon, msg, data) { this.log('debug', icon, msg, data); },
            info(icon, msg, data) { this.log('info', icon, msg, data); },
            warn(icon, msg, data) { this.log('warn', icon, msg, data); },
            error(icon, msg, data) { this.log('error', 'error', msg, data); }
        };

        // --- 2. Settings Logic ---
        const settingsInterface = {
            values: {},
            init: function() {
                if (!configSchema) return;
                for (const key in configSchema) {
                    this.values[key] = GM_getValue(key, configSchema[key].default);
                }
            },
            // Helper to determine if text should be black or white based on background hex
            getContrastYIQ: function(hexcolor) {
                hexcolor = hexcolor.replace("#", "");
                const r = parseInt(hexcolor.substr(0, 2), 16);
                const g = parseInt(hexcolor.substr(2, 2), 16);
                const b = parseInt(hexcolor.substr(4, 2), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                return (yiq >= 128) ? 'black' : 'white';
            },
            applyColorPreview: function(inputId, color) {
                const input = document.getElementById(inputId);
                const btn = document.getElementById(`${inputId}-picker-btn`);
                if (input) {
                    input.style.backgroundColor = color;
                    input.style.color = this.getContrastYIQ(color);
                }
                if (btn) {
                    btn.style.backgroundColor = color;
                }
            },
            save: function(newValues) {
                for (const key in newValues) {
                    GM_setValue(key, newValues[key]);
                }
                loggerInterface.info('init', "Settings saved. Reloading...");
                location.reload();
            },
            showModal: function () {
                if (!configSchema) return;

                const sizeKey = `${scriptId}-modal-size`;

                const savedSize = GM_getValue(sizeKey, {
                    width: 920,
                    height: 680
                });

                const overlay = document.createElement("div");
                overlay.id = `${scriptId}-settings-overlay`;

                Object.assign(overlay.style, {
                    position: 'fixed',
                    inset: '0',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)',
                    zIndex: '10000',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                });

                const container = document.createElement("div");
                container.id = `${scriptId}-config-container`;

                Object.assign(container.style, {
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    padding: '20px',
                    color: '#222',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    width: savedSize.width + 'px',
                    height: savedSize.height + 'px',
                    minWidth: '720px',
                    minHeight: '480px',
                    maxWidth: '95vw',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
                    border: '1px solid #ddd',
                    transform: 'scale(0.96)',
                    opacity: '0',
                    transition: 'all 0.18s ease'
                });

                /* ================= BUILD TABLE ================= */

                let currentSection = null;
                let tableRows = '';
                let rowIndex = 0;

                Object.entries(configSchema).forEach(([key, cfg]) => {

                    if (cfg.type === 'divider') {
                        currentSection = key;
                        tableRows += `
                            <tr class="section-header" data-section="${key}"
                                style="
                                    cursor:pointer;
                                    color:white;
                                ">
                                <td colspan="3" style="
                                    padding:10px 14px;
                                    font-weight:600;
                                    background:linear-gradient(to right,#6c7a89,#8fa3b5,#6c7a89);
                                ">
                                    ▼ ${cfg.label}
                                </td>
                            </tr>`;
                        return;
                    }

                    const inputId = `${scriptId}-input-${key}`;
                    const isCheck = cfg.type === "checkbox";
                    const isNumber = cfg.type === "number";
                    const isColor = cfg.type === "color_picker";
                    const isPopupDialog = cfg.type === "popup_dialog";
                    const isKeyboardShortcut = cfg.type === "keyboard_shortcut";

                    // HTML-escape helper for attribute values (handles quotes in font-family etc.)
                    const escAttr = s => String(s)
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');

                    const valAttr = isCheck
                        ? (this.values[key] ? 'checked' : '')
                        : `value="${escAttr(this.values[key])}"`;

                    let inputHtml = '';
                    let subgridRow = '';  // extra <tr> appended after the main config row

                    if (isCheck) {
                        inputHtml = `<input type="checkbox" id="${inputId}" ${valAttr}>`;
                    } else if (isNumber) {
                        inputHtml = `<input type="number" id="${inputId}" ${valAttr}
                                     min="${cfg.min || 0}" max="${cfg.max || 100}"
                                     style="width:90px;">`;
                    } else if (isPopupDialog) {
                        // ---- custom pipe-field sub-editor ----
                        // The hidden master input carries the full pipe-joined value so the
                        // existing save handler (input.value) needs no modification.
                        const fields = cfg.fields || [];
                        const currentParts = String(this.values[key]).split('|');

                        const subInputsHtml = fields.map((fieldName, fi) => `
                            <label style="display:flex;align-items:center;gap:5px;font-size:0.82em;">
                                <span style="min-width:110px;text-align:right;color:#555;font-weight:600;
                                             white-space:nowrap;">${escAttr(fieldName)}:</span>
                                <input type="text"
                                       class="mb-pd-sub"
                                       data-master="${inputId}"
                                       data-index="${fi}"
                                       value="${escAttr(currentParts[fi] !== undefined ? currentParts[fi] : '')}"
                                       style="width:200px;padding:2px 5px;border:1px solid #bbb;
                                              border-radius:3px;font-size:0.95em;font-family:monospace;">
                            </label>`).join('');

                        inputHtml = `
                            <input type="hidden" id="${inputId}" value="${escAttr(this.values[key])}">
                            <button type="button" id="${inputId}-toggle"
                                    style="font-size:0.8em;padding:2px 8px;cursor:pointer;
                                           border:1px solid #aaa;border-radius:4px;background:#f0f0f0;
                                           vertical-align:middle;">
                                ✏️ Edit fields
                            </button>`;

                        // Sub-grid row — class mb-pd-subgrid keeps it separate from .config-row
                        // so section collapse/expand can respect the toggle's open state
                        subgridRow = `
                            <tr id="${inputId}-subgrid"
                                class="mb-pd-subgrid"
                                data-section="${currentSection || ''}"
                                data-pd-open="false"
                                style="display:none;background:#eef2f8;border-bottom:1px solid #d8dfe8;">
                                <td colspan="3" style="padding:10px 20px 12px 20px;">
                                    <div style="display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;">
                                        ${subInputsHtml}
                                    </div>
                                </td>
                            </tr>`;
                    } else if (isKeyboardShortcut) {
                        // ---- keyboard shortcut capture widget ----
                        // A readonly text input shows the current value; a capture button
                        // listens for the next keydown and serialises it to "Ctrl+Shift+X" etc.
                        inputHtml = `
                            <input type="text" id="${inputId}" ${valAttr} readonly
                                   style="width:130px;padding:3px 6px;border:1px solid #ccc;
                                          border-radius:4px;font-family:monospace;cursor:default;">
                            <button type="button" id="${inputId}-capture-btn"
                                    data-capturing="false"
                                    style="margin-left:5px;font-size:0.8em;padding:2px 8px;
                                           cursor:pointer;border:1px solid #aaa;border-radius:4px;
                                           background:#f0f0f0;vertical-align:middle;">
                                🎹 Capture
                            </button>`;
                    } else {
                        inputHtml = `<input type="text" id="${inputId}" ${valAttr}
                                     style="width:170px;padding:3px 6px;border:1px solid #ccc;border-radius:4px;">`;
                    }

                    if (isColor) {
                        inputHtml += `
                            <button id="${inputId}-picker-btn"
                                    type="button"
                                    style="margin-left:6px;width:26px;height:26px;border-radius:4px;cursor:pointer;border:1px solid #aaa;">
                                🎨
                            </button>`;
                    }

                    const stripe = rowIndex % 2 === 0 ? '#fafafa' : '#f4f6f8';
                    rowIndex++;

                    tableRows += `
                        <tr class="config-row"
                            data-section="${currentSection || ''}"
                            style="
                                background:${stripe};
                                border-bottom:1px solid #e3e6ea;
                                transition:background 0.15s ease;
                            ">
                            <th style="text-align:left;width:240px;vertical-align:top;padding:8px 10px;font-weight:500;">
                                ${cfg.label}: ${inputHtml}
                            </th>
                            <td style="width:130px;text-align:center;opacity:.5;padding:8px 10px;
                                       word-break:break-all;font-size:0.8em;">
                                ${isPopupDialog ? '(pipe-separated)' : escAttr(String(cfg.default))}
                            </td>
                            <td style="white-space:normal;word-break:break-word;min-width:350px;padding:8px 10px;color:#555;">
                                ${cfg.description}
                            </td>
                        </tr>`;

                    // Append sub-grid row immediately after the main row (popup_dialog only)
                    if (subgridRow) tableRows += subgridRow;
                });

                container.innerHTML = `
                    <style>
                        /* Border only when section is expanded — eliminates the 1-px-per-section
                           ghost row that appeared when all sections were collapsed. */
                        .section-header:not(.collapsed) > td {
                            border-bottom: 1px solid rgba(255,255,255,0.2);
                        }
                        .section-header.collapsed > td {
                            border-bottom: none;
                        }
                    </style>
                    <div id="${scriptId}-drag-header" style="cursor:move;user-select:none;margin-bottom:8px;">
                        <p style="text-align:right;margin:0 0 6px 0;">
                            <a id="${scriptId}-reset" style="cursor:pointer;font-weight:600;color:#555;">RESET</a> |
                            <a id="${scriptId}-close" style="cursor:pointer;font-weight:600;color:#555;">CLOSE</a>
                        </p>
                        <h3 style="margin:4px 0;font-size:18px;font-weight:600;color:#222;">
                            ${scriptName.toUpperCase()}
                        </h3>
                        <h2 style="margin:4px 0;font-size:18px;font-weight:600;color:ffd700;">
                            Settings are applied IMMEDIATELY upon saving.
                        </h2>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                            <input id="${scriptId}-search"
                                   placeholder="🔍 Search settings..."
                                   style="
                                       flex:1;
                                       padding:7px 10px;
                                       border-radius:6px;
                                       border:1px solid #ccc;
                                   ">
                            <button type="button"
                                    id="${scriptId}-collapse-all-btn"
                                    style="
                                        white-space:nowrap;
                                        padding:5px 10px;
                                        font-size:1.0em;
                                        cursor:pointer;
                                        border:1px solid #aaa;
                                        border-radius:4px;
                                        background:#f0f0f0;
                                        flex-shrink:0;
                                    ">
                                ⬆ Collapse all sections
                            </button>
                        </div>
                    </div>

                    <div style="flex:1;overflow-y:auto;background:#f9f9fb;border-radius:8px;">
                        <table style="width:100%;border-collapse:collapse;">
                            <thead style="position:sticky;top:0;background:#e8ebef;border-bottom:1px solid #d0d4da;">
                                <tr>
                                    <th style="width:240px;padding:8px 10px;text-align:left;">Setting</th>
                                    <th style="width:130px;padding:8px 10px;">Default</th>
                                    <th style="padding:8px 10px;text-align:left;">Description</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>

                    <div style="
                        position:sticky;
                        bottom:0;
                        background:#fff;
                        padding:14px 0 6px 0;
                        text-align:right;
                        border-top:2px solid #cdd;
                    ">
                        <button id="${scriptId}-save-btn"
                            style="
                                padding:9px 20px;
                                font-weight:600;
                                border-radius:8px;
                                border:1px solid #4CAF50;
                                background:#4CAF50;
                                color:white;
                                cursor:pointer;
                                transition:all 0.15s ease;
                            ">
                            SAVE
                        </button>
                    </div>

                    <div id="${scriptId}-resize-handle"
                         style="
                            position:absolute;
                            width:20px;
                            height:20px;
                            right:6px;
                            bottom:6px;
                            cursor:nwse-resize;
                            opacity:0.6;
                            background:
                                linear-gradient(135deg, transparent 45%, #999 45%, #999 55%, transparent 55%);
                         ">
                    </div>

                    <div id="${scriptId}-picker-container"
                         style="position:absolute;display:none;background:#fff;
                                border:1px solid #ccc;padding:10px;z-index:10001;
                                box-shadow:0 8px 25px rgba(0,0,0,0.2);">
                    </div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                requestAnimationFrame(() => {
                    container.style.transform = 'scale(1)';
                    container.style.opacity = '1';
                });

                /* ================= DRAGGING ================= */

                const dragHeader = document.getElementById(`${scriptId}-drag-header`);
                let isDragging = false;
                let isResizing = false;
                let offsetX, offsetY;

                dragHeader.addEventListener("mousedown", e => {
                    isDragging = true;
                    offsetX = e.clientX - container.offsetLeft;
                    offsetY = e.clientY - container.offsetTop;
                    container.style.position = 'absolute';
                });

                document.addEventListener("mousemove", e => {
                    if (isDragging) {
                        container.style.left = `${e.clientX - offsetX}px`;
                        container.style.top = `${e.clientY - offsetY}px`;
                    }

                    if (isResizing) {
                        const rect = container.getBoundingClientRect();
                        container.style.width =
                            Math.max(720, Math.min(window.innerWidth * 0.95, e.clientX - rect.left)) + 'px';
                        container.style.height =
                            Math.max(480, Math.min(window.innerHeight * 0.92, e.clientY - rect.top)) + 'px';
                    }
                });

                document.addEventListener("mouseup", () => {
                    if (isResizing) {
                        GM_setValue(sizeKey, {
                            width: container.offsetWidth,
                            height: container.offsetHeight
                        });
                    }
                    isDragging = false;
                    isResizing = false;
                });

                document.getElementById(`${scriptId}-resize-handle`)
                    .addEventListener("mousedown", (e) => {
                        e.stopPropagation();
                        isResizing = true;
                    });

                /* ================= COLLAPSIBLE SECTIONS ================= */

                // Helper: apply a definitive collapse/expand state to one section header
                // and all rows that belong to it.
                //   collapsed=true  → collapse (hide rows, show ▶)
                //   collapsed=false → expand   (show rows, show ▼)
                // Handles both .config-row rows and .mb-pd-subgrid sub-rows
                // (sub-rows are only re-shown on expand when data-pd-open="true").
                /**
                 * Applies a definitive collapsed or expanded state to a single settings section.
                 * Toggles the ▼/▶ arrow indicator in the header, hides/shows all `.config-row`
                 * rows that belong to the section, and respects the popup-dialog sub-grid
                 * open/closed state when re-expanding.
                 * @param {HTMLTableRowElement} header - The `.section-header` <tr> element to toggle
                 * @param {boolean} collapsed - true to collapse (hide rows), false to expand (show rows)
                 */
                function applySectionCollapse(header, collapsed) {
                    const section = header.dataset.section;

                    if (collapsed) {
                        header.classList.add('collapsed');
                    } else {
                        header.classList.remove('collapsed');
                    }

                    // Flip the ▼/▶ indicator inside the header <td>
                    header.innerHTML = header.innerHTML.replace(
                        collapsed ? '▼' : '▶',
                        collapsed ? '▶' : '▼'
                    );

                    // Config rows
                    document.querySelectorAll(`.config-row[data-section="${section}"]`)
                        .forEach(row => { row.style.display = collapsed ? 'none' : ''; });

                    // popup_dialog sub-grid rows — always hide on collapse;
                    // on expand only restore if the user had explicitly opened them.
                    document.querySelectorAll(`.mb-pd-subgrid[data-section="${section}"]`)
                        .forEach(row => {
                            if (collapsed) {
                                row.style.display = 'none';
                            } else if (row.dataset.pdOpen === 'true') {
                                row.style.display = '';
                            }
                        });
                }

                document.querySelectorAll('.section-header').forEach(header => {
                    header.addEventListener('click', () => {
                        // Invert the current collapsed state and apply it.
                        const nowCollapsed = !header.classList.contains('collapsed');
                        applySectionCollapse(header, nowCollapsed);
                    });
                });

                /* ================= DEFAULT: COLLAPSE ALL ON OPEN ================= */

                // Collapse every section immediately so the user sees a compact overview
                // and can expand only the section(s) they want to edit.
                document.querySelectorAll('.section-header').forEach(header => {
                    applySectionCollapse(header, true);
                });

                /* ================= COLLAPSE-ALL BUTTON ================= */

                // Tracks the bulk collapsed/expanded state so the button label stays
                // in sync across repeated clicks regardless of per-header manual clicks.
                // Initialised to true because we just collapsed everything above.
                let allSectionsCollapsed = true;

                // Reflect the initial collapsed state in the button label.
                document.getElementById(`${scriptId}-collapse-all-btn`).textContent =
                    '⬇ Uncollapse all sections';

                document.getElementById(`${scriptId}-collapse-all-btn`)
                    .addEventListener('click', () => {
                        allSectionsCollapsed = !allSectionsCollapsed;

                        document.querySelectorAll('.section-header').forEach(header => {
                            applySectionCollapse(header, allSectionsCollapsed);
                        });

                        document.getElementById(`${scriptId}-collapse-all-btn`).textContent =
                            allSectionsCollapsed
                                ? '⬇ Uncollapse all sections'
                                : '⬆ Collapse all sections';
                    });

                /* ================= SEARCH ================= */

                document.getElementById(`${scriptId}-search`)
                    .addEventListener("input", e => {
                        const term = e.target.value.toLowerCase();
                        document.querySelectorAll(".config-row").forEach(row => {
                            row.style.display =
                                row.innerText.toLowerCase().includes(term)
                                    ? ""
                                    : "none";
                        });
                    });

                /* ================= POPUP DIALOG FIELD EDITORS ================= */

                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'popup_dialog') return;

                    const inputId = `${scriptId}-input-${key}`;
                    const masterInput = document.getElementById(inputId);
                    const toggleBtn  = document.getElementById(`${inputId}-toggle`);
                    const subgrid    = document.getElementById(`${inputId}-subgrid`);

                    if (!masterInput || !toggleBtn || !subgrid) return;

                    // Toggle button: show/hide sub-grid, track state in data-pd-open
                    toggleBtn.addEventListener('click', () => {
                        const nowOpen = subgrid.style.display === 'none' || subgrid.style.display === '';
                        const willOpen = subgrid.dataset.pdOpen !== 'true';
                        subgrid.style.display = willOpen ? '' : 'none';
                        subgrid.dataset.pdOpen = willOpen ? 'true' : 'false';
                        toggleBtn.textContent = willOpen ? '▲ Collapse' : '✏️ Edit fields';
                    });

                    // Sub-input → master hidden input sync
                    subgrid.querySelectorAll('.mb-pd-sub').forEach(sub => {
                        sub.addEventListener('input', () => {
                            const allSubs = Array.from(
                                subgrid.querySelectorAll('.mb-pd-sub')
                            ).sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
                            masterInput.value = allSubs.map(s => s.value).join('|');
                        });
                    });
                });

                /* ================= KEYBOARD SHORTCUT CAPTURE ================= */

                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== 'keyboard_shortcut') return;

                    const inputId = `${scriptId}-input-${key}`;
                    const ksInput  = document.getElementById(inputId);
                    const captureBtn = document.getElementById(`${inputId}-capture-btn`);

                    if (!ksInput || !captureBtn) return;

                    // Serialise a KeyboardEvent to a "Mod+Mod+Key" string.
                    // Returns null when the event is a bare modifier keypress (nothing useful yet).
                    /**
                     * Serialises a KeyboardEvent into a human-readable shortcut string such as
                     * "Ctrl+Shift+M" or "Alt+X".  Single alphabetic keys are uppercased for
                     * readability (e.g. "Ctrl+m" → "Ctrl+M").
                     * @param {KeyboardEvent} e - The keyboard event to serialise
                     * @returns {string|null} The shortcut string, or null if only a bare modifier was pressed
                     */
                    function buildShortcutString(e) {
                        const parts = [];
                        if (e.ctrlKey)  parts.push('Ctrl');
                        if (e.altKey)   parts.push('Alt');
                        if (e.shiftKey) parts.push('Shift');
                        // Only add Meta when Ctrl is NOT pressed (avoid duplicate cross-platform noise)
                        if (e.metaKey && !e.ctrlKey) parts.push('Meta');
                        const rawKey = e.key;
                        if (['Control', 'Alt', 'Shift', 'Meta'].includes(rawKey)) return null;
                        // Upcase single alphabetic characters for readability (Ctrl+m → Ctrl+M)
                        const displayKey = (rawKey.length === 1 && /[a-z]/i.test(rawKey))
                            ? rawKey.toUpperCase()
                            : rawKey;
                        parts.push(displayKey);
                        return parts.join('+');
                    }

                    let captureHandler = null;

                    /**
                     * Activates keyboard-capture mode for the shortcut input widget.
                     * Visually highlights the capture button, registers a capture-phase
                     * keydown listener that intercepts the next non-modifier key combination,
                     * and writes the resulting shortcut string into the associated text input.
                     * Pressing Escape cancels without changing the stored value.
                     */
                    function enterCaptureMode() {
                        captureBtn.dataset.capturing = 'true';
                        captureBtn.textContent = '⌛ Press keys… (Esc=cancel)';
                        captureBtn.style.background = '#ffe082';
                        captureBtn.style.borderColor = '#f9a825';
                        ksInput.style.borderColor = '#f9a825';

                        captureHandler = function(e) {
                            e.preventDefault();
                            e.stopPropagation();

                            if (e.key === 'Escape') {
                                exitCaptureMode(null); // cancel, keep old value
                                return;
                            }

                            const combo = buildShortcutString(e);
                            if (combo === null) return; // pure modifier — keep waiting
                            exitCaptureMode(combo);
                        };

                        // Capture phase so it intercepts before page-level handlers
                        document.addEventListener('keydown', captureHandler, true);
                    }

                    /**
                     * Deactivates keyboard-capture mode: restores the capture button's
                     * default appearance, removes the capture-phase keydown listener, and
                     * optionally writes a new shortcut string into the text input.
                     * @param {string|null} combo - The captured shortcut string (e.g. "Ctrl+M"),
                     *   or null to cancel without changing the current value
                     */
                    function exitCaptureMode(combo) {
                        captureBtn.dataset.capturing = 'false';
                        captureBtn.textContent = '🎹 Capture';
                        captureBtn.style.background = '#f0f0f0';
                        captureBtn.style.borderColor = '#aaa';
                        ksInput.style.borderColor = '#ccc';

                        if (captureHandler) {
                            document.removeEventListener('keydown', captureHandler, true);
                            captureHandler = null;
                        }

                        if (combo !== null) {
                            ksInput.value = combo;
                        }
                    }

                    captureBtn.addEventListener('click', () => {
                        if (captureBtn.dataset.capturing === 'true') {
                            exitCaptureMode(null); // second click cancels
                        } else {
                            enterCaptureMode();
                        }
                    });
                });

                /* ================= COLOR PICKER (iro.js preserved!) ================= */

                const pickerContainer = document.getElementById(`${scriptId}-picker-container`);

                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type !== "color_picker") return;

                    const inputId = `${scriptId}-input-${key}`;
                    const input = document.getElementById(inputId);
                    const btn = document.getElementById(`${inputId}-picker-btn`);

                    this.applyColorPreview(inputId, this.values[key]);

                    input.addEventListener('input', e => {
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                            this.applyColorPreview(inputId, e.target.value);
                        }
                    });

                    btn.onclick = (e) => {
                        e.stopPropagation();
                        pickerContainer.innerHTML = '';
                        pickerContainer.style.display = 'block';
                        pickerContainer.style.top = `${btn.offsetTop + 30}px`;
                        pickerContainer.style.left = `${btn.offsetLeft}px`;

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
                            loggerInterface.error('error', "iro.js library not found!");
                            pickerContainer.textContent = "iro.js missing";
                        }
                    };
                });

                overlay.addEventListener("click", e => {
                    if (e.target === overlay) closeDialog();
                    if (!pickerContainer.contains(e.target)) {
                        pickerContainer.style.display = 'none';
                    }
                });

                /* ================= SAVE / RESET ================= */

                const closeDialog = () => {
                    container.style.transform = 'scale(0.95)';
                    container.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(overlay))
                            document.body.removeChild(overlay);
                    }, 150);
                };

                document.getElementById(`${scriptId}-save-btn`).onclick = () => {
                    const newValues = {};
                    for (const key in configSchema) {
                        if (configSchema[key].type === 'divider') continue;
                        const input = document.getElementById(`${scriptId}-input-${key}`);
                        newValues[key] = configSchema[key].type === "checkbox"
                            ? input.checked
                            : input.value;
                    }
                    this.save(newValues);
                    closeDialog();
                };

                document.getElementById(`${scriptId}-reset`).onclick = () => {
                    for (const key in configSchema) {
                        if (configSchema[key].type === 'divider') continue;
                        const inputId = `${scriptId}-input-${key}`;
                        const input = document.getElementById(inputId);
                        if (!input) continue;

                        if (configSchema[key].type === "checkbox") {
                            input.checked = configSchema[key].default;
                        } else {
                            input.value = configSchema[key].default;

                            if (configSchema[key].type === "color_picker") {
                                this.applyColorPreview(inputId, configSchema[key].default);
                            } else if (configSchema[key].type === "popup_dialog") {
                                // Also reset each sub-input to the default pipe-field value
                                const parts = String(configSchema[key].default).split('|');
                                const subgrid = document.getElementById(`${inputId}-subgrid`);
                                if (subgrid) {
                                    const subs = Array.from(subgrid.querySelectorAll('.mb-pd-sub'))
                                        .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
                                    subs.forEach((sub, i) => { sub.value = parts[i] !== undefined ? parts[i] : ''; });
                                }
                            }
                        }
                    }
                };

                document.getElementById(`${scriptId}-close`).onclick = closeDialog;

                // Note: a few browser shortcuts (Ctrl+N, Ctrl+T, Ctrl+W) are
                // handled at the OS/browser level and cannot be suppressed by JS in
                // unprivileged content-script contexts; preventDefault() still works
                // for the majority of in-browser defaults (Ctrl+F, Ctrl+L, …).

                window.addEventListener("keydown", e => {
                    if (e.key === "Escape") closeDialog();
                });
            }
        };

        // --- 3. Changelog Logic ---
        const changelogInterface = {
            show: function () {
                if (!changelog || changelog.length === 0) return;

                const sizeKey = `${scriptId}-changelog-size`;

                const savedSize = GM_getValue(sizeKey, {
                    width: 800,
                    height: 550
                });

                const overlay = document.createElement("div");

                Object.assign(overlay.style, {
                    position: 'fixed',
                    inset: '0',
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)',
                    zIndex: '3000009',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                });

                const container = document.createElement("div");

                Object.assign(container.style, {
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    padding: '20px',
                    color: '#222',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    width: savedSize.width + 'px',
                    height: savedSize.height + 'px',
                    minWidth: '600px',
                    minHeight: '400px',
                    maxWidth: '95vw',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
                    border: '1px solid #ddd',
                    transform: 'scale(0.96)',
                    opacity: '0',
                    transition: 'all 0.18s ease'
                });

                /* ================= BUILD CHANGELOG TABLE ================= */

                let rows = '';
                let i = 0;

                changelog.forEach(entry => {

                    const stripe = i % 2 === 0 ? '#fafafa' : '#f4f6f8';
                    i++;

                    rows += `
                        <tr style="
                            background:${stripe};
                            border-bottom:1px solid #e3e6ea;
                        ">
                            <td style="padding:8px 12px; width:200px;">
                                <i>${entry.version}</i>
                            </td>
                            <td style="padding:8px 12px; color:#444;">
                                ${entry.description}
                            </td>
                        </tr>`;
                });

                container.innerHTML = `
                    <div id="${scriptId}-changelog-drag"
                         style="cursor:move;user-select:none;margin-bottom:12px;">
                        <p style="text-align:right;margin:0 0 6px 0;">
                            <a id="${scriptId}-changelog-close"
                               style="cursor:pointer;font-weight:600;color:#555;">
                                CLOSE
                            </a>
                        </p>
                        <h3 style="margin:4px 0;font-size:18px;font-weight:600;color:#222;">
                            ${scriptName.toUpperCase()} — CHANGELOG
                        </h3>
                    </div>

                    <div style="flex:1;overflow-y:auto;background:#f9f9fb;border-radius:8px;">
                        <table style="width:100%;border-collapse:collapse;">
                            <thead style="position:sticky;top:0;background:#e8ebef;border-bottom:1px solid #d0d4da;">
                                <tr>
                                    <th style="padding:8px 12px;text-align:left;width:100px;">Version</th>
                                    <th style="padding:8px 12px;text-align:left;">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>

                    <div style="
                        position:sticky;
                        bottom:0;
                        background:#fff;
                        padding:12px 0 4px 0;
                        text-align:right;
                        box-shadow: 0 -8px 18px rgba(0,0,0,0.08);
                        border-top:1px solid #ddd;
                    ">
                        <button id="${scriptId}-changelog-close-btn"
                            style="
                                padding:8px 18px;
                                font-weight:600;
                                border-radius:8px;
                                border:1px solid #888;
                                background:#eee;
                                cursor:pointer;">
                            CLOSE
                        </button>
                    </div>

                    <div id="${scriptId}-changelog-resize"
                         style="
                            position:absolute;
                            width:20px;
                            height:20px;
                            right:6px;
                            bottom:6px;
                            cursor:nwse-resize;
                            opacity:0.6;
                            background:
                                linear-gradient(135deg, transparent 45%, #999 45%, #999 55%, transparent 55%);
                         ">
                    </div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                requestAnimationFrame(() => {
                    container.style.transform = 'scale(1)';
                    container.style.opacity = '1';
                });

                /* ================= DRAGGING ================= */

                const dragHeader = container.querySelector(`#${scriptId}-changelog-drag`);

                let isDragging = false;
                let isResizing = false;
                let offsetX, offsetY;

                dragHeader.addEventListener("mousedown", e => {
                    isDragging = true;
                    offsetX = e.clientX - container.offsetLeft;
                    offsetY = e.clientY - container.offsetTop;
                    container.style.position = 'absolute';
                });

                document.addEventListener("mousemove", e => {

                    if (isDragging) {
                        container.style.left = `${e.clientX - offsetX}px`;
                        container.style.top = `${e.clientY - offsetY}px`;
                    }

                    if (isResizing) {
                        const rect = container.getBoundingClientRect();
                        container.style.width =
                            Math.max(600, Math.min(window.innerWidth * 0.95, e.clientX - rect.left)) + 'px';
                        container.style.height =
                            Math.max(400, Math.min(window.innerHeight * 0.92, e.clientY - rect.top)) + 'px';
                    }
                });

                document.addEventListener("mouseup", () => {
                    if (isResizing) {
                        GM_setValue(sizeKey, {
                            width: container.offsetWidth,
                            height: container.offsetHeight
                        });
                    }
                    isDragging = false;
                    isResizing = false;
                });

                container.querySelector(`#${scriptId}-changelog-resize`)
                    .addEventListener("mousedown", e => {
                        e.stopPropagation();
                        isResizing = true;
                    });

                /* ================= CLOSE HANDLING ================= */

                const closeDialog = () => {
                    container.style.transform = 'scale(0.96)';
                    container.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(overlay))
                            document.body.removeChild(overlay);
                    }, 150);
                };

                overlay.addEventListener("mousedown", e => {
                    if (e.target === overlay && !isDragging && !isResizing) {
                        closeDialog();
                    }
                });

                container.querySelector(`#${scriptId}-changelog-close`)
                    .onclick = closeDialog;

                container.querySelector(`#${scriptId}-changelog-close-btn`)
                    .onclick = closeDialog;

                window.addEventListener("keydown", e => {
                    if (e.key === "Escape") closeDialog();
                });
            }
        };

        // --- 4. Setup Menus ---
        const setupMenus = function() {
            if (typeof GM_registerMenuCommand !== 'undefined') {
                if (configSchema) {
                    GM_registerMenuCommand("⚙️ Settings Manager", () => settingsInterface.showModal());
                }
                if (changelog && changelog.length > 0) {
                    GM_registerMenuCommand("📜 ChangeLog", () => changelogInterface.show());
                }
            }

            // Webpage "Editing" Menu Integration
            if (configSchema) {
                const editMenuItem = document.querySelector('div.right div.bottom ul.menu li.editing');
                const editMenuUl = editMenuItem ? editMenuItem.querySelector('ul') : null;

                if (editMenuUl && !document.getElementById(`${scriptId}-menu-link`)) {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.id = `${scriptId}-menu-link`;
                    a.href = "javascript:void(0)";
                    a.textContent = '⚙️ ' + scriptName;
                    a.style.cursor = 'pointer';
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        settingsInterface.showModal();
                    });
                    li.appendChild(a);
                    editMenuUl.appendChild(li);
                    loggerInterface.debug('init', "Settings entry added to Editing menu.");
                }
            }
        };

        // Initialization
        settingsInterface.init();
        setupMenus();

        // Return combined API
        return {
            settings: settingsInterface.values, // Exposed as simple property
            settingsInterface: settingsInterface,
            showSettings: () => settingsInterface.showModal(),  // for configuration button
            log: loggerInterface.log.bind(loggerInterface),
            debug: loggerInterface.debug.bind(loggerInterface),
            info: loggerInterface.info.bind(loggerInterface),
            warn: loggerInterface.warn.bind(loggerInterface),
            error: loggerInterface.error.bind(loggerInterface),
            time: loggerInterface.time.bind(loggerInterface),
            timeEnd: loggerInterface.timeEnd.bind(loggerInterface),
            // Replace the static property with a getter/setter
            get prefix() { return loggerInterface.prefix; },
            set prefix(val) { loggerInterface.prefix = val; }
        };
    };
})();
