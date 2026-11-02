// The DOM renderer, the React and the Vue adapter draw the same table: the same
// elements, classes and ARIA, in every layout below. A difference listed in
// DIFFERENT is known and on its way out: once it is fixed this test fails until
// the entry is removed, so the three can only come closer.
import { act } from '../../packages/react/tests/act';
import { describe, expect, it } from 'vitest';
import { createDataTable, type ColumnDef } from '@acunsoft/datatable-core';
import { canonical, render, type Renderer } from './markup';

type Order = { id: number; customer: string; total: string; city: string };
const columns: readonly ColumnDef<Order>[] = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true, enableFiltering: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true, priority: 2 },
  { id: 'city', header: 'Şehir', accessorKey: 'city', priority: 3 },
];
const orders: Order[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, customer: `Müşteri ${i + 1}`, total: `${i * 10}.50`, city: ['İstanbul', 'Ankara'][i % 2]! }));
const status = (phase: string) => ({ getState: () => ({ status: phase }), subscribe: () => () => undefined, retry: () => undefined });
const click = (node: Element | null) => node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

interface Scenario {
  readonly options?: Record<string, unknown>;
  readonly table?: Record<string, unknown>;
  readonly then?: (host: HTMLElement, table: { selectRow(id: string): void }) => void;
  /** Compare only this part (virtual rows depend on the viewport, which jsdom does not have). */
  readonly part?: string;
  /** A line the markup must have, so the scenario draws what it is about. */
  readonly has?: string;
}
const scenarios: Record<string, Scenario> = {
  plain: { options: { caption: 'Siparişler' } },
  selectable: { options: { selectable: true } },
  'some selected': { options: { selectable: true }, then: (_host, table) => table.selectRow('2') },
  collapse: { options: { responsive: 'collapse' } },
  'collapse, a row open': { options: { responsive: 'collapse' }, then: host => click(host.querySelector('.adt-expand')) },
  modal: { options: { responsive: 'modal' } },
  'modal, a row open': { options: { responsive: 'modal' }, then: host => click(host.querySelector('.adt-expand')) },
  auto: { options: { responsive: 'auto' } },
  'row actions': { options: { rowActions: [{ id: 'edit', label: 'Düzenle', onSelect: () => undefined }, { id: 'del', label: 'Sil', danger: true, onSelect: () => undefined }], maxInlineActions: 1 } },
  'size, sticky header, height': { options: { size: 'sm', stickyHeader: true, scrollY: '300px' } },
  loading: { options: { status: status('loading') } },
  error: { options: { status: status('error') } },
  'loading without skeleton': { options: { status: status('loading'), skeleton: false } },
  empty: { table: { data: [] } },
  'resized column': { options: { resizableColumns: true }, table: { initialState: { pageSize: 5, columnWidths: { customer: 220 } } } },
  'reorderable columns': { options: { reorderableColumns: true } },
  virtual: { options: { virtual: true, scrollY: '300px' }, part: 'thead' },
  editable: {
    table: { columns: [{ id: 'customer', header: 'Müşteri', accessorKey: 'customer', edit: { type: 'text' } }, { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal' }], initialState: { pageSize: 5 } },
    options: { onEdit: () => undefined },
  },
  totals: {
    table: { columns: [columns[0], { ...columns[1], aggregate: 'sum' }, columns[2]], initialState: { pageSize: 5 } },
    options: { responsive: 'collapse', selectable: true }, has: '<tfoot>',
  },
  'totals, the first column with one': { table: { columns: [{ ...columns[1], aggregate: 'avg' }, columns[0]], initialState: { pageSize: 5 } }, has: '<tfoot>' },
  'two sort columns': { table: { initialState: { pageSize: 5, sorting: [{ field: 'total', direction: 'desc' }, { field: 'customer', direction: 'asc' }] } } },
};

/** Known differences, each fixed in its own change (which removes the entry here). */
const DIFFERENT: Readonly<Record<string, readonly Renderer[]>> = {
};

/** Differences that are fine: React and Vue draw the closed modal <dialog> up front, the DOM renderer when it first opens. */
const accepted = (lines: string[]): string[] => {
  const at = lines.findIndex(line => line.trim() === '<dialog class="adt-dialog">');
  return at >= 0 && (lines[at + 1] === undefined || lines[at + 1]!.search(/\S/) <= lines[at]!.search(/\S/)) ? lines.filter((_, index) => index !== at) : lines;
};

async function markup(renderer: Renderer, scenario: Scenario): Promise<string[]> {
  const table = createDataTable<Order>({ data: orders, columns, initialState: { pageSize: 5, sorting: [{ field: 'customer', direction: 'asc' }] }, ...scenario.table } as never);
  const rendered = await render(renderer, table, scenario.options ?? {});
  try {
    if (scenario.then) {
      if (renderer === 'react') act(() => scenario.then!(rendered.host, table));
      else scenario.then(rendered.host, table);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const root = scenario.part ? rendered.host.querySelector(scenario.part)! : rendered.host.firstElementChild!;
    return accepted(canonical(root));
  } finally {
    rendered.destroy();
  }
}

describe('the DOM renderer, React and Vue draw the same table', () => {
  for (const [name, scenario] of Object.entries(scenarios)) {
    it(name, async () => {
      const dom = await markup('dom', scenario);
      expect(dom.length).toBeGreaterThan(5);
      if (scenario.has) expect(dom.map(line => line.trim())).toContain(scenario.has);
      for (const renderer of ['react', 'vue'] as const) {
        const other = await markup(renderer, scenario);
        if (DIFFERENT[name]?.includes(renderer)) expect(other, `${renderer}: known difference fixed? remove it from DIFFERENT`).not.toEqual(dom);
        else expect(other, renderer).toEqual(dom);
      }
    });
  }
});
