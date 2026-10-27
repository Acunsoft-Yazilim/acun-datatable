---
"@acunsoft/datatable-dom": patch
"@acunsoft/datatable-react": patch
"@acunsoft/datatable-vue": patch
"@acunsoft/datatable": patch
---

A Retry that fails again shows the error again and no longer leaves an unhandled promise rejection. `AcunDataTable`: after a first load that failed before the columns were known, `reload()` and the error's new Retry button load from the start (the rows were dropped, and a server table was asked like a client one).
