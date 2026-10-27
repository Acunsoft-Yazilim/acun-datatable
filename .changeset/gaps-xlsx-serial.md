---
"@acunsoft/datatable-export": patch
---

`readXlsx` / `streamXlsx`: a date-styled number past any date (`9e300` in a crafted file) is kept as the number instead of an Invalid Date, which made `importRows` throw a RangeError instead of reporting the cell; `toCsv` writes an Invalid Date as an empty cell, not `NaN-NaN-NaN`.
