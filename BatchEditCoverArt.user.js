// ==UserScript==
// @name         VZ: MusicBrainz - Batch Edit Cover Art
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.9+2026-01-18
// @description  Batch edit types and comments of cover art images with keyboard-navigable autocomplete and searchable sorted immutable comments
// @author       Gemini with vzell
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchEditCoverArt.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/BatchEditCoverArt.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/release/*/cover-art
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const TYPES = [
        "Front", "Back", "Booklet", "Medium", "Obi", "Spine", "Track", "Tray",
        "Sticker", "Poster", "Liner", "Watermark", "Raw/Unedited",
        "Matrix/Runout", "Top", "Bottom", "Panel", "Other"
    ];

    const HISTORY_KEY = 'mb_batch_comment_history';
    const IMMUTABLE_KEY = 'mb_batch_comment_immutable';
    const MAX_HISTORY = 50;

    let originalData = {};
    let selectedIndex = -1;

    // --- Persistence Managers ---
    const ImmutableManager = {
        get: () => JSON.parse(localStorage.getItem(IMMUTABLE_KEY) || "[]"),
        saveAll: (list) => {
            const trimmed = [...new Set(list.map(s => s.trim()).filter(s => s))];
            const sortedList = trimmed.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            localStorage.setItem(IMMUTABLE_KEY, JSON.stringify(sortedList));

            // Requirement: If it exists in history, remove it from history
            let history = HistoryManager.get();
            const updatedHistory = history.filter(h => !sortedList.includes(h));
            if (history.length !== updatedHistory.length) {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
            }
        }
    };

    const HistoryManager = {
        get: () => JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"),
        save: (comment) => {
            const val = comment ? comment.trim() : "";
            if (!val) return;

            const immutables = ImmutableManager.get();
            if (immutables.includes(val)) return;

            let history = HistoryManager.get();
            // Add new and deduplicate
            history = [...new Set([val, ...history])];
            // Requirement: Store non-immutable comments sorted
            history.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
        }
    };

    // --- Autocomplete UI ---
    const suggestionList = document.createElement('div');
    suggestionList.id = 'batch-comment-suggestions';
    suggestionList.style = `
        position: absolute;
        background: white;
        border: 1px solid #999;
        border-radius: 3px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 100001;
        display: none;
        max-height: 250px;
        overflow-y: auto;
        font-family: sans-serif;
        font-size: 13px;
        color: #333;
    `;
    document.body.appendChild(suggestionList);

    const hideSuggestions = () => {
        setTimeout(() => {
            suggestionList.style.display = 'none';
            selectedIndex = -1;
        }, 200);
    };

    const updateHighlight = () => {
        const items = suggestionList.querySelectorAll('div');
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.background = '#0066cc';
                item.style.color = 'white';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = 'white';
                item.style.color = '#333';
            }
        });
    };

    const showSuggestions = (input) => {
        const immutables = ImmutableManager.get();
        const history = HistoryManager.get();
        // Since both are stored sorted, combined order is naturally sorted per group
        const combined = [...new Set([...immutables, ...history])];

        const val = input.value.toLowerCase().trim();
        const filtered = val
            ? combined.filter(h => h.toLowerCase().includes(val))
            : combined;

        if (filtered.length === 0) {
            suggestionList.style.display = 'none';
            return;
        }

        const rect = input.getBoundingClientRect();
        suggestionList.innerHTML = '';
        suggestionList.style.width = `${rect.width}px`;
        suggestionList.style.top = `${rect.bottom + window.scrollY}px`;
        suggestionList.style.left = `${rect.left + window.scrollX}px`;
        suggestionList.style.display = 'block';
        selectedIndex = -1;

        filtered.forEach((text, index) => {
            const item = document.createElement('div');
            const isImmutable = immutables.includes(text);
            item.innerHTML = isImmutable ? `<b>📌 ${text}</b>` : text;
            item.style = 'padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

            item.onclick = () => {
                input.value = text;
                suggestionList.style.display = 'none';
                input.dispatchEvent(new Event('change'));
            };
            item.onmouseover = () => {
                selectedIndex = index;
                updateHighlight();
            };
            suggestionList.appendChild(item);
        });
    };

    const handleKeydown = (e, input) => {
        const items = suggestionList.querySelectorAll('div');
        if (suggestionList.style.display === 'none' || items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateHighlight();
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateHighlight();
                break;
            case 'Enter':
                if (selectedIndex > -1) {
                    e.preventDefault();
                    input.value = items[selectedIndex].textContent.replace('📌 ', '');
                    suggestionList.style.display = 'none';
                    input.dispatchEvent(new Event('change'));
                }
                break;
            case 'Escape':
                suggestionList.style.display = 'none';
                break;
        }
    };

    // --- Configuration Modal (Searchable GUI) ---
    function showImmutableConfig() {
        const overlay = document.createElement('div');
        overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 100002; display: flex; justify-content: center; align-items: flex-start; padding-top: 50px;';

        const container = document.createElement('div');
        container.style = 'background: white; padding: 20px; border-radius: 5px; width: 550px; max-height: 85vh; overflow-y: auto; font-family: sans-serif; box-shadow: 0 0 25px rgba(0,0,0,0.5);';

        let currentSearch = "";

        const renderList = () => {
            const list = ImmutableManager.get();
            const filtered = list
                .map((text, originalIndex) => ({ text, originalIndex }))
                .filter(item => item.text.toLowerCase().includes(currentSearch.toLowerCase()));

            let html = `
                <h3 style="margin-top:0;">⚙️ Configure Immutable Comments</h3>
                <div style="margin-bottom: 15px; position: relative; display: flex; align-items: center;">
                    <input type="text" id="imm-search" placeholder="Search comments..." value="${currentSearch}" style="width: 100%; padding: 8px 30px 8px 8px; border: 1px solid #ccc; border-radius: 3px;">
                    <span id="clear-search" style="position: absolute; right: 8px; cursor: pointer; color: #999; font-size: 14px; user-select: none;">❌</span>
                </div>
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; margin-bottom: 15px;">
                    <table style="width: 100%; border-collapse: collapse;">`;

            if (filtered.length === 0) {
                html += `<tr><td style="padding: 20px; text-align: center; color: #999;">${currentSearch ? 'No matches found.' : 'No comments defined.'}</td></tr>`;
            } else {
                filtered.forEach((item) => {
                    html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; word-break: break-all;">${item.text}</td>
                        <td style="text-align: right; width: 80px; white-space: nowrap; padding-right: 10px;">
                            <button class="edit-imm" data-index="${item.originalIndex}" title="Edit" style="cursor:pointer; border:none; background:none; font-size: 1.2em; padding: 0 4px;">✏️</button>
                            <button class="del-imm" data-index="${item.originalIndex}" title="Delete" style="cursor:pointer; border:none; background:none; font-size: 1.2em; padding: 0 4px;">❌</button>
                        </td>
                    </tr>`;
                });
            }

            html += `</table>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <button id="add-new-imm" style="padding: 8px 16px; cursor:pointer; background: #0066cc; color: white; border: none; border-radius: 3px; font-weight: bold;">Add New Comment</button>
                    <button id="close-imm" style="padding: 8px 16px; cursor:pointer; background: #eee; border: 1px solid #ccc; border-radius: 3px;">Close</button>
                </div>`;

            container.innerHTML = html;

            const searchInput = container.querySelector('#imm-search');
            searchInput.focus();
            searchInput.setSelectionRange(currentSearch.length, currentSearch.length);

            searchInput.oninput = (e) => {
                currentSearch = e.target.value;
                renderList();
            };

            container.querySelector('#clear-search').onclick = () => {
                currentSearch = "";
                renderList();
            };

            container.querySelector('#add-new-imm').onclick = () => {
                const val = prompt("Enter new immutable comment:");
                if (val && val.trim()) {
                    const current = ImmutableManager.get();
                    if (!current.includes(val.trim())) {
                        current.push(val.trim());
                        ImmutableManager.saveAll(current);
                        renderList();
                    }
                }
            };

            container.querySelectorAll('.edit-imm').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const list = ImmutableManager.get();
                    const newVal = prompt("Edit immutable comment:", list[idx]);
                    if (newVal && newVal.trim()) {
                        list[idx] = newVal.trim();
                        ImmutableManager.saveAll(list);
                        renderList();
                    }
                };
            });

            container.querySelectorAll('.del-imm').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const list = ImmutableManager.get();
                    if (confirm(`Remove "${list[idx]}"?`)) {
                        list.splice(idx, 1);
                        ImmutableManager.saveAll(list);
                        renderList();
                    }
                };
            });

            container.querySelector('#close-imm').onclick = () => overlay.remove();
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEsc);
                overlay.remove();
            }
        };
        document.addEventListener('keydown', handleEsc);

        renderList();
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    // --- Core Script Injection ---
    let batchContainer = document.createElement('div');
    batchContainer.id = 'batch-edit-container';
    batchContainer.style = 'margin: 20px 0; padding: 20px; border: 2px solid #600; display: none; background: #f9f9f9; clear: both; font-family: sans-serif;';

    const injectButton = () => {
        const addBtn = document.querySelector('a[href*="/add-cover-art"]');
        const buttonRow = document.querySelector('.buttons.ui-helper-clearfix');

        if (addBtn && !document.getElementById('batch-edit-trigger')) {
            const batchBtn = document.createElement('a');
            batchBtn.id = 'batch-edit-trigger';
            batchBtn.href = '#';
            batchBtn.style.cursor = 'pointer';
            batchBtn.style.marginLeft = '4px';
            batchBtn.innerHTML = '<bdi>Batch edit cover art</bdi>';

            addBtn.parentNode.insertBefore(batchBtn, addBtn.nextSibling);
            batchBtn.onclick = toggleBatchMode;

            if (buttonRow) {
                buttonRow.parentNode.insertBefore(batchContainer, buttonRow.nextSibling);
            }
        } else if (!addBtn) {
            setTimeout(injectButton, 500);
        }
    };

    const toggleBatchMode = async (e) => {
        if (e) e.preventDefault();

        if (batchContainer.style.display === 'block') {
            batchContainer.style.display = 'none';
            return;
        }

        const images = getImages();
        if (images.length === 0) {
            alert('No editable images found.');
            return;
        }

        batchContainer.innerHTML = '<h3 style="color: #600; padding: 10px;">Loading metadata for ' + images.length + ' images...</h3>';
        batchContainer.style.display = 'block';

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <h3 style="margin:0;">Batch Edit Cover Art</h3>
                    <button id="config-immutable" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em; background: #fff; border: 1px solid #999;">⚙️ Configure immutable comments</button>
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button id="copy-first-types" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em;">Copy 1st types</button>
                    <button id="copy-first-comment" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em;">Copy 1st comment</button>
                    <button id="clear-all-types" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em; background: #fff; border: 1px solid #999;">Clear all types</button>
                    <button id="reset-batch" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em; background: #fff; border: 1px solid #999;">Reset to original</button>
                </div>
            </div>
            <table style="width:100%; border-collapse: collapse; background: white; border: 1px solid #ccc;">`;

        for (const img of images) {
            const data = await fetchImageData(img.editUrl);
            originalData[img.id] = data;

            html += `
                <tr style="border-bottom: 2px solid #ddd;" class="batch-row" data-id="${img.id}" data-edit-url="${img.editUrl}">
                    <td style="padding: 15px; width: 140px; text-align: center; border-right: 1px solid #eee; background: #fafafa; vertical-align: top;">
                        <img src="${img.thumb}" style="max-width: 120px; max-height: 120px; border: 1px solid #ccc; display: block; margin: 0 auto;" alt="Thumb ${img.id}">
                        <small style="color: #666; display:block; margin-top:5px;">ID: ${img.id}</small>
                    </td>
                    <td style="padding: 15px; vertical-align: top;">
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #555;">Types:</strong>
                            <div class="type-checkboxes" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 5px; margin-top: 8px;">
                                ${TYPES.map(t => `
                                    <label style="font-size: 0.85em; cursor: pointer; display: flex; align-items: center; white-space: nowrap;">
                                        <input type="checkbox" value="${t}" ${data.types.includes(t) ? 'checked' : ''} style="margin-right: 4px;"> ${t}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div style="margin-top: 10px;">
                            <strong style="color: #555;">Comment:</strong>
                            <input type="text" class="batch-comment" autocomplete="off" style="width: 100%; padding: 6px; margin-top: 5px; border: 1px solid #ccc; border-radius: 3px;" value="${data.comment}">
                        </div>
                    </td>
                </tr>`;
        }

        html += `</table>
            <div style="margin-top: 20px; background: #eee; padding: 20px; border-radius: 4px; border: 1px solid #ccc;">
                <label><strong>Edit Note:</strong></label>
                <textarea id="batch-edit-note" placeholder="Explain your changes..." style="width: 100%; height: 60px; margin: 10px 0; padding: 8px; border: 1px solid #ccc;"></textarea><br>
                <button id="submit-batch-edit" class="styled-button" style="background: #600; color: white; padding: 10px 20px; font-weight: bold; border: none; cursor: pointer;">Enter edit</button>
            </div>`;

        batchContainer.innerHTML = html;

        const commentInputs = batchContainer.querySelectorAll('.batch-comment');
        commentInputs.forEach(input => {
            input.addEventListener('focus', () => showSuggestions(input));
            input.addEventListener('input', () => showSuggestions(input));
            input.addEventListener('blur', hideSuggestions);
            input.addEventListener('keydown', (e) => handleKeydown(e, input));
        });

        document.getElementById('config-immutable').onclick = showImmutableConfig;

        document.getElementById('copy-first-types').onclick = () => {
            const firstRow = document.querySelector('.batch-row');
            if (!firstRow) return;
            const selected = Array.from(firstRow.querySelectorAll('.type-checkboxes input:checked')).map(i => i.value);
            document.querySelectorAll('.batch-row').forEach(row => {
                row.querySelectorAll('.type-checkboxes input').forEach(checkbox => {
                    checkbox.checked = selected.includes(checkbox.value);
                });
            });
        };

        document.getElementById('copy-first-comment').onclick = () => {
            const firstRow = document.querySelector('.batch-row');
            if (!firstRow) return;
            const commentVal = firstRow.querySelector('.batch-comment').value;
            document.querySelectorAll('.batch-comment').forEach(input => {
                input.value = commentVal;
            });
        };

        document.getElementById('clear-all-types').onclick = () => {
            if (confirm("This will uncheck all types for all images in this list. Proceed?")) {
                document.querySelectorAll('.type-checkboxes input').forEach(cb => cb.checked = false);
            }
        };

        document.getElementById('reset-batch').onclick = () => {
            if (confirm("Discard all changes and revert to original metadata?")) {
                document.querySelectorAll('.batch-row').forEach(row => {
                    const id = row.getAttribute('data-id');
                    const orig = originalData[id];
                    row.querySelector('.batch-comment').value = orig.comment;
                    row.querySelectorAll('.type-checkboxes input').forEach(cb => {
                        cb.checked = orig.types.includes(cb.value);
                    });
                });
            }
        };

        document.getElementById('submit-batch-edit').onclick = submitAll;
    };

    const getImages = () => {
        const images = [];
        const editLinks = document.querySelectorAll('a[href*="/edit-cover-art/"]');
        editLinks.forEach(link => {
            const id = link.href.split('/').pop();
            const imgElement = document.querySelector(`img[src*="${id}"], img[data-src*="${id}"]`);
            let thumbUrl = '';
            if (imgElement) {
                thumbUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
            }
            images.push({ id: id, editUrl: link.href, thumb: thumbUrl });
        });
        return images.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    };

    const fetchImageData = (url) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (res) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.responseText, "text/html");
                    const comment = doc.querySelector('input[name="edit-cover-art.comment"]')?.value || "";
                    const checkedCheckboxes = doc.querySelectorAll('input[name="edit-cover-art.type_id"]:checked');
                    const types = Array.from(checkedCheckboxes).map(cb => cb.parentElement.textContent.trim()).sort();
                    resolve({ comment, types });
                }
            });
        });
    };

    const submitAll = async () => {
        const rows = document.querySelectorAll('.batch-row');
        const editNote = document.getElementById('batch-edit-note').value;
        const btn = document.getElementById('submit-batch-edit');

        let hasChanges = false;
        rows.forEach(row => {
            const id = row.getAttribute('data-id');
            const currentComment = row.querySelector('.batch-comment').value;
            const currentTypes = Array.from(row.querySelectorAll('.type-checkboxes input:checked')).map(cb => cb.value).sort();

            const orig = originalData[id];
            const typesChanged = JSON.stringify(currentTypes) !== JSON.stringify(orig.types);
            const commentChanged = currentComment !== orig.comment;

            if (typesChanged || commentChanged) {
                hasChanges = true;
                row.setAttribute('data-changed', 'true');
                HistoryManager.save(currentComment);
            } else {
                row.setAttribute('data-changed', 'false');
            }
        });

        if (!hasChanges) {
            const proceed = confirm("No changes detected for any image. Do you want to submit anyway?");
            if (!proceed) return;
        }

        if (!editNote.trim()) {
            alert('Please provide an edit note.');
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Submitting...';

        for (const row of rows) {
            if (row.getAttribute('data-changed') === 'false') continue;

            const editUrl = row.getAttribute('data-edit-url');
            const comment = row.querySelector('.batch-comment').value;
            const selectedTypes = Array.from(row.querySelectorAll('.type-checkboxes input:checked')).map(cb => cb.value);

            const formInfo = await getFormPayload(editUrl);
            const formData = new FormData();

            formData.append('edit-cover-art.comment', comment);
            formData.append('edit-cover-art.edit_note', editNote);

            formInfo.typeMapping.forEach(mapping => {
                if (selectedTypes.includes(mapping.name)) {
                    formData.append('edit-cover-art.type_id', mapping.id);
                }
            });

            formInfo.hiddenFields.forEach(field => {
                formData.append(field.name, field.value);
            });

            await postEdit(editUrl, formData);
            row.style.backgroundColor = '#dff0d8';
            row.style.opacity = '0.5';
        }

        btn.innerText = 'Finished! Reloading...';
        setTimeout(() => window.location.reload(), 1000);
    };

    const getFormPayload = (url) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (res) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.responseText, "text/html");
                    const hiddenFields = Array.from(doc.querySelectorAll('form input[type="hidden"]'))
                        .map(input => ({ name: input.name, value: input.value }));
                    const typeMapping = Array.from(doc.querySelectorAll('input[name="edit-cover-art.type_id"]'))
                        .map(input => ({
                            name: input.parentElement.textContent.trim(),
                            id: input.value
                        }));
                    resolve({ hiddenFields, typeMapping });
                }
            });
        });
    };

    const postEdit = (url, formData) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: formData,
                onload: () => resolve()
            });
        });
    };

    injectButton();
})();
