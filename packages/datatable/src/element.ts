import type { DataTableEvent, DataTableState } from '@acunsoft/datatable-core';
import { AcunDataTable, type AcunDataTableOptions, type ColumnOptions } from './acun-datatable';

type Data = Record<string, unknown>;

/** Attributes the element reads; the rest of the options are the `options` property. */
const ATTRIBUTES = [
  'src', 'server-side', 'method', 'language', 'page-size', 'responsive', 'size', 'fixed-header', 'scroll-y', 'virtual', 'cursor', 'state-save', 'filter-panel',
] as const;
type Attribute = (typeof ATTRIBUTES)[number];

/**
 * What a change needs, from least to most: new rows, the page size, a new
 * build that keeps what the user did (page, sorting, filters, search,
 * selection, columns), or a fresh start (other rows or columns).
 */
const enum Change { None, Rows, PageSize, View, Fresh }
/** Attributes that only change how the table looks or behaves: rebuilt with the user's state. */
const VIEW: ReadonlySet<string> = new Set(['language', 'responsive', 'size', 'fixed-header', 'scroll-y', 'virtual', 'state-save', 'filter-panel']);
/** Properties a framework may set before the element is defined; taken over on connect. */
const PROPERTIES = ['options', 'columns', 'data', 'src', 'serverSide', 'method', 'language', 'pageSize', 'responsive', 'size', 'fixedHeader', 'scrollY', 'virtual', 'cursor', 'stateSave', 'filterPanel'] as const;

const flag = (value: string | null): boolean | undefined => (value === null ? undefined : value !== 'false');

/** `detail` of `adt-change`. */
export interface AcunDataTableChangeDetail {
  readonly state: Readonly<DataTableState>;
  readonly event: Readonly<DataTableEvent>;
}

/** `detail` of `adt-error`. */
export interface AcunDataTableErrorDetail {
  readonly error: unknown;
}

/** The events of `<acun-datatable>`; all bubble and cross shadow roots. */
export interface AcunDataTableElementEventMap extends HTMLElementEventMap {
  /** Every change of the table: page, sorting, filters, search, selection, rows, columns. */
  'adt-change': CustomEvent<AcunDataTableChangeDetail>;
  /** The first rows are shown (after every rebuild). */
  'adt-ready': CustomEvent<undefined>;
  /** The table could not be built (bad options) or its rows could not be loaded. */
  'adt-error': CustomEvent<AcunDataTableErrorDetail>;
}

// Importing on a server (SSR) must not fail where there is no DOM.
const Base = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;

/**
 * `<acun-datatable>`: the whole table as a standard custom element, for plain
 * HTML or any framework that renders HTML. Attributes cover the common
 * options (`src`, `server-side`, `method`, `language`, `page-size`,
 * `responsive`, `size`, `fixed-header`, `scroll-y`, `virtual`, `cursor`,
 * `state-save`, `filter-panel`), each also a property (`pageSize`,
 * `serverSide`, …); the `options`, `columns` and `data` properties take
 * everything else. A `<table>` inside it is the source when there is no `src`
 * or `data`. Light DOM, so `styles.css` and the page's theme apply. It fires
 * `adt-change` (detail: `{ state, event }`) on every table change,
 * `adt-ready` once the first rows are shown and `adt-error` when the table
 * fails; all bubble. `table` is the `AcunDataTable` instance.
 *
 * Changing `page-size` or `data` updates the table in place; the other view
 * attributes rebuild it with the page, sorting, filters, search, selection
 * and columns kept; `src`, `server-side`, `method`, `cursor`, `columns` and
 * `options` start over.
 */
export class AcunDataTableElement extends Base {
  static readonly observedAttributes = ATTRIBUTES;

  #instance: AcunDataTable | undefined;
  #options: AcunDataTableOptions = {};
  #columns: readonly ColumnOptions[] | undefined;
  #data: readonly Data[] | undefined;
  #queued = false;
  #change = Change.None;
  #upgraded = false;
  #source: HTMLTableElement | undefined;

