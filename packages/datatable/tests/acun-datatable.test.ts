import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AcunDataTable } from '../src/index';

let host: HTMLElement;
beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  host = document.createElement('div');
  host.id = 'orders';
  document.body.append(host);
});
afterEach(() => vi.unstubAllGlobals());

const orders = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, customer: i % 2 ? `Ali ${i + 1}` : `Ayşe ${i + 1}`, total: (i + 1) * 10 }));
const json = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const info = () => document.querySelector('.adt-info')?.textContent;
const headers = () => [...document.querySelectorAll('thead th.adt-th')].map(th => th.textContent?.replace(/[▲▼\d]/g, ''));

describe('AcunDataTable', () => {
  it('turns an existing <table> into a full table and puts it back on destroy', async () => {
    document.body.innerHTML = `<table id="t"><thead><tr><th data-column="name">Ad</th><th>Şehir</th></tr></thead>
      <tbody><tr><td>Ayşe</td><td>İzmir</td></tr><tr><td>Ali</td><td>Ankara</td></tr></tbody></table>`;
    const original = document.getElementById('t');
    const dt = new AcunDataTable('#t', { language: 'tr' });
    await dt.ready;
    expect(document.getElementById('t')).toBeNull();
    expect(headers()).toEqual(['Ad', 'Şehir']);
    expect(dt.table!.getColumns().map(column => column.id)).toEqual(['name', 'sehir']);
    expect(info()).toBe('Toplam: 2 kaydın 1 ile 2 arasını gösteriyor');
    dt.search('ankara');
    expect([...document.querySelectorAll('tbody td')].map(td => td.textContent)).toEqual(['Ali', 'Ankara']);
    dt.destroy();
    expect(document.getElementById('t')).toBe(original);
  });

  it('applies the DataTables-style options', async () => {
    const dt = new AcunDataTable('#orders', {
      data: orders,
      columns: [{ data: 'customer', title: 'Müşteri' }, { data: 'total', type: 'number' }, { data: 'id', visible: false, sortable: false }],
      pagination: { pageSize: 10, pageSizes: [10, 20], firstLast: true },
      sorting: { multiSort: false, initial: [{ field: 'customer', direction: 'desc' }] },
      searching: { debounce: 0, placeholder: 'Müşteri ara…' },
      fixedHeader: true,
      language: 'tr',
    });
    await dt.ready;
    expect(headers()).toEqual(['Müşteri', 'Total']); // id starts hidden
    expect(document.querySelectorAll('.adt-sort')).toHaveLength(2);
    expect(document.querySelector('.adt-table-wrap')!.classList.contains('adt-sticky-header')).toBe(true);
    expect([...document.querySelectorAll<HTMLOptionElement>('.adt-length option')].map(option => option.value)).toEqual(['10', '20']);
    expect(document.querySelector<HTMLInputElement>('.adt-search input')!.placeholder).toBe('Müşteri ara…');
    expect(document.querySelector('.adt-first')).not.toBeNull();
    expect(info()).toBe('Toplam: 30 kaydın 1 ile 10 arasını gösteriyor');
    expect(dt.table!.getState().sorting).toEqual([{ field: 'customer', direction: 'desc' }]);
    const total = document.querySelectorAll<HTMLButtonElement>('.adt-sort')[1]!;
    total.dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }));
    expect(dt.table!.getState().sorting).toEqual([{ field: 'total', direction: 'asc' }]); // multiSort off: Shift replaces
  });

  it('turns parts off', async () => {
    const dt = new AcunDataTable('#orders', { data: orders, pagination: false, searching: false, sorting: false, columnToggle: false });
    await dt.ready;
    expect(document.querySelector('.adt-paging, .adt-length, .adt-search, .adt-columns, .adt-sort')).toBeNull();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(30); // every row on one page
    expect(headers()).toEqual(['Id', 'Customer', 'Total']); // fields of the first row
  });

  it('loads every row once from ajax and works in the browser', async () => {
    const fetch = json({ data: orders });
    vi.stubGlobal('fetch', fetch);
    const dt = new AcunDataTable('#orders', { ajax: '/orders.json', columns: [{ data: 'customer' }, { data: 'total' }] });
    expect(document.querySelector('.adt-notice')!.textContent).toBe('Loading…'); // processing
    expect(document.querySelectorAll('tbody .adt-skeleton-row')).toHaveLength(10); // placeholders, not "No rows"
    await dt.ready;
    expect(fetch).toHaveBeenCalledOnce();
    expect(info()).toBe('Showing 1 to 25 of 30 rows');
    dt.page(2);
    expect(fetch).toHaveBeenCalledOnce(); // paging stays in the browser
    expect(info()).toBe('Showing 26 to 30 of 30 rows');
  });

  it('runs server side with POST, the CSRF token and columns from the first row', async () => {
    document.head.innerHTML = '<meta name="csrf-token" content="t0ken">';
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body));
      const page = Number(body.get('page'));
      const size = Number(body.get('pageSize'));
      return new Response(JSON.stringify({ data: orders.slice((page - 1) * size, page * size), recordsFiltered: 30 }));
    });
    vi.stubGlobal('fetch', fetch);
    const dt = new AcunDataTable('#orders', { fixedHeader: true, serverSide: true, ajax: { url: '/api/products', method: 'POST' } });
    await dt.ready;
    const [url, init] = fetch.mock.calls.at(-1)!;
    expect(url).toBe('/api/products');
    expect(init).toMatchObject({ method: 'POST' });
    expect(new Headers(init!.headers).get('x-csrf-token')).toBe('t0ken');
    expect(headers()).toEqual(['Id', 'Customer', 'Total']);
    expect(info()).toBe('Showing 1 to 25 of 30 rows');
    dt.page(2);
    await vi.waitFor(() => expect(info()).toBe('Showing 26 to 30 of 30 rows'));
    expect(new URLSearchParams(String(fetch.mock.calls.at(-1)![1]!.body)).get('page')).toBe('2');
    dt.destroy();
  });

  it('reports load errors and refuses impossible options', async () => {
    vi.stubGlobal('fetch', json({ message: 'nope' }, 500));
    const dt = new AcunDataTable('#orders', { ajax: '/broken.json', columns: [{ data: 'customer' }] });
    await expect(dt.ready).rejects.toThrow('answered 500');
    expect(document.querySelector('[role="alert"]')!.textContent).toContain('The data could not be loaded.');
    expect(() => new AcunDataTable('#missing')).toThrow('no element matches #missing');
    expect(() => new AcunDataTable('#orders', { serverSide: true })).toThrow('serverSide needs ajax');
    expect(() => new AcunDataTable('#orders', { serverSide: true, ajax: '/x', pagination: false })).toThrow('pagination cannot be turned off');
  });
});

