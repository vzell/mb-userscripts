/* global $ helper MB relEditor requests */
'use strict';
// ==UserScript==
// @name         VZ: MusicBrainz - Clone Recording Relations Onto Other Recordings In Relation Editor
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.1+2025-11-30
// @author       loujine
// @downloadURL  https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mb-reledit-clone_relations.user.js
// @updateURL    https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mb-reledit-clone_relations.user.js
// @supportURL   https://github.com/loujine/musicbrainz-scripts
// @icon         https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/icon.png
// @description  musicbrainz.org relation editor: Clone recording relations onto other recordings
// @compatible   firefox+tampermonkey
// @license      MIT
// @require      https://gist.githubusercontent.com/reosarevok/e9fc05d7f251379c301b948623b3ef03/raw/e635364e2c3a60578bb349a9a95483711f6c4e4d/gistfile1.js
// @include      http*://*musicbrainz.org/release/*/edit-relationships
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Inspired by https://github.com/murdos/musicbrainz-userscripts/blob/master/mbz-reledit-copy_relation_to_all_tracks.user.js
// Inspired by https://github.com/ROpdebee/mb-userscripts/blob/master/clone-recording-rels-from-other-medium.user.js

const cloneAR = refIdx => {
    let recordings = relEditor.orderedSelectedRecordings();
    if (!recordings.length) {
        return;
    }
    let ref;
    if (refIdx && refIdx.match(/[0-9]+/)) {
        ref = recordings[parseInt(refIdx) - 1];
    } else if (refIdx && refIdx.match(/[0-9]+-[0-9]+/)) {
        const [ref1, ref2] = refIdx.split('-').map(idx => parseInt(idx));
        ref = recordings.slice(ref1 - 1, ref2);
    } else {
        ref = recordings[0];
        recordings = recordings.slice(1);
    }

    if (Array.isArray(ref)) {
        recordings = recordings.filter(rec => !ref.map(r => r.id).includes(rec.id));
    }

    const relations = Array.isArray(ref)
        ? ref.flatMap(r => r.relationships)
        : ref.relationships;

    if (!relations.length) {
        alert('No relation to clone');
    }

    relations.forEach(rel => {
        if (rel.targetType !== 'artist') {
            return;
        }
        recordings.forEach(recording => {
            const newRel = {
                entity0: recording,
                entity1: rel.target,
                linkTypeID: rel.linkTypeID,
                attributes: relEditor.createAttributeTree(rel.attributes),
                begin_date: rel.begin_date,
                end_date: rel.end_date,
                ended: rel.ended,
                entity0_credit: rel.entity0_credit,
            };
            relEditor.dispatch({
                type: 'update-relationship',
                relationship: {
                    ...relEditor.stateDefaults,
                    ...newRel,
                    _status: 1,
                    id: MB.relationshipEditor.getRelationshipStateId(),
                },
            });
        });
    });
};

const cloneExtAR = recMBID => {
    const recordings = relEditor.orderedSelectedRecordings();
    if (!recordings.length) {
        return;
    }

    requests.GET(`/ws/js/recording/${recMBID}`).then(content => {
        const relations = JSON.parse(content).relationships.filter(
            rel => rel.target_type === 'artist'
        );

        if (!relations.length) {
            alert('No relation to clone');
        }

        relations.forEach(rel => {
            recordings.forEach(recording => {
                const newRel = {
                    entity0: recording,
                    entity1: rel.target,
                    linkTypeID: rel.linkTypeID,
                    attributes: relEditor.createAttributeTree(rel.attributes),
                    begin_date: rel.begin_date,
                    end_date: rel.end_date,
                    ended: rel.ended,
                    entity0_credit: rel.entity0_credit,
                };
                relEditor.dispatch({
                    type: 'update-relationship',
                    relationship: {
                        ...relEditor.stateDefaults,
                        ...newRel,
                        _status: 1,
                        id: MB.relationshipEditor.getRelationshipStateId(),
                    },
                });
            });
        });
    });
};

