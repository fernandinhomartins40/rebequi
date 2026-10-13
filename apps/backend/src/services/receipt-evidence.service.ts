import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { deleteStoredImages, storeReceiptEvidenceImage } from './product-image-storage.service.js';
type Actor = { userId: string; role: string };
export async function requireReceiptEvidenceAccess(tx: Prisma.TransactionClient, receiptId: string, actor: Actor, write = false) {
  const receipt = await tx.fulfillmentEvent.findFirst({ where: { id: receiptId, kind: { in: ['PICKUP_RECEIVED', 'DELIVERY_RECEIVED'] } }, select: { id: true, details: true, fulfillment: { select: { sale: { select: { customerId: true, order: { select: { userId: true } } } } } } } });
  if (!receipt) throw new NotFoundError('Recebimento não encontrado.');
  if (hasMerchantPermission(actor.role, 'logistics:manage')) return receipt;
  if (!write && actor.role === 'CUSTOMER' && (receipt.fulfillment.sale.order?.userId ?? receipt.fulfillment.sale.customerId) === actor.userId) return receipt;
  const runId = receipt.details && typeof receipt.details === 'object' && !Array.isArray(receipt.details) ? (receipt.details as { runId?: unknown }).runId : undefined;
  if (actor.role === 'DRIVER' && typeof runId === 'string' && await tx.deliveryRun.count({ where: { id: runId, driverId: actor.userId } })) return receipt;
  throw new NotFoundError('Recebimento não encontrado.');
}
export async function addReceiptEvidence(receiptId: string, actor: Actor, file: Express.Multer.File, requestKey: string) {
  if (!file?.buffer?.length || file.buffer.length > 2 * 1024 * 1024) throw new ValidationError('Envie uma imagem de até 2 MB.');
  const key = createHash('sha256').update(`receipt-evidence:${actor.userId}:${requestKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(receiptId).update(file.buffer).digest('hex');
  let stored: Awaited<ReturnType<typeof storeReceiptEvidenceImage>> | undefined;
  try {
    return await prisma.$transaction(async tx => {
      // Serialize quota checks with every evidence insert, including its database guard.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rebequi-receipt-evidence-quota'))`;
      const operator = await tx.user.findFirst({ where: { id: actor.userId, isActive: true }, select: { role: true } });
      if (!operator || operator.role !== actor.role || actor.role === 'CUSTOMER') throw new ForbiddenError('Seu perfil não pode anexar esta evidência.');
      await requireReceiptEvidenceAccess(tx, receiptId, actor, true);
      const repeated = await tx.fulfillmentEvidence.findUnique({ where: { requestKey: key }, select: { id: true, storageKey: true, fingerprint: true } });
      if (repeated) {
        if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra imagem.');
        return { id: repeated.id, url: `/uploads/${repeated.storageKey}` };
      }
      if (await tx.fulfillmentEvidence.count({ where: { receiptId } }) >= 3) throw new ConflictError('Este recebimento já tem três imagens.');
      const total = (await tx.fulfillmentEvidence.aggregate({ _sum: { size: true } }))._sum.size ?? 0;
      if (total + 250 * 1024 > 256 * 1024 * 1024) throw new ConflictError('Limite de evidências atingido. A equipe precisa revisar o armazenamento.');
      stored = await storeReceiptEvidenceImage(file);
      const evidence = await tx.fulfillmentEvidence.create({ data: { receiptId, requestKey: key, fingerprint, actorId: actor.userId, storageKey: stored.storageKey, size: stored.size, width: stored.width!, height: stored.height!, consentVersion: 'receipt-evidence-2026-10' } });
      await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: evidence.id, action: 'RECEIPT_EVIDENCE_ADDED' } });
      return { id: evidence.id, url: `/uploads/${stored.storageKey}` };
    }, { timeout: 15000 });
  } catch (error) {
    if (stored) {
      // A lost commit acknowledgement must not delete an already recorded image.
      try { if (!await prisma.fulfillmentEvidence.count({ where: { storageKey: stored.storageKey } })) await deleteStoredImages([stored]); } catch { /* Preserve the file when database/cleanup outcome is uncertain. */ }
    }
    throw error;
  }
}
export async function listReceiptEvidence(receiptId: string, actor: Actor) {
  return prisma.$transaction(async tx => {
    await requireReceiptEvidenceAccess(tx, receiptId, actor);
    const images = await tx.fulfillmentEvidence.findMany({ where: { receiptId }, take: 3, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, storageKey: true, createdAt: true, width: true, height: true } });
    return images.map(({ storageKey, ...image }) => ({ ...image, url: `/uploads/${storageKey}` }));
  });
}
