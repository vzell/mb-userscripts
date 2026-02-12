# MusicBrainz Show All Entities - Refactoring Guide

## Current State Analysis

### Script Metrics
- **Total Lines**: ~3,450 lines
- **Functions**: 23 named functions
- **Architecture**: Single IIFE (Immediately Invoked Function Expression)
- **State Management**: Multiple global-scope variables within IIFE
- **Dependencies**: External VZ_MBLibrary for settings/logging

### Major Issues

1. **God Object Anti-Pattern**: Single 3,450-line IIFE handling everything
2. **Global Scope Pollution**: 50+ variables in outer closure scope
3. **Mixed Concerns**: UI, data fetching, parsing, rendering, filtering all intertwined
4. **Deep Nesting**: Functions calling functions with shared closure state
5. **Tight Coupling**: Hard dependencies between unrelated features
6. **Difficult Testing**: No module boundaries, impossible to unit test
7. **Hard to Extend**: Adding features requires understanding entire codebase

---

## Recommended Refactoring Approach

### Phase 1: Module Extraction (Priority: HIGH)
**Goal**: Break monolith into logical modules without breaking functionality

#### 1.1 Create Core Module Structure

```javascript
// File: modules/core/constants.js
export const SCRIPT_ID = "vzell-mb-show-all-entities";
export const SCRIPT_NAME = "Show All Entities";

// File: modules/core/state.js
export class AppState {
    constructor() {
        this.allRows = [];
        this.originalAllRows = [];
        this.groupedRows = [];
        this.isLoaded = false;
        this.stopRequested = false;
        this.multiTableSortStates = new Map();
        this.pageType = '';
        this.activeDefinition = null;
    }

    reset() {
        this.allRows = [];
        this.originalAllRows = [];
        this.groupedRows = [];
        this.isLoaded = false;
        this.stopRequested = false;
    }

    getRowCount() {
        return this.activeDefinition?.tableMode === 'multi'
            ? this.groupedRows.reduce((acc, g) => acc + g.rows.length, 0)
            : this.allRows.length;
    }
}

// File: modules/core/config.js
export const configSchema = {
    sa_enable_debug_logging: {
        label: "Enable debug logging",
        type: "checkbox",
        default: false,
        description: "Enable debug logging in the browser developer console"
    },
    // ... rest of config
};

export const pageDefinitions = [
    {
        type: 'artist-releases',
        match: (path) => path.includes('/releases'),
        buttons: [
            { label: 'Show all Releases for Artist' },
            { label: 'Show only "Official" Releases', filter: 'official' }
        ],
        // ... rest of definition
    },
    // ... rest of definitions
];
```

#### 1.2 Extract Page Detection Module

```javascript
// File: modules/page/detector.js
export class PageDetector {
    constructor(pageDefinitions) {
        this.definitions = pageDefinitions;
    }

    detect(url) {
        const currentUrl = new URL(url);
        const path = currentUrl.pathname;
        const params = currentUrl.searchParams;

        for (const def of this.definitions) {
            if (def.match(path, params)) {
                return {
                    type: def.type,
                    definition: def,
                    url: currentUrl,
                    path,
                    params
                };
            }
        }
        return null;
    }

    findHeaderContainer() {
        const selectors = [
            '.artistheader h1',
            '.rgheader h1',
            '.labelheader h1',
            // ... etc
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    }
}
```

#### 1.3 Extract UI Components Module

```javascript
// File: modules/ui/components.js
export class UIComponents {
    constructor(state, config) {
        this.state = state;
        this.config = config;
        this.elements = {};
    }

    createControlsContainer() {
        const container = document.createElement('div');
        container.id = 'mb-show-all-controls-container';
        container.style.cssText = 'display:inline-flex; flex-wrap:wrap; ...';
        return container;
    }

    createActionButtons(buttonsConfig, onClickHandler) {
        return buttonsConfig.map(conf => {
            const btn = document.createElement('button');
            btn.textContent = conf.label;
            btn.style.cssText = '...';
            btn.onclick = (e) => onClickHandler(e, conf);
            return btn;
        });
    }

    createSaveButton(onSave) {
        const btn = document.createElement('button');
        btn.textContent = '💾 Save to Disk';
        btn.style.cssText = '...';
        btn.style.display = 'none';
        btn.onclick = onSave;
        return btn;
    }

    createLoadButton(onLoad) {
        const btn = document.createElement('button');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        input.onchange = (e) => onLoad(e.target.files[0]);
        btn.onclick = () => input.click();
        return { btn, input };
    }

    createFilterInput() {
        // ... filter creation logic
    }

    createProgressBar() {
        // ... progress bar creation logic
    }
}
```

