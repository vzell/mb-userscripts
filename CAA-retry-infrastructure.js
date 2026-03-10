    // {
    //     "version": "9.99.107",
    //     "date": "2026-03-10",
    //     "sections": [
    //         {
    //             "label": "🐛 Bug Fixes",
    //             "items": [
    //                 "CAA JSON fetch CORS fix: 'TypeError: Failed to fetch' errors in caaEnrichReleaseGroupIcon were caused by the browser's CORS policy blocking window.fetch() calls from the musicbrainz.org origin to coverartarchive.org (which returns no Access-Control-Allow-Origin header). All CAA JSON API calls now use GM_xmlhttpRequest via a new caaGmFetch() Promise-wrapper helper (same pattern as the existing fetchHtml()), which runs in the userscript sandbox context and is completely exempt from CORS. Added '// @connect coverartarchive.org' to the userscript metadata block as required by Tampermonkey for GM_xmlhttpRequest cross-origin calls. The retry countdown mechanism introduced in 9.99.106 is preserved and now correctly handles the residual case of a genuine network error (e.g. coverartarchive.org briefly unreachable), as opposed to the CORS block which was the actual cause of all observed failures."
    //             ]
    //         }
    //     ]
    // },
    // {
    //     "version": "9.99.106",
    //     "date": "2026-03-10",
    //     "sections": [
    //         {
    //             "label": "✨ Enhancements",
    //             "items": [
    //                 "CAA fetch retry mechanism: transient 'Failed to fetch' network errors in caaEnrichReleaseGroupIcon no longer silently fail. Up to 3 retry attempts are made per release-group path, each preceded by a 5-second countdown (5→4→3→2→1→0) rendered as a red SVG number inside the caa-icon / eaa-icon / artwork-icon span's background-image — the same CSS property normally used for the cover-art thumbnail, so no DOM restructuring is needed. On retry success the countdown clears, the artwork thumbnail is re-loaded via caaLoadIcon(), and enrichment (count badge + tooltip) is applied from cache without an extra network round-trip. On final failure a permanent red '?' SVG replaces the countdown as a visual clue that retries were attempted. Multiple anchors referencing the same release-group path share a single retry sequence (deduplication via _caaRetryState). If a sort/filter re-render produces fresh anchor clones while a countdown is already ticking, the new anchors are silently added to the pending set and show the current countdown value — no second timer is started. HTTP 4xx/5xx responses are still treated as definitive failures and are not retried."
    //             ]
    //         }
    //     ]
    // },

