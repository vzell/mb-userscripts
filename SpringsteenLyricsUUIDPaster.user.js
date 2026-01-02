// ==UserScript==
// @name         VZ: SpringstenLyrics - MusicBrainz UUID Paster
// @namespace    https://github.com/vzell/mb-userscripts
// @version      2.1+2026-01-02
// @description  Validates MusicBrainz UUIDs when pasting them on the SpringstenLyrics website, supports URL extraction
// @author       vzell with help of Gemini
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SpringsteenLyricsUUIDPaster.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SpringsteenLyricsUUIDPaster.user.js
// @icon         https://volkerzell.de/favicons/springsteenlyrics.ico
// @match        https://www.springsteenlyrics.com/bootlegs.php?cmd=edit*
// @match        https://www.springsteenlyrics.com/collection.php?cmd=edit*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // The UUID format regex
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    // Regex to match MusicBrainz release URLs and capture the UUID
    // Matches: https://musicbrainz.org/release/<UUID> or https://musicbrainz.org/release/<UUID>/edit
    const MB_URL_REGEX = /^https:\/\/musicbrainz\.org\/release\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/.*)?$/i;

    const inputField = document.getElementById('db_musicbrainz');

    if (inputField) {
        const parentLabel = inputField.closest('.input');
        const parentRow = inputField.closest('.row');

        if (!parentLabel || !parentRow) {
            console.error("Tampermonkey Script: Could not find required parent elements for styling.");
            return;
        }

        function setValidationFeedback(isValid) {
            if (isValid) {
                parentLabel.style.border = '1px solid #ccc';
                let existingError = parentRow.querySelector('.validation-error-message');
                if (existingError) {
                    existingError.remove();
                }
            } else {
                parentLabel.style.border = '2px solid red';
                let existingError = parentRow.querySelector('.validation-error-message');
                if (!existingError) {
                    const errorMessage = document.createElement('p');
                    errorMessage.className = 'validation-error-message';
                    errorMessage.style.color = 'red';
                    errorMessage.style.fontSize = '12px';
                    errorMessage.style.marginTop = '5px';
                    errorMessage.textContent = 'Invalid MusicBrainz ID format. Must be a valid UUID or a musicbrainz.org/release URL.';
                    parentRow.appendChild(errorMessage);
                }
            }
        }

        inputField.addEventListener('paste', function(e) {
            let pastedText = (e.clipboardData || window.clipboardData).getData('text').trim();

            // Check if the pasted text is a MusicBrainz URL
            const urlMatch = pastedText.match(MB_URL_REGEX);

            if (urlMatch) {
                // If it's a URL, intercept the paste, extract the UUID group, and set the value
                e.preventDefault();
                const extractedUuid = urlMatch[1].toLowerCase();
                inputField.value = extractedUuid;
                setValidationFeedback(true);
            } else if (pastedText && !UUID_REGEX.test(pastedText)) {
                // If it's not a URL and not a valid plain UUID, block it
                e.preventDefault();
                setValidationFeedback(false);

                inputField.value = "PASTE BLOCKED: Invalid format.";
                setTimeout(() => {
                    if (inputField.value === "PASTE BLOCKED: Invalid format.") {
                        inputField.value = '';
                    }
                }, 1500);
            }
        });

        inputField.addEventListener('input', function() {
            const currentValue = inputField.value.trim();

            if (currentValue === "") {
                setValidationFeedback(true);
            } else if (UUID_REGEX.test(currentValue)) {
                setValidationFeedback(true);
            } else {
                setValidationFeedback(false);
            }
        });

        if (inputField.value.length > 0) {
            setValidationFeedback(UUID_REGEX.test(inputField.value));
        }
    }
})();
