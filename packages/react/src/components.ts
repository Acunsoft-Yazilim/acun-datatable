import {
  createElement as h, Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore,
  type ChangeEvent, type CSSProperties, type KeyboardEvent, type RefObject, type MouseEvent, type ReactElement, type ReactNode, type SyntheticEvent,
} from 'react';
import type { ColumnDef, DataTable, Row } from '@acunsoft/datatable-core';
import {
  cellValue, checkPageSizes, checkResponsive, checkSize, resolveLabels, filterControls, createCellText, ICONS, labelsEn, knownPageCount, nextSorting, pageInfoText,
  afterPointerRelease, autoResponsive, cellEditor, checkVirtual, virtualWindow, columnsChanged, columnTools, isEditable, numeric, pageSizeChoices, pinColumns, placeMenu, resetColumns, priorityOf, renderBulkActions, renderFilterChips, renderFilterPanel, renderFilters, renderMenu, rowName, scrollHeight,
  checkFixedColumns, type FilterPanelMode, type ToolbarButton, type ToolbarButtons, type CellEditor, type EditHandler, type FixedColumns, type MenuItem, type RenderedComponent, type ResponsiveMode, type TableSize,
  type BulkAction, type BulkSelection, type CellFormatter, type DataTableLabels, type RowAction, type StatusSource,
} from '@acunsoft/datatable-dom';
import {
  actionsCellClass, cellClass, checkActions, clickRowCheckbox, measureRowHeight, closeMenu, closeMenuOnEscape, rowActionsView, selectAllState, togglePageSelection, closeLikeAMenu, closeRowMenusOnOutsideClick, columnSpan, frameThrottle, headerClass, hideDialog, layoutKey, priorityLevels,
  pagingView, resizeHandle, responsiveFlags, showDialog, showSkeleton, skeletonRows, sortView, tableClass, toolbarButtonModel, totalCells, wrapClass,
} from '@acunsoft/datatable-dom/internal';
import { useTable } from './hooks.js';

/** Controls that do not touch rows accept a table of any row type. */
type AnyTable = DataTable<any>;

const withLabels = (labels?: Partial<DataTableLabels>): DataTableLabels => ({ ...labelsEn, ...labels });
// Measure before the browser paints; on the server (no layout) an effect that never runs there.
const useMeasureEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** What a custom cell renderer receives. */
export interface CellRenderProps<TData> {
  readonly column: ColumnDef<TData>;
  readonly row: Row<TData>;
  /** The raw value from the accessor. */
  readonly value: unknown;
  /** The default display text. */
  readonly text: string;
}

export interface DataTableProps<TData> {
  readonly table: DataTable<TData>;
  readonly caption?: string;
  readonly selectable?: boolean;
  /** Locale for default number and date text. Default `'en'`. */
  readonly locale?: string;
  readonly labels?: Partial<DataTableLabels>;
  /** Plain-text formatters per column ID. */
  readonly format?: Readonly<Record<string, CellFormatter<TData>>>;
  /** Custom cells per column ID, e.g. `{ status: ({ value }) => h(Badge, { value }) }`. */
  readonly cells?: Readonly<Record<string, (props: CellRenderProps<TData>) => ReactNode>>;
  /** Shown instead of the default empty text. */
  readonly empty?: ReactNode;
  readonly rowLabel?: (row: Row<TData>) => string;
  readonly rowActions?: readonly RowAction<TData>[];
  /** Server mode: loading and error states, e.g. the HTTP package's runner. */
  readonly status?: StatusSource;
  /** Narrow screens: `cards` (default; `scroll` with `virtual`), `scroll`, `collapse`, `modal` or `auto` (measured); see `ColumnDef.priority`. */
  readonly responsive?: ResponsiveMode;
  /** Density: `sm`, `md` (default) or `lg`. */
  readonly size?: TableSize;
  /** Keep the header at the top of the window while the page scrolls (DataTables `fixedHeader`). */
  readonly stickyHeader?: boolean;
  /** Shift+click adds a second sort column. Default `true`. */
  readonly multiSort?: boolean;
  /** Row actions shown as buttons in the row; the rest go into a "⋮" menu. Default: all. */
  readonly maxInlineActions?: number;
  /** A fixed height to scroll inside, header in place (DataTables `scrollY`): `'60vh'`, `480`. */
  readonly scrollY?: string | number;
  /**
   * A child row under each row (DataTables child rows), opened by a ⊕
   * button; in the dialog with `responsive="modal"`. It renders only while
   * its row is open, so a component in it can load its own data on mount.
   */
  readonly detail?: (row: Row<TData>) => ReactNode;
  /** Placeholder rows while a `status` source loads the first rows. Default `true`. */
  readonly skeleton?: boolean;
  /** Columns that stay while the table scrolls sideways: `{ start: 1, end: 1 }` (DataTables `fixedColumns`). */
  readonly fixedColumns?: FixedColumns;
  /**
   * Save a cell edited in place (columns with `editable`); see
   * `@acunsoft/datatable-dom`'s `onEdit`. Update your data once saved.
   */
  readonly onEdit?: EditHandler<TData>;
  /**
   * Scroll through every matching row of a local table instead of pages
   * (DataTables Scroller): only the rows in view are drawn. `true` or
   * `{ rowHeight, overscan }`; the height is `scrollY` (default 480px).
   */
  readonly virtual?: boolean | { readonly rowHeight?: number; readonly overscan?: number };
  /** Drag a header's edge (or ←/→ on it) to set the column's width. */
  readonly resizableColumns?: boolean;
  /** Drag a header onto another to move the column. */
  readonly reorderableColumns?: boolean;
}

/** Placeholder rows while the first rows load: as many as a page, at most this many. */

const noStatus = (): (() => void) => () => undefined;

/** Read only the phase: sources may return a new object from `getState()` every time. */
function useStatus(status: StatusSource | undefined): string {
  const subscribe = useCallback(
    (onChange: () => void) => (status ? status.subscribe(() => onChange()) : noStatus()),
    [status],
  );
  const read = (): string => status?.getState().status ?? 'idle';
  return useSyncExternalStore(subscribe, read, read);
}

