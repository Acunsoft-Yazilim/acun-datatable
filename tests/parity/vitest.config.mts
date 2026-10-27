import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The DOM renderer, the React and the Vue adapter from their sources, side by side.
const src = (path: string) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@acunsoft/datatable-core': src('core/src/index.ts'),
      '@acunsoft/datatable-dom': src('renderer-dom/src/index.ts'),
      '@acunsoft/datatable-react': src('react/src/index.ts'),
      '@acunsoft/datatable-vue': src('vue/src/index.ts'),
    },
  },
  test: { environment: 'jsdom', include: ['tests/parity/**/*.test.ts'] },
});
