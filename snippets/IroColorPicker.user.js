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
// @require      https://cdn.jsdelivr.net/npm/@jaames/iro@5
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

const container = document.createElement('div');
container.id = 'picker-container';
document.body.appendChild(container);

const colorPicker = new iro.ColorPicker("#picker-container", {
    width: 150,
    color: "#f00"
});

colorPicker.on('color:change', function(color) {
    // Log the hex code to console
    console.debug('New Hex:', color.hexString);
    document.body.style.backgroundColor = color.hexString;
});
