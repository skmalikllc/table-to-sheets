/**
 * Table extraction core.
 * Pure functions so they can be unit-tested outside the browser (see test/extract.test.js).
 */

/** Return true for tables that are real data tables, not layout wrappers. */
function isDataTable(table, minRows = 2, minCols = 2) {
  const rows = table.rows ? Array.from(table.rows) : [];
  if (rows.length < minRows) return false;
  const maxCols = rows.reduce((m, r) => Math.max(m, r.cells.length), 0);
  if (maxCols < minCols) return false;
  // A layout table usually holds another table inside a cell.
  if (table.querySelector('table')) return false;
  return true;
}

/** Collapse whitespace, strip zero-width chars, keep visible text only. */
function cellText(cell) {
  return (cell.innerText || cell.textContent || '')
    .replace(/​/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Turn a <table> into a rectangular array of rows, honouring rowspan/colspan
 * so merged cells don't shift the columns to the left.
 */
function tableToMatrix(table) {
  const out = [];
  const pending = new Map(); // "row,col" -> value carried down by a rowspan

  Array.from(table.rows).forEach((row, r) => {
    const line = [];
    let c = 0;
    const put = (value) => {
      while (pending.has(`${r},${c}`)) {
        line[c] = pending.get(`${r},${c}`);
        pending.delete(`${r},${c}`);
        c += 1;
      }
      line[c] = value;
      c += 1;
    };

    Array.from(row.cells).forEach((cell) => {
      const value = cellText(cell);
      const colspan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10));
      const rowspan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10));
      const startCol = c;
      for (let i = 0; i < colspan; i += 1) put(i === 0 ? value : '');
      for (let dr = 1; dr < rowspan; dr += 1) {
        for (let dc = 0; dc < colspan; dc += 1) {
          pending.set(`${r + dr},${startCol + dc}`, dc === 0 ? value : '');
        }
      }
    });

    // Trailing carried-down cells at the end of a row.
    while (pending.has(`${r},${c}`)) {
      line[c] = pending.get(`${r},${c}`);
      pending.delete(`${r},${c}`);
      c += 1;
    }
    out.push(line);
  });

  const width = out.reduce((m, l) => Math.max(m, l.length), 0);
  return out.map((line) => {
    const padded = line.slice();
    for (let i = 0; i < width; i += 1) if (padded[i] === undefined) padded[i] = '';
    return padded;
  });
}

/** RFC 4180 quoting: quote when the value holds a delimiter, quote or newline. */
function csvEscape(value, delimiter = ',') {
  const s = String(value == null ? '' : value);
  if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function matrixToCsv(matrix, delimiter = ',') {
  return matrix.map((row) => row.map((v) => csvEscape(v, delimiter)).join(delimiter)).join('\r\n');
}

/** Tab-separated, safe to paste straight into Google Sheets / Excel. */
function matrixToTsv(matrix) {
  return matrix
    .map((row) => row.map((v) => String(v == null ? '' : v).replace(/\t/g, ' ').replace(/\r?\n/g, ' ')).join('\t'))
    .join('\n');
}

/** A short label so the popup can tell several tables apart. */
function describeTable(matrix, index) {
  const header = matrix[0] ? matrix[0].filter(Boolean).slice(0, 3).join(' | ') : '';
  const rows = Math.max(0, matrix.length - 1);
  const cols = matrix[0] ? matrix[0].length : 0;
  return {
    index,
    rows,
    cols,
    label: header ? header.slice(0, 60) : `Table ${index + 1}`,
  };
}

function collectTables(doc, opts = {}) {
  const minRows = opts.minRows || 2;
  const minCols = opts.minCols || 2;
  return Array.from(doc.querySelectorAll('table'))
    .filter((t) => isDataTable(t, minRows, minCols))
    .map((t) => tableToMatrix(t));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isDataTable, tableToMatrix, matrixToCsv, matrixToTsv, csvEscape, describeTable, collectTables };
}
