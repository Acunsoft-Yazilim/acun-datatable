/** The browser's time zone (`Europe/Istanbul`), when the runtime names one. */
function localTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone !== '' ? zone : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A filter day (`2026-10-23`) means that day where the user is: with one,
 * `tz` names the browser's time zone, so a server in another zone reads the
 * same day for a date-time column. Requests without a day stay as they are.
 */
export function addTimeZone(params: URLSearchParams): URLSearchParams {
  for (const [key, value] of params) {
    if (key.startsWith('filters[') && key.includes('][value]') && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const zone = localTimeZone();
      if (zone !== undefined) params.set('tz', zone);
      break;
    }
  }
  return params;
}
