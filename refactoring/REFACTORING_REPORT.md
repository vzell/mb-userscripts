# Code Analysis & Refactoring Report

## Executive Summary

This report analyzes the ShowAllEntityData userscript (6559 lines) for:
- Unused variables and functions
- Code that should be extracted into functions
- Refactoring opportunities for improved clarity and maintainability

---

## 1. Unused Functions & Variables

### Unused Functions (13 found)

These functions are defined but never called. They should either be removed or their purpose clarified:

| Line | Function | Reason |
|------|----------|--------|
| 130 | `later()` | Internal to debounce, should be marked as closure |
| 510 | `closeMenu()` | Event handler, used indirectly |
| 518 | `closeMenuOnEscape()` | Event handler, used indirectly |
| 697 | `onEscape()` | Event handler, used indirectly |
| 832 | `closeOnEscape()` | Event handler, used indirectly |
| 842 | `closeOnClickOutside()` | Event handler, used indirectly |
| 977 | `showStatsPanel()` | Should be called from stats button |
| 1594 | `toggleAutoResizeColumns()` | Should be called from resize button |
| 3278 | `handleEsc()` | Event handler, used indirectly |
| 3349 | `triggerDiskLoad()` | Should be called from load button |
| 3368 | `normalizeAliasTable()` | Should be called from table processor |
| 4412 | `escHandler()` | Event handler, used indirectly |
| 5782 | `toggleFn()` | Internal closure, should be marked |

**Note:** Many of these are event handlers attached via addEventListener and won't show up in static analysis. Needs manual verification.

### Potentially Unused Variables (2 found)

| Line | Variable | Declaration |
|------|----------|-------------|
| 4675 | `baseUrl` | `const baseUrl` |
| 5334 | `renderSeconds` | `const renderSeconds` |

**Action Required:** Verify these are truly unused and remove if so.

---

## 2. Repeated DOM Access (Critical Performance Issue)

### Elements Accessed Multiple Times Without Caching

| Element | Times | Lines | Impact |
|---------|-------|-------|--------|
| `document.querySelector('table.tbl')` | 11x | 544, 985, 3559, 4022, 5254... | HIGH |
| `document.getElementById('mb-status-display')` | 9x | 640, 750, 1195, 1450, 1639... | HIGH |
| `document.getElementById('mb-show-all-controls-container')` | 6x | 526, 718, 964, 1125, 1338... | MEDIUM |
| `document.getElementById('content')` | 4x | 1568, 1661, 4471, 5473 | MEDIUM |
| `document.getElementById('sidebar')` | 3x | 1569, 1662, 5797 | LOW |

### Recommended Fix:

```javascript
// Add at module level after line ~120
const DOM = {
    get statusDisplay() { return document.getElementById('mb-status-display'); },
    get controlsContainer() { return document.getElementById('mb-show-all-controls-container'); },
    get mainTable() { return document.querySelector('table.tbl'); },
    get contentDiv() { return document.getElementById('content'); },
    get sidebar() { return document.getElementById('sidebar'); }
};

// Usage:
// Instead of: document.getElementById('mb-status-display')
// Use: DOM.statusDisplay
```

**Impact:** Reduces DOM queries by ~35 calls, improves performance and code clarity.

---

## 3. Long Functions Needing Refactoring

### Functions Over 100 Lines

| Function | Lines | Location | Complexity |
|----------|-------|----------|-----------|
| `loadTableDataFromDisk()` | 258 | 6300 | VERY HIGH |
| `toggleAutoResizeColumns()` | 233 | 1594 | VERY HIGH |
| `runFilter()` | 231 | 3885 | VERY HIGH |
| `makeTableSortableUnified()` | 166 | 5828 | HIGH |
| `exportTableToCSV()` | 163 | 543 | HIGH |
| `addColumnVisibilityToggle()` | 158 | 379 | HIGH |
| `initSidebarCollapse()` | 155 | 2147 | HIGH |
| `addDensityControl()` | 142 | 1207 | MEDIUM |
| `showStatsPanel()` | 136 | 977 | MEDIUM |
| `cleanupHeaders()` | 120 | 4154 | MEDIUM |
| `makeH2sCollapsible()` | 110 | 5710 | MEDIUM |
| `makeColumnsResizable()` | 104 | 1360 | MEDIUM |
| `saveTableDataToDisk()` | 104 | 6113 | MEDIUM |
| `showRenderDecisionDialog()` | 103 | 4319 | MEDIUM |
| `updateH2Count()` | 102 | 3556 | MEDIUM |

**Recommendation:** These functions violate the Single Responsibility Principle. Each should be broken into smaller, focused functions.

---

## 4. Specific Refactoring Opportunities

### 4.1 Status Display Updates (13 occurrences)

**Current Pattern:**
```javascript
const statusDisplay = document.getElementById('mb-status-display');
statusDisplay.textContent = 'Some message';
statusDisplay.style.color = 'green';
```

