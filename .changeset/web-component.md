---
"@acunsoft/datatable": minor
---

`<acun-datatable>`: every attribute is also a property (`pageSize`, `serverSide`, `scrollY`, …); properties set before the element is defined are taken over; `page-size` changes in place and the view attributes (`language`, `responsive`, `size`, `filter-panel`, `fixed-header`, `scroll-y`, `virtual`, `state-save`) rebuild the table keeping the page, sorting, filters, search, selection and columns (before, every attribute started over); `adt-change` and `adt-ready` bubble; new `adt-error`; `scroll-y="480"` means pixels (it failed before); two `state-save` tables without an id no longer share a key; `HTMLElementTagNameMap` and typed events. `AcunDataTable` takes `initialState`.
