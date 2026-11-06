# @acunsoft/datatable-react

## 0.6.0

### Patch Changes

- fb16dfd: Editing in place: the DOM renderer, React and Vue share one editor lifecycle (opening, moving into a re-drawn cell, ending when the row leaves the page, focus return). In the DOM renderer an editor closed by pressing another control stays in its cell until that click is done even when the table redraws meanwhile, as in React and Vue.
- Updated dependencies [fb16dfd]
- Updated dependencies [6da632b]
- Updated dependencies [a9a24bb]
  - @acunsoft/datatable-dom@0.6.0
  - @acunsoft/datatable-core@0.6.0

## 0.5.0

### Patch Changes

- 747dc4f: React and Vue draw what the DOM renderer draws:
  
  - A column without a width in a fixed layout (after a column was resized, or with locked virtual widths) gets `adt-th--auto`, so it keeps a width when the responsive layout shows it again.
  - Unselecting a page or a Shift+click range is linear: with virtual scrolling, where every matching row is on the page, clearing 30,000 selected rows took about 730 ms (now as fast as the DOM renderer, which used a Set).
  - A table removed (or unmounted) right after a scroll no longer draws once more: the pending animation frame is cancelled, in the DOM renderer too.
  - React's modal puts the details list (`<dl>`) right in the dialog, without an extra `<div>`.
  - The DOM renderer's error notice is `role="alert"` without `aria-live="polite"` (which made the error wait), as in React and Vue.
  - React's and Vue's column menu closes like a menu, as the DOM renderer's: Escape (focus back on its button), a click outside; after "Reset" the focus stays on its button.
  - React and Vue check `rowActions` as the DOM renderer does (an id, a label and `onSelect`, no id twice), and Vue refuses a wrong `size` or `fixedColumns` with an error instead of a warning (a wrong size drew `adt-size--<value>`).
  - **Visible change:** `DataTableLayout` and `AcunDataTableLayout` show the texts of their `locale` (`tr`, `de`, `fr`, `es`), with `labels` over them, as `renderDataTable` does; before, `locale` changed only numbers and dates and the texts stayed English unless `labels` were given.
  - React's and Vue's toolbar buttons (`button`, `toolbarButtons`) refuse an icon that is not an icon name or `{ path }`, as the DOM renderer does.
  - Virtual scrolling without `rowHeight`: the DOM renderer measures the first real row once rows are there (a table that loads its rows started with none and kept 40px, so the scroll bar and the jumps were off); none of the three measures a loading placeholder row.
