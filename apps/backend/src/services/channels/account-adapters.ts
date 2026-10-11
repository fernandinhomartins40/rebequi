import type { ChannelCredentials, ConnectionResult } from './channel-adapter.js';
import { UnavailableChannelAdapter } from './unavailable-channel.adapter.js';
import { providerJson } from './provider-http.js';

export class MagaluAdapter extends UnavailableChannelAdapter {
  async testConnection(credentials: ChannelCredentials = {}): Promise<ConnectionResult> {
    if (!credentials.accessToken) return { ok: false, message: 'Autorize a loja no ID Magalu antes de testar.' };
    try {
      const seller = await providerJson<unknown>('https://api.magalu.com/seller/v1/portfolios/me', { headers: { Authorization: `Bearer ${credentials.accessToken}`, Accept: 'application/json' } });
      if (!seller || typeof seller !== 'object' || Array.isArray(seller)) return { ok: false, message: 'O Magalu retornou uma conta em formato inesperado.' };
      return { ok: true, message: 'Acesso ao portfólio do Magalu verificado. Recursos comerciais dependem dos escopos autorizados.' };
    } catch { return { ok: false, message: 'Não foi possível consultar a loja no Magalu. Confira a autorização e os escopos.' }; }
  }
}

export class AmericanasAdapter extends UnavailableChannelAdapter {
  async testConnection(credentials: ChannelCredentials = {}): Promise<ConnectionResult> {
    if (!credentials.userEmail || !credentials.apiKey || !credentials.accountManagerKey) return { ok: false, message: 'Cadastre e-mail, API Key e Account Manager Key da SkyHub.' };
    try {
      const statuses = await providerJson<unknown>('https://api.skyhub.com.br/statuses', { headers: { Accept: 'application/json', 'X-User-Email': credentials.userEmail, 'X-Api-Key': credentials.apiKey, 'X-Accountmanager-Key': credentials.accountManagerKey } });
      if (!Array.isArray(statuses)) return { ok: false, message: 'A SkyHub retornou os status em formato inesperado.' };
      return { ok: true, message: 'Acesso à API SkyHub verificado. Não foram alterados produtos ou pedidos.' };
    } catch { return { ok: false, message: 'A SkyHub não confirmou o acesso. Confira as chaves e a homologação da integradora.' }; }
  }
}

export class AmazonAdapter extends UnavailableChannelAdapter {
  async testConnection(credentials: ChannelCredentials = {}): Promise<ConnectionResult> {
    if (!credentials.accessToken || !credentials.sellerId || !credentials.marketplaceId) return { ok: false, message: 'Cadastre as credenciais LWA, Seller ID e Marketplace ID do Brasil.' };
    try {
      const data = await providerJson<{ payload?: Array<{ marketplace?: { id?: string; countryCode?: string }; participation?: { isParticipating?: boolean } }> }>('https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations', { headers: { Accept: 'application/json', 'x-amz-access-token': credentials.accessToken, 'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), 'User-Agent': 'Rebequi/1.0 (Language=TypeScript)' } });
      const brazil = data.payload?.find(row => row.marketplace?.id === credentials.marketplaceId && row.marketplace.countryCode === 'BR');
      if (!brazil?.participation?.isParticipating) return { ok: false, message: 'Esta autorização não confirmou participação no marketplace brasileiro informado.' };
      return { ok: true, message: 'Participação na Amazon Brasil verificada. Publicação e estoque aguardam configuração comercial.' };
    } catch { return { ok: false, message: 'Não foi possível consultar a Amazon. Confira as credenciais, as roles aprovadas e o limite de consultas.' }; }
  }
}
