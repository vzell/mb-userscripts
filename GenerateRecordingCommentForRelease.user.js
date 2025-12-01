// ==UserScript==
// @name         VZ: MusicBrainz - Generate Recording Comments For A Release
// @namespace    https://musicbrainz.org/user/vzell
// @version      0.9+2025-12-01
// @description  Batch set recording comments from a Release page, prefilling from "recorded at:" prefixed with "live, " if comment is empty. Prefills edit note with user supplied configurable text.
// @author       Michael Wiencek, Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/GenerateRecordingCommentForRelease.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/GenerateRecordingCommentForRelease.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        https://musicbrainz.org/release/*
// @exclude      https://musicbrainz.org/release/*/*
// @grant        none
// @run-at       document-idle
// @license      X11
// ==/UserScript==

// ==License==
// Copyright (C) 2014 Michael Wiencek
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// Except as contained in this notice, the name(s) of the above copyright
// holders shall not be used in advertising or otherwise to promote the sale,
// use or other dealings in the Software without prior written
// authorization.
// ==/License==

//**************************************************************************//
// Based on the "MusicBrainz: Set recording comments for a release" script by Michael Wiencek.
//**************************************************************************//

// This script injects a function into the page to use jQuery that's already loaded by MusicBrainz.
// It waits for the tracks to load, then adds input fields and pre-fills them.

setTimeout(function () {
    const scr = document.createElement('script');
    scr.textContent = `
        (${setRecordingComments})();
    `;
    document.body.appendChild(scr);
}, 1000);

