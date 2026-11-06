{{--
  The confirmation of an action with Action::confirm(): a promise of true or
  false, read from the data-confirm* attributes of `$from` (default $el). The
  dialog is, in this order: the handler registered with setConfirm() of
  @acunsoft/datatable-dom (window[Symbol.for('acunsoft.datatable.confirm')]),
  ACUN UI's AcunUI.confirm() when it is on the page, the browser's confirm().
  Each gets { title, text, confirmLabel, cancelLabel, tone }; a handler that
  fails counts as "cancel". Printed inside an attribute: single quotes only.
--}}
((el) => { const data = el.dataset; const ask = { text: data.confirm ?? '' }; if (data.confirmTitle) ask.title = data.confirmTitle; if (data.confirmLabel) ask.confirmLabel = data.confirmLabel; if (data.confirmCancel) ask.cancelLabel = data.confirmCancel; if (data.confirmTone) ask.tone = data.confirmTone; const own = window[Symbol.for('acunsoft.datatable.confirm')]; const ui = window.AcunUI && typeof window.AcunUI.confirm === 'function' ? request => window.AcunUI.confirm(request) : null; const handler = typeof own === 'function' ? own : ui; if (! handler) return Promise.resolve(window.confirm(ask.text)); try { return Promise.resolve(handler(ask)).then(answer => answer === true, () => false); } catch (error) { return Promise.resolve(false); } })({{ $from ?? '$el' }})
