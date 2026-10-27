---
"@acunsoft/datatable-react": patch
"@acunsoft/datatable": patch
"@acunsoft/datatable-server": patch
"@acunsoft/datatable-http": patch
---

Fixes:

- React: `useDataTable({ data: orders.filter(…) })` — a new array on every render — no longer renders without end. A new array of the same records is not applied again when the table itself caused the render; a new array from the app still is.
- `@acunsoft/datatable`: server-side exports (Excel, CSV, copy, print) ask for `exportPageSize` rows a request (new option, default 100, the back ends' default most) instead of 1,000, which the Node back end refused and Laravel's DataTables answer cut to 100 rows. A back end that answers fewer rows than asked is paged by what it answers.
- A filter day (`2026-10-23`) on a date-time column is the user's day: `datatable-http` sends the browser's time zone as `tz` with day filters, and `readTableQuery` takes the day there (clock changes included); `readTableQuery(…, { timeZone })` lets the server decide. Without `tz` nothing changes. An exact instant on the server's midnight is no longer taken for a whole day. `TableDay` is exported for your own query builders.
