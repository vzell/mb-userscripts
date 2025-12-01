/* global $ MB server relEditor */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz Relation Editor - Set Role In Recording-Artist Relation
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.1+2025-12-01
// @description  Set/unset role relations on selected recordings in relation editor
// @author       loujine + Gemini (with instructions from vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRoleInRecording-ArtistRelation.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRoleInRecording-ArtistRelation.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/release/*/edit-relationships
// @grant        none
// @run-at       document-end
// @require      https://raw.githubusercontent.com/vzell/mb-userscripts/refs/heads/master/vz-common.js
// @license      MIT
// ==/UserScript==

const setInstrument = (fromType, toType, fromAttrId, toAttrId, toCredit) => {
    const toAttr = MB.linkedEntities.link_attribute_type[toAttrId];

    relEditor.orderedSelectedRecordings().forEach(async (recording, recIdx) => {
        await helper.delay(recIdx * 100);

        recording.relationships.filter(
            rel => rel.linkTypeID === fromType
        ).filter(
            rel => (
                (isNaN(fromAttrId) && rel.attributes.length === 0)
                || rel.attributes.map(attr => attr.typeID).includes(fromAttrId)
            )
        ).forEach(async (rel, relIdx) => {
            await helper.delay(relIdx * 10);

            const relType = rel.backward
                ? `${rel.target_type}-${rel.source_type}`
                : `${rel.source_type}-${rel.target_type}`;

            await helper.waitFor(() => !MB.relationshipEditor.relationshipDialogDispatch, 1);

            document.getElementById(`edit-relationship-${relType}-${rel.id}`).click();
            await helper.waitFor(() => !!MB.relationshipEditor.relationshipDialogDispatch, 1);

            MB.relationshipEditor.relationshipDialogDispatch({
                type: 'update-link-type',
                source: recording,
                action: {
                    type: 'update-autocomplete',
                    source: recording,
                    action: {
                        type: 'select-item',
                        item: {
                            id: toType,
                            name: MB.linkedEntities.link_type[toType].name,
                            type: 'option',
                            entity: MB.linkedEntities.link_type[toType],
                        }
                    },
                },
            });

            let idx;
            let attrs = rel.attributes;
            if (!isNaN(fromAttrId)) {
                idx = attrs.findIndex(attr => attr.typeID == fromAttrId);
                attrs = attrs.filter(attr => attr.typeID != fromAttrId);
            }
            if (toAttr) {
                // attrs order must be kept for credits, etc.
                attrs.splice(idx, 0, {type: toAttr, credited_as: toCredit});
            }

            MB.relationshipEditor.relationshipDialogDispatch({
                type: 'set-attributes',
                attributes: attrs,
            });
            await helper.delay(1);

            document.querySelector('.relationship-dialog button.positive').click();
        });
    });
};


(function displayToolbar() {
    relEditor.container(document.querySelector('div.tabs'))
             .insertAdjacentHTML('beforeend', `
        <style>
            .work-button-style {
                cursor: pointer; /* change cursor to finger */
                transition: background-color 0.1s ease, color 0.1s ease, transform 0.1s ease;
                /* light grey */
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 2px 10px;
                font-size: 11px;
                color: #333; /* text color */
                display: inline-block;
            }
            .work-button-style:hover {
                /* dark grey on hover */
                background-color: #555555;
                color: white;
            }
            .work-button-style:active {
                /* visual click feedback */
                background-color: #444444;
                transform: translateY(1px);
            }
            h3 {
                margin: 0; /* Important for flexbox alignment */
            }
        </style>
        <details id="setRole_script_toggle" style="margin-top: 10px;">
            <summary style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin-left: 8px;">
                <h3 style="margin: 0;">Replace artist role:</h3>
                <input type="button" id="setRole" value='Apply' class="work-button-style">
            </summary>
            <div style="margin-left: 20px;">
                <p>
                    From role:
                    <select id="fromRole">${roles.roleTypes}</select>
                    <br />
                    From instrument/vocal attribute or similar:
                    <select id="fromRoleAttrs">${roles.roleAttrs}</select>
                    <input type="text" id="fromId" value="" placeholder="or use instrument/vocal id">
                </p>
                <p>
                    To role:
                    <select id="toRole">${roles.roleTypes}</select>
                    <br />
                    To instrument/vocal attribute or similar:
                      <select id="toRoleAttrs">${roles.roleAttrs}</select>
                    <input type="text" id="toId" value="" placeholder="or use instrument/vocal id">
                    <br />
                    <input type="text" id="toCredit" value="" placeholder="instrument credit">
                </p>
            </div>
        </details>
    `);
})();


$(document).ready(function () {
    document.getElementById('fromRole').addEventListener('change', () => {
        document.getElementById('fromRoleAttrs').options.selectedIndex = 0;
        document.getElementById('fromId').value = '';
    });
    document.getElementById('toRole').addEventListener('change', () => {
        document.getElementById('toRoleAttrs').options.selectedIndex = 0;
        document.getElementById('toId').value = '';
    });
    document.getElementById('setRole').addEventListener('click', () => {
        setInstrument(
            parseInt(document.getElementById('fromRole').value),
            parseInt(document.getElementById('toRole').value),
            parseInt(document.getElementById('fromId').value) ||
                parseInt(document.getElementById('fromRoleAttrs').value),
            parseInt(document.getElementById('toId').value) ||
                parseInt(document.getElementById('toRoleAttrs').value),
            document.getElementById('toCredit').value
        );
        relEditor.editNote(GM_info.script);
    });
    return false;
});
