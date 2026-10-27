---
"@acunsoft/datatable-server": patch
---

`createImportHandler` (`@acunsoft/datatable-server/import`, not released before): an upload without `Content-Length` (chunked) is counted while it is read and refused with 413 once past the limit, instead of being read whole into memory first. Two starts of one import at once run it once (409 for the other): the handler guards its process, and the optional `ImportStore.claim(id)` makes it atomic across processes (the folder store has one).