describe('filters', () => {
  it('adds the filter panel and chips for columns with filter', async () => {
    const dt = new AcunDataTable('#orders', {
      data: orders,
      language: 'tr',
      columns: [
        { data: 'customer', title: 'Müşteri', filter: true },
        { data: 'total', title: 'Tutar', type: 'number', filter: true },
        { data: 'id', title: 'No', filter: [{ value: 1, label: 'Bir' }, { value: 2, label: 'İki' }] },
      ],
    });
    await dt.ready;
    expect([...document.querySelectorAll('.adt-filter legend')].map(legend => legend.textContent)).toEqual(['Müşteri', 'Tutar', 'No']);
    dt.table!.setFilters([{ field: 'total', operator: 'gte', value: 250 }]);
    expect(document.querySelector('.adt-chip')!.textContent).toBe('Tutar: ≥ 250');
    expect(info()).toBe('Toplam: 6 kaydın 1 ile 6 arasını gösteriyor');
  });
});

describe('buttons and custom cells', () => {
  it('export the matching rows, copy them and draw cells as nodes', async () => {
    const created: Blob[] = [];
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (blob: Blob) => { created.push(blob); return 'blob:x'; }, revokeObjectURL: () => undefined }));
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { el } = await import('../src/index');
    const dt = new AcunDataTable('#orders', {
      data: orders,
      language: 'tr',
      buttons: ['excel', 'csv', 'copy', 'print', { id: 'mine', label: 'Benim', onSelect: () => 'tamam' }],
      exportFilename: 'siparisler',
      columns: [{ data: 'customer', title: 'Müşteri', cell: (value, _row, text) => el('strong', { class: 'name' }, text) }, { data: 'total', type: 'number' }],
    });
    await dt.ready;
    expect(document.querySelector('tbody strong.name')!.textContent).toBe('Ayşe 1');
    expect([...document.querySelectorAll('.adt-tools .adt-menu-item')].map(item => item.textContent)).toEqual(['Excel (.xlsx)', 'CSV', 'Kopyala', 'Yazdır', 'Benim']);
    dt.search('ali');
    document.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="copy"]')!.click();
    await vi.waitFor(() => expect(document.querySelector('.adt-menu-status')!.textContent).toBe('15 satır kopyalandı'));
    expect((writeText.mock.calls[0] as unknown as [string])[0].split('\n')[0]).toBe('Müşteri\tTotal');
    document.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="csv"]')!.click();
    await vi.waitFor(() => expect(created).toHaveLength(1));
    const bytes = new Uint8Array(await created[0]!.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM: Excel reads ş, ğ, İ
    expect((await created[0]!.text()).split('\r\n')[0]).toBe('Müşteri;Total'); // ; for Turkish Excel
  });

  it('writes CSV with ; for the languages whose Excel expects it, regional tags included', async () => {
    const created: Blob[] = [];
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (blob: Blob) => { created.push(blob); return 'blob:x'; }, revokeObjectURL: () => undefined }));
    for (const language of ['de-DE', 'fr', 'es', 'tr-TR', 'en']) {
      const host = document.body.appendChild(document.createElement('div'));
      const dt = new AcunDataTable(host, { data: orders.slice(0, 2), language, buttons: ['csv'], columns: [{ data: 'customer', title: 'C' }, { data: 'total', title: 'T' }] });
      await dt.ready;
      host.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="csv"]')!.click();
      await vi.waitFor(() => expect(created).toHaveLength(['de-DE', 'fr', 'es', 'tr-TR', 'en'].indexOf(language) + 1));
      expect((await created.at(-1)!.text()).replace(/^\uFEFF/, '').split('\r\n')[0]).toBe(language === 'en' ? 'C,T' : 'C;T');
      dt.destroy();
    }
  });

  it('exports every matching row of a server table, page by page, within the limit', async () => {
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url, 'http://x').searchParams;
      const page = Number(query.get('page'));
      const size = Number(query.get('pageSize'));
      return new Response(JSON.stringify({ rows: orders.slice((page - 1) * size, page * size), totalRows: 30 }));
    });
    vi.stubGlobal('fetch', fetch);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const dt = new AcunDataTable('#orders', { serverSide: true, ajax: '/api/orders', buttons: ['copy'], pagination: { pageSize: 10 } });
    await dt.ready;
    document.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="copy"]')!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(String(fetch.mock.calls.at(-1)![0])).toContain('pageSize=100'); // what the back ends allow by default
    expect(String(fetch.mock.calls.at(-1)![0])).not.toContain('pageSize=1000');
    expect((writeText.mock.calls[0] as unknown as [string])[0].trim().split('\n')).toHaveLength(31); // header + 30 rows, not one page

    const small = new AcunDataTable(document.body.appendChild(document.createElement('div')), {
      serverSide: true, ajax: '/api/orders', buttons: ['copy'], exportLimit: 20, language: 'tr',
    });
    await small.ready;
    small.element.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="copy"]')!.click();
    await vi.waitFor(() => expect(small.element.querySelector('.adt-menu-status--error')!.textContent).toBe('Dışa aktarma 20 satırı aşıyor; filtreleri daraltın.'));
  });

  // 250 rows behind a server that, like the Node and Laravel back ends by default, allows 100 rows a page.
  const many = Array.from({ length: 250 }, (_, i) => ({ id: i + 1, customer: `Müşteri ${i + 1}`, total: i }));
  const copied = async (options: ConstructorParameters<typeof AcunDataTable>[1], writeText: ReturnType<typeof vi.fn>) => {
    const dt = new AcunDataTable(document.body.appendChild(document.createElement('div')), { buttons: ['copy'], ...options });
    await dt.ready;
    dt.element.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="copy"]')!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    return (writeText.mock.calls[0] as unknown as [string])[0].trim().split('\n').slice(1);
  };

  it('exports from a server that refuses more than 100 rows a page (the defaults of both back ends)', async () => {
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url, 'http://x').searchParams;
      const page = Number(query.get('page'));
      const size = Number(query.get('pageSize'));
      if (size > 100) return new Response(JSON.stringify({ message: 'pageSize' }), { status: 422 });
      return new Response(JSON.stringify({ rows: many.slice((page - 1) * size, page * size), totalRows: many.length }));
    });
    vi.stubGlobal('fetch', fetch);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const lines = await copied({ serverSide: true, ajax: '/api/orders' }, writeText);
    expect(lines).toHaveLength(250);
    expect(lines.at(-1)).toContain('Müşteri 250');
    expect(fetch).toHaveBeenCalledTimes(1 + 3); // the table's page, then 100 + 100 + 50: no request past the total
  });

  it('exports every row from a DataTables back end that silently caps the length, and takes exportPageSize', async () => {
    const seen: number[] = [];
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url, 'http://x').searchParams;
      const start = Number(query.get('start'));
      const length = Math.min(Number(query.get('length')), 100); // like Laravel's TableResponse
      seen.push(Number(query.get('length')));
      return new Response(JSON.stringify({ draw: Number(query.get('draw')), data: many.slice(start, start + length), recordsTotal: 250, recordsFiltered: 250 }));
    });
    vi.stubGlobal('fetch', fetch);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const lines = await copied({
      serverSide: true, ajax: { url: '/api/orders', protocol: 'datatables' }, exportPageSize: 500,
      columns: [{ data: 'customer', title: 'Müşteri' }, { data: 'total', title: 'Tutar' }],
    }, writeText);
    expect(seen.slice(1)).toEqual([500, 100, 100]); // asked for 500, got 100: paged by 100 from there
    expect(lines).toHaveLength(250);
    expect(new Set(lines).size).toBe(250); // no row twice, none missing
    expect(lines.at(-1)).toContain('Müşteri 250');
  });

  it('refuses an exportPageSize the back ends cannot take', () => {
    expect(() => new AcunDataTable('#orders', { exportPageSize: 0 })).toThrow(RangeError);
    expect(() => new AcunDataTable('#orders', { exportPageSize: 1001 })).toThrow(RangeError);
    expect(() => new AcunDataTable('#orders', { exportPageSize: 2.5 })).toThrow(RangeError);
  });
});

