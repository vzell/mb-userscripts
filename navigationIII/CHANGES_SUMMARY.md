# Keyboard Navigation & UI Enhancements - Version 9.33.0

## Summary
Major enhancement with extended keyboard shortcuts, smart button visibility, and comprehensive menu improvements.

## Version History
- **Version 9.30.0:** Original version
- **Version 9.31.0:** Added basic keyboard navigation to all menus
- **Version 9.32.0:** Extended keyboard navigation with global shortcuts and enhanced features
- **Version 9.33.0:** Added collapse shortcuts, smart button visibility, and "Choose current configuration" button

## Version 9.33.0 New Features

### 1. "Visible Columns" Menu - Enhanced

**New Button:**
- **"Choose <u>c</u>urrent configuration"** button added below Select All/Deselect All
- **Alt+C** shortcut to trigger (only when menu is open)
- Closes menu and keeps current column selection
- Useful for accepting the current state without changes

**Complete Feature Set:**
- **Ctrl+V**: Opens menu globally
- **Up/Down**: Navigate checkboxes
- **Space/Shift**: Toggle checkbox
- **Tab**: Cycle through checkboxes and buttons
- **Alt+S**: Select All
- **Alt+D**: Deselect All
- **Alt+C**: Choose current configuration (NEW)
- **Enter/Escape**: Close menu

### 2. Collapse/Expand Shortcuts (NEW)

**Ctrl+2 - Toggle All H2 Headers:**
- Collapses or expands ALL h2 section headers at once
- Mimics the existing Ctrl+Click functionality on h2 headers
- Detects current state from first h2 and toggles all accordingly
- Useful for quickly showing/hiding major sections

**Ctrl+3 - Toggle All H3 Headers (Types):**
- Shows or hides ALL sub-table types at once
- Mimics clicking the "Show | Hide all Types" links
- Perfect for multi-table pages with many sub-categories
- Quickly collapse to overview or expand to see all data

### 3. Smart Button Visibility (NEW)

**Conditional Display - Buttons Only Appear When Needed:**

**"Toggle highlighting" button:**
- Only visible when filter highlights are present
- Reduces UI clutter when no filters active
- Appears when global or column filters create highlights

**"Clear all COLUMN filters" button (global):**
- Only visible when at least one column filter has a value
- Hides automatically when all column filters are empty
- Provides clear visual feedback about filter state

**"Clear ALL filters" button:**
- Only visible when global filter OR any column filter is active
- Hides when no filters are applied
- Clean UI when starting fresh

**Sub-table "Clear all COLUMN filters" buttons:**
- Each sub-table button only visible when that specific table has column filters
- Independent visibility per table
- Better UX on multi-table pages

**Benefits:**
- Cleaner, less cluttered UI
- Buttons appear exactly when useful
- Visual feedback about current filter state
- No unnecessary buttons when filters aren't active

### 4. Updated Shortcuts Help Dialog

**New Comprehensive Sections:**

1. **Filter & Search** (unchanged)
2. **View & Layout** (NEW section)
   - Ctrl+V: Open "Visible Columns" menu
   - Ctrl+D: Open "Density" menu
   - Ctrl+2: Toggle collapse all h2 headers
   - Ctrl+3: Toggle collapse all h3 headers (types)

3. **Visible Columns Menu** (NEW section)
   - Complete reference for all menu shortcuts
   - Alt+S, Alt+D, Alt+C shortcuts documented

4. **Density Menu** (NEW section)
5. **Export Menu** (NEW section)
6. **Data Export & Management**
7. **Settings**
8. **Help**

## Complete Keyboard Shortcuts Reference

