// Hydration of server-rendered HTML (Nuxt): no mismatch in any layout, and the
// table works afterwards — sorting, paging, selection, open rows, status.
import { afterEach, describe, expect, it } from 'vitest';
import { createSSRApp, h, nextTick, type App } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createDataTable, type ColumnDef } from '@acunsoft/datatable-core';
import { AcunDataTable, AcunDataTableLayout, labelsTr, useDataTable } from '../src/index';

type Order = { id: number; customer: string; total: string; city: string };
const columns: readonly ColumnDef<Order>[] = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true, enableFiltering: true, filter: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true, priority: 2 },
  { id: 'city', header: 'Şehir', accessorKey: 'city', priority: 3 },
];
const orders: Order[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, customer: `Müşteri ${String(i + 1).padStart(2, '0')}`, total: `${(i * 37) % 500}.50`, city: ['İstanbul', 'Ankara', 'İzmir'][i % 3]! }));

/** A Nuxt-style page: the table made by the composable, the same on the server and in the browser. */
const page = (options: Record<string, unknown> = {}) => createSSRApp({
  setup() {
    const { table } = useDataTable<Order>({ data: orders, columns, locale: 'tr', initialState: { pageSize: 10 } });
    return () => h(AcunDataTableLayout, { table, labels: labelsTr, locale: 'tr', ...options });
  },
});

let app: App | undefined;
afterEach(() => { app?.unmount(); app = undefined; document.body.replaceChildren(); });

/** Server HTML in the page, then hydrated; returns the host and every warning Vue gave. */
async function hydrate(make: () => App): Promise<{ host: HTMLElement; warnings: string[] }> {
  const host = document.createElement('div');
  host.innerHTML = await renderToString(make());
  document.body.append(host);
  const warnings: string[] = [];
  app = make();
  app.config.warnHandler = message => { warnings.push(message); };
  const error = console.error;
  console.error = (...args: unknown[]) => { warnings.push(String(args[0])); }; // hydration mismatches
  try {
    app.mount(host);
    await nextTick();
  } finally {
    console.error = error;
  }
  return { host, warnings };
}

const click = async (node: Element | null | undefined) => { node!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await nextTick(); };
const names = (host: HTMLElement) => [...host.querySelectorAll('tbody .adt-row')].map(row => row.querySelector('td:not(.adt-select)')!.textContent);

describe('hydration', () => {
  const layouts: Record<string, Record<string, unknown>> = {
    plain: {},
    'responsive auto': { responsive: 'auto' },
    collapse: { responsive: 'collapse' },
    modal: { responsive: 'modal' },
    selectable: { selectable: true, bulkActions: [{ id: 'delete', label: 'Sil', onSelect: () => undefined }] },
    virtual: { virtual: true, scrollY: '300px' },
    'row actions and tools': { rowActions: [{ id: 'edit', label: 'Düzenle', onSelect: () => undefined }], tools: [{ id: 'csv', label: 'CSV', onSelect: () => undefined }] },
    'filters in a drawer': { filterPanel: 'drawer' },
  };
  for (const [name, options] of Object.entries(layouts)) {
    it(`matches the server HTML: ${name}`, async () => {
      const { warnings } = await hydrate(() => page(options));
      expect(warnings).toEqual([]);
    });
  }

  it('sorts, pages and selects after hydration', async () => {
    const { host } = await hydrate(() => page({ selectable: true }));
    expect(names(host)[0]).toBe('Müşteri 01');
    const sort = () => [...host.querySelectorAll('th button')].find(button => button.textContent!.includes('Müşteri'));
    await click(sort());
    await click(sort()); // descending
    expect(names(host)[0]).toBe('Müşteri 30');
    await click(host.querySelector('.adt-page[aria-label="Sayfa 2"]'));
    expect(names(host)[0]).toBe('Müşteri 20');
    await click(host.querySelector('tbody .adt-row input[type="checkbox"]'));
    expect(host.querySelector('.adt-selection')!.textContent).toContain('1');
  });

  it('opens a collapsed row whose aria-controls names the opened details', async () => {
    const { host } = await hydrate(() => page({ responsive: 'collapse' }));
    const button = host.querySelector('.adt-expand')!;
    await click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(button.getAttribute('aria-controls')!)).not.toBeNull();
  });

  it('follows a status source from hydration on', async () => {
    let listener: (state: { status: string }) => void = () => undefined;
    let current = 'idle';
    const status = { getState: () => ({ status: current as 'idle' }), subscribe: (fn: typeof listener) => { listener = fn; return () => undefined; } };
    const table = createDataTable<Order>({ data: orders, columns, initialState: { pageSize: 5 } });
    const { host, warnings } = await hydrate(() => createSSRApp({ render: () => h(AcunDataTable, { table, status }) }));
    expect(warnings).toEqual([]);
    current = 'loading';
    listener({ status: 'loading' });
    await nextTick();
    expect(host.querySelector('.adt-table-wrap, table')!.closest('[aria-busy="true"]') ?? host.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
