async function loadTableDataFromDisk(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validation: Check if the file matches the current page type
                if (data.pageType !== pageType) {
                    if (!confirm(`Warning: This file appears to be for "${data.pageType}", but you are on a "${pageType}" page. Try loading anyway?`)) {
                        return;
                    }
                }

                Lib.info('cache', `Loading ${data.rowCount} rows from disk...`);
                statusDisplay.textContent = '⌛ Processing data...';

                // --- NEW: Row-level filtering before rendering ---
                const filterValue = filterInput.value.trim();
                if (filterValue) {
                    const isRegex = regexpCheckbox.checked;
                    const isCaseSensitive = caseCheckbox.checked;
                    let regex;

                    try {
                        if (isRegex) {
                            regex = new RegExp(filterValue, isCaseSensitive ? '' : 'i');
                        } else {
                            // Escape special chars for non-regex search
                            const escaped = filterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            regex = new RegExp(escaped, isCaseSensitive ? '' : 'i');
                        }

                        const originalCount = data.rows.length;
                        // Filter the rows based on whether any cell content matches the regex
                        data.rows = data.rows.filter(row => 
                            row.cells.some(cellText => regex.test(cellText))
                        );

                        Lib.info('cache', `Filter applied: "${filterValue}" (Rx: ${isRegex}, Cc: ${isCaseSensitive}). Rows reduced from ${originalCount} to ${data.rows.length}.`);
                    } catch (err) {
                        Lib.error('cache', 'Invalid Filter/RegExp:', err);
                        alert('Invalid Filter/RegExp: ' + err.message);
                    }
                }
                // --- End of filtering logic ---

                // Clear current content and prepare for rendering
                const target = document.querySelector(activeDefinition.rowTargetSelector || 'table.tbl') || headerContainer;
                const container = target.closest('#content') || document.getElementById('content');

                // Hide original elements
                const toHide = container.querySelectorAll('table.tbl, .pagination, .pageselector-results, p:not(#mb-show-all-controls-container p)');
                toHide.forEach(el => el.style.display = 'none');

                // Re-initialize logic similar to startFetchingProcess
                allRows = data.rows;
                const mainTable = createBaseTable(data.headers);
                container.appendChild(mainTable);

                // Add rows to table
                const tbody = mainTable.querySelector('tbody');
                if (activeDefinition.tableMode === 'multi') {
                    // Logic for multi-table (grouped) rendering
                    groupedRows = groupRowsByHeader(allRows);
                    renderGroupedTables(groupedRows, container);
                } else {
                    // Logic for single table rendering
                    allRows.forEach(rowData => {
                        const tr = document.createElement('tr');
                        rowData.cells.forEach(cellHtml => {
                            const td = document.createElement('td');
                            td.innerHTML = cellHtml;
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    
                    if (allRows.length > 0) {
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

                Lib.info('cache', `Successfully loaded ${totalRows} rows!`);
                statusDisplay.textContent = `✓ Loaded: ${totalRows} rows`;
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
