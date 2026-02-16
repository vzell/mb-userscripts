// ============================================================================
// REFACTORING EXAMPLES - Concrete Code Improvements
// ============================================================================

// ============================================================================
// 1. DOM CACHE OBJECT - Add after line ~120
// ============================================================================

// BEFORE: Repeated DOM queries throughout the code
// document.getElementById('mb-status-display')  // Line 640
// document.getElementById('mb-status-display')  // Line 750
// document.getElementById('mb-status-display')  // Line 1195
// ... repeated 9 times total

// AFTER: Single cache with getters
const DOM = {
    _statusDisplay: null,
    _controlsContainer: null,
    _mainTable: null,
    _contentDiv: null,
    _sidebar: null,

    get statusDisplay() {
        if (!this._statusDisplay) {
            this._statusDisplay = document.getElementById('mb-status-display');
        }
        return this._statusDisplay;
    },

    get controlsContainer() {
        if (!this._controlsContainer) {
            this._controlsContainer = document.getElementById('mb-show-all-controls-container');
        }
        return this._controlsContainer;
    },

    get mainTable() {
        // Don't cache this one as it gets replaced
        return document.querySelector('table.tbl');
    },

    get contentDiv() {
        if (!this._contentDiv) {
            this._contentDiv = document.getElementById('content');
        }
        return this._contentDiv;
    },

    get sidebar() {
        if (!this._sidebar) {
            this._sidebar = document.getElementById('sidebar');
        }
        return this._sidebar;
    },

    // Call this when DOM is replaced
    invalidateCache() {
        this._statusDisplay = null;
        this._controlsContainer = null;
        this._contentDiv = null;
        this._sidebar = null;
    }
};

// Usage throughout the code:
// OLD: const statusDisplay = document.getElementById('mb-status-display');
// NEW: const statusDisplay = DOM.statusDisplay;


// ============================================================================
// 2. STATUS UPDATE FUNCTION
// ============================================================================

// BEFORE: Repeated pattern (13 times)
const statusDisplay = document.getElementById('mb-status-display');
statusDisplay.textContent = '✓ Loaded: 1000 rows';
statusDisplay.style.color = 'green';

// AFTER: Single function
function updateStatus(message, type = 'info') {
    const statusDisplay = DOM.statusDisplay;
    if (!statusDisplay) return;

    statusDisplay.textContent = message;

    // Remove all status classes
    statusDisplay.classList.remove('mb-status-success', 'mb-status-error',
                                   'mb-status-warning', 'mb-status-info');

    // Add the appropriate class
    statusDisplay.classList.add(`mb-status-${type}`);
}

// Add to CSS section:
/*
.mb-status-success { color: green; }
.mb-status-error { color: red; }
.mb-status-warning { color: orange; }
.mb-status-info { color: #1976d2; }
*/

// Usage:
updateStatus('✓ Loaded: 1000 rows', 'success');
updateStatus('⚠ Warning: Large dataset', 'warning');
updateStatus('✗ Error loading data', 'error');


// ============================================================================
// 3. ERROR HANDLER FUNCTION
// ============================================================================

// BEFORE: Inconsistent error handling
try {
    // some code
} catch (err) {
    Lib.error('cache', 'Failed to load data', err);
    const statusDisplay = document.getElementById('mb-status-display');
    if (statusDisplay) {
        statusDisplay.textContent = 'Failed to load data: ' + err.message;
        statusDisplay.style.color = 'red';
    }
    alert('Failed to load data');
}

// AFTER: Standardized error handling
function handleError(context, error, options = {}) {
    const {
        showAlert = false,
        userMessage = null,
        updateStatusDisplay = true,
        logMessage = null
    } = options;

    // Log the error
    Lib.error(context, logMessage || error.message, error);

    // Update status display
    if (updateStatusDisplay) {
        updateStatus(
            userMessage || `Error: ${error.message}`,
            'error'
        );
    }

    // Show alert if requested
    if (showAlert) {
        alert(userMessage || error.message);
    }

    return false; // Can be used to return from calling function
}

// Usage:
try {
    // some code
} catch (err) {
    handleError('cache', err, {
        showAlert: true,
        userMessage: 'Failed to load data from file',
        logMessage: 'File reading failed'
    });
}


// ============================================================================
// 4. BUTTON FACTORY FUNCTION
// ============================================================================

