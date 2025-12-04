// ==UserScript==
// @name         VZ: MusciBrainz - Import Relationships From A Discogs Release In To A Musicbrainz Release
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.2+2025-12-01
// @description  Add a button to import Discogs release relationships to MusicBrainz
// @author       mattgoldspink (with input from vzell)
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ImportRelationshipsFromDiscogs.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ImportRelationshipsFromDiscogs.user.js
// @icon         https://volkerzell.de/favicon.ico
// @match        https://musicbrainz.org/release/*/edit-relationships
// @license      MIT
// ==/UserScript==

let db;
const request = indexedDB.open('mblink');
request.onerror = function () {
    console.error("Why didn't you allow my web app to use IndexedDB?!");
};
request.onsuccess = function (event) {
    db = event.target.result;
};
request.onupgradeneeded = function (event) {
    const db = event.target.result;

    // Create an objectStore to hold information about our customers. We're
    // going to use "ssn" as our key path because it's guaranteed to be
    // unique - or at least that's what I was told during the kickoff meeting.
    db.createObjectStore('mblinks', {
        keyPath: 'discogs_id',
    });
};

let lastRequest;
let lastUiItem;

////////////////////////////////////////////////////////////////////////////////////////////////////////

let logs, summary, discogsUrl;

$(document).ready(function () {
    const re = new RegExp('musicbrainz.org/release/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/edit-relationships', 'i');
    let m;
    if ((m = window.location.href.match(re))) {
        hasDiscogsLinkDefined(m[1]).then(discogsUrlParam => {
            discogsUrl = discogsUrlParam;
            console.log(`Got it: ${discogsUrl}`);
            if (discogsUrl) {
                const createrelsbutton = document.createElement('button');
                createrelsbutton.innerText = 'Import relationships from Discogs';
                createrelsbutton.style.marginRight = '10px'; // Reduced slightly for tighter grouping
                const processTracklistLbl = document.createElement('label');
                processTracklistLbl.innerText = 'Process Tracklist relationships too';
                const processTracklistCheckbox = document.createElement('input');
                processTracklistCheckbox.type = 'checkbox';
                processTracklistCheckbox.checked = true;
                processTracklistLbl.appendChild(processTracklistCheckbox);

                const divWrapper = document.createElement('div');
                divWrapper.style.display = 'none'; // Initially Hidden

                createrelsbutton.addEventListener(
                    'click',
                    () => {
                        logs = document.createElement('ul');
                        logs.classList.add('logs');
                        summary = document.createElement('p');
                        summary.classList.add('summary');
                        divWrapper.appendChild(summary);
                        divWrapper.appendChild(logs);

                        startImportRels(discogsUrl, processTracklistCheckbox.checked);
                    },
                    false
                );

                divWrapper.classList.add('discogs-wrapper');
                const logo = document.createElement('img');
                logo.src = DISCOGS_LOGO_URL;
                divWrapper.appendChild(logo);
                const description = document.createElement('p');
                description.innerHTML = `This tool will import the relationships found on <a href="${discogsUrl}" rel="nofollow noopener noreferrer" targe="_blank">${discogsUrl}</a> and apply them to the release. The tool isn't perfect and result's should be used as a starting point and also validated before submitting.<br>For example common issues include:<ul><li>On compilations all publishers and labels for individual tracks are listed on the release on discogs. These need to be manually moved to the appropriate tracks</li><li>MusicBrainz has clear guidance on the case of artists, Discogs does not and so you may see some artist names incorrectly capitalized</li><li>The tool isn't 100% perfect at matching instruments, so please review closely.</li></ul><br/>I'm always happy to recieve any feedback over on the <a href="https://community.metabrainz.org/">forums</a>.`;
                const title = document.createElement('h3');
                title.innerText = 'Discogs Relationship Importer';
                divWrapper.appendChild(logo);
                divWrapper.appendChild(title);
                divWrapper.appendChild(description);
                divWrapper.appendChild(processTracklistLbl);
                divWrapper.appendChild(createrelsbutton);
                const style = document.createElement('style');
                style.rel = 'stylesheet';
                style.innerText = `.discogs-wrapper {
                    display: grid;
                    border: 1px solid #ccc;
                    border-radius: 1rem;
                    padding: 2rem;
                    /* Changed columns: fixed logo | auto button | auto label | remaining space */
                    grid-template-columns: 200px auto auto 1fr;
                    grid-template-rows: auto;
                    grid-template-areas:
                        "logo header header header"
                        "logo description description description"
                        ". button label ."
                        "summary summary summary summary"
                        "logs logs logs logs";
                    width: calc(100vw - 7rem);
                    overflow: hidden;
                }
                .discogs-wrapper img {
                    height: 150px;
                    grid-area: logo;
                }
                .discogs-wrapper h3 {
                    grid-area: header;
                }
                .discogs-wrapper > p {
                    grid-area: description;
                }
                .discogs-wrapper > button {
                    grid-area: button;
                    /* Removed max-width restriction so it fits text */
                }
                .discogs-wrapper > label {
                    grid-area: label;
                    /* Removed max-width */
                    margin: 1rem 0; /* Removed horizontal margin to keep it close */
                    align-self: center; /* Aligns vertically with the button */
                    white-space: nowrap; /* Prevents text wrapping */
                }
                .discogs-wrapper .summary {
                    grid-area: summary;
                    width: 100%;
                }
                .discogs-wrapper .logs {
                    grid-area: logs;
                    width: 100%;
                }`;

                document.head.appendChild(style);

                registerButton(divWrapper);
                addToggleWrapperButton(divWrapper);
            }
        });
    }
});

function registerButton(divWrapper) {
    const releaseRelsBtn = document.getElementById('release-rels');
    if (!releaseRelsBtn) {
        setTimeout(() => {
            registerButton(divWrapper);
        }, 500);
    } else {
        releaseRelsBtn.insertAdjacentElement('afterend', divWrapper);
    }
}

function addToggleWrapperButton(wrapperDiv) {
    // Find ANY h2 whose text is exactly "Release relationships"
    const h2 = [...document.querySelectorAll('h2')]
        .find(el => el.textContent.trim() === "Release relationships");

    if (!h2) {
        // Retry until React/DOM renders it
        return setTimeout(() => { addToggleWrapperButton(wrapperDiv); }, 300);
    }

    // Check if button already exists to prevent duplicates
    if (h2.querySelector('.discogs-toggle-btn')) return;

    // Make h2 flex so the button aligns nicely
    h2.style.display = "flex";
    h2.style.alignItems = "center";

    // Create the test button
    const btn = document.createElement("button");
    btn.textContent = "Show/Hide Discogs Relationship Importer Dialog";
    btn.classList.add('discogs-toggle-btn'); // Add a class to identify it
    btn.style.marginLeft = "10px";
    btn.style.fontSize = "0.8rem"; // Optional: make it fit slightly better

    h2.appendChild(btn);

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        // Toggle logic: The wrapper uses 'display: grid' in CSS.
        if (wrapperDiv.style.display === 'none') {
            wrapperDiv.style.display = 'grid';
        } else {
            wrapperDiv.style.display = 'none';
        }
    });

    console.log("DR: Button inserted successfully.");
}

function addLogLine(message) {
    const li = document.createElement('li');
    li.innerHTML = message;
    logs.insertAdjacentElement('beforeend', li);
}

function hasDiscogsLinkDefined(mbid) {
    let url = `/ws/js/release/${mbid}?fmt=json&inc=rels`;
    return fetch(url)
        .then(body => {
            return body.json();
        })
        .then(json => {
            const matchingRel = json.relationships.find(rel => {
                return rel.target.sidebar_name === 'Discogs';
            });
            console.log(matchingRel.target.href_url);
            return matchingRel.target.href_url;
        });
}

