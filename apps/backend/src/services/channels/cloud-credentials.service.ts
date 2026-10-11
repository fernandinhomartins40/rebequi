import { prisma } from '../../lib/prisma.js';
import { decryptSecret, encryptSecret } from '../../utils/crypto.util.js';
import { ValidationError } from '../../utils/errors.util.js';
import type { ChannelCredentials } from './channel-adapter.js';
import { providerJson } from './provider-http.js';

export async function getCloudCredentials(channelId: string, type: 'MAGALU' | 'AMAZON'): Promise<ChannelCredentials> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM channels WHERE id = ${channelId} FOR UPDATE`;
    const channel = await tx.channel.findUnique({ where: { id: channelId } });
    if (!channel?.isActive || channel.type !== type || !channel.credentials) throw new ValidationError('Configure e ative esta conta antes de testar');
    const credentials = JSON.parse(decryptSecret(channel.credentials)) as ChannelCredentials;
    if (credentials.accessToken && Number(credentials.expiresAt) > Date.now() + 60_000) return credentials;
    if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) throw new ValidationError(type === 'MAGALU' ? 'Autorize a conta no ID Magalu' : 'Cadastre Client ID, Client secret e Refresh token do Login with Amazon');
    const tokens = await providerJson<{ access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }>(type === 'MAGALU' ? 'https://id.magalu.com/oauth/token' : 'https://api.amazon.com/auth/o2/token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: credentials.refreshToken }),
    }).catch(() => { throw new ValidationError('A autorização não pôde ser renovada. Confira as credenciais e autorize novamente.'); });
    if (!tokens.access_token || !Number.isFinite(tokens.expires_in) || tokens.expires_in! <= 0) throw new ValidationError('O provedor não retornou uma autorização válida');
    const next = { ...credentials, accessToken: tokens.access_token, refreshToken: tokens.refresh_token || credentials.refreshToken,
      expiresAt: String(Date.now() + tokens.expires_in! * 1000), scopes: tokens.scope ?? credentials.scopes ?? '' };
    await tx.channel.update({ where: { id: channelId }, data: { credentials: encryptSecret(JSON.stringify(next)) } });
    return next;
  }, { timeout: 20_000, maxWait: 5000 });
}
