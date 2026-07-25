import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

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

  async replaceQuoteItems(id: string, items: Prisma.QuoteItemCreateManyInput[]) {
    await prisma.quoteItem.deleteMany({
      where: { quoteRequestId: id },
    });

    if (items.length > 0) {
      await prisma.quoteItem.createMany({
        data: items,
      });
    }

    return prisma.quoteRequest.findUnique({
      where: { id },
      include: quoteInclude,
    });
  }

  async findQuoteById(id: string) {
    return prisma.quoteRequest.findUnique({
      where: { id },
      include: quoteInclude,
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
