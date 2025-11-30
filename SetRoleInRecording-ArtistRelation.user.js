/* global $ helper MB roles relEditor */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz - Set Role In Recording-Artist Relation In Relation Editor
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2025-11-30
// @description  Set/unset role relations on selected recordings in relation editor
// @author       loujine + Gemini (with instructions from vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRoleInRecording-ArtistRelation.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRoleInRecording-ArtistRelation.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://*musicbrainz.org/release/*/edit-relationships
// @grant        none
// @run-at       document-end
// @require      https://gist.githubusercontent.com/reosarevok/e9fc05d7f251379c301b948623b3ef03/raw/e635364e2c3a60578bb349a9a95483711f6c4e4d/gistfile1.js
// @compatible   firefox+tampermonkey
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
      <details id="instrument_script_toggle">
        <summary style="display: block;margin-left: 8px;cursor: pointer;">
          <h3 style="display: list-item;">
            Replace artist role
          </h3>
        </summary>
        <div>
          <p>
            From: <select id="fromRole">${roles.roles}</select>
            with attr:
              <select id="fromRoleAttrs">${roles.roleAttrs}</select>
            <input type="text" id="fromId" value="" placeholder="or use instrument/vocal id">
            <br />
            To:&nbsp;&nbsp;&nbsp;<select id="toRole">${roles.roles}</select>
            with attr:
              <select id="toRoleAttrs">${roles.roleAttrs}</select>
            <input type="text" id="toId" value="" placeholder="or use instrument/vocal id">
            <br />
            <input type="text" id="toCredit" value="" placeholder="instrument credit">
            <br />
            <input type="button" id="setRole" value='Apply'>
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
