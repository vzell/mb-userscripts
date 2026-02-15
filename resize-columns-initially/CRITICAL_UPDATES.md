# Critical Feature Updates - v7.3.0

## Changes to Implement

### 1. Enable Manual Column Resizing on Initial Render

Add after line 4874 (after addAutoResizeButton):
```javascript
// Enable manual column resizing on all tables immediately
document.querySelectorAll('table.tbl').forEach(table => {
    makeColumnsResizable(table);
});
```

### 2. Update Button Labels

In `addColumnVisibilityToggle()` function (around line 870):
```javascript
// OLD
toggleBtn.textContent = '👁️ Columns';

// NEW
toggleBtn.textContent = '👁️ Visible Columns';
```

In `addExportButton()` function (around line 1062):
```javascript
// OLD
exportBtn.textContent = '📥 Export CSV';

// NEW  
exportBtn.textContent = 'Export 💾';
```

### 3. Add Escape Key Support to Column Visibility Menu

In `addColumnVisibilityToggle()` function, after menu creation, add:
```javascript
// Close menu on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.style.display === 'block') {
        menu.style.display = 'none';
    }
});
```

### 4. Convert Export to Dropdown Menu with JSON Support

Replace entire `exportTableToCSV()` and `addExportButton()` functions with:

```javascript
/**
 * Export table data to JSON format
 */
function exportTableToJSON() {
    const table = document.querySelector('table.tbl');
    if (!table) {
        alert('No table found to export');
        return;
    }
    
    const data = [];
    const headers = [];
    
    // Get headers
    const headerRow = table.querySelector('thead tr:first-child');
    if (headerRow) {
        Array.from(headerRow.cells).forEach(cell => {
            if (cell.style.display === 'none') return;
            const headerText = cell.textContent.replace(/[⇅▲▼]/g, '').trim();
            headers.push(headerText);
        });
    }
    
    // Get data rows
    const dataRows = table.querySelectorAll('tbody tr');
    dataRows.forEach(row => {
        if (row.style.display === 'none') return;
        
        const rowData = {};
        Array.from(row.cells).forEach((cell, index) => {
            if (cell.style.display === 'none') return;
            const headerIndex = headers.length > index ? index : 0;
            rowData[headers[headerIndex]] = cell.textContent.trim();
        });
        
        if (Object.keys(rowData).length > 0) {
            data.push(rowData);
        }
    });
    
    // Create JSON string with pretty printing
    const json = JSON.stringify(data, null, 2);
    
    // Download
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const pageName = pageType || 'table';
    link.download = `musicbrainz-${pageName}-${timestamp}.json`;
    
    link.click();
    URL.revokeObjectURL(url);
    
    Lib.info('export', `JSON export complete: ${data.length} rows`);
}

/**
 * Add export button with dropdown menu
 */
function addExportButton() {
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export 💾';
    exportBtn.title = 'Export table data';
    exportBtn.style.cssText = 'font-size:0.8em; padding:2px 8px; cursor:pointer; height:24px; margin-left:5px; border-radius:6px;';
    exportBtn.type = 'button';
    
    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'mb-export-menu';
    menu.style.cssText = `
        display: none;
        position: fixed;
        background: white;
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 150px;
    `;
    
    // CSV option
    const csvOption = document.createElement('button');
    csvOption.textContent = '📄 Export as CSV';
    csvOption.type = 'button';
    csvOption.style.cssText = `
        display: block;
        width: 100%;
        padding: 8px 12px;
        margin: 2px 0;
        cursor: pointer;
        border: 1px solid #ddd;
        background: white;
        text-align: left;
        border-radius: 4px;
    `;
    csvOption.onmouseover = () => csvOption.style.background = '#f5f5f5';
    csvOption.onmouseout = () => csvOption.style.background = 'white';
    csvOption.onclick = () => {
        exportTableToCSV();
        menu.style.display = 'none';
    };
    
    // JSON option
    const jsonOption = document.createElement('button');
    jsonOption.textContent = '📋 Export as JSON';
    jsonOption.type = 'button';
    jsonOption.style.cssText = csvOption.style.cssText;
    jsonOption.onmouseover = () => jsonOption.style.background = '#f5f5f5';
    jsonOption.onmouseout = () => jsonOption.style.background = 'white';
    jsonOption.onclick = () => {
        exportTableToJSON();
        menu.style.display = 'none';
    };
    
    menu.appendChild(csvOption);
    menu.appendChild(jsonOption);
    
    // Toggle menu
    exportBtn.onclick = (e) => {
        e.stopPropagation();
        const isVisible = menu.style.display === 'block';
        menu.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            const rect = exportBtn.getBoundingClientRect();
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.left = `${rect.left}px`;
        }
    };
    
    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== exportBtn) {
            menu.style.display = 'none';
        }
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.style.display === 'block') {
            menu.style.display = 'none';
        }
    });
    
    const controlsContainer = document.getElementById('mb-show-all-controls-container');
    if (controlsContainer) {
        controlsContainer.appendChild(exportBtn);
    }
    
    document.body.appendChild(menu);
}
```

## Summary of Changes

1. ✅ Manual column resizing enabled immediately on render
2. ✅ "👁️ Columns" → "👁️ Visible Columns"  
3. ✅ "📥 Export CSV" → "Export 💾"
4. ✅ Escape key closes column visibility menu
5. ✅ Export menu with CSV and JSON options
6. ✅ Escape key closes export menu

These are the critical UX improvements that can be implemented immediately without breaking existing functionality.