describe('loading', () => {
  it('without columns: placeholder rows first, then one request for the first page', async () => {
    let answer!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(resolve => { answer = resolve; }));
    vi.stubGlobal('fetch', fetch);
    const dt = new AcunDataTable('#orders', { serverSide: true, ajax: '/api/orders', language: 'tr', pagination: { pageSize: 5 } });
    expect(document.querySelectorAll('.adt-skeleton-row')).toHaveLength(5);
    expect(document.querySelector('.adt-notice[role="status"]')!.textContent).toBe('Yükleniyor…');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    answer(new Response(JSON.stringify({ rows: orders.slice(0, 5), totalRows: 30 })));
    await dt.ready;
    expect(fetch).toHaveBeenCalledOnce(); // the page that named the columns is the table's first page
    expect(headers()).toEqual(['Id', 'Customer', 'Total']);
    expect(document.querySelectorAll('tbody .adt-row')).toHaveLength(5);
    expect(document.querySelector('.adt-skeleton')).toBeNull();
  });

  it('shows the error when the first load fails before the columns are known', async () => {
    vi.stubGlobal('fetch', json({ message: 'boom' }, 500));
    const dt = new AcunDataTable('#orders', { serverSide: true, ajax: '/api/orders' });
    await expect(dt.ready).rejects.toThrow();
    expect(document.querySelector('.adt-notice[role="alert"]')!.textContent).toBe('The data could not be loaded.');
    expect(document.querySelector('.adt-skeleton')).toBeNull();
  });
});

