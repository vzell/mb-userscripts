/**
 * Shows a redesigned dialog to load data from disk, filter it in memory, and then render.
 * Supports a staged workflow: Load -> Filter -> Render.
 *
 * @param {HTMLElement} triggerBtn - The button that triggered the dialog.
 */
function showLoadFilterDialog(triggerBtn) {
    const historyKey = `sa_load_filter_history_${pageType}`;
    let history = GM_getValue(historyKey, []) || [];
    let allParsedRows = []; // Stores the full array of row objects from the file
    let filteredTrs = [];   // Stores the DOM elements that passed the filter
    let currentFileName = '';

    const { dialog, close: closeDialog } = createInfoDialog({
        id: 'sa-load-dialog-overlay',
        title: '📂 Load Data from Disk',
        minWidth: '550px',
        maxWidth: '650px',
        borderRadius: '12px'
    });

    // Add spinner styles
    if (!document.getElementById('sa-load-dialog-styles')) {
        const style = document.createElement('style');
        style.id = 'sa-load-dialog-styles';
        style.textContent = `
            .sa-spinner {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid rgba(255,255,255,.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: sa-spin 1s ease-in-out infinite;
                margin-right: 8px;
                vertical-align: middle;
            }
            @keyframes sa-spin { to { transform: rotate(360deg); } }
            .sa-history-item:hover { background: #f0f7ff !important; }
            #sa-load-confirm:hover { background: #45a049 !important; }
            #sa-filter-confirm:hover { background: #45a049 !important; }
            #sa-render-confirm:hover { background: #45a049 !important; }
            #sa-load-cancel:hover { background: #e0e0e0 !important; }
        `;
        document.head.appendChild(style);
    }

    dialog.innerHTML = `
        <div style="padding: 20px;">
            <div id="sa-section-load">
                <div style="margin-bottom:18px; border-bottom:1px solid #eee; padding-bottom:12px;">
                    <h3 style="margin:0; color:#222; font-size:1.2em;">📂 Load Table Data</h3>
                    <p style="margin:5px 0 0; color:#666; font-size:0.95em;">Load serialized data from disk. Remember you must have at least saved a dataset before to the filesystem (with the "Save to Disk" button)</p>
                </div>

                <div style="display:flex; gap:12px;">
                    <button id="sa-load-confirm" style="flex:2; padding:10px; background:#4CAF50; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;"><span><span style="text-decoration:underline">L</span>oad Data</span></button>
                    <button id="sa-load-cancel" style="flex:1; padding:10px; background:#f0f0f0; color:#333; border:1px solid #ccc; border-radius:6px; cursor:pointer;">Cancel</button>
                </div>
                <div id="sa-load-info" style="margin-top:12px; font-size:0.95em; color:#444; display:none;"></div>
            </div>

            <div id="sa-section-filter" style="display:none; margin-top:25px; padding-top:20px; border-top:2px dashed #eee;">
                <div style="margin-bottom:15px; position:relative;">
                    <div style="display:flex; gap:4px;">
                        <input id="sa-load-filter-input" type="text" placeholder="Filter expression... evaluated for each column"
                               style="flex:1; padding:8px 12px; border:1px solid #ccc; border-radius:6px; font-size:1em; outline:none;">
                        <button id="sa-load-history-toggle" title="Show history" style="padding:0 8px; background:#f0f0f0; border:1px solid #ccc; border-radius:6px; cursor:pointer;">▼</button>
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
                    <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9em; font-weight:600;" title="Exclude rows that match the filter expression instead of keeping them">
                        <input type="checkbox" id="sa-load-exclude"> Exclude Matches
                    </label>
                </div>
                <div style="display:flex; gap:12px;">
                    <button id="sa-filter-confirm" style="flex:2; padding:10px; background:#4CAF50; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;"><span><span style="text-decoration:underline">F</span>ilter Data</span></button>
                </div>
                <div id="sa-filter-info" style="margin-top:12px; font-size:0.95em; font-weight:bold; color:#2196F3; text-align:center; display:none;"></div>
            </div>

            <div id="sa-section-render" style="display:none; margin-top:20px;">
                <div style="display:flex; gap:12px;">
                    <button id="sa-render-confirm" style="flex:2; padding:10px; background:#4CAF50; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;"><span><span style="text-decoration:underline">R</span>ender Data</span></button>
                </div>
            </div>
        </div>
    `;

    const loadBtn = dialog.querySelector('#sa-load-confirm');
    const loadInfo = dialog.querySelector('#sa-load-info');
    const filterSection = dialog.querySelector('#sa-section-filter');
    const filterInput = dialog.querySelector('#sa-load-filter-input');
    const filterBtn = dialog.querySelector('#sa-filter-confirm');
    const filterInfo = dialog.querySelector('#sa-filter-info');
    const renderSection = dialog.querySelector('#sa-section-render');
    const renderBtn = dialog.querySelector('#sa-render-confirm');
    const historyToggle = dialog.querySelector('#sa-load-history-toggle');
    const historyDropdown = dialog.querySelector('#sa-load-history-dropdown');

    const fileInput = document.getElementById('mb-file-input');

    /**
     * Logic to read and parse the file completely.
     */
    const handleLoad = async () => {
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            currentFileName = file.name;
            loadBtn.innerHTML = '<span class="sa-spinner"></span> Loading...';
            loadBtn.disabled = true;

            try {
                const rawData = await readAndParseFile(file);

                // Validate page type mismatch
                if (rawData.pageType !== pageType) {
                    const proceed = await Lib.showCustomConfirm(
                        `Warning: File Mismatch`,
                        `The file is from a "<b>${rawData.pageType}</b>" page, but you are on a "<b>${pageType}</b>" page.<br><br>The structure might be incompatible. Load anyway?`,
                        `Load Anyway`, `Cancel`
                    );
                    if (!proceed) {
                        resetLoadState();
                        return;
                    }
                }

                allParsedRows = rawData.rows;
                loadBtn.innerHTML = '<span><span style="text-decoration:underline">L</span>oad Data</span>';
                loadInfo.innerHTML = `✅ Loaded <b>${allParsedRows.length.toLocaleString()}</b> rows from <code>${file.name}</code>`;
                loadInfo.style.display = 'block';
                filterSection.style.display = 'block';
                filterInput.focus();

            } catch (err) {
                Lib.error('load', 'Failed to parse file:', err);
                alert('Error parsing file: ' + err.message);
                resetLoadState();
            }
        };
        fileInput.click();
    };

    const resetLoadState = () => {
        loadBtn.innerHTML = '<span><span style="text-decoration:underline">L</span>oad Data</span>';
        loadBtn.disabled = false;
        fileInput.value = '';
    };

    /**
     * Filters the in-memory rows based on dialog criteria.
     */
    const handleFilter = async () => {
        const query = filterInput.value.trim();
        const useCase = dialog.querySelector('#sa-load-case').checked;
        const useRegex = dialog.querySelector('#sa-load-regex').checked;
        const useExclude = dialog.querySelector('#sa-load-exclude').checked;

        let regex = null;
        if (query && useRegex) {
            try {
                regex = new RegExp(query, useCase ? '' : 'i');
            } catch (e) {
                filterInput.style.borderColor = 'red';
                await Lib.showCustomAlert('Invalid Regular Expression', e.message);
                return;
            }
        }
        filterInput.style.borderColor = '#ccc';

        // Update history
        if (query && !history.includes(query)) {
            history.unshift(query);
            if (history.length > (Lib.settings.sa_load_history_limit || 20)) history.pop();
            GM_setValue(historyKey, history);
        }

        filterInfo.style.display = 'block';
        filterInfo.textContent = 'Calculating matches...';

        // Performance optimization: Filter logic
        setTimeout(() => {
            filteredTrs = [];
            allParsedRows.forEach(rowData => {
                const tr = reconstructRowElement(rowData);
                const isMatch = checkRowMatch(tr, query, regex, useCase, useExclude);
                if (isMatch) {
                    filteredTrs.push(tr);
                }
            });

            filterInfo.innerHTML = `🎯 <b>${filteredTrs.length.toLocaleString()}</b> rows match your criteria.`;
            renderSection.style.display = 'block';
        }, 50);
    };

    /**
     * Finalizes the rendering process.
     */
    const handleRender = async () => {
        if (filteredTrs.length === 0 && allParsedRows.length > 0) {
            const confirmEmpty = await Lib.showCustomConfirm('No matches', 'Your filter produced 0 results. Render empty table?', 'Yes', 'No');
            if (!confirmEmpty) return;
        }

        // Close dialog first to avoid UI lag
        closeDialog();

        // Integrate with existing script logic
        finalizeLoadProcess(filteredTrs, currentFileName);
    };

    const handleKey = (e) => {
        if (e.key === 'Escape') closeDialog();
        if (e.altKey) return;

        const key = e.key.toLowerCase();
        if (key === 'l' && !allParsedRows.length) {
            e.preventDefault();
            handleLoad();
        } else if (key === 'f' && filterSection.style.display !== 'none') {
            e.preventDefault();
            handleFilter();
        } else if (key === 'r' && renderSection.style.display !== 'none') {
            e.preventDefault();
            handleRender();
        }
    };

    document.addEventListener('keydown', handleKey);

    // Event Listeners
    loadBtn.onclick = handleLoad;
    dialog.querySelector('#sa-load-cancel').onclick = closeDialog;
    filterBtn.onclick = handleFilter;
    renderBtn.onclick = handleRender;

    if (historyToggle) {
        historyToggle.onclick = (e) => {
            e.stopPropagation();
            historyDropdown.style.display = historyDropdown.style.display === 'none' ? 'block' : 'none';
        };
        dialog.querySelectorAll('.sa-history-item').forEach(el => {
            el.onclick = () => {
                filterInput.value = el.textContent;
                historyDropdown.style.display = 'none';
            };
        });
    }

    // Boilerplate for closing dropdown
    window.addEventListener('click', (e) => {
        if (historyDropdown && !historyDropdown.contains(e.target) && e.target !== historyToggle) {
            historyDropdown.style.display = 'none';
        }
    }, { once: true });
}

