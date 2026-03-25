/**
 * Product Repository
 * Data access layer for Product model
 */

import { Product, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class ProductRepository {
  /**
   * Find product by ID
   */
  async findById(id: string) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug: string) {
    return prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Find products with filters and pagination
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }) {
    return prisma.product.findMany({
      ...params,
      where: {
        ...params.where,
        deletedAt: null,
      },
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
    });
  }

  /**
   * Find promotional products (offers)
   */
  async findPromotional(limit: number = 12) {
    return prisma.product.findMany({
      where: {
        isOffer: true,
        isActive: true,
        deletedAt: null,
        stock: { gt: 0 },
      },
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { discount: 'desc' },
    });
  }

  /**
   * Find new products
   */
  async findNew(limit: number = 12) {
    return prisma.product.findMany({
      where: {
        isNew: true,
        isActive: true,
        deletedAt: null,
        stock: { gt: 0 },
      },
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find featured products
   */
  async findFeatured(limit: number = 12) {
    return prisma.product.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        deletedAt: null,
        stock: { gt: 0 },
      },
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find products by category
   */
  async findByCategory(categorySlug: string, params: { skip?: number; take?: number }) {
    return prisma.product.findMany({
      ...params,
      where: {
        category: { slug: categorySlug },
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create product
   */
  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({
      data,
      include: {
        category: true,
        images: true,
      },
    });
  }

  /**
   * Update product
   */
  async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        images: true,
      },
    });
  }

  /**
   * Soft delete product
   */
  async softDelete(id: string): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Hard delete product
   */
  async hardDelete(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Count products
   */
  async count(where?: Prisma.ProductWhereInput): Promise<number> {
    return prisma.product.count({
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Search products by name or description
   */
  async search(query: string, params: { skip?: number; take?: number }) {
    return prisma.product.findMany({
      ...params,
      where: {
        AND: [
          { deletedAt: null },
          { isActive: true },
          {
            OR: [
              { name: { contains: query } },
              { description: { contains: query } },
            ],
          },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
