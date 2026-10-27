---
"@acunsoft/datatable-server": patch
---

`memoryImportStore` (`./import`, not released before) drops expired imports, files and keys within a minute of a write instead of only when they are read again, so uploads left at the mapping step no longer keep their bytes for good; the handler forgets cancelled imports once they end.
