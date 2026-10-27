---
"@acunsoft/datatable-server": patch
---

`createImportHandler` (`./import`, not released before): a background import run in this process (no `schedule`) reports a store that fails to `onError` instead of leaving an unhandled rejection, which ends Node by default; an `onError` that throws is ignored.
