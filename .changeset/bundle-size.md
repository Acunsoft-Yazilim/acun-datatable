---
"@acunsoft/datatable-vue": patch
"@acunsoft/datatable": patch
---

Smaller bundles. Vue: the components are marked side-effect free (`/*#__PURE__*/`), so a bundle keeps only those it uses: `useDataTable` alone 11.2 KB gzip instead of 33 KB, `AcunPagination` alone 5.5 KB instead of 23 KB (esbuild, Vue not counted). `@acunsoft/datatable`: the Excel and CSV writers load at the first export, so an app's first load is 42.0 KB instead of 46.0 KB; the `<script>` build is unchanged.
