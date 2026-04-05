// ==UserScript==
// @name         MusicBrainz: add release(group) links from level above
// @description  add release(group) links from an artist, label or series page
// @license      GPL
// @version      0.9
// @author       RandomMushroom128
// @grant        none
// @match        *://musicbrainz.org/artist/*
// @match        *://musicbrainz.org/label/*
// @match        *://musicbrainz.org/series/*
// @match        *://musicbrainz.org/release-group/*
// @match        *://beta.musicbrainz.org/artist/*
// @match        *://beta.musicbrainz.org/label/*
// @match        *://beta.musicbrainz.org/series/*
// @match        *://beta.musicbrainz.org/release-group/*
// @match        *://test.musicbrainz.org/artist/*
// @match        *://test.musicbrainz.org/label/*
// @match        *://test.musicbrainz.org/series/*
// @match        *://test.musicbrainz.org/release-group/*
// @exclude      *musicbrainz.org/label/*/*
// @exclude      *musicbrainz.org/release-group/*/*
// @exclude      *musicbrainz.org/series/*/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

// this script uses some code from "MusicBrainz: Expand/collapse release groups" (https://raw.githubusercontent.com/murdos/musicbrainz-userscripts/master/expand-collapse-release-groups.user.js) which is also GPL licensed

// prevent JQuery conflicts, see https://wiki.greasespot.net/@grant
this.$ = this.jQuery = jQuery.noConflict(true);

const MBID_REGEX = /[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/;
const current_url = window.location.href.match(/(test|beta|)\.?musicbrainz\.org/)[0] // prevents being logged out on the iframes later

var page_type = ""
setTimeout(checkPageType, 100);

// if page_type = "releasegroups" that means the releases on the page were inserted by the expanded release groups userscript (there's a small difference in where this script needs to place the iframes)
function checkPageType() {
    let relationship_table = document.querySelectorAll(".relationships");
    if(window.location.href.includes("releases") || window.location.href.includes("label") || window.location.href.includes("release-group")) {
        if(relationship_table.length > 0) {
            page_type = "releases with relationship table"
        } else {
            page_type = "releases"
        }
    } else {
        if(relationship_table.length > 0) {
            page_type = "releasegroups with relationship table"
        } else {
            page_type = "releasegroups"
        }
    }
    console.log(page_type) // testing
}
const releases_or_releasegroups = document.querySelectorAll("#content table.tbl > tbody > tr > td a[href^='/release']");
for (const entity of releases_or_releasegroups) {
    const entity_link = entity.getAttribute('href');
    if (entity_link.match(/\/release-group\//)) {
        setTimeout(injectReleaseGroupButton, 100, entity.parentNode);
    } else if (!entity_link.match(/\/cover-art/)) {
        // avoid injecting a second button for a release's cover art link
        setTimeout(injectReleaseButton, 100, entity.parentNode);
    }
}
const expanded_releasegroup_button = document.querySelectorAll("#content table.tbl > tbody > tr > td > span");
for (const releasegroup_button of expanded_releasegroup_button) {
    if (releasegroup_button.textContent == "▶") {
        releasegroup_button.addEventListener(
            'mousedown',
            function() {
            searchExpandedReleaseGroup(releasegroup_button.parentNode)
            }
        )
    }
}
function searchExpandedReleaseGroup(parent) {
    let regex = `/release/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}`,
        isloaded = parent.lastChild.hasChildNodes();
    console.log(isloaded);
    if (isloaded == true) {
        let loaded_release_links = parent.querySelectorAll('a');
        if (parent.lastChild.firstChild.firstChild.childNodes[1].textContent !== "➕") {
            for (const release of loaded_release_links) {
                let release_link = release.getAttribute('href');
                if (release_link.match(`/release/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}`)) {
                    injectReleaseButton(release.parentNode);
                }
            }
        }
    } else {
        setTimeout(searchExpandedReleaseGroup, 100, parent)
    }
}
function injectReleaseGroupButton(parent) {
    let mbid = parent.querySelector('a').href.match(MBID_REGEX),
        table = document.createElement('table'),
        iframe = document.createElement("iframe");

    table.style.width = "100%"
    iframe.src = `https://${current_url}/release-group/${mbid}/edit`
    iframe.style.width = "100%"
    iframe.style.height = "375px"
    iframe.style.border = "none"
    iframe.id = `${mbid}-iframe`
    let button = create_button(
        function (toggled) {
            if (toggled) parent.appendChild(table) & table.appendChild(iframe) & debloatIframe(`${mbid}-iframe`);
            else parent.removeChild(table);
        },
    )
    if(page_type === "releasegroups with relationship table") {
        $(`#${mbid} td.relationships`).append(button);
    } else {
        parent.insertBefore(button, parent.childNodes[1]);
    }
}
function injectReleaseButton(parent) {
    let mbid = parent.querySelector('a').href.match(MBID_REGEX),
        table = document.createElement('table'),
        iframe = document.createElement("iframe");

    table.style.width = "100%"
    iframe.src = `https://${current_url}/release/${mbid}/edit`
    iframe.style.width = "100%"
    iframe.style.height = "375px"
    iframe.style.border = "none"
    iframe.id = `${mbid}-iframe`
    if(page_type === "releasegroups") {
        let button = create_button(
            function(toggled) {
                if (toggled) parent.parentNode.nextSibling.firstChild.appendChild(table) & table.appendChild(iframe) & debloatIframe(`${mbid}-iframe`);
                else parent.parentNode.nextSibling.firstChild.removeChild(table);
            },
        )
        parent.insertBefore(button, parent.childNodes[1]);
    } else {
        let button = create_button(
             function(toggled) {
                 if (toggled) parent.appendChild(table) & table.appendChild(iframe) & debloatIframe(`${mbid}-iframe`);
                 else parent.removeChild(table);
             },
        )
        if(page_type === "releases with relationship table") {
            $(`#${mbid} td.relationships`).append(button);
        } else {
            parent.insertBefore(button, parent.childNodes[1]);
        }
    }
}
function create_button(dom_callback) {
    let button = document.createElement('span'),
        toggled = false;

    button.innerHTML = '&#x2795;';
    button.style.cursor = 'pointer';
    button.style.color = '#777';
    button.style.float = "right";

    button.addEventListener(
        'mousedown',
        function () {
            toggled = !toggled;
            if (toggled) button.innerHTML = '&#x2796;';
            else button.innerHTML = '&#x2795;';
            dom_callback(toggled);
        },
        false
    );

    return button;
}
function debloatIframe(iframeId) {
    $(`#${iframeId}`).on("load", function() {
        let iframe_head = document.getElementById(`${iframeId}`).contentDocument.head,
            iframe_width = document.getElementById(`${iframeId}`).offsetWidth - 15,
            hide_stuff = document.createElement('style');
        hide_stuff.textContent = `#enter-edit, #edit-note {display: block !important;} .header, .banner, .rgheader, .tabs, #content > p, form > div > fieldset:nth-child(1), fieldset.editnote > p, #footer, .relationship-editor, .ui-tabs-nav, #information > .half-width > :nth-child(n+1):nth-child(-n+3), .releaseheader, .buttons > button:nth-of-type(n+2):nth-of-type(-n+5) {display: none} #page, .half-width, .relationship-editor, #content {margin: 0px !important; margin-top: 0px; padding: 0px; padding-right: 0px;} body {min-width: 0px;} .half-width {width: ${iframe_width}px !important;} .warning {width: 100%} .ui-tabs, .ui-tabs-panel, #release-editor {margin-top: 0; padding: 0;}`;
        iframe_head.appendChild(hide_stuff);
    }
                        )
}
