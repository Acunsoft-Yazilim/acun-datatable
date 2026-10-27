---
"@acunsoft/datatable-export": patch
---

`readXlsx` and `streamXlsx` read a damaged sheet in linear time: elements that never close (cells, rows, strings) were searched to the end of the text once each, so a small crafted file could keep the reader busy for seconds (40,000 unclosed tags: 1.2–2 s, growing with the square of their number).
