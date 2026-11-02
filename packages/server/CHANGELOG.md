# @acunsoft/datatable-server

## 0.5.0

### Minor Changes

- 7e6375d: Breaking: a DataTables request with `length=-1` ("All") or with more rows than `maxPageSize` is refused (`TableQueryError` on `length`, shown by DataTables as its error) instead of getting a page cut down to `maxPageSize`, with the other rows silently missing.

### Patch Changes

- 0dd383f: `fromDataTables`: a request with `filters[i]` (as this package's client sends them) no longer also applies each column's search as a text `contains`. The client sends every filter both ways, so a boolean, number or date filter was refused (422) or matched no rows. A DataTables front end without `filters[i]` works as before.
- 083b0fc: DataTables requests: `start` is the offset as it is (new optional `ServerTableQuery.offset`), also when it is no whole number of pages. DataTables keeps `start` when the page length changes (10 → 25 on row 11), and it was rounded down to a page, so the rows shown did not match "Showing 11 to 35".
- d174d45: `directoryImportStore` (`./import`, not released before): an import's files (the upload, the error report) are no longer read once its state has expired.
- 6b4f1f6: Every export also has a `default` condition, so `require()` finds the packages (Node 22's `require(esm)`, Jest in CommonJS mode, TypeScript `node16` CommonJS files); it failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- 7772731: `createImportHandler` (`./import`, not released before): a background import run in this process (no `schedule`) reports a store that fails to `onError` instead of leaving an unhandled rejection, which ends Node by default; an `onError` that throws is ignored.
- 292197a: `createImportHandler` (`./import`, not released before): to start an update or an upsert, the `importKey` column must be matched (422 otherwise); an insert does not need it.
- 2c11ba0: `createImportHandler` (`./import`, not released before): `save()`'s `context.owner` is what `owner()` returned (`"42"`), not `"42|acme"`; the stored import keeps the owner and the tenant apart.
- f3aede1: `createImportHandler` (`./import`, not released before): `process(id)` run again on a started import (a worker's retry after a crash) goes on after the rows saved before, instead of saving them again from the first row.
- 127314a: `memoryImportStore` (`./import`, not released before) drops expired imports, files and keys within a minute of a write instead of only when they are read again, so uploads left at the mapping step no longer keep their bytes for good; the handler forgets cancelled imports once they end.
- 18f5d9f: `sqlQuery` and `prismaQuery`: a day in an `in` list on a `datetime` column means the whole day, as `eq` does and as the browser and Laravel read it (it matched only rows at exactly midnight); other values in the list stay exact.
- 4b93165: `sqlQuery` cursor paging on PostgreSQL: a `datetime` sort column is also read as text (`to_char`, any `DateStyle`), and the cursor carries that text. node-postgres reads timestamps as `Date`, which keeps milliseconds, so rows stored with microseconds were served again without end (ascending) or skipped (descending). `tableResponse` leaves the `__adt_cursor_…` columns out of the answer.
- 341b022: `createImportHandler` (`@acunsoft/datatable-server/import`, not released before): an upload without `Content-Length` (chunked) is counted while it is read and refused with 413 once past the limit, instead of being read whole into memory first. Two starts of one import at once run it once (409 for the other): the handler guards its process, and the optional `ImportStore.claim(id)` makes it atomic across processes (the folder store has one).
- a5e1cee: Fixes:
  
  - React: `useDataTable({ data: orders.filter(…) })` — a new array on every render — no longer renders without end. A new array of the same records is not applied again when the table itself caused the render; a new array from the app still is.
  - `@acunsoft/datatable`: server-side exports (Excel, CSV, copy, print) ask for `exportPageSize` rows a request (new option, default 100, the back ends' default most) instead of 1,000, which the Node back end refused and Laravel's DataTables answer cut to 100 rows. A back end that answers fewer rows than asked is paged by what it answers.
  - A filter day (`2026-10-23`) on a date-time column is the user's day: `datatable-http` sends the browser's time zone as `tz` with day filters, and `readTableQuery` takes the day there (clock changes included); `readTableQuery(…, { timeZone })` lets the server decide. Without `tz` nothing changes. An exact instant on the server's midnight is no longer taken for a whole day. `TableDay` is exported for your own query builders.
- Updated dependencies [98f3abd]
- Updated dependencies [6b4f1f6]
- Updated dependencies [c7f8a8a]
- Updated dependencies [3422663]
- Updated dependencies [b7659b3]
- Updated dependencies [43e068b]
- Updated dependencies [97c7ec1]
- Updated dependencies [34102a2]
- Updated dependencies [8d46546]
- Updated dependencies [8ac4c5c]
- Updated dependencies [4c333f3]
- Updated dependencies [40195f6]
- Updated dependencies [158c6d7]
  - @acunsoft/datatable-export@0.5.0
  - @acunsoft/datatable-core@0.5.0

## 0.4.0

Not published on npm: these changes reach npm with 0.5.0.

### Minor Changes

- `tableResponse(…, { atLeast: true })` sends a limited count as
  `totalRowsAtLeast`.
- fc415f6: New package: the Node back end for Next.js route handlers, Express and
  Fastify. `defineColumns` (the allowlist), `readTableQuery` (this format or
  DataTables' protocol, checked and typed), `sqlQuery` (bound-parameter SQL
  for PostgreSQL, MySQL, MariaDB, SQLite and SQL Server with filters, smart
  search, sorting, OFFSET or index-friendly cursor paging; NULL-aware with
  `nullable` columns), `prismaQuery`, `tableResponse` and `tableError`. No
  database driver is a dependency: SQL Server users add `mssql`, the others
  their own driver; `MAX_BINDINGS` keeps SQL Server within 2,100 parameters.

### Patch Changes

- Updated dependencies [b758334]
- Updated dependencies [5753f1f]
- Updated dependencies [4eeae3d]
- Updated dependencies [71e021a]
- Updated dependencies [b55e381]
- Updated dependencies [f3b749f]
- Updated dependencies [ade0663]
  - @acunsoft/datatable-core@0.4.0
