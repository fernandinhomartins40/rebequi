import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { decryptSecret, encryptSecret } from '../../utils/crypto.util.js';
import { ValidationError } from '../../utils/errors.util.js';
import type { ChannelCredentials } from './channel-adapter.js';
import { MagaluAdapter } from './account-adapters.js';
import { providerJson } from './provider-http.js';

const CALLBACK = 'https://www.rebequi.com.br/api/channels/oauth/magalu/callback';
const stateKey = (state: string) => `channel.oauth.magalu.${createHash('sha256').update(state).digest('hex')}`;

export async function beginMagaluAuthorization(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel?.isActive || channel.type !== 'MAGALU' || !channel.credentials) throw new ValidationError('Configure e ative a conta Magalu antes de autorizar');
  const credentials = JSON.parse(decryptSecret(channel.credentials)) as ChannelCredentials;
  if (!credentials.clientId || !credentials.clientSecret) throw new ValidationError('Cadastre o Client ID e o Client secret do Magalu');
  const state = randomBytes(32).toString('hex');
  await prisma.setting.create({ data: { key: stateKey(state), isSecret: true,
    value: encryptSecret(JSON.stringify({ channelId, userId, expiresAt: Date.now() + 600_000 })) } });
  const url = new URL('https://id.magalu.com/login');
  url.search = new URLSearchParams({ client_id: credentials.clientId, redirect_uri: CALLBACK,
    scope: credentials.scopes || 'open:portfolio:read', response_type: 'code', choose_tenants: 'true', state }).toString();
  return { url: url.href, callbackUrl: CALLBACK };
}

export async function finishMagaluAuthorization(state: string, code: string, userId: string) {
  if (!/^[a-f0-9]{64}$/.test(state) || !code || code.length > 2048) throw new ValidationError('Autorização inválida. Autorize novamente.');
  const saved = await prisma.setting.findUnique({ where: { key: stateKey(state) } });
  if (!saved) throw new ValidationError('Autorização expirada ou já utilizada');
  const context = JSON.parse(decryptSecret(saved.value)) as { channelId: string; userId: string; expiresAt: number };
  if (context.userId !== userId || context.expiresAt < Date.now()) throw new ValidationError('Autorização inválida ou expirada');
  if ((await prisma.setting.deleteMany({ where: { key: saved.key, value: saved.value } })).count !== 1) throw new ValidationError('Autorização já utilizada');
  const channel = await prisma.channel.findUnique({ where: { id: context.channelId } });
  if (!channel?.isActive || channel.type !== 'MAGALU' || !channel.credentials) throw new ValidationError('Conta indisponível');
  const credentials = JSON.parse(decryptSecret(channel.credentials)) as ChannelCredentials;
  const tokens = await providerJson<{ access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }>('https://id.magalu.com/oauth/token', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: credentials.clientId, client_secret: credentials.clientSecret, redirect_uri: CALLBACK, code, grant_type: 'authorization_code' }),
  }).catch(() => { throw new ValidationError('O Magalu recusou a autorização. Confira a aplicação e tente novamente.'); });
  if (!tokens.access_token || !tokens.refresh_token || !Number.isFinite(tokens.expires_in) || tokens.expires_in! <= 0) throw new ValidationError('O Magalu retornou uma autorização incompleta');
  const verified = await new MagaluAdapter().testConnection({ accessToken: tokens.access_token });
  if (!verified.ok) throw new ValidationError(verified.message);
  const updated = await prisma.channel.updateMany({ where: { id: channel.id, isActive: true, credentials: channel.credentials }, data: {
    credentials: encryptSecret(JSON.stringify({ ...credentials, accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
      expiresAt: String(Date.now() + tokens.expires_in! * 1000), scopes: tokens.scope ?? credentials.scopes ?? '' })), status: 'CONNECTED', lastError: null,
  } });
  if (!updated.count) throw new ValidationError('A configuração mudou durante a autorização. Autorize novamente.');
  return channel.id;
}
