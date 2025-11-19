/**
 * User Validation Schemas (Zod)
 * Shared validation schemas for users and authentication used in both frontend and backend
 */

import { z } from 'zod';

// User Role Schema
export const userRoleSchema = z.enum(['ADMIN', 'CUSTOMER']);

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

// Register Schema
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
});

// Create User Schema
export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: userRoleSchema.default('CUSTOMER'),
});

// Update User Schema
export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8).max(100).optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

// Export types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserRoleType = z.infer<typeof userRoleSchema>;
