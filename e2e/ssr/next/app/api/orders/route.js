// A route handler with @acunsoft/datatable-server: the request checked against
// the allowlist, then answered from memory (a real app runs sqlQuery or prismaQuery).
import { defineColumns, readTableQuery, tableError, tableResponse } from '@acunsoft/datatable-server';
import { orders } from '../../orders';

const columns = defineColumns({
  customer: { sortable: true, filterable: true },
  total: { type: 'decimal', sortable: true, filterable: true },
});

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  try {
    const query = readTableQuery(params, columns);
    const words = query.terms.map(term => term.toLocaleLowerCase('tr'));
    let rows = orders.filter(row => words.every(word => row.customer.toLocaleLowerCase('tr').includes(word)));
    for (const { column, direction } of [...query.sorting].reverse()) {
      const value = row => (column.type === 'decimal' ? Number(row[column.id]) : row[column.id]);
      rows = [...rows].sort((a, b) => (value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0) * (direction === 'desc' ? -1 : 1));
    }
    const page = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    return Response.json(tableResponse(query, page, rows.length));
  } catch (error) {
    const { status, body } = tableError(error, params);
    return Response.json(body, { status });
  }
}
