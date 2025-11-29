// ==UserScript==
// @name         VZ: SpringstenLyrics - MusicBrainz UUID Validator
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0+2025-11-29
// @description  Validates MusicBrainz UUIDs when pasting them on the SpringstenLyrics website
// @author       vzell with help of Gemini
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/MusicbrainzUUIDValidator.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/MusicbrainzUUIDValidator.user.js
// @icon         https://volkerzell.de/favicons/springsteenlyrics.ico
// @match        https://www.springsteenlyrics.com/bootlegs.php?cmd=edit*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // The UUID format regex:
    // ^      - Start of string
    // [0-9a-f]{8} - 8 lowercase hex digits
    // -      - Hyphen
    // [0-9a-f]{4} - 4 lowercase hex digits
    // ...
    // [0-9a-f]{12}$ - 12 lowercase hex digits, end of string
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    const inputField = document.getElementById('db_musicbrainz');

    if (inputField) {
        // Find the parent label/section to apply styling and messages
        const parentLabel = inputField.closest('.input');
        const parentRow = inputField.closest('.row');

        if (!parentLabel || !parentRow) {
            console.error("Tampermonkey Script: Could not find required parent elements for styling.");
            return;
        }

        // --- Helper Function to Handle Feedback ---
        function setValidationFeedback(isValid) {
            if (isValid) {
                // Remove error state
                parentLabel.style.border = '1px solid #ccc';
                let existingError = parentRow.querySelector('.validation-error-message');
                if (existingError) {
                    existingError.remove();
                }
            } else {
                // Apply error state
                parentLabel.style.border = '2px solid red';

                // Check for existing message to avoid duplicates
                let existingError = parentRow.querySelector('.validation-error-message');
                if (!existingError) {
                    const errorMessage = document.createElement('p');
                    errorMessage.className = 'validation-error-message';
                    errorMessage.style.color = 'red';
                    errorMessage.style.fontSize = '12px';
                    errorMessage.style.marginTop = '5px';
                    errorMessage.textContent = 'Invalid MusicBrainz ID format. Must be a valid UUID (8-4-4-4-12) using only lowercase hex characters (0-9, a-f).';
                    parentRow.appendChild(errorMessage);
                }
            }
        }

        // 1. Validate on Paste (to prevent invalid data from entering)
        inputField.addEventListener('paste', function(e) {
            // Get the pasted text
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');

            if (pastedText && !UUID_REGEX.test(pastedText)) {
                // If the pasted text is not a valid UUID, prevent the paste action
                e.preventDefault();
                setValidationFeedback(false);

                // Optionally, inform the user why the paste was blocked (using the same visual feedback)
                inputField.value = "PASTE BLOCKED: Invalid format.";
                // Clear the message after a short delay
                setTimeout(() => {
                    if (inputField.value === "PASTE BLOCKED: Invalid format.") {
                        inputField.value = '';
                    }
                }, 1500);
            }
        });


        // 2. Validate on Input (for real-time typing/editing feedback)
        inputField.addEventListener('input', function() {
            const currentValue = inputField.value;

            if (currentValue === "") {
                // If field is empty, clear feedback
                setValidationFeedback(true);
            } else if (UUID_REGEX.test(currentValue)) {
                // Valid UUID
                setValidationFeedback(true);
            } else {
                // Invalid UUID
                setValidationFeedback(false);
            }
        });

        // Initial validation check if the field is pre-filled
        if (inputField.value.length > 0) {
            setValidationFeedback(UUID_REGEX.test(inputField.value));
        }
    }
})();
