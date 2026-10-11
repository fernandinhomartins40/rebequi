import { z } from 'zod';

export const paymentMethodSchema = z.enum(['PIX', 'CASH', 'CARD', 'INSTALLMENT']);

export const saleStatusSchema = z.enum(['PAID', 'PENDING_PAYMENT', 'CANCELED']);

export const stockMovementTypeSchema = z.enum(['SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN']);

export const createSaleItemSchema = z.object({
  productId: z.string().min(1, 'Produto e obrigatorio'),
  quantity: z.coerce.number().int().positive('Quantidade deve ser positiva').max(9999, 'Quantidade muito alta'),
  unitPrice: z.coerce
    .number()
    .nonnegative('Preço não pode ser negativo')
    .max(9_999_999, 'Preço inválido')
    .optional(),
});

export const createSaleSchema = z
  .object({
    // Origem opcional: registra a venda a partir de um pedido do checkout WhatsApp.
    orderId: z.string().min(1).optional(),
    // Cliente cadastrado (opcional) — para venda de balcao pode ficar em branco.
    customerId: z.string().min(1).optional(),
    customerName: z.string().trim().max(255, 'Nome muito longo').optional(),
    customerWhatsapp: z.string().trim().max(20, 'WhatsApp invalido').optional(),
    paymentMethod: paymentMethodSchema,
    status: z.enum(['PAID', 'PENDING_PAYMENT']).default('PAID'),
    discount: z.coerce.number().nonnegative('Desconto invalido').max(9_999_999).default(0),
    notes: z.string().max(2000, 'Observacao muito longa').nullable().optional(),
    // Itens: obrigatorios quando nao ha orderId (os itens vem do pedido nesse caso).
    items: z.array(createSaleItemSchema).optional(),
  })
  .refine((data) => Boolean(data.orderId) || (data.items && data.items.length > 0), {
    message: 'Informe os itens da venda ou vincule um pedido.',
    path: ['items'],
  });

export const updateSaleStatusSchema = z.object({
  status: saleStatusSchema,
  notes: z.string().max(2000, 'Observacao muito longa').nullable().optional(),
});

export const saleFiltersSchema = z.object({
  search: z.string().trim().optional(),
  status: saleStatusSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const revenueSummaryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
export type SaleStatusInput = z.infer<typeof saleStatusSchema>;
export type StockMovementTypeInput = z.infer<typeof stockMovementTypeSchema>;
export type CreateSaleItemInput = z.infer<typeof createSaleItemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleStatusInput = z.infer<typeof updateSaleStatusSchema>;
export type SaleFiltersInput = z.infer<typeof saleFiltersSchema>;
export type RevenueSummaryQueryInput = z.infer<typeof revenueSummaryQuerySchema>;