// BEFORE: Repeated pattern (many times)
const exportBtn = document.createElement('button');
exportBtn.textContent = '💾 Export CSV';
exportBtn.className = 'some-class another-class';
exportBtn.title = 'Export visible data to CSV';
exportBtn.style.marginLeft = '5px';
exportBtn.addEventListener('click', exportTableToCSV);

// AFTER: Factory function
function createButton(config) {
    const {
        text,
        icon = '',
        className = '',
        title = '',
        style = {},
        onClick = null,
        id = ''
    } = config;

    const button = document.createElement('button');

    // Set text with optional icon
    button.textContent = icon ? `${icon} ${text}` : text;

    // Set classes
    if (className) {
        button.className = className;
    }

    // Set title/tooltip
    if (title) {
        button.title = title;
    }

    // Set ID
    if (id) {
        button.id = id;
    }

    // Apply inline styles (only if really needed)
    Object.assign(button.style, style);

    // Attach click handler
    if (onClick) {
        button.addEventListener('click', onClick);
    }

    return button;
}

// Usage:
const exportBtn = createButton({
    text: 'Export CSV',
    icon: '💾',
    className: 'mb-button mb-export-button',
    title: 'Export visible data to CSV',
    style: { marginLeft: '5px' },
    onClick: exportTableToCSV
});

const statsBtn = createButton({
    text: 'Stats',
    icon: '📊',
    className: 'mb-button',
    title: 'Show table statistics',
    onClick: () => showStatsPanel()
});


// ============================================================================
// 5. MENU/POPUP FACTORY FUNCTION
// ============================================================================

// BEFORE: Repeated pattern for menus
const menu = document.createElement('div');
menu.className = 'mb-column-menu';
menu.style.display = 'none';
menu.style.position = 'absolute';
menu.style.backgroundColor = 'white';
menu.style.border = '1px solid #ccc';
// ... many more style assignments ...

const closeMenu = () => { menu.style.display = 'none'; };
const closeMenuOnEscape = (e) => { if (e.key === 'Escape') closeMenu(); };
const closeOnClickOutside = (e) => {
    if (!menu.contains(e.target) && !button.contains(e.target)) closeMenu();
};

document.addEventListener('keydown', closeMenuOnEscape);
document.addEventListener('click', closeOnClickOutside);

// AFTER: Factory function
function createPopupMenu(config) {
    const {
        className = 'mb-popup-menu',
        closeOnEscape = true,
        closeOnClickOutside = true,
        attachTo = null
    } = config;

    const menu = document.createElement('div');
    menu.className = className;
    menu.style.display = 'none';

    const show = () => {
        menu.style.display = 'block';
    };

    const hide = () => {
        menu.style.display = 'none';
    };

    const toggle = () => {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    };

    // Close on Escape key
    if (closeOnEscape) {
        const escHandler = (e) => {
            if (e.key === 'Escape' && menu.style.display === 'block') {
                hide();
            }
        };
        document.addEventListener('keydown', escHandler);
        menu._escHandler = escHandler; // Store for cleanup
    }

    // Close on outside click
    if (closeOnClickOutside) {
        const outsideClickHandler = (e) => {
            if (menu.style.display === 'block' &&
                !menu.contains(e.target) &&
                (!attachTo || !attachTo.contains(e.target))) {
                hide();
            }
        };
        document.addEventListener('click', outsideClickHandler);
        menu._outsideClickHandler = outsideClickHandler; // Store for cleanup
    }

    // Cleanup function
    const destroy = () => {
        if (menu._escHandler) {
            document.removeEventListener('keydown', menu._escHandler);
        }
        if (menu._outsideClickHandler) {
            document.removeEventListener('click', menu._outsideClickHandler);
        }
        menu.remove();
    };

    return {
        element: menu,
        show,
        hide,
        toggle,
        destroy
    };
}

// Usage:
const columnMenu = createPopupMenu({
    className: 'mb-column-menu',
    closeOnEscape: true,
    closeOnClickOutside: true,
    attachTo: button
});

// Add content
columnMenu.element.innerHTML = '<div>Menu content here</div>';

// Show/hide
button.addEventListener('click', () => columnMenu.toggle());


// ============================================================================
// 6. PROGRESS INDICATOR FACTORY
// ============================================================================

// BEFORE: Repeated pattern
const progressContainer = document.createElement('div');
progressContainer.style.display = 'none';
progressContainer.style.width = '100%';
progressContainer.style.backgroundColor = '#f0f0f0';
progressContainer.style.border = '1px solid #ccc';
progressContainer.style.borderRadius = '3px';
progressContainer.style.overflow = 'hidden';

