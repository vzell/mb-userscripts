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

    // --- Configuration Modal UI Functions ---

    function renderMappings(modalBody, openEditModalCallback) {
        modalBody.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'tbl';
        table.style.width = '100%';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>URL Regex Pattern</th>
                    <th style="width: 150px;">Maps To (Type ID)</th>
                    <th style="width: 250px;">Description (Optional)</th>
                    <th style="width: 100px;">Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        linkMappings.forEach((mapping, index) => {
            const option = LINK_TYPES_OPTIONS_WORKS.find(opt => opt.id === mapping.typeId);
            const name = option ? option.name.replace(/&nbsp;/g, '').trim() : `Unknown ID (${mapping.typeId})`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; font-size: 0.9em; max-width: 300px; word-break: break-all; vertical-align: top; padding-right: 10px;">${mapping.regex}</td>
                <td style="vertical-align: top;">${name} (${mapping.typeId})</td>
                <td style="vertical-align: top;">${mapping.description || ''}</td>
                <td style="vertical-align: top;">
                    <button class="nobutton icon edit-item" type="button" data-index="${index}" title="Edit">✏️</button>
                    <button class="nobutton icon remove-item" type="button" data-index="${index}" title="Delete">❌</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        table.addEventListener('click', (e) => {
            const targetButton = e.target.closest('button.nobutton[data-index]');

            if (!targetButton) return;

            const index = parseInt(targetButton.dataset.index);

            if (isNaN(index)) {
                log("Error: Button clicked without valid data-index.");
                return;
            }

            if (targetButton.classList.contains('edit-item')) {
                log(`Edit button clicked for index: ${index}`);
                // Use the passed callback
                openEditModalCallback(index);
            } else if (targetButton.classList.contains('remove-item')) {
                log(`Remove button clicked for index: ${index}`);
                deleteMapping(index);
            }
        });

        modalBody.appendChild(table);

        const addButton = document.createElement('button');
        addButton.className = 'submit';
        addButton.textContent = 'Add New Mapping';
        addButton.style.marginTop = '15px';
        addButton.type = 'button';
        addButton.onclick = () => openEditModalCallback(null); // Use the passed callback
        modalBody.appendChild(addButton);
    }

    function deleteMapping(index) {
        linkMappings.splice(index, 1);
        saveMappings(linkMappings);
        const mainModalBody = document.getElementById('mb-autosel-modal-content');
        if (mainModalBody) renderMappings(mainModalBody, window.__mb_autosel_openEditModal);
        log(`Mapping at index ${index} deleted.`);
    }

    /**
     * Opens the modal for adding or editing a single mapping with ESC key handling.
     * @param {number|null} index - The index of the mapping to edit, or null to add a new one.
     * @param {Function} reEnableMainEscape - Callback to re-enable the main modal's ESC listener.
     */
    function openEditModal(index, reEnableMainEscape) {
        const isEditing = index !== null;
        const currentMapping = isEditing ? linkMappings[index] : { regex: '', typeId: LINK_TYPES_OPTIONS_WORKS[0].id, description: '' };

        // 1. Setup Modal DOM
        const overlay = document.createElement('div');
        overlay.id = 'mb-autosel-edit-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10002; display: flex; justify-content: center; align-items: center;';

        const modalContainer = document.createElement('div');
        modalContainer.style.cssText = 'background: white; padding: 20px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 500px; max-height: 90vh; overflow-y: auto;';

        modalContainer.innerHTML = `
            <h2>${isEditing ? 'Edit Mapping' : 'Add New Mapping'}</h2>
            <div id="esc-warning-container" style="min-height: 25px;"></div>
            <p style="color: grey; font-size: 0.9em;">Use standard JavaScript RegExp syntax. Remember to escape special characters if necessary.</p>
            <div style="margin-bottom: 10px;">
                <label for="regexInput" style="display: block; margin-bottom: 5px;"><strong>URL Regex Pattern:</strong></label>
                <input id="regexInput" type="text" value="${currentMapping.regex}" style="width: 98%; padding: 5px; border: 1px solid #ccc;">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="descriptionInput" style="display: block; margin-bottom: 5px;"><strong>Description (Optional):</strong></label>
                <input id="descriptionInput" type="text" value="${currentMapping.description || ''}" style="width: 98%; padding: 5px; border: 1px solid #ccc;">
            </div>
            <div style="margin-bottom: 20px;">
                <label for="typeSelect" style="display: block; margin-bottom: 5px;"><strong>Maps To Link Type:</strong></label>
                <select id="typeSelect" style="padding: 5px; border: 1px solid #ccc; width: 100%;">
                    ${LINK_TYPES_OPTIONS_WORKS.map(opt =>
                        `<option value="${opt.id}" ${currentMapping.typeId === opt.id ? 'selected' : ''}>${opt.name.replace(/&nbsp;/g, '').trim()} (${opt.id})</option>`
                    ).join('')}
                </select>
            </div>
            <button id="saveEditButton" class="submit" type="button" style="margin-right: 10px;">${isEditing ? 'Save Changes' : 'Add Mapping'}</button>
            <button id="cancelEditButton" type="button" class="btn">Cancel</button>
        `;

        overlay.appendChild(modalContainer);
        document.body.appendChild(overlay);

        // 2. Get References and Setup Handlers
        const saveButton = modalContainer.querySelector('#saveEditButton');
        const cancelButton = modalContainer.querySelector('#cancelEditButton');
        const regexInput = modalContainer.querySelector('#regexInput');
        const typeSelect = modalContainer.querySelector('#typeSelect');
        const descriptionInput = modalContainer.querySelector('#descriptionInput');
        const warningContainer = modalContainer.querySelector('#esc-warning-container');

        const initialMappingSnapshot = {
            regex: currentMapping.regex,
            typeId: currentMapping.typeId,
            description: currentMapping.description || ''
        };
        let isDiscardConfirmed = false;
        let timeoutId = null;

        const isDirty = () => {
            return regexInput.value.trim() !== initialMappingSnapshot.regex ||
                   typeSelect.value !== initialMappingSnapshot.typeId ||
                   descriptionInput.value.trim() !== initialMappingSnapshot.description;
        };

        // Define the close function which handles cleanup and re-enabling the main modal's listener
        const closeEditModal = () => {
            document.removeEventListener('keydown', handleEditEscapeKey);
            if (timeoutId) clearTimeout(timeoutId);
            overlay.remove();

            // CRITICAL STEP 3: Re-enable the main modal's escape handler
            reEnableMainEscape();
        };

        const handleEditEscapeKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                // This is now redundant but kept for safety in case of non-document event listeners
                e.stopImmediatePropagation();

                if (!isDirty()) {
                    // Nothing changed, close immediately
                    closeEditModal();
                    return;
                }

                // Changes exist (is dirty)
                if (isDiscardConfirmed) {
                    // Second press, discard changes and close
                    closeEditModal();
                } else {
                    // First press, show warning and await confirmation
                    warningContainer.innerHTML = `
                        <p id="esc-warning" style="color: #c0392b; background: #fbebeb; padding: 5px; border-radius: 3px; text-align: center; font-weight: bold; margin: 0;">
                            Unsaved changes. Press 'Esc' again or 'Cancel' to discard.
                        </p>
                    `;
                    isDiscardConfirmed = true;

                    // Reset the confirmation flag after 3 seconds
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        if (overlay.isConnected) {
                            isDiscardConfirmed = false;
                            warningContainer.innerHTML = '';
                        }
                    }, 3000);
                }
            }
        };

        // CRITICAL STEP 2: Attach listener for ESC key (This overrides the main listener)
        document.addEventListener('keydown', handleEditEscapeKey);


        saveButton.onclick = () => {
            const regex = regexInput.value.trim();
            const typeId = typeSelect.value;
            const description = descriptionInput.value.trim();

            if (!regex || !typeId) {
                console.error('Validation Error: Both Regex Pattern and Link Type are required.');
                return;
            }

            try {
                new RegExp(regex, 'i');
            } catch (e) {
                console.error(`Invalid Regular Expression: ${e.message}`);
                return;
            }

            const newMapping = { regex, typeId, description };

            if (isEditing) {
                linkMappings[index] = newMapping;
            } else {
                linkMappings.push(newMapping);
            }

            saveMappings(linkMappings);
            closeEditModal();
            const mainModalBody = document.getElementById('mb-autosel-modal-content');
            // Re-render the main modal content, ensuring the openEditModal callback is passed again
            if(mainModalBody) renderMappings(mainModalBody, reEnableMainEscape);
        };

        cancelButton.onclick = closeEditModal;
    }


    /**
     * Displays the main configuration modal with ESC key handling.
     */
    function showConfigModal() {
        if (isModalOpen) return;
        isModalOpen = true;

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'mb-autosel-modal-overlay';
        modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; justify-content: center; align-items: flex-start;';

        const modalContainer = document.createElement('div');
        modalContainer.style.cssText = 'background: white; padding: 20px; border-radius: 5px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 80%; max-width: 1000px; margin-top: 50px; max-height: 80vh; overflow-y: auto;';

        modalContainer.innerHTML = `
            <h1 style="border-bottom: 1px solid #ccc; padding-bottom: 10px;">MusicBrainz Auto-Select Configuration</h1>
            <p>Define custom Regular Expressions to automatically select a link type when a matching URL is pasted.</p>
            <div id="mb-autosel-modal-content"></div>
            <div style="padding-top: 20px; text-align: right;">
                <button id="closeModalButton" class="submit" type="button">Close</button>
            </div>
        `;

        modalOverlay.appendChild(modalContainer);
        document.body.appendChild(modalOverlay);

        const closeMainModal = () => {
            document.removeEventListener('keydown', handleMainEscapeKey);
            modalOverlay.remove();
            isModalOpen = false;
        };

        const handleMainEscapeKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeMainModal();
            }
        };

        // Function to remove the main handler (used when edit modal opens)
        const disableMainEscape = () => {
            document.removeEventListener('keydown', handleMainEscapeKey);
        };

        // Function to re-enable the main handler (used when edit modal closes)
        const reEnableMainEscape = () => {
            document.addEventListener('keydown', handleMainEscapeKey);
        };

        // Wrapper function for the edit modal, managing the listener hierarchy
        const hierarchicalOpenEditModal = (index) => {
            // CRITICAL STEP 1: Disable the main modal's listener before opening the child
            disableMainEscape();
            // Pass the re-enable function to the child modal
            openEditModal(index, reEnableMainEscape);
        };

        // Store the hierarchical opener globally (as a property of window) for use in renderMappings
        // This is a common pattern in user scripts to share functions without polluting the global scope too much.
        window.__mb_autosel_openEditModal = hierarchicalOpenEditModal;

        const modalBody = document.getElementById('mb-autosel-modal-content');
        renderMappings(modalBody, hierarchicalOpenEditModal); // Pass the opener to render

        // Attach main listener immediately (it will be disabled if the child opens)
        reEnableMainEscape();

        document.getElementById('closeModalButton').onclick = closeMainModal;
    }

    /**
     * Injects the configuration button into the page.
     */
    function insertConfigButton() {
        const legend = Array.from(document.querySelectorAll('fieldset > legend')).find(
            l => l.textContent.trim() === 'External links'
        );

        if (legend && !document.getElementById('mb-autosel-config-button')) {
            const configButton = document.createElement('button');
            configButton.id = 'mb-autosel-config-button';
            configButton.type = 'button';
            configButton.innerHTML = '⚙️ Configure mappings';

            configButton.style.cssText = `
                margin-left: 10px;
                background: #f0f0f0;
                border: 1px solid #ccc;
                padding: 2px 8px;
                border-radius: 3px;
                font-weight: normal;
                cursor: pointer;
                font-size: 0.8em;
                line-height: 1.2;
                vertical-align: middle;
            `;

            configButton.onmouseover = function() { this.style.backgroundColor = '#e0e0e0'; };
            configButton.onmouseout = function() { this.style.backgroundColor = '#f0f0f0'; };

            configButton.onclick = showConfigModal;

            legend.appendChild(configButton);
        }
    }

    // --- Initialization ---

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
