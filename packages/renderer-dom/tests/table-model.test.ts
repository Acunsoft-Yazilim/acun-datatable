import { afterEach, describe, expect, it, vi } from 'vitest';
import { frameThrottle, withoutIds } from '../src/internal';

afterEach(() => vi.useRealTimers());

describe('withoutIds', () => {
  it('keeps the order and drops the given ids, linear on large lists', () => {
    expect(withoutIds(['1', '2', 3, '4'], ['2', 3])).toEqual(['1', '4']);
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
