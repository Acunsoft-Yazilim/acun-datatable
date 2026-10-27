---
"@acunsoft/datatable-server": patch
---

`createImportHandler` (`./import`, not released before): `process(id)` run again on a started import (a worker's retry after a crash) goes on after the rows saved before, instead of saving them again from the first row.
