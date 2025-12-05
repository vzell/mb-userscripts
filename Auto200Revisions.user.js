// ==UserScript==
// @name         VZ: BruceBase – Auto 200 Revisions
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0+2025-12-05
// @description  Select "200" for revisions per page BruceBase recent-changes
// @author       ChatGPT (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/Auto200Revisions.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/Auto200Revisions.user.js
// @icon         http://brucebase.wikidot.com/local--favicon/favicon.gif
// @match        http://brucebase.wikidot.com/system:recent-changes
// @match        https://brucebase.wikidot.com/system:recent-changes
// @grant        none
// @run-at       document-idle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const maxRetries = 20;      // maximum number of attempts
    const intervalMs = 200;     // interval between attempts
    let attempts = 0;

    const trySelect = () => {
        const select = document.getElementById('rev-perpage');
        if (select) {
            // Safely set the value
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === "200") {
                    select.selectedIndex = i;
                    break;
                }
            }

            // Trigger change event safely
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[VZ: Auto200] select set to 200 safely');
        } else {
            attempts++;
            if (attempts < maxRetries) {
                setTimeout(trySelect, intervalMs);
            } else {
                console.warn('[VZ: Auto200] select element not found after retries');
            }
        }
    };

    trySelect();
})();
