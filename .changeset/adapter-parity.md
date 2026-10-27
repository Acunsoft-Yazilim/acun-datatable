---
"@acunsoft/datatable-react": patch
"@acunsoft/datatable-vue": patch
---

React and Vue draw what the DOM renderer draws:

- A column without a width in a fixed layout (after a column was resized, or with locked virtual widths) gets `adt-th--auto`, so it keeps a width when the responsive layout shows it again.
