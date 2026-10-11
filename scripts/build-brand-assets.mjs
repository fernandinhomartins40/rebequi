import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Production variants preserve the supplied raster; no AI redraw is deployed.
const root = path.resolve('apps/frontend/public/brand');
await fs.mkdir(root, { recursive: true });
const original = 'apps/frontend/public/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png';
await fs.copyFile(original, path.join(root, 'rebequi-original.png'));
const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = 0, bottom = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3]) {
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
}
const full = await sharp(original).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
await fs.writeFile(path.join(root, 'rebequi-logo.png'), full);
await sharp(full).webp({ lossless: true, effort: 6 }).toFile(path.join(root, 'rebequi-logo.webp'));
const whiteLogo = await sharp(full).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// Reverse variant: keep red accents, slogan and original transparency.
for (let i = 0; i < whiteLogo.data.length; i += 4) {
  if (whiteLogo.data[i + 2] > whiteLogo.data[i] && whiteLogo.data[i + 2] > whiteLogo.data[i + 1]) {
    whiteLogo.data[i] = whiteLogo.data[i + 1] = whiteLogo.data[i + 2] = 255;
  }
}
const white = await sharp(whiteLogo.data, { raw: { width: whiteLogo.info.width, height: whiteLogo.info.height, channels: 4 } }).png().toBuffer();
await fs.writeFile(path.join(root, 'rebequi-logo-white.png'), white);
await sharp(white).webp({ lossless: true, effort: 6 }).toFile(path.join(root, 'rebequi-logo-white.webp'));
for (const width of [350, 700, 1400]) {
  await sharp(full).resize({ width }).png().toFile(path.join(root, `rebequi-logo-${width}.png`));
  await sharp(full).resize({ width }).webp({ lossless: true, effort: 6 }).toFile(path.join(root, `rebequi-logo-${width}.webp`));
  await sharp(white).resize({ width }).webp({ lossless: true, effort: 6 }).toFile(path.join(root, `rebequi-logo-white-${width}.webp`));
}

// Isolate the existing R emblem, excluding the adjacent word and slogan.
const mark = Buffer.from(data);
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const withinSymbol = y >= top && y <= bottom && x >= left && x <= (y >= 111 ? y + 7 : 128);
  const pixel = (y * info.width + x) * 4;
  const sloganEdge = y >= 111 && x > 100 && data[pixel] > data[pixel + 1] * 2 && data[pixel] > data[pixel + 2] * 2;
  if (!withinSymbol || sloganEdge) mark[pixel + 3] = 0;
}
const symbol = await sharp(mark, { raw: { width: info.width, height: info.height, channels: 4 } })
  .extract({ left, top, width: 134, height: bottom - top + 1 }).png().toBuffer();
await fs.writeFile(path.join(root, 'rebequi-symbol.png'), symbol);
await sharp(symbol).webp({ lossless: true }).toFile(path.join(root, 'rebequi-symbol.webp'));
for (const size of [16, 32, 48, 180, 192, 512]) {
  const padding = size >= 180 ? Math.round(size * 0.16) : 1;
  await sharp(symbol).resize(size - padding * 2, size - padding * 2, { fit: 'contain', background: '#ffffff00' })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: '#ffffff00' })
    .png().toFile(path.join(root, `rebequi-icon-${size}.png`));
}
for (const size of [192, 512]) {
  await sharp(path.join(root, `rebequi-icon-${size}.png`)).flatten({ background: '#ffffff' })
    .png().toFile(path.join(root, `rebequi-maskable-${size}.png`));
}
await sharp(path.join(root, 'rebequi-icon-180.png')).flatten({ background: '#ffffff' })
  .png().toFile(path.join(root, 'apple-touch-icon.png'));
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(size => fs.readFile(path.join(root, `rebequi-icon-${size}.png`))));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const entry = 6 + i * 16;
  header[entry] = size; header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += pngs[i].length;
});
await fs.writeFile(path.join(root, 'favicon.ico'), Buffer.concat([header, ...pngs]));
await fs.copyFile(path.join(root, 'favicon.ico'), path.join(root, '..', 'favicon.ico'));
for (const [name, background] of [['white', '#ffffff'], ['yellow', '#ffeb18']]) {
  await sharp(full).flatten({ background }).png().toFile(path.join(root, `rebequi-logo-on-${name}.png`));
}
const socialLogo = await sharp(full).resize({ width: 900 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#ffffff' } })
  .composite([{ input: socialLogo, gravity: 'centre' }]).png().toFile(path.join(root, 'rebequi-social-1200x630.png'));
const manifest = [];
for (const filename of (await fs.readdir(root)).sort()) {
  if (!/\.(png|webp|ico)$/.test(filename)) continue;
  const stat = await fs.stat(path.join(root, filename));
  const meta = filename.endsWith('.ico') ? {} : await sharp(path.join(root, filename)).metadata();
  manifest.push({ file: filename, width: meta.width, height: meta.height, bytes: stat.size });
}
await fs.writeFile(path.join(root, 'assets.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${manifest.length} faithful brand assets (${manifest.reduce((sum, a) => sum + a.bytes, 0)} bytes).`);
