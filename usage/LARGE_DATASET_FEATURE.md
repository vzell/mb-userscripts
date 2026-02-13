# Large Dataset Handling Feature

## Overview

When fetching data from MusicBrainz pages with many entries (e.g., 81 pages × 100 entries = 8,100 rows), rendering can take a very long time and may impact browser performance significantly.

This feature adds a **smart decision dialog** that appears after fetching is complete but before rendering begins, giving you three options:

## How It Works

### 1. Threshold Configuration

A new setting has been added: **"Large Dataset Threshold"**
- Default value: **5,000 rows**
- Location: User settings
- Key: `sa_render_threshold`
- Set to `0` to disable the dialog entirely

### 2. The Decision Dialog

When the fetched row count exceeds the threshold, a modal dialog appears with:

**Dialog Information:**
- Total number of rows fetched
- Number of pages processed
- Warning about potential rendering time and performance impact

**Three Action Buttons:**

1. **💾 Save to Disk** (Green)
   - Saves the fetched data directly to a JSON file
   - Skips rendering entirely
   - Fastest option for very large datasets
   - You can load the file later when you're ready

2. **🎨 Render Now** (Blue)
   - Proceeds with normal rendering
   - Displays all data in the browser
   - May take considerable time for large datasets

3. **❌ Cancel** (Red)
   - Cancels the entire operation
   - Discards fetched data
   - Returns to normal page state

### 3. File Format Compatibility

The saved JSON files are fully compatible with the existing "Load from Disk" feature:

**When saving directly (without rendering):**
- All fetched data is preserved
- Metadata includes: version, URL, page type, timestamp, row count
- Groups are saved with their categories
- Table headers are included

**When loading later:**
- You get the same data you would have if you rendered immediately
- All filtering and sorting features work normally
- The only difference is timing - you choose when to render

## Example Workflow

### Scenario: Artist with 8,100 releases

1. Click "🧮 Show all Releases"
2. Wait while 81 pages are fetched (~2-3 minutes)
3. Dialog appears: "Successfully fetched **8,100 rows** from **81 pages**"
4. Choose one of:

   **Option A: Save First, Render Later**
   - Click "💾 Save to Disk"
   - File downloads: `mb-artist-releases-2026-02-13T14-30-45.json`
   - Browser remains responsive
   - Later: Use "Load from Disk" when you're ready to work with the data

   **Option B: Render Immediately**
   - Click "🎨 Render Now"
   - Wait for rendering to complete (~30-60 seconds for 8K rows)
   - Data appears in browser immediately

   **Option C: Cancel**
   - Click "❌ Cancel"
   - Fetched data is discarded
   - Page returns to normal state

## Technical Details

### Implementation Location

The feature is implemented in the `startFetchingProcess` function:

1. **After fetching completes** (line ~2820)
2. **Before rendering begins** (line ~2870)
3. **Dialog function** defined at line ~2130

### Key Considerations

**Rendering Performance:**
- 1,000 rows: ~1-2 seconds
- 5,000 rows: ~5-10 seconds
- 10,000 rows: ~15-30 seconds
- 20,000+ rows: 1+ minute (highly dependent on browser and system)

**Why This Approach Works:**

✅ **Data is already fetched** - The slow part (network requests) is done
✅ **Saved files are identical** - Same data structure as if you rendered
✅ **Full compatibility** - Loading from disk works exactly the same
✅ **User control** - You decide when to take the performance hit
✅ **No data loss** - Canceling is safe after saving

### Settings Integration

The threshold can be adjusted in settings:

```javascript
sa_render_threshold: {
    label: "Large Dataset Threshold",
    type: "number",
    default: 5000,
    description: "Row count threshold to prompt save-or-render dialog (0 to disable)"
}
```

## Recommended Usage

**For datasets under 5,000 rows:**
- Dialog won't appear (unless you lower the threshold)
- Normal rendering proceeds automatically

**For datasets over 5,000 rows:**
- Save to disk first if you're not ready to wait
- Render immediately if you need the data right now
- Render on a powerful machine/fast browser for best experience

**For very large datasets (10,000+ rows):**
- Strongly recommend saving to disk first
- Load when you have time to wait for rendering
- Consider using browser performance tools to monitor memory

## Future Enhancements

Potential improvements that could be added:

1. **Progressive rendering** - Render in batches with progress updates
2. **Virtual scrolling** - Only render visible rows
3. **Background worker** - Offload rendering to Web Worker
4. **Automatic save** - Auto-save on fetch complete for very large sets

## Summary

This feature gives you **control over when to pay the rendering cost** for large datasets. You can defer the performance impact to a more convenient time while ensuring no data is lost.
