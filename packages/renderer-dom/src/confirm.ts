/** What a confirmation dialog shows: the question, and optionally a title, button texts and a tone. */
export interface ConfirmRequest {
  readonly title?: string;
  /** The question, e.g. "Delete this order?". */
  readonly text: string;
  /** The confirm button's text; left out, the dialog's own ("OK"). */
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** `danger` for a destructive action (a danger-coloured confirm button). */
  readonly tone?: 'default' | 'danger';
}

/** Shows a confirmation and answers whether to go on; may answer at once or later. */
export type ConfirmHandler = (request: ConfirmRequest) => boolean | Promise<boolean>;

/**
 * Where the registered handler lives: one global slot, so every copy of this
 * package on a page (and the Livewire views of acunsoft/datatable-laravel,
 * which read the same slot) uses the same dialog.
 */
const SLOT = Symbol.for('acunsoft.datatable.confirm');
const slot = globalThis as unknown as Record<symbol, unknown>;

type ConfirmView = { confirm?(message: string): boolean; AcunUI?: { confirm?: unknown } };

/**
 * Use your own confirmation dialog for every action with `confirm`, e.g.
 * `setConfirm(({ title, text, confirmLabel, tone }) => myDialog.ask(…))`
 * returning a promise of `true` / `false`. `null` removes it again. Without
 * one, ACUN UI's `AcunUI.confirm()` is used when it is on the page, else the
 * browser's `confirm()` (which shows only the question).
 */
export function setConfirm(handler: ConfirmHandler | null): void {
  if (handler !== null && typeof handler !== 'function') throw new TypeError('setConfirm needs a function or null');
  slot[SLOT] = handler ?? undefined;
}

/**
 * Ask a confirmation: through the handler of `setConfirm()`, else
 * `AcunUI.confirm()` (feature-detected on `view`), else `view.confirm()`.
 * The browser's answer comes at once (a boolean), a dialog's later (a
 * promise); a handler that throws or rejects counts as "cancel". Without
 * any of them the action goes on (`true`), as before.
 */
export function askConfirm(request: ConfirmRequest, view: ConfirmView = globalThis as never): boolean | Promise<boolean> {
  const ui = view.AcunUI;
  const handler = typeof slot[SLOT] === 'function' ? slot[SLOT] as ConfirmHandler
    : typeof ui?.confirm === 'function' ? (ask: ConfirmRequest) => (ui as { confirm: ConfirmHandler }).confirm(ask) : undefined;
  if (!handler) return typeof view.confirm !== 'function' || view.confirm(request.text);
  try {
    const answer = handler(request);
    return typeof answer === 'boolean' ? answer : Promise.resolve(answer).then(ok => ok === true, () => false);
  } catch {
    return false;
  }
}
