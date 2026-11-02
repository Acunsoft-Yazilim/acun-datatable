# @acunsoft/datatable

A complete data table in one call, in the spirit of DataTables, with no jQuery
and no other runtime dependency. It bundles the Acun DataTable core, the
accessible DOM renderer and the HTTP data source.

```bash
npm install @acunsoft/datatable
```

```js
import { AcunDataTable } from '@acunsoft/datatable';
import '@acunsoft/datatable/styles.css';

const table = new AcunDataTable('#myTable', {
  fixedHeader: true,
  processing: true,
  serverSide: true,
  ajax: { url: '/api/products', method: 'POST' },
  pagination: { enabled: true, pageSize: 25, pageSizes: [10, 25, 50, 100] },
  sorting: { enabled: true, multiSort: true },
  searching: { enabled: true, debounce: 300 },
  language: 'tr',
});
```

Or with a `<script>` tag, without a build step (`window.AcunDataTable`):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@acunsoft/datatable@0.5.0/dist/styles.css">
<script src="https://cdn.jsdelivr.net/npm/@acunsoft/datatable@0.5.0/dist/acun-datatable.min.js"></script>
<script>
  new AcunDataTable('#myTable', { serverSide: true, ajax: '/api/products' });
</script>
```

## `<acun-datatable>` (a standard custom element)

```html
<acun-datatable id="orders" src="/api/orders" server-side language="tr" page-size="25" responsive="auto"></acun-datatable>
<script>
  const orders = document.getElementById('orders');
  orders.columns = [{ data: 'customer', title: 'Müşteri' }, { data: 'total', type: 'decimal' }];
  orders.addEventListener('adt-change', event => console.log(event.detail.state));
</script>
```

The `<script>` build defines the element; with npm call
`defineAcunDataTableElement()` once. It needs no framework: plain HTML, or
any framework that renders HTML elements (tested here with plain HTML and
the `<script>` build).

- **Attributes and properties:** `src`, `server-side` (`serverSide`),
  `method`, `language`, `page-size` (`pageSize`), `responsive`, `size`,
  `fixed-header` (`fixedHeader`), `scroll-y` (`scrollY`: `480` is pixels, or
  `60vh`), `virtual`, `cursor`, `state-save` (`stateSave`), `filter-panel`
  (`filterPanel`). Each property sets its attribute; `null` removes it. The
  `options`, `columns` and `data` properties take everything else.
  Properties set before the element is defined (a deferred script, a
  framework that renders first) are taken over when it is.
- **Changes:** `page-size` and `data` update the table in place. `language`,
  `responsive`, `size`, `filter-panel`, `fixed-header`, `scroll-y`,
  `virtual` and `state-save` rebuild it and keep the page, sorting, filters,
  search, selection and column widths, order and visibility. `src`,
  `server-side`, `method`, `cursor`, `columns` and `options` start over.
- **Events** (they bubble): `adt-ready` once the first rows are shown,
  `adt-change` (`{ state, event }`) on every change, `adt-error`
  (`{ error }`) when the options are refused or the rows cannot be loaded;
  an `adt-error` that no listener cancels (`preventDefault()`) is reported
  like an uncaught error.
- **Several tables** on a page keep their own state and element ids;
  `state-save` keys each by its `id`, or by its place among the page's tables.
- A `<table>` inside it is the source when there is no `src` or `data`.
  Light DOM, so `styles.css` and the page's theme apply. `element.table` is
  the `AcunDataTable`. TypeScript: `document.querySelector('acun-datatable')`
  is an `AcunDataTableElement`, and its events are typed. Importing it on a
  server (SSR) is safe; it only runs in the browser.

## Where the rows come from

| You give | What happens |
|---|---|
| an existing `<table>` | its `<thead>` gives the columns (`<th data-column="price">` names the field) and its `<tbody>` the rows; sorting, search and pages run in the browser |
| `data: [...]` | the rows, in the browser |
| `ajax: '/orders.json'` | every row is loaded once, then everything runs in the browser |
| `ajax` + `serverSide: true` | the server sorts, searches and pages; only one page is ever loaded |

Without `columns`, they come from the table's `<thead>` or, failing that, from
the fields of the first row. Name them yourself for titles and types:

```js
columns: [
  { data: 'name', title: 'Ürün' },
  { data: 'price', title: 'Fiyat', type: 'decimal', priority: 1 },
  { data: 'stock', title: 'Stok', type: 'number', searchable: false },
  { data: 'created_at', title: 'Eklenme', type: 'datetime', visible: false },
  { data: 'status', title: 'Durum', render: value => (value === 'active' ? 'Satışta' : 'Pasif') },
],
```

`render` returns text; cells are always written as text, never as HTML.
`cell: (value, row, text) => el('span', { class: 'badge' }, text)` draws a
cell as a DOM node (`el` is exported, and `AcunDataTable.el` in the
`<script>` build); it is never parsed as HTML.
`buttons: ['excel', 'csv', 'copy', 'print', { id, label, onSelect }]` adds the
tools menu; exports and print take the selected rows (those among the
matching rows, in the table's order; on a server table, those of the loaded
page), else every matching row (server
side: fetched page by page up to `exportLimit`, default 10,000, with
`exportPageSize` rows a request, default 100: the default most of the Node and
Laravel back ends; a back end that answers fewer rows than asked is paged by
what it answers).
`filter: true` (or a list of `{ value, label }`) puts a column in the
"Filters" menu; active filters show as removable chips. `filterPanel: 'drawer'`
or `'modal'` opens the fields in a drawer or a dialog instead of a dropdown
(`filter-panel` on the element); for a drawer or modal of your own, leave
`'filters'` out of `layout` and call `dt.renderFilterPanel('#my-offcanvas .body')`
after `ready`. `toolbarButtons: { columns, filters, tools }` sets each button's
`label`, `icon` (a built-in name, `{ path }` or `false`), `iconOnly` and
`className` (e.g. `'btn btn-light'`).
`editable: true` (or a list of `{ value, label }`) with the table's
`onEdit: async ({ row, field, value }) => …` edits cells in place; once it
resolves the row shows the new value (a `serverSide` table reloads its page).
`detail: row => …` opens a child row under each row (DataTables child rows):
a DOM node, text or a promise of either, e.g. order lines fetched for that
row.
`aggregate: 'sum'` (`'avg'`, `'min'`, `'max'`, `'count'`; `data-aggregate`
on a `<th>`) adds a footer total over every matching row; server side it is
read from the answer's `totals`.

## Server side

Requests use the `@acunsoft/datatable-http` wire format: `page`, `pageSize`,
`sort=price:desc,name:asc`, `filters[i][field|op|value]` and `search`, in the
URL (`GET`) or as a form body (`method: 'POST'`). A POST sends Laravel's
`<meta name="csrf-token">` as `X-CSRF-TOKEN` by itself. The answer may be
`{ rows, totalRows }`, Laravel's paginator (`{ data, total }`) or DataTables'
`{ data, recordsFiltered }`; anything else is read with `ajax.dataSrc`.

**An existing DataTables back end** (yajra/laravel-datatables, the PHP SSP
class, …) keeps working: `ajax: { url, protocol: 'datatables' }` sends
DataTables' own `draw`, `start`, `length`, `order[i]`, `columns[i]` and
`search[value]` (give `columns`, which DataTables addresses by index), and
`{ draw, recordsTotal, recordsFiltered, data }` is read as it is.

With Laravel, the endpoint is one line (package `acunsoft/datatable-laravel`):

```php
Route::match(['get', 'post'], '/api/products', fn () => TableResponse::for(Product::query())
    ->columns([
        Column::make('name')->sortable()->filterable(),
        Column::make('price')->type('decimal')->sortable()->filterable(),
    ]));
