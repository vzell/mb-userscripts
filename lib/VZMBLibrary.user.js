// ==UserScript==
// @name         VZ: MusicBrainz - Unified Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.1
// @description  Unified library for Logging, Settings, and Changelog management
// @author       Gemini (directed by vzell)
// @license      MIT
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

"use strict";

/*
 * VZMBLibrary
 *
 * A unified library to handle:
 * 1. Advanced Logging with timestamps and icons.
 * 2. Settings/Configuration Management (Schema-driven).
 * 3. Changelog UI display.
 * 4. Menu Integration (Tampermonkey & MB Editing menu).
 */

const VZMBLibrary = (function() {
    return function(scriptId, scriptName, configSchema = null, changelog = null, debugEnabled = true) {
        const timers = new Map();

        // --- 1. Logger Logic ---
        const loggerInterface = {
            prefix: `[${scriptName}]`,
            styles: {
                debug: 'color: #7f8c8d; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold;',
                info: 'color: #2980b9; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; font-size: 11px;',
                error: 'color: #c0392b; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fceae9; padding: 2px 4px; border-radius: 3px;',
                timer: 'color: #8e44ad; font-family: "Consolas", monospace; font-style: italic; font-weight: bold;',
                timestamp: 'color: #95a5a6; font-size: 9px; font-weight: normal;'
            },
            icons: {
                init: '🚀', fetch: '📥', render: '🎨', filter: '🔍', sort: '⚖️', cleanup: '🧹', error: '❌', success: '✅', meta: '🎵', timer: '⏱️', ui: '🖥️'
            },
            getTimestamp() {
                const now = new Date();
                return now.toISOString().split('T')[1].replace('Z', ''); // e.g., 14:20:05.123
            },
            log(level, icon, msg, data = '') {
                if (!debugEnabled && level === 'debug') return;
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
                    justifyContent: 'center', alignItems: 'center'
                });

                const container = document.createElement("div");
                container.id = `${scriptId}-config-container`;
                Object.assign(container.style, {
                    backgroundColor: 'silver', border: '2px outset white', padding: '1em',
                    color: 'black', fontFamily: 'sans-serif', minWidth: '450px'
                });

                const tableRows = Object.entries(configSchema).map(([key, cfg]) => {
                    const inputId = `${scriptId}-input-${key}`;
                    const isCheck = cfg.type === "checkbox";
                    const valAttr = isCheck
                        ? (this.values[key] ? 'checked' : '')
                        : `value="${this.values[key]}"`;

                    return `
                        <tr>
                            <th style="background-color: rgb(204, 204, 204); text-align: left; padding-left: inherit;">
                                <label style="white-space: nowrap; text-shadow: rgb(153, 153, 153) 1px 1px 2px;">
                                    ${cfg.label}: <input type="${cfg.type}" id="${inputId}" ${valAttr} style="${isCheck ? '' : 'width: 60px;'} margin-left: 5px;">
                                </label>
                            </th>
                            <td style="opacity: 0.666; text-align: center;">${cfg.default}</td>
                            <td style="margin-bottom: 0.4em;">${cfg.description}</td>
                        </tr>`;
                }).join('');

                container.innerHTML = `
                    <p style="text-align: right; margin: 0px;">
                        <a id="${scriptId}-reset" style="cursor: pointer; font-weight: bold; color: black;">RESET</a> |
                        <a id="${scriptId}-close" style="cursor: pointer; font-weight: bold; color: black;">CLOSE</a>
                    </p>
                    <h4 style="text-shadow: white 0px 0px 8px; font-size: 1.5em; margin-top: 0px;">${scriptName.toUpperCase()}</h4>
                    <p>Settings are applied immediately upon saving.</p>
                    <table border="2" cellpadding="4" cellspacing="1" style="width: 100%; border-collapse: separate; background: #eee;">
                        <thead>
                            <tr style="background-color: #ccc;">
                                <th>setting</th>
                                <th>default setting</th>
                                <th>description</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    <div style="margin-top: 15px; text-align: right;">
                        <button id="${scriptId}-save-btn" style="padding: 4px 12px; cursor: pointer; font-weight: bold;">SAVE</button>
                    </div>
                `;

                overlay.appendChild(container);
                document.body.appendChild(overlay);

                const closeDialog = () => {
                    if (document.body.contains(overlay)) document.body.removeChild(overlay);
                    window.removeEventListener("keydown", handleEsc);
                };
                const handleEsc = (e) => { if (e.key === "Escape") closeDialog(); };
                window.addEventListener("keydown", handleEsc);

                document.getElementById(`${scriptId}-save-btn`).onclick = () => {
                    const newValues = {};
                    for (const key in configSchema) {
                        const input = document.getElementById(`${scriptId}-input-${key}`);
                        newValues[key] = configSchema[key].type === "checkbox" ? input.checked : parseInt(input.value, 10);
                    }
                    this.save(newValues);
                    closeDialog();
                };
                document.getElementById(`${scriptId}-reset`).onclick = () => {
                    for (const key in configSchema) {
                        const input = document.getElementById(`${scriptId}-input-${key}`);
                        if (configSchema[key].type === "checkbox") input.checked = configSchema[key].default;
                        else input.value = configSchema[key].default;
                    }
                };
                document.getElementById(`${scriptId}-close`).onclick = closeDialog;
                overlay.onclick = (e) => { if (e.target === overlay) closeDialog(); };
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
                    logDiv.style.cssText = "position:fixed; left:0; right:0; top:10em; z-index:3000009; margin-left:auto; margin-right:auto; min-height:8em; width:50%; background-color:#eee; color:#111; border-radius:5px; padding:1em; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid #ccc; display:none;";

                    const title = document.createElement("b");
                    title.textContent = `${scriptName} - ChangeLog (Click to dismiss)`;
                    logDiv.appendChild(title);

                    const list = document.createElement("ul");
                    list.style.marginTop = "0.5em";
                    changelog.forEach(entry => {
                        const li = document.createElement("li");
                        li.innerHTML = `<i>${entry.version}</i> - ${entry.description}`;
                        list.appendChild(li);
                    });
                    logDiv.appendChild(list);
                    document.body.appendChild(logDiv);
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
            log: loggerInterface.log.bind(loggerInterface),
            debug: loggerInterface.debug.bind(loggerInterface),
            info: loggerInterface.info.bind(loggerInterface),
            error: loggerInterface.error.bind(loggerInterface),
            time: loggerInterface.time.bind(loggerInterface),
            timeEnd: loggerInterface.timeEnd.bind(loggerInterface),
            prefix: loggerInterface.prefix // allow writing to prefix if needed
        };
    };
})();
