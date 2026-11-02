'use client';
// Server mode: pages, sorting and search come from the route handler.
import { useEffect, useState } from 'react';
import { createDataTable } from '@acunsoft/datatable-core';
import { connectTable, createHttpDataSource, createQueryRunner } from '@acunsoft/datatable-http';
import { DataTableLayout, labelsTr } from '@acunsoft/datatable-react';

const columns = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true },
];

export function RemoteOrders() {
  const [table] = useState(() => createDataTable({ mode: 'server', columns, locale: 'tr', initialState: { pageSize: 10 } }));
  const [runner] = useState(() => createQueryRunner(createHttpDataSource({ url: '/api/orders' })));
  useEffect(() => connectTable(table, runner), [table, runner]);
  return <DataTableLayout table={table} status={runner} labels={labelsTr} locale="tr" />;
}
