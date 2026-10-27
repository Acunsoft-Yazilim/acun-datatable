// What the DOM renderer, the React and the Vue adapter decide alike, as plain
// functions of the table: the renderers only turn the answers into their own
// elements. Shared through '@acunsoft/datatable-dom/internal' (see internal.ts).
import type { RowId } from '@acunsoft/datatable-core';

/** The selection without `remove`, in its order: a Set, so a page of 100,000 rows stays linear. */
export function withoutIds(selected: readonly RowId[], remove: readonly RowId[]): RowId[] {
  const gone = new Set(remove);
  return selected.filter(id => !gone.has(id));
}
