---
"@acunsoft/datatable-dom": minor
"@acunsoft/datatable-react": minor
"@acunsoft/datatable-vue": minor
"@acunsoft/datatable": minor
---

A row action's `confirm` goes through a pluggable dialog: `setConfirm(handler)` registers one (`{ title, text, confirmLabel, cancelLabel, tone }` → `true` / `false` or a promise of it), else ACUN UI's `AcunUI.confirm()` is used when it is on the page, else the browser's `confirm()` as before. `confirm` also takes `{ title, text, confirmLabel, cancelLabel, tone }` (or a function returning it); `danger` actions ask in the danger tone. React, Vue and `@acunsoft/datatable` re-export `setConfirm` (`AcunDataTable.setConfirm` in the `<script>` build); `askConfirm()` asks the same way from your own code; `confirmed()` is deprecated.
