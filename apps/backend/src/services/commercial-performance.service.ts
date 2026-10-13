import { prisma } from '../lib/prisma.js';
import { currentSellerGoal } from './seller-goal.service.js';

export function monthWindow(month: string) {
  const [year, number] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, number - 1, 1));
  const to = new Date(Date.UTC(year, number, 1));
  return { from, to };
}

export async function sellerMonthlyPerformance(sellerId: string, month: string) {
  const { from, to } = monthWindow(month);
  const [sales, refunds, goal] = await Promise.all([
    prisma.$queryRaw<{ count: number; grossCents: string }[]>`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(ROUND(total::numeric * 100)), 0)::text AS "grossCents"
      FROM sales WHERE "creditedSellerId"=${sellerId} AND status='PAID'
        AND "paidAt">=${from} AND "paidAt"<${to}`,
    prisma.$queryRaw<{ refundCents: string }[]>`
      SELECT COALESCE(SUM(r."refundCents"), 0)::text AS "refundCents"
      FROM sale_returns r JOIN sales s ON s.id=r."saleId"
      WHERE s."creditedSellerId"=${sellerId} AND s.status='PAID'
        AND s."paidAt">=${from} AND s."paidAt"<${to}`,
    currentSellerGoal(sellerId, month),
  ]);
  const grossCents = BigInt(sales[0].grossCents);
  const refundCents = BigInt(refunds[0].refundCents);
  return { month, paidSales: sales[0].count, grossCents: grossCents.toString(), refundCents: refundCents.toString(),
    netCents: (grossCents - refundCents).toString(), goal, basis: 'PAID_SALES_CREDITED_AT_CREATION', commissionCalculated: false };
}
