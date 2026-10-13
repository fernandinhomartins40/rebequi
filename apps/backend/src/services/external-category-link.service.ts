import { createHash } from 'node:crypto';
import { linkExternalCategorySchema, revokeExternalCategoryLinkSchema } from '@rebequi/shared/schemas';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';

type Actor = { userId: string; role: string };
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
async function requireManager(tx: Prisma.TransactionClient, actor: Actor) {
  const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
  if (!user?.isActive || user.role !== actor.role || !['ADMIN', 'MANAGER'].includes(user.role)) throw new ForbiddenError('Seu acesso às integrações mudou.');
}
export async function createExternalCategoryLink(actor: Actor, raw: z.infer<typeof linkExternalCategorySchema>) {
  const input = linkExternalCategorySchema.parse(raw);
  const requestKey = hash(`external-category-link:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify({ source: input.source, externalId: input.externalId,
    categoryId: input.categoryId, expectedSlug: input.expectedSlug }));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-category-link:${input.source}:${input.externalId}`}))`;
    await tx.$queryRaw`SELECT id FROM categories WHERE id=${input.categoryId} FOR UPDATE`;
    await requireManager(tx, actor);
    const repeated = await tx.externalCategoryLink.findUnique({ where: { requestKey } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro vínculo.');
      if (repeated.revokedAt) throw new ConflictError('Este vínculo foi revogado. Confira a categoria novamente.');
      return { id: repeated.id, source: repeated.source, externalId: repeated.externalId,
        categoryId: repeated.categoryId, createdAt: repeated.createdAt };
    }
    const category = await tx.category.findFirst({ where: { id: input.categoryId, deletedAt: null, isActive: true }, select: { id: true, slug: true } });
    if (!category) throw new NotFoundError('Categoria local ativa não encontrada.');
    if (category.slug !== input.expectedSlug) throw new ConflictError('O endereço da categoria mudou. Confira novamente.');
    const active = await tx.externalCategoryLink.findFirst({ where: { source: input.source, revokedAt: null,
      OR: [{ externalId: input.externalId }, { categoryId: input.categoryId }] } });
    if (active) throw new ConflictError('O ID externo ou a categoria já possui vínculo ativo nesta origem.');
    const row = await tx.externalCategoryLink.create({ data: { source: input.source, externalId: input.externalId,
      categoryId: input.categoryId, requestKey, fingerprint, actorId: actor.userId } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'EXTERNAL_CATEGORY_LINK_CREATED' } });
    return { id: row.id, source: row.source, externalId: row.externalId, categoryId: row.categoryId, createdAt: row.createdAt };
  });
}
export async function revokeExternalCategoryLink(actor: Actor, id: string, raw: z.infer<typeof revokeExternalCategoryLinkSchema>) {
  const input = revokeExternalCategoryLinkSchema.parse(raw);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM external_category_links WHERE id=${id} FOR UPDATE`;
    await requireManager(tx, actor);
    const current = await tx.externalCategoryLink.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('Vínculo de categoria não encontrado.');
    if (current.revokedAt) return { id: current.id, revokedAt: current.revokedAt };
    const row = await tx.externalCategoryLink.update({ where: { id }, data: { revokedAt: new Date(),
      revokedById: actor.userId, revokedReason: input.reason } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'EXTERNAL_CATEGORY_LINK_REVOKED' } });
    return { id: row.id, revokedAt: row.revokedAt };
  });
}
