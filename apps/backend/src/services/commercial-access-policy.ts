import type { Prisma } from '@prisma/client';
export type CommercialActor = { userId: string; role: string };
type Assignment = { assignedSellerId: string | null; assignmentVersion: number; registeredById?: string | null };
export const assignedScope = (actor?: CommercialActor) => actor?.role === 'SALES' ? { assignedSellerId: actor.userId } : {};
export const saleScope = (actor?: CommercialActor): Prisma.SaleWhereInput => actor?.role === 'SALES' ? { OR: [{ assignedSellerId: actor.userId }, { assignedSellerId: null, assignmentVersion: 0, registeredById: actor.userId }] } : {};
export function canAccessCommercialRecord(record: Assignment, actor?: CommercialActor) {
  return actor?.role !== 'SALES' || record.assignedSellerId === actor.userId || (record.assignedSellerId === null && record.assignmentVersion === 0 && record.registeredById === actor.userId);
}
