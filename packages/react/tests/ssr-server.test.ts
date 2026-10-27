// @vitest-environment node
// Server rendering where there is no DOM at all (Next.js, Remix, any React SSR):
// every component renders to HTML without touching a browser API, the same
// HTML each time, and leaves no listener on a table that outlives the request.
import { describe, expect, it } from 'vitest';
import { createElement as h, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createDataTable, type ColumnDef, type DataTable as Table } from '@acunsoft/datatable-core';
import {
  BulkActions, ColumnToggle, DataTable, DataTableLayout, FilterChips, FilterPanel, Filters, PageInfo, PageSize, Pagination, Search, Tools, labelsTr,
} from '../src/index';

type Order = { id: number; customer: string; total: string; city: string };
const columns: readonly ColumnDef<Order>[] = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true, enableFiltering: true, filter: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true, enableFiltering: true, filter: true, priority: 2 },
  { id: 'city', header: 'Şehir', accessorKey: 'city', priority: 3 },
];
const orders: Order[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, customer: `Müşteri ${i + 1}`, total: `${(i * 37) % 500}.50`, city: ['İstanbul', 'Ankara', 'İzmir'][i % 3]! }));
const make = () => createDataTable<Order>({ data: orders, columns, locale: 'tr', initialState: { pageSize: 10, sorting: [{ field: 'customer', direction: 'asc' }] } });

/** Every component, with the options that draw the most. */
const page = (table: Table<Order>): ReactElement => h('main', null,
  h(DataTableLayout<Order>, {
    table, labels: labelsTr, locale: 'tr', selectable: true, responsive: 'auto', caption: 'Siparişler',
    rowActions: [{ id: 'edit', label: 'Düzenle', onSelect: () => undefined }],
    bulkActions: [{ id: 'delete', label: 'Sil', onSelect: () => undefined }],
    tools: [{ id: 'csv', label: 'CSV', onSelect: () => undefined }],
  }),
  h(DataTable<Order>, { table, responsive: 'collapse', virtual: true, scrollY: '300px' }),
  h(DataTable<Order>, { table, responsive: 'modal', size: 'sm' }),
  h(Pagination, { table, labels: labelsTr }),
  h(PageSize, { table, labels: labelsTr }),
  h(PageInfo, { table, labels: labelsTr }),
  h(Search, { table, labels: labelsTr }),
  h(ColumnToggle, { table, labels: labelsTr, reorderable: true }),
  h(BulkActions<Order>, { table, actions: [{ id: 'delete', label: 'Sil', onSelect: () => undefined }], labels: labelsTr }),
  h(Filters, { table, labels: labelsTr, locale: 'tr' }),
  h(FilterPanel, { table, labels: labelsTr, locale: 'tr' }),
  h(FilterChips, { table, labels: labelsTr, locale: 'tr' }),
  h(Tools, { items: [{ id: 'csv', label: 'CSV', onSelect: () => undefined }], labels: labelsTr }),
);

describe('server rendering without a DOM', () => {
  it('renders every component with no browser API', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const html = renderToString(page(make()));
    expect(html).toContain('<caption');
    expect(html).toContain('Müşteri 1');
    expect(html).toContain('aria-sort');
    expect((html.match(/<tr class="adt-row/g) ?? []).length).toBeGreaterThanOrEqual(10);
  });

  it('gives the same HTML on every request, so hydration matches', () => {
    expect(renderToString(page(make()))).toBe(renderToString(page(make())));
  });

  it('leaves no listener on a table shared between requests', () => {
    const table = make();
    let active = 0;
    const subscribe = table.subscribe;
    Object.assign(table, { subscribe: (listener: Parameters<typeof subscribe>[0]) => { active += 1; const stop = subscribe(listener); return () => { active -= 1; stop(); }; } });
    for (let request = 0; request < 20; request++) renderToString(page(table));
    expect(active).toBe(0);
  });
});
