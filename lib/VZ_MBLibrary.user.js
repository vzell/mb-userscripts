// ==UserScript==
// @name         VZ: MusicBrainz - Unified Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      2.1.0+2026-02-14
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
                                    background:linear-gradient(to right,#6c7a89,#8fa3b5,#6c7a89);
                                    color:white;
                                    border-bottom:1px solid rgba(255,255,255,0.2);
                                ">
                                <td colspan="3" style="padding:10px 14px;font-weight:600;">
                                    ▼ ${cfg.label}
                                </td>
                            </tr>`;
                        return;
                    }

                    const inputId = `${scriptId}-input-${key}`;
                    const isCheck = cfg.type === "checkbox";
                    const isNumber = cfg.type === "number";
                    const isColor = cfg.type === "color_picker";

                    const valAttr = isCheck
                        ? (this.values[key] ? 'checked' : '')
                        : `value="${this.values[key]}"`;

                    let inputHtml = '';

                    if (isCheck) {
                        inputHtml = `<input type="checkbox" id="${inputId}" ${valAttr}>`;
                    } else if (isNumber) {
                        inputHtml = `<input type="number" id="${inputId}" ${valAttr}
                                     min="${cfg.min || 0}" max="${cfg.max || 100}"
                                     style="width:90px;">`;
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
                            <td style="width:130px;text-align:center;opacity:.5;padding:8px 10px;">
                                ${cfg.default}
                            </td>
                            <td style="white-space:normal;word-break:break-word;min-width:350px;padding:8px 10px;color:#555;">
                                ${cfg.description}
                            </td>
                        </tr>`;
                });

                container.innerHTML = `
                    <div id="${scriptId}-drag-header" style="cursor:move;user-select:none;margin-bottom:8px;">
                        <p style="text-align:right;margin:0 0 6px 0;">
                            <a id="${scriptId}-reset" style="cursor:pointer;font-weight:600;color:#555;">RESET</a> |
                            <a id="${scriptId}-close" style="cursor:pointer;font-weight:600;color:#555;">CLOSE</a>
                        </p>
                        <h3 style="margin:4px 0;font-size:18px;font-weight:600;color:#222;">
                            ${scriptName.toUpperCase()}
                        </h3>
                        <h2 style="margin:4px 0;font-size:18px;font-weight:600;color:#222;">
                            Settings are applied IMMEDIATELY upon saving.
                        </h2>
                        <input id="${scriptId}-search"
                               placeholder="🔍 Search settings..."
                               style="
                                   width:100%;
                                   padding:7px 10px;
                                   border-radius:6px;
                                   border:1px solid #ccc;
                                   margin-top:6px;
                               ">
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
                        box-shadow: 0 -8px 18px rgba(0,0,0,0.08);
                        border-top:1px solid #ddd;
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

                document.querySelectorAll(".section-header").forEach(header => {
                    header.addEventListener("click", () => {
                        const section = header.dataset.section;
                        const collapsed = header.classList.toggle("collapsed");
                        header.innerHTML = header.innerHTML.replace(
                            collapsed ? "▼" : "▶",
                            collapsed ? "▶" : "▼"
                        );

                        document.querySelectorAll(`.config-row[data-section="${section}"]`)
                            .forEach(row => row.style.display = collapsed ? "none" : "");
                    });
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
                        const input = document.getElementById(`${scriptId}-input-${key}`);
                        if (configSchema[key].type === "checkbox") {
                            input.checked = configSchema[key].default;
                        } else {
                            input.value = configSchema[key].default;
                            if (configSchema[key].type === "color_picker") {
                                this.applyColorPreview(`${scriptId}-input-${key}`, configSchema[key].default);
                            }
                        }
                    }
                };

                document.getElementById(`${scriptId}-close`).onclick = closeDialog;

                window.addEventListener("keydown", e => {
                    if (e.key === "Escape") closeDialog();
                });
            }
        };

        // --- 3. Changelog Logic ---
        const changelogInterface = {
            show: function () {
                if (!changelog || changelog.length === 0) return;

                let logDiv = document.getElementById(`${scriptId}-changelog`);

                const closeDialog = () => {
                    if (logDiv) {
                        logDiv.style.display = 'none';
                    }
                    window.removeEventListener("keydown", handleEsc);
                };

                const handleEsc = (e) => {
                    if (e.key === "Escape") {
                        closeDialog();
                    }
                };

                if (!logDiv) {
                    logDiv = document.createElement("div");
                    logDiv.id = `${scriptId}-changelog`;

                    // Setup the modal container
                    logDiv.style.cssText = `
                        position: fixed;
                        left: 0;
                        right: 0;
                        top: 10em;
                        z-index: 3000009;
                        margin-left: auto;
                        margin-right: auto;
                        min-height: 8em;
                        width: 50%;
                        max-height: 70vh;
                        background-color: #eee;
                        color: #111;
                        border-radius: 5px;
                        padding: 1.5em;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                        border: 1px solid #ccc;
                        display: none;
                        flex-direction: column;
                    `;

                    // Title
                    const title = document.createElement("b");
                    title.style.whiteSpace = "pre-wrap";
                    title.textContent = `${scriptName}\n\nChangeLog:    .... click to dismiss`;
                    logDiv.appendChild(title);

                    // Scrollable container for entries
                    const listContainer = document.createElement("div");
                    listContainer.style.cssText = `
                        margin-top: 0.75em;
                        overflow-y: auto;
                        flex-grow: 1;
                        max-height: 50vh;
                        padding-right: 5px;
                    `;

                    const list = document.createElement("ul");
                    list.style.marginTop = "0";
                    list.style.paddingLeft = "20px";

                    changelog.forEach(entry => {
                        const li = document.createElement("li");
                        li.innerHTML = `<i>${entry.version}</i> - ${entry.description}`;
                        list.appendChild(li);
                    });

                    listContainer.appendChild(list);
                    logDiv.appendChild(listContainer);

                    // Footer
                    const footer = document.createElement("div");
                    footer.style.textAlign = "right";
                    footer.style.marginTop = "1em";

                    const closeBtn = document.createElement("button");
                    closeBtn.textContent = "CLOSE";
                    closeBtn.style.cssText = `
                        padding: 4px 12px;
                        cursor: pointer;
                        font-weight: bold;
                        border: 1px solid #999;
                        border-radius: 3px;
                        background: #ddd;
                    `;
                    closeBtn.onclick = (e) => {
                        e.stopPropagation();
                        closeDialog();
                    };

                    footer.appendChild(closeBtn);
                    logDiv.appendChild(footer);

                    document.body.appendChild(logDiv);

                    // Click background to dismiss
                    logDiv.addEventListener('click', () => closeDialog(), false);
                }

                logDiv.style.display = 'flex';
                window.addEventListener("keydown", handleEsc);
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
                    a.textContent = scriptName;
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
