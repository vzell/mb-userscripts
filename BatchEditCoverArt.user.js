// ==UserScript==
// @name         MusicBrainz: Batch Edit Cover Art
// @namespace    https://musicbrainz.org/
// @version      1.5
// @description  Edit types and comments of all cover art images on one page.
// @author       Gemini
// @match        *://*.musicbrainz.org/release/*/cover-art
// @grant        GM_xmlhttpRequest
// @connect      musicbrainz.org
// ==/UserScript==

(function() {
    'use strict';

    const TYPES = [
        "Front", "Back", "Booklet", "Medium", "Obi", "Spine", "Track", "Tray",
        "Sticker", "Poster", "Liner", "Watermark", "Raw/Unedited",
        "Matrix/Runout", "Top", "Bottom", "Panel", "Other"
    ];

    let batchContainer = document.createElement('div');
    batchContainer.id = 'batch-edit-container';
    batchContainer.style = 'margin: 20px 0; padding: 20px; border: 2px solid #600; display: none; background: #f9f9f9; clear: both; font-family: sans-serif;';

    const injectButton = () => {
        const downloadScansBtn = document.querySelector('.ame-download-scans');

        if (downloadScansBtn && !document.getElementById('batch-edit-trigger')) {
            const batchBtn = document.createElement('a');
            batchBtn.id = 'batch-edit-trigger';
            batchBtn.href = '#';
            batchBtn.style.cursor = 'pointer';
            batchBtn.style.marginLeft = '4px';
            batchBtn.innerHTML = '<bdi>Batch Edit Cover Art</bdi>';

            downloadScansBtn.parentNode.insertBefore(batchBtn, downloadScansBtn.nextSibling);
            batchBtn.onclick = toggleBatchMode;

            const content = document.querySelector('#content');
            content.insertBefore(batchContainer, content.querySelector('.cover-art-grid') || content.querySelector('table.details') || content.firstChild);
        } else if (!downloadScansBtn) {
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin:0;">Batch Edit Cover Art</h3>
                <button id="copy-first-types" style="cursor:pointer; padding: 4px 8px; font-size: 0.85em;">Copy 1st image's types to all</button>
            </div>
            <table style="width:100%; border-collapse: collapse; background: white; border: 1px solid #ccc;">`;

        for (const img of images) {
            const data = await fetchImageData(img.editUrl);
            html += `
                <tr style="border-bottom: 2px solid #ddd;" class="batch-row" data-id="${img.id}" data-edit-url="${img.editUrl}">
                    <td style="padding: 15px; width: 120px; text-align: center; border-right: 1px solid #eee; background: #fafafa; vertical-align: top;">
                        <img src="${img.thumb}" style="max-width: 100px; max-height: 100px; border: 1px solid #ccc; display: block; margin: 0 auto;">
                        <small style="color: #666; display:block; margin-top:5px;">ID: ${img.id}</small>
                    </td>
                    <td style="padding: 15px; vertical-align: top;">
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #555;">Types:</strong>
                            <div class="type-checkboxes" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 5px; margin-top: 8px;">
                                ${TYPES.map(t => `
                                    <label style="font-size: 0.85em; cursor: pointer; display: flex; align-items: center; white-space: nowrap;">
                                        <input type="checkbox" value="${t}" ${data.types.includes(t) ? 'checked' : ''} style="margin-right: 4px;"> ${t}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div style="margin-top: 10px;">
                            <strong style="color: #555;">Comment:</strong>
                            <input type="text" class="batch-comment" style="width: 100%; padding: 6px; margin-top: 5px; border: 1px solid #ccc; border-radius: 3px;" value="${data.comment}">
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

        // Helper: Copy types from first image logic
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

        document.getElementById('submit-batch-edit').onclick = submitAll;
    };

    const getImages = () => {
        const images = [];
        const editLinks = document.querySelectorAll('a[href*="/edit-cover-art/"]');
        editLinks.forEach(link => {
            const container = link.closest('.cover-art-grid-item, tr, .thumbnail-wrapper, div');
            const img = container ? container.querySelector('img') : null;
            const id = link.href.split('/').pop();
            // Fallback for lazy-loaded images or different attribute names
            const thumbUrl = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
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
                    const types = Array.from(checkedCheckboxes).map(cb => cb.parentElement.textContent.trim());
                    resolve({ comment, types });
                }
            });
        });
    };

    const submitAll = async () => {
        const rows = document.querySelectorAll('.batch-row');
        const editNote = document.getElementById('batch-edit-note').value;
        const btn = document.getElementById('submit-batch-edit');

        if (!editNote.trim()) {
            alert('Please provide an edit note.');
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Submitting...';

        for (const row of rows) {
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
