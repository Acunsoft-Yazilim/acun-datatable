# @acunsoft/datatable

## 0.5.0

### Minor Changes

- ae0f9bc: `<acun-datatable>`: every attribute is also a property (`pageSize`, `serverSide`, `scrollY`, …); properties set before the element is defined are taken over; `page-size` changes in place and the view attributes (`language`, `responsive`, `size`, `filter-panel`, `fixed-header`, `scroll-y`, `virtual`, `state-save`) rebuild the table keeping the page, sorting, filters, search, selection and columns (before, every attribute started over); `adt-change` and `adt-ready` bubble; new `adt-error`; `scroll-y="480"` means pixels (it failed before); two `state-save` tables without an id no longer share a key; `HTMLElementTagNameMap` and typed events. `AcunDataTable` takes `initialState`.

### Patch Changes

- c439041: Smaller bundles. Vue: the components are marked side-effect free (`/*#__PURE__*/`), so a bundle keeps only those it uses: `useDataTable` alone 11.2 KB gzip instead of 33 KB, `AcunPagination` alone 5.5 KB instead of 23 KB (esbuild, Vue not counted). `@acunsoft/datatable`: the Excel and CSV writers load at the first export, so an app's first load is 42.0 KB instead of 46.0 KB; the `<script>` build is unchanged.
- 4da26fd: `aria-busy` is set on the rows' box (`.adt-scroll`) instead of the whole table wrapper, which also holds the "Loading…" status: assistive technology may hold back the changes of a busy region, the announcement included.
- 2296d61: The CSV button writes `;` for German, French and Spanish too (and for regional tags such as `tr-TR` or `de-DE`), as Excel there expects; it was `;` only for exactly `tr`, so German, French and Spanish Excel opened the file as one column.
- ab54803: After `destroy()`, a detail that arrives late or an editor that closes no longer draws the removed table again; `AcunDataTable.destroy()` also takes away its loading or error placeholder.
- d2e6692: A column resize ends (without a change) when the browser takes the pointer back, and the pointer is captured so a release outside the window still ends it; a click on the details dialog's own scrollbar no longer closes it; the search placeholder has AA contrast; `AcunDataTableOptions` documents `detail` and `responsive: 'auto'`.
- b5192d8: In-place editing of rows without an ID field (e.g. read from `<table>` markup) keeps the row's ID after a save, so its selection and open details stay and the focus goes back to its edit button (it fell to the page).
- 6b4f1f6: Every export also has a `default` condition, so `require()` finds the packages (Node 22's `require(esm)`, Jest in CommonJS mode, TypeScript `node16` CommonJS files); it failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- c28ae1d: A Retry that fails again shows the error again and no longer leaves an unhandled promise rejection. `AcunDataTable`: after a first load that failed before the columns were known, `reload()` and the error's new Retry button load from the start (the rows were dropped, and a server table was asked like a client one).
- a5e1cee: Fixes:
  
  - React: `useDataTable({ data: orders.filter(…) })` — a new array on every render — no longer renders without end. A new array of the same records is not applied again when the table itself caused the render; a new array from the app still is.
  - `@acunsoft/datatable`: server-side exports (Excel, CSV, copy, print) ask for `exportPageSize` rows a request (new option, default 100, the back ends' default most) instead of 1,000, which the Node back end refused and Laravel's DataTables answer cut to 100 rows. A back end that answers fewer rows than asked is paged by what it answers.
  - A filter day (`2026-10-23`) on a date-time column is the user's day: `datatable-http` sends the browser's time zone as `tz` with day filters, and `readTableQuery` takes the day there (clock changes included); `readTableQuery(…, { timeZone })` lets the server decide. Without `tz` nothing changes. An exact instant on the server's midnight is no longer taken for a whole day. `TableDay` is exported for your own query builders.
- Updated dependencies [747dc4f]
- Updated dependencies [4da26fd]
- Updated dependencies [ab54803]
- Updated dependencies [d2e6692]
- Updated dependencies [98f3abd]
- Updated dependencies [6b4f1f6]
- Updated dependencies [cd31740]
- Updated dependencies [2f7bf80]
- Updated dependencies [7248947]
- Updated dependencies [68a586e]
- Updated dependencies [c7f8a8a]
- Updated dependencies [3422663]
- Updated dependencies [c28ae1d]
- Updated dependencies [caaaa57]
- Updated dependencies [b7659b3]
- Updated dependencies [43e068b]
- Updated dependencies [97c7ec1]
- Updated dependencies [f42d4f5]
- Updated dependencies [34102a2]
- Updated dependencies [8d46546]
- Updated dependencies [42e84ed]
- Updated dependencies [8ac4c5c]
- Updated dependencies [4c333f3]
- Updated dependencies [40195f6]
- Updated dependencies [158c6d7]
- Updated dependencies [a5e1cee]
  - @acunsoft/datatable-dom@0.5.0
  - @acunsoft/datatable-export@0.5.0
  - @acunsoft/datatable-core@0.5.0
  - @acunsoft/datatable-http@0.5.0

## 0.4.0

Not published on npm: these changes reach npm with 0.5.0.

### Minor Changes

- `filterPanel: 'dropdown' | 'drawer' | 'modal'` (`filter-panel` on the element),
  `toolbarButtons`, and `renderFilterPanel(target)` for the filter fields in your own
  drawer or modal.
- With `selectable`, the selection bar (count, "Select all N matching", "Clear selection")
  appears also without `bulkActions`; on phones it stays at the bottom of the window, its
  choices in one select.
- "Print" prints only the table — every matching row (or the selection) as shown,
  with your own cells — not the page around it.
- On phones the menu buttons show their icon only and open inside the window.
- Exports cover every matching row once "select all N matching" is chosen in the selection
  bar (before, only the rows of the page were exported).
- Reads `totalRowsAtLeast` (a server that stopped counting) and shows "10,000+".
- 30c5883: Child rows (DataTables `row().child()`): DOM `detail` (a node, text or a
  promise, with loading and error states), Vue `#detail="{ row }"` slot, React
  `detail` prop and `AcunDataTable` `detail`. Every row gets a ⊕ button; with
  `responsive: 'collapse'` the hidden columns come first, with `'modal'` the
  detail opens in the dialog.
- b758334: Resizing and moving columns. Core: `columnOrder` and `columnWidths` state
  with `moveColumn`, `setColumnOrder`, `setColumnWidth`, `setColumnWidths`
  (`COLUMN_WIDTH_LIMITS`), kept by `persistState`. Renderers:
  `resizableColumns` (drag handles, ←/→, Delete to reset) and
  `reorderableColumns` (drag headers; up/down buttons and "Reset columns" in the
  column menu), shared through `columnTools()`. `AcunDataTable`: `columnResize`,
  `columnReorder`. `connectTable` no longer re-queries the server when only the
  column layout changes (visibility, order, widths). Menus stay open when a
  control inside them re-renders.
- 5753f1f: Cursor (keyset) paging for server tables: `createDataTable({ mode: 'server',
  paging: 'cursor' })` keeps the cursor of every page seen and sends the
  previous page's `nextCursor` (`TableQuery.cursor`); the pager offers those
  pages and the next one. `createHttpDataSource({ paging: 'cursor' })` sends
  `paging=cursor&cursor=…`. `AcunDataTable`: `pagination: { cursor: true }`.
- fec10e4: `<acun-datatable>`: the whole table as a custom element for Angular, Svelte,
  Astro, Alpine and plain HTML (`defineAcunDataTableElement()`, defined by the
  `<script>` build). Common options as attributes, the rest as the `options`,
  `columns` and `data` properties; `adt-ready` and `adt-change` events.
- d0b9eba: `setData(rows)` replaces the rows of a table in the browser and keeps its
  state; `<acun-datatable>` uses it for a new `data` and keeps its table when
  it is moved. Exports of cursor-paged tables follow `nextCursor` and contain
  every row. A DataTables back end's `error` is shown as an error; cursor
  paging with that protocol is refused. `onEdit` may return `fetch(…)`: a
  response that is not `ok` keeps the editor open. `state-save` keys include
  the page path.
- 830b3cc: DataTables' server-side protocol: `serializeDataTablesQuery()` and
  `fromDataTablesResponse()` talk to existing DataTables back ends (draw,
  start, length, order, columns, search[value]); `AcunDataTable` sends it with
  `ajax: { url, protocol: 'datatables' }`.
- 4eeae3d: Filter panel: `ColumnDef.filter` (`true` or `{ options }`) puts a column in a
  "Filters" menu with a control for its type (text, min–max, from–to, yes/no,
  ticks) and shows the active filters as removable chips (`renderFilters`,
  `renderFilterChips`, Vue `AcunFilters` / `AcunFilterChips`, React `Filters` /
  `FilterChips`; built into `renderDataTable` and `AcunDataTable`). New filter
  operators `gte` and `lte` ("at least", "at most"; whole days for dates).
- 8644d50: Fixed columns (DataTables `fixedColumns`): `fixedColumns: { start, end }`
  keeps the first data columns (with the checkbox and ⊕) and the last cells in
  place while the table scrolls sideways, measured from the header and kept in
  step with re-renders and resizes. Pinned cells never take more than 60% of
  the visible width. `pinColumns()` is exported for other markup.
- 71e021a: Footer totals: a column's `aggregate` (`sum`, `avg`, `min`, `max`, `count`)
  adds a `<tfoot>` row over every matching row, with exact decimal sums
  (`getAggregates()`, `aggregateRows()`); server results may carry `totals`.
  `AcunDataTable` reads `columns[].aggregate` / `data-aggregate` and the
  answer's `totals`. Also the `gte` and `lte` filter operators.
- b55e381: Editing in place: `ColumnDef.editable` (or `{ options }`) and the renderers'
  `onEdit`. An edit button or a double click opens an editor chosen by the
  column type (text, number, decimal with a decimal comma, date, date-time,
  yes/no, a list); Enter or leaving saves, Escape cancels, errors keep it open.
  The editor (`cellEditor`) is shared by the DOM, Vue and React tables.
  `AcunDataTable`: `columns[].editable` and `onEdit`, updating the row (or
  reloading a server page) once saved.
- f3b749f: Vue `AcunDataTableLayout` and React `DataTableLayout`: the whole table with
  its bars in one component, like `renderDataTable`. `persistState(table, {
  key })` in the core and `stateSave` in `AcunDataTable` remember page, page
  size, sorting, filters, search and hidden columns across reloads.
- f87a635: `responsive: 'auto'`: columns hide only while the table does not fit,
  measured at any width instead of fixed breakpoints (lowest priority first,
  then from the right; never priority 1), open below the row like `collapse`
  and come back when there is room (DataTables Responsive). `autoResponsive()`
  is exported for other markup.
- 28e378a: Skeleton loading: while a `status` source loads the first rows, the table
  shows shimmering placeholder rows (a page, at most ten) instead of the empty
  text, so the layout does not jump (`skeleton: false` turns it off; no
  animation with `prefers-reduced-motion`). Later loads keep the rows, dimmed.
- 158c180: Tools menu and custom cells: `renderMenu` / `printTable` and the `tools`
  layout feature (Vue `AcunTools`, React `Tools`); `AcunDataTable` `buttons:
  ['excel', 'csv', 'copy', 'print']` exports the selection or every matching
  row (server side page by page, `exportLimit`). Custom cells in the DOM
  renderer (`cells`, with the safe `el()` builder) and `AcunDataTable`
  `columns[].cell`. `@acunsoft/datatable` now includes the export package.
- ae943e8: Virtual scrolling (DataTables Scroller): `virtual: true` (or `{ rowHeight,
  overscan }`) shows every matching row of a local table in one scrolling list,
  drawing only the rows in view between spacer rows; the pager goes away,
  "Select all" takes every matching row and `aria-rowcount` / `aria-rowindex`
  keep the count. `virtualWindow()` is exported.

### Patch Changes

- Updated dependencies [8d10fdf]
- Updated dependencies [30c5883]
- Updated dependencies [b758334]
- Updated dependencies [5753f1f]
- Updated dependencies [830b3cc]
- Updated dependencies [4eeae3d]
- Updated dependencies [8644d50]
- Updated dependencies [71e021a]
- Updated dependencies [b55e381]
- Updated dependencies [f3b749f]
- Updated dependencies [ade0663]
- Updated dependencies [f87a635]
- Updated dependencies [28e378a]
- Updated dependencies [158c180]
- Updated dependencies [ae943e8]
  - @acunsoft/datatable-dom@0.4.0
  - @acunsoft/datatable-core@0.4.0
  - @acunsoft/datatable-http@0.4.0
  - @acunsoft/datatable-export@0.4.0

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
  - @acunsoft/datatable-dom@0.3.0
  - @acunsoft/datatable-http@0.3.0