// @connect      coverartarchive.org
// @connect      archive.org
// @connect      *.archive.org
// @grant        GM_xmlhttpRequest

    // ── CAA fetch-retry infrastructure ───────────────────────────────────────
    //
    // Root cause of "TypeError: Failed to fetch":
    //   coverartarchive.org's JSON API does not include an
    //   Access-Control-Allow-Origin header, so the browser blocks any call
    //   made with window.fetch() from the musicbrainz.org page context.
    //   GM_xmlhttpRequest runs in the userscript sandbox and is completely
    //   exempt from CORS, so all CAA JSON fetches use it exclusively.
    //
    // The retry mechanism handles the residual case where GM_xmlhttpRequest
    // itself encounters a network error (e.g. coverartarchive.org is briefly
    // unreachable):
    //
    //   • Up to CAA_MAX_RETRIES additional attempts per release-group path.
    //   • Multiple anchors referencing the same path share ONE retry sequence
    //     (deduplication via _caaRetryState).
    //   • Each retry is preceded by a visible countdown rendered as an SVG
    //     data-URI in the caa/eaa/artwork-icon span's background-image — the
    //     same CSS property that caaLoadIcon() normally uses for the thumbnail.
    //   • On success: caaLoadIcon() re-fires (re-loads the artwork thumbnail)
    //     and caaEnrichReleaseGroupIcon() re-runs (serves from cache — no extra
    //     network round-trip).
    //   • On final failure: a permanent red "?" SVG replaces the countdown so
    //     the user can see that retries were at least attempted.
    //
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Fetches a URL via GM_xmlhttpRequest (CORS-exempt) and resolves with a
     * minimal Fetch-API-compatible response object:
     *   { ok: boolean, status: number, json: () => Promise<any> }
     *
     * Uses the same GM_xmlhttpRequest pattern as the existing fetchHtml()
     * helper.  Rejects on network error (onerror / ontimeout callbacks).
     *
     * @param  {string} url
     * @returns {Promise<{ok:boolean, status:number, json:()=>Promise<any>}>}
     */
    function caaGmFetch(url) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method:    'GET',
                url:       url,
                timeout:   15000,
                onload: function(res) {
                    resolve({
                        ok:     res.status >= 200 && res.status < 300,
                        status: res.status,
                        json:   function() {
                            return new Promise(function(res2, rej2) {
                                try   { res2(JSON.parse(res.responseText)); }
                                catch (e) { rej2(e); }
                            });
                        }
                    });
                },
                onerror:   reject,
                ontimeout: function() { reject(new Error('GM_xmlhttpRequest timeout for ' + url)); }
            });
        });
    }

    /** Maximum number of retry attempts after the initial fetch failure. */
    const CAA_MAX_RETRIES      = 3;
    /** Seconds to count down before each retry attempt. */
    const CAA_RETRY_DELAY_SECS = 5;

    /**
     * Per release-group path retry state.
     * Value shape: { attempts: number, anchors: Set<HTMLAnchorElement>,
     *                timerId: number|null, countdown: number }
     */
    const _caaRetryState = new Map();

    /**
     * Paints a countdown SVG into the background-image of `iconSpan`.
     * Uses the same CSS properties as caaLoadIcon() so the two never conflict.
     *
     * @param {HTMLElement}  iconSpan  – caa-icon / eaa-icon / artwork-icon span.
     * @param {number|string} n        – Value to display (0–9 or a string).
     */
    function caaSetRetryIndicator(iconSpan, n) {
        const label = String(n);
        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">' +
            '<rect width="16" height="16" rx="2" fill="#fff0f0" stroke="#c0392b" stroke-width="1.2"/>' +
            '<text x="8" y="12" text-anchor="middle" ' +
            'font-family="monospace,sans-serif" font-size="10" font-weight="bold" fill="#c0392b">' +
            label + '</text></svg>';
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        iconSpan.style.setProperty('background-image',    'url("' + url + '")');
        iconSpan.style.setProperty('background-size',     'contain');
        iconSpan.style.setProperty('background-repeat',   'no-repeat');
        iconSpan.style.setProperty('background-position', 'center');
        if (typeof n === 'number') {
            iconSpan.title = 'CAA fetch failed – retrying in ' + n + 's\u2026';
        }
    }

    /**
     * Paints a permanent red "?" SVG into `iconSpan` once all retries are gone.
     *
     * @param {HTMLElement} iconSpan – caa-icon / eaa-icon / artwork-icon span.
     */
    function caaSetFailedIndicator(iconSpan) {
        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">' +
            '<rect width="16" height="16" rx="2" fill="#ffe0e0" stroke="#c0392b" stroke-width="1.2"/>' +
            '<text x="8" y="12" text-anchor="middle" ' +
            'font-family="monospace,sans-serif" font-size="13" font-weight="bold" fill="#c0392b">' +
            '?</text></svg>';
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        iconSpan.style.setProperty('background-image',    'url("' + url + '")');
        iconSpan.style.setProperty('background-size',     'contain');
        iconSpan.style.setProperty('background-repeat',   'no-repeat');
        iconSpan.style.setProperty('background-position', 'center');
        iconSpan.title = 'CAA artwork unavailable \u2013 all retries exhausted';
    }

    /**
     * Marks every icon for `entityPath` as permanently failed, clears any
     * pending timer, and removes the entry from _caaRetryState.
     *
     * @param {string} entityPath – e.g. "/release-group/GUID"
     */
    function caaMarkRetryFailed(entityPath) {
        const state = _caaRetryState.get(entityPath);
        if (!state) return;
        if (state.timerId !== null) { clearTimeout(state.timerId); state.timerId = null; }
        state.anchors.forEach(anchor => {
            if (!anchor.isConnected) return;
            const icon = anchor.querySelector('span.caa-icon, span.eaa-icon, span.artwork-icon');
            if (icon) caaSetFailedIndicator(icon);
        });
        _caaRetryState.delete(entityPath);
        Lib.debug('caa', 'caaRetry: all retries exhausted for ' + entityPath);
    }

    /**
     * Ticks the countdown for `entityPath` one second at a time, updating every
     * registered icon span.  When the counter reaches 0 it fires `caaDoRetry()`.
     *
     * @param {string} entityPath
     * @param {number} remaining  – seconds left before the next fetch attempt.
     */
    function caaTickCountdown(entityPath, remaining) {
        const state = _caaRetryState.get(entityPath);
        if (!state) return;

        state.countdown = remaining;

        // Paint the current countdown onto every live icon span
        state.anchors.forEach(anchor => {
            if (!anchor.isConnected) return;
            const icon = anchor.querySelector('span.caa-icon, span.eaa-icon, span.artwork-icon');
            if (icon) caaSetRetryIndicator(icon, remaining);
        });

        if (remaining > 0) {
            state.timerId = setTimeout(function() {
                state.timerId = null;
                caaTickCountdown(entityPath, remaining - 1);
            }, 1000);
        } else {
            // Countdown has reached zero — fire the retry fetch
            caaDoRetry(entityPath);
        }
    }

    /**
     * Performs one retry fetch for `entityPath`.
     *
     *   • HTTP success  → populate cache, enrich all pending anchors (re-loads
     *                      artwork thumbnail via caaLoadIcon), delete state.
     *   • HTTP error    → definitive failure; mark all icons with red "?".
     *   • Network error → if retries remain, start the next countdown; otherwise
     *                      mark all icons with red "?".
     *
     * @param {string} entityPath
     */
    async function caaDoRetry(entityPath) {
        const state = _caaRetryState.get(entityPath);
        if (!state) return;

        Lib.debug('caa', 'caaRetry: attempt ' + state.attempts + ' for ' + entityPath);

        const apiUrl = 'https://coverartarchive.org' + entityPath;
        try {
            const resp = await caaGmFetch(apiUrl);
            if (!resp.ok) {
                // Definitive HTTP error — no point retrying
                Lib.debug('caa', 'caaRetry: HTTP ' + resp.status + ' for ' + entityPath + ' — giving up');
                caaMarkRetryFailed(entityPath);
                return;
            }
            const rgCaa = await resp.json();
            const count = Array.isArray(rgCaa.images) ? rgCaa.images.length : 0;
            _caaRgCountCache.set(entityPath, count);

            Lib.debug('caa', 'caaRetry: success for ' + entityPath + ' — ' + count +
                      ' image(s) after ' + state.attempts + ' attempt(s)');

            // Snapshot the anchor set before deleting state (enrichment callbacks
            // may re-enter caaEnrichReleaseGroupIcon which checks _caaRetryState).
            const pendingAnchors = Array.from(state.anchors);
            _caaRetryState.delete(entityPath);

            pendingAnchors.forEach(function(anchor) {
                if (!anchor.isConnected) return;
                // Re-load the artwork thumbnail (clears the countdown SVG overlay)
                const icon = anchor.querySelector('span.caa-icon, span.eaa-icon, span.artwork-icon');
                if (icon) caaLoadIcon(icon);
                // Re-run enrichment — result is now in cache, no extra network hit
                caaEnrichReleaseGroupIcon(anchor);
            });
        } catch (err) {
            Lib.debug('caa', 'caaRetry: fetch error for ' + entityPath +
                      ' (attempt ' + state.attempts + '):', err);
            if (state.attempts >= CAA_MAX_RETRIES) {
                caaMarkRetryFailed(entityPath);
            } else {
                state.attempts++;
                caaTickCountdown(entityPath, CAA_RETRY_DELAY_SECS);
            }
        }
    }

    /**
     * Entry point called from caaEnrichReleaseGroupIcon's catch block.
     *
     * Registers `anchor` in the retry queue for `entityPath`.  If a countdown
     * is already ticking (another anchor for the same path failed earlier), the
     * new anchor is simply added to the pending set and shown the current
     * countdown value — no second timer is started.
     *
     * @param {string}           entityPath
     * @param {HTMLAnchorElement} anchor
     */
    function caaScheduleRetry(entityPath, anchor) {
        let state = _caaRetryState.get(entityPath);

        if (!state) {
            state = {
                attempts:  1,
                anchors:   new Set(),
                timerId:   null,
                countdown: CAA_RETRY_DELAY_SECS
            };
            _caaRetryState.set(entityPath, state);
        }

        state.anchors.add(anchor);

        if (state.timerId !== null) {
            // A countdown is already running — just paint the current value on
            // this anchor's icon and return; do not start a second timer.
            const icon = anchor.querySelector('span.caa-icon, span.eaa-icon, span.artwork-icon');
            if (icon) caaSetRetryIndicator(icon, state.countdown);
            return;
        }

        Lib.debug('caa', 'caaRetry: scheduling retry #' + state.attempts +
                  ' for ' + entityPath + ' in ' + CAA_RETRY_DELAY_SECS + 's');
        caaTickCountdown(entityPath, CAA_RETRY_DELAY_SECS);
    }

    // ── end CAA fetch-retry infrastructure ───────────────────────────────────
