// Vue 3.4 has no useId: the components count per app instead. Here Vue is
// given without useId, as on 3.4. (Checked once against Vue 3.4.38 itself too.)
import { describe, expect, it, vi } from 'vitest';

vi.mock('vue', async original => ({ ...await original<typeof import('vue')>(), useId: undefined }));

const { createSSRApp, h, nextTick } = await import('vue');
const { renderToString } = await import('vue/server-renderer');
const { AcunDataTable, useDataTable } = await import('../src/index');

type Order = { id: number; customer: string; total: string };
const columns: readonly import('@acunsoft/datatable-core').ColumnDef<Order>[] = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer' },
  { id: 'total', header: 'Tutar', accessorKey: 'total', priority: 3 },
];
const orders: Order[] = [{ id: 1, customer: 'Ayşe', total: '10' }, { id: 2, customer: 'Ali', total: '20' }];
const page = () => createSSRApp({
  setup() {
    const one = useDataTable<Order>({ data: orders, columns }).table;
    const two = useDataTable<Order>({ data: orders, columns }).table;
    return () => h('div', [h(AcunDataTable, { table: one, responsive: 'collapse' }), h(AcunDataTable, { table: two, responsive: 'collapse' })]);
  },
});
const ids = (html: string) => html.match(/(?:aria-controls|id)="adt-[^"]+"/g);

describe('element ids without useId (Vue 3.4)', () => {
  it('are the same on every request, and differ between the tables of a page', async () => {
    const first = await renderToString(page());
    const again = await renderToString(page());
    expect(ids(first)!.length).toBeGreaterThan(0);
    expect(ids(again)).toEqual(ids(first));
    expect(new Set(ids(first)!.map(id => id.replace(/-detail-\d+/, ''))).size).toBeGreaterThan(1);
  });

  it('match after hydration of a later request: an opened row names its details', async () => {
    await renderToString(page()); // an earlier request on this server
    const host = document.createElement('div');
    host.innerHTML = await renderToString(page());
    document.body.append(host);
    const app = page();
    app.mount(host);
    await nextTick();
    const button = host.querySelector('.adt-expand')!;
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(document.getElementById(button.getAttribute('aria-controls')!)).not.toBeNull();
    app.unmount();
  });
});