describe('footer totals', () => {
  it('sums every matching row in the browser and reads server totals', async () => {
    const local = new AcunDataTable('#orders', {
      data: orders, language: 'tr', pagination: { pageSize: 10 },
      columns: [{ data: 'customer' }, { data: 'total', type: 'number', aggregate: 'sum' }],
    });
    await local.ready;
    const foot = (root: ParentNode) => [...root.querySelectorAll('tfoot tr > *')].map(cell => cell.textContent);
    expect(foot(local.element)).toEqual(['Toplam', '4.650']); // all 30 rows, not the page of 10
    local.destroy();

    vi.stubGlobal('fetch', json({ data: orders.slice(0, 10), total: 30, totals: { total: '4650.00' } }));
    const remote = new AcunDataTable('#orders', {
      serverSide: true, ajax: '/api/orders', language: 'tr',
      columns: [{ data: 'customer' }, { data: 'total', type: 'decimal', aggregate: 'sum' }],
    });
    await remote.ready;
    expect(foot(remote.element)).toEqual(['Toplam', '4.650,00']);
    remote.destroy();

    const priced = new AcunDataTable('#orders', {
      data: orders, language: 'tr',
      columns: [{ data: 'customer' }, { data: 'total', type: 'number', aggregate: 'sum', render: value => `${String(value)} ₺` }],
    });
    await priced.ready;
    expect(foot(priced.element)).toEqual(['Toplam', '4650 ₺']);
  });

  it('reads data-aggregate from an existing table', async () => {
    document.body.innerHTML = `<table id="t"><thead><tr><th>Ad</th><th data-type="number" data-aggregate="max">Puan</th></tr></thead>
      <tbody><tr><td>Ayşe</td><td>7</td></tr><tr><td>Ali</td><td>12</td></tr></tbody></table>`;
    const dt = new AcunDataTable('#t');
    await dt.ready;
    expect([...dt.element.querySelectorAll('tfoot tr > *')].map(cell => cell.textContent)).toEqual(['Total', '12']);
  });
});

