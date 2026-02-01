// ==UserScript==
// @name         VZ: MusicBrainz - Release Page Enhancer
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.0+2026-02-01
// @description  Enhance Release Page with show all cover art images on the page itself, collapsible with configurable image size
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ReleasePageEnhancer.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      file:///V:/home/vzell/git/mb-userscripts/lib/MBLoggerLib.user.js
// @match        *://*.musicbrainz.org/release/*
// @exclude      *://*.musicbrainz.org/release/*/*
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

// CHANGELOG - The most important updates/versions:
let changelog = [
    {version: '0.9.0+2026-02-01', description: '1st official release version.'}
];

(function() {
    'use strict';

    const SCRIPT_ID = "vzell-mb-release-enhancer";
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : "Release Page Enhancer";

    const Logger = (typeof MBLogger !== 'undefined')
          ? new MBLogger(SCRIPT_NAME, true)
          : { info: console.log, debug: console.log, error: console.error, time: console.time, timeEnd: console.timeEnd };

    Logger.info('init', "Script loaded with external library!");

    const configSchema = {
        ca_image_size: {
            label: "Pixel Size",
            type: "number",
            default: 250,
            description: "Set the cover image size in pixels"
        },
        ca_collapsed_by_default: {
            label: "Start Collapsed",
            type: "checkbox",
            default: false,
            description: "Cover art gallery starts hidden by default"
        }
    };

    // --- Configuration Helpers & Settings UI ---
    const settings = {
        values: {},

        init: function(schema) {
            this.schema = schema;
            for (const key in schema) {
                this.values[key] = GM_getValue(key, schema[key].default);
            }
            return this;
        },

        save: function(newValues) {
            for (const key in newValues) {
                GM_setValue(key, newValues[key]);
            }
            Logger.info('init', "Settings saved. Reloading...");
            location.reload();
        },

        showSettingsModal: function() {
            const overlay = document.createElement("div");
            overlay.id = `${SCRIPT_ID}-settings-overlay`;
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '10000', display: 'flex',
                justifyContent: 'center', alignItems: 'center'
            });

            const container = document.createElement("div");
            container.id = `${SCRIPT_ID}-config-container`;
            Object.assign(container.style, {
                backgroundColor: 'silver', border: '2px outset white', padding: '1em',
                color: 'black', fontFamily: 'sans-serif', minWidth: '400px'
            });

            // Generate Table Rows from Schema
            const tableRows = Object.entries(this.schema).map(([key, cfg]) => {
                const inputId = `${SCRIPT_ID}-input-${key}`;
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
                    <a id="${SCRIPT_ID}-reset" style="cursor: pointer; font-weight: bold; color: black;">RESET</a> |
                    <a id="${SCRIPT_ID}-close" style="cursor: pointer; font-weight: bold; color: black;">CLOSE</a>
                </p>
                <h4 style="text-shadow: white 0px 0px 8px; font-size: 1.5em; margin-top: 0px;">${SCRIPT_NAME.toUpperCase()}</h4>
                <p>Settings are applied immediately upon saving.</p>
                <table border="2" cellpadding="4" cellspacing="1" style="width: 100%; border-collapse: separate; background: #eee;">
                    <thead>
                        <tr style="background-color: #ccc;">
                            <th>setting</th>
                            <th>default setting</th>
                            <th>description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div style="margin-top: 15px; text-align: right;">
                    <button id="${SCRIPT_ID}-save-btn" style="padding: 4px 12px; cursor: pointer; font-weight: bold;">SAVE</button>
                </div>
            `;

            overlay.appendChild(container);
            document.body.appendChild(overlay);

            const closeDialog = () => {
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                window.removeEventListener("keydown", handleEsc);
            };

            const handleEsc = (e) => {
                if (e.key === "Escape") closeDialog();
            };
            window.addEventListener("keydown", handleEsc);

            document.getElementById(`${SCRIPT_ID}-save-btn`).onclick = () => {
                const newValues = {};
                for (const key in this.schema) {
                    const input = document.getElementById(`${SCRIPT_ID}-input-${key}`);
                    newValues[key] = this.schema[key].type === "checkbox" ? input.checked : parseInt(input.value, 10);
                }
                this.save(newValues);
                closeDialog();
            };

            document.getElementById(`${SCRIPT_ID}-reset`).onclick = () => {
                for (const key in this.schema) {
                    const input = document.getElementById(`${SCRIPT_ID}-input-${key}`);
                    if (this.schema[key].type === "checkbox") {
                        input.checked = this.schema[key].default;
                    } else {
                        input.value = this.schema[key].default;
                    }
                }
            };

            document.getElementById(`${SCRIPT_ID}-close`).onclick = closeDialog;
            overlay.onclick = (e) => { if (e.target === overlay) closeDialog(); };
        },

        showChangelog: function() {
            let logDiv = document.getElementById(`${SCRIPT_ID}-changelog`);
            if (!logDiv) {
                logDiv = document.createElement("div");
                logDiv.id = `${SCRIPT_ID}-changelog`;
                logDiv.style.cssText = "position:fixed; left:0; right:0; top:10em; z-index:3000009; margin-left:auto; margin-right:auto; min-height:8em; width:50%; background-color:#eee; color:#111; border-radius:5px; padding:1em; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid #ccc; display:none;";

                const title = document.createElement("b");
                title.textContent = `${SCRIPT_NAME} - ChangeLog (Click to dismiss)`;
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

                logDiv.addEventListener('click', () => {
                    logDiv.style.display = 'none';
                }, false);
            }
            logDiv.style.display = 'block';
        },

        setupMenus: function() {
            // Tampermonkey/UserScript Manager Menu
            if (typeof GM_registerMenuCommand !== 'undefined') {
                GM_registerMenuCommand("⚙️ Open Settings Manager", () => this.showSettingsModal());
                GM_registerMenuCommand("📜 ChangeLog", () => this.showChangelog());
            }

            // Webpage "Editing" Menu Integration
            const editMenuItem = document.querySelector('div.right div.bottom ul.menu li.editing');
            const editMenuUl = editMenuItem ? editMenuItem.querySelector('ul') : null;

            if (editMenuUl && !document.getElementById(`${SCRIPT_ID}-menu-link`)) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.id = `${SCRIPT_ID}-menu-link`;
                a.href = "javascript:void(0)";
                a.textContent = SCRIPT_NAME;
                a.style.cursor = 'pointer';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSettingsModal();
                });
                li.appendChild(a);
                editMenuUl.appendChild(li);
                Logger.debug('init', "Settings entry added to Editing menu.");
            }
        }
    };

    // Initialize Settings with Schema
    settings.init(configSchema);
    settings.setupMenus();

    const isOverviewTabActive = () => {
        const activeTab = document.querySelector("ul.tabs li.sel");
        return activeTab && activeTab.textContent.includes("Overview");
    };

    /**
     * Fetch and render the cover art gallery
     */
    async function displayCoverArt(mbid, tabsContainer) {
        try {
            const imgSize = settings.values.ca_image_size;
            const startCollapsed = settings.values.ca_collapsed_by_default;

            Logger.info('fetch', `Fetching cover art for ${mbid}...`);
            const response = await fetch(`https://coverartarchive.org/release/${mbid}`);

            if (!response.ok) {
                if (response.status === 404) {
                    Logger.debug('fetch', "No cover art found.");
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
            Logger.debug('render', "Cover art gallery from CA archive successfully rendered.");

        } catch (err) {
            Logger.error('init', `Async error: ${err.message}`);
        }
    }

    // --- Start Execution ---
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const tabsContainer = document.querySelector("div.tabs");

    if (mbidMatch && tabsContainer) {
        if (isOverviewTabActive()) {
            Logger.time("Cover Art Render");
            displayCoverArt(mbidMatch[0], tabsContainer);
            Logger.timeEnd("Cover Art Render", "render");
        } else {
            Logger.debug('init', "Not on Overview tab, skipping gallery logic.");
        }
    }
})();
