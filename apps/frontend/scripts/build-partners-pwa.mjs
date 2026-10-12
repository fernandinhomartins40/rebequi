import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { copyWorkboxLibraries, injectManifest } from 'workbox-build';

const root = path.resolve('dist');
const manifest = JSON.parse(await fs.readFile(path.join(root, '.vite/manifest.json'), 'utf8'));
const files = new Set(['index.html', 'brand/rebequi-icon-192.png', 'brand/rebequi-icon-512.png', 'brand/rebequi-logo-350.webp']);
const visited = new Set();
function visit(key) {
  if (visited.has(key)) return; visited.add(key);
  const entry = manifest[key]; if (!entry) throw new Error(`PWA dependency not found: ${key}`);
  files.add(entry.file); for (const css of entry.css ?? []) files.add(css);
  for (const dependency of entry.imports ?? []) visit(dependency);
}
visit('index.html'); visit('src/pages/partners/index.tsx');
let shellBytes = 0;
const entries = await Promise.all([...files].map(async file => {
  const bytes = await fs.readFile(path.join(root, file));
  shellBytes += bytes.length;
  return { url: `/${file}`, revision: createHash('sha256').update(bytes).digest('hex') };
}));
if (shellBytes > 2 * 1024 * 1024) throw new Error('Partners shell exceeds the 2 MiB cache budget');
const workboxDir = await copyWorkboxLibraries(path.join(root, 'parceiros'));
const template = await fs.readFile('src/partners-sw.js', 'utf8');
const temporary = path.join(root, 'parceiros/sw-source.js');
await fs.writeFile(temporary, template.replaceAll('__WORKBOX_DIR__', `/parceiros/${workboxDir}`));
const result = await injectManifest({ swSrc: temporary, swDest: path.join(root, 'parceiros/sw.js'), globDirectory: root, globPatterns: [], additionalManifestEntries: entries });
await fs.unlink(temporary);
if (result.warnings.length) throw new Error(result.warnings.join('\n'));
console.log(`Partners PWA: ${result.count} public shell assets, ${shellBytes} bytes; API and private media excluded.`);