describe('columnResize and columnReorder', () => {
  it('adds handles, draggable headers and menu buttons, kept by stateSave', async () => {
    localStorage.clear();
    const first = new AcunDataTable('#orders', { data: orders, columnResize: true, columnReorder: true, stateSave: true });
    await first.ready;
    expect(document.querySelectorAll('thead .adt-resize')).toHaveLength(3);
    expect(document.querySelector('thead th[data-column-id="total"]')!.getAttribute('draggable')).toBe('true');
    document.querySelector<HTMLButtonElement>('.adt-move[aria-label="Move Total up"]')!.click();
    first.table!.setColumnWidth('customer', 260);
    first.destroy();
    const second = new AcunDataTable('#orders', { data: orders, stateSave: true });
    await second.ready;
    expect(second.table!.getState().columnOrder).toEqual(['id', 'total', 'customer']);
    expect(second.table!.getState().columnWidths).toEqual({ customer: 260 });
  });
});

describe('DataTables protocol', () => {
  it('talks to an existing DataTables back end', async () => {
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url, 'http://x').searchParams;
      const start = Number(query.get('start'));
      return new Response(JSON.stringify({ draw: Number(query.get('draw')), recordsTotal: 30, recordsFiltered: 30, data: orders.slice(start, start + Number(query.get('length'))) }));
    });
    vi.stubGlobal('fetch', fetch);
    const dt = new AcunDataTable('#orders', {
      serverSide: true, ajax: { url: '/datatables', protocol: 'datatables' }, pagination: { pageSize: 10 },
      columns: [{ data: 'customer' }, { data: 'total', type: 'number' }],
    });
    await dt.ready;
    dt.order([{ field: 'total', direction: 'desc' }]);
    dt.page(2);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    const last = new URL(String(fetch.mock.calls.at(-1)![0]), 'http://x').searchParams;
    expect(Object.fromEntries([...last].filter(([key]) => /^(draw|start|length|order|columns\[1\]\[data\])/.test(key)))).toEqual({
      draw: '3', start: '10', length: '10', 'order[0][column]': '1', 'order[0][dir]': 'desc', 'columns[1][data]': 'total',
    });
    await vi.waitFor(() => expect(info()).toBe('Showing 11 to 20 of 30 rows'));
    const missing = new AcunDataTable(document.body.appendChild(document.createElement('div')), { serverSide: true, ajax: { url: '/x', protocol: 'datatables' } });
    await expect(missing.ready).rejects.toThrow('needs columns');
  });
});

