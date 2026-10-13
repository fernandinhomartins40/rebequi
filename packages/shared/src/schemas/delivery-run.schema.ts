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
const positiveMeasurement = z.string().regex(/^\d{1,9}(?:\.\d{1,3})?$/).refine(value => Number(value) > 0);
export const deliveryRunOperationSchema = z.object({
  requestKey: z.string().uuid(), expectedVersion: z.number().int().min(1), confirmed: z.literal(true), action: z.enum(['LOAD', 'DEPART', 'UNLOAD', 'RETURN_TO_WAREHOUSE']), note: z.string().trim().max(300).default(''),
  items: z.array(z.object({ id: z.string().min(1).max(128), quantity: z.number().int().min(1).max(1000000) }).strict()).max(2000).default([]),
  measurements: z.array(z.object({ stopId: z.string().min(1).max(128), loadKg: positiveMeasurement, volumeM3: positiveMeasurement }).strict()).max(20).default([]),
}).strict().refine(value => new Set(value.items.map(item => item.id)).size === value.items.length && new Set(value.measurements.map(stop => stop.stopId)).size === value.measurements.length, 'Material ou parada repetidos.')
  .refine(value => value.action === 'LOAD' ? value.items.length > 0 && value.measurements.length > 0 : value.action === 'RETURN_TO_WAREHOUSE' ? value.items.length > 0 && value.measurements.length === 0 : value.items.length === 0 && value.measurements.length === 0, 'Confira os dados da operação.')
  .refine(value => !['UNLOAD', 'RETURN_TO_WAREHOUSE'].includes(value.action) || value.note.length >= 3, 'Informe o motivo da descarga ou retorno.');
export type DeliveryRunOperationInput = z.infer<typeof deliveryRunOperationSchema>;
export const deliveryReceiptSchema = z.object({
  requestKey: z.string().uuid(), expectedVersion: z.number().int().min(1), confirmed: z.literal(true),
  stopId: z.string().min(1).max(128), receiverName: z.string().trim().min(2).max(100), note: z.string().trim().max(300).default(''),
  items: z.array(z.object({ id: z.string().min(1).max(128), quantity: z.number().int().min(1).max(1000000) }).strict()).min(1).max(100),
}).strict().refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Material repetido na entrega.');
export type DeliveryReceiptInput = z.infer<typeof deliveryReceiptSchema>;
export const deliveryOccurrenceSchema = z.object({
  requestKey: z.string().uuid(), expectedVersion: z.number().int().min(1), confirmed: z.literal(true),
  stopId: z.string().min(1).max(128), kind: z.enum(['CUSTOMER_ABSENT', 'ADDRESS_REVIEW', 'ACCESS_BLOCKED', 'DAMAGED_MATERIAL', 'REFUSED_RECEIPT', 'OTHER']),
  note: z.string().trim().min(3).max(300),
}).strict();
export type DeliveryOccurrenceInput = z.infer<typeof deliveryOccurrenceSchema>;
