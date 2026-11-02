// @vitest-environment node
// Server rendering where there is no DOM at all (Nuxt, any Vue SSR): every
// component renders to HTML without touching a browser API, the same HTML on
// every request, and leaves no listener on a table or status that outlives it.
import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createDataTable, type ColumnDef, type DataTable } from '@acunsoft/datatable-core';
import {
  AcunBulkActions, AcunColumnToggle, AcunDataTable, AcunDataTableLayout, AcunFilterChips, AcunFilterPanel, AcunFilters, AcunPageInfo, AcunPageSize, AcunPagination, AcunSearch, AcunTools, labelsTr,
} from '../src/index';

type Order = { id: number; customer: string; total: string; city: string };
const columns: readonly ColumnDef<Order>[] = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true, enableFiltering: true, filter: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true, enableFiltering: true, filter: true, priority: 2 },
  { id: 'city', header: 'Şehir', accessorKey: 'city', priority: 3 },
];
const orders: Order[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, customer: `Müşteri ${i + 1}`, total: `${(i * 37) % 500}.50`, city: ['İstanbul', 'Ankara', 'İzmir'][i % 3]! }));
const make = () => createDataTable<Order>({ data: orders, columns, locale: 'tr', initialState: { pageSize: 10, sorting: [{ field: 'customer', direction: 'asc' }] } });
type Status = { getState(): { status: 'idle' | 'loading' | 'error' }; subscribe(listener: (state: { status: string }) => void): () => void };

/** Every component, with the options that draw the most. */
const page = (table: DataTable<Order>, status?: Status) => createSSRApp({
  render: () => h('main', [
    h(AcunDataTableLayout, {
      table, ...(status ? { status } : {}), labels: labelsTr, locale: 'tr', selectable: true, responsive: 'auto', caption: 'Siparişler',
      rowActions: [{ id: 'edit', label: 'Düzenle', onSelect: () => undefined }],
      bulkActions: [{ id: 'delete', label: 'Sil', onSelect: () => undefined }],
      tools: [{ id: 'csv', label: 'CSV', onSelect: () => undefined }],
    }),
    h(AcunDataTable, { table, ...(status ? { status } : {}), responsive: 'collapse', virtual: true, scrollY: '300px' }),
    h(AcunDataTable, { table, responsive: 'modal', size: 'sm' }),
    h(AcunPagination, { table, labels: labelsTr }),
    h(AcunPageSize, { table, labels: labelsTr }),
    h(AcunPageInfo, { table, labels: labelsTr }),
    h(AcunSearch, { table, labels: labelsTr }),
    h(AcunColumnToggle, { table, labels: labelsTr, reorderable: true }),
    h(AcunBulkActions, { table, actions: [{ id: 'delete', label: 'Sil', onSelect: () => undefined }], labels: labelsTr }),
    h(AcunFilters, { table, labels: labelsTr, locale: 'tr' }),
    h(AcunFilterPanel, { table, labels: labelsTr, locale: 'tr' }),
    h(AcunFilterChips, { table, labels: labelsTr, locale: 'tr' }),
    h(AcunTools, { items: [{ id: 'csv', label: 'CSV', onSelect: () => undefined }], labels: labelsTr }),
  ]),
});

/** Counts the listeners a source holds. */
function counted<T extends { subscribe(listener: never): () => void }>(source: T): T & { active(): number } {
  let active = 0;
  const subscribe = source.subscribe.bind(source) as (listener: never) => () => void;
  return Object.assign(source, {
    subscribe: (listener: never) => { active += 1; const stop = subscribe(listener); return () => { active -= 1; stop(); }; },
    active: () => active,
  });
}

describe('server rendering without a DOM', () => {
  it('renders every component with no browser API', async () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const html = await renderToString(page(make()));
    expect(html).toContain('<caption');
    expect(html).toContain('Müşteri 1');
    expect(html).toContain('aria-sort="ascending"');
  });

  it('gives the same HTML on every request, so hydration matches', async () => {
    expect(await renderToString(page(make()))).toBe(await renderToString(page(make())));
  });

  it('leaves no listener on a table or a status shared between requests', async () => {
    const table = counted(make());
    const status = counted<Status>({ getState: () => ({ status: 'idle' }), subscribe: () => () => undefined });
    for (let request = 0; request < 20; request++) await renderToString(page(table, status));
    expect(table.active()).toBe(0);
    expect(status.active()).toBe(0);
  });

});
