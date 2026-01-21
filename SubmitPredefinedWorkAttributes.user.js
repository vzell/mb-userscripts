// ==UserScript==
// @name         VZ: MusicBrainz - Work Relationship Fast-Attributes
// @description  Adds shortcut buttons to the Edit Relationship dialog for Works
// @version      1.0
// @author       Gemini
// @match        https://musicbrainz.org/release/*/edit-relationships
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[MB-Debug] Script initialized');

    // The set of attributes handled by this script
    const MANAGED_ATTRIBUTES = ['cover', 'live', 'partial'];

    /**
     * Ensures only the attributes in the list are checked
     */
    function applyAttributes(dialog, targetAttributes) {
        console.log('[MB-Debug] Aligning attributes to:', targetAttributes);

        MANAGED_ATTRIBUTES.forEach(attr => {
            const container = dialog.querySelector(`.attribute-container.${attr}`);
            if (container) {
                const checkbox = container.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    const shouldBeChecked = targetAttributes.includes(attr);

                    // If it should be checked but isn't, OR should be unchecked but is, click it
                    if (checkbox.checked !== shouldBeChecked) {
                        console.log(`[MB-Debug] Syncing ${attr} to ${shouldBeChecked}`);
                        checkbox.click();
                    }
                }
            }
        });

        const doneBtn = dialog.querySelector('.buttons button.positive');
        if (doneBtn) {
            console.log('[MB-Debug] Clicking Done button');
            doneBtn.click();
        }
    }

    /**
     * Creates and injects the shortcut buttons
     */
    function injectButtons(dialog) {
        if (dialog.querySelector('.custom-attr-buttons')) return;

        const footer = dialog.querySelector('.buttons');
        if (!footer) return;

        const footerRightGroup = footer.querySelector('.buttons-right');
        if (!footerRightGroup) return;

        console.log('[MB-Debug] Injecting custom buttons');
        const container = document.createElement('span');
        container.className = 'custom-attr-buttons';
        container.style.marginLeft = '10px';
        container.style.display = 'inline-flex';
        container.style.gap = '4px';

        const presets = [
            { text: 'cover', attrs: ['cover'] },
            { text: 'live', attrs: ['live'] },
            { text: 'live/cover', attrs: ['live', 'cover'] },
            { text: 'partial', attrs: ['partial'] },
            { text: 'partial/live', attrs: ['partial', 'live'] },
            { text: 'partial/live/cover', attrs: ['partial', 'live', 'cover'] }
        ];

        presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerText = preset.text;
            btn.style.fontSize = '0.8em';
            btn.style.padding = '2px 6px';
            btn.style.cursor = 'pointer';
            btn.onclick = (e) => {
                e.preventDefault();
                applyAttributes(dialog, preset.attrs);
            };
            container.appendChild(btn);
        });

        footer.insertBefore(container, footerRightGroup);
    }

    /**
     * Validates if the dialog is the correct one
     */
    function checkDialog(mutationList) {
        for (const mutation of mutationList) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;

                const dialog = node.matches('.relationship-dialog') ? node : node.querySelector('.relationship-dialog');

                if (dialog) {
                    const header = dialog.querySelector('h1');
                    const headerText = header ? header.innerText.trim() : '';

                    if (headerText === 'Edit relationship') {
                        const rows = Array.from(dialog.querySelectorAll('table.relationship-details tr'));
                        const isWork = rows.some(row => {
                            const section = row.querySelector('.required.section')?.innerText.trim();
                            const fields = row.querySelector('.fields')?.innerText.trim();
                            return section === 'Related type' && fields === 'Work';
                        });

                        if (isWork) {
                            injectButtons(dialog);
                        }
                    }
                }
            }
        }
    }

    const observer = new MutationObserver(checkDialog);
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[MB-Debug] Observer attached to document.body');
})();
