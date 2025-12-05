// ==UserScript==
// @name         VZ: Brucebase – Auto 200 Revisions
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2025-12-05
// @description  Select "200" for revisions per page and trigger update on brucebase recent-changes (robust detection + fallbacks)
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

(function () {
    'use strict';

    const DEBUG = true; // set true to see console logs

    function log(...args) {
        if (DEBUG) console.log('[Auto200]', ...args);
    }

    function findSelectWith200() {
        const selects = Array.from(document.querySelectorAll('select'));
        for (const s of selects) {
            // check if it has an option with value "200" or text "200"
            const opts = Array.from(s.options || []);
            for (const o of opts) {
                if (String(o.value).trim() === '200' || o.text.trim() === '200') return s;
            }
        }
        return null;
    }

    function findUpdateButton() {
        // common possibilities:
        // input[type=submit][value*="Update"], button with text "Update list", or any submit in the same form
        let btn = document.querySelector('input[type="submit"][value*="Update"]');
        if (btn) return btn;

        btn = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
            .find(el => {
                const txt = (el.value || el.textContent || '').trim().toLowerCase();
                return txt.includes('update') || txt.includes('update list') || txt.includes('anzeigen') || txt.includes('list');
            });
        if (btn) return btn;

        return null;
    }

    function triggerChange(el) {
        try {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            // some frameworks also listen for 'blur'
            el.dispatchEvent(new Event('blur', { bubbles: true }));
        } catch (e) {
            log('triggerChange error', e);
        }
    }

    function setTo200AndSubmit() {
        const select = findSelectWith200();
        if (!select) {
            log('select not found');
            return false;
        }

        // determine actual option value for 200 (could be "200" or "all" etc.)
        let option200 = Array.from(select.options).find(o => String(o.value).trim() === '200' || o.text.trim() === '200');
        if (!option200) {
            log('200 option not found (unexpected)');
            return false;
        }

        if (select.value === option200.value) {
            log('already set to 200');
        } else {
            select.value = option200.value;
            triggerChange(select);
            log('select set to', select.value);
        }

        // try to find and click the update button
        const btn = findUpdateButton();
        if (btn) {
            log('clicking update button', btn);
            btn.click();
            return true;
        }

        // fallback: submit nearest enclosing form
        const form = select.closest('form');
        if (form) {
            // If there is a submit button that isn't visible, try to submit programmatically
            try {
                log('submitting form fallback', form);
                form.submit();
                return true;
            } catch (e) {
                log('form.submit() failed', e);
            }
        }

        log('no button or form found to submit');
        return false;
    }

    // Try immediately (in case it's already present)
    if (setTo200AndSubmit()) return;

    // Observe DOM changes (useful if widget is added later)
    const observer = new MutationObserver((mutations, obs) => {
        if (setTo200AndSubmit()) {
            log('done via MutationObserver');
            obs.disconnect();
            clearInterval(fallbackInterval);
        }
    });

    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

    // fallback interval (stops after 15s)
    let elapsed = 0;
    const fallbackInterval = setInterval(() => {
        elapsed += 500;
        if (setTo200AndSubmit()) {
            log('done via interval');
            observer.disconnect();
            clearInterval(fallbackInterval);
            return;
        }
        if (elapsed > 15000) {
            log('timeout - giving up after 15s');
            observer.disconnect();
            clearInterval(fallbackInterval);
        }
    }, 500);

})();
