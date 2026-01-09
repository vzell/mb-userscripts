// ==UserScript==
// @name         VZ: SpringstenLyrics - Helper MusicBrainz UUID Paster
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2026-01-09
// @description  Adds an edit button and shortcuts to SpringstenLyrics website edit page
// @author       vzell with help of Gemini
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SpringsteenLyricsUUIDPaster-Helper.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SpringsteenLyricsUUIDPaster-Helper.user.js
// @icon         https://volkerzell.de/favicons/springsteenlyrics.ico
// @match        https://www.springsteenlyrics.com/bootlegs.php?item=*&category=*
// @match        https://www.springsteenlyrics.com/collection.php?item=*&category=*
// @match        https://www.springsteenlyrics.com/bootlegs.php?cmd=edit*
// @match        https://www.springsteenlyrics.com/collection.php?cmd=edit*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const MB_URL_REGEX = /^https:\/\/musicbrainz\.org\/release\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/.*)?$/i;

    // --- HELPER: Process text (Logic from your original script) ---
    function processMbidText(text, inputField, feedbackFn) {
        const cleanText = text.trim();
        const urlMatch = cleanText.match(MB_URL_REGEX);

        if (urlMatch) {
            inputField.value = urlMatch[1].toLowerCase();
            feedbackFn(true);
            return true;
        } else if (UUID_REGEX.test(cleanText)) {
            inputField.value = cleanText.toLowerCase();
            feedbackFn(true);
            return true;
        } else {
            inputField.value = "INVALID FORMAT";
            feedbackFn(false);
            setTimeout(() => { if (inputField.value === "INVALID FORMAT") inputField.value = ''; }, 1500);
            return false;
        }
    }

    // --- LOGIC FOR BOOTLEG VIEW PAGE ---
    if (currentUrl.includes('item=') && !currentUrl.includes('cmd=edit')) {
        const editLink = document.querySelector('.blog-post a[href*="cmd=edit"]');
        if (editLink && editLink.textContent.toLowerCase().includes('edit item')) {
            const btn = document.createElement('button');
            btn.innerText = 'Add MusicBrainz MBID';
            btn.type = 'button';
            btn.className = 'btn btn-xs btn-outline-primary';
            btn.style.marginLeft = '5px';
            btn.onclick = (e) => {
                e.preventDefault();
                sessionStorage.setItem('autoPasteMBID', 'true');
                editLink.click();
            };
            editLink.parentNode.insertBefore(btn, editLink.nextSibling);
        }
    }

    // --- LOGIC FOR EDIT PAGE ---
    if (currentUrl.includes('cmd=edit')) {
        const inputField = document.getElementById('db_musicbrainz');
        if (!inputField) return;

        const parentLabel = inputField.closest('.input');
        const parentRow = inputField.closest('.row');

        const setValidationFeedback = (isValid) => {
            if (!parentRow) return;
            if (parentLabel) parentLabel.style.border = isValid ? '1px solid #ccc' : '2px solid red';
            let msg = parentRow.querySelector('.validation-error-message');
            if (!isValid && !msg) {
                msg = document.createElement('p');
                msg.className = 'validation-error-message';
                msg.style.color = 'red';
                msg.style.fontSize = '12px';
                msg.textContent = 'Invalid MusicBrainz ID format.';
                parentRow.appendChild(msg);
            } else if (isValid && msg) {
                msg.remove();
            }
        };

        // Create a "Paste" helper button on the edit page
        const pasteBtn = document.createElement('button');
        pasteBtn.innerText = '📋 Paste from Clipboard';
        pasteBtn.type = 'button';
        pasteBtn.style.cssText = 'margin-top: 5px; display: block; cursor: pointer; padding: 4px 8px; background: #e7f3ff; border: 1px solid #b2d7ff; border-radius: 4px; font-size: 11px;';

        pasteBtn.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                processMbidText(text, inputField, setValidationFeedback);
            } catch (err) {
                alert("Permission to read clipboard was denied. Please paste manually (Ctrl+V).");
            }
        };

        inputField.parentNode.appendChild(pasteBtn);

        // Auto-focus logic
        if (sessionStorage.getItem('autoPasteMBID') === 'true') {
            sessionStorage.removeItem('autoPasteMBID');
            inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputField.focus();
            pasteBtn.style.backgroundColor = '#fff9c4'; // Highlight the button to guide the user
            pasteBtn.innerText = '📋 Click here to Paste MBID';
        }

        // Keep your original Manual Paste listener
        inputField.addEventListener('paste', (e) => {
            let pastedText = (e.clipboardData || window.clipboardData).getData('text');
            e.preventDefault();
            processMbidText(pastedText, inputField, setValidationFeedback);
        });

        inputField.addEventListener('input', () => {
            setValidationFeedback(inputField.value.trim() === "" || UUID_REGEX.test(inputField.value.trim()));
        });
    }
})();