- 4da26fd: `aria-busy` is set on the rows' box (`.adt-scroll`) instead of the whole table wrapper, which also holds the "Loading…" status: assistive technology may hold back the changes of a busy region, the announcement included.
- 6b4f1f6: Every export also has a `default` condition, so `require()` finds the packages (Node 22's `require(esm)`, Jest in CommonJS mode, TypeScript `node16` CommonJS files); it failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- 7248947: Choosing an item of a row's "⋮" menu or of the tools menu puts the focus back on the menu's button (it fell to the page with the hidden item). The tools menu's groups (e.g. "Export") are named groups for screen readers instead of hidden headings.
- 22f60a3: The React peer dependency is `^18.2.0 || ^19.0.0` instead of an open `>=18.2.0`: a future major is not claimed before it is tested.
- c28ae1d: A Retry that fails again shows the error again and no longer leaves an unhandled promise rejection. `AcunDataTable`: after a first load that failed before the columns were known, `reload()` and the error's new Retry button load from the start (the rows were dropped, and a server table was asked like a client one).
- f42d4f5: Screen readers hear a column's place in a sort of several columns ("sort 2, ascending"; `aria-sort` names only the first, and the ▲2 mark is hidden) and the name of the ⊕ column's header ("Details"). New labels `sortOrder` and `detailsColumn`, in the five languages.
- 42e84ed: Virtual tables: the header checkbox says "Select all rows" (new label `selectAllRows`, in the five languages), since it selects every matching row, not a page; `aria-rowcount` counts the totals row too.
- a5e1cee: Fixes:
  
  - React: `useDataTable({ data: orders.filter(…) })` — a new array on every render — no longer renders without end. A new array of the same records is not applied again when the table itself caused the render; a new array from the app still is.
  - `@acunsoft/datatable`: server-side exports (Excel, CSV, copy, print) ask for `exportPageSize` rows a request (new option, default 100, the back ends' default most) instead of 1,000, which the Node back end refused and Laravel's DataTables answer cut to 100 rows. A back end that answers fewer rows than asked is paged by what it answers.
  - A filter day (`2026-10-23`) on a date-time column is the user's day: `datatable-http` sends the browser's time zone as `tz` with day filters, and `readTableQuery` takes the day there (clock changes included); `readTableQuery(…, { timeZone })` lets the server decide. Without `tz` nothing changes. An exact instant on the server's midnight is no longer taken for a whole day. `TableDay` is exported for your own query builders.
- Updated dependencies [747dc4f]
- Updated dependencies [4da26fd]
- Updated dependencies [ab54803]
- Updated dependencies [d2e6692]
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
- Updated dependencies [f42d4f5]
- Updated dependencies [8d46546]
- Updated dependencies [42e84ed]
  - @acunsoft/datatable-dom@0.5.0
  - @acunsoft/datatable-core@0.5.0

## 0.4.0

Not published on npm: these changes reach npm with 0.5.0.

### Minor Changes

- `filterPanel` and `toolbarButtons` on `DataTableLayout`; `panel` and `button` on
  `Filters`, `button` on `ColumnToggle` and `Tools`; new `FilterPanel` (only the fields).
- The layout shows the selection bar for every selectable table, also without bulk
  actions; on phones it stays at the bottom of the window, its choices in one select.
- On phones the column menu button shows its icon only and the column and row menus
  open inside the window.
- `responsive="auto"` keeps every column once the user sized one.
- Virtual scrolling keeps the column widths while rows scroll by.
- `PageInfo` and `Pagination` show a server's lower bound ("10,000+") and number
  the pages known to exist.
- 8d10fdf: Row actions with `icon`, `iconOnly`, `danger` and `confirm`, and a "⋮" menu
  for the actions past `maxInlineActions`. Shift+click selects a range of rows.
  The bulk bar offers "Select all N matching" (server mode: `allMatching` and
  the `query` reach the action). Vue `AcunBulkActions` and React `BulkActions`
  now use the DOM bar, so they behave the same.
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
- e013f67: Fixes from review. Virtual tables can edit any row (not only the first
  page), keep an editor while its row is scrolled out and get it back when a
  cell is drawn again; the viewport is measured once mounted and on resize;
  `virtual` defaults to `responsive: 'scroll'`. Bulk actions and tools stay
  mounted across parent re-renders (focus and an open menu survive), and a
  click that closes an editor reaches the control it was pressed on (the
  shared `afterPointerRelease` of `@acunsoft/datatable-dom`). Vue:
  components follow a new `table` prop (`useTable` takes a ref or getter),
  filters follow new labels and locale, the dialog stays open while its row
  matches, the row height is measured on mount, and element ids come from
  `useId` (3.5+) so server-rendered markup hydrates.
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

## 0.2.1

### Patch Changes

- Published from GitHub Actions through npm trusted publishing, with provenance attestations that link each package to its source commit. No code changes.
- Updated dependencies
  - @acunsoft/datatable-core@0.2.1
  - @acunsoft/datatable-dom@0.2.1

## 0.2.0

### Minor Changes

- e3811b0: New package `@acunsoft/datatable-react`: `useDataTable`, `useTable` (with `useSyncExternalStore`) and the components `DataTable` (custom `cells`), `Pagination`, `Search`, `ColumnToggle`, `BulkActions`, with the DOM renderer's markup and accessibility; marked `"use client"`.

### Patch Changes

- Updated dependencies [60e548c]
- Updated dependencies [54866ed]
- Updated dependencies [45ac8e9]
- Updated dependencies [3508f4c]
  - @acunsoft/datatable-core@0.2.0
  - @acunsoft/datatable-dom@0.2.0
