    function makeTableSortableUnified(table, sortKey) {
        // Determine mode based on active definition
        const isMultiTable = activeDefinition && activeDefinition.tableMode === 'multi';

        const headers = table.querySelectorAll('thead tr:first-child th');

        // multiTableSortStates.get(sortKey) holds: { lastSortIndex, sortState }
        // sortState: 0 (Original ⇅), 1 (Asc ▲), 2 (Desc ▼)
        // For single-table: also holds multiSortColumns array: [{ colIndex, direction, order }]
        if (!multiTableSortStates.has(sortKey)) {
            multiTableSortStates.set(sortKey, {
                lastSortIndex: -1,
                sortState: 0,
                multiSortColumns: [] // For single-table multi-column sort
            });
        }
        const state = multiTableSortStates.get(sortKey);

        // Helper to get superscript number
        const getSuperscript = (num) => {
            const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
            return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
        };

        // Helper to update visual indicators for multi-sort
        const updateMultiSortVisuals = () => {
            if (isMultiTable || state.multiSortColumns.length === 0) return;

            // Clear all existing sort indicators
            table.querySelectorAll('.sort-icon-btn').forEach(btn => {
                btn.classList.remove('sort-icon-active');
                // Remove any existing superscripts
                btn.textContent = btn.textContent.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '');
            });

            // Add indicators for each column in sort order
            state.multiSortColumns.forEach((sortCol, idx) => {
                const thElement = headers[sortCol.colIndex];
                if (!thElement) return;

                const sortOrder = idx + 1;
                const superscript = getSuperscript(sortOrder);

                // Find the appropriate icon button (▲ for asc, ▼ for desc)
                const icons = thElement.querySelectorAll('.sort-icon-btn');
                icons.forEach(icon => {
                    const iconText = icon.textContent.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '');
                    if ((iconText === '▲' && sortCol.direction === 1) ||
                        (iconText === '▼' && sortCol.direction === 2)) {
                        icon.classList.add('sort-icon-active');
                        icon.textContent = iconText + superscript;
                    }
                });
            });
        };

        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'default';

            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            th.innerHTML = ''; // Clear for new icon layout

            const createIcon = (char, targetState) => {
                const span = document.createElement('span');
                span.className = 'sort-icon-btn';
                // Set Tooltip texts
                if (char === '⇅') {
                    span.title = isMultiTable ? 'Original sort order' : 'Original sort order (Shift+Click to clear multi-sort)';
                } else if (char === '▲') {
                    span.title = isMultiTable ? 'Ascending sort order' : 'Ascending sort order (adds to multi-column sort on single-table pages)';
                } else if (char === '▼') {
                    span.title = isMultiTable ? 'Descending sort order' : 'Descending sort order (adds to multi-column sort on single-table pages)';
                }

                // Initial highlighting: Check if this specific icon corresponds to the saved state
                if (state.lastSortIndex === index && state.sortState === targetState) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;

                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Handle Shift+Click on reset button for single-table to clear multi-sort
                    if (!isMultiTable && e.shiftKey && targetState === 0) {
                        Lib.info('sort', 'Clearing multi-column sort');
                        state.multiSortColumns = [];
                        state.lastSortIndex = -1;
                        state.sortState = 0;
                        updateMultiSortVisuals();

                        // Reset to original order
                        allRows = [...originalAllRows];
                        runFilter();

                        const sortStatusDisplay = document.getElementById('mb-sort-status-display');
                        if (sortStatusDisplay) {
                            sortStatusDisplay.textContent = '✓ Multi-column sort cleared - restored to original order';
                            sortStatusDisplay.style.color = 'green';
                        }
                        return;
                    }

                    // For single-table pages, handle multi-column sorting
                    if (!isMultiTable && targetState !== 0) {
                        // Check if this column is already in the sort order
                        const existingIndex = state.multiSortColumns.findIndex(col => col.colIndex === index);

                        if (existingIndex !== -1) {
                            // Column already in sort - update direction or remove if clicking same direction
                            if (state.multiSortColumns[existingIndex].direction === targetState) {
                                // Clicking same direction - remove from sort
                                state.multiSortColumns.splice(existingIndex, 1);
                                Lib.info('sort', `Removed column ${index} from multi-sort`);
                            } else {
                                // Change direction
                                state.multiSortColumns[existingIndex].direction = targetState;
                                Lib.info('sort', `Updated column ${index} direction in multi-sort`);
                            }
                        } else {
                            // Add to multi-sort
                            state.multiSortColumns.push({
                                colIndex: index,
                                direction: targetState,
                                order: state.multiSortColumns.length
                            });
                            Lib.info('sort', `Added column ${index} to multi-sort (position ${state.multiSortColumns.length})`);
                        }

                        // Update state for compatibility
                        state.lastSortIndex = index;
                        state.sortState = targetState;
                    } else if (targetState === 0) {
                        // Reset icon clicked - clear everything for single table, or just reset for multi-table
                        if (!isMultiTable) {
                            state.multiSortColumns = [];
                        }
                        state.lastSortIndex = -1;
                        state.sortState = 0;
                    } else {
                        // Multi-table page - use simple single-column sort
                        state.lastSortIndex = index;
                        state.sortState = targetState;
                    }

                    // 1. Identify Target Data
                    let targetRows = [];
                    let originalRows = [];
                    let targetGroup = null;

                    if (isMultiTable) {
                        const groupIndex = parseInt(sortKey.split('_').pop(), 10);
                        targetGroup = groupedRows[groupIndex];
                        if (targetGroup) {
                            targetRows = targetGroup.rows;
                            originalRows = targetGroup.originalRows;
                        }
                    } else {
                        targetRows = allRows;
                        originalRows = originalAllRows;
                    }

                    // 2. Setup UI Feedback
                    const rowCount = targetRows.length;
                    const showProgressBar = rowCount >= (Lib.settings.sa_sort_progress_threshold || 10000);
                    const showWaitCursor = rowCount > 1000;

                    const colName = headers[index].textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim();
                    Lib.debug('sort', `Sorting table "${sortKey}" by column: "${colName}" (index: ${index}) to state ${targetState}. Row count: ${rowCount}`);

                    // Update sort status display
                    const sortStatusDisplay = document.getElementById('mb-sort-status-display');
                    if (sortStatusDisplay) {
                        sortStatusDisplay.textContent = '⏳ Sorting...';
                        sortStatusDisplay.style.color = 'orange';
                    }

                    if (showWaitCursor) document.body.classList.add('mb-sorting-active');

                    // Show progress for large sorts
                    let progressBar, progressText;
                    if (showProgressBar && progressContainer) {
                        progressContainer.style.display = 'block';
                        progressBar = progressContainer.querySelector('.mb-progress-bar');
                        progressText = progressContainer.querySelector('.mb-progress-text');
                        if (progressBar) progressBar.style.width = '0%';
                        if (progressText) progressText.textContent = 'Sorting: 0%';
                    }

                    // 3. Async Execution
                    (async () => {
                        try {
                            const startSort = performance.now();

                            // Update State (already done above for multi-column)

                            // For single-table: update visual indicators
                            if (!isMultiTable) {
                                updateMultiSortVisuals();
                            } else {
                                // Multi-table: Reset visual state for all header buttons in THIS table
                                table.querySelectorAll('.sort-icon-btn').forEach(btn => btn.classList.remove('sort-icon-active'));
                                // Highlight only this specific icon
                                span.classList.add('sort-icon-active');
                            }

                            // Perform Sort
                            let sortedData = [];
                            if ((!isMultiTable && state.multiSortColumns.length === 0) ||
                                (isMultiTable && state.sortState === 0)) {
                                // Restore original order
                                sortedData = [...originalRows];
                            } else {
                                // Clone array for sorting
                                sortedData = [...targetRows];

                                // Create comparator
                                let compareFn;

                                if (!isMultiTable && state.multiSortColumns.length > 0) {
                                    // Multi-column sort for single-table
                                    compareFn = createMultiColumnComparator(state.multiSortColumns, headers);
                                } else {
                                    // Single column sort
                                    const colName = headers[index].textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim();
                                    const isNumeric = colName.includes('Year') || colName.includes('Releases') ||
                                                    colName.includes('Track') || colName.includes('Length') ||
                                                    colName.includes('Rating') || colName.includes('#');
                                    const isAscending = state.sortState === 1;
                                    compareFn = createSortComparator(index, isAscending, isNumeric);
                                }

                                // Progress callback for large sorts
                                const progressCallback = showProgressBar ? (percent) => {
                                    if (progressBar) progressBar.style.width = `${percent}%`;
                                    if (progressText) progressText.textContent = `Sorting: ${percent}%`;
                                } : null;

                                // Use optimized sort for large arrays
                                await sortLargeArray(sortedData, compareFn, progressCallback);
                            }

                            // Apply Sorted Data back to Source variables
                            if (isMultiTable && targetGroup) {
                                targetGroup.rows = sortedData;
                            } else {
                                allRows = sortedData;
                            }

                            // Re-run filter and render
                            runFilter();

                            const duration = ((performance.now() - startSort) / 1000).toFixed(2);
                            const durationMs = (performance.now() - startSort).toFixed(0);

                            if (sortStatusDisplay) {
                                const tableName = isMultiTable && targetGroup ? (targetGroup.category || targetGroup.key || sortKey) : 'table';

                                if (isMultiTable) {
                                    // On multi-table pages: update only the sub-table sort status
                                    // Find the corresponding h3 and update its sort status display
                                    const h3 = table.previousElementSibling;
                                    if (h3 && h3.classList.contains('mb-toggle-h3')) {
                                        const subSortStatus = h3.querySelector('.mb-sort-status');
                                        if (subSortStatus) {
                                            const sortIcon = state.sortState === 0 ? '⇅' : (state.sortState === 1 ? '▲' : '▼');
                                            subSortStatus.textContent = `✓ Sorted by column "${colName}" ${sortIcon}: ${rowCount} rows in ${durationMs}ms`;
                                            subSortStatus.style.color = durationMs > 2000 ? 'red' : (durationMs > 1000 ? 'orange' : 'green');
                                        }
                                    }
                                    // Clear main sort status display on multi-table pages
                                    sortStatusDisplay.textContent = '';
                                } else {
                                    // On single-table pages: show multi-column info if applicable
                                    if (state.multiSortColumns.length > 1) {
                                        const colNames = state.multiSortColumns.map((col, idx) => {
                                            const h = headers[col.colIndex];
                                            const name = h ? h.textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim() : `Col ${col.colIndex}`;
                                            const icon = col.direction === 1 ? '▲' : '▼';
                                            return `${name}${icon}`;
                                        }).join(', ');
                                        sortStatusDisplay.textContent = `✓ Multi-sorted by: ${colNames} (${rowCount} rows in ${durationMs}ms)`;
                                        sortStatusDisplay.style.color = durationMs > 2000 ? 'red' : (durationMs > 1000 ? 'orange' : 'green');
                                    } else if (state.multiSortColumns.length === 1) {
                                        const col = state.multiSortColumns[0];
                                        const h = headers[col.colIndex];
                                        const name = h ? h.textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim() : `Col ${col.colIndex}`;
                                        const sortIcon = col.direction === 1 ? '▲' : '▼';
                                        sortStatusDisplay.textContent = `✓ Sorted by column "${name}" ${sortIcon}: ${rowCount} rows in ${durationMs}ms`;
                                        sortStatusDisplay.style.color = durationMs > 2000 ? 'red' : (durationMs > 1000 ? 'orange' : 'green');
                                    } else {
                                        sortStatusDisplay.textContent = `✓ Restored to original order (${rowCount} rows)`;
                                        sortStatusDisplay.style.color = 'green';
                                    }
                                }
                            }

                            Lib.info('sort', `Sort completed in ${duration}s for ${rowCount} rows`);

                        } catch (error) {
                            Lib.error('sort', 'Error during sort:', error);
                            if (sortStatusDisplay) {
                                sortStatusDisplay.textContent = '✗ Sort failed';
                                sortStatusDisplay.style.color = 'red';
                            }
                        } finally {
                            // Cleanup UI
                            if (showWaitCursor) document.body.classList.remove('mb-sorting-active');
                            if (showProgressBar && progressContainer) {
                                progressContainer.style.display = 'none';
                            }
                        }
                    })();
                };
                return span;
            };

            th.appendChild(createIcon('⇅', 0));
            th.appendChild(document.createTextNode(` ${colName} `));
            th.appendChild(createIcon('▲', 1));
            th.appendChild(createIcon('▼', 2));
        });
    }
