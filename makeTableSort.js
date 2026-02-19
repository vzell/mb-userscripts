    function makeTableSortableUnified(table, sortKey) {
        // Determine mode based on active definition
        const isMultiTable = activeDefinition && activeDefinition.tableMode === 'multi';

        const headers = table.querySelectorAll('thead tr:first-child th');

        // multiTableSortStates.get(sortKey) holds: { lastSortIndex, sortState }
        // sortState: 0 (Original ⇅), 1 (Asc ▲), 2 (Desc ▼)
        if (!multiTableSortStates.has(sortKey)) {
            multiTableSortStates.set(sortKey, { lastSortIndex: -1, sortState: 0 });
        }
        const state = multiTableSortStates.get(sortKey);

        headers.forEach((th, index) => {
            if (th.querySelector('input[type="checkbox"]')) return;
            th.style.cursor = 'default';

            const colName = th.textContent.replace(/[⇅▲▼]/g, '').trim();
            th.innerHTML = ''; // Clear for new icon layout

            const createIcon = (char, targetState) => {
                const span = document.createElement('span');
                span.className = 'sort-icon-btn';
                // Set Tooltip texts
                if (char === '⇅') span.title = 'Original sort order';
                else if (char === '▲') span.title = 'Ascending sort order';
                else if (char === '▼') span.title = 'Descending sort order';

                // Initial highlighting: Check if this specific icon corresponds to the saved state
                if (state.lastSortIndex === index && state.sortState === targetState) {
                    span.classList.add('sort-icon-active');
                }
                span.textContent = char;

                span.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

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
                    const showWaitCursor = rowCount > 1000;
                    const sortDirIcon = targetState === 0 ? '⇅' : (targetState === 1 ? '▲' : '▼');

                    Lib.debug('sort', `Sorting table "${sortKey}" by column: "${colName}" ${sortDirIcon} (index: ${index}) to state ${targetState}. Row count: ${rowCount}`);

                    // Update sort status display
                    const sortStatusDisplay = document.getElementById('mb-sort-status-display');
                    if (sortStatusDisplay) {
                        sortStatusDisplay.textContent = '⏳ Sorting...';
                        sortStatusDisplay.style.color = 'orange';
                    }

                    if (showWaitCursor) document.body.classList.add('mb-sorting-active');

                    // 3. Async Execution
                    (async () => {
                        try {
                            const startSort = performance.now();

                            // Update State
                            state.lastSortIndex = index;
                            state.sortState = targetState;

                            // Reset visual state for all header buttons in THIS table
                            table.querySelectorAll('.sort-icon-btn').forEach(btn => btn.classList.remove('sort-icon-active'));
                            // Highlight only this specific icon
                            span.classList.add('sort-icon-active');

                            // Perform Sort
                            let sortedData = [];
                            if (state.sortState === 0) {
                                // Restore original order
                                sortedData = [...originalRows];
                            } else {
                                // Clone array for sorting
                                sortedData = [...targetRows];
                                const isNumeric = colName.includes('Year') || colName.includes('Releases') ||
                                                colName.includes('Track') || colName.includes('Length') ||
                                                colName.includes('Rating') || colName.includes('#');
                                const isAscending = state.sortState === 1;

                                // Create comparator
                                const compareFn = createSortComparator(index, isAscending, isNumeric);

                                // Use optimized sort for large arrays (no visual progress bar)
                                await sortLargeArray(sortedData, compareFn, null);
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
                                    // On single-table pages: show in main sort status display
                                    const sortIcon = state.sortState === 0 ? '⇅' : (state.sortState === 1 ? '▲' : '▼');
                                    sortStatusDisplay.textContent = `✓ Sorted by column "${colName}" ${sortIcon}: ${rowCount} rows in ${durationMs}ms`;
                                    sortStatusDisplay.style.color = durationMs > 2000 ? 'red' : (durationMs > 1000 ? 'orange' : 'green');
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
