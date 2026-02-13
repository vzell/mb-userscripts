# Async Rendering - Usage and Error Handling

## Context

The rendering functions `renderFinalTable()` and `renderGroupedTable()` are now `async` functions to support progressive chunked rendering for large datasets.

## Current Implementation

### Async Functions
```javascript
async function renderFinalTable(rows) { ... }
async function renderGroupedTable(dataArray, isArtistMain, query = '') { ... }
```

These functions:
- Return a Promise
- May use `await` internally (for chunked rendering)
- Complete synchronously for small datasets (< 1000 rows)
- Complete asynchronously for large datasets (≥ 1000 rows)

## Calling Patterns

### ✅ Correct: Inside Async Context with await

```javascript
async function startFetchingProcess() {
    // ... fetch data ...
    
    // This works - we're in an async function
    await renderFinalTable(allRows);
    
    // Code after rendering completes
    makeTableSortableUnified(table, 'main_table');
}
```

### ✅ Correct: Inside Async Callback with await

```javascript
reader.onload = async (e) => {
    try {
        // Parse data...
        
        // This works - reader.onload is now async
        await renderGroupedTable(groupedRows);
        
        // Code after rendering completes
        statusDisplay.textContent = 'Loaded successfully';
    } catch (err) {
        Lib.error('render', 'Error:', err);
    }
};
```

### ✅ Alternative: Using .catch() for Error Handling

If you prefer explicit error handling without try-catch:

```javascript
reader.onload = async (e) => {
    // Parse data...
    
    // Explicit error handling
    renderGroupedTable(groupedRows).catch(err => {
        Lib.error('render', 'Error rendering grouped table:', err);
    });
    
    // Note: Code here runs immediately, not after rendering!
    // Use await if you need sequential execution
};
```

### ❌ Incorrect: Using await in Non-Async Context

```javascript
reader.onload = (e) => {  // NOT async
    // This WILL FAIL with syntax error
    await renderFinalTable(allRows);  // ❌ SyntaxError
};
```

**Error**: `await is only valid in async functions`

### ❌ Incorrect: No Error Handling

```javascript
async function loadData() {
    // If rendering fails, error is silently swallowed
    renderFinalTable(allRows);  // Missing await or .catch()
}
```

## Fixed Implementation

### reader.onload Callback

**Before (Broken)**:
```javascript
reader.onload = (e) => {
    try {
        // ... parse data ...
        await renderFinalTable(allRows);  // ❌ Syntax error
    } catch (err) {
        // ...
    }
};
```

**After (Fixed)**:
```javascript
reader.onload = async (e) => {  // ✅ Now async
    try {
        // ... parse data ...
        await renderFinalTable(allRows);  // ✅ Works correctly
    } catch (err) {
        Lib.error('cache', 'Failed to load data:', err);
    }
};
```

## Why This Matters

### For Small Datasets (< 1000 rows)

The async functions complete **synchronously** (no actual await used internally):
- `await` still works but adds negligible overhead
- `.catch()` works but won't catch synchronous errors (use try-catch)

### For Large Datasets (≥ 1000 rows)

The async functions complete **asynchronously** (use await internally):
- `await` ensures code waits for rendering to complete
- Progress indicator displays during rendering
- UI remains responsive

## Best Practices

### 1. Always Use Async Context

If calling `renderFinalTable()` or `renderGroupedTable()`:
```javascript
// Make the function async
async function myFunction() {
    await renderFinalTable(rows);
}

// Or make the callback async
element.onclick = async () => {
    await renderGroupedTable(groups);
};
```

### 2. Always Handle Errors

**Option A: try-catch (Recommended)**
```javascript
async function loadData() {
    try {
        await renderFinalTable(allRows);
        // Success handling
    } catch (err) {
        Lib.error('render', 'Rendering failed:', err);
        alert('Failed to render: ' + err.message);
    }
}
```

**Option B: .catch()**
```javascript
async function loadData() {
    await renderFinalTable(allRows).catch(err => {
        Lib.error('render', 'Rendering failed:', err);
    });
}
```

### 3. Sequential vs Parallel

**Sequential (wait for each)**:
```javascript
await renderFinalTable(allRows);
await makeTableSortableUnified(table);  // Runs AFTER rendering
```

**Fire and Forget (don't wait)**:
```javascript
renderFinalTable(allRows).catch(console.error);
// Code here runs immediately, rendering happens in background
```

## Common Errors and Solutions

### Error: "await is only valid in async functions"

**Cause**: Using `await` in a non-async function

**Solution**: Add `async` keyword
```javascript
// Before
reader.onload = (e) => { ... }

// After
reader.onload = async (e) => { ... }
```

### Error: "Uncaught (in promise)"

**Cause**: Async function error not caught

**Solution**: Add error handling
```javascript
// Before
async function render() {
    await renderFinalTable(rows);  // No error handling
}

// After
async function render() {
    try {
        await renderFinalTable(rows);
    } catch (err) {
        console.error('Render error:', err);
    }
}
```

### Error: Code runs before rendering completes

**Cause**: Missing `await`

**Solution**: Add `await`
```javascript
// Before
async function render() {
    renderFinalTable(rows);  // Missing await
    statusDisplay.textContent = 'Done';  // Runs immediately!
}

// After
async function render() {
    await renderFinalTable(rows);  // Wait for completion
    statusDisplay.textContent = 'Done';  // Runs after rendering
}
```

## Testing

To verify async rendering works correctly:

1. Load a large dataset (5000+ rows)
2. Observe progress indicator during rendering
3. Verify UI remains responsive (can scroll, click, etc.)
4. Confirm subsequent code runs only after rendering completes

## Summary

- ✅ `renderFinalTable()` and `renderGroupedTable()` are `async`
- ✅ Always call from async context (use `async` keyword)
- ✅ Use `await` for sequential execution
- ✅ Always add error handling (try-catch or .catch())
- ✅ `reader.onload` is now `async` to support await
- ❌ Never use `await` in non-async functions
- ❌ Don't forget error handling on async calls
