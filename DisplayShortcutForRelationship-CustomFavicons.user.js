// ==UserScript==
// @name        Display shortcut for relationships on MusicBrainz
// @namespace   https://musicbrainz.org/user/vzell
// @version     1.0.1
// @description Display icon shortcut for relationships of release-group, release, recording and work: e.g. Amazon, Discogs, Wikipedia, ... links. This allows to access some relationships without opening the entity page.
// @tag         ai-created
// @author      Aurelien Mino <aurelien.mino@gmail.com>, Gemini (directed by vzell)
// @licence     GPL (http://www.gnu.org/copyleft/gpl.html)
// @homepageURL https://github.com/vzell/mb-userscripts
// @downloadURL https://raw.githubusercontent.com/vzell/mb-userscripts/master/DisplayShortcutForRelationship-CustomFavicons.user.js
// @updateURL   https://raw.githubusercontent.com/vzell/mb-userscripts/master/DisplayShortcutForRelationship-CustomFavicons.user.js
// @include     http*://*musicbrainz.org/artist/*
// @include     http*://*musicbrainz.org/release-group/*
// @include     http*://*musicbrainz.org/label/*
// @exclude     */artist/*/recordings*
// @require     https://code.jquery.com/jquery-3.6.0.min.js
// @grant       GM_xmlhttpRequest
// @connect     *
// ==/UserScript==

//**************************************************************************//
// Based on the "Display shortcut for relationships on MusicBrainz" script by Aurelien Mino.
//**************************************************************************//

// Default icon to use when a favicon can't be found
const DEFAULT_ICON_URL = 'https://volkerzell.de/favicons/questionmark.ico';

// Mappings for specific discography entry favicons
const DISCOGRAPHY_MAPPINGS = {
    'bruceboots.com': 'https://volkerzell.de/favicons/bruceboots.png',
    'web.archive.org': 'https://volkerzell.de/favicons/wayback.png',
    'www.jungleland.it': 'https://volkerzell.de/favicons/jungeland-it.png',
};

// Definitions: relations-type and corresponding icons we are going to treat
const relationsIconsURLs = {
    'release-group': {
        // http://www.amaesingtools.com/images/left_arrow_icon.gif
        'single from': `data:image/gif;base64,R0lGODlhDwALAJEAAP2ZAZmZmf///wAAACH5BAAAAAAALAAAAAAPAAsAAAIflI+pq2ABY0DAiYmwqOyaCoaHxjHaZp0e9UhQB8dCAQA7`,
    },
    release: {
        remaster: 'http://web.archive.org/web/20060708200714/http://wiki.musicbrainz.org/-/musicbrainz/img/moin-www.png',
    },
};

const urlRelationsIconClasses = {
    allmusic: 'allmusic',
    'amazon asin': 'amazon',
    'creative commons licensed download': 'creativecommons',
    discogs: 'discogs',
    imdb: 'imdb',
    lyrics: 'lyrics',
    secondhandsongs: 'secondhandsongs',
    vgmdb: 'vgmdb',
    wikidata: 'wikidata'
};

const otherDatabasesIconClasses = {
    'd-nb.info': 'dnb',
    'www.musik-sammler.de': 'musiksammler',
    'rateyourmusic.com': 'rateyourmusic',
    'www.worldcat.org': 'worldcat',
};

const streamingIconClasses = {
    'music.amazon.': 'amazonmusic',
    'music.apple.com': 'applemusic',
    'bandcamp.com': 'bandcamp',
    'www.deezer.com': 'deezer',
    'www.hdtracks.com': 'hdtracks',
    'itunes.apple.com': 'itunes',
    'qobuz.com': 'qobuz',
    'soundcloud.com': 'soundcloud',
    'open.spotify.com': 'spotify',
    'tidal.com': 'tidal',
    'beatport.com': 'beatport',
};

/**
 * @param {string} mbid
 * @param {string} targetUrl
 * @param {string} iconUrl - The direct URL for the favicon.
 * @param {boolean} ended - Whether the relationship is ended.
 */
function injectShortcutIcon(mbid, targetUrl, iconUrl, ended) {
    if (!iconUrl) return;
    let endedClass = ended ? ' ended' : '';
    const faviconHtml = `<a href='${targetUrl}'><img src='${iconUrl}' class='favicon${endedClass}' style='width: 16px; height: 16px; vertical-align: middle; margin: 2px;' /></a>`;
    $(`#${mbid} td.relationships`).append(faviconHtml);
}

