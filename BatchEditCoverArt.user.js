// ==UserScript==
// @name         MusicBrainz: Batch Edit Cover Art
// @namespace    https://musicbrainz.org/
// @version      1.3
// @description  Edit types and comments of all cover art images on one page.
// @author       Gemini
// @match        *://*.musicbrainz.org/release/*/cover-art
// @grant        GM_xmlhttpRequest
// @connect      musicbrainz.org
// ==/UserScript==

(function() {
    'use strict';

    const TYPES = ["Front", "Back", "Booklet", "Medium", "Tray", "Liner", "Sticker", "Other", "Watermark", "Icon", "Track"];

    let batchContainer = document.createElement('div');
    batchContainer.id = 'batch-edit-container';
    batchContainer.style = 'margin: 20px 0; padding: 20px; border: 2px solid #600; display: none; background: #f9f9f9; clear: both; font-family: sans-serif;';

    const injectButton = () => {
        // Target the "Download scans" button specifically as requested
        const downloadScansBtn = document.querySelector('.ame-download-scans');

        if (downloadScansBtn && !document.getElementById('batch-edit-trigger')) {
            const batchBtn = document.createElement('a');
            batchBtn.id = 'batch-edit-trigger';
            batchBtn.href = '#';
            batchBtn.style.cursor = 'pointer';
            batchBtn.innerHTML = '<bdi>Batch Edit Cover Art</bdi>';

            // Insert after the Download Scans button
            downloadScansBtn.parentNode.insertBefore(batchBtn, downloadScansBtn.nextSibling);

            // Add a small space/margin to match the existing layout
            batchBtn.style.marginLeft = '4px';

            batchBtn.onclick = toggleBatchMode;

            // Insert container before the image grid
            const grid = document.querySelector('.cover-art-grid') || document.querySelector('table.details') || document.querySelector('#content');
            grid.parentNode.insertBefore(batchContainer, grid);
        } else if (!downloadScansBtn) {
            // Retry in case the page elements are added via other scripts
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
            alert('No editable images found. Please ensure you are logged in.');
            return;
        }

        batchContainer.innerHTML = '<h3 style="color: #600;">Loading metadata for ' + images.length + ' images...</h3>';
        batchContainer.style.display = 'block';

        let html = '<h3 style="margin-top:0;">Batch Edit Cover Art</h3><table style="width:100%; border-collapse: collapse; background: white; border: 1px solid #ccc;">';

        for (const img of images) {
            const data = await fetchImageData(img.editUrl);
            html += `
                <tr style="border-bottom: 2px solid #ddd;" class="batch-row" data-id="${img.id}" data-edit-url="${img.editUrl}">
                    <td style="padding: 15px; width: 120px; text-align: center; border-right: 1px solid #eee; background: #fafafa;">
                        <img src="${img.thumb}" style="max-width: 100px; max-height: 100px; display: block; margin: 0 auto; border: 1px solid #ccc;">
                        <small style="color: #666; display:block; margin-top:5px;">ID: ${img.id}</small>
                    </td>
                    <td style="padding: 15px; vertical-align: top;">
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #555;">Types:</strong><br>
                            <div class="type-checkboxes" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; margin-top: 8px;">
                                ${TYPES.map(t => `
                                    <label style="font-size: 0.85em; cursor: pointer; display: flex; align-items: center;">
                                        <input type="checkbox" value="${t}" ${data.types.includes(t) ? 'checked' : ''} style="margin-right: 4px;"> ${t}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div>
                            <strong style="color: #555;">Comment:</strong>
                            <input type="text" class="batch-comment" style="width: 100%; padding: 6px; margin-top: 5px; border: 1px solid #ccc; border-radius: 3px;" value="${data.comment}">
                        </div>
                    </td>
                </tr>`;
        }

        html += `</table>
            <div style="margin-top: 20px; background: #eee; padding: 20px; border-radius: 4px; border: 1px solid #ccc;">
                <label><strong>Edit Note:</strong></label>
                <textarea id="batch-edit-note" placeholder="Edit note is required..." style="width: 100%; height: 60px; margin: 10px 0; padding: 8px; border: 1px solid #ccc;"></textarea><br>
                <button id="submit-batch-edit" class="styled-button" style="background: #600; color: white; padding: 10px 20px; font-weight: bold; border: none; cursor: pointer;">Enter edit</button>
            </div>`;

        batchContainer.innerHTML = html;
        document.getElementById('submit-batch-edit').onclick = submitAll;
    };

    const getImages = () => {
        const images = [];
        const editLinks = document.querySelectorAll('a[href*="/edit-cover-art/"]');

        editLinks.forEach(link => {
            const container = link.closest('.cover-art-grid-item, tr, .thumbnail-wrapper, div');
            const img = container ? container.querySelector('img') : null;
            const id = link.href.split('/').pop();

            images.push({
                id: id,
                editUrl: link.href,
                thumb: img ? img.src : ''
            });
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
                    const types = Array.from(doc.querySelectorAll('input[name="edit-cover-art.type_id"]:checked'))
                        .map(cb => cb.parentElement.textContent.trim());
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
