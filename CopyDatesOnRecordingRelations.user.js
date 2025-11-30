/* global $ helper MB relEditor server */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz - Copy Dates On Recording Relations Relation Editor
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.3+2025-11-29
// @description  Copy/remove dates on recording relations in musicbrainz.relation editor
// @author       loujine + Gemini (with instructions from vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/GuessRelatedWorks.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/GuessRelatedWorks.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        http*://*musicbrainz.org/release/*/edit-relationships
// @grant        none
// @run-at       document-end
// @require      https://gist.githubusercontent.com/reosarevok/e9fc05d7f251379c301b948623b3ef03/raw/e635364e2c3a60578bb349a9a95483711f6c4e4d/gistfile1.js
// @compatible   firefox+tampermonkey
// @license      MIT
// ==/UserScript==

/** look for one recording relation with a date
 * give priority to the most precise one (day > month > year)
 */
const referenceDate = relations => {
    for (const rel of relations) {
        if (Object.values(server.recordingLinkType).includes(parseInt(rel.linkTypeID))) {
            for (const prop of ['end_date', 'begin_date']) {
                if (rel[prop] !== null) {
                    for (const unit of ['day', 'month', 'year']) {
                        if (rel[prop][unit] !== null) {
                            return rel;
                        }
                    }
                }
            }
        }
    }
    return -1;
};

async function applyNewDate(rel, dateProps) {
    const relType = rel.backward
        ? `${rel.target_type}-${rel.source_type}`
        : `${rel.source_type}-${rel.target_type}`;

    await helper.waitFor(() => !MB.relationshipEditor.relationshipDialogDispatch, 1);

    document.getElementById(`edit-relationship-${relType}-${rel.id}`).click();
    await helper.waitFor(() => !!MB.relationshipEditor.relationshipDialogDispatch, 1);

    MB.relationshipEditor.relationshipDialogDispatch({
        type: 'update-date-period',
        action: {
            type: 'update-begin-date',
            action: {
                type: 'set-date',
                date: relEditor.parseDate(dateProps.begin_date),
            },
        },
    });

    MB.relationshipEditor.relationshipDialogDispatch({
        type: 'update-date-period',
        action: {
            type: 'update-end-date',
            action: {
                type: 'set-date',
                date: relEditor.parseDate(dateProps.end_date),
            },
        },
    });

    MB.relationshipEditor.relationshipDialogDispatch({
        type: 'update-date-period',
        action: {
            type: 'set-ended',
            enabled: dateProps.ended,
        },
    });
    await helper.delay(1);

    document.querySelector('.relationship-dialog button.positive').click();
}

const propagateDates = (replace) => {
    relEditor.orderedSelectedRecordings().forEach(async (recording, recIdx) => {
        await helper.delay(recIdx * 100);
        let relIdx = 0;

        const refRel = referenceDate(recording.relationships);
        if (refRel === -1) {
            return;
        }
        recording.relationships.map(async rel => {
            // TODO do not touch relations pending removal
            if (!Object.values(server.recordingLinkType).includes(parseInt(rel.linkTypeID))) {
                return;
            }
            if (!replace && (rel.begin_date || rel.end_date)) {
                return;
            }
            relIdx += 1;
            await helper.delay(relIdx * 10);

            await applyNewDate(rel, refRel);
        });
    });
};

const removeDates = () => {
    relEditor.orderedSelectedRecordings().forEach(async (recording, recIdx) => {
        await helper.delay(recIdx * 100);
        recording.relationships.forEach(async (rel, relIdx) => {
            await helper.delay(relIdx * 10);
            if (rel.begin_date === null && rel.end_date === null && !rel.ended) {
                return;
            }

            await applyNewDate(rel, {begin_date: null, end_date: null, ended: false});
        });
    });
};

(function displayToolbar() {
    relEditor.container(document.querySelector('div.tabs'))
    .insertAdjacentHTML('beforeend', `
        <style>
            .date-button {
                cursor: pointer;
                transition: background-color 0.1s ease, transform 0.1s ease;
                /* Inherit MB default button styling */
                padding: 4px 10px;
                background-color: #eee;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 12px;
                margin-right: 8px; /* For spacing between inline buttons */
            }
            .date-button:hover {
                background-color: #e6e6e6; /* Slight darkening on hover */
            }
            .date-button:active {
                background-color: #d6d6d6; /* More darkening on click */
                transform: translateY(1px); /* Little downward push */
            }
            /* Style to align the checkbox label/input pair inline with buttons */
            .inline-checkbox-label {
                display: flex;
                align-items: center;
                gap: 4px; /* Space between label text and checkbox */
            }
            .inline-checkbox-label input[type="checkbox"] {
                margin: 0; /* Remove default margin */
            }
        </style>
        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            <h3>Dates:</h3>
            <input type="button" class="date-button" id="copyDates" value="Copy dates">
            <input type="button" class="date-button" id="removeDates" value="Remove dates">

            <label for="replaceDates" class="inline-checkbox-label" style="font-weight: normal; margin-left: 8px;">
                Replace dates if pre-existing:&nbsp;
                <input type="checkbox" id="replaceDates">
            </label>
        </div>
    `);
})();

$(document).ready(function () {
    let appliedNote = false;

    document.getElementById('removeDates').addEventListener('click', () => {
        removeDates();
        if (!appliedNote) {
            relEditor.editNote(GM_info.script);
            appliedNote = true;
        }
    });

    const copyDatesHandler = () => {
        propagateDates(
            document.querySelector('input#replaceDates').checked
        );
        if (!appliedNote) {
            relEditor.editNote(
                GM_info.script,
                'Propagate recording dates from other relationships'
            );
            appliedNote = true;
        }
    };

    // Attach event listener to the single Copy Dates button
    document.getElementById('copyDates').addEventListener('click', copyDatesHandler);

    return false;
});
