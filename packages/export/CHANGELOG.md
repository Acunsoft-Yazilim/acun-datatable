# @acunsoft/datatable-export

## 0.6.0

### Patch Changes

- @acunsoft/datatable-core@0.6.0

## 0.5.0

### Patch Changes

- 98f3abd: `readXlsx` and `streamXlsx` read a damaged sheet in linear time: elements that never close (cells, rows, strings) were searched to the end of the text once each, so a small crafted file could keep the reader busy for seconds (40,000 unclosed tags: 1.2–2 s, growing with the square of their number).
- 6b4f1f6: Every export also has a `default` condition, so `require()` finds the packages (Node 22's `require(esm)`, Jest in CommonJS mode, TypeScript `node16` CommonJS files); it failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- 43e068b: `tableToSheet(table, { rows: 'selected' })` gives the selected rows among the matching ones, in the current order, as print does and as DataTables exports them; it gave them in data order, with selected rows the search or filters hid.
- 97c7ec1: `toXlsx` drops an apostrophe at either end of the sheet name, which Excel refuses (the file opened in repair mode). `toCsv`'s documentation says that text its formula guard prefixed with `'` reads back with it.
- 34102a2: `streamCsv` reads the header line once while it looks for the delimiter (it read everything so far again with each piece), and refuses a field longer than 1,048,576 characters: a quote that never closes held the whole file and took 30 s for 24 MB; now it stops at once with an `ImportError`.
- 8ac4c5c: `readXlsx` reads a `t="d"` cell holding only a day as that local day (it was UTC midnight: the day before west of UTC), and `importRows` writes a date in a row error as its local day (`2026-10-23`, not `2026-10-22T21:00:00.000Z` in Turkey).
- 4c333f3: `toXlsx` writes a literal `_xHHHH_` in text as Excel does (`_x005F_x0041_`), so it reads back as written instead of as an escaped character (`_x0041_` came back as `A`).
- 40195f6: `readXlsx` / `streamXlsx`: a date-styled number past any date (`9e300` in a crafted file) is kept as the number instead of an Invalid Date, which made `importRows` throw a RangeError instead of reporting the cell; `toCsv` writes an Invalid Date as an empty cell, not `NaN-NaN-NaN`.
- 158c6d7: `readXlsx` / `openZip`: a new `maxTotalBytes` (default 100 MB) bounds everything read out of one archive, not only each entry (a workbook could inflate 50 MB in each of its parts), and a stored entry is checked by its real size, not the size it declares.
- Updated dependencies [6b4f1f6]
- Updated dependencies [c7f8a8a]
- Updated dependencies [3422663]
- Updated dependencies [b7659b3]
- Updated dependencies [8d46546]
  - @acunsoft/datatable-core@0.5.0

## 0.4.0

Not published on npm: these changes reach npm with 0.5.0.

### Patch Changes

- Updated dependencies [b758334]
- Updated dependencies [5753f1f]
- Updated dependencies [4eeae3d]
- Updated dependencies [71e021a]
- Updated dependencies [b55e381]
- Updated dependencies [f3b749f]
- Updated dependencies [ade0663]
  - @acunsoft/datatable-core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [f00047a]
  - @acunsoft/datatable-core@0.3.0

## 0.2.1

### Patch Changes

- Published from GitHub Actions through npm trusted publishing, with provenance attestations that link each package to its source commit. No code changes.
- Updated dependencies
  - @acunsoft/datatable-core@0.2.1

## 0.2.0

### Minor Changes

- 54866ed: New package `@acunsoft/datatable-export`: `tableToSheet`, `toCsv` (formula-injection guard), `toXlsx` (real Excel workbooks without dependencies), `parseCsv`, `readXlsx` (size-limited, zip-bomb safe) and `importRows` (typed, validated import with line-numbered errors). DOM: `downloadFile`.
- 45ac8e9: Built-in German, French and Spanish texts next to English and Turkish (`labelsDe`, `labelsFr`, `labelsEs`, `resolveLabels(locale)`), with singular/plural forms and locale digit grouping (fixes "1 rows"). Import problems carry a stable `code` and `type`, and `importRows` takes `locale` and `messages`.

### Patch Changes

- Updated dependencies [60e548c]
  - @acunsoft/datatable-core@0.2.0
