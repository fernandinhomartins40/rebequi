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
}
