---
"@acunsoft/datatable-dom": patch
"@acunsoft/datatable": patch
---

The table takes the page's font everywhere: buttons, inputs and selects (the edit pencil, the column move buttons, dialog close buttons) no longer fall back to the browser's own control font, and printing uses the page's font instead of `system-ui`.
