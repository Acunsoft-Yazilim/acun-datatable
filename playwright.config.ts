import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// The Livewire browser tests need the Laravel package's dependencies (composer install).
const livewire = existsSync('packages/adapter-laravel/vendor/autoload.php');
// The Next.js and Nuxt test apps, built by `npm run e2e:ssr` (scripts/ssr-apps.mjs).
const ssr = process.env['ADT_SSR'] === '1';
// The fixture server's port: ADT_E2E_PORT when 4173 is taken on this machine.
const port = process.env['ADT_E2E_PORT'] ?? '4173';

// Browser tests for the DOM renderer (SPEC M3). They load the real build output,
// so `npm run e2e` builds first. Chromium covers Chrome/Edge, WebKit covers
// Safari and every iOS browser, Firefox covers Gecko.
export default defineConfig({
  testDir: './e2e',
  // Visual baselines per platform: the same page renders text a little differently on each OS.
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{arg}-{projectName}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/server.mjs',
      url: `http://127.0.0.1:${port}/e2e/fixtures/table.html`,
      env: { PORT: port },
      reuseExistingServer: !process.env.CI,
    },
    // Livewire tables from the test fixtures (packages/adapter-laravel/workbench).
    ...(livewire ? [{
      command: 'php vendor/bin/testbench serve --port=8123',
      cwd: 'packages/adapter-laravel',
      url: 'http://127.0.0.1:8123/',
      reuseExistingServer: !process.env.CI,
    }] : []),
    ...(ssr ? [{
      command: 'npm run start',
      cwd: 'e2e/ssr/next',
      url: 'http://127.0.0.1:4174/',
      env: { NEXT_TELEMETRY_DISABLED: '1' },
      reuseExistingServer: !process.env.CI,
    }, {
      command: 'npm run start',
      cwd: 'e2e/ssr/nuxt',
      url: 'http://127.0.0.1:4175/',
      env: { HOST: '127.0.0.1', PORT: '4175' },
      reuseExistingServer: !process.env.CI,
    }] : []),
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Make Tab reach every control, as with full keyboard access enabled.
        launchOptions: { firefoxUserPrefs: { 'accessibility.tabfocus': 7 } },
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