function startImportRels(discogsUrl, processTracklist) {
    return getDiscogsReleaseData(discogsUrl)
        .then(json => {
            let artistRoles = convertDiscogsArtistsToRolesRelationships(json.extraartists?.filter(artist => artist.tracks === ''));
            addLogLine(`Found ${json.companies.length + artistRoles.length} release relationships`);
            // handle potential dj mixes - if the tracks are the full medium then assign it to the release/medium else leave it as individual tracks
            artistRoles = artistRoles.concat(convertPotentialDJMixers(json));
            let tracklistRels = [];
            if (processTracklist) {
                tracklistRels = json.tracklist
                    .filter(track => track.type_ === 'track')
                    .reduce((map, track) => {
                        if (!track.extraartists || !Array.isArray(track.extraartists)) {
                            return map;
                        }
                        return map.concat(
                            convertDiscogsArtistsToRolesRelationships(track.extraartists).map(rel => {
                                return Object.assign({}, rel, {
                                    track: track,
                                });
                            })
                        );
                    }, []);
                const releaseLevelTracklistRels = json.extraartists?.filter(artist => artist.tracks !== '') || [];
                if (releaseLevelTracklistRels.length > 0) {
                    tracklistRels = tracklistRels.concat(
                        releaseLevelTracklistRels.reduce((array, artist) => {
                            return array.concat(
                                getAllArtistTracks(json.tracklist, artist.tracks).reduce((array, track) => {
                                    return array.concat(
                                        getArtistRoles(artist).map(rel => {
                                            return Object.assign({}, rel, {
                                                artist: artist,
                                                track: track,
                                            });
                                        })
                                    );
                                }, [])
                            );
                        }, [])
                    );
                }
                addLogLine(`Found ${tracklistRels.length} tracklist relationships`);
            }
            return Promise.all([
                addRelationshipsForCompanies(json.companies),
                addRelationshipsForArtists(artistRoles),
                addRelationshipsForTracklist(tracklistRels),
            ]);
        })
        .then(() => { });
}

function convertPotentialDJMixers(json) {
    let djmixers = json.extraartists?.filter(artist => artist.role === 'DJ Mix') || [];
    djmixers = djmixers
        .map(artist => {
            const tracks = getAllArtistTracks(json.tracklist, artist.tracks);
            const mediums = json.tracklist.reduce(
                (mediums, track, index) => {
                    if (track.type_ === 'heading') {
                        if (index > 0) {
                            mediums.push([]);
                        }
                    } else {
                        mediums[mediums.length - 1].push(track);
                    }
                    return mediums;
                },
                [[]]
            );
            // now see if we can empty all our mediums
            tracks.forEach(t => {
                for (let i = 0; i < mediums.length; i++) {
                    mediums[i] = mediums[i].filter(track => {
                        return t.position !== track.position;
                    });
                }
            });
            // if some mediums are empty then we know that the artist has tracks on that medium
            let mediumsDjAppearsOn = mediums.filter(medium => medium.length === 0);
            if (mediumsDjAppearsOn.length !== mediums.length) {
                // remove them from the extraartists list
                json.extraartists = json.extraartists?.filter(a => {
                    return a !== artist;
                }) || [];
                return Object.assign({}, ENTITY_TYPE_MAP['DJ Mix'], {
                    artist: artist,
                    attributes: [
                        () => {
                            for (let j = mediums.length - 1; j >= 0; j--) {
                                if (mediums[j].length === 0) {
                                    $(SELECTORS.MediumsInput).click();
                                    $($(SELECTORS.MediumsInputOptions).get(j)).click();
                                }
                            }
                        },
                    ],
                });
            } else if (mediumsDjAppearsOn.length === mediums.length) {
                // they're on all tracks so remove
                json.extraartists = json.extraartists?.filter(a => {
                    return a !== artist;
                }) || [];
                return Object.assign({}, ENTITY_TYPE_MAP['DJ Mix'], {
                    artist: artist,
                });
            }
            return null;
        })
        .filter(role => role !== null);
    return djmixers;
}

function getAllArtistTracks(tracklist, artistTracks) {
    // lets parse and get all tracks listed by the artist
    return artistTracks.split(',').reduce((trackArray, trackNumber) => {
        if (/ to /.test(trackNumber)) {
            // need to expand the range
            const parts = trackNumber.split(' to ');
            const startTrack = parts[0].trim().replace('.', '-');
            const lastTrack = parts[1].trim().replace('.', '-');
            let hasFoundStart = false,
                hasFoundEnd = false;
            tracklist.forEach(track => {
                const resolvedTrackPosition = track.position.replace('.', '-');
                if (!hasFoundStart && resolvedTrackPosition === startTrack) {
                    hasFoundStart = true;
                    trackArray.push(track);
                } else if (hasFoundStart && !hasFoundEnd) {
                    if (resolvedTrackPosition === lastTrack) {
                        hasFoundEnd = true;
                        trackArray.push(track);
                    } else if (track.position === '') {
                        hasFoundEnd = true;
                    } else {
                        trackArray.push(track);
                    }
                }
            });
        } else {
            const track = tracklist.find(track => {
                return track.position === trackNumber.trim();
            });
            if (track) {
                trackArray.push(track);
            }
        }
        return trackArray;
    }, []);
}

function convertDiscogsArtistsToRolesRelationships(artists) {
    return artists?.reduce((rolesArr, artist) => {
        const roles = getArtistRoles(artist);
        if (Array.isArray(roles) && roles.length > 0) {
            return rolesArr.concat(roles);
        }
        return rolesArr;
    }, []) || [];
}

function getDiscogsReleaseData(url) {
    return fetch(
        `${url.replace(
            'https://www.discogs.com/release/',
            'https://api.discogs.com/releases/'
        )}?token=gYAnSAmIoXiHezHBmHoqcBCuJRyQLJBYSjurbGTZ`
    )
        .then(body => {
            return body.json();
        })
        .then(json => {
            console.log(json);
            return json;
        });
}

function addRelationshipsForCompanies(companies) {
    return Promise.all(
        companies.map(company => {
            const details = ENTITY_TYPE_MAP[company.entity_type_name];
            if (details) {
                return getMbId(company, details.entityType)
                    .then(mbid => {
                        addReleaseRelationship(details.entityType, details.linkType, mbid, []);
                    })
                    .catch(error => {
                        addLogLine(
                            `Failed to add relationship for <a target="_blank" rel="noopener noreferrer nofollow" href="${company.resource_url}">${company.name}</a> - ${details.entityType} - ${details.linkType}<br />${error}`
                        );
                        console.warn(error);
                        return Promise.resolve();
                    });
            }
            return Promise.resolve();
        })
    );
}

function addRelationshipsForArtists(artistRoles) {
    return Promise.all(
        artistRoles.map(role => {
            return getMbId(role.artist, 'artist')
                .then(mbid => {
                    return addReleaseRelationship(
                        role.entityType,
                        role.linkType,
                        mbid,
                        role.attributes || [],
                        // use anv first if set since that's the listing on the release
                        // else use the artist name incase it's different
                        role.artist.anv.trim() || role.artist.name
                    );
                })
                .catch(error => {
                    addLogLine(`Failed to add relationship for ${role.artist.name} - ${role.entityType} - ${role.linkType}<br />${error}`);
                    console.warn(error);
                    return Promise.resolve();
                });
        })
    );
}

function getTrackRowBasedOnTrack(track) {
    if (/^[0-9]*$/.test(track.position)) {
        // simple number
        const trackNumber = parseInt(track.position, 10);
        return Array.from(document.querySelectorAll(`#tracklist .track`)).find(el => {
            return el.firstElementChild.textContent.trim() === `${trackNumber}`;
        });
    } else if (/^[0-9]*[-.][0-9]*$/.test(track.position)) {
        // multi track release.
        const split = track.position.split(track.position.indexOf('-') > -1 ? '-' : '.');
        const mediumNumber = parseInt(split[0], 10);
        const trackNumber = parseInt(split[1], 10);
        let currentMediumNumber = 0;
        return Array.from(document.querySelectorAll(`#tracklist tr`)).find(el => {
            if (el.classList.contains('subh')) {
                currentMediumNumber++;
            }
            if (mediumNumber === currentMediumNumber) {
                return el.firstElementChild.textContent.trim() === `${trackNumber}`;
            }
        });
    } else {
        // assume alphabetical, e.g. A1, A2, or just A, B
        return Array.from(document.querySelectorAll(`#tracklist .track`)).find(el => {
            return el.firstElementChild.textContent.trim() === track.position;
        });
    }
}