/**
 * An accessible `<table>` for a `createDataTable` table, with the same markup
 * and `adt-*` classes as `@acunsoft/datatable-dom` (its `styles.css` applies):
 * sort buttons with `aria-sort`, Shift+click multi-sort, row and page
 * checkboxes, row actions named after the row, `data-label` for the
 * narrow-screen layout and server-mode states. Custom cells are React
 * elements, escaped by React unless you use `dangerouslySetInnerHTML`.
 */
export function DataTable<TData>(props: DataTableProps<TData>): ReactElement {
  const { table, selectable = false, locale = 'en' } = props;
  const rowActions = checkActions<RowAction<TData>>(props.rowActions ?? [], 'rowActions', ['hidden', 'disabled']); // as the DOM renderer
  const { state, page, visibleColumns: columns } = useTable(table);
  // Virtual scrolling: the scroll position and the measured row height decide the rows drawn.
  const virtual = checkVirtual(props.virtual);
  if (virtual && table.getMode() === 'server') throw new TypeError('virtual scrolling needs a local table; use cursor paging for server tables');
  const [scroll, setScroll] = useState({ top: 0, viewport: 480 });
  const [measuredRow, setMeasuredRow] = useState(0);
  // The column widths of the first rows drawn, kept while scrolling virtually (otherwise every
  // window of rows sizes the columns anew); measured again when the columns or the width change.
  const [locked, setLocked] = useState<{ key: string; width: number; widths: Readonly<Record<string, number>> } | undefined>(undefined);
  const [frames] = useState(() => frameThrottle(globalThis));
  useEffect(() => () => frames.cancel(), [frames]); // a scroll just before unmounting: no update after
  const onScroll = (event: { currentTarget: HTMLElement }): void => {
    const node = event.currentTarget;
    frames.schedule(() => setScroll(current => ({ top: node.scrollTop, viewport: node.clientHeight || current.viewport })));
  };
  const all = virtual ? table.getFilteredRows() : undefined;
  const view = all ? virtualWindow(all.length, virtual!.rowHeight || measuredRow, scroll.top, scroll.viewport, virtual!.overscan) : undefined;
  const rows = all && view ? all.slice(view.start, view.end) : page.rows;
  const labels = withLabels(props.labels);
  const text = useMemo(
    () => createCellText(table.getColumns(), { locale, labels, ...(props.format ? { format: props.format } : {}) }),
    // `labels` is a new object every render; only its yes/no texts matter here.
    [table, locale, props.format, labels.yes, labels.no],
  );
  const phase = useStatus(props.status);
  // With virtual scrolling "all" is every matching row, not only those drawn.
  const pageIds = (all ?? page.rows).map(row => row.id);
  const pageSelection = selectAllState(table, pageIds);
  const selectAll = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = pageSelection.indeterminate;
  });
  // Virtual tables scroll sideways on narrow screens unless told otherwise.
  const responsive = checkResponsive(props.responsive ?? (props.virtual ? 'scroll' : undefined));
  const size = checkSize(props.size);
  const detail = props.detail;
  const { collapsible, inlineDetails, expandable } = responsiveFlags(responsive, detail !== undefined);
  const uid = useId();
  // Responsive collapse: open rows. Modal: the row shown in the dialog.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [dialogRow, setDialogRow] = useState<string | undefined>();
  const dialog = useRef<HTMLDialogElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const anchor = useRef<string | undefined>(undefined);
  const dialogVisible = dialogRow !== undefined && pageIds.includes(dialogRow);
  useEffect(() => {
    if (dialogVisible) showDialog(dialog.current);
    else if (dialog.current?.open) hideDialog(dialog.current);
  }, [dialogVisible]);
  // Fixed columns: sticky offsets measured after every render.
  const fixed = checkFixedColumns(props.fixedColumns);
  useEffect(() => {
    if (!wrap.current || (fixed.start === 0 && fixed.end === 0)) return undefined;
    return pinColumns(wrap.current, fixed);
  }, [fixed.start, fixed.end]);
  // Resizing and moving: one listener set on the wrapper, whatever is re-rendered inside.
  const resizable = props.resizableColumns === true;
  const reorderable = props.reorderableColumns === true;
  useEffect(() => {
    if (!wrap.current || (!resizable && !reorderable)) return undefined;
    return columnTools(wrap.current, table, { resize: resizable, reorder: reorderable });
  }, [table, resizable, reorderable]);
  // responsive="auto": columns hidden while the table does not fit, measured after every render.
  useEffect(() => {
    if (!wrap.current || responsive !== 'auto') return undefined;
    return autoResponsive(wrap.current);
  }, [responsive]);
  // Editing in place: the shared editor is mounted into the editing cell, which React leaves empty.
  const [editing, setEditing] = useState<{ rowId: string; columnId: string } | undefined>();
  const editor = useRef<(CellEditor & { rowId: string; columnId: string }) | undefined>(undefined);
  const refocus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (refocus.current) {
      wrap.current?.querySelector<HTMLElement>(`.adt-edit[data-edit-key="${CSS.escape(refocus.current)}"]`)?.focus();
      refocus.current = undefined;
    }
    const current = editor.current;
    if (!editing) { current?.destroy(); editor.current = undefined; return; }
    // The rows an edit can be in: the page, or every matching row when scrolled virtually.
    const editRows = all ?? page.rows;
    const host = wrap.current?.querySelector('td[data-adt-edit-host]');
    if (current && current.rowId === editing.rowId && current.columnId === editing.columnId) {
      // A re-created cell gets the editor back; a row only scrolled out of view keeps it for when it comes back.
      if (host) { if (!host.contains(current.element)) host.append(current.element); return; }
      if (all && editRows.some(row => row.id === editing.rowId)) return;
      current.destroy();
      editor.current = undefined;
      setEditing(undefined);
      return;
    }
    current?.destroy();
    editor.current = undefined;
    const row = editRows.find(candidate => candidate.id === editing.rowId);
    const column = table.getColumns().find(candidate => candidate.id === editing.columnId);
    if (!row || !column || !host || !props.onEdit) { setEditing(undefined); return; }
    const mounted = cellEditor(host.ownerDocument, {
      row, column, value: cellValue(column, row), labels, onEdit: props.onEdit,
      // Closed by pressing another control: the closed editor stays in its cell until that click is done.
      onClose: () => afterPointerRelease(host.ownerDocument, waited => {
        if (editor.current !== created) return;
        created.destroy();
        editor.current = undefined;
        if (!waited) refocus.current = `${row.id}:${column.id}`;
        setEditing(undefined);
      }),
    });
    const created = Object.assign(mounted, { rowId: row.id, columnId: column.id });
    editor.current = created;
    host.append(mounted.element);
    mounted.focus();
  });
  useEffect(() => () => editor.current?.destroy(), []);
  // Virtual scrolling: the viewport measured once mounted, and on resize where ResizeObserver exists.
  const isVirtual = virtual !== undefined;
  useMeasureEffect(() => {
    const scroller = isVirtual ? wrap.current?.querySelector<HTMLElement>('.adt-scroll') : null;
    if (!scroller) return undefined;
    const measure = (): void => {
      const height = scroller.clientHeight;
      if (height > 0) setScroll(current => (current.viewport === height ? current : { ...current, viewport: height }));
      setLocked(current => (current && current.width !== scroller.clientWidth ? undefined : current)); // a new width: measure again
    };
    measure();
    const view = scroller.ownerDocument.defaultView as (Window & typeof globalThis) | null;
    if (typeof view?.ResizeObserver !== 'function') return undefined;
    const observer = new view.ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [isVirtual]);
  // Virtual scrolling: lock the column widths once rows are drawn (hidden cells measure 0, get none).
  useMeasureEffect(() => {
    if (!virtual || (locked && locked.key === lockKey) || rows.length === 0) return;
    const scroller = wrap.current?.querySelector<HTMLElement>('.adt-scroll');
    const cells = [...(wrap.current?.querySelectorAll<HTMLElement>('thead [data-lock]') ?? [])];
    const widths = Object.fromEntries(cells.map(cell => [cell.dataset['lock']!, cell.getBoundingClientRect().width]).filter(([, width]) => (width as number) > 0));
    if (scroller && Object.keys(widths).length > 0) setLocked({ key: lockKey, width: scroller.clientWidth, widths });
  });
  // Virtual scrolling without rowHeight: measure the first drawn row once.
  useEffect(() => {
    if (!virtual || virtual.rowHeight || measuredRow) return;
    const height = measureRowHeight(wrap.current);
    if (height > 0) setMeasuredRow(height);
  });
  useEffect(() => closeRowMenusOnOutsideClick(document, () => wrap.current), []);
  const closeDialog = (): void => hideDialog(dialog.current);
  const onDialogClose = (): void => {
    const id = dialogRow;
    setDialogRow(undefined);
    // Back to the row's button (Safari does not focus a clicked button).
    [...(wrap.current?.querySelectorAll<HTMLElement>('.adt-expand') ?? [])].find(button => button.dataset['row'] === id)?.focus();
  };
  const levels = priorityLevels(columns, rowActions.length > 0);
  const span = columnSpan(columns.length, { selectable, actions: rowActions.length > 0, expandable });
  // Buttons in the row, the rest in a "⋮" menu; icons, danger colour and a confirm question.
  const actionButtons = (row: Row<TData>, name: string, maxInline = props.maxInlineActions ?? Infinity): ReactNode[] => {
    const { inline, menu } = rowActionsView(rowActions, row, name, labels, maxInline);
    const buttons: ReactNode[] = inline.map(view => h('button', {
      type: 'button', key: view.action.id, 'data-action': view.action.id, className: view.className,
      'aria-label': view.ariaLabel, title: view.title, 'aria-disabled': view.disabled ? 'true' : undefined, onClick: view.run,
    }, view.icon ? icon(view.icon) : null, view.text === undefined ? null : h('span', null, view.text)));
    if (menu) {
      buttons.push(h('details', {
        className: 'adt-row-menu', key: '__menu', onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => placeMenu(event.currentTarget),
        onKeyDown: (event: KeyboardEvent<HTMLDetailsElement>) => closeMenuOnEscape(event.nativeEvent),
      },
      h('summary', { className: 'adt-action adt-action--icon', 'aria-label': menu.label, title: menu.label }, icon('more')),
      h('div', { className: 'adt-menu-list' }, menu.items.map(view => h('button', {
        type: 'button', key: view.action.id, 'data-action': view.action.id, className: view.className,
        'aria-label': view.ariaLabel, 'aria-disabled': view.disabled ? 'true' : undefined,
        onClick: (event: MouseEvent) => {
          closeMenu((event.currentTarget as HTMLElement).closest('details'));
          view.run();
        },
      }, view.icon ? icon(view.icon) : null, h('span', null, view.text))))));
    }
    return buttons;
  };
  const contentOf = (column: ColumnDef<TData>, row: Row<TData>, value: string): ReactNode => {
    const render = props.cells?.[column.id];
    return render ? render({ column, row, value: cellValue(column, row), text: value }) : value;
  };
  // The values of a row: all of them (dialog) or only those a narrow screen hides (details row).
  const detailList = (row: Row<TData>, texts: readonly string[], name: string, all: boolean): ReactElement => h('dl', { className: 'adt-detail-list' },
    ...columns.flatMap((column, index) => {
      const priority = priorityOf(column, index);
      if (!all && priority === 1) return [];
      return [h('div', { className: all ? 'adt-detail-item' : `adt-detail-item adt-col--p${priority}`, key: column.id, 'data-column-id': column.id },
        h('dt', null, column.header), h('dd', null, contentOf(column, row, texts[index]!)))];
    }),
    rowActions.length > 0
      ? h('div', { className: all ? 'adt-detail-item' : 'adt-detail-item adt-col--p2', key: '__actions', 'data-column-id': '__actions' },
        h('dt', null, labels.actions), h('dd', { className: 'adt-detail-actions' }, actionButtons(row, name, Infinity)))
      : null);

  const head: ReactNode[] = [];
  const lockKey = virtual ? layoutKey(columns, selectable, rowActions.length > 0, expandable) : '';
  const lock = virtual && locked?.key === lockKey ? locked.widths : undefined;
  const lockedWidth = (key: string): CSSProperties | undefined => (lock?.[key] ? { width: `${lock[key]}px` } : undefined);
  if (expandable) head.push(h('td', { className: 'adt-expand-cell', key: '__expand', 'data-lock': '__expand', style: lockedWidth('__expand') }, h('span', { className: 'adt-sr-only' }, labels.detailsColumn)));
  if (selectable) {
    head.push(h('th', { scope: 'col', className: 'adt-select', key: '__select', 'data-lock': '__select', style: lockedWidth('__select') },
      pageSelection.show
        ? h('label', { className: 'adt-select-all' }, h('input', {
          type: 'checkbox', ref: selectAll, 'aria-label': all ? labels.selectAllRows : labels.selectAll, checked: pageSelection.checked,
          onChange: () => togglePageSelection(table, pageIds),
        }), h('span', { className: 'adt-select-all-text', 'aria-hidden': 'true' }, all ? labels.selectAllRows : labels.selectAll))
        : null));
  }
  const fixedLayout = Object.keys(state.columnWidths).length > 0 || lock !== undefined;
  for (const column of columns) {
    const sort = column.enableSorting ? sortView(column.id, state.sorting) : undefined;
    const width = state.columnWidths[column.id];
    const { class: resizeClass, ...resize } = resizeHandle(column.id, labels.resizeColumn(column.header), width);
    head.push(h('th', {
      scope: 'col', key: column.id,
      className: headerClass(column, columns.indexOf(column), collapsible, width === undefined && fixedLayout),
      'aria-sort': sort?.ariaSort,
      'data-column-id': column.id, draggable: props.reorderableColumns ? true : undefined,
      'data-lock': column.id,
      style: width !== undefined ? { width: `${width}px` } : lockedWidth(column.id),
    }, sort
      ? h('button', {
        type: 'button', className: sort.className,
        onClick: (event: MouseEvent) => table.setSorting(nextSorting(table.getState().sorting, column.id, event.shiftKey && props.multiSort !== false)),
      }, column.header, h('span', { className: 'adt-sort-mark', 'aria-hidden': 'true' }, sort.mark),
      sort.order ? h('span', { className: 'adt-sr-only' }, labels.sortOrder(sort.order.position, sort.order.direction)) : null)
      : column.header,
    props.resizableColumns ? h('span', { ...resize, className: resizeClass, tabIndex: 0 }) : null));
  }
  if (rowActions.length > 0) {
    head.push(h('th', { scope: 'col', className: collapsible ? 'adt-th adt-actions adt-col--p2' : 'adt-th adt-actions', key: '__actions', 'data-lock': '__actions', style: lockedWidth('__actions') }, labels.actions));
  }

  const body: ReactNode[] = [];
  // Placeholder rows while the first rows of a remote table load.
  const skeleton = showSkeleton(props.skeleton, props.status !== undefined, phase, page.rows.length);
  if (skeleton) {
    for (let index = 0; index < skeletonRows(state.pageSize); index++) {
      body.push(h('tr', { className: 'adt-row adt-skeleton-row', key: `__skeleton${index}` },
        expandable ? h('td', { className: 'adt-expand-cell' }) : null,
        selectable ? h('td', { className: 'adt-select' }) : null,
        ...columns.map((column, columnIndex) => h('td', {
          'data-label': column.header, key: column.id,
          className: cellClass(column, columnIndex, collapsible) || undefined,
        }, h('span', { className: 'adt-skeleton' }))),
        rowActions.length > 0 ? h('td', { className: actionsCellClass(collapsible) }) : null));
    }
  } else if (rows.length === 0) {
    body.push(h('tr', { className: 'adt-empty', key: '__empty' }, h('td', { colSpan: span }, props.empty ?? labels.empty)));
  }
  let dialogContent: ReactNode[] = [];
  const spacer = (pixels: number, key: string): ReactElement => h('tr', { className: 'adt-spacer', 'aria-hidden': true, key }, h('td', { colSpan: span, style: { height: `${pixels}px` } }));
  if (view && view.before > 0) body.push(spacer(view.before, '__before'));
  rows.forEach((row, rowIndex) => {
    const texts = columns.map(column => text(column, row));
    const name = rowName(row, texts[0] ?? '', props.rowLabel);
    const selected = table.isSelected(row.id);
    const open = responsive !== 'modal' && expanded.has(row.id);
    const detailId = `${uid}-detail-${rowIndex}`;
    const cells: ReactNode[] = [];
    if (expandable) {
      cells.push(h('td', { className: 'adt-expand-cell', key: '__expand' }, h('button', {
        type: 'button', className: 'adt-expand', 'aria-label': labels.details(name), 'data-row': row.id,
        ...(responsive !== 'modal' ? { 'aria-expanded': open, 'aria-controls': detailId } : { 'aria-haspopup': 'dialog' as const }),
        onClick: () => {
          if (responsive === 'modal') return setDialogRow(row.id);
          setExpanded(current => {
            const next = new Set(current);
            if (!next.delete(row.id)) next.add(row.id);
            return next;
          });
        },
      }, icon(open ? 'collapse' : 'expand'))));
    }
    if (dialogRow === row.id) {
      dialogContent = [
        h('div', { className: 'adt-dialog-head', key: 'head' },
          h('h2', { className: 'adt-dialog-title', id: `${uid}-dialog-title` }, labels.details(name)),
          h('button', { type: 'button', className: 'adt-dialog-close', 'aria-label': labels.close, onClick: closeDialog }, icon('close'))),
        h(Fragment, { key: 'body' }, detailList(row, texts, name, true)), // the <dl> right in the dialog, as the DOM renderer and Vue
        detail ? h('div', { className: 'adt-detail-content', key: 'detail' }, detail(row)) : null,
      ];
    }
    if (selectable) {
      cells.push(h('td', { className: 'adt-select', key: '__select' }, h('input', {
        type: 'checkbox', 'aria-label': labels.selectRow(name), checked: selected, onChange: () => undefined,
        // Shift+click selects (or clears) every row between the last clicked one and this one.
        onClick: (event: MouseEvent<HTMLInputElement>) => {
          anchor.current = clickRowCheckbox(table, pageIds, anchor.current, row.id, event.shiftKey, event.currentTarget.checked);
        },
      })));
    }
    columns.forEach((column, index) => {
      const editable = props.onEdit !== undefined && isEditable(column);
      const isEditing = editable && editing?.rowId === row.id && editing.columnId === column.id;
      const start = (): void => setEditing({ rowId: row.id, columnId: column.id });
      cells.push(h('td', {
        'data-label': column.header, key: column.id,
        className: cellClass(column, index, collapsible, editable, isEditing) || undefined,
        'data-adt-edit-host': isEditing ? '' : undefined,
        onDoubleClick: editable && !isEditing
          ? (event: MouseEvent) => { if (!(event.target as Element).closest('a, button, input, select')) start(); }
          : undefined,
      }, isEditing ? null : contentOf(column, row, texts[index]!), isEditing || !editable ? null : h('button', {
        type: 'button', className: 'adt-edit', 'aria-label': labels.editCell(column.header, name),
        'data-edit-key': `${row.id}:${column.id}`, onClick: start,
      }, icon('edit'))));
    });
    if (rowActions.length > 0) {
      cells.push(h('td', {
        className: actionsCellClass(collapsible), 'data-label': labels.actions, key: '__actions',
      }, actionButtons(row, name)));
    }
    const rowClass = ['adt-row', selected ? 'adt-row--selected' : '', open ? 'adt-row--expanded' : ''].filter(Boolean).join(' ');
    body.push(h('tr', { className: rowClass, 'data-row-id': row.id, key: row.id, 'aria-rowindex': view ? view.start + rowIndex + 2 : undefined }, cells));
    if (open) {
      body.push(h('tr', { className: 'adt-detail', id: detailId, key: `${row.id}__detail` },
        h('td', { colSpan: span },
          inlineDetails ? detailList(row, texts, name, false) : null,
          detail ? h('div', { className: 'adt-detail-content' }, detail(row)) : null)));
    }
  });
  if (view && view.after > 0) body.push(spacer(view.after, '__after'));

  const busy = phase === 'loading';
  const notice = phase === 'loading'
    ? h('div', { className: 'adt-notice', role: 'status', 'aria-live': 'polite' }, h('span', { className: 'adt-notice-text' }, labels.loading))
    : phase === 'error'
      ? h('div', { className: 'adt-notice', role: 'alert' },
        h('span', { className: 'adt-notice-text' }, labels.error),
        typeof props.status?.retry === 'function'
          ? h('button', { type: 'button', className: 'adt-retry', onClick: () => { Promise.resolve(props.status!.retry!()).catch(() => undefined); } }, labels.retry)
          : null)
      : h('div', { className: 'adt-notice', role: 'status', 'aria-live': 'polite' });
  const height = scrollHeight(props.scrollY) ?? (virtual ? '480px' : undefined);
  const wrapClassName = wrapClass({ responsive, size, stickyHeader: props.stickyHeader === true, scrollY: height !== undefined, loading: busy, skeleton, virtual: virtual !== undefined });
  const tableClassName = tableClass({ collapsible, levels, detail: detail !== undefined, userWidths: Object.keys(state.columnWidths).length > 0, locked: lock !== undefined });
  return h('div', {
    className: wrapClassName, ref: wrap,
    style: height ? ({ '--adt-scroll-y': height } as CSSProperties) : undefined,
  },
    notice,
    // aria-busy on the rows' box, not around the notice (a busy region's changes may be held back).
    h('div', { className: 'adt-scroll', onScroll: virtual ? onScroll : undefined, 'aria-busy': props.status ? busy : undefined }, h('table', { className: tableClassName, 'aria-rowcount': all ? all.length + 1 + (columns.some(column => column.aggregate !== undefined) ? 1 : 0) : undefined },
      props.caption !== undefined ? h('caption', null, props.caption) : null,
      h('thead', null, h('tr', null, head)),
      h('tbody', skeleton ? { 'aria-hidden': true } : null, body),
      // Footer totals of the columns with `aggregate` (every matching row).
      columns.some(column => column.aggregate !== undefined) ? h('tfoot', null, h('tr', { className: 'adt-total' }, ...(() => {
        const cells: ReactNode[] = [];
        if (expandable) cells.push(h('td', { className: 'adt-expand-cell', key: '__expand' }));
        if (selectable) cells.push(h('td', { className: 'adt-select', key: '__select' }));
        for (const cell of totalCells(columns, table.getAggregates(), collapsible, labels, (column, result) => text.total(column, result))) {
          cells.push(h(cell.header ? 'th' : 'td', {
            scope: cell.header ? 'row' : undefined, className: cell.className || undefined, 'data-label': cell.label, title: cell.title, key: cell.columnId,
          }, cell.text));
        }
        if (rowActions.length > 0) cells.push(h('td', { className: actionsCellClass(collapsible), key: '__actions' }));
        return cells;
      })())) : null)),
    responsive === 'modal'
      ? h('dialog', {
        ref: dialog, className: 'adt-dialog', 'aria-labelledby': `${uid}-dialog-title`, onClose: onDialogClose,
        onClick: (event: MouseEvent) => { if (event.target === event.currentTarget) closeDialog(); },
      }, dialogContent)
      : null);
}

