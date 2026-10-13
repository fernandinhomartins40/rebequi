import { previewCategoryImportSchema, type PreviewCategoryImportInput } from '@rebequi/shared/schemas';
import type { Prisma } from '@prisma/client';

type Category = { id: string; slug: string; name: string; deletedAt: Date | null; isActive: boolean };
type Link = { source: string; externalId: string; categoryId: string };
export function classifyCategoryImport(input: PreviewCategoryImportInput, categories: Category[], links: Link[] = []) {
  const bySlug = new Map(categories.map(row => [row.slug, row])); const byName = new Map(categories.map(row => [row.name, row]));
  const byExternal = new Map(links.filter(row => row.source === input.source).map(row => [row.externalId, row.categoryId]));
  const byCategory = new Map(links.filter(row => row.source === input.source).map(row => [row.categoryId, row.externalId]));
  const ids = new Map<string, number>(); const slugs = new Map<string, number>();
  for (const row of input.rows) { ids.set(row.externalId, (ids.get(row.externalId) ?? 0) + 1); slugs.set(row.slug, (slugs.get(row.slug) ?? 0) + 1); }
  const rows = input.rows.map((row, index) => {
    const conflicts: string[] = [];
    if ((ids.get(row.externalId) ?? 0) > 1) conflicts.push('DUPLICATE_EXTERNAL_ID');
    if ((slugs.get(row.slug) ?? 0) > 1) conflicts.push('DUPLICATE_SLUG');
    const slugMatch = bySlug.get(row.slug); const nameMatch = byName.get(row.name); const linkedId = byExternal.get(row.externalId);
    const local = slugMatch ?? nameMatch;
    if (slugMatch && nameMatch && slugMatch.id !== nameMatch.id) conflicts.push('SLUG_NAME_COLLISION');
    if (local?.deletedAt || local?.isActive === false) conflicts.push('CATEGORY_INACTIVE');
    if (linkedId && linkedId !== slugMatch?.id) conflicts.push('LINK_SLUG_MISMATCH');
    if (!linkedId && slugMatch && byCategory.has(slugMatch.id)) conflicts.push('CATEGORY_LINKED_TO_OTHER_ID');
    if (!linkedId && slugMatch && !byCategory.has(slugMatch.id) && !local?.deletedAt && local?.isActive) conflicts.push('SLUG_ALREADY_LOCAL');
    if (nameMatch && !slugMatch) conflicts.push('NAME_ALREADY_LOCAL');
    return { row: index + 1, externalId: row.externalId, slug: row.slug, localCategoryId: linkedId ?? local?.id ?? null,
      conflicts, status: conflicts.length ? 'CONFLICT' : linkedId ? 'LINKED_REVIEW' : 'READY_FOR_REVIEW' };
  });
  return { source: input.source, authority: { categories: 'LOCAL' }, rows,
    summary: { total: rows.length, conflicts: rows.filter(row => row.conflicts.length).length }, applied: false };
}

export async function previewCategoryImport(raw: PreviewCategoryImportInput) {
  const input = previewCategoryImportSchema.parse(raw);
  const { prisma } = await import('../lib/prisma.js');
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const categories = await tx.category.findMany({ where: { OR: [{ slug: { in: input.rows.map(row => row.slug) } },
      { name: { in: input.rows.map(row => row.name) } }] }, select: { id: true, slug: true, name: true, deletedAt: true, isActive: true } });
    const links = await tx.externalCategoryLink.findMany({ where: { source: input.source, revokedAt: null,
      OR: [{ externalId: { in: input.rows.map(row => row.externalId) } }, { categoryId: { in: categories.map(row => row.id) } }] },
      select: { source: true, externalId: true, categoryId: true } });
    return classifyCategoryImport(input, categories, links);
  }, { isolationLevel: 'RepeatableRead' });
}
