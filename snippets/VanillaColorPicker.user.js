// ==UserScript==
// @name         AA: Color Picker Script
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.3.0+2026-01-30
// @description  ColorPicker Test
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllConsolidated.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      https://unpkg.com/vanilla-picker@2.12.3/dist/vanilla-picker.min.js
// @require      file:///V:/home/vzell/git/mb-userscripts/lib/VZMBLibrary.user.js
// @match        *://*.musicbrainz.org/artist/*
// @match        *://*.musicbrainz.org/release-group/*
// @match        *://*.musicbrainz.org/work/*
// @match        *://*.musicbrainz.org/recording/*
// @match        *://*.musicbrainz.org/label/*
// @match        *://*.musicbrainz.org/series/*
// @match        *://*.musicbrainz.org/place/*/events
// @match        *://*.musicbrainz.org/place/*/performances
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 1. Create a button to act as the picker trigger
    const btn = document.createElement('button');
    btn.textContent = 'Change Color';
    btn.style.cssText = 'position:fixed; top:20px; left:20px; z-index:9999; padding:10px;';
    document.body.appendChild(btn);

    // 2. Initialize the picker
    const picker = new Picker({
        parent: btn,       // The element that opens the picker
        popup: 'right',    // Where the picker appears relative to the parent
        color: '#0cf',     // Initial color
    });

    // 3. Handle color changes
    picker.onChange = function(color) {
        console.debug('Color changing:', color.rgbaString);
        document.body.style.backgroundColor = color.rgbaString;
    };

    // 4. Handle when the user clicks "OK"
    picker.onDone = function(color) {
        console.log('Final color selected:', color.hex);
    };

})();
