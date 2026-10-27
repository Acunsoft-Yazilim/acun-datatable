// What the DOM renderer, the React and the Vue adapter decide alike, as plain
// functions of the table: the renderers only turn the answers into their own
// elements. Shared through '@acunsoft/datatable-dom/internal' (see internal.ts).
import { COLUMN_WIDTH_LIMITS, getPageItems, type Aggregate, type RowId } from '@acunsoft/datatable-core';
import type { ResponsiveMode, TableSize } from './table';

/** What the class helpers read of a column. */
interface ColumnLike {
  readonly id: string;
  readonly priority?: 1 | 2 | 3;
  readonly type?: string;
}

/** The responsive priority of a visible column: its own, else 1 for the first column and 2 for the rest. */
export function priorityOf(column: { readonly priority?: 1 | 2 | 3 }, index: number): 1 | 2 | 3 {
  return column.priority ?? (index === 0 ? 1 : 2);
}

/** Numbers and decimals are right-aligned (`adt-num`). */
export function numeric(column: { readonly type?: string }): boolean {
  return column.type === 'number' || column.type === 'decimal';
}

/**
 * What a responsive mode turns on: an expand column for hidden columns
 * (collapse, modal, auto) or a child row (`hasDetail`); hidden columns open
 * below the row (collapse, auto) or in a dialog (modal).
 */
export function responsiveFlags(mode: ResponsiveMode, hasDetail: boolean): { readonly collapsible: boolean; readonly inlineDetails: boolean; readonly expandable: boolean } {
  const collapsible = mode === 'collapse' || mode === 'modal' || mode === 'auto';
  return { collapsible, inlineDetails: mode === 'collapse' || mode === 'auto', expandable: collapsible || hasDetail };
}

/** The priorities present: the columns', and 2 for the actions column. */
export function priorityLevels(columns: readonly ColumnLike[], hasActions: boolean): ReadonlySet<1 | 2 | 3> {
  const levels = new Set(columns.map((column, index) => priorityOf(column, index)));
  if (hasActions) levels.add(2);
  return levels;
}

/** Cells in a row: the columns, and the expand, checkbox and actions cells. */
export function columnSpan(columns: number, parts: { readonly selectable: boolean; readonly actions: boolean; readonly expandable: boolean }): number {
  return columns + (parts.selectable ? 1 : 0) + (parts.actions ? 1 : 0) + (parts.expandable ? 1 : 0);
}

/** A body cell's class: its priority (responsive modes that hide columns), numbers, editing. `''` for none. */
export function cellClass(column: ColumnLike, index: number, collapsible: boolean, editable = false, editing = false): string {
  return [collapsible ? `adt-col--p${priorityOf(column, index)}` : '', numeric(column) ? 'adt-num' : '', editable ? 'adt-editable' : '', editing ? 'adt-editing' : '']
    .filter(Boolean).join(' ');
}

/** The actions cell's class; it hides with priority 2. */
export function actionsCellClass(collapsible: boolean): string {
  return collapsible ? 'adt-actions adt-col--p2' : 'adt-actions';
}

/** Placeholder rows while the first rows load: as many as a page, at most 10. */
export function skeletonRows(pageSize: number): number {
  return Math.min(pageSize, 10);
}

/** What the locked column widths of virtual scrolling belong to: measured again when it changes. */
export function layoutKey(columns: readonly ColumnLike[], selectable: boolean, hasActions: boolean, expandable: boolean): string {
  return `${columns.map(column => column.id).join('|')}#${selectable}#${hasActions}#${expandable}`;
}

/** The class of the table's wrapper. */
export function wrapClass(parts: {
  readonly responsive: ResponsiveMode; readonly size: TableSize; readonly stickyHeader?: boolean; readonly scrollY?: boolean;
  readonly loading?: boolean; readonly skeleton?: boolean; readonly virtual?: boolean;
}): string {
  return ['adt-table-wrap', `adt-responsive--${parts.responsive}`, parts.size === 'md' ? '' : `adt-size--${parts.size}`, parts.stickyHeader ? 'adt-sticky-header' : '',
    parts.scrollY ? 'adt-scroll-y' : '', parts.loading ? 'adt-loading' : '', parts.skeleton ? 'adt-skeleton-on' : '', parts.virtual ? 'adt-virtual' : ''].filter(Boolean).join(' ');
}