const progressBar = document.createElement('div');
progressBar.style.width = '0%';
progressBar.style.height = '20px';
progressBar.style.backgroundColor = '#4CAF50';
progressBar.style.transition = 'width 0.3s';

const progressText = document.createElement('div');
progressText.style.textAlign = 'center';
progressText.style.fontSize = '12px';

progressContainer.appendChild(progressBar);
progressContainer.appendChild(progressText);

// AFTER: Factory function
function createProgressIndicator(config = {}) {
    const {
        id = '',
        className = 'mb-progress-indicator',
        showText = true
    } = config;

    const container = document.createElement('div');
    if (id) container.id = id;
    container.className = `${className}-container`;
    container.style.display = 'none';

    const bar = document.createElement('div');
    bar.className = `${className}-bar`;

    const text = document.createElement('div');
    text.className = `${className}-text`;
    if (!showText) text.style.display = 'none';

    container.appendChild(bar);
    container.appendChild(text);

    return {
        element: container,

        show() {
            container.style.display = 'block';
        },

        hide() {
            container.style.display = 'none';
        },

        setProgress(percent, message = '') {
            percent = Math.max(0, Math.min(100, percent));
            bar.style.width = `${percent}%`;
            if (message) {
                text.textContent = message;
            }
        },

        reset() {
            bar.style.width = '0%';
            text.textContent = '';
        }
    };
}

// Add to CSS:
/*
.mb-progress-indicator-container {
    width: 100%;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 3px;
    overflow: hidden;
    margin: 10px 0;
}

.mb-progress-indicator-bar {
    width: 0%;
    height: 20px;
    background-color: #4CAF50;
    transition: width 0.3s ease;
}

.mb-progress-indicator-text {
    text-align: center;
    font-size: 12px;
    padding: 5px;
}
*/

// Usage:
const fetchProgress = createProgressIndicator({
    id: 'fetch-progress',
    showText: true
});

container.appendChild(fetchProgress.element);
fetchProgress.show();
fetchProgress.setProgress(50, 'Fetching page 5 of 10...');


// ============================================================================
// 7. EXTRACT FILTERING LOGIC FROM runFilter()
// ============================================================================

// BEFORE: One massive 231-line function doing everything

// AFTER: Split into focused functions

function runFilter() {
    const filterState = collectFilterState();

    if (!hasActiveFilters(filterState)) {
        clearAllHighlights();
        showAllRows();
        updateFilterStatus(null, filterState);
        return;
    }

    const timing = measureFilterPerformance(() => {
        const results = applyFilters(filterState);
        updateFilterDisplay(results);
        highlightFilterMatches(results, filterState);
    });

    updateFilterStatus(timing, filterState);
}

function collectFilterState() {
    const globalFilter = document.getElementById('mb-global-filter-input');
    const globalRegex = document.getElementById('mb-global-regex-toggle');
    const globalCaseSensitive = document.getElementById('mb-global-case-sensitive-toggle');

    const columnFilters = Array.from(
        document.querySelectorAll('.mb-column-filter-input')
    ).map(input => ({
        index: parseInt(input.dataset.colIndex),
        query: input.value.trim(),
        isRegex: document.getElementById(`col-regex-${input.dataset.colIndex}`)?.checked || false,
        isCaseSensitive: document.getElementById(`col-case-${input.dataset.colIndex}`)?.checked || false
    }));

    return {
        globalQuery: globalFilter?.value.trim() || '',
        globalIsRegex: globalRegex?.checked || false,
        globalIsCaseSensitive: globalCaseSensitive?.checked || false,
        columnFilters: columnFilters.filter(f => f.query !== '')
    };
}

function hasActiveFilters(filterState) {
    return filterState.globalQuery !== '' ||
           filterState.columnFilters.length > 0;
}

function applyFilters(filterState) {
    const table = DOM.mainTable;
    if (!table) return { visible: 0, hidden: 0 };

    const rows = Array.from(table.querySelectorAll('tbody tr:not(.mb-filter-row)'));
    let visibleCount = 0;
    let hiddenCount = 0;

    rows.forEach(row => {
        const matchesGlobal = filterState.globalQuery === '' ||
                            rowMatchesGlobalFilter(row, filterState);
        const matchesColumns = filterState.columnFilters.length === 0 ||
                             rowMatchesColumnFilters(row, filterState.columnFilters);

        if (matchesGlobal && matchesColumns) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
            hiddenCount++;
        }
    });

    return { visible: visibleCount, hidden: hiddenCount, total: rows.length };
}

