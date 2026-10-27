---
"@acunsoft/datatable-server": patch
---

DataTables requests: `start` is the offset as it is (new optional `ServerTableQuery.offset`), also when it is no whole number of pages. DataTables keeps `start` when the page length changes (10 → 25 on row 11), and it was rounded down to a page, so the rows shown did not match "Showing 11 to 35".