```

## Options

| Option | Default | DataTables |
|---|---|---|
| `columns` | from `<thead>` or the first row | `columns` |
| `data` | | `data` |
| `ajax` | | `ajax` (`url`, `method`, `headers`, `dataSrc`) |
| `serverSide` | `false` | `serverSide` |
| `processing` | `true` | `processing` |
| `skeleton` | `true`: shimmering placeholder rows until the first rows arrive | |
| `pagination` | `{ enabled: true, pageSize: 25, pageSizes: [10, 25, 50, 100] }`, also `firstLast`, `siblings`, and `cursor: true` for keyset pages with `serverSide` (no `OFFSET`: deep pages do not read the rows before them) | `paging`, `pageLength`, `lengthMenu` |
| `sorting` | `{ enabled: true, multiSort: true, initial: [] }` | `ordering`, `order` |
| `searching` | `{ enabled: true, debounce: 250, placeholder, initial }` | `searching`, `searchDelay` |
| `language` | `'en'`; also `'tr'`, `'de'`, `'fr'`, `'es'` | `language` |
| `labels` | | `language` texts |
| `fixedHeader` | `false` | `fixedHeader` |
| `fixedColumns` | `{ start: 0, end: 0 }`: columns that stay while the table scrolls sideways | `fixedColumns` |
| `scrollY` | | `scrollY` |
| `virtual` | `false`; `true` or `{ rowHeight, overscan }`: every row in one scrolling list, only those in view drawn | `scroller` |
| `responsive` | `'cards'`; also `'scroll'`, `'collapse'`, `'modal'`, `'auto'` (measured, like DataTables Responsive) | `responsive` |
| `size` | `'md'`; also `'sm'`, `'lg'` | |
| `selectable`, `rowActions`, `bulkActions` | | `select`, buttons |
| `detail` | | child rows (`row().child()`) |
| `onEdit` + `columns[].editable` | | Editor inline editing |
| `columnToggle` | `true` | `colvis` |
| `columnResize` | `false`: drag a header's edge, or ←/→ on it | ColResize |
| `columnReorder` | `false`: drag headers; ↑/↓ buttons in the column menu | `colReorder` |
| `layout` | page size and search above, info and pages below | `layout` |
| `filterPanel` | `'dropdown'`; also `'drawer'`, `'modal'` | |
| `toolbarButtons` | `{ columns?, filters?, tools? }`, each `{ label, icon, iconOnly, className }` | |
| `stateSave` | `false`; `true` or `{ key, storage: 'session' }`; keeps page, sorting, search, filters, hidden columns, order and widths | `stateSave` |
| `buttons` | | `buttons` |
| `rowId` | `'id'` when rows have one | `rowId` |

`pagination: false` shows every row on one page (up to 1,000; not with
`serverSide`). `searching: false` and `sorting: false` remove the search box
and the sort buttons.

## Methods

`ready` (a promise for the first rows), `reload()`, `setData(rows)` (new rows
for a table in the browser; page, sorting, search and selection stay), `search(text)`,
`page(n)`, `pageSize(n)`, `order([{ field, direction }])`, `selectedRows()`,
`on(listener)`, `renderFilterPanel(target)` (the filter fields in your own
element; returns a function that removes them) and `destroy()` (an original
`<table>` is put back). `table` is
the headless `@acunsoft/datatable-core` table for everything else.

## License

[MIT](LICENSE). Provided “as is”, without warranty of any kind; the authors and Acunsoft accept no liability for any damage or data loss arising from its use (see LICENSE).
