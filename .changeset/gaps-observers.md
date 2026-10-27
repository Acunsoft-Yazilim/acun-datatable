---
"@acunsoft/datatable-dom": patch
---

`responsive: 'auto'` and `fixedColumns` measure the table again only when column widths may change (a re-render, the class or style of the table or a cell), not when a row is selected or expanded, nor for the pinned columns' own classes: a checkbox click no longer forces a layout per column.