describe('cursor paging', () => {
  it('asks for keyset pages and follows nextCursor', async () => {
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url, 'http://x').searchParams;
      const after = Number(query.get('cursor') ?? 0);
      const rows = orders.slice(after, after + 10);
      return new Response(JSON.stringify({ rows, totalRows: 30, ...(after + 10 < 30 ? { nextCursor: String(after + 10) } : {}) }));
    });
    vi.stubGlobal('fetch', fetch);
    const dt = new AcunDataTable('#orders', {
      serverSide: true, ajax: '/api/orders', pagination: { pageSize: 10, cursor: true }, columns: [{ data: 'customer' }],
    });
    await dt.ready;
    const first = new URL(String(fetch.mock.calls[0]![0]), 'http://x').searchParams;
    expect(first.get('paging')).toBe('cursor');
    expect(first.has('cursor')).toBe(false);
    expect([...document.querySelectorAll('.adt-page-numbers > *')].map(node => node.textContent)).toEqual(['1', '2']); // only pages a cursor leads to
    dt.page(2);
    await vi.waitFor(() => expect(document.querySelector('tbody td')!.textContent).toBe('Ayşe 11'));
    expect(new URL(String(fetch.mock.calls.at(-1)![0]), 'http://x').searchParams.get('cursor')).toBe('10');
    expect(info()).toBe('Showing 11 to 20 of 30 rows');
  });
});

describe('review fixes', () => {
  it('exports every row of a cursor-paged table by following nextCursor, from any page', async () => {
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url, 'http://x').searchParams;
      const after = Number(query.get('cursor') ?? 0);
      const size = Number(query.get('pageSize'));
      const big = Array.from({ length: 1500 }, (_, i) => ({ id: i + 1, customer: `C${i + 1}` }));
      return new Response(JSON.stringify({ rows: big.slice(after, after + size), totalRows: 1500, ...(after + size < 1500 ? { nextCursor: String(after + size) } : {}) }));
    });
    vi.stubGlobal('fetch', fetch);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const dt = new AcunDataTable('#orders', { serverSide: true, ajax: '/api/orders', buttons: ['copy'], pagination: { pageSize: 10, cursor: true }, columns: [{ data: 'customer' }] });
    await dt.ready;
    dt.page(2);
    await vi.waitFor(() => expect(document.querySelector('tbody td')!.textContent).toBe('C11'));
    document.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="copy"]')!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    const lines = (writeText.mock.calls[0] as unknown as [string])[0].trim().split('\n');
    expect(lines).toHaveLength(1501);
    expect([lines[1], lines[1500]]).toEqual(['C1', 'C1500']);
  });

  it('exports every matching row once they are all selected in the selection bar, else the selected ones', async () => {
    const fetch = vi.fn(async (url: string) => {
      const query = new URL(url, 'http://x').searchParams;
      const page = Number(query.get('page'));
      const size = Number(query.get('pageSize'));
      return new Response(JSON.stringify({ rows: orders.slice((page - 1) * size, page * size), totalRows: 30 }));
    });
    vi.stubGlobal('fetch', fetch);
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const dt = new AcunDataTable('#orders', { serverSide: true, ajax: '/api/orders', buttons: ['copy'], selectable: true, bulkActions: [{ id: 'x', label: 'X', onSelect: () => undefined }], pagination: { pageSize: 10 }, columns: [{ data: 'customer' }] });
    await dt.ready;
    const copy = async () => {
      writeText.mockClear();
      document.querySelector<HTMLButtonElement>('.adt-menu-item[data-action="copy"]')!.click();
      await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
      return writeText.mock.calls[0]![0].trim().split('\n').length - 1; // rows, without the header
    };
    document.querySelector<HTMLInputElement>('thead .adt-select input')!.click(); // this page
    expect(await copy()).toBe(10);
    document.querySelector<HTMLButtonElement>('.adt-select-matching')!.click(); // "select all 30 matching"
    expect(dt.table!.isAllMatchingSelected()).toBe(true);
    expect(await copy()).toBe(30);
  });

  it('shows a DataTables error answer as an error and refuses cursor paging with that protocol', async () => {
    vi.stubGlobal('fetch', json({ draw: 1, error: 'unknown column "secret"', data: [] }));
    const dt = new AcunDataTable('#orders', { serverSide: true, ajax: { url: '/dt', protocol: 'datatables' }, columns: [{ data: 'customer' }] });
    await expect(dt.ready).rejects.toThrow('unknown column "secret"');
    const cursor = new AcunDataTable(document.body.appendChild(document.createElement('div')), {
      serverSide: true, ajax: { url: '/dt', protocol: 'datatables' }, columns: [{ data: 'customer' }], pagination: { cursor: true },
    });
    await expect(cursor.ready).rejects.toThrow('pagination.cursor does not work');
  });

  it('treats a returned fetch response as a result, not as the new row', async () => {
    let status = 200;
    const dt = new AcunDataTable('#orders', {
      data: orders, onEdit: async () => new Response(null, { status }), columns: [{ data: 'customer', editable: true }],
    });
    await dt.ready;
    const edit = (value: string) => {
      dt.element.querySelector<HTMLButtonElement>('.adt-edit')!.click();
      const input = dt.element.querySelector<HTMLInputElement>('.adt-edit-control')!;
      input.value = value;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    };
    edit('Saved');
    await vi.waitFor(() => expect(dt.element.querySelector('tbody tr:first-child td')!.textContent).toBe('Saved'));
    status = 500;
    edit('Lost');
    await vi.waitFor(() => expect(dt.element.querySelector('.adt-edit-message')?.textContent).toMatch(/500/));
    expect(dt.element.querySelector('.adt-editor')).not.toBeNull();
  });

  it('replaces the rows of a browser table with setData and keeps the state', async () => {
    const dt = new AcunDataTable('#orders', { data: orders, pagination: { pageSize: 10 } });
    await dt.ready;
    dt.page(2);
    dt.setData(orders.map(row => ({ ...row, total: row.total + 1 })));
    expect(info()).toBe('Showing 11 to 20 of 30 rows');
    expect(document.querySelector('tbody tr:first-child td:last-child')!.textContent).toBe('111');
  });
});

