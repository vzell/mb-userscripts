// ==UserScript==
// @name         VZ: MusicBrainz - Auto-Select External Link Types
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0+2025-12-28
// @description  Auto-Select External Link Types on various MusicBrainz pages (Events, Places, Release Groups, Releases, Works)
// @author       Gemini with vzell
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/event/create
// @match        https://musicbrainz.org/event/*/edit
// @match        https://musicbrainz.org/place/create
// @match        https://musicbrainz.org/place/*/edit
// @match        https://musicbrainz.org/release-group/create
// @match        https://musicbrainz.org/release-group/*/edit
// @match        https://musicbrainz.org/release/add
// @match        https://musicbrainz.org/release/*/edit
// @match        https://musicbrainz.org/work/create
// @match        https://musicbrainz.org/work/*/edit
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = true;

    // --- Configuration Mapping per Entity Type ---

    const ENTITY_CONFIGS = {
        'event': {
            logPrefix: '[VZ:autoselect-events]',
            storageKey: 'MB_AutoSelect_Mappings_Events',
            options: [
                { id: "782", name: "official homepages" },
                { id: "904", name: "crowdfunding page" },
                { id: "898", name: "patronage page" },
                { id: "808", name: "poster" },
                { id: "842", name: "reviews" },
                { id: "783", name: "social networking" },
                { id: "1197", name: "ticketing page" },
                { id: "804", name: "video channel" },
                { id: "1254", name: "purchase artwork" },
            ],
            defaults: [
                { regex: "http://brucebase.wikidot.com/.*#.*", typeId: "842", description: "BruceBase event entry" },
            ]
        },
        'place': {
            logPrefix: '[VZ:autoselect-places]',
            storageKey: 'MB_AutoSelect_Mappings_Places',
            options: [
                { id: "363", name: "official homepages" },
                { id: "627", name: "blogs" },
                { id: "396", name: "picture" },
                { id: "429", name: "social networking" },
                { id: "495", name: "video channel" },
                { id: "909", name: "crowdfunding page" },
                { id: "1191", name: "fan page" },
                { id: "984", name: "history page" },
                { id: "900", name: "patronage page" },
                { id: "1195", name: "ticketing page" },
            ],
            defaults: [
                { regex: "http://brucebase.wikidot.com/venue:.*", typeId: "1191", description: "BruceBase place entry" },
            ]
        },
        'release-group': {
            logPrefix: '[VZ:autoselect-release-groups]',
            storageKey: 'MB_AutoSelect_Mappings_Release_Groups',
            options: [
                { id: "287", name: "standalone website" },
                { id: "1169", name: "discography entry" },
                { id: "1190", name: "fan pages" },
                { id: "94", name: "reviews" },
                { id: "907", name: "crowdfunding page" },
            ],
            defaults: [
                { regex: "^(https://www\\.springsteenlyrics\\.com/bootlegs\\.php\\?cmd=list)(&category=.*)(&page=\\d+)?$", typeId: "1169", description: "SpringsteenLyrics bootleg entry" },
            ]
        },
        'release': {
            logPrefix: '[VZ:autoselect-releases]',
            storageKey: 'MB_AutoSelect_Mappings_Releases',
            options: [
                { id: "288", name: "discography entry" },
                { id: "301", name: "license" },
                { id: "79", name: "purchase for mail-order" },
                { id: "74", name: "purchase for download" },
                { id: "75", name: "download for free" },
                { id: "85", name: "stream for free" },
                { id: "980", name: "streaming page" },
                { id: "906", name: "crowdfunding page" },
                { id: "729", name: "show notes" },
                { id: "78", name: "cover art" },
            ],
            defaults: [
                { regex: "^(https://www\\.springsteenlyrics\\.com/bootlegs\\.php\\?item=\\d+)(&.*)?$", typeId: "288", description: "SpringsteenLyrics bootleg entry" },
                { regex: "https://www\\.jungleland\\.it/html/.*\\.htm$", typeId: "288", description: "Jungleland discography page" },
                { regex: "https://web.archive.org/web/.*/http://bruceboots.com/", typeId: "288", description: "BruceBoots via archive.org" },
                { regex: "https://archive.org/details/bs.*", typeId: "288", description: "Springsteen bootleg entry via archive.org" },
                { regex: "https://www.nugs.net/live-download-of-bruce-springsteen-.*/.*\\.html$", typeId: "74", description: "Nugs.net primary Bruce Springsteen URL" },
            ]
        },
        'work': {
            logPrefix: '[VZ:autoselect-works]',
            storageKey: 'MB_AutoSelect_Mappings_Works',
            options: [
                { id: "939", name: "license" },
                { id: "913", name: "purchase score for mail-order" },
                { id: "912", name: "purchase score for download" },
                { id: "274", name: "purchase score for free" },
                { id: "921", name: "work list entry" },
                { id: "908", name: "crowdfunding page" },
                { id: "1188", name: "fan pages" },
            ],
            defaults: [
                { regex: "http://brucebase.wikidot.com/song:.*", typeId: "921", description: "BruceBase song entry" },
                { regex: "https://www.springsteenlyrics.com/lyrics.php\\?song=.*", typeId: "921", description: "SpringsteenLyrics song entry" },
            ]
        }
    };

    // --- Determine Current Page Entity ---

    function getEntityFromUrl() {
        const path = window.location.pathname;
        if (path.startsWith('/event/')) return 'event';
        if (path.startsWith('/place/')) return 'place';
        if (path.startsWith('/release-group/')) return 'release-group';
        if (path.startsWith('/release/')) return 'release';
        if (path.startsWith('/work/')) return 'work';
        return null;
    }

    const currentEntity = getEntityFromUrl();
    if (!currentEntity) return;

    const config = ENTITY_CONFIGS[currentEntity];
    let linkMappings = [];
    let isModalOpen = false;

    function log(...args) {
        if (DEBUG) console.log(config.logPrefix, ...args);
    }

    // --- Persistence ---

    function loadMappings() {
        try {
            const stored = localStorage.getItem(config.storageKey);
            if (stored) {
                return JSON.parse(stored) || config.defaults;
            }
        } catch (e) {
            log("Failed to load mappings. Using defaults.", e);
        }
        return config.defaults;
    }

    function saveMappings(mappings) {
        try {
            localStorage.setItem(config.storageKey, JSON.stringify(mappings));
            linkMappings = mappings;
            log("Saved mappings.");
        } catch (e) {
            log("Failed to save mappings:", e);
        }
    }

    // --- Core logic ---

    function getLinkTypeForUrl(url) {
        for (const mapping of linkMappings) {
            try {
                const regex = new RegExp(mapping.regex, 'i');
                if (regex.test(url)) return mapping.typeId;
            } catch (e) {
                log(`Invalid regex: ${mapping.regex}`, e);
            }
        }
        return null;
    }

    function setReactValue(element, value) {
        try {
            const lastValue = element.value;
            element.value = value;
            const event = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });
            const tracker = element._valueTracker;
            if (tracker) tracker.setValue(lastValue);
            element.dispatchEvent(event);
            element.dispatchEvent(changeEvent);
        } catch (e) {
            log('Error setting React value:', e);
        }
    }

    let lastCleanedUrlData = null;

    function handlePaste(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' && target.placeholder && (target.placeholder.includes('Add link') || target.placeholder.includes('Add another link'))) {
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            let urlToInsert = pastedText;

            // Specialized Springsteen cleaning (formerly in Release script)
            if (currentEntity === 'release') {
                const regexSpringsteenClean = /^(https?:\/\/www\.springsteenlyrics\.com\/bootlegs\.php\?item=\d+)(&.*)?$/i;
                const match = pastedText.match(regexSpringsteenClean);
                if (match) {
                    e.preventDefault();
                    urlToInsert = match[1];
                    log("Cleaned URL on paste:", urlToInsert);
                    if (document.queryCommandSupported('insertText')) {
                        document.execCommand('insertText', false, urlToInsert);
                    } else {
                        setReactValue(target, urlToInsert);
                    }
                }
            }

            const typeIdToSet = getLinkTypeForUrl(urlToInsert);
            if (typeIdToSet) {
                lastCleanedUrlData = { url: urlToInsert, typeId: typeIdToSet };
                log("Ready to auto-select type ID:", typeIdToSet);
            } else {
                lastCleanedUrlData = null;
            }
        }
    }

    function handleMutations(mutations) {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    let selectElement = node.matches('select.link-type') ? node : node.querySelector('select.link-type');
                    if (selectElement && lastCleanedUrlData) {
                        setTimeout(() => {
                            const typeId = lastCleanedUrlData.typeId;
                            const option = config.options.find(o => o.id === typeId);
                            if (option && selectElement.value !== typeId) {
                                setReactValue(selectElement, typeId);
                                log(`Set link type to ${typeId} (${option.name}).`);
                            }
                            const table = selectElement.closest('#external-links-editor');
                            if (table) {
                                const nextInput = table.querySelector('input[placeholder^="Add"]');
                                if (nextInput && nextInput !== document.activeElement) nextInput.focus();
                            }
                            lastCleanedUrlData = null;
                        }, 5);
                    }
                });
            }
        });
    }

    // --- Configuration UI ---

    function renderMappings(modalBody, openEditModalCallback) {
        modalBody.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'tbl';
        table.style.width = '100%';
        table.innerHTML = `<thead><tr><th>URL Regex</th><th>Maps To</th><th>Description</th><th>Actions</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');

        linkMappings.forEach((mapping, index) => {
            const opt = config.options.find(o => o.id === mapping.typeId);
            const typeLabel = opt ? opt.name.trim() : `ID: ${mapping.typeId}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${mapping.regex}</code></td>
                <td>${typeLabel}</td>
                <td>${mapping.description || ''}</td>
                <td>
                    <button class="edit-mapping" data-index="${index}">Edit</button>
                    <button class="delete-mapping" data-index="${index}">Delete</button>
                </td>
            `;
            tr.querySelector('.edit-mapping').onclick = () => openEditModalCallback(index);
            tr.querySelector('.delete-mapping').onclick = () => {
                const newMappings = [...linkMappings];
                newMappings.splice(index, 1);
                saveMappings(newMappings);
                renderMappings(modalBody, openEditModalCallback);
            };
            tbody.appendChild(tr);
        });
        modalBody.appendChild(table);
    }

    function showConfigModal() {
        if (isModalOpen) return;
        isModalOpen = true;

        const modal = document.createElement('div');
        Object.assign(modal.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '80%', maxHeight: '80%', backgroundColor: 'white', border: '1px solid #ccc',
            zIndex: '9999', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', overflowY: 'auto'
        });

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.innerHTML = `<h3>Link Type Mappings (${currentEntity})</h3><button id="close-modal">X</button>`;
        modal.appendChild(header);

        const body = document.createElement('div');
        modal.appendChild(body);

        const footer = document.createElement('div');
        footer.style.marginTop = '20px';
        const addBtn = document.createElement('button');
        addBtn.innerText = 'Add New Mapping';
        footer.appendChild(addBtn);
        modal.appendChild(footer);

        document.body.appendChild(modal);

        const closeModal = () => { modal.remove(); isModalOpen = false; };
        header.querySelector('#close-modal').onclick = closeModal;

        const openEditModal = (index = -1) => {
            const mapping = index >= 0 ? linkMappings[index] : { regex: '', typeId: config.options[0].id, description: '' };
            const editModal = document.createElement('div');
            Object.assign(editModal.style, {
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                backgroundColor: '#f9f9f9', border: '1px solid #aaa', padding: '20px', zIndex: '10000', boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            });
            
            let optionsHtml = config.options.map(o => `<option value="${o.id}" ${o.id === mapping.typeId ? 'selected' : ''}>${o.name}</option>`).join('');
            editModal.innerHTML = `
                <h4>${index >= 0 ? 'Edit' : 'Add'} Mapping</h4>
                <label>Regex: <input type="text" id="edit-regex" value="${mapping.regex}" style="width:300px"></label><br><br>
                <label>Type: <select id="edit-type">${optionsHtml}</select></label><br><br>
                <label>Desc: <input type="text" id="edit-desc" value="${mapping.description || ''}"></label><br><br>
                <button id="save-edit">Save</button> <button id="cancel-edit">Cancel</button>
            `;
            document.body.appendChild(editModal);

            editModal.querySelector('#cancel-edit').onclick = () => editModal.remove();
            editModal.querySelector('#save-edit').onclick = () => {
                const newMapping = {
                    regex: editModal.querySelector('#edit-regex').value,
                    typeId: editModal.querySelector('#edit-type').value,
                    description: editModal.querySelector('#edit-desc').value
                };
                const newMappings = [...linkMappings];
                if (index >= 0) newMappings[index] = newMapping;
                else newMappings.push(newMapping);
                saveMappings(newMappings);
                editModal.remove();
                renderMappings(body, openEditModal);
            };
        };

        addBtn.onclick = () => openEditModal();
        renderMappings(body, openEditModal);
    }

    function insertConfigButton() {
        const legend = document.querySelector('#external-links-editor fieldset legend');
        if (legend && !legend.querySelector('.autoselect-config-btn')) {
            const btn = document.createElement('button');
            btn.className = 'autoselect-config-btn';
            btn.type = 'button';
            btn.innerText = '⚙ Mappings';
            Object.assign(btn.style, { marginLeft: '10px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.8em' });
            btn.onclick = showConfigModal;
            legend.appendChild(btn);
        }
    }

    // --- Init ---

    function initialize() {
        linkMappings = loadMappings();
        requestAnimationFrame(insertConfigButton);
        document.addEventListener('paste', handlePaste, true);
        const observer = new MutationObserver(handleMutations);
        const timer = setInterval(() => {
            const container = document.getElementById('external-links-editor');
            if (container) {
                clearInterval(timer);
                const tbody = container.querySelector('tbody');
                if (tbody) observer.observe(tbody, { childList: true, subtree: true });
            }
        }, 500);
    }

    window.addEventListener('load', initialize);
})();
