---
"@acunsoft/datatable-export": patch
---

`toXlsx` drops an apostrophe at either end of the sheet name, which Excel refuses (the file opened in repair mode). `toCsv`'s documentation says that text its formula guard prefixed with `'` reads back with it.