### Global Shortcuts
- **Ctrl+V**: Open "Visible Columns" menu
- **Ctrl+D**: Open "Density" menu
- **Ctrl+E**: Open "Export" menu
- **Ctrl+2**: Toggle collapse all h2 headers
- **Ctrl+3**: Toggle collapse all h3 headers (types)
- **Ctrl+G**: Focus global filter
- **Ctrl+C**: Focus first column filter
- **Ctrl+Shift+G**: Clear all filters
- **Ctrl+S**: Save to disk
- **Ctrl+L**: Load from disk
- **Ctrl+,**: Open settings
- **?** or **/**: Show shortcuts help

### Visible Columns Menu (when open)
- **Up/Down**: Navigate checkboxes
- **Space/Shift**: Toggle checkbox
- **Tab**: Cycle to buttons
- **Alt+S**: Select All
- **Alt+D**: Deselect All
- **Alt+C**: Choose current configuration ✨ NEW
- **Enter/Escape**: Close menu

### Density Menu (when open)
- **Up/Down**: Navigate options (live preview)
- **Enter**: Apply and close
- **Escape**: Close menu

### Export Menu (when open)
- **Up/Down**: Navigate formats
- **Enter**: Execute and close
- **Escape**: Close menu

## Implementation Details

### Smart Button Visibility Logic

**Filter Detection:**
- Checks global filter input value
- Scans all column filter inputs across all tables
- Detects presence of highlight elements in DOM

**Update Triggers:**
- Called at end of runFilter() function
- Updates after every filter operation
- Handles both single and multi-table pages
- Per-table granularity for sub-table buttons

**Display Rules:**
```javascript
Toggle highlighting: visible when highlights exist
Clear COLUMN filters: visible when any column filter has value
Clear ALL filters: visible when global OR column filters active
Sub-table clear buttons: visible per table when that table has filters
```

### Collapse Shortcuts Implementation

**Ctrl+2 Logic:**
1. Finds all h2 headers with `.mb-toggle-h2` class
2. Checks first h2's icon state (▲ or ▼)
3. Calls `._mbToggle()` function on each h2
4. Respects existing collapse/expand logic

**Ctrl+3 Logic:**
1. Finds all h3 headers with `.mb-toggle-h3` class
2. Checks first h3's icon state
3. Calls same logic as "Show | Hide all Types" links
4. Updates all tables and h3 icons simultaneously

### Code Quality
- All tabs removed (untabified to 4 spaces)
- All trailing whitespace removed
- Comprehensive changelog entry
- Version bumped to 9.33.0+2026-02-17
- Maintained backward compatibility

## Testing Recommendations

### Visible Columns Menu
1. Press Ctrl+V to open menu
2. Navigate with keys, make some changes
3. Press Alt+C to accept current state
4. Verify menu closes and columns remain as configured
5. Test all Alt shortcuts (S, D, C) work only when menu open

### Collapse Shortcuts
1. **Test Ctrl+2:**
   - Press Ctrl+2 with h2s collapsed → all should expand
   - Press Ctrl+2 with h2s expanded → all should collapse
   - Verify respects sidebar vs main content separation
   
2. **Test Ctrl+3:**
   - Press Ctrl+3 with types hidden → all should show
   - Press Ctrl+3 with types shown → all should hide
   - Compare behavior with clicking "Show | Hide all Types"

### Smart Button Visibility
1. **Start with no filters:**
   - Verify all filter buttons are hidden
   - UI should be clean with no clear/toggle buttons

2. **Add global filter:**
   - "Clear ALL filters" should appear
   - Type to create highlights
   - "Toggle highlighting" should appear

3. **Add column filters:**
   - "Clear all COLUMN filters" should appear
   - "Clear ALL filters" should remain visible
   - On multi-table: verify per-table buttons appear

4. **Clear filters one by one:**
   - Buttons should disappear as conditions are met
   - Test both global and column filter clearing
   - Verify toggle highlighting disappears with highlights

### Shortcuts Help Dialog
1. Press ? to open dialog
2. Verify all 8 sections are present
3. Check new shortcuts are documented
4. Verify View & Layout section has Ctrl+2, Ctrl+3
5. Confirm menu-specific sections are comprehensive

## Browser Compatibility
- Tested with Tampermonkey (>=v5.4.1)
- Compatible with Vivaldi, Chrome, and Firefox
- Uses standard HTML5 and modern JavaScript
- No breaking changes to existing functionality

## Benefits Summary

**User Experience:**
- Cleaner UI with context-aware button visibility
- Faster navigation with new collapse shortcuts
- More intuitive "Choose current configuration" option
- Complete keyboard control over all features

**Accessibility:**
- Better visual feedback on filter state
- Reduced cognitive load with fewer visible buttons
- Comprehensive help documentation
- Consistent shortcut patterns

**Efficiency:**
- Ctrl+2/Ctrl+3 for bulk collapse operations
- Smart buttons reduce decision fatigue
- Quick configuration acceptance with Alt+C
- Streamlined multi-table navigation
