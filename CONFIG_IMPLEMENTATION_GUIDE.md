# Configuration System Implementation Guide

## Overview
This guide shows how to add feature toggles, dividers, and modernize the config UI for the Show All Entities userscript.

## Part 1: Update Library to Support Dividers

The VZ_MBLibrary needs a small update to support divider types in configSchema.

### In VZ_MBLibrary-1.1.0.user.js (around line 140-164)

Replace the `tableRows` mapping to handle dividers:

```javascript
const tableRows = Object.entries(configSchema).map(([key, cfg]) => {
    // Handle divider type
    if (cfg.type === 'divider') {
        return `
            <tr>
                <td colspan="3" style="background: linear-gradient(to right, #999, #ccc, #999); padding: 12px 8px; text-align: center;">
                    <strong style="color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); font-size: 1.1em; letter-spacing: 1px;">
                        ${cfg.label}
                    </strong>
                </td>
            </tr>`;
    }
    
    const inputId = `${scriptId}-input-${key}`;
    const isCheck = cfg.type === "checkbox";
    const isColor = cfg.type === "color_picker";
    const isNumber = cfg.type === "number";
    const valAttr = isCheck
        ? (this.values[key] ? 'checked' : '')
        : `value="${this.values[key]}"`;

    let inputHtml = '';
    
    if (isCheck) {
        inputHtml = `<input type="checkbox" id="${inputId}" ${valAttr} style="margin-left: 5px;">`;
    } else if (isNumber) {
        inputHtml = `<input type="number" id="${inputId}" ${valAttr} min="${cfg.min || 0}" max="${cfg.max || 100}" style="width: 80px; margin-left: 5px;">`;
    } else {
        inputHtml = `<input type="text" id="${inputId}" ${valAttr} style="width: 120px; margin-left: 5px; transition: background 0.2s;">`;
    }

    if (isColor) {
        inputHtml += `<button id="${inputId}-picker-btn" type="button" style="margin-left: 5px; cursor: pointer; border: 1px solid #666; width: 24px; height: 24px; vertical-align: middle;" title="Open Color Picker">🎨</button>`;
    }

    return `
        <tr>
            <th style="background-color: rgb(204, 204, 204); text-align: left; padding-left: inherit;">
                <label style="white-space: nowrap; text-shadow: rgb(153, 153, 153) 1px 1px 2px;">
                    ${cfg.label}: ${inputHtml}
                </label>
            </th>
            <td style="opacity: 0.666; text-align: center;">${cfg.default}</td>
            <td style="margin-bottom: 0.4em;">${cfg.description}</td>
        </tr>`;
}).join('');
```

### Also update the save function (around line 243-250) to skip dividers:

```javascript
document.getElementById(`${scriptId}-save-btn`).onclick = () => {
    const newValues = {};
    for (const key in configSchema) {
        // Skip dividers
        if (configSchema[key].type === 'divider') continue;
        
        const input = document.getElementById(`${scriptId}-input-${key}`);
        newValues[key] = configSchema[key].type === "checkbox" ? input.checked : input.value;
    }
    this.save(newValues);
    closeDialog();
};
```

### And the reset function (around line 251-260):

```javascript
document.getElementById(`${scriptId}-reset`).onclick = () => {
    if (confirm("Reset all settings to defaults?")) {
        for (const key in configSchema) {
            // Skip dividers
            if (configSchema[key].type === 'divider') continue;
            
            const input = document.getElementById(`${scriptId}-input-${key}`);
            if (configSchema[key].type === "checkbox") {
                input.checked = configSchema[key].default;
            } else {
                input.value = configSchema[key].default;
            }
            // Update color preview if applicable
            if (configSchema[key].type === "color_picker") {
                this.applyColorPreview(`${scriptId}-input-${key}`, configSchema[key].default);
            }
        }
    }
};
```

## Part 2: Add Feature Toggle Settings to configSchema

Add these settings to the configSchema in ShowAllEntityData_user.js (after existing settings):

```javascript
const configSchema = {
    // ... existing settings ...
    
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
    
    // ... rest of existing settings ...
};
```

## Part 3: Wrap Feature Buttons with Config Checks

Update each button addition to check the config setting:

### Column Visibility Toggle (around line 4856)
```javascript
// Add column visibility toggle (if enabled)
if (Lib.settings.sa_enable_column_visibility) {
    document.querySelectorAll('table.tbl').forEach((table, index) => {
        if (index === 0) {
            addColumnVisibilityToggle(table);
        }
    });
}
```

### Export Button (around line 4861)
```javascript
// Add export button (if enabled)
if (Lib.settings.sa_enable_export) {
    addExportButton();
}
```

### Keyboard Shortcuts (around line 4864)
```javascript
// Initialize keyboard shortcuts (if enabled)
if (Lib.settings.sa_enable_keyboard_shortcuts) {
    initKeyboardShortcuts();
    addShortcutsHelpButton();
}
```

### Stats Panel (around line 4868)
```javascript
// Add stats panel button (if enabled)
if (Lib.settings.sa_enable_stats_panel) {
    addStatsButton();
}
```

### Density Control (around line 4871)
```javascript
// Add density control (if enabled)
if (Lib.settings.sa_enable_density_control) {
    addDensityControl();
}
```

### Column Resizing (around line 4874)
```javascript
// Add auto-resize button (if enabled)
if (Lib.settings.sa_enable_column_resizing) {
    addAutoResizeButton();
    
    // Enable manual column resizing immediately
    document.querySelectorAll('table.tbl').forEach(table => {
        makeColumnsResizable(table);
    });
}
```

### Sticky Headers (around line 4850)
```javascript
// Apply sticky headers (if enabled)
if (Lib.settings.sa_enable_sticky_headers) {
    applyStickyHeaders();
}
```

### Save/Load Buttons
Find where save/load buttons are added and wrap with:
```javascript
if (Lib.settings.sa_enable_save_load) {
    // ... existing save/load button code ...
}
```

## Part 4: Add Keyboard Shortcut for Settings

In the `initKeyboardShortcuts()` function, add:

```javascript
// Ctrl/Cmd + , : Open settings
if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault();
    Lib.showSettings();
    Lib.debug('shortcuts', 'Settings dialog opened via Ctrl+,');
}
```

And update the shortcuts help dialog to include this:

```javascript
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
`.trim();
```

## Part 5: Modernize the UI Styling (Optional Enhancement)

To make the config dialog match your modern UI, you can add these style improvements to the library:

```javascript
// In container style (around line 134)
Object.assign(container.style, {
    backgroundColor: 'white',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    padding: '20px',
    color: '#333',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minWidth: '600px',
    maxWidth: '800px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
});
```

## Implementation Checklist

- [ ] Update VZ_MBLibrary to support dividers
- [ ] Add feature toggle settings to configSchema
- [ ] Add section dividers to configSchema
- [ ] Wrap each feature button with config check
- [ ] Add Ctrl+, shortcut for settings
- [ ] Update shortcuts help text
- [ ] Test each feature can be toggled on/off
- [ ] Verify dividers display correctly
- [ ] Ensure existing functionality still works

## Testing Steps

1. Open settings (Ctrl+,)
2. Verify dividers separate sections visually
3. Toggle each feature off, save, reload
4. Verify feature buttons disappear
5. Toggle features back on
6. Verify all features work as before

## Notes

- Dividers don't have input fields, they're just visual separators
- All existing settings continue to work
- New features default to `true` (enabled)
- Users can disable features they don't use
- Settings dialog is now accessible via Ctrl+,
