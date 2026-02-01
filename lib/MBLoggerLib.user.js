// ==UserScript==
// @name         VZ: MusicBrainz - Logger Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.1.0
// @description  Unified logging library with timestamps and performance timers
// @author       Gemini (directed by vzell)
// @license      MIT
// ==/UserScript==

"use strict";

const MBLogger = (function() {
    return function(scriptName, debugEnabled = true) {
        const timers = new Map();

        return {
            prefix: `[${scriptName}]`,
            styles: {
                debug: 'color: #7f8c8d; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold;',
                info: 'color: #2980b9; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; font-size: 11px;',
                error: 'color: #c0392b; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fceae9; padding: 2px 4px; border-radius: 3px;',
                timer: 'color: #8e44ad; font-family: "Consolas", monospace; font-style: italic; font-weight: bold;',
                timestamp: 'color: #95a5a6; font-size: 9px; font-weight: normal;'
            },
            icons: {
                init: '🚀',
                fetch: '📥',
                render: '🎨',
                filter: '🔍',
                sort: '⚖️',
                cleanup: '🧹',
                error: '❌',
                success: '✅',
                meta: '🎵',
                timer: '⏱️'
            },
            getTimestamp() {
                const now = new Date();
                return now.toISOString().split('T')[1].replace('Z', ''); // e.g., 14:20:05.123
            },
            log(level, icon, msg, data = '') {
                if (!debugEnabled && level === 'debug') return;
                const style = this.styles[level] || '';
                const iconChar = this.icons[icon] || '📝';
                const time = this.getTimestamp();

                console.log(
                    `%c${time} %c${this.prefix} ${iconChar} ${msg}`,
                    this.styles.timestamp,
                    style,
                    data
                );
            },
            // Performance Best Practice: Timers
            time(label) {
                timers.set(label, performance.now());
            },
            timeEnd(label, icon = 'timer') {
                const start = timers.get(label);
                if (start) {
                    const duration = (performance.now() - start).toFixed(2);
                    this.log('timer', icon, `${label}: ${duration}ms`);
                    timers.delete(label);
                }
            },
            debug(icon, msg, data) { this.log('debug', icon, msg, data); },
            info(icon, msg, data) { this.log('info', icon, msg, data); },
            error(icon, msg, data) { this.log('error', 'error', msg, data); }
        };
    };
})();
