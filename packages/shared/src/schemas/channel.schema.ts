import { z } from 'zod';

export const channelTypeSchema = z.enum(['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MANUAL']);

export const channelStatusSchema = z.enum(['DISCONNECTED', 'CONNECTED', 'ERROR']);

export const listingSyncStatusSchema = z.enum(['DRAFT', 'SYNCED', 'OUT_OF_SYNC', 'ERROR']);

export const createChannelSchema = z.object({
  type: channelTypeSchema,
  name: z.string().trim().min(1, 'Informe um nome para o canal').max(120, 'Nome muito longo'),
  externalId: z.string().trim().max(120).optional(),
  // Pares chave/valor de credenciais (ex.: clientId, clientSecret, accessToken).
  credentials: z.record(z.string(), z.string()).optional(),
});

export const updateChannelSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    externalId: z.string().trim().max(120).nullable().optional(),
    isActive: z.boolean().optional(),
    credentials: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.externalId !== undefined ||
      data.isActive !== undefined ||
      data.credentials !== undefined,
    { message: 'Nada para atualizar.' }
  );

export const channelFiltersSchema = z.object({
  type: channelTypeSchema.optional(),
  status: channelStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const publishListingSchema = z.object({
  productId: z.string().min(1, 'Produto obrigatorio'),
});

export const listingFiltersSchema = z.object({
  search: z.string().trim().optional(),
  syncStatus: listingSyncStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ChannelTypeInput = z.infer<typeof channelTypeSchema>;
export type ChannelStatusInput = z.infer<typeof channelStatusSchema>;
export type ListingSyncStatusInput = z.infer<typeof listingSyncStatusSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type ChannelFiltersInput = z.infer<typeof channelFiltersSchema>;
export type PublishListingInput = z.infer<typeof publishListingSchema>;
export type ListingFiltersInput = z.infer<typeof listingFiltersSchema>;
