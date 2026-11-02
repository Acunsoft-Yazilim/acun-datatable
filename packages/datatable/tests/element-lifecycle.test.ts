// <acun-datatable> as a standard custom element: properties and attributes,
// updates in place, events, several tables on a page, connect and disconnect,
// and properties a framework sets before the element is defined.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AcunDataTableElement, defineAcunDataTableElement } from '../src/index';
import type { AcunDataTableChangeDetail, AcunDataTableErrorDetail } from '../src/element';

defineAcunDataTableElement();
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
let listening = new AbortController(); // listeners on document.body, removed after each test
beforeEach(() => { document.body.replaceChildren(); localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); listening.abort(); listening = new AbortController(); });

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Müşteri ${String(i + 1).padStart(2, '0')}`, total: (i * 37) % 500 }));
const columns = [{ data: 'name', title: 'Müşteri' }, { data: 'total', title: 'Tutar', type: 'number' as const }];

/** A connected element with rows, ready. */
async function table(setup: (element: AcunDataTableElement) => void = () => undefined): Promise<AcunDataTableElement> {
  const element = document.createElement('acun-datatable');
  element.columns = columns;
  element.data = rows;
  setup(element);
  document.body.append(element);
  await tick();
  await element.table?.ready;
  return element;
}
const names = (element: Element) => [...element.querySelectorAll('tbody .adt-row')].map(row => row.querySelector('td')!.textContent);
const ready = (element: Element) => new Promise(resolve => element.addEventListener('adt-ready', resolve, { once: true }));

describe('properties and attributes', () => {
  it('reflects every attribute as a property, both ways', async () => {
    const element = document.createElement('acun-datatable');
    element.pageSize = 10;
    element.language = 'tr';
    element.serverSide = false;
    element.fixedHeader = true;
    element.scrollY = 300;
    element.filterPanel = 'drawer';
    expect(element.getAttribute('page-size')).toBe('10');
    expect(element.getAttribute('language')).toBe('tr');
    expect(element.getAttribute('server-side')).toBe('false');
    expect(element.getAttribute('fixed-header')).toBe('');
    expect(element.getAttribute('scroll-y')).toBe('300');
    expect(element.getAttribute('filter-panel')).toBe('drawer');
    element.setAttribute('size', 'sm');
    element.setAttribute('virtual', '');
    expect(element.size).toBe('sm');
    expect(element.virtual).toBe(true);
    expect(element.cursor).toBeUndefined(); // not set: the options decide
    element.language = null;
    element.fixedHeader = undefined;
    expect(element.hasAttribute('language')).toBe(false);
    expect(element.hasAttribute('fixed-header')).toBe(false);
  });

  it('takes properties a framework set before the element was defined', async () => {
    const early = document.createElement('acun-early-table') as AcunDataTableElement;
    Object.assign(early, { columns, data: rows, pageSize: 5, language: 'tr' }); // own properties: no accessor yet
    document.body.append(early);
    defineAcunDataTableElement('acun-early-table');
    await tick();
    await early.table!.ready;
    expect(early.querySelectorAll('tbody .adt-row')).toHaveLength(5);
    expect(early.getAttribute('language')).toBe('tr');
    expect(Object.prototype.hasOwnProperty.call(early, 'data')).toBe(false);
    expect(early.data).toBe(rows);
  });

  it('accepts a plain number for scroll-y, as the scrollY option does', async () => {
    const element = await table(element => element.setAttribute('scroll-y', '480'));
    expect(element.querySelector<HTMLElement>('.adt-scroll, .adt-table-wrap [style*="480"]')).not.toBeNull();
    expect(element.innerHTML).toContain('480px');
  });
});

describe('updates in place', () => {
  it('changes the page size without a new table', async () => {
    const element = await table(element => element.setAttribute('page-size', '10'));
    const instance = element.table;
    instance!.table!.setSorting([{ field: 'total', direction: 'desc' }]);
    element.pageSize = 5;
    await tick();
    expect(element.table).toBe(instance);
    expect(element.querySelectorAll('tbody .adt-row')).toHaveLength(5);
    expect(instance!.table!.getState().sorting).toEqual([{ field: 'total', direction: 'desc' }]);
  });

  it('rebuilds for a view attribute and keeps page, sorting, filters, search, selection and columns', async () => {
    const element = await table(element => { element.setAttribute('page-size', '5'); element.options = { selectable: true }; });
    const core = element.table!.table!;
    core.setSorting([{ field: 'total', direction: 'asc' }]);
    core.setGlobalSearch('müşteri');
    core.setFilters([{ field: 'total', operator: 'gte', value: 100 }]);
    core.setPage(2);
    core.setColumnWidth('name', 220);
    core.setHiddenColumns(['total']);
    const firstOnPage = core.getPage().rows[0]!.id;
    core.selectRow(firstOnPage);
    const before = core.getState();
    const shown = names(element);
    element.language = 'tr';
    await ready(element);
    const after = element.table!.table!;
    expect(after).not.toBe(core);
    expect(after.getState()).toMatchObject({
      page: 2, pageSize: 5, sorting: before.sorting, filters: before.filters, globalSearch: 'müşteri',
      hiddenColumns: ['total'], columnWidths: { name: 220 }, selectedIds: [firstOnPage],
    });
    expect(names(element)).toEqual(shown);
    expect(element.querySelector('.adt-info')!.textContent).toContain('kaydın'); // now in Turkish
  });

  it('starts over when the rows come from somewhere else', async () => {
    const element = await table();
    element.table!.table!.setGlobalSearch('müşteri 1');
    element.columns = [{ data: 'name', title: 'Ad' }];
    await ready(element);
    expect(element.table!.table!.getState().globalSearch).toBe('');
  });

  it('takes new rows in place, keeping the page', async () => {
    const element = await table(element => element.setAttribute('page-size', '10'));
    const instance = element.table;
    instance!.table!.setPage(2);
    element.data = rows.map(row => ({ ...row, name: row.name.replace('Müşteri', 'Kişi') }));
    await tick();
    expect(element.table).toBe(instance);
    expect(names(element)[0]).toBe('Kişi 11');
  });
});

describe('events', () => {
  it('adt-change and adt-ready bubble to the page with typed details', async () => {
    const seen: string[] = [];
    const { signal } = listening;
    document.body.addEventListener('adt-ready', () => seen.push('ready'), { signal });
    document.body.addEventListener('adt-change', event => seen.push((event as CustomEvent<AcunDataTableChangeDetail>).detail.event.type), { signal });
    const element = await table();
    element.table!.table!.setPage(2);
    expect(seen).toEqual(['ready', 'page']);
    const change = vi.fn((event: CustomEvent<AcunDataTableChangeDetail>) => event.detail.state.page);
    element.addEventListener('adt-change', change);
    element.table!.table!.setPage(1);
    expect(change).toHaveReturnedWith(1);
  });

  it('adt-error reports options the table cannot take, and rows that cannot be loaded', async () => {
    const errors: unknown[] = [];
    document.body.addEventListener('adt-error', event => { errors.push((event as CustomEvent<AcunDataTableErrorDetail>).detail.error); event.preventDefault(); }, { signal: listening.signal });
    const bad = document.createElement('acun-datatable');
    bad.options = { exportPageSize: 0 };
    bad.data = rows;
    document.body.append(bad);
    await tick();
    expect(errors[0]).toBeInstanceOf(RangeError);
    expect(bad.table).toBeUndefined();

    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500, statusText: 'Server Error' })));
    const failing = document.createElement('acun-datatable');
    failing.src = '/api/orders';
    failing.columns = columns;
    document.body.append(failing);
    await vi.waitFor(() => expect(errors).toHaveLength(2));
    expect(String(errors[1])).toContain('500');
  });

  it('an adt-error nobody handles goes to the page\'s error reporting', async () => {
    const report = vi.fn();
    vi.stubGlobal('reportError', report);
    const bad = document.createElement('acun-datatable');
    bad.options = { exportPageSize: 0 };
    document.body.append(bad);
    await tick();
    expect(report).toHaveBeenCalledWith(expect.any(RangeError));
  });
});

describe('several tables on a page', () => {
  it('keep their own state, element ids and saved state', async () => {
    const one = await table(element => { element.setAttribute('state-save', ''); element.setAttribute('responsive', 'collapse'); });
    const two = await table(element => { element.setAttribute('state-save', ''); element.setAttribute('responsive', 'collapse'); });
    one.table!.table!.setPage(3);
    expect(two.table!.table!.getState().page).toBe(1);
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = Object.keys(localStorage).filter(key => key.startsWith('acun-datatable:'));
    expect(keys).toHaveLength(2);
    expect(keys).toContain(`acun-datatable:${location.pathname}#table`); // the first keeps the key it always had
  });
});

