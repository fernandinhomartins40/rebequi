import { z } from 'zod';

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

/**
 * Schema for creating a user (admin)
 */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2).max(100),
  password: z.string().min(6).max(100),
  role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
});

/**
 * Schema for updating a user
 */
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(6).max(100).optional(),
  role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
  isActive: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