/**
 * @param {string} url
 * @param {Object} iconClassMap
 */
function findIconClassOfUrl(url, iconClassMap) {
    for (let partialUrl in iconClassMap) {
        if (url.includes(partialUrl)) {
            return iconClassMap[partialUrl];
        }
    }
}

/**
 * Asynchronously tries to fetch a favicon URL, falling back if needed, and using a local mapping table first.
 * @param {string} url
 * @returns {Promise<string>} The working favicon URL or a default icon URL.
 */
async function fetchFaviconUrl(url) {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;

    // Check against the local mapping table first
    for (const key in DISCOGRAPHY_MAPPINGS) {
        if (domain.startsWith(key)) {
            return DISCOGRAPHY_MAPPINGS[key];
        }
    }

    const httpsFaviconUrl = `https://${domain}/favicon.ico`;
    const httpFaviconUrl = `http://${domain}/favicon.ico`;

    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: 'HEAD',
            url: httpsFaviconUrl,
            onload: response => {
                if (response.status === 200) {
                    resolve(httpsFaviconUrl);
                } else {
                    GM_xmlhttpRequest({
                        method: 'HEAD',
                        url: httpFaviconUrl,
                        onload: response => {
                            if (response.status === 200) {
                                resolve(httpFaviconUrl);
                            } else {
                                resolve(DEFAULT_ICON_URL);
                            }
                        },
                        onerror: () => resolve(DEFAULT_ICON_URL)
                    });
                }
            },
            onerror: () => {
                GM_xmlhttpRequest({
                    method: 'HEAD',
                    url: httpFaviconUrl,
                    onload: response => {
                        if (response.status === 200) {
                            resolve(httpFaviconUrl);
                        } else {
                            resolve(DEFAULT_ICON_URL);
                        }
                    },
                    onerror: () => resolve(DEFAULT_ICON_URL)
                });
            }
        });
    });
}

const incOptions = {
    'release-group': ['release-group-rels', 'url-rels'],
    release: ['release-rels', 'url-rels', 'discids'],
    recording: ['work-rels'],
    work: ['url-rels'],
};

const userscriptCSS = `
td.relationships .favicon {
    display: inline-block;
    width: 16px;
    height: 16px;
    vertical-align: middle;
    margin: 2px;
}
td.relationships .favicon.ended {
    opacity: 25%; /* make ended rels less visible */
}

/* additional custom favicons which are not shipped by MBS */
.hdtracks-favicon {
    background-image: url(https://www.hdtracks.com/favicon.ico);
    background-size: 16px;
}
.creativecommons-favicon {
    background-image: url(https://creativecommons.org/favicon.ico);
}
.lyrics-favicon {
    /* archived version, originally from http://www.nomy.nu/img/lyrics-icon.gif */
    background-image: url(data:image/gif;base64,R0lGODlhEQARALMAAAAAAP////z8/Onp6dzc3KmpqaGhoZGRkYyMjHx8fP///wAAAAAAAAAAAAAAAAAAACH5BAEAAAoALAAAAAARABEAAARNUBCUqr0JEVnI+GA4EJ0WnGiKTskQGEcsy0YwVK6q2/g7/7Vba6cTumA/Gm9ITBl9yViw10Q9kdEps7o8RqU8EzcwIXlEIrOEgsFoBBEAOw==);
}
`;

// prevent JQuery conflicts, see https://wiki.greasespot.net/@grant
this.$ = this.jQuery = jQuery.noConflict(true);

if (!unsafeWindow) unsafeWindow = window;

