// What the DOM renderer, the React and the Vue adapter decide alike, as plain
// functions of the table: the renderers only turn the answers into their own
// elements. Shared through '@acunsoft/datatable-dom/internal' (see internal.ts).
import type { RowId } from '@acunsoft/datatable-core';

/** The selection without `remove`, in its order: a Set, so a page of 100,000 rows stays linear. */
export function withoutIds(selected: readonly RowId[], remove: readonly RowId[]): RowId[] {
  const gone = new Set(remove);
  return selected.filter(id => !gone.has(id));
}

/** What `frameThrottle` needs of a window. */
export interface FrameSource {
  readonly requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  readonly cancelAnimationFrame?: (handle: number) => void;
}

/**
 * At most one callback per animation frame (a 16 ms timeout where there are
 * no frames), e.g. for scroll events; `cancel` drops a pending one, so a
 * destroyed or unmounted table never draws again.
 */
export function frameThrottle(view: FrameSource | null | undefined): { schedule(callback: () => void): void; cancel(): void } {
  let pending: { readonly id: number; readonly timeout: boolean } | undefined;
  return {
    schedule(callback) {
      if (pending) return;
      const run = (): void => { pending = undefined; callback(); };
      pending = typeof view?.requestAnimationFrame === 'function'
        ? { id: view.requestAnimationFrame(run), timeout: false }
        : { id: setTimeout(run, 16) as unknown as number, timeout: true };
    },
    cancel() {
      if (!pending) return;
      if (pending.timeout) clearTimeout(pending.id);
      else view?.cancelAnimationFrame?.(pending.id);
      pending = undefined;
    },
  };
}

/**
 * A `<details>` menu closes like a menu: Escape closes it and puts the focus
 * back on its `<summary>`, a click outside closes it. Returns the stop.
 */
export function closeLikeAMenu(details: HTMLDetailsElement): () => void {
  const doc = details.ownerDocument;
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && details.open) {
      details.open = false;
      details.querySelector<HTMLElement>(':scope > summary')?.focus();
    }
  };
  // The path at the time of the click: a control that re-rendered away still counts as inside.
  const outside = (event: Event): void => { if (details.open && !event.composedPath().includes(details)) details.open = false; };
  details.addEventListener('keydown', onKey);
  doc.addEventListener('click', outside);
  return () => {
    details.removeEventListener('keydown', onKey);
    doc.removeEventListener('click', outside);
  };
}
