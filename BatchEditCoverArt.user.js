// ==UserScript==
// @name         VZ: MusicBrainz - Batch Edit Cover Art
// @namespace    https://github.com/vzell/mb-userscripts
// @version      2.2+2026-01-21
// @description  Batch edit types and comments of cover art images with keyboard-navigable autocomplete and searchable sorted immutable comments
// @author       Gemini with vzell (elephant editor functionality by chaban, jesus2099)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchEditCoverArt.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchEditCoverArt.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/release/*/cover-art
// @match        *://*.musicbrainz.org/release/*/add-cover-art
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- START OF INLINED LIBRARIES ---
    // CONTROL-POMME.js
    var CONTROL_POMME = {
        is_macintosh: /\bMac(intosh| OS)\b/.test(navigator.userAgent)
    };
    CONTROL_POMME.ctrl = {
        key: CONTROL_POMME.is_macintosh ? "metaKey" : "ctrlKey",
        label: CONTROL_POMME.is_macintosh ? "\u2318" : "Ctrl+",
        test: function(event) { return CONTROL_POMME.arePressed(event, ["ctrl"]); }
    };
    CONTROL_POMME.shift = {
        key: "shiftKey",
        label: CONTROL_POMME.is_macintosh ? "\u21E7" : "Shift+",
        test: function(event) { return CONTROL_POMME.arePressed(event, ["shift"]); }
    };
    CONTROL_POMME.alt = {
        key: "altKey",
        label: CONTROL_POMME.is_macintosh ? "\u2325" : "Alt+",
        test: function(event) { return CONTROL_POMME.arePressed(event, ["alt"]); }
    };
    CONTROL_POMME.ctrl_shift = {
        label: CONTROL_POMME.is_macintosh ? CONTROL_POMME.shift.label + CONTROL_POMME.ctrl.label : CONTROL_POMME.ctrl.label + CONTROL_POMME.shift.label,
        test: function(event) { return CONTROL_POMME.arePressed(event, ["ctrl", "shift"]); }
    };
    CONTROL_POMME.ctrl_alt = {
        label: CONTROL_POMME.is_macintosh ? CONTROL_POMME.alt.label + CONTROL_POMME.ctrl.label : CONTROL_POMME.ctrl.label + CONTROL_POMME.alt.label,
        test: function(event) { return CONTROL_POMME.arePressed(event, ["ctrl", "alt"]); }
    };
    CONTROL_POMME.alt_shift = {
        label: CONTROL_POMME.alt.label + CONTROL_POMME.shift.label,
        test: function(event) { return CONTROL_POMME.arePressed(event, ["alt", "shift"]); }
    };
    CONTROL_POMME.ctrl_alt_shift = {
        label: CONTROL_POMME.is_macintosh ? CONTROL_POMME.alt.label + CONTROL_POMME.shift.label + CONTROL_POMME.ctrl.label : CONTROL_POMME.ctrl.label + CONTROL_POMME.alt.label + CONTROL_POMME.shift.label,
        test: function(event) { return CONTROL_POMME.arePressed(event, ["ctrl", "alt", "shift"]); }
    };
    CONTROL_POMME.new_tab_mod_keys = function(event) {
        return CONTROL_POMME.is_macintosh ? /* ⇧⌘click */ event.shiftKey && event.metaKey : /* Shift+click */ event.shiftKey;
    };
    CONTROL_POMME.new_bg_tab_mod_keys = function(event) {
        return CONTROL_POMME.is_macintosh ? /* ⌘click */ event.metaKey : /* Ctrl+click */ event.ctrlKey;
    };
    CONTROL_POMME.arePressed = function(event, mod_keys) {
        var wanted_mod_keys = !(CONTROL_POMME.is_macintosh ? event.ctrlKey : event.metaKey);
        for (var k = 0, mk = ["ctrl", "shift", "alt"]; wanted_mod_keys !== false && k < mk.length; k++) {
            wanted_mod_keys = wanted_mod_keys && mod_keys.indexOf(mk[k]) > -1 === event[CONTROL_POMME[mk[k]].key];
        }
        return wanted_mod_keys;
    };

    // SUPER.js
    function addAfter(newNode, existingNode) {
        if (newNode && existingNode && existingNode.parentNode) {
            if (existingNode.nextSibling) {
                return existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
            } else {
                return existingNode.parentNode.appendChild(newNode);
            }
        } else {
            return null;
        }
    }
    function createTag(tag, gadgets, children) {
        var t = (tag == "fragment" ? document.createDocumentFragment() : document.createElement(tag));
        if (t.tagName) {
            if (gadgets) {
                for (var attri in gadgets.a) if (Object.prototype.hasOwnProperty.call(gadgets.a, attri)) { t.setAttribute(attri, gadgets.a[attri]); }
                for (var style in gadgets.s) if (Object.prototype.hasOwnProperty.call(gadgets.s, style)) { t.style.setProperty(style.replace(/!/g, "").replace(/[A-Z]/g, "-$&").toLowerCase(), gadgets.s[style].replace(/!/g, ""), style.match(/!/) || gadgets.s[style].match(/!/) ? "important" : ""); }
                for (var event in gadgets.e) if (Object.prototype.hasOwnProperty.call(gadgets.e, event)) {
                    var listeners = Array.isArray(gadgets.e[event]) ? gadgets.e[event] : [gadgets.e[event]];
                    for (var l = 0; l < listeners.length; l++) { t.addEventListener(event, listeners[l]); }
                }
            }
            if (t.tagName == "A" && !t.getAttribute("href") && !t.style.getPropertyValue("cursor")) { t.style.setProperty("cursor", "pointer"); }
        }
        if (children) {
            var _children = Array.isArray(children) ? children : [children];
            for (var c = 0; c < _children.length; c++) { t.appendChild((typeof _children[c]).match(/number|string/) ? document.createTextNode(_children[c]) : _children[c]); }
            t.normalize();
        }
        return t;
    }
    function disableInputs(inputs, setAsDisabled) {
        if (Array.isArray(inputs) || inputs instanceof NodeList) {
            for (var i = 0; i < inputs.length; i++) {
                disableInputs(inputs[i], setAsDisabled);
            }
        } else if (typeof setAsDisabled == "undefined" || setAsDisabled == true) {
            inputs.setAttribute("disabled", "disabled");
        } else {
            inputs.removeAttribute("disabled");
        }
    }
    function enableInputs(inputs, setAsEnabled) {
        disableInputs(inputs, !(typeof setAsEnabled == "undefined" || setAsEnabled));
    }
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    function getParent(startingNode, searchedTag, searchedCssClass, searchedId) {
        var currentNode = startingNode;
        if (currentNode && (currentNode = currentNode.parentNode)) {
            if (
                currentNode.tagName &&
                currentNode.tagName.toUpperCase() == searchedTag.toUpperCase() &&
                (!searchedCssClass || searchedCssClass && currentNode.classList && currentNode.classList.contains(searchedCssClass)) &&
                (!searchedId || currentNode.getAttribute && currentNode.getAttribute("id") == searchedId)
            ) {
                return currentNode;
            } else {
                return getParent(currentNode, searchedTag, searchedCssClass, searchedId);
            }
        }
        return null;
    }
    function getSibling(startingNode, searchedTag, searchedCssClass, previous, maximumDistance) {
        var currentNode = startingNode;
        var max = typeof maximumDistance == "number" ? maximumDistance : 1;
        if (currentNode && (currentNode = previous ? currentNode.previousSibling : currentNode.nextSibling)) {
            if (
                currentNode.tagName &&
                currentNode.tagName.toUpperCase() == searchedTag.toUpperCase() &&
                (!searchedCssClass || searchedCssClass && currentNode.classList && currentNode.classList.contains(searchedCssClass))
            ) {
                return currentNode;
            } else if (max > 0) {
                return getSibling(currentNode, searchedTag, searchedCssClass, previous, typeof maximumDistance == "number" ? max - 1 : null);
            }
        }
        return null;
    }
    function removeChildren(parent) {
        while (parent && parent.hasChildNodes()) {
            parent.removeChild(parent.firstChild);
        }
    }
    function removeNode(node) {
        return node.parentNode.removeChild(node);
    }
    function replaceChildren(newContent, parent) {
        removeChildren(parent);
        return parent.appendChild(newContent);
    }
    function sendEvent(node, eventName) {
        var _eventName = eventName.toLowerCase();
        var event;
        if (_eventName.match(/^mouse|click$/)) {
            var parameters = {modifierKeys: []};
            if (_eventName.match(/\+/)) {
                parameters.modifierKeys = _eventName.split("+");
                _eventName = parameters.modifierKeys.pop();
            }
            event = document.createEvent("MouseEvents");
            event.initMouseEvent(_eventName, true, true, null, 0, 0, 0, 0, 0, parameters.modifierKeys.indexOf("ctrl") > -1, parameters.modifierKeys.indexOf("alt") > -1, parameters.modifierKeys.indexOf("shift") > -1, parameters.modifierKeys.indexOf("meta") > -1, 0, null);
        } else {
            event = document.createEvent("HTMLEvents");
            event.initEvent(_eventName, true, true);
        }
        node.dispatchEvent(event);
    }
    function stop(event) {
        event.cancelBubble = true;
        if (event.stopPropagation) event.stopPropagation();
        event.preventDefault();
        return false;
    }
    function waitForElement(selector, callback) {
        var waitForElementIntervalID = setInterval(function() {
            var element = document.querySelector(selector);
            if (element) {
                clearInterval(waitForElementIntervalID);
                callback(element);
            }
        }, 123);
    }
    function forceValue(input, value) {
        input.dispatchEvent(new Event("input", {bubbles: true}));
        (Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value").set).call(input, value);
        input.dispatchEvent(new Event("change", {bubbles: true}));
    }
    function decodeHTML(HTMLBlurb) {
        var decoder = document.createElement("div");
        decoder.innerHTML = HTMLBlurb;
        return decoder.textContent;
    }
    // --- END OF INLINED LIBRARIES ---

    // Global reference for Elephant Editor
    let editNoteMemory = null;

    // --- START OF ELEPHANT EDITOR LOGIC (adapted from original) ---
    function initElephantEditor(editNoteTextarea) {
        const userjs = "jesus2099userjs94629";
        const memories = 10;
        const colours = { ok: "greenyellow", warning: "gold" };
        const notetextStorage = "jesus2099userjs::last_editnotetext";
        let save = !localStorage.getItem(userjs + "forget");
        const notetext = editNoteTextarea;
        let submit_button;

        function saveNote() {
            if (notetext && save) {
                const thisnotetext = notetext.value.trim();
                const ls00 = localStorage.getItem(notetextStorage + "00");
                if (thisnotetext && thisnotetext !== ls00) {
                    if (ls00) {
                        for (let idel = memories - 1; idel > 0; idel--) {
                            if (thisnotetext === localStorage.getItem(notetextStorage + "0" + idel)) {
                                forget(idel);
                            }
                        }
                        for (let isav = memories - 1; isav > 0; isav--) {
                            const prev = localStorage.getItem(notetextStorage + "0" + (isav - 1));
                            if (prev) { localStorage.setItem(notetextStorage + "0" + isav, prev); }
                        }
                    }
                    localStorage.setItem(notetextStorage + "00", thisnotetext);
                }
            }
        }

        function forget(memory_index) {
            if (memory_index >= 0 && memory_index < memories) {
                for (let mi = memory_index; mi < memories; mi++) {
                    const memory_button = document.querySelector(`[id='${notetextStorage}0${mi}']`);
                    const next_memory = localStorage.getItem(notetextStorage + "0" + (mi + 1));
                    if (next_memory === null) {
                        localStorage.removeItem(notetextStorage + "0" + mi);
                        if (memory_button) {
                            memory_button.removeAttribute("title");
                            memory_button.setAttribute("disabled", "true");
                            memory_button.style.setProperty("opacity", ".5");
                            memory_button.setAttribute("value", `n-${mi + 1}`);
                        }
                    } else {
                        localStorage.setItem(notetextStorage + "0" + mi, next_memory);
                        if (memory_button) {
                            memory_button.setAttribute("title", next_memory);
                            memory_button.setAttribute("value", summarise(next_memory));
                        }
                    }
                }
            }
        }

        function createButton(label, width) {
            let butt = createTag("input", { a: { type: "button", value: label, tabindex: "-1", class: "styled-button" }, s: { display: "inline", padding: "2px", float: "none" } });
            if (width) { butt.style.setProperty("width", width); }
            return butt;
        }

        function createClearButton() {
            let butt = createButton("×", "25px");
            butt.addEventListener("click", function(event) {
                forceValue(notetext, "");
                if (event[CONTROL_POMME.shift.key] && submit_button) { sendEvent(submit_button, "click"); }
                else { notetext.focus(); }
            });
            butt.style.setProperty("color", "red");
            butt.style.setProperty("background-color", colours.warning);
            butt.setAttribute("title", "clear edit note");
            return butt;
        }

        function summarise(full_edit_note) {
            return full_edit_note.replace(/(http:\/\/|https:\/\/|www\.|[\n\r])/gi, "").substr(0, 6);
        }

        if (notetext) {
            const buttons = createTag("div", { a: { class: "buttons" } });
            const save_label = buttons.appendChild(createTag("label", { a: { title: "save edit note" }, s: { backgroundColor: (save ? colours.ok : colours.warning), minWidth: "0", margin: "0" } }));
            const save_checkbox = save_label.appendChild(createTag("input", {
                a: { type: "checkbox", tabindex: "-1" },
                s: { display: "inline" },
                e: { change: function() {
                    save = this.checked;
                    this.parentNode.style.backgroundColor = save ? colours.ok : colours.warning;
                    localStorage.setItem(userjs + "forget", save ? "" : "1");
                }}
            }));
            save_checkbox.checked = save;
            save_label.appendChild(document.createTextNode(" remember "));
            buttons.appendChild(createClearButton());

            for (let m = 0; m < memories; m++) {
                buttons.appendChild(document.createTextNode(" "));
                let butt = createButton(`n-${m + 1}`, "50px");
                let buttid = notetextStorage + "0" + m;
                butt.id = buttid;
                let lastnotetext = localStorage.getItem(buttid);
                if (!lastnotetext) {
                    butt.setAttribute("disabled", "true");
                    butt.style.setProperty("opacity", ".5");
                } else {
                    butt.setAttribute("title", lastnotetext);
                    butt.setAttribute("value", summarise(lastnotetext));
                    butt.addEventListener("click", function(event) {
                        if (CONTROL_POMME.ctrl.test(event)) {
                            forget(this.id.match(/(\d)$/)[1]);
                        } else {
                            forceValue(notetext, this.getAttribute("title"));
                            if (event[CONTROL_POMME.shift.key] && submit_button) { sendEvent(submit_button, "click"); }
                        }
                        notetext.focus();
                    });
                }
                buttons.appendChild(butt);
            }
            buttons.appendChild(document.createTextNode(" ← " + CONTROL_POMME.shift.label + "click: submit / " + CONTROL_POMME.ctrl.label + "click: remove"));
            notetext.parentNode.insertBefore(buttons, notetext);
            let lastnotetext = localStorage.getItem(notetextStorage + "00");
            if (save && lastnotetext && notetext.value === "") {
                forceValue(notetext, lastnotetext);
            }
        }
        return {
            saveNote,
            setSubmitButton: (button) => { submit_button = button; }
        };
    }
    // --- END OF ELEPHANT EDITOR LOGIC ---

    // --- START OF BATCH EDIT SCRIPT ---
    const TYPES = [
        "Front", "Back", "Booklet", "Medium", "Obi", "Spine", "Track", "Tray",
        "Sticker", "Poster", "Liner", "Watermark", "Raw/Unedited",
        "Matrix/Runout", "Top", "Bottom", "Panel", "Other"
    ];

    const DIACRITIC_MAP = {
        '-': ['‐', '‒', '–', '—'],
        '"': ['“', '”'],
        "'": ['‘', '’']
    };

    const HISTORY_KEY = 'mb_batch_comment_history';
    const IMMUTABLE_KEY = 'mb_batch_comment_immutable';
    const REGEX_KEY = 'mb_batch_comment_regex';
    const MAX_HISTORY = 50;

    let originalData = {};
    let selectedIndex = -1;

    // --- Helper for Diacritic Regex ---
    const getDiacriticRegex = (text) => {
        let patternStr = "";
        for (const char of text) {
            const diacritics = DIACRITIC_MAP[char];
            if (diacritics) {
                patternStr += `[${char}${diacritics.join('')}]`;
            } else {
                patternStr += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        }
        return new RegExp(patternStr, 'i');
    };

    // --- Persistence Managers ---
    const ImmutableManager = {
        get: () => JSON.parse(localStorage.getItem(IMMUTABLE_KEY) || "[]"),
        saveAll: (list) => {
            const trimmed = [...new Set(list.map(s => s.trim()).filter(s => s))];
            const sortedList = trimmed.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            localStorage.setItem(IMMUTABLE_KEY, JSON.stringify(sortedList));

            let history = HistoryManager.get();
            const updatedHistory = history.filter(h => !sortedList.includes(h));
            if (history.length !== updatedHistory.length) {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
            }
        }
    };

    const RegexManager = {
        get: () => JSON.parse(localStorage.getItem(REGEX_KEY) || "[]"),
        saveAll: (list) => {
            const trimmed = [...new Set(list.map(s => s.trim()).filter(s => s))];
            localStorage.setItem(REGEX_KEY, JSON.stringify(trimmed.sort()));
        }
    };

    const HistoryManager = {
        get: () => JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"),
        // Returns true if saved, false if blocked by regex/immutable
        save: (comment) => {
            const val = comment ? comment.trim() : "";
            if (!val) return false;

            const immutables = ImmutableManager.get();
            if (immutables.includes(val)) return false;

            const regexPatterns = RegexManager.get();
            for (const p of regexPatterns) {
                try {
                    const re = new RegExp(p, 'i');
                    if (re.test(val)) return false;
                } catch (e) {
                    console.error("Invalid regex pattern:", p);
                }
            }

            let history = HistoryManager.get();
            history = [...new Set([val, ...history])];
            history.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
            return true;
        }
    };

    // --- Autocomplete UI ---
    const suggestionList = document.createElement('div');
    suggestionList.id = 'batch-comment-suggestions';
    suggestionList.style = `
        position: absolute;
        background: white;
        border: 1px solid #999;
        border-radius: 3px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 100001;
        display: none;
        max-height: 250px;
        overflow-y: auto;
        font-family: sans-serif;
        font-size: 13px;
        color: #333;
    `;
    document.body.appendChild(suggestionList);

    const hideSuggestions = () => {
        setTimeout(() => {
            suggestionList.style.display = 'none';
            selectedIndex = -1;
        }, 200);
    };

    const updateHighlight = () => {
        const items = suggestionList.querySelectorAll('div');
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.background = '#0066cc';
                item.style.color = 'white';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = 'white';
                item.style.color = '#333';
            }
        });
    };

    const showSuggestions = (input) => {
        const immutables = ImmutableManager.get();
        const history = HistoryManager.get();
        // Since both are stored sorted, combined order is naturally sorted per group
        const combined = [...new Set([...immutables, ...history])];

        const rawVal = input.value.trim();
        let filtered;

        if (!rawVal) {
            // If field is empty, show all candidates
            filtered = combined;
        } else {
            const regex = getDiacriticRegex(rawVal);
            filtered = combined.filter(h => regex.test(h));
        }

        if (filtered.length === 0) {
            suggestionList.style.display = 'none';
            return;
        }

        const rect = input.getBoundingClientRect();
        suggestionList.innerHTML = '';
        suggestionList.style.width = `${rect.width}px`;
        suggestionList.style.top = `${rect.bottom + window.scrollY}px`;
        suggestionList.style.left = `${rect.left + window.scrollX}px`;
        suggestionList.style.display = 'block';
        selectedIndex = -1;

        filtered.forEach((text, index) => {
            const item = document.createElement('div');
            const isImmutable = immutables.includes(text);
            item.innerHTML = isImmutable ? `<b>📌 ${text}</b>` : text;
            item.style = 'padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

            item.onclick = () => {
                input.value = text;
                suggestionList.style.display = 'none';
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };
            item.onmouseover = () => {
                selectedIndex = index;
                updateHighlight();
            };
            suggestionList.appendChild(item);
        });
    };

    const handleKeydown = (e, input) => {
        const items = suggestionList.querySelectorAll('div');
        if (suggestionList.style.display === 'none' || items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateHighlight();
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateHighlight();
                break;
            case 'Enter':
                if (selectedIndex > -1) {
                    e.preventDefault();
                    input.value = items[selectedIndex].textContent.replace('📌 ', '');
                    suggestionList.style.display = 'none';
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                break;
            case 'Escape':
                suggestionList.style.display = 'none';
                break;
        }
    };

    // --- Configuration Modals ---
    function showConfigModal(title, manager, placeholder, useDiacritics = true) {
        const overlay = document.createElement('div');
        overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 100002; display: flex; justify-content: center; align-items: flex-start; padding-top: 50px;';

        const container = document.createElement('div');
        container.style = 'background: white; padding: 20px; border-radius: 5px; width: 550px; max-height: 85vh; overflow-y: auto; font-family: sans-serif; box-shadow: 0 0 25px rgba(0,0,0,0.5);';

        let currentSearch = "";

        const renderList = () => {
            const list = manager.get();
            const searchVal = currentSearch.trim();

            let filtered;
            if (!searchVal) {
                filtered = list.map((text, originalIndex) => ({ text, originalIndex }));
            } else {
                const regex = useDiacritics ? getDiacriticRegex(searchVal) : new RegExp(searchVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                filtered = list
                    .map((text, originalIndex) => ({ text, originalIndex }))
                    .filter(item => regex.test(item.text));
            }

            let html = `
                <h3 style="margin-top:0;">${title}</h3>
                <div style="margin-bottom: 15px; position: relative; display: flex; align-items: center;">
                    <input type="text" id="cfg-search" placeholder="Search..." value="${currentSearch}" style="width: 100%; padding: 8px 30px 8px 8px; border: 1px solid #ccc; border-radius: 3px;">
                    <span id="clear-search" style="position: absolute; right: 8px; cursor: pointer; color: #999; font-size: 14px; user-select: none;">❌</span>
                </div>
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; margin-bottom: 15px;">
                    <table style="width: 100%; border-collapse: collapse;">`;

            if (filtered.length === 0) {
                html += `<tr><td style="padding: 20px; text-align: center; color: #999;">${currentSearch ? 'No matches found.' : 'No entries defined.'}</td></tr>`;
            } else {
                filtered.forEach((item) => {
                    html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; word-break: break-all;">${item.text}</td>
                        <td style="text-align: right; width: 80px; white-space: nowrap; padding-right: 10px;">
                            <button class="edit-cfg" data-index="${item.originalIndex}" title="Edit" style="cursor:pointer; border:none; background:none; font-size: 1.2em; padding: 0 4px;">✏️</button>
                            <button class="del-cfg" data-index="${item.originalIndex}" title="Delete" style="cursor:pointer; border:none; background:none; font-size: 1.2em; padding: 0 4px;">❌</button>
                        </td>
                    </tr>`;
                });
            }

            html += `</table>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <button id="add-new-cfg" style="padding: 8px 16px; cursor:pointer; background: #0066cc; color: white; border: none; border-radius: 3px; font-weight: bold;">Add New</button>
                    <button id="close-cfg" style="padding: 8px 16px; cursor:pointer; background: #eee; border: 1px solid #ccc; border-radius: 3px;">Close</button>
                </div>`;

            container.innerHTML = html;

            const searchInput = container.querySelector('#cfg-search');
            searchInput.focus();
            searchInput.setSelectionRange(currentSearch.length, currentSearch.length);

            searchInput.oninput = (e) => {
                currentSearch = e.target.value;
                renderList();
            };

            container.querySelector('#clear-search').onclick = () => {
                currentSearch = "";
                renderList();
            };

            container.querySelector('#add-new-cfg').onclick = () => {
                const val = prompt(placeholder);
                if (val && val.trim()) {
                    if (!useDiacritics) {
                        try {
                            new RegExp(val.trim());
                        } catch (e) {
                            alert("Invalid regular expression: " + e.message);
                            return;
                        }
                    }
                    const current = manager.get();
                    if (!current.includes(val.trim())) {
                        current.push(val.trim());
                        manager.saveAll(current);
                        renderList();
                    }
                }
            };

            container.querySelectorAll('.edit-cfg').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const list = manager.get();
                    const newVal = prompt("Edit entry:", list[idx]);
                    if (newVal && newVal.trim()) {
                        if (!useDiacritics) {
                            try {
                                new RegExp(newVal.trim());
                            } catch (e) {
                                alert("Invalid regular expression: " + e.message);
                                return;
                            }
                        }
                        list[idx] = newVal.trim();
                        manager.saveAll(list);
                        renderList();
                    }
                };
            });

            container.querySelectorAll('.del-cfg').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const list = manager.get();
                    if (confirm(`Remove "${list[idx]}"?`)) {
                        list.splice(idx, 1);
                        manager.saveAll(list);
                        renderList();
                    }
                };
            });

            container.querySelector('#close-cfg').onclick = () => overlay.remove();
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEsc);
                overlay.remove();
            }
        };
        document.addEventListener('keydown', handleEsc);

        renderList();
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    // --- Core Script Injection ---
    let batchContainer = document.createElement('div');
    batchContainer.id = 'batch-edit-container';
    batchContainer.style = 'margin: 20px 0; padding: 20px; border: 2px solid #600; display: none; background: #f9f9f9; clear: both; font-family: sans-serif;';

    const setupAutocomplete = (input) => {
        if (input.dataset.autocompleteBound) return;
        input.dataset.autocompleteBound = 'true';
        input.addEventListener('focus', () => showSuggestions(input));
        input.addEventListener('input', () => {
            showSuggestions(input);
            highlightModifiedComment(input);
        });
        input.addEventListener('change', () => highlightModifiedComment(input));
        input.addEventListener('blur', hideSuggestions);
        input.addEventListener('keydown', (e) => handleKeydown(e, input));
    };

    const highlightModifiedComment = (input) => {
        const isAddPage = window.location.pathname.endsWith('/add-cover-art');
        if (isAddPage) {
            if (input.value.trim() !== "") {
                input.classList.add('modified');
            } else {
                input.classList.remove('modified');
            }
            return;
        }

        const row = getParent(input, 'TR', 'batch-row');
        if (!row) return;
        const id = row.getAttribute('data-id');
        const original = originalData[id];
        if (original && input.value !== original.comment) {
            input.classList.add('modified');
        } else {
            input.classList.remove('modified');
        }
    };

    const injectButton = () => {
        const isAddPage = window.location.pathname.endsWith('/add-cover-art');

        // Add CSS for modified inputs
        if (!document.getElementById('batch-edit-styles')) {
            const style = document.createElement('style');
            style.id = 'batch-edit-styles';
            style.textContent = `
                input.comment.modified, input.batch-comment.modified { border-color: red !important; border-width: 2px !important; }
            `;
            document.head.appendChild(style);
        }

        if (isAddPage) {
            const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Add cover art');
            if (h2 && !document.getElementById('config-immutable')) {
                const btnImmutable = createTag('button', {
                    a: { id: 'config-immutable', style: 'cursor:pointer; padding: 1px 8px; font-size: 0.85em; margin-left: 10px;' }
                }, '⚙️ Configure immutable comments');
                const btnRegex = createTag('button', {
                    a: { id: 'config-regex', style: 'cursor:pointer; padding: 1px 8px; font-size: 0.85em; margin-left: 5px;' }
                }, '⚙️ Configure regexps');

                h2.appendChild(btnImmutable);
                h2.appendChild(btnRegex);

                btnImmutable.onclick = () => showConfigModal("⚙️ Configure Immutable Comments", ImmutableManager, "Enter new immutable comment:", true);
                btnRegex.onclick = () => showConfigModal("⚙️ Configure Regular Expressions", RegexManager, "Enter new regex pattern:", false);

                // Use MutationObserver to handle dynamically added comment fields
                const observer = new MutationObserver((mutations) => {
                    document.querySelectorAll('input.comment').forEach(setupAutocomplete);
                });
                const container = document.getElementById('add-cover-art') || document.body;
                observer.observe(container, { childList: true, subtree: true });

                // Initial run
                document.querySelectorAll('input.comment').forEach(setupAutocomplete);
            }
            return;
        }

        const addBtn = document.querySelector('a[href*="/add-cover-art"]');
        const buttonRow = document.querySelector('.buttons.ui-helper-clearfix');

        // Check if there is a message indicating no cover art is present
        const coverArtHeading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Cover art');
        const noArtMessage = coverArtHeading ? getSibling(coverArtHeading, 'P', null, false, 1) : null;
        const hasNoImages = noArtMessage && noArtMessage.textContent.includes('We do not currently have any cover art for');

        if (addBtn && !document.getElementById('batch-edit-trigger') && !hasNoImages) {
            const batchBtn = document.createElement('a');
            batchBtn.id = 'batch-edit-trigger';
            batchBtn.href = '#';
            batchBtn.style.cursor = 'pointer';
            batchBtn.style.marginLeft = '4px';
            batchBtn.innerHTML = '<bdi>Batch edit cover art</bdi>';

            addBtn.parentNode.insertBefore(batchBtn, addBtn.nextSibling);
            batchBtn.onclick = toggleBatchMode;

            if (buttonRow) {
                buttonRow.parentNode.insertBefore(batchContainer, buttonRow.nextSibling);
            }
        } else if (!addBtn && !hasNoImages) {
            setTimeout(injectButton, 500);
        }
    };

    const toggleBatchMode = async (e) => {
        if (e) e.preventDefault();

        const batchRemoveContainer = document.querySelector('.batch-remove-container');

        if (batchContainer.style.display === 'block') {
            batchContainer.style.display = 'none';
            if (batchRemoveContainer) {
                batchRemoveContainer.style.display = 'block';
            }
            return;
        }

        const images = getImages();
        if (images.length === 0) {
            alert('No editable images found.');
            return;
        }

        // Hide Batch Remove while Batch Edit is active
        if (batchRemoveContainer) {
            batchRemoveContainer.style.display = 'none';
        }

        batchContainer.innerHTML = '<h3 style="color: #600; padding: 10px;">Loading metadata for ' + images.length + ' images...</h3>';
        batchContainer.style.display = 'block';

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <h3 style="margin:0;">Batch Edit Cover Art</h3>
                    <button id="config-immutable" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em;">⚙️ Configure immutable comments</button>
                    <button id="config-regex" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em;">⚙️ Configure regexps</button>
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button id="copy-first-types" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em;">Copy 1st types</button>
                    <button id="copy-first-comment" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em;">Copy 1st comment</button>
                    <button id="clear-all-types" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em; background: #fff; border: 1px solid #999;">Clear all types</button>
                    <button id="reset-batch" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em; background: #fff; border: 1px solid #999;">Reset to original</button>
                </div>
            </div>
            <table style="width:100%; border-collapse: collapse; background: white; border: 1px solid #ccc;">`;

        for (const img of images) {
            const data = await fetchImageData(img.editUrl);
            originalData[img.id] = data;

            html += `
                <tr style="border-bottom: 2px solid #ddd;" class="batch-row" data-id="${img.id}" data-edit-url="${img.editUrl}">
                    <td style="padding: 15px; width: 140px; text-align: center; border-right: 1px solid #eee; background: #fafafa; vertical-align: top;">
                        <img src="${img.thumb}" style="max-width: 120px; max-height: 120px; border: 1px solid #ccc; display: block; margin: 0 auto;" alt="Thumb ${img.id}">
                        <small style="color: #666; display:block; margin-top:5px;">ID: ${img.id}</small>
                    </td>
                    <td style="padding: 15px; vertical-align: top;">
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #555;">Types:</strong>
                            <div class="type-checkboxes" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 5px; margin-top: 8px;">
                                ${TYPES.map(t => `
                                    <label style="font-size: 0.85em; cursor: pointer; display: flex; align-items: center; white-space: nowrap;">
                                        <input type="checkbox" value="${t}" ${data.types.includes(t) ? 'checked' : ''} style="margin-right: 4px;"> ${t}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div style="margin-top: 10px;">
                            <strong style="color: #555;">Comment:</strong>
                            <input type="text" class="batch-comment" autocomplete="off" style="width: 100%; padding: 6px; margin-top: 5px; border: 1px solid #ccc; border-radius: 3px;" value="${data.comment}">
                        </div>
                    </td>
                </tr>`;
        }

        html += `</table>
            <div style="margin-top: 20px; background: #eee; padding: 20px; border-radius: 4px; border: 1px solid #ccc;">
                <label><strong>Edit Note:</strong></label>
                <textarea id="batch-edit-note" placeholder="Explain your changes..." style="width: 100%; height: 60px; margin: 10px 0; padding: 8px; border: 1px solid #ccc;"></textarea><br>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <button id="submit-batch-edit" class="styled-button" style="background: #600; color: white; padding: 10px 20px; font-weight: bold; border: none; cursor: pointer;">🐘 Enter edit</button>
                    <span id="regex-info-text" style="color: #666; font-size: 0.9em; font-style: italic;"></span>
                </div>
            </div>`;

        batchContainer.innerHTML = html;

        // Initialize Elephant Editor after the HTML is injected
        const editNoteTextarea = document.getElementById('batch-edit-note');
        const submitBtn = document.getElementById('submit-batch-edit');
        editNoteMemory = initElephantEditor(editNoteTextarea);
        editNoteMemory.setSubmitButton(submitBtn);

        batchContainer.querySelectorAll('.batch-comment').forEach(setupAutocomplete);

        document.getElementById('config-immutable').onclick = () => showConfigModal("⚙️ Configure Immutable Comments", ImmutableManager, "Enter new immutable comment:", true);
        document.getElementById('config-regex').onclick = () => showConfigModal("⚙️ Configure Regular Expressions", RegexManager, "Enter new regex pattern:", false);

        document.getElementById('copy-first-types').onclick = () => {
            const firstRow = document.querySelector('.batch-row');
            if (!firstRow) return;
            const selected = Array.from(firstRow.querySelectorAll('.type-checkboxes input:checked')).map(i => i.value);
            document.querySelectorAll('.batch-row').forEach(row => {
                row.querySelectorAll('.type-checkboxes input').forEach(checkbox => {
                    checkbox.checked = selected.includes(checkbox.value);
                });
            });
        };

        document.getElementById('copy-first-comment').onclick = () => {
            const firstRow = document.querySelector('.batch-row');
            if (!firstRow) return;
            const commentVal = firstRow.querySelector('.batch-comment').value;
            document.querySelectorAll('.batch-comment').forEach(input => {
                input.value = commentVal;
                highlightModifiedComment(input);
            });
        };

        document.getElementById('clear-all-types').onclick = () => {
            if (confirm("This will uncheck all types for all images in this list. Proceed?")) {
                document.querySelectorAll('.type-checkboxes input').forEach(cb => cb.checked = false);
            }
        };

        document.getElementById('reset-batch').onclick = () => {
            if (confirm("Discard all changes and revert to original metadata?")) {
                document.querySelectorAll('.batch-row').forEach(row => {
                    const id = row.getAttribute('data-id');
                    const orig = originalData[id];
                    const commentInput = row.querySelector('.batch-comment');
                    commentInput.value = orig.comment;
                    highlightModifiedComment(commentInput);
                    row.querySelectorAll('.type-checkboxes input').forEach(cb => {
                        cb.checked = orig.types.includes(cb.value);
                    });
                });
            }
        };

        document.getElementById('submit-batch-edit').onclick = submitAll;
    };

    const getImages = () => {
        const images = [];
        const editLinks = document.querySelectorAll('a[href*="/edit-cover-art/"]');
        editLinks.forEach(link => {
            const id = link.href.split('/').pop();
            const imgElement = document.querySelector(`img[src*="${id}"], img[data-src*="${id}"]`);
            let thumbUrl = '';
            if (imgElement) {
                thumbUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
            }
            images.push({ id: id, editUrl: link.href, thumb: thumbUrl });
        });
        return images.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    };

    const fetchImageData = (url) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (res) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.responseText, "text/html");
                    const comment = doc.querySelector('input[name="edit-cover-art.comment"]')?.value || "";
                    const checkedCheckboxes = doc.querySelectorAll('input[name="edit-cover-art.type_id"]:checked');
                    const types = Array.from(checkedCheckboxes).map(cb => cb.parentElement.textContent.trim()).sort();
                    resolve({ comment, types });
                }
            });
        });
    };

    const submitAll = async () => {
        const rows = document.querySelectorAll('.batch-row');
        const editNote = document.getElementById('batch-edit-note').value;
        const btn = document.getElementById('submit-batch-edit');
        const regexInfoText = document.getElementById('regex-info-text');

        // Note: editNoteMemory is already initialized in toggleBatchMode

        let rowsToChange = [];
        let uniqueCommentsProcessed = new Set();
        let regexMatchCount = 0;

        rows.forEach(row => {
            const id = row.getAttribute('data-id');
            const commentInput = row.querySelector('.batch-comment');
            const currentComment = commentInput.value;
            const currentTypes = Array.from(row.querySelectorAll('.type-checkboxes input:checked')).map(cb => cb.value).sort();

            const orig = originalData[id];
            const typesChanged = JSON.stringify(currentTypes) !== JSON.stringify(orig.types);
            const commentChanged = currentComment !== orig.comment;

            if (typesChanged || commentChanged) {
                row.setAttribute('data-changed', 'true');
                rowsToChange.push(row);

                if (!uniqueCommentsProcessed.has(currentComment)) {
                    const wasSaved = HistoryManager.save(currentComment);
                    if (!wasSaved && currentComment.trim()) {
                        regexMatchCount++;
                    }
                    uniqueCommentsProcessed.add(currentComment);
                }
            } else {
                row.setAttribute('data-changed', 'false');
            }
        });

        if (editNoteMemory) {
            editNoteMemory.saveNote();
        }

        if (rowsToChange.length === 0) {
            const proceed = confirm("No changes detected for any image. Do you want to submit anyway?");
            if (!proceed) return;
        }

        if (!editNote.trim()) {
            alert('Please provide an edit note.');
            return;
        }

        // Show info about blocked storage
        if (regexMatchCount > 0) {
            regexInfoText.innerText = `${regexMatchCount} unique comment(s) matched regexps and so will not be stored in browser storage`;
        } else {
            regexInfoText.innerText = "";
        }

        btn.disabled = true;
        const total = rowsToChange.length;

        for (let i = 0; i < total; i++) {
            const row = rowsToChange[i];
            btn.innerText = `Submitting...(${i + 1}/${total})`;

            const editUrl = row.getAttribute('data-edit-url');
            const commentInput = row.querySelector('.batch-comment');
            const comment = commentInput.value;
            const selectedTypes = Array.from(row.querySelectorAll('.type-checkboxes input:checked')).map(cb => cb.value);

            const formInfo = await getFormPayload(editUrl);
            const formData = new FormData();

            formData.append('edit-cover-art.comment', comment);
            formData.append('edit-cover-art.edit_note', editNote);

            formInfo.typeMapping.forEach(mapping => {
                if (selectedTypes.includes(mapping.name)) {
                    formData.append('edit-cover-art.type_id', mapping.id);
                }
            });

            formInfo.hiddenFields.forEach(field => {
                formData.append(field.name, field.value);
            });

            await postEdit(editUrl, formData);

            // Reset visual state
            commentInput.classList.remove('modified');
            row.style.backgroundColor = '#dff0d8';
            row.style.opacity = '0.5';
        }

        btn.innerText = 'Finished! Reloading...';
        setTimeout(() => window.location.reload(), 1000);
    };

    const getFormPayload = (url) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (res) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.responseText, "text/html");
                    const hiddenFields = Array.from(doc.querySelectorAll('form input[type="hidden"]'))
                        .map(input => ({ name: input.name, value: input.value }));
                    const typeMapping = Array.from(doc.querySelectorAll('input[name="edit-cover-art.type_id"]'))
                        .map(input => ({
                            name: input.parentElement.textContent.trim(),
                            id: input.value
                        }));
                    resolve({ hiddenFields, typeMapping });
                }
            });
        });
    };

    const postEdit = (url, formData) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: formData,
                onload: () => resolve()
            });
        });
    };

    injectButton();
})();
