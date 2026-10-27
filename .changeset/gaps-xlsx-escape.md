---
"@acunsoft/datatable-export": patch
---

`toXlsx` writes a literal `_xHHHH_` in text as Excel does (`_x005F_x0041_`), so it reads back as written instead of as an escaped character (`_x0041_` came back as `A`).
