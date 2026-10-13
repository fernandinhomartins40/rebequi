import { createHash } from 'node:crypto';
import { previewCustomerImportSchema, stageCustomerImportSchema, type StageCustomerImportInput } from '@rebequi/shared/schemas';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { previewCustomerImport } from './customer-import-preview.service.js';
import { ConflictError, ForbiddenError } from '../utils/errors.util.js';

type Actor = { userId: string; role: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function stageExternalCustomerImport(actor: Actor, raw: StageCustomerImportInput) {
  const input = stageCustomerImportSchema.parse(raw);
  const batch = { source: input.source, rows: input.rows };
  const key = hash(`external-customer-import:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify(batch));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
    if (!user?.isActive || user.role !== actor.role || !['ADMIN', 'MANAGER'].includes(user.role))
      throw new ForbiddenError('Seu acesso às integrações mudou.');
    const repeated = await tx.externalCustomerImportBatch.findUnique({ where: { requestKey: key } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro lote.');
      return { id: repeated.id, source: repeated.source, createdAt: repeated.createdAt, applied: false };
    }
    const preview = await previewCustomerImport(batch, tx);
    const row = await tx.externalCustomerImportBatch.create({ data: { source: batch.source,
      requestKey: key, fingerprint, actorId: actor.userId, rows: batch.rows, preview } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'EXTERNAL_CUSTOMER_IMPORT_STAGED' } });
    return { id: row.id, source: row.source, createdAt: row.createdAt, applied: false };
  }, { isolationLevel: 'RepeatableRead' satisfies Prisma.TransactionIsolationLevel });
}

export async function compareCustomerImportBatch(batch: { source: string; rows: Prisma.JsonValue; preview: Prisma.JsonValue }) {
  const input = previewCustomerImportSchema.parse({ source: batch.source, rows: batch.rows });
  const saved = batch.preview as { rows: { row: number; status: string; localCustomerId: string | null; conflicts: string[] }[] };
  const current = await previewCustomerImport(input);
  const changedRows = current.rows.filter((row, index) => {
    const old = saved.rows[index];
    return !old || old.status !== row.status || old.localCustomerId !== row.localCustomerId
      || JSON.stringify(old.conflicts) !== JSON.stringify(row.conflicts);
  }).map(row => row.row);
  return { currentPreview: current, changedRows };
}
