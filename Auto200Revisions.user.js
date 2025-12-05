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
// @icon         https://volkerzell.de/favicon.ico
// @match        http://brucebase.wikidot.com/system:recent-changes
// @match        https://brucebase.wikidot.com/system:recent-changes
// @grant        none
// @run-at       document-idle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Wait until the select element is present
    const select = document.getElementById('rev-perpage');
    if (select) {
        select.value = "200"; // set the value to 200
        // Optionally trigger change event if page uses JS to react
        const event = new Event('change', { bubbles: true });
        select.dispatchEvent(event);
        console.log('[Auto200] select set to 200');
    } else {
        console.log('[Auto200] select element not found');
    }
})();
