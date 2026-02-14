// ==UserScript==
// @name         VZ: MusicBrainz - Unified Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.2.0+2026-02-14
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
//     {version: '1.2.0+2026-02-14', description: 'Modernize settings UI, add support for section dividers, and expose showSettings method.'},
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
                    if (configSchema[key].type === 'divider') continue;
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
            showModal: function() {
                if (!configSchema) return;
                const overlay = document.createElement("div");
                overlay.id = `${scriptId}-settings-overlay`;
                Object.assign(overlay.style, {
                    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '10000', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)'
                });

                const container = document.createElement("div");
                container.id = `${scriptId}-config-container`;
                Object.assign(container.style, {
                    backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid #ccc',
                    color: '#333', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    minWidth: '600px', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
                    position: 'relative'
                });

                const tableRows = Object.entries(configSchema).map(([key, cfg]) => {
                    if (cfg.type === "divider") {
                        return `
                        <tr>
                            <td colspan="3" style="background-color: #f8f9fa; border-bottom: 2px solid #4CAF50; border-top: 2px solid #eee; padding: 16px 10px 8px; font-weight: bold; color: #2e7d32; font-size: 1.1em;">
                                ${cfg.label}
                            </td>
                        </tr>`;
                    }

                    const inputId = `${scriptId}-input-${key}`;
                    const isCheck = cfg.type === "checkbox";
                    const isColor = cfg.type === "color_picker";
                    const valAttr = isCheck
                        ? (this.values[key] ? 'checked' : '')
                        : `value="${this.values[key]}"`;

                    let inputHtml = `<input type="${isCheck ? 'checkbox' : 'text'}" id="${inputId}" ${valAttr} style="${isCheck ? 'transform: scale(1.2); cursor: pointer;' : 'width: 140px; padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px;'} margin-left: 8px; transition: background 0.2s;">`;

                    if (isColor) {
                        inputHtml += `<button id="${inputId}-picker-btn" type="button" style="margin-left: 8px; cursor: pointer; border: 1px solid #666; border-radius: 4px; width: 28px; height: 28px; vertical-align: middle; padding: 0;" title="Open Color Picker">🎨</button>`;
                    }

                    return `
                        <tr style="border-bottom: 1px solid #eee;">
                            <th style="text-align: left; padding: 12px 10px; white-space: nowrap; font-weight: 600;">
                                <label style="cursor: ${isCheck ? 'pointer' : 'default'}; display: flex; align-items: center; justify-content: space-between;">
                                    <span>${cfg.label}</span> ${inputHtml}
                                </label>
                            </th>
                            <td style="opacity: 0.7; text-align: center; padding: 12px 10px; font-family: monospace; background: #fdfdfd;">${cfg.default}</td>
                            <td style="padding: 12px 10px; font-size: 0.9em; color: #555;">${cfg.description}</td>
                        </tr>`;
                }).join('');

                container.innerHTML = `
                    <style>
                        #${scriptId}-save-btn:hover { background-color: #45a049 !important; }
                        #${scriptId}-reset:hover, #${scriptId}-close:hover { background-color: #e0e0e0 !important; }
                        #${scriptId}-close-x:hover { color: #333 !important; }
                    </style>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                        <h3 style="margin: 0; color: #4CAF50; font-size: 1.5em;">⚙️ ${scriptName} Settings</h3>
                        <button id="${scriptId}-close-x" style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #999; padding: 0; line-height: 1;" title="Close">✕</button>
                    </div>
                    <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Settings are applied immediately upon saving.</p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.95em;">
                        <thead>
                            <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
                                <th style="padding: 10px; text-align: left; color: #333;">Setting</th>
                                <th style="padding: 10px; text-align: center; color: #333;">Default</th>
                                <th style="padding: 10px; text-align: left; color: #333;">Description</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    <div style="margin-top: 25px; display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="${scriptId}-reset" style="padding: 8px 16px; background: #f9f9f9; color: #333; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;">Reset to Defaults</button>
                        <button id="${scriptId}-close" style="padding: 8px 16px; background: #f0f0f0; color: #333; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;">Cancel</button>
                        <button id="${scriptId}-save-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;">Save Settings</button>
                    </div>
                    <div id="${scriptId}-picker-container" style="position: absolute; display: none; background: #fff; border: 1px solid #ccc; padding: 10px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.2); border-radius: 8px;"></div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                const pickerContainer = document.getElementById(`${scriptId}-picker-container`);

                // Initial color preview application
                Object.entries(configSchema).forEach(([key, cfg]) => {
                    if (cfg.type === "divider") return; // Skip dividers
                    if (cfg.type === "color_picker") {
                        const inputId = `${scriptId}-input-${key}`;
                        this.applyColorPreview(inputId, this.values[key]);

                        const btn = document.getElementById(`${inputId}-picker-btn`);
                        const input = document.getElementById(inputId);

                        // Allow manual typing to update preview too
                        input.addEventListener('input', (e) => {
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
                                    width: 150,
                                    color: input.value || cfg.default
                                });

                                activePicker.on('color:change', (color) => {
                                    // console.debug('New Hex:', color.hexString);
                                    input.value = color.hexString;
                                    this.applyColorPreview(inputId, color.hexString);
                                });
                            } else {
                                loggerInterface.error('error', "iro.js library not found!");
                                pickerContainer.textContent = "iro.js missing";
                            }
                        };
                    }
                });

                const closeDialog = () => {
                    if (document.body.contains(overlay)) document.body.removeChild(overlay);
                    window.removeEventListener("keydown", handleEsc);
                };
                const handleEsc = (e) => { if (e.key === "Escape") closeDialog(); };
                window.addEventListener("keydown", handleEsc);

                document.getElementById(`${scriptId}-save-btn`).onclick = () => {
                    const newValues = {};
                    for (const key in configSchema) {
                        if (configSchema[key].type === "divider") continue; // Skip dividers
                        const input = document.getElementById(`${scriptId}-input-${key}`);
                        newValues[key] = configSchema[key].type === "checkbox" ? input.checked : input.value;
                    }
                    this.save(newValues);
                    closeDialog();
                };
                document.getElementById(`${scriptId}-reset`).onclick = () => {
                    for (const key in configSchema) {
                        if (configSchema[key].type === "divider") continue; // Skip dividers
                        const inputId = `${scriptId}-input-${key}`;
                        const input = document.getElementById(inputId);
                        if (configSchema[key].type === "checkbox") {
                            input.checked = configSchema[key].default;
                        } else {
                            input.value = configSchema[key].default;
                            if (configSchema[key].type === "color_picker") {
                                this.applyColorPreview(inputId, configSchema[key].default);
                            }
                        }
                    }
                };
                document.getElementById(`${scriptId}-close`).onclick = closeDialog;
                document.getElementById(`${scriptId}-close-x`).onclick = closeDialog;

                overlay.onclick = (e) => {
                    if (e.target === overlay) closeDialog();
                    if (!pickerContainer.contains(e.target)) pickerContainer.style.display = 'none';
                };
            }
        };

        // --- 3. Changelog Logic ---
        const changelogInterface = {
            show: function() {
                if (!changelog || changelog.length === 0) return;
                let logDiv = document.getElementById(`${scriptId}-changelog`);
                if (!logDiv) {
                    logDiv = document.createElement("div");
                    logDiv.id = `${scriptId}-changelog`;
                    // Setup the modal container
                    logDiv.style.cssText = "position:fixed; left:0; right:0; top:10em; z-index:3000009; margin-left:auto; margin-right:auto; min-height:8em; width:50%; background-color:#eee; color:#111; border-radius:5px; padding:1.5em; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid #ccc; display:none; flex-direction: column;";

                    // Title with two new lines (via margin-bottom)
                    const title = document.createElement("b");
                    title.style.whiteSpace = "pre-wrap";
                    title.textContent = `${scriptName}\n\nChangeLog:    .... click to dismiss`;
                    logDiv.appendChild(title);

                    // Version List
                    const list = document.createElement("ul");
                    list.style.marginTop = "0.5em";
                    list.style.flexGrow = "1";
                    changelog.forEach(entry => {
                        const li = document.createElement("li");
                        //li.style.marginBottom = "0.5em";
                        li.innerHTML = `<i>${entry.version}</i> - ${entry.description}`;
                        list.appendChild(li);
                    });
                    logDiv.appendChild(list);

                    // Added CLOSE button at the bottom
                    const footer = document.createElement("div");
                    footer.style.textAlign = "right";
                    footer.style.marginTop = "1em";

                    const closeBtn = document.createElement("button");
                    closeBtn.textContent = "CLOSE";
                    closeBtn.style.cssText = "padding: 4px 12px; cursor: pointer; font-weight: bold; border: 1px solid #999; border-radius: 3px; background: #ddd;";
                    closeBtn.onclick = (e) => {
                        e.stopPropagation();
                        logDiv.style.display = 'none';
                    };

                    footer.appendChild(closeBtn);
                    logDiv.appendChild(footer);

                    document.body.appendChild(logDiv);

                    // Still allow clicking the background to dismiss
                    logDiv.addEventListener('click', () => { logDiv.style.display = 'none'; }, false);
                }
                logDiv.style.display = 'block';
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
            showSettings: settingsInterface.showModal.bind(settingsInterface), // Exposed for external triggers
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