/**
 * Helper to read and parse the file (supporting Gzip via pako)
 */
async function readAndParseFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const isCompressed = file.name.endsWith('.gz');

        reader.onload = (e) => {
            try {
                let jsonString;
                if (isCompressed) {
                    const compressedData = new Uint8Array(e.target.result);
                    jsonString = pako.ungzip(compressedData, { to: 'string' });
                } else {
                    jsonString = e.target.result;
                }
                resolve(JSON.parse(jsonString));
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;

        if (isCompressed) reader.readAsArrayBuffer(file);
        else reader.readAsText(file);
    });
}

/**
 * Reconstructs a <tr> element from the serialized JSON row object.
 */
function reconstructRowElement(rowData) {
    const tr = document.createElement('tr');
    if (rowData.className) tr.className = rowData.className;

    // Attach subheadings data for the renderer
    if (rowData.subheadings) {
        tr._mbSubheadings = rowData.subheadings;
    }

    rowData.cells.forEach(cellData => {
        const td = document.createElement('td');
        if (cellData.className) td.className = cellData.className;
        if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
        if (cellData.html) td.innerHTML = cellData.html;
        else if (cellData.text) td.textContent = cellData.text;

        if (cellData.dataAttributes) {
            Object.keys(cellData.dataAttributes).forEach(k => {
                td.setAttribute(`data-${k}`, cellData.dataAttributes[k]);
            });
        }
        tr.appendChild(td);
    });

    return tr;
}

