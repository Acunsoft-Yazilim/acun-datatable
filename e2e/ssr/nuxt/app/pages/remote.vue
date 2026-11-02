<script setup>
// Server mode: pages, sorting and search come from the server/api route,
// asked once the page runs in the browser.
import { onBeforeUnmount, onMounted } from 'vue';
import { createDataTable } from '@acunsoft/datatable-core';
import { connectTable, createHttpDataSource, createQueryRunner } from '@acunsoft/datatable-http';
import { AcunDataTableLayout, labelsTr } from '@acunsoft/datatable-vue';

const columns = [
  { id: 'customer', header: 'Müşteri', accessorKey: 'customer', enableSorting: true },
  { id: 'total', header: 'Tutar', accessorKey: 'total', type: 'decimal', enableSorting: true },
];
const table = createDataTable({ mode: 'server', columns, locale: 'tr', initialState: { pageSize: 10 } });
const runner = createQueryRunner(createHttpDataSource({ url: '/api/orders' }));
let disconnect = () => {};
onMounted(() => { disconnect = connectTable(table, runner); });
onBeforeUnmount(() => { disconnect(); table.destroy(); });
</script>

<template>
  <main>
    <h1>Sunucudan</h1>
    <AcunDataTableLayout :table="table" :status="runner" :labels="labelsTr" locale="tr" />
  </main>
</template>
