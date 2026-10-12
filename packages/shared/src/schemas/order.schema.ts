import { z } from 'zod';
import { isValidWhatsapp, normalizeWhatsapp } from '../utils/index.js';

const normalizedWhatsappSchema = z
  .string()
  .min(10, 'WhatsApp com DDD e obrigatorio')
  .transform((value) => normalizeWhatsapp(value))
  .refine((value) => isValidWhatsapp(value), 'Informe um WhatsApp valido com DDD');

export const orderStatusSchema = z.enum([
  'PENDING_WHATSAPP',
  'WHATSAPP_REDIRECTED',
  'IN_RECOVERY',
  'COMPLETED',
  'CANCELED',
]);

export const checkoutOrderItemSchema = z.object({
  productId: z.string().min(1, 'Produto e obrigatorio'),
  quantity: z.coerce.number().int().positive('Quantidade deve ser positiva').max(99, 'Quantidade maxima de 99'),
  promotionId: z.string().min(1, 'Promoção inválida').optional(),
});
export const checkoutReferralSchema = z.object({ code: z.string().regex(/^RB[A-F0-9]{16}$/), confirmed: z.literal(true) }).strict();

export const publicCheckoutOrderSchema = z.object({
  referral: checkoutReferralSchema.optional(),
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  whatsapp: normalizedWhatsappSchema,
  customerNote: z.string().max(1000, 'Observacao muito longa').nullable().optional(),
  items: z.array(checkoutOrderItemSchema).min(1, 'Adicione pelo menos um produto ao carrinho'),
});

export const authenticatedCheckoutOrderSchema = z.object({
  referral: checkoutReferralSchema.optional(),
  customerNote: z.string().max(1000, 'Observacao muito longa').nullable().optional(),
  items: z.array(checkoutOrderItemSchema).min(1, 'Adicione pelo menos um produto ao carrinho'),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  internalNotes: z.string().max(2000, 'Observacao interna muito longa').nullable().optional(),
});

export const orderFiltersSchema = z.object({
  search: z.string().trim().optional(),
  status: orderStatusSchema.optional(),
  recoveryOnly: z
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
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type OrderStatusInput = z.infer<typeof orderStatusSchema>;
export type CheckoutOrderItemInput = z.infer<typeof checkoutOrderItemSchema>;
export type PublicCheckoutOrderInput = z.infer<typeof publicCheckoutOrderSchema>;
export type AuthenticatedCheckoutOrderInput = z.infer<typeof authenticatedCheckoutOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderFiltersInput = z.infer<typeof orderFiltersSchema>;