const icon = (name: keyof typeof ICONS | { readonly path: string }): ReactElement => h('svg', {
  className: 'adt-icon', viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
}, h('path', { d: typeof name === 'string' ? ICONS[name] : name.path }));

export interface PaginationProps {
  readonly table: AnyTable;
  /** Pages shown on each side of the current page. Default 1. */
  readonly siblings?: number;
  /** Pages always shown at the start and the end. Default 1. */
  readonly boundaries?: number;
  /** Also show "first" and "last" buttons. Default `false`. */
  readonly firstLast?: boolean;
  /** Locale for the page numbers' digit grouping. Default `'en'`. */
  readonly locale?: string;
  readonly labels?: Partial<DataTableLabels>;
}

/**
 * Numbered pages: `‹ 1 … 4 5 6 … 20 ›`, with a fixed number of buttons while
 * there are more pages than fit. With an unknown server total it numbers the
 * pages known to exist (seen so far, or up to the server's `totalRowsAtLeast`)
 * and keeps "next" while the page is full.
 */
export function Pagination({
  table, siblings = 1, boundaries = 1, firstLast = false, locale = 'en', labels: custom,
}: PaginationProps): ReactElement {
  useTable(table); // follow the table
  const labels = withLabels(custom);
  const numbers = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const page = pagingView(table, knownPageCount(table), { siblings, boundaries });
  const { known, items, atStart, atEnd } = page;
  const arrow = (name: 'first' | 'previous' | 'next' | 'last', disabled: boolean, target: number): ReactElement => h('button', {
    type: 'button', className: `adt-page adt-page-arrow adt-${name}`, 'aria-label': labels[name],
    'aria-disabled': disabled ? 'true' : undefined, onClick: () => { if (!disabled) table.setPage(target); },
  }, icon(name));
  return h('nav', { className: 'adt-paging', 'aria-label': labels.pagination },
    firstLast ? arrow('first', atStart, 1) : null,
    arrow('previous', atStart, page.page - 1),
    h('span', { className: 'adt-page-numbers' }, items.map((item, index) => item === 'gap'
      ? h('span', { className: 'adt-page-gap', 'aria-hidden': 'true', key: `gap${index}` }, '…')
      : h('button', {
        type: 'button', className: 'adt-page', key: item, 'aria-label': labels.page(item),
        'aria-current': item === page.page ? 'page' : undefined, onClick: () => table.setPage(item),
      }, numbers.format(item)))),
    arrow('next', atEnd, page.page + 1),
    firstLast && known ? arrow('last', atEnd, page.pageCount) : null);
}

