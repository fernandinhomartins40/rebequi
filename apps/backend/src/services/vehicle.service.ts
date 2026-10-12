import { createHash } from 'node:crypto';
import { vehicleSchema, type VehicleInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.util.js';

export async function listVehicles(page: number) {
  const [vehicles, total] = await Promise.all([
    prisma.logisticsVehicle.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }),
    prisma.logisticsVehicle.count(),
  ]);
  return { vehicles, total, page, totalPages: Math.ceil(total / 20) };
}

export async function saveVehicle(id: string | null, actorId: string, raw: VehicleInput) {
  const input = vehicleSchema.parse(raw);
  const { requestKey, expectedVersion, confirmed: _confirmed, reason, ...values } = input;
  const key = createHash('sha256').update(`vehicle:${actorId}:${requestKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify({ id, reason, ...values })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vehicle-request:${key}`}))`;
    const repeated = await tx.logisticsVehicleEvent.findUnique({ where: { requestKey: key } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outro registro.');
      return { id: repeated.vehicleId, version: repeated.version };
    }
    if (id) await tx.$queryRaw`SELECT id FROM logistics_vehicles WHERE id=${id} FOR UPDATE`;
    const current = id ? await tx.logisticsVehicle.findUnique({ where: { id } }) : null;
    if (id && !current) throw new NotFoundError('Veículo não encontrado.');
    if (expectedVersion !== (current?.version ?? 0)) throw new ConflictError('O veículo mudou. Recarregue antes de confirmar.');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vehicle-plate:${values.plate}`}))`;
    const duplicate = await tx.logisticsVehicle.findUnique({ where: { plate: values.plate }, select: { id: true } });
    if (duplicate && duplicate.id !== id) throw new ConflictError('Esta placa já está cadastrada.');
    const saved = current
      ? await tx.logisticsVehicle.update({ where: { id: current.id }, data: { ...values, version: { increment: 1 } } })
      : await tx.logisticsVehicle.create({ data: values });
    await tx.logisticsVehicleEvent.create({ data: { vehicleId: saved.id, version: saved.version, requestKey: key, fingerprint, actorId, reason, snapshot: values } });
    await tx.integrationAudit.create({ data: { actorId, jobId: saved.id, action: current ? 'VEHICLE_UPDATED' : 'VEHICLE_CREATED' } });
    return { id: saved.id, version: saved.version };
  });
}

export async function vehicleHistory(id: string, page: number) {
  if (!await prisma.logisticsVehicle.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundError('Veículo não encontrado.');
  const where = { vehicleId: id };
  const [events, total] = await Promise.all([
    prisma.logisticsVehicleEvent.findMany({ where, orderBy: { version: 'desc' }, skip: (page - 1) * 20, take: 20, select: { id: true, version: true, snapshot: true, reason: true, createdAt: true } }),
    prisma.logisticsVehicleEvent.count({ where }),
  ]);
  return { events, total, page, totalPages: Math.ceil(total / 20) };
}
