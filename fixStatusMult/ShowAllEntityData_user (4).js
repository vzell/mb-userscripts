// ==UserScript==
// @name         VZ: MusicBrainz - Show All Entity Data In A Consolidated View
// @namespace    https://github.com/vzell/mb-userscripts
// @version      9.2.0+2026-02-15
// @description  Consolidation tool to accumulate paginated and non-paginated (tables with subheadings) MusicBrainz table lists (Events, Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting
// @author       Gemini (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllEntityData.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAllEntityData.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @require      https://cdn.jsdelivr.net/npm/@jaames/iro@5
// @require      file:///V:/home/vzell/git/mb-userscripts/lib/VZ_MBLibrary.user.js
// @match        *://*.musicbrainz.org/artist/*
// @match        *://*.musicbrainz.org/release-group/*
// @match        *://*.musicbrainz.org/release/*
// @match        *://*.musicbrainz.org/work/*
// @match        *://*.musicbrainz.org/recording/*
// @match        *://*.musicbrainz.org/label/*
// @match        *://*.musicbrainz.org/series/*
// @match        *://*.musicbrainz.org/place/*
// @match        *://*.musicbrainz.org/area/*
// @match        *://*.musicbrainz.org/instrument/*
// @match        *://*.musicbrainz.org/event/*
// @match        *://*.musicbrainz.org/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_download
// @license      MIT
// ==/UserScript==

/*
 * VZ: MusicBrainz - Show All Entity Data In A Consolidated View
 *
 * A userscript which accumulates paginated and non-paginated (tables with subheadings) MusicBrainz table lists (Events,
 * Recordings, Releases, Works, etc.) into a single view with real-time filtering and sorting.
 *
 * This script has been created by giving the right facts and asking the right questions to Gemini.
 * When Gemini gots stuck, I asked ChatGPT for help, until I got everything right.
 *
 * NOTICE: This script has only been tested with Tampermonkey (>=v5.4.1) on Vivaldi, Chrome and Firefox.
 */

// CHANGELOG
let changelog = [
    {version: '9.2.0+2026-02-15', description: 'Fix: Status display now correctly shows sorting/filtering results with table name and column info. Fixed ReferenceError that caused "Sort failed" and "Filtering..." to persist incorrectly.'},
    {version: '9.1.0+2026-02-15', description: 'Add new clear all filter button, global AND column level.'},
    {version: '9.0.0+2026-02-15', description: 'New status display handling, global and sorting/filtering related.'},
    {version: '8.0.0+2026-02-15', description: 'Function descriptions throughout.'},
    {version: '7.4.0+2026-02-14', description: 'New configuration dialog with sections and dividers. Make all UI features opinionated.'},
    {version: '7.3.2+2026-02-14', description: 'Fix: Resize handles now persist after clicking "Restore Width" button. Previously handles were removed during restore and not re-added, preventing further manual resizing. Now handles are automatically restored so users can continue resizing columns after restoration.'},
    {version: '7.3.1+2026-02-14', description: 'Fix: Manual column resizing now works correctly on initial page load. Fixed undefined variable bug that prevented drag-to-resize from functioning when resize handles were added automatically.'},
    {version: '7.3.0+2026-02-14', description: 'Enhancement: Manual column resizing now enabled immediately on page render - no need to click Auto-Resize first. Button labels improved: "👁️ Visible Columns" (was "Columns"), "Export 💾" (was "Export CSV"). Users can now drag column edges to resize as soon as table loads.'},
    {version: '7.2.0+2026-02-14', description: 'Feature: Added manual column resizing - drag column edges with mouse to adjust widths (like Excel/Sheets). Resize handles appear after auto-resize or when manually adjusting. Button changes to "Restore Width" during manual resizing. Restore button restores both auto-resized and manually adjusted columns to original state. Visual feedback with hover highlights and green active indicator.'},
    {version: '7.1.1+2026-02-14', description: 'Fix: Auto-Resize Columns now accurately measures cells with images, icons, and links. Previously used text-only measurement which caused columns with flag icons (like Country/Date) to be artificially wider. Now clones actual cell content preserving HTML structure for precise width calculation.'},
    {version: '7.1.0+2026-02-14', description: 'Enhancement: Auto-Resize Columns now has toggle functionality - click once to resize, click again to restore original widths. Button changes to "↔️ Restore Width" when active with green highlight. Original table state is preserved and fully restored including colgroup, table layout, and scroll settings.'},
    {version: '7.0.0+2026-02-13', description: 'Feature: Added Auto-Resize Columns - automatically calculates optimal column widths to prevent text wrapping. Click "↔️ Auto-Resize" to fit each column to its content. Enables horizontal scrolling in content area while keeping sidebar fixed. Perfect for wide tables with many columns.'},
    {version: '6.9.0+2026-02-13', description: 'Feature: Added Table Density Control - choose between Compact (fit more rows), Normal (balanced), or Comfortable (easier reading) spacing options using "📏 Density" button. Adjusts padding, font size, and line height for optimal viewing based on personal preference.'},
    {version: '6.8.0+2026-02-13', description: 'Feature: Added Quick Stats Panel - displays table statistics including row counts, column counts, filter status, memory usage, and more. Click "📊 Stats" button or any visible/hidden item counts. Perfect for understanding data at a glance.'},
    {version: '6.7.0+2026-02-13', description: 'Feature: Added keyboard shortcuts for power users - Ctrl+F (focus filter), Ctrl+Shift+F (clear filters), Ctrl+E (export CSV), Ctrl+S (save), Ctrl+L (load), Escape (clear focused filter), ?/slash (show help). Includes "⌨️ Shortcuts" help button.'},
    {version: '6.6.0+2026-02-13', description: 'Feature: Added CSV export - export visible rows and columns to CSV file using the "📥 Export CSV" button. Automatically generates filename with timestamp and page type. Perfect for using data in Excel, Google Sheets, or other applications.'},
    {version: '6.5.0+2026-02-13', description: 'UI: Added column visibility toggle - users can now show/hide individual columns using the "👁️ Columns" button. Includes Select All/Deselect All options for quick control. Perfect for customizing view and focusing on relevant data.'},
    {version: '6.4.0+2026-02-13', description: 'UI: Added sticky table headers - column headers and filter row remain visible while scrolling through large tables. Improves usability when working with thousands of rows.'},
    {version: '6.3.0+2026-02-13', description: 'Performance: Optimized table sorting with async chunked merge sort algorithm for large tables (>5000 rows). Added progress bar for sorts over 10k rows. Improved sort timing display with color-coded indicators. Better numeric column detection.'},
    {version: '6.2.0+2026-02-13', description: 'Performance: Added debounced filtering with configurable delay (default 300ms) to prevent UI freezing with large tables. Added filter timing display in status line showing execution time with color-coded performance indicators.'},
    {version: '6.1.0+2026-02-13', description: 'Fixed Regexp filtering with column filter when decorating symbols like "▶" are in front.'},
    {version: '6.0.0+2026-02-13', description: 'Fixed Regexp filtering with global filter not take into account each column separately.'},
    {version: '5.0.0+2026-02-13', description: 'Implemented a chunked renderer with progess updates when a configurable number of fetched rows is exceeded.'},
    {version: '4.5.0+2026-02-13', description: 'Add large dataset handling by directly offering for saving to disk instead of rendering.'},
    {version: '4.4.2+2026-02-13', description: 'Add popup dialog to enter prefilter string instead of showing it on the main page all the time.'},
    {version: '4.4.1+2026-02-12', description: 'Add highlightning of pre-filter expression.'},
    {version: '4.4.0+2026-02-12', description: 'Add "pre filter when loading" functionality.'},
    {version: '4.3.1+2026-02-12', description: 'Fix: Remove duplicate filter row when loading from disk. Fix: Restore alternating even/odd row backgrounds.'},
    {version: '4.3.0+2026-02-12', description: 'Add offline storage/cache feature: Save table data to disk and load from disk to avoid re-fetching from MusicBrainz.'},
    {version: '4.2.0+2026-02-11', description: 'Refactor removing columns with a removalMap object.'},
    {version: '4.1.0+2026-02-11', description: 'Pass a function to the library constructor that dynamically checks the debug logging flag.'},
    {version: '4.0.0+2026-02-11', description: 'Userscript renamed to better reflect current functionality.'},
    {version: '3.3.0+2026-02-11', description: 'Fix broken Aliases pages resulting in column misalignment.'},
    {version: '3.2.0+2026-02-10', description: 'Fix Artist-Aliases pages not rendering the "Artist credits" table with sorting/filtering.'},
    {version: '3.1.0+2026-02-10', description: 'Fix overflow tables for Area-Releases pages in the case of Relationship subtable.'},
    {version: '3.0.0+2026-02-10', description: 'Add support for Area-Releases pages with multiple different initial table data.'},
    {version: '2.7.0+2026-02-09', description: 'Transform search results paragraph into collapsible H2 header.'},
    {version: '2.6.0+2026-02-08', description: 'Add "Area splitting".'},
    {version: '2.5.1+2026-02-08', description: 'Fix URL construction to preserve query parameters (fixes Search pages). Added extra debugging for table detection.'},
    {version: '2.5.0+2026-02-08', description: 'Fix support for Search pages: target .pageselector-results instead of h2 for row counts/filters.'},
    {version: '2.4.0+2026-02-07', description: 'Fix detection of filtered MusicBrainz pages (link_type_id) to allow proper pagination instead of treating them as overview pages (e.g. Artist-Relationships.'},
    {version: '2.3.0+2026-02-05', description: 'Handle multitable pages of type "non_paginated" like Place-Performances.'},
    {version: '2.2.1+2026-02-04', description: 'Refactor column removal in final rendered table. Supports now "Release events" column from jesus2099 Super Mind Control script.'},
    {version: '2.2.0+2026-02-04', description: 'Support for "Show all Performances for Recordings".'},
    {version: '2.1.0+2026-02-04', description: 'Refactor the single- and multi-table on one page sorting functions.'},
    {version: '2.0.0+2026-02-03', description: 'Refactor the pageType detection.'},
    {version: '1.8.0+2026-02-03', description: 'Add support for RegExp filtering with an additional "Rx" checkbox.'},
    {version: '1.7.0+2026-02-02', description: 'Make sidebar collapse conditional on setting and only init after process completion.'},
    {version: '1.6.2+2026-02-02', description: 'Fix pageType Recording-Releases (button text was wrong).'},
    {version: '1.6.1+2026-02-02', description: 'Expose loggerInterface.prefix with getter/setter.'},
    {version: '1.6.0+2026-02-02', description: 'Add color picker for variables which represent a color.'},
    {version: '1.5.0+2026-02-01', description: 'Refactored settings, logging and changelog handling to a library.'},
    {version: '1.4.0+2026-02-01', description: 'Refactored settings to a schema-driven framework.'},
    {version: '1.3.0+2026-01-30', description: 'Implemented Ctrl+Click on headers to toggle all headers within the same container (sidebar vs main content).'},
    {version: '1.2.0+2026-01-30', description: 'Added collapsable sidebar functionality with a handle on the vertical line.'},
    {version: '1.1.0+2026-01-30', description: 'Increased the size of the filter input boxes and text. Several other small UI improvements.'},
    {version: '1.0.0+2026-01-30', description: 'Support "Official" and "Various Artists" on Artis-Releases pages.'},
    {version: '0.9.4+2026-01-29', description: 'Modernized logging framework with colors, icons, and structured levels.'},
    {version: '0.9.3+2026-01-29', description: 'Added visual progress bar with centered estimated time and dynamic coloring.'},
    {version: '0.9.2+2026-01-29', description: 'Show busy cursor for long running sort operations (> 1000 table rows)'},
    {version: '0.9.1+2026-01-29', description: 'Added "Esc" key handling for clearing the filter fields when focused; Added "ChangeLog" userscript manager menu entry.'},
    {version: '0.9.0+2026-01-28', description: '1st official release version.'}
];

