import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const template = await readFile('src/driver-sw.js', 'utf8');
const release = createHash('sha256').update(template).update(await readFile('dist/index.html')).update(await readFile('dist/motoristas/offline.html')).digest('hex').slice(0, 16);
await writeFile('dist/driver-sw.js', template.replaceAll('__DRIVER_RELEASE__', release));
console.log('Driver PWA: only the public offline notice is cached; API, private media and navigations are excluded.');
