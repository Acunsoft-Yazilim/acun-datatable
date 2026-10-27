'use client';
// The table in a client component: useDataTable makes it once, on the server
// for the HTML and again in the browser for hydration.
import { DataTableLayout, labelsTr, useDataTable } from '@acunsoft/datatable-react';

const columns = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true, enableFiltering: true, filter: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true, priority: 2 },
  { id: 'city', header: 'Şehir', accessorKey: 'city', priority: 3 },
];

export function OrdersTable({ rows }) {
  const { table } = useDataTable({ data: rows, columns, locale: 'tr', initialState: { pageSize: 10 } });
  return (
    <DataTableLayout
      table={table} labels={labelsTr} locale="tr" caption="Siparişler" selectable responsive="collapse"
      bulkActions={[{ id: 'mark', label: 'İşaretle', onSelect: () => undefined }]}
    />
  );
}
