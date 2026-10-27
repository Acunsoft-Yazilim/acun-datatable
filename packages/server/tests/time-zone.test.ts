import { describe, expect, it } from 'vitest';
import { defineColumns, prismaQuery, readTableQuery, sqlQuery } from '../src/index';
import { TableDay, tableDay } from '../src/day';

const columns = defineColumns({
  ordered: { sql: 'ordered_at', type: 'datetime', sortable: true, filterable: true },
  shipped: { type: 'date', filterable: true },
});
const filter = (op: string, value: string | [string, string], extra = '') => new URLSearchParams(
  `filters[0][field]=ordered&filters[0][op]=${op}&${Array.isArray(value) ? `filters[0][value][0]=${value[0]}&filters[0][value][1]=${value[1]}` : `filters[0][value]=${value}`}${extra}`,
);
/** The instants bound for the filter, as ISO text (independent of the zone the tests run in). */
const bound = (params: URLSearchParams, options = {}) => sqlQuery(readTableQuery(params, columns, options), columns, { dialect: 'postgres', table: 'orders' })
  .count.values.map(value => (value as Date).toISOString());
const localDay = (date: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

describe('a day for a date-time column, in the user\'s time zone', () => {
  it('takes the zone the browser sends as tz', () => {
    expect(bound(filter('eq', '2026-10-23', '&tz=Europe/Istanbul'))).toEqual(['2026-10-22T21:00:00.000Z', '2026-10-23T21:00:00.000Z']);
    expect(bound(filter('eq', '2026-10-23', '&tz=America/New_York'))).toEqual(['2026-10-23T04:00:00.000Z', '2026-10-24T04:00:00.000Z']);
    expect(bound(filter('eq', '2026-10-23', '&tz=Asia/Tokyo'))).toEqual(['2026-10-22T15:00:00.000Z', '2026-10-23T15:00:00.000Z']);
    expect(bound(filter('eq', '2026-10-23', '&tz=UTC'))).toEqual(['2026-10-23T00:00:00.000Z', '2026-10-24T00:00:00.000Z']);
  });

  it('keeps every operator\'s meaning: gt is from the next day, lte up to it, between the whole last day', () => {
    const tz = '&tz=Asia/Tokyo';
    expect(bound(filter('gt', '2026-10-23', tz))).toEqual(['2026-10-23T15:00:00.000Z']);
    expect(bound(filter('gte', '2026-10-23', tz))).toEqual(['2026-10-22T15:00:00.000Z']);
    expect(bound(filter('lt', '2026-10-23', tz))).toEqual(['2026-10-22T15:00:00.000Z']);
    expect(bound(filter('lte', '2026-10-23', tz))).toEqual(['2026-10-23T15:00:00.000Z']);
    expect(bound(filter('between', ['2026-10-20', '2026-10-23'], tz))).toEqual(['2026-10-19T15:00:00.000Z', '2026-10-23T15:00:00.000Z']);
  });

  it('lets the server decide the zone (timeZone wins over tz) and refuses an unknown one', () => {
    expect(bound(filter('eq', '2026-10-23', '&tz=Asia/Tokyo'), { timeZone: 'Europe/Istanbul' })).toEqual(['2026-10-22T21:00:00.000Z', '2026-10-23T21:00:00.000Z']);
    expect(() => readTableQuery(filter('eq', '2026-10-23'), columns, { timeZone: 'Mars/Olympus' })).toThrow(RangeError);
    expect(readTableQuery(filter('eq', '2026-10-23', '&tz=Asia/Tokyo'), columns).timeZone).toBe('Asia/Tokyo');
  });

  it('without a zone, or with one it does not know, keeps the server\'s midnight as before', () => {
    const local = (day: string) => new Date(`${day}T00:00:00`).toISOString();
    expect(bound(filter('eq', '2026-10-23'))).toEqual([local('2026-10-23'), local('2026-10-24')]);
    expect(bound(filter('eq', '2026-10-23', '&tz=Not/AZone'))).toEqual([local('2026-10-23'), local('2026-10-24')]);
    expect(bound(filter('eq', '2026-10-23', `&tz=${'x'.repeat(100)}`))).toEqual([local('2026-10-23'), local('2026-10-24')]);
    expect(readTableQuery(filter('eq', '2026-10-23', '&tz=Not/AZone'), columns).timeZone).toBeUndefined();
  });

  it('follows clock changes: a 23-hour and a 25-hour day', () => {
    expect(bound(filter('eq', '2026-03-08', '&tz=America/New_York'))).toEqual(['2026-03-08T05:00:00.000Z', '2026-03-09T04:00:00.000Z']);
    expect(bound(filter('eq', '2026-11-01', '&tz=America/New_York'))).toEqual(['2026-11-01T04:00:00.000Z', '2026-11-02T05:00:00.000Z']);
    expect(bound(filter('eq', '2026-03-29', '&tz=Europe/Berlin'))).toEqual(['2026-03-28T23:00:00.000Z', '2026-03-29T22:00:00.000Z']);
  });

  it('starts each day at its first instant in many zones, including those whose clocks change at midnight', () => {
    const zones = ['America/Santiago', 'America/Havana', 'Asia/Beirut', 'America/Asuncion', 'Asia/Kolkata', 'Australia/Lord_Howe', 'Pacific/Chatham', 'America/St_Johns'];
    for (const timeZone of zones) {
      for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2027, 0, 1); time += 86_400_000) {
        const day = new Date(time).toISOString().slice(0, 10);
        const start = tableDay(day, timeZone);
        expect(localDay(start, timeZone), `${timeZone} ${day}`).toBe(day);
        expect(localDay(new Date(start.getTime() - 1000), timeZone), `${timeZone} ${day}`).not.toBe(day);
        expect(localDay(start.next, timeZone), `${timeZone} ${day}`).not.toBe(day);
        expect(localDay(new Date(start.next.getTime() - 1000), timeZone), `${timeZone} ${day}`).toBe(day);
      }
    }
  });

  it('leaves exact instants and date columns alone', () => {
    expect(bound(filter('gt', '2026-10-23T10:00:00.000%2B03:00', '&tz=Asia/Tokyo'))).toEqual(['2026-10-23T07:00:00.000Z']);
    const shipped = readTableQuery(new URLSearchParams('filters[0][field]=shipped&filters[0][op]=eq&filters[0][value]=2026-10-23&tz=Asia/Tokyo'), columns);
    expect(shipped.filters[0]!.value).toBe('2026-10-23'); // a calendar date: no zone involved
  });

  it('never takes an exact instant for a whole day, even at the server\'s midnight', () => {
    const midnight = new Date(2026, 9, 23).toISOString(); // the server's midnight, written as an instant
    const query = readTableQuery(filter('gt', midnight), columns);
    const sql = sqlQuery(query, columns, { dialect: 'postgres', table: 'orders' });
    expect(sql.count.text).toContain('"ordered_at" > $1');
    expect((sql.count.values[0] as Date).toISOString()).toBe(midnight);
  });

  it('reads tz in DataTables requests too, and gives Prisma the same range', () => {
    const datatables = new URLSearchParams('draw=1&start=0&length=10&columns[0][data]=ordered&filters[0][field]=ordered&filters[0][op]=eq&filters[0][value]=2026-10-23&tz=Europe/Istanbul');
    expect(bound(datatables)).toEqual(['2026-10-22T21:00:00.000Z', '2026-10-23T21:00:00.000Z']);
    const where = prismaQuery(readTableQuery(filter('eq', '2026-10-23', '&tz=Europe/Istanbul'), columns), columns).count.where as Record<string, unknown>;
    const clause = ((where['AND'] as unknown[] | undefined)?.[0] ?? where) as Record<string, { gte: Date; lt: Date }>;
    const range = Object.values(clause)[0]!;
    expect([range.gte.toISOString(), range.lt.toISOString()]).toEqual(['2026-10-22T21:00:00.000Z', '2026-10-23T21:00:00.000Z']);
    expect(range.gte).toBeInstanceOf(TableDay);
  });
});