export interface PageSizeProps {
  readonly table: AnyTable;
  /** Default `[10, 25, 50, 100]`; the current size is always listed. */
  readonly pageSizes?: readonly number[];
  readonly labels?: Partial<DataTableLabels>;
}

/** A rows-per-page select with a visually hidden label. */
export function PageSize({ table, pageSizes = [10, 25, 50, 100], labels: custom }: PageSizeProps): ReactElement {
  checkPageSizes(pageSizes);
  const { state } = useTable(table);
  return h('label', { className: 'adt-length' },
    h('span', { className: 'adt-sr-only' }, withLabels(custom).pageSize),
    h('select', {
      className: 'adt-control', value: String(state.pageSize),
      onChange: (event: ChangeEvent<HTMLSelectElement>) => table.setPageSize(Number(event.target.value)),
    }, pageSizeChoices(pageSizes, state.pageSize).map(size => h('option', { value: String(size), key: size }, String(size)))));
}

export interface PageInfoProps {
  readonly table: AnyTable;
  readonly labels?: Partial<DataTableLabels>;
  /** Count every matching row as shown (virtual scrolling). */
  readonly all?: boolean;
}

/** The visible range and the total, `1–25 of 5,000 rows`, as a polite live region. */
export function PageInfo({ table, labels: custom, all = false }: PageInfoProps): ReactElement {
  useTable(table); // re-render on every table change
  return h('div', { className: 'adt-info', 'aria-live': 'polite', 'aria-atomic': 'true' }, pageInfoText(table, withLabels(custom), all));
}