  /** The running table (after it is connected). */
  get table(): AcunDataTable | undefined { return this.#instance; }

  /** Every `AcunDataTable` option; attributes win over these. */
  get options(): AcunDataTableOptions { return this.#options; }
  set options(value: AcunDataTableOptions) { this.#options = value ?? {}; this.#schedule(Change.Fresh); }

  get columns(): readonly ColumnOptions[] | undefined { return this.#columns; }
  set columns(value: readonly ColumnOptions[] | undefined) { this.#columns = value; this.#schedule(Change.Fresh); }

  /** Rows for a table in the browser (instead of `src`). New rows keep the page, sorting, search and selection. */
  get data(): readonly Data[] | undefined { return this.#data; }
  set data(value: readonly Data[] | undefined) { this.#data = value; this.#schedule(value === undefined ? Change.Fresh : Change.Rows); }

  connectedCallback(): void {
    if (!this.#upgraded) this.#upgradeProperties();
    // Moved within the page: the running table stays as it is.
    if (!this.#instance) this.#schedule(Change.Fresh);
  }

  disconnectedCallback(): void {
    // Moved within the page: it is connected again before this runs.
    queueMicrotask(() => { if (!this.isConnected) this.#destroy(); });
  }

  attributeChangedCallback(name: string, before: string | null, after: string | null): void {
    if (before === after) return;
    this.#schedule(name === 'page-size' ? Change.PageSize : VIEW.has(name) ? Change.View : Change.Fresh);
  }

  /** Load the rows again. */
  reload(): Promise<void> { return this.#instance?.reload() ?? Promise.resolve(); }

  /**
   * A property set before the element was defined (a framework that renders
   * first, a deferred script) is an own property hiding the accessor: take
   * its value over, through the accessor.
   */
  #upgradeProperties(): void {
    this.#upgraded = true;
    for (const name of PROPERTIES) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const value = (this as Record<string, unknown>)[name];
        delete (this as Record<string, unknown>)[name];
        (this as Record<string, unknown>)[name] = value;
      }
    }
  }

  #schedule(change: Change): void {
    this.#change = Math.max(this.#change, change);
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      let change = this.#change;
      this.#change = Change.None;
      if (!this.isConnected) return;
      const instance = this.#instance;
      const table = instance?.table;
      // Rows from a server, or a table that is not built yet: new rows are a new start.
      if (change === Change.Rows && (!instance || !this.#data || table?.getMode() === 'server' || this.hasAttribute('src'))) change = Change.Fresh;
      if (change !== Change.Fresh && !table) change = Change.Fresh; // not ready yet: build it with everything
      if (change === Change.Rows) {
        instance!.setData(this.#data!);
      } else if (change === Change.PageSize) {
        const size = Number(this.getAttribute('page-size'));
        if (Number.isInteger(size) && size > 0) table!.setPageSize(size);
      } else if (change === Change.View) {
        this.#render(table!.getState());
      } else if (change === Change.Fresh) {
        this.#render(undefined);
      }
    });
  }

  #destroy(): void {
    this.#instance?.destroy(); // puts an original <table> back
    this.#instance = undefined;
  }

  #emit<K extends 'adt-change' | 'adt-ready' | 'adt-error'>(type: K, detail: AcunDataTableElementEventMap[K]['detail'], cancelable = false): boolean {
    return this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable }));
  }

  /** Build the table; `kept` is the user's state to carry over (a view change). */
  #render(kept: Readonly<DataTableState> | undefined): void {
    this.#destroy();
    const attr = (name: Attribute): string | null => this.getAttribute(name);
    const src = attr('src');
    const pageSize = attr('page-size');
    const scrollY = attr('scroll-y');
    // The selection (and the page) come back once the rows are there: a table in the browser checks its row IDs.
    const { selectedIds, ...state } = kept ?? { selectedIds: [] as DataTableState['selectedIds'] };
    const options = {
      ...this.#options,
      ...(this.#columns ? { columns: this.#columns } : {}),
      ...(this.#data ? { data: this.#data } : {}),
      ...(src ? { ajax: { url: src, ...(attr('method') === 'POST' ? { method: 'POST' as const } : {}) } } : {}),
      ...(flag(attr('server-side')) !== undefined ? { serverSide: flag(attr('server-side'))! } : {}),
      ...(attr('language') ? { language: attr('language') as NonNullable<AcunDataTableOptions['language']> } : {}),
      ...(pageSize || flag(attr('cursor')) ? {
        pagination: {
          ...(typeof this.#options.pagination === 'object' ? this.#options.pagination : {}),
          ...(pageSize ? { pageSize: Number(pageSize) } : {}),
          ...(flag(attr('cursor')) ? { cursor: true } : {}),
        },
      } : {}),
      ...(attr('responsive') ? { responsive: attr('responsive') as AcunDataTableOptions['responsive'] } : {}),
      ...(attr('size') ? { size: attr('size') as AcunDataTableOptions['size'] } : {}),
      ...(attr('filter-panel') ? { filterPanel: attr('filter-panel') as AcunDataTableOptions['filterPanel'] } : {}),
      ...(flag(attr('fixed-header')) !== undefined ? { fixedHeader: flag(attr('fixed-header'))! } : {}),
      // A number is pixels, as in the scrollY option: scroll-y="480".
      ...(scrollY ? { scrollY: /^\d+(\.\d+)?$/.test(scrollY.trim()) ? Number(scrollY) : scrollY } : {}),
      ...(flag(attr('virtual')) !== undefined ? { virtual: flag(attr('virtual'))! } : {}),
      ...(flag(attr('state-save')) ? { stateSave: { key: this.#stateKey() } } : {}),
      ...(kept ? { initialState: { ...this.#options.initialState, ...state } } : {}),
    } as AcunDataTableOptions;
    // A <table> written inside the element is the source when nothing else gives rows.
    this.#source ??= this.querySelector<HTMLTableElement>(':scope > table') ?? undefined;
    const useTable = this.#source && !options.ajax && !options.data;
    let target: HTMLElement;
    if (useTable) {
      target = this.#source!;
    } else {
      target = this.querySelector<HTMLElement>(':scope > .acun-datatable-host') ?? this.ownerDocument.createElement('div');
      target.className = 'acun-datatable-host';
      if (!target.isConnected) this.replaceChildren(target);
    }
    let instance: AcunDataTable;
    try {
      instance = new AcunDataTable(target, options);
    } catch (error) {
      // Options the table cannot take: say so on the element, and to the page unless a listener handles it.
      if (this.#emit('adt-error', { error }, true)) reportFailure(error);
      return;
    }
    this.#instance = instance;
    instance.on((state: Readonly<DataTableState>, event: Readonly<DataTableEvent>) => this.#emit('adt-change', { state, event }));
    instance.ready.then(
      () => {
        if (this.#instance !== instance) return;
        // A table in the browser starts empty, so its page was cut to 1 before the rows came.
        if (kept && kept.page > 1 && instance.table?.getState().page !== kept.page) instance.table?.setPage(kept.page);
        if (selectedIds.length > 0) {
          try {
            instance.table?.setSelectedRows(selectedIds);
          } catch {
            // rows that are gone: nothing to select again
          }
        }
        this.#emit('adt-ready', undefined);
      },
      error => { if (this.#instance === instance) this.#emit('adt-error', { error }); }, // shown in the table too
    );
  }

  /**
   * The key of `state-save`: the page path and the element's id; without an
   * id its place among the page's tables (the first keeps the key it always
   * had), so two tables never share a saved state.
   */
  #stateKey(): string {
    if (this.id) return `${location.pathname}#${this.id}`;
    const index = [...this.ownerDocument.querySelectorAll(this.localName)].filter(other => !other.id).indexOf(this);
    return `${location.pathname}#table${index > 0 ? `-${index + 1}` : ''}`;
  }
}

/**
 * Each attribute as a property: text (`language`), a number (`pageSize`) or
 * a flag (`serverSide`: `true`, `false`, or `undefined` to leave it to the
 * options). Setting `null` or `undefined` removes the attribute.
 */
export interface AcunDataTableElement {
  /** `src`: the rows' URL. */
  get src(): string | undefined; set src(value: string | null | undefined);
  /** `server-side`: the server pages, sorts and searches. */
  get serverSide(): boolean | undefined; set serverSide(value: boolean | null | undefined);
  /** `method`: `GET` (default) or `POST`. */
  get method(): string | undefined; set method(value: string | null | undefined);
  /** `language`: `en`, `tr`, `de`, `fr` or `es`. */
  get language(): string | undefined; set language(value: string | null | undefined);
  /** `page-size`: rows per page; changes in place. */
  get pageSize(): number | undefined; set pageSize(value: number | null | undefined);
  /** `responsive`: `cards`, `scroll`, `collapse`, `modal` or `auto`. */
  get responsive(): string | undefined; set responsive(value: string | null | undefined);
  /** `size`: `sm`, `md` or `lg`. */
  get size(): string | undefined; set size(value: string | null | undefined);
  /** `fixed-header`: the header stays at the top of the window. */
  get fixedHeader(): boolean | undefined; set fixedHeader(value: boolean | null | undefined);
  /** `scroll-y`: a fixed height to scroll inside, `480` (pixels) or `60vh`. */
  get scrollY(): string | undefined; set scrollY(value: string | number | null | undefined);
  /** `virtual`: only the rows in view are drawn. */
  get virtual(): boolean | undefined; set virtual(value: boolean | null | undefined);
  /** `cursor`: keyset pages from the server. */
  get cursor(): boolean | undefined; set cursor(value: boolean | null | undefined);
  /** `state-save`: remember the page, sorting, filters and search across reloads. */
  get stateSave(): boolean | undefined; set stateSave(value: boolean | null | undefined);
  /** `filter-panel`: `dropdown`, `drawer` or `modal`. */
  get filterPanel(): string | undefined; set filterPanel(value: string | null | undefined);
  addEventListener<K extends keyof AcunDataTableElementEventMap>(type: K, listener: (this: AcunDataTableElement, event: AcunDataTableElementEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof AcunDataTableElementEventMap>(type: K, listener: (this: AcunDataTableElement, event: AcunDataTableElementEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

// The attribute properties: [property, attribute, kind] (t: text, n: number, f: flag).
for (const [property, attribute, kind] of [
  ['src', 'src', 't'], ['serverSide', 'server-side', 'f'], ['method', 'method', 't'], ['language', 'language', 't'],
  ['pageSize', 'page-size', 'n'], ['responsive', 'responsive', 't'], ['size', 'size', 't'], ['fixedHeader', 'fixed-header', 'f'],
  ['scrollY', 'scroll-y', 't'], ['virtual', 'virtual', 'f'], ['cursor', 'cursor', 'f'], ['stateSave', 'state-save', 'f'], ['filterPanel', 'filter-panel', 't'],
] as const) {
  Object.defineProperty(AcunDataTableElement.prototype, property, {
    configurable: true,
    get(this: HTMLElement) {
      const value = this.getAttribute(attribute);
      return kind === 'f' ? flag(value) : value === null ? undefined : kind === 'n' ? Number(value) : value;
    },
    set(this: HTMLElement, value: unknown) {
      if (value === null || value === undefined) this.removeAttribute(attribute);
      else this.setAttribute(attribute, kind === 'f' ? (value ? '' : 'false') : String(value));
    },
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'acun-datatable': AcunDataTableElement;
  }
}

/** An error no listener handled: to the page's error reporting, as an uncaught error would be. */
function reportFailure(error: unknown): void {
  const report = (globalThis as { reportError?: (error: unknown) => void }).reportError;
  if (typeof report === 'function') report(error);
  else console.error(error);
}

/** Register `<acun-datatable>` (or your own name) once. Returns the class. */
export function defineAcunDataTableElement(name = 'acun-datatable'): typeof AcunDataTableElement {
  const registry = globalThis.customElements;
  if (registry && !registry.get(name)) registry.define(name, name === 'acun-datatable' ? AcunDataTableElement : class extends AcunDataTableElement {});
  return AcunDataTableElement;
}
