import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/categoryValidator.js';

/**
 * Generate slug from category name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to match the expected format
    const formattedCategories = categories.map((category) => ({
      ...category,
      productsCount: category._count.products,
      _count: undefined,
    }));

    res.json({
      categories: formattedCategories,
      total: categories.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    const formattedCategory = {
      ...category,
      productsCount: category._count.products,
      _count: undefined,
    };

    res.json(formattedCategory);
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    const formattedCategory = {
      ...category,
      productsCount: category._count.products,
      _count: undefined,
    };

    res.json(formattedCategory);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 * POST /api/categories
 * Requires: ADMIN role
 */
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createCategorySchema.parse(req.body);

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Check for duplicate slug
    const existingSlug = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new AppError(409, 'Category with this slug already exists');
    }

    // Create category
    const category = await prisma.category.create({
      data,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    const formattedCategory = {
      ...category,
      productsCount: category._count.products,
      _count: undefined,
    };

    res.status(201).json(formattedCategory);
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * PUT /api/categories/:id
 * Requires: ADMIN role
 */
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateCategorySchema.parse(req.body);

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingCategory) {
      throw new AppError(404, 'Category not found');
    }

    // Check for duplicate slug if being updated
    if (data.slug && data.slug !== existingCategory.slug) {
      const duplicateSlug = await prisma.category.findUnique({
        where: { slug: data.slug },
      });

      if (duplicateSlug) {
        throw new AppError(409, 'Category with this slug already exists');
      }
    }

    // Update category
    const category = await prisma.category.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    const formattedCategory = {
      ...category,
      productsCount: category._count.products,
      _count: undefined,
    };

    res.json(formattedCategory);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category (soft delete)
 * DELETE /api/categories/:id
 * Requires: ADMIN role
 */
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    // Check if category has active products
    if (category._count.products > 0) {
      throw new AppError(
        409,
        'Cannot delete category with associated products. Please reassign or delete products first.'
      );
    }

    // Soft delete by setting deletedAt timestamp
    await prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