export interface SearchProps {
  readonly table: AnyTable;
  readonly placeholder?: string;
  readonly debounceMs?: number;
  readonly labels?: Partial<DataTableLabels>;
}

/** A search input with an icon and a visually hidden label, bound to the global search; debounced, Enter applies at once. */
export function Search({ table, placeholder, debounceMs = 250, labels: custom }: SearchProps): ReactElement {
  if (!Number.isFinite(debounceMs) || debounceMs < 0) throw new RangeError('debounceMs must be a non-negative number');
  const { state } = useTable(table);
  const [text, setText] = useState(state.globalSearch);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typing = useRef(false);
  useEffect(() => {
    if (!typing.current && timer.current === undefined) setText(state.globalSearch);
  }, [state.globalSearch]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const apply = (value: string): void => {
    clearTimeout(timer.current);
    timer.current = undefined;
    table.setGlobalSearch(value);
  };
  const labels = withLabels(custom);
  return h('label', { className: 'adt-search' },
    h('span', { className: 'adt-sr-only' }, labels.search),
    icon('search'),
    h('input', {
      type: 'search', className: 'adt-control', autoComplete: 'off', value: text, placeholder: placeholder ?? `${labels.search}…`,
      onFocus: () => { typing.current = true; },
      onBlur: () => { typing.current = false; },
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setText(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => apply(value), debounceMs);
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') apply(event.currentTarget.value); },
    }));
}

export interface ColumnToggleProps {
  readonly table: AnyTable;
  readonly labels?: Partial<DataTableLabels>;
  /** Up/down buttons per column to change the order with the keyboard. */
  readonly reorderable?: boolean;
  /** The button's text, icon and classes. */
  readonly button?: ToolbarButton;
}

/** A toolbar button's classes, tooltip and content, as `fillButton` builds them in the DOM. */
function toolbarButton(custom: ToolbarButton | undefined, label: string, fallback: keyof typeof ICONS): { className?: string; title?: string; children: ReactNode[] } {
  const model = toolbarButtonModel(custom, { label, icon: fallback });
  return {
    ...(model.className ? { className: model.className } : {}),
    ...(model.title !== undefined ? { title: model.title } : {}),
    children: [model.icon === false ? null : icon(model.icon), h('span', { className: 'adt-summary-text' }, model.label)], // spread as arguments, so no keys
  };
}

/**
 * A "Columns" menu (`<details>`) with a labelled checkbox per column, in
 * display order; with `reorderable`, up/down buttons, and "Reset columns"
 * once the order or widths changed.
 */
export function ColumnToggle({ table, labels: custom, reorderable = false, button }: ColumnToggleProps): ReactElement {
  const { state } = useTable(table);
  const labels = withLabels(custom);
  const columns = table.getColumns();
  const byId = new Map(columns.map(column => [column.id, column]));
  const lastVisible = columns.length - state.hiddenColumns.length === 1;
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => (menu.current ? closeLikeAMenu(menu.current) : undefined), []); // Escape and a click outside close it
  return h('details', { className: 'adt-columns', ref: menu, onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => placeMenu(event.currentTarget) },
    (({ children, ...summary }) => h('summary', summary, ...children))(toolbarButton(button, labels.columns, 'columns')),
    h('fieldset', null, h('legend', null, labels.showColumns), state.columnOrder.map((id, index) => {
      const column = byId.get(id)!;
      const shown = !state.hiddenColumns.includes(id);
      const checkbox = h('label', reorderable ? null : { key: id },
        h('input', {
          type: 'checkbox', value: id, checked: shown,
          disabled: column.enableHiding === false || (lastVisible && shown),
          onChange: (event: ChangeEvent<HTMLInputElement>) => table.setColumnVisibility(id, event.target.checked),
        }),
        h('span', null, column.header));
      if (!reorderable) return checkbox;
      const move = (direction: 'up' | 'down'): ReactElement => {
        const to = direction === 'up' ? index - 1 : index + 1;
        const disabled = to < 0 || to >= state.columnOrder.length;
        return h('button', {
          type: 'button', className: 'adt-move', 'aria-disabled': disabled ? true : undefined,
          'aria-label': direction === 'up' ? labels.moveColumnUp(column.header) : labels.moveColumnDown(column.header),
          onClick: () => { if (!disabled) table.moveColumn(id, to); },
        }, icon(direction));
      };
      return h('div', { className: 'adt-column-item', key: id }, checkbox, move('up'), move('down'));
    }), columnsChanged(table)
      ? h('button', { type: 'button', className: 'adt-columns-reset', onClick: () => { resetColumns(table); menu.current?.querySelector<HTMLElement>(':scope > summary')?.focus(); } }, labels.resetColumns)
      : null));
}