#### 1.4 Extract Data Fetching Module

```javascript
// File: modules/data/fetcher.js
export class DataFetcher {
    constructor(httpClient, logger) {
        this.http = httpClient;
        this.logger = logger;
    }

    async fetchPage(url) {
        this.logger.debug('fetch', `Fetching URL: ${url}`);
        return this.http.get(url);
    }

    async fetchAllPages(baseUrl, maxPage, onProgress) {
        const results = [];
        for (let page = 1; page <= maxPage; page++) {
            const url = this.buildPageUrl(baseUrl, page);
            const html = await this.fetchPage(url);
            results.push(html);

            if (onProgress) {
                onProgress(page, maxPage);
            }
        }
        return results;
    }

    buildPageUrl(baseUrl, page) {
        const url = new URL(baseUrl);
        url.searchParams.set('page', page);
        return url.toString();
    }

    determineMaxPage(doc) {
        // ... existing logic
    }
}
```

#### 1.5 Extract Table Parsing Module

```javascript
// File: modules/data/parser.js
export class TableParser {
    constructor(logger) {
        this.logger = logger;
    }

    parseDocument(html, targetHeader = null) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return this.extractTables(doc, targetHeader);
    }

    extractTables(doc, targetHeader) {
        if (!targetHeader) {
            return Array.from(doc.querySelectorAll('table.tbl'));
        }

        const tables = [];
        const headers = Array.from(doc.querySelectorAll('h2'));
        const foundH2 = headers.find(h =>
            h.textContent.trim().toLowerCase().includes(targetHeader.toLowerCase())
        );

        if (!foundH2) return tables;

        let next = foundH2.nextElementSibling;
        while (next && next.nodeName !== 'H2') {
            if (next.classList.contains('tbl')) {
                tables.push(next);
            } else {
                const innerTables = next.querySelectorAll('table.tbl');
                if (innerTables.length > 0) {
                    tables.push(...Array.from(innerTables));
                }
            }
            next = next.nextElementSibling;
        }

        return tables;
    }

    extractRows(table, pageType, features) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return [];

        const rows = Array.from(tbody.querySelectorAll('tr'));
        return rows.map(row => this.processRow(row, pageType, features));
    }

    processRow(row, pageType, features) {
        // Row transformation logic
        // This would include the split CD/Location/Area logic
        return row;
    }
}
```

#### 1.6 Extract Rendering Module

```javascript
// File: modules/ui/renderer.js
export class TableRenderer {
    constructor(state, logger) {
        this.state = state;
        this.logger = logger;
    }

    renderFinalTable(rows) {
        this.logger.info('render', `Rendering ${rows.length} rows`);

        const tbody = document.querySelector('table.tbl tbody');
        if (!tbody) {
            this.logger.error('render', 'tbody not found');
            return;
        }

        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(r));

        this.logger.info('render', 'Rendering complete');
    }

    renderGroupedTable(groups, isArtistMain = false) {
        this.logger.info('render', `Rendering ${groups.length} groups`);

        const container = document.getElementById('content');
        if (!container) {
            this.logger.error('render', 'Container not found');
            return;
        }

        // Clear existing content
        this.clearContainer(container);

        // Render each group
        groups.forEach(group => {
            this.renderGroup(container, group, isArtistMain);
        });

        this.logger.info('render', 'Group rendering complete');
    }

    renderGroup(container, group, isArtistMain) {
        const h3 = this.createGroupHeader(group);
        const table = this.createGroupTable(group);

        container.appendChild(h3);
        container.appendChild(table);
    }

    createGroupHeader(group) {
        const h3 = document.createElement('h3');
        h3.textContent = group.key;
        h3.className = 'mb-toggle-h3';
        return h3;
    }

    createGroupTable(group) {
        const table = document.createElement('table');
        table.className = 'tbl';

        const thead = this.createTableHead();
        const tbody = this.createTableBody(group.rows);

        table.appendChild(thead);
        table.appendChild(tbody);

        return table;
    }

    clearContainer(container) {
        container.querySelectorAll('h3, table.tbl').forEach(el => el.remove());
    }
}
```