$(document).ready(function () {
    // Get pageType (label or artist)
    let parent = {};
    let child = {};
    let m;
    if ((m = window.location.href.match('/artist/(.{36})[^/]*$'))) {
        parent.type = 'artist';
        parent.mbid = m[1];
        child.type = 'release-group';
    } else if ((m = window.location.href.match('/(release-group|label)/(.{36})[^/]*$'))) {
        parent.type = m[1];
        parent.mbid = m[2];
        child.type = 'release';
    } else if ((m = window.location.href.match('/artist/(.{36})/(releases|recordings|works)'))) {
        parent.type = 'artist';
        parent.mbid = m[1];
        child.type = m[2].replace(/s$/, '');
    } else {
        // Not supported
        return;
    }

    document.head.insertAdjacentHTML('beforeend', `<style id='relationship-shortcuts-userscript-css'>${userscriptCSS}</style>`);

    const mbidRE = /(release|release-group|work)\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/;

    // Determine target column
    let columnindex = 0;
    $("table.tbl tbody tr[class!='subh']").each(function () {
        $(this)
            .children('td')
            .each(function () {
                const href = $(this).find('a').attr('href');
                if (href !== undefined && href.match(mbidRE)) {
                    return false;
                }
                columnindex++;
            });
        return false;
    });

    // Set MBID to row in tables to get easiest fastest access
    $("table.tbl tr[class!='subh']").each(function () {
        let $tr = $(this);

        $tr.children(`th:eq(${columnindex})`).after('<th>Relationships</th>');
        $tr.children(`td:eq(${columnindex})`).after("<td class='relationships'></td>");

        $(this)
            .find('a')
            .each(function () {
                let href = $(this).attr('href');
                if ((m = href.match(mbidRE))) {
                    $tr.attr('id', m[2]);
                    return false;
                }
            });
    });

    // Adapt width of subheader rows by incrementing the colspan of a cell
    $('table.tbl tr.subh').each(function () {
        $(this)
            .children('th[colspan]')
            .attr('colspan', function (index, oldValue) {
                if (index === 0) {
                    return Number(oldValue) + 1;
                } else {
                    return oldValue;
                }
            });
    });

    // Calculate offset for multi-page lists
    let page = 1;
    if ((m = window.location.href.match('[?&]page=([0-9]*)'))) {
        page = m[1];
    }
    let offset = (page - 1) * 100;

    // Call the MB webservice
    const url = `/ws/2/${child.type}?${parent.type}=${parent.mbid}&inc=${incOptions[child.type].join('+')}&limit=100&offset=${offset}`;

    $.get(url, function (data, textStatus, jqXHR) {
        // Parse each child
        $(data)
            .find(child.type)
            .each(function () {
                let mbid = $(this).attr('id');
                const rowId = `#${mbid} td.relationships`;
                const $row = $(rowId);

                // URL relationships
                let alreadyInjectedUrls = [];
                $(this)
                    .find("relation-list[target-type='url'] relation")
                    .each(async function () {
                        let relType = $(this).attr('type');
                        let targetUrl = $(this).children('target').text();
                        let ended = $(this).children('ended').text() === 'true';

                        if (alreadyInjectedUrls.includes(targetUrl)) return;
                        alreadyInjectedUrls.push(targetUrl);

                        if (relType === 'discography entry') {
                            const iconUrl = await fetchFaviconUrl(targetUrl);
                            injectShortcutIcon(mbid, targetUrl, iconUrl, ended);
                        } else {
                            let iconClass;
                            if (relType in urlRelationsIconClasses) {
                                iconClass = urlRelationsIconClasses[relType];
                            } else if (['free streaming', 'streaming', 'download for free', 'purchase for download'].includes(relType)) {
                                iconClass = findIconClassOfUrl(targetUrl, streamingIconClasses);
                            } else {
                                // Other database?
                                iconClass = findIconClassOfUrl(targetUrl, otherDatabasesIconClasses);
                            }

                            if (iconClass) {
                                if (ended) {
                                    iconClass = ['ended', iconClass].join(' ');
                                }
                                $(rowId).append(`<a href='${targetUrl}'><span class='favicon ${iconClass}-favicon' /></a>`);
                            }
                        }
                    });

                // Other relationships
                $(this)
                    .find("relation-list[target-type!='url']")
                    .each(function () {
                        let targettype = $(this).attr('target-type').replace('release_group', 'release-group');
                        let relations = {};

                        if (relationsIconsURLs[targettype] === undefined) {
                            return;
                        }

                        $(this)
                            .children('relation')
                            .each(function () {
                                const reltype = $(this).attr('type');
                                const target = $(this).children('target').text();
                                const url = targettype == 'url' ? target : `/${targettype}/${target}`;

                                if (Object.prototype.hasOwnProperty.call(relationsIconsURLs[targettype], reltype)) {
                                    if (!Object.prototype.hasOwnProperty.call(relations, reltype)) relations[reltype] = [url];
                                    else relations[reltype].push(url);
                                }
                            });

                        $.each(relations, function (reltype, urls) {
                            let html = '';
                            if (urls.length < -1) {
                                html += `<img src='${relationsIconsURLs[targettype][reltype]}' />(${urls.length}) `;
                            } else {
                                $.each(urls, function (index, url) {
                                    html += `<a href='${url}'><img src='${relationsIconsURLs[targettype][reltype]}' /></a> `;
                                });
                            }
                            $(`#${mbid} td.relationships`).append(html);
                        });
                    });
            });
    });
});
