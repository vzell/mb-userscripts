// ==UserScript==
// @name         VZ: MusicBrainz - Batch Add Preconfigured Relationships To Recordings
// @namespace    https://github.com/vzell/mb-userscripts
// @version      5.1+2025-12-02
// @description  Insert buttons on the Release Edit Relationships page which add preconfigured Artists with their Relationship Type (instruments/vocal/performer)
// @author       Gemini & ChatGPT (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchAddRelationshipsToRecordings.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchAddRelationshipsToRecordings.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/release/*/edit-relationships
// @grant        none
// @run-at       document-idle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // *** DEBUGGING FLAGS ***
    const DEBUG = true;
    const DEBUG_VISIBILITY = false;

    // --- CONSTANTS ---
    const LOG_PREFIX = '[VZ:add-recording-relations]';
    const STORAGE_KEY = 'mb_batch_add_buttons_config';
    const HEADING_SELECTOR = "h2:contains('Track relationships')";
    const GLOBAL_CHAR_DELAY_MS = 10;
    const GLOBAL_POST_SELECT_WAIT_MS = 150;
    const SMALL_BREATHING_ROOM_MS = 150;
    const VISIBILITY_HEARTBEAT_MS = 500;

    // Define the order for sorting buttons
    const RELATIONSHIP_ORDER = {
        'instruments': 1,
        'vocal': 2,
        'performed / performer': 3,
        'default': 99
    };

    function log(...args) {
        if (DEBUG) console.log(LOG_PREFIX, ...args);
    }

    // --- Sorting Utility ---
    function sortButtons(buttons) {
        // Sorts the passed array in place based on relationship type order
        buttons.sort((a, b) => {
            const orderA = RELATIONSHIP_ORDER[a.relationshipType] || RELATIONSHIP_ORDER['default'];
            const orderB = RELATIONSHIP_ORDER[b.relationshipType] || RELATIONSHIP_ORDER['default'];

            // Secondary sort by label for consistency within groups
            if (orderA === orderB) {
                return a.label.localeCompare(b.label);
            }
            return orderA - orderB;
        });
        return buttons;
    }

    // --- DEFAULT CONFIGURATION ---
    const DEFAULT_BUTTONS = [
        {
            label: "Max Weinberg",
            relationshipType: "instruments",
            artist: "Max Weinberg",
            instrument: "drums (drum set)",
            vocal: "", // Kept here for consistency in the configuration object structure
            creditedAs: "drums"
        },
        {
            label: "Garry Tallent",
            relationshipType: "instruments",
            artist: "Garry Tallent",
            instrument: "electric bass guitar",
            vocal: "",
            creditedAs: ""
        },
        {
            label: "Bruce Springsteen",
            relationshipType: "vocal",
            artist: "Bruce Springsteen",
            instrument: "",
            vocal: "lead vocals",
            creditedAs: ""
        },
        {
            label: "E Street Band",
            relationshipType: "performed / performer",
            artist: "The E Street Band"
        }
    ];

    // --- STATE & PERSISTENCE ---
    let ARTIST_BUTTONS = [];

    // --- CRITICAL: GLOBAL QUEUE AND PROCESSING STATE ---
    const queue = [];
    let processing = false;

    // Helper to provide a full default object structure for merging
    const FULL_DEFAULT_BUTTON = {
        label: 'New Button',
        relationshipType: 'instruments',
        artist: '',
        instrument: '',
        vocal: '',
        creditedAs: '',
    };

    function getInitialButtons() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    log("Loaded button configuration from localStorage.");
                    const loadedButtons = parsed.map(btn => ({
                        ...FULL_DEFAULT_BUTTON, // Use default to ensure all keys exist
                        ...btn,                // Overwrite with stored values
                        // Ensure all required fields for instruments/vocal are there, even if empty
                        instrument: btn.instrument || '',
                        vocal: btn.vocal || '',
                        creditedAs: btn.creditedAs || '',
                    }));
                    return sortButtons(loadedButtons);
                }
            }
        } catch (e) {
            console.error(LOG_PREFIX, "Error loading buttons from localStorage, using default.", e);
        }
        log("Using default hardcoded button configuration.");
        return sortButtons(DEFAULT_BUTTONS.map(btn => ({...FULL_DEFAULT_BUTTON, ...btn})));
    }

    function saveButtons(buttons) {
        try {
            // 1. Filter out invalid/empty buttons
            const safeButtons = buttons.filter(btn => btn.label && btn.label.trim() !== '' && btn.artist && btn.artist.trim() !== '');

            // 2. Map and clean: only save relevant fields based on relationship type
            const cleanedButtons = safeButtons.map(btn => {
                const clean = {
                    label: btn.label,
                    relationshipType: btn.relationshipType,
                    artist: btn.artist,
                };

                if (btn.relationshipType === 'instruments') {
                    clean.instrument = btn.instrument;
                    clean.creditedAs = btn.creditedAs;
                } else if (btn.relationshipType === 'vocal') {
                    clean.vocal = btn.vocal;
                    clean.creditedAs = btn.creditedAs;
                }
                // For 'performed / performer', instrument, vocal, and creditedAs are omitted.
                return clean;
            });

            const sortedButtons = sortButtons(cleanedButtons);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedButtons));
            log(`Saved ${sortedButtons.length} button configurations to localStorage.`);
            return sortedButtons;
        } catch (e) {
            console.error(LOG_PREFIX, "Error saving buttons to localStorage.", e);
            return buttons;
        }
    }

    // Initialize the buttons
    ARTIST_BUTTONS = getInitialButtons();


    // ----------------- Utilities -----------------
    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    async function waitVisible(selector, opts = {}) {
        const timeout = opts.timeout ?? 5000;
        const interval = opts.interval ?? 50;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const $el = $(selector).filter(':visible');
            if ($el.length) return $el;
            await sleep(interval);
        }
        return null;
    }
    async function waitDialogClosed(timeout = 2000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            // Check for both the main modals and the specific config overlays
            const $visibleDialogs = $('.modal, .Dialog, .dialog, .ui-dialog, .ui-widget-overlay, #aa-config-modal-overlay, #aa-add-new-modal-overlay').filter(':visible');
            if ($visibleDialogs.length === 0) {
                await sleep(SMALL_BREATHING_ROOM_MS);
                return true;
            }
            await sleep(50);
        }
        return false;
    }
    async function waitForCondition(conditionFn, {timeout = 3000, interval = 50} = {}) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                if (await conditionFn()) return true;
            } catch (e) { /* ignore */ }
            await sleep(interval);
        }
        return false;
    }
    function setReactValueAndDispatch(el, value) {
        try {
            const nativeSetter = Object.getOwnPropertyDescriptor(el.__proto__, 'value')?.set;
            if (nativeSetter) nativeSetter.call(el, value);
            else el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        } catch (e) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    function clearInput(el) { setReactValueAndDispatch(el, ''); }
    async function typeAndSelect($input, text, {
        charDelay = GLOBAL_CHAR_DELAY_MS,
        postSelectWait = GLOBAL_POST_SELECT_WAIT_MS,
        optionSelector = "li[role='option']"
    } = {}) {
        const el = $input[0];
        if (!el) throw new Error('Input element missing');
        el.focus();
        clearInput(el);
        await sleep(50);
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const newValue = el.value + ch;
            setReactValueAndDispatch(el, newValue);
            await sleep(charDelay);
        }
        await sleep(100);
        const found = await waitForCondition(() => {
            const $opts = $(optionSelector).filter(':visible');
            if (!$opts.length) return false;
            const match = $opts.toArray().find(o => $(o).text().trim().toLowerCase().startsWith(text.toLowerCase()));
            if (match) { match.click(); return true; }
            const match2 = $opts.toArray().find(o => $(o).text().trim().toLowerCase().includes(text.toLowerCase()));
            if (match2) { match2.click(); return true; }
            return false;
        }, {timeout: 3000, interval: 80});
        if (!found) { log(`Warning: option for "${text}" not found in suggestions after timeout.`); }
        await sleep(postSelectWait);
    }
    async function openBatchAddDialog() {
        await waitDialogClosed(2000);
        const $batch = $("button.add-item.with-label.batch-add-recording-relationship, button.add-item.batch-add-recording-relationship, button.add-item.with-label").filter(function() {
            const t = $(this).text().toLowerCase();
            return t.includes('batch-add') || t.includes('batch add') || (t.includes('add') && t.includes('record'));
        });
        if ($batch.length === 0) { log("Batch-add button not found via selectors"); return false; }
        $batch[0].click();
        const appeared = await waitForCondition(() => {
            const $d = $('.modal, .Dialog, .dialog, .ui-dialog').filter(':visible');
            return $d.length > 0;
        }, {timeout: 3000, interval: 80});
        if (!appeared) { await sleep(300); }
        await sleep(SMALL_BREATHING_ROOM_MS);
        return true;
    }
    async function clickDoneAndWaitClose() {
        const $doneButton = await waitVisible('button.positive:visible', {timeout: 4000});
        if ($doneButton) {
            const $exactDone = $doneButton.filter((i, btn) => $(btn).text().trim() === 'Done');
            if ($exactDone.length) {
                log("Clicking Done");
                $exactDone[0].click();
                await waitForCondition(() => {
                    const $d = $('.modal, .Dialog, .dialog, .ui-dialog').filter(':visible');
                    return $d.length === 0;
                }, {timeout: 3000, interval: 80});
                await sleep(SMALL_BREATHING_ROOM_MS);
                return true;
            }
        }
        log("Done button not found (when trying to click Done).");
        return false;
    }

    // --- Initial State Cleanup ---
    function resetInitialState() {
        const $allRecordings = $('#tracklist input[type="checkbox"]:not(.work)');
        const $checkedOnLoad = $allRecordings.filter(':checked');

        if ($checkedOnLoad.length > 0) {
            log(`Initial state fix: Found ${$checkedOnLoad.length} checked checkboxes on load. Forcing uncheck with aggressive click simulation.`);

            $checkedOnLoad.each(function() {
                const el = this;
                try {
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                } catch(e) {
                    $(el).click();
                }
            });

            setTimeout(() => {
                const $stillChecked = $allRecordings.filter(':checked');
                if ($stillChecked.length > 0) {
                    log(`Warning: Aggressive uncheck failed. Still checked: ${$stillChecked.length}`);
                } else {
                    log("Initial state fix successful: 0 checked recordings after cleanup.");
                }
            }, 100);

            return true;
        }
        log("Initial state fix: Found 0 checked checkboxes on load. State is clean.");
        return false;
    }

    // ----------------- Filling sequence -----------------
    async function fillFieldsAsync(config) {
        // --- START OF ENHANCEMENT: Ensure "Related type" is "Artist" ---
        const $relatedTypeSelect = await waitVisible('select.entity-type:visible', {timeout: 3000});
        const desiredValue = 'artist';

        if ($relatedTypeSelect) {
            const el = $relatedTypeSelect[0];

            if ($relatedTypeSelect.val() !== desiredValue) {
                log(`Changing 'Related type' from '${$relatedTypeSelect.val()}' to 'artist'`);

                // Set the value and dispatch events to trigger React re-render
                setReactValueAndDispatch(el, desiredValue);

                // Give the application a moment to react to the entity-type change
                await sleep(SMALL_BREATHING_ROOM_MS);

            } else {
                log("'Related type' is already set to 'artist', skipping change.");
            }
        } else {
            log("Warning: 'Related type' select element not found. Continuing, but this might fail.");
        }
        // --- END OF ENHANCEMENT ---

        log(`Start filling for: ${config.label} (${config.relationshipType})`);
        const $relInput = await waitVisible('input.relationship-type', {timeout: 4000});
        if (!$relInput) { log("Relationship type input not found — aborting this item."); return false; }
        log(`Typing relationshipType '${config.relationshipType}'`);
        await typeAndSelect($relInput, config.relationshipType);

        const $artist = await waitVisible('input[placeholder="Type to search, or paste an MBID"]', {timeout: 4000});
        if (!$artist) { log("Artist input not found — aborting this item."); return false; }
        log(`Typing artist '${config.artist}'`);
        await typeAndSelect($artist, config.artist);

        if (config.relationshipType === 'performed / performer') {
            // This relationship type does not have instrument, vocal, or credited-as fields.
            log("Performed / performer detected — skipping attributes and clicking Done.");
            await clickDoneAndWaitClose();
            log(`Finished performer item: ${config.label}`);
            return true;
        }

        const placeholderName = config.relationshipType === 'instruments' ? 'instrument' : 'vocal';

        // Fill Instrument/Vocal
        if (config.relationshipType === 'instruments' || config.relationshipType === 'vocal') {
            const $inst = await waitVisible(`input[placeholder="${placeholderName}"]`, {timeout: 4000});
            if (!$inst) { log(`${placeholderName} input not found — aborting this item.`); return false; }
            const desired = (config.relationshipType === 'instruments') ? config.instrument : config.vocal;
            if (desired && desired.length > 0) {
                log(`Typing ${placeholderName} '${desired}'`);
                await typeAndSelect($inst, desired);
            } else {
                log(`No ${placeholderName} value provided, skipping selection.`);
            }
        }

        // Fill Credited As
        const creditedAsValue = config.creditedAs ?? '';

        if (config.relationshipType !== 'performed / performer' && creditedAsValue.length > 0) {
            log("Attempting to fill 'Credited as' field…");
            // Find the visible 'credited as' input, prioritizing the one associated with the relationship type
            let $creditedInput = $("input:visible").filter((i, el) => {
                const cls = (el.className || '').toLowerCase();
                return cls.includes('attribute-credit');
            }).first();

            // Fallback strategy if initial filter is too broad/narrow
            if ($creditedInput.length === 0) {
                 $creditedInput = $("input:visible").filter((i, el) => {
                    const idn = (el.id || '').toLowerCase();
                    const name = (el.name || '').toLowerCase();
                    return idn.includes('credit') || name.includes('credit');
                }).first();
            }

            if ($creditedInput && $creditedInput.length) {
                const el = $creditedInput[0];
                setReactValueAndDispatch(el, creditedAsValue);
                await sleep(100);
                log(`'Credited as' set to "${creditedAsValue}"`);
            } else {
                log("Could not find credited-as input; skipping.");
            }
        } else {
            log("Skipping 'Credited as' filling (either not relevant or no value provided).");
        }

        const doneClicked = await clickDoneAndWaitClose();
        if (doneClicked) {
            log(`Finished item: ${config.label}`);
            return true;
        } else {
            log("Done not clicked (not found) — but continuing.");
            return true;
        }
    }


    // ----------------- Queue Processing -----------------

    async function processQueue() {
        if (processing) return;
        processing = true;
        while (queue.length) {
            const config = queue.shift();
            try {
                log(`Processing queue item: ${config.label}`);
                const opened = await openBatchAddDialog();
                if (!opened) {
                    log("Could not open batch-add dialog — skipping this item.");
                    await sleep(SMALL_BREATHING_ROOM_MS);
                    continue;
                }
                await fillFieldsAsync(config);
                await sleep(200);
            } catch (e) {
                console.error(LOG_PREFIX, "Error processing item", e);
                await sleep(500);
            }
        }
        processing = false;
        log("Batch processing queue finished.");
    }


    // ----------------- Modal UI -----------------

    // Function to dynamically show/hide fields based on relationship type
    function updateFieldVisibility($item) {
        const type = $item.find('select[name="relationshipType"]').val();

        // Hide all dynamic fields first
        $item.find('.instrument-field').hide();
        $item.find('.vocal-field').hide();
        $item.find('.creditedAs-field').show(); // Default to visible

        if (type === 'instruments') {
            $item.find('.instrument-field').show();
        } else if (type === 'vocal') {
            $item.find('.vocal-field').show();
        } else if (type === 'performed / performer') {
            // Hide all attribute fields for this type
            $item.find('.creditedAs-field').hide();
        }
    }

    function showAddButtonModal(saveCallback) {
        // Ensure only one modal is present
        $('#aa-add-new-modal-overlay').remove();

        const MODAL_STYLE = `
            #aa-add-new-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.75); z-index: 10000; /* Higher Z-index than main config modal */
                display: flex; justify-content: center; align-items: center;
            }
            #aa-add-new-modal {
                background: white; padding: 20px; border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5); max-width: 500px;
                width: 90%;
                font-family: Arial, sans-serif; color: #333;
            }
            #aa-add-new-modal h4 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
            #aa-add-new-modal label { display: block; margin-top: 8px; font-weight: bold; font-size: 0.9em; }
            #aa-add-new-modal input, #aa-add-new-modal select {
                width: 100%; padding: 6px; margin-top: 4px; box-sizing: border-box;
                border: 1px solid #ccc; border-radius: 4px;
            }
            .aa-add-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
            .aa-add-footer button { padding: 8px 15px; cursor: pointer; border-radius: 4px; border: none; }
            .aa-add-save-btn { background-color: #4CAF50; color: white; }
            .aa-add-cancel-btn { background-color: #ccc; color: #333; }
        `;

        // Add the new style block
        if ($('#aa-add-new-modal-style').length === 0) {
             $('head').append(`<style id="aa-add-new-modal-style">${MODAL_STYLE}</style>`);
        }

        const $overlay = $('<div id="aa-add-new-modal-overlay">');
        const $modal = $('<div id="aa-add-new-modal">');

        $modal.html(`
            <h4>Add New Button Configuration</h4>
            <div id="aa-add-form">
                <label>Label (Button Text): <input type="text" name="label" value="" placeholder="E.g., Max Weinberg"></label>

                <label>Relationship Type:
                    <select name="relationshipType">
                        <option value="instruments">instruments</option>
                        <option value="vocal">vocal</option>
                        <option value="performed / performer">performed / performer</option>
                    </select>
                </label>
                <label>Artist Name: <input type="text" name="artist" value="" placeholder="E.g., Max Weinberg (required)"></label>

                <label class="instrument-field">Instrument (if type='instruments'): <input type="text" name="instrument" value="" placeholder="E.g., drums (drum set)"></label>
                <label class="vocal-field">Vocal (if type='vocal'): <input type="text" name="vocal" value="" placeholder="E.g., lead vocals"></label>
                <label class="creditedAs-field">Credited As: <input type="text" name="creditedAs" value="" placeholder="E.g., drums"></label>
            </div>
            <div class="aa-add-footer">
                <button class="aa-add-cancel-btn">Cancel</button>
                <button class="aa-add-save-btn">Add Button</button>
            </div>
        `);

        const $form = $modal.find('#aa-add-form');
        const $select = $form.find(`select[name="relationshipType"]`);
        const $labelInput = $form.find('input[name="label"]');
        const $artistInput = $form.find('input[name="artist"]');

        let artistEditedManually = false;

        // 1. Artist Sync Logic
        $artistInput.on('input', () => {
            // Once the user types anything in the artist field, disable syncing
            artistEditedManually = true;
        });

        $labelInput.on('input', function() {
            if (!artistEditedManually) {
                // Only sync if the artist field hasn't been manually touched
                $artistInput.val($(this).val());
            }
        });

        // 2. Field Visibility Logic
        const updateAddModalVisibility = () => {
             // Use the same logic as the main modal updateFieldVisibility
             const type = $select.val();
             $form.find('.instrument-field').hide();
             $form.find('.vocal-field').hide();
             $form.find('.creditedAs-field').show();

             if (type === 'instruments') {
                 $form.find('.instrument-field').show();
             } else if (type === 'vocal') {
                 $form.find('.vocal-field').show();
             } else if (type === 'performed / performer') {
                 $form.find('.creditedAs-field').hide();
             }
        };

        // Initial visibility
        updateAddModalVisibility();

        // Add change listener for dynamic visibility
        $select.on('change', updateAddModalVisibility);

        const cleanupAndClose = () => {
            $(document).off('keydown', escapeHandler);
            $overlay.remove();
        }

        $modal.on('click', '.aa-add-cancel-btn', cleanupAndClose);

        $modal.on('click', '.aa-add-save-btn', function() {
            const newButton = {
                label: $labelInput.val().trim(),
                relationshipType: $select.val(),
                artist: $artistInput.val().trim(),
                instrument: $form.find('input[name="instrument"]').val().trim(),
                vocal: $form.find('input[name="vocal"]').val().trim(),
                creditedAs: $form.find('input[name="creditedAs"]').val().trim(),
            };

            if (!newButton.label || !newButton.artist) {
                // Using alert() here as it is inside a custom modal flow and should be seen
                alert("Both Label and Artist Name are required to add a new button.");
                return;
            }

            saveCallback(newButton);
            cleanupAndClose();
        });

        // Escape Key Handler
        const escapeHandler = function(e) {
            const isInput = $(e.target).is('input, select, textarea');
            if (e.key === 'Escape' && !isInput) {
                e.preventDefault();
                e.stopPropagation();
                cleanupAndClose();
            }
        };

        $(document).on('keydown', escapeHandler);

        $overlay.append($modal);
        $('body').append($overlay);
    }

    function showConfigModal() {
        // Ensure only one modal is present
        $('#aa-config-modal-overlay').remove();

        // Deep clone the current buttons for local manipulation
        // Note: currentButtons will be dynamically replaced by getCurrentConfigFromForm(true)
        // when changes occur in the DOM, making it match the current view.
        let currentButtons = ARTIST_BUTTONS.map(a => Object.assign({}, a));

        // Capture the initial state string (must be sorted for a reliable comparison)
        const initialConfigString = JSON.stringify(sortButtons(currentButtons.map(a => Object.assign({}, a))));

        const MODAL_STYLE = `
            #aa-config-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.75); z-index: 9999;
                display: flex; justify-content: center; align-items: center;
            }
            #aa-config-modal {
                background: white; padding: 20px; border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); max-width: 800px;
                width: 90%; max-height: 90%;
                font-family: Arial, sans-serif; color: #333;
                display: flex; /* Flex container for scrollable content + fixed footer */
                flex-direction: column;
            }
            #aa-config-modal h3 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 10px; flex-shrink: 0; }

            #aa-config-scroll-area {
                overflow-y: auto; /* Scrollable content area */
                flex-grow: 1;
                padding-right: 5px; /* Add slight padding for scrollbar visibility */
            }

            .aa-config-item {
                border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 6px;
                background-color: #f9f9f9;
            }
            .aa-config-item h4 { margin: 0 0 10px 0; display: flex; justify-content: space-between; align-items: center; }
            .aa-config-item label { display: block; margin-top: 8px; font-weight: bold; font-size: 0.9em; }
            .aa-config-item input, .aa-config-item select {
                width: 100%; padding: 6px; margin-top: 4px; box-sizing: border-box;
                border: 1px solid #ccc; border-radius: 4px;
            }
            /* FIXED FOOTER STYLE */
            .aa-config-footer {
                display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px;
                border-top: 1px solid #ccc;
                flex-shrink: 0;
            }
            .aa-config-footer button {
                padding: 8px 15px; cursor: pointer; border-radius: 4px; border: none;
                font-weight: bold;
            }
            .aa-remove-btn { background-color: #f44336; color: white; border: none; padding: 4px 8px; font-size: 0.8em; cursor: pointer; }
            .aa-add-btn, .aa-save-btn { /* Apply cursor to Add New button */
                cursor: pointer;
            }
            .aa-add-btn { background-color: #007bff; color: white; border: none; }
            .aa-save-btn { background-color: #4CAF50; color: white; border: none; }
            .aa-close-btn { background-color: #ccc; color: #333; border: none; cursor: pointer; }
        `;

        // Apply styles
        if ($('#aa-config-modal-style').length === 0) {
             $('head').append(`<style id="aa-config-modal-style">${MODAL_STYLE}</style>`);
        }


        const $overlay = $('<div id="aa-config-modal-overlay">');
        const $modal = $('<div id="aa-config-modal">');
        $modal.html('<h3>Batch Relationship Button Configuration</h3><div id="aa-config-scroll-area"><div id="aa-config-form"></div></div>');

        const $scrollArea = $modal.find('#aa-config-scroll-area');
        const $formContainer = $modal.find('#aa-config-form');

        const renderForm = (buttons) => {
            $formContainer.empty();
            // Important: Render the *sorted* array
            buttons.forEach((config, index) => {
                const $item = $(`<div class="aa-config-item" data-index="${index}">`);

                // Use default values if keys are missing (e.g., in a cleaned 'performed / performer' object)
                const safeConfig = {...FULL_DEFAULT_BUTTON, ...config};

                // Build the item structure
                $item.append(`
                    <h4>
                        Button ${index + 1}: ${safeConfig.label}
                        <button class="aa-remove-btn">Remove</button>
                    </h4>
                    <label>Label (Button Text): <input type="text" name="label" value="${safeConfig.label || ''}" placeholder="E.g., Max Weinberg"></label>

                    <label>Relationship Type:
                        <select name="relationshipType">
                            <option value="instruments">instruments</option>
                            <option value="vocal">vocal</option>
                            <option value="performed / performer">performed / performer</option>
                        </select>
                    </label>
                    <label>Artist Name: <input type="text" name="artist" value="${safeConfig.artist || ''}" placeholder="E.g., Max Weinberg (required)"></label>

                    <label class="instrument-field">Instrument (if type='instruments'): <input type="text" name="instrument" value="${safeConfig.instrument || ''}" placeholder="E.g., drums (drum set)"></label>
                    <label class="vocal-field">Vocal (if type='vocal'): <input type="text" name="vocal" value="${safeConfig.vocal || ''}" placeholder="E.g., lead vocals"></label>

                    <label class="creditedAs-field">Credited As: <input type="text" name="creditedAs" value="${safeConfig.creditedAs || ''}" placeholder="E.g., drums"></label>
                `);

                // Set selected value for relationshipType
                const $select = $item.find(`select[name="relationshipType"]`);
                $select.val(safeConfig.relationshipType);

                // Initial visibility update
                updateFieldVisibility($item);

                // Add change listener for dynamic visibility
                $select.on('change', function() {
                    updateFieldVisibility($item);
                });

                // Add change listener to all inputs to update the local currentButtons array instantly
                $item.find('input, select').on('change keyup', function() {
                    const fieldName = $(this).attr('name');
                    const value = $(this).val();
                    const $currentItem = $(this).closest('.aa-config-item');
                    const index = $currentItem.data('index');

                    // Update the label in the h4 for instant feedback
                    if (fieldName === 'label') {
                        $currentItem.find('h4').html(`Button ${index + 1}: ${value}<button class="aa-remove-btn">Remove</button>`);
                    }

                    // Update the local array by reading the current DOM state (sorted)
                    // This ensures currentButtons always matches the visible form for accurate removal/saving
                    currentButtons = getCurrentConfigFromForm(true);
                });


                $formContainer.append($item);
            });
        };

        // Utility to extract current form state (used for comparison)
        function getCurrentConfigFromForm(onlyReadDom = false) {
            if (onlyReadDom) {
                const currentConfig = [];
                $formContainer.find('.aa-config-item').each(function() {
                    currentConfig.push({
                        label: $(this).find('input[name="label"]').val().trim(),
                        relationshipType: $(this).find('select[name="relationshipType"]').val(),
                        artist: $(this).find('input[name="artist"]').val().trim(),
                        instrument: $(this).find('input[name="instrument"]').val().trim(),
                        vocal: $(this).find('input[name="vocal"]').val().trim(),
                        creditedAs: $(this).find('input[name="creditedAs"]').val().trim(),
                    });
                });
                return sortButtons(currentConfig);
            }
            // Fallback: use the in-memory array
            return sortButtons(currentButtons.map(a => Object.assign({}, a)));
        }

        // Initial render
        renderForm(currentButtons);

        // --- Event Handlers ---

        // Cleanup function for modal closure
        const cleanupAndClose = () => {
            $(document).off('keydown', escapeHandler);
            $('#aa-add-new-modal-overlay').remove(); // Ensure add modal is also closed
            $overlay.remove();
        }

        // Add New Button Handler
        const handleAddNewButton = () => {
             // Open the dedicated small modal
             showAddButtonModal((newButton) => {
                // Callback function when the new button is saved in the sub-modal

                // 1. Read the current DOM state to ensure we capture any pending edits
                const currentDomConfig = getCurrentConfigFromForm(true);

                // 2. Add the new button
                currentDomConfig.push(newButton);
                currentButtons = sortButtons(currentDomConfig); // Update local array

                // 3. Re-render the main form with the new, sorted button list
                renderForm(currentButtons);

                // 4. Scroll to the bottom to see the newly added button (which is now in its sorted position)
                $scrollArea.scrollTop($scrollArea[0].scrollHeight);
             });
        };


        // Remove Button (FIXED: Uses index for unique removal)
        $modal.on('click', '.aa-remove-btn', function() {
            const $item = $(this).closest('.aa-config-item');

            // Read the current state of the buttons from the form (guaranteed to match the visible list)
            const domConfig = getCurrentConfigFromForm(true);
            const indexToRemove = $item.data('index'); // This index is based on the *sorted* array shown on screen

            if (domConfig.length > 1) {

                // Remove the item at the specific index using splice
                domConfig.splice(indexToRemove, 1);

                // Update currentButtons and ensure it is sorted
                currentButtons = sortButtons(domConfig);

                renderForm(currentButtons);

            } else {
                console.warn(LOG_PREFIX, "User tried to remove the last button. Must keep at least one.");
                alert("You must keep at least one button configuration.");
            }
        });

        // Save Button
        const saveAndClose = () => {
            const newConfig = [];
            let valid = true;

            $formContainer.find('.aa-config-item').each(function() {
                const $item = $(this);
                const label = $item.find('input[name="label"]').val().trim();
                const artist = $item.find('input[name="artist"]').val().trim();

                if (!label || !artist) {
                    // Using alert() here as it is inside a custom modal flow and should be seen
                    alert(`Button configuration requires both a Label and an Artist Name. Please check item ${$item.data('index') + 1}.`);
                    valid = false;
                    return false; // Stop .each loop
                }

                newConfig.push({
                    label: label,
                    relationshipType: $item.find('select[name="relationshipType"]').val(),
                    artist: artist,
                    instrument: $item.find('input[name="instrument"]').val().trim(),
                    vocal: $item.find('input[name="vocal"]').val().trim(),
                    creditedAs: $item.find('input[name="creditedAs"]').val().trim(),
                });
            });

            if (valid) {
                // Save and sort the new configuration (saveButtons will handle stripping unnecessary fields)
                ARTIST_BUTTONS = saveButtons(newConfig);
                renderButtons(ARTIST_BUTTONS); // Re-render the batch buttons on the main page
                cleanupAndClose();
                log("Configuration saved and buttons updated.");
            }
        };

        // Escape Key Handler
        const escapeHandler = function(e) {
            // Check if the event target is inside an input field, which might be handling Esc for something else
            const isInput = $(e.target).is('input, select, textarea');
            if (e.key === 'Escape' && !isInput) {
                e.preventDefault();
                e.stopPropagation();

                const finalConfig = getCurrentConfigFromForm(true); // Read current state from DOM
                const finalConfigString = JSON.stringify(finalConfig);

                if (finalConfigString === initialConfigString) {
                    // No changes, close safely
                    cleanupAndClose();
                    log("Configuration modal closed with Esc key (no changes).");
                } else {
                    // Changes made, prompt user
                    const response = window.confirm("You have unsaved changes. Press OK to discard changes and close, or Cancel to return and Save.");
                    if (response) {
                        cleanupAndClose();
                        log("Configuration modal closed with Esc key (changes discarded).");
                    }
                }
            }
        };

        // Attach event listeners
        $(document).on('keydown', escapeHandler);

        // Footer (Fixed position achieved by putting it outside the scroll area)
        const $footer = $(`
            <div class="aa-config-footer">
                <button class="aa-close-btn">Close</button>
                <div>
                    <button class="aa-add-btn">Add New Button</button>
                    <button class="aa-save-btn">Save & Reload Buttons</button>
                </div>
            </div>
        `);

        $modal.append($footer);

        $modal.on('click', '.aa-close-btn', cleanupAndClose);
        $modal.on('click', '.aa-save-btn', saveAndClose);
        $modal.on('click', '.aa-add-btn', handleAddNewButton);

        $overlay.append($modal);
        $('body').append($overlay);
    }

    // ----------------- UI: Button Rendering and Creation -----------------

    const BUTTON_STYLE_CONFIG = {
        'instruments': { bgColor: '#4CAF50', activeColor: '#3e8e41', icon: '🎸 ' },
        'vocal': { bgColor: '#2196F3', activeColor: '#0b7dda', icon: '🎤 ' },
        'performed / performer': { bgColor: '#FF9800', activeColor: '#e68a00', icon: '🎭 ' },
        'default': { bgColor: '#607D8B', activeColor: '#455a64', icon: '🔗 ' }
    };

    function renderButtons(buttons) {
        const $mainContainer = $('.injected-buttons-container');
        if ($mainContainer.length === 0) return;

        let $batchButtonContainer = $mainContainer.find('#aa-batch-buttons');
        if ($batchButtonContainer.length === 0) {
            $batchButtonContainer = $('<div id="aa-batch-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>');
            $mainContainer.append($batchButtonContainer);
        }

        $batchButtonContainer.empty();

        buttons.forEach(config => {
            const style = BUTTON_STYLE_CONFIG[config.relationshipType] || BUTTON_STYLE_CONFIG['default'];
            const buttonText = `${style.icon}${config.label}`;

            const buttonStyleString = `
                background-color: ${style.bgColor};
                color: white;
                padding: 2px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.15s ease-in-out;
                white-space: nowrap;
                flex-shrink: 0;
                line-height: 16px;
            `;

            const $button = $('<button/>', {
                text: buttonText,
                'data-label': config.label
            });

            $button.attr('style', buttonStyleString);

            $button.on({
                'mouseenter': function() { $(this).css('opacity', 0.9); },
                'mouseleave': function() { $(this).css('opacity', 1); },
                'click': function() {
                    $(this).css('background-color', style.activeColor);
                    setTimeout(() => $(this).css('background-color', style.bgColor), 500);
                }
            });

            $batchButtonContainer.append($button);

            $button.on('click', () => {
                log(`Enqueued "${config.label}" (${config.relationshipType})`);
                queue.push(Object.assign({}, config));
                processQueue().catch(e => console.error(e));
            });
        });
    }

    function createCustomButtons() {
        const $heading = $(HEADING_SELECTOR);

        if ($heading.length === 0) {
            log("Heading 'Track relationships' not found yet — retrying…");
            setTimeout(createCustomButtons, 500);
            return;
        }

        // Apply Flexbox styling to the H2 to hold the text and the button.
        // Removed justify-content: space-between and width: 100% to stop the button
        // from being pushed to the far right. Added gap: 10px for spacing.
        $heading.attr('style', 'display: flex; align-items: center; gap: 10px; margin-bottom: 0;');

        const configButtonStyle = `
            background-color:#f0f0f0; color:#333;
            padding:2px 10px; border:none; border-radius:4px;
            cursor:pointer; font-weight:bold; line-height:1.2; flex-shrink:0;
        `;

        // --- Configuration Button ---
        // Check for existing button inside H2
        let $configButton = $heading.find('#aa-config-btn');
        if ($configButton.length === 0) {
            $configButton = $('<button/>', {
                id: 'aa-config-btn',
                html: '⚙️ Configure recording artist relation buttons (instruments/vocals/performer)'
            });

            $configButton.attr('style', configButtonStyle);
            $configButton.on('click', showConfigModal);

            // Inject the configuration button directly into the heading element (at the end of the line)
            $heading.append($configButton);
        }

        // --- MAIN WRAPPER (This contains the action buttons) ---
        // Find the next sibling that is the main wrapper for action buttons
        let $container = $heading.nextAll('.injected-buttons-container').first();
        if ($container.length === 0) {
            $container = $(`
                <div class="injected-buttons-container"
                     style="display:flex; flex-direction:column; gap:8px;
                            margin-top:10px; margin-bottom:5px; width:100%;">
                </div>
            `);
            // Inject the main container after the heading
            $heading.after($container);
        }

        // -------------------------------
        // ACTION BUTTON CONTAINER (VISIBILITY CONTROLLED - Must be kept)
        // -------------------------------
        let $actionContainer = $container.find('#aa-action-buttons-container');
        if ($actionContainer.length === 0) {
            $actionContainer = $(`
                <div id="aa-action-buttons-container" style="display:none;">
                    <div id="aa-batch-buttons"
                         style="display:flex; gap:10px; flex-wrap:wrap;">
                    </div>
                </div>
            `);
            $container.append($actionContainer);
        }

        const $batchButtonContainer = $actionContainer.find('#aa-batch-buttons');
        $batchButtonContainer.empty();

        // Render all dynamic action buttons into this new container
        renderButtons(ARTIST_BUTTONS);

        // -------------------------------
        // Visibility logic (unchanged)
        // -------------------------------
        function getCheckedRecordings() {
            return $('#tracklist input[type="checkbox"]:not(.work)');
        }

        function updateButtonVisibility() {
            const $checked = getCheckedRecordings().filter(':checked');
            const anyChecked = $checked.length > 0;

            if (anyChecked) {
                $actionContainer.show();
            } else {
                $actionContainer.hide();
            }
        }

        updateButtonVisibility();

        $('#tracklist').on('change click input', 'input[type="checkbox"]', () => {
            setTimeout(updateButtonVisibility, 50);
        });

        setInterval(updateButtonVisibility, VISIBILITY_HEARTBEAT_MS);
    }

    // ----------------- Main Execution -----------------

    try {
        setTimeout(() => {
            log("Starting userscript execution...");
            resetInitialState();
            createCustomButtons();
        }, 2000);
    } catch (error) {
        // This catch block primarily catches sync errors during the setting of the timeout.
        console.error(LOG_PREFIX, "CRITICAL SCRIPT FAILURE during initial setup:", error);
    }

})();
