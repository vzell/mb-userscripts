// ==UserScript==
// @name         Edit Release: No Label & No Cat. no Button
// @description  Adds a No Label & No Cat. no button to MusicBrainz release editor
// @version      1.0
// @author       Lioncat6 + vzell + Gemini
// @license      MIT
// @namespace    https://github.com/vzell/mb-userscripts
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @match        https://musicbrainz.org/release/*/edit
// @match        https://musicbrainz.org/release/add
// @match        https://beta.musicbrainz.org/release/*/edit
// @match        https://beta.musicbrainz.org/release/add
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/NoLabelAndCatnoButtons.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/NoLabelAndCatnoButtons.user.js
// ==/UserScript==


(function() {
    'use strict';

    function addNoLabelButton() {
        const labelRows = document.querySelectorAll('tr:has(label[for^="label-"])');

        labelRows.forEach((row) => {
            const labelCell = row.querySelector('td:first-child');
            if (labelCell.querySelector('.no-label-btn')) return;

            // --- No Label Button ---
            const noLabelButton = document.createElement('button');
            // APPEARANCE CHANGE: Updated text and removed <s> tag
            noLabelButton.textContent = 'NO label';
            noLabelButton.title = 'Set Label to [no label]';
            // RETAINING ORIGINAL CLASSES AND STYLES
            noLabelButton.classList.add('no-label-btn');
            noLabelButton.classList.add('negative');
            noLabelButton.style.cssText = 'font-size: 11px;height: 28px;line-height: 10px;padding: 6px;'; // Added padding for better look

            // RETAINING ORIGINAL FUNCTIONAL LOGIC
            noLabelButton.addEventListener('click', function(e) {
                e.preventDefault();
                const labelInput = document.getElementById("label-0");
                if (labelInput) {
                    // NOTE: This value is the original URL for '[no label]'
                    labelInput.value = 'https://musicbrainz.org/label/157afde4-4bf5-4039-8ad2-5a15acc85176';
                    // Trigger update using InputEvent and ChangeEvent
                    const inputEvent = new Event('input', { bubbles: true });
                    const changeEvent = new Event('change', { bubbles: true });
                    labelInput.dispatchEvent(inputEvent);
                    labelInput.dispatchEvent(changeEvent);
                }
            });


            // --- No Cat. No Button ---
            const noCatNoButton = document.createElement('button');
            // APPEARANCE CHANGE: Updated text and removed <s> tag
            noCatNoButton.textContent = 'NO catno';
            noCatNoButton.title = 'Set Catalog Number to [none]';
            // RETAINING ORIGINAL CLASSES AND STYLES
            noCatNoButton.classList.add('no-label-btn');
            noCatNoButton.classList.add('negative');
            noCatNoButton.style.cssText = 'font-size: 11px;height: 28px;line-height: 10px;padding: 6px;' // Added padding for better look

            // RETAINING ORIGINAL FUNCTIONAL LOGIC
            noCatNoButton.addEventListener('click', function (e) {
                e.preventDefault();
                const catNoInput = document.getElementById("catno-0");
                if (catNoInput) {
                    catNoInput.value = '[none]';
                    // Trigger update using InputEvent and ChangeEvent
                    const inputEvent = new Event('input', { bubbles: true });
                    const changeEvent = new Event('change', { bubbles: true });
                    catNoInput.dispatchEvent(inputEvent);
                    catNoInput.dispatchEvent(changeEvent);
                }
            });

            // --- Button Container ---
            const buttonDiv = document.createElement('div');
            buttonDiv.classList.add('buttons');
            buttonDiv.style.cssText = 'position: absolute;transform: translateY(-22px);display: flex;flex-direction: column;align-items: center;gap: 5px;';
            buttonDiv.append(noLabelButton, noCatNoButton);
            labelCell.insertBefore(buttonDiv, labelCell.firstChild);
        });
    }

    addNoLabelButton();

})();
