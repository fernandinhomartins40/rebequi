import { z } from 'zod';

/**
 * Schema for creating a category
 */
export const createCategorySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  slug: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  description: z.string().max(500).optional(),
});

/**
 * Schema for updating a category
 */
export const updateCategorySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  slug: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
