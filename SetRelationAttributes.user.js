/* global $ helper MB relEditor */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz - Set Relation Attributes In Relation Editor
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.1+2025-11-30
// @description  Set attributes (live, partial, solo...) in relation editor
// @author       loujine + Gemini (with instructions from vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRelationAttributes.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRelationAttributes.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/release/*/edit-relationships
// @grant        none
// @run-at       document-end
// @require      https://raw.githubusercontent.com/vzell/mb-userscripts/refs/heads/master/vz-common.js
// @license      MIT
// ==/UserScript==

const setAttributes = (targetType, attrName, toggle) => {
    const attrType = Object.values(MB.linkedEntities.link_attribute_type).filter(
        attr => attr.name === attrName
    )[0];

    relEditor.orderedSelectedRecordings().forEach(async (recording, recIdx) => {
        await helper.delay(recIdx * 100);

        recording.relationships.filter(
            rel => rel.target_type === targetType
        ).forEach(async (rel, relIdx) => {
            await helper.delay(relIdx * 10);

            const attrs = rel.attributes;
            const attr = attrs.filter(el => el.typeID === attrType.id);
            if (!attr.length) {
                attrs.push({
                    type: {gid: attrType.gid},
                    typeID: attrType.id,
                    typeName: attrType.name
                });
            } else if (toggle) {
                attrs.splice(attrs.indexOf(attr[0]), 1);
            }

            const relType = rel.backward
                ? `${rel.target_type}-${rel.source_type}`
                : `${rel.source_type}-${rel.target_type}`;

            await helper.waitFor(() => !MB.relationshipEditor.relationshipDialogDispatch, 1);

            document.getElementById(`edit-relationship-${relType}-${rel.id}`).click();
            await helper.waitFor(() => !!MB.relationshipEditor.relationshipDialogDispatch, 1);

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
                cursor: pointer; /* Change cursor to finger */
                transition: background-color 0.1s ease, color 0.1s ease, transform 0.1s ease;
                /* Default: light grey */
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 4px 10px;
                font-size: 13px;
                color: #333; /* Default text color */
                display: inline-block;
            }
            .work-button-style:hover {
                /* Dark grey on hover */
                background-color: #555555;
                color: white; /* Make text visible */
            }
            .work-button-style:active {
                /* Visual click feedback */
                background-color: #444444;
                transform: translateY(1px);
            }
        </style>

        <details id="relattrs_script_toggle" style="margin-top: 10px;">
            <summary style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin-left: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="margin: 0;">Relation attributes:</h3>
                    <input type="button" id="setLiveUncollapsed" value="Set live" class="work-button-style">
                </div>
            </summary>

            <div style="margin-left: 20px;">
                <h3>Recording-Work relation attributes</h3>
                <table>
                    <tr>
                        <td><input type="button" id="setCover" value="Set cover" class="work-button-style"></td>
                        <td><input type="button" id="setLive" value="Set live" class="work-button-style"></td>
                        <td><input type="button" id="setPartial" value="Set partial" class="work-button-style"></td>
                        <td><input type="button" id="setInstrumental" value="Set instrumental" class="work-button-style"></td>
                        <td><input type="button" id="setMedley" value="Set medley" class="work-button-style"></td>
                    </tr>
                    <tr>
                        <td><input type="button" id="toggleCover" value="Toggle cover" class="work-button-style"></td>
                        <td><input type="button" id="toggleLive" value="Toggle live" class="work-button-style"></td>
                        <td><input type="button" id="togglePartial" value="Toggle partial" class="work-button-style"></td>
                        <td><input type="button" id="toggleInstrumental" value="Toggle instrumental" class="work-button-style"></td>
                        <td><input type="button" id="toggleMedley" value="Toggle medley" class="work-button-style"></td>
                    </tr>
                </table>
                <h3>Recording-Artist relation attributes</h3>
                <input type="button" id="toggleSolo" value="Toggle solo" class="work-button-style">
                <input type="button" id="toggleAdditional" value="Toggle additional" class="work-button-style">
                <input type="button" id="toggleGuest" value="Toggle guest" class="work-button-style">
            </div>
        </details>
    `);
})();


$(document).ready(function() {
    for (const attr of ['Cover', 'Live', 'Partial', 'Instrumental', 'Medley']) {
        document.getElementById(`set${attr}`).addEventListener('click', () => {
            setAttributes('work', attr.toLowerCase(), false);
            relEditor.editNote(GM_info.script);
        });
        document.getElementById(`toggle${attr}`).addEventListener('click', () => {
            setAttributes('work', attr.toLowerCase(), true);
            relEditor.editNote(GM_info.script);
        });
    }
    // Add event listener for the new "Set live" button in the header
    document.getElementById('setLiveUncollapsed').addEventListener('click', () => {
        setAttributes('work', 'live', false);
        relEditor.editNote(GM_info.script);
    });

    for (const attr of ['Solo', 'Additional', 'Guest']) {
        document.getElementById(`toggle${attr}`).addEventListener('click', () => {
            setAttributes('artist', attr.toLowerCase(), true);
            relEditor.editNote(GM_info.script);
        });
    }
    return false;
});
