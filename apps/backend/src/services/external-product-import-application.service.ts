import { createHash, randomUUID } from 'node:crypto';
import { applyProductImportDraftSchema, previewProductImportSchema } from '@rebequi/shared/schemas';
import type { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { compareProductImportBatch } from './external-product-import-review.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';

type Actor = { userId: string; role: string };
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
type AppliedProduct = { row: number; productId: string; sku: string };

export async function applyProductImportDrafts(actor: Actor, batchId: string, raw: z.infer<typeof applyProductImportDraftSchema>) {
  const input = applyProductImportDraftSchema.parse(raw);
  const requestKey = hash(`product-import-application:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify({ batchId, reviewId: input.reviewId, expectedReadyRows: input.expectedReadyRows }));
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`product-import-batch:${batchId}`}))`;
      const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
      if (!user?.isActive || user.role !== actor.role || !['ADMIN', 'MANAGER'].includes(user.role)) {
        throw new ForbiddenError('Seu acesso às integrações mudou.');
      }
      const repeated = await tx.externalProductImportApplication.findUnique({ where: { requestKey } });
      if (repeated) {
        if (repeated.batchId !== batchId || repeated.fingerprint !== fingerprint) {
          throw new ConflictError('Esta chave de envio já foi usada em outra aplicação.');
        }
        return { id: repeated.id, batchId, products: repeated.products as AppliedProduct[],
          skippedRows: repeated.skippedRows, createdAt: repeated.createdAt, applied: true };
      }
      const prior = await tx.externalProductImportApplication.findUnique({ where: { batchId } });
      if (prior) throw new ConflictError('Este lote já foi aplicado. Confira o registro antes de criar outro.');
      const batch = await tx.externalProductImportBatch.findUnique({ where: { id: batchId },
        select: { id: true, source: true, rows: true, preview: true } });
      if (!batch) throw new NotFoundError('Análise de importação não encontrada.');
      const review = await tx.externalProductImportReview.findUnique({ where: { id: input.reviewId },
        select: { id: true, batchId: true, fingerprint: true } });
      if (!review || review.batchId !== batchId) throw new ConflictError('A revisão informada não pertence a este lote.');
      const latest = await tx.externalProductImportReview.findFirst({ where: { batchId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
      if (latest?.id !== review.id) throw new ConflictError('Há uma revisão mais recente. Confira o lote novamente.');
      const comparison = await compareProductImportBatch(batch, tx);
      const current = comparison.currentPreview;
      const currentFingerprint = hash(JSON.stringify({ batchId, summary: current.summary,
        changedRows: comparison.changedRows, rows: current.rows }));
      if (currentFingerprint !== review.fingerprint) throw new ConflictError('O catálogo ou os vínculos mudaram. Registre uma nova revisão.');
      const ready = current.rows.filter(row => row.status === 'READY_FOR_REVIEW');
      if (ready.length !== input.expectedReadyRows) throw new ConflictError('A quantidade de produtos prontos mudou. Confira a revisão.');
      const original = previewProductImportSchema.parse({ source: batch.source, rows: batch.rows });
      const products: AppliedProduct[] = [];
      for (const item of ready) {
        const row = original.rows[item.row - 1];
        if (!row || !item.resolvedCategoryId) throw new ConflictError('Categoria local não resolvida. Confira a revisão.');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`product-import-sku:${row.sku}`}))`;
        if (await tx.product.findFirst({ where: { sku: row.sku }, select: { id: true } })) {
          throw new ConflictError('Um SKU foi cadastrado após a revisão. Confira o lote novamente.');
        }
        const slug = `import-${hash(`${batch.source}:${row.externalId}`).slice(0,32)}`;
        if (await tx.product.findUnique({ where: { slug }, select: { id: true } })) {
          throw new ConflictError('O identificador do produto já existe. Confira o lote novamente.');
        }
        const product = await tx.product.create({ data: { name: row.name, slug, sku: row.sku,
          categoryId: item.resolvedCategoryId, price: 0, stock: 0, reservedStock: 0, isActive: false },
          select: { id: true } });
        const linkKey = hash(`product-import-application-link:${requestKey}:${item.row}`);
        await tx.externalProductLink.create({ data: { source: batch.source, externalId: row.externalId,
          productId: product.id, requestKey: linkKey,
          fingerprint: hash(JSON.stringify({ source: batch.source, externalId: row.externalId, productId: product.id, expectedSku: row.sku })),
          actorId: actor.userId } });
        products.push({ row: item.row, productId: product.id, sku: row.sku });
      }
      const skippedRows = current.rows.filter(row => row.status !== 'READY_FOR_REVIEW').map(row => row.row);
      const result = await tx.externalProductImportApplication.create({ data: { id: randomUUID(), batchId,
        reviewId: review.id, requestKey, fingerprint, actorId: actor.userId, products, skippedRows } });
      await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: result.id, action: 'EXTERNAL_PRODUCT_DRAFTS_CREATED' } });
      return { id: result.id, batchId, products, skippedRows, createdAt: result.createdAt, applied: true };
    }, { isolationLevel: 'Serializable' satisfies Prisma.TransactionIsolationLevel });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      throw new ConflictError('O catálogo mudou durante a aplicação. Confira e tente novamente.');
    }
    throw error;
  }
}
