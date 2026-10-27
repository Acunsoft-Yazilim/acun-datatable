---
"@acunsoft/datatable-server": patch
---

`sqlQuery` cursor paging on PostgreSQL: a `datetime` sort column is also read as text (`to_char`, any `DateStyle`), and the cursor carries that text. node-postgres reads timestamps as `Date`, which keeps milliseconds, so rows stored with microseconds were served again without end (ascending) or skipped (descending). `tableResponse` leaves the `__adt_cursor_…` columns out of the answer.
