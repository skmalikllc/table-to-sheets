# Table to Sheets — CSV Exporter (Chrome MV3)

Pulls any HTML table off the current page and hands it to you as CSV or as a
clipboard payload you can paste straight into Google Sheets.

The part that usually breaks in "copy the table" tools is merged cells: a
`rowspan` silently shifts every following row one column to the left, so the
spreadsheet looks fine until someone sorts it. This extension expands
`rowspan`/`colspan` into a proper rectangle first, then exports.

## What it does

- Finds the real data tables on a page and skips layout tables (a table whose
  cells contain another table) and single-row tables.
- Previews the first rows so you pick the right table when a page has several.
- **Download CSV** — RFC 4180 quoting, UTF-8 BOM so Excel opens Urdu/accented
  text correctly, filename derived from the page title and date.
- **Copy for Sheets** — tab-separated to the clipboard; `Ctrl+V` in Sheets lands
  each value in its own cell.

## Install (unpacked)

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select this folder
3. Open a page with a table and click the toolbar icon

## Layout

```
manifest.json      MV3 manifest — activeTab, scripting, downloads, clipboardWrite
popup.html/.js     UI: table list, preview, export buttons
content.js         injected; returns the matrices to the popup
src/extract.js     pure extraction + CSV/TSV logic (no browser APIs)
test/              node:test unit tests over jsdom
```

`src/extract.js` holds no browser APIs on purpose, so the awkward parts —
merged cells, quoting, table detection — are unit-tested outside Chrome.

## Tests

```bash
npm install
node --test test/extract.test.js
```

7 tests cover rowspan/colspan expansion, CSV quoting (commas, quotes,
newlines), TSV flattening, and table detection.

## Permissions, and why

| Permission | Reason |
|---|---|
| `activeTab` + `scripting` | read tables from the tab you clicked on, only on click |
| `downloads` | save the CSV |
| `clipboardWrite` | the "Copy for Sheets" button |

No host permissions, no background page, no network calls — nothing leaves the
browser.
