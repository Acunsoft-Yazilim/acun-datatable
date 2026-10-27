---
"@acunsoft/datatable-react": patch
"@acunsoft/datatable-vue": patch
---

React and Vue draw what the DOM renderer draws:

- A column without a width in a fixed layout (after a column was resized, or with locked virtual widths) gets `adt-th--auto`, so it keeps a width when the responsive layout shows it again.
- Unselecting a page or a Shift+click range is linear: with virtual scrolling, where every matching row is on the page, clearing 30,000 selected rows took about 730 ms (now as fast as the DOM renderer, which used a Set).
