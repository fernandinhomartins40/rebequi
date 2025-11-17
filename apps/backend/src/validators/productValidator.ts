import { z } from 'zod';

/**
 * Schema for creating a product
 */
export const createProductSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  slug: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  originalPrice: z.number().positive().optional(),
  description: z.string().optional(),
  shortDesc: z.string().max(200).optional(),
  categoryId: z.string().cuid('Invalid category ID'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  minStock: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  isOffer: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  discount: z.number().int().min(0).max(100).optional(),
});

/**
 * Schema for updating a product (all fields optional)
 */
export const updateProductSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  slug: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  description: z.string().optional(),
  shortDesc: z.string().max(200).optional(),
  categoryId: z.string().cuid().optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  isOffer: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  discount: z.number().int().min(0).max(100).optional(),
});

/**
 * Schema for product query filters
 */
export const productFiltersSchema = z.object({
  category: z.string().optional(),
  minPrice: z.string().transform(Number).pipe(z.number().positive()).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().positive()).optional(),
  search: z.string().optional(),
  isOffer: z.string().transform(val => val === 'true').optional(),
  isNew: z.string().transform(val => val === 'true').optional(),
  isFeatured: z.string().transform(val => val === 'true').optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