function addRelationshipsForTracklist(tracklistRels) {
    return Promise.all(
        tracklistRels.map(role => {
            return getMbId(role.artist, 'artist')
                .then(mbid => {
                    let addRelButton;
                    const trackRowEl = getTrackRowBasedOnTrack(role.track);
                    if (!trackRowEl) {
                        addLogLine(
                            `<span style="color: orange">Couldn't find a matching track for ${role.track.position} - ${role.track.title}: ${role.artist.name} - ${role.entityType} - ${role.linkType}</span>`
                        );
                        return Promise.resolve();
                    }
                    if (WORK_ONLY_ARTIST_RELS.includes(role.linkType)) {
                        addRelButton = $(trackRowEl.querySelector('.works')).find('button.add-relationship').get(0);
                        if (!addRelButton) {
                            addLogLine(
                                `<span style="color: orange">You need to create a Work for track ${role.track.position} - ${role.track.title}: ${role.artist.name} - ${role.entityType} - ${role.linkType}</span>`
                            );
                            return Promise.resolve();
                        }
                    } else {
                        addRelButton = $(trackRowEl.querySelector(`.recording`)).find('button.add-relationship').get(0);
                    }
                    return addRelationship(
                        addRelButton,
                        role.entityType,
                        role.linkType,
                        mbid,
                        role.attributes || [],
                        // use anv first if set since that's the listing on the release
                        // else use the artist name incase it's different
                        role.artist.anv.trim() || role.artist.name
                    );
                })
                .catch(error => {
                    addLogLine(
                        `Failed to add relationship to track ${role.track.position} - ${role.track.title}: ${role.artist.name} - ${role.entityType} - ${role.linkType}<br />${error}`
                    );
                    console.warn(error);
                    return Promise.resolve();
                });
        })
    );
}

function getArtistRoles(artist) {
    const roleStr = artist.role;
    const rawRoles = roleStr.split(',');
    if (/\([0-9]+\)/.test(artist.anv)) {
        artist.anv = artist.anv.replace(/\([0-9]+\)/, '').trim();
    }
    if (/\([0-9]+\)/.test(artist.name)) {
        artist.name = artist.name.replace(/\([0-9]+\)/, '').trim();
    }
    return rawRoles
        .map(role => {
            let additionalAttributes = [];
            let rolePart = role.trim().split('[');
            const actualRole = rolePart[0].trim();
            if (/Recording Engineer/.test(rolePart[1]) && actualRole === 'Engineer') {
                return Object.assign({}, ENTITY_TYPE_MAP['Recording Engineer'], {
                    artist: artist,
                });
            }
            if (/Mastering Engineer/.test(rolePart[1]) && actualRole === 'Engineer') {
                return Object.assign({}, ENTITY_TYPE_MAP['Mastered By'], {
                    artist: artist,
                });
            }
            if (/Cover Design/.test(rolePart[1]) && actualRole === 'Artwork') {
                return Object.assign({}, ENTITY_TYPE_MAP['Design'], {
                    artist: artist,
                });
            }
            if (/Design/.test(rolePart[1]) && actualRole === 'Cover') {
                return Object.assign({}, ENTITY_TYPE_MAP['Design'], {
                    artist: artist,
                });
            }
            if (/Additional/.test(rolePart[1])) {
                additionalAttributes.push('additional');
            }
            if (/Assistant/.test(rolePart[1])) {
                additionalAttributes.push('assistant');
            }
            if (/Co /.test(rolePart[1])) {
                additionalAttributes.push('co');
            }
            if (/Executive/.test(rolePart[1])) {
                additionalAttributes.push('executive');
            }
            if (/Associate/.test(rolePart[1])) {
                additionalAttributes.push('associate');
            }
            if (/Guest/.test(rolePart[1])) {
                additionalAttributes.push('guest');
            }
            if (/Solo/.test(rolePart[1])) {
                additionalAttributes.push('solo');
            }
            const mapping = ENTITY_TYPE_MAP[actualRole];
            if (mapping && mapping.linkType == 'miscellaneous support' && !rolePart[1]) {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, actualRole.trim().toLowerCase());
                });
            }
            if (mapping && mapping.linkType == 'miscellaneous support' && rolePart[1]) {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, rolePart[1].replace(']', '').trim().toLowerCase());
                });
            }
            if (mapping && mapping.linkType == 'engineer' && rolePart[1]) {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, rolePart[1].replace(']', '').trim().toLowerCase());
                });
            }
            if (mapping && mapping.linkType == 'mixer' && rolePart[1]) {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, rolePart[1].replace(']', '').trim().toLowerCase());
                });
            }
            if (mapping && mapping.linkType == 'producer' && rolePart[1]) {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, rolePart[1].replace(']', '').trim().toLowerCase());
                });
            }
            if (mapping && mapping.linkType == 'photography' && rolePart[1]) {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, rolePart[1].replace(']', '').trim().toLowerCase());
                });
            }
            if (mapping && mapping.linkType == 'artwork' && rolePart[1]) {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, rolePart[1].replace(']', '').trim().toLowerCase());
                });
            }
            if (mapping && mapping.linkType == 'producer' && actualRole == 'Post Production') {
                additionalAttributes.push(() => {
                    return setNativeValue(SELECTORS.TaskInput, actualRole.toLowerCase());
                });
            }
            if (!mapping && INSTRUMENTS[actualRole] !== undefined) {
                // check if it's an instrument
                let instrumentName = actualRole;
                if (INSTRUMENTS[actualRole]) {
                    instrumentName = INSTRUMENTS[actualRole];
                }
                let role = ENTITY_TYPE_MAP.Instruments;
                if ('Drum Programming' === actualRole) {
                    role = ENTITY_TYPE_MAP['Programmed By'];
                    instrumentName = INSTRUMENTS['Drum Machine'];
                }
                return Object.assign({}, role, {
                    artist: artist,
                    attributes: [
                        () => {
                            return setValueOnAutocomplete(SELECTORS.InstrumentsInput, instrumentName.toLowerCase());
                        },
                    ],
                });
            }
            if (!mapping) {
                return null;
            }
            if (Array.isArray(mapping.attributes)) {
                additionalAttributes = additionalAttributes.concat(mapping.attributes);
            }
            return Object.assign({}, mapping, {
                artist: artist,
                attributes: additionalAttributes,
            });
        })
        .filter(resolvedRole => {
            return !!resolvedRole;
        });
}

function addReleaseRelationship(entityType, linkType, mbidUrl, extraAttributes, creditedAsName) {
    addRelationship(SELECTORS.AddReleaseRelationshipButton, entityType, linkType, mbidUrl, extraAttributes, creditedAsName);
}

function updateSummary() {
    const script_name = GM_info.script.name;
    const script_version = GM_info.script.version;
    const trackRelationshipUpdateCount = document.querySelectorAll('#tracklist .rel-add').length + document.querySelectorAll('#tracklist .rel-edit').length;
    const releaseRelationshipUpdateCount = document.querySelectorAll('#release-rels .rel-add').length;
    summary.innerHTML = `<p>Summary</p><p>Added ${releaseRelationshipUpdateCount} release relationships<br/>Added/Edited ${trackRelationshipUpdateCount} track relationships</p>`;
    selectValue(
        $(SELECTORS.EditNote).get(0),
        `${releaseRelationshipUpdateCount} release relationships imported from ${discogsUrl}.\n---\nGM script: "${script_name}" (${script_version})${trackRelationshipUpdateCount > 0 ?
            `\n\nAdded/Edited ${trackRelationshipUpdateCount} track relationships.` : ``}`
    );
}

