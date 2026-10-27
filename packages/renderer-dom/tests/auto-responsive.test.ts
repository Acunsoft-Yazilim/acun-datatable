import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataTable, type ColumnDef } from '@acunsoft/datatable-core';
import { checkResponsive, renderTable } from '../src/index';

type Order = { id: number; customer: string; city: string; total: number; note: string };
const columns: readonly ColumnDef<Order>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'city', header: 'City', accessorKey: 'city' },                    // default priority 2
  { id: 'total', header: 'Total', accessorKey: 'total', type: 'number', priority: 1 },
  { id: 'note', header: 'Note', accessorKey: 'note', priority: 3 },
];
const data: Order[] = [{ id: 1, customer: 'Ayşe', city: 'İzmir', total: 10, note: 'VIP' }];
let host: HTMLElement;
let visibleWidth = 1000;
beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement('div');
  document.body.append(host);
  // jsdom has no layout: shown header cells are 100px (the ⊕ column 40px); the box is `visibleWidth` wide.
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.tagName !== 'TABLE') return 0;
    const collapsed = this.classList.contains('adt-auto-collapsed');
    return [...this.querySelectorAll('thead th, thead td')]
      .filter(cell => !cell.classList.contains('adt-auto-hidden') && (!cell.classList.contains('adt-expand-cell') || collapsed))
      .reduce((total, cell) => total + (cell.classList.contains('adt-expand-cell') ? 40 : 100), 0);
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('adt-scroll') ? visibleWidth : 0;
  });
});
afterEach(() => vi.restoreAllMocks());
const hidden = () => [...host.querySelectorAll('thead .adt-auto-hidden')].map(cell => cell.textContent);
const shown = () => [...host.querySelectorAll('.adt-detail .adt-detail-item.adt-auto-shown dt')].map(dt => dt.textContent);

describe("responsive: 'auto' and fixedColumns measure again only when widths may change", () => {
  it('not for a row selected, nor for the pinned classes; again for a re-render', async () => {
    const table = createDataTable<Order>({ data: [...data, { id: 2, customer: 'Ali', city: 'Ankara', total: 5, note: '' }], columns });
    renderTable(host, table, { responsive: 'auto', selectable: true, fixedColumns: { start: 1 } });
    const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));
    await flush();
    const widths = vi.mocked(Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')!.get!);
    const boxes = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    widths.mockClear();
    table.toggleRow('1'); // a class on the row: no new widths
    await flush();
    expect([widths.mock.calls.length, boxes.mock.calls.length]).toEqual([0, 0]);
    host.querySelector('tbody td')!.classList.add('adt-pin--edge-start'); // a pinned class only
    await flush();
    expect(widths.mock.calls.length).toBe(0);
    table.setData([...data]); // a re-render: both measure again
    await flush();
    expect(widths.mock.calls.length).toBeGreaterThan(0);
    expect(boxes.mock.calls.length).toBeGreaterThan(0);
  });
});

describe("responsive: 'auto'", () => {
  it('hides nothing while the table fits', () => {
    renderTable(host, createDataTable<Order>({ data, columns }), { responsive: 'auto' });
    expect(checkResponsive('auto')).toBe('auto');
    expect(host.querySelector('.adt-table-wrap')!.classList.contains('adt-responsive--auto')).toBe(true);
    expect(hidden()).toEqual([]);
    expect(host.querySelector('table')!.classList.contains('adt-auto-collapsed')).toBe(false);
  });

  it('hides the lowest priority first, then from the right, never priority 1, and lists them in the details', async () => {
    visibleWidth = 390; // 4 columns (400) do not fit; ⊕ (40) + 3 columns (300) do
    renderTable(host, createDataTable<Order>({ data, columns }), { responsive: 'auto' });
    expect(hidden()).toEqual(['Note']); // priority 3 goes first
    visibleWidth = 330; // ⊕ + 3 columns (340) still do not fit
    const table = createDataTable<Order>({ data, columns });
    renderTable(host, table, { responsive: 'auto' });
    expect(hidden()).toEqual(['City', 'Note']); // so City (priority 2) goes too
    expect(host.querySelector('table')!.classList.contains('adt-auto-collapsed')).toBe(true);
    host.querySelector<HTMLButtonElement>('.adt-expand')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(shown()).toEqual(['City', 'Note']);
    expect([...host.querySelectorAll('tbody tr.adt-row:first-child .adt-auto-hidden')].map(td => td.textContent)).toEqual(['İzmir', 'VIP']);

    visibleWidth = 160; // even less room: still never Customer or Total
    table.setSorting([]); // any re-render runs it again
    table.setGlobalSearch('ay');
    await new Promise(resolve => setTimeout(resolve, 0)); // the observer, then the queued pass
    expect(hidden()).toEqual(['City', 'Note']);
  });
});
