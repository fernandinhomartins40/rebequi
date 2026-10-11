/**
 * Category Validation Schemas (Zod)
 * Shared validation schemas for categories used in both frontend and backend
 */

import { z } from 'zod';
const categoryImage = z.union([z.string().url('Imagem inválida'), z.string().regex(/^\/uploads\/categories\/[a-zA-Z0-9/_-]+\.webp$/, 'Imagem inválida'), z.literal('')]);

// Create Category Schema
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome e obrigatório').max(100, 'Nome muito longo'),
  slug: z.string().optional(),
  icon: z.string().optional(),
  image: categoryImage.optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// Update Category Schema
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().optional(),
  icon: z.string().optional(),
  image: categoryImage.optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// Export types inferred from schemas
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
