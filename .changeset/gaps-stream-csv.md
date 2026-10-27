---
"@acunsoft/datatable-export": patch
---

`streamCsv` reads the header line once while it looks for the delimiter (it read everything so far again with each piece), and refuses a field longer than 1,048,576 characters: a quote that never closes held the whole file and took 30 s for 24 MB; now it stops at once with an `ImportError`.
