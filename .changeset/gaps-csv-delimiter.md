---
"@acunsoft/datatable": patch
---

The CSV button writes `;` for German, French and Spanish too (and for regional tags such as `tr-TR` or `de-DE`), as Excel there expects; it was `;` only for exactly `tr`, so German, French and Spanish Excel opened the file as one column.