#### 1.7 Extract Filter Module

```javascript
// File: modules/features/filter.js
export class FilterEngine {
    constructor(state, logger) {
        this.state = state;
        this.logger = logger;
        this.globalQuery = '';
        this.columnQueries = new Map();
        this.isCaseSensitive = false;
        this.isRegExp = false;
    }

    setGlobalFilter(query, caseSensitive, useRegExp) {
        this.globalQuery = query;
        this.isCaseSensitive = caseSensitive;
        this.isRegExp = useRegExp;
    }

    setColumnFilter(columnIndex, query) {
        if (query) {
            this.columnQueries.set(columnIndex, query);
        } else {
            this.columnQueries.delete(columnIndex);
        }
    }

    apply() {
        const rows = this.state.activeDefinition.tableMode === 'multi'
            ? this.filterGrouped()
            : this.filterFlat();

        return rows;
    }

    filterFlat() {
        return this.state.allRows.filter(row =>
            this.matchesGlobalFilter(row) && this.matchesColumnFilters(row)
        );
    }

    filterGrouped() {
        return this.state.groupedRows.map(group => ({
            ...group,
            rows: group.rows.filter(row =>
                this.matchesGlobalFilter(row) && this.matchesColumnFilters(row)
            )
        })).filter(group => group.rows.length > 0);
    }

    matchesGlobalFilter(row) {
        if (!this.globalQuery) return true;

        const text = this.getRowText(row);
        return this.isRegExp
            ? this.matchRegExp(text, this.globalQuery, this.isCaseSensitive)
            : this.matchString(text, this.globalQuery, this.isCaseSensitive);
    }

    matchesColumnFilters(row) {
        for (const [colIndex, query] of this.columnQueries) {
            const cell = row.cells[colIndex];
            if (!cell) return false;

            const text = this.getCellText(cell);
            if (!this.matchString(text, query, false)) {
                return false;
            }
        }
        return true;
    }

    matchString(text, query, caseSensitive) {
        if (!caseSensitive) {
            text = text.toLowerCase();
            query = query.toLowerCase();
        }
        return text.includes(query);
    }

    matchRegExp(text, pattern, caseSensitive) {
        try {
            const flags = caseSensitive ? '' : 'i';
            const regex = new RegExp(pattern, flags);
            return regex.test(text);
        } catch (e) {
            return false;
        }
    }

    getRowText(row) {
        return Array.from(row.cells)
            .map(cell => cell.textContent)
            .join(' ');
    }

    getCellText(cell) {
        return cell.textContent || '';
    }
}
```

#### 1.8 Extract Sorting Module

```javascript
// File: modules/features/sorter.js
export class SortEngine {
    constructor(state, logger) {
        this.state = state;
        this.logger = logger;
        this.states = new Map(); // table key -> sort state
    }

    sort(tableKey, columnIndex, columnName) {
        const currentState = this.states.get(tableKey) || {
            lastSortIndex: -1,
            sortState: 0
        };

        // Determine next state
        let nextState = 0;
        if (currentState.lastSortIndex === columnIndex) {
            nextState = (currentState.sortState + 1) % 3; // 0 -> 1 -> 2 -> 0
        } else {
            nextState = 1; // New column, start ascending
        }

        // Apply sort
        const sorted = this.applySortState(
            tableKey,
            columnIndex,
            columnName,
            nextState
        );

        // Update state
        this.states.set(tableKey, {
            lastSortIndex: columnIndex,
            sortState: nextState
        });

        return {
            rows: sorted,
            state: nextState
        };
    }

    applySortState(tableKey, columnIndex, columnName, state) {
        const isMulti = this.state.activeDefinition.tableMode === 'multi';
        const rows = isMulti
            ? this.getGroupRows(tableKey)
            : this.state.allRows;
        const originalRows = isMulti
            ? this.getOriginalGroupRows(tableKey)
            : this.state.originalAllRows;

        if (state === 0) {
            return [...originalRows];
        }

        const isNumeric = this.isNumericColumn(columnName);
        const isAscending = state === 1;

        return this.sortRows(rows, columnIndex, isNumeric, isAscending);
    }

    sortRows(rows, columnIndex, isNumeric, isAscending) {
        const sorted = [...rows];

        sorted.sort((a, b) => {
            const valA = this.getCellValue(a.cells[columnIndex]);
            const valB = this.getCellValue(b.cells[columnIndex]);

            if (isNumeric) {
                const numA = parseFloat(valA.replace(/[^0-9.]/g, '')) || 0;
                const numB = parseFloat(valB.replace(/[^0-9.]/g, '')) || 0;
                return isAscending ? numA - numB : numB - numA;
            }

            return isAscending
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        });

        return sorted;
    }

    getCellValue(cell) {
        if (!cell) return '';
        // Extract visible text, excluding hidden elements
        const clone = cell.cloneNode(true);
        clone.querySelectorAll('.comment, .mp').forEach(el => el.remove());
        return clone.textContent.trim().toLowerCase();
    }

    isNumericColumn(columnName) {
        const numericColumns = ['Year', 'Releases', 'Track', 'Length', 'Rating'];
        return numericColumns.some(col => columnName.includes(col));
    }

    getGroupRows(tableKey) {
        const group = this.state.groupedRows.find(g => g.key === tableKey);
        return group ? group.rows : [];
    }

    getOriginalGroupRows(tableKey) {
        const group = this.state.groupedRows.find(g => g.key === tableKey);
        return group ? group.originalRows : [];
    }
}
```