export interface BulkActionsProps<TData> {
  readonly table: DataTable<TData>;
  readonly actions: readonly BulkAction<TData>[];
  readonly labels?: Partial<DataTableLabels>;
}

/**
 * A bar for actions on the selected rows (see `renderBulkActions`): "N
 * selected", the actions, "Select all N matching" and "Clear selection".
 */
export function BulkActions<TData>({ table, actions, labels }: BulkActionsProps<TData>): ReactElement {
  // Mounted once per table, actions and labels: a parent re-render keeps focus in the bar.
  const latest = useLatest(actions);
  const host = useDomControl(el => renderBulkActions(el, table, { actions: latest.entries(), labels: withLabels(labels) }), [table, latest.shape, JSON.stringify(labels ?? {})]);
  return h('div', { ref: host, className: 'adt-feature' });
}

export interface FiltersProps {
  readonly table: AnyTable;
  readonly labels?: Partial<DataTableLabels>;
  /** For dates and numbers in the chips. Default `'en'`. */
  readonly locale?: string;
}

export interface FiltersMenuProps extends FiltersProps {
  /** Where the fields open: `'dropdown'` (default), `'drawer'` or `'modal'`. For your own, use `FilterPanel`. */
  readonly panel?: FilterPanelMode;
  /** The button's text, icon and classes. */
  readonly button?: ToolbarButton;
}

