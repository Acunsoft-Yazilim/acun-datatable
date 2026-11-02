---
"@acunsoft/datatable-dom": patch
"@acunsoft/datatable-react": patch
"@acunsoft/datatable-vue": patch
"@acunsoft/datatable": patch
---

Editing in place: the DOM renderer, React and Vue share one editor lifecycle (opening, moving into a re-drawn cell, ending when the row leaves the page, focus return). In the DOM renderer an editor closed by pressing another control stays in its cell until that click is done even when the table redraws meanwhile, as in React and Vue.
