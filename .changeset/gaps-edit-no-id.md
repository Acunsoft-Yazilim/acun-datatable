---
"@acunsoft/datatable": patch
---

In-place editing of rows without an ID field (e.g. read from `<table>` markup) keeps the row's ID after a save, so its selection and open details stay and the focus goes back to its edit button (it fell to the page).
