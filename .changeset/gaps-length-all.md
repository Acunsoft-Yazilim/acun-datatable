---
"@acunsoft/datatable-server": minor
---

Breaking: a DataTables request with `length=-1` ("All") or with more rows than `maxPageSize` is refused (`TableQueryError` on `length`, shown by DataTables as its error) instead of getting a page cut down to `maxPageSize`, with the other rows silently missing.
