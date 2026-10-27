---
"@acunsoft/datatable-dom": patch
"@acunsoft/datatable-react": patch
"@acunsoft/datatable-vue": patch
"@acunsoft/datatable": patch
---

`aria-busy` is set on the rows' box (`.adt-scroll`) instead of the whole table wrapper, which also holds the "Loading…" status: assistive technology may hold back the changes of a busy region, the announcement included.
