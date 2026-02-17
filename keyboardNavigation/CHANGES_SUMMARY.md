# Keyboard Navigation Enhancements - Version 9.31.0

## Summary
Added comprehensive keyboard navigation to three pull-down menus in the ShowAllEntityData userscript.

## Version Update
- **Previous version:** 9.30.0+2026-02-17
- **New version:** 9.31.0+2026-02-17

## Enhancements

### 1. "Visible Columns" Menu
**Keyboard Controls:**
- **Up/Down Arrow**: Navigate through checkboxes (wraps around)
- **Space/Shift**: Toggle the selected checkbox on/off
- **Enter**: Close the menu

**Features:**
- Auto-focuses on the first checkbox when menu opens
- Visual focus indicator (light blue background) highlights the currently selected checkbox
- Maintains the existing mouse functionality

### 2. "Density" Menu
**Keyboard Controls:**
- **Up/Down Arrow**: Navigate through density options (wraps around)
- **Enter**: Apply the selected density and close the menu

**Features:**
- Auto-focuses on the currently active density option when menu opens
- **Immediate preview**: When navigating with Up/Down keys, the table density is immediately rendered, providing instant visual feedback
- Visual focus indicator (light blue background) highlights the currently selected option
- Current density still maintains green highlighting for easy identification
- Maintains the existing mouse functionality

### 3. "Export" Menu
**Keyboard Controls:**
- **Up/Down Arrow**: Navigate through export format options (wraps around)
- **Enter**: Execute the selected export format and close the menu

**Features:**
- Auto-focuses on the first option (CSV) when menu opens
- Visual focus indicator (light blue background) highlights the currently selected option
- Maintains the existing mouse functionality

## Implementation Details

### Focus Management
All three menus now properly manage keyboard focus:
- Focus is automatically set when a menu opens
- Focus is properly restored after menu operations
- Visual feedback clearly indicates which item has focus

### Visual Indicators
- Light blue background (#e3f2fd) indicates keyboard focus
- Blue border (#2196F3) on focused items
- Smooth transitions for visual feedback

### Code Quality
- Removed all tab characters (untabified)
- Removed trailing whitespace
- Added comprehensive changelog entry
- Maintained existing functionality
- No breaking changes

## Testing Recommendations
1. Open each menu and test keyboard navigation
2. Verify Up/Down arrow keys cycle through options
3. Test the Density menu preview feature (immediate rendering)
4. Ensure Space/Shift toggle works in Visible Columns menu
5. Verify Enter key executes the expected action in each menu
6. Confirm Escape key still closes menus
7. Test that clicking still works as before
