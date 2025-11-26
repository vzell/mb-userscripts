// ==UserScript==
// @name         MusicBrainz Customizable Status Selector
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0
// @description  Add customizable quick- button for status in MusicBrainz release editor
// @author       YoGo9 & vzell
// @homepage     https://github.com/vzell/mb-userscripts
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableStatusSlector.user.js
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/CustomizableStatusSlector.user.js
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @match        https://musicbrainz.org/release/*/edit
// @match        https://beta.musicbrainz.org/release/*/edit
// @match        https://musicbrainz.org/release/add*
// @match        https://beta.musicbrainz.org/release/add*
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Default settings - modify these for your preferred statuses
    const DEFAULT_STATUS = ['Bootleg', 'Official', 'Promotion'];

    // Load user settings or use defaults
    let preferredStatus = GM_getValue('mbStatus', DEFAULT_STATUS);

    // Function to properly set value in React components
    function forceValue(input, value) {
        // Force react state change by bubbling up the input event
        input.dispatchEvent(new Event("input", {bubbles: true}));
        // Use native input value setter to bypass React (simple value setter is overridden by react)
        (Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value").set).call(input, value);
        // Trigger change event to update React state
        input.dispatchEvent(new Event("change", {bubbles: true}));
    }

    // Function to find the correct option value by text
    function findOptionValueByText(selectElement, text) {
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].text.trim() === text) {
                return selectElement.options[i].value;
            }
        }
        return null;
    }

    // Function to get all available options from a select element
    function getAvailableOptions(selectElement) {
        const options = [];

        for (let i = 0; i < selectElement.options.length; i++) {
            const optionText = selectElement.options[i].text.trim();
            if (optionText && optionText !== '—' && optionText !== '⠀') {
                options.push(optionText);
            }
        }
        return options;
    }

    // Function to add buttons after a specified element
    function addButtonsAfter(element, buttons, isMultiSelect = false) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.marginLeft = '15px';
        buttonContainer.style.marginTop = '5px';

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.textContent = button.text;
            btn.type = 'button'; // Prevent form submission

            // Apply nice styling to the buttons
            btn.style.marginRight = '10px';
            btn.style.padding = '4px 12px';
            btn.style.backgroundColor = '#eee';
            btn.style.border = '1px solid #ccc';
            btn.style.borderRadius = '4px';
            btn.style.fontFamily = 'inherit';
            btn.style.fontSize = '13px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s ease';

            // Hover effect
            btn.addEventListener('mouseover', function() {
                btn.style.backgroundColor = '#ddd';
                btn.style.borderColor = '#bbb';
            });

            btn.addEventListener('mouseout', function() {
                btn.style.backgroundColor = '#eee';
                btn.style.borderColor = '#ccc';
            });

            // Active effect
            btn.addEventListener('mousedown', function() {
                btn.style.backgroundColor = '#ccc';
                btn.style.transform = 'translateY(1px)';
            });

            btn.addEventListener('mouseup', function() {
                btn.style.backgroundColor = '#ddd';
                btn.style.transform = 'translateY(0)';
            });

            // Use different click handlers for multi-select vs. single-select
            if (isMultiSelect) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault(); // Prevent any form submission
                    button.onClick(e);
                    return false;
                });
            } else {
                btn.addEventListener('click', function(e) {
                    e.preventDefault(); // Prevent any form submission
                    button.onClick(e);
                    return false;
                });
            }

            buttonContainer.appendChild(btn);
        });

        // Add settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = '⚙️';
        settingsBtn.title = 'Settings';
        settingsBtn.type = 'button'; // Prevent form submission
        settingsBtn.style.marginLeft = '5px';
        settingsBtn.style.padding = '4px 8px';
        settingsBtn.style.backgroundColor = '#f8f8f8';
        settingsBtn.style.border = '1px solid #ddd';
        settingsBtn.style.borderRadius = '4px';
        settingsBtn.style.cursor = 'pointer';

        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent any form submission
            // Determine which type of selector this is
            let type = 'status';
            showSettingsDialog(type, getAvailableOptions(element), preferredStatus);
            return false;
        });

        buttonContainer.appendChild(settingsBtn);
        element.parentNode.insertBefore(buttonContainer, element.nextSibling);
    }

    // Function to show settings dialog
    function showSettingsDialog(type, availableOptions, selectedOptions) {
        // Create and style the dialog
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = '10000';
        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        dialog.style.width = '400px';
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        // Create a header
        const header = document.createElement('h3');
        header.textContent = 'Customize Status Button';
        header.style.marginTop = '0';
        header.style.marginBottom = '15px';
        dialog.appendChild(header);

        // Create description
        const description = document.createElement('p');
        description.textContent = `Select which ${type} you want to appear as quick buttons:`;
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
            checkbox.checked = selectedOptions.includes(option);
            checkbox.style.marginRight = '5px';

            optionLabel.appendChild(checkbox);
            optionLabel.appendChild(document.createTextNode(option));
            optionsContainer.appendChild(optionLabel);
        });

        dialog.appendChild(optionsContainer);

        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.padding = '6px 12px';
        cancelButton.style.border = '1px solid #ccc';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.backgroundColor = '#f8f8f8';
        cancelButton.style.cursor = 'pointer';

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.style.padding = '6px 12px';
        saveButton.style.border = '1px solid #4CAF50';
        saveButton.style.borderRadius = '4px';
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.style.color = 'white';
        saveButton.style.cursor = 'pointer';

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);
        dialog.appendChild(buttonContainer);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '9999';

        // Add to document
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        // Handle cancel
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        });

        // Handle save
        saveButton.addEventListener('click', function() {
            const newSelection = [];
            const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    newSelection.push(checkbox.value);
                }
            });

            preferredStatus = newSelection;
            GM_setValue('mbStatus', newSelection);

            document.body.removeChild(overlay);
            document.body.removeChild(dialog);

            // Reload the page to apply changes
            location.reload();
        });
    }

    // Function to create button objects from preferred options for single-select elements
    function createButtonsFromPreferences(selectElement, preferredOptions) {
        return preferredOptions.map(option => {
            // Skip options that don't exist in this context
            if (!findOptionValueByText(selectElement, option)) {
                return null;
            }

            return {
                text: option,
                onClick: function(e) {
                    e.preventDefault();
                    const value = findOptionValueByText(selectElement, option);
                    if (value) {
                        forceValue(selectElement, value);
                    } else {
                        alert(`${option} option not found in the dropdown`);
                    }
                    return false;
                }
            };
        }).filter(button => button !== null); // Remove null entries
    }

	// Function for updating the release editor status UI
    function updateReleaseEditorStatusUI() {
        // Make sure the "Add status" button is visible
        const addStatusButton = document.getElementById('add-status');
        if (addStatusButton) {
            addStatusButton.style.display = '';
        }

        // Show all status rows
        const statusRows = document.querySelectorAll('.select-list-row');
        for (let i = 0; i < statusRows.length; i++) {
            statusRows[i].style.display = '';
        }
    }

    // Function to add release editor status button
	function addReleaseEditorStatusButton() {
        // Check if the status rows container exists
        const statusRowsContainer = document.querySelector('.form-row-select-list');
        if (!statusRowsContainer) return;

        // Create a container div for the quick add buttons
        const quickAddContainer = document.createElement('div');
        quickAddContainer.style.margin = '10px 0';
        quickAddContainer.style.display = 'flex';
        quickAddContainer.style.alignItems = 'center';

        // Add a label
        const quickAddLabel = document.createElement('div');
        quickAddLabel.textContent = 'Quick add:';
        quickAddLabel.style.marginRight = '10px';
        quickAddLabel.style.fontWeight = 'bold';
        quickAddContainer.appendChild(quickAddLabel);

        // Create button container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.flexWrap = 'wrap';
        quickAddContainer.appendChild(buttonsDiv);

        // Get the first status select for option lookup
        const firstStatusSelect = document.querySelector('.select-list-row select');
        if (!firstStatusSelect) return;

        // Add buttons for each preferred status
        preferredStatus.forEach(status => {
            const btn = document.createElement('button');
            btn.textContent = status;
            btn.type = 'button';

            // Style the button
            btn.style.margin = '0 5px 5px 0';
            btn.style.padding = '4px 12px';
            btn.style.backgroundColor = '#eee';
            btn.style.border = '1px solid #ccc';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';

            // Get the status value
            const value = findOptionValueByText(firstStatusSelect, status);
            if (!value) {
                // Skip this status if it doesn't exist in the dropdown
                return;
            }

            // Add click handler
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                // Regular status handling - find or create an empty dropdown
                let emptySelect = null;
                const selects = document.querySelectorAll('.select-list-row select');

                // Look for an empty select
                for (let i = 0; i < selects.length; i++) {
                    if (!selects[i].value || selects[i].value === "") {
                        emptySelect = selects[i];
                        break;
                    }
                }

                if (!emptySelect) {
                    // If no empty select found, click the "Add status" button to add a new row
                    // and immediately set the value (to avoid the two-step click)
                    const addStatusButton = document.getElementById('add-status');
                    if (addStatusButton) {
                        // Temporarily store the original click handler
                        const originalClick = addStatusButton.onclick;

                        // Override the click handler to add our custom logic
                        addStatusButton.onclick = function(e) {
                            // Call the original handler to add the row
                            if (originalClick) {
                                originalClick.call(this, e);
                            }

                            // Wait a short time for the row to be added
                            setTimeout(() => {
                                // Find the newly added row
                                const newSelect = document.querySelector('.select-list-row:last-child select');
                                if (newSelect) {
                                    // Set the value of the new select
                                    forceValue(newSelect, value);
                                }

                                // Restore the original click handler
                                addStatusButton.onclick = originalClick;
                            }, 50);
                        };

                        // Trigger the click to add a new row
                        addStatusButton.click();
                    }
                } else {
                    // Use the empty select
                    forceValue(emptySelect, value);

		}
		return false;
	    });

	    buttonsDiv.appendChild(btn);
	});

	// Add settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = '⚙️';
        settingsBtn.title = 'Settings';
        settingsBtn.type = 'button';
        settingsBtn.style.margin = '0 5px 5px 0';
        settingsBtn.style.padding = '4px 8px';
        settingsBtn.style.backgroundColor = '#f8f8f8';
        settingsBtn.style.border = '1px solid #ddd';
        settingsBtn.style.borderRadius = '4px';
        settingsBtn.style.cursor = 'pointer';

        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showSettingsDialog('status', getAvailableOptions(firstStatusSelect), preferredStatus);
            return false;
        });

        buttonsDiv.appendChild(settingsBtn);

        // Find where to insert the quick add container
        let statusLabel = null;
        const labels = document.querySelectorAll('label');
        for (let i = 0; i < labels.length; i++) {
            if (labels[i].textContent.includes('Statuses')) {
                statusLabel = labels[i];
                break;
            }
        }

        if (statusLabel) {
            // Insert after the label's parent
            const parentElement = statusLabel.parentElement;
            if (parentElement && parentElement.parentElement) {
                parentElement.parentElement.insertBefore(quickAddContainer, statusRowsContainer.nextSibling);
            } else {
                // Fallback insertion
                statusRowsContainer.parentElement.insertBefore(quickAddContainer, statusRowsContainer.nextSibling);
            }
        } else {
            // Fallback - insert after the status rows container
            statusRowsContainer.parentElement.insertBefore(quickAddContainer, statusRowsContainer.nextSibling);
        }

        // Set up observers to watch for status changes
        const firstStatusSelectObserver = new MutationObserver(function(mutations) {
            updateReleaseEditorStatusUI();
        });

        // Observe changes to the first status select value
        firstStatusSelectObserver.observe(firstStatusSelect, {
            attributes: true,
            attributeFilter: ['value']
        });

        // Initial UI update
        updateReleaseEditorStatusUI();
    }

    // Wait for the page to fully load
    window.addEventListener('load', function() {
        // Add button for status selection in release editor
        const statusSelect = document.getElementById('status');
        if (statusSelect) {
            const statusButtons = createButtonsFromPreferences(statusSelect, preferredStatus);
            addButtonsAfter(statusSelect, statusButtons);
        }
    });
})();
