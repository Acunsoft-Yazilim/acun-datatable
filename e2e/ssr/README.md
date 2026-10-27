# Next.js and Nuxt test apps

Small apps that use the React and Vue packages the way Next.js (App Router)
and Nuxt pages do, so the browser tests in `e2e/ssr.spec.ts` can check server
rendering and hydration in the real frameworks. They are test fixtures: never
published, not npm workspaces, and not needed by anything else.

```bash
npm run e2e:ssr          # build the packages and both apps, then run the tests
```

Each app installs the packages from `packages/*` as copies (`install-links`),
so it has one React or one Vue, as an app that installs them from npm.
