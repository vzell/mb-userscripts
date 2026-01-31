// ==UserScript==
// @name         VZ: MusicBrainz - Show Cover Art On Main Release Page
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9.0+2026-01-31
// @description  Shows all cover art images (250px) on the main release page before the tracklist. Collapsible.
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowCoverArtOnMainPage.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowCoverArtOnMainPage.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/release/*
// @exclude      *://*.musicbrainz.org/release/*/*
// @license      MIT
// ==/UserScript==

"use strict";

(function() {
    // Existing comments should NOT be deleted
    const mbidMatch = location.pathname.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
    const tracklistHeader = document.querySelector("h2.tracklist, h2#tracklist");

    if (mbidMatch && tracklistHeader) {
        const mbid = mbidMatch[0];
        console.debug("ShowCoverArtOnMainPage: Fetching cover art for " + mbid);

        fetch("https://coverartarchive.org/release/" + mbid)
            .then(response => {
                if (response.ok) return response.json();
                throw new Error("No cover art available or API error.");
            })
            .then(data => {
                if (data.images && data.images.length > 0) {
                    const fragment = document.createDocumentFragment();

                    const gallery = document.createElement("div");
                    gallery.id = "consolidated-cover-art-gallery";
                    gallery.style.display = "flex";
                    gallery.style.flexWrap = "wrap";
                    gallery.style.gap = "10px";
                    gallery.style.marginBottom = "20px";
                    gallery.style.overflow = "hidden";

                    // Create the header with toggle logic
                    const caHeader = document.createElement("h2");
                    caHeader.textContent = "Cover art";
                    caHeader.style.cursor = "pointer";
                    caHeader.style.userSelect = "none";
                    caHeader.addEventListener("click", function() {
                        if (gallery.style.display === "none") {
                            gallery.style.display = "flex";
                        } else {
                            gallery.style.display = "none";
                        }
                    });

                    fragment.appendChild(caHeader);

                    // Add a new line after the h2 header
                    fragment.appendChild(document.createElement("br"));

                    data.images.forEach(img => {
                        const link = document.createElement("a");
                        link.href = img.image;
                        link.target = "_blank";

                        const image = document.createElement("img");
                        image.src = img.thumbnails["250"] || img.thumbnails.small || img.image;
                        image.alt = img.types.join(", ");
                        image.title = img.types.join(", ") + (img.comment ? " (" + img.comment + ")" : "");
                        image.style.maxWidth = "250px";
                        image.style.maxHeight = "250px";
                        image.style.border = "1px solid #ccc";

                        link.appendChild(image);
                        gallery.appendChild(link);
                    });

                    fragment.appendChild(gallery);

                    // Insert the fragment before the Tracklist header
                    tracklistHeader.parentNode.insertBefore(fragment, tracklistHeader);
                }
            })
            .catch(err => {
                console.debug("ShowCoverArtOnMainPage: " + err.message);
            });
    }
})();