/** The class of the `<table>`: priorities to hide, child rows, and a fixed layout once widths are set or locked. */
export function tableClass(parts: { readonly collapsible: boolean; readonly levels: ReadonlySet<number>; readonly detail: boolean; readonly userWidths: boolean; readonly locked: boolean }): string {
  return ['adt-table', parts.collapsible && parts.levels.has(2) ? 'adt-has-p2' : '', parts.collapsible && parts.levels.has(3) ? 'adt-has-p3' : '',
    parts.detail ? 'adt-has-detail' : '', parts.userWidths || parts.locked ? 'adt-fixed-layout' : '', parts.userWidths ? 'adt-user-widths' : ''].filter(Boolean).join(' ');
}

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

/** Open a modal `<dialog>` (the `open` attribute where `showModal` is missing). */
export function showDialog(dialog: HTMLDialogElement | null | undefined): void {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

/** Close a `<dialog>` (removing `open` where `close` is missing). */
export function hideDialog(dialog: HTMLDialogElement | null | undefined): void {
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

/** One listener closes any open row "⋮" menu inside `root()` on a click outside it. Returns the stop. */
export function closeRowMenusOnOutsideClick(doc: Document, root: () => ParentNode | null | undefined): () => void {
  const close = (event: Event): void => {
    root()?.querySelectorAll<HTMLDetailsElement>('.adt-row-menu[open]').forEach(menu => {
      if (!event.composedPath().includes(menu)) menu.open = false;
    });
  };
  doc.addEventListener('click', close);
  return () => doc.removeEventListener('click', close);
}

/** A header cell's class; `autoWidth`: no width of its own in a fixed layout (e.g. shown again by the responsive layout). */
export function headerClass(column: ColumnLike, index: number, collapsible: boolean, autoWidth: boolean): string {
  return ['adt-th', collapsible ? `adt-col--p${priorityOf(column, index)}` : '', numeric(column) ? 'adt-num' : '', autoWidth ? 'adt-th--auto' : ''].filter(Boolean).join(' ');
}

/** A sortable column's sort button: its class, the ▲/▼ mark (numbered with several rules), and `aria-sort` for the first rule. */
export function sortView(columnId: string, sorting: readonly { readonly field: string; readonly direction: 'asc' | 'desc' }[]): {
  readonly className: string; readonly mark: string; readonly ariaSort: 'ascending' | 'descending' | undefined;
  /** With several rules: this column's place and direction, for `labels.sortOrder` (aria-sort names the first only). */
  readonly order: { readonly position: number; readonly direction: 'asc' | 'desc' } | undefined;
} {
  const index = sorting.findIndex(rule => rule.field === columnId);
  const rule = sorting[index];
  return {
    className: rule ? `adt-sort adt-sort--${rule.direction}` : 'adt-sort',
    mark: rule ? `${rule.direction === 'asc' ? '▲' : '▼'}${sorting.length > 1 ? index + 1 : ''}` : '',
    ariaSort: index === 0 ? (rule!.direction === 'asc' ? 'ascending' : 'descending') : undefined,
    order: rule && sorting.length > 1 ? { position: index + 1, direction: rule.direction } : undefined,
  };
}

/** The attributes of a column's resize handle (a separator with its width as the value); the renderer adds the tab stop. */
export function resizeHandle(columnId: string, label: string, width: number | undefined): Readonly<Record<string, string>> {
  return {
    class: 'adt-resize', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': label, 'data-column-id': columnId,
    'aria-valuemin': String(COLUMN_WIDTH_LIMITS.min), 'aria-valuemax': String(COLUMN_WIDTH_LIMITS.max),
    ...(width !== undefined ? { 'aria-valuenow': String(width) } : {}),
  };
}

/** One cell of the totals row: the first column says "Totals" (a row header) unless it has a total itself. */
export interface TotalCell {
  readonly columnId: string;
  readonly header: boolean;
  readonly className: string;
  /** `data-label` (the card layout shows it); with the aggregate's name where there is a total. */
  readonly label: string;
  readonly title: string | undefined;
  readonly text: string;
}

/** The totals row's cells for the columns, from `table.getAggregates()`. */
export function totalCells<TColumn extends ColumnLike & { readonly header: string }, TResult extends { readonly aggregate: Aggregate }>(
  columns: readonly TColumn[], totals: Readonly<Record<string, TResult | undefined>>, collapsible: boolean,
  labels: { readonly totals: string; aggregate(kind: Aggregate): string }, text: (column: TColumn, result: TResult | undefined) => string,
): TotalCell[] {
  return columns.map((column, index) => {
    const result = totals[column.id];
    const header = index === 0 && !result;
    return {
      columnId: column.id, header,
      className: [collapsible ? `adt-col--p${priorityOf(column, index)}` : '', result ? 'adt-num' : ''].filter(Boolean).join(' '),
      label: result ? `${column.header} · ${labels.aggregate(result.aggregate)}` : column.header,
      title: result ? labels.aggregate(result.aggregate) : undefined,
      text: header ? labels.totals : text(column, result),
    };
  });
}

/** Placeholder rows show while a table with a status source loads its first rows (unless `skeleton: false`). */
export function showSkeleton(skeleton: boolean | undefined, hasStatus: boolean, phase: string | undefined, rows: number): boolean {
  return skeleton !== false && hasStatus && phase === 'loading' && rows === 0;
}

/** Where the page numbers stand: the page, whether it is the first or the last, whether the total is known, the numbers to show. */
export function pagingView(
  table: { getPage(): { readonly page: number; readonly pageCount: number }; getTotalRows(): number | undefined },
  knownPages: number, items: { readonly siblings: number; readonly boundaries: number },
): { readonly page: number; readonly pageCount: number; readonly atStart: boolean; readonly atEnd: boolean; readonly known: boolean; readonly items: readonly (number | 'gap')[] } {
  const { page, pageCount } = table.getPage();
  return { page, pageCount, atStart: page <= 1, atEnd: page >= pageCount, known: table.getTotalRows() !== undefined, items: getPageItems(page, knownPages, items) };
}

/** The IDs from `a` to `b` (both included) in page order; just `[b]` when `a` is not on the page. */
export function rangeOf(pageIds: readonly string[], a: string, b: string): string[] {
  const start = pageIds.indexOf(a);
  const end = pageIds.indexOf(b);
  if (start === -1 || end === -1) return [b];
  return pageIds.slice(Math.min(start, end), Math.max(start, end) + 1);
}

/** What the selection needs of a table. */
interface Selectable {
  getSelectionMode(): string;
  getSelectionStatus(ids: readonly RowId[]): 'none' | 'some' | 'all';
  getState(): { readonly selectedIds: readonly RowId[] };
  selectRows(ids: readonly RowId[]): void;
  setSelectedRows(ids: readonly RowId[]): void;
  toggleRow(id: RowId): void;
}

/** The "select all" box of the page: shown with several rows to pick, checked or partly checked. */
export function selectAllState(table: Selectable, pageIds: readonly string[]): { readonly show: boolean; readonly checked: boolean; readonly indeterminate: boolean } {
  const status = table.getSelectionStatus(pageIds);
  return { show: table.getSelectionMode() === 'multiple' && pageIds.length > 0, checked: status === 'all', indeterminate: status === 'some' };
}

/** The "select all" box changed: clear the page when all of it is selected, else select it. */
export function togglePageSelection(table: Selectable, pageIds: readonly string[]): void {
  if (table.getSelectionStatus(pageIds) === 'all') table.setSelectedRows(withoutIds(table.getState().selectedIds, pageIds));
  else table.selectRows(pageIds);
}

/**
 * A click on a row's checkbox: Shift+click selects (or clears, as the box now
 * is) every row between the last clicked one and this one; a plain click
 * toggles the row. Returns the row to count the next range from.
 */
export function clickRowCheckbox(table: Selectable, pageIds: readonly string[], anchor: string | undefined, rowId: string, shiftKey: boolean, checked: boolean): string {
  if (shiftKey && anchor !== undefined && anchor !== rowId && table.getSelectionMode() === 'multiple') {
    const ids = rangeOf(pageIds, anchor, rowId);
    if (checked) table.selectRows(ids);
    else table.setSelectedRows(withoutIds(table.getState().selectedIds, ids));
  } else {
    table.toggleRow(rowId);
  }
  return rowId;
}

/** The height of the first real row drawn (not a placeholder), for virtual scrolling; 0 while there is none. */
export function measureRowHeight(root: ParentNode | null | undefined): number {
  return root?.querySelector<HTMLElement>('tbody .adt-row:not(.adt-skeleton-row)')?.getBoundingClientRect().height ?? 0;
}
