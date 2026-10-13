import { previewProductImportSchema, type PreviewProductImportInput } from '@rebequi/shared/schemas';
import type { Prisma } from '@prisma/client';

type ExistingProduct = { id: string; sku: string | null; deletedAt?: Date | null };
type ExistingCategory = { id: string };
type ExistingLink = { source: string; externalId: string; productId: string };
type ExistingCategoryLink = { source: string; externalId: string; categoryId: string };

export function classifyProductImport(input: PreviewProductImportInput, products: ExistingProduct[], categories: ExistingCategory[], links: ExistingLink[] = [], categoryLinks: ExistingCategoryLink[] = []) {
  const knownSku = new Map(products.filter(product => product.sku).map(product => [product.sku!, product.id]));
  const archivedProducts = new Set(products.filter(product => product.deletedAt).map(product => product.id));
  const knownCategory = new Set(categories.map(category => category.id));
  const knownLink = new Map(links.filter(link => link.source === input.source).map(link => [link.externalId, link.productId]));
  const linkedProduct = new Map(links.filter(link => link.source === input.source).map(link => [link.productId, link.externalId]));
  const linkedCategory = new Map(categoryLinks.filter(link => link.source === input.source).map(link => [link.externalId, link.categoryId]));
  const skuCount = new Map<string, number>(); const idCount = new Map<string, number>();
  for (const row of input.rows) {
    skuCount.set(row.sku, (skuCount.get(row.sku) ?? 0) + 1);
    idCount.set(row.externalId, (idCount.get(row.externalId) ?? 0) + 1);
  }
  const rows = input.rows.map((row, index) => {
    const conflicts: string[] = [];
    if ((idCount.get(row.externalId) ?? 0) > 1) conflicts.push('DUPLICATE_EXTERNAL_ID');
    if ((skuCount.get(row.sku) ?? 0) > 1) conflicts.push('DUPLICATE_SKU');
    const linkedProductId = knownLink.get(row.externalId);
    if (linkedProductId && linkedProductId !== knownSku.get(row.sku)) conflicts.push('LINK_SKU_MISMATCH');
    const localProductId = knownSku.get(row.sku);
    if (localProductId && archivedProducts.has(localProductId)) conflicts.push('SKU_ARCHIVED_LOCAL');
    if (!linkedProductId && localProductId && linkedProduct.has(localProductId)) conflicts.push('PRODUCT_LINKED_TO_OTHER_ID');
    if (!linkedProductId && localProductId && !linkedProduct.has(localProductId) && !archivedProducts.has(localProductId)) conflicts.push('SKU_ALREADY_LOCAL');
    const resolvedCategoryId = row.categoryId ?? linkedCategory.get(row.externalCategoryId!) ?? null;
    if (row.externalCategoryId && !resolvedCategoryId) conflicts.push('EXTERNAL_CATEGORY_NOT_LINKED');
    else if (!resolvedCategoryId || !knownCategory.has(resolvedCategoryId)) conflicts.push('CATEGORY_NOT_FOUND');
    return { row: index + 1, externalId: row.externalId, sku: row.sku, localProductId: linkedProductId ?? localProductId ?? null, resolvedCategoryId, conflicts, status: conflicts.length ? 'CONFLICT' : linkedProductId ? 'LINKED_REVIEW' : 'READY_FOR_REVIEW' };
  });
  return { source: input.source, authority: { catalog: 'LOCAL', price: 'LOCAL', stock: 'LOCAL' }, rows,
    summary: { total: rows.length, conflicts: rows.filter(row => row.conflicts.length).length, readyForReview: rows.filter(row => !row.conflicts.length).length },
    applied: false };
}

export async function previewProductImport(raw: PreviewProductImportInput, transaction?: Prisma.TransactionClient) {
  const input = previewProductImportSchema.parse(raw);
  const { prisma } = await import('../lib/prisma.js');
  const read = async (tx: Prisma.TransactionClient) => {
    const [products, categoryLinks] = await Promise.all([
      tx.product.findMany({ where: { sku: { in: input.rows.map(row => row.sku) } }, select: { id: true, sku: true, deletedAt: true } }),
      tx.externalCategoryLink.findMany({ where: { source: input.source, revokedAt: null,
        externalId: { in: input.rows.flatMap(row => row.externalCategoryId ? [row.externalCategoryId] : []) } },
        select: { source: true, externalId: true, categoryId: true } }),
    ]);
    const [categories, links] = await Promise.all([
      tx.category.findMany({ where: { id: { in: [...input.rows.flatMap(row => row.categoryId ? [row.categoryId] : []), ...categoryLinks.map(link => link.categoryId)] },
        isActive: true, deletedAt: null }, select: { id: true } }),
      tx.externalProductLink.findMany({ where: { source: input.source, revokedAt: null,
        OR: [{ externalId: { in: input.rows.map(row => row.externalId) } }, { productId: { in: products.map(product => product.id) } }] },
        select: { source: true, externalId: true, productId: true } }),
    ]);
    return classifyProductImport(input, products, categories, links, categoryLinks);
  };
  return transaction ? read(transaction) : prisma.$transaction(read, { isolationLevel: 'RepeatableRead' });
}
