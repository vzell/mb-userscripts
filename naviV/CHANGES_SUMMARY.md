# Keyboard Navigation & UI Enhancements - Version 9.34.0

## Summary
Comprehensive keyboard navigation with action shortcuts, h3 Ctrl+Click functionality, smart button visibility, and extensive menu improvements.

## Version History
- **Version 9.30.0:** Original version
- **Version 9.31.0:** Added basic keyboard navigation to all menus
- **Version 9.32.0:** Extended keyboard navigation with global shortcuts and enhanced features
- **Version 9.33.0:** Added collapse shortcuts, smart button visibility, and "Choose current configuration" button
- **Version 9.34.0:** Added Ctrl+M action shortcut and h3 Ctrl+Click support

## Version 9.34.0 New Features

### 1. Action Button Shortcut - Ctrl+M (NEW)

**Quick Data Loading:**
- **Ctrl+M** triggers the first "Show all" action button
- Perfect for pages with multiple action buttons (e.g., artist pages with multiple button options)
- Automatically selects the first button when multiple are available
- Saves time by avoiding mouse navigation to start data loading

**Use Cases:**
- Artist pages: /artist/{id}/releases (multiple button options)
- Release group pages: Multiple view options
- Any page with "Show all" buttons

**How It Works:**
- Searches for buttons containing "Show all" or the 🧮 emoji
- Clicks the first matching button found
- Logs action for debugging: "First action button clicked via Ctrl+M: {button text}"

### 2. H3 Ctrl+Click Functionality (NEW)

**Consistent Collapse Behavior:**
- h3 headers now support **Ctrl+Click** to toggle ALL types at once
- Matches existing h2 header Ctrl+Click functionality
- Regular click still toggles individual h3 header
- Updated tooltip reflects new functionality

**New Tooltip:**
- **Before:** "Collapse/Uncollapse table section"
- **After:** "Click to Collapse/Uncollapse table section (Ctrl+Click to toggle all types)"

**Implementation Details:**
- Guards against clicking on buttons/controls within h3
- Detects current state from clicked h3
- Applies state to all h3 headers simultaneously
- Updates all table visibility and toggle icons (▲/▼)

**Benefits:**
- Keyboard and mouse consistency
- Faster bulk operations on multi-table pages
- Same UX pattern as h2 headers
- Clear visual feedback

### 3. Previous Version Features (Still Available)

From **Version 9.33.0:**
- "Choose current configuration" button (Alt+C)
- Ctrl+2/Ctrl+3 keyboard shortcuts for header collapse
- Smart button visibility
- Comprehensive shortcuts help

From **Version 9.32.0:**
- Ctrl+V for Visible Columns menu
- Ctrl+D for Density menu
- Export popup Close button auto-focus

From **Version 9.31.0:**
- Full keyboard navigation in all menus
- Visual focus indicators
- Menu-specific shortcuts

## Complete Keyboard Shortcuts Reference

### Global Shortcuts
- **Ctrl+M**: Trigger first "Show all" button ✨ NEW
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

### Mouse Shortcuts
- **Ctrl+Click on h2**: Toggle all h2 headers
- **Ctrl+Click on h3**: Toggle all h3 headers (types) ✨ NEW
- **Click on h2**: Toggle individual h2 header
- **Click on h3**: Toggle individual h3 header

### Visible Columns Menu (when open)
- **Up/Down**: Navigate checkboxes
- **Space/Shift**: Toggle checkbox
- **Tab**: Cycle to buttons
- **Alt+S**: Select All
- **Alt+D**: Deselect All
- **Alt+C**: Choose current configuration
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

### Ctrl+M Action Button Logic

**Button Detection:**
```javascript
// Searches for buttons matching these criteria:
1. Text contains "Show all"
2. Text contains 🧮 emoji
3. Selects first match found
```

**Execution:**
- Triggers button.click() programmatically
- Respects all button event handlers
- Works with any page configuration
- Logs action for debugging

### H3 Ctrl+Click Implementation

**Event Handler Logic:**
1. Check if Ctrl/Cmd key is pressed
2. Determine current state of clicked h3
3. Apply opposite state to ALL h3 headers
4. Update all table visibility
5. Update all toggle icons

**Safety Guards:**
- Prevents triggering on button clicks within h3
- Checks for interactive element clicks
- Stops event propagation appropriately
- Maintains existing behavior for normal clicks

**State Management:**
```javascript
Ctrl+Click Detection → Current State Check → Apply to All → Update Icons
```

### Smart Button Visibility (from v9.33.0)

Still active - buttons only appear when needed:
- Toggle highlighting: When highlights exist
- Clear COLUMN filters: When column filters active
- Clear ALL filters: When any filters active
- Sub-table clear buttons: Per-table visibility

