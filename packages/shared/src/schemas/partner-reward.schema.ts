import { z } from 'zod';
export const partnerRewardSchema = z.object({ expectedVersion: z.number().int().min(0), name: z.string().trim().min(3).max(100), description: z.string().trim().min(10).max(2000), points: z.number().int().min(1).max(10000000), capacity: z.number().int().min(0).max(100000), enabled: z.boolean(), endsAt: z.string().datetime().nullable(), confirmed: z.literal(true) }).strict();
export const partnerRedemptionSchema = z.object({ requestKey: z.string().uuid(), rewardId: z.string().min(1).max(128), rewardVersion: z.number().int().min(1), confirmed: z.literal(true) }).strict();
export const partnerRedemptionReviewSchema = z.object({ expectedVersion: z.number().int().min(1), status: z.enum(['APPROVED', 'REJECTED', 'CANCELED', 'FULFILLED']), reason: z.string().trim().min(3).max(500), confirmed: z.literal(true) }).strict();
export type PartnerRewardInput = z.infer<typeof partnerRewardSchema>;
export type PartnerRedemptionInput = z.infer<typeof partnerRedemptionSchema>;
export type PartnerRedemptionReviewInput = z.infer<typeof partnerRedemptionReviewSchema>;
