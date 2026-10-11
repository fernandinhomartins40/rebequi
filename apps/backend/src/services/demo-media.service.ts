import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

type Asset = { file: string; sku?: string; name?: string; slug?: string; aliases?: string[]; width: number; height: number; size: number };
type Manifest = { products: Asset[]; promotions: Asset[]; categories?: Asset[] };
const bundledRoot = fileURLToPath(new URL('../../assets/demo-media/', import.meta.url));
const isSeedImage = (url?: string | null) => Boolean(url && /^https:\/\/(source\.unsplash\.com|images\.unsplash\.com|via\.placeholder\.com)\//.test(url));
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Install bundled demo photographs without network downloads or overwriting merchant uploads. */
export async function installDemoMedia() {
  const manifest = JSON.parse(await fs.readFile(path.join(bundledRoot, 'manifest.json'), 'utf8')) as Manifest;
  async function install(asset: Asset, kind: 'products' | 'promotions' | 'categories', identity: string) {
    if (!/^[a-zA-Z0-9_-]+\.webp$/.test(asset.file) || !/^[a-zA-Z0-9_-]+$/.test(identity)) throw new Error('Invalid demo asset');
    const storageKey = `${kind}/demo-v1/${identity}.webp`;
    const destination = path.resolve(env.UPLOAD_DIR, storageKey);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try { await fs.copyFile(path.join(bundledRoot, asset.file), destination, fs.constants.COPYFILE_EXCL); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    return { url: `/uploads/${storageKey}`, storageKey, filename: `${identity}.webp`, mimeType: 'image/webp', size: asset.size, width: asset.width, height: asset.height };
  }
  let productImages = 0; let promotionImages = 0;
  for (const asset of manifest.products) {
    const products = await prisma.product.findMany({ where: { sku: { in: [asset.sku!, ...(asset.aliases || [])] }, deletedAt: null }, include: { images: true } });
    for (const product of products) {
      if (asset.name && normalize(product.name) !== normalize(asset.name) && !asset.aliases?.includes(product.sku || '')) continue;
      const images = product.images.filter(image => isSeedImage(image.url) && !image.storageKey);
      if (!images.length) continue;
      const stored = await install(asset, 'products', product.sku!);
      for (const image of images) {
        // Recheck the old URL in the update to preserve simultaneous merchant edits.
        const changed = await prisma.productImage.updateMany({ where: { id: image.id, url: image.url, storageKey: null }, data: stored });
        productImages += changed.count;
      }
    }
  }
  for (const asset of manifest.promotions) {
    const promotion = await prisma.promotion.findUnique({ where: { slug: asset.slug! } });
    if (!promotion || promotion.deletedAt || !isSeedImage(promotion.imageUrl) || promotion.imageStorageKey) continue;
    const stored = await install(asset, 'promotions', asset.slug!);
    const changed = await prisma.promotion.updateMany({ where: { id: promotion.id, imageUrl: promotion.imageUrl, imageStorageKey: null }, data: {
      imageUrl: stored.url, imageStorageKey: stored.storageKey, imageFilename: stored.filename, imageMimeType: stored.mimeType,
      imageSize: stored.size, imageWidth: stored.width, imageHeight: stored.height,
    } });
    promotionImages += changed.count;
  }
  let categoryImages = 0;
  for (const asset of manifest.categories || []) {
    const category = await prisma.category.findUnique({ where: { slug: asset.slug! } });
    if (!category || category.deletedAt || (category.image && !isSeedImage(category.image))) continue;
    const stored = await install(asset, 'categories', asset.slug!);
    const changed = await prisma.category.updateMany({ where: { id: category.id, image: category.image }, data: { image: stored.url } });
    categoryImages += changed.count;
  }
  return { productImages, promotionImages, categoryImages };
}
