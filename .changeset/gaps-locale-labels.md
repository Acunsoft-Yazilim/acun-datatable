---
"@acunsoft/datatable-dom": patch
---

`renderTable`, `renderPagination`, `renderFilters`, `renderFilterPanel` and the cell texts take their texts from `locale` when no `labels` are given, as `renderDataTable` does (`locale: 'tr'` changed the numbers but left the texts English, and the README's `renderFilterPanel(…, { locale: 'tr' })` showed English).
