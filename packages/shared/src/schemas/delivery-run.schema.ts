import { z } from 'zod';
const measurement = z.string().regex(/^\d{1,9}(?:\.\d{1,3})?$/).refine(value => Number(value) > 0).nullable();
export const deliveryRunSchema = z.object({
  requestKey: z.string().uuid(), confirmed: z.literal(true), label: z.string().trim().min(3).max(80),
  driverId: z.string().min(1).max(128), vehicleId: z.string().min(1).max(128), scheduledAt: z.string().datetime(),
  stops: z.array(z.object({ fulfillmentId: z.string().min(1).max(128), expectedVersion: z.number().int().min(1), loadKg: measurement, volumeM3: measurement }).strict()).min(1).max(20),
}).strict().refine(value => new Set(value.stops.map(stop => stop.fulfillmentId)).size === value.stops.length, 'Entrega repetida no romaneio.');
export const cancelDeliveryRunSchema = z.object({ requestKey: z.string().uuid(), expectedVersion: z.number().int().min(1), confirmed: z.literal(true), reason: z.string().trim().min(3).max(300) }).strict();
export type DeliveryRunInput = z.infer<typeof deliveryRunSchema>;
export type CancelDeliveryRunInput = z.infer<typeof cancelDeliveryRunSchema>;
