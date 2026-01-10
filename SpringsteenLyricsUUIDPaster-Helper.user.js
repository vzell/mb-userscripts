// ==UserScript==
// @name         VZ: SpringstenLyrics - MusicBrainz UUID Paster Helper
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.4+2026-01-10
// @description  Adds auto-login and an Add/Edit MBID button to the SpringstenLyrics website and shortcuts to the corresponding edit page
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

    // --- STYLES ---
    // Reduced padding from 4px to 1px for a slim profile
    const BUTTON_STYLE = `
        text-transform: none !important;
        background-color: #0056b3 !important;
        color: white !important;
        border: 1px solid #004494 !important;
        padding: 1px 8px !important;
        border-radius: 4px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
        margin-left: 5px;
        line-height: 1.4;
        display: inline-block;
        vertical-align: middle;
    `;

    function applyButtonFeedback(btn) {
        btn.onmouseover = () => { btn.style.backgroundColor = '#004494'; };
        btn.onmouseout = () => { btn.style.backgroundColor = '#0056b3'; };
        btn.onmousedown = () => { btn.style.backgroundColor = '#003366'; };
        btn.onmouseup = () => { btn.style.backgroundColor = '#004494'; };
    }

    // --- HELPER: Process text ---
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

    // --- LOGIC FOR VIEW PAGE (AUTO-LOGIN) ---
    if ((currentUrl.includes('item=') || currentUrl.includes('collection.php')) && !currentUrl.includes('cmd=edit')) {
        const editLink = document.querySelector('.blog-post a[href*="cmd=edit"]');

        if (editLink && editLink.textContent.toLowerCase().includes('edit item')) {
            const hasMbid = !!document.querySelector('a[href*="musicbrainz.org/release/"] img[src*="collection_musicbrainz.png"]');

            const btn = document.createElement('button');
            btn.innerText = hasMbid ? 'Edit MusicBrainz MBID' : 'Add MusicBrainz MBID';
            btn.type = 'button';
            btn.style.cssText = BUTTON_STYLE;

            applyButtonFeedback(btn);

            btn.onclick = (e) => {
                e.preventDefault();
                sessionStorage.setItem('autoPasteMBID', 'true');
                editLink.click();
            };
            editLink.parentNode.insertBefore(btn, editLink.nextSibling);
        } else {
            // Not logged in: Assisted Login
            const loginToggle = document.querySelector('li.dropdown a.dropdown-toggle i.bi-lock')?.closest('a');
            const loginSubmitBtn = document.querySelector('button[name="hBtnLogin"]');

            if (loginToggle && loginSubmitBtn) {
                if (!document.querySelector('li.dropdown.open')) {
                    loginToggle.click();
                }

                const helperBtn = document.createElement('button');
                const hasMbid = !!document.querySelector('a[href*="musicbrainz.org/release/"] img[src*="collection_musicbrainz.png"]');
                const actionText = hasMbid ? 'Edit MBID' : 'Add MBID';

                helperBtn.innerText = `🔑 Click to Login & ${actionText}`;
                // Specific styling for the large login helper button
                helperBtn.style.cssText = 'display: block; margin: 20px 0; padding: 6px 15px; background: #007bff; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-transform: none !important;';

                helperBtn.onclick = (e) => {
                    e.preventDefault();
                    sessionStorage.setItem('autoPasteMBID', 'true');
                    loginSubmitBtn.click();
                };

                const container = document.querySelector('.blog-post');
                if (container && !document.getElementById('assisted-login-btn')) {
                    helperBtn.id = 'assisted-login-btn';
                    container.prepend(helperBtn);
                }
            }
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

        const pasteBtn = document.createElement('button');
        pasteBtn.innerText = '📋 Paste from Clipboard';
        pasteBtn.type = 'button';
        pasteBtn.style.cssText = 'margin-top: 5px; display: block; cursor: pointer; padding: 2px 8px; background: #e7f3ff; border: 1px solid #b2d7ff; border-radius: 4px; font-size: 11px; text-transform: none !important;';

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

            // Preselect the MBID if already present
            if (inputField.value.trim() !== "") {
                inputField.select();
            }

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