function rowMatchesGlobalFilter(row, filterState) {
    const text = getCleanVisibleText(row);
    return matchesFilter(
        text,
        filterState.globalQuery,
        filterState.globalIsRegex,
        filterState.globalIsCaseSensitive
    );
}

function rowMatchesColumnFilters(row, columnFilters) {
    return columnFilters.every(filter => {
        const cell = getCellByLogicalIndex(row, filter.index);
        if (!cell) return true; // Missing cell matches by default

        const text = getCleanColumnText(cell);
        return matchesFilter(text, filter.query, filter.isRegex, filter.isCaseSensitive);
    });
}

function matchesFilter(text, query, isRegex, isCaseSensitive) {
    if (isRegex) {
        try {
            const regex = new RegExp(query, isCaseSensitive ? '' : 'i');
            return regex.test(text);
        } catch (e) {
            return false;
        }
    } else {
        const textToSearch = isCaseSensitive ? text : text.toLowerCase();
        const queryToFind = isCaseSensitive ? query : query.toLowerCase();
        return textToSearch.includes(queryToFind);
    }
}

function updateFilterDisplay(results) {
    updateH2Count(results.visible, results.total);
}

function highlightFilterMatches(results, filterState) {
    if (results.visible === 0) return;

    const table = DOM.mainTable;
    const visibleRows = table.querySelectorAll('tbody tr:not(.mb-filter-row):not([style*="display: none"])');

    clearAllHighlights();

    visibleRows.forEach(row => {
        if (filterState.globalQuery) {
            highlightText(
                row,
                filterState.globalQuery,
                filterState.globalIsCaseSensitive,
                -1,
                filterState.globalIsRegex,
                'global'
            );
        }

        filterState.columnFilters.forEach(filter => {
            highlightText(
                row,
                filter.query,
                filter.isCaseSensitive,
                filter.index,
                filter.isRegex,
                'column'
            );
        });
    });
}

function clearAllHighlights() {
    const highlightedElements = document.querySelectorAll(
        '.mb-global-filter-highlight, .mb-column-filter-highlight'
    );
    highlightedElements.forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });
}

function showAllRows() {
    const table = DOM.mainTable;
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr:not(.mb-filter-row)');
    rows.forEach(row => row.style.display = '');
}

function measureFilterPerformance(filterFunction) {
    const start = performance.now();
    filterFunction();
    const end = performance.now();
    return end - start;
}

function updateFilterStatus(timing, filterState) {
    const hasFilters = hasActiveFilters(filterState);

    if (!hasFilters) {
        updateStatus('No filters active', 'info');
        return;
    }

    if (timing !== null) {
        const timeColor = timing < 50 ? 'success' :
                         timing < 200 ? 'warning' : 'error';
        updateStatus(`Filtered in ${timing.toFixed(1)}ms`, timeColor);
    }
}


// ============================================================================
// 8. OPTIONAL CHAINING EXAMPLES
// ============================================================================

// BEFORE: Defensive checks
if (table) {
    table.classList.add('sorted');
}

if (element && element.parentNode) {
    element.parentNode.removeChild(element);
}

if (data && data.rows && data.rows.length > 0) {
    processRows(data.rows);
}

// AFTER: Optional chaining
table?.classList.add('sorted');

element?.parentNode?.removeChild(element);

if (data?.rows?.length > 0) {
    processRows(data.rows);
}


// ============================================================================
// 9. CSS CLASS UTILITIES
// ============================================================================

// Add utility functions for common DOM operations
function show(element) {
    if (element) element.classList.remove('mb-hidden');
}

function hide(element) {
    if (element) element.classList.add('mb-hidden');
}

function toggle(element) {
    if (element) element.classList.toggle('mb-hidden');
}

function setVisible(element, visible) {
    if (!element) return;
    if (visible) {
        element.classList.remove('mb-hidden');
    } else {
        element.classList.add('mb-hidden');
    }
}

// Add to CSS:
/*
.mb-hidden {
    display: none !important;
}
*/

// Usage:
show(progressContainer);
hide(menu);
toggle(sidebar);
setVisible(button, shouldShow);
