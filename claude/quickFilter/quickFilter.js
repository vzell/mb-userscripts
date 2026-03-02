// Add this to the FILTER HIGHLIGHT COLORS SECTION in configSchema
        sa_uniq_filter_highlight_color: {
            label: "Unique Dropdown Filter Highlight Color",
            type: "color_picker",
            default: "red",
            description: "Text color for matches in the unique-values dropdown filter"
        },

        sa_uniq_filter_highlight_bg: {
            label: "Unique Dropdown Filter Highlight Background",
            type: "color_picker",
            default: "#ffff00",
            description: "Background color for matches in the unique-values dropdown filter"
        },



/**
     * Creates and returns the singleton DOM element for the unique-values column dropdown.
     */
    function getUniqDropEl() {
        let drop = document.getElementById('mb-col-uniq-drop');
        if (drop) return drop;

        drop = document.createElement('div');
        drop.id = 'mb-col-uniq-drop';
        // Basic styles from existing implementation
        drop.style.cssText = 'position: absolute; display: none; background: white; border: 1px solid #ccc; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10000; min-width: 200px; font-family: sans-serif; border-radius: 4px; overflow: hidden;';

        const style = document.createElement('style');
        style.textContent = `
            .mb-col-uniq-filter-container {
                position: sticky;
                top: 0;
                background: #f9f9f9;
                padding: 8px;
                border-bottom: 1px solid #ddd;
                z-index: 10;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .mb-col-uniq-filter-input {
                flex: 1;
                padding: 4px 24px 4px 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 12px;
                outline: none;
            }
            .mb-col-uniq-filter-input:focus { border-color: #888; box-shadow: 0 0 3px rgba(0,0,0,0.1); }
            .mb-col-uniq-filter-clear {
                position: absolute;
                right: 16px;
                cursor: pointer;
                color: #aaa;
                font-weight: bold;
                font-size: 14px;
                user-select: none;
                line-height: 1;
            }
            .mb-col-uniq-filter-clear:hover { color: #666; }
            .mb-col-uniq-items-list {
                max-height: 400px;
                overflow-y: auto;
                padding: 4px 0;
            }
            .mb-col-uniq-item { padding: 4px 12px; cursor: pointer; white-space: nowrap; font-size: 13px; }
            .mb-col-uniq-item:hover, .mb-col-uniq-item.focused { background: #f0f0f0; }
            .mb-col-uniq-filter-highlight {
                color: ${settings.sa_uniq_filter_highlight_color};
                background-color: ${settings.sa_uniq_filter_highlight_bg};
                font-weight: bold;
                border-radius: 1px;
            }
        `;
        document.head.appendChild(style);

        // Filter Header
        const filterContainer = document.createElement('div');
        filterContainer.className = 'mb-col-uniq-filter-container';
        
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.className = 'mb-col-uniq-filter-input';
        filterInput.placeholder = 'Filter values...';
        
        const clearBtn = document.createElement('span');
        clearBtn.className = 'mb-col-uniq-filter-clear';
        clearBtn.textContent = '×';
        clearBtn.title = 'Clear filter (Esc)';
        
        filterContainer.appendChild(filterInput);
        filterContainer.appendChild(clearBtn);
        drop.appendChild(filterContainer);

        // Items Container
        const itemsList = document.createElement('div');
        itemsList.className = 'mb-col-uniq-items-list';
        drop.appendChild(itemsList);

        document.body.appendChild(drop);
        return drop;
    }



function openUniqDrop(btn, colIdx, uniqValues) {
        const drop = getUniqDropEl();
        const filterInput = drop.querySelector('.mb-col-uniq-filter-input');
        const clearBtn = drop.querySelector('.mb-col-uniq-filter-clear');
        const itemsList = drop.querySelector('.mb-col-uniq-items-list');

        _uniqDropOwner = btn;
        filterInput.value = ''; // Reset on open
        
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const renderItems = (filterText = '') => {
            itemsList.innerHTML = '';
            const normalizedFilter = filterText.toLowerCase();
            const filteredValues = uniqValues.filter(v => v.toLowerCase().includes(normalizedFilter));

            filteredValues.forEach(v => {
                const item = document.createElement('div');
                item.className = 'mb-col-uniq-item';
                
                if (filterText) {
                    const regex = new RegExp(`(${escapeRegExp(filterText)})`, 'gi');
                    item.innerHTML = v.replace(regex, '<span class="mb-col-uniq-filter-highlight">$1</span>');
                } else {
                    item.textContent = v;
                }

                item.onclick = (e) => {
                    e.stopPropagation();
                    const filterField = btn.closest('.mb-col-filter-container').querySelector('.mb-col-filter-input');
                    filterField.value = v;
                    filterField.dispatchEvent(new Event('input', { bubbles: true }));
                    closeUniqDrop();
                };
                itemsList.appendChild(item);
            });

            if (filteredValues.length === 0) {
                const noResults = document.createElement('div');
                noResults.style.cssText = 'padding: 8px 12px; color: #999; font-style: italic; font-size: 12px;';
                noResults.textContent = 'No matches found';
                itemsList.appendChild(noResults);
            }
            focIdx = -1; // Reset focus index for keyboard navigation
        };

        // Input and Clear handlers
        filterInput.oninput = () => renderItems(filterInput.value);
        clearBtn.onclick = (e) => {
            e.stopPropagation();
            filterInput.value = '';
            renderItems();
            filterInput.focus();
        };

        // Keyboard navigation (adapted from existing logic)
        let focIdx = -1;
        const allItems = () => Array.from(itemsList.querySelectorAll('.mb-col-uniq-item'));
        const moveFocus = (idx) => {
            const items = allItems();
            if (focIdx >= 0 && items[focIdx]) items[focIdx].classList.remove('focused');
            focIdx = idx;
            if (focIdx >= 0 && items[focIdx]) {
                const el = items[focIdx];
                el.classList.add('focused');
                el.scrollIntoView({ block: 'nearest' });
            }
        };

        const kh = (ev) => {
            if (ev.key === 'Escape') {
                ev.preventDefault();
                ev.stopPropagation();
                if (filterInput.value) {
                    filterInput.value = '';
                    renderItems();
                } else {
                    closeUniqDrop();
                }
                return;
            }
            const items = allItems();
            if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                moveFocus((focIdx + 1) % items.length);
            } else if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                moveFocus((focIdx - 1 + items.length) % items.length);
            } else if (ev.key === 'Enter' && focIdx >= 0 && items[focIdx]) {
                ev.preventDefault();
                items[focIdx].click();
            }
        };

        filterInput.onkeydown = kh;
        
        // Position and Show
        renderItems();
        const rect = btn.getBoundingClientRect();
        drop.style.left = (window.scrollX + rect.left) + 'px';
        drop.style.top = (window.scrollY + rect.bottom + 2) + 'px';
        drop.style.display = 'block';

        setTimeout(() => filterInput.focus(), 10);

        // Click-outside listener
        const closeOnOutside = (e) => {
            if (!drop.contains(e.target) && e.target !== btn) {
                closeUniqDrop();
                document.removeEventListener('mousedown', closeOnOutside);
            }
        };
        document.addEventListener('mousedown', closeOnOutside);
}
