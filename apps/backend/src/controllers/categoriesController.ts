import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

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
