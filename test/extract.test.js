const assert = require('node:assert');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { tableToMatrix, matrixToCsv, matrixToTsv, collectTables, describeTable } = require('../src/extract.js');

const dom = (html) => new JSDOM(`<!doctype html><body>${html}</body>`).window.document;

test('plain table becomes a matrix', () => {
  const doc = dom(`<table>
    <tr><th>Name</th><th>Email</th></tr>
    <tr><td>Ayesha</td><td>a@example.com</td></tr>
    <tr><td>Bilal</td><td>b@example.com</td></tr>
  </table>`);
  const m = tableToMatrix(doc.querySelector('table'));
  assert.deepStrictEqual(m, [
    ['Name', 'Email'],
    ['Ayesha', 'a@example.com'],
    ['Bilal', 'b@example.com'],
  ]);
});

test('rowspan carries the value down instead of shifting columns', () => {
  const doc = dom(`<table>
    <tr><td rowspan="2">Lahore</td><td>Q1</td><td>100</td></tr>
    <tr><td>Q2</td><td>120</td></tr>
    <tr><td>Karachi</td><td>Q1</td><td>90</td></tr>
  </table>`);
  const m = tableToMatrix(doc.querySelector('table'));
  assert.deepStrictEqual(m, [
    ['Lahore', 'Q1', '100'],
    ['Lahore', 'Q2', '120'],
    ['Karachi', 'Q1', '90'],
  ]);
});

test('colspan pads the row to a rectangle', () => {
  const doc = dom(`<table>
    <tr><td colspan="3">2026 Summary</td></tr>
    <tr><td>A</td><td>B</td><td>C</td></tr>
  </table>`);
  const m = tableToMatrix(doc.querySelector('table'));
  assert.deepStrictEqual(m[0], ['2026 Summary', '', '']);
  assert.strictEqual(m[1].length, 3);
});

test('csv quotes commas, quotes and newlines', () => {
  const csv = matrixToCsv([['plain', 'has,comma', 'say "hi"'], ['line\nbreak', 'x', 'y']]);
  assert.strictEqual(
    csv,
    'plain,"has,comma","say ""hi"""\r\n"line\nbreak",x,y'
  );
});

test('tsv keeps one row per line for Sheets paste', () => {
  const tsv = matrixToTsv([['a', 'b'], ['c\td', 'e']]);
  assert.strictEqual(tsv, 'a\tb\nc d\te');
});

test('layout tables and one-row tables are skipped', () => {
  const doc = dom(`
    <table><tr><td><table><tr><td>x</td><td>y</td></tr><tr><td>1</td><td>2</td></tr></table></td></tr></table>
    <table><tr><td>only</td><td>one row</td></tr></table>
    <table><tr><th>ok</th><th>good</th></tr><tr><td>1</td><td>2</td></tr></table>
  `);
  const found = collectTables(doc);
  assert.strictEqual(found.length, 2); // the nested data table + the valid one
  assert.ok(found.every((m) => m.length >= 2));
});

test('describeTable labels from the header row', () => {
  const info = describeTable([['Name', 'Email', 'City', 'Zip'], ['a', 'b', 'c', 'd']], 0);
  assert.strictEqual(info.label, 'Name | Email | City');
  assert.strictEqual(info.rows, 1);
  assert.strictEqual(info.cols, 4);
});