function setRecordingComments() {
    let $tracks;
    let $inputs = $();
    const MBID_REGEX = /[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/;
    const EDIT_RECORDING_EDIT = 72; // MusicBrainz internal edit type for editing a recording
    const DEFAULT_EDIT_NOTE_TEXT = 'Style guide for "live" recording disambiguation comments ... see https://musicbrainz.org/doc/Style/Recording';
    const STORAGE_KEY = 'mb_recording_comments_edit_note';

    // Load custom edit note from storage or use default
    let editNoteText = localStorage.getItem(STORAGE_KEY) || DEFAULT_EDIT_NOTE_TEXT;

    // Add custom CSS for the input fields, settings icon, and the new button style
    $('head').append(
        $('<style></style>').text(`
            input.recording-comment { background: inherit; border: 1px #999 solid; width: 32em; margin-left: 0.5em; }
            #settings-icon { cursor: pointer; margin-left: 5px; font-size: 1.2em; }
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgb(0,0,0);
                background-color: rgba(0,0,0,0.4);
            }
            .modal-content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                max-width: 600px;
                position: relative;
                box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19);
            }
            .close-button {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }
            .close-button:hover,
            .close-button:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }
            /* New button style for "Edit recording comments" */
            .work-button-style {
                cursor: pointer; /* change cursor to finger */
                transition: background-color 0.1s ease, color 0.1s ease, transform 0.1s ease;
                /* light grey */
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 2px 10px; /* <--- REQUIRED PADDING CHANGE */
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
        `),
    );

    // Use a delay to wait for tracklist to be rendered and populated
    const delay = setInterval(function () {
        $tracks = $('.medium tbody tr[id]');

        if ($tracks.length) {
            clearInterval(delay);
        } else {
            return;
        }

        // Iterate over each track row to insert the input field and associate it
        $tracks.each(function () {
            let $td = $(this).children('td:not(.pos):not(.video):not(.rating):not(.treleases)').has('a[href^=\\/recording\\/]'),
                node = $td.children('td > .mp, td > .name-variation, td > a[href^=\\/recording\\/]').filter(':first'),
                $input = $('<input />').addClass('recording-comment').insertAfter(node);

            let link = $("a[href^='/recording/']", $td).first().attr('href');
            let mbid = link.match(MBID_REGEX)[0];
            $input.data('mbid', mbid); // Store recording MBID in input's data

            if (!editing) {
                $input.hide(); // Hide input if not in editing mode initially
            }

            $inputs = $inputs.add($input); // Add input to the global collection
        });

        let releaseId = location.pathname.match(MBID_REGEX)[0];

        // Fetch release data, including recordings, to get existing disambiguations
        $.get(`/ws/2/release/${releaseId}?inc=recordings&fmt=json`, function (data) {
            let recordings = Array.from(data.media)
                .map(medium => medium.tracks)
                .flat()
                .map(track => track.recording);

            // Iterate over each input field to prefill it
            $inputs.each(function () {
                let mbid = $(this).data('mbid');
                let $input = $(this);
                // Get the current track's row to find the "recorded at:" information
                let $trackRow = $(this).closest('tr'); // Use closest to get the parent row

                let currentInputValue = $input.val();

                // Get the original disambiguation from the fetched recording data
                let recording = recordings.find(rec => rec.id === mbid);
                let originalDisambiguation = recording ? recording.disambiguation : '';

                let commentToSet = currentInputValue; // Default: keep existing input value

                if (currentInputValue === '') { // Only attempt to prefill if the input field is empty
                    let recordedAtText = '';
                    // Find the FIRST <bdi> element within a <dd> that immediately follows a <dt> with "recorded at:" text
                    const $recordedAtBdi = $trackRow.find('dt:contains("recorded at:") + dd bdi:first');
                    if ($recordedAtBdi.length) {
                        recordedAtText = $recordedAtBdi.text().trim();
                    }

                    if (recordedAtText) {
                        commentToSet = "live, " + recordedAtText;
                    } else {
                        // If "recorded at" text is not found, fall back to original disambiguation if it exists.
                        // This ensures that if the field was empty and no "recorded at" data was found,
                        // it still gets populated with the *actual* original disambiguation if there was one.
                        commentToSet = originalDisambiguation;
                    }
                }

                // Set the value of the input field
                $input.val(commentToSet);
                // Store the original disambiguation. This is crucial for tracking whether
                // the current value of the input field has changed relative to what MusicBrainz
                // originally had for the recording's disambiguation.
                $input.data('old', originalDisambiguation);

                // EXPLICITLY SET BORDER COLOR BASED ON CHANGE
                // Compare the *newly set value* with the *original disambiguation*
                if ($input.val() !== originalDisambiguation) {
                    $input.css('border-color', 'red');
                } else {
                    $input.css('border-color', '#999');
                }
            });
        });
    }, 1000); // Check every second until tracks are found

    // Only proceed if we are on a valid release page URL
    if (!location.pathname.match(/^\/release\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/)) {
        return;
    }

    let editing = false, // State variable to toggle edit mode
        activeRequest = null; // To manage AJAX requests for submitting changes

    // Event handler for input changes to mark modified comments
    // This function remains for *manual user input* changes.
    $('body').on('input.rc', '.recording-comment', function () {
        // Mark red if the current value is different from the stored original ('old') value
        $(this).css('border-color', this.value === $(this).data('old') ? '#999' : 'red');
    });

    // Create a container for the script's UI elements
    let $container = $('<div></div>').insertAfter('h2.tracklist');

    // Button to toggle the editing interface visibility
    $('<button>Edit recording comments</button>')
        .addClass('work-button-style')
        .on('click', function () {
            editing = !editing;
            $('#set-recording-comments').add($inputs).toggle(editing); // Show/hide table and inputs
            $(this).text(`${editing ? 'Hide' : 'Edit'} recording comments`);
            if (editing) {
                $('#all-recording-comments').focus(); // Focus on the "set all" input
                // Prefill the edit note textarea when entering edit mode
                $('#recording-comments-edit-note').val(editNoteText);
            }
        })
        .appendTo($container);

    // Settings icon
    $('<span id="settings-icon">⚙️</span>').on('click', function () {
        $('#settings-modal').show();
        $('#settings-text').val(editNoteText);
    }).appendTo($container);

    // Append the editing table to the container
    $container.append(
        '\
<table id="set-recording-comments">\
  <tr>\
    <td><label for="all-recording-comments">Set all visible comments to:</label></td>\
    <td><input type="text" id="all-recording-comments" style="width: 32em;"></td>\
  </tr>\
  <tr>\
    <td><label for="recording-comments-edit-note">Edit note:</label></td>\
    <td><textarea id="recording-comments-edit-note" style="width: 32em;" rows="5"></textarea></td>\
  </tr>\
  <tr>\
    <td colspan="2" class="auto-editor">\
      <label>\
        <input id="make-recording-comments-votable" type="checkbox">\
        Make all edits votable.\
      </label>\
    </td>\
  </tr>\
  <tr>\
    <td colspan="2">\
      <button id="submit-recording-comments" class="styled-button">Submit changes (visible and marked red)</button>\
    </td>\
  </tr>\
</table>',
    );

    // Add the settings modal to the body
    $('body').append(`
        <div id="settings-modal" class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>Customize Edit Note</h2>
                <textarea id="settings-text" style="width: 100%;" rows="10"></textarea>
                <button id="save-settings" class="styled-button">Submit</button>
            </div>
        </div>
    `);

    $('#set-recording-comments').hide(); // Hide the editing table initially
    $('#settings-modal').hide(); // Hide the modal initially

    // Handle closing the modal
    $('.close-button').on('click', function () {
        $('#settings-modal').hide();
    });

    $(window).on('click', function(event) {
        if ($(event.target).is('#settings-modal')) {
            $('#settings-modal').hide();
        }
    });

    // Save settings and update the main textarea on "Submit" button click
    $('#save-settings').on('click', function() {
        editNoteText = $('#settings-text').val();
        localStorage.setItem(STORAGE_KEY, editNoteText);
        $('#recording-comments-edit-note').val(editNoteText); // Update the main textarea
        $('#settings-modal').hide();
    });

    // Event handler for the "Set all visible comments" input
    $('#all-recording-comments').on('input', function () {
        // Fill all visible recording comment inputs with this value
        $inputs.filter(':visible').val(this.value).trigger('input.rc');
    });

    // Event handler for the "Submit changes" button
    const $submitButton = $('#submit-recording-comments').on('click', function () {
        if (activeRequest) {
            // If a request is active, clicking again aborts it
            activeRequest.abort();
            activeRequest = null;
            $submitButton.text('Submit changes (marked red)');
            $inputs.prop('disabled', false).trigger('input.rc'); // Re-enable inputs
            return;
        }

        // Change button text and disable inputs during submission
        $submitButton.text('Submitting...click to cancel!');
        $inputs.prop('disabled', true);

        let editData = [],
            deferred = $.Deferred(); // For managing async operations

        // Collect changes from visible tracks
        $.each($tracks, function (i, track) {
            if ($(track).filter(':visible').length > 0) {
                let $input = $inputs.eq(i),
                    comment = $input.val();
                if (comment === $input.data('old')) {
                    // Skip if comment hasn't changed from its *original* value
                    $input.prop('disabled', false);
                    return;
                }

                // Attach deferred callbacks for success/failure to update input state
                deferred
                    .done(function () {
                        $input.data('old', comment).trigger('input.rc').prop('disabled', false);
                    })
                    .fail(function () {
                        $input.css('border-color', 'red').prop('disabled', false);
                    });

                // Extract recording MBID to prepare edit data
                let link = track.querySelector("td a[href^='/recording/']"),
                    mbid = link.href.match(MBID_REGEX)[0];

                editData.push({ edit_type: EDIT_RECORDING_EDIT, to_edit: mbid, comment: comment });
            }
        });

        // If no changes were found, reset UI
        if (editData.length === 0) {
            $inputs.prop('disabled', false);
            $submitButton.prop('disabled', false).text('Submit changes (marked red)');
        } else {
            let editNote = $('#recording-comments-edit-note').val();
            let makeVotable = document.getElementById('make-recording-comments-votable').checked;

            // Send AJAX request to MusicBrainz API to create edits
            activeRequest = $.ajax({
                type: 'POST',
                url: '/ws/js/edit/create',
                dataType: 'json',
                data: JSON.stringify({ edits: editData, editNote: editNote, makeVotable: makeVotable }),
                contentType: 'application/json; charset=utf-8',
            })
                .always(function () {
                    // Always re-enable submit button after request completes (success or fail)
                    $submitButton.prop('disabled', false).text('Submit changes (marked red)');
                })
                .done(function () {
                    // Resolve deferred on success
                    deferred.resolve();
                })
                .fail(function () {
                    // Reject deferred on failure
                    deferred.reject();
                });
        }
    });
}
