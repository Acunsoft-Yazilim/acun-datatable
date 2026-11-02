// Install and build the Next.js and Nuxt test apps (e2e/ssr) against the
// packages as they are now: run after `npm run build`. The local packages are
// installed again each time, as copies of their current build.
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NUXT_TELEMETRY_DISABLED: '1' };

for (const app of ['next', 'nuxt']) {
  const cwd = fileURLToPath(new URL(`../e2e/ssr/${app}/`, import.meta.url));
  const run = (...args) => execFileSync(npm, args, { cwd, env, stdio: 'inherit' });
  console.log(`\n${app}: install and build`);
  if (process.env.CI && existsSync(`${cwd}package-lock.json`)) {
    run('ci', '--no-audit', '--no-fund');
  } else {
    rmSync(`${cwd}node_modules/@acunsoft`, { recursive: true, force: true }); // copies of an older build
    run('install', '--no-audit', '--no-fund');
  }
  run('run', 'build');
}
