// ==UserScript==
// @name         VZ: MusicBrainz - Logger Library
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0.0
// @description  Unified logging library for MusicBrainz userscripts
// @author       Gemini (directed by vzell)
// @license      MIT
// ==/UserScript==

"use strict";

const MBLogger = (function() {
    return function(scriptName, debugEnabled = true) {
        return {
            prefix: `[${scriptName}]`,
            styles: {
                debug: 'color: #7f8c8d; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold;',
                info: 'color: #2980b9; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; font-size: 11px;',
                error: 'color: #c0392b; font-family: "Segoe UI", Tahoma, sans-serif; font-weight: bold; background: #fceae9; padding: 2px 4px; border-radius: 3px;',
                timer: 'color: #8e44ad; font-family: "Consolas", monospace; font-style: italic;'
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
                meta: '🎵'
            },
            log(level, icon, msg, data = '') {
                if (!debugEnabled && level === 'debug') return;
                const style = this.styles[level] || '';
                const iconChar = this.icons[icon] || '📝';
                console.log(`%c${this.prefix} ${iconChar} ${msg}`, style, data);
            },
            debug(icon, msg, data) { this.log('debug', icon, msg, data); },
            info(icon, msg, data) { this.log('info', icon, msg, data); },
            error(icon, msg, data) { this.log('error', 'error', msg, data); }
        };
    };
})();
