/**
 * Category Repository
 * Data access layer for Category model
 */

import { Category, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class CategoryRepository {
  /**
   * Find category by ID
   */
  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { slug, deletedAt: null },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Find all categories
   */
  async findAll(includeInactive: boolean = false): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create category
   */
  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({
      data,
    });
  }

  /**
   * Update category
   */
  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete category
   */
  async softDelete(id: string): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Hard delete category
   */
  async hardDelete(id: string): Promise<Category> {
    return prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Count categories
   */
  async count(where?: Prisma.CategoryWhereInput): Promise<number> {
    return prisma.category.count({
      where: { ...where, deletedAt: null },
    });
  }
}
