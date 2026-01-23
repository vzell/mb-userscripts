// ==UserScript==
// @name         VZ: MusicBrainz - Show All (Consolidated)
// @namespace    https://github.com/vzell/mb-userscripts
// @version      1.0.0+2026-01-23
// @description  Consolidated userscript: Events, Works, Recordings, Release Groups, Releases (artist + RG)
// @author       Gemini & ChatGPT (directed by vzell)
// @tag          AI generated
// @homepageURL  https://github.com/vzell/mb-userscripts
// @supportURL   https://github.com/vzell/mb-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAll.user.js
// @updateURL    https://raw.githubusercontent.com/vzell/mb-userscripts/master/ShowAll.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbrainz.org
// @match        *://*.musicbrainz.org/*
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

/*
 ============================================================
  CONSOLIDATED DISPATCHER
 ============================================================
  This file replaces:
   - ShowAllEvents
   - ShowAllWorks
   - ShowAllRecordingsInWorks
   - ShowAllReleaseGroups
   - ShowAllReleases (artist)
   - ShowAllReleasesInReleaseGroups

  Dispatcher logic selects the correct handler based on URL.
 ============================================================
*/

(function () {
  'use strict';

  /* ------------------------------------------------------------
   * Shared helpers
   * ---------------------------------------------------------- */

  function injectButton(target, label) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'mb-show-all-btn';
    btn.style.marginLeft = '10px';
    btn.style.fontSize = '0.5em';
    btn.style.padding = '2px 6px';
    btn.style.verticalAlign = 'middle';
    btn.style.cursor = 'pointer';
    btn.type = 'button';
    target.appendChild(btn);
    return btn;
  }

  function injectCommonCSS() {
    if (document.getElementById('mb-show-all-style')) return;
    const style = document.createElement('style');
    style.id = 'mb-show-all-style';
    style.textContent = `
      .mb-show-all-btn:active {
        transform: translateY(1px);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
      }
      .mb-show-all-btn:disabled {
        background-color: #ddd !important;
        border-color: #bbb !important;
        cursor: default !important;
      }
      .sort-icon {
        font-size: 1.2em;
        margin-left: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  function fetchHtml(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload: r => resolve(r.responseText),
        onerror: e => reject(e)
      });
    });
  }

  function removePagination() {
    document.querySelectorAll('nav.pagination, ul.pagination').forEach(n => n.remove());
  }

  function makeSortable(table, rowsRef) {
    let last = -1;
    let asc = true;
    const headers = table.querySelectorAll('thead th');

    headers.forEach((th, idx) => {
      if (th.classList.contains('checkbox-cell')) return;
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        if (last === idx) asc = !asc; else { asc = true; last = idx; }
        headers.forEach(h => h.querySelector('.sort-icon')?.remove());
        const ic = document.createElement('span');
        ic.className = 'sort-icon';
        ic.textContent = asc ? ' ▲' : ' ▼';
        th.appendChild(ic);
        rowsRef.sort((a, b) => {
          const A = a.cells[idx]?.textContent.trim().toLowerCase() || '';
          const B = b.cells[idx]?.textContent.trim().toLowerCase() || '';
          return asc ? A.localeCompare(B) : B.localeCompare(A);
        });
        const tb = table.querySelector('tbody');
        tb.innerHTML = '';
        rowsRef.forEach(r => tb.appendChild(r));
      });
    });
  }

  /* ------------------------------------------------------------
   * HANDLERS
   * ---------------------------------------------------------- */

  const handlers = [];

  /* EVENTS (artist/events) */
  handlers.push({
    match: () => location.pathname.match(/^\/artist\/[^/]+\/events/),
    run: async () => {
      const h1 = document.querySelector('.artistheader h1');
      if (!h1) return;
      injectCommonCSS();
      const btn = injectButton(h1, 'Show all events');
      let loaded = false;
      btn.onclick = async () => {
        if (loaded) return;
        loaded = true;
        btn.disabled = true;
        const table = document.querySelector('table.tbl');
        const all = [];
        let max = 1;
        document.querySelectorAll('ul.pagination a').forEach(a => {
          const p = new URL(a.href, location.origin).searchParams.get('page');
          if (p) max = Math.max(max, +p);
        });
        const base = location.href.split('?')[0];
        for (let p = 1; p <= max; p++) {
          btn.textContent = `Loading ${p}/${max}…`;
          const doc = new DOMParser().parseFromString(await fetchHtml(`${base}?page=${p}`), 'text/html');
          doc.querySelectorAll('table.tbl tbody tr').forEach(r => r.cells.length > 1 && all.push(document.importNode(r, true)));
        }
        table.querySelector('tbody').innerHTML = '';
        all.forEach(r => table.querySelector('tbody').appendChild(r));
        removePagination();
        makeSortable(table, all);
        btn.textContent = `All ${all.length} events`;
        btn.disabled = false;
      };
    }
  });

  /* WORKS (artist/works) */
  handlers.push({
    match: () => location.pathname.match(/^\/artist\/[^/]+\/works/),
    run: async () => {
      const h1 = document.querySelector('.artistheader h1');
      if (!h1) return;
      injectCommonCSS();
      const btn = injectButton(h1, 'Show all works');
      let loaded = false;
      btn.onclick = async () => {
        if (loaded) return;
        loaded = true;
        btn.disabled = true;
        const table = document.querySelector('table.tbl.mergeable-table');
        const all = [];
        let max = 1;
        document.querySelectorAll('ul.pagination a').forEach(a => {
          const p = new URL(a.href, location.origin).searchParams.get('page');
          if (p) max = Math.max(max, +p);
        });
        const base = location.href.split('?')[0];
        let relIdx = -1;
        for (let p = 1; p <= max; p++) {
          btn.textContent = `Loading ${p}/${max}…`;
          const doc = new DOMParser().parseFromString(await fetchHtml(`${base}?page=${p}`), 'text/html');
          if (relIdx === -1) {
            doc.querySelectorAll('thead th').forEach((th,i)=>th.textContent.trim()==='Relationships'&&(relIdx=i));
          }
          doc.querySelectorAll('tbody tr').forEach(r => {
            const c = document.importNode(r, true);
            if (relIdx !== -1 && c.cells[relIdx]) c.deleteCell(relIdx);
            all.push(c);
          });
        }
        table.querySelector('tbody').innerHTML = '';
        all.forEach(r => table.querySelector('tbody').appendChild(r));
        table.querySelectorAll('thead th').forEach(th=>th.textContent.trim()==='Relationships'&&th.remove());
        removePagination();
        makeSortable(table, all);
        btn.textContent = `All ${all.length} works`;
        btn.disabled = false;
      };
    }
  });

  /* ------------------------------------------------------------
   * ADDITIONAL HANDLERS (PORTED VERBATIM)
   * ---------------------------------------------------------- */

  /* ARTIST → RELEASES */
  handlers.push({
    match: () => location.pathname.match(/^\/artist\/[^/]+\/releases/),
    run: async () => {
      const h1 = document.querySelector('.artistheader h1');
      if (!h1) return;
      injectCommonCSS();
      const btn = injectButton(h1, 'Show all releases');
      let loaded = false;

      btn.onclick = async () => {
        if (loaded) return;
        loaded = true;
        btn.disabled = true;

        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(d => d.style.display = 'none');

        const table = document.querySelector('table.tbl');
        const all = [];
        let max = 1;
        let relIdx = -1;

        document.querySelectorAll('ul.pagination a').forEach(a => {
          const p = new URL(a.href, location.origin).searchParams.get('page');
          if (p) max = Math.max(max, +p);
        });

        const base = location.href.split('?')[0];
        for (let p = 1; p <= max; p++) {
          btn.textContent = `Loading ${p}/${max}…`;
          const doc = new DOMParser().parseFromString(await fetchHtml(`${base}?page=${p}`), 'text/html');

          if (relIdx === -1) {
            doc.querySelectorAll('thead th').forEach((th, i) => th.textContent.trim() === 'Relationships' && (relIdx = i));
          }

          doc.querySelectorAll('tbody tr').forEach(r => {
            if (r.cells.length > 1) {
              const c = document.importNode(r, true);
              if (relIdx !== -1 && c.cells[relIdx]) c.deleteCell(relIdx);
              all.push(c);
            }
          });
        }

        table.querySelector('tbody').innerHTML = '';
        all.forEach(r => table.querySelector('tbody').appendChild(r));
        table.querySelectorAll('thead th').forEach(th => th.textContent.trim() === 'Relationships' && th.remove());
        removePagination();
        makeSortable(table, all);
        btn.textContent = `All ${all.length} releases`;
        btn.disabled = false;
      };
    }
  });

  /* ARTIST → RELEASE GROUPS */
  handlers.push({
    match: () => location.pathname.match(/^\/artist\/[^/]+$/),
    run: async () => {
      if (location.pathname.match(/\/(releases|recordings|works|events)$/)) return;
      const h1 = document.querySelector('.artistheader h1');
      if (!h1) return;
      injectCommonCSS();
      const btn = injectButton(h1, 'Show all release groups');
      let loaded = false;

      btn.onclick = async () => {
        if (loaded) return;
        loaded = true;
        btn.disabled = true;

        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(d => d.style.display = 'none');

        const container = document.querySelector('#content');
        const byType = new Map();
        let max = 1;

        document.querySelectorAll('ul.pagination a').forEach(a => {
          const p = new URL(a.href, location.origin).searchParams.get('page');
          if (p) max = Math.max(max, +p);
        });

        const base = location.href.split('?')[0];
        for (let p = 1; p <= max; p++) {
          btn.textContent = `Loading ${p}/${max}…`;
          const doc = new DOMParser().parseFromString(await fetchHtml(`${base}?page=${p}`), 'text/html');

          doc.querySelectorAll('#content h3').forEach(h3 => {
            const title = h3.textContent.trim();
            const table = h3.nextElementSibling;
            if (!table || !table.classList.contains('tbl')) return;

            if (!byType.has(title)) {
              const clone = document.importNode(table, true);
              clone.querySelector('tbody').innerHTML = '';
              byType.set(title, { table: clone, rows: [] });
            }

            table.querySelectorAll('tbody tr').forEach(r => r.cells.length > 1 && byType.get(title).rows.push(document.importNode(r, true)));
          });
        }

        container.querySelectorAll('h3, table.tbl').forEach(e => e.remove());
        removePagination();

        byType.forEach((state, title) => {
          const h3 = document.createElement('h3');
          h3.textContent = title;
          container.appendChild(h3);
          state.rows.forEach(r => state.table.querySelector('tbody').appendChild(r));
          container.appendChild(state.table);
          makeSortable(state.table, state.rows);
        });

        btn.textContent = 'All release groups';
        btn.disabled = false;
      };
    }
  });

  /* RELEASE GROUP → RELEASES */
  handlers.push({
    match: () => location.pathname.match(/^\/release-group\/[^/]+/),
    run: async () => {
      const h1 = document.querySelector('.rgheader h1');
      if (!h1) return;
      injectCommonCSS();
      const btn = injectButton(h1, 'Show all releases');
      let loaded = false;

      btn.onclick = async () => {
        if (loaded) return;
        loaded = true;
        btn.disabled = true;

        document.querySelectorAll('div.jesus2099userjs154481bigbox').forEach(d => d.style.display = 'none');

        const table = document.querySelector('table.tbl.mergeable-table');
        const grouped = new Map();
        let relIdx = -1;

        const urls = new Set([location.href]);
        document.querySelectorAll('ul.pagination a').forEach(a => a.href.includes('page=') && urls.add(a.href));

        for (const url of [...urls].sort()) {
          const doc = new DOMParser().parseFromString(await fetchHtml(url), 'text/html');
          if (relIdx === -1) {
            doc.querySelectorAll('thead th').forEach((th,i)=>th.textContent.trim()==='Relationships'&&(relIdx=i));
          }

          let current = 'Unknown';
          doc.querySelectorAll('tbody tr').forEach(r => {
            if (r.classList.contains('subh')) {
              current = r.textContent.trim();
            } else {
              if (!grouped.has(current)) grouped.set(current, []);
              const c = document.importNode(r, true);
              if (relIdx !== -1 && c.cells[relIdx]) c.deleteCell(relIdx);
              grouped.get(current).push(c);
            }
          });
        }

        table.querySelector('tbody').innerHTML = '';
        table.querySelectorAll('thead th').forEach(th => th.textContent.trim() === 'Relationships' && th.remove());

        grouped.forEach((rows, cat) => {
          const sub = document.createElement('tr');
          sub.className = 'subh';
          sub.innerHTML = `<th></th><th colspan="${table.querySelectorAll('thead th').length - 1}">${cat}</th>`;
          table.querySelector('tbody').appendChild(sub);
          rows.forEach(r => table.querySelector('tbody').appendChild(r));
        });

        removePagination();
        makeSortable(table, [...grouped.values()].flat());
        btn.textContent = 'All releases';
        btn.disabled = false;
      };
    }
  });

  /* WORK → RECORDINGS */
  handlers.push({
    match: () => location.pathname.match(/^\/work\/[^/]+/),
    run: async () => {
      const params = new URL(location.href).searchParams;
      if (!params.get('link_type_id')) return;

      const h1 = document.querySelector('h1');
      if (!h1) return;
      injectCommonCSS();
      const btn = injectButton(h1, 'Show all recordings');
      let loaded = false;

      btn.onclick = async () => {
        if (loaded) return;
        loaded = true;
        btn.disabled = true;

        const table = document.querySelector('table.tbl');
        const all = [];
        let max = 1;

        document.querySelectorAll('ul.pagination a').forEach(a => {
          const p = new URL(a.href, location.origin).searchParams.get('page');
          if (p) max = Math.max(max, +p);
        });

        const base = location.origin + location.pathname;
        for (let p = 1; p <= max; p++) {
          btn.textContent = `Loading ${p}/${max}…`;
          const doc = new DOMParser().parseFromString(await fetchHtml(`${base}?${params}&page=${p}`), 'text/html');
          doc.querySelectorAll('tbody tr').forEach(r => r.cells.length > 1 && all.push(document.importNode(r, true)));
        }

        table.querySelector('tbody').innerHTML = '';
        all.forEach(r => table.querySelector('tbody').appendChild(r));
        removePagination();
        makeSortable(table, all);
        btn.textContent = `All ${all.length} recordings`;
        btn.disabled = false;
      };
    }
  });


  /* ------------------------------------------------------------
   * DISPATCH
   * ---------------------------------------------------------- */

  handlers.some(h => {
    if (h.match()) {
      h.run();
      return true;
    }
    return false;
  });

})();
