/**
 * A calendar day given for a date-time column: the first instant of the day
 * in the user's time zone, with `next`, the first instant of the day after.
 * `sqlQuery` and `prismaQuery` compare it as `[day, next)`. It is a `Date`,
 * so it binds like any other.
 */
export class TableDay extends Date {
  constructor(time: number, readonly day: string, readonly next: Date) {
    super(time);
  }
}

/**
 * Instants `readTableQuery` read with their time (`…T10:00:00+03:00`): never a
 * whole day, even when they fall on the server's midnight. (A `Date` at the
 * server's midnight from elsewhere still means its whole day, as before.)
 */
export const exactInstants = new WeakSet<Date>();

/** Whether `name` is a time zone this runtime knows (`Europe/Istanbul`, `UTC`). */
export function isTimeZone(name: unknown): name is string {
  if (typeof name !== 'string' || name === '' || name.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

const formats = new Map<string, Intl.DateTimeFormat>();

/** The wall clock of `timeZone` at an instant, as if it were UTC (milliseconds). */
function wallClock(time: number, timeZone: string): number {
  let format = formats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formats.set(timeZone, format);
  }
  const part: Record<string, number> = {};
  for (const { type, value } of format.formatToParts(new Date(time))) part[type] = Number(value);
  return Date.UTC(part['year']!, part['month']! - 1, part['day']!, part['hour']!, part['minute']!, part['second']!) + (time % 1000);
}

/** The first instant of a day in `timeZone`; in the server's zone without one. */
function startOf(year: number, month: number, day: number, timeZone: string | undefined): number {
  if (timeZone === undefined) return new Date(year, month - 1, day).getTime();
  const midnight = Date.UTC(year, month - 1, day);
  // The zone's offset just before and just after: one of them holds at midnight.
  const offsets = [midnight - 12 * 3_600_000, midnight + 12 * 3_600_000].map(time => wallClock(time, timeZone) - time);
  const candidates = [...new Set(offsets.map(offset => midnight - offset))].sort((a, b) => a - b);
  // Midnight skipped by a clock change: the day starts at the change, still `midnight - offset before`.
  return candidates.find(time => wallClock(time, timeZone) === midnight) ?? midnight - offsets[0]!;
}

/** `YYYY-MM-DD` as a `TableDay` in `timeZone` (the server's zone without one). */
export function tableDay(day: string, timeZone?: string): TableDay {
  const [year, month, date] = day.slice(0, 10).split('-').map(Number) as [number, number, number];
  return new TableDay(startOf(year, month, date, timeZone), day.slice(0, 10), new Date(startOf(year, month, date + 1, timeZone)));
}
