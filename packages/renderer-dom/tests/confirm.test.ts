import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataTable, type ColumnDef } from '@acunsoft/datatable-core';
import { askConfirm, renderTable, setConfirm, type ConfirmRequest, type RowAction } from '../src/index';

type Order = { id: number; customer: string };
const columns: readonly ColumnDef<Order>[] = [{ id: 'customer', header: 'Customer', accessorKey: 'customer' }];
const make = () => createDataTable<Order>({ data: [{ id: 1, customer: 'Ayşe' }], columns });
const ui = window as unknown as { AcunUI?: { confirm?: unknown } };
let host: HTMLElement;
beforeEach(() => {
  document.body.replaceChildren();
  host = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
  setConfirm(null);
  delete ui.AcunUI;
  vi.restoreAllMocks();
});
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const draw = (action: Partial<RowAction<Order>>) => {
  const onSelect = vi.fn();
  renderTable(host, make(), { rowActions: [{ id: 'delete', label: 'Delete', onSelect, ...action }] });
  return { onSelect, button: host.querySelector<HTMLButtonElement>('[data-action="delete"]')! };
};

describe('setConfirm and askConfirm', () => {
  it('asks the registered handler with the title, labels and tone; it may answer later', async () => {
    const native = vi.spyOn(window, 'confirm');
    const asked: ConfirmRequest[] = [];
    let answer!: (ok: boolean) => void;
    setConfirm(request => { asked.push(request); return new Promise<boolean>(resolve => { answer = resolve; }); });
    const { onSelect, button } = draw({
      danger: true,
      confirm: row => ({ title: 'Delete order', text: `Delete ${row.original.customer}?`, confirmLabel: 'Delete', cancelLabel: 'Keep' }),
    });
    button.click();
    expect(asked).toEqual([{ title: 'Delete order', text: 'Delete Ayşe?', confirmLabel: 'Delete', cancelLabel: 'Keep', tone: 'danger' }]); // danger(): the danger tone
    expect(onSelect).not.toHaveBeenCalled(); // waits for the answer
    answer(true);
    await settle();
    expect(onSelect).toHaveBeenCalledOnce();
    button.click();
    answer(false);
    await settle();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(native).not.toHaveBeenCalled();
  });

  it('treats a handler that throws or rejects as "cancel", and an answer at once as at once', async () => {
    setConfirm(() => { throw new Error('dialog broke'); });
    const { onSelect, button } = draw({ confirm: 'Sure?' });
    button.click();
    setConfirm(() => Promise.reject(new Error('closed')));
    button.click();
    await settle();
    expect(onSelect).not.toHaveBeenCalled();
    setConfirm(() => true);
    button.click();
    expect(onSelect).toHaveBeenCalledOnce(); // no waiting for a boolean
  });

  it('uses ACUN UI when it is on the page, else the browser; setConfirm(null) removes the handler', async () => {
    const native = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const acun = vi.fn(() => Promise.resolve(false));
    ui.AcunUI = { confirm: acun };
    const { onSelect, button } = draw({ confirm: { text: 'Sure?', tone: 'default' }, danger: true });
    button.click();
    await settle();
    expect(acun).toHaveBeenCalledWith({ text: 'Sure?', tone: 'default' }); // a tone given wins over danger
    expect(onSelect).not.toHaveBeenCalled();
    setConfirm(() => false);
    setConfirm(null);
    ui.AcunUI = {}; // no confirm() of its own: feature-detected, so the browser's
    button.click();
    expect(native).toHaveBeenCalledWith('Sure?');
    expect(onSelect).toHaveBeenCalledOnce();
    expect(() => setConfirm('yes' as never)).toThrow(TypeError);
  });

  it('answers on its own without a confirm anywhere, and shares one handler across copies of the package', () => {
    expect(askConfirm({ text: 'Sure?' }, {})).toBe(true); // nothing to ask with: go on, as before
    const handler = () => false;
    setConfirm(handler);
    expect((globalThis as unknown as Record<symbol, unknown>)[Symbol.for('acunsoft.datatable.confirm')]).toBe(handler); // the Livewire views read it too
    expect(askConfirm({ text: 'Sure?' })).toBe(false);
  });
});

describe('captionVisible', () => {
  it('keeps the caption for screen readers only', () => {
    renderTable(host, make(), { caption: 'Orders', captionVisible: false });
    expect(host.querySelector('caption')!.className).toBe('adt-sr-only');
    renderTable(host, make(), { caption: 'Orders' });
    expect(host.querySelector('caption')!.hasAttribute('class')).toBe(false);
  });
});
