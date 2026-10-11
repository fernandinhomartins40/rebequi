import type { ChannelCredentials, ConnectionResult } from './channel-adapter.js';
import { UnavailableChannelAdapter } from './unavailable-channel.adapter.js';
import { providerJson } from './provider-http.js';
import { sheinSignature } from './shein-signature.js';

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

export class CasasBahiaAdapter extends UnavailableChannelAdapter {
  async testConnection(credentials: ChannelCredentials = {}): Promise<ConnectionResult> {
    if (!credentials.clientId || !credentials.accessToken || !['homologation', 'production'].includes(credentials.environment)) return { ok: false, message: 'Cadastre Client ID, token do lojista e ambiente de homologação ou produção.' };
    try {
      const host = credentials.environment === 'production' ? 'https://api-mktplace.viavarejo.com.br' : 'https://api-mktplace-hlg.viavarejo.com.br';
      const data = await providerJson<{ valido?: boolean; conteudo?: { itens?: unknown[] } } | null>(`${host}/api/v4/api-front-products-v4/jersey/product/?pagina=1&itensPorPagina=1`, { headers: { Accept: 'application/json', client_id: credentials.clientId, access_token: credentials.accessToken } });
      if (data !== null && (data.valido !== true || !Array.isArray(data.conteudo?.itens))) return { ok: false, message: 'Casas Bahia não confirmou a consulta do catálogo.' };
      return { ok: true, message: `Acesso à Casas Bahia verificado em ${credentials.environment === 'production' ? 'produção' : 'homologação'}. Nenhuma oferta foi alterada.` };
    } catch { return { ok: false, message: 'Não foi possível consultar Casas Bahia. Confira token, integradora e ambiente liberado.' }; }
  }
}

export class SheinAdapter extends UnavailableChannelAdapter {
  async testConnection(credentials: ChannelCredentials = {}): Promise<ConnectionResult> {
    if (!credentials.openKeyId || !credentials.secretKey) return { ok: false, message: 'Cadastre Open Key ID e Secret Key decifrada da loja autorizada.' };
    try {
      const path = '/open-api/openapi-business-backend/query-store-info'; const timestamp = String(Date.now());
      const data = await providerJson<{ code?: string; info?: { storeInfo?: { supplierId?: string | number; storeStatus?: number | null } } }>(`https://openapi.sheincorp.com${path}`, { method: 'POST', body: '{}',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json;charset=UTF-8', 'x-lt-openKeyId': credentials.openKeyId, 'x-lt-timestamp': timestamp, 'x-lt-signature': sheinSignature(credentials.openKeyId, credentials.secretKey, path, timestamp) } });
      const store = data.info?.storeInfo;
      if (data.code !== '0' || !store?.supplierId) return { ok: false, message: 'SHEIN não confirmou a loja. Confira autorização, Secret Key decifrada e IP da VPS na lista permitida.' };
      if (store.storeStatus === 0) return { ok: false, message: 'A loja SHEIN está desativada.' };
      return { ok: true, externalId: String(store.supplierId), message: 'Loja verificada na SHEIN. As operações disponíveis dependem da modalidade autorizada.' };
    } catch { return { ok: false, message: 'Não foi possível consultar a SHEIN. Confira as chaves, a assinatura e as permissões da aplicação.' }; }
  }
}
