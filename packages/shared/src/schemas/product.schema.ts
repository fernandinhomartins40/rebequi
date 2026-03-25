/**
 * Product Validation Schemas (Zod)
 * Shared validation schemas for products used in both frontend and backend
 */

import { z } from 'zod';

const productImageUrlSchema = z
  .string()
  .min(1, 'Caminho da imagem obrigatorio')
  .refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), 'URL ou caminho da imagem invalido');

// Product Image Schema
export const productImageSchema = z.object({
  url: productImageUrlSchema,
  alt: z.string().optional(),
  order: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  storageKey: z.string().optional(),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

// Create Product Schema
export const createProductSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  slug: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive('Preco deve ser positivo'),
  originalPrice: z.number().positive().optional(),
  description: z.string().optional(),
  shortDesc: z.string().max(500).optional(),
  isOffer: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  discount: z.number().int().min(0).max(100).optional(),
  stock: z.number().int().min(0, 'Estoque nao pode ser negativo'),
  minStock: z.number().int().min(0).default(0),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  categoryId: z.string().min(1, 'Categoria e obrigatoria'),
  images: z.array(productImageSchema).optional(),
});

// Update Product Schema
export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  description: z.string().optional(),
  shortDesc: z.string().max(500).optional(),
  isOffer: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  discount: z.number().int().min(0).max(100).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  images: z.array(productImageSchema).optional(),
});

// Product Filters Schema
export const productFiltersSchema = z.object({
  category: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  search: z.string().optional(),
  isOffer: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(12),
});

// Export types inferred from schemas
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
