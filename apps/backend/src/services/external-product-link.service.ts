import { createHash } from 'node:crypto';
import { linkExternalProductSchema, revokeExternalProductLinkSchema } from '@rebequi/shared/schemas';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';

type LinkInput = z.infer<typeof linkExternalProductSchema>;
type RevokeInput = z.infer<typeof revokeExternalProductLinkSchema>;
type Actor = { userId: string; role: string };
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

async function requireActiveManager(tx: Prisma.TransactionClient, actor: Actor) {
  const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
  if (!user?.isActive || user.role !== actor.role || !['ADMIN', 'MANAGER'].includes(user.role)) throw new ForbiddenError('Seu acesso às integrações mudou.');
}

export async function createExternalProductLink(actor: Actor, raw: LinkInput) {
  const input = linkExternalProductSchema.parse(raw);
  const requestKey = hash(`external-product-link:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify({ source: input.source, externalId: input.externalId, productId: input.productId, expectedSku: input.expectedSku }));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-product-link:${input.source}:${input.externalId}`}))`;
    await tx.$queryRaw`SELECT id FROM products WHERE id=${input.productId} FOR UPDATE`;
    await requireActiveManager(tx, actor);
    const repeated = await tx.externalProductLink.findUnique({ where: { requestKey } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro vínculo.');
      if (repeated.revokedAt) throw new ConflictError('Este vínculo foi revogado. Faça uma nova conferência.');
      return { id: repeated.id, source: repeated.source, externalId: repeated.externalId, productId: repeated.productId, createdAt: repeated.createdAt };
    }
    const product = await tx.product.findFirst({ where: { id: input.productId, deletedAt: null }, select: { id: true, sku: true } });
    if (!product) throw new NotFoundError('Produto local não encontrado.');
    if (product.sku !== input.expectedSku) throw new ConflictError('O SKU local mudou. Confira o produto novamente.');
    const active = await tx.externalProductLink.findFirst({ where: { source: input.source, revokedAt: null,
      OR: [{ externalId: input.externalId }, { productId: input.productId }] } });
    if (active) throw new ConflictError('O ID externo ou o produto já possui vínculo ativo nesta origem.');
    const row = await tx.externalProductLink.create({ data: { source: input.source, externalId: input.externalId, productId: input.productId,
      requestKey, fingerprint, actorId: actor.userId } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'EXTERNAL_PRODUCT_LINK_CREATED' } });
    return { id: row.id, source: row.source, externalId: row.externalId, productId: row.productId, createdAt: row.createdAt };
  });
}

export async function revokeExternalProductLink(actor: Actor, id: string, raw: RevokeInput) {
  const input = revokeExternalProductLinkSchema.parse(raw);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM external_product_links WHERE id=${id} FOR UPDATE`;
    await requireActiveManager(tx, actor);
    const current = await tx.externalProductLink.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('Vínculo externo não encontrado.');
    if (current.revokedAt) return { id: current.id, revokedAt: current.revokedAt };
    const row = await tx.externalProductLink.update({ where: { id }, data: { revokedAt: new Date(), revokedById: actor.userId, revokedReason: input.reason } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'EXTERNAL_PRODUCT_LINK_REVOKED' } });
    return { id: row.id, revokedAt: row.revokedAt };
  });
}
