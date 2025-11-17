import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createProductSchema,
  updateProductSchema,
  productFiltersSchema,
} from '../validators/productValidator.js';

/**
 * Generate slug from product name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Get all products with filters and pagination
 * GET /api/products
 */
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = productFiltersSchema.parse(req.query);

    const {
      category,
      minPrice,
      maxPrice,
      search,
      isOffer,
      isNew,
      isFeatured,
      isActive = true,
      page = 1,
      limit = 12,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive,
      deletedAt: null, // Exclude soft-deleted products
    };

    if (category) {
      where.category = { slug: category };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isOffer !== undefined) where.isOffer = isOffer;
    if (isNew !== undefined) where.isNew = isNew;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    // Get products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single product by ID
 * GET /api/products/:id
 */
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by category slug
 * GET /api/products/category/:categorySlug
 */
export const getProductsByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { categorySlug } = req.params;
    const { page = '1', limit = '12' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          category: { slug: categorySlug },
          isActive: true,
          deletedAt: null,
        },
        skip,
        take: limitNum,
        include: {
          category: true,
          images: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({
        where: {
          category: { slug: categorySlug },
          isActive: true,
          deletedAt: null,
        },
      }),
    ]);

    res.json({
      products,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get promotional products
 * GET /api/products/promotional
 */
export const getPromotionalProducts = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isOffer: true,
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: {
        discount: 'desc',
      },
      take: 20,
    });

    res.json(products);
  } catch (error) {
    next(error);
  }
};

/**
 * Get new products
 * GET /api/products/new
 */
export const getNewProducts = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isNew: true,
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    res.json(products);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product
 * POST /api/products
 * Requires: ADMIN role
 */
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createProductSchema.parse(req.body);

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    // Check for duplicate slug or SKU
    if (data.slug) {
      const existingSlug = await prisma.product.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new AppError(409, 'Product with this slug already exists');
      }
    }

    if (data.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new AppError(409, 'Product with this SKU already exists');
      }
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug!,
        sku: data.sku,
        price: data.price,
        originalPrice: data.originalPrice,
        description: data.description,
        shortDesc: data.shortDesc,
        categoryId: data.categoryId,
        stock: data.stock,
        minStock: data.minStock || 0,
        weight: data.weight,
        dimensions: data.dimensions,
        isOffer: data.isOffer,
        isNew: data.isNew,
        isFeatured: data.isFeatured,
        discount: data.discount,
      },
      include: {
        category: true,
        images: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 * PUT /api/products/:id
 * Requires: ADMIN role
 */
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateProductSchema.parse(req.body);

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingProduct) {
      throw new AppError(404, 'Product not found');
    }

    // Check category if being updated
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new AppError(404, 'Category not found');
      }
    }

    // Check for duplicate slug
    if (data.slug && data.slug !== existingProduct.slug) {
      const duplicateSlug = await prisma.product.findUnique({
        where: { slug: data.slug },
      });
      if (duplicateSlug) {
        throw new AppError(409, 'Product with this slug already exists');
      }
    }

    // Check for duplicate SKU
    if (data.sku && data.sku !== existingProduct.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (duplicateSku) {
        throw new AppError(409, 'Product with this SKU already exists');
      }
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (soft delete)
 * DELETE /api/products/:id
 * Requires: ADMIN role
 */
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    // Soft delete by setting deletedAt timestamp
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Add images to product
 * POST /api/products/:id/images
 * Requires: ADMIN role
 */
export const addProductImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { images } = req.body; // Array of { url, alt, order, isPrimary }

    if (!images || !Array.isArray(images)) {
      throw new AppError(400, 'Images array is required');
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    // If setting a new primary image, unset current primary
    if (images.some((img: any) => img.isPrimary)) {
      await prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false },
      });
    }

    // Create images
    const createdImages = await Promise.all(
      images.map((img: any, index: number) =>
        prisma.productImage.create({
          data: {
            url: img.url,
            alt: img.alt || product.name,
            order: img.order !== undefined ? img.order : index,
            isPrimary: img.isPrimary || false,
            productId: id,
          },
        })
      )
    );

    res.status(201).json(createdImages);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product image
 * DELETE /api/products/:id/images/:imageId
 * Requires: ADMIN role
 */
export const deleteProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, imageId } = req.params;

    // Check if image exists and belongs to product
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.productId !== id) {
      throw new AppError(404, 'Image not found');
    }

    // Delete image
    await prisma.productImage.delete({
      where: { id: imageId },
    });

    // TODO: Delete physical file from storage

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
};