/**
 * Evaluates match criteria for a reconstructed row.
 */
function checkRowMatch(tr, query, regex, isCaseSensitive, isExclude) {
    if (!query) return !isExclude;

    let matched;
    if (regex) {
        matched = Array.from(tr.cells).some(cell => {
            const cellText = getCleanColumnText(cell);
            return regex.test(cellText);
        });
    } else {
        const text = getCleanVisibleText(tr);
        matched = isCaseSensitive
            ? text.includes(query)
            : text.toLowerCase().includes(query.toLowerCase());
    }

    return isExclude ? !matched : matched;
}

/**
 * Finalizes the loading process by populating the global state and rendering.
 */
function finalizeLoadProcess(newRows, fileName) {
    Lib.info('load', `Finalizing load: ${newRows.length} rows.`);

    // Clear existing data
    allRows = newRows;
    originalAllRows = [...allRows];
    isLoaded = true;

    // Reset UI state
    const infoDisplay = document.getElementById('mb-info-display');
    if (infoDisplay) {
        infoDisplay.textContent = `✓ Loaded ${allRows.length.toLocaleString()} rows from ${fileName}`;
        infoDisplay.style.color = 'green';
    }

    // Refresh application state
    initTableControls();
    renderFinalTable();

    // Trigger post-load feature initialization
    if (Lib.settings.sa_enable_density_control) addDensityControl();
    if (Lib.settings.sa_enable_stats_panel) addStatsButton();
    if (Lib.settings.sa_enable_export) addExportButton();

    updateH2Count(allRows.length, allRows.length);

    const filterContainer = document.getElementById('mb-filter-container');
    if (filterContainer) filterContainer.style.display = 'inline-flex';
}



