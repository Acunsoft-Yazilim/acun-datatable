---
"@acunsoft/datatable-server": patch
---

Import (not released yet, `@acunsoft/datatable-import`): the client sends its headers and credentials only to the import endpoint's origin; an error report on another host (a signed storage link) is fetched without them.
