// ==UserScript==
// @name         VZ: MusicBrainz - Customizable Selector for Packaging, Type, Status, Language and Script on release pages
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.1+2025-11-29
// @description  Adds customizable quick-select buttons for Primary Type, Status, Language, Script and Packaging on release pages
// @author       vzell + Gemini
// @tag          AI generated
// @homepage     https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableMultiSelector.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableMultiSelector.user.js
// @match        https://musicbrainz.org/release/add
// @match        https://musicbrainz.org/release/*/edit
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    // Define all fields managed by this script
    const FIELD_CONFIGS = [
        {
            id: 'packaging', // Element ID on the page (e.g., #packaging)
            storageKey: 'mbPackaging',
            default: ['Jewel Case', 'None', 'Fatbox'],
            label: 'Packaging',
            rowsContainerClass: '.quick-add-packaging-rows',
            rowClass: '.packaging-row',
        },
        {
            id: 'primary-type',
            storageKey: 'mbPrimaryType',
            default: ['Album', 'EP', 'Single'],
            label: 'Primary Type',
            rowsContainerClass: '.quick-add-primary-type-rows',
            rowClass: '.primary-type-row',
        },
        {
            id: 'status',
            storageKey: 'mbStatus',
            default: ['Bootleg', 'Official', 'Promotion'],
            label: 'Status',
            rowsContainerClass: '.quick-add-status-rows',
            rowClass: '.status-row',
        },
        {
            id: 'language',
            storageKey: 'mbLanguage',
            default: ['English', 'German', 'Japanese'],
            label: 'Language',
            // Language/Script typically do not have redundant quick-add rows to hide.
            rowsContainerClass: null,
            rowClass: null,
        },
        {
            id: 'script',
            storageKey: 'mbScript',
            default: ['Latin', 'Japanese'],
            label: 'Script',
            rowsContainerClass: null,
            rowClass: null,
        },
    ];

    // Global variable to hold the full list of options for configuration
    const ALL_FIELD_OPTIONS = {};

    // --- Utility Functions ---

    /**
     * Forces the value of a React-controlled select/input element by
     * dispatching necessary DOM events.
     * @param {HTMLSelectElement|HTMLInputElement} input The element to update.
     * @param {string} value The new value.
     */
    function forceValue(input, value) {
        if (!input) return;

        // 1. Set the value directly
        input.value = value;

        // 2. Dispatch 'input' event (bubbles up to notify React of change)
        let inputEvent = new InputEvent('input', { bubbles: true });
        input.dispatchEvent(inputEvent);

        // 3. Dispatch 'change' event (standard event for select fields)
        let changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);

        // 4. Dispatch 'blur' event (often triggers validation/save state in frameworks)
        let blurEvent = new Event('blur', { bubbles: true });
        input.dispatchEvent(blurEvent);
    }

    /**
     * Retrieves the stored preferences for a given field, or returns the default.
     * @param {string} storageKey The key used to store the preferences (e.g., 'mbPackaging').
     * @param {string[]} defaultValue The default array if nothing is stored.
     * @returns {string[]} The array of preferred values.
     */
    function loadPreferences(storageKey, defaultValue) {
        try {
            const stored = GM_getValue(storageKey);
            // Ensure the stored value is an array before returning
            return (stored && Array.isArray(JSON.parse(stored))) ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            console.error(`[MB-Selector] Error loading preferences for ${storageKey}:`, e);
            return defaultValue;
        }
    }

    /**
     * Creates a button click handler that updates the target select element.
     * @param {HTMLSelectElement} selectElement The select element to update.
     * @param {string} value The value to set.
     */
    function createClickHandler(selectElement, value) {
        return function(e) {
            e.preventDefault();
            // Original logic for setting value is kept:
            selectElement.value = value;
            // The fix: Use the updated forceValue function to notify React.
            forceValue(selectElement, value);
        };
    }

    /**
     * Creates quick-select buttons based on user preferences.
     * @param {HTMLSelectElement} selectElement The target select element.
     * @param {string[]} preferences Array of preferred option text values.
     * @returns {HTMLButtonElement[]} Array of buttons.
     */
    function createButtonsFromPreferences(selectElement, preferences) {
        const buttons = [];
        const optionsMap = new Map();

        // Map option text content (normalized) to its value
        Array.from(selectElement.options).forEach(option => {
            optionsMap.set(option.textContent.trim().toLowerCase(), option.value);
        });

        preferences.forEach(pref => {
            const normalizedPref = pref.trim().toLowerCase();
            const value = optionsMap.get(normalizedPref);

            if (value !== undefined) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = pref;
                button.className = 'button btn-default'; // Start as default, primary added in updateReleaseEditorUI
                button.title = `Quick select: ${pref}`;
                button.style.marginRight = '5px';
                button.style.marginBottom = '5px';
                button.onclick = createClickHandler(selectElement, value);
                buttons.push(button);
            }
        });

        return buttons;
    }

    /**
     * Adds the quick-select buttons and config button to the DOM.
     * @param {HTMLSelectElement} selectElement The element to place the buttons after.
     * @param {HTMLButtonElement[]} buttons The buttons to insert.
     * @param {object} config The configuration object for the field.
     */
    function addButtonsAfter(selectElement, buttons, config) {
        const { id } = config;

        // 1. Remove old container if it exists (in case the observer fires multiple times)
        const oldContainer = document.getElementById(`quick-add-${id}-container`);
        if (oldContainer) {
            oldContainer.remove();
        }

        // 2. Create the new container
        const container = document.createElement('div');
        container.id = `quick-add-${id}-container`;
        container.style.marginTop = '10px';
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.alignItems = 'center';

        // 3. Add Quick Buttons
        buttons.forEach(button => container.appendChild(button));

        // 4. Add Configuration Button
        const configButton = document.createElement('button');
        configButton.type = 'button';
        configButton.textContent = '⚙️'; // Changed from '⚙️ Config' to just '⚙️'
        configButton.className = 'button btn-default';
        configButton.title = 'Configure quick-select buttons';
        // Set margin-left to auto to push it to the right, and add 5px right and bottom margin
        // Format: top right bottom left
        configButton.style.margin = '0 5px 5px auto';
        configButton.onclick = () => showSettingsDialog(config);

        container.appendChild(configButton);

        // 5. Insert into the DOM
        selectElement.parentNode.insertBefore(container, selectElement.nextSibling);
        return container;
    }

    /**
     * Updates the UI state (colors buttons) based on the currently selected value.
     * @param {string} typeId The ID of the field.
     */
    function updateReleaseEditorUI(typeId) {
        const selectElement = document.getElementById(typeId);
        const container = document.getElementById(`quick-add-${typeId}-container`);

        if (!selectElement || !container) return;

        const selectedText = selectElement.options[selectElement.selectedIndex].textContent.trim().toLowerCase();

        // Iterate over all buttons *except* the last one (which is the Config button)
        const quickButtons = Array.from(container.querySelectorAll('button:not(:last-child)'));

        quickButtons.forEach(button => {
            const buttonText = button.textContent.trim().toLowerCase();
            if (buttonText === selectedText) {
                button.classList.add('btn-primary');
                button.classList.remove('btn-default');
            } else {
                button.classList.remove('btn-primary');
                button.classList.add('btn-default');
            }
        });
    }

    /**
     * Gathers all available options from the select element and stores them globally.
     * @param {string} id The element ID.
     */
    function collectAllOptions(id) {
        const selectElement = document.getElementById(id);
        if (selectElement) {
            // Store the text content of all options that have a value
            ALL_FIELD_OPTIONS[id] = Array.from(selectElement.options)
                .filter(option => option.value !== '')
                .map(option => option.textContent.trim());
        }
    }

    /**
     * Contains the actual logic to collect options, create buttons, and set up
     * the value observer, assuming the selectElement is already in the DOM.
     * @param {object} config The configuration object for the field.
     */
    function buildQuickAddUI(config) {
        const { id, storageKey, default: defaultValue, rowsContainerClass } = config;

        const selectElement = document.getElementById(id);
        if (!selectElement) return;

        // 0. Collect all options for the config modal
        collectAllOptions(id);

        const preferredValues = loadPreferences(storageKey, defaultValue);
        const buttons = createButtonsFromPreferences(selectElement, preferredValues);

        // 1. Add Buttons and Config button
        const quickAddContainer = addButtonsAfter(selectElement, buttons, config);

        // 2. Hide existing elements and restructure the DOM (only once on initial load)
        const initializedAttr = `data-mb-selector-${id}-initialized`;
        if (!selectElement.hasAttribute(initializedAttr)) {
            // Find the container of the existing quick-add rows (for Packaging, Type, Status)
            const rowsContainer = rowsContainerClass ? document.querySelector(rowsContainerClass) : null;

            if (rowsContainer && rowsContainerClass) {
                // Hide the existing select rows container entirely
                rowsContainer.style.display = 'none';

                // Move the quickAddContainer below the fieldset/legend for better layout flow
                const fieldset = rowsContainer.closest('fieldset');
                if (fieldset) {
                    const targetElement = fieldset.querySelector('h2') || fieldset.querySelector('legend') || fieldset;
                    if (targetElement) {
                        targetElement.parentNode.insertBefore(quickAddContainer, fieldset.nextSibling);
                    } else {
                        fieldset.parentNode.insertBefore(quickAddContainer, fieldset.nextSibling);
                    }
                } else {
                    // Fallback insertion after the original rows container
                    rowsContainer.parentElement.insertBefore(quickAddContainer, rowsContainer.nextSibling);
                }
            }

            // Mark as initialized
            selectElement.setAttribute(initializedAttr, 'true');

            // 3. Set up observer to watch for changes to the select element's value (React state change)
            const observer = new MutationObserver(function(mutations) {
                updateReleaseEditorUI(id);
            });

            // Observe changes to the select element's value attribute
            observer.observe(selectElement, {
                attributes: true,
                attributeFilter: ['value']
            });
        }

        // 4. Initial UI update
        updateReleaseEditorUI(id);
    }


    /**
     * Sets up the quick-add UI for a specific field, including the MutationObserver to wait for the element.
     * This is the function called for each config entry.
     * @param {object} config The configuration object for the field.
     */
    function setupQuickAddUI(config) {
        const { id } = config;

        let selectElement = document.getElementById(id);

        if (selectElement) {
            // Element found immediately: run the builder function
            buildQuickAddUI(config);
            return;
        }

        // Element not found: set up MutationObserver to wait for it
        const observer = new MutationObserver((mutationsList, observer) => {
            selectElement = document.getElementById(id);
            if (selectElement) {
                // Element found by observer: run the builder function and disconnect
                buildQuickAddUI(config);
                observer.disconnect();
            }
        });

        // Observe the main form container or body for new nodes being added
        const formContainer = document.querySelector('form.edit-release');
        if (formContainer) {
            observer.observe(formContainer, { childList: true, subtree: true });
        } else {
            // Fallback to observing the body
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }


    // --- Configuration Dialog Functions ---

    /**
     * Shows a modal dialog for configuring a single field.
     * @param {object} config The configuration object for the field to customize.
     */
    function showSettingsDialog(config) {
        const { id, label, storageKey, default: defaultValue } = config;
        const availableOptions = ALL_FIELD_OPTIONS[id] || [];
        const selectedOptions = loadPreferences(storageKey, defaultValue);

        // --- Dialog Creation ---
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            border: 1px solid #ccc;
        `;

        // Create a header
        const header = document.createElement('h3');
        header.textContent = `Customize ${label} Buttons`;
        header.style.marginTop = '0';
        header.style.marginBottom = '15px';
        dialog.appendChild(header);

        // Create description
        const description = document.createElement('p');
        description.textContent = `Select which ${label.toLowerCase()} you want to appear as quick buttons:`;
        description.style.marginBottom = '10px';
        dialog.appendChild(description);

        // Create the options list
        const optionsContainer = document.createElement('div');
        optionsContainer.style.maxHeight = '300px';
        optionsContainer.style.overflowY = 'auto';
        optionsContainer.style.border = '1px solid #eee';
        optionsContainer.style.padding = '10px';
        optionsContainer.style.marginBottom = '15px';

        // Sort options alphabetically
        availableOptions.sort();

        // Create checkboxes for all available options
        availableOptions.forEach(option => {
            const optionLabel = document.createElement('label');
            optionLabel.style.display = 'block';
            optionLabel.style.marginBottom = '5px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option;

            // Check if this option is currently selected (case-insensitive check)
            const isSelected = selectedOptions.some(
                selected => selected.trim().toLowerCase() === option.trim().toLowerCase()
            );
            checkbox.checked = isSelected;
            checkbox.style.marginRight = '5px';

            optionLabel.appendChild(checkbox);
            optionLabel.appendChild(document.createTextNode(option));
            optionsContainer.appendChild(optionLabel);
        });

        dialog.appendChild(optionsContainer);

        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'btn';
        cancelButton.style.padding = '6px 12px';
        cancelButton.style.border = '1px solid #ccc';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.backgroundColor = '#f8f8f8';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.marginRight = '10px';

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'submit';
        saveButton.style.padding = '6px 12px';
        saveButton.style.border = '1px solid #4CAF50';
        saveButton.style.borderRadius = '4px';
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.style.color = 'white';
        saveButton.style.cursor = 'pointer';
        saveButton.style.fontWeight = 'bold';


        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);
        dialog.appendChild(buttonContainer);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 9999;
        `;

        // Add to document
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        const closeDialog = () => {
            document.removeEventListener('keydown', handleEscapeKey);
            dialog.remove();
            overlay.remove();
        };

        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDialog();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);

        // Handle cancel
        cancelButton.addEventListener('click', closeDialog);

        // Handle save
        saveButton.addEventListener('click', function() {
            const newSelection = [];
            const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    newSelection.push(checkbox.value);
                }
            });

            // Save new preferences for this specific field
            GM_setValue(storageKey, JSON.stringify(newSelection));

            closeDialog();

            // Reload the page to apply changes
            location.reload();
        });
    }


    // --- Main Initialization ---

    function initialize() {
        // Iterate over all field configurations and set up the UI for each
        FIELD_CONFIGS.forEach(config => {
            setupQuickAddUI(config);
        });
    }

    // Wait for the page to fully load before trying to manipulate the DOM
    window.addEventListener('load', initialize);

})();