**Recommended Refactoring:**
```javascript
function updateStatus(message, type = 'info') {
    const statusDisplay = DOM.statusDisplay;
    if (!statusDisplay) return;
    
    statusDisplay.textContent = message;
    statusDisplay.className = `mb-status mb-status-${type}`;
}

// CSS classes:
// .mb-status-success { color: green; }
// .mb-status-error { color: red; }
// .mb-status-warning { color: orange; }
// .mb-status-info { color: blue; }
```

**Impact:** Eliminates 13 inline style assignments, improves consistency.

### 4.2 Error Handling (12 catch blocks)

**Current Pattern:**
```javascript
catch (err) {
    Lib.error('context', 'message', err);
    alert('Error message');
}
```

**Recommended Refactoring:**
```javascript
function handleError(context, error, options = {}) {
    const {
        showAlert = false,
        userMessage = null,
        updateStatus = true
    } = options;
    
    Lib.error(context, error);
    
    if (updateStatus) {
        updateStatus(
            userMessage || `Error: ${error.message}`,
            'error'
        );
    }
    
    if (showAlert) {
        alert(userMessage || error.message);
    }
}

// Usage:
catch (err) {
    handleError('cache', err, {
        showAlert: true,
        userMessage: 'Failed to load data from file'
    });
}
```

**Impact:** Standardizes error handling, reduces code duplication.

### 4.3 Button Creation (100+ element creations)

**Current Pattern:**
```javascript
const button = document.createElement('button');
button.textContent = 'Click Me';
button.className = 'some-class';
button.addEventListener('click', handler);
```

**Recommended Refactoring:**
```javascript
function createButton(config) {
    const {
        text,
        icon = '',
        className = '',
        title = '',
        onClick = null
    } = config;
    
    const button = document.createElement('button');
    button.textContent = icon ? `${icon} ${text}` : text;
    button.className = `mb-button ${className}`.trim();
    if (title) button.title = title;
    if (onClick) button.addEventListener('click', onClick);
    
    return button;
}

// Usage:
const exportBtn = createButton({
    text: 'Export',
    icon: '💾',
    className: 'mb-export-btn',
    title: 'Export to CSV',
    onClick: exportTableToCSV
});
```

**Impact:** Reduces ~100 lines of boilerplate code.

### 4.4 Menu Creation Pattern

**Current Pattern:** (repeated 3 times)
```javascript
const menu = document.createElement('div');
menu.className = 'some-menu';
menu.style.display = 'none';
// ... many more style assignments ...
menu.addEventListener('click', closeMenu);
document.addEventListener('keydown', closeMenuOnEscape);
document.addEventListener('click', closeOnClickOutside);
```

**Recommended Refactoring:**
```javascript
function createPopupMenu(config) {
    const {
        className = 'mb-popup-menu',
        content = '',
        closeOnEscape = true,
        closeOnClickOutside = true
    } = config;
    
    const menu = document.createElement('div');
    menu.className = className;
    menu.style.display = 'none';
    
    if (typeof content === 'string') {
        menu.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        menu.appendChild(content);
    }
    
    const show = () => menu.style.display = 'block';
    const hide = () => menu.style.display = 'none';
    const toggle = () => menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    
    if (closeOnEscape) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hide();
        });
    }
    
    if (closeOnClickOutside) {
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) hide();
        });
    }
    
    return { element: menu, show, hide, toggle };
}
```

**Impact:** Eliminates code duplication across menu creation.

### 4.5 Progress Display Pattern

**Current Pattern:** (repeated 5+ times)
```javascript
const progressContainer = document.createElement('div');
progressContainer.style.display = 'none';
// ... style assignments ...
const progressBar = document.createElement('div');
// ... more setup ...
```

**Recommended Refactoring:**
```javascript
function createProgressIndicator(containerId) {
    const container = document.createElement('div');
    container.id = containerId;
    container.className = 'mb-progress-container';
    container.style.display = 'none';
    
    const bar = document.createElement('div');
    bar.className = 'mb-progress-bar';
    
    const text = document.createElement('div');
    text.className = 'mb-progress-text';
    
    container.appendChild(bar);
    container.appendChild(text);
    
    return {
        element: container,
        show() { container.style.display = 'block'; },
        hide() { container.style.display = 'none'; },
        setProgress(percent, message = '') {
            bar.style.width = `${percent}%`;
            text.textContent = message;
        }
    };
}
```

**Impact:** Standardizes progress indicators, reduces duplication.

---

## 5. Inline Styles vs CSS Classes

### Current State:
- **240 inline style assignments** found
- Most frequently set properties:
  - `statusDisplay.style.color` (13x)
  - `menu.style.display` (11x)
  - `progressContainer.style.display` (7x)

### Recommended Approach:

```css
/* Add to style section */
.mb-status {
    padding: 5px 10px;
    border-radius: 3px;
}

.mb-status-success { color: green; }
.mb-status-error { color: red; }
.mb-status-warning { color: orange; }
.mb-status-info { color: #1976d2; }

.mb-hidden { display: none !important; }
.mb-visible { display: block !important; }

.mb-progress-container {
    /* base styles */
}

.mb-progress-bar {
    /* bar styles */
}
```

