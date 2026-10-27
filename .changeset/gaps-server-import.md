---
"@acunsoft/datatable-server": patch
---

`createImportHandler` (`@acunsoft/datatable-server/import`, not released before): an upload without `Content-Length` (chunked) is counted while it is read and refused with 413 once past the limit, instead of being read whole into memory first.