function addRelationship(targetQuerySelector, entityType, linkType, mbidUrl, extraAttributes, creditedAsName) {
    const uiWork = () => {
        let addRelButton;
        if (typeof targetQuerySelector == 'string') {
            addRelButton = document.querySelector(targetQuerySelector);
        } else if (targetQuerySelector) {
            addRelButton = targetQuerySelector;
        }
        if (!addRelButton) {
            addLogLine(`< span style = "color: red" > Could find Add Relationship button for ${targetQuerySelector}</span > `);
            return doNext(() => { });
        }
        addRelButton.scrollIntoViewIfNeeded ? addRelButton.scrollIntoViewIfNeeded() : addRelButton.scrollIntoView();
        addRelButton.click();
        return doNext(() => {
            // choose the entity, e.g. artist, label, place
            const input = $(SELECTORS.AddRelationshipsDialogEntityType).get(0);
            if (input) {
                selectValue(input, entityType);
            } else {
                throw new Error(`Input not found: ${SELECTORS.AddRelationshipsDialogEntityType}. Is modal open?`);
            }
        })
            .then(() => {
                return doNext(() => {
                    return setValueOnAutocomplete(SELECTORS.AddRelationshipsDialogRelationshipType, linkType);
                });
            })
            .then(() => {
                return doNext(function () {
                    // now set the mbid url to choose the entity
                    return setValueOnAutocomplete(SELECTORS.AddRelationshipsDialogRelationshipTarget, mbidUrl);
                });
            })
            .then(() => {
                if (!creditedAsName) {
                    return Promise.resolve();
                }
                // process of "credited as" names if different
                else
                    return doNext(() => {
                        // let's ignore case here because Discogs doesn't respect case
                        if ($(SELECTORS.AddRelationshipsDialogRelationshipTarget).val().toLowerCase() !== creditedAsName.toLowerCase()) {
                            const input = $(SELECTORS.AddRelationshipsDialogEntityCredit).get(0);
                            setNativeValue(input, creditedAsName);
                        }
                    });
            })
            .then(() => {
                // any additional attributes processed here
                let previousPromise = Promise.resolve();
                extraAttributes.forEach(attribute => {
                    previousPromise = previousPromise.then(() => {
                        return doNext(() => {
                            return checkAdditionalAttribute(attribute);
                        });
                    });
                });
                return previousPromise;
            })
            .then(() => {
                return doNext(() => {
                    const doneButton = $(SELECTORS.AddRelationshipsDialogDoneButton)[0];
                    if (doneButton.disabled) {
                        addLogLine(
                            `Failed to add relationship  ${entityType}: <a href="${mbidUrl}">${creditedAsName}</a> ${entityType} - ${linkType}<br />Relationship potentially already exists`
                        );
                        makeClickEvent($(SELECTORS.AddRelationshipsDialogCancelButton)[0]);
                    } else {
                        makeClickEvent(doneButton);
                    }
                });
            })
            .then(() => {
                return doNext(() => {
                    updateSummary();
                });
            })
            .catch(err => {
                return doNext(() => {
                    // cancel if necessary
                    try {
                        makeClickEvent($(SELECTORS.AddRelationshipsDialogCancelButton)[0]);
                    } catch (err) {
                        // ignore error
                    }

                    updateSummary();
                    throw err;
                });
            });
    };
    if (!lastUiItem) {
        lastUiItem = uiWork();
    } else {
        lastUiItem = lastUiItem.then(uiWork);
    }
    return lastUiItem;
}

function getElementByLabel(selector, label) {
    return Array.prototype.slice.call(document.querySelectorAll(selector)).filter(function (el) {
        return el.textContent.trim() === label;
    })[0];
}

function checkAdditionalAttribute(additionalAttribute) {
    if (typeof additionalAttribute === 'function') {
        return additionalAttribute();
    } else {
        const additionalAttrLabel = getElementByLabel('.attribute-container label', additionalAttribute);
        if (additionalAttrLabel) {
            additionalAttrLabel.firstElementChild.click();
        }
    }
}

/////////////////////////////////////////////////////

function getMbId(discogsEntity, entityType) {
    const key = getDiscogsLinkKey(discogsEntity.resource_url);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['mblinks'], 'readonly');
        const objectStore = transaction.objectStore('mblinks');
        const request = objectStore.get(key);
        request.onerror = function () {
            scheduleRequest(discogsEntity, entityType)
                .then(result => {
                    resolve(result);
                })
                .catch(err => {
                    reject(err);
                });
        };
        request.onsuccess = function () {
            // Do something with the request.result!
            if (request?.result?.mb_links?.length > 0) {
                resolve(request.result.mb_links[0]);
            } else {
                scheduleRequest(discogsEntity, entityType)
                    .then(result => {
                        resolve(result);
                    })
                    .catch(err => {
                        reject(err);
                    });
            }
        };
    });
}

function scheduleRequest(discogsEntity, entityType) {
    const key = getDiscogsLinkKey(discogsEntity.resource_url);
    return new Promise((resolve, reject) => {
        let query = `//musicbrainz.org/ws/2/url?resource=${encodeURIComponent(link_infos[key].clean_url)}&inc=${entityType}-rels&fmt=json`;
        if (!link_infos[key]) {
            reject(`${key} for ${discogsEntity.name} not found in link_infos map`);
        } if (entityType === 'place') {
            query = `//musicbrainz.org/ws/2/url?resource=${encodeURIComponent(link_infos[key].clean_url)}&inc=place-rels+label-rels&fmt=json`
        }
        let mbRequest = () => {
            fetch(query)
                .then(body => {
                    if (body.status === 503) {
                        throw 503;
                    }
                    return body.json();
                })
                .then(json => {
                    if (Array.isArray(json.relations) && json.relations.length > 0) {
                        const mb_links = [];
                        json.relations.forEach(relation => {
                            if (relation[entityType]) {
                                let mb_url = `//musicbrainz.org/${entityType}/${relation[entityType].id}`;
                                if (!mb_links.includes(mb_url)) {
                                    // prevent dupes
                                    mb_links.push(mb_url);
                                }
                            } else if (entityType === 'place' && relation['label']) {
                                let mb_url = `//musicbrainz.org/label/${relation['label'].id}`;
                                if (!mb_links.includes(mb_url)) {
                                    // prevent dupes
                                    mb_links.push(mb_url);
                                }

                            }
                        });
                        if (mb_links.length > 1) {
                            addLogLine(
                                `Warning ${mb_links.length} Musicbrainz entries for ${entityType} called ${discogsEntity.name
                                }: ${mb_links.map(link => {
                                    return `<a href="${link}" rel="noopener noreferrer nofolow" target="_blank">${link}</a>, `;
                                })}`
                            );
                        }
                        const transaction = db.transaction(['mblinks'], 'readwrite');
                        transaction.oncomplete = () => {
                            resolve(mb_links[0]);
                        };
                        transaction.onerror = err => {
                            console.warn(err);
                            // we'll ignore errors most of them are
                            // dupe key errors, but if we have a result we should use it.
                            resolve(mb_links[0]);
                        };
                        const objectStore = transaction.objectStore('mblinks');
                        objectStore.add({
                            discogs_id: key,
                            mb_links: mb_links,
                        });
                    } else {
                        reject(`${entityType} called ${discogsEntity.name} was not found in MB`);
                    }
                })
                .catch(err => {
                    if (err === 503) {
                        setTimeout(() => {
                            mbRequest();
                        }, 500 + Math.random() * 2000);
                        return;
                    }
                    console.error(err);
                    reject('Unknown error see developer console for details');
                });
        };
        if (!lastRequest) {
            lastRequest = mbRequest();
        } else {
            lastRequest = lastRequest.then(() => {
                setTimeout(() => {
                    mbRequest();
                }, 1000);
            });
        }
    });
}

