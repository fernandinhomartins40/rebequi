import { createHash } from 'node:crypto';
import { stageProductImportSchema } from '@rebequi/shared/schemas';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { previewProductImport } from './product-import-preview.service.js';
import { ConflictError, ForbiddenError } from '../utils/errors.util.js';

type Actor = { userId: string; role: string };
type Input = z.infer<typeof stageProductImportSchema>;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function stageExternalProductImport(actor: Actor, raw: Input) {
  const input = stageProductImportSchema.parse(raw);
  const batch = { source: input.source, rows: input.rows };
  const key = hash(`external-product-import:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify(batch));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
    if (!user?.isActive || user.role !== actor.role || !['ADMIN', 'MANAGER'].includes(user.role)) throw new ForbiddenError('Seu acesso às integrações mudou.');
    const repeated = await tx.externalProductImportBatch.findUnique({ where: { requestKey: key } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro lote.');
      return { id: repeated.id, source: repeated.source, createdAt: repeated.createdAt, applied: false };
    }
    const preview = await previewProductImport(batch, tx);
    const staged = await tx.externalProductImportBatch.create({ data: {
      source: batch.source, requestKey: key, fingerprint, actorId: actor.userId,
      rows: batch.rows, preview,
    } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: staged.id, action: 'EXTERNAL_PRODUCT_IMPORT_STAGED' } });
    return { id: staged.id, source: staged.source, createdAt: staged.createdAt, applied: false };
  }, { isolationLevel: 'RepeatableRead' satisfies Prisma.TransactionIsolationLevel });
}

export async function stageExternalProductImportFromApi(clientId: string, raw: Input) {
  const input = stageProductImportSchema.parse(raw);
  const batch = { source: input.source, rows: input.rows };
  const key = hash(`external-product-import-api:${clientId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify(batch));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const client = await tx.externalApiClient.findUnique({ where: { id: clientId },
      select: { source: true, scopes: true, revokedAt: true, expiresAt: true } });
    if (!client || client.revokedAt || client.expiresAt <= new Date() || !client.scopes.includes('imports:write')
      || client.source !== batch.source) throw new ForbiddenError('Credencial sem acesso a esta origem.');
    const repeated = await tx.externalProductImportBatch.findUnique({ where: { requestKey: key } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro lote.');
      return { id: repeated.id, source: repeated.source, createdAt: repeated.createdAt, applied: false };
    }
    const preview = await previewProductImport(batch, tx);
    const staged = await tx.externalProductImportBatch.create({ data: { source: batch.source, requestKey: key,
      fingerprint, actorId: `external-api:${clientId}`, rows: batch.rows, preview } });
    await tx.integrationAudit.create({ data: { actorId: `external-api:${clientId}`, jobId: staged.id,
      action: 'EXTERNAL_PRODUCT_IMPORT_STAGED_FROM_API' } });
    return { id: staged.id, source: staged.source, createdAt: staged.createdAt, applied: false };
  }, { isolationLevel: 'RepeatableRead' satisfies Prisma.TransactionIsolationLevel });
}
