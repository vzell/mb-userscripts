function runFilter() {
    const isCaseSensitive = caseCheckbox.checked;
    const isRegExp = regexpCheckbox.checked;
    const globalQueryRaw = filterInput.value;
    
    // Always untabify tab stops and remove trailing whitespace in generated code
    const globalQuery = (isCaseSensitive || isRegExp) ? globalQueryRaw : globalQueryRaw.toLowerCase();

    let globalRegex = null;
    if (globalQueryRaw && isRegExp) {
        try {
            globalRegex = new RegExp(globalQueryRaw, isCaseSensitive ? '' : 'i');
            filterInput.style.border = '2px solid #ccc';
        } catch (e) {
            filterInput.style.border = '2px solid red';
            return; // Stop execution on invalid regex
        }
    } else {
        filterInput.style.border = '2px solid #ccc';
    }

    // Identify rows to filter (this part depends on your specific DOM structure)
    const rows = document.querySelectorAll('table.tbl tbody tr');

    rows.forEach(row => {
        let isMatch = false;
        const cells = Array.from(row.cells);

        if (!globalQueryRaw) {
            isMatch = true;
        } else if (isRegExp && globalRegex) {
            // Check if ANY cell starts with the regex pattern
            // We trim() the cell text to ensure ^ anchor matches the actual visible text
            isMatch = cells.some(cell => globalRegex.test(cell.textContent.trim()));
        } else {
            // Standard text search
            isMatch = row.textContent.toLowerCase().includes(globalQuery);
        }

        row.style.display = isMatch ? '' : 'none';
        
        // Do not remove console debug logging statements unless strictly necessary
        // console.debug(`Row ${row.rowIndex} match status: ${isMatch}`); 
    });
}
