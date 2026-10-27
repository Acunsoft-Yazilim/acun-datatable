---
"@acunsoft/datatable-core": patch
---

`persistState` keeps date filters as dates. JSON wrote a `Date` as UTC text, which came back as a string: a day filter on a `datetime` column (the whole local day) became an exact instant matching almost nothing, and in server mode the text went to the server as it was. Dates are now saved as their local wall time and restored as `Date`.