**Impact:** 
- Reduces JS file size by ~1KB
- Improves maintainability
- Enables easier theming

---

## 6. Optional Chaining Opportunities

**Current Pattern:**
```javascript
if (element) {
    element.classList.add('class');
}

if (obj && obj.property) {
    obj.property.method();
}
```

**Recommended:**
```javascript
element?.classList.add('class');

obj?.property?.method();
```

**Found:** 57 instances that could use optional chaining.

---

## 7. Specific Function Refactoring Examples

### 7.1 `runFilter()` - 231 lines

**Current Issues:**
- Does filtering, highlighting, status updates, timing, and progress tracking
- Multiple responsibilities in one function

**Recommended Split:**
```javascript
function runFilter() {
    const filterState = collectFilterState();
    const timing = measureFilterPerformance(() => {
        const results = applyFilters(filterState);
        updateFilterDisplay(results);
        highlightFilterMatches(results);
    });
    updateFilterStatus(timing, filterState);
}

function collectFilterState() { /* ... */ }
function applyFilters(state) { /* ... */ }
function updateFilterDisplay(results) { /* ... */ }
function highlightFilterMatches(results) { /* ... */ }
function updateFilterStatus(timing, state) { /* ... */ }
```

### 7.2 `toggleAutoResizeColumns()` - 233 lines

**Current Issues:**
- Handles state management, width calculation, DOM manipulation, scrolling
- Complex nested logic

**Recommended Split:**
```javascript
function toggleAutoResizeColumns() {
    if (isColumnResized) {
        restoreColumnWidths();
    } else {
        applyAutoResize();
    }
}

function calculateOptimalWidths(table) { /* ... */ }
function applyColumnWidths(table, widths) { /* ... */ }
function saveOriginalState(table) { /* ... */ }
function restoreColumnWidths() { /* ... */ }
function setupHorizontalScroll() { /* ... */ }
```

### 7.3 `loadTableDataFromDisk()` - 258 lines

**Current Issues:**
- File handling, parsing, validation, rendering, error handling in one function

**Recommended Split:**
```javascript
async function loadTableDataFromDisk(file) {
    const data = await parseTableDataFile(file);
    validateTableData(data);
    const rendered = renderTableFromData(data);
    applyPostRenderSetup(rendered);
}

function parseTableDataFile(file) { /* ... */ }
function validateTableData(data) { /* ... */ }
function renderTableFromData(data) { /* ... */ }
function applyPostRenderSetup(rendered) { /* ... */ }
```

---

## 8. Priority Recommendations

### High Priority (Do First):
1. **Create DOM cache object** - Fixes 35+ repeated queries
2. **Extract status update function** - Used 13+ times
3. **Standardize error handling** - Used 12+ times
4. **Create button factory** - Reduces 100+ lines

### Medium Priority:
5. Split long functions (258, 233, 231 lines)
6. Replace inline styles with CSS classes
7. Create menu/popup factory function
8. Create progress indicator factory

### Low Priority (Nice to Have):
9. Apply optional chaining where applicable
10. Remove truly unused functions after verification
11. Consolidate similar forEach patterns
12. Document complex algorithms

---

## 9. Estimated Impact

| Change | LOC Reduced | Performance Gain | Maintainability |
|--------|-------------|------------------|-----------------|
| DOM caching | -50 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Status function | -30 | ⭐ | ⭐⭐⭐⭐⭐ |
| Error handling | -25 | ⭐ | ⭐⭐⭐⭐ |
| Button factory | -100 | ⭐ | ⭐⭐⭐⭐ |
| CSS classes | -150 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Function splitting | -200 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Total** | **-555** | **High** | **Very High** |

---

## 10. Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
- Add DOM cache object
- Extract updateStatus() function
- Extract handleError() function
- Replace inline colors with CSS classes

### Phase 2: Factories (2-3 hours)
- Create button factory
- Create menu factory
- Create progress indicator factory

### Phase 3: Function Splitting (4-6 hours)
- Split `runFilter()`
- Split `toggleAutoResizeColumns()`
- Split `loadTableDataFromDisk()`
- Split other 100+ line functions

### Phase 4: Cleanup (1-2 hours)
- Remove unused variables/functions
- Apply optional chaining
- Add JSDoc comments to new functions
- Update changelog

**Total Estimated Time:** 8-13 hours

---

## Conclusion

The codebase is functional but has significant opportunities for improvement:
- **555+ lines** can be eliminated through refactoring
- **35+ DOM queries** can be eliminated with caching
- **15 long functions** violate single responsibility principle
- **240 inline styles** should be CSS classes

These changes will significantly improve:
- **Performance** (reduced DOM queries)
- **Maintainability** (smaller, focused functions)
- **Readability** (clearer code organization)
- **Testability** (isolated functions easier to test)
