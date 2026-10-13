import { previewProductImportSchema, type PreviewProductImportInput } from '@rebequi/shared/schemas';

type ExistingProduct = { id: string; sku: string | null };
type ExistingCategory = { id: string };

export function classifyProductImport(input: PreviewProductImportInput, products: ExistingProduct[], categories: ExistingCategory[]) {
  const knownSku = new Map(products.filter(product => product.sku).map(product => [product.sku!, product.id]));
  const knownCategory = new Set(categories.map(category => category.id));
  const skuCount = new Map<string, number>(); const idCount = new Map<string, number>();
  for (const row of input.rows) {
    skuCount.set(row.sku, (skuCount.get(row.sku) ?? 0) + 1);
    idCount.set(row.externalId, (idCount.get(row.externalId) ?? 0) + 1);
  }
  const rows = input.rows.map((row, index) => {
    const conflicts: string[] = [];
    if ((idCount.get(row.externalId) ?? 0) > 1) conflicts.push('DUPLICATE_EXTERNAL_ID');
    if ((skuCount.get(row.sku) ?? 0) > 1) conflicts.push('DUPLICATE_SKU');
    if (knownSku.has(row.sku)) conflicts.push('SKU_ALREADY_LOCAL');
    if (!knownCategory.has(row.categoryId)) conflicts.push('CATEGORY_NOT_FOUND');
    return { row: index + 1, externalId: row.externalId, sku: row.sku, localProductId: knownSku.get(row.sku) ?? null, conflicts, status: conflicts.length ? 'CONFLICT' : 'READY_FOR_REVIEW' };
  });
  return { source: input.source, authority: { catalog: 'LOCAL', price: 'LOCAL', stock: 'LOCAL' }, rows,
    summary: { total: rows.length, conflicts: rows.filter(row => row.conflicts.length).length, readyForReview: rows.filter(row => !row.conflicts.length).length },
    applied: false };
}

export async function previewProductImport(raw: PreviewProductImportInput) {
  const input = previewProductImportSchema.parse(raw);
  const { prisma } = await import('../lib/prisma.js');
  return prisma.$transaction(async tx => {
    const [products, categories] = await Promise.all([
      tx.product.findMany({ where: { sku: { in: input.rows.map(row => row.sku) } }, select: { id: true, sku: true } }),
      tx.category.findMany({ where: { id: { in: input.rows.map(row => row.categoryId) }, isActive: true, deletedAt: null }, select: { id: true } }),
    ]);
    return classifyProductImport(input, products, categories);
  }, { isolationLevel: 'RepeatableRead' });
}
