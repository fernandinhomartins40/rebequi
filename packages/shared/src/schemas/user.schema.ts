/**
 * User Validation Schemas (Zod)
 * Shared validation schemas for users and authentication used in both frontend and backend
 */

import { z } from 'zod';

// User Role Schema
export const userRoleSchema = z.enum(['ADMIN', 'CUSTOMER']);

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres'),
});

// Register Schema
export const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter no minimo 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiuscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minuscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um numero')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
});

// Create User Schema
export const createUserSchema = z.object({
  email: z.string().email('Email invalido'),
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter no minimo 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiuscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minuscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um numero')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  role: userRoleSchema.default('CUSTOMER'),
});

// Update User Schema
export const updateUserSchema = z.object({
  email: z.string().email('Email invalido').optional(),
  name: z.string().min(1).max(255).optional(),
  password: z
    .string()
    .min(8, 'Senha deve ter no minimo 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiuscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minuscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um numero')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial')
    .optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

// Export types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserRoleType = z.infer<typeof userRoleSchema>;
