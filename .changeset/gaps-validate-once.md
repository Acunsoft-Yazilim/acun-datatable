---
"@acunsoft/datatable-core": patch
---

`validatePageResult` returns a result it made itself as it is (only the page size is checked again), so a server page is checked and copied once instead of three times (by the HTTP source, the query runner and the table).