describe('editing in place', () => {
  it('saves through onEdit and shows the new value', async () => {
    const onEdit = vi.fn(async () => undefined);
    const dt = new AcunDataTable('#orders', {
      data: orders, language: 'tr', onEdit,
      columns: [{ data: 'customer', title: 'Müşteri', editable: true }, { data: 'total', type: 'number' }],
    });
    await dt.ready;
    dt.element.querySelector<HTMLButtonElement>('.adt-edit[aria-label="Müşteri düzenle: Ayşe 1"]')!.click();
    const input = dt.element.querySelector<HTMLInputElement>('.adt-edit-control')!;
    input.value = 'Ayşe Yılmaz';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(dt.element.querySelector('.adt-editor')).toBeNull());
    expect(onEdit).toHaveBeenCalledWith({ row: orders[0], field: 'customer', value: 'Ayşe Yılmaz', previous: 'Ayşe 1' });
    expect(dt.element.querySelector('tbody tr:first-child td')!.textContent).toBe('Ayşe Yılmaz');
    expect(orders[0]!.customer).toBe('Ayşe 1'); // your array is not changed
  });

  it('keeps the row, its selection and the focus when the rows have no ID field', async () => {
    const plain = orders.slice(0, 3).map(({ customer, total }) => ({ customer, total })); // e.g. read from <table> markup
    const dt = new AcunDataTable('#orders', { data: plain, selectable: true, onEdit: async () => undefined, columns: [{ data: 'customer', title: 'Customer', editable: true }, { data: 'total' }] });
    await dt.ready;
    dt.table!.toggleRow(dt.table!.getCoreRows()[0]!.id);
    const before = dt.table!.getState().selectedIds;
    const button = dt.element.querySelector<HTMLButtonElement>('tbody tr:first-child .adt-edit')!;
    button.focus();
    button.click();
    const input = dt.element.querySelector<HTMLInputElement>('.adt-edit-control')!;
    input.value = 'Renamed';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(dt.element.querySelector('.adt-editor')).toBeNull());
    expect(dt.element.querySelector('tbody tr:first-child td:not(.adt-select)')!.textContent).toBe('Renamed');
    expect(dt.table!.getState().selectedIds).toEqual(before); // the same row, still selected
    expect(document.activeElement).toBe(dt.element.querySelector('tbody tr:first-child .adt-edit')); // focus back on its button
  });

  it('reloads the page of a server table after a save', async () => {
    const fetch = json({ rows: orders.slice(0, 5), totalRows: 30 });
    vi.stubGlobal('fetch', fetch);
    const dt = new AcunDataTable('#orders', {
      serverSide: true, ajax: '/api/orders', onEdit: async () => undefined,
      columns: [{ data: 'customer', editable: true }],
    });
    await dt.ready;
    expect(fetch).toHaveBeenCalledOnce();
    dt.element.querySelector<HTMLButtonElement>('.adt-edit')!.click();
    const input = dt.element.querySelector<HTMLInputElement>('.adt-edit-control')!;
    input.value = 'x';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});

