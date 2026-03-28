/**
 * Promotion Validation Schemas (Zod)
 * Shared validation schemas for promotional collections used in both frontend and backend
 */

import { z } from 'zod';

export const promotionThemeSchema = z.enum(['gold', 'blue', 'green', 'red', 'slate']);
export const promotionKindSchema = z.enum(['collection', 'single_product']);
export const promotionOfferPricingModeSchema = z.enum(['fixed_price', 'percentage_discount', 'buy_x_pay_y', 'bulk_percentage']);

const promotionImageUrlSchema = z
  .string()
  .min(1, 'Caminho da imagem obrigatório')
  .refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), 'URL ou caminho da imagem inválido');

const promotionDateTimeSchema = z.string().datetime({ offset: true });

export const promotionImageSchema = z.object({
  url: promotionImageUrlSchema,
  alt: z.string().max(255).optional(),
  storageKey: z.string().optional(),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const fixedPriceOfferPricingSchema = z.object({
  mode: z.literal('fixed_price'),
  promotionalPrice: z.number().positive('Informe o preço promocional'),
});

const percentageDiscountOfferPricingSchema = z.object({
  mode: z.literal('percentage_discount'),
  discountPercentage: z.number().positive('Informe o percentual de desconto').max(100, 'Desconto inválido'),
});

const buyXPayYOfferPricingSchema = z.object({
  mode: z.literal('buy_x_pay_y'),
  minimumQuantity: z.number().int().min(2, 'Informe a quantidade mínima'),
  payQuantity: z.number().int().min(1, 'Informe a quantidade cobrada'),
});

const bulkPercentageOfferPricingSchema = z.object({
  mode: z.literal('bulk_percentage'),
  minimumQuantity: z.number().int().min(2, 'Informe a quantidade mínima'),
  discountPercentage: z.number().positive('Informe o percentual de desconto').max(100, 'Desconto inválido'),
});

export const promotionOfferPricingSchema = z
  .discriminatedUnion('mode', [
    fixedPriceOfferPricingSchema,
    percentageDiscountOfferPricingSchema,
    buyXPayYOfferPricingSchema,
    bulkPercentageOfferPricingSchema,
  ])
  .superRefine((value, context) => {
    if (value.mode === 'buy_x_pay_y' && value.payQuantity >= value.minimumQuantity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A quantidade cobrada deve ser menor que a quantidade levada',
        path: ['payQuantity'],
      });
    }
  });

export const createPromotionSchema = z
  .object({
    name: z.string().min(1, 'Nome e obrigatório').max(120, 'Nome muito longo'),
    slug: z.string().max(160).optional(),
    kind: promotionKindSchema.default('collection'),
    eyebrow: z.string().max(80).optional(),
    title: z.string().min(1, 'Título é obrigatório').max(120, 'Título muito longo'),
    subtitle: z.string().max(160).optional(),
    description: z.string().max(1200).optional(),
    badgeText: z.string().max(40).optional(),
    ctaLabel: z.string().max(40).optional(),
    disclaimer: z.string().max(240).optional(),
    themeTone: promotionThemeSchema.default('gold'),
    startsAt: promotionDateTimeSchema.optional(),
    expiresAt: promotionDateTimeSchema,
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    image: promotionImageSchema,
    offerPricing: promotionOfferPricingSchema.optional(),
    productIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos um produto'),
  })
  .refine(
    (value) => !value.startsAt || !value.expiresAt || new Date(value.expiresAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: 'A data final deve ser posterior ao início da promoção',
      path: ['expiresAt'],
    },
  )
  .refine(
    (value) =>
      value.kind === 'single_product'
        ? value.productIds.length === 1
        : value.productIds.length >= 2,
    {
      message: 'Campanhas precisam de pelo menos dois produtos e ofertas individuais aceitam apenas um produto',
      path: ['productIds'],
    },
  );

export const updatePromotionSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: z.string().max(160).optional(),
    kind: promotionKindSchema.optional(),
    eyebrow: z.string().max(80).optional(),
    title: z.string().min(1).max(120).optional(),
    subtitle: z.string().max(160).optional(),
    description: z.string().max(1200).optional(),
    badgeText: z.string().max(40).optional(),
    ctaLabel: z.string().max(40).optional(),
    disclaimer: z.string().max(240).optional(),
    themeTone: promotionThemeSchema.optional(),
    startsAt: promotionDateTimeSchema.nullable().optional(),
    expiresAt: promotionDateTimeSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    image: promotionImageSchema.optional(),
    offerPricing: promotionOfferPricingSchema.nullable().optional(),
    productIds: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine(
    (value) =>
      !value.startsAt ||
      !value.expiresAt ||
      value.expiresAt === null ||
      new Date(value.expiresAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: 'A data final deve ser posterior ao início da promoção',
      path: ['expiresAt'],
    },
  );

export const promotionFiltersSchema = z.object({
  search: z.string().optional(),
  kind: promotionKindSchema.optional(),
  status: z.enum(['active', 'scheduled', 'expired', 'inactive', 'all']).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(12),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type PromotionFiltersInput = z.infer<typeof promotionFiltersSchema>;
export type PromotionImageInput = z.infer<typeof promotionImageSchema>;
export type PromotionThemeInput = z.infer<typeof promotionThemeSchema>;
export type PromotionKindInput = z.infer<typeof promotionKindSchema>;
export type PromotionOfferPricingInput = z.infer<typeof promotionOfferPricingSchema>;
export type PromotionOfferPricingModeInput = z.infer<typeof promotionOfferPricingModeSchema>;
