import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { deliveryRunSchema, cancelDeliveryRunSchema, type DeliveryRunInput, type CancelDeliveryRunInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.util.js';
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function createDeliveryRun(actorId: string, raw: DeliveryRunInput) {
  const input = deliveryRunSchema.parse(raw);
  const { requestKey, confirmed: _confirmed, ...values } = input;
  const key = digest({ actorId, requestKey, domain: 'delivery-run' }); const fingerprint = digest(values);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`delivery-run:${key}`}))`;
    const repeated = await tx.deliveryRun.findUnique({ where: { requestKey: key } });
    if (repeated) { if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outro romaneio.'); return { id: repeated.id, version: 1 }; }
    const identities = await tx.fulfillment.findMany({ where: { id: { in: input.stops.map(stop => stop.fulfillmentId) } }, select: { id: true, saleId: true } });
    if (identities.length !== input.stops.length) throw new NotFoundError('Uma entrega não foi encontrada.');
    // Match the sale -> fulfillment order used by payment, returns and warehouse operations.
    for (const saleId of identities.map(row => row.saleId).sort()) await tx.$queryRaw`SELECT id FROM sales WHERE id=${saleId} FOR UPDATE`;
    for (const id of identities.map(row => row.id).sort()) await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM users WHERE id=${input.driverId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM logistics_vehicles WHERE id=${input.vehicleId} FOR UPDATE`;
    const driver = await tx.user.findFirst({ where: { id: input.driverId, isActive: true, role: 'DRIVER' }, select: { id: true, name: true } });
    const vehicle = await tx.logisticsVehicle.findFirst({ where: { id: input.vehicleId, active: true } });
    if (!driver || !vehicle) throw new ConflictError('Selecione motorista e veículo ativos.');
    const rows = await tx.fulfillment.findMany({ where: { id: { in: identities.map(row => row.id) } }, include: { items: true, sale: { select: { status: true, referenceCode: true, customerNameSnapshot: true } } } });
    const returns = await tx.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId: { in: identities.map(row => row.saleId) } } }, _sum: { quantity: true } });
    const refunded = new Map(returns.map(row => [row.saleItemId, row._sum.quantity ?? 0]));
    if (await tx.deliveryRunStop.count({ where: { fulfillmentId: { in: identities.map(row => row.id) }, active: true } })) throw new ConflictError('Uma entrega já pertence a um romaneio ativo.');
    const snapshots = input.stops.map((stop, index) => {
      const row = rows.find(row => row.id === stop.fulfillmentId)!;
      if (row.version !== stop.expectedVersion) throw new ConflictError('Uma entrega mudou. Atualize a seleção antes de planejar.');
      if (row.status !== 'READY' || row.mode !== 'DELIVERY' || row.sale.status !== 'PAID' || !row.address) throw new ConflictError('Use somente entregas pagas e prontas com endereço conferido.');
      const items = row.items.map(item => ({ id: item.id, name: item.nameSnapshot, quantity: item.quantity - (refunded.get(item.saleItemId) ?? 0) - item.delivered, unit: 'COMMERCIAL_UNIT' }));
      if (!items.some(item => item.quantity > 0) || row.items.some(item => item.checked !== item.quantity - (refunded.get(item.saleItemId) ?? 0))) throw new ConflictError('Confira novamente o saldo dos materiais.');
      return { fulfillmentId: row.id, position: index + 1, loadKg: stop.loadKg, volumeM3: stop.volumeM3, snapshot: { referenceCode: row.sale.referenceCode, customerName: row.sale.customerNameSnapshot, address: row.address, region: row.region, customerScheduledAt: row.scheduledAt?.toISOString() ?? null, fulfillmentVersion: row.version, items } };
    });
    const sum = (field: 'loadKg' | 'volumeM3') => input.stops.every(stop => stop[field] !== null) ? input.stops.reduce((total, stop) => total.plus(stop[field]!), new Prisma.Decimal(0)) : null;
    const load = sum('loadKg'); const volume = sum('volumeM3');
    const knownLoad = input.stops.reduce((total, stop) => total.plus(stop.loadKg ?? '0'), new Prisma.Decimal(0));
    const knownVolume = input.stops.reduce((total, stop) => total.plus(stop.volumeM3 ?? '0'), new Prisma.Decimal(0));
    if (vehicle.maxLoadKg && knownLoad.gt(vehicle.maxLoadKg)) throw new ConflictError('Carga informada excede a capacidade útil do veículo.');
    if (vehicle.maxVolumeM3 && knownVolume.gt(vehicle.maxVolumeM3)) throw new ConflictError('Volume informado excede a capacidade do veículo.');
    const snapshot = { driverName: driver.name, vehicle: { plate: vehicle.plate, label: vehicle.label, version: vehicle.version, maxLoadKg: vehicle.maxLoadKg?.toString() ?? null, maxVolumeM3: vehicle.maxVolumeM3?.toString() ?? null, restrictions: vehicle.restrictions }, totalLoadKg: load?.toString() ?? null, totalVolumeM3: volume?.toString() ?? null, capacityChecked: Boolean(load && volume && vehicle.maxLoadKg && vehicle.maxVolumeM3) };
    const run = await tx.deliveryRun.create({ data: { label: input.label, driverId: driver.id, vehicleId: vehicle.id, scheduledAt: new Date(input.scheduledAt), requestKey: key, fingerprint, snapshot, stops: { create: snapshots }, events: { create: { version: 1, requestKey: key, fingerprint, kind: 'PLANNED', actorId, details: { label: input.label, scheduledAt: input.scheduledAt, capacityChecked: snapshot.capacityChecked } } } } });
    for (const row of rows) {
      const updated = await tx.fulfillment.update({ where: { id: row.id }, data: { driverId: driver.id, version: { increment: 1 } } });
      await tx.fulfillmentEvent.create({ data: { fulfillmentId: row.id, version: updated.version, requestKey: `run-planned:${run.id}:${row.id}`, fingerprint: run.id, kind: 'RUN_PLANNED', actorId, details: { runId: run.id, driverId: driver.id, previousDriverId: row.driverId } } });
    }
    await tx.integrationAudit.create({ data: { actorId, jobId: run.id, action: 'DELIVERY_RUN_PLANNED' } });
    return { id: run.id, version: 1 };
  }, { timeout: 15000 });
}
export async function cancelDeliveryRun(id: string, actorId: string, raw: CancelDeliveryRunInput) {
  const input = cancelDeliveryRunSchema.parse(raw); const key = digest({ actorId, requestKey: input.requestKey, domain: 'run-cancel' }); const fingerprint = digest({ id, reason: input.reason });
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`delivery-run:${key}`}))`;
    await tx.$queryRaw`SELECT id FROM delivery_runs WHERE id=${id} FOR UPDATE`;
    const repeated = await tx.deliveryRunEvent.findUnique({ where: { requestKey: key } });
    if (repeated) { if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra operação.'); return { id, version: repeated.version }; }
    const run = await tx.deliveryRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundError('Romaneio não encontrado.');
    if (run.version !== input.expectedVersion || run.status !== 'PLANNED') throw new ConflictError('Romaneio alterado ou não disponível para cancelamento do planejamento.');
    const updated = await tx.deliveryRun.update({ where: { id }, data: { status: 'CANCELED', version: { increment: 1 } } });
    await tx.deliveryRunStop.updateMany({ where: { runId: id, active: true }, data: { active: false } });
    await tx.deliveryRunEvent.create({ data: { runId: id, version: updated.version, requestKey: key, fingerprint, kind: 'CANCELED', actorId, details: { reason: input.reason } } });
    await tx.integrationAudit.create({ data: { actorId, jobId: id, action: 'DELIVERY_RUN_CANCELED' } });
    return { id, version: updated.version };
  });
}
export async function listDeliveryRuns(page: number) {
  const [runs, total] = await Promise.all([prisma.deliveryRun.findMany({ orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: { id: true, label: true, scheduledAt: true, status: true, version: true, snapshot: true, _count: { select: { stops: true } } } }), prisma.deliveryRun.count()]);
  return { runs, page, totalPages: Math.ceil(total / 20) };
}
export async function getDeliveryRun(id: string) {
  const run = await prisma.deliveryRun.findUnique({ where: { id }, select: { id: true, label: true, scheduledAt: true, status: true, version: true, snapshot: true, stops: { orderBy: { position: 'asc' }, select: { id: true, position: true, snapshot: true, loadKg: true, volumeM3: true, active: true } }, events: { orderBy: { version: 'desc' }, take: 20, select: { id: true, version: true, kind: true, details: true, createdAt: true } } } });
  if (!run) throw new NotFoundError('Romaneio não encontrado.'); return run;
}
export async function deliveryCandidates(page: number) {
  const where = { mode: 'DELIVERY', status: 'READY', sale: { status: 'PAID' as const }, deliveryStops: { none: { active: true } } };
  const [deliveries, total] = await Promise.all([
    prisma.fulfillment.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: { id: true, version: true, address: true, region: true, sale: { select: { referenceCode: true, customerNameSnapshot: true } } } }),
    prisma.fulfillment.count({ where }),
  ]);
  return { deliveries, page, totalPages: Math.ceil(total / 20) };
}
