// Hydration of server-rendered HTML (Next.js, Remix): no mismatch in any layout,
// and the table works afterwards — sorting, paging, selection, open rows.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement as h, type ReactElement } from 'react';
import { act } from './act';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { createDataTable, type ColumnDef } from '@acunsoft/datatable-core';
import { DataTable, DataTableLayout, labelsTr, useDataTable, type DataTableLayoutProps } from '../src/index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Order = { id: number; customer: string; total: string; city: string };
const columns: readonly ColumnDef<Order>[] = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true, enableFiltering: true, filter: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true, priority: 2 },
  { id: 'city', header: 'Şehir', accessorKey: 'city', priority: 3 },
];
const orders: Order[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, customer: `Müşteri ${String(i + 1).padStart(2, '0')}`, total: `${(i * 37) % 500}.50`, city: ['İstanbul', 'Ankara', 'İzmir'][i % 3]! }));
type Options = Omit<DataTableLayoutProps<Order>, 'table'>;

/** A Next.js-style page: the table made by the hook, the same on the server and in the browser. */
function Page(options: Options): ReactElement {
  const { table } = useDataTable<Order>({ data: orders, columns, locale: 'tr', initialState: { pageSize: 10 } });
  return h(DataTableLayout<Order>, { table, labels: labelsTr, locale: 'tr', ...options });
}

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); root = undefined; document.body.replaceChildren(); });

/** Server HTML in the page, then hydrated; returns the host and every hydration complaint. */
function hydrate(element: ReactElement): { host: HTMLElement; problems: string[] } {
  const host = document.createElement('div');
  host.innerHTML = renderToString(element);
  document.body.append(host);
  const problems: string[] = [];
  const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { problems.push(String(args[0])); });
  try {
    act(() => { root = hydrateRoot(host, element, { onRecoverableError: problem => problems.push(String((problem as Error).message ?? problem)) }); });
  } finally {
    error.mockRestore();
  }
  return { host, problems };
}

const click = (node: Element | null) => act(() => { node!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const names = (host: HTMLElement) => [...host.querySelectorAll('tbody .adt-row')].map(row => row.querySelector('td:not(.adt-select)')!.textContent);

describe('hydration', () => {
  const layouts: Record<string, Options> = {
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
    it(`matches the server HTML: ${name}`, () => {
      const { problems } = hydrate(h(Page, options));
      expect(problems).toEqual([]);
    });
  }

  it('sorts, pages and selects after hydration', () => {
    const { host } = hydrate(h(Page, { selectable: true }));
    expect(names(host)[0]).toBe('Müşteri 01');
    const sort = () => [...host.querySelectorAll('th button')].find(button => button.textContent!.includes('Müşteri'))!;
    click(sort());
    click(sort()); // descending
    expect(names(host)[0]).toBe('Müşteri 30');
    click(host.querySelector('.adt-page[aria-label="Sayfa 2"]'));
    expect(names(host)[0]).toBe('Müşteri 20');
    click(host.querySelector('tbody .adt-row input[type="checkbox"]'));
    expect(host.querySelector('.adt-selection')!.textContent).toContain('1');
  });

  it('opens a collapsed row whose aria-controls names the opened details', () => {
    const { host } = hydrate(h(Page, { responsive: 'collapse' }));
    const button = host.querySelector('.adt-expand')!;
    click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(button.getAttribute('aria-controls')!)).not.toBeNull();
  });

  it('hydrates a table made outside the component, as passed down from a client component', () => {
    const make = () => createDataTable<Order>({ data: orders, columns, initialState: { pageSize: 5 } });
    const { problems, host } = hydrate(h(DataTable<Order>, { table: make(), caption: 'Siparişler' }));
    expect(problems).toEqual([]);
    expect(names(host)).toHaveLength(5);
  });
});