## Testing Recommendations

### Test Ctrl+M Shortcut
1. **Single Button Pages:**
   - Go to a page with one "Show all" button
   - Press Ctrl+M
   - Verify data loading starts

2. **Multiple Button Pages:**
   - Go to artist releases page with multiple buttons
   - Press Ctrl+M
   - Verify first button is clicked
   - Check which button was selected in console

3. **No Button Pages:**
   - Go to page with no "Show all" buttons
   - Press Ctrl+M
   - Verify warning logged (no button found)

### Test H3 Ctrl+Click
1. **Individual Click (existing behavior):**
   - Click on an h3 header (no Ctrl)
   - Verify only that table toggles
   - Icon should change (▲/▼)

2. **Ctrl+Click (new behavior):**
   - Ctrl+Click on any h3 header
   - Verify ALL h3 headers toggle together
   - All icons should update
   - All tables should show/hide

3. **Button Protection:**
   - Click on buttons within h3 (e.g., "Show all" button)
   - Verify button works normally
   - h3 collapse should NOT trigger

4. **Compare with Ctrl+3:**
   - Test Ctrl+3 keyboard shortcut
   - Test Ctrl+Click on h3
   - Both should produce identical results

### Integration Testing
1. **Workflow Test:**
   - Press Ctrl+M to load data
   - Wait for data to load
   - Press Ctrl+3 to collapse all types
   - Ctrl+Click an h3 to expand all
   - Press Ctrl+2 to collapse h2s

2. **Multi-Table Pages:**
   - Load artist releases page
   - Press Ctrl+M (first button)
   - Test h3 Ctrl+Click behavior
   - Verify all tables respond

3. **Tooltip Verification:**
   - Hover over h3 headers
   - Verify tooltip shows Ctrl+Click hint
   - Compare with h2 tooltips

## Browser Compatibility
- Tested with Tampermonkey (>=v5.4.1)
- Compatible with Vivaldi, Chrome, and Firefox
- Uses standard DOM events
- Ctrl/Cmd key detection works cross-platform
- No breaking changes to existing functionality

## Benefits Summary

### User Experience
- **Faster Data Loading:** Ctrl+M eliminates need to locate and click button
- **Consistent Interaction:** h3 matches h2 behavior with Ctrl+Click
- **Keyboard-First Workflow:** Complete control without mouse
- **Reduced Cognitive Load:** Predictable patterns across all headers

### Efficiency Gains
- **Quick Start:** Ctrl+M gets data loading immediately
- **Bulk Operations:** Ctrl+Click on any header toggles all
- **Keyboard Flow:** Uninterrupted workflow from keyboard
- **Time Savings:** No hunting for buttons or clicking multiple times

### Accessibility
- **Clear Tooltips:** Updated to explain Ctrl+Click
- **Keyboard Parity:** h3 now has same keyboard support as h2
- **Visual Feedback:** All icons update simultaneously
- **Predictable Behavior:** Same patterns throughout interface

## Code Quality
- All tabs removed (untabified to 4 spaces)
- All trailing whitespace removed
- Comprehensive changelog entry
- Version bumped to 9.34.0+2026-02-17
- Maintained backward compatibility
- Event guards prevent unintended triggers
- Proper event propagation control

## Recommended Workflow

**Typical Data Loading Session:**
1. Open page
2. Press **Ctrl+M** (start data loading)
3. Wait for data
4. Press **Ctrl+V** (adjust visible columns if needed)
5. Press **Ctrl+D** (adjust density if needed)
6. Press **Ctrl+3** or **Ctrl+Click h3** (manage type visibility)
7. Use column filters for specific data
8. Press **Ctrl+E** (export when done)

**Quick Navigation:**
- **Ctrl+2**: Quick overview (collapse all sections)
- **Ctrl+3**: Type management (show/hide all types)
- **Ctrl+Click h3**: Same as Ctrl+3 but mouse-driven
- **Ctrl+Click h2**: Same as Ctrl+2 but mouse-driven

## Summary of All Keyboard Enhancements

**Version 9.31.0:** Foundation
- Menu keyboard navigation
- Focus management
- Visual indicators

**Version 9.32.0:** Global Access
- Ctrl+V, Ctrl+D, Ctrl+E shortcuts
- Alt shortcuts in menus
- Export focus improvements

**Version 9.33.0:** Bulk Operations
- Ctrl+2, Ctrl+3 collapse shortcuts
- Smart button visibility
- Menu enhancements

**Version 9.34.0:** Action & Consistency
- Ctrl+M for quick data loading ✨
- h3 Ctrl+Click support ✨
- Complete feature parity between h2 and h3

The script now offers complete keyboard control over all major functions!
