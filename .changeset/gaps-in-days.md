---
"@acunsoft/datatable-server": patch
---

`sqlQuery` and `prismaQuery`: a day in an `in` list on a `datetime` column means the whole day, as `eq` does and as the browser and Laravel read it (it matched only rows at exactly midnight); other values in the list stay exact.
