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

    const MANAGED_ATTRIBUTES = ['cover', 'live', 'partial'];

    /**
     * Ensures only the attributes in the list are checked
     */
    function applyAttributes(dialog, targetAttributes) {
        MANAGED_ATTRIBUTES.forEach(attr => {
            const container = dialog.querySelector(`.attribute-container.${attr}`);
            if (container) {
                const checkbox = container.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    const shouldBeChecked = targetAttributes.includes(attr);
                    if (checkbox.checked !== shouldBeChecked) {
                        checkbox.click();
                    }
                }
            }
        });

        const doneBtn = dialog.querySelector('.buttons button.positive');
        if (doneBtn) {
            doneBtn.click();
        }
    }

    /**
     * Creates and injects the shortcut buttons on a new row with spacing
     */
    function injectButtons(dialog) {
        if (dialog.querySelector('.custom-attr-row')) return;

        const footer = dialog.querySelector('.buttons');
        if (!footer) return;

        // Create a wrapper div to force a new line with clear vertical spacing
        const rowContainer = document.createElement('div');
        rowContainer.className = 'custom-attr-row';
        rowContainer.style.marginTop = '15px';
        rowContainer.style.paddingTop = '5px';
        rowContainer.style.display = 'flex';
        rowContainer.style.flexWrap = 'wrap';
        rowContainer.style.gap = '6px';
        rowContainer.style.width = '100%';

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
            btn.style.fontSize = '0.85em';
            btn.style.padding = '3px 10px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = '#f8f9fa';
            btn.style.border = '1px solid #ced4da';
            btn.style.borderRadius = '4px';
            btn.style.color = '#333';
            
            btn.onmouseover = () => { btn.style.backgroundColor = '#e2e6ea'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#f8f9fa'; };
            
            btn.onclick = (e) => {
                e.preventDefault();
                applyAttributes(dialog, preset.attrs);
            };
            rowContainer.appendChild(btn);
        });

        // Append to the end of the footer container
        footer.appendChild(rowContainer);
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
                    if (header && header.innerText.trim() === 'Edit relationship') {
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
})();