function setValueOnAutocomplete(selector, value) {
    const input = $(selector).get(0);
    setNativeValue(input, value);
    input.dispatchEvent(makeKeyDownEvent(13));
    return new Promise(resolve => {
        function isComplete() {
            if (!input.classList.contains('lookup-performed')) {
                setTimeout(isComplete, 50);
            } else {
                resolve();
            }
        }
        isComplete();
    });
}

// contains infos for each link key
const link_infos = {};

// Parse discogs url to extract info, returns a key and set link_infos for this key
// the key is in the form discogs_type/discogs_id
function getDiscogsLinkKey(url) {
    const re = /^https?:\/\/(?:www|api)\.discogs\.com\/(?:(?:(?!sell).+|sell.+)\/)?(master|release|artist|label)s?\/(\d+)(?:[^?#]*)(?:\?noanv=1|\?anv=[^=]+)?$/i;
    const m = re.exec(url);
    if (m !== null) {
        const key = `${m[1]}/${m[2]}`;
        if (!link_infos[key]) {
            link_infos[key] = {
                type: m[1],
                id: m[2],
                clean_url: `https://www.discogs.com/${m[1]}/${m[2]}`,
            };
        }
        return key;
    }
    return false;
}

const SELECTORS = {
    MediumsInput: '.multiselect-input',
    MediumsInputOptions: '.multiselect-input + .menu a',
    InstrumentsInput: '#add-relationship-dialog .multiselect.instrument input[aria-autocomplete]',
    VocalsTypeInput: '#add-relationship-dialog .multiselect.vocal input[aria-autocomplete]',
    AddRelationshipsDialogEntityType: '#add-relationship-dialog .entity-type',
    AddRelationshipsDialogRelationshipType: '#add-relationship-dialog input.relationship-type',
    AddRelationshipsDialogRelationshipTarget: '#add-relationship-dialog input.relationship-target',
    AddRelationshipsDialogEntityCredit: '#add-relationship-dialog input.entity-credit',
    AddRelationshipsDialogDoneButton: '#add-relationship-dialog .buttons button.positive',
    AddRelationshipsDialogError: '#add-relationship-dialog .error',
    AddRelationshipsDialogCancelButton: '#add-relationship-dialog .buttons button.negative',
    AddReleaseRelationshipButton: '#release-rels button.add-relationship',
    EditNote: '#edit-note-text',
    TaskInput: '#add-relationship-dialog .attribute-container.task input',
};

const ENTITY_TYPE_MAP = {
    // Places
    'Arranged At': {
        entityType: 'place',
        linkType: 'arranged at',
    },
    'Engineered At': {
        entityType: 'place',
        linkType: 'engineered at',
    },
    'Recorded At': {
        entityType: 'place',
        linkType: 'recorded at',
    },
    'Mixed At': {
        entityType: 'place',
        linkType: 'mixed at',
    },
    'Mastered At': {
        entityType: 'place',
        linkType: 'mastered at',
    },
    'Lacquer Cut At': {
        entityType: 'place',
        linkType: 'lacquer cut at',
    },
    'edited At': {
        entityType: 'place',
        linkType: 'edited at',
    },
    'Remixed At': {
        entityType: 'place',
        linkType: 'remixed at',
    },
    'Produced At': {
        entityType: 'place',
        linkType: 'produced at',
    },
    'Overdubbed At': null,
    'manufactured At': {
        entityType: 'place',
        linkType: 'manufactured at',
    },
    'Glass Mastered At': {
        entityType: 'place',
        linkType: 'glass mastered at',
    },
    'Pressed At': {
        entityType: 'place',
        linkType: 'pressed at',
    },
    'Designed At': null,
    'Filmed At': null,
    'Exclusive Retailer': null,
    // labels
    'Copyright (c)': {
        entityType: 'label',
        linkType: 'copyrighted by',
    },
    'Phonographic Copyright (p)': {
        entityType: 'label',
        linkType: 'phonographic copyright by',
    },
    'Copyright ©': {
        entityType: 'label',
        linkType: 'copyrighted by',
    },
    'Phonographic Copyright ℗': {
        entityType: 'label',
        linkType: 'phonographic copyright by',
    },
    'Licensed From': {
        entityType: 'label',
        linkType: 'licensed from',
    },
    'Licensed To': {
        entityType: 'label',
        linkType: 'licensed to',
    },
    'Licensed Through': null,
    'Distributed By': {
        entityType: 'label',
        linkType: 'distributed by',
    },
    'Made By': {
        entityType: 'label',
        linkType: 'manufactured by',
    },
    'Manufactured By': {
        entityType: 'label',
        linkType: 'manufactured by',
    },
    'Glass Mastered By': {
        entityType: 'label',
        linkType: 'glass mastered by',
    },
    'Pressed By': {
        entityType: 'label',
        linkType: 'pressed by',
    },
    'Marketed By': {
        entityType: 'label',
        linkType: 'marketed / marketed by',
    },
    'Printed By': {
        entityType: 'label',
        linkType: 'printed by',
    },
    'Promoted By': {
        entityType: 'label',
        linkType: 'promoted by',
    },
    'Published By': {
        entityType: 'label',
        linkType: 'publisher',
    },
    'Rights Society': {
        entityType: 'label',
        linkType: 'rights society',
    },
    'Arranged For': {
        entityType: 'label',
        linkType: 'arranged for',
    },
    'Manufactured For': {
        entityType: 'label',
        linkType: 'manufactured for',
    },
    'Mixed For': {
        entityType: 'label',
        linkType: 'mixed for',
    },
    'Produced For': {
        entityType: 'label',
        linkType: 'produced for',
    },
    'Miscellaneous Support': {
        entityType: 'label',
        linkType: 'miscellaneous support',
    },
    'Exported By': null,
    // Artists
    Performer: {
        entityType: 'artist',
        linkType: 'performer',
    },
    Instruments: {
        entityType: 'artist',
        linkType: 'instruments',
    },
    Vocals: {
        entityType: 'artist',
        linkType: 'vocals',
    },
    'Backing Vocals': {
        entityType: 'artist',
        linkType: 'vocals',
        attributes: [
            () => {
                return setValueOnAutocomplete(SELECTORS.VocalsTypeInput, 'background vocals');
            },
        ],
    },
    'Lead Vocals': {
        entityType: 'artist',
        linkType: 'vocals',
        attributes: [
            () => {
                return setValueOnAutocomplete(SELECTORS.VocalsTypeInput, 'lead vocals');
            },
        ],
    },
    Orchestra: {
        entityType: 'artist',
        linkType: 'orchestra',
    },
    Conductor: {
        entityType: 'artist',
        linkType: 'conductor',
    },
    'Chorus Master': {
        entityType: 'artist',
        linkType: 'chorus master',
    },
    Concertmaster: {
        entityType: 'artist',
        linkType: 'concertmaster',
    },
    Concertmistress: {
        entityType: 'artist',
        linkType: 'concertmaster',
    },
    'Compiled By': {
        entityType: 'artist',
        linkType: 'compiler',
    },
    'DJ Mix': {
        entityType: 'artist',
        linkType: 'DJ-mixer',
    },
    Remix: {
        entityType: 'artist',
        linkType: 'remixer',
    },
    'contains samples by': {
        entityType: 'artist',
        linkType: 'contains samples by',
    },
    'Written-By': {
        entityType: 'artist',
        linkType: 'writer',
    },
    'Written By': {
        entityType: 'artist',
        linkType: 'writer',
    },
    'Composed By': {
        entityType: 'artist',
        linkType: 'composer',
    },
    'Words By': {
        entityType: 'artist',
        linkType: 'lyricist',
    },
    'Lyrics By': {
        entityType: 'artist',
        linkType: 'lyricist',
    },
    'Libretto By': {
        entityType: 'artist',
        linkType: 'librettist',
    },
    'Translated By': {
        entityType: 'artist',
        linkType: 'translator',
    },
    'Arranged By': {
        entityType: 'artist',
        linkType: 'arranger',
    },
    'Instrumentation By': {
        entityType: 'artist',
        linkType: 'instruments arranger',
    },
    'Orchestrated By': {
        entityType: 'artist',
        linkType: 'orchestrator',
    },
    'vocals arranger': {
        entityType: 'artist',
        linkType: 'vocals arranger',
    },
    Producer: {
        entityType: 'artist',
        linkType: 'producer',
    },
    'Co-producer': {
        entityType: 'artist',
        linkType: 'producer',
        attributes: ['co'],
    },
    'Executive-Producer': {
        entityType: 'artist',
        linkType: 'producer',
        attributes: ['executive'],
    },
    'Post Production': {
        entityType: 'artist',
        linkType: 'producer',
    },
    Engineer: {
        entityType: 'artist',
        linkType: 'engineer',
    },
    'Audio Engineer': {
        entityType: 'artist',
        linkType: 'audio engineer',
    },
    'Mastered By': {
        entityType: 'artist',
        linkType: 'mastering',
    },
    'Remastered By': {
        entityType: 'artist',
        linkType: 'mastering',
        attributes: ['re'],
    },
    'Lacquer Cut By': {
        entityType: 'artist',
        linkType: 'lacquer cut',
    },
    'sound engineer': {
        entityType: 'artist',
        linkType: 'sound engineer',
    },
    'Mixed By': {
        entityType: 'artist',
        linkType: 'mixer',
    },
    'Recorded By': {
        entityType: 'artist',
        linkType: 'recording engineer',
    },
    'Recording Engineer': {
        entityType: 'artist',
        linkType: 'recording engineer',
    },
    'Programmed By': {
        entityType: 'artist',
        linkType: 'programming',
    },
    Editor: {
        entityType: 'artist',
        linkType: 'editor',
    },
    'Edited By': {
        entityType: 'artist',
        linkType: 'editor',
    },
    'balance engineer': {
        entityType: 'artist',
        linkType: 'balance engineer',
    },
    'copyrighted by': {
        entityType: 'artist',
        linkType: 'copyrighted by',
    },
    'phonographic copyright by': {
        entityType: 'artist',
        linkType: 'phonographic copyright by',
    },
    Legal: {
        entityType: 'artist',
        linkType: 'legal representation',
    },
    Booking: {
        entityType: 'artist',
        linkType: 'booking',
    },
    'Art Direction': {
        entityType: 'artist',
        linkType: 'art direction',
    },
    Artwork: {
        entityType: 'artist',
        linkType: 'artwork',
    },
    'Artwork By': {
        entityType: 'artist',
        linkType: 'artwork',
    },
    Design: {
        entityType: 'artist',
        linkType: 'design',
    },
    'Graphic Design': {
        entityType: 'artist',
        linkType: 'graphic design',
    },
    Illustration: {
        entityType: 'artist',
        linkType: 'illustration',
    },
    'Booklet Editor': {
        entityType: 'artist',
        linkType: 'booklet editor',
    },
    'Photography By': {
        entityType: 'artist',
        linkType: 'photography',
    },
    Technician: {
        entityType: 'artist',
        linkType: 'instruments technician',
    },
    publisher: {
        entityType: 'artist',
        linkType: 'publisher',
    },
    'Liner Notes': {
        entityType: 'artist',
        linkType: 'liner notes',
    },
    'A&R': {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    Advisor: {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    'Concept By': {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    Contractor: {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    Coordinator: {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    Management: {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    'Musical Assistance': {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    'Tour Manager': {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    Other: {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    'Public Relations': {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    Promotion: {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    Crew: {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    'Supervised By': {
        entityType: 'artist',
        linkType: 'miscellaneous support',
    },
    'Director Of Photography': {
        entityType: 'artist',
        linkType: 'photography',
        attributes: [
            () => {
                return setNativeValue(SELECTORS.TaskInput, 'director of photography');
            },
        ],
    }
};

function doNext(fn) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const response = fn();
                if (response && typeof response.then === 'function') {
                    response.then(resolve).catch(e => reject(e));
                } else {
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
        }, 400);
    });
}

function setNativeValue(element, value) {
    if (typeof element === 'string') {
        element = $(element).get(0);
    }
    let lastValue = element.value;
    element.value = value;
    let event = new Event('input', { target: element, bubbles: true });
    // React 15
    event.simulated = true;
    // React 16
    let tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
}

function selectValue(element, value) {
    if (typeof element === 'string') {
        element = $(element).get(0);
    }
    let lastValue = element.value;
    element.value = value;
    let event = new Event('change', { target: element, bubbles: true });
    // React 15
    event.simulated = true;
    // React 16
    let tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
}

function makeKeyDownEvent(keyCode) {
    return new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true, keyCode: 13,
    });
}

function makeClickEvent(element) {
    const clickEvent = new PointerEvent('click', {
        pointerType: 'mouse',
        type: 'click',
        isTrusted: true,
        view: unsafeWindow,
        bubbles: true, // You can set this to true to make the event bubble up the DOM tree
        cancelable: true, // You can set this to true to make the event cancelable
    });
    element.dispatchEvent(clickEvent);
}

const INSTRUMENTS = {
    Afoxé: null,
    Agogô: null,
    Ashiko: null,
    Atabal: null,
    Bapang: null,
    'Bass Drum': null,
    Bata: null,
    'Bell Tree': null,
    Bells: 'Bell',
    Bendir: null,
    Bodhrán: null,
    'Body Percussion': null,
    Bombo: null,
    Bones: null,
    Bongos: null,
    Buhay: null,
    Buk: null,
    Cabasa: null,
    Caixa: null,
    'Caja Vallenata': null,
    Cajón: null,
    Calabash: null,
    Castanets: null,
    Caxixi: null,
    "Chak'chas": null,
    Chinchín: null,
    Ching: null,
    Claves: null,
    Congas: null,
    Cowbell: null,
    Cuica: null,
    Cymbal: null,
    Daf: null,
    Davul: null,
    Dhol: null,
    Dholak: null,
    Djembe: null,
    Doira: null,
    Doli: null,
    Drum: 'Drums',
    'Drum Programming': null,
    Drums: null,
    Dunun: null,
    'Electronic Drums': null,
    'Finger Cymbals': null,
    'Finger Snaps': null,
    'Frame Drum': null,
    'Friction Drum': null,
    Frottoir: null,
    Ganzá: null,
    Ghatam: null,
    Ghungroo: null,
    'Goblet Drum': null,
    Gong: null,
    Guacharaca: null,
    Guiro: null,
    Handbell: null,
    Handclaps: null,
    'Hang Drum': null,
    Hihat: null,
    Hosho: null,
    Hyoshigi: null,
    Idiophone: null,
    Jaggo: null,
    Janggu: null,
    Jing: null,
    "K'kwaengwari": null,
    Ka: null,
    'Kagura Suzu': null,
    Kanjira: null,
    Karkabas: null,
    Khartal: null,
    Khurdak: null,
    Kynggari: null,
    Lagerphone: null,
    "Lion's Roar": null,
    Madal: null,
    Mallets: null,
    Maracas: null,
    'Monkey stick': null,
    Mridangam: null,
    Pakhavaj: null,
    Pandeiro: null,
    Percussion: null,
    Rainstick: null,
    Ratchet: null,
    Rattle: null,
    'Reco-reco': null,
    Repinique: null,
    Rototoms: null,
    Scraper: null,
    Shaker: null,
    Shakubyoshi: null,
    Shekere: null,
    Shuitar: null,
    'Singing Bowls': null,
    Skratjie: null,
    Slapstick: null,
    'Slit Drum': null,
    Snare: null,
    Spoons: null,
    'Stomp Box': null,
    Surdo: null,
    Surigane: null,
    Tabla: null,
    Taiko: null,
    'Talking Drum': null,
    'Tam-tam': null,
    Tambora: null,
    Tamboril: null,
    Tamborim: null,
    Tambourine: null,
    'Tan-Tan': null,
    'Tap Dance': null,
    'Tar (Drum)': null,
    'Temple Bells': null,
    'Temple Block': null,
    Thavil: null,
    Timbales: null,
    Timpani: null,
    'Tom Tom': null,
    Triangle: null,
    Tüngür: null,
    Udu: null,
    Vibraslap: null,
    Washboard: null,
    Waterphone: null,
    'Wood Block': null,
    Zabumba: null,
    Amadinda: null,
    Angklung: null,
    Balafon: null,
    Boomwhacker: null,
    Carillon: null,
    Celesta: null,
    Chimes: null,
    Crotales: null,
    Glockenspiel: null,
    Guitaret: null,
    Kalimba: null,
    Lamellophone: null,
    Marimba: null,
    Marimbula: null,
    Metallophone: null,
    'Musical Box': null,
    Prempensua: null,
    Slagbordun: null,
    'Steel Drums': null,
    'Thumb Piano': null,
    Tubaphone: null,
    'Tubular Bells': null,
    Tun: null,
    Txalaparta: null,
    Vibraphone: null,
    Xylophone: null,
    'Baby Grand Piano': null,
    Chamberlin: null,
    Claviorgan: null,
    'Concert Grand Piano': null,
    Dulcitone: null,
    'Electric Harmonium': null,
    'Electric Harpsichord': null,
    'Electric Organ': null,
    'Electric Piano': null,
    Fortepiano: null,
    'Grand Piano': null,
    Harmonium: null,
    Harpsichord: null,
    Keyboards: 'Keyboard',
    Mellotron: null,
    Melodica: null,
    Omnichord: null,
    'Ondes Martenot': null,
    Organ: null,
    'Parlour Grand Piano': null,
    Pedalboard: null,
    Piano: null,
    'Player Piano': null,
    Regal: null,
    Stylophone: null,
    Synth: 'Synthesizer',
    Synthesizer: null,
    'Tangent Piano': null,
    'Toy Piano': null,
    'Upright Piano': null,
    Virginal: null,
    '12-String Acoustic Guitar': null,
    '12-String Bass': null,
    '5-String Banjo': null,
    '6-String Banjo': null,
    '6-String Bass': null,
    'Acoustic Bass': null,
    'Acoustic Guitar': null,
    'Arco Bass': null,
    Arpa: null,
    Autoharp: null,
    Baglama: null,
    'Bajo Quinto': null,
    'Bajo Sexto': null,
    Balalaika: null,
    Bandola: null,
    Bandura: null,
    Bandurria: null,
    Banhu: null,
    Banjo: null,
    Banjolin: null,
    'Baritone Guitar': null,
    'Baroque Guitar': null,
    Baryton: null,
    'Bass Guitar': null,
    Berimbau: null,
    Bhapang: null,
    Biwa: null,
    'Blaster Beam': null,
    Bolon: null,
    Bouzouki: null,
    'Bulbul Tarang': null,
    Byzaanchi: null,
    Cavaquinho: null,
    Cello: null,
    'Cello Banjo': null,
    Changi: null,
    Chanzy: null,
    'Chapman Stick': null,
    Charango: null,
    Chitarrone: null,
    Chonguri: null,
    Chuniri: null,
    Cimbalom: null,
    Citole: null,
    Cittern: null,
    Clàrsach: null,
    'Classical Guitar': null,
    Clavichord: null,
    Clavinet: null,
    Cobza: null,
    Contrabass: null,
    Cuatro: null,
    Cümbüş: null,
    Cura: null,
    Deaejeng: null,
    'Diddley Bow': null,
    Dilruba: null,
    Dobro: null,
    Dojo: null,
    Dombra: null,
    Domra: null,
    Doshpuluur: null,
    'Double Bass': null,
    Dulcimer: null,
    Dutar: null,
    'Đàn bầu': null,
    Ektare: null,
    'Electric Bass': null,
    'Electric Guitar': null,
    'Electric Upright Bass': null,
    'Electric Violin': null,
    'Epinette des Vosges': null,
    Erhu: null,
    Esraj: null,
    Fiddle: null,
    'Flamenco Guitar': null,
    'Fretless Bass': null,
    'Fretless Guitar': null,
    Gadulka: null,
    Gaohu: null,
    Gayageum: null,
    Geomungo: null,
    Giga: null,
    Gittern: null,
    Gottuvâdyam: null,
    Guimbri: null,
    Guitalele: null,
    Guitar: null,
    'Guitar Banjo': null,
    'Guitar Synthesizer': null,
    Guitarrón: null,
    GuitarViol: null,
    Guqin: null,
    Gusli: null,
    Guzheng: null,
    Haegum: null,
    Halldorophone: null,
    Hardingfele: null,
    Harp: null,
    'Harp Guitar': null,
    Hummel: null,
    Huqin: null,
    'Hurdy Gurdy': null,
    Igil: null,
    Jarana: null,
    Jinghu: null,
    Jouhikko: null,
    Kabosy: null,
    Kamancha: null,
    Kanklės: null,
    Kantele: null,
    Kanun: null,
    Kemenche: null,
    Kirar: null,
    Kobyz: null,
    Kokyu: null,
    Kora: null,
    Koto: null,
    Krar: null,
    Langeleik: null,
    Laouto: null,
    'Lap Steel Guitar': null,
    Laúd: null,
    Lavta: null,
    'Lead Guitar': null,
    Lira: null,
    'Lira da Braccio': null,
    Lirone: null,
    Liuqin: null,
    Lute: null,
    Lyre: null,
    Mandobass: null,
    Mandocello: null,
    Mandoguitar: null,
    Mandola: null,
    Mandolin: null,
    'Mandolin Banjo': null,
    Mandolincello: null,
    Marxophone: null,
    Masinko: null,
    Monochord: null,
    Morinhoor: null,
    'Mountain Dulcimer': null,
    'Musical Bow': null,
    Ngoni: null,
    Nyckelharpa: null,
    'Open-Back Banjo': null,
    Oud: null,
    Outi: null,
    Panduri: null,
    'Pedal Steel Guitar': null,
    'Piccolo Banjo': null,
    Pipa: null,
    'Plectrum Banjo': null,
    'Portuguese Guitar': null,
    Psalmodicon: null,
    Psaltery: null,
    Rabab: null,
    Rabeca: null,
    Rebab: null,
    Rebec: null,
    Reikin: null,
    'Requinto Guitar': null,
    'Resonator Banjo': null,
    'Resonator Guitar': null,
    'Rhythm Guitar': null,
    Ronroco: null,
    Ruan: null,
    Sanshin: null,
    Santoor: null,
    Sanxian: null,
    Sarangi: null,
    Sarod: null,
    'Selmer-Maccaferri Guitar': null,
    'Semi-Acoustic Guitar': null,
    Seperewa: null,
    'Shahi Baaja': null,
    Shamisen: null,
    Sintir: null,
    Sitar: null,
    'Slide Guitar': null,
    Spinet: null,
    'Steel Guitar': null,
    Strings: null,
    'Stroh Violin': null,
    Strumstick: null,
    Surbahar: null,
    'Svara Mandala': null,
    Swarmandel: null,
    Sympitar: null,
    SynthAxe: null,
    Taishōgoto: null,
    Talharpa: null,
    Tambura: null,
    Tamburitza: null,
    Tapboard: null,
    'Tar (lute)': null,
    'Tenor Banjo': null,
    'Tenor Guitar': null,
    Theorbo: null,
    Timple: null,
    Tiple: null,
    Tipple: null,
    Tonkori: null,
    Tres: null,
    'Tromba Marina': null,
    'Twelve-String Guitar': null,
    Tzouras: null,
    Ukulele: null,
    'Ukulele Banjo': null,
    Ütőgardon: null,
    Valiha: null,
    Veena: null,
    Vielle: null,
    Vihuela: null,
    Viol: null,
    Viola: null,
    'Viola Caipira': null,
    "Viola d'Amore": null,
    'Viola da Gamba': null,
    'Viola de Cocho': null,
    'Viola Kontra': null,
    'Viola Nordestina': null,
    Violin: null,
    'Violino Piccolo': null,
    Violoncello: null,
    Violone: null,
    'Washtub Bass': null,
    Xalam: null,
    "Yang T'Chin": null,
    Yanggeum: null,
    Zither: null,
    Zongora: null,
    Accordion: null,
    Algoza: null,
    Alphorn: null,
    'Alto Clarinet': null,
    'Alto Flute': null,
    'Alto Horn': null,
    'Alto Recorder': null,
    'Alto Saxophone': null,
    Apito: null,
    Bagpipes: null,
    Bandoneon: null,
    Bansuri: null,
    'Baritone Horn': null,
    'Baritone Saxophone': null,
    'Barrel Organ': null,
    'Bass Clarinet': null,
    'Bass Flute': null,
    'Bass Harmonica': null,
    'Bass Saxophone': null,
    'Bass Trombone': null,
    'Bass Trumpet': null,
    'Bass Tuba': null,
    'Basset Horn': null,
    Bassoon: null,
    Bawu: null,
    Bayan: null,
    Bellowphone: null,
    Beresta: null,
    'Blues Harp': null,
    'Bolivian Flute': null,
    Bombarde: null,
    Brass: null,
    'Brass Bass': null,
    Bucium: null,
    Bugle: null,
    Chalumeau: null,
    Chanter: null,
    Charamel: null,
    Chirimia: null,
    Clarinet: null,
    Clarion: null,
    Claviola: null,
    Comb: null,
    'Concert Flute': null,
    Concertina: null,
    Conch: null,
    'Contra-Alto Clarinet': null,
    'Contrabass Clarinet': null,
    'Contrabass Saxophone': null,
    Contrabassoon: null,
    'Cor Anglais': null,
    Cornet: null,
    Cornett: null,
    Cromorne: null,
    Crumhorn: null,
    Daegeum: null,
    Danso: null,
    Didgeridoo: null,
    'Dili Tuiduk': null,
    Dizi: null,
    Drone: null,
    Duduk: null,
    Dulcian: null,
    Dulzaina: null,
    'Electronic Valve Instrument': null,
    'Electronic Wind Instrument': null,
    'English Horn': null,
    Euphonium: null,
    Fife: null,
    Flageolet: null,
    Flugabone: null,
    Flugelhorn: null,
    Fluier: null,
    Flumpet: null,
    Flute: null,
    "Flute D'Amour": null,
    'French Horn': null,
    Friscaletto: null,
    Fujara: null,
    Galoubet: null,
    Gemshorn: null,
    Gudastviri: null,
    Harmet: null,
    Harmonica: null,
    Heckelphone: null,
    Helicon: null,
    Hichiriki: null,
    'Highland Pipes': null,
    Horagai: null,
    Horn: null,
    Horns: null,
    Hotchiku: null,
    'Hunting Horn': null,
    Jug: null,
    Kagurabue: null,
    Kaval: null,
    Kazoo: null,
    Khene: null,
    Kortholt: null,
    Launeddas: null,
    Limbe: null,
    Liru: null,
    'Low Whistle': null,
    Lur: null,
    Lyricon: null,
    Mänkeri: null,
    Mellophone: null,
    Melodeon: null,
    Mey: null,
    Mizmar: null,
    Mizwad: null,
    Moceño: null,
    'Mouth Organ': null,
    Murli: null,
    Musette: null,
    Nadaswaram: null,
    Ney: null,
    'Northumbrian Pipes': null,
    'Nose Flute': null,
    Oboe: null,
    "Oboe d'Amore": null,
    'Oboe Da Caccia': null,
    Ocarina: null,
    Ophicleide: null,
    'Overtone Flute': null,
    Panpipes: null,
    'Piano Accordion': null,
    'Piccolo Flute': null,
    'Piccolo Trumpet': null,
    Pipe: null,
    Piri: null,
    Pito: null,
    Pixiephone: null,
    Quena: null,
    Quenacho: null,
    Quray: null,
    Rauschpfeife: null,
    Recorder: null,
    Reeds: null,
    Rhaita: null,
    Rondador: null,
    Rozhok: null,
    Ryuteki: null,
    Sackbut: null,
    Salamuri: null,
    Sampona: null,
    Sarrusophone: null,
    Saxello: null,
    Saxhorn: null,
    Saxophone: null,
    Schwyzerörgeli: null,
    Serpent: null,
    Shakuhachi: null,
    Shanai: null,
    Shawm: null,
    Shenai: null,
    Sheng: null,
    Shinobue: null,
    Sho: null,
    'Shruti Box': null,
    'Slide Whistle': null,
    Smallpipes: null,
    Sodina: null,
    Sopilka: null,
    'Sopranino Saxophone': null,
    'Soprano Clarinet': null,
    'Soprano Cornet': null,
    'Soprano Flute': null,
    'Soprano Saxophone': null,
    'Soprano Trombone': null,
    Souna: null,
    Sousaphone: null,
    'Subcontrabass Saxophone': null,
    Suling: null,
    Suona: null,
    Taepyungso: null,
    Tárogató: null,
    'Tenor Horn': null,
    'Tenor Saxophone': null,
    'Tenor Trombone': null,
    'Ti-tse': null,
    'Tin Whistle': null,
    Tonette: null,
    Trombone: null,
    Trumpet: null,
    Tuba: null,
    Txirula: null,
    Txistu: null,
    'Uilleann Pipes': null,
    'Valve Trombone': null,
    'Valve Trumpet': null,
    'Wagner Tuba': null,
    Whistle: null,
    'Whistling Water Jar': null,
    Wind: null,
    Woodwind: null,
    Xiao: null,
    Yorgaphone: null,
    Zhaleika: null,
    Zukra: null,
    Zurna: null,
    'Automatic Orchestra': null,
    Computer: null,
    'Drum Machine': null,
    Effects: null,
    Electronics: null,
    Groovebox: null,
    Loops: null,
    'MIDI Controller': null,
    Noises: null,
    Sampler: null,
    Scratches: null,
    Sequencer: null,
    'Software Instrument': null,
    Talkbox: null,
    Tannerin: null,
    Tape: null,
    Theremin: null,
    Turntables: null,
    Vocoder: null,
    'Accompanied By': null,
    'Audio Generator': null,
    'Backing Band': null,
    Band: null,
    Bass: null,
    'Brass Band': null,
    Bullroarer: null,
    'Concert Band': null,
    'E-Bow': null,
    Ensemble: null,
    Gamelan: null,
    'Glass Harmonica': null,
    Guest: null,
    Homus: null,
    Instruments: null,
    "Jew's Harp": null,
    Mbira: null,
    Morchang: null,
    Musician: null,
    Orchestra: null,
    Performer: null,
    'Rhythm Section': null,
    Saw: null,
    Siren: null,
    Soloist: null,
    Sounds: null,
    Toy: null,
    Trautonium: null,
    'Wind Chimes': null,
    'Wobble Board': null,
};

const WORK_ONLY_ARTIST_RELS = [
    'writer',
    'composer',
    'lyricist',
    'librettist',
    'revised by',
    'translator',
    'reconstructed by',
    'arranger',
    'instruments arranger',
    'orchestrator',
    'vocals arranger',
    'previously attributed to',
    'miscellaneous support',
    'dedicated to',
    'premiered by',
    'was commissioned by',
    'publisher',
    'inspired the name of',
];

const DISCOGS_LOGO_URL = 'https://volkerzell.de/favicons/discogs.png';
