// ==UserScript==
// @name         VZ: MusicBrainz - Auto-Select External Link Types
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.2+2025-11-29
// @description  Auto-Select External Link Types on release pages, allows configuration of link mappings (URL Regex -> Link Type ID)
// @author       Gemini with vzell
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/AutoSelectExternalLinkType.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicBrainz.org/release/add
// @match        https://musicBrainz.org/release/*/edit
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = true; // Set to true to see logs in console

    function log(...args) {
        if (DEBUG) console.log('[MB-Discography-AutoSelect]', ...args);
    }

    const STORAGE_KEY = 'MB_AutoSelect_Mappings';

    const LINK_TYPES_OPTIONS = [
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
    ];

    const DEFAULT_MAPPINGS = [
        { regex: "^(https?://www\\.springsteenlyrics\\.com/bootlegs\\.php\\?item=\\d+)(&.*)?$", typeId: "288", description: "SpringsteenLyrics bootleg entry (cleaned)" },
        { regex: "^https?://www\\.jungleland\.it/html/.*\\.htm$", typeId: "288", description: "Jungleland discography page" },
        { regex: "^https?://nugs\\.net/", typeId: "74", description: "Nugs.net primary URL" },
    ];

    let linkMappings = [];
    let isModalOpen = false;

    // --- Persistence Functions ---

    function loadMappings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored) || DEFAULT_MAPPINGS;
            }
        } catch (e) {
            log("Failed to load mappings from localStorage. Using defaults.", e);
        }
        return DEFAULT_MAPPINGS;
    }

    function saveMappings(mappings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
            linkMappings = mappings;
            log("Saved and updated link mappings.");
        } catch (e) {
            log("Failed to save mappings to localStorage:", e);
        }
    }

    // --- Core Logic (Paste/Select) ---

    function getLinkTypeForUrl(url) {
        for (const mapping of linkMappings) {
            let regex;
            try {
                regex = new RegExp(mapping.regex, 'i');
                if (regex.test(url)) {
                    return mapping.typeId;
                }
            } catch (e) {
                log(`Invalid regex in mapping: ${mapping.regex}`, e);
                continue;
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
            if (tracker) {
                tracker.setValue(lastValue);
            }

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
            const regexSpringsteenClean = /^(https?:\/\/www\.springsteenlyrics\.com\/bootlegs\.php\?item=\d+)(&.*)?$/i;
            const match = pastedText.match(regexSpringsteenClean);

            let urlToInsert = pastedText;

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

            const typeIdToSet = getLinkTypeForUrl(urlToInsert);

            if (typeIdToSet) {
                 lastCleanedUrlData = { url: urlToInsert, typeId: typeIdToSet };
                 log("Paste detected for target URL type. Ready to auto-select.");
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
                        log("Found select element and last pasted URL is a target type. Executing direct selection.");

                        setTimeout(() => {
                            const linkValueToSet = lastCleanedUrlData.typeId;

                            if (linkValueToSet) {
                                const selectedOption = LINK_TYPES_OPTIONS.find(o => o.id === linkValueToSet);
                                if (selectedOption) {
                                    if (selectElement.value !== linkValueToSet) {
                                        setReactValue(selectElement, linkValueToSet);
                                        log(`Successfully set link type value to ${linkValueToSet} (${selectedOption.name.trim()}).`);
                                    } else {
                                        log(`Type already set to ${linkValueToSet}.`);
                                    }
                                }
                            }

                            const table = selectElement.closest('#external-links-editor');
                            if (table) {
                                const nextInput = table.querySelector('input[placeholder^="Add"]');

                                if (nextInput && nextInput !== document.activeElement) {
                                    nextInput.focus();
                                    log("Focus moved to the next link input.");
                                }
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
            const option = LINK_TYPES_OPTIONS.find(opt => opt.id === mapping.typeId);
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
        const currentMapping = isEditing ? linkMappings[index] : { regex: '', typeId: LINK_TYPES_OPTIONS[0].id, description: '' };

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
                    ${LINK_TYPES_OPTIONS.map(opt =>
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
        const legend = Array.from(document.querySelectorAll('fieldset.information > legend')).find(
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
        // 1. Load mappings from storage
        linkMappings = loadMappings();

        // 2. Inject configuration button
        requestAnimationFrame(insertConfigButton);

        // 3. Attach paste handler
        document.addEventListener('paste', handlePaste, true);

        // 4. Start MutationObserver
        const observer = new MutationObserver(handleMutations);
        const waitForContainer = setInterval(() => {
            const container = document.getElementById('external-links-editor-container');
            if (container) {
                log("Container found, starting observer.");
                clearInterval(waitForContainer);
                const tbody = container.querySelector('tbody');
                if (tbody) {
                    observer.observe(tbody, { childList: true, subtree: true });
                }
            }
        }, 500);
    }

    // Run initialization once the DOM is ready
    window.addEventListener('load', initialize);

})();
