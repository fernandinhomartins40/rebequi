import { prisma } from '../lib/prisma.js';
import { ConflictError } from '../utils/errors.util.js';

export async function getIntegrationOperations() {
  const [counts, failed, oldest] = await Promise.all([
    prisma.integrationJob.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.integrationJob.findMany({ where: { status: 'FAILED' }, orderBy: { updatedAt: 'desc' }, take: 20,
      select: { id: true, kind: true, productId: true, attempts: true, updatedAt: true } }),
    prisma.integrationJob.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
  ]);
  const products = await prisma.product.findMany({ where: { id: { in: failed.flatMap(job => job.productId ? [job.productId] : []) } }, select: { id: true, name: true } });
  return {
    counts: Object.fromEntries(counts.map(row => [row.status, row._count._all])), oldestPendingAt: oldest?.createdAt ?? null,
    failed: failed.map(job => ({ ...job, productName: products.find(product => product.id === job.productId)?.name ?? 'Produto removido', message: 'Falha no processamento. Revise e tente novamente.' })),
  };
}

export async function retryIntegrationJob(id: string, actorId: string) {
  await prisma.$transaction(async tx => {
    // A bounded retry is a state transition, not the execution of a remote write.
    const changed = await tx.integrationJob.updateMany({ where: { id, status: 'FAILED', kind: 'CATALOG_CHANGED' },
      data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), leaseToken: null, leaseUntil: null, lastError: null } });
    if (!changed.count) throw new ConflictError('Esta tarefa não pode ser reprocessada. Atualize a lista.');
    await tx.integrationAudit.create({ data: { actorId, jobId: id, action: 'RETRY_REQUESTED' } });
  });
  return { queued: true };
}
