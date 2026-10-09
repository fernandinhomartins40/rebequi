import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError } from '../utils/errors.util.js';

const leadInclude = {
  user: true,
  _count: {
    select: {
      quotes: true,
    },
  },
} satisfies Prisma.LeadCaptureInclude;

const quoteInclude = {
  user: true,
  lead: {
    include: leadInclude,
  },
  items: {
    orderBy: { position: 'asc' as const },
    include: {
      product: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.QuoteRequestInclude;

export class QuoteRepository {
  async createLead(data: Prisma.LeadCaptureCreateInput) {
    return prisma.leadCapture.create({
      data,
      include: leadInclude,
    });
  }

  async updateLead(id: string, data: Prisma.LeadCaptureUpdateInput) {
    return prisma.leadCapture.update({
      where: { id },
      data,
      include: leadInclude,
    });
  }

  async findLeadById(id: string) {
    return prisma.leadCapture.findUnique({
      where: { id },
      include: leadInclude,
    });
  }

  async findManyLeads(params: {
    skip?: number;
    take?: number;
    where?: Prisma.LeadCaptureWhereInput;
    orderBy?: Prisma.LeadCaptureOrderByWithRelationInput;
  }) {
    return prisma.leadCapture.findMany({
      ...params,
      include: leadInclude,
    });
  }

  async countLeads(where?: Prisma.LeadCaptureWhereInput) {
    return prisma.leadCapture.count({ where });
  }

  async createQuote(data: Prisma.QuoteRequestCreateInput) {
    return prisma.quoteRequest.create({
      data,
      include: quoteInclude,
    });
  }

  async updateQuote(id: string, data: Prisma.QuoteRequestUpdateInput) {
    return prisma.quoteRequest.update({
      where: { id },
      data,
      include: quoteInclude,
    });
  }

  async replaceQuoteItems(id: string, items: Prisma.QuoteItemCreateManyInput[], options?: {
    anonymousToken: string;
    update?: Prisma.QuoteRequestUpdateInput;
  }) {
    return prisma.$transaction(async (tx) => {
        // Lock the parent so concurrent edits cannot interleave replacements.
        try {
          await tx.quoteRequest.update({
            where: { id, ...(options ? { anonymousToken: options.anonymousToken, status: 'DRAFT', anonymousExpiresAt: { gt: new Date() } } : {}) },
            data: { updatedAt: new Date(), ...options?.update },
          });
        } catch (error) {
          if (options && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new ConflictError('Este rascunho expirou ou já foi enviado');
          }
          throw error;
        }
      await tx.quoteItem.deleteMany({ where: { quoteRequestId: id } });
      if (items.length > 0) await tx.quoteItem.createMany({ data: items });
      return tx.quoteRequest.findUnique({
        where: { id },
        include: quoteInclude,
      });
    });
  }

  async findQuoteById(id: string) {
    return prisma.quoteRequest.findUnique({
      where: { id },
      include: quoteInclude,
    });
  }

  async startOcr(id: string) {
    return prisma.quoteRequest.updateMany({
      where: { id, ocrStatus: 'PENDING' },
      data: { ocrStatus: 'PROCESSING', ocrError: null, ocrAttempts: { increment: 1 } },
    });
  }

  async finishOcr(id: string, data: Prisma.QuoteRequestUpdateManyMutationInput,
    items: Prisma.QuoteItemCreateManyInput[], title: string, customerNote: string | null) {
    return prisma.$transaction(async (tx) => {
      // Serialize against manual edits/claiming; a manual fallback cancels OCR.
      const locked = await tx.quoteRequest.updateMany({ where: { id, ocrStatus: 'PROCESSING' }, data });
      if (!locked.count) return;
      const count = await tx.quoteItem.count({ where: { quoteRequestId: id } });
      if (!count) {
        if (items.length) await tx.quoteItem.createMany({ data: items });
        await tx.quoteRequest.update({ where: { id }, data: { title, customerNote } });
      }
    });
  }

  async failOcr(id: string, message: string) {
    return prisma.quoteRequest.updateMany({
      where: { id, ocrStatus: 'PROCESSING' }, data: { ocrStatus: 'FAILED', ocrError: message },
    });
  }

  async findManyQuotes(params: {
    skip?: number;
    take?: number;
    where?: Prisma.QuoteRequestWhereInput;
    orderBy?: Prisma.QuoteRequestOrderByWithRelationInput;
  }) {
    return prisma.quoteRequest.findMany({
      ...params,
      include: quoteInclude,
    });
  }

  async countQuotes(where?: Prisma.QuoteRequestWhereInput) {
    return prisma.quoteRequest.count({ where });
  }

  async findQuoteByAnonymousToken(token: string) {
    return prisma.quoteRequest.findUnique({
      where: { anonymousToken: token },
      include: quoteInclude,
    });
  }

  /**
   * Marks quotes whose background OCR job died with the process.
   *
   * The job lives in memory (setTimeout), so a restart mid-processing left
   * them stuck in PROCESSING forever, with the frontend polling indefinitely.
   */
  async failStaleOcrJobs(olderThan: Date) {
    return prisma.quoteRequest.updateMany({
      where: {
        ocrStatus: { in: ['PENDING', 'PROCESSING'] },
        updatedAt: { lt: olderThan },
      },
      data: {
        ocrStatus: 'FAILED',
        ocrError: 'O processamento foi interrompido. Tente enviar a foto novamente.',
      },
    });
  }

  /** Deletes abandoned anonymous drafts that were never submitted. */
  async deleteExpiredAnonymousDrafts(now: Date) {
    return prisma.quoteRequest.deleteMany({
      where: {
        userId: null,
        status: 'DRAFT',
        anonymousExpiresAt: { lt: now },
      },
    });
  }

  async createOcrRun(data: Prisma.OcrRunUncheckedCreateInput) {
    return prisma.ocrRun.create({ data });
  }

  async updateLatestOcrRun(quoteRequestId: string, data: Prisma.OcrRunUncheckedUpdateInput) {
    const latest = await prisma.ocrRun.findFirst({
      where: { quoteRequestId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!latest) return null;

    return prisma.ocrRun.update({ where: { id: latest.id }, data });
  }

  /** Aggregated OCR telemetry for the merchant dashboard. */
  async getOcrStats(since: Date) {
    const [byEngine, totals] = await Promise.all([
      prisma.ocrRun.groupBy({
        by: ['engine', 'modelId', 'success'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _avg: { durationMs: true },
        _sum: { costUsd: true, itemsDetected: true, itemsMatched: true, itemsEditedByCustomer: true },
      }),
      prisma.ocrRun.aggregate({
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { costUsd: true, itemsDetected: true, itemsEditedByCustomer: true },
        _avg: { durationMs: true },
      }),
    ]);

    return { byEngine, totals };
  }

  /**
   * Records that a customer resolved a recognised line into a specific product.
   * Promotes the pairing to an approved alias once it repeats enough times to
   * not be a one-off mistake.
   */
  async recordProductAlias(normalizedText: string, productId: string, approveAtOccurrences: number) {
    const alias = await prisma.productAlias.upsert({
      where: { normalizedText_productId: { normalizedText, productId } },
      create: { normalizedText, productId },
      update: { occurrences: { increment: 1 } },
    });

    if (!alias.isApproved && alias.occurrences >= approveAtOccurrences) {
      return prisma.productAlias.update({
        where: { id: alias.id },
        data: { isApproved: true },
      });
    }

    return alias;
  }

  async findApprovedAliases() {
    return prisma.productAlias.findMany({
      where: { isApproved: true },
      select: { normalizedText: true, productId: true },
    });
  }
}