describe('connect and disconnect', () => {
  it('destroys the table when removed, and builds it again when added back later', async () => {
    const element = await table();
    const destroy = vi.spyOn(element.table!, 'destroy');
    element.remove();
    await tick();
    expect(destroy).toHaveBeenCalledOnce();
    expect(element.table).toBeUndefined();
    expect(element.querySelector('table')).toBeNull();
    document.body.append(element);
    await tick();
    await element.table!.ready;
    expect(names(element)).toHaveLength(25);
  });

  it('leaves no listener behind after many mounts and removals', async () => {
    const base = document.createElement('acun-datatable');
    base.columns = columns;
    base.data = rows;
    let live = 0;
    for (let round = 0; round < 50; round++) {
      document.body.append(base);
      await tick();
      const instance = base.table!;
      live += 1;
      const destroy = instance.destroy.bind(instance);
      instance.destroy = () => { live -= 1; destroy(); };
      base.remove();
      await tick();
    }
    expect(live).toBe(0);
    expect(document.body.children).toHaveLength(0);
  });
});

it('is the type of document.querySelector(\'acun-datatable\')', async () => {
  document.body.append(document.createElement('acun-datatable'));
  const element: AcunDataTableElement | null = document.querySelector('acun-datatable');
  expect(element).toBeInstanceOf(AcunDataTableElement);
});
