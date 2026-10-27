---
"@acunsoft/datatable-vue": patch
---

Server rendering (Nuxt): components no longer subscribe to the table or the status source during a server render, where nothing unsubscribes; a table or query runner shared between requests kept 13 listeners per request. They follow from `onBeforeMount`, which runs only in the browser. On Vue 3.4 (which has no `useId`) element ids are counted per app, so a later request numbers them as the browser does and an opened row's `aria-controls` names its details again.
