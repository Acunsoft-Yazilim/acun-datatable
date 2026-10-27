---
"@acunsoft/datatable-core": patch
"@acunsoft/datatable-http": patch
"@acunsoft/datatable-server": patch
"@acunsoft/datatable-dom": patch
"@acunsoft/datatable-export": patch
"@acunsoft/datatable": patch
"@acunsoft/datatable-vue": patch
"@acunsoft/datatable-react": patch
---

Every export also has a `default` condition, so `require()` finds the packages (Node 22's `require(esm)`, Jest in CommonJS mode, TypeScript `node16` CommonJS files); it failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
