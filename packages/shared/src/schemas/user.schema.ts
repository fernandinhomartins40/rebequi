/**
 * User Validation Schemas (Zod)
 * Shared validation schemas for users and authentication used in both frontend and backend
 */

import { z } from 'zod';
import { isValidWhatsapp, normalizeWhatsapp } from '../utils/index.js';

export const userRoleSchema = z.enum(['ADMIN', 'MANAGER', 'CATALOG_MANAGER', 'MARKETING', 'SALES', 'WAREHOUSE', 'CUSTOMER']);
export const managedUserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'CATALOG_MANAGER', 'MARKETING', 'SALES', 'WAREHOUSE']);

const whatsappSchema = z
  .string()
  .min(10, 'WhatsApp com DDD e obrigatorio')
  .transform((value) => normalizeWhatsapp(value))
  .refine((value) => isValidWhatsapp(value), 'Informe um WhatsApp valido com DDD');

const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no minimo 8 caracteres')
  .max(100, 'Senha muito longa')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiuscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minuscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um numero')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial');

export const loginSchema = z.object({
  identifier: z
    .string({
      required_error: 'Informe seu e-mail ou WhatsApp',
      invalid_type_error: 'Informe seu e-mail ou WhatsApp',
    })
    .min(3, 'Informe seu e-mail ou WhatsApp'),
  password: z
    .string({
      required_error: 'Informe sua senha',
      invalid_type_error: 'Informe sua senha',
    })
    .min(3, 'Senha deve ter no minimo 3 caracteres'),
  keepSignedIn: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  whatsapp: whatsappSchema,
});

export const createUserSchema = z.object({
  email: z.string().email('Email invalido'),
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  password: passwordSchema,
  whatsapp: whatsappSchema.optional(),
  role: userRoleSchema.default('CUSTOMER'),
  isProvisional: z.boolean().default(false),
  mustChangePassword: z.boolean().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().email('Email invalido').optional(),
  name: z.string().min(1).max(255).optional(),
  password: passwordSchema.optional(),
  whatsapp: whatsappSchema.optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  isProvisional: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
});

export const createManagedUserSchema = z.object({
  email: z.string().email('Email invalido'),
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  password: passwordSchema,
  whatsapp: whatsappSchema.optional(),
  role: managedUserRoleSchema,
  isActive: z.boolean().default(true),
  mustChangePassword: z.boolean().default(true),
});

export const updateManagedUserSchema = z
  .object({
    email: z.string().email('Email invalido').optional(),
    name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo').optional(),
    password: passwordSchema.optional(),
    whatsapp: z.union([whatsappSchema, z.literal('')]).optional(),
    role: managedUserRoleSchema.optional(),
    isActive: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizacao',
  });

export const managedUserFiltersSchema = z.object({
  search: z.string().trim().optional(),
  role: z.union([managedUserRoleSchema, z.literal('all')]).optional().default('all'),
  includeInactive: z
    .preprocess((value) => {
      if (value === 'true' || value === true) {
        return true;
      }

      if (value === 'false' || value === false || value === undefined) {
        return false;
      }

      return value;
    }, z.boolean())
    .optional()
    .default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const updateAdminCredentialsSchema = z.object({
  currentEmail: z.string().email('Email atual invalido'),
  currentPassword: z.string().min(8, 'Senha atual deve ter no minimo 8 caracteres'),
  newEmail: z.string().email('Novo email invalido'),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'A nova senha deve ter no minimo 6 caracteres').max(100, 'Senha muito longa'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export type UpdateManagedUserInput = z.infer<typeof updateManagedUserSchema>;
export type ManagedUserFiltersInput = z.infer<typeof managedUserFiltersSchema>;
export type UserRoleType = z.infer<typeof userRoleSchema>;
export type ManagedUserRoleType = z.infer<typeof managedUserRoleSchema>;
export type UpdateAdminCredentialsInput = z.infer<typeof updateAdminCredentialsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
