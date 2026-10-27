---
"@acunsoft/datatable-server": patch
---

`createImportHandler` (`./import`, not released before): `save()`'s `context.owner` is what `owner()` returned (`"42"`), not `"42|acme"`; the stored import keeps the owner and the tenant apart.
