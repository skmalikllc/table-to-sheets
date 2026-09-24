/* Popup controller: asks the active tab for its tables, previews one, exports it. */

let tables = [];      // array of matrices
let meta = [];        // {index, rows, cols, label}
let selected = 0;
let pageTitle = 'table';

const $ = (id) => document.getElementById(id);

function setStatus(text) {
  $('status').textContent = text || '';
}

function renderList() {
  const list = $('list');
  if (!meta.length) {
    list.innerHTML = '<div class="empty">No data tables found on this page.</div>';
    $('copy').disabled = true;
    $('csv').disabled = true;
    return;
  }
  list.innerHTML = '';
  meta.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'row' + (i === selected ? ' sel' : '');
    row.innerHTML = `<span class="name"></span><span class="dim">${m.rows} × ${m.cols}</span>`;
    row.querySelector('.name').textContent = m.label;
    row.addEventListener('click', () => { selected = i; renderList(); renderPreview(); });
    list.appendChild(row);
  });
  $('count').textContent = `${meta.length} table${meta.length === 1 ? '' : 's'}`;
}

function renderPreview() {
  const matrix = tables[selected];
  const box = $('preview');
  if (!matrix) { box.hidden = true; return; }
  const head = matrix[0] || [];
  const body = matrix.slice(1, 6);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  box.innerHTML =
    '<table><thead><tr>' + head.map((h) => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>' +
    body.map((r) => '<tr>' + r.map((v) => `<td>${esc(v)}</td>`).join('') + '</tr>').join('') +
    '</tbody></table>';
  box.hidden = false;
}

function filenameFor(title) {
  const base = (title || 'table').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base || 'table'}-${stamp}.csv`;
}

async function load() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pageTitle = tab?.title || 'table';
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/extract.js', 'content.js'],
    });
    tables = (result && result.tables) || [];
    meta = (result && result.meta) || [];
  } catch (err) {
    setStatus('Cannot read this page (try a normal http/https tab).');
    tables = []; meta = [];
  }
  renderList();
  renderPreview();
}

$('copy').addEventListener('click', async () => {
  const matrix = tables[selected];
  if (!matrix) return;
  const tsv = matrix.map((r) => r.map((v) => String(v).replace(/\t/g, ' ')).join('\t')).join('\n');
  await navigator.clipboard.writeText(tsv);
  setStatus('Copied — paste into Google Sheets with Ctrl+V.');
});

$('csv').addEventListener('click', () => {
  const matrix = tables[selected];
  if (!matrix) return;
  const esc = (v) => (/[",\r\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = '﻿' + matrix.map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  chrome.downloads.download({ url, filename: filenameFor(pageTitle) }, () => {
    setStatus('Saved to your Downloads folder.');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
});

load();
