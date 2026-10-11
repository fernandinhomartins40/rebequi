import { MARKETPLACES, type MarketplaceType } from '@rebequi/shared/constants';
import { prisma } from '../lib/prisma.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.util.js';
import { ValidationError } from '../utils/errors.util.js';

export async function getMarketplaceSettings() {
  const channels = await prisma.channel.findMany({ where: { type: { not: 'MANUAL' } }, orderBy: { createdAt: 'asc' } });
  return MARKETPLACES.map(definition => ({ ...definition, accounts: channels.filter(channel => channel.type === definition.type).map(channel => {
    const credentials = channel.credentials ? JSON.parse(decryptSecret(channel.credentials)) as Record<string, string> : {};
    return { id: channel.id, name: channel.name, isActive: channel.isActive, status: channel.status,
      configuredFields: definition.fields.filter(field => Boolean(credentials[field.key])).map(field => field.key) };
  }) }));
}

export async function saveMarketplaceSettings(type: MarketplaceType, actorId: string, body: { channelId?: string; credentials: Record<string, string | null> }) {
  const definition = MARKETPLACES.find(provider => provider.type === type);
  if (!definition) throw new ValidationError('Marketplace inválido');
  const allowed = new Set(definition.fields.map(field => field.key));
  for (const [key, value] of Object.entries(body.credentials)) {
    if (!allowed.has(key)) throw new ValidationError('Campo de configuração não permitido');
    const field = definition.fields.find(field => field.key === key)!;
    if (value !== null && field.options && !field.options.includes(value)) throw new ValidationError('Opção de configuração inválida');
    if (value !== null && /[\r\n\u0000]/.test(value)) throw new ValidationError('Use credenciais sem quebras de linha');
  }
  return prisma.$transaction(async tx => {
    const id = body.channelId ?? `marketplace-config-${type.toLowerCase()}`;
    // Serialize partial updates so two saves cannot lose each other's secrets.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    let channel = await tx.channel.findUnique({ where: { id } });
    if (channel && channel.type !== type) throw new ValidationError('Conta não pertence a este marketplace');
    if (!channel && body.channelId) throw new ValidationError('Conta não encontrada');
    const credentials = channel?.credentials ? JSON.parse(decryptSecret(channel.credentials)) as Record<string, string> : {};
    let changed = false;
    for (const [key, value] of Object.entries(body.credentials)) {
      if (value === null) { if (credentials[key]) changed = true; delete credentials[key]; }
      else if (value.trim() && credentials[key] !== value.trim()) { credentials[key] = value.trim(); changed = true; }
    }
    if (changed && definition.authorization === 'oauth') for (const key of ['accessToken', 'refreshToken', 'expiresAt']) delete credentials[key];
    const data = { credentials: Object.keys(credentials).length ? encryptSecret(JSON.stringify(credentials)) : null,
      ...(changed ? { status: 'DISCONNECTED' as const, lastError: null } : {}) };
    if (channel) channel = await tx.channel.update({ where: { id }, data });
    else channel = await tx.channel.create({ data: { id, type, name: definition.name, ...data } });
    await tx.integrationAudit.create({ data: { actorId, jobId: `channel:${channel.id}`, action: 'CREDENTIALS_UPDATED' } });
    return { channelId: channel.id, configuredFields: definition.fields.filter(field => Boolean(credentials[field.key])).map(field => field.key) };
  });
}
