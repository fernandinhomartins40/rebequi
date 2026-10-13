import { Prisma } from '@prisma/client';
import { requireCommercialAccess, type CommercialActor } from '../services/commercial-access.service.js';
import { prisma } from '../lib/prisma.js';
import { releaseOrderReservations } from '../services/stock-reservation.service.js';
import { ConflictError, ValidationError } from '../utils/errors.util.js';
import { referralRuleSnapshot } from '../services/partner-program.service.js';

const orderInclude = {
  sale: { select: { status: true, fulfillment: { select: { status: true, mode: true, scheduledAt: true, updatedAt: true, deliveryStops: { where: { active: true }, take: 1, select: { run: { select: { status: true, loadedAt: true, departedAt: true } } } } } } } },
  partnerReferral: { select: { codeSnapshot: true, consentedAt: true } },
  reservations: true,
  user: true,
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.CustomerOrderInclude;

export class OrderRepository {
  async createOrder(data: Prisma.CustomerOrderCreateInput, referral?: { code: string; userId: string }) {
    return prisma.$transaction(async tx => {
      if (referral) {
        const identity = await tx.partnerProfile.findUnique({ where: { referralCode: referral.code }, select: { userId: true } });
        if (!identity) throw new ValidationError('Indicação indisponível. Remova o código para continuar.');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${identity.userId}`}))`;
        const partner = await tx.partnerProfile.findFirst({ where: { referralCode: referral.code, status: 'APPROVED', user: { isActive: true } }, select: { id: true, userId: true } });
        if (!partner) throw new ValidationError('Indicação indisponível. Remova o código para continuar.');
        if (partner.userId === referral.userId) throw new ValidationError('Sua própria compra não pode ser atribuída como indicação. Remova o código para continuar.');
        const ruleId = await referralRuleSnapshot(tx, partner.id);
        return tx.customerOrder.create({ data: { ...data, partnerReferral: { create: { partner: { connect: { id: partner.id } }, ...(ruleId ? { rule: { connect: { id: ruleId } } } : {}), codeSnapshot: referral.code, consentVersion: '2026-10-12.1' } } }, include: orderInclude });
      }
      return tx.customerOrder.create({ data, include: orderInclude });
    });
  }

  async updateOrder(id: string, data: Prisma.CustomerOrderUpdateInput, actor?: CommercialActor) {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM customer_orders WHERE id = ${id} FOR UPDATE`;
      await requireCommercialAccess('order', id, actor, tx);
      if (data.status === 'CANCELED') {
        const sale = await tx.sale.findUnique({ where: { orderId: id } });
        if (sale && sale.status !== 'CANCELED') throw new ConflictError('Cancele a venda vinculada antes de cancelar este pedido.');
      }
      if (data.status === 'CANCELED' || data.status === 'COMPLETED') await releaseOrderReservations(tx, id);
      const updated = await tx.customerOrder.update({ where: { id }, data, include: orderInclude });
      if (actor) await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: id, action: 'COMMERCIAL_ORDER_UPDATED' } });
      return updated;
    });
  }

  async findOrderById(id: string) {
    return prisma.customerOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
  }

  async findManyOrders(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerOrderWhereInput;
    orderBy?: Prisma.CustomerOrderOrderByWithRelationInput;
  }) {
    return prisma.customerOrder.findMany({
      ...params,
      include: orderInclude,
    });
  }

  async countOrders(where?: Prisma.CustomerOrderWhereInput) {
    return prisma.customerOrder.count({ where });
  }
}
