// ==UserScript==
// @name         BatchAddRelationshipsToRecordings.user.js
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0
// @description  Insert artist buttons, open batch-add dialog, reliably fill relationship type (instruments|vocal|performed / performer), artist, instrument/vocal, credited-as, click Done — sequential queue + dialog lifecycle awareness.
// @homepageURL  https://github.com/vzell/mb-userscripts
// @tag          vzell with the help of ChatGPT
// @homepageURL  https://github.com/vzell/mb-userscripts
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchAddRelationshipsToRecordings.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchAddRelationshipsToRecordings.user.js
// @match        https://musicbrainz.org/release/*/edit-relationships*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = true;
    const HEADING_SELECTOR = "h2:contains('Track relationships')";

    function log(...args) {
        if (DEBUG) console.log('[AA-add-instrument]', ...args);
    }

    // --- Configuration for multiple Artist buttons ---
    const ARTIST_BUTTONS = [
        {
            label: "Max Weinberg",
            relationshipType: "instruments",
            artist: "Max Weinberg",
            instrument: "drums (drum set)",
            creditedAs: "drums"
        },
        {
            label: "Garry Tallent",
            relationshipType: "instruments",
            artist: "Garry Tallent",
            instrument: "electric bass guitar",
            creditedAs: ""
        },
        {
            label: "Bruce Springsteen",
            relationshipType: "vocal",
            artist: "Bruce Springsteen",
            vocal: "lead vocals",
            creditedAs: ""
        },
        {
            label: "E Street Band",
            relationshipType: "performed / performer",
            artist: "The E Street Band"
        }
        // Add/remove entries as needed
    ];

    // ----------------- Utilities -----------------
    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    // Wait for an element matching selector that is visible
    async function waitVisible(selector, opts = {}) {
        const timeout = opts.timeout ?? 5000;
        const interval = opts.interval ?? 100;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const $el = $(selector).filter(':visible');
            if ($el.length) return $el;
            await sleep(interval);
        }
        return null;
    }

    // Wait until no visible dialog exists (used to ensure previous dialog fully closed)
    async function waitDialogClosed(timeout = 3000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            // adjust selector if your dialog uses a specific class; generic attempt:
            const $visibleDialogs = $('.modal, .Dialog, .dialog, .ui-dialog').filter(':visible');
            if ($visibleDialogs.length === 0) {
                // small extra breathing room so React finishes unmount
                await sleep(200);
                return true;
            }
            await sleep(100);
        }
        return false;
    }

    // Wait until a particular condition returns truthy or times out
    async function waitForCondition(conditionFn, {timeout = 3000, interval = 100} = {}) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                if (await conditionFn()) return true;
            } catch (e) { /* ignore */ }
            await sleep(interval);
        }
        return false;
    }

    // Set value for React-controlled input and dispatch events
    function setReactValueAndDispatch(el, value) {
        try {
            const nativeSetter = Object.getOwnPropertyDescriptor(el.__proto__, 'value')?.set;
            if (nativeSetter) nativeSetter.call(el, value);
            else el.value = value;

            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            // some react versions also respond to these:
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        } catch (e) {
            // fallback
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Clear an input cleanly (React-aware)
    function clearInput(el) {
        setReactValueAndDispatch(el, '');
    }

    // Type into autocomplete input character by character and select matching option when available.
    // This function is defensive: it waits for suggestion list, waits for an option starting with prefix (case-insensitive),
    // clicks it, then waits until some sign of selection appears (or a small delay).
    async function typeAndSelect($input, text, {charDelay = 40, postSelectWait = 300, optionSelector = "li[role='option']"} = {}) {
        const el = $input[0];
        if (!el) throw new Error('Input element missing');

        el.focus();

        // Ensure input is empty first (React-friendly)
        clearInput(el);
        await sleep(50);

        // Type characters slowly
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const newValue = el.value + ch;
            setReactValueAndDispatch(el, newValue);
            await sleep(charDelay);
        }

        // At end, give suggestions a moment
        await sleep(120);

        // Wait for a suggestion that startsWith text
        const found = await waitForCondition(() => {
            const $opts = $(optionSelector).filter(':visible');
            if (!$opts.length) return false;
            // prefer exact startsWith (case-insensitive)
            const match = $opts.toArray().find(o => $(o).text().trim().toLowerCase().startsWith(text.toLowerCase()));
            if (match) {
                match.click();
                return true;
            }
            // fallback: any option that includes the text
            const match2 = $opts.toArray().find(o => $(o).text().trim().toLowerCase().includes(text.toLowerCase()));
            if (match2) {
                match2.click();
                return true;
            }
            return false;
        }, {timeout: 3000, interval: 120});

        if (!found) {
            log(`Warning: option for "${text}" not found in suggestions after timeout.`);
        }

        // give React time to update internal state / tokens
        await sleep(postSelectWait);
    }

    // Reliable method: click batch-add button but only AFTER ensuring previous dialog closed
    async function openBatchAddDialog() {
        // Ensure previous closed
        await waitDialogClosed(2000);

        // Find the batch button
        const $batch = $("button.add-item.with-label.batch-add-recording-relationship, button.add-item.batch-add-recording-relationship, button.add-item.with-label").filter(function() {
            const t = $(this).text().toLowerCase();
            return t.includes('batch-add') || t.includes('batch add') || (t.includes('add') && t.includes('record'));
        });

        if ($batch.length === 0) {
            log("Batch-add button not found via selectors");
            return false;
        }

        // Click it
        $batch[0].click();

        // Wait for dialog to appear
        const appeared = await waitForCondition(() => {
            const $d = $('.modal, .Dialog, .dialog, .ui-dialog').filter(':visible');
            return $d.length > 0;
        }, {timeout: 3000, interval: 100});

        if (!appeared) {
            // give one more small delay
            await sleep(400);
        }

        // Extra safety pause so React finishes mounting
        await sleep(300);
        return true;
    }

    // Click Done helper
    async function clickDoneAndWaitClose() {
        const $doneButton = await waitVisible('button.positive:visible', {timeout: 4000});
        if ($doneButton) {
            const $exactDone = $doneButton.filter((i, btn) => $(btn).text().trim() === 'Done');
            if ($exactDone.length) {
                log("Clicking Done");
                $exactDone[0].click();
                // Wait until dialog disappears
                await waitForCondition(() => {
                    const $d = $('.modal, .Dialog, .dialog, .ui-dialog').filter(':visible');
                    return $d.length === 0;
                }, {timeout: 3500, interval: 120});
                // small extra breathing room
                await sleep(250);
                return true;
            }
        }
        log("Done button not found (when trying to click Done).");
        return false;
    }

    // ----------------- Filling sequence (async) -----------------
    async function fillFieldsAsync(config) {
        log(`Start filling for: ${config.label} (${config.relationshipType})`);

        // 1) Relationship type
        const $relInput = await waitVisible('input.relationship-type', {timeout: 4000});
        if (!$relInput) {
            log("Relationship type input not found — aborting this item.");
            return false;
        }
        log(`Typing relationshipType '${config.relationshipType}'`);
        await typeAndSelect($relInput, config.relationshipType, {charDelay: 40, postSelectWait: 200});

        // 2) Artist
        const $artist = await waitVisible('input[placeholder="Type to search, or paste an MBID"]', {timeout: 4000});
        if (!$artist) {
            log("Artist input not found — aborting this item.");
            return false;
        }
        log(`Typing artist '${config.artist}'`);
        await typeAndSelect($artist, config.artist, {charDelay: 50, postSelectWait: 250});

        // SPECIAL CASE: performed / performer -> skip instrument/vocal/credited-as and click Done
        if (config.relationshipType === 'performed / performer') {
            log("Performed / performer detected — skipping instrument/vocal/credited-as and clicking Done.");
            await clickDoneAndWaitClose();
            log(`Finished performer item: ${config.label}`);
            return true;
        }

        // 3) Instrument or Vocal (only for instruments or vocal types)
        const placeholderName = config.relationshipType === 'instruments' ? 'instrument' : 'vocal';

        // Only attempt placeholder input if relationshipType is 'instruments' or 'vocal'
        if (config.relationshipType === 'instruments' || config.relationshipType === 'vocal') {
            const $inst = await waitVisible(`input[placeholder="${placeholderName}"]`, {timeout: 4000});
            if (!$inst) {
                log(`${placeholderName} input not found — aborting this item.`);
                return false;
            }
            const desired = (config.relationshipType === 'instruments') ? config.instrument : config.vocal;
            if (desired && desired.length > 0) {
                log(`Typing ${placeholderName} '${desired}'`);
                await typeAndSelect($inst, desired, {charDelay: 45, postSelectWait: 300});
            } else {
                log(`No ${placeholderName} value provided, skipping selection.`);
            }
        } else {
            log(`Relationship type '${config.relationshipType}' does not require instrument/vocal step; skipping.`);
        }

        // 4) Credited as: find correct container near the instrument/vocal input
        log("Attempting to fill 'Credited as' field…");
        // Strategy: find the nearest .multiselect that contains an input.attribute-credit or the 'attribute-credit' input visible.
        // We'll search visible attribute-credit inputs first, and then try to ensure it's the correct one by proximity.
        let $creditedInput = $('.attribute-credit:visible');
        if ($creditedInput.length === 0) {
            // fallback: look for input.attribute-credit anywhere inside visible multiselects
            const $multi = $('.multiselect:visible').filter(function() {
                return $(this).find('input[placeholder]').length > 0;
            }).last();
            if ($multi && $multi.length) {
                $creditedInput = $multi.find('input.attribute-credit:visible');
            }
        }

        // Another proximity attempt: find attribute-credit inside last visible .multiselect.* that also contains the placeholder input
        if ($creditedInput.length === 0) {
            const $lastMulti = $('.multiselect:visible').filter((i, el) => {
                return $(el).find(`input[placeholder="${placeholderName}"]`).length > 0;
            }).last();
            if ($lastMulti && $lastMulti.length) {
                $creditedInput = $lastMulti.find('input.attribute-credit:visible');
            }
        }

        // If still not found, try common selector: .multiselect.instrument or .multiselect.vocal
        if ($creditedInput.length === 0) {
            if (config.relationshipType === 'instruments') {
                $creditedInput = $('.multiselect.instrument').last().find('input.attribute-credit:visible');
            } else {
                $creditedInput = $('.multiselect.vocal').last().find('input.attribute-credit:visible');
            }
        }

        // Final fallback: any visible input whose name/id contains 'credit'
        if ($creditedInput.length === 0) {
            $creditedInput = $("input:visible").filter((i, el) => {
                const idn = (el.id || '').toLowerCase();
                const name = (el.name || '').toLowerCase();
                const cls = (el.className || '').toLowerCase();
                return idn.includes('credit') || name.includes('credit') || cls.includes('attribute-credit');
            }).first();
        }

        if ($creditedInput && $creditedInput.length) {
            const el = $creditedInput[0];
            const text = config.creditedAs ?? '';
            // set and dispatch react-friendly events
            setReactValueAndDispatch(el, text);
            // give React a little time
            await sleep(120);
            log(`'Credited as' set to "${text}"`);
        } else {
            log("Could not find credited-as input (it's optional); continuing.");
        }

        // 5) Click Done, but wait until Done appears and is stable
        const doneClicked = await clickDoneAndWaitClose();
        if (doneClicked) {
            log(`Finished item: ${config.label}`);
            return true;
        } else {
            log("Done not clicked (not found) — but continuing.");
            return true;
        }
    }

    // ----------------- Queue to process clicks sequentially -----------------
    const queue = [];
    let processing = false;

    async function processQueue() {
        if (processing) return;
        processing = true;
        while (queue.length) {
            const config = queue.shift();
            try {
                log(`Processing queue item: ${config.label}`);
                // Open dialog (ensures previous is closed and waits until the dialog is stable)
                const opened = await openBatchAddDialog();
                if (!opened) {
                    log("Could not open batch-add dialog — skipping this item.");
                    await sleep(300);
                    continue;
                }

                // Fill all fields and click Done
                await fillFieldsAsync(config);

                // Give small pause before next item to let React settle
                await sleep(300);
            } catch (e) {
                console.error('[AA-add-instrument] Error processing item', e);
                // tiny pause and continue with next item
                await sleep(500);
            }
        }
        processing = false;
    }

    // ----------------- UI: create buttons -----------------
    function createCustomButtons() {
        const $heading = $(HEADING_SELECTOR);

        if ($heading.length === 0) {
            log("Heading 'Track relationships' not found yet — retrying…");
            setTimeout(createCustomButtons, 500);
            return;
        }

        const $container = $('<div style="display:flex;align-items:center;margin-bottom:5px;"></div>');
        $heading.wrap($container);

        ARTIST_BUTTONS.forEach(config => {
            // Append (i) or (v) or (p) to button label UI
            const suffix = config.relationshipType === 'instruments' ? ' (i)' :
                           config.relationshipType === 'vocal' ? ' (v)' :
                           config.relationshipType === 'performed / performer' ? ' (p)' : '';
            const buttonText = `${config.label}${suffix}`;

            const $button = $('<button/>', {
                text: buttonText,
                style: `
                    margin-left: 10px;
                    background-color: #38a169;
                    color: white;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                `
            });

            $heading.parent().append($button);

            $button.on('click', () => {
                log(`Enqueued "${config.label}" (${config.relationshipType})`);
                // push a shallow copy to avoid mutation issues
                queue.push(Object.assign({}, config));
                processQueue().catch(e => console.error(e));
            });
        });

        log("AA: Injected custom buttons.");
    }

    // Start
    $(document).ready(() => {
        // Wait a bit to ensure page ready
        setTimeout(createCustomButtons, 700);
    });

})();
