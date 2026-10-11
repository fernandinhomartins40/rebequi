import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit';
process.env.JWT_SECRET ??= 'unit-test-secret-not-used-in-production-123';
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'rebequi-media-test-'));
process.env.UPLOAD_DIR = temporaryRoot;
const storage = await import('./product-image-storage.service.js');
const file = (buffer: Buffer) => ({ buffer, size: buffer.length, originalname: 'photo.png', mimetype: 'image/png' } as Express.Multer.File);

test('Managed uploads decode bytes, enforce dimensions and store lightweight WebP locally', async () => {
  try {
    const input = await sharp({ create: { width: 300, height: 150, channels: 3, background: '#6688aa' } }).png().toBuffer();
    for (const [store, width, height] of [
      [storage.storeProductImage, 1200, 1200], [storage.storePromotionImage, 1600, 900], [storage.storeCategoryImage, 800, 800], [storage.storeQuoteDocumentImage, 300, 150],
    ] as const) {
      const result = await store({ file: file(input), width: 99999, height: 99999 });
      const bytes = await readFile(path.join(temporaryRoot, result.storageKey));
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.format, 'webp'); assert.equal(result.mimeType, 'image/webp');
      assert.equal(metadata.width, width); assert.equal(metadata.height, height);
      assert.equal(result.width, width); assert.equal(result.height, height);
      assert.equal(bytes.length, result.size); assert.ok(bytes.length < 600 * 1024);
      assert.ok(result.url.startsWith('/uploads/')); assert.ok(result.filename.endsWith('.webp'));
    }
    await assert.rejects(storage.storeProductImage({ file: file(Buffer.from('not an image')) }), /Imagem inválida/);
    await assert.rejects(storage.storeProductImage({ file: file(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>')) }), /Imagem inválida/);
    await assert.rejects(storage.deleteStoredImages([{ storageKey: '../outside-file' }]), /Invalid storage key/);
  } finally {
    assert.equal(path.dirname(temporaryRoot), os.tmpdir());
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