#### 1.9 Extract Storage Module

```javascript
// File: modules/features/storage.js
export class OfflineStorage {
    constructor(state, logger) {
        this.state = state;
        this.logger = logger;
    }

    async save() {
        this.logger.info('cache', 'Starting serialization...');

        if (!this.state.isLoaded) {
            throw new Error('No data loaded');
        }

        const data = this.serialize();
        const filename = this.generateFilename();

        await this.downloadFile(data, filename);

        this.logger.success('cache', `Saved to ${filename}`);
        return filename;
    }

    serialize() {
        const data = {
            version: '1.0',
            url: window.location.href,
            pageType: this.state.pageType,
            timestamp: Date.now(),
            timestampReadable: new Date().toISOString(),
            tableMode: this.state.activeDefinition.tableMode,
            rowCount: this.state.getRowCount(),
            headers: this.serializeHeaders(),
            rows: null,
            groups: null
        };

        if (this.state.activeDefinition.tableMode === 'multi') {
            data.groups = this.serializeGroups();
        } else {
            data.rows = this.serializeRows(this.state.allRows);
        }

        return data;
    }

    serializeHeaders() {
        const table = document.querySelector('table.tbl');
        if (!table || !table.tHead) return null;

        return Array.from(table.tHead.querySelectorAll('tr')).map(row =>
            Array.from(row.cells).map(cell => ({
                html: cell.innerHTML,
                colSpan: cell.colSpan || 1,
                rowSpan: cell.rowSpan || 1,
                tagName: cell.tagName
            }))
        );
    }

    serializeRows(rows) {
        return rows.map(row =>
            Array.from(row.cells).map(cell => ({
                html: cell.innerHTML,
                colSpan: cell.colSpan || 1,
                rowSpan: cell.rowSpan || 1
            }))
        );
    }

    serializeGroups() {
        return this.state.groupedRows.map(group => ({
            key: group.key,
            rows: this.serializeRows(group.rows)
        }));
    }

    async load(file) {
        this.logger.info('cache', `Loading from ${file.name}`);

        const text = await this.readFile(file);
        const data = JSON.parse(text);

        this.validate(data);
        this.deserialize(data);

        this.logger.success('cache', `Loaded ${data.rowCount} rows`);
        return data;
    }

    deserialize(data) {
        // Restore headers
        if (data.headers) {
            this.restoreHeaders(data.headers);
        }

        // Restore rows/groups
        if (data.tableMode === 'multi' && data.groups) {
            this.state.groupedRows = this.deserializeGroups(data.groups);
            this.state.allRows = [];
        } else if (data.rows) {
            this.state.allRows = this.deserializeRows(data.rows);
            this.state.groupedRows = [];
        }

        this.state.isLoaded = true;
        this.state.pageType = data.pageType;
        this.state.originalAllRows = [...this.state.allRows];
    }

    deserializeRows(serializedRows) {
        return serializedRows.map(rowCells => {
            const tr = document.createElement('tr');
            rowCells.forEach(cellData => {
                const td = document.createElement('td');
                td.innerHTML = cellData.html;
                if (cellData.colSpan > 1) td.colSpan = cellData.colSpan;
                if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
                tr.appendChild(td);
            });
            return tr;
        });
    }

    deserializeGroups(serializedGroups) {
        return serializedGroups.map(group => ({
            key: group.key,
            rows: this.deserializeRows(group.rows),
            originalRows: []
        }));
    }

    validate(data) {
        if (!data.version || !data.pageType || !data.timestamp) {
            throw new Error('Invalid data file');
        }
    }

    generateFilename() {
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, -5);
        return `mb-${this.state.pageType}-${timestamp}.json`;
    }

    async downloadFile(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        if (typeof GM_download !== 'undefined') {
            return new Promise((resolve, reject) => {
                GM_download({
                    url,
                    name: filename,
                    saveAs: true,
                    onload: () => {
                        URL.revokeObjectURL(url);
                        resolve();
                    },
                    onerror: (err) => {
                        URL.revokeObjectURL(url);
                        reject(err);
                    }
                });
            });
        } else {
            // Fallback
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}
```

