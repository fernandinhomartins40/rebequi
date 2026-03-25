/**
 * Category Validation Schemas (Zod)
 * Shared validation schemas for categories used in both frontend and backend
 */

import { z } from 'zod';

// Create Category Schema
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
  slug: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().url('URL da imagem invalida').optional().or(z.literal('')),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// Update Category Schema
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().url('URL da imagem invalida').optional().or(z.literal('')),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// Export types inferred from schemas
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
