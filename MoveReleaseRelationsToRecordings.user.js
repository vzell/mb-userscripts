/* global $ MB server relEditor */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz - Replace Release Relations By Recording Relations In Relation Editor
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.2+2025-11-30
// @description  Replace release relations by recording relations in relation editor
// @author       loujine + Gemini (with instructions from vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRelationAttributes.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRelationAttributes.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @include      https://musicbrainz.org/release/*/edit-relationships
// @match        none
// @run-at       document-end
// @require      https://raw.githubusercontent.com/vzell/mb-userscripts/refs/heads/master/vz-common.js
// @license      MIT
// ==/UserScript==

function moveAR() {
    const release = MB.relationshipEditor.state.entity;
    const recordings = MB.tree.toArray(MB.relationshipEditor.state.selectedRecordings);
    release.relationships.filter(
        rel => Object.keys(server.releaseLinkTypeID).includes(String(rel.linkTypeID))
    ).map(artistRel => {
        recordings.map(rec => {
            MB.relationshipEditor.dispatch({
                type: 'update-relationship-state',
                sourceEntity: rec,
                ...relEditor.dispatchDefaults,
                newRelationshipState: {
                    ...relEditor.stateDefaults,
                    _status: 1,
                    attributes: relEditor.createAttributeTree(artistRel.attributes),
                    begin_date: artistRel.begin_date,
                    entity0: artistRel.target,
                    entity0_credit: artistRel.entity0_credit,
                    entity1: rec,
                    end_date: artistRel.end_date,
                    ended: artistRel.ended,
                    id: MB.relationshipEditor.getRelationshipStateId(),
                    linkTypeID: server.releaseToRecordingLink(artistRel.linkTypeID),
                },
            });
        });
        if (recordings.length) {
            document.getElementById(
                `remove-relationship-${artistRel.target_type}-` +
                `${artistRel.source_type}-${artistRel.id}`
            ).click();
        }
    });
}

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
                padding: 4px 10px;
                font-size: 13px;
                color: #333; /* Default text color */
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
                margin: 0; /* Remove default margin to ensure vertical alignment */
            }
        </style>

        <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
            <h3 style="margin: 0;">Move release relations to recordings:</h3>
            <input type="button" id="moveAR" value="Move to selected recordings" class="work-button-style">
        </div>
    `);
})();

$(document).ready(function () {
    document.getElementById('moveAR').addEventListener('click', () => {
        moveAR();
        relEditor.editNote(
            GM_info.script,
            'Move performers in release relations to individual recordings'
        );
    });
    return false;
});
