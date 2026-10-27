---
"@acunsoft/datatable-export": patch
---

`readXlsx` / `openZip`: a new `maxTotalBytes` (default 100 MB) bounds everything read out of one archive, not only each entry (a workbook could inflate 50 MB in each of its parts), and a stored entry is checked by its real size, not the size it declares.