(function() {
    'use strict';

    /**
     * Debounce utility function - delays execution until after wait milliseconds have elapsed
     * since the last time the debounced function was invoked.
     * @param {Function} func - The function to debounce
     * @param {number} wait - The number of milliseconds to delay
     * @param {boolean} immediate - If true, trigger the function on the leading edge instead of trailing
     * @returns {Function} The debounced function
     */
    function debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    /**
     * Optimized sorting for large arrays using a stable, in-place sort with chunking
     * @param {Array} array - Array to sort
     * @param {Function} compareFn - Comparison function
     * @param {Function} progressCallback - Optional callback for progress updates (percent)
     * @returns {Promise<Array>} Sorted array
     */
    async function sortLargeArray(array, compareFn, progressCallback) {
        const size = array.length;

        // For small arrays, use native sort
        if (size < 1000) {
            array.sort(compareFn);
            return array;
        }

        // For medium arrays, use native sort with yield
        if (size < 5000) {
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
            array.sort(compareFn);
            return array;
        }

        // For large arrays, use Tim Sort (merge sort variant) with chunking
        // This provides stable O(n log n) performance with better cache locality
        const chunkSize = Math.min(Lib.settings.sa_sort_chunk_size || 5000, size);

        // Step 1: Sort chunks
        const numChunks = Math.ceil(size / chunkSize);
        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, size);
            const chunk = array.slice(start, end);
            chunk.sort(compareFn);

            // Copy sorted chunk back
            for (let j = 0; j < chunk.length; j++) {
                array[start + j] = chunk[j];
            }

            if (progressCallback) {
                const progress = Math.round((i + 1) / numChunks * 50); // First 50% is chunk sorting
                progressCallback(progress);
            }

            // Yield to UI every chunk
            if (i % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Step 2: Merge sorted chunks
        let currentSize = chunkSize;
        let mergeStep = 0;
        const maxMergeSteps = Math.ceil(Math.log2(numChunks));

        while (currentSize < size) {
            for (let start = 0; start < size; start += currentSize * 2) {
                const mid = Math.min(start + currentSize, size);
                const end = Math.min(start + currentSize * 2, size);

                if (mid < end) {
                    merge(array, start, mid, end, compareFn);
                }
            }

            mergeStep++;
            if (progressCallback) {
                const progress = 50 + Math.round((mergeStep / maxMergeSteps) * 50); // Last 50% is merging
                progressCallback(progress);
            }

            currentSize *= 2;

            // Yield to UI
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return array;
    }

    /**
     * Merge two sorted portions of an array
     * @param {Array} array - The array
     * @param {number} start - Start index of first portion
     * @param {number} mid - End index of first portion (start of second)
     * @param {number} end - End index of second portion
     * @param {Function} compareFn - Comparison function
     */
    function merge(array, start, mid, end, compareFn) {
        const left = array.slice(start, mid);
        const right = array.slice(mid, end);

        let i = 0, j = 0, k = start;

        while (i < left.length && j < right.length) {
            if (compareFn(left[i], right[j]) <= 0) {
                array[k++] = left[i++];
            } else {
                array[k++] = right[j++];
            }
        }

        while (i < left.length) {
            array[k++] = left[i++];
        }

        while (j < right.length) {
            array[k++] = right[j++];
        }
    }

    /**
     * Create a comparison function for table sorting
     * @param {number} index - Column index
     * @param {boolean} isAscending - Sort direction
     * @param {boolean} isNumeric - Whether to use numeric comparison
     * @returns {Function} Comparison function
     */
    function createSortComparator(index, isAscending, isNumeric) {
        return (a, b) => {
            const valA = getCleanVisibleText(a.cells[index]).trim().toLowerCase() || '';
            const valB = getCleanVisibleText(b.cells[index]).trim().toLowerCase() || '';

            if (isNumeric) {
                const numA = parseFloat(valA.replace(/[^0-9.-]/g, '')) || 0;
                const numB = parseFloat(valB.replace(/[^0-9.-]/g, '')) || 0;
                return isAscending ? numA - numB : numB - numA;
            }

            const result = valA.localeCompare(valB, undefined, {numeric: true, sensitivity: 'base'});
            return isAscending ? result : -result;
        };
    }

    /**
     * Apply sticky headers to tables so column headers remain visible while scrolling
     * Includes proper styling for the header row and filter row
     */
    /**
     * Applies sticky positioning to table headers so they remain visible while scrolling
     * Adds CSS styles that make both the main header row and filter row stick to the top of the viewport
     */
    function applyStickyHeaders() {
        // Check if styles already added
        if (document.getElementById('mb-sticky-headers-style')) {
            Lib.debug('ui', 'Sticky headers styles already applied');
            return;
        }

        const style = document.createElement('style');
        style.id = 'mb-sticky-headers-style';
        style.textContent = `
            /* Sticky headers for main table */
            table.tbl {
                position: relative;
            }

            table.tbl thead {
                position: sticky;
                top: 0;
                z-index: 100;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            table.tbl thead th {
                background: white;
                border-bottom: 2px solid #ddd;
                /* Ensure proper layering for sort icons */
                position: relative;
            }

            /* Ensure filter row also sticks, positioned below the header row */
            table.tbl thead tr.mb-col-filter-row {
                position: sticky;
                /* Adjust this value based on your header row height */
                /* Default MusicBrainz header is about 30px */
                top: 30px;
                background: #f5f5f5;
                z-index: 99;
            }

            table.tbl thead tr.mb-col-filter-row th {
                background: #f5f5f5;
                border-top: 1px solid #ddd;
            }

            /* Ensure proper display during scrolling */
            table.tbl thead th,
            table.tbl thead tr.mb-col-filter-row th {
                /* Prevent visual glitches during scroll */
                will-change: transform;
            }

            /* Optional: Add a subtle shadow to filter row as well */
            table.tbl thead tr.mb-col-filter-row {
                box-shadow: 0 2px 3px rgba(0,0,0,0.05);
            }
        `;

        document.head.appendChild(style);
        Lib.info('ui', 'Sticky headers enabled - column headers will remain visible while scrolling');
    }

    /**
     * Toggle visibility of a specific column in a table
     * @param {HTMLTableElement} table - The table element
     * @param {number} columnIndex - Zero-based column index
     * @param {boolean} show - True to show, false to hide
     */
    function toggleColumn(table, columnIndex, show) {
        const display = show ? '' : 'none';

        // Toggle header cells in all header rows (main header + filter row)
        const headers = table.querySelectorAll('thead tr');
        headers.forEach(row => {
            if (row.cells[columnIndex]) {
                row.cells[columnIndex].style.display = display;
            }
        });

        // Toggle all cells in the column for all body rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.cells[columnIndex]) {
                row.cells[columnIndex].style.display = display;
            }
        });

        Lib.debug('ui', `Column ${columnIndex} ${show ? 'shown' : 'hidden'}`);
    }

    /**
     * Add a column visibility toggle button and menu to the controls
     * Allows users to show/hide columns in the table
     * @param {HTMLTableElement} table - The table to add controls for
     */
    function addColumnVisibilityToggle(table) {
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '👁️ Visible Columns';
        toggleBtn.title = 'Show/hide table columns';
        toggleBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        toggleBtn.type = 'button';

        // Create dropdown menu container
        const menu = document.createElement('div');
        menu.className = 'mb-column-visibility-menu';
        menu.style.cssText = `
            display: none;
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-height: 400px;
            overflow-y: auto;
            min-width: 200px;
        `;

        // Get headers from the first row (skip filter row)
        const headerRow = table.querySelector('thead tr:first-child');
        if (!headerRow) {
            Lib.warn('ui', 'No header row found for column visibility toggle');
            return;
        }

        const headers = Array.from(headerRow.cells);

        // Store checkbox states
        const checkboxes = [];

        // Create checkbox for each column
        headers.forEach((th, index) => {
            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            if (!colName) return; // Skip empty headers

            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'margin: 5px 0; white-space: nowrap; display: flex; align-items: center;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.id = `mb-col-vis-${index}`;
            checkbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
            checkbox.dataset.columnIndex = index;

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = colName;
            label.style.cssText = 'cursor: pointer; user-select: none; flex: 1;';

            checkbox.addEventListener('change', () => {
                toggleColumn(table, index, checkbox.checked);

                // Count visible columns
                const visibleCount = checkboxes.filter(cb => cb.checked).length;
                Lib.info('ui', `Column "${colName}" ${checkbox.checked ? 'shown' : 'hidden'}. ${visibleCount}/${checkboxes.length} columns visible`);
            });

            checkboxes.push(checkbox);

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            menu.appendChild(wrapper);
        });

        // Add separator
        const separator = document.createElement('div');
        separator.style.cssText = 'margin: 10px 0; padding-top: 10px; border-top: 1px solid #ddd;';
        menu.appendChild(separator);

        // Add "Select All" / "Deselect All" buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 5px;';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.textContent = 'Select All';
        selectAllBtn.style.cssText = 'font-size: 0.8em; padding: 4px 8px; cursor: pointer; flex: 1; border-radius: 3px;';
        selectAllBtn.type = 'button';
        selectAllBtn.onclick = (e) => {
            e.stopPropagation();
            checkboxes.forEach(cb => {
                if (!cb.checked) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change'));
                }
            });
        };

        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.textContent = 'Deselect All';
        deselectAllBtn.style.cssText = 'font-size: 0.8em; padding: 4px 8px; cursor: pointer; flex: 1; border-radius: 3px;';
        deselectAllBtn.type = 'button';
        deselectAllBtn.onclick = (e) => {
            e.stopPropagation();
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    cb.checked = false;
                    cb.dispatchEvent(new Event('change'));
                }
            });
        };

        buttonRow.appendChild(selectAllBtn);
        buttonRow.appendChild(deselectAllBtn);
        menu.appendChild(buttonRow);

        // Toggle menu visibility
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = menu.style.display === 'block';

            if (isVisible) {
                menu.style.display = 'none';
            } else {
                menu.style.display = 'block';

                // Position menu below button
                const rect = toggleBtn.getBoundingClientRect();
                menu.style.top = `${rect.bottom + 5}px`;
                menu.style.left = `${rect.left}px`;
            }
        };

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== toggleBtn) {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('click', closeMenu);

        // Close menu on Escape key
        const closeMenuOnEscape = (e) => {
            if (e.key === 'Escape' && menu.style.display === 'block') {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('keydown', closeMenuOnEscape);

        // Append to controls container
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (controlsContainer) {
            controlsContainer.appendChild(toggleBtn);
            Lib.info('ui', 'Column visibility toggle added to controls');
        } else {
            Lib.warn('ui', 'Controls container not found, cannot add column visibility toggle');
        }

        // Append menu to body
        document.body.appendChild(menu);
    }

    /**
     * Export table data to CSV format
     * Exports only visible rows and columns
     * Generates filename with timestamp and page type
     */
    function exportTableToCSV() {
        const table = document.querySelector('table.tbl');
        if (!table) {
            alert('No table found to export');
            Lib.error('export', 'No table found for CSV export');
            return;
        }

        Lib.info('export', 'Starting CSV export...');

        const rows = [];
        let totalCells = 0;

        // Get headers from first row
        const headerRow = table.querySelector('thead tr:first-child');
        if (headerRow) {
            const headers = [];
            Array.from(headerRow.cells).forEach(cell => {
                // Skip hidden columns
                if (cell.style.display === 'none') return;

                // Clean header text (remove sort icons)
                let headerText = cell.textContent.replace(/[⇅▲▼]/g, '').trim();
                // Remove extra whitespace
                headerText = headerText.replace(/\s+/g, ' ');
                headers.push(headerText);
            });
            rows.push(headers);
            totalCells += headers.length;
            Lib.debug('export', `Exported ${headers.length} headers: ${headers.join(', ')}`);
        }

        // Get data rows (only visible ones)
        const dataRows = table.querySelectorAll('tbody tr');
        let rowsExported = 0;
        let rowsSkipped = 0;

        dataRows.forEach(row => {
            // Skip hidden rows (filtered out)
            if (row.style.display === 'none') {
                rowsSkipped++;
                return;
            }

            const cells = [];
            Array.from(row.cells).forEach((cell, index) => {
                // Skip hidden columns
                if (cell.style.display === 'none') return;

                // Get text content and clean it up
                let text = cell.textContent.trim();

                // Remove extra whitespace
                text = text.replace(/\s+/g, ' ');

                // Escape quotes (CSV standard: " becomes "")
                text = text.replace(/"/g, '""');

                // Wrap in quotes if contains comma, newline, or quote
                if (text.includes(',') || text.includes('\n') || text.includes('"')) {
                    text = `"${text}"`;
                }

                cells.push(text);
            });

            if (cells.length > 0) {
                rows.push(cells);
                totalCells += cells.length;
                rowsExported++;
            }
        });

        Lib.info('export', `Exported ${rowsExported} data rows, skipped ${rowsSkipped} hidden rows`);

        // Create CSV string
        const csv = rows.map(row => row.join(',')).join('\n');

        // Create Blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const pageName = pageType || 'table';
        const filename = `musicbrainz-${pageName}-${timestamp}.csv`;
        link.download = filename;

        // Trigger download
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);

        // Update status
        const statusDisplay = document.getElementById('mb-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = `✓ Exported ${rowsExported} rows to ${filename}`;
            statusDisplay.style.color = 'green';
        }

        Lib.info('export', `CSV export complete: ${filename} (${rowsExported} rows, ${totalCells} cells)`);

        // --- INFO POPUP TO ALERT USER (WITH FADE OUT) ---
        const infoPopup = document.createElement('div');
        infoPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #888;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            font-family: sans-serif;
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        const msg = document.createElement('div');
        msg.textContent = 'CSV export complete. Please monitor your browser for the file download.';
        msg.style.marginBottom = '15px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid #555;
            background-color: #f0f0f0;
        `;
        closeBtn.type = 'button';

        // Close function with fade out
        const closePopup = () => {
            infoPopup.style.opacity = '0';
            // Remove from DOM after transition
            setTimeout(() => {
                if (infoPopup.parentNode) infoPopup.parentNode.removeChild(infoPopup);
                document.removeEventListener('keydown', onEscape);
            }, 300); // match the CSS transition duration
        };

        // Button click closes popup
        closeBtn.addEventListener('click', closePopup);

        // Escape key closes popup
        const onEscape = (e) => {
            if (e.key === 'Escape') closePopup();
        };
        document.addEventListener('keydown', onEscape);

        infoPopup.appendChild(msg);
        infoPopup.appendChild(closeBtn);
        document.body.appendChild(infoPopup);
    }

    /**
     * Add export to CSV button to the controls
     */
    function addExportButton() {
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export to CSV 💾';
        exportBtn.title = 'Export visible rows and columns to CSV file';
        exportBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        exportBtn.type = 'button';
        exportBtn.onclick = exportTableToCSV;

        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (controlsContainer) {
            controlsContainer.appendChild(exportBtn);
            Lib.info('ui', 'Export CSV button added to controls');
        } else {
            Lib.warn('ui', 'Controls container not found, cannot add export button');
        }
    }

    /**
     * Clear all filters (global and column filters)
     */
    function clearAllFilters() {
        // Clear global filter
        const filterInput = document.querySelector('#mb-show-all-controls-container input[placeholder*="Global Filter"]');
        if (filterInput) {
            filterInput.value = '';
        }

        // Clear all column filters
        document.querySelectorAll('.mb-col-filter-input').forEach(input => {
            input.value = '';
        });

        // Re-run filter to update display
        if (typeof runFilter === 'function') {
            runFilter();
        }

        Lib.info('shortcuts', 'All filters cleared');

        // Show feedback in status
        const statusDisplay = document.getElementById('mb-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = '✓ All filters cleared';
            statusDisplay.style.color = 'green';
        }
    }

    /**
     * Show keyboard shortcuts help dialog
     */
    function showShortcutsHelp() {
        const helpText = `
🎹 Keyboard Shortcuts:

Filter & Search:
  Ctrl/Cmd + F         Focus global filter
  Ctrl/Cmd + Shift + F Clear all filters
  Escape               Clear focused filter

Data Export & Management:
  Ctrl/Cmd + E         Export to CSV
  Ctrl/Cmd + S         Save to disk (JSON)
  Ctrl/Cmd + L         Load from disk

Settings:
  Ctrl/Cmd + ,         Open settings dialog

Help:
  ? or /               Show this help

Note: Shortcuts work when not typing in input fields
        `.trim();

        const existing = document.getElementById('mb-shortcuts-help');
        if (existing) {
            existing.remove();
            return;
        }

        const helpDiv = document.createElement('div');
        helpDiv.id = 'mb-shortcuts-help';
        helpDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.92);
            color: white;
            padding: 25px 35px;
            border-radius: 10px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            white-space: pre-line;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            max-width: 500px;
            line-height: 1.6;
        `;
        helpDiv.textContent = helpText;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Close';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 4px 12px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.9em;
            transition: background 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        closeBtn.onclick = () => helpDiv.remove();

        helpDiv.appendChild(closeBtn);
        document.body.appendChild(helpDiv);

        // Close on Escape
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                helpDiv.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);

        // Close on click outside (after a short delay to prevent immediate close)
        setTimeout(() => {
            const closeOnClickOutside = (e) => {
                if (!helpDiv.contains(e.target)) {
                    helpDiv.remove();
                    document.removeEventListener('click', closeOnClickOutside);
                }
            };
            document.addEventListener('click', closeOnClickOutside);
        }, 100);

        Lib.info('shortcuts', 'Keyboard shortcuts help displayed');
    }

    /**
     * Initialize keyboard shortcuts for common actions
     * Provides power-user functionality for quick access to features
     */
    function initKeyboardShortcuts() {
        // Prevent duplicate initialization
        if (document._mbKeyboardShortcutsInitialized) {
            Lib.debug('shortcuts', 'Keyboard shortcuts already initialized');
            return;
        }

        document.addEventListener('keydown', (e) => {
            // Don't intercept if user is typing in an input or textarea
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            // Exception: Escape key works even in inputs (to clear them)
            if (e.key !== 'Escape' && isTyping) {
                return;
            }

            // Ctrl/Cmd + , : Open settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                Lib.showSettings();
                Lib.debug('shortcuts', 'Settings dialog opened via Ctrl+,');
            }

            // Ctrl/Cmd + F: Focus global filter
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const filterInput = document.querySelector('#mb-show-all-controls-container input[placeholder*="Global Filter"]');
                if (filterInput) {
                    filterInput.focus();
                    filterInput.select();
                    Lib.debug('shortcuts', 'Global filter focused via Ctrl+F');
                }
            }

            // Ctrl/Cmd + Shift + F: Clear all filters
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                clearAllFilters();
            }

            // Ctrl/Cmd + E: Export to CSV
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                exportTableToCSV();
                Lib.debug('shortcuts', 'CSV export triggered via Ctrl+E');
            }

            // Ctrl/Cmd + S: Save to disk (JSON)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const saveBtn = document.querySelector('button[title*="Save current table data"]');
                if (saveBtn) {
                    saveBtn.click();
                    Lib.debug('shortcuts', 'Save to disk triggered via Ctrl+S');
                } else {
                    Lib.warn('shortcuts', 'Save button not found');
                }
            }

            // Ctrl/Cmd + L: Load from disk
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                const loadBtn = document.querySelector('button[title*="Load table data from disk"]');
                if (loadBtn) {
                    loadBtn.click();
                    Lib.debug('shortcuts', 'Load from disk triggered via Ctrl+L');
                } else {
                    Lib.warn('shortcuts', 'Load button not found');
                }
            }

            // Escape: Clear focused filter
            if (e.key === 'Escape' && isTyping) {
                if (e.target.classList.contains('mb-col-filter-input')) {
                    e.target.value = '';
                    runFilter();
                    Lib.debug('shortcuts', 'Column filter cleared via Escape');
                } else if (e.target.placeholder && e.target.placeholder.includes('Global Filter')) {
                    e.target.value = '';
                    runFilter();
                    Lib.debug('shortcuts', 'Global filter cleared via Escape');
                }
            }

            // ? or /: Show shortcuts help
            if ((e.key === '?' || e.key === '/') && !isTyping) {
                e.preventDefault();
                showShortcutsHelp();
            }
        });

        document._mbKeyboardShortcutsInitialized = true;
        Lib.info('shortcuts', 'Keyboard shortcuts initialized');
    }

    /**
     * Add keyboard shortcuts help button to UI
     */
    function addShortcutsHelpButton() {
        const helpBtn = document.createElement('button');
        helpBtn.textContent = '⌨️ Shortcuts';
        helpBtn.title = 'Show keyboard shortcuts (or press ?)';
        helpBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        helpBtn.type = 'button';
        helpBtn.onclick = showShortcutsHelp;

        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (controlsContainer) {
            controlsContainer.appendChild(helpBtn);
            Lib.info('ui', 'Keyboard shortcuts help button added to controls');
        } else {
            Lib.warn('ui', 'Controls container not found, cannot add shortcuts help button');
        }
    }

    /**
     * Show table statistics panel
     * Displays useful information about the current table state
     */
    function showStatsPanel() {
        // Check if panel already exists (toggle behavior)
        const existing = document.getElementById('mb-stats-panel');
        if (existing) {
            existing.remove();
            return;
        }

        const table = document.querySelector('table.tbl');
        if (!table) {
            alert('No table found to show statistics');
            Lib.warn('stats', 'No table found for statistics panel');
            return;
        }

        // Collect statistics
        const allRows = table.querySelectorAll('tbody tr');
        const visibleRows = Array.from(allRows).filter(r => r.style.display !== 'none');
        const headers = table.querySelectorAll('thead th');

        // Count visible columns
        const visibleColumns = Array.from(headers).filter(h => h.style.display !== 'none').length;
        const totalColumns = headers.length;

        // Calculate memory estimate (rough)
        const avgRowSize = 100; // bytes per row (rough estimate)
        const memoryKB = Math.round(allRows.length * avgRowSize / 1024);

        // Get filter status
        const globalFilterInput = document.querySelector('#mb-show-all-controls-container input[placeholder*="Global Filter"]');
        const globalFilter = globalFilterInput?.value || '';
        const columnFilters = Array.from(document.querySelectorAll('.mb-col-filter-input'))
            .filter(inp => inp.value)
            .length;

        // Calculate percentages
        const rowPercentage = allRows.length > 0
            ? Math.round((visibleRows.length / allRows.length) * 100)
            : 100;
        const colPercentage = totalColumns > 0
            ? Math.round((visibleColumns / totalColumns) * 100)
            : 100;

        // Count hidden items
        const hiddenRows = allRows.length - visibleRows.length;
        const hiddenColumns = totalColumns - visibleColumns;

        // Create panel
        const statsPanel = document.createElement('div');
        statsPanel.id = 'mb-stats-panel';
        statsPanel.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: white;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 0.9em;
            min-width: 280px;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        statsPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                <strong style="font-size: 1.1em; color: #4CAF50;">📊 Table Statistics</strong>
                <button id="mb-stats-close" style="background: none; border: none; font-size: 1.3em; cursor: pointer; color: #666; padding: 0; line-height: 1;">✕</button>
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px 15px; line-height: 1.8;">
                <div style="font-weight: 600;">Total Rows:</div>
                <div>${allRows.length.toLocaleString()}</div>

                <div style="font-weight: 600;">Visible Rows:</div>
                <div>${visibleRows.length.toLocaleString()} <span style="color: #666; font-size: 0.9em;">(${rowPercentage}%)</span></div>

                <div style="font-weight: 600;">Filtered Out:</div>
                <div style="color: ${hiddenRows > 0 ? '#f44336' : '#666'};">${hiddenRows.toLocaleString()}</div>

                <div style="font-weight: 600;">Total Columns:</div>
                <div>${totalColumns}</div>

                <div style="font-weight: 600;">Visible Columns:</div>
                <div>${visibleColumns} <span style="color: #666; font-size: 0.9em;">(${colPercentage}%)</span></div>

                <div style="font-weight: 600;">Hidden Columns:</div>
                <div style="color: ${hiddenColumns > 0 ? '#f44336' : '#666'};">${hiddenColumns}</div>

                <div style="font-weight: 600;">Memory Usage:</div>
                <div>~${memoryKB.toLocaleString()} KB</div>

                <div style="font-weight: 600;">Global Filter:</div>
                <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${globalFilter}">${globalFilter ? `"${globalFilter}"` : '<em style="color: #999;">none</em>'}</div>

                <div style="font-weight: 600;">Column Filters:</div>
                <div>${columnFilters || 0} active</div>

                <div style="font-weight: 600;">Page Type:</div>
                <div style="font-family: monospace; font-size: 0.85em;">${pageType || 'unknown'}</div>
            </div>
            <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 0.85em; color: #666; text-align: center;">
                Click outside or press Escape to close
            </div>
        `;

        document.body.appendChild(statsPanel);

        // Close button handler
        document.getElementById('mb-stats-close').onclick = () => {
            statsPanel.remove();
        };

        // Close on Escape
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                statsPanel.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);

        // Close on click outside (after a short delay)
        setTimeout(() => {
            const closeOnClickOutside = (e) => {
                if (!statsPanel.contains(e.target)) {
                    statsPanel.remove();
                    document.removeEventListener('click', closeOnClickOutside);
                }
            };
            document.addEventListener('click', closeOnClickOutside);
        }, 100);

        Lib.info('stats', `Statistics panel displayed: ${visibleRows.length}/${allRows.length} rows, ${visibleColumns}/${totalColumns} columns`);
    }

    /**
     * Add statistics panel button to UI
     */
    function addStatsButton() {
        const statsBtn = document.createElement('button');
        statsBtn.textContent = '📊 Stats';
        statsBtn.title = 'Show table statistics';
        statsBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        statsBtn.type = 'button';
        statsBtn.onclick = showStatsPanel;

        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (controlsContainer) {
            controlsContainer.appendChild(statsBtn);
            Lib.info('ui', 'Stats button added to controls');
        } else {
            Lib.warn('ui', 'Controls container not found, cannot add stats button');
        }
    }

    /**
     * Table density configurations
     * Defines padding, font size, and line height for different density levels
     */
    const densityOptions = {
        compact: {
            label: 'Compact',
            padding: '2px 6px',
            fontSize: '0.85em',
            lineHeight: '1.2',
            description: 'Tight spacing - fits more rows on screen'
        },
        normal: {
            label: 'Normal',
            padding: '4px 8px',
            fontSize: '1em',
            lineHeight: '1.5',
            description: 'Default spacing - balanced view'
        },
        comfortable: {
            label: 'Comfortable',
            padding: '8px 12px',
            fontSize: '1em',
            lineHeight: '1.8',
            description: 'Relaxed spacing - easier to read'
        }
    };

    // Track current density (default is normal)
    let currentDensity = 'normal';

    /**
     * Apply density settings to table
     * @param {string} densityKey - Key from densityOptions (compact, normal, comfortable)
     */
    function applyTableDensity(densityKey) {
        if (!densityOptions[densityKey]) {
            Lib.warn('density', `Unknown density option: ${densityKey}`);
            return;
        }

        const config = densityOptions[densityKey];
        const tables = document.querySelectorAll('table.tbl');

        if (tables.length === 0) {
            Lib.warn('density', 'No tables found to apply density');
            return;
        }

        tables.forEach(table => {
            // Apply to all cells (headers and data)
            table.querySelectorAll('td, th').forEach(cell => {
                cell.style.padding = config.padding;
                cell.style.fontSize = config.fontSize;
                cell.style.lineHeight = config.lineHeight;
            });
        });

        currentDensity = densityKey;

        // Update status display
        const statusDisplay = document.getElementById('mb-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = `✓ Table density: ${config.label}`;
            statusDisplay.style.color = 'green';
        }

        Lib.info('density', `Applied ${config.label} density to ${tables.length} table(s)`);
    }

    /**
     * Show table density menu and add density control button
     */
    function addDensityControl() {
        // Create button
        const densityBtn = document.createElement('button');
        densityBtn.textContent = '📏 Density';
        densityBtn.title = 'Change table density (spacing)';
        densityBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        densityBtn.type = 'button';

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'mb-density-menu';
        menu.style.cssText = `
            display: none;
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 220px;
        `;

        // Create menu header
        const menuHeader = document.createElement('div');
        menuHeader.style.cssText = 'font-weight: 600; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #ddd; color: #333;';
        menuHeader.textContent = 'Table Density';
        menu.appendChild(menuHeader);

        // Create option for each density
        Object.entries(densityOptions).forEach(([key, config]) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.style.cssText = `
                display: block;
                width: 100%;
                padding: 8px 12px;
                margin: 3px 0;
                cursor: pointer;
                border: 1px solid #ddd;
                background: white;
                text-align: left;
                border-radius: 4px;
                transition: all 0.2s;
            `;

            // Create label with icon
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = 'font-weight: 600; margin-bottom: 2px;';
            labelDiv.textContent = config.label;

            // Create description
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size: 0.85em; color: #666;';
            descDiv.textContent = config.description;

            option.appendChild(labelDiv);
            option.appendChild(descDiv);

            // Highlight current selection
            if (key === currentDensity) {
                option.style.background = '#e8f5e9';
                option.style.borderColor = '#4CAF50';
                option.style.fontWeight = '600';
            }

            // Hover effect
            option.onmouseover = () => {
                if (key !== currentDensity) {
                    option.style.background = '#f5f5f5';
                }
            };
            option.onmouseout = () => {
                if (key !== currentDensity) {
                    option.style.background = 'white';
                }
            };

            // Click handler
            option.onclick = () => {
                applyTableDensity(key);
                menu.style.display = 'none';

                // Update button styles
                menu.querySelectorAll('button').forEach(btn => {
                    btn.style.background = 'white';
                    btn.style.borderColor = '#ddd';
                    btn.style.fontWeight = 'normal';
                });
                option.style.background = '#e8f5e9';
                option.style.borderColor = '#4CAF50';
                option.style.fontWeight = '600';
            };

            menu.appendChild(option);
        });

        // Toggle menu visibility
        densityBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = menu.style.display === 'block';

            if (isVisible) {
                menu.style.display = 'none';
            } else {
                menu.style.display = 'block';

                // Position menu below button
                const rect = densityBtn.getBoundingClientRect();
                menu.style.top = `${rect.bottom + 5}px`;
                menu.style.left = `${rect.left}px`;
            }
        };

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== densityBtn) {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('click', closeMenu);

        // Close menu on Escape key
        const closeMenuOnEscape = (e) => {
            if (e.key === 'Escape' && menu.style.display === 'block') {
                menu.style.display = 'none';
            }
        };
        document.addEventListener('keydown', closeMenuOnEscape);

        // Append to controls container
        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (controlsContainer) {
            controlsContainer.appendChild(densityBtn);
            Lib.info('ui', 'Density control button added to controls');
        } else {
            Lib.warn('ui', 'Controls container not found, cannot add density button');
        }

        // Append menu to body
        document.body.appendChild(menu);
    }

    // Track auto-resize state
    let isAutoResized = false;
    let isManuallyResized = false;
    const originalTableStates = new Map(); // Store original states per table

    /**
     * Make table columns resizable with mouse drag
     * Adds resize handles to column headers
     * @param {HTMLTableElement} table - The table to make resizable
     */
    function makeColumnsResizable(table) {
        const headers = table.querySelectorAll('thead tr:first-child th');

        headers.forEach((th, index) => {
            // Skip if already has resizer
            if (th.querySelector('.column-resizer')) return;

            // Create resize handle
            const resizer = document.createElement('div');
            resizer.className = 'column-resizer';
            resizer.style.cssText = `
                position: absolute;
                right: 0;
                top: 0;
                width: 8px;
                height: 100%;
                cursor: col-resize;
                user-select: none;
                z-index: 1;
                background: transparent;
            `;

            // Visual indicator on hover
            resizer.addEventListener('mouseenter', () => {
                resizer.style.background = 'rgba(0, 0, 0, 0.1)';
            });
            resizer.addEventListener('mouseleave', () => {
                if (!resizer.classList.contains('resizing')) {
                    resizer.style.background = 'transparent';
                }
            });

            let startX, startWidth, colIndex;

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                startX = e.pageX;
                startWidth = th.offsetWidth;
                colIndex = index;

                resizer.classList.add('resizing');
                resizer.style.background = 'rgba(76, 175, 80, 0.3)';

                // Store original state if not already stored
                if (!isManuallyResized && !isAutoResized) {
                    // Get all tables and store their states
                    const allTables = document.querySelectorAll('table.tbl');
                    allTables.forEach(tbl => {
                        originalTableStates.set(tbl, storeOriginalTableState(tbl));
                    });
                }

                isManuallyResized = true;

                // Update button to show restore option
                updateResizeButtonState(true);

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);

                // Prevent text selection during resize
                document.body.style.userSelect = 'none';

                Lib.debug('resize', `Started resizing column ${colIndex} from width ${startWidth}px`);
            });

            function onMouseMove(e) {
                const delta = e.pageX - startX;
                const newWidth = Math.max(30, startWidth + delta); // Min width 30px

                // Apply width to the column
                setColumnWidth(table, colIndex, newWidth);
            }

            function onMouseUp(e) {
                resizer.classList.remove('resizing');
                resizer.style.background = 'transparent';

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Re-enable text selection
                document.body.style.userSelect = '';

                const finalWidth = th.offsetWidth;
                Lib.info('resize', `Finished resizing column ${colIndex} to ${finalWidth}px`);

                // Update status
                const statusDisplay = document.getElementById('mb-status-display');
                if (statusDisplay) {
                    statusDisplay.textContent = `✓ Column ${colIndex + 1} resized to ${finalWidth}px`;
                    statusDisplay.style.color = 'green';
                }
            }

            // Make th position relative for absolute positioning of resizer
            th.style.position = 'relative';
            th.appendChild(resizer);
        });

        Lib.info('resize', `Made ${headers.length} columns resizable`);
    }

    /**
     * Set width for a specific column across all rows
     * @param {HTMLTableElement} table - The table
     * @param {number} colIndex - Column index
     * @param {number} width - Width in pixels
     */
    function setColumnWidth(table, colIndex, width) {
        // Ensure table has fixed layout
        table.style.tableLayout = 'fixed';

        // Use colgroup for efficient column sizing
        let colgroup = table.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            table.insertBefore(colgroup, table.firstChild);

            // Create col elements for all columns
            const firstRow = table.querySelector('tbody tr');
            const colCount = firstRow ? firstRow.cells.length : 0;
            for (let i = 0; i < colCount; i++) {
                const col = document.createElement('col');
                colgroup.appendChild(col);
            }
        }

        // Set width on the specific col element
        const cols = colgroup.querySelectorAll('col');
        if (cols[colIndex]) {
            cols[colIndex].style.width = `${width}px`;
        }
    }

    /**
     * Update resize button state to reflect manual/auto resize status
     * @param {boolean} isResized - Whether table is currently resized
     */
    function updateResizeButtonState(isResized) {
        const resizeBtn = document.querySelector('button[title*="Auto-resize"], button[title*="Restore original"]');

        if (!resizeBtn) return;

        if (isResized) {
            resizeBtn.textContent = '↔️ Restore Width';
            resizeBtn.title = 'Restore original column widths (click to toggle)';
            resizeBtn.style.background = '#e8f5e9';
            resizeBtn.style.borderColor = '#4CAF50';
        } else {
            resizeBtn.textContent = '↔️ Auto-Resize';
            resizeBtn.title = 'Auto-resize columns to optimal width (enables horizontal scrolling)';
            resizeBtn.style.background = '';
            resizeBtn.style.borderColor = '';
        }
    }

    /**
     * Store original table state before resizing
     * @param {HTMLTableElement} table - The table element
     * @returns {Object} Original state object
     */
    function storeOriginalTableState(table) {
        const state = {
            tableWidth: table.style.width,
            tableMinWidth: table.style.minWidth,
            tableLayout: table.style.tableLayout,
            colgroup: null
        };

        // Store colgroup if it exists
        const colgroup = table.querySelector('colgroup');
        if (colgroup) {
            state.colgroup = colgroup.cloneNode(true);
        }

        return state;
    }

    /**
     * Restore original table state
     * @param {HTMLTableElement} table - The table element
     * @param {Object} state - Original state object
     */
    function restoreOriginalTableState(table, state) {
        // Restore table styles
        table.style.width = state.tableWidth || '';
        table.style.minWidth = state.tableMinWidth || '';
        table.style.tableLayout = state.tableLayout || '';

        // Remove current colgroup
        const currentColgroup = table.querySelector('colgroup');
        if (currentColgroup) {
            currentColgroup.remove();
        }

        // Restore original colgroup if it existed
        if (state.colgroup) {
            table.insertBefore(state.colgroup.cloneNode(true), table.firstChild);
        }
    }

    /**
     * Restore original content/sidebar state
     */
    function restoreOriginalScrollState() {
        const content = document.getElementById('content');
        const sidebar = document.getElementById('sidebar');

        if (content) {
            content.style.overflowX = '';
            content.style.overflowY = '';
        }

        if (sidebar) {
            sidebar.style.position = '';
            sidebar.style.top = '';
            sidebar.style.alignSelf = '';
        }
    }

    /**
     * Auto-resize table columns to optimal width (with toggle)
     * First click: Resize columns to optimal width
     * Second click: Restore original column widths
     * Also handles manual resizing - restores to original state
     */
    /**
     * Toggles auto-resize mode for table columns
     * First click: auto-resizes columns to fit content
     * Second click: restores original column widths
     */
    function toggleAutoResizeColumns() {
        const tables = document.querySelectorAll('table.tbl');

        if (tables.length === 0) {
            alert('No tables found to resize');
            Lib.warn('resize', 'No tables found for auto-resize');
            return;
        }

        const resizeBtn = document.querySelector('button[title*="Auto-resize"], button[title*="Restore original"]');

        // Toggle: If already resized (auto or manual), restore original state
        if (isAutoResized || isManuallyResized) {
            Lib.info('resize', 'Restoring original column widths...');

            tables.forEach((table, tableIndex) => {
                const state = originalTableStates.get(table);
                if (state) {
                    restoreOriginalTableState(table, state);
                    Lib.debug('resize', `Table ${tableIndex}: Restored original state`);
                }

                // Remove resize handles
                table.querySelectorAll('.column-resizer').forEach(resizer => {
                    resizer.remove();
                });

                // Re-add resize handles so users can resize again
                if (Lib.settings.sa_enable_column_resizing) {
                    makeColumnsResizable(table);
                }
            });

            // Restore scroll state
            restoreOriginalScrollState();

            // Clear stored states
            originalTableStates.clear();
            isAutoResized = false;
            isManuallyResized = false;

            // Update button appearance
            updateResizeButtonState(false);

            // Update status display
            const statusDisplay = document.getElementById('mb-status-display');
            if (statusDisplay) {
                statusDisplay.textContent = '✓ Restored original column widths';
                statusDisplay.style.color = 'green';
            }

            Lib.info('resize', 'Original column widths restored');
            return;
        }

        // First click: Auto-resize columns
        Lib.info('resize', `Auto-resizing ${tables.length} table(s)...`);

        const startTime = performance.now();
        let totalColumnsResized = 0;

        // Store original states before modifying
        tables.forEach(table => {
            originalTableStates.set(table, storeOriginalTableState(table));
        });

        // Enable horizontal scrolling in content area
        const content = document.getElementById('content');
        const sidebar = document.getElementById('sidebar');

        if (content) {
            // Make content scrollable horizontally
            content.style.overflowX = 'auto';
            content.style.overflowY = 'visible';

            // Prevent sidebar from scrolling with content
            if (sidebar) {
                sidebar.style.position = 'sticky';
                sidebar.style.top = '0';
                sidebar.style.alignSelf = 'flex-start';
            }

            Lib.debug('resize', 'Enabled horizontal scrolling in content area');
        }

        tables.forEach((table, tableIndex) => {
            // Remove any existing width constraints
            table.style.width = 'auto';
            table.style.tableLayout = 'auto';

            // Get all columns by checking first row
            const firstRow = table.querySelector('tbody tr');
            if (!firstRow) {
                Lib.warn('resize', `Table ${tableIndex} has no data rows, skipping`);
                return;
            }

            const columnCount = firstRow.cells.length;
            const columnWidths = new Array(columnCount).fill(0);

            // Create temporary measurement container
            const measureDiv = document.createElement('div');
            measureDiv.style.cssText = `
                position: absolute;
                visibility: hidden;
                white-space: nowrap;
                font-family: inherit;
                font-size: inherit;
                padding: 4px 8px;
            `;
            document.body.appendChild(measureDiv);

            // Measure header widths
            const headers = table.querySelectorAll('thead th');
            headers.forEach((th, colIndex) => {
                if (colIndex >= columnCount) return;

                // Clone the entire content to preserve HTML structure (images, links, etc.)
                const contentClone = th.cloneNode(true);

                // Remove sort icons/buttons from the clone
                contentClone.querySelectorAll('.sort-icon-btn, .sort-icon').forEach(el => el.remove());

                // Copy styles for accurate measurement
                const styles = window.getComputedStyle(th);
                measureDiv.style.fontSize = styles.fontSize;
                measureDiv.style.fontWeight = styles.fontWeight;
                measureDiv.style.padding = styles.padding;
                measureDiv.style.fontFamily = styles.fontFamily;

                // Clear previous content and add the clone
                measureDiv.innerHTML = '';
                measureDiv.appendChild(contentClone);

                const width = measureDiv.offsetWidth;

                columnWidths[colIndex] = Math.max(columnWidths[colIndex], width);

                Lib.debug('resize', `Header ${colIndex}: "${th.textContent.trim()}" = ${width}px`);
            });

            // Measure data cell widths (sample rows for performance)
            const rows = table.querySelectorAll('tbody tr');
            const sampleSize = Math.min(rows.length, 100); // Sample up to 100 rows
            const sampleStep = Math.max(1, Math.floor(rows.length / sampleSize));

            for (let i = 0; i < rows.length; i += sampleStep) {
                const row = rows[i];

                // Skip hidden rows
                if (row.style.display === 'none') continue;

                Array.from(row.cells).forEach((cell, colIndex) => {
                    if (colIndex >= columnCount) return;

                    // Clone the entire content to preserve HTML structure (images, links, etc.)
                    const contentClone = cell.cloneNode(true);

                    // Copy styles for accurate measurement
                    const styles = window.getComputedStyle(cell);
                    measureDiv.style.fontSize = styles.fontSize;
                    measureDiv.style.fontWeight = styles.fontWeight;
                    measureDiv.style.padding = styles.padding;
                    measureDiv.style.fontFamily = styles.fontFamily;

                    // Clear previous content and add the clone
                    measureDiv.innerHTML = '';
                    measureDiv.appendChild(contentClone);

                    const width = measureDiv.offsetWidth;

                    columnWidths[colIndex] = Math.max(columnWidths[colIndex], width);
                });
            }

            // Clean up measurement div
            document.body.removeChild(measureDiv);

            // Apply widths to table columns
            // Use colgroup for better performance
            let colgroup = table.querySelector('colgroup');
            if (!colgroup) {
                colgroup = document.createElement('colgroup');
                table.insertBefore(colgroup, table.firstChild);
            } else {
                colgroup.innerHTML = ''; // Clear existing cols
            }

            columnWidths.forEach((width, index) => {
                const col = document.createElement('col');
                // Add some padding to the calculated width
                const finalWidth = Math.ceil(width + 20); // 20px extra for comfort
                col.style.width = `${finalWidth}px`;
                colgroup.appendChild(col);

                Lib.debug('resize', `Table ${tableIndex}, Column ${index}: ${finalWidth}px`);
            });

            // Set table to use fixed layout for consistency
            table.style.tableLayout = 'fixed';

            // Calculate total table width
            const totalWidth = columnWidths.reduce((sum, w) => sum + w + 20, 0);
            table.style.width = `${totalWidth}px`;
            table.style.minWidth = `${totalWidth}px`;

            totalColumnsResized += columnCount;

            // Add manual resize handles
            if (Lib.settings.sa_enable_column_resizing) {
                makeColumnsResizable(table);
            }

            Lib.info('resize', `Table ${tableIndex}: Resized ${columnCount} columns, total width: ${totalWidth}px`);
        });

        const duration = (performance.now() - startTime).toFixed(0);

        // Mark as resized
        isAutoResized = true;

        // Update button appearance to show active state
        updateResizeButtonState(true);

        // Update status display
        const statusDisplay = document.getElementById('mb-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = `✓ Auto-resized ${totalColumnsResized} columns in ${duration}ms (drag column edges to adjust)`;
            statusDisplay.style.color = 'green';
        }

        Lib.info('resize', `Auto-resize complete: ${totalColumnsResized} columns in ${duration}ms`);
    }

    /**
     * Add auto-resize columns button to UI
     */
    function addAutoResizeButton() {
        const resizeBtn = document.createElement('button');
        resizeBtn.textContent = '↔️ Auto-Resize';
        resizeBtn.title = 'Auto-resize columns to optimal width (enables horizontal scrolling)';
        resizeBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px; transition:transform 0.1s, box-shadow 0.1s; display: inline-flex; align-items: center; justify-content: center;';
        resizeBtn.type = 'button';
        resizeBtn.onclick = toggleAutoResizeColumns;

        const controlsContainer = document.getElementById('mb-show-all-controls-container');
        if (controlsContainer) {
            controlsContainer.appendChild(resizeBtn);
            Lib.info('ui', 'Auto-resize button added to controls');
        } else {
            Lib.warn('ui', 'Controls container not found, cannot add auto-resize button');
        }
    }

    const SCRIPT_ID = "vzell-mb-show-all-entities";
    const SCRIPT_NAME = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : "Show All Entities";

    // CONFIG SCHEMA
    const configSchema = {
        // ============================================================
        // GENERIC SECTION
        // ============================================================
        divider_: {
            type: 'divider',
            label: '🛠️ Generic settings'
        },

        sa_enable_debug_logging: {
            label: "Enable debug logging",
            type: "checkbox",
            default: false,
            description: "Enable debug logging in the browser developer console"
        },

        sa_load_history_limit: {
            label: 'Load Filter History Limit',
            type: 'number',
            default: 10,
            min: 0,
            max: 50,
            description: 'Number of previous filter expressions to remember in the load dialog.'
        },

        // ============================================================
        // EXPERIMENTAL FEATURES SECTION
        // ============================================================
        divider_experimental: {
            type: 'divider',
            label: '🔬 EXPERIMENTAL FEATURES'
        },

        sa_collabsable_sidebar: {
            label: "Collabsable sidebar (experimental)",
            type: "checkbox",
            default: false,
            description: "Render sidebar collabsable"
        },
        // ============================================================
        // OPTIONAL COLUMN REMOVAL FROM FINAL RENDERED PAGE SECTION
        // ============================================================
        divider_column_removal: {
            type: 'divider',
            label: '🧮 OPTIONAL COLUMN REMOVAL FROM FINAL RENDERED PAGE'
        },

        sa_remove_tagger: {
            label: "Remove Tagger column",
            type: "checkbox",
            default: false,
            description: "Remove the Tagger column from the final rendered tables"
        },

        sa_remove_release_events: {
            label: 'Remove "Release events" column from "Place-Performances" pages',
            type: "checkbox",
            default: true,
            description: "Remove the 'Release events' column from the final rendered tables (coming from the jesus2099 'mb. SUPER MIND CONTROL Ⅱ X TURBO' userscript"
        },

        sa_remove_rating: {
            label: "Remove Rating column",
            type: "checkbox",
            default: false,
            description: "Remove the Rating column from the final rendered tables"
        },

        sa_remove_rel: {
            label: "Remove Relationships column",
            type: "checkbox",
            default: true,
            description: "Remove the Relationships column from the final rendered tables"
        },

        sa_remove_perf: {
            label: "Remove Performance column",
            type: "checkbox",
            default: true,
            description: "Remove the Performance column from the final rendered tables"
        },

        // ============================================================
        // UI FEATURES SECTION
        // ============================================================
        divider_ui_features: {
            type: 'divider',
            label: '🎨 UI FEATURES'
        },

        sa_enable_column_visibility: {
            label: 'Enable Column Visibility Toggle',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "👁️ Visible Columns" button for toggling column visibility'
        },

        sa_enable_export: {
            label: 'Enable Export',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "Export 💾" button for exporting data to CSV/JSON'
        },

        sa_enable_keyboard_shortcuts: {
            label: 'Enable Keyboard Shortcuts',
            type: 'checkbox',
            default: true,
            description: 'Enable keyboard shortcuts and show the "⌨️ Shortcuts" help button'
        },

        sa_enable_stats_panel: {
            label: 'Enable Quick Stats Panel',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "📊 Stats" button for displaying table statistics'
        },

        sa_enable_density_control: {
            label: 'Enable Table Density Control',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "📏 Density" button for adjusting table spacing'
        },

        sa_enable_column_resizing: {
            label: 'Enable Column Resizing',
            type: 'checkbox',
            default: true,
            description: 'Enable manual column resizing with mouse drag and "↔️ Auto-Resize" button'
        },

        sa_enable_save_load: {
            label: 'Enable Save/Load to Disk',
            type: 'checkbox',
            default: true,
            description: 'Show/hide the "💾 Save" and "📂 Load" buttons for disk persistence'
        },

        sa_enable_sticky_headers: {
            label: 'Enable Sticky Headers',
            type: 'checkbox',
            default: true,
            description: 'Keep table headers visible when scrolling'
        },

        // ============================================================
        // FILTER HIGHLIGHT COLORS SECTION
        // ============================================================
        divider_filter_colors: {
            type: 'divider',
            label: '🎨 FILTER HIGHLIGHT COLORS'
        },

        sa_pre_filter_highlight_color: {
            label: "Global Prefilter Highlight Color",
            type: "color_picker",
            default: "green",
            description: "Text color for global prefilter matches"
        },

        sa_pre_filter_highlight_bg: {
            label: "Global Prefilter Highlight Background",
            type: "color_picker",
            default: "#FFFFE0",
            description: "Background color for global prefilter matches"
        },

        sa_global_filter_highlight_color: {
            label: "Global Filter Highlight Color",
            type: "color_picker",
            default: "red",
            description: "Text color for global filter matches"
        },

        sa_global_filter_highlight_bg: {
            label: "Global Filter Highlight Background",
            type: "color_picker",
            default: "#FFD700",
            description: "Background color for global filter matches"
        },

        sa_column_filter_highlight_color: {
            label: "Column Filter Highlight Color",
            type: "color_picker",
            default: "red",
            description: "Text color for column filter matches"
        },

        sa_column_filter_highlight_bg: {
            label: "Column Filter Highlight Background",
            type: "color_picker",
            default: "#add8e6",
            description: "Background color for column filter matches"
        },

        // ============================================================
        // PERFORMANCE SETTINGS SECTION
        // ============================================================
        divider_performance: {
            type: 'divider',
            label: '⚡ PERFORMANCE SETTINGS'
        },

        sa_filter_debounce_delay: {
            label: "Filter debounce delay (ms)",
            type: "number",
            default: 300,
            min: 0,
            max: 2000,
            description: "Delay before applying filter after typing stops"
        },

        sa_sort_chunk_size: {
            label: "Sort chunk size",
            type: "number",
            default: 5000,
            min: 1000,
            max: 50000,
            description: "Rows to process at once when sorting large tables"
        },

        sa_render_threshold: {
            label: "Large Dataset Threshold",
            type: "number",
            default: 5000,
            description: "Row count threshold to prompt save-or-render dialog (0 to disable)"
        },

        sa_chunked_render_threshold: {
            label: "Chunked Rendering Threshold",
            type: "number",
            default: 1000,
            description: "Row count to trigger progressive chunked rendering (0 to always use simple render)"
        },

        sa_sort_progress_threshold: {
            label: "Show sort progress above (rows)",
            type: "number",
            default: 10000,
            min: 1000,
            max: 100000,
            description: "Show progress indicator when sorting tables with more than this many rows"
        },

        sa_render_overflow_tables_in_new_tab: {
            label: "Render overflow tables in a new tab",
            type: "checkbox",
            default: true,
            description: "Render overflow tables in a new tab"
        },

        sa_max_page: {
            label: "Max Page Warning",
            type: "number",
            default: 50,
            description: "Warning threshold for page fetching"
        },
        sa_auto_expand: {
            label: "Auto-Expand Rows",
            type: "number",
            default: 50,
            description: "Row count threshold to auto-expand tables"
        }

    };

    // Initialize VZ-MBLibrary (Logger + Settings + Changelog)
    // Use a ref object to avoid circular dependency during initialization
    const settings = {};
    const Lib = (typeof VZ_MBLibrary !== 'undefined')
          ? new VZ_MBLibrary(SCRIPT_ID, SCRIPT_NAME, configSchema, changelog, () => {
              // Dynamic check: returns current value of debug setting
              return settings.sa_enable_debug_logging ?? true;
          })
          : {
              settings: {},
              info: console.log, debug: console.log, error: console.error, warn: console.warn, time: console.time, timeEnd: console.timeEnd
          };

    // Copy settings reference so the callback can access them
    Object.assign(settings, Lib.settings);

    Lib.info('init', "Script loaded with external library!");

    // --- Sidebar Collapsing & Full Width Stretching Logic ---
    /**
     * Initializes the collapsible sidebar feature with a toggle handle
     * Adds CSS transitions and event handlers for smooth sidebar collapse/expand animation
     */
    function initSidebarCollapse() {
        if (!Lib.settings.sa_collabsable_sidebar) return; // Only available if true

        const sidebar = document.getElementById("sidebar");
        const page = document.getElementById("page");
        const content = document.getElementById("content");

        if (!sidebar) return;

        Lib.debug('init', 'Initializing aggressive full-width sidebar toggle.');

        const sidebarWidth = '240px';

        const style = document.createElement('style');
        style.textContent = `
            #sidebar {
                transition: transform 0.3s ease, width 0.3s ease, opacity 0.3s ease, margin-right 0.3s ease;
            }
            #page, #content {
                transition: margin-right 0.3s ease, padding-right 0.3s ease, width 0.3s ease, max-width 0.3s ease, margin-left 0.3s ease;
            }
            .sidebar-collapsed {
                transform: translateX(100%);
                width: 0 !important;
                min-width: 0 !important;
                opacity: 0 !important;
                margin-right: -${sidebarWidth} !important;
                pointer-events: none;
            }
            /* Force 100% width and remove any MB centering/max-width constraints */
            .mb-full-width-stretching {
                margin-right: 0 !important;
                margin-left: 0 !important;
                padding-right: 10px !important;
                padding-left: 10px !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 100% !important;
                box-sizing: border-box !important;
            }
            #sidebar-toggle-handle {
                position: fixed;
                right: ${sidebarWidth};
                top: 50%;
                transform: translateY(-50%);
                width: 14px;
                height: 80px;
                background-color: #f2f2f2;
                border: 1px solid #ccc;
                border-right: none;
                border-radius: 8px 0 0 8px;
                cursor: pointer;
                z-index: 10000;
                display: flex; align-items: center; justify-content: center;
                transition: right 0.3s ease;
                box-shadow: -2px 0 5px rgba(0,0,0,0.1);
            }
            #sidebar-toggle-handle::after {
                content: '▶';
                font-size: 9px;
                color: #555;
            }
            .handle-collapsed {
                right: 0 !important;
            }
            .handle-collapsed::after {
                content: '◀' !important;
            }
        `;
        document.head.appendChild(style);

        const handle = document.createElement('div');
        handle.id = 'sidebar-toggle-handle';
        handle.title = 'Toggle Full Width Sidebar';

        const applyStretching = (isCollapsed) => {
            const containers = [document.getElementById("page"), document.getElementById("content")];
            containers.forEach(el => {
                if (el) {
                    if (isCollapsed) el.classList.add('mb-full-width-stretching');
                    else el.classList.remove('mb-full-width-stretching');
                }
            });
        };

        handle.addEventListener('click', () => {
            const isCollapsing = !sidebar.classList.contains('sidebar-collapsed');
            sidebar.classList.toggle('sidebar-collapsed');
            handle.classList.toggle('handle-collapsed');
            applyStretching(isCollapsing);
            Lib.debug('meta', `Sidebar ${isCollapsing ? 'collapsed' : 'expanded'}. Full width applied.`);
        });

        document.body.appendChild(handle);

        // Observer to handle dynamic content replacement by the "Show All" logic
        const observer = new MutationObserver(() => {
            if (sidebar.classList.contains('sidebar-collapsed')) {
                applyStretching(true);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Check if we just reloaded to fix the filter issue
    const reloadFlag = sessionStorage.getItem('mb_show_all_reload_pending');
    if (reloadFlag) {
        sessionStorage.removeItem('mb_show_all_reload_pending');
        alert('The underlying MusicBrainz page has been reloaded to ensure filter stability. Please click the desired "Show all" button again to start the process.');
    }

    const currentUrl = new URL(window.location.href);
    const basePath = currentUrl.origin + currentUrl.pathname;
    const path = currentUrl.pathname;
    const params = currentUrl.searchParams;
    const isFilteredRelationshipPage = params.has('link_type_id');

    Lib.debug('init', `URL: ${currentUrl}`);
    Lib.debug('init', `URL basepath: ${basePath}`);
    Lib.debug('init', `URL path: ${path}`);
    Lib.debug('init', `Query parameters: ${params}`);
    Lib.debug('init', `Has "link_type_id": ${isFilteredRelationshipPage}`);

    // --- Configuration: Page Definitions ---

    // There are different types of MusicBrainz pages
    // | Page type               | multiple tables           | paginated | table header                         |
    // |-------------------------+---------------------------+-----------+--------------------------------------|
    // | Artist-Releasegroups    | native                    | x         | h2, not repeating on paginated pages |
    // | Releasegroup-Releases   | single table, subgrouping | x         | h2, repeating on paginated pages     |
    // | Place-Performances, ... | single table, subgrouping |           | h2, repeating on single page         |
    // | Events                  | single table              | x         | h3,                                  |
    // | Search                  | single table              | x         | p.pageselector-results               |

    // Define all supported page types, their detection logic, and specific UI configurations here.
    const pageDefinitions = [
        // Search pages
        {
            type: 'search',
            match: (path) => path.includes('/search'),
            buttons: [ { label: 'Show all Search results' } ],
            tableMode: 'single',
            features: {
                extractMainColumn: 'Name', // Specific header
                transformToH2: true        // New flag to trigger <h2> transformation
            },
            rowTargetSelector: 'p.pageselector-results' // Specific target for Search pages
        },
        // Instrument pages
        {
            type: 'instrument-artists',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/artists/),
            buttons: [ { label: 'Show all Artists for Instrument' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Artist' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'instrument-releases',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/releases/),
            buttons: [ { label: 'Show all Releases for Instrument' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'instrument-recordings',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/recordings/),
            buttons: [ { label: 'Show all Recordings for Instrument' } ],
            features: {
                extractMainColumn: 'Name' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'instrument-aliases',
            match: (path) => path.match(/\/instrument\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Instrument' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        // Area pages
        {
            type: 'area-artists',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/artists/),
            buttons: [ { label: 'Show all Artists for Area' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Artist' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-events',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Area' } ],
            features: {
                splitLocation: true,
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        },
        {
            type: 'area-labels',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/labels/),
            buttons: [ { label: 'Show all Labels for Area' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Label' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-releases-filtered',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/releases/) && params.has('link_type_id'),
            buttons: [
                {
                    label: 'Show all Release Relationships for Area (filtered)',
                    targetHeader: 'Relationships',
                    tableMode: 'single',
                    non_paginated: false,
                    extractMainColumn: 'Title'
                }
            ]
        },
        {
            type: 'area-releases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/releases/) && !params.has('link_type_id'),
            buttons: [
                {
                    label: 'Show all Releases for Area',
                    targetHeader: 'Releases',
                    tableMode: 'single',
                    extractMainColumn: 'Release',
                    features: {
                        splitCD: true
                    }
                },
                {
                    label: 'Show all Release Relationships for Area',
                    targetHeader: 'Relationships',
                    tableMode: 'multi',
                    non_paginated: true,
                    extractMainColumn: 'Title'
                }
            ]
        },
        {
            type: 'area-places',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/places/),
            buttons: [ { label: 'Show all Places for Area' } ],
            features: {
                splitArea: true,
                extractMainColumn: 'Place'
            },
            tableMode: 'single'
        },
        {
            type: 'area-aliases',
            match: (path) => path.match(/\/area\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Area' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'area-recordings-filtered',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/recordings/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Area (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'area-recordings',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/recordings/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Area' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'area-works-filtered',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/works/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Works for Area (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'area-works',
            match: (path, params) => path.match(/\/area\/[a-f0-9-]{36}\/works/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Works for Area' } ],
            tableMode: 'multi',
            features: {
                extractMainColumn: 'Title'
            },
            non_paginated: true
        },
        // Place pages
        {
            type: 'place-aliases',
            match: (path) => path.match(/\/place\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Place' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'place-events',
            match: (path) => path.match(/\/place\/[a-f0-9-]{36}\/events/),
            buttons: [ { label: 'Show all Events for Place' } ],
            features: {
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        },
        {
            type: 'place-performances-filtered',
            match: (path, params) => path.match(/\/place\/[a-f0-9-]{36}\/performances/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Performances for Place (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'place-performances',
            match: (path, params) => path.match(/\/place\/[a-f0-9-]{36}\/performances/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Performances for Place' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        // Series pages
        {
            type: 'series-aliases',
            match: (path) => path.match(/\/series\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Series' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'series-releases',
            match: (path) => path.includes('/series'),
            buttons: [ { label: 'Show all Releases for Series' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        // Label pages
        {
            type: 'label-aliases',
            match: (path) => path.match(/\/label\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Label' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'label-relationships-filtered',
            match: (path, params) => path.match(/\/label\/[a-f0-9-]{36}\/relationships/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Label (filtered)' } ],
            features: {
                extractMainColumn: 'Title' // Specific header
            },
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'label-relationships',
            match: (path, params) => path.match(/\/label\/[a-f0-9-]{36}\/relationships/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Label' } ],
            features: {
                extractMainColumn: 'Title' // Specific header
            },
            tableMode: 'multi',
            non_paginated: true
        },
        {
            type: 'label-releases',
            match: (path) => path.includes('/label'),
            buttons: [ { label: 'Show all Releases for Label' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        // Work pages
        {
            type: 'work-aliases',
            match: (path) => path.match(/\/work\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Work' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'work-recordings-filtered',
            match: (path, params) => path.match(/\/work\/[a-f0-9-]{36}/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Work (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'work-recordings',
            match: (path, params) => path.match(/\/work\/[a-f0-9-]{36}/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Recordings for Work' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        // Artist pages
        {
            type: 'artist-relationships-filtered',
            // Check for link_type_id to identify the paginated "See all" view. This MUST come before the general 'artist-relationships' match.
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/relationships/) && params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Artist (filtered)' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'single' // Paginated single list
        },
        {
            type: 'artist-relationships',
            // Only match if NO link_type_id is present (the overview page)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/relationships/) && !params.has('link_type_id'),
            buttons: [ { label: 'Show all Relationships for Artist' } ],
            features: {
                extractMainColumn: 'Title'
            },
            tableMode: 'multi',
            non_paginated: true
        },
        // TODO: Needs to be handled separately - actually multi table native, but each table has it's own h2 header
        {
            type: 'artist-aliases',
            match: (path) => path.match(/\/artist\/[a-f0-9-]{36}\/aliases/),
            buttons: [
                {
                    label: 'Show all Aliases for Artist',
                    targetHeader: 'Aliases',
                    tableMode: 'single',
                    extractMainColumn: 'Locale'
                },
                {
                    label: 'Show all Artist Credits for Artist',
                    targetHeader: 'Artist credits',
                    tableMode: 'single'
                }
            ],
        },
        {
            type: 'artist-releasegroups',
            // Root artist page (Official/Non-Official/VA views handled by specific buttons)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}$/) && !path.endsWith('/releases'),
            buttons: [
                { label: '🧮 Official artist RGs', params: { all: '0', va: '0' } },
                { label: '🧮 Non-official artist RGs', params: { all: '1', va: '0' } },
                { label: '🧮 Official various artists RGs', params: { all: '0', va: '1' } },
                { label: '🧮 Non-official various artists RGs', params: { all: '1', va: '1' } }
            ],
            tableMode: 'multi' // native tables, h3 headers
        },
        {
            type: 'artist-releases',
            // Artist Releases page (Official/VA views handled by specific buttons)
            match: (path, params) => path.match(/\/artist\/[a-f0-9-]{36}\/releases$/),
            buttons: [
                { label: '🧮 Official artist releases', params: { va: '0' } },
                { label: '🧮 Various artist releases', params: { va: '1' } }
            ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'single'
        },
        {
            type: 'artist-recordings',
            match: (path) => path.includes('/recordings'),
            buttons: [ { label: 'Show all Recordings for Artist' } ],
            features: {
                splitCD: false, // Explicitly false (default), but shown for clarity
                extractMainColumn: 'Name'
            },
            tableMode: 'single'
        },
        {
            type: 'artist-works',
            match: (path) => path.includes('/works'),
            buttons: [ { label: 'Show all Works for Artist' } ],
            features: {
                extractMainColumn: 'Work'
            },
            tableMode: 'single'
        },
        // ReleaseGroups pages
        {
            type: 'releasegroup-aliases',
            match: (path) => path.match(/\/release-group\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Releasegroup' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'releasegroup-releases',
            match: (path) => path.includes('/release-group/'),
            buttons: [ { label: 'Show all Releases for ReleaseGroup' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release'
            },
            tableMode: 'multi',
            non_paginated: false
        },
        // Release pages
        {
            type: 'release-aliases',
            match: (path) => path.match(/\/release\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Release' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'release-discids',
            match: (path) => path.match(/\/release\/[a-f0-9-]{36}\/discids/),
            buttons: [ { label: 'Show all Disc IDs for Release' } ],
            tableMode: 'multi',
            non_paginated: false
        },
        // Recording pages
        {
            type: 'recording-aliases',
            match: (path) => path.match(/\/recording\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Recording' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'recording-fingerprints',
            match: (path) => path.match(/\/recording\/[a-f0-9-]{36}\/fingerprints/),
            buttons: [ { label: 'Show all Fingerprints for Recording' } ],
            tableMode: 'single'
            //rowTargetSelector: '.acoustid-fingerprints table.tbl'
        },
        {
            type: 'recording-releases',
            match: (path) => path.includes('/recording'),
            buttons: [ { label: 'Show all Releases for Recording' } ],
            features: {
                splitCD: true,
                extractMainColumn: 'Release title'
            },
            tableMode: 'multi',
            non_paginated: false
        },
        // Event pages
        {
            type: 'event-aliases',
            match: (path) => path.match(/\/event\/[a-f0-9-]{36}\/aliases/),
            buttons: [ { label: 'Show all Aliases for Event' } ],
            features: {
                extractMainColumn: 'Locale' // Specific header
            },
            tableMode: 'single'
        },
        {
            type: 'events',
            match: (path) => path.includes('/events'),
            buttons: [ { label: 'Show all Events for Artist' } ],
            features: {
                splitLocation: true,
                extractMainColumn: 'Event'
            },
            tableMode: 'single'
        }
    ];

    // --- Initialization Logic ---

    // 1. Detect Page Type
    let pageType = '';
    let baseDefinition = null;   // Store the permanent base definition
    let activeDefinition = null; // Will be updated dynamically during fetch

    for (const def of pageDefinitions) {
        if (def.match(path, params)) {
            pageType = def.type;
            baseDefinition = def;   // Save the base reference
            activeDefinition = def; // Set default active definition
            // Add debug logs for tablemode and pagetype at the beginning of execution
            Lib.debug('init', `Detected pageType: ${pageType}`);
            Lib.debug('init', `Detected tableMode: ${activeDefinition ? activeDefinition.tableMode : 'unknown'}`);
            break; // Stop at first match (priority based on array order)
        }
    }

    // 2. Locate Header
    // Refactored to handle "Search" pages (generic h1) and typical entity headers
    let headerContainer = document.querySelector('.artistheader h1') ||
                          document.querySelector('.rgheader h1') ||
                          document.querySelector('.labelheader h1') ||
                          document.querySelector('.seriesheader h1') ||
                          document.querySelector('.placeheader h1') ||
                          document.querySelector('.areaheader h1') ||
                          document.querySelector('.recordingheader h1') ||
                          document.querySelector('h1 a bdi')?.parentNode ||
                          document.querySelector('#content h1') || // Often catches search result headers
                          document.querySelector('h1');

    if (pageType) Lib.prefix = `[VZ-ShowAllEntities: ${pageType}]`;
    Lib.info('init', 'Initializing script for path:', path);

    if (!pageType || !headerContainer) {
        Lib.error('init', 'Required elements not found. Terminating.', { pageType, hasHeader: !!headerContainer });
        return;
    }

    // 3. Set Feature Flags based on active definition
    // These are evaluated dynamically during fetch based on button-specific features
    let typesWithSplitCD = [];
    let typesWithSplitLocation = [];
    let typesWithSplitArea = [];

    // --- UI Elements ---
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mb-show-all-controls-container';
    controlsContainer.style.cssText = 'display:inline-flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:10px; vertical-align:middle; line-height:1;';

    const allActionButtons = [];

    // 4. Generate Buttons
    const buttonsToRender = activeDefinition.buttons || [
        { label: `Show all ${pageType.replace('-', ' ')}` } // Default fallback
    ];

    buttonsToRender.forEach(conf => {
        const eb = document.createElement('button');
        // Concatenate "🧮 " if label starts with "Show all"
        eb.textContent = conf.label.startsWith('Show all') ? '🧮 ' + conf.label : conf.label;
        eb.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; display: inline-flex; align-items: center; justify-content: center;';
        eb.type = 'button';
        // Pass the entire config object
        eb.onclick = (e) => startFetchingProcess(e, conf, activeDefinition);
        controlsContainer.appendChild(eb);
        allActionButtons.push(eb);
    });

    // Add Save to Disk button
    const saveToDiskBtn = document.createElement('button');
    saveToDiskBtn.textContent = '💾 Save to Disk';
    saveToDiskBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; background-color:#4CAF50; color:white; border:1px solid #45a049; display:none; display: inline-flex; align-items: center; justify-content: center;';
    saveToDiskBtn.type = 'button';
    saveToDiskBtn.title = 'Save current table data to disk as JSON';
    saveToDiskBtn.onclick = () => saveTableDataToDisk();
    saveToDiskBtn.style.display = 'none'; // - Changed from 'inline-flex' or similar to 'none'

    if (Lib.settings.sa_enable_save_load) {
        controlsContainer.appendChild(saveToDiskBtn);
    }

    // Add Load from Disk button with hidden file input
    const loadFromDiskBtn = document.createElement('button');
    loadFromDiskBtn.textContent = '📂 Load from Disk';
    loadFromDiskBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; transition:transform 0.1s, box-shadow 0.1s; height:24px; box-sizing:border-box; border-radius:6px; background-color:#2196F3; color:white; border:1px solid #0b7dda; display: inline-flex; align-items: center; justify-content: center;';
    loadFromDiskBtn.type = 'button';
    loadFromDiskBtn.title = 'Load table data from disk (JSON file)';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => loadTableDataFromDisk(e.target.files[0]);

    loadFromDiskBtn.onclick = () => showLoadFilterDialog();

    if (Lib.settings.sa_enable_save_load) {
        controlsContainer.appendChild(loadFromDiskBtn);
        controlsContainer.appendChild(fileInput);
    }

    // --- Pre-load Filter UI elements ---
    const preFilterContainer = document.createElement('span');
    preFilterContainer.style.cssText = 'display:inline-flex; align-items:center; gap:4px; margin-left:6px; padding-left:6px; border-left:1px solid #ccc; vertical-align:middle; height:24px;';

    const preFilterInput = document.createElement('input');
    preFilterInput.type = 'text';
    preFilterInput.placeholder = 'Filter data load...';
    preFilterInput.title = 'Filter rows while loading from disk';
    preFilterInput.style.cssText = 'font-size:0.8em; padding:2px 4px; border:1px solid #ccc; border-radius:3px; width:150px; height:24px; box-sizing:border-box;';

    const preFilterCaseLabel = document.createElement('label');
    preFilterCaseLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; display: flex; align-items: center; margin: 0; user-select: none;';
    const preFilterCaseCheckbox = document.createElement('input');
    preFilterCaseCheckbox.type = 'checkbox';
    preFilterCaseCheckbox.style.marginRight = '2px';
    preFilterCaseLabel.appendChild(preFilterCaseCheckbox);
    preFilterCaseLabel.appendChild(document.createTextNode('Cc'));
    preFilterCaseLabel.title = 'Case Sensitive (Load)';

    const preFilterRxLabel = document.createElement('label');
    preFilterRxLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; display: flex; align-items: center; margin: 0; user-select: none;';
    const preFilterRxCheckbox = document.createElement('input');
    preFilterRxCheckbox.type = 'checkbox';
    preFilterRxCheckbox.style.marginRight = '2px';
    preFilterRxLabel.appendChild(preFilterRxCheckbox);
    preFilterRxLabel.appendChild(document.createTextNode('Rx'));
    preFilterRxLabel.title = 'RegExp (Load)';

    const preFilterMsg = document.createElement('span');
    preFilterMsg.id = 'mb-preload-filter-msg';
    preFilterMsg.style.cssText = 'font-size:0.8em; color:red; margin-left:4px; font-weight:bold; white-space:nowrap;';

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.cssText = 'display:none; font-size:0.8em; padding:2px 6px; cursor:pointer; background-color:#f44336; color:white; border:1px solid #d32f2f; height:24px; box-sizing:border-box; border-radius:6px;';

    const globalStatusDisplay = document.createElement('span');
    globalStatusDisplay.id = 'mb-global-status-display';
    globalStatusDisplay.style.cssText = 'font-size:0.6em; color:#333; display:flex; align-items:center; height:24px; font-weight:bold;';

    const progressContainer = document.createElement('div');
    progressContainer.id = 'mb-fetch-progress-container';
    progressContainer.style.cssText = 'display:none; width:300px; height:26px; background-color:#eee; border:1px solid #ccc; border-radius:3px; overflow:hidden; position:relative; vertical-align:middle;';

    const progressBar = document.createElement('div');
    progressBar.id = 'mb-fetch-progress-bar';
    progressBar.style.cssText = 'width:0%; height:100%; transition: width 0.3s, background-color 0.3s; position:absolute; left:0; top:0;';

    const progressText = document.createElement('div');
    progressText.id = 'mb-fetch-progress-text';
    progressText.style.cssText = 'position:absolute; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:black; z-index:1; pointer-events:none; padding: 0 10px; box-sizing: border-box;';

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);

    const filterContainer = document.createElement('span');
    // Initially hidden; will be displayed when appended to H2
    filterContainer.style.cssText = 'display:none; align-items:center; white-space:nowrap; gap:5px;';

    const filterWrapper = document.createElement('span');
    filterWrapper.className = 'mb-filter-wrapper';
    filterWrapper.style.cssText = 'position:relative; display:inline-block;';

    const filterInput = document.createElement('input');
    filterInput.placeholder = `Global Filter...`;
    filterInput.title = 'Enter global filter string';
    filterInput.style.cssText = 'font-size:1em; padding:2px 20px 2px 6px; border:2px solid #ccc; border-radius:3px; width:500px; height:24px; box-sizing:border-box; transition:box-shadow 0.2s;';

    const filterClear = document.createElement('span');
    filterClear.textContent = '✕';
    filterClear.style.cssText = 'position:absolute; right:5px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:0.6em; color:#999; user-select:none;';
    filterClear.title = 'Clear global filter';

    filterWrapper.appendChild(filterInput);
    filterWrapper.appendChild(filterClear);

    const caseLabel = document.createElement('label');
    caseLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; font-weight: normal; display: flex; align-items: center; height: 24px; margin: 0px;';
    const caseCheckbox = document.createElement('input');
    caseCheckbox.type = 'checkbox';
    caseCheckbox.style.cssText = 'margin-right: 2px; vertical-align: middle;';
    caseLabel.appendChild(caseCheckbox);
    caseLabel.appendChild(document.createTextNode('Cc'));
    caseLabel.title = 'Case Sensitive Filtering';

    const regexpLabel = document.createElement('label');
    regexpLabel.style.cssText = 'font-size: 0.8em; cursor: pointer; font-weight: normal; display: flex; align-items: center; height: 24px; margin: 0px;';
    const regexpCheckbox = document.createElement('input');
    regexpCheckbox.type = 'checkbox';
    regexpCheckbox.style.cssText = 'margin-right: 2px; vertical-align: middle;';
    regexpLabel.appendChild(regexpCheckbox);
    regexpLabel.appendChild(document.createTextNode('Rx'));
    regexpLabel.title = 'RegExp Filtering';

    filterContainer.appendChild(filterWrapper);
    filterContainer.appendChild(caseLabel);
    filterContainer.appendChild(regexpLabel);
    filterContainer.appendChild(preFilterMsg);

    const unhighlightFilterBtn = document.createElement('button');
    unhighlightFilterBtn.textContent = 'Unhighlight prefilter';
    unhighlightFilterBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; cursor:pointer;';
    unhighlightFilterBtn.onclick = () => {
        document.querySelectorAll('.mb-pre-filter-highlight')
            .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

        Lib.info('filter', 'Prefilter highlights removed.');
    };
    filterContainer.appendChild(unhighlightFilterBtn);

    const unhighlightAllBtn = document.createElement('button');
    unhighlightAllBtn.textContent = 'Unhighlight all';
    unhighlightAllBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; cursor:pointer;';
    unhighlightAllBtn.onclick = () => {
        document.querySelectorAll('.mb-pre-filter-highlight, .mb-global-filter-highlight, .mb-column-filter-highlight')
            .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

        Lib.info('filter', 'All highlights removed.');
    };
    filterContainer.appendChild(unhighlightAllBtn);

    const clearColumnFiltersBtn = document.createElement('button');
    clearColumnFiltersBtn.textContent = 'Clear all column filters';
    clearColumnFiltersBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; cursor:pointer;';
    clearColumnFiltersBtn.onclick = () => {
        // Clear all column filters only
        document.querySelectorAll('.mb-col-filter-input').forEach(input => {
            input.value = '';
        });

        // Re-run filter to update display
        if (typeof runFilter === 'function') {
            runFilter();
        }

        Lib.info('filter', 'All column filters cleared');

        // Show feedback in status
        const statusDisplay = document.getElementById('mb-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = '✓ All column filters cleared';
            statusDisplay.style.color = 'green';
        }
    };
    filterContainer.appendChild(clearColumnFiltersBtn);

    const clearAllFiltersBtn = document.createElement('button');
    clearAllFiltersBtn.textContent = 'Clear all filters';
    clearAllFiltersBtn.style.cssText = 'font-size:0.8em; padding:2px 6px; cursor:pointer;';
    clearAllFiltersBtn.onclick = () => {
        // Clear global filter
        filterInput.value = '';
        filterClear.click(); // This will trigger the clear handler

        // Also call the main clearAllFilters function
        clearAllFilters();
    };
    filterContainer.appendChild(clearAllFiltersBtn);

    const statusDisplay = document.createElement('span');
    statusDisplay.id = 'mb-status-display';
    statusDisplay.style.cssText = 'font-size:0.8em; color:#333; display:flex; align-items:center; height:24px; font-weight:bold;';
    filterContainer.appendChild(statusDisplay);

    const timerDisplay = document.createElement('span');
    timerDisplay.style.cssText = 'font-size:0.5em; color:#666; display:flex; align-items:center; height:24px;';

    controlsContainer.appendChild(stopBtn);
    controlsContainer.appendChild(globalStatusDisplay);
    controlsContainer.appendChild(progressContainer);
    // Filter container is NOT appended here anymore; moved to H2 later
    controlsContainer.appendChild(timerDisplay);

    const style = document.createElement('style');
    style.textContent = `
        .mb-sorting-active, .mb-sorting-active * { cursor: wait !important; }
        .mb-show-all-btn-active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        button.mb-show-all-btn-loading:disabled {
            cursor: default !important;
            color: buttontext !important;
            opacity: 1 !important;
            border: 1px solid #767676 !important;
        }
        .sort-icon-btn { cursor: pointer; padding: 0 2px; font-weight: bold; transition: color 0.1s; color: black; border-radius: 2px; }
        .sort-icon-active { color: Green !important; background-color: #FFFF00 !important; }
        .mb-row-count-stat { color: blue; font-weight: bold; margin-left: 8px; }
        .mb-toggle-h3:hover, .mb-toggle-h2:hover {
            color: #222;
            background-color: #f9f9f9;
        }
        .mb-toggle-h3 { cursor: pointer; user-select: none; border-bottom: 1px solid #eee; padding: 4px 0; margin-left: 1.5em; }
        .mb-toggle-h2 { cursor: pointer; user-select: none; }
        .mb-toggle-icon { font-size: 0.8em; margin-right: 8px; color: #666; width: 12px; display: inline-block; cursor: pointer; }
        .mb-master-toggle { color: #0066cc; font-weight: bold; margin-left: 15px; font-size: 0.8em; vertical-align: middle; display: inline-block; cursor: default; }
        .mb-master-toggle span { cursor: pointer; }
        .mb-master-toggle span:hover { text-decoration: underline; }
        .mb-column-filter-highlight {
            color: ${Lib.settings.sa_column_filter_highlight_color};
            background-color: ${Lib.settings.sa_column_filter_highlight_bg};
        }
        .mb-global-filter-highlight {
            color: ${Lib.settings.sa_global_filter_highlight_color};
            background-color: ${Lib.settings.sa_global_filter_highlight_bg};
        }
        .mb-pre-filter-highlight {
            color: ${Lib.settings.sa_pre_filter_highlight_color};
            background-color: ${Lib.settings.sa_pre_filter_highlight_bg};
            font-weight: bold;
        }
        .mb-col-filter-input {
            width: 100%;
            font-size: 1em;
            padding: 1px 18px 1px 4px;
            box-sizing: border-box;
            transition: box-shadow 0.2s;
            display: block;
        }
        .mb-col-filter-wrapper {
            position: relative;
            width: 100%;
            display: block;
        }
        .mb-col-filter-clear {
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #999;
            font-size: 0.8em;
            user-select: none;
        }
        .mb-col-filter-row th {
            padding: 2px 4px !important;
        }
    `;
    document.head.appendChild(style);

    if (headerContainer.tagName === 'A') {
        headerContainer.after(controlsContainer);
    } else {
        headerContainer.appendChild(controlsContainer);
    }

    let allRows = [];
    let originalAllRows = [];
    let groupedRows = [];
    let isLoaded = false;
    let stopRequested = false;
    let multiTableSortStates = new Map();

    /**
     * Shows a modernized dialog to enter pre-filter criteria before loading data from disk.
     * Includes history of previous filter expressions and triggers the file loading process.
     */
    async function showLoadFilterDialog() {
        const historyLimit = Lib.settings.sa_load_history_limit || 10;
        let history = GM_getValue('sa_load_filter_history', []);

        const overlay = document.createElement('div');
        overlay.id = 'sa-load-dialog-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:20000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(2px);';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:#fff; padding:24px; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.3); width:380px; font-family:sans-serif; border:1px solid #ccc; position:relative;';

        dialog.innerHTML = `
            <div style="margin-bottom:18px; border-bottom:1px solid #eee; padding-bottom:12px;">
                <h3 style="margin:0; color:#222; font-size:1.2em;">📂 Load Table Data</h3>
                <p style="margin:5px 0 0; color:#666; font-size:0.85em;">Filter rows while loading from disk</p>
            </div>

            <div style="margin-bottom:15px; position:relative;">
                <div style="display:flex; gap:4px;">
                    <input id="sa-load-filter-input" type="text" placeholder="Search expression..."
                        style="flex:1; padding:8px 12px; border:1px solid #ccc; border-radius:6px; font-size:1em; outline:none;">
                    ${history.length > 0 ? `
                    <button id="sa-load-history-toggle" title="Show history" style="padding:0 8px; background:#f0f0f0; border:1px solid #ccc; border-radius:6px; cursor:pointer;">▾</button>
                    ` : ''}
                </div>
                <div id="sa-load-history-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:20001; max-height:150px; overflow-y:auto; margin-top:4px;">
                    ${history.map(item => `<div class="sa-history-item" style="padding:8px 12px; cursor:pointer; font-size:0.9em; border-bottom:1px dotted #eee;">${item}</div>`).join('')}
                </div>
            </div>

            <div style="display:flex; gap:20px; justify-content:center; margin-bottom:20px; background:#f9f9f9; padding:10px; border-radius:8px;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9em; font-weight:600;">
                    <input type="checkbox" id="sa-load-case"> Case Sensitive
                </label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9em; font-weight:600;">
                    <input type="checkbox" id="sa-load-regex"> Regular Expression
                </label>
            </div>

            <div style="display:flex; gap:12px;">
                <button id="sa-load-confirm" style="flex:2; padding:10px; background:#4CAF50; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Load Data</button>
                <button id="sa-load-cancel" style="flex:1; padding:10px; background:#f0f0f0; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer;">Cancel</button>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(dialog);

        const input = dialog.querySelector('#sa-load-filter-input');
        if (input) {
            const MIN_DIALOG_WIDTH = 380;            // initial/default width
            const MAX_DIALOG_MARGIN = 40;            // space from window edges

            // Function to measure text width using a hidden span
            const measureTextWidth = (text) => {
                const span = document.createElement('span');
                span.style.cssText = `
                    visibility:hidden;
                    position:absolute;
                    white-space:pre;
                    font-size:${getComputedStyle(input).fontSize};
                    font-family:${getComputedStyle(input).fontFamily};
                    font-weight:${getComputedStyle(input).fontWeight};
                `;
                span.textContent = text;
                document.body.appendChild(span);
                const width = span.offsetWidth + 40; // add input padding/margin
                document.body.removeChild(span);
                return width;
            };

            // Function to resize dialog
            const resizeDialog = () => {
                const requiredWidth = measureTextWidth(input.value || input.placeholder);
                const maxWidth = window.innerWidth - MAX_DIALOG_MARGIN;
                dialog.style.width = `${Math.min(Math.max(MIN_DIALOG_WIDTH, requiredWidth), maxWidth)}px`;
            };

            // Initial adjustment
            resizeDialog();

            // Adjust dynamically as user types
            input.addEventListener('input', resizeDialog);

            // Optional: adjust on window resize to respect viewport
            window.addEventListener('resize', resizeDialog);
        }

        const historyToggle = dialog.querySelector('#sa-load-history-toggle');
        const historyDropdown = dialog.querySelector('#sa-load-history-dropdown');

        input.focus();

        // Inject hover styles
        const styleId = 'sa-load-popup-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .sa-history-item:hover { background: #f0f0f0 !important; }
                #sa-load-confirm:hover { background: #45a049 !important; }
                #sa-load-cancel:hover { background: #e0e0e0 !important; }
            `;
            document.head.appendChild(style);
        }

        const closeDialog = () => {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                Lib.debug('ui', 'Load dialog closed via Escape key');
                closeDialog();
            }
        };

        document.addEventListener('keydown', handleEsc);

        // History Logic
        if (historyToggle) {
            historyToggle.onclick = (e) => {
                e.stopPropagation();
                historyDropdown.style.display = historyDropdown.style.display === 'none' ? 'block' : 'none';
            };
            dialog.querySelectorAll('.sa-history-item').forEach(el => {
                el.onclick = () => {
                    input.value = el.textContent;
                    historyDropdown.style.display = 'none';
                };
            });
        }

        // Close dropdown when clicking elsewhere
        window.onclick = (e) => {
            if (historyDropdown && !historyDropdown.contains(e.target) && e.target !== historyToggle) {
                historyDropdown.style.display = 'none';
            }
        };

        dialog.querySelector('#sa-load-confirm').onclick = () => {
            const query = input.value.trim();
            const useCase = dialog.querySelector('#sa-load-case').checked;
            const useRegex = dialog.querySelector('#sa-load-regex').checked;

            // Update persistent history
            if (query && historyLimit > 0) {
                let updatedHistory = [query, ...history.filter(h => h !== query)].slice(0, historyLimit);
                GM_setValue('sa_load_filter_history', updatedHistory);
                Lib.debug('cache', `Updated load filter history. Current count: ${updatedHistory.length}`);
            }

            // Sync with existing UI variables (assuming global references like preFilterInput)
            if (typeof preFilterInput !== 'undefined') {
                preFilterInput.value = query;
                if (typeof preFilterCaseLabel !== 'undefined') {
                    preFilterCaseLabel.querySelector('input').checked = useCase;
                }
                if (typeof preFilterRegexLabel !== 'undefined') {
                    preFilterRegexLabel.querySelector('input').checked = useRegex;
                }
            }

            closeDialog();

            // Trigger the actual file input click
            Lib.info('cache', 'Load confirmed. Triggering file selector...');
            fileInput.click();
        };

        dialog.querySelector('#sa-load-cancel').onclick = closeDialog;
        overlay.onclick = (e) => { if (e.target === overlay) closeDialog(); };
    }

    /**
     * Triggers a file selection dialog to load table data from disk with optional pre-filtering
     * @param {string} filterQueryRaw - Pre-filter query string to apply after loading
     * @param {boolean} isCaseSensitive - Whether the pre-filter should be case-sensitive
     * @param {boolean} isRegExp - Whether the pre-filter should be treated as a regular expression
     */
    function triggerDiskLoad(filterQueryRaw, isCaseSensitive, isRegExp) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                loadTableDataFromDisk(file, filterQueryRaw, isCaseSensitive, isRegExp);
            }
        };

        fileInput.click();
    }

    /**
     * Normalizes alias table structure by removing invisible action columns and ensuring proper formatting
     * @param {HTMLTableElement} table - The alias table element to normalize
     */
    function normalizeAliasTable(table) {
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(tr => {
            // Remove invisible actions column (body only)
            const actionsTd = tr.querySelector('td.actions');
            if (actionsTd) {
                actionsTd.remove();
            }

            // Expand first cell if it spans Alias + Sort name
            const firstTd = tr.querySelector('td[colspan="2"]');
            if (firstTd) {
                firstTd.removeAttribute('colspan');

                const sortNameTd = document.createElement('td');
                sortNameTd.textContent = ''; // MB leaves this empty on alias pages

                firstTd.after(sortNameTd);
            }
        });

        Lib.debug('cleanup', 'Normalized alias table structure (actions removed, colspan expanded).');
    }

    /**
     * Filters tables from a document/container based on a preceding header text
     * @param {Document|HTMLElement} doc - The document or container element to search in
     * @param {string} targetHeader - The header text to look for (case-insensitive partial match)
     * @returns {Array<HTMLTableElement>} Array of table elements found after the target header
     */
    function parseDocumentForTables(doc, targetHeader) {
        let tablesToProcess = [];

        if (targetHeader) {
            const headers = Array.from(doc.querySelectorAll('h2'));
            const foundH2 = headers.find(h => h.textContent.trim().toLowerCase().includes(targetHeader.toLowerCase()));

            if (foundH2) {
                Lib.debug('parse', `Found header ${foundH2}`);
                let next = foundH2.nextElementSibling;
                while (next && next.nodeName !== 'H2') {
                    if (next.classList.contains('tbl')) {
                        Lib.debug('parse', `Found table...`);
                        tablesToProcess.push(next);
                    } else {
                        const innerTables = next.querySelectorAll('table.tbl');
                        if (innerTables.length > 0) tablesToProcess.push(...Array.from(innerTables));
                    }
                    next = next.nextElementSibling;
                }
            }
        } else {
            Lib.debug('parse', 'No targetHeader provided; returning all tables found in container.');
            tablesToProcess = Array.from(doc.querySelectorAll('table.tbl'));
        }

        Lib.debug('parse', `parseDocumentForTables: Found ${tablesToProcess.length} total tables. Target header filter: "${targetHeader || 'none'}"`);
        return tablesToProcess;
    }

    /**
     * Removes various clutter elements from the MusicBrainz page to prepare for consolidated view.
     */
    function performClutterCleanup() {
        Lib.info('cleanup', 'Starting clutter element removal.');

        // Remove Jesus2099 bigbox elements
        const bigBoxCount = document.querySelectorAll('div.jesus2099userjs154481bigbox').length;
        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(div => div.remove());
        if (bigBoxCount > 0) Lib.debug('cleanup', `Removed ${bigBoxCount} jesus2099 bigbox elements.`);

        // Remove relationship helper tables
        let relationTablesCount = 0;
        document.querySelectorAll('table[style*="background: rgb(242, 242, 242)"]').forEach(table => {
            if (table.textContent.includes('Relate checked recordings to')) {
                table.remove();
                relationTablesCount++;
            }
        });
        if (relationTablesCount > 0) Lib.debug('cleanup', `Removed ${relationTablesCount} relation helper tables.`);

        // Remove the release group filter paragraph
        let filterParaRemoved = false;
        document.querySelectorAll('p').forEach(p => {
            if (p.textContent.includes('Showing official release groups by this artist') || p.textContent.includes('Showing all release groups by this artist')) {
                p.remove();
                filterParaRemoved = true;
            }
        });
        if (filterParaRemoved) Lib.debug('cleanup', 'Removed artist release group filter description paragraph.');

        // Remove Slick slider containers
        const sliderCount = document.querySelectorAll('div[style*="width: 700px"] > div.slider.multiple-items').length;
        document.querySelectorAll('div[style*="width: 700px"] > div.slider.multiple-items').forEach(div => {
            const parent = div.parentElement;
            if (parent && parent.style.width === '700px') parent.remove();
        });
        if (sliderCount > 0) Lib.debug('cleanup', `Removed ${sliderCount} Slick slider containers.`);

        // Target details blocks containing many images (likely the cover art gallery)
        let removedDetailsCount = 0;
        document.querySelectorAll('details').forEach(det => {
            const imgCount = det.querySelectorAll('img').length;
            if (imgCount > 5) {
                det.remove();
                removedDetailsCount++;
                Lib.debug('cleanup', `Removed <details> block containing ${imgCount} images.`);
            }
        });
        if (removedDetailsCount > 0) Lib.info('cleanup', `Removed ${removedDetailsCount} gallery/details blocks.`);

        if (pageType === 'events' || pageType === 'artist-releasegroups') {
            removeSanojjonasContainers();
        }
    }

    /**
     * Fetches the maximum page number by making a request to a URL and parsing its pagination
     * @param {string} targetPath - The path to fetch (relative to site origin)
     * @param {Object} queryParams - Query parameters to include in the URL
     * @returns {Promise<number>} The maximum page number found, defaults to 1 on error
     */
    async function fetchMaxPageGeneric(targetPath, queryParams = {}) {
        const url = new URL(window.location.origin + targetPath);
        Object.keys(queryParams).forEach(k => url.searchParams.set(k, queryParams[k]));
        url.searchParams.set('page', '1');
        Lib.info('fetch', `Fetching maxPage from: ${url.toString()}`);
        try {
            const html = await fetchHtml(url.toString());
            const doc = new DOMParser().parseFromString(html, 'text/html');
            let maxPage = 1;
            const pagination = doc.querySelector('ul.pagination');
            if (pagination) {
                const links = Array.from(pagination.querySelectorAll('li a'));
                const nextIdx = links.findIndex(a => a.textContent.trim() === 'Next');
                if (nextIdx > 0) {
                    const urlObj = new URL(links[nextIdx - 1].href, window.location.origin);
                    const p = urlObj.searchParams.get('page');
                    if (p) maxPage = parseInt(p, 10);
                } else if (links.length > 0) {
                    const pageNumbers = links
                        .map(a => {
                            const p = new URL(a.href, window.location.origin).searchParams.get('page');
                            return p ? parseInt(p, 10) : 1;
                        })
                        .filter(num => !isNaN(num));
                    if (pageNumbers.length > 0) maxPage = Math.max(...pageNumbers);
                }
            }
            Lib.info('success', `Determined maxPage: ${maxPage}`);
            return maxPage;
        } catch (err) {
            Lib.error('fetch', 'Error fetching maxPage:', err);
            return 1;
        }
    }

    /**
     * Removes specific DOM elements created by other MusicBrainz userscripts (Sanojjonas containers)
     * to prevent conflicts and clean up the page
     */
    function removeSanojjonasContainers() {
        Lib.debug('cleanup', 'Removing Sanojjonas containers...');
        const idsToRemove = ['load', 'load2', 'load3', 'load4', 'bottom1', 'bottom2', 'bottom3', 'bottom4', 'bottom5', 'bottom6'];
        idsToRemove.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }

    /**
     * Signals other scripts (like FUNKEY ILLUSTRATED RECORDS) to stop their loops.
     */
    function stopOtherScripts() {
        Lib.info('cleanup', 'Signalling other scripts to stop...');
        window.stopAllUserScripts = true;
        // Dispatch custom event for scripts listening for inter-script signals
        window.dispatchEvent(new CustomEvent('mb-stop-all-scripts'));
    }

    /**
     * Updates the H2 header row count display to show filtered vs total rows
     * @param {number} filteredCount - Number of rows currently visible after filtering
     * @param {number} totalCount - Total number of rows in the table
     */
    function updateH2Count(filteredCount, totalCount) {
        Lib.debug('render', `Starting updateH2Count: filtered=${filteredCount}, total=${totalCount}`);

        const table = document.querySelector('table.tbl');
        if (!table) {
            Lib.debug('render', 'Aborting updateH2Count: No table.tbl found on page.');
            return;
        }

        let allH2s = Array.from(document.querySelectorAll('h2'));
        let targetH2 = null;

        Lib.debug('render', `Searching for target H2. Current pageType: ${pageType}`);

        // Prioritize explicit selector from definition (e.g., for Search pages which have no h2)
        if (activeDefinition && activeDefinition.rowTargetSelector) {
            targetH2 = document.querySelector(activeDefinition.rowTargetSelector);
            if (targetH2) {
                Lib.debug('render', `Target found using rowTargetSelector: ${activeDefinition.rowTargetSelector}`);
            }
        }

        if (!targetH2) {
            Lib.debug('render', 'Target H2 not found by specific type, falling back to document position logic.');
            for (let i = 0; i < allH2s.length; i++) {
                if (allH2s[i].compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    targetH2 = allH2s[i];
                } else {
                    Lib.debug('render', `Stopping H2 search at index ${i}: table no longer follows this header.`);
                    break;
                }
            }
        }

        if (targetH2) {
            // Transformation logic for non-H2 targets (e.g. search results paragraph)
            if (activeDefinition.features?.transformToH2 && targetH2.tagName !== 'H2') {

                // Get the method value from the URL
                const urlParams = new URLSearchParams(window.location.search);
                const methodValue = urlParams.get('method'); // e.g., "direct"

                let prefix = ""; // Initialize prefix as empty string
                if (pageType === 'search' && methodValue) {
                    // Format the string (Capitalize first letter + " search: ")
                    prefix = methodValue.charAt(0).toUpperCase() + methodValue.slice(1) + " search: ";
                    Lib.debug('render', `Search method identified: "${prefix}..."`);
                }

                Lib.debug('render', `Transforming ${targetH2.tagName} to H2 per configuration.`);
                const newH2 = document.createElement('h2');

                // Prepend the prefix to the original content
                newH2.innerHTML = prefix + targetH2.innerHTML;

                targetH2.replaceWith(newH2);
                targetH2 = newH2; // Update reference for subsequent operations
            }

            // Safe access to textContent
            let targetH2Name = targetH2.textContent ? targetH2.textContent.trim().substring(0, 30) : 'Unknown Header';
            Lib.debug('render', `Target element identified: "${targetH2Name}..."`);

            const existing = targetH2.querySelector('.mb-row-count-stat');
            if (existing) {
                Lib.debug('render', 'Removing existing row count stat span.');
                existing.remove();
            }

            const span = document.createElement('span');
            span.className = 'mb-row-count-stat';
            const countText = (filteredCount === totalCount) ? `(${totalCount})` : `(${filteredCount} of ${totalCount})`;
            span.textContent = countText;

            // Positioning Logic: Ensure the row count stays immediately after header text, before Master Toggle or Global Filter
            const referenceNode = targetH2.querySelector('.mb-master-toggle') || filterContainer;
            if (referenceNode && referenceNode.parentNode === targetH2) {
                Lib.debug('render', `Inserting count span before referenceNode: ${referenceNode.className || referenceNode.tagName}`);
                targetH2.insertBefore(span, referenceNode);
            } else {
                Lib.debug('render', 'No valid referenceNode found inside targetH2; appending count span to end.');
                targetH2.appendChild(span);
            }

            if (activeDefinition.tableMode !== 'multi') {

                if (filterContainer.parentNode !== targetH2) {
                    Lib.debug('render', 'Appending filterContainer to targetH2.');
                    targetH2.appendChild(filterContainer);
                    filterContainer.style.display = 'inline-flex';
                    filterContainer.style.marginLeft = '15px';
                    filterContainer.style.verticalAlign = 'middle';
                } else {
                    Lib.debug('render', 'filterContainer is already attached to targetH2.');
                }
            }

            Lib.debug('render', `Updated header/target ${targetH2Name} count: ${countText}`);
        } else {
            Lib.debug('render', 'Failed to identify a target H2 header for count update.');
        }
    }

    /**
     * Helper to get visible text only, explicitly ignoring script/style tags
     * @param {HTMLElement} element - The element to extract text from
     * @returns {string} The visible text content with whitespace joined
     */
    function getCleanVisibleText(element) {
        let textParts = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName.toLowerCase();
                    if (tag === 'script' || tag === 'style' || tag === 'head') return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE) textParts.push(node.nodeValue);
        }
        return textParts.join(' ');
    }

    /**
     * Get clean visible text for column filtering, skipping decorative elements
     * This function filters out common decorative content like:
     * - Expand/collapse icons (▶, ▼, ►, etc.)
     * - Image placeholder elements (empty spans with background-images)
     * - Pure whitespace text nodes
     */
    function getCleanColumnText(element) {
        let textParts = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName.toLowerCase();
                    // Skip script, style, head
                    if (tag === 'script' || tag === 'style' || tag === 'head') return NodeFilter.FILTER_REJECT;

                    // Skip elements that are purely decorative (image placeholders)
                    if (node.classList && (
                        node.classList.contains('artwork-icon') ||
                        node.classList.contains('caa-icon') ||
                        node.classList.contains('icon')
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                // Skip text nodes that are just decorative icons or pure whitespace
                const trimmed = text.trim();
                if (trimmed && !isDecorativeIcon(trimmed)) {
                    textParts.push(text);
                }
            }
        }
        return textParts.join(' ');
    }

    /**
     * Check if a string is just a decorative icon character
     */
    function isDecorativeIcon(text) {
        // Common decorative characters used in the UI
        const decorativeChars = ['▶', '▼', '►', '◄', '▲', '▾', '⏵', '⏷', '⏴', '⏶', '●', '○', '■', '□'];
        return decorativeChars.includes(text);
    }

    /**
     * Highlights matching text in table rows based on filter query
     * @param {HTMLTableRowElement} row - The table row to highlight text in
     * @param {string} query - The search query to highlight
     * @param {boolean} isCaseSensitive - Whether the search should be case-sensitive
     * @param {number} targetColIndex - Specific column index to highlight (-1 for all columns)
     * @param {boolean} isRegExp - Whether to treat the query as a regular expression
     * @param {string} highlightType - Type of highlight: 'auto', 'prefilter', 'global', or 'column'
     */
    function highlightText(row, query, isCaseSensitive, targetColIndex = -1, isRegExp = false, highlightType = 'auto') {
        if (!query) return;
        let regex;
        const flags = isCaseSensitive ? 'g' : 'gi';

        if (isRegExp) {
            try {
                regex = new RegExp(`(${query})`, flags);
            } catch (e) {
                // Fallback to literal if regexp is invalid
                regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
            }
        } else {
            regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
        }

        let className;

        if (highlightType === 'prefilter') {
            className = 'mb-pre-filter-highlight';
        } else if (highlightType === 'global') {
            className = 'mb-global-filter-highlight';
        } else if (highlightType === 'column') {
            className = 'mb-column-filter-highlight';
        } else {
            // default automatic behaviour (existing logic)
            className = targetColIndex === -1
                ? 'mb-global-filter-highlight'
                : 'mb-column-filter-highlight';
        }

        row.querySelectorAll('td').forEach((td, idx) => {
            if (targetColIndex !== -1 && idx !== targetColIndex) return;

            const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    const parentTag = node.parentNode?.tagName?.toLowerCase();
                    if (parentTag === 'script' || parentTag === 'style') return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }, false);

            let node;
            const nodesToReplace = [];
            while (node = walker.nextNode()) {
                const val = node.nodeValue;
                let match = false;
                if (isRegExp) {
                    try {
                        match = new RegExp(query, isCaseSensitive ? '' : 'i').test(val);
                    } catch (e) {
                        match = isCaseSensitive ? val.includes(query) : val.toLowerCase().includes(query.toLowerCase());
                    }
                } else {
                    match = isCaseSensitive ? val.includes(query) : val.toLowerCase().includes(query.toLowerCase());
                }
                if (match) nodesToReplace.push(node);
            }
            nodesToReplace.forEach(textNode => {
                const span = document.createElement('span');
                span.innerHTML = textNode.nodeValue.replace(regex, `<span class="${className}">$1</span>`);
                textNode.parentNode.replaceChild(span, textNode);
            });
        });
    }

    /**
     * Adds a filter row beneath the table header with input fields for per-column filtering
     * @param {HTMLTableElement} table - The table to add column filters to
     */
    function addColumnFilterRow(table) {
        const thead = table.tHead;
        if (!thead || thead.querySelector('.mb-col-filter-row')) return;

        const originalHeader = thead.querySelector('tr');
        const filterRow = document.createElement('tr');
        filterRow.className = 'mb-col-filter-row';

        Array.from(originalHeader.cells).forEach((cell, idx) => {
            const th = document.createElement('th');
            // Maintain alignment by matching the display logic of header
            th.style.width = cell.style.width;

            if (cell.querySelector('input[type="checkbox"]')) {
                filterRow.appendChild(th);
                return;
            }

            const wrapper = document.createElement('span');
            wrapper.className = 'mb-col-filter-wrapper';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '...';
            input.title = 'Enter column filter string';
            input.className = 'mb-col-filter-input';
            input.dataset.colIdx = idx;

            const clear = document.createElement('span');
            clear.className = 'mb-col-filter-clear';
            clear.textContent = '✕';
            clear.title = 'Clear column filter';
            clear.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.value = '';
                runFilter(); // Immediate for explicit clear action
            };

            // Use debounced version for typing in column filters
            const debouncedColumnFilter = debounce(() => {
                Lib.debug('filter', `Column filter updated on column ${idx}: "${input.value}"`);
                runFilter();
            }, Lib.settings.sa_filter_debounce_delay || 300);

            input.addEventListener('input', (e) => {
                e.stopPropagation();
                debouncedColumnFilter();
            });

            // Handle Escape key to clear column filter (immediate)
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    input.value = '';
                    runFilter();
                }
            });

            wrapper.appendChild(input);
            wrapper.appendChild(clear);
            th.appendChild(wrapper);
            filterRow.appendChild(th);
        });
        thead.appendChild(filterRow);
    }

    /**
     * Executes the filtering logic across all table rows based on global and column-specific filters
     * Handles both single-table and multi-table page modes, applies highlighting, and updates row visibility
     */
    function runFilter() {
        const filterStartTime = performance.now();

        // Show filtering indicator in status display
        const statusDisplay = document.getElementById('mb-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = '⏳ Filtering...';
            statusDisplay.style.color = 'orange';
        }

        const isCaseSensitive = caseCheckbox.checked;
        const isRegExp = regexpCheckbox.checked;
        const globalQueryRaw = filterInput.value;
        const globalQuery = (isCaseSensitive || isRegExp) ? globalQueryRaw : globalQueryRaw.toLowerCase();

        let globalRegex = null;
        if (globalQueryRaw && isRegExp) {
            try {
                globalRegex = new RegExp(globalQueryRaw, isCaseSensitive ? '' : 'i');
                filterInput.style.border = '2px solid #ccc'; // Reset to standard if valid
            } catch (e) {
                filterInput.style.border = '2px solid red'; // Visual cue for invalid Regex
            }
        } else {
            filterInput.style.border = '2px solid #ccc';
        }

        // Apply colored box to global filter if active
        filterInput.style.boxShadow = globalQueryRaw ? '0 0 2px 2px red' : '';

        const __activeEl = document.activeElement;
        const __scrollY = window.scrollY;

        Lib.debug('filter', 'runFilter(): active element =', __activeEl?.className || '(none)');

        let filteredArray = []; // Declare outside to be accessible in status display
        if (activeDefinition.tableMode === 'multi') {
            let totalFiltered = 0;
            let totalAbsolute = 0;

            // Only pick tables that belong to the script to avoid MusicBrainz Info tables
            const tables = Array.from(document.querySelectorAll('table.tbl'))
                .filter(t => t.querySelector('.mb-col-filter-row'));

            groupedRows.forEach((group, groupIdx) => {
                totalAbsolute += group.rows.length;
                const table = tables[groupIdx];
                const colFiltersRaw = table ? Array.from(table.querySelectorAll('.mb-col-filter-input'))
                    .map(inp => {
                        // Apply colored box to column filter if active
                        inp.style.boxShadow = inp.value ? '0 0 2px 2px green' : '';
                        return { raw: inp.value, idx: parseInt(inp.dataset.colIdx, 10) };
                    }) : [];

                const colFilters = colFiltersRaw
                    .map(f => ({ val: (isCaseSensitive || isRegExp) ? f.raw : f.raw.toLowerCase(), idx: f.idx }))
                    .filter(f => f.val);

                const matches = group.rows.map(r => r.cloneNode(true)).filter(r => {
                    // Reset previous highlights (critical for correct filtering)
                    r.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight')
                        .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

                    // Global match
                    let globalHit = !globalQuery;
                    if (!globalHit) {
                        if (isRegExp && globalRegex) {
                            // For regex patterns, test against each cell individually
                            // This allows anchored patterns like ^Thunder Road to work correctly
                            globalHit = Array.from(r.cells).some(cell => {
                                const cellText = getCleanColumnText(cell);
                                return globalRegex.test(cellText);
                            });
                        } else {
                            // For non-regex, test against concatenated row text
                            const text = getCleanVisibleText(r);
                            globalHit = isCaseSensitive ? text.includes(globalQuery) : text.toLowerCase().includes(globalQuery);
                        }
                    }

                    // Column matches
                    let colHit = true;
                    for (const f of colFilters) {
                        const cellText = getCleanColumnText(r.cells[f.idx]);
                        let match = false;
                        if (isRegExp) {
                            try {
                                match = new RegExp(f.val, isCaseSensitive ? '' : 'i').test(cellText);
                            } catch (e) {
                                match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                            }
                        } else {
                            match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                        }
                        if (!match) {
                            colHit = false;
                            break;
                        }
                    }

                    const finalHit = globalHit && colHit;
                    if (finalHit) {
                        if (globalQuery) highlightText(r, globalQueryRaw, isCaseSensitive, -1, isRegExp);
                        colFilters.forEach(f => highlightText(r, f.val, isCaseSensitive, f.idx, isRegExp));
                    }
                    return finalHit;
                });

                // Always push to filteredArray, even if matches.length is 0, to maintain the table count and restoration capability
                filteredArray.push({ category: group.category || group.key || 'Unknown', rows: matches });
                totalFiltered += matches.length;
            });

            renderGroupedTable(filteredArray, pageType === 'artist-releasegroups', globalQuery || 're-run');

            /* Restore focus & scroll for column filters */
            if (__activeEl && __activeEl.classList.contains('mb-col-filter-input')) {
                const colIdx = __activeEl.dataset.colIdx;
                const allTables = Array.from(document.querySelectorAll('table.tbl'))
                    .filter(t => t.querySelector('.mb-col-filter-row'));
                const tableIdx = allTables.findIndex(t => t.contains(__activeEl));
                Lib.debug('filter', `Attempting focus restore: tableIdx=${tableIdx}, colIdx=${colIdx}`);
                if (allTables[tableIdx]) {
                    const newInput = allTables[tableIdx]
                        .querySelector(`.mb-col-filter-input[data-col-idx="${colIdx}"]`);
                    if (newInput) {
                        newInput.focus();
                        newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
                        Lib.debug('filter', 'Restored focus to column filter input');
                    } else {
                        Lib.debug('filter', 'Could not find replacement column filter input');
                    }
                }
            }
            updateH2Count(totalFiltered, totalAbsolute);
        } else {
            const totalAbsolute = allRows.length;
            const table = document.querySelector('table.tbl');
            const colFiltersRaw = table ? Array.from(table.querySelectorAll('.mb-col-filter-input'))
                .map(inp => {
                    // Apply green box to column filter if active
                    inp.style.boxShadow = inp.value ? '0 0 2px 2px green' : '';
                    return { raw: inp.value, idx: parseInt(inp.dataset.colIdx, 10) };
                }) : [];

            const colFilters = colFiltersRaw
                .map(f => ({ val: (isCaseSensitive || isRegExp) ? f.raw : f.raw.toLowerCase(), idx: f.idx }))
                .filter(f => f.val);

            const filteredRows = allRows.map(row => row.cloneNode(true)).filter(row => {
                // Reset previous highlights
                row.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight')
                    .forEach(n => n.replaceWith(document.createTextNode(n.textContent)));

                let globalHit = !globalQuery;
                if (!globalHit) {
                    if (isRegExp && globalRegex) {
                        // For regex patterns, test against each cell individually
                        // This allows anchored patterns like ^Thunder Road to work correctly
                        globalHit = Array.from(row.cells).some(cell => {
                            const cellText = getCleanColumnText(cell);
                            return globalRegex.test(cellText);
                        });
                    } else {
                        // For non-regex, test against concatenated row text
                        const text = getCleanVisibleText(row);
                        globalHit = isCaseSensitive ? text.includes(globalQuery) : text.toLowerCase().includes(globalQuery);
                    }
                }

                let colHit = true;
                for (const f of colFilters) {
                    const cellText = getCleanColumnText(row.cells[f.idx]);
                    let match = false;
                    if (isRegExp) {
                        try {
                            match = new RegExp(f.val, isCaseSensitive ? '' : 'i').test(cellText);
                        } catch (e) {
                            match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                        }
                    } else {
                        match = isCaseSensitive ? cellText.includes(f.val) : cellText.toLowerCase().includes(f.val);
                    }
                    if (!match) {
                        colHit = false;
                        break;
                    }
                }

                const finalHit = globalHit && colHit;
                if (finalHit) {
                    if (globalQuery) highlightText(row, globalQueryRaw, isCaseSensitive, -1, isRegExp);
                    colFilters.forEach(f => highlightText(row, f.val, isCaseSensitive, f.idx, isRegExp));
                }
                return finalHit;
            });
            renderFinalTable(filteredRows);
            updateH2Count(filteredRows.length, totalAbsolute);
        }
        // Maintain scroll position after filtering or sorting
        window.scrollTo(0, __scrollY);

        // Calculate and display filter timing
        const filterEndTime = performance.now();
        const filterDuration = (filterEndTime - filterStartTime).toFixed(0);

        if (statusDisplay) {
            const rowCount = activeDefinition.tableMode === 'multi' ?
                filteredArray.reduce((sum, g) => sum + g.rows.length, 0) :
                document.querySelectorAll('table.tbl tbody tr').length;

            // Build filter info string
            const filterParts = [];
            if (globalQuery) {
                filterParts.push(`global:"${globalQuery}"`);
            }

            // Count active column filters
            const activeColFilters = document.querySelectorAll('.mb-col-filter-input');
            const activeColCount = Array.from(activeColFilters).filter(inp => inp.value).length;
            if (activeColCount > 0) {
                filterParts.push(`${activeColCount} column filter${activeColCount > 1 ? 's' : ''}`);
            }

            const filterInfo = filterParts.length > 0 ? ` [${filterParts.join(', ')}]` : '';
            statusDisplay.textContent = `✓ Filtered ${rowCount} rows in ${filterDuration}ms${filterInfo}`;
            statusDisplay.style.color = filterDuration > 1000 ? 'red' : (filterDuration > 500 ? 'orange' : 'green');
        }

        Lib.debug('filter', `Filter completed in ${filterDuration}ms`);
    }

    stopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Lib.info('cleanup', 'Stop requested by user.');
        stopRequested = true;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
    });

    // Create debounced version of runFilter based on user configuration
    const debouncedRunFilter = debounce(runFilter, Lib.settings.sa_filter_debounce_delay || 300);

    // Handle Escape key to clear global filter
    filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            filterInput.value = '';
            runFilter(); // Use immediate version for clearing
        }
    });

    // Use debounced version for input events
    filterInput.addEventListener('input', debouncedRunFilter);

    // Use immediate version for checkbox changes (no typing involved)
    caseCheckbox.addEventListener('change', runFilter);
    regexpCheckbox.addEventListener('change', runFilter);

    // Use immediate version for clear button (explicit user action)
    filterClear.addEventListener('click', () => {
        filterInput.value = '';
        runFilter();
    });

    /**
     * Cleans up table headers by removing columns based on user settings
     * @param {HTMLTableSectionElement|HTMLTableRowElement} headerElement - The thead element or header row to clean up
     */
    function cleanupHeaders(headerElement) {
        if (!headerElement) return;
        const theadRow = (headerElement.tagName === 'THEAD') ? headerElement.querySelector('tr') : headerElement;
        if (!theadRow) return;

        Lib.debug(
            'cleanup',
            `cleanupHeaders() called → existing headers=[${Array.from(theadRow.cells).map(th => th.textContent.trim()).join(' | ')}]`
        );

        const headers = Array.from(theadRow.cells);
        const indicesToRemove = [];

        // Map header text prefixes to their corresponding library settings keys
        const removalMap = {
            'Relationships': 'sa_remove_rel',
            'Performance Attributes': 'sa_remove_perf',
            'Rating': 'sa_remove_rating',
            'Tagger': 'sa_remove_tagger',
            'Release events': 'sa_remove_release_events'
        };

        headers.forEach((th, idx) => {
            const txt = th.textContent.trim();

            for (const [headerPrefix, settingKey] of Object.entries(removalMap)) {
                if (txt.startsWith(headerPrefix)) {
                    const isEnabled = Lib.settings[settingKey];
                    if (isEnabled) {
                        Lib.debug('cleanup', `Marking column ${idx} ("${txt}") for removal. Match: "${headerPrefix}", Setting: "${settingKey}"`);
                        indicesToRemove.push(idx);
                    } else {
                        Lib.debug('cleanup', `Skipping removal of column ${idx} ("${txt}"). Setting "${settingKey}" is disabled.`);
                    }
                    break;
                }
            }
        });

        if (indicesToRemove.length > 0) {
            Lib.info('cleanup', `Removing ${indicesToRemove.length} columns from table.`);
            // Sort descending to ensure index stability during deletion
            indicesToRemove.sort((a, b) => b - a).forEach(idx => {
                const colName = theadRow.cells[idx]?.textContent.trim() || `index ${idx}`;
                theadRow.deleteCell(idx);
                Lib.debug('cleanup', `Successfully deleted column: ${colName}`);
            });
        } else {
            Lib.debug('cleanup', 'No columns were matched for removal based on current settings.');
        }

        const headerBgColor = '#d3d3d3';

        if (typesWithSplitCD.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            if (!headersText.includes('Country')) {
                const thC = document.createElement('th');
                thC.textContent = 'Country';
                thC.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: Country');
                theadRow.appendChild(thC);
            }
            if (!headersText.includes('Date')) {
                const thD = document.createElement('th');
                thD.textContent = 'Date';
                thD.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: Date');
                theadRow.appendChild(thD);
            }
        }

        if (typesWithSplitLocation.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            ['Place', 'Area', 'Country'].forEach(col => {
                if (!headersText.includes(col)) {
                    const th = document.createElement('th');
                    th.textContent = col;
                    th.style.backgroundColor = headerBgColor;
                    Lib.debug('cleanup', `Injecting synthetic header: ${col}`);
                    theadRow.appendChild(th);
                }
            });
        }

        if (typesWithSplitArea.includes(pageType)) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            ['MB-Area', 'Country'].forEach(col => {
                if (!headersText.includes(col)) {
                    const th = document.createElement('th');
                    th.textContent = col;
                    th.style.backgroundColor = headerBgColor;
                    Lib.debug('cleanup', `Injecting synthetic header: ${col}`);
                    theadRow.appendChild(th);
                }
            });
        }

        // Check if the generic split feature is enabled for this page definition
        const mainColConfig = activeDefinition.features?.extractMainColumn;
        const isMainColEnabled = mainColConfig !== undefined && mainColConfig !== null;

        // On pages where the configuration is enabled, create the "MB-Name" and "Comment" columns
        if (isMainColEnabled) {
            const headersText = Array.from(theadRow.cells).map(th => th.textContent.replace(/[⇅▲▼]/g, '').trim());
            if (!headersText.includes('MB-Name')) {
                const thN = document.createElement('th');
                thN.textContent = 'MB-Name';
                thN.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: MB-Name');
                theadRow.appendChild(thN);
            }
            if (!headersText.includes('Comment')) {
                const thC = document.createElement('th');
                thC.textContent = 'Comment';
                thC.style.backgroundColor = headerBgColor;
                Lib.debug('cleanup', 'Injecting synthetic header: Comment');
                theadRow.appendChild(thC);
            }
        }
    }

    /**
     * Determines the maximum page number by parsing the pagination UI on the current page
     * @returns {number} The maximum page number found, defaults to 1 if no pagination is present
     */
    function determineMaxPageFromDOM() {
        let maxPage = 1;

        Lib.debug('fetch', 'Context: Standard pagination. Parsing "ul.pagination" from current page.');
        const pagination = document.querySelector('ul.pagination');
        if (pagination) {
            const links = Array.from(pagination.querySelectorAll('li a'));
            const nextIdx = links.findIndex(a => a.textContent.trim() === 'Next');
            if (nextIdx > 0) {
                const urlObj = new URL(links[nextIdx - 1].href, window.location.origin);
                const p = urlObj.searchParams.get('page');
                if (p) {
                    maxPage = parseInt(p, 10);
                    Lib.debug('fetch', `determineMaxPageFromDOM: Found "Next" link. Extracted page: ${maxPage}`);
                }
            } else if (links.length > 0) {
                const pageNumbers = links
                      .map(a => {
                          const p = new URL(a.href, window.location.origin).searchParams.get('page');
                          return p ? parseInt(p, 10) : 1;
                      })
                      .filter(num => !isNaN(num));
                if (pageNumbers.length > 0) {
                    maxPage = Math.max(...pageNumbers);
                    Lib.debug('fetch', `determineMaxPageFromDOM: Parsed page numbers from list. Max found: ${maxPage}`);
                }
            }
            return maxPage;
        } else {
            return maxPage;
            Lib.debug('fetch', 'determineMaxPageFromDOM: No pagination element found; assuming single page (maxPage = 1).');
        }
    }

    /**
     * Shows a modal dialog asking user whether to render, save, or cancel when dataset is large
     * @param {number} totalRows - The total number of rows fetched
     * @param {number} pagesProcessed - The number of pages that were fetched
     * @returns {Promise<string>} - Returns 'render', 'save', or 'cancel'
     */
    function showRenderDecisionDialog(totalRows, pagesProcessed) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            // Create modal dialog
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                text-align: center;
            `;

            const pageLabel = (pagesProcessed === 1) ? 'page' : 'pages';

            dialog.innerHTML = `
                <h2 style="margin-top: 0; color: #333;">Large Dataset Fetched</h2>
                <p style="font-size: 16px; margin: 20px 0;">
                    Successfully fetched <strong>${totalRows.toLocaleString()} rows</strong> from <strong>${pagesProcessed} ${pageLabel}</strong>.
                </p>
                <p style="font-size: 14px; color: #666; margin: 20px 0;">
                    Rendering this many rows may take a considerable amount of time and could impact browser performance.
                    You can save the data directly to disk and load it later, or proceed with rendering now.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 25px;">
                    <button id="mb-dialog-save" style="
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: bold;
                    ">💾 Save to Disk</button>
                    <button id="mb-dialog-render" style="
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        background: #2196F3;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: bold;
                    ">🎨 Render Now</button>
                    <button id="mb-dialog-cancel" style="
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: bold;
                    ">❌ Cancel</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Add button event listeners
            document.getElementById('mb-dialog-save').onclick = () => {
                document.body.removeChild(overlay);
                resolve('save');
            };

            document.getElementById('mb-dialog-render').onclick = () => {
                document.body.removeChild(overlay);
                resolve('render');
            };

            document.getElementById('mb-dialog-cancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve('cancel');
            };

            // Allow ESC key to cancel
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', escHandler);
                    resolve('cancel');
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * Generalized fetching process that handles data retrieval and rendering for all page types
     * @param {Event} e - The click event from the button
     * @param {Object} buttonConfig - Button-specific configuration including params and features
     * @param {Object} baseDef - Base page definition from PAGE_DEFINITIONS
     */
    async function startFetchingProcess(e, buttonConfig, baseDef) {
        // MERGE LOGIC: Combine base definition with button-specific overrides
        // We create a new object to avoid polluting the original definition
        const mergedFeatures = {
            ...(baseDef.features || {}),
            ...(buttonConfig.features || {})
        };

        // Handle specific case: 'extractMainColumn' might be at root of button config (per your example)
        // but the script expects it inside 'features'.
        if (buttonConfig.extractMainColumn) {
            mergedFeatures.extractMainColumn = buttonConfig.extractMainColumn;
        }

        // Update the GLOBAL activeDefinition so helper functions (cleanupHeaders, etc.) see the changes
        activeDefinition = {
            ...baseDef,
            ...buttonConfig,
            features: mergedFeatures
        };

        // Update feature flags based on the merged activeDefinition
        typesWithSplitCD = (activeDefinition.features?.splitCD) ? [pageType] : [];
        typesWithSplitLocation = (activeDefinition.features?.splitLocation) ? [pageType] : [];
        typesWithSplitArea = (activeDefinition.features?.splitArea) ? [pageType] : [];

        const activeBtn = e.target;
        // Now access properties from the NEW activeDefinition
        const overrideParams = activeDefinition.params || null;
        const targetHeader = activeDefinition.targetHeader || null;

        e.preventDefault();
        e.stopPropagation();

        // UI Cleanup: If targeting a specific header, remove ONLY those h2 headers and
        // their associated tables from the current page which are part of the OTHER button configurations.
        if (targetHeader && activeDefinition && activeDefinition.buttons) {
            const otherHeaders = activeDefinition.buttons
                .map(b => b.targetHeader)
                .filter(oh => oh && oh !== targetHeader);

            if (otherHeaders.length > 0) {
                const container = document.getElementById('content') || document.body;

                // Specifically target h2 headers that belong to other configurations
                container.querySelectorAll('h2').forEach(h => {
                    const headerText = h.textContent.trim();
                    const isOtherConfigHeader = otherHeaders.some(oh => headerText.startsWith(oh));

                    if (isOtherConfigHeader) {
                        Lib.debug('cleanup', `Removing other configured section starting with header: "${headerText}"`);

                        // Remove everything starting with the h2 header AND eventual optional elements after it PLUS
                        // the final table
                        let next = h.nextElementSibling;
                        let tableRemoved = false;

                        while (next && !tableRemoved) {
                            let toRemove = next;
                            next = next.nextElementSibling;

                            // Safety check: stop if we hit another H2 header before finding a table to prevent over-deletion
                            // Note: H3 headers are allowed as they're often subsections within the main H2 section
                            if (toRemove.tagName === 'H2') {
                                Lib.debug('cleanup', `Stopping cleanup at next H2 header before finding table. This may indicate incomplete section removal.`);
                                break;
                            }

                            // Check if this sibling is the final table to remove
                            if (toRemove.tagName === 'TABLE' && toRemove.classList.contains('tbl')) {
                                tableRemoved = true;
                            }

                            toRemove.remove();
                        }

                        // Finally remove the header itself
                        h.remove();
                    }
                });
                Lib.debug('cleanup', `Cleaned UI to target header: "${targetHeader}"`);
            }
        }

        // Reload the page if a fetch process has already run to fix column-level filter unresponsiveness
        if (isLoaded) {
            Lib.info('meta', 'Second fetch attempt detected. Setting reload flag and reloading page to ensure filter stability.');
            sessionStorage.setItem('mb_show_all_reload_pending', 'true');
            window.location.reload();
            return;
        }

        // Stop other scripts immediately when an action button is pressed
        stopOtherScripts();

        // Clear existing highlights immediately from DOM for visual feedback
        document.querySelectorAll('.mb-global-filter-highlight, .mb-column-filter-highlight').forEach(n => {
            n.replaceWith(document.createTextNode(n.textContent));
        });

        // Clear existing filter conditions and UI highlights for a fresh start
        filterInput.value = '';
        filterInput.style.boxShadow = '';
        caseCheckbox.checked = false;
        document.querySelectorAll('.mb-col-filter-input').forEach(inp => {
            inp.value = '';
            inp.style.boxShadow = '';
        });

        // Reset all buttons back to original grey background
        allActionButtons.forEach(btn => {
            btn.style.backgroundColor = '';
            btn.style.color = '';
        });

        // Set initial starting color for active button
        activeBtn.style.backgroundColor = '#ffcccc'; // light red
        activeBtn.style.color = 'black';

        // Removed isLoaded block to allow re-fetching
        Lib.info('fetch', 'Starting fetch process...', overrideParams);
        globalStatusDisplay.textContent = 'Getting number of pages to fetch...';
        let maxPage = 1;

        // Determine maxPage based on context
        if (activeDefinition && activeDefinition.non_paginated) {
            // For non-paginated types, initially assume maxPage is 1
            Lib.info('fetch', 'Context: Non-paginated page definition. Initially assuming maxPage = 1.');
            maxPage = 1;
        } else if (overrideParams) {
            Lib.info('fetch', 'Context: overrideParams detected. Fetching maxPage with overrides.', overrideParams);
            maxPage = await fetchMaxPageGeneric(path, overrideParams);
        } else {
            Lib.info('fetch', 'Context: Paginated page definition. Fetching maxPage from DOM.');
            maxPage = determineMaxPageFromDOM();
        }

        // --- USERSCRIPT WARNING POPUP ---
        const maxThreshold = Lib.settings.sa_max_page;
        Lib.debug('fetch', `Total pages to fetch: ${maxPage}`);

        // If page count is above threshold, show modal
        if (maxPage > maxThreshold) {
            return new Promise((resolve) => {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top:0; left:0; width:100%; height:100%;
                    background: rgba(0,0,0,0.5);
                    display:flex; justify-content:center; align-items:center;
                    z-index:20000; backdrop-filter: blur(2px);
                `;

                // Create dialog
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background:white; padding:20px; border-radius:12px;
                    box-shadow:0 8px 32px rgba(0,0,0,0.3);
                    max-width:480px; width:90%;
                    font-family:sans-serif; text-align:left;
                `;

                // Message
                const msg = document.createElement('div');
                msg.style.marginBottom = '18px';
                msg.textContent = `Warning: This MusicBrainz entity has ${maxPage} pages.
                                   It's more than the configured maximum (${maxThreshold}) and could result in performance, memory or timing issues when downloading. Proceed?`;

                // Buttons container
                const btnContainer = document.createElement('div');
                btnContainer.style.cssText = 'display:flex; justify-content:flex-end; gap:12px;';

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                cancelBtn.style.cssText = 'padding:6px 12px; border-radius:6px; cursor:pointer; border:1px solid #ccc; background:#f0f0f0;';
                cancelBtn.onclick = () => {
                    cleanup(false);
                };

                const proceedBtn = document.createElement('button');
                proceedBtn.textContent = 'Proceed';
                proceedBtn.style.cssText = 'padding:6px 12px; border-radius:6px; cursor:pointer; border:none; background:#4CAF50; color:white;';
                proceedBtn.onclick = () => {
                    cleanup(true);
                };

                btnContainer.appendChild(cancelBtn);
                btnContainer.appendChild(proceedBtn);
                dialog.appendChild(msg);
                dialog.appendChild(btnContainer);
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);

                // Escape key closes as cancel
                const onEscape = (e) => {
                    if (e.key === 'Escape') cleanup(false);
                };
                document.addEventListener('keydown', onEscape);

                // Cleanup function
                function cleanup(confirmed) {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    document.removeEventListener('keydown', onEscape);
                    if (!confirmed) {
                        Lib.warn('warn', `High page count detected (${maxPage}). This may take a while and could trigger rate limiting.`);
                        activeBtn.style.backgroundColor = '';
                        activeBtn.style.color = '';
                        activeBtn.disabled = false;
                        globalStatusDisplay.textContent = '';
                    }
                    resolve(confirmed); // returns true if Proceed clicked
                }
            }).then((proceed) => {
                if (!proceed) return; // user cancelled, exit function
                // Continue with fetching pages...
            });
        }

        stopRequested = false;
        allRows = [];
        originalAllRows = [];
        groupedRows = [];

        // Run refactored clutter removal
        performClutterCleanup();

        if (pageType === 'events' || pageType === 'artist-releasegroups') removeSanojjonasContainers();

        // Update UI state
        activeBtn.disabled = true;
        activeBtn.classList.add('mb-show-all-btn-loading');
        allActionButtons.forEach(b => { if (b !== activeBtn) b.disabled = true; });

        stopBtn.style.display = 'inline-block';
        stopBtn.disabled = false;
        globalStatusDisplay.textContent = 'Initializing...';
        progressContainer.style.display = 'inline-block';
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = '#ffcccc';
        progressText.textContent = '';

        const startTime = performance.now();
        let fetchingTimeStart = performance.now();
        let totalFetchingTime = 0;
        let totalRenderingTime = 0;

        const baseUrl = window.location.origin + window.location.pathname;
        const currentUrlParams = new URLSearchParams(window.location.search);
        const currentPageNum = parseInt(currentUrlParams.get('page') || '1', 10);

        let pagesProcessed = 0;
        let cumulativeFetchTime = 0;
        let lastCategorySeenAcrossPages = null;
        let totalRowsAccumulated = 0;

        try {
            for (let p = 1; p <= maxPage; p++) {
                if (stopRequested) {
                    Lib.info('cleanup', 'Fetch loop stopped at page ' + p);
                    break;
                }
                pagesProcessed++;

                const pageStartTime = performance.now();

                // Initialize fetchUrl from the full current URL to preserve Search parameters (query, type, etc.)
                const fetchUrl = new URL(window.location.href);
                fetchUrl.searchParams.set('page', p.toString());

                if (overrideParams) {
                    Object.keys(overrideParams).forEach(k => fetchUrl.searchParams.set(k, overrideParams[k]));
                }

                let doc;
                try {
                    // If this page matches the current browser page and no specific overrides are requested, use the
                    // existing document instead of a redundant network fetch.
                    if (p === currentPageNum && (!overrideParams || Object.keys(overrideParams).length === 0)) {
                        Lib.info('fetch', `Page ${p} is current page. Using existing document.`);
                        doc = document;
                   } else {
                        Lib.info('fetch', `Fetching URL for page ${p}: ${fetchUrl.toString()}`);
                        const html = await fetchHtml(fetchUrl.toString());
                        doc = new DOMParser().parseFromString(html, "text/html");
                    }

                    if (!doc) {
                        throw new Error(`Failed to obtain document for page ${p}`);
                    }
                } catch (e) {
                    Lib.error('fetch', `Error fetching/parsing page ${p}:`, e);
                    break; // Stop fetching further pages on error
                }

                let countryDateIdx = -1;
                let locationIdx = -1;
                let areaIdx = -1;
                let mainColIdx = -1;
                let indicesToExclude = [];
                const headerNames = []; // Array to store header names for debugging

                // Retrieve configuration for the main column extraction
                const mainColConfig = activeDefinition.features?.extractMainColumn;

                // If configuration is a specific number, force that index immediately
                if (typeof mainColConfig === 'number') {
                    mainColIdx = mainColConfig;
                    Lib.debug('init', `mainColIdx forced to ${mainColIdx} by configuration.`);
                }
                // Prepare candidates list if config is string or array
                const mainColCandidates = Array.isArray(mainColConfig) ? mainColConfig : (mainColConfig ? [mainColConfig] : []);

                // Use parseDocumentForTables to filter which tables we actually process
                const tablesToProcess = parseDocumentForTables(doc, targetHeader);

                // Alias pageTypes that REQUIRE table normalization
                const ALIAS_PAGES_WITH_ACTIONS_COLUMN = new Set([
                    'instrument-aliases',
                    'label-aliases',
                    'place-aliases',
                    'series-aliases',
                    'event-aliases',
                    'area-aliases',
                    // add more here when discovered
                ]);

                // Alias pageTypes that explicitly do NOT need normalization
                const ALIAS_PAGES_WITHOUT_ACTIONS_COLUMN = new Set([
                    'artist-aliases',
                ]);

                // 🔥 Alias pages need structural normalization BEFORE row extraction
                // 🔥 Alias pages with known broken table structure
                if (
                    pageType.endsWith('-aliases') &&
                    ALIAS_PAGES_WITH_ACTIONS_COLUMN.has(pageType) &&
                    !ALIAS_PAGES_WITHOUT_ACTIONS_COLUMN.has(pageType)
                ) {
                    tablesToProcess.forEach(normalizeAliasTable);
                }

                if (tablesToProcess.length === 0) {
                    Lib.debug('fetch', `No tables found matching "${targetHeader}" on page ${p} to parse. Skipping.`);
                    continue;
                } else {
                    Lib.debug('fetch', `Found matching table "${tablesToProcess[0]}" on page ${p} to process.`);
                }

                // Use the first matching table to establish indices/headers if not already done
                const referenceTable = tablesToProcess[0];

                if (referenceTable) {
                    // Map header text prefixes to their corresponding library settings keys
                    // This matches the structure in cleanupHeaders for consistency
                    const removalMap = {
                        'Relationships': 'sa_remove_rel',
                        'Performance Attributes': 'sa_remove_perf',
                        'Rating': 'sa_remove_rating',
                        'Tagger': 'sa_remove_tagger',
                        'Release events': 'sa_remove_release_events'
                    };

                    referenceTable.querySelectorAll('thead th').forEach((th, idx) => {
                        const txt = th.textContent.trim();
                        headerNames[idx] = txt; // Store the name

                        // Check for columns to exclude
                        for (const [headerPrefix, settingKey] of Object.entries(removalMap)) {
                            if (txt.startsWith(headerPrefix) && Lib.settings[settingKey]) {
                                indicesToExclude.push(idx);
                                break; // A column can only be excluded once
                            }
                        }

                        // Check for special column types (independent of removal checks)
                        if (typesWithSplitCD.includes(pageType) && txt === 'Country/Date') {
                            countryDateIdx = idx;
                        }
                        if (typesWithSplitLocation.includes(pageType) && txt === 'Location') {
                            locationIdx = idx;
                        }
                        if (typesWithSplitArea.includes(pageType) && txt === 'Area') {
                            areaIdx = idx;
                        }

                        // Dynamic detection based on config candidates
                        // We only search if mainColIdx wasn't already forced by a number config
                        if (mainColIdx === -1 && mainColCandidates.includes(txt)) {
                            mainColIdx = idx;
                        }
                    });
                }

                // Updated Debug Output with Column Names
                Lib.debug(
                    'indices',
                    `Detected indices → mainColIdx=${mainColIdx} (${headerNames[mainColIdx] || 'N/A'}), countryDateIdx=${countryDateIdx} (${headerNames[countryDateIdx] || 'N/A'}), areaIdx=${areaIdx} (${headerNames[areaIdx] || 'N/A'}), locationIdx=${locationIdx} (${headerNames[locationIdx] || 'N/A'}), excluded=[${indicesToExclude.join(',')}] for pageType: ${pageType}`
                );

                let rowsInThisPage = 0;
                let pageCategoryMap = new Map();

                if (pageType === 'artist-releasegroups') {
                    doc.querySelectorAll('table.tbl').forEach(table => {
                        let h3 = table.previousElementSibling;
                        while (h3 && h3.nodeName !== 'H3') h3 = h3.previousElementSibling;
                        const category = h3 ? h3.textContent.trim() : 'Other';

                        // Logic to handle grouped data and repeating headers over multiple paginated pages (e.g. "Album + Live")
                        if (category !== lastCategorySeenAcrossPages) {
                            Lib.debug('fetch', `Type Change: "${category}". Rows so far: ${totalRowsAccumulated}`);
                            groupedRows.push({ category: category, rows: [] });
                            lastCategorySeenAcrossPages = category;
                        }
                        const currentGroup = groupedRows[groupedRows.length - 1];

                        table.querySelectorAll('tbody tr:not(.explanation)').forEach(row => {
                            if (row.cells.length > 1) {
                                const newRow = document.importNode(row, true);
                                // Lib.debug(
                                //     'row',
                                //     `Row cloned → initial cell count=${newRow.cells.length}`
                                // );
                                [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });
                                currentGroup.rows.push(newRow);
                                // Lib.debug(
                                //     'row',
                                //     `Row BEFORE push → cells=${newRow.cells.length}, mainColIdx=${mainColIdx}, countryDateIdx=${countryDateIdx}`
                                // );
                                rowsInThisPage++;
                                totalRowsAccumulated++;
                                pageCategoryMap.set(category, (pageCategoryMap.get(category) || 0) + 1);
                            }
                        });
                    });
                } else {
                    // Try to find tbody. If not found, fall back to table (useful for non-standard tables like some search results)
                    const tableBody = doc.querySelector('table.tbl tbody') || doc.querySelector('table.tbl');

                    if (tableBody) {
                        Lib.debug('parse', `Table body found. Processing child nodes. Total nodes: ${tableBody.childNodes.length}`);
                        let currentStatus = 'Unknown';
                        let seenFetchSubgroups = new Map();  // needed for unique subgroup header names

                        tableBody.childNodes.forEach(node => {
                            if (node.nodeName === 'TR') {
                                if (node.classList.contains('subh')) {

                                    const th = node.querySelector('th');

                                    // Prefer anchor text if present (MusicBrainz usually puts the label here)
                                    let rawName =
                                        th?.querySelector('a')?.textContent?.trim() ||
                                        th?.textContent?.trim() ||
                                        node.textContent?.trim() ||
                                        'Unknown';

                                    // Normalize whitespace
                                    rawName = rawName.replace(/\s+/g, ' ');

                                    if (seenFetchSubgroups.has(rawName)) {
                                        let count = seenFetchSubgroups.get(rawName) + 1;
                                        seenFetchSubgroups.set(rawName, count);
                                        currentStatus = `${rawName} (${count})`;
                                    } else {
                                        seenFetchSubgroups.set(rawName, 1);
                                        currentStatus = rawName;
                                    }

                                    if ((activeDefinition.tableMode === 'multi') && currentStatus !== lastCategorySeenAcrossPages) {
                                        Lib.debug('fetch', `Subgroup Change/Type: "${currentStatus}". Rows so far: ${totalRowsAccumulated}`);
                                    }
                                } else if (node.cells.length > 1 && !node.classList.contains('explanation')) {
                                    // Remove artificial non-data rows on non-paginated pages which have a link "See all <number of rows> relationships" to the full dataset instead
                                    if (activeDefinition && activeDefinition.non_paginated) {
                                        const seeAllCell = node.querySelector('td[colspan]');
                                        if (seeAllCell) {
                                            const link = seeAllCell.querySelector('a');
                                            if (link && link.textContent.toLowerCase().includes('see all')) {
                                                Lib.debug('parse', `Skipping "See all" relationship row.`);

                                                // Capture the URL and the count to allow "Show all <n>" button creation in the h3 header for overflow tables
                                                const currentGroup = groupedRows.find(g => g.category === currentStatus);
                                                if (currentGroup) {
                                                    const linkText = link.textContent;
                                                    currentGroup.seeAllUrl = link.getAttribute('href');

                                                    // Extract the number of rows from the link text
                                                    const match = linkText.match(/See all ([\d,.]+) relationships/i);
                                                    currentGroup.seeAllCount = match ? match[1] : null;

                                                    Lib.debug('parse', `Stored "See All" URL and Count for ${currentStatus}: ${currentGroup.seeAllUrl} (${currentGroup.seeAllCount}) `);
                                                }
                                                return; // Skip adding this row to data structures
                                            }
                                        }
                                    }

                                    const newRow = document.importNode(node, true);

                                    // Extraction logic for MB-Name and Comment
                                    const tdName = document.createElement('td');
                                    const tdComment = document.createElement('td');

                                    // If a main column was identified (via config or detection), perform the extraction
                                    if (mainColIdx !== -1) {
                                        // When accessing a row, resolve logical column → real cell
                                        const targetCell = getCellByLogicalIndex(newRow, mainColIdx);
                                        if (targetCell) {
                                            // 1. Extract Name
                                            // Priority: Specific Entity Link (a > bdi) -> First Link -> First Meaningful Text
                                            const nameLink = targetCell.querySelector('a bdi')?.closest('a');
                                            if (nameLink) {
                                                tdName.appendChild(nameLink.cloneNode(true));
                                            } else {
                                                // Fallback: Scan child nodes for the first non-comment content
                                                let foundName = false;
                                                for (const node of targetCell.childNodes) {
                                                    // Skip comments and scripts
                                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                                        if (node.classList.contains('comment') || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue;
                                                        if (node.tagName === 'A') {
                                                            tdName.appendChild(node.cloneNode(true));
                                                            foundName = true;
                                                            break;
                                                        }
                                                    } else if (node.nodeType === Node.TEXT_NODE) {
                                                        const txt = node.textContent.trim();
                                                        // Check for meaningful text (ignoring common separators like parens often wrapping comments)
                                                        if (txt && txt !== '(' && txt !== ')' && txt !== ',') {
                                                            tdName.textContent = txt;
                                                            foundName = true;
                                                            break;
                                                        }
                                                    }
                                                }
                                                // Fallback if iteration found nothing (e.g. complex nesting): get text excluding comments
                                                if (!foundName) {
                                                    const clone = targetCell.cloneNode(true);
                                                    clone.querySelectorAll('.comment').forEach(el => el.remove());
                                                    tdName.textContent = clone.textContent.trim();
                                                }
                                            }

                                            // 2. Extract Comment
                                            // Priority: .comment > bdi -> .comment text
                                            const commentSpan = targetCell.querySelector('.comment');
                                            if (commentSpan) {
                                                // If bdi exists (standard entity comment), use it; otherwise use the span text (simple comment)
                                                const val = commentSpan.querySelector('bdi') || commentSpan;
                                                tdComment.textContent = val.textContent.trim();
                                            }
                                        }
                                    }

                                    // Handling Country/Date split
                                    const tdSplitC = document.createElement('td');
                                    const tdSplitD = document.createElement('td');
                                    if (typesWithSplitCD.includes(pageType) && countryDateIdx !== -1) {
                                        const cdCell = newRow.cells[countryDateIdx];
                                        if (cdCell) {
                                            const events = Array.from(cdCell.querySelectorAll('.release-event'));
                                            events.forEach((ev, i) => {
                                                const countrySpan = ev.querySelector('.release-country');
                                                const dateSpan = ev.querySelector('.release-date');
                                                if (countrySpan) {
                                                    if (i > 0) tdSplitC.appendChild(document.createTextNode(', '));
                                                    const flagImg = countrySpan.querySelector('img')?.outerHTML || '';
                                                    const abbr = countrySpan.querySelector('abbr');
                                                    const countryCode = abbr ? abbr.textContent.trim() : '';
                                                    const countryFullName = abbr?.getAttribute('title') || '';
                                                    const countryA = countrySpan.querySelector('a');
                                                    const countryHref = countryA?.getAttribute('href') || '#';
                                                    const spanContainer = document.createElement('span');
                                                    spanContainer.className = countrySpan.className;
                                                    if (countryFullName && countryCode) {
                                                        spanContainer.innerHTML = `${flagImg} <a href="${countryHref}">${countryFullName} (${countryCode})</a>`;
                                                    } else {
                                                        spanContainer.innerHTML = countrySpan.innerHTML;
                                                    }
                                                    tdSplitC.appendChild(spanContainer);
                                                }
                                                if (dateSpan) {
                                                    if (i > 0) tdSplitD.appendChild(document.createTextNode(', '));
                                                    tdSplitD.appendChild(document.createTextNode(dateSpan.textContent.trim()));
                                                }
                                            });
                                        }
                                    }

                                    // Handling Location split (Place, Area and Country)
                                    const tdP = document.createElement('td');
                                    const tdA = document.createElement('td');
                                    const tdC = document.createElement('td');
                                    if (typesWithSplitLocation.includes(pageType) && locationIdx !== -1) {
                                        const locCell = newRow.cells[locationIdx];
                                        if (locCell) {
                                            locCell.querySelectorAll('a').forEach(a => {
                                                const href = a.getAttribute('href');
                                                const clonedA = a.cloneNode(true);
                                                if (href && href.includes('/place/')) {
                                                    tdP.appendChild(clonedA);
                                                } else if (href && href.includes('/area/')) {
                                                    const flagSpan = a.closest('.flag');
                                                    if (flagSpan) {
                                                        const flagImg = flagSpan.querySelector('img')?.outerHTML || '';
                                                        const abbr = flagSpan.querySelector('abbr');
                                                        const countryCode = abbr ? abbr.textContent.trim() : '';
                                                        const countryFullName = abbr?.getAttribute('title') || '';
                                                        const countryHref = a.getAttribute('href') || '#';
                                                        const span = document.createElement('span');
                                                        span.className = flagSpan.className;
                                                        if (countryFullName && countryCode) {
                                                            span.innerHTML = `${flagImg} <a href="${countryHref}">${countryFullName} (${countryCode})</a>`;
                                                        } else {
                                                            span.innerHTML = flagSpan.innerHTML;
                                                        }
                                                        tdC.appendChild(span);
                                                    } else {
                                                        if (tdA.hasChildNodes()) tdA.appendChild(document.createTextNode(', '));
                                                        tdA.appendChild(clonedA);
                                                    }
                                                }
                                            });
                                        }
                                    }

                                    // Handling Area split (MB-Area and Country)
                                    const tdAreaOnly = document.createElement('td');
                                    const tdCountryOnly = document.createElement('td');
                                    if (typesWithSplitArea.includes(pageType) && areaIdx !== -1) {
                                        const areaCell = newRow.cells[areaIdx];
                                        if (areaCell) {
                                            const nodes = Array.from(areaCell.childNodes);
                                            // Identify the node that contains the flag (the country)
                                            const countryNodeIndex = nodes.findIndex(node =>
                                                node.nodeType === 1 && (node.classList.contains('flag') || node.querySelector('.flag'))
                                            );

                                            nodes.forEach((node, idx) => {
                                                if (idx === countryNodeIndex) {
                                                    // This is the country node, move to Country column
                                                    tdCountryOnly.appendChild(node.cloneNode(true));
                                                } else {
                                                    // Check if this node is a comma/whitespace separator adjacent to the country
                                                    // We skip these to avoid dangling commas like "Philadelphia, "
                                                    const isCommaSeparator = node.nodeType === 3 && node.textContent.trim() === ',';
                                                    const isAdjacentToCountry = (idx === countryNodeIndex - 1 || idx === countryNodeIndex + 1);

                                                    if (isCommaSeparator && isAdjacentToCountry) {
                                                        return;
                                                    }

                                                    // All other nodes (smaller areas, aliases, separators) go to MB-Area
                                                    tdAreaOnly.appendChild(node.cloneNode(true));
                                                }
                                            });

                                            // Cleanup: Remove any leading/trailing commas or empty text nodes from the new cells
                                            const trimCell = (cell) => {
                                                while (cell.firstChild && cell.nodeType === 1 && (cell.firstChild.nodeType === 3 && (cell.firstChild.textContent.trim() === ',' || !cell.firstChild.textContent.trim()))) {
                                                    cell.removeChild(cell.firstChild);
                                                }
                                                while (cell.lastChild && cell.nodeType === 1 && (cell.lastChild.nodeType === 3 && (cell.lastChild.textContent.trim() === ',' || !cell.lastChild.textContent.trim()))) {
                                                    cell.removeChild(cell.lastChild);
                                                }
                                            };

                                            trimCell(tdAreaOnly);
                                            trimCell(tdCountryOnly);
                                        }
                                    }

                                    [...indicesToExclude].sort((a, b) => b - a).forEach(idx => { if (newRow.cells[idx]) newRow.deleteCell(idx); });

                                    if (typesWithSplitCD.includes(pageType)) {
                                        newRow.appendChild(tdSplitC);
                                        newRow.appendChild(tdSplitD);
                                    } else if (typesWithSplitLocation.includes(pageType)) {
                                        newRow.appendChild(tdP);
                                        newRow.appendChild(tdA);
                                        newRow.appendChild(tdC);
                                    } else if (typesWithSplitArea.includes(pageType)) {
                                        newRow.appendChild(tdAreaOnly);
                                        newRow.appendChild(tdCountryOnly);
                                    }

                                    if (pageType !== 'artist-releasegroups') {
                                        newRow.appendChild(tdName); newRow.appendChild(tdComment);
                                    }

                                    if (activeDefinition.tableMode === 'multi') {
                                        // Check if this category group already exists to consolidate subgroup tables
                                        let existingGroup = groupedRows.find(g => g.category === currentStatus);
                                        if (existingGroup) {
                                            existingGroup.rows.push(newRow);
                                        } else {
                                            groupedRows.push({ category: currentStatus, rows: [newRow] });
                                        }
                                        lastCategorySeenAcrossPages = currentStatus;
                                        pageCategoryMap.set(currentStatus, (pageCategoryMap.get(currentStatus) || 0) + 1);
                                    } else {
                                        allRows.push(newRow);
                                    }

                                    rowsInThisPage++;
                                    totalRowsAccumulated++;
                                }
                            }
                        });
                    } else {
                        Lib.debug('parse', 'No table body found in fetched document.');
                    }
                }
                const pageDuration = performance.now() - pageStartTime;
                cumulativeFetchTime += pageDuration;
                const avgPageTime = cumulativeFetchTime / pagesProcessed;
                const estRemainingSeconds = (avgPageTime * (maxPage - p)) / 1000;

                // Update status text (page count only)
                globalStatusDisplay.textContent = `Loading page ${p} of ${maxPage}... (${totalRowsAccumulated} rows)`;

                // Update progress bar
                const progress = p / maxPage;
                progressBar.style.width = `${progress * 100}%`;
                progressText.textContent = `Estimated remaining time: ${estRemainingSeconds.toFixed(1)}s`;

                // Update color based on progress (red -> orange -> green)
                let bgColor = '#ffcccc'; // light red
                if (progress >= 1.0) bgColor = '#ccffcc'; // light green
                else if (progress >= 0.5) bgColor = '#ffe0b2'; // light orange

                progressBar.style.backgroundColor = bgColor;
                activeBtn.style.backgroundColor = bgColor;

                // Detailed statistics per page fetch
                Lib.info('fetch', `Page ${p}/${maxPage} processed in ${(pageDuration / 1000).toFixed(2)}s. Rows on page: ${rowsInThisPage}. Total: ${totalRowsAccumulated}`);

                if (activeDefinition.tableMode === 'multi') {
                    const summaryParts = groupedRows.map(g => {
                        const curPageCount = pageCategoryMap.get(g.category) || 0;
                        return `${g.category}: +${curPageCount} (Total: ${g.rows.length})`;
                    });
                    Lib.debug('fetch', `  Summary: ${summaryParts.join(' | ')}`);
                }
            }

            totalFetchingTime = performance.now() - fetchingTimeStart;

            // Calculate total rows before rendering
            const totalRows = (activeDefinition.tableMode === 'multi') ?
                             groupedRows.reduce((acc, g) => acc + g.rows.length, 0) : allRows.length;

            // --- LARGE DATASET HANDLING ---
            // If the dataset is very large, offer the user a choice before rendering
            const renderThreshold = Lib.settings.sa_render_threshold || 5000;
            if (renderThreshold > 0 && totalRows > renderThreshold) {
                const userChoice = await showRenderDecisionDialog(totalRows, pagesProcessed);

                if (userChoice === 'save') {
                    // User chose to save directly without rendering
                    Lib.info('cache', 'User chose to save data directly without rendering.');
                    globalStatusDisplay.textContent = `Fetched ${totalRows} rows. Saving to disk...`;

                    // Mark as loaded so saveTableDataToDisk can proceed
                    isLoaded = true;
                    saveTableDataToDisk();

                    // Clean up UI
                    activeBtn.disabled = false;
                    activeBtn.classList.remove('mb-show-all-btn-loading');
                    allActionButtons.forEach(b => b.disabled = false);
                    stopBtn.style.display = 'none';
                    progressContainer.style.display = 'none';

                    const fetchSeconds = (totalFetchingTime / 1000).toFixed(2);
                    const pageLabel = (pagesProcessed === 1) ? 'page' : 'pages';
                    globalStatusDisplay.textContent = `Fetched ${pagesProcessed} ${pageLabel} (${totalRows} rows) in ${fetchSeconds}s - Saved to disk without rendering`;
                    globalStatusDisplay.style.color = 'green';

                    Lib.info('success', `Process complete. Data saved without rendering. Row Count: ${totalRows}. Fetch Time: ${fetchSeconds}s`);
                    return; // Exit without rendering
                } else if (userChoice === 'cancel') {
                    // User cancelled
                    Lib.info('cache', 'User cancelled the operation.');
                    activeBtn.disabled = false;
                    activeBtn.classList.remove('mb-show-all-btn-loading');
                    allActionButtons.forEach(b => b.disabled = false);
                    stopBtn.style.display = 'none';
                    progressContainer.style.display = 'none';
                    globalStatusDisplay.textContent = 'Operation cancelled';
                    return;
                }
                // If userChoice === 'render', continue with normal rendering below
            }

            let renderingTimeStart = performance.now();

            // --- RENDERING START ---
            Lib.debug('render', 'DOM rendering starting...');

            updateH2Count(totalRows, totalRows);

            activeBtn.disabled = false;
            activeBtn.classList.remove('mb-show-all-btn-loading');
            allActionButtons.forEach(b => b.disabled = false);
            stopBtn.style.display = 'none';
            progressContainer.style.display = 'none';

            // Only show filter container if it wasn't already appended to H2 (handled in updateH2Count or renderGroupedTable)
            if (!filterContainer.parentNode) {
                filterContainer.style.display = 'inline-flex';
            }

            document.querySelectorAll('ul.pagination, nav.pagination, .pageselector').forEach(el => el.remove());

            // Backup original order for tri-state sorting
            if (activeDefinition.tableMode === 'multi') {
                groupedRows.forEach(g => { g.originalRows = [...g.rows]; });
                await renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else {
                originalAllRows = [...allRows];
                await renderFinalTable(allRows);
                document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                const mainTable = document.querySelector('table.tbl');
                if (mainTable) addColumnFilterRow(mainTable);

                if (mainTable) makeTableSortableUnified(mainTable, 'main_table');

                // Series page: disable sorting UI for the "#" (number) column - (DOM-only cleanup; no logic changes)
                if (location.pathname.startsWith('/series/')) {
                    document.querySelectorAll('th.number-column').forEach(th => {
                        // Remove alert();l sort icon buttons inside the "#" header
                        th.querySelectorAll('.sort-icon-btn').forEach(span => span.remove());
                        // Ensure the header text is exactly "#"
                        th.textContent = '#';
                    });
                }
            }

            // Perform final cleanup of UI artifacts
            finalCleanup();

            // Make all H2s collapsible after rendering
            makeH2sCollapsible();

            // Apply sticky headers for better scrolling experience
            if (Lib.settings.sa_enable_sticky_headers) {
                applyStickyHeaders();
            }

            // Add column visibility toggle for all tables
            if (Lib.settings.sa_enable_column_visibility) {
                document.querySelectorAll('table.tbl').forEach((table, index) => {
                    // Only add toggle for the first table to avoid duplicate buttons
                    if (index === 0) {
                        addColumnVisibilityToggle(table);
                    }
                });
            }

            // Add export to CSV button
            if (Lib.settings.sa_enable_export) {
                addExportButton();
            }

            // Initialize keyboard shortcuts
            if (Lib.settings.sa_enable_keyboard_shortcuts) {
                initKeyboardShortcuts();
                addShortcutsHelpButton();
            }

            // Add stats panel button
            if (Lib.settings.sa_enable_stats_panel) {
                addStatsButton();
            }

            // Add density control
            if (Lib.settings.sa_enable_density_control) {
                addDensityControl();
            }

            // Add auto-resize columns button
            if (Lib.settings.sa_enable_column_resizing) {
                addAutoResizeButton();

                // Enable manual column resizing on all tables immediately
                document.querySelectorAll('table.tbl').forEach(table => {
                    makeColumnsResizable(table);
                });
            }

            isLoaded = true;
            // Initialize sidebar collapse only now if enabled
            if (Lib.settings.sa_collabsable_sidebar) {
                initSidebarCollapse();
            }

            totalRenderingTime = performance.now() - renderingTimeStart;

            // --- RENDERING END ---
            Lib.debug('render', `DOM rendering finished in ${totalRenderingTime.toFixed(2)}ms`);

            const fetchSeconds = (totalFetchingTime / 1000).toFixed(2);
            const renderSeconds = (totalRenderingTime / 1000).toFixed(2);

            const pageLabel = (pagesProcessed === 1) ? 'page' : 'pages';
            globalStatusDisplay.textContent = `Loaded ${pagesProcessed} ${pageLabel} (${totalRows} rows), Fetching: ${fetchSeconds}s`;

            Lib.info('success', `Process complete. Final Row Count: ${totalRowsAccumulated}. Total Time: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);
        } catch (err) {
            Lib.error('fetch', 'Critical Error during fetch:', err);
            globalStatusDisplay.textContent = 'Error during load... (repress the "Show all" button)';
            progressContainer.style.display = 'none';
            activeBtn.disabled = false;
            allActionButtons.forEach(b => b.disabled = false);
            activeBtn.style.backgroundColor = '';
            activeBtn.style.color = '';
        }
    }

    /**
     * High-performance batch renderer for large datasets
     * Uses DocumentFragment, chunked rendering, and progress updates
     * @param {Array<HTMLTableRowElement>} rows - Array of table row elements to render
     */
    async function renderFinalTable(rows) {
        const rowCount = Array.isArray(rows) ? rows.length : 0;
        Lib.info('render', `Starting renderFinalTable with ${rowCount} rows.`);

        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) {
            Lib.error('render', 'Abort: #tbody container not found.');
            return;
        }

        tbody.innerHTML = '';

        const table = tbody.closest('table');
        const thCount = table?.querySelectorAll('thead th')?.length || 0;
        const tdCount = rows[0]?.cells?.length || 0;

        Lib.debug(
            'render',
            `Final table structure → headers=${thCount}, rowCells=${tdCount}`
        );

        if (rowCount === 0) {
            Lib.error('render', 'No rows provided to renderFinalTable.');
            return;
        }

        // Use threshold setting for when to enable chunked rendering
        const chunkThreshold = Lib.settings.sa_chunked_render_threshold || 1000;

        // For small datasets, use fast simple append
        if (chunkThreshold === 0 || rowCount < chunkThreshold) {
            rows.forEach(r => tbody.appendChild(r));
            Lib.info('render', `Fast render: Injected ${rowCount} rows into DOM.`);
        } else {
            // For large datasets, use chunked async rendering with progress
            await renderRowsChunked(tbody, rows, 'single');
        }

        // Show the save button now that data is rendered
        if (Lib.settings.sa_enable_save_load) {
            saveToDiskBtn.style.display = 'inline-block';
        }
    }

    /**
     * Chunked async renderer with progress updates
     * Renders rows in batches to avoid blocking the UI thread
     * @param {HTMLTableSectionElement} tbody - The table body element to render into
     * @param {Array<HTMLTableRowElement>} rows - Array of table row elements to render
     * @param {string} mode - Rendering mode: 'single' for single table or 'multi' for grouped tables
     */
    async function renderRowsChunked(tbody, rows, mode = 'single') {
        const totalRows = rows.length;
        const chunkSize = 500; // Render 500 rows at a time
        const chunks = Math.ceil(totalRows / chunkSize);

        Lib.info('render', `Chunked render: ${totalRows} rows in ${chunks} chunks of ${chunkSize}`);

        // Show progress indicator
        const progressMsg = document.createElement('div');
        progressMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            z-index: 9999;
            font-size: 16px;
            text-align: center;
        `;
        progressMsg.innerHTML = `
            <div style="margin-bottom: 10px;">🎨 Rendering rows...</div>
            <div id="mb-render-progress" style="font-size: 14px;">0 / ${totalRows.toLocaleString()}</div>
        `;
        document.body.appendChild(progressMsg);
        const progressText = document.getElementById('mb-render-progress');

        let rowsRendered = 0;

        for (let i = 0; i < chunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, totalRows);
            const chunk = rows.slice(start, end);

            // Use DocumentFragment for efficient batch insert
            const fragment = document.createDocumentFragment();
            chunk.forEach(row => fragment.appendChild(row));
            tbody.appendChild(fragment);

            rowsRendered += chunk.length;

            // Update progress
            progressText.textContent = `${rowsRendered.toLocaleString()} / ${totalRows.toLocaleString()}`;

            // Yield to browser to keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Remove progress indicator
        document.body.removeChild(progressMsg);

        Lib.info('render', `Chunked render complete: ${totalRows} rows rendered in ${chunks} chunks.`);
    }

    /**
     * Renders multiple tables grouped by category (e.g., Official, Various Artists) with H3 headers
     * @param {Array} dataArray - Array of grouped data objects, each containing a label and rows
     * @param {boolean} isArtistMain - Whether this is the main artist page (affects rendering logic)
     * @param {string} query - Optional pre-filter query to apply during rendering
     * @returns {Promise<void>}
     */
    async function renderGroupedTable(dataArray, isArtistMain, query = '') {
        Lib.info('render', `Starting renderGroupedTable with ${dataArray.length} categories. Query: "${query}"`);

        const container = document.getElementById('content') || document.querySelector('table.tbl')?.parentNode;
        if (!container) {
            Lib.error('render', 'Abort: #content container not found.');
            return;
        }

        let templateHead = null;
        const firstTable = document.querySelector('table.tbl');
        if (firstTable && firstTable.tHead) {
            Lib.info('render', 'Cloning table head for template.');
            templateHead = firstTable.tHead.cloneNode(true);
            cleanupHeaders(templateHead);
        } else {
            Lib.error('render', 'No template table head found.');
        }

        let allH2s = Array.from(document.querySelectorAll('h2'));
        let targetHeader = null;

        Lib.debug('render', `Searching for target H2. Current pageType: ${pageType}`);

        if (!targetHeader) {
            Lib.debug('render', 'Target H2 not found by specific type, falling back to document position logic.');
            for (let i = 0; i < allH2s.length; i++) {
                if (allH2s[i].compareDocumentPosition(firstTable) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    targetHeader = allH2s[i];
                } else {
                    Lib.debug('render', `Stopping H2 search at index ${i}: table no longer follows this header.`);
                    break;
                }
            }
        }

        let targetH2Name = targetHeader ? targetHeader.textContent.trim().substring(0, 30) : 'Unknown';

        if (!query) {
            Lib.info('render', 'No query provided; performing initial cleanup of existing elements.');
            // Updated cleanup: remove H3s and tables, but NEVER remove H3s containing 'span.worklink'
            container.querySelectorAll('h3, table.tbl, .mb-master-toggle').forEach(el => {
                if (el.tagName === 'H3' && el.querySelector('span.worklink')) {
                    Lib.info('render', 'Skipping removal of H3 containing worklink.');
                    return;
                }
                el.remove();
            });

            if (targetHeader) {
                Lib.info('render', ` Injecting master toggle and filter container after target header ${targetH2Name}.`);
                const masterToggle = document.createElement('span');
                masterToggle.className = 'mb-master-toggle';

                const showSpan = document.createElement('span');
                showSpan.textContent = 'Show';
                showSpan.title = 'Show all sub-tables';
                showSpan.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Lib.info('render', 'Master toggle: Showing all tables.');
                    container.querySelectorAll('table.tbl').forEach(t => t.style.display = '');
                    container.querySelectorAll('.mb-toggle-h3').forEach(h => {
                        const icon = h.querySelector('.mb-toggle-icon');
                        if (icon) icon.textContent = '▼';
                    });
                };

                const hideSpan = document.createElement('span');
                hideSpan.textContent = 'Hide';
                hideSpan.title = 'Hide all sub-tables';
                hideSpan.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Lib.info('render', 'Master toggle: Hiding all tables.');
                    container.querySelectorAll('table.tbl').forEach(t => t.style.display = 'none');
                    container.querySelectorAll('.mb-toggle-h3').forEach(h => {
                        const icon = h.querySelector('.mb-toggle-icon');
                        if (icon) icon.textContent = '▲';
                    });
                };

                let suffixText = ' all Types';
                masterToggle.appendChild(document.createTextNode('[ '));
                masterToggle.appendChild(showSpan);
                masterToggle.appendChild(document.createTextNode(' | '));
                masterToggle.appendChild(hideSpan);
                masterToggle.appendChild(document.createTextNode(' ]'));
                masterToggle.appendChild(document.createTextNode(suffixText));

                targetHeader.appendChild(masterToggle);

                // Append global filter here for grouped pages
                targetHeader.appendChild(filterContainer);
                filterContainer.style.display = 'inline-flex';
                filterContainer.style.marginLeft = '15px';
                filterContainer.style.verticalAlign = 'middle';
            }
        }

        const existingTables = container.querySelectorAll('table.tbl');

        if (query) {
            Lib.info('render', `Filtering: Cleaning up overflow tables beyond data length (${dataArray.length}).`);
            existingTables.forEach((table, idx) => {
                if (idx >= dataArray.length) {
                    const h3 = table.previousElementSibling;
                    if (h3 && h3.classList.contains('mb-toggle-h3')) h3.remove();
                    table.remove();
                }
            });
        }

        // Track where to insert the elements
        let lastInsertedElement = targetHeader;

        dataArray.forEach((group, index) => {
            // Defensive check: ensure category exists
            const categoryName = group.category || group.key || 'Unknown';
            Lib.info('render', `Processing group: "${categoryName}" with ${group.rows.length} rows.`);
            let table, h3, tbody;
            if (query && existingTables[index]) {
                Lib.info('render', `Reusing existing table at index ${index} for group "${categoryName}".`);
                table = existingTables[index];
                h3 = table.previousElementSibling;
                tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
            } else {
                Lib.info('render', `Creating new table and H3 for group "${categoryName}".`);
                h3 = document.createElement('h3');
                h3.className = 'mb-toggle-h3';
                h3.title = 'Collapse/Uncollapse table section';
                table = document.createElement('table');
                table.className = 'tbl';
                // Apply indentation to the table to match the sub-header
                table.style.marginLeft = '1.5em';
                table.style.width = 'calc(100% - 1.5em)';
                if (templateHead) table.appendChild(templateHead.cloneNode(true));
                addColumnFilterRow(table);
                tbody = document.createElement('tbody');
                table.appendChild(tbody);
            }

            // Optimize: Use DocumentFragment for large groups
            const chunkThreshold = Lib.settings.sa_chunked_render_threshold || 1000;
            if (chunkThreshold > 0 && group.rows.length >= chunkThreshold) {
                const fragment = document.createDocumentFragment();
                group.rows.forEach(r => fragment.appendChild(r));
                tbody.appendChild(fragment);
            } else {
                group.rows.forEach(r => tbody.appendChild(r));
            }

            if (!query) {
                // Logic changed: Do not hide the table or H3 even if group.rows.length is 0
                table.style.display = '';
                h3.style.display = '';

                // Defensive check: ensure category exists, fallback to "Unknown"
                const categoryName = group.category || group.key || 'Unknown';
                const catLower = categoryName.toLowerCase();
                const shouldStayOpen = (catLower === 'album' || catLower === 'official') && group.rows.length < Lib.settings.sa_auto_expand;
                table.style.display = shouldStayOpen ? '' : 'none';
                Lib.info('render', `Group "${categoryName}" auto-expand status: ${shouldStayOpen}`);

                // Ensure the H3 text reflects the unique name established during fetching and Capitalize the first or second character
                let h3DisplayName = categoryName;
                if (h3DisplayName.length > 0) {
                    // Check if the first character is the typographic opening double quote “
                    if (h3DisplayName.startsWith('“') && h3DisplayName.length > 1) {
                        h3DisplayName = h3DisplayName[0] + h3DisplayName.charAt(1).toUpperCase() + h3DisplayName.slice(2);
                    } else {
                        h3DisplayName = h3DisplayName.charAt(0).toUpperCase() + h3DisplayName.slice(1);
                    }
                }

                h3.innerHTML = `<span class="mb-toggle-icon">${shouldStayOpen ? '▼' : '▲'}</span>${h3DisplayName} <span class="mb-row-count-stat">(${group.rows.length})</span>`;

                // Placement Logic: If targetHeader exists, insert after it/previous element. Otherwise, append to container.
                if (lastInsertedElement) {
                    lastInsertedElement.after(h3);
                    h3.after(table);
                    lastInsertedElement = table; // Update pointer for the next group
                } else {
                    container.appendChild(h3);
                    container.appendChild(table);
                }

                // Add "Show all" button if a seeAllUrl was found
                if (group.seeAllUrl) {
                    const showAllBtn = document.createElement('button');
                    // Use the stored seeAllCount to update button text
                    const countSuffix = group.seeAllCount ? ` ${group.seeAllCount}` : '';
                    showAllBtn.textContent = `Show all${countSuffix}`;
                    showAllBtn.style.cssText = 'font-size:1em; margin-left:10px; padding:1px 4px; cursor:pointer; vertical-align:middle; border-radius:4px;';
                    showAllBtn.type = 'button';
                    showAllBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const targetUrl = new URL(group.seeAllUrl, window.location.origin).href;
                        Lib.debug('navigation', `Opening overflow table: ${targetUrl} (New tab: ${Lib.settings.sa_render_overflow_tables_in_new_tab})`);

                        // Set the URL and trigger the global startFetchingProcess logic
                        if (Lib.settings.sa_render_overflow_tables_in_new_tab) {
                            window.open(targetUrl, '_blank');
                        } else {
                            window.location.href = targetUrl;
                        }
                    };
                    h3.appendChild(showAllBtn);
                }

                h3.addEventListener('click', () => {
                    const isHidden = table.style.display === 'none';
                    Lib.info('render', `Toggling table for "${categoryName}". New state: ${isHidden ? 'visible' : 'hidden'}`);
                    table.style.display = isHidden ? '' : 'none';
                    h3.querySelector('.mb-toggle-icon').textContent = isHidden ? '▼' : '▲';
                });
                makeTableSortableUnified(table, `${categoryName}_${index}`);
            } else if (h3 && h3.classList.contains('mb-toggle-h3')) {
                // Update the count in the header during filtering
                const countStat = h3.querySelector('.mb-row-count-stat');
                const totalInGroup = groupedRows.find(g => (g.category || g.key || 'Unknown') === categoryName)?.rows.length || 0;
                if (countStat) {
                    countStat.textContent = (group.rows.length === totalInGroup) ? `(${totalInGroup})` : `(${group.rows.length} of ${totalInGroup})`;
                }
            }
        });
        Lib.info('render', 'Finished renderGroupedTable.');

        // Show the save button now that data is rendered
        if (Lib.settings.sa_enable_save_load) {
            saveToDiskBtn.style.display = 'inline-block';
        }
    }

    /**
     * Logic to make all H2 headers collapsible.
     */
    function makeH2sCollapsible() {
        Lib.debug('render', 'Initializing collapsible H2 headers...');
        // Capture all H2s currently in the document to allow peer filtering later
        const allH2s = Array.from(document.querySelectorAll('h2'));

        allH2s.forEach(h2 => {
            if (h2.classList.contains('mb-h2-processed')) return;
            h2.classList.add('mb-h2-processed', 'mb-toggle-h2');
            h2.title = 'Click to Collapse/Uncollapse section (Ctrl+Click to toggle all in this column)';
            h2.style.cursor = 'pointer'; // Make entire H2 header indicate clickability
            h2.style.userSelect = 'none'; // Prevent text selection when clicking

            // Find elements between this H2 and the next H2
            const contentNodes = [];
            let next = h2.nextElementSibling;
            while (next && next.tagName !== 'H2') {
                contentNodes.push(next);
                next = next.nextElementSibling;
            }

            // Identify if this is the target H2 with row-count stat
            const isMainDataHeader = !!h2.querySelector('.mb-row-count-stat');
            const icon = document.createElement('span');
            icon.className = 'mb-toggle-icon';
            icon.textContent = isMainDataHeader ? '▼' : '▲';
            h2.prepend(icon);

            // Hide content if not the main data header
            if (!isMainDataHeader) {
                contentNodes.forEach(node => node.style.display = 'none');
            }

            // Re-append filter container if it was part of children, to ensure correct order
            // (Note: We do NOT wrap children in a span anymore, to ensure the H2 background remains clickable)
            if (Array.from(h2.childNodes).includes(filterContainer)) h2.appendChild(filterContainer);

            // 1. Define Toggle Function on the Element
            h2._mbToggle = (forceExpand) => {
                const isCurrentlyExpanded = icon.textContent === '▼';
                const shouldExpand = (forceExpand !== undefined) ? forceExpand : !isCurrentlyExpanded;

                if (shouldExpand === isCurrentlyExpanded) return;

                contentNodes.forEach(node => {
                    if (shouldExpand) {
                        // Expansion logic: always show headers, but check H3 state for tables
                        if (node.tagName === 'H3' && node.classList.contains('mb-toggle-h3')) {
                            node.style.display = '';
                        } else if (node.tagName === 'TABLE' && node.classList.contains('tbl')) {
                            const prevH3 = node.previousElementSibling;
                            if (prevH3 && prevH3.classList.contains('mb-toggle-h3')) {
                                const subIcon = prevH3.querySelector('.mb-toggle-icon');
                                // Only show table if sub-heading is currently marked as expanded (▼)
                                if (subIcon && subIcon.textContent === '▼') {
                                    node.style.display = '';
                                }
                            } else {
                                node.style.display = '';
                            }
                        } else {
                            node.style.display = '';
                        }
                    } else {
                        // Collapse logic: hide everything under this H2
                        node.style.display = 'none';
                    }
                });

                icon.textContent = shouldExpand ? '▼' : '▲';
            };

            // 2. Click event for the entire H2 header
            const toggleFn = (e) => {
                // GUARD CLAUSE: Don't toggle if clicking on interactive elements (Filter input, Master Toggle links, Checkboxes)
                if (['A', 'BUTTON', 'INPUT', 'LABEL', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) ||
                    e.target.closest('.mb-master-toggle') ||
                    (filterContainer && filterContainer.contains(e.target))) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                const isExpanding = icon.textContent === '▲';

                if (e.ctrlKey) {
                    // Logic to toggle all peers in the same container (sidebar vs main)
                    const sidebar = document.getElementById('sidebar');
                    const isInsideSidebar = sidebar && sidebar.contains(h2);

                    const peers = allH2s.filter(peer => {
                        if (!document.body.contains(peer)) return false;
                        const peerInSidebar = sidebar && sidebar.contains(peer);
                        return peerInSidebar === isInsideSidebar;
                    });

                    peers.forEach(peer => {
                        if (typeof peer._mbToggle === 'function') {
                            peer._mbToggle(isExpanding);
                        }
                    });
                } else {
                    h2._mbToggle(isExpanding);
                }
            };

            // Attach event listener directly to the H2 container
            h2.addEventListener('click', toggleFn);
        });
    }

    /**
     * Unified sorting logic for both single and multi-table pages.
     * Handles UI highlighting, wait cursors, and state persistence.
     *
     * @param {HTMLElement} table - The table element to attach sorters to.
     * @param {string} sortKey - Unique key for state persistence (e.g., "Album_0" or "main_table").
     */
    function makeTableSortableUnified(table, sortKey) {
        // Determine mode based on active definition
        const isMultiTable = activeDefinition && activeDefinition.tableMode === 'multi';

        const headers = table.querySelectorAll('thead tr:first-child th');

        // multiTableSortStates.get(sortKey) holds: { lastSortIndex, sortState }
        // sortState: 0 (Original ⇅), 1 (Asc ▲), 2 (Desc ▼)
        if (!multiTableSortStates.has(sortKey)) {
            multiTableSortStates.set(sortKey, { lastSortIndex: -1, sortState: 0 });
        }
        const state = multiTableSortStates.get(sortKey);

        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'default';

            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            th.innerHTML = ''; // Clear for new icon layout

            const createIcon = (char, targetState) => {
                const span = document.createElement('span');
                span.className = 'sort-icon-btn';
                // Set Tooltip texts
                if (char === '⇅') span.title = 'Original sort order';
                else if (char === '▲') span.title = 'Ascending sort order';
                else if (char === '▼') span.title = 'Descending sort order';

                // Initial highlighting: Check if this specific icon corresponds to the saved state
                if (state.lastSortIndex === index && state.sortState === targetState) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;

                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 1. Identify Target Data
                    let targetRows = [];
                    let originalRows = [];
                    let targetGroup = null;

                    if (isMultiTable) {
                        const groupIndex = parseInt(sortKey.split('_').pop(), 10);
                        targetGroup = groupedRows[groupIndex];
                        if (targetGroup) {
                            targetRows = targetGroup.rows;
                            originalRows = targetGroup.originalRows;
                        }
                    } else {
                        targetRows = allRows;
                        originalRows = originalAllRows;
                    }

                    // 2. Setup UI Feedback
                    const rowCount = targetRows.length;
                    const showProgressBar = rowCount >= (Lib.settings.sa_sort_progress_threshold || 10000);
                    const showWaitCursor = rowCount > 1000;

                    Lib.debug('sort', `Sorting table "${sortKey}" by column: "${colName}" (index: ${index}) to state ${targetState}. Row count: ${rowCount}`);

                    // Update status display
                    const statusDisplay = document.getElementById('mb-status-display');
                    if (statusDisplay) {
                        statusDisplay.textContent = '⏳ Sorting...';
                        statusDisplay.style.color = 'orange';
                    }

                    if (showWaitCursor) document.body.classList.add('mb-sorting-active');

                    // Show progress for large sorts
                    let progressBar, progressText;
                    if (showProgressBar && progressContainer) {
                        progressContainer.style.display = 'block';
                        progressBar = progressContainer.querySelector('.mb-progress-bar');
                        progressText = progressContainer.querySelector('.mb-progress-text');
                        if (progressBar) progressBar.style.width = '0%';
                        if (progressText) progressText.textContent = 'Sorting: 0%';
                    }

                    // 3. Async Execution
                    (async () => {
                        try {
                            const startSort = performance.now();

                            // Update State
                            state.lastSortIndex = index;
                            state.sortState = targetState;

                            // Reset visual state for all header buttons in THIS table
                            table.querySelectorAll('.sort-icon-btn').forEach(btn => btn.classList.remove('sort-icon-active'));
                            // Highlight only this specific icon
                            span.classList.add('sort-icon-active');

                            // Perform Sort
                            let sortedData = [];
                            if (state.sortState === 0) {
                                // Restore original order
                                sortedData = [...originalRows];
                            } else {
                                // Clone array for sorting
                                sortedData = [...targetRows];
                                const isNumeric = colName.includes('Year') || colName.includes('Releases') ||
                                                colName.includes('Track') || colName.includes('Length') ||
                                                colName.includes('Rating') || colName.includes('#');
                                const isAscending = state.sortState === 1;

                                // Create comparator
                                const compareFn = createSortComparator(index, isAscending, isNumeric);

                                // Progress callback for large sorts
                                const progressCallback = showProgressBar ? (percent) => {
                                    if (progressBar) progressBar.style.width = `${percent}%`;
                                    if (progressText) progressText.textContent = `Sorting: ${percent}%`;
                                } : null;

                                // Use optimized sort for large arrays
                                await sortLargeArray(sortedData, compareFn, progressCallback);
                            }

                            // Apply Sorted Data back to Source variables
                            if (isMultiTable && targetGroup) {
                                targetGroup.rows = sortedData;
                            } else {
                                allRows = sortedData;
                            }

                            // Re-run filter and render
                            runFilter();

                            const duration = ((performance.now() - startSort) / 1000).toFixed(2);
                            const durationMs = (performance.now() - startSort).toFixed(0);

                            if (statusDisplay) {
                                const tableName = isMultiTable && targetGroup ? (targetGroup.category || targetGroup.key || sortKey) : 'table';
                                statusDisplay.textContent = `✓ Sorted [${tableName}] column "${colName}": ${rowCount} rows in ${durationMs}ms`;
                                statusDisplay.style.color = durationMs > 2000 ? 'red' : (durationMs > 1000 ? 'orange' : 'green');
                            }

                            Lib.info('sort', `Sort completed in ${duration}s for ${rowCount} rows`);

                        } catch (error) {
                            Lib.error('sort', 'Error during sort:', error);
                            if (statusDisplay) {
                                statusDisplay.textContent = '✗ Sort failed';
                                statusDisplay.style.color = 'red';
                            }
                        } finally {
                            // Cleanup UI
                            if (showWaitCursor) document.body.classList.remove('mb-sorting-active');
                            if (showProgressBar && progressContainer) {
                                progressContainer.style.display = 'none';
                            }
                        }
                    })();
                };
                return span;
            };

            th.appendChild(createIcon('⇅', 0));
            th.appendChild(document.createTextNode(` ${colName} `));
            th.appendChild(createIcon('▲', 1));
            th.appendChild(createIcon('▼', 2));
        });
    }

    /**
     * Removes all consecutive <br> tags found in the document,
     * leaving only a single <br> if multiple were found together.
     * Logs the occurrences and count of tags removed.
     */
    function finalCleanup() {
        Lib.debug('cleanup', 'Running final cleanup...');

        // Call the specific container removal again
        const sanojIds = ['load', 'load2', 'load3', 'load4', 'bottom1', 'bottom2', 'bottom3', 'bottom4', 'bottom5', 'bottom6'];
        let foundSanoj = false;
        sanojIds.forEach(id => {
            if (document.getElementById(id)) foundSanoj = true;
        });

        if (foundSanoj) {
            Lib.debug('cleanup', 'Sanojjonas elements found during final cleanup. Removing now...');
            removeSanojjonasContainers();
        } else {
            Lib.debug('cleanup', 'No Sanojjonas elements found during final cleanup.');
        }

        const brs = document.querySelectorAll('br');
        let totalRemoved = 0;
        let instancesFound = 0;

        for (let i = 0; i < brs.length; i++) {
            // Check if element is still in DOM (might have been removed in previous iteration)
            if (!brs[i].parentNode) continue;

            let removedInThisInstance = 0;
            let next = brs[i].nextSibling;

            // Check for consecutive <br> tags, ignoring empty whitespace nodes
            while (next && (next.nodeName === 'BR' || (next.nodeType === 3 && !/[^\t\n\r ]/.test(next.textContent)))) {
                let toRemove = next;
                next = next.nextSibling;
                if (toRemove.nodeName === 'BR') {
                    toRemove.remove();
                    removedInThisInstance++;
                }
            }

            if (removedInThisInstance > 0) {
                instancesFound++;
                totalRemoved += removedInThisInstance;
                Lib.debug('cleanup', `Found consecutive <br> tags: removed ${removedInThisInstance} tags at instance ${instancesFound}.`);
            }
        }

        if (totalRemoved > 0) {
            Lib.info('cleanup', `Final cleanup complete: Removed a total of ${totalRemoved} consecutive <br> tags across ${instancesFound} locations.`);
        } else {
            Lib.info('cleanup', 'Final cleanup complete: No consecutive <br> tags found.');
        }
    }

    /**
     * Cleans up original page elements (like pagination) after data is loaded directly from disk.
     * This ensures that irrelevant navigation or structural elements from the initial page load
     * do not clutter the consolidated view when bypassing the standard fetch process.
     * Designed to be easily expandable for future UI cleanup requirements.
     */
    function cleanupAfterInitialLoad() {
        Lib.info('cleanup', 'Running cleanup after initial data load from disk...');

        // 1. Remove pagination elements
        const paginationElements = document.querySelectorAll('ul.pagination, nav.pagination, .pageselector');
        if (paginationElements.length > 0) {
            paginationElements.forEach(el => el.remove());
            Lib.debug('cleanup', `Removed ${paginationElements.length} pagination elements.`);
        }

        // --- Expandable section for future cleanup tasks ---

        // 2. Add future element removals here:
        // const otherElements = document.querySelectorAll('.some-other-class');
        // if (otherElements.length > 0) {
        //     otherElements.forEach(el => el.remove());
        //     Lib.debug('cleanup', `Removed ${otherElements.length} other elements.`);
        // }
    }

    /**
     * Gets a table cell by its logical column index, accounting for cells with colspan attributes
     * @param {HTMLTableRowElement} row - The table row to search in
     * @param {number} logicalIdx - The logical column index (0-based)
     * @returns {HTMLTableCellElement|null} The cell at the logical index, or null if not found
     */
    function getCellByLogicalIndex(row, logicalIdx) {
        let col = 0;
        for (const cell of row.cells) {
            const span = cell.colSpan || 1;
            if (col + span > logicalIdx) return cell;
            col += span;
        }
        return null;
    }

    /**
     * Fetches HTML content from a URL using GM_xmlhttpRequest
     * @param {string} url - The URL to fetch
     * @returns {Promise<string>} Promise that resolves with the HTML response text
     */
    function fetchHtml(url) {
        Lib.debug('fetch', `Initiating fetch for URL: ${url}`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: (res) => resolve(res.responseText),
                onerror: reject
            });
        });
    }

    /**
     * Serializes current table data (allRows or groupedRows) to JSON and triggers download
     */
    function saveTableDataToDisk() {
        Lib.info('cache', 'Starting table data serialization...');

        if (!isLoaded) {
            alert('No data loaded yet. Please fetch data first before saving.');
            return;
        }

        try {
            let dataToSave = {
                version: '1.0',
                url: window.location.href,
                pageType: pageType,
                timestamp: Date.now(),
                timestampReadable: new Date().toISOString(),
                tableMode: activeDefinition.tableMode,
                rowCount: 0,
                headers: null,
                rows: null,
                groups: null
            };

            // Serialize table headers (exclude the filter row)
            const firstTable = document.querySelector('table.tbl');
            if (firstTable && firstTable.tHead) {
                const headerRows = Array.from(firstTable.tHead.querySelectorAll('tr'))
                    .filter(row => !row.classList.contains('mb-col-filter-row')); // Exclude filter row
                dataToSave.headers = headerRows.map(row => {
                    return Array.from(row.cells).map(cell => ({
                        html: cell.innerHTML,
                        colSpan: cell.colSpan || 1,
                        rowSpan: cell.rowSpan || 1,
                        tagName: cell.tagName
                    }));
                });
            }

            // Serialize based on table mode
            if (activeDefinition.tableMode === 'multi' && groupedRows.length > 0) {
                // Multi-table mode: serialize grouped data
                dataToSave.groups = groupedRows.map(group => ({
                    key: group.key,
                    category: group.category,
                    rows: group.rows.map(row => {
                        return Array.from(row.cells).map(cell => ({
                            html: cell.innerHTML,
                            colSpan: cell.colSpan || 1,
                            rowSpan: cell.rowSpan || 1
                        }));
                    })
                }));
                dataToSave.rowCount = groupedRows.reduce((sum, g) => sum + g.rows.length, 0);
                Lib.info('cache', `Serialized ${dataToSave.groups.length} groups with ${dataToSave.rowCount} total rows.`);
            } else if (allRows.length > 0) {
                // Single-table mode: serialize allRows
                dataToSave.rows = allRows.map(row => {
                    return Array.from(row.cells).map(cell => ({
                        html: cell.innerHTML,
                        colSpan: cell.colSpan || 1,
                        rowSpan: cell.rowSpan || 1
                    }));
                });
                dataToSave.rowCount = allRows.length;
                Lib.info('cache', `Serialized ${dataToSave.rowCount} rows.`);
            } else {
                alert('No table data available to save.');
                return;
            }

            // Create JSON blob and trigger download
            const jsonStr = JSON.stringify(dataToSave, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Generate filename based on page type and timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `mb-${pageType}-${timestamp}.json`;

            // Use GM_download if available, otherwise fallback to standard download
            // if (typeof GM_download !== 'undefined') {
            //     GM_download({
            //         url: url,
            //         name: filename,
            //         saveAs: true,
            //         onload: () => {
            //             Lib.info('cache', `Data saved to ${filename}`);
            //             URL.revokeObjectURL(url);
            //         },
            //         onerror: (err) => {
            //             Lib.error('cache', 'Download failed:', err);
            //             URL.revokeObjectURL(url);
            //             // Fallback to standard download
            //             triggerStandardDownload(url, filename);
            //         }
            //     });
            // } else {
            triggerStandardDownload(url, filename);
            // }

        } catch (err) {
            Lib.error('cache', 'Failed to serialize table data:', err);
            alert('Failed to save data: ' + err.message);
        }
    }

    /**
     * Standard download fallback using an anchor element with user notification
     * @param {string} url - The blob URL to download from
     * @param {string} filename - The filename to save as
     */
    function triggerStandardDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        Lib.info('cache', `Data saved to ${filename}`);

        // --- INFO POPUP TO ALERT USER (WITH FADE OUT) ---
        const infoPopup = document.createElement('div');
        infoPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #888;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            font-family: sans-serif;
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        const msg = document.createElement('div');
        msg.textContent = 'Saving of JSON table data to the filesystem initiated. Please monitor your browser for the file download.';
        msg.style.marginBottom = '15px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid #555;
            background-color: #f0f0f0;
        `;
        closeBtn.type = 'button';

        // Close function with fade out
        const closePopup = () => {
            infoPopup.style.opacity = '0';
            // Remove from DOM after transition
            setTimeout(() => {
                if (infoPopup.parentNode) infoPopup.parentNode.removeChild(infoPopup);
                document.removeEventListener('keydown', onEscape);
            }, 300); // match the CSS transition duration
        };

        // Button click closes popup
        closeBtn.addEventListener('click', closePopup);

        // Escape key closes popup
        const onEscape = (e) => {
            if (e.key === 'Escape') closePopup();
        };
        document.addEventListener('keydown', onEscape);

        infoPopup.appendChild(msg);
        infoPopup.appendChild(closeBtn);
        document.body.appendChild(infoPopup);
    }

    /**
     * Loads table data from a JSON file and re-hydrates the page
     * @param {File} file - The JSON file containing saved table data
     * @param {string} filterQueryRaw - Pre-filter query string to apply during load
     * @param {boolean} isCaseSensitive - Whether the pre-filter should be case-sensitive
     * @param {boolean} isRegExp - Whether the pre-filter should be treated as a regular expression
     */
    function loadTableDataFromDisk(file, filterQueryRaw = '', isCaseSensitive = false, isRegExp = false) {
        if (!file) {
            Lib.warn('cache', 'No file selected.');
            return;
        }

        const filterQuery = (isCaseSensitive || isRegExp) ? filterQueryRaw : filterQueryRaw.toLowerCase();

        // Clear previous status message
        preFilterMsg.textContent = '';

        let globalRegex = null;
        if (filterQueryRaw && isRegExp) {
            try {
                globalRegex = new RegExp(filterQueryRaw, isCaseSensitive ? '' : 'i');
            } catch (e) {
                alert('Invalid Regular Expression in load filter field. Load aborted.');
                // Reset file input so change event fires again if they pick same file
                fileInput.value = '';
                return;
            }
        }

        Lib.info('cache', `Loading data from file: ${file.name}. Prefilter active: ${!!filterQueryRaw}`);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validation: Check if the file matches the current page type
                if (data.pageType !== pageType) {
                    if (!confirm(`Warning: This file appears to be for "${data.pageType}", but you are on a "${pageType}" page. Try loading anyway?`)) {
                        fileInput.value = '';
                        return;
                    }
                }

                // Validate data structure
                if (!data.version || !data.pageType || !data.timestamp) {
                    throw new Error('Invalid data file: missing required fields');
                }

                Lib.info('cache', `Loaded data version ${data.version} from ${data.timestampReadable} (File total: ${data.rowCount} rows)`);

                // Prepare the page for re-hydration
                performClutterCleanup();
                cleanupAfterInitialLoad();

                // Restore table headers if they were saved
                if (data.headers && data.headers.length > 0) {
                    const firstTable = document.querySelector('table.tbl');
                    if (firstTable) {
                        if (firstTable.tHead) firstTable.tHead.remove();
                        const thead = document.createElement('thead');
                        data.headers.forEach(headerRowCells => {
                            // Skip filter rows
                            const hasFilterInputs = headerRowCells.some(cell => cell.html && cell.html.includes('mb-col-filter-input'));
                            if (hasFilterInputs) return;

                            const tr = document.createElement('tr');
                            headerRowCells.forEach(cellData => {
                                const cell = document.createElement(cellData.tagName || 'th');
                                cell.innerHTML = cellData.html;
                                if (cellData.colSpan > 1) cell.colSpan = cellData.colSpan;
                                if (cellData.rowSpan > 1) cell.rowSpan = cellData.rowSpan;
                                tr.appendChild(cell);
                            });
                            thead.appendChild(tr);
                        });
                        firstTable.insertBefore(thead, firstTable.firstChild);
                    }
                }

                let loadedRowCount = 0;

                // Helper to check if a row matches the pre-load filter
                const rowMatchesFilter = (tr) => {
                    if (!filterQueryRaw) return true;
                    if (isRegExp && globalRegex) {
                        // For regex patterns, test against each cell individually
                        return Array.from(tr.cells).some(cell => {
                            const cellText = getCleanColumnText(cell);
                            return globalRegex.test(cellText);
                        });
                    } else {
                        // For non-regex, test against concatenated row text
                        const text = getCleanVisibleText(tr);
                        return isCaseSensitive ? text.includes(filterQuery) : text.toLowerCase().includes(filterQuery);
                    }
                };

                // Reconstruct rows from serialized data with Filtering
                if (data.tableMode === 'multi' && data.groups) {
                    groupedRows = [];
                    data.groups.forEach(group => {
                        const reconstructedRows = [];
                        group.rows.forEach((rowCells, rowIndex) => {
                            const tr = document.createElement('tr');
                            tr.className = rowIndex % 2 === 0 ? 'even' : 'odd';
                            rowCells.forEach(cellData => {
                                const td = document.createElement('td');
                                td.innerHTML = cellData.html;
                                if (cellData.colSpan > 1) td.colSpan = cellData.colSpan;
                                if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
                                tr.appendChild(td);
                            });

                            if (rowMatchesFilter(tr)) {
                                reconstructedRows.push(tr);
                            }
                        });

                        groupedRows.push({
                            key: group.key,
                            category: group.category || group.key,
                            rows: reconstructedRows,
                            originalRows: [...reconstructedRows]
                        });
                        loadedRowCount += reconstructedRows.length;
                    });
                    allRows = [];
                } else if (data.rows) {
                    allRows = [];
                    data.rows.forEach((rowCells, rowIndex) => {
                        const tr = document.createElement('tr');
                        tr.className = rowIndex % 2 === 0 ? 'even' : 'odd';
                        rowCells.forEach(cellData => {
                            const td = document.createElement('td');
                            td.innerHTML = cellData.html;
                            if (cellData.colSpan > 1) td.colSpan = cellData.colSpan;
                            if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
                            tr.appendChild(td);
                        });

                        if (rowMatchesFilter(tr)) {
                            allRows.push(tr);
                        }
                    });
                    loadedRowCount = allRows.length;
                    groupedRows = [];
                } else {
                    throw new Error('Invalid data file: no rows or groups found');
                }

                isLoaded = true;
                if (data.tableMode) activeDefinition.tableMode = data.tableMode;
                if (activeDefinition.tableMode !== 'multi') originalAllRows = [...allRows];

                // Render
                if (activeDefinition.tableMode === 'multi' && groupedRows.length > 0) {
                    await renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
                } else if (allRows.length > 0 || loadedRowCount === 0) {
                    await renderFinalTable(allRows);
                    document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                    const mainTable = document.querySelector('table.tbl');
                    if (mainTable) {
                        addColumnFilterRow(mainTable);
                        makeTableSortableUnified(mainTable, 'main_table');
                    }
                }

                // Apply prefilter highlight after rendering (if prefilter was used)
                if (filterQueryRaw) {
                    Lib.debug('cache', `Applying prefilter highlight for: "${filterQueryRaw}"`);

                    const tables = document.querySelectorAll('table.tbl');

                    tables.forEach(table => {
                        table.querySelectorAll('tbody tr').forEach(row => {
                            highlightText(row, filterQueryRaw, isCaseSensitive, -1, isRegExp, 'prefilter');
                        });
                    });
                }

                finalCleanup();
                makeH2sCollapsible();
                if (Lib.settings.sa_enable_sticky_headers) {
                    applyStickyHeaders();
                }

                // Add column visibility toggle for loaded table
                if (Lib.settings.sa_enable_column_visibility) {
                    const mainTable = document.querySelector('table.tbl');
                    if (mainTable) {
                        addColumnVisibilityToggle(mainTable);
                    }
                }

                // Add export button
                if (Lib.settings.sa_enable_export) {
                    addExportButton();
                }

                // Initialize keyboard shortcuts (if not already initialized)
                if (Lib.settings.sa_enable_keyboard_shortcuts) {
                    if (!document._mbKeyboardShortcutsInitialized) {
                        initKeyboardShortcuts();
                        document._mbKeyboardShortcutsInitialized = true;
                    }
                    addShortcutsHelpButton();
                }

                // Add stats panel button
                if (Lib.settings.sa_enable_stats_panel) {
                    addStatsButton();
                }

                // Add density control
                if (Lib.settings.sa_enable_density_control) {
                    addDensityControl();
                }

                if (Lib.settings.sa_enable_column_resizing) {
                // Add auto-resize columns button
                    addAutoResizeButton();
                }

                updateH2Count(loadedRowCount, loadedRowCount);

                // Show main filter container (if hidden)
                if (!filterContainer.parentNode) filterContainer.style.display = 'inline-flex';

                if (Lib.settings.sa_enable_save_load) {
                    saveToDiskBtn.style.display = 'inline-block';
                }

                // --- Update UI Feedback for Pre-Filter ---
                if (filterQueryRaw) {
                    // Update the red text span
                    preFilterMsg.textContent = `${loadedRowCount} rows prefiltered: "${filterQueryRaw}"`;
                    // Reset the input field
                    preFilterInput.value = '';
                }

                const rowLabel = loadedRowCount === 1 ? 'row' : 'rows';
                Lib.info('cache', `Successfully loaded ${loadedRowCount} ${rowLabel} from disk!`);
                statusDisplay.textContent = `✓ Loaded: ${loadedRowCount} ${rowLabel}`;
                statusDisplay.style.color = 'green';

                // Reset file input
                fileInput.value = '';

            } catch (err) {
                Lib.error('cache', 'Failed to load data from file:', err);
                alert('Failed to load data: ' + err.message);
                fileInput.value = '';
            }
        };

        reader.onerror = () => {
            Lib.error('cache', 'Failed to read file');
            alert('Failed to read file');
            fileInput.value = '';
        };

        reader.readAsText(file);
    }
})();
