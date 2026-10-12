import { z } from 'zod';

export const PARTNER_TERMS_VERSION = '2026-10-11';
export const PARTNER_SPECIALTIES = ['Pintura', 'Alvenaria', 'Carpintaria', 'Elétrica', 'Hidráulica', 'Gesso e drywall', 'Pisos e revestimentos', 'Impermeabilização', 'Coberturas', 'Reformas e manutenção'] as const;
export const partnerStatusSchema = z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED']);
export const partnerProfileSchema = z.object({
  specialties: z.array(z.enum(PARTNER_SPECIALTIES)).min(1, 'Escolha uma especialidade').max(10).refine(values => new Set(values).size === values.length, 'Especialidades repetidas'),
  city: z.string().trim().min(2, 'Informe a cidade').max(100),
  region: z.string().trim().min(2, 'Informe a região de atendimento').max(180),
  services: z.string().trim().max(1000).default(''),
  experienceYears: z.number().int().min(0).max(80).default(0),
  acceptedTermsVersion: z.literal(PARTNER_TERMS_VERSION),
  expectedVersion: z.number().int().min(0),
}).strict();
export const reviewPartnerSchema = z.object({
  status: z.enum(['APPROVED', 'SUSPENDED', 'REJECTED']),
  reason: z.string().trim().min(3, 'Informe o motivo').max(500),
  expectedVersion: z.number().int().positive(),
}).strict();
export const partnerFiltersSchema = z.object({
  status: partnerStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PartnerProfileInput = z.infer<typeof partnerProfileSchema>;
export type ReviewPartnerInput = z.infer<typeof reviewPartnerSchema>;
export type PartnerFiltersInput = z.infer<typeof partnerFiltersSchema>;
