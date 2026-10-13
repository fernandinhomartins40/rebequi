import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { deliveryRunOperationSchema, type DeliveryRunOperationInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';
import { canOperateDeliveryRun } from './delivery-run-operation-policy.js';
export async function operateDeliveryRun(id: string, actor: { userId: string; role: string }, raw: DeliveryRunOperationInput) {
  const input = deliveryRunOperationSchema.parse(raw);
  const { requestKey, expectedVersion: _version, confirmed: _confirmed, ...values } = input;
  const key = createHash('sha256').update(`run-operation:${actor.userId}:${requestKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify({ id, ...values })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`run-operation:${key}`}))`;
    const identity = await tx.deliveryRun.findUnique({ where: { id }, select: { driverId: true, stops: { select: { fulfillmentId: true, fulfillment: { select: { saleId: true } } } } } });
    if (!identity || actor.role === 'DRIVER' && identity.driverId !== actor.userId) throw new NotFoundError('Romaneio não encontrado.');
    if (!canOperateDeliveryRun(actor, identity.driverId, input.action)) throw new ForbiddenError('Seu perfil não pode registrar esta operação.');
    for (const saleId of identity.stops.map(stop => stop.fulfillment.saleId).sort()) await tx.$queryRaw`SELECT id FROM sales WHERE id=${saleId} FOR UPDATE`;
    for (const fulfillmentId of identity.stops.map(stop => stop.fulfillmentId).sort()) await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${fulfillmentId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM delivery_runs WHERE id=${id} FOR UPDATE`;
    const repeated = await tx.deliveryRunEvent.findUnique({ where: { requestKey: key } });
    if (repeated) { if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra operação.'); return { id, version: repeated.version }; }
    const run = await tx.deliveryRun.findUniqueOrThrow({ where: { id }, include: { stops: { include: { items: true, fulfillment: { select: { driverId: true, mode: true, status: true, sale: { select: { status: true } } } } } } } });
    if (run.version !== input.expectedVersion) throw new ConflictError('O romaneio mudou. Recarregue antes de confirmar.');
    if (!run.stops.length || run.stops.some(stop => !stop.active || stop.fulfillment.driverId !== run.driverId || stop.fulfillment.mode !== 'DELIVERY' || stop.fulfillment.status !== 'READY' || stop.fulfillment.sale.status !== 'PAID')) throw new ConflictError('Confira o vínculo, pagamento e liberação das entregas.');
    const items = run.stops.flatMap(stop => stop.items); const now = new Date();
    const submitted = new Map(input.items.map(item => [item.id, item.quantity]));
    let status: string; let loadSnapshot: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
    if (input.action === 'RETURN_TO_WAREHOUSE') {
      if (run.status !== 'IN_TRANSIT') throw new ConflictError('Confirme o retorno somente após a saída e recebimento físico no depósito.');
      const remaining = items.filter(item => item.loaded > item.delivered + item.returnedToWarehouse);
      if (!remaining.length || input.items.length !== remaining.length || remaining.some(item => submitted.get(item.id) !== item.loaded - item.delivered - item.returnedToWarehouse)) throw new ConflictError('Confira todos os materiais não entregues que retornaram ao depósito.');
      for (const item of remaining) await tx.deliveryRunItem.update({ where: { id: item.id }, data: { returnedToWarehouse: item.loaded - item.delivered } });
      status = 'CLOSED'; loadSnapshot = run.loadSnapshot as Prisma.InputJsonValue;
    } else if (input.action === 'UNLOAD') {
      if (run.status !== 'LOADED' || items.some(item => item.delivered || item.returnedToWarehouse)) throw new ConflictError('Só é possível descarregar antes da saída e sem entregas registradas.');
      await tx.deliveryRunItem.updateMany({ where: { stop: { runId: id } }, data: { loaded: 0 } });
      status = 'PLANNED';
    } else {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${run.driverId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM logistics_vehicles WHERE id=${run.vehicleId} FOR UPDATE`;
      const driver = await tx.user.findFirst({ where: { id: run.driverId, role: 'DRIVER', isActive: true }, select: { id: true, name: true } });
      const vehicle = await tx.logisticsVehicle.findFirst({ where: { id: run.vehicleId, active: true } });
      if (!driver || !vehicle || !vehicle.maxLoadKg || !vehicle.maxVolumeM3) throw new ConflictError('Motorista e veículo precisam estar ativos, com capacidades em kg e m³ conferidas.');
      if (input.action === 'LOAD') {
        if (run.status !== 'PLANNED') throw new ConflictError('Esta etapa não permite confirmar carregamento.');
        if (!items.length || items.length !== input.items.length || items.some(item => submitted.get(item.id) !== item.planned)) throw new ConflictError('Confira fisicamente todas as quantidades planejadas.');
        if (input.measurements.length !== run.stops.length || run.stops.some(stop => !input.measurements.some(measurement => measurement.stopId === stop.id))) throw new ConflictError('Informe peso e volume conferidos para cada parada.');
        const load = input.measurements.reduce((sum, measurement) => sum.plus(measurement.loadKg), new Prisma.Decimal(0));
        const volume = input.measurements.reduce((sum, measurement) => sum.plus(measurement.volumeM3), new Prisma.Decimal(0));
        if (load.gt(vehicle.maxLoadKg) || volume.gt(vehicle.maxVolumeM3)) throw new ConflictError('Carga ou volume excedem a capacidade útil do veículo.');
        await tx.$executeRaw(Prisma.sql`UPDATE delivery_run_items SET loaded=planned WHERE "stopId" IN (${Prisma.join(run.stops.map(stop => stop.id))})`);
        loadSnapshot = { loadedAt: now.toISOString(), vehicleVersion: vehicle.version, maxLoadKg: vehicle.maxLoadKg.toString(), maxVolumeM3: vehicle.maxVolumeM3.toString(), totalLoadKg: load.toString(), totalVolumeM3: volume.toString(), measurements: input.measurements, items: input.items };
        status = 'LOADED';
      } else {
        if (run.status !== 'LOADED' || !run.loadSnapshot || !items.length || items.some(item => item.loaded !== item.planned)) throw new ConflictError('Confira e carregue todos os materiais antes da saída.');
        const loaded = run.loadSnapshot as { totalLoadKg?: string; totalVolumeM3?: string };
        if (!loaded.totalLoadKg || !loaded.totalVolumeM3 || new Prisma.Decimal(loaded.totalLoadKg).gt(vehicle.maxLoadKg) || new Prisma.Decimal(loaded.totalVolumeM3).gt(vehicle.maxVolumeM3)) throw new ConflictError('A capacidade do veículo mudou. Reconfira a carga.');
        loadSnapshot = run.loadSnapshot as Prisma.InputJsonValue;
        status = 'IN_TRANSIT';
      }
    }
    const updated = await tx.deliveryRun.update({ where: { id }, data: { status, loadSnapshot, loadedAt: input.action === 'LOAD' ? now : input.action === 'UNLOAD' ? null : run.loadedAt, departedAt: input.action === 'DEPART' ? now : input.action === 'RETURN_TO_WAREHOUSE' ? run.departedAt : null, version: { increment: 1 } } });
    if (input.action === 'RETURN_TO_WAREHOUSE') {
      await tx.deliveryRunStop.updateMany({ where: { runId: id, active: true }, data: { active: false } });
      for (const stop of run.stops) {
        const materials = await tx.fulfillmentItem.findMany({ where: { fulfillmentId: stop.fulfillmentId }, select: { id: true, delivered: true } });
        for (const material of materials) await tx.fulfillmentItem.update({ where: { id: material.id }, data: { checked: material.delivered } });
        const fulfillment = await tx.fulfillment.update({ where: { id: stop.fulfillmentId }, data: { status: 'CHECKING', version: { increment: 1 } } });
        await tx.fulfillmentEvent.create({ data: { fulfillmentId: fulfillment.id, version: fulfillment.version, requestKey: `run-returned:${id}:${stop.id}`, fingerprint: id, kind: 'RUN_RETURNED_TO_WAREHOUSE', actorId: actor.userId, details: { runId: id, note: input.note } } });
      }
    }
    await tx.deliveryRunEvent.create({ data: { runId: id, version: updated.version, requestKey: key, fingerprint, kind: input.action, actorId: actor.userId, details: { ...values, recordedAt: now.toISOString(), ...(input.action === 'LOAD' ? { loadSnapshot: loadSnapshot as Prisma.InputJsonValue } : {}) } } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: id, action: `DELIVERY_RUN_${input.action}` } });
    return { id, version: updated.version };
  }, { timeout: 15000 });
}
