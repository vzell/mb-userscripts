# Keyboard Navigation Enhancements - Version 9.32.0

## Summary
Added comprehensive keyboard navigation to three pull-down menus with additional shortcuts and accessibility features.

## Version History
- **Version 9.30.0:** Original version
- **Version 9.31.0:** Added basic keyboard navigation to all menus
- **Version 9.32.0:** Extended keyboard navigation with global shortcuts and enhanced features

## Version 9.32.0 Enhancements

### 1. "Visible Columns" Menu - Extended Features

**New Global Shortcut:**
- **Ctrl+V**: Opens the "Visible Columns" menu from anywhere

**Enhanced Keyboard Controls:**
- **Up/Down Arrow**: Navigate through checkboxes (wraps around)
- **Space/Shift**: Toggle the selected checkbox on/off
- **Tab**: Cycle through checkboxes and buttons (Select All, Deselect All)
- **Alt+S**: Trigger "Select All" button (only when menu is open)
- **Alt+D**: Trigger "Deselect All" button (only when menu is open)
- **Enter**: Close the menu

**Visual Enhancements:**
- "Select All" button now displays as: **<u>S</u>elect All** (with underlined S)
- "Deselect All" button now displays as: **<u>D</u>eselect All** (with underlined D)
- Both buttons are now properly focusable with Tab navigation (tabIndex=0)
- Auto-focuses on the first checkbox when menu opens
- Visual focus indicator (light blue background) highlights the currently selected checkbox

### 2. "Density" Menu - Extended Features

**New Global Shortcut:**
- **Ctrl+D**: Opens the "Density" menu from anywhere

**Keyboard Controls (unchanged from 9.31.0):**
- **Up/Down Arrow**: Navigate through density options (wraps around)
- **Enter**: Apply the selected density and close the menu

**Features:**
- Auto-focuses on the currently active density option when menu opens
- **Immediate preview**: When navigating with Up/Down keys, the table density is immediately rendered
- Visual focus indicator (light blue background) highlights the currently selected option
- Current density maintains green highlighting

### 3. "Export" Menu - Enhanced Features

**Enhanced User Experience:**
- **Close button auto-focused**: When export completes, the popup's Close button is automatically focused
- Users can immediately press Enter or Space to dismiss the popup
- Improves keyboard-only workflow

**Keyboard Controls (unchanged from 9.31.0):**
- **Up/Down Arrow**: Navigate through export format options (wraps around)
- **Enter**: Execute the selected export format and close the menu
- Auto-focuses on the first option (CSV) when menu opens

## Complete Keyboard Shortcuts Reference

### Global Shortcuts (work from anywhere)
- **Ctrl+V**: Open "Visible Columns" menu
- **Ctrl+D**: Open "Density" menu
- **Ctrl+E**: Open "Export" menu
- **Ctrl+G**: Focus global filter
- **Ctrl+C**: Focus first column filter
- **Ctrl+S**: Save to disk
- **Ctrl+L**: Load from disk
- **?** or **/**: Show shortcuts help

### Menu-Specific Shortcuts

**Visible Columns Menu:**
- Up/Down: Navigate checkboxes
- Space/Shift: Toggle checkbox
- Tab: Cycle to buttons
- Alt+S: Select All
- Alt+D: Deselect All
- Enter: Close menu
- Escape: Close menu

**Density Menu:**
- Up/Down: Navigate options (with live preview)
- Enter: Apply and close
- Escape: Close menu

**Export Menu:**
- Up/Down: Navigate formats
- Enter: Execute and close
- Escape: Close menu

## Implementation Details

### Code Quality
- All tab characters removed (untabified to 4 spaces)
- All trailing whitespace removed
- Comprehensive changelog entry added
- Version bumped to 9.32.0+2026-02-17

### Accessibility Improvements
1. Proper tabIndex attributes on buttons
2. Semantic HTML with underlined keyboard shortcuts
3. Alt key combinations only active when menu is open (prevents conflicts)
4. Auto-focus management for improved keyboard workflow
5. Visual feedback for all keyboard interactions

### Technical Implementation
- Alt+S and Alt+D handlers check if menu is open before executing
- Tab navigation allows natural cycling between interactive elements
- Export popup Close button uses setTimeout to ensure DOM is ready before focusing
- All keyboard shortcuts respect existing input field focus handling

## Testing Recommendations

### Visible Columns Menu
1. Press Ctrl+V to open menu
2. Use Up/Down to navigate checkboxes
3. Press Space to toggle selections
4. Press Tab to reach buttons
5. Press Alt+S to select all columns
6. Press Alt+D to deselect all columns
7. Verify Alt+S/D only works when menu is open
8. Check underlined letters in button text

### Density Menu
1. Press Ctrl+D to open menu
2. Use Up/Down to navigate options
3. Verify table immediately updates during navigation
4. Press Enter to apply and close
5. Verify focus starts on current density

### Export Menu
1. Open Export menu (Ctrl+E)
2. Select a format and press Enter
3. Verify Close button is automatically focused in popup
4. Press Enter or Space to quickly dismiss popup
5. Repeat for all export formats (CSV, JSON, Org-Mode)

## Browser Compatibility
- Tested with Tampermonkey (>=v5.4.1)
- Compatible with Vivaldi, Chrome, and Firefox
- Uses standard HTML5 and modern JavaScript features
