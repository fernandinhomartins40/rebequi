import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { partnerAiConfigSchema, partnerAiInputSchema, partnerAiResultSchema, type PartnerAiConfigInput, type PartnerAiInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, ValidationError } from '../utils/errors.util.js';
import { IntegrationSettingsService } from './integration-settings.service.js';
import { interpretTechnicalService, PARTNER_AI_MODELS, PARTNER_AI_PROMPT_VERSION } from './partner-ai-transport.js';
import { usageCost, validateTechnicalDescription } from './partner-ai-cost.js';

const KEY = 'partnerAi.config';
const DEFAULT = { enabled: false, provider: 'deepseek' as const, dailyLimit: 3, monthlyBudgetCents: 0, inputRateMicroUsd: 300000, outputRateMicroUsd: 1200000, expectedVersion: 0, tariffsConfirmed: true as const };
async function config(db: Pick<Prisma.TransactionClient, 'setting'> = prisma) {
  const stored = await db.setting.findUnique({ where: { key: KEY } });
  if (!stored) return { ...DEFAULT, version: 0 };
  try { const data = JSON.parse(stored.value); return { ...partnerAiConfigSchema.parse(data), version: Number(data.expectedVersion) }; }
  catch { throw new ConflictError('A configuração da IA precisa ser revisada pela loja.'); }
}
export async function getPartnerAiSettings() {
  const current = await config(); const month = new Date().toISOString().slice(0, 7);
  const [runtime, totals, unknown] = await Promise.all([new IntegrationSettingsService().getAiPublic(), prisma.partnerAiRun.aggregate({ where: { month }, _sum: { chargedMicroUsd: true }, _count: true }), prisma.partnerAiRun.count({ where: { month, status: { in: ['RESERVED', 'UNKNOWN'] } } })]);
  return { ...current, model: PARTNER_AI_MODELS[current.provider], hasKey: current.provider === 'deepseek' ? runtime.hasDeepseekApiKey : runtime.hasQwenApiKey, month, estimatedMicroUsd: Number(totals._sum.chargedMicroUsd ?? 0n), attempts: totals._count, unknown };
}
export async function savePartnerAiSettings(actorId: string, input: PartnerAiConfigInput) {
  const validated = partnerAiConfigSchema.parse(input);
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${KEY}))`;
    const current = await config(tx);
    if (current.version !== validated.expectedVersion) throw new ConflictError('A configuração mudou. Recarregue antes de salvar.');
    const value = JSON.stringify({ ...validated, expectedVersion: current.version + 1 });
    await tx.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
    await tx.integrationAudit.create({ data: { actorId, jobId: KEY, action: 'PARTNER_AI_CONFIG_UPDATED' } });
  });
  return getPartnerAiSettings();
}
export async function getPartnerAiStatus(userId: string) {
  const current = await config(); const today = new Date().toISOString().slice(0, 10);
  const profile = await prisma.partnerProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
  const used = profile ? await prisma.partnerAiRun.count({ where: { partnerId: profile.id, day: today } }) : 0;
  return { enabled: current.enabled && profile?.status === 'APPROVED', remaining: Math.max(0, current.dailyLimit - used) };
}
export async function interpretPartnerDescription(userId: string, rawInput: PartnerAiInput, dependencies: { transport?: typeof fetch; runtime?: ReturnType<IntegrationSettingsService['getAiRuntime']> } = {}) {
  const input = partnerAiInputSchema.parse(rawInput);
  try { validateTechnicalDescription(input.description); } catch (error) { throw new ValidationError((error as Error).message); }
  const requestKey = createHash('sha256').update(`${userId}:${input.requestKey}`).digest('hex');
  const runtime = await (dependencies.runtime ?? new IntegrationSettingsService().getAiRuntime());
  const reservation = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${userId}`}))`;
    const partner = await tx.partnerProfile.findUnique({ where: { userId } });
    if (partner?.status !== 'APPROVED') throw new ForbiddenError('Aguarde a aprovação do cadastro.');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${KEY}))`;
    const current = await config(tx);
    const inputHash = createHash('sha256').update(`${PARTNER_AI_PROMPT_VERSION}:${PARTNER_AI_MODELS[current.provider]}:${input.description}`).digest('hex');
    const existing = await tx.partnerAiRun.findUnique({ where: { requestKey } });
    if (existing) {
      if (existing.inputHash !== inputHash) throw new ConflictError('Este envio já foi usado com outros dados ou configuração.');
      if (existing.status === 'SUCCEEDED') return { cached: partnerAiResultSchema.parse(existing.result) };
      throw new ConflictError(existing.status === 'RESERVED' ? 'Leitura em andamento. Aguarde antes de tentar novamente.' : 'Esta tentativa não concluiu a leitura. Confira os dados e inicie uma nova tentativa.');
    }
    if (!current.enabled) throw new ForbiddenError('A IA está desativada. Você pode preencher as medidas manualmente.');
    const key = current.provider === 'deepseek' ? runtime.deepseekApiKey : runtime.qwenApiKey;
    if (!key) throw new ConflictError('A loja precisa cadastrar a chave deste provedor. Use o preenchimento manual.');
    const today = new Date().toISOString().slice(0, 10); const month = today.slice(0, 7);
    if (await tx.partnerAiRun.count({ where: { partnerId: partner.id, day: today } }) >= current.dailyLimit) throw new ForbiddenError('Limite diário atingido. Continue com o preenchimento manual.');
    const cached = await tx.partnerAiRun.findFirst({ where: { partnerId: partner.id, inputHash, status: 'SUCCEEDED', createdAt: { gte: new Date(Date.now() - 86400000) } }, orderBy: { createdAt: 'desc' } });
    if (cached) {
      await tx.partnerAiRun.create({ data: { partnerId: partner.id, requestKey, inputHash, provider: current.provider, model: PARTNER_AI_MODELS[current.provider], promptVersion: PARTNER_AI_PROMPT_VERSION, month: new Date().toISOString().slice(0, 7), day: new Date().toISOString().slice(0, 10), reservedMicroUsd: 0n, chargedMicroUsd: 0n, inputRateMicroUsd: current.inputRateMicroUsd, outputRateMicroUsd: current.outputRateMicroUsd, status: 'SUCCEEDED', result: cached.result!, completedAt: new Date() } });
      return { cached: partnerAiResultSchema.parse(cached.result) };
    }
    // Config lock serializes every reservation, including concurrent users.
    const totals = await tx.partnerAiRun.aggregate({ where: { month }, _sum: { chargedMicroUsd: true } });
    const reserved = usageCost(6000, 512, current.inputRateMicroUsd, current.outputRateMicroUsd);
    if ((totals._sum.chargedMicroUsd ?? 0n) + reserved > BigInt(current.monthlyBudgetCents) * 10000n) throw new ForbiddenError('Limite mensal da IA atingido. Continue com o preenchimento manual.');
    const run = await tx.partnerAiRun.create({ data: { partnerId: partner.id, requestKey, inputHash, provider: current.provider, model: PARTNER_AI_MODELS[current.provider], promptVersion: PARTNER_AI_PROMPT_VERSION, month, day: today, reservedMicroUsd: reserved, chargedMicroUsd: reserved, inputRateMicroUsd: current.inputRateMicroUsd, outputRateMicroUsd: current.outputRateMicroUsd } });
    return { run, key, provider: current.provider };
  });
  if ('cached' in reservation) return { result: reservation.cached, cached: true };
  const attempt = await interpretTechnicalService(reservation.provider!, reservation.key!, input.description, dependencies.transport);
  const run = reservation.run!;
  const charged = attempt.usage ? usageCost(attempt.usage.promptTokens, attempt.usage.completionTokens, run.inputRateMicroUsd, run.outputRateMicroUsd) : run.reservedMicroUsd;
  // Reserve remains charged if process/network fails. No automatic paid retry.
  await prisma.partnerAiRun.update({ where: { id: run.id }, data: { status: attempt.result ? 'SUCCEEDED' : attempt.usage ? 'FAILED' : 'UNKNOWN', chargedMicroUsd: charged,
    promptTokens: attempt.usage?.promptTokens, completionTokens: attempt.usage?.completionTokens, durationMs: attempt.durationMs, errorCode: attempt.errorCode, completedAt: new Date(), ...(attempt.result ? { result: attempt.result } : {}) } });
  if (!attempt.result) throw new ConflictError('A IA não conseguiu ler o serviço. Confira a descrição ou preencha as medidas manualmente.');
  return { result: attempt.result, cached: false };
}
