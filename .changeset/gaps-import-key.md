---
"@acunsoft/datatable-server": patch
---

`createImportHandler` (`./import`, not released before): to start an update or an upsert, the `importKey` column must be matched (422 otherwise); an insert does not need it.
