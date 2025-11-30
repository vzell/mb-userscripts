/* global $ helper MB relEditor */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz - Set Relation Attributes In Relation Editor
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9-2025-11-30
// @description  Set attributes (live, partial, solo...) in relation editor
// @author       loujine + Gemini (with instructions from vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRelationAttributes.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SetRelationAttributes.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/release/*/edit-relationships
// @match        http*://*musicbrainz.org/release/*/edit-relationships
// @grant        none
// @run-at       document-end
// @require      https://gist.githubusercontent.com/reosarevok/e9fc05d7f251379c301b948623b3ef03/raw/e635364e2c3a60578bb349a9a95483711f6c4e4d/gistfile1.js
// @compatible   firefox+tampermonkey
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
      <details id="relattrs_script_toggle">
        <summary style="display: block;margin-left: 8px;cursor: pointer;">
          <h3 style="display: list-item;">
            Relation attributes
          </h3>
        </summary>
        <div>
          <h3>Recording-Work relation attributes</h3>
          <table>
            <tr>
              <td><input type="button" id="setCover" value="Set cover"></td>
              <td><input type="button" id="setLive" value="Set live"></td>
              <td><input type="button" id="setPartial" value="Set partial"></td>
              <td><input type="button" id="setInstrumental" value="Set instrumental"></td>
              <td><input type="button" id="setMedley" value="Set medley"></td>
            </tr>
            <tr>
              <td><input type="button" id="toggleCover" value="Toggle cover"></td>
              <td><input type="button" id="toggleLive" value="Toggle live"></td>
              <td><input type="button" id="togglePartial" value="Toggle partial"></td>
              <td><input type="button" id="toggleInstrumental" value="Toggle instrumental"></td>
              <td><input type="button" id="toggleMedley" value="Toggle medley"></td>
            </tr>
          </table>
          <h3>Recording-Artist relation attributes</h3>
          <input type="button" id="toggleSolo" value="Toggle solo">
          <input type="button" id="toggleAdditional" value="Toggle additional">
          <input type="button" id="toggleGuest" value="Toggle guest">
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
    for (const attr of ['Solo', 'Additional', 'Guest']) {
        document.getElementById(`toggle${attr}`).addEventListener('click', () => {
            setAttributes('artist', attr.toLowerCase(), true);
            relEditor.editNote(GM_info.script);
        });
    }
    return false;
});
