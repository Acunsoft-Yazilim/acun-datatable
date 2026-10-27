---
"@acunsoft/datatable-core": minor
"@acunsoft/datatable-http": patch
---

Cursor paging is set once, on the table: a table created with `paging: 'cursor'` gives every query `paging: 'cursor'` (new optional `TableQuery.paging`), and `createHttpDataSource` sends `paging=cursor` for it without its own option. Before, the table and the source each needed `paging: 'cursor'`, and with only the table set the server answered page numbers and the table never got past page 1. The source's `paging` option stays for calling `getPage` yourself; with it, page 2 or later without a cursor is now refused with a clear error instead of fetching page 1 again.
