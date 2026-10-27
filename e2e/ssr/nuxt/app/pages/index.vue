<script setup>
// The table on a server-rendered page, without <ClientOnly>: useDataTable makes
// it on the server for the HTML and again in the browser for hydration.
import { AcunDataTableLayout, labelsTr, useDataTable } from '@acunsoft/datatable-vue';
import { orders } from '../../orders.js';

const columns = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true, enableFiltering: true, filter: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true, priority: 2 },
  { id: 'city', header: 'Şehir', accessorKey: 'city', priority: 3 },
];
const { table } = useDataTable({ data: orders, columns, locale: 'tr', initialState: { pageSize: 10 } });
const bulkActions = [{ id: 'mark', label: 'İşaretle', onSelect: () => undefined }];
</script>

<template>
  <main>
    <h1>Siparişler</h1>
    <AcunDataTableLayout
      :table="table" :labels="labelsTr" locale="tr" caption="Siparişler" selectable responsive="collapse"
      :bulk-actions="bulkActions"
    />
  </main>
</template>