const cloneReleaseExtAR = relMBID => {
    requests.GET(`/ws/js/release/${relMBID}`).then(content => {
        const relations = JSON.parse(content).relationships.filter(
            rel => rel.target_type === 'artist'
        );

        if (!relations.length) {
            alert('No relation to clone');
        }

        relations.forEach(rel => {
            const newRel = {
                entity0: relEditor.state.entity,
                entity1: rel.target,
                linkTypeID: rel.linkTypeID,
                attributes: relEditor.createAttributeTree(rel.attributes),
                begin_date: rel.begin_date,
                end_date: rel.end_date,
                ended: rel.ended,
                entity0_credit: rel.entity0_credit,
            };
            relEditor.dispatch({
                type: 'update-relationship',
                relationship: {
                    ...relEditor.stateDefaults,
                    ...newRel,
                    _status: 1,
                    id: MB.relationshipEditor.getRelationshipStateId(),
                },
            });
        });
    });
};

const autoCompleteRec = () => {
    const search = $('input#cloneExtRecording');
    const mbid = search.data('mbid');
    if (!mbid) {
        return;
    }
    requests.GET(`/ws/js/recording/${mbid}`).then(content => {
        search.data('mbid', JSON.parse(content).id);
    });
};

const autoCompleteRel = () => {
    const search = $('input#cloneExtRelease');
    const mbid = search.data('mbid');
    if (!mbid) {
        return;
    }
    requests.GET(`/ws/js/release/${mbid}`).then(content => {
        search.data('mbid', JSON.parse(content).id);
    });
};

(function displayToolbar() {
    const cloneIdxHelp = `
Select reference recording using its index in the tracklist selection,
starting at 1. Use 'n' for the n-th recording or 'n1-n2' for a range of recordings.
If empty, the first selected recording is used as reference, and relations are
copied to all other selected recordings.
`;

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
                margin: 0; /* Important for flexbox alignment */
            }
            .clone-ui-section {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }
        </style>

        <div id="clone_rels_ui" class="clone-ui-section">
            <h3 style="margin: 0;">Clone recording relations to selected recordings:</h3>
            <span>
                Source recording index in selection:
            </span>
            <input type="text" id="cloneRef" placeholder="empty or n or 'n1-n2'">
            <span title="${cloneIdxHelp}">🛈</span>
            <span>OR recording link:&nbsp;</span>
            <input type="text" id="cloneExtRecording" placeholder="recording mbid">
            <input type="button" id="cloneAR" value="Apply" class="work-button-style">
        </div>

        <div id="clone_release_rels_ui" class="clone-ui-section">
            <h3 style="margin: 0;">Clone release relations from another release:</h3>
            <span>release link:&nbsp;</span>
            <input type="text" id="cloneExtRelease" placeholder="release mbid">
            <input type="button" id="cloneReleaseAR" value="Apply" class="work-button-style">
        </div>
    `);
})();

$(document).ready(function () {
    $('input#cloneExtRecording').on('input', autoCompleteRec);
    $('input#cloneExtRelease').on('input', autoCompleteRel);
    $('input#cloneRef').on('input', () => {
        document.getElementById('cloneExtRecording').value = '';
        autoCompleteRec();
    });
    let appliedNote = false;
    document.getElementById('cloneAR').addEventListener('click', () => {
        const recMBID = $('input#cloneExtRecording').data('mbid');
        if (recMBID) {
            cloneExtAR(recMBID);
        } else {
            const refIdx = document.getElementById('cloneRef').value;
            cloneAR(refIdx);
        }
        if (!appliedNote) {
            relEditor.editNote(GM_info.script);
            appliedNote = true;
        }
    });
    document.getElementById('cloneReleaseAR').addEventListener('click', () => {
        const relMBID = $('input#cloneExtRelease').data('mbid');
        if (relMBID) {
            cloneReleaseExtAR(relMBID);
        }
        if (!appliedNote) {
            relEditor.editNote(GM_info.script, 'Cloned from https://musicbrainz.org/release/' + relMBID);
            appliedNote = true;
        }
    });
    return false;
});
