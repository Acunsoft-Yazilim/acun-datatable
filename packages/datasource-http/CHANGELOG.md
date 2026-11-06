# @acunsoft/datatable-http

## 0.6.0

### Patch Changes

- @acunsoft/datatable-core@0.6.0

## 0.5.0

### Patch Changes

- 6b4f1f6: Every export also has a `default` condition, so `require()` finds the packages (Node 22's `require(esm)`, Jest in CommonJS mode, TypeScript `node16` CommonJS files); it failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- c7f8a8a: Cursor paging is set once, on the table: a table created with `paging: 'cursor'` gives every query `paging: 'cursor'` (new optional `TableQuery.paging`), and `createHttpDataSource` sends `paging=cursor` for it without its own option. Before, the table and the source each needed `paging: 'cursor'`, and with only the table set the server answered page numbers and the table never got past page 1. The source's `paging` option stays for calling `getPage` yourself; with it, page 2 or later without a cursor is now refused with a clear error instead of fetching page 1 again.
- b7659b3: A space typed after the search words no longer sends the same request again nor goes back to page 1: the search text is kept as typed, and `connectTable` does not ask for the query whose answer is on its way or on screen.
- a5e1cee: Fixes:
  
  - React: `useDataTable({ data: orders.filter(…) })` — a new array on every render — no longer renders without end. A new array of the same records is not applied again when the table itself caused the render; a new array from the app still is.
  - `@acunsoft/datatable`: server-side exports (Excel, CSV, copy, print) ask for `exportPageSize` rows a request (new option, default 100, the back ends' default most) instead of 1,000, which the Node back end refused and Laravel's DataTables answer cut to 100 rows. A back end that answers fewer rows than asked is paged by what it answers.
  - A filter day (`2026-10-23`) on a date-time column is the user's day: `datatable-http` sends the browser's time zone as `tz` with day filters, and `readTableQuery` takes the day there (clock changes included); `readTableQuery(…, { timeZone })` lets the server decide. Without `tz` nothing changes. An exact instant on the server's midnight is no longer taken for a whole day. `TableDay` is exported for your own query builders.
- Updated dependencies [6b4f1f6]
- Updated dependencies [c7f8a8a]
- Updated dependencies [3422663]
- Updated dependencies [b7659b3]
- Updated dependencies [8d46546]
  - @acunsoft/datatable-core@0.5.0

## 0.4.0

Not published on npm: these changes reach npm with 0.5.0.

### Minor Changes

- 5753f1f: Cursor (keyset) paging for server tables: `createDataTable({ mode: 'server',
  paging: 'cursor' })` keeps the cursor of every page seen and sends the
  previous page's `nextCursor` (`TableQuery.cursor`); the pager offers those
  pages and the next one. `createHttpDataSource({ paging: 'cursor' })` sends
  `paging=cursor&cursor=…`. `AcunDataTable`: `pagination: { cursor: true }`.
- 830b3cc: DataTables' server-side protocol: `serializeDataTablesQuery()` and
  `fromDataTablesResponse()` talk to existing DataTables back ends (draw,
  start, length, order, columns, search[value]); `AcunDataTable` sends it with
  `ajax: { url, protocol: 'datatables' }`.

### Patch Changes

- b758334: Resizing and moving columns. Core: `columnOrder` and `columnWidths` state
  with `moveColumn`, `setColumnOrder`, `setColumnWidth`, `setColumnWidths`
  (`COLUMN_WIDTH_LIMITS`), kept by `persistState`. Renderers:
  `resizableColumns` (drag handles, ←/→, Delete to reset) and
  `reorderableColumns` (drag headers; up/down buttons and "Reset columns" in the
  column menu), shared through `columnTools()`. `AcunDataTable`: `columnResize`,
  `columnReorder`. `connectTable` no longer re-queries the server when only the
  column layout changes (visibility, order, widths). Menus stay open when a
  control inside them re-renders.
- Updated dependencies [b758334]
- Updated dependencies [5753f1f]
- Updated dependencies [4eeae3d]
- Updated dependencies [71e021a]
- Updated dependencies [b55e381]
- Updated dependencies [f3b749f]
- Updated dependencies [ade0663]
  - @acunsoft/datatable-core@0.4.0

## 0.3.0

### Minor Changes

- f00047a: Professional, DataTables-like layout.
  
  - **Breaking:** `renderPagination` (and Vue `AcunPagination`, React `Pagination`)
    now renders numbered pages (`‹ 1 … 4 5 6 … 20 ›`) with icon arrows, optional
    first/last buttons (`firstLast`), `siblings`, `boundaries` and `locale`. The
    page-size select moved to the new `renderPageSize` / `AcunPageSize` /
    `PageSize`, the status text to `renderPageInfo` / `AcunPageInfo` / `PageInfo`
    (`Showing 1 to 25 of 5,000 rows`, Turkish `Toplam: 5.000 kaydın 1 ile 25
    arasını gösteriyor`). The labels `pageStatus` and `pageStatusOpen` are
    replaced by `pageInfo`, `pageInfoOpen`, `pageInfoEmpty`, `page`, `first` and
    `last`; the class names `adt-pagination`, `adt-status` and `adt-page-size`
    by `adt-paging`, `adt-info` and `adt-length`.
  - New `renderDataTable`: the table between a top bar (page size and search on
    the left, column menu on the right) and a bottom bar (row range on the left,
    pages on the right), arranged with a `layout` option that also takes your own
    controls; `locale` picks the built-in texts.
  - New `getPageItems` in the core: the pager algorithm, with a fixed number of
    buttons so the pager never changes width.
  - Search has a search icon, a visually hidden label and a default placeholder
    (`Search…`); the column menu has an icon and closes with Escape or a click
    outside.
  - `styles.css` redesigned: panels, uppercase headers with sort marks, square page
    buttons with an accent current page, consistent control heights, new tokens
    (`--adt-surface`, `--adt-control-radius`, `--adt-control-height`, `--adt-gap`,
    `--adt-head-transform`, …), native controls follow dark mode, a print style
    and a responsive layout (stacked bars, a compact pager and cards on phones).
  - Narrow screens: `responsive: 'cards' | 'scroll' | 'collapse' | 'modal'` on
    `renderTable` / `renderDataTable`, Vue `AcunDataTable` and React `DataTable`.
    `collapse` hides lower-priority columns (new `ColumnDef.priority`: 1 always,
    2 below 640px, 3 below 960px) behind a button that opens them below the row;
    `modal` shows every value of the row in an accessible `<dialog>`.
  - Sizes: `size: 'sm' | 'md' | 'lg'` (classes `adt-size--sm` / `adt-size--lg`).
  - `--adt-*` defaults are declared only on the outermost element, so values set
    on `.adt` now reach every part.
  - Number and decimal columns are right-aligned with tabular digits (`adt-num`).
  - New package `@acunsoft/datatable`: `new AcunDataTable('#table', { serverSide,
    ajax: { url, method }, pagination, sorting, searching, language, fixedHeader,
    … })` in the spirit of DataTables, on an existing `<table>`, rows, a JSON
    file or a server; also a single `<script>` build (`acun-datatable.min.js`).
  - `@acunsoft/datatable-http`: `method: 'POST'` sends the query as a form body.
  - Sticky header: `stickyHeader` (DataTables `fixedHeader`) and `scrollY` (a
    fixed height scrolling inside); `multiSort: false` sorts by one column only.

### Patch Changes

- Updated dependencies [f00047a]
  - @acunsoft/datatable-core@0.3.0

## 0.2.1

### Patch Changes

- Published from GitHub Actions through npm trusted publishing, with provenance attestations that link each package to its source commit. No code changes.
- Updated dependencies
  - @acunsoft/datatable-core@0.2.1

## 0.2.0

### Patch Changes

- Updated dependencies [60e548c]
  - @acunsoft/datatable-core@0.2.0

## 0.1.0

### Minor Changes

- 7387b2b: First public release: headless core (typed columns, natural and multi-column sorting, Turkish-aware smart search and filter operators, pagination, selection, local and server mode), HTTP data source with latest-request-wins runner, and an accessible DOM renderer with an optional stylesheet.

### Patch Changes

- Updated dependencies [7387b2b]
  - @acunsoft/datatable-core@0.1.0
