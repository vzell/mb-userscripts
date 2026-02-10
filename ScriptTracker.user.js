// ==UserScript==
// @name         VZ: MusicBrainz - Script Tracker
// @namespace    https://github.com/vzell/mb-userscripts
// @version      2.2.1+2026-02-04
// @description  Script will set up a global log to capture the sequence of events
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @match        *://*.musicbrainz.org/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Setup the Registry
    window.MB_Script_Registry = {
        logs: [],
        register: function(scriptName, action) {
            const entry = {
                name: scriptName,
                time: performance.now().toFixed(2) + "ms",
                action: action || "Initialized"
            };
            this.logs.push(entry);
            console.debug(`[MB Tracker] ${entry.name} at ${entry.time}: ${entry.action}`);
        }
    };

    // 2. Setup the DOM Observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    // Only log significant element additions (Node.ELEMENT_NODE === 1)
                    if (node.nodeType === 1) {
                        console.debug(`[MB Tracker] DOM Change: New ${node.tagName} added to ${mutation.target.id || 'container'}`);
                    }
                });
            }
        });
    });

    // 3. Start observing
    // Since we use @run-at document-start, the body might not exist yet.
    // We use a simple interval to wait for the <body> or <html> element.
    const checkTimer = setInterval(() => {
        const target = document.querySelector('body');
        if (target) {
            observer.observe(target, { childList: true, subtree: true });
            clearInterval(checkTimer);
            console.debug('[MB Tracker] MutationObserver active on <body>');
        }
    }, 50);
})();
