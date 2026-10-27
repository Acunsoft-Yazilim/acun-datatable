---
"@acunsoft/datatable-react": patch
"@acunsoft/datatable-vue": patch
"@acunsoft/datatable-dom": patch
---

React and Vue draw what the DOM renderer draws:

- A column without a width in a fixed layout (after a column was resized, or with locked virtual widths) gets `adt-th--auto`, so it keeps a width when the responsive layout shows it again.
- Unselecting a page or a Shift+click range is linear: with virtual scrolling, where every matching row is on the page, clearing 30,000 selected rows took about 730 ms (now as fast as the DOM renderer, which used a Set).
- A table removed (or unmounted) right after a scroll no longer draws once more: the pending animation frame is cancelled, in the DOM renderer too.
- React's modal puts the details list (`<dl>`) right in the dialog, without an extra `<div>`.
- The DOM renderer's error notice is `role="alert"` without `aria-live="polite"` (which made the error wait), as in React and Vue.
- React's and Vue's column menu closes like a menu, as the DOM renderer's: Escape (focus back on its button), a click outside; after "Reset" the focus stays on its button.
- React and Vue check `rowActions` as the DOM renderer does (an id, a label and `onSelect`, no id twice), and Vue refuses a wrong `size` or `fixedColumns` with an error instead of a warning (a wrong size drew `adt-size--<value>`).
- **Visible change:** `DataTableLayout` and `AcunDataTableLayout` show the texts of their `locale` (`tr`, `de`, `fr`, `es`), with `labels` over them, as `renderDataTable` does; before, `locale` changed only numbers and dates and the texts stayed English unless `labels` were given.
- React's and Vue's toolbar buttons (`button`, `toolbarButtons`) refuse an icon that is not an icon name or `{ path }`, as the DOM renderer does.
