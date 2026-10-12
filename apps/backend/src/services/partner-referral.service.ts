import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.util.js';

export async function resolvePartnerReferral(code: string) {
  if (!/^RB[A-F0-9]{16}$/.test(code)) throw new NotFoundError('Indicação indisponível');
  if (!await prisma.partnerProfile.findFirst({ where: { referralCode: code, status: 'APPROVED', user: { isActive: true } }, select: { id: true } })) throw new NotFoundError('Indicação indisponível');
  // No name/contact/region/profile data exposed to an anonymous visitor.
  return { code };
}
export async function listOwnReferrals(userId: string, page: number) {
  const partner = await prisma.partnerProfile.findUnique({ where: { userId }, select: { id: true, referralCode: true, status: true } });
  if (!partner) throw new NotFoundError('Cadastro não encontrado');
  const where = { partnerId: partner.id };
  const [rows, total] = await Promise.all([prisma.partnerReferral.findMany({ where, orderBy: [{ consentedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
    select: { id: true, consentedAt: true, order: { select: { referenceCode: true, status: true, sale: { select: { status: true } } } } } }), prisma.partnerReferral.count({ where })]);
  return { code: partner.referralCode, canShare: partner.status === 'APPROVED', page, total, totalPages: Math.ceil(total / 20), referrals: rows.map(row => ({ id: row.id, createdAt: row.consentedAt, referenceCode: row.order.referenceCode, orderStatus: row.order.status, saleStatus: row.order.sale?.status ?? null })) };
}
