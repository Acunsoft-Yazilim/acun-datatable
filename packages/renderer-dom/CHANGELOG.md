# @acunsoft/datatable-dom

## 0.6.0

### Patch Changes

- fb16dfd: Editing in place: the DOM renderer, React and Vue share one editor lifecycle (opening, moving into a re-drawn cell, ending when the row leaves the page, focus return). In the DOM renderer an editor closed by pressing another control stays in its cell until that click is done even when the table redraws meanwhile, as in React and Vue.
- 6da632b: The table takes the page's font everywhere: buttons, inputs and selects (the edit pencil, the column move buttons, dialog close buttons) no longer fall back to the browser's own control font, and printing uses the page's font instead of `system-ui`.
- a9a24bb: German and Spanish: the "export too large" message matches the Laravel package's and the rest of the texts (Spanish no longer mixes "tú" into the "usted" texts).
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
- ab54803: After `destroy()`, a detail that arrives late or an editor that closes no longer draws the removed table again; `AcunDataTable.destroy()` also takes away its loading or error placeholder.
- d2e6692: A column resize ends (without a change) when the browser takes the pointer back, and the pointer is captured so a release outside the window still ends it; a click on the details dialog's own scrollbar no longer closes it; the search placeholder has AA contrast; `AcunDataTableOptions` documents `detail` and `responsive: 'auto'`.
- 6b4f1f6: Every export also has a `default` condition, so `require()` finds the packages (Node 22's `require(esm)`, Jest in CommonJS mode, TypeScript `node16` CommonJS files); it failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- cd31740: The page info ("Showing 1 to 25 of 500 rows") and the selection count are written only when their words change, so screen readers do not read them out again on every checkbox or column change.
- 2f7bf80: `renderTable`, `renderPagination`, `renderFilters`, `renderFilterPanel` and the cell texts take their texts from `locale` when no `labels` are given, as `renderDataTable` does (`locale: 'tr'` changed the numbers but left the texts English, and the README's `renderFilterPanel(…, { locale: 'tr' })` showed English).
- 7248947: Choosing an item of a row's "⋮" menu or of the tools menu puts the focus back on the menu's button (it fell to the page with the hidden item). The tools menu's groups (e.g. "Export") are named groups for screen readers instead of hidden headings.
- 68a586e: `responsive: 'auto'` and `fixedColumns` measure the table again only when column widths may change (a re-render, the class or style of the table or a cell), not when a row is selected or expanded, nor for the pinned columns' own classes: a checkbox click no longer forces a layout per column.
- c28ae1d: A Retry that fails again shows the error again and no longer leaves an unhandled promise rejection. `AcunDataTable`: after a first load that failed before the columns were known, `reload()` and the error's new Retry button load from the start (the rows were dropped, and a server table was asked like a client one).
- caaaa57: A row's "⋮" menu opens whole: it was cut off by the table's scroll box on the last rows and by the cards on phones. Open, it is fixed over the page below its button (above when there is no room below), kept inside the window, and follows the button while the page or the table scrolls. `placeMenu()` does this for `.adt-row-menu`, so React and Vue get it too; styles.css has the new rule.
- f42d4f5: Screen readers hear a column's place in a sort of several columns ("sort 2, ascending"; `aria-sort` names only the first, and the ▲2 mark is hidden) and the name of the ⊕ column's header ("Details"). New labels `sortOrder` and `detailsColumn`, in the five languages.
- 42e84ed: Virtual tables: the header checkbox says "Select all rows" (new label `selectAllRows`, in the five languages), since it selects every matching row, not a page; `aria-rowcount` counts the totals row too.
- Updated dependencies [6b4f1f6]
- Updated dependencies [c7f8a8a]
- Updated dependencies [3422663]
- Updated dependencies [b7659b3]
- Updated dependencies [8d46546]
  - @acunsoft/datatable-core@0.5.0

## 0.4.0

Not published on npm: these changes reach npm with 0.5.0.

### Minor Changes

- Dark mode: text on the accent colour (primary buttons, the current page, badges) is dark
  now; white on the dark accent was below the WCAG AA contrast (3.4:1, now 5.5:1).
- A dialog with `adt-dialog` outside a table (e.g. appended to `<body>`) takes the theme's
  tokens too.
- `renderFilters({ panel })` opens the filter fields under the button (`'dropdown'`,
  default), in a drawer (`'drawer'`) or in a modal (`'modal'`), both a native `<dialog>`;
  `renderDataTable({ filterPanel })`. `renderFilterPanel()` renders only the fields, for
  your own drawer, modal or sidebar.
- Toolbar buttons: `button: { label, icon, iconOnly, className }` on `renderColumnToggle`,
  `renderFilters` and `renderMenu`, and `renderDataTable({ toolbarButtons })` per feature.
- `styles.css` turns dark under `data-bs-theme="dark"` too (Bootstrap 5.3 and the themes
  built on it), besides `class="dark"` and `data-theme="dark"`.
- `printRows(document, { title, subtitle, headers, rows, numeric })` prints only a
  table — the rows given, not the page — through a hidden frame with the page's
  stylesheets.
- On phones (≤ 640px) the column, filter and tools menu buttons show their icon only
  (the name stays for screen readers), on a row of their own under the search. An open
  menu stays inside the window (`placeMenu()`, `--adt-menu-shift`); before, it could
  open past the left edge.
- Cards (`responsive: 'cards'`, phones) no longer repeat the column names above the
  cards: every card names its values. "Select all rows on this page" stays above them,
  with its text (`.adt-select-all`).
- Phones: the selection bar sits under the rows and stays at the bottom of the window
  while they scroll by (above the table it was out of sight once the user had scrolled
  down), on one line: the count and a select with the choices (bulk actions, "Select all
  N matching", "Clear selection").
- `renderDataTable` shows the selection bar for every `selectable` table, also without
  `bulkActions` (count, "Select all N matching", "Clear selection"), as Livewire does.
- Pinned columns stay in place when columns can also be resized (or edited): the header
  cells were shifted instead of sticking, covering their neighbours.
- `responsive: 'auto'` keeps every column once the user sized one; the table scrolls
  sideways (Reset columns brings the measuring back).
- Virtual scrolling keeps the column widths while rows scroll by (measured once the first
  rows are drawn; again when the columns or the width change).
- The selection bar's "select all N matching" uses the table's `selectAllMatching()`.
- The page info shows the server's count as it was sent: exact ("of 35 rows"),
  a lower bound ("of 10,000+ rows", new label `pageInfoMore`) or none; the
  pager numbers the pages known to exist (`knownPageCount`).
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
- b55e381: Editing in place: `ColumnDef.editable` (or `{ options }`) and the renderers'
  `onEdit`. An edit button or a double click opens an editor chosen by the
  column type (text, number, decimal with a decimal comma, date, date-time,
  yes/no, a list); Enter or leaving saves, Escape cancels, errors keep it open.
  The editor (`cellEditor`) is shared by the DOM, Vue and React tables.
  `AcunDataTable`: `columns[].editable` and `onEdit`, updating the row (or
  reloading a server page) once saved.
- ade0663: Fixes from review. A click that closes an editor reaches the control it was
  pressed on; a virtual table keeps an edit while its row is only scrolled out
  of view; focus stays in the modal dialog when the table draws again.
  `virtual` tables default to `responsive: 'scroll'`, and cards with `scrollY`
  scroll in their box on phones. Delete or a double-click on a resize handle
  goes back to the width the content takes; columns hidden by the responsive
  layout no longer get a frozen 48px width, and saved widths no longer widen
  the phone cards. Clearing a large selection is fast, footer totals are
  computed once per set of matching rows, and `persistState` no longer keeps
  the page of a cursor-paged table.
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

### Minor Changes

- 60e548c: Row and bulk actions (`rowActions` option of `renderTable`, `renderBulkActions`) and column visibility (core `setColumnVisibility`, `setHiddenColumns`, `getVisibleColumns`, `enableHiding`; DOM `renderColumnToggle`). Hidden columns still sort, filter and search.
- 54866ed: New package `@acunsoft/datatable-export`: `tableToSheet`, `toCsv` (formula-injection guard), `toXlsx` (real Excel workbooks without dependencies), `parseCsv`, `readXlsx` (size-limited, zip-bomb safe) and `importRows` (typed, validated import with line-numbered errors). DOM: `downloadFile`.
- 45ac8e9: Built-in German, French and Spanish texts next to English and Turkish (`labelsDe`, `labelsFr`, `labelsEs`, `resolveLabels(locale)`), with singular/plural forms and locale digit grouping (fixes "1 rows"). Import problems carry a stable `code` and `type`, and `importRows` takes `locale` and `messages`.
- 3508f4c: New package `@acunsoft/datatable-vue`: `useDataTable`, `useTable` and the components `AcunDataTable` (slots for custom cells), `AcunPagination`, `AcunSearch`, `AcunColumnToggle`, `AcunBulkActions`, with the DOM renderer's markup and accessibility. DOM: the shared helpers `createCellText`, `cellValue`, `nextSorting` and `rowName` are exported.

### Patch Changes

- Updated dependencies [60e548c]
  - @acunsoft/datatable-core@0.2.0

## 0.1.0

### Minor Changes

- 7387b2b: First public release: headless core (typed columns, natural and multi-column sorting, Turkish-aware smart search and filter operators, pagination, selection, local and server mode), HTTP data source with latest-request-wins runner, and an accessible DOM renderer with an optional stylesheet.

### Patch Changes

- Updated dependencies [7387b2b]
  - @acunsoft/datatable-core@0.1.0
