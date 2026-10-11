import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.util.js';
import { expireStockReservations } from './stock-reservation.service.js';

export async function enqueueCatalogChange(tx: Prisma.TransactionClient, productId: string) {
  await tx.channelListing.updateMany({ where: { productId, syncStatus: 'SYNCED' }, data: { syncStatus: 'OUT_OF_SYNC' } });
  await tx.integrationJob.create({ data: { dedupeKey: randomUUID(), kind: 'CATALOG_CHANGED', productId } });
}

type ClaimedJob = { id: string; kind: string; productId: string | null; attempts: number };
let running = false;

/** Persistent, bounded local reconciliation; external writes require a ready connector. */
export async function runIntegrationJobs() {
  if (running) return;
  running = true;
  try {
    await expireStockReservations();
    await prisma.setting.deleteMany({ where: { key: { startsWith: 'channel.oauth.' }, createdAt: { lt: new Date(Date.now() - 20 * 60_000) } } });
    for (let index = 0; index < 20; index++) {
      const token = randomUUID();
      const jobs = await prisma.$queryRaw<ClaimedJob[]>`
        UPDATE integration_jobs SET status = 'RUNNING', "leaseToken" = ${token},
          "leaseUntil" = NOW() + INTERVAL '60 seconds', attempts = attempts + 1, "updatedAt" = NOW()
        WHERE id = (SELECT id FROM integration_jobs WHERE
          (status = 'PENDING' AND "nextAttemptAt" <= NOW()) OR
          (status = 'RUNNING' AND "leaseUntil" < NOW())
          ORDER BY "createdAt", id FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING id, kind, "productId", attempts`;
      const job = jobs[0];
      if (!job) break;
      try {
        if (job.kind !== 'CATALOG_CHANGED' || !job.productId) throw new Error('Tipo de tarefa não suportado');
        // Idempotent local invalidation. Do not equate it with remote synchronization.
        await prisma.channelListing.updateMany({ where: { productId: job.productId, syncStatus: 'SYNCED' }, data: { syncStatus: 'OUT_OF_SYNC' } });
        await prisma.integrationJob.updateMany({ where: { id: job.id, leaseToken: token, status: 'RUNNING' }, data: { status: 'COMPLETED', leaseToken: null, leaseUntil: null, lastError: null } });
      } catch {
        await prisma.integrationJob.updateMany({ where: { id: job.id, leaseToken: token, status: 'RUNNING' }, data: {
          status: job.attempts >= 5 ? 'FAILED' : 'PENDING', leaseToken: null, leaseUntil: null,
          nextAttemptAt: new Date(Date.now() + Math.min(600_000, 1000 * 2 ** job.attempts)),
          lastError: 'Falha no processamento. Revise e tente novamente.',
        } });
      }
    }
    await prisma.integrationJob.deleteMany({ where: { status: 'COMPLETED', updatedAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
  } catch { logger.warn('Integration worker unavailable; persistent jobs retained.'); }
  finally { running = false; }
}
