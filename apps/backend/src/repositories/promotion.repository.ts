import { Prisma, Promotion } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const productSelect = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      image: true,
    },
  },
  images: {
    orderBy: { order: 'asc' },
  },
} satisfies Prisma.ProductInclude;

const adminPromotionInclude = {
  products: {
    orderBy: { order: 'asc' },
    include: {
      product: {
        include: productSelect,
      },
    },
  },
} satisfies Prisma.PromotionInclude;

const publicPromotionInclude = {
  products: {
    where: {
      product: {
        deletedAt: null,
        isActive: true,
        stock: { gt: 0 },
      },
    },
    orderBy: { order: 'asc' },
    include: {
      product: {
        include: productSelect,
      },
    },
  },
} satisfies Prisma.PromotionInclude;

export class PromotionRepository {
  async findById(id: string) {
    return prisma.promotion.findFirst({
      where: { id, deletedAt: null },
      include: adminPromotionInclude,
    });
  }

  async findBySlug(slug: string) {
    return prisma.promotion.findFirst({
      where: { slug, deletedAt: null },
      include: adminPromotionInclude,
    });
  }

  async findPublicBySlug(slug: string, where?: Prisma.PromotionWhereInput) {
    return prisma.promotion.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(where ?? {}),
      },
      include: publicPromotionInclude,
    });
  }

  async findPublicMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PromotionWhereInput;
    orderBy?: Prisma.PromotionOrderByWithRelationInput[];
  }) {
    return prisma.promotion.findMany({
      ...params,
      where: {
        ...params.where,
        deletedAt: null,
      },
      include: publicPromotionInclude,
    });
  }

  async findAdminMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PromotionWhereInput;
    orderBy?: Prisma.PromotionOrderByWithRelationInput[];
  }) {
    return prisma.promotion.findMany({
      ...params,
      where: {
        ...params.where,
        deletedAt: null,
      },
      include: adminPromotionInclude,
    });
  }

  async create(data: Prisma.PromotionCreateInput): Promise<Promotion> {
    return prisma.promotion.create({
      data,
      include: adminPromotionInclude,
    });
  }

  async update(id: string, data: Prisma.PromotionUpdateInput) {
    return prisma.promotion.update({
      where: { id },
      data,
      include: adminPromotionInclude,
    });
  }

  async softDelete(id: string): Promise<Promotion> {
    return prisma.promotion.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(where?: Prisma.PromotionWhereInput): Promise<number> {
    return prisma.promotion.count({
      where: {
        ...(where ?? {}),
        deletedAt: null,
      },
    });
  }
}
