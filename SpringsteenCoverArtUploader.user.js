// ==UserScript==
// @name         VZ: Springsteen Cover Art Uploader
// @namespace    https://github.com/vzell/mb-userscripts
// @description  ArtStation plugin: imports cover art from SpringsteenLyrics.com and Jungleland.it, keyed off the release's external links on MusicBrainz.
// @version      1.01.006+2026-06-21
// @author       vzell
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/SpringsteenCoverArtUploader.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/SpringsteenCoverArtUploader.user.js
// @icon         https://volkerzell.de/favicons/springsteenlyrics.ico
// @match        *://*.musicbrainz.org/release/*/cover-art
// @match        *://www.springsteenlyrics.com/collection.php*
// @match        *://springsteenlyrics.com/collection.php*
// @match        *://www.springsteenlyrics.com/bootlegs.php*
// @match        *://springsteenlyrics.com/bootlegs.php*
// @run-at       document-end
// @connect      musicbrainz.org
// @connect      www.springsteenlyrics.com
// @connect      springsteenlyrics.com
// @connect      www.jungleland.it
// @connect      jungleland.it
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_NAME = 'VZ: Springsteen Cover Art Uploader';

    // ── Debug logger ─────────────────────────────────────────────────────────

    const dbg = {
        /** @param {...*} args */
        log: (...args) => console.log(`[${SCRIPT_NAME}]`, ...args),
        /** @param {...*} args */
        info: (...args) => console.info(`[${SCRIPT_NAME}]`, ...args),
        /** @param {...*} args */
        warn: (...args) => console.warn(`[${SCRIPT_NAME}]`, ...args),
        /** @param {...*} args */
        error: (...args) => console.error(`[${SCRIPT_NAME}]`, ...args),
        /**
         * Log a group of key/value pairs as a collapsible console group.
         * @param {string} label
         * @param {object} data
         */
        group: (label, data) => {
            console.groupCollapsed(`[${SCRIPT_NAME}] ${label}`);
            for (const [k, v] of Object.entries(data)) {
                console.log(`  ${k}:`, v);
            }
            console.groupEnd();
        },
    };

    // ── GM compatibility wrappers ────────────────────────────────────────────

    /**
     * Perform a GM.xmlHttpRequest, returning a Promise.
     * @param {string} method - HTTP method
     * @param {string} url - Target URL
     * @param {object} [options] - Additional GM request options
     * @returns {Promise<object>} Resolved with the GM response object
     */
    function gmRequest(method, url, options = {}) {
        dbg.info(`→ ${method} ${url}`, options.responseType ? `(responseType: ${options.responseType})` : '');
        return new Promise((resolve, reject) => {
            const handler = (typeof GM !== 'undefined' && GM.xmlHttpRequest)
                ? GM.xmlHttpRequest.bind(GM)
                : GM_xmlhttpRequest;
            handler({
                method,
                url,
                ...options,
                onload: response => {
                    dbg.group(`← ${method} ${url}`, {
                        status: response.status,
                        statusText: response.statusText,
                        finalUrl: response.finalUrl,
                        responseHeaders: response.responseHeaders,
                        responseLength: typeof response.responseText === 'string'
                            ? response.responseText.length
                            : '(binary)',
                    });
                    resolve(response);
                },
                onerror: response => {
                    dbg.error(`✗ Network error for ${url}`, response);
                    reject(new Error(`Network error fetching ${url}`));
                },
                ontimeout: () => {
                    dbg.error(`✗ Timeout for ${url}`);
                    reject(new Error(`Timeout fetching ${url}`));
                },
            });
        });
    }

    /**
     * Fetch a URL via GM and return the response body as text.
     * @param {string} url
     * @returns {Promise<string>}
     */
    async function gmFetch(url) {
        const r = await gmRequest('GET', url);
        return r.responseText ?? '';
    }

    // ── DOM helpers ──────────────────────────────────────────────────────────

    /**
     * Parse an HTML string into a Document with the given base URL applied.
     * @param {string} html
     * @param {string} baseUrl
     * @returns {Document}
     */
    function parseDOM(html, baseUrl) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (!doc.querySelector('base')) {
            const base = doc.createElement('base');
            base.href = baseUrl;
            doc.head.insertAdjacentElement('beforeend', base);
        }
        return doc;
    }

    // ── Image extractors ─────────────────────────────────────────────────────

    /**
     * Extract full-resolution artwork URLs from a springsteenlyrics.com collection or bootleg page.
     *
     * Both page types use the same thumbnail link structure:
     *   <a href="collection/.../10028_01.jpg" target="_blank">   ← collection
     *   <a href="bootlegs/.../6679_artwork_01.jpg" target="_blank">  ← bootleg
     *     <img src="..._tn.jpg">
     *   </a>
     *
     * @param {string} html - Raw HTML of the page
     * @param {string} pageUrl - Absolute URL of the page (for resolving relative hrefs)
     * @returns {Array<{url: string, types: string[], comment: string}>}
     */
    function extractSpringsteenImages(html, pageUrl) {
        const doc = parseDOM(html, pageUrl);

        const allBlankLinks = [...doc.querySelectorAll('a[target="_blank"]')];
        dbg.info(`extractSpringsteenImages: found ${allBlankLinks.length} a[target="_blank"] links`);

        const candidates = allBlankLinks.map(a => {
            const href = a.getAttribute('href') ?? '';
            const hasImg = a.querySelector('img') !== null;
            const endsJpg = href.endsWith('.jpg');
            const hasTn = href.includes('_tn.');
            return { href, hasImg, endsJpg, hasTn, passes: endsJpg && !hasTn && hasImg };
        });

        dbg.group('extractSpringsteenImages: filter breakdown', {
            total: candidates.length,
            endsWithJpg: candidates.filter(c => c.endsJpg).length,
            hasThumbnailSuffix: candidates.filter(c => c.hasTn).length,
            hasImgChild: candidates.filter(c => c.hasImg).length,
            passes: candidates.filter(c => c.passes).length,
            allHrefs: candidates.map(c => `[${c.passes ? '✓' : '✗'}] ${c.href}`),
        });

        return candidates
            .filter(c => c.passes)
            .map(c => ({
                url: new URL(c.href, pageUrl).href,
                types: [],
                comment: '',
            }));
    }

    /**
     * Infer the MusicBrainz artwork type(s) from a jungleland.it image filename.
     * Filenames follow the pattern: YYYYMMDD_<type>.jpg
     * @param {string} filename
     * @returns {string[]} - artwork type names (matching ArtStation's vocabulary)
     */
    function inferJunglelandTypes(filename) {
        const lower = filename.toLowerCase();
        if (lower.includes('_front')) return ['Front'];
        if (lower.includes('_back')) return ['Back'];
        if (lower.includes('_booklet')) return ['Booklet'];
        if (lower.includes('_cd') || lower.includes('_disc') || lower.includes('_vinyl')) return ['Medium'];
        return [];
    }

    /**
     * Extract full-resolution artwork URLs from a jungleland.it artwork page.
     *
     * The page uses Windows-style backslash paths:
     *   <a href="..\artwork\1960\19670916_front.jpg">
     *     <img src="..\artwork\1960\thumb\tn_19670916_front.jpg">
     *   </a>
     *
     * @param {string} html - Raw HTML of the artwork page
     * @param {string} pageUrl - Absolute URL of the page (for resolving relative hrefs)
     * @returns {Array<{url: string, types: string[], comment: string}>}
     */
    function extractJunglelandImages(html, pageUrl) {
        const doc = parseDOM(html, pageUrl);

        const allLinks = [...doc.querySelectorAll('a[href]')];
        dbg.info(`extractJunglelandImages: found ${allLinks.length} a[href] links`);

        const candidates = allLinks.map(a => {
            const href = a.getAttribute('href') ?? '';
            const lower = href.toLowerCase();
            const isImage = /\.(jpg|jpeg|png)$/i.test(href);
            const hasTn = lower.includes('_tn');
            const hasThumb = lower.includes('thumb');
            const passes = isImage && !hasTn && !hasThumb;
            return { href, isImage, hasTn, hasThumb, passes };
        });

        dbg.group('extractJunglelandImages: filter breakdown', {
            total: candidates.length,
            isImage: candidates.filter(c => c.isImage).length,
            hasThumbnailSuffix: candidates.filter(c => c.hasTn).length,
            hasThumbPath: candidates.filter(c => c.hasThumb).length,
            passes: candidates.filter(c => c.passes).length,
            allHrefs: candidates.map(c => `[${c.passes ? '✓' : '✗'}] ${c.href}`),
        });

        return candidates
            .filter(c => c.passes)
            .map(c => {
                // Jungleland uses Windows backslash separators — convert before resolving.
                const normalized = c.href.replace(/\\/g, '/');
                const url = new URL(normalized, pageUrl).href;
                const filename = url.split('/').pop() ?? '';
                const types = inferJunglelandTypes(filename);
                dbg.log(`  → ${url}  types=${JSON.stringify(types)}`);
                return { url, types, comment: '' };
            });
    }

    // ── Popup strategy (SpringsteenLyrics — CloudFlare bypass) ───────────────

    /**
     * The URL parameter name used to signal the popup script to extract and postMessage images.
     * Must not conflict with any real springsteenlyrics.com query parameters.
     */
    const POPUP_SIGNAL_PARAM = 'cau_extract';

    /**
     * Open a real browser popup for the CloudFlare-protected SpringsteenLyrics site.
     * Waits for the userscript running inside it to postMessage back the extracted image
     * data (including pre-fetched data URLs), then closes the popup.
     *
     * Works for both collection pages (collection.php?item=…) and bootleg pages
     * (bootlegs.php?item=…) — the image extraction logic is identical for both.
     *
     * @param {string} url - SpringsteenLyrics collection or bootleg page URL
     * @param {string} mbid - Release MBID (cross-check)
     * @returns {Promise<Array<{url: string, types: string[], comment: string, dataUrl?: string}>>}
     */
    function fetchImagesViaPopup(url, mbid) {
        dbg.info(`fetchImagesViaPopup: opening popup → ${url}`);

        const separator = url.includes('?') ? '&' : '?';
        const popupUrl = `${url}${separator}${POPUP_SIGNAL_PARAM}=1&cau_mbid=${encodeURIComponent(mbid)}`;
        const popup = window.open(popupUrl, `cau_popup_${mbid}`, 'width=1100,height=750,noopener=no');

        if (!popup) {
            return Promise.reject(new Error(
                'Popup blocked by the browser. Please allow popups for musicbrainz.org and try again.'
            ));
        }

        dbg.info('fetchImagesViaPopup: popup opened, waiting for postMessage…');

        return new Promise((resolve, reject) => {
            // Allow up to 120 s — the popup fetches all images in parallel before responding.
            const timer = setTimeout(() => {
                window.removeEventListener('message', onMessage);
                try { popup.close(); } catch {}
                reject(new Error(
                    'Timeout: SpringsteenLyrics did not respond within 120 s. ' +
                    'If a CloudFlare challenge appeared in the popup, solve it and click the button again.'
                ));
            }, 120_000);

            /** @param {MessageEvent} event */
            function onMessage(event) {
                // Compare hostnames, not full origins: the external link may be http:// but
                // the site redirects to https://, so the popup's postMessage origin is https://.
                if (new URL(event.origin).hostname !== new URL(url).hostname) {
                    dbg.warn(`fetchImagesViaPopup: ignoring message from unexpected origin "${event.origin}"`);
                    return;
                }
                if (!event.data || event.data.type !== 'cau_images') return;

                dbg.info('fetchImagesViaPopup: postMessage received', event.data);
                clearTimeout(timer);
                window.removeEventListener('message', onMessage);
                try { popup.close(); } catch {}
                resolve(event.data.images ?? []);
            }

            window.addEventListener('message', onMessage);
        });
    }

    // ── ArtStation provider registration (runs on /release/*/cover-art) ──────

    /**
     * Register both providers with ArtStation's plugin API.
     * ArtStation resolves the release's external links itself using the `match` field,
     * then passes the matched URL as ctx.link into run(). No MB API call needed here.
     */
    function registerProviders() {
        const springsteenProvider = {
            id: 'springsteenlyrics',
            name: 'SpringsteenLyrics',
            icon: 'https://www.springsteenlyrics.com/favicon.ico',
            /** ArtStation only shows this button when the release links springsteenlyrics.com. */
            match: 'springsteenlyrics.com',

            /**
             * @param {{ mbid: string, link: string }} ctx
             * @returns {Promise<Array<{dataUrl?: string, url?: string, types: string[], comment: string, source: string}>>}
             */
            async run(ctx) {
                dbg.info(`SpringsteenLyrics provider run: link="${ctx.link}"`);

                const images = await fetchImagesViaPopup(ctx.link, ctx.mbid);
                if (!images.length) throw new Error('No images found on the SpringsteenLyrics page.');

                return images.map(img => ({
                    dataUrl: img.dataUrl,
                    url: img.url,
                    types: [],
                    comment: '',
                    source: img.url,
                }));
            },
        };

        const junglelandProvider = {
            id: 'jungleland',
            name: 'Jungleland.it',
            /** ArtStation only shows this button when the release links jungleland.it. */
            match: 'jungleland.it',

            /**
             * @param {{ mbid: string, link: string }} ctx
             * @returns {Promise<Array<{url: string, types: string[], comment: string, source: string}>>}
             */
            async run(ctx) {
                dbg.info(`Jungleland provider run: link="${ctx.link}"`);

                const html = await gmFetch(ctx.link);
                const images = extractJunglelandImages(html, ctx.link);
                if (!images.length) throw new Error('No images found on the Jungleland.it page.');

                // Return plain URLs — ArtStation's own providerBlob → gmFetch downloads
                // the image bytes in its own realm, which is the robust default for sites
                // not protected by CloudFlare.
                return images.map(img => ({
                    url: img.url,
                    types: img.types,
                    comment: img.comment,
                    source: img.url,
                }));
            },
        };

        // Both registration paths are safe to fire — ArtStation de-dupes by id,
        // and a late registration refreshes an open Source popover.
        window.ArtStation?.registerProvider(springsteenProvider);
        window.ArtStation?.registerProvider(junglelandProvider);
        document.dispatchEvent(new CustomEvent('artstation:register-provider', { detail: springsteenProvider }));
        document.dispatchEvent(new CustomEvent('artstation:register-provider', { detail: junglelandProvider }));

        dbg.info('registerProviders: SpringsteenLyrics and Jungleland providers registered');
    }

    // ── Popup-side runner (springsteenlyrics.com) ────────────────────────────

    /**
     * Runs inside the popup opened by fetchImagesViaPopup.
     * Detects the cau_extract URL parameter, extracts images from the already-loaded
     * real page DOM, fetches each image binary as a data URL (same-origin — CloudFlare
     * sees this as a normal browser request), and postMessages the payload back to the
     * MB opener window. This bypasses CloudFlare for both page HTML and image files.
     */
    function runAsSpringsteenPopup() {
        const params = new URLSearchParams(location.search);
        if (!params.has(POPUP_SIGNAL_PARAM)) {
            dbg.info('runAsSpringsteenPopup: no cau_extract param — normal page visit, doing nothing');
            return;
        }

        dbg.info('runAsSpringsteenPopup: cau_extract detected — extracting images from live DOM…');

        const imageItems = [...document.querySelectorAll('a[target="_blank"]')]
            .filter(a => {
                const href = a.getAttribute('href') ?? '';
                return href.endsWith('.jpg') && !href.includes('_tn.') && a.querySelector('img') !== null;
            })
            .map(a => ({
                url: new URL(a.getAttribute('href'), location.href).href,
                types: [],
                comment: '',
            }));

        dbg.info(`runAsSpringsteenPopup: found ${imageItems.length} image URL(s), fetching binaries…`, imageItems);

        if (!window.opener) {
            dbg.error('runAsSpringsteenPopup: window.opener is null — cannot postMessage back');
            return;
        }

        const targetOrigin = 'https://musicbrainz.org';

        /**
         * Fetch one image as a data URL using FileReader.
         * fetch() runs inside the springsteenlyrics.com popup context — same-origin,
         * CF cookie is valid, so the request passes CloudFlare without challenge.
         * @param {string} url
         * @returns {Promise<string>} data URL (e.g. "data:image/jpeg;base64,...")
         */
        async function fetchAsDataUrl(url) {
            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(/** @type {string} */ (reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        (async () => {
            const images = await Promise.all(
                imageItems.map(async item => {
                    try {
                        dbg.info(`runAsSpringsteenPopup: fetching ${item.url}…`);
                        const dataUrl = await fetchAsDataUrl(item.url);
                        dbg.info(`runAsSpringsteenPopup: ✓ ${item.url} → ${dataUrl.length} chars`);
                        return { ...item, dataUrl };
                    } catch (err) {
                        // Send without dataUrl on error; ArtStation will try url as fallback.
                        dbg.error(`runAsSpringsteenPopup: ✗ failed to fetch ${item.url}`, err);
                        return item;
                    }
                })
            );

            dbg.info(`runAsSpringsteenPopup: posting ${images.length} image(s) to opener`);
            window.opener.postMessage({ type: 'cau_images', images }, targetOrigin);

            setTimeout(() => window.close(), 1500);
        })();
    }

    // ── Entry point ──────────────────────────────────────────────────────────

    const host = location.hostname.replace(/^www\./, '');
    const path = location.pathname;
    dbg.info(`init: host="${host}" path="${path}"`);

    if (host === 'springsteenlyrics.com') {
        dbg.info('init: springsteenlyrics.com → runAsSpringsteenPopup()');
        runAsSpringsteenPopup();
    } else if (/\/release\/[a-f0-9-]+\/cover-art$/.test(path)) {
        dbg.info('init: cover-art page → registerProviders()');
        registerProviders();
    } else {
        dbg.warn(`init: host+path matched no handler`);
    }

})();
