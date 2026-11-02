// Fails when a built file grows past its gzip budget (size-budget.json). Run after `npm run build`.
// A key that starts with `import` is what an app pays for that import alone: bundled with
// esbuild (minified, React and Vue left out, lazy chunks not counted), then gzipped.
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const budgets = JSON.parse(readFileSync(new URL('../size-budget.json', import.meta.url), 'utf8'));

async function bundled(statement) {
  const name = statement.match(/import \{ ([^}]+) \}/)?.[1] ?? 'all';
  const result = await build({
    stdin: { contents: `${statement};\nconsole.log(${name.split(',').map(part => part.trim()).join(', ')});`, resolveDir: root, loader: 'js' },
    bundle: true, minify: true, format: 'esm', splitting: true, outdir: tmpdir(), write: false, logLevel: 'error',
    external: ['react', 'react-dom', 'vue'], metafile: true,
  });
  // The entry and every chunk it imports statically; chunks behind import() load later.
  const outputs = result.metafile.outputs;
  const loaded = new Set();
  const visit = path => {
    if (loaded.has(path)) return;
    loaded.add(path);
    for (const { path: next, kind } of outputs[path].imports) if (kind === 'import-statement' && outputs[next]) visit(next);
  };
  visit(Object.keys(outputs).find(path => path.endsWith('stdin.js')));
  const files = result.outputFiles.filter(file => [...loaded].some(path => file.path.endsWith(path.replace(/^.*?(?=[^/]+$)/, ''))));
  return Buffer.concat(files.map(file => Buffer.from(file.contents)));
}

let failed = false;
for (const [key, budget] of Object.entries(budgets)) {
  if (key.startsWith('//')) continue;
  let size;
  try {
    size = gzipSync(key.startsWith('import ') ? await bundled(key) : readFileSync(new URL(`../${key}`, import.meta.url)), { level: 9 }).length;
  } catch (error) {
    console.error(key.startsWith('import ') ? `cannot bundle ${key}: ${error.message}` : `missing ${key}: run npm run build first`);
    failed = true;
    continue;
  }
  const over = size > budget;
  failed ||= over;
  console.log(`${over ? '✗' : '✓'} ${key.padEnd(66)} ${(size / 1024).toFixed(1).padStart(6)} KB gzip  (budget ${(budget / 1024).toFixed(1)} KB)`);
}
if (failed) {
  console.error('\nA file is over its size budget. Make it smaller, or raise its budget in size-budget.json on purpose.');
  process.exit(1);
}
