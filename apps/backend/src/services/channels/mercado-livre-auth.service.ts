import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { encryptSecret, decryptSecret } from '../../utils/crypto.util.js';
import { NotFoundError, ValidationError } from '../../utils/errors.util.js';
import type { ChannelCredentials } from './channel-adapter.js';
import { MercadoLivreAdapter } from './mercado-livre.adapter.js';

const CALLBACK = 'https://www.rebequi.com.br/api/channels/oauth/mercado-livre/callback';
const stateKey = (state: string) => `channel.oauth.${createHash('sha256').update(state).digest('hex')}`;

export async function beginMercadoLivreAuthorization(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.type !== 'MERCADO_LIVRE') throw new NotFoundError('Canal Mercado Livre não encontrado');
  if (!channel.isActive) throw new ValidationError('Ative o canal para conectar sua conta');
  const credentials = channel.credentials ? JSON.parse(decryptSecret(channel.credentials)) as ChannelCredentials : {};
  if (!credentials.clientId || !credentials.clientSecret) throw new ValidationError('Cadastre o ID e o segredo da aplicação antes de autorizar');
  const state = randomBytes(32).toString('hex');
  const verifier = randomBytes(32).toString('base64url');
  await prisma.setting.create({ data: { key: stateKey(state), isSecret: true,
    value: encryptSecret(JSON.stringify({ channelId, userId, verifier, expiresAt: Date.now() + 600_000 })) } });
  const url = new URL('https://auth.mercadolivre.com.br/authorization');
  url.search = new URLSearchParams({ response_type: 'code', client_id: credentials.clientId,
    redirect_uri: CALLBACK, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  return { url: url.href, callbackUrl: CALLBACK };
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; user_id?: number; scope?: string };

export async function finishMercadoLivreAuthorization(state: string, code: string, userId: string) {
  if (!/^[a-f0-9]{64}$/.test(state) || !code || code.length > 2048) throw new ValidationError('Autorização inválida. Conecte novamente.');
  const stored = await prisma.setting.findUnique({ where: { key: stateKey(state) } });
  if (!stored) throw new ValidationError('Autorização expirada ou já utilizada');
  const context = JSON.parse(decryptSecret(stored.value)) as { channelId: string; userId: string; verifier: string; expiresAt: number };
  if (context.userId !== userId || context.expiresAt < Date.now()) throw new ValidationError('Autorização inválida ou expirada');
  const consumed = await prisma.setting.deleteMany({ where: { key: stored.key, value: stored.value } });
  if (consumed.count !== 1) throw new ValidationError('Autorização já utilizada');
  const channel = await prisma.channel.findUnique({ where: { id: context.channelId } });
  if (!channel?.isActive || channel.type !== 'MERCADO_LIVRE' || !channel.credentials) throw new ValidationError('Canal indisponível');
  const credentials = JSON.parse(decryptSecret(channel.credentials)) as ChannelCredentials;
  const response = await fetch('https://api.mercadolibre.com/oauth/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12_000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: credentials.clientId,
      client_secret: credentials.clientSecret, redirect_uri: CALLBACK, code, code_verifier: context.verifier }) });
  if (!response.ok) throw new ValidationError('O Mercado Livre recusou a autorização. Confira a aplicação e tente novamente.');
  const tokens = await response.json() as TokenResponse;
  if (!tokens.access_token || !tokens.refresh_token || !tokens.user_id || !tokens.expires_in) throw new ValidationError('Resposta de autorização incompleta');
  const verified = await new MercadoLivreAdapter().testConnection({ accessToken: tokens.access_token });
  if (!verified.ok || verified.externalId !== String(tokens.user_id)) throw new ValidationError(verified.message);
  const updated = await prisma.channel.updateMany({ where: { id: channel.id, credentials: channel.credentials, isActive: true }, data: {
    credentials: encryptSecret(JSON.stringify({ ...credentials, accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
      expiresAt: String(Date.now() + tokens.expires_in * 1000), scopes: tokens.scope ?? '' })),
    externalId: String(tokens.user_id), status: 'CONNECTED', lastError: null,
  } });
  if (updated.count !== 1) throw new ValidationError('Configuração alterada durante a autorização. Conecte novamente.');
  return channel.id;
}

/** Coordinate rotating refresh tokens under a DB row lock; no tokens leave the backend. */
export async function getMercadoLivreCredentials(channelId: string): Promise<ChannelCredentials> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM channels WHERE id = ${channelId} FOR UPDATE`;
    const channel = await tx.channel.findUnique({ where: { id: channelId } });
    if (!channel?.isActive || !channel.credentials) throw new ValidationError('Conecte sua conta do Mercado Livre');
    const credentials = JSON.parse(decryptSecret(channel.credentials)) as ChannelCredentials;
    if (!credentials.accessToken) throw new ValidationError('Autorize a conta do Mercado Livre');
    if (!credentials.expiresAt || Number(credentials.expiresAt) > Date.now() + 60_000) return credentials;
    if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) throw new ValidationError('Conecte novamente para renovar a autorização');
    const response = await fetch('https://api.mercadolibre.com/oauth/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: credentials.clientId,
        client_secret: credentials.clientSecret, refresh_token: credentials.refreshToken }) });
    if (!response.ok) throw new ValidationError('Autorização não pôde ser renovada. Reconecte sua conta.');
    const tokens = await response.json() as TokenResponse;
    if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) throw new ValidationError('Renovação incompleta');
    const next = { ...credentials, accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
      expiresAt: String(Date.now() + tokens.expires_in * 1000), scopes: tokens.scope ?? credentials.scopes };
    await tx.channel.update({ where: { id: channelId }, data: { credentials: encryptSecret(JSON.stringify(next)) } });
    return next;
  }, { timeout: 20_000, maxWait: 5000 });
}
