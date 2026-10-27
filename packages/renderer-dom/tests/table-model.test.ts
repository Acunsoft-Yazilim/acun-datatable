import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeRowMenusOnOutsideClick, frameThrottle, hideDialog, showDialog, withoutIds } from '../src/internal';

afterEach(() => vi.useRealTimers());

describe('withoutIds', () => {
  it('keeps the order and drops the given ids, linear on large lists', () => {
    expect(withoutIds(['1', '2', '3', '4'], ['2', '3'])).toEqual(['1', '4']);
    const many = Array.from({ length: 200_000 }, (_, i) => String(i));
    const started = performance.now();
    expect(withoutIds(many, many)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe('frameThrottle', () => {
  it('runs one callback per frame and cancels a pending one', () => {
    const callbacks: FrameRequestCallback[] = [];
    const cancel = vi.fn();
    const view = { requestAnimationFrame: (callback: FrameRequestCallback) => callbacks.push(callback), cancelAnimationFrame: cancel };
    const frames = frameThrottle(view);
    const run = vi.fn();
    frames.schedule(run);
    frames.schedule(run); // the same frame
    expect(callbacks).toHaveLength(1);
    callbacks[0]!(0);
    expect(run).toHaveBeenCalledOnce();
    frames.schedule(run);
    frames.cancel();
    expect(cancel).toHaveBeenCalledWith(2);
    frames.cancel(); // nothing pending
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('falls back to a timeout without frames, which cancel clears too', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const frames = frameThrottle(undefined);
    frames.schedule(run);
    vi.advanceTimersByTime(20);
    expect(run).toHaveBeenCalledOnce();
    frames.schedule(run);
    frames.cancel();
    vi.advanceTimersByTime(20);
    expect(run).toHaveBeenCalledOnce();
  });
});

describe('dialogs and row menus', () => {
  it('opens and closes a dialog, with the open attribute where showModal and close are missing', () => {
    const dialog = document.body.appendChild(document.createElement('dialog'));
    Object.assign(dialog, { showModal: undefined, close: undefined });
    showDialog(dialog);
    expect(dialog.hasAttribute('open')).toBe(true);
    hideDialog(dialog);
    expect(dialog.hasAttribute('open')).toBe(false);
    showDialog(null);
    hideDialog(undefined);
  });

  it('closes the open row menus of its root on a click outside them, until stopped', () => {
    const root = document.body.appendChild(document.createElement('div'));
    root.innerHTML = '<details class="adt-row-menu" open><summary>⋮</summary><button>Edit</button></details><details class="adt-row-menu" open><summary>⋮</summary></details>';
    const [first, second] = root.querySelectorAll('details');
    const stop = closeRowMenusOnOutsideClick(document, () => root);
    first!.querySelector('button')!.click(); // inside the first menu
    expect(first!.open).toBe(true);
    expect(second!.open).toBe(false);
    document.body.click();
    expect(first!.open).toBe(false);
    stop();
    first!.open = true;
    document.body.click();
    expect(first!.open).toBe(true);
  });
});
