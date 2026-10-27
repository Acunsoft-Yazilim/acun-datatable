---
"@acunsoft/datatable-core": patch
"@acunsoft/datatable-http": patch
---

A space typed after the search words no longer sends the same request again nor goes back to page 1: the search text is kept as typed, and `connectTable` does not ask for the query whose answer is on its way or on screen.