/**
 * Actions or items for a mounted control: `shape` is everything but the
 * callbacks (a new array of the same entries is no change), and `entries()`
 * gives entries whose callbacks call the latest entry with the same ID.
 */
function useLatest<T extends { readonly id: string }>(list: readonly T[]): { readonly shape: string; entries(): T[] } {
  const latest = useRef(list);
  useEffect(() => { latest.current = list; });
  return {
    shape: JSON.stringify(list, (_, value: unknown) => (typeof value === 'function' ? true : value)),
    entries: () => list.map(entry => Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, typeof value === 'function'
      ? (...args: unknown[]) => (latest.current.find(next => next.id === entry.id) as Record<string, ((...args: unknown[]) => unknown) | undefined> | undefined)?.[key]?.(...args)
      : value])) as T),
  };
}

/** Mount a DOM-renderer control once per table, labels and locale. */
function useDomControl(render: (el: HTMLElement) => RenderedComponent, deps: readonly unknown[]): RefObject<HTMLDivElement | null> {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return undefined;
    const part = render(host.current);
    return () => part.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return host;
}

/** The "Filters" button: a control per column with `filter`, under the button, in a drawer or a modal (see `renderFilters`). */
export function Filters({ table, labels, locale = 'en', panel, button }: FiltersMenuProps): ReactElement {
  const host = useDomControl(
    el => renderFilters(el, table, { labels: withLabels(labels), locale, ...(panel ? { panel } : {}), ...(button ? { button } : {}) }),
    [table, locale, panel, JSON.stringify(labels ?? {}), JSON.stringify(button ?? {})],
  );
  return h('div', { ref: host, className: 'adt-feature' });
}

/** Only the filter fields and "Clear filters", for your own drawer, modal or sidebar (see `renderFilterPanel`). */
export function FilterPanel({ table, labels, locale = 'en' }: FiltersProps): ReactElement {
  const host = useDomControl(el => renderFilterPanel(el, table, { labels: withLabels(labels), locale }), [table, locale, JSON.stringify(labels ?? {})]);
  return h('div', { ref: host, className: 'adt-filter-host' });
}

