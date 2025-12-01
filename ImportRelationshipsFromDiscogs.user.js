// ==UserScript==
// @name         VZ: MusciBrainz - Import Relationships From A Discogs Release In To A Musicbrainz Release
// @namespace    https://github.com/vzell/mb-userscripts
// @version      0.9+2025-12-01
// @description  Add a button to import Discogs release relationships to MusicBrainz
// @author       mattgoldspink (with input from vzell)
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ImportRelationshipsFromDiscogs.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ImportRelationshipsFromDiscogs.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
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
                createrelsbutton.style.marginRight = '16px';
                const processTracklistLbl = document.createElement('label');
                processTracklistLbl.innerText = 'Process Tracklist relationships too';
                const processTracklistCheckbox = document.createElement('input');
                processTracklistCheckbox.type = 'checkbox';
                processTracklistCheckbox.checked = true;
                processTracklistLbl.appendChild(processTracklistCheckbox);
                const divWrapper = document.createElement('div');

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
                logo.src = discogsLogoBase64;
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
                    grid-template-columns: 200px 1fr 1fr 200px;
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
                    max-width: 20rem;
                }
                .discogs-wrapper > label {
                    grid-area: label;
                    max-width: 20rem;
                    margin: 1rem;
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

const discogsLogoBase64 =
    'data:image/png;base64,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';
