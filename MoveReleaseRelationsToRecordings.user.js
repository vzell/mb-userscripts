/* global $ MB server relEditor */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz - Replace Release Relations By Recording Relations In Relation Editor
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2025-11-30
// @description  musicbrainz.org relation editor: Replace release relations by recording relations
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
// @require      https://gist.githubusercontent.com/reosarevok/e9fc05d7f251379c301b948623b3ef03/raw/e635364e2c3a60578bb349a9a95483711f6c4e4d/gistfile1.js
// @compatible   firefox+tampermonkey
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
        <h3>Move release relations to recordings</h3>
        <input type="button" id="moveAR" value="Move release relations to selected recordings">
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