/** The active filters as removable chips (see `renderFilterChips`). */
export function FilterChips({ table, labels, locale = 'en' }: FiltersProps): ReactElement {
  const host = useDomControl(el => renderFilterChips(el, table, { labels: withLabels(labels), locale }), [table, locale, JSON.stringify(labels ?? {})]);
  return h('div', { ref: host, className: 'adt-feature' });
}

export interface ToolsProps {
  readonly items: readonly MenuItem[];
  /** The button text. Default: the `tools` label. */
  readonly label?: string;
  /** The button's text, icon and classes. */
  readonly button?: ToolbarButton;
  readonly labels?: Partial<DataTableLabels>;
}

/** A tools menu (export, copy, print, your own actions) with `items` (see `renderMenu`). */
export function Tools({ items, label, button, labels }: ToolsProps): ReactElement {
  // Mounted once per items, label and labels: a parent re-render keeps the menu open.
  const latest = useLatest(items);
  const host = useDomControl(
    el => renderMenu(el, { items: latest.entries(), labels: withLabels(labels), ...(label ? { label } : {}), ...(button ? { button } : {}) }),
    [latest.shape, label, JSON.stringify(labels ?? {}), JSON.stringify(button ?? {})],
  );
  return h('div', { ref: host, className: 'adt-feature' });
}

export interface DataTableLayoutProps<TData> extends DataTableProps<TData> {
  /** Choices of the rows-per-page select. Default `[10, 25, 50, 100]`. */
  readonly pageSizes?: readonly number[];
  /** Show the search box. Default `true`. */
  readonly search?: boolean;
  readonly searchPlaceholder?: string;
  readonly debounceMs?: number;
  /** The filters menu and chips, for columns with `filter`. Default `true`. */
  readonly filters?: boolean;
  /** The column menu. Default `true`. */
  readonly columnToggle?: boolean;
  /** The tools menu items (export, copy, print, your own). */
  readonly tools?: readonly MenuItem[];
  /** Where the filter fields open: `'dropdown'` (default), `'drawer'` or `'modal'`. */
  readonly filterPanel?: FilterPanelMode;
  /** Text, icon and classes of the columns, filters and tools buttons. */
  readonly toolbarButtons?: ToolbarButtons;
  readonly bulkActions?: readonly BulkAction<TData>[];
  readonly paging?: { readonly siblings?: number; readonly boundaries?: number; readonly firstLast?: boolean };
  /** Your own controls in the bars. */
  readonly topStart?: ReactNode;
  readonly topEnd?: ReactNode;
  readonly bottomStart?: ReactNode;
  readonly bottomEnd?: ReactNode;
}

/**
 * The table and its controls in a bar above and a bar below, like
 * `renderDataTable`: page size, search, filters, column menu and tools on
 * top; filter chips and bulk actions; the table; info and pages below.
 */
export function DataTableLayout<TData>(props: DataTableLayoutProps<TData>): ReactElement {
  const {
    pageSizes, search = true, searchPlaceholder, debounceMs, filters = true, columnToggle = true, tools = [], bulkActions = [], filterPanel, toolbarButtons,
    paging = {}, topStart, topEnd, bottomStart, bottomEnd, size = 'md', ...tableProps
  } = props;
  const { table, locale = 'en' } = props;
  // The texts of `locale` (tr, de, fr, es), with `labels` over them, as renderDataTable does.
  const labels = resolveLabels(locale, props.labels);
  const hasFilters = filters && filterControls(table.getColumns()).length > 0;
  const bar = (position: 'top' | 'bottom', start: ReactNode[], end: ReactNode[]): ReactElement =>
    h('div', { className: `adt-bar adt-${position}` }, h('div', { className: 'adt-bar-start' }, ...start), h('div', { className: 'adt-bar-end' }, ...end));
  return h('div', { className: size === 'md' ? 'adt' : `adt adt-size--${size}` },
    bar('top', [
      props.virtual ? null : h(PageSize, { key: 'size', table, ...(pageSizes ? { pageSizes } : {}), ...(labels ? { labels } : {}) }),
      search ? h('div', { key: 'search', className: 'adt-feature adt-feature--search' },
        h(Search, { table, ...(searchPlaceholder ? { placeholder: searchPlaceholder } : {}), ...(debounceMs !== undefined ? { debounceMs } : {}), ...(labels ? { labels } : {}) })) : null,
      topStart ?? null,
    ], [
      topEnd ?? null,
      hasFilters ? h(Filters, { key: 'filters', table, locale, ...(labels ? { labels } : {}), ...(filterPanel ? { panel: filterPanel } : {}), ...(toolbarButtons?.filters ? { button: toolbarButtons.filters } : {}) }) : null,
      columnToggle ? h(ColumnToggle, { key: 'columns', table, reorderable: props.reorderableColumns === true, ...(labels ? { labels } : {}), ...(toolbarButtons?.columns ? { button: toolbarButtons.columns } : {}) }) : null,
      tools.length > 0 ? h(Tools, { key: 'tools', items: tools, ...(labels ? { labels } : {}), ...(toolbarButtons?.tools ? { button: toolbarButtons.tools } : {}) }) : null,
    ]),
    hasFilters ? h(FilterChips, { table, locale, ...(labels ? { labels } : {}) }) : null,
    // The selection bar (count, "select all N matching", clear, bulk actions) with any selectable table.
    props.selectable || bulkActions.length > 0 ? h(BulkActions<TData>, { table, actions: bulkActions, ...(labels ? { labels } : {}) }) : null,
    h(DataTable<TData>, { ...tableProps, labels } as DataTableProps<TData>),
    bar('bottom', [h(PageInfo, { key: 'info', table, all: Boolean(props.virtual), ...(labels ? { labels } : {}) }), bottomStart ?? null],
      [bottomEnd ?? null, props.virtual ? null : h(Pagination, { key: 'paging', table, locale, ...paging, ...(labels ? { labels } : {}) })]));
}
