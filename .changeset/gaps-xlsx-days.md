---
"@acunsoft/datatable-export": patch
---

`readXlsx` reads a `t="d"` cell holding only a day as that local day (it was UTC midnight: the day before west of UTC), and `importRows` writes a date in a row error as its local day (`2026-10-23`, not `2026-10-22T21:00:00.000Z` in Turkey).