#### 1.10 Create Main Application Controller

```javascript
// File: modules/app/controller.js
export class AppController {
    constructor(dependencies) {
        this.state = dependencies.state;
        this.detector = dependencies.detector;
        this.fetcher = dependencies.fetcher;
        this.parser = dependencies.parser;
        this.renderer = dependencies.renderer;
        this.filter = dependencies.filter;
        this.sorter = dependencies.sorter;
        this.storage = dependencies.storage;
        this.ui = dependencies.ui;
        this.logger = dependencies.logger;
    }

    async initialize() {
        // 1. Detect page type
        const pageInfo = this.detector.detect(window.location.href);
        if (!pageInfo) {
            this.logger.error('init', 'Page not supported');
            return;
        }

        this.state.pageType = pageInfo.type;
        this.state.activeDefinition = pageInfo.definition;

        // 2. Find header container
        const headerContainer = this.detector.findHeaderContainer();
        if (!headerContainer) {
            this.logger.error('init', 'Header not found');
            return;
        }

        // 3. Create UI
        this.createUI(headerContainer);

        this.logger.info('init', `Initialized for ${pageInfo.type}`);
    }

    createUI(headerContainer) {
        const controls = this.ui.createControlsContainer();

        // Action buttons
        const buttons = this.ui.createActionButtons(
            this.state.activeDefinition.buttons,
            (e, conf) => this.handleFetch(e, conf)
        );
        buttons.forEach(btn => controls.appendChild(btn));

        // Storage buttons
        const saveBtn = this.ui.createSaveButton(() => this.handleSave());
        const { btn: loadBtn, input: loadInput } = this.ui.createLoadButton(
            (file) => this.handleLoad(file)
        );

        controls.appendChild(saveBtn);
        controls.appendChild(loadBtn);
        controls.appendChild(loadInput);

        // Filter, progress, etc.
        const filterInput = this.ui.createFilterInput((query, opts) =>
            this.handleFilter(query, opts)
        );
        const progressBar = this.ui.createProgressBar();

        controls.appendChild(filterInput);
        controls.appendChild(progressBar);

        // Attach to page
        if (headerContainer.tagName === 'A') {
            headerContainer.after(controls);
        } else {
            headerContainer.appendChild(controls);
        }

        // Store references
        this.ui.elements = {
            controls,
            buttons,
            saveBtn,
            loadBtn,
            filterInput,
            progressBar
        };
    }

    async handleFetch(event, config) {
        try {
            this.logger.info('fetch', 'Starting fetch process...');

            // 1. Determine pagination
            const maxPage = this.fetcher.determineMaxPage(document);

            // 2. Fetch all pages
            const htmlPages = await this.fetcher.fetchAllPages(
                window.location.href,
                maxPage,
                (current, total) => this.updateProgress(current, total)
            );

            // 3. Parse tables
            const allRows = [];
            const groupedRows = [];

            for (const html of htmlPages) {
                const tables = this.parser.parseDocument(html);
                for (const table of tables) {
                    const rows = this.parser.extractRows(
                        table,
                        this.state.pageType,
                        this.state.activeDefinition.features
                    );

                    if (this.state.activeDefinition.tableMode === 'multi') {
                        // Group logic
                        this.groupRows(rows, groupedRows);
                    } else {
                        allRows.push(...rows);
                    }
                }
            }

            // 4. Store in state
            this.state.allRows = allRows;
            this.state.originalAllRows = [...allRows];
            this.state.groupedRows = groupedRows;
            this.state.isLoaded = true;

            // 5. Render
            this.render();

            this.logger.success('fetch', 'Fetch complete');

        } catch (err) {
            this.logger.error('fetch', 'Fetch failed', err);
        }
    }

    handleFilter(query, options) {
        this.filter.setGlobalFilter(
            query,
            options.caseSensitive,
            options.useRegExp
        );

        const filtered = this.filter.apply();
        this.render(filtered);
    }

    handleSort(tableKey, columnIndex, columnName) {
        const result = this.sorter.sort(tableKey, columnIndex, columnName);

        // Update state
        if (this.state.activeDefinition.tableMode === 'multi') {
            const group = this.state.groupedRows.find(g => g.key === tableKey);
            if (group) group.rows = result.rows;
        } else {
            this.state.allRows = result.rows;
        }

        this.render();
    }

    async handleSave() {
        try {
            const filename = await this.storage.save();
            this.logger.success('storage', `Saved to ${filename}`);
        } catch (err) {
            this.logger.error('storage', 'Save failed', err);
        }
    }

    async handleLoad(file) {
        try {
            await this.storage.load(file);
            this.render();
            this.logger.success('storage', 'Load complete');
        } catch (err) {
            this.logger.error('storage', 'Load failed', err);
        }
    }

    render(data = null) {
        const rows = data || (this.state.activeDefinition.tableMode === 'multi'
            ? this.state.groupedRows
            : this.state.allRows);

        if (this.state.activeDefinition.tableMode === 'multi') {
            this.renderer.renderGroupedTable(rows);
        } else {
            this.renderer.renderFinalTable(rows);
        }

        // Show save button
        if (this.ui.elements.saveBtn) {
            this.ui.elements.saveBtn.style.display = 'inline-block';
        }
    }

    updateProgress(current, total) {
        if (this.ui.elements.progressBar) {
            this.ui.elements.progressBar.update(current, total);
        }
    }

    groupRows(rows, groupedRows) {
        // Grouping logic based on page type
        // Extract from current implementation
    }
}
```

