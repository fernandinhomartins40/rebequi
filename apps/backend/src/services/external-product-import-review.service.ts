import { createHash } from 'node:crypto';
import { previewProductImportSchema, recordProductImportReviewSchema } from '@rebequi/shared/schemas';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { previewProductImport } from './product-import-preview.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';

type Actor = { userId: string; role: string };
type Batch = { source: string; rows: Prisma.JsonValue; preview: Prisma.JsonValue };
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

export async function compareProductImportBatch(batch: Batch, tx?: Prisma.TransactionClient) {
  const current = await previewProductImport({ source: batch.source,
    rows: batch.rows as z.infer<typeof previewProductImportSchema>['rows'] }, tx);
  const saved = batch.preview as { rows: { status: string; conflicts: string[]; localProductId: string | null; resolvedCategoryId?: string | null }[] };
  const changedRows = current.rows.filter((row, index) => {
    const before = saved.rows[index];
    return !before || before.status !== row.status || before.localProductId !== row.localProductId
      || (before.resolvedCategoryId ?? null) !== row.resolvedCategoryId
      || JSON.stringify(before.conflicts) !== JSON.stringify(row.conflicts);
  }).map(row => row.row);
  return { currentPreview: current, changedRows };
}

export async function recordProductImportReview(actor: Actor, batchId: string, raw: z.infer<typeof recordProductImportReviewSchema>) {
  const input = recordProductImportReviewSchema.parse(raw);
  const requestKey = hash(`product-import-review:${actor.userId}:${input.requestKey}`);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestKey}))`;
    const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
    if (!user?.isActive || user.role !== actor.role || !['ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenError('Seu acesso às integrações mudou.');
    }
    const repeated = await tx.externalProductImportReview.findUnique({ where: { requestKey } });
    if (repeated) {
      if (repeated.batchId !== batchId) throw new ConflictError('Esta chave de envio já foi usada em outra análise.');
      return { id: repeated.id, batchId: repeated.batchId, summary: repeated.summary,
        changedRows: repeated.changedRows, createdAt: repeated.createdAt, applied: false };
    }
    const batch = await tx.externalProductImportBatch.findUnique({ where: { id: batchId },
      select: { source: true, rows: true, preview: true } });
    if (!batch) throw new NotFoundError('Análise de importação não encontrada.');
    const comparison = await compareProductImportBatch(batch, tx);
    const summary = comparison.currentPreview.summary;
    const fingerprint = hash(JSON.stringify({ batchId, summary, changedRows: comparison.changedRows,
      rows: comparison.currentPreview.rows }));
    const review = await tx.externalProductImportReview.create({ data: { batchId, requestKey,
      actorId: actor.userId, fingerprint, summary, changedRows: comparison.changedRows } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: review.id, action: 'EXTERNAL_PRODUCT_IMPORT_REVIEW_RECORDED' } });
    return { id: review.id, batchId, summary, changedRows: review.changedRows, createdAt: review.createdAt, applied: false };
  }, { isolationLevel: 'RepeatableRead' satisfies Prisma.TransactionIsolationLevel });
}
