// The JavaScript a browser loads for the Next.js and Nuxt test apps (e2e/ssr): a page
// with the table, a server-mode page, and an empty page as the framework's own baseline.
// Run after `npm run e2e:ssr` (which builds both apps): node scripts/ssr-size.mjs [--json FILE]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const apps = [
  { name: 'Next.js', cwd: 'e2e/ssr/next', url: 'http://127.0.0.1:4174', env: { NEXT_TELEMETRY_DISABLED: '1' } },
  { name: 'Nuxt', cwd: 'e2e/ssr/nuxt', url: 'http://127.0.0.1:4175', env: { HOST: '127.0.0.1', PORT: '4175' } },
];
const pages = [['/empty', 'no table'], ['/', 'table (rows from the server page)'], ['/remote', 'table (server mode)']];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const kb = bytes => Math.round(bytes / 102.4) / 10;

const browser = await chromium.launch();
const results = [];
for (const app of apps) {
  const server = spawn(npm, ['run', 'start'], { cwd: fileURLToPath(new URL(`../${app.cwd}/`, import.meta.url)), env: { ...process.env, ...app.env }, stdio: 'ignore', detached: true });
  try {
    for (let tries = 0; ; tries++) {
      try { if ((await fetch(`${app.url}/empty`)).ok) break; } catch { /* starting */ }
      if (tries > 100) throw new Error(`${app.name} did not start`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    for (const [path, what] of pages) {
      const page = await browser.newPage();
      const scripts = [];
      page.on('response', response => { if (response.request().resourceType() === 'script') scripts.push(response); });
      await page.goto(`${app.url}${path}`, { waitUntil: 'networkidle' });
      const bodies = await Promise.all(scripts.map(response => response.body()));
      const raw = bodies.reduce((sum, body) => sum + body.length, 0);
      const gzip = bodies.reduce((sum, body) => sum + gzipSync(body, { level: 9 }).length, 0);
      results.push({ app: app.name, page: path, what, files: bodies.length, rawKB: kb(raw), gzipKB: kb(gzip) });
      await page.close();
    }
  } finally {
    process.kill(-server.pid);
  }
}
await browser.close();

for (const app of apps) {
  const base = results.find(row => row.app === app.name && row.page === '/empty');
  for (const row of results.filter(row => row.app === app.name)) row.tableGzipKB = Math.round((row.gzipKB - base.gzipKB) * 10) / 10;
}
console.table(results);
const json = process.argv.indexOf('--json');
if (json > 0) writeFileSync(process.argv[json + 1], `${JSON.stringify(results, null, 2)}\n`);