#### 1.11 New Entry Point

```javascript
// File: ShowAllEntityData.user.js (New main file)
// ==UserScript==
// @name         VZ: MusicBrainz - Show All Entity Data In A Consolidated View
// ... (all metadata)
// ==/UserScript==

import { AppState } from './modules/core/state.js';
import { configSchema, pageDefinitions } from './modules/core/config.js';
import { PageDetector } from './modules/page/detector.js';
import { DataFetcher } from './modules/data/fetcher.js';
import { TableParser } from './modules/data/parser.js';
import { TableRenderer } from './modules/ui/renderer.js';
import { FilterEngine } from './modules/features/filter.js';
import { SortEngine } from './modules/features/sorter.js';
import { OfflineStorage } from './modules/features/storage.js';
import { UIComponents } from './modules/ui/components.js';
import { AppController } from './modules/app/controller.js';

(function() {
    'use strict';

    // Initialize library
    const Lib = new VZ_MBLibrary(
        "vzell-mb-show-all-entities",
        "Show All Entities",
        configSchema,
        changelog,
        () => Lib.settings.sa_enable_debug_logging ?? true
    );

    // Create dependencies
    const state = new AppState();
    const detector = new PageDetector(pageDefinitions);
    const fetcher = new DataFetcher(
        { get: (url) => fetchHtml(url) },
        Lib
    );
    const parser = new TableParser(Lib);
    const renderer = new TableRenderer(state, Lib);
    const filter = new FilterEngine(state, Lib);
    const sorter = new SortEngine(state, Lib);
    const storage = new OfflineStorage(state, Lib);
    const ui = new UIComponents(state, Lib.settings);

    // Create controller
    const app = new AppController({
        state,
        detector,
        fetcher,
        parser,
        renderer,
        filter,
        sorter,
        storage,
        ui,
        logger: Lib
    });

    // Initialize
    app.initialize().catch(err => {
        Lib.error('app', 'Failed to initialize', err);
    });

    // Helper for GM_xmlhttpRequest
    function fetchHtml(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (res) => resolve(res.responseText),
                onerror: reject
            });
        });
    }
})();
```

---

### Phase 2: Testing Infrastructure (Priority: HIGH)
**Goal**: Enable unit testing for each module

