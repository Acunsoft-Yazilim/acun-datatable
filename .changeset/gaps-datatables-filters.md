---
"@acunsoft/datatable-server": patch
---

`fromDataTables`: a request with `filters[i]` (as this package's client sends them) no longer also applies each column's search as a text `contains`. The client sends every filter both ways, so a boolean, number or date filter was refused (422) or matched no rows. A DataTables front end without `filters[i]` works as before.
