# MusicBrainz Show All Entities - Offline Storage Feature

## Overview

The userscript now includes an **Offline Storage/Cache** feature that allows you to save table data to your local filesystem and reload it later without re-fetching from MusicBrainz. This provides several benefits:

- **Speed**: Loading 1,000+ rows from a local file is nearly instantaneous compared to fetching 50+ paginated web pages
- **Stability**: Avoid MusicBrainz's rate-limiting or temporary server errors
- **Offline Access**: Work with your data even when offline or when MusicBrainz is down
- **Data Preservation**: Keep snapshots of data for archival purposes

## How It Works

### Technical Implementation

1. **Serialization**: The script converts the in-memory DOM table rows (`allRows` or `groupedRows`) into a JSON structure that includes:
   - Cell HTML content (preserving hyperlinks, formatting, and country flags)
   - Cell attributes (colSpan, rowSpan)
   - Table headers
   - Metadata (URL, pageType, timestamp)

2. **Storage**: Data is saved as a `.json` file to your downloads folder using the browser's native download mechanism (via `GM_download` or fallback `<a>` element)

3. **Re-hydration**: When loading from disk:
   - The page is cleaned of existing content
   - DOM table rows are reconstructed from the JSON data
   - The existing rendering, filtering, and sorting logic works seamlessly with the "offline" data
   - All hyperlinks and interactive elements are preserved

## Usage

### Saving Data to Disk

1. Navigate to any supported MusicBrainz page (Artist, Release Group, Recording, etc.)
2. Click the main action button (e.g., "Show all Releases for Artist") to fetch data
3. Once data is loaded, a new button **"💾 Save to Disk"** appears
4. Click this button to download the data as a JSON file
5. The filename will be in the format: `mb-{pageType}-{timestamp}.json`
   - Example: `mb-artist-releases-2026-02-12T15-30-45.json`

### Loading Data from Disk

1. Navigate to the same or similar MusicBrainz page
2. Click the **"📂 Load from Disk"** button (always visible)
3. Select a previously saved `.json` file from your filesystem
4. The page will be cleared and re-populated with the saved data
5. All features (filtering, sorting, collapsible sections) work normally

## Features Preserved When Loading from Disk

✅ **Hyperlinks**: All links to artists, releases, recordings, etc. are preserved  
✅ **Country Flags**: Flag symbols in the Country column remain clickable  
✅ **HTML Formatting**: Bold text, spans, and other formatting preserved  
✅ **Table Structure**: Headers, column spans, row spans all maintained  
✅ **Filtering**: Global and column-specific filters work on loaded data  
✅ **Sorting**: All sorting functionality (ascending, descending, original order) works  
✅ **Grouped Tables**: Multi-table pages with subheadings are fully supported

## File Format

The JSON file structure:

```json
{
  "version": "1.0",
  "url": "https://musicbrainz.org/artist/...",
  "pageType": "artist-releases",
  "timestamp": 1707750645000,
  "timestampReadable": "2026-02-12T15:30:45.000Z",
  "tableMode": "multi",
  "rowCount": 1234,
  "headers": [
    [
      {
        "html": "Release",
        "colSpan": 1,
        "rowSpan": 1,
        "tagName": "TH"
      },
      ...
    ]
  ],
  "groups": [
    {
      "key": "Album",
      "rows": [
        [
          {
            "html": "<a href=\"...\">Album Title</a>",
            "colSpan": 1,
            "rowSpan": 1
          },
          ...
        ]
      ]
    }
  ]
}
```

## Supported Page Types

The offline storage feature works on all page types supported by the userscript:

- Artist pages (Releases, Recordings, Works, Events, Aliases, etc.)
- Release Group pages
- Release pages
- Recording pages
- Work pages
- Label pages
- Series pages
- Place pages
- Area pages
- Instrument pages
- Event pages
- Search results

## Important Notes

### Data Currency
- Saved data is a **snapshot** from the time you fetched it
- It will not reflect any changes made to MusicBrainz after saving
- Check the `timestampReadable` field to know when data was saved

### File Size
- Large datasets (thousands of rows) create large JSON files
- A typical artist with 500 releases might be 1-3 MB
- Ensure you have adequate disk space

### Browser Compatibility
- Works in Tampermonkey (v5.4.1+) on Chrome, Firefox, and Vivaldi
- Uses `GM_download` when available, with fallback to standard download

### Limitations
- You cannot modify the data in the JSON file directly (HTML structure must remain valid)
- Loading data on the wrong page type may cause rendering issues
- Some dynamic content (e.g., ratings, user-specific elements) may not be preserved

## Troubleshooting

### "No data loaded yet" error
- You must fetch data first before saving (click a "Show all..." button)

### "Failed to load data" error
- Ensure the JSON file is valid and not corrupted
- Check that the file was created by this version of the userscript

### Headers or formatting missing
- Make sure you're using version 4.3.0+ of the userscript
- Older cache files may not include header data

### Filters not working after load
- Try refreshing the page and reloading the data
- Ensure JavaScript is enabled

## Advanced Usage

### Archival Workflow
1. Fetch data for an artist's complete discography
2. Save to disk with timestamp
3. Periodically re-fetch and save to track changes over time
4. Compare JSON files to see what changed

### Offline Research
1. Before traveling or losing internet access
2. Pre-fetch and save data for multiple artists/releases
3. Work offline with all data available locally

### Performance Testing
1. Save large datasets (1000+ rows)
2. Load from disk to test rendering performance
3. Compare load times vs. network fetch

## Version History

- **v4.3.0** (2026-02-12): Initial implementation of offline storage feature
  - Added Save to Disk button
  - Added Load from Disk button
  - Implemented JSON serialization with HTML preservation
  - Implemented re-hydration with full feature support