```javascript
// File: tests/unit/filter.test.js
import { FilterEngine } from '../../modules/features/filter.js';
import { AppState } from '../../modules/core/state.js';

describe('FilterEngine', () => {
    let state, filter, logger;

    beforeEach(() => {
        state = new AppState();
        logger = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };
        filter = new FilterEngine(state, logger);
    });

    describe('matchString', () => {
        test('should match case-insensitive by default', () => {
            expect(filter.matchString('Hello World', 'hello', false)).toBe(true);
        });

        test('should respect case sensitivity', () => {
            expect(filter.matchString('Hello World', 'hello', true)).toBe(false);
            expect(filter.matchString('Hello World', 'Hello', true)).toBe(true);
        });
    });

    describe('matchRegExp', () => {
        test('should match with regex pattern', () => {
            expect(filter.matchRegExp('test123', '\\d+', false)).toBe(true);
            expect(filter.matchRegExp('test', '\\d+', false)).toBe(false);
        });

        test('should handle invalid regex gracefully', () => {
            expect(filter.matchRegExp('test', '[invalid', false)).toBe(false);
        });
    });

    describe('filterFlat', () => {
        test('should filter rows based on global query', () => {
            // Create mock rows
            const row1 = createMockRow(['John', 'Doe']);
            const row2 = createMockRow(['Jane', 'Smith']);

            state.allRows = [row1, row2];
            filter.setGlobalFilter('john', false, false);

            const result = filter.filterFlat();
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(row1);
        });
    });
});

function createMockRow(cellTexts) {
    const row = document.createElement('tr');
    cellTexts.forEach(text => {
        const td = document.createElement('td');
        td.textContent = text;
        row.appendChild(td);
    });
    return row;
}
```

---

### Phase 3: Build System (Priority: MEDIUM)
**Goal**: Automate bundling and deployment

```javascript
// File: build.config.js
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.js',
            userscript: {
                name: 'VZ: MusicBrainz - Show All Entity Data',
                namespace: 'https://github.com/vzell/mb-userscripts',
                match: [
                    '*://*.musicbrainz.org/artist/*',
                    '*://*.musicbrainz.org/release-group/*',
                    // ... etc
                ],
                grant: [
                    'GM_xmlhttpRequest',
                    'GM_setValue',
                    'GM_getValue',
                    'GM_download'
                ]
            },
            build: {
                externalGlobals: {
                    'VZ_MBLibrary': 'VZ_MBLibrary'
                }
            }
        })
    ]
});
```

```json
// File: package.json
{
    "name": "mb-show-all-entities",
    "version": "4.3.0",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "test": "jest",
        "test:watch": "jest --watch",
        "lint": "eslint src/",
        "format": "prettier --write src/"
    },
    "devDependencies": {
        "@types/tampermonkey": "^4.0.0",
        "eslint": "^8.0.0",
        "jest": "^29.0.0",
        "prettier": "^3.0.0",
        "vite": "^5.0.0",
        "vite-plugin-monkey": "^4.0.0"
    }
}
```

---

### Phase 4: Documentation (Priority: MEDIUM)

```markdown
// File: docs/ARCHITECTURE.md
# Architecture Overview

## Module Hierarchy

```
ShowAllEntityData/
├── core/
│   ├── constants.js    - Application constants
│   ├── state.js        - Centralized state management
│   └── config.js       - Configuration schema
├── page/
│   └── detector.js     - Page type detection
├── data/
│   ├── fetcher.js      - HTTP requests and pagination
│   └── parser.js       - HTML/DOM parsing
├── ui/
│   ├── components.js   - UI component factory
│   └── renderer.js     - Table rendering
├── features/
│   ├── filter.js       - Filtering engine
│   ├── sorter.js       - Sorting engine
│   └── storage.js      - Offline storage
└── app/
    └── controller.js   - Main application controller
```

## Data Flow

```
User Action
    ↓
Controller
    ↓
Feature Module (Filter/Sort/Fetch)
    ↓
State Update
    ↓
Renderer
    ↓
