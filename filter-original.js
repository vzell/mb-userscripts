function loadTableDataFromDisk(file) {
    if (!file) {
        Lib.warn('cache', 'No file selected.');
        return;
    }

    Lib.info('cache', `Loading data from file: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate data structure
            if (!data.version || !data.pageType || !data.timestamp) {
                throw new Error('Invalid data file: missing required fields');
            }

            Lib.info('cache', `Loaded data version ${data.version} from ${data.timestampReadable} (${data.rowCount} rows)`);

            // Prepare the page for re-hydration
            performClutterCleanup();

            // Restore table headers if they were saved
            if (data.headers && data.headers.length > 0) {
                const firstTable = document.querySelector('table.tbl');
                if (firstTable) {
                    // Clear existing thead
                    if (firstTable.tHead) {
                        firstTable.tHead.remove();
                    }

                    // Create new thead
                    const thead = document.createElement('thead');
                    data.headers.forEach(headerRowCells => {
                        // Skip filter rows (they contain inputs with class mb-col-filter-input)
                        const hasFilterInputs = headerRowCells.some(cell =>
                            cell.html && cell.html.includes('mb-col-filter-input')
                        );
                        if (hasFilterInputs) {
                            Lib.debug('cache', 'Skipping filter row from saved headers');
                            return;
                        }

                        const tr = document.createElement('tr');
                        headerRowCells.forEach(cellData => {
                            const cell = document.createElement(cellData.tagName || 'th');
                            cell.innerHTML = cellData.html;
                            if (cellData.colSpan > 1) cell.colSpan = cellData.colSpan;
                            if (cellData.rowSpan > 1) cell.rowSpan = cellData.rowSpan;
                            tr.appendChild(cell);
                        });
                        thead.appendChild(tr);
                    });
                    firstTable.insertBefore(thead, firstTable.firstChild);
                    Lib.info('cache', 'Restored table headers from saved data.');
                }
            }

            // Reconstruct rows from serialized data
            if (data.tableMode === 'multi' && data.groups) {
                // Multi-table mode: reconstruct grouped rows
                groupedRows = data.groups.map(group => ({
                    key: group.key,
                    rows: group.rows.map((rowCells, rowIndex) => {
                        const tr = document.createElement('tr');
                        // Add alternating even/odd class
                        tr.className = rowIndex % 2 === 0 ? 'even' : 'odd';
                        rowCells.forEach(cellData => {
                            const td = document.createElement('td');
                            td.innerHTML = cellData.html;
                            if (cellData.colSpan > 1) td.colSpan = cellData.colSpan;
                            if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
                            tr.appendChild(td);
                        });
                        return tr;
                    })
                }));
                allRows = []; // Clear allRows for multi-table mode
                Lib.info('cache', `Reconstructed ${groupedRows.length} groups with ${data.rowCount} total rows.`);
            } else if (data.rows) {
                // Single-table mode: reconstruct allRows
                allRows = data.rows.map((rowCells, rowIndex) => {
                    const tr = document.createElement('tr');
                    // Add alternating even/odd class
                    tr.className = rowIndex % 2 === 0 ? 'even' : 'odd';
                    rowCells.forEach(cellData => {
                        const td = document.createElement('td');
                        td.innerHTML = cellData.html;
                        if (cellData.colSpan > 1) td.colSpan = cellData.colSpan;
                        if (cellData.rowSpan > 1) td.rowSpan = cellData.rowSpan;
                        tr.appendChild(td);
                    });
                    return tr;
                });
                groupedRows = []; // Clear groupedRows for single-table mode
                Lib.info('cache', `Reconstructed ${allRows.length} rows.`);
            } else {
                throw new Error('Invalid data file: no rows or groups found');
            }

            // Set the loaded flag and update active definition
            isLoaded = true;
            if (data.tableMode) {
                activeDefinition.tableMode = data.tableMode;
            }

            // Store original data for sorting
            originalAllRows = [...allRows];

            // Render the data using existing rendering logic
            if (activeDefinition.tableMode === 'multi' && groupedRows.length > 0) {
                // For multi-table mode, store original rows in each group
                groupedRows.forEach(g => { g.originalRows = [...g.rows]; });
                renderGroupedTable(groupedRows, pageType === 'artist-releasegroups');
            } else if (allRows.length > 0) {
                // For single-table mode
                renderFinalTable(allRows);
                // Add sorting and filtering capabilities
                document.querySelectorAll('table.tbl thead').forEach(cleanupHeaders);
                const mainTable = document.querySelector('table.tbl');
                if (mainTable) {
                    addColumnFilterRow(mainTable);
                    makeTableSortableUnified(mainTable, 'main_table');
                }
            }

            // Perform final cleanup and make headers collapsible
            finalCleanup();
            makeH2sCollapsible();

            // Update row count in header
            const totalRows = (activeDefinition.tableMode === 'multi') ?
                groupedRows.reduce((acc, g) => acc + g.rows.length, 0) : allRows.length;
            updateH2Count(totalRows, totalRows);

            // Show filter container
            if (!filterContainer.parentNode) {
                filterContainer.style.display = 'inline-flex';
            }

            // Show the save button now that we have data
            saveToDiskBtn.style.display = 'inline-block';

            Lib.info('cache', `Successfully loaded ${data.rowCount} rows from disk!`);
            statusDisplay.textContent = `✓ Loaded from disk: ${data.rowCount} rows`;
            statusDisplay.style.color = 'green';

        } catch (err) {
            Lib.error('cache', 'Failed to load data from file:', err);
            alert('Failed to load data: ' + err.message);
        }
    };

    reader.onerror = () => {
        Lib.error('cache', 'Failed to read file');
        alert('Failed to read file');
    };

    reader.readAsText(file);
}
