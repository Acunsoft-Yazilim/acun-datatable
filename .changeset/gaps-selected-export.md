---
"@acunsoft/datatable-export": patch
---

`tableToSheet(table, { rows: 'selected' })` gives the selected rows among the matching ones, in the current order, as print does and as DataTables exports them; it gave them in data order, with selected rows the search or filters hid.