DOM Update
```

## Design Patterns Used

- **MVC**: Controller (AppController) coordinates Model (AppState) and View (TableRenderer)
- **Dependency Injection**: All modules receive dependencies via constructor
- **Strategy Pattern**: FilterEngine supports multiple matching strategies (string/regex)
- **Factory Pattern**: UIComponents creates UI elements
- **Observer Pattern**: State changes trigger re-renders
- **Command Pattern**: User actions encapsulated as handler methods

## Testing Strategy

- **Unit Tests**: Each module tested in isolation
- **Integration Tests**: Module interactions tested
- **E2E Tests**: Full user workflows tested against real MusicBrainz pages
```

---

## Migration Strategy

### Gradual Migration Plan

**Week 1-2: Setup**
1. Create new `src/` directory structure
2. Set up build system (Vite + vite-plugin-monkey)
3. Set up testing framework (Jest)
4. Create stub modules

**Week 3-4: Core Extraction**
1. Extract State module
2. Extract Config module
3. Update main file to use new modules
4. Test that functionality still works

**Week 5-6: Data Layer**
1. Extract Fetcher module
2. Extract Parser module
3. Add unit tests
4. Integrate and test

**Week 7-8: UI Layer**
1. Extract Renderer module
2. Extract UIComponents module
3. Add unit tests
4. Integrate and test

**Week 9-10: Features**
1. Extract Filter module
2. Extract Sorter module
3. Extract Storage module
4. Add unit tests
5. Integrate and test

**Week 11: Controller**
1. Create AppController
2. Wire all modules together
3. Remove old monolithic code
4. Final integration testing

**Week 12: Documentation & Polish**
1. Write architecture docs
2. Write API docs
3. Update README
4. Final testing and bug fixes

---

## Benefits of Refactoring

### Immediate Benefits
✅ **Maintainability**: Each module <300 lines, easy to understand
✅ **Testability**: Unit tests for each module
✅ **Debugging**: Issues isolated to specific modules
✅ **Code Reuse**: Modules can be used in other projects

### Long-term Benefits
✅ **Extensibility**: New features added as new modules
✅ **Team Collaboration**: Multiple developers can work on different modules
✅ **Performance**: Easier to identify and optimize bottlenecks
✅ **Documentation**: Clear module boundaries = clear docs

---

## Alternative Approaches

### Option 2: Service-Oriented Architecture (SOA)

Instead of modules, create services:

```javascript
class TableService {
    constructor(httpService, parserService, rendererService) {
        this.http = httpService;
        this.parser = parserService;
        this.renderer = rendererService;
    }

    async fetchAndRender(url, pageType) {
        const html = await this.http.get(url);
        const rows = this.parser.parseTable(html, pageType);
        this.renderer.render(rows);
    }
}
```

**Pros**: Very clean separation, easy to mock services
**Cons**: May be overkill for userscript size

### Option 3: Functional Programming

Use pure functions and immutable data:

```javascript
// Pure functions
const filterRows = (rows, query, options) => {
    return rows.filter(row => matchesQuery(row, query, options));
};

const sortRows = (rows, columnIndex, direction) => {
    return [...rows].sort(comparator(columnIndex, direction));
};

// Composition
const processData = pipe(
    fetchData,
    parseData,
    filterRows,
    sortRows,
    renderData
);
```

**Pros**: Easier to test, no side effects, immutable state
**Cons**: Requires mindset shift, may need libraries (Ramda, lodash/fp)

### Option 4: Component-Based (React-like)

Create reusable UI components:

```javascript
class TableComponent {
    render(props) {
        return `
            <table class="tbl">
                ${props.headers.map(h => `<th>${h}</th>`).join('')}
                ${props.rows.map(r => this.renderRow(r)).join('')}
            </table>
        `;
    }
}
```

**Pros**: Declarative, easy to reason about UI
**Cons**: Requires framework or custom implementation

---

## Recommendation

**Best Approach**: **Phase 1 (Module Extraction)** is the recommended path because:

1. ✅ **Incremental**: Can be done gradually without breaking functionality
2. ✅ **Practical**: Fits userscript constraints (no build step required initially)
3. ✅ **Proven**: Industry-standard MVC/modular pattern
4. ✅ **Testable**: Easy to add unit tests
5. ✅ **Documented**: Well-understood architecture
6. ✅ **Flexible**: Can evolve to SOA or FP later if needed

**Next Steps**:
1. Create branch: `refactor/modular-architecture`
2. Start with Phase 1.1 (Core modules)
3. Write tests as you extract
4. Keep old code until new modules proven
5. Gradual cutover with feature flags

This approach minimizes risk while maximizing long-term maintainability.
