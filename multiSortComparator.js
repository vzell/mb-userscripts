    /**
     * Creates a multi-column comparator for sorting by multiple columns in order
     * @param {Array} sortColumns - Array of {colIndex, direction} objects in sort priority order
     * @param {NodeList} headers - Table header elements for column name detection
     * @returns {Function} Comparator function for Array.sort
     */
    function createMultiColumnComparator(sortColumns, headers) {
        return (a, b) => {
            // Compare by each column in order until we find a difference
            for (const sortCol of sortColumns) {
                const index = sortCol.colIndex;
                const isAscending = sortCol.direction === 1;

                const valA = getCleanVisibleText(a.cells[index]).trim().toLowerCase() || '';
                const valB = getCleanVisibleText(b.cells[index]).trim().toLowerCase() || '';

                // Determine if column is numeric based on header name
                const colName = headers[index] ? headers[index].textContent.replace(/[⇅▲▼⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').trim() : '';
                const isNumeric = colName.includes('Year') || colName.includes('Releases') ||
                                colName.includes('Track') || colName.includes('Length') ||
                                colName.includes('Rating') || colName.includes('#');

                let result;
                if (isNumeric) {
                    const numA = parseFloat(valA.replace(/[^0-9.-]/g, '')) || 0;
                    const numB = parseFloat(valB.replace(/[^0-9.-]/g, '')) || 0;
                    result = numA - numB;
                } else {
                    result = valA.localeCompare(valB, undefined, {numeric: true, sensitivity: 'base'});
                }

                // If values are different, return the comparison result
                if (result !== 0) {
                    return isAscending ? result : -result;
                }
                // If values are equal, continue to next column
            }

            // All compared columns are equal
            return 0;
        };
    }