[
    {
        "version": "10.00.00",
        "date": "2026-03-02",
        "sections": [
            {
                "label": "🚀 Features",
                "items": [
                    "Redesigned 'Load from Disk' workflow: The dialog now supports a staged process: 1. Load data completely into memory, 2. Filter the in-memory data with real-time result count, 3. Render only the desired subset of data.",
                    "Improved Load Dialog UI with progress indicators (spinner), file info display, and staged visibility of filtering/rendering controls.",
                    "Memory-efficient loading: Parsing large datasets is now separate from DOM rendering, allowing users to preview match counts before committing to a heavy render."
                ]
            }
        ]
    },
    {
        "version": "9.99.00",
        "date": "2026-03-02",
        "sections": [
            {
                "label": "🐛 Bug Fixes",
                "items": [
                    "Filtering — cross-tag text matching now works correctly: filter strings that span multiple inline HTML elements (e.g. 'Bruce Springsteen & The E Street Band' spread across two <a> elements and a bare text node) previously produced no results because getCleanColumnText / getCleanVisibleText joined the raw text-node values — each carrying its own trailing newlines and indentation — with a plain space, yielding a string such as 'Bruce Springsteen\\n    &\\n    The E Street Band' that never matched the user query. Fixed by appending .replace(/\\s+/g, ' ').trim() to the joined result in both helpers so all whitespace runs (including \\n, \\t, and multi-space indentation) collapse to a single space before any comparison. The HTML structure is left completely intact for display/rendering purposes; only the string used for the match/highlight test is normalised.",
                    "Unique-values column dropdown — script-tag JSON blobs (e.g. release-events and author-roles data embedded by MusicBrainz as <script type='application/json'> inside table cells) are now excluded from the dropdown: openUniqDrop previously used cell.textContent.trim() which includes the raw JSON. It now calls getCleanColumnText() which already skips <script> subtrees and also returns whitespace-normalised text, giving a clean set of user-visible values."
                ]
            }
        ]
    },
    ...
]



Changes Summary
Staged Load Dialog: The dialog now starts with only the "Load Data" section.

Loading State: Clicking "Load" triggers the file picker, changes the button to a spinner/loading state, and parses the entire dataset.

File Info Display: Once loaded, it displays the total row count and filename.

In-Memory Filtering: The filter block appears only after data is loaded. Clicking "Filter Data" evaluates the criteria against the loaded rows and displays how many matches were found.

Staged Rendering: A "Render Data" button finally commits the filtered subset to the page.

Keyboard Shortcuts: Added support for 'L' (Load), 'F' (Filter), and 'R' (Render) within the dialog.