describe('fixedColumns', () => {
  it('pins the first column while the table scrolls sideways', async () => {
    const dt = new AcunDataTable('#orders', { data: orders, fixedColumns: { start: 1 } });
    await dt.ready;
    expect([...document.querySelectorAll('tbody tr:first-child > td')].map(td => td.classList.contains('adt-pin'))).toEqual([true, false, false]);
  });
});

describe('detail', () => {
  it('opens a child row with content loaded for the row', async () => {
    const detail = vi.fn(async (row: Record<string, unknown>) => `Lines of order ${String(row['id'])}`);
    const dt = new AcunDataTable('#orders', { data: orders, detail, language: 'tr' });
    await dt.ready;
    dt.element.querySelector<HTMLButtonElement>('.adt-expand[aria-label="1 ayrıntıları"]')!.click();
    await vi.waitFor(() => expect(dt.element.querySelector('.adt-detail-content')!.textContent).toBe('Lines of order 1'));
    expect(detail).toHaveBeenCalledWith(orders[0]);
  });
});

describe('stateSave', () => {
  it('restores page, sorting and search after a reload', async () => {
    localStorage.clear();
    const first = new AcunDataTable('#orders', { data: orders, stateSave: true, searching: { debounce: 0 } });
    await first.ready;
    first.search('ali');
    first.order([{ field: 'total', direction: 'desc' }]);
    first.page(2);
    first.destroy();
    const second = new AcunDataTable('#orders', { data: orders, stateSave: true });
    await second.ready;
    expect(second.table!.getState()).toMatchObject({ globalSearch: 'ali', sorting: [{ field: 'total', direction: 'desc' }], page: 1 });
    // 15 "Ali" rows fit on one page of 25, so page 2 is clamped to 1
    expect(document.querySelector<HTMLInputElement>('.adt-search input')!.value).toBe('ali');
  });
});

describe('filter panel and toolbar buttons', () => {
  const columns = [
    { data: 'customer', title: 'Müşteri', filter: true },
    { data: 'total', title: 'Tutar', type: 'number' as const, filter: true },
  ];

  it('filterPanel: modal opens the fields in a dialog; toolbarButtons set text, icon and classes', async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
    const dt = new AcunDataTable('#orders', {
      data: orders, language: 'tr', columns, filterPanel: 'modal',
      toolbarButtons: { filters: { label: 'Süz', className: 'btn btn-light' }, columns: { iconOnly: true } },
    });
    await dt.ready;
    const button = document.querySelector<HTMLButtonElement>('.adt-filter-open')!;
    expect(button.querySelector('.adt-summary-text')!.textContent).toBe('Süz');
    expect(button.classList).toContain('btn-light');
    expect(document.querySelector('.adt-feature--columns summary')!.classList).toContain('adt-icon-only');
    button.click();
    expect(document.querySelector<HTMLDialogElement>('.adt-filter-dialog--modal')!.open).toBe(true);
  });

  it('renderFilterPanel puts the fields into your own element, in the table language', async () => {
    const own = document.createElement('aside');
    document.body.append(own);
    const dt = new AcunDataTable('#orders', { data: orders, language: 'tr', columns, layout: { topEnd: ['columns'] } });
    await dt.ready;
    expect(document.querySelector('.adt-filters')).toBeNull(); // the built-in button left out
    const remove = dt.renderFilterPanel(own);
    expect(own.querySelector('.adt-filter-clear')!.textContent).toBe('Filtreleri temizle');
    own.querySelector<HTMLInputElement>('.adt-filter--range input')!.value = '250';
    own.querySelector('.adt-filter--range input')!.dispatchEvent(new Event('change'));
    expect(info()).toContain('6'); // 250..300
    remove();
    expect(own.children).toHaveLength(0);
    expect(() => dt.renderFilterPanel('#missing')).toThrow('no element matches #missing');
  });
});
