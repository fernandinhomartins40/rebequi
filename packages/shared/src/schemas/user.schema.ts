/**
 * User Validation Schemas (Zod)
 * Shared validation schemas for users and authentication used in both frontend and backend
 */

import { z } from 'zod';
import { isValidWhatsapp, normalizeWhatsapp } from '../utils/index.js';

// User Role Schema
export const userRoleSchema = z.enum(['ADMIN', 'CUSTOMER']);

const whatsappSchema = z
  .string()
  .min(10, 'WhatsApp com DDD e obrigatório')
  .transform((value) => normalizeWhatsapp(value))
  .refine((value) => isValidWhatsapp(value), 'Informe um WhatsApp válido com DDD');

// Login Schema
export const loginSchema = z.object({
  identifier: z.string().min(3, 'Informe seu email ou WhatsApp'),
  password: z.string().min(3, 'Senha deve ter no mínimo 3 caracteres'),
});

// Register Schema
export const registerSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatório').max(255, 'Nome muito longo'),
  whatsapp: whatsappSchema,
});

// Create User Schema
export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome e obrigatório').max(255, 'Nome muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiuscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minuscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um numero')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  whatsapp: whatsappSchema.optional(),
  role: userRoleSchema.default('CUSTOMER'),
  isProvisional: z.boolean().default(false),
  mustChangePassword: z.boolean().default(false),
});

// Update User Schema
export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  name: z.string().min(1).max(255).optional(),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiuscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minuscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um numero')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial')
    .optional(),
  whatsapp: whatsappSchema.optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  isProvisional: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
});

export const updateAdminCredentialsSchema = z.object({
  currentEmail: z.string().email('Email atual inválido'),
  currentPassword: z.string().min(8, 'Senha atual deve ter no mínimo 8 caracteres'),
  newEmail: z.string().email('Novo email inválido'),
  newPassword: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiuscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minuscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um numero')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(3, 'Informe sua senha atual'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

// Export types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserRoleType = z.infer<typeof userRoleSchema>;
export type UpdateAdminCredentialsInput = z.infer<typeof updateAdminCredentialsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
