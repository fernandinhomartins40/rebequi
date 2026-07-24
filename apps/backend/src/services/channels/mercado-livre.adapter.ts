import type {
  ChannelAdapter,
  ChannelCredentials,
  ConnectionResult,
  ListingProductSnapshot,
  PublishResult,
  SyncResult,
} from './channel-adapter.js';

/**
 * Adaptador do Mercado Livre — ESQUELETO.
 *
 * A estrutura de publicação/sincronização já está pronta e agnóstica; falta
 * apenas plugar a API real quando as credenciais existirem. Para ativar:
 *   1. Criar app em https://developers.mercadolibre.com.br e obter clientId/clientSecret.
 *   2. Implementar o fluxo OAuth (authorization code) e guardar o accessToken/refreshToken
 *      nas credenciais do canal.
 *   3. Trocar os retornos abaixo pelas chamadas reais:
 *      - testConnection  → GET /users/me
 *      - publishListing  → POST /items
 *      - syncListing     → PUT /items/{id} (price, available_quantity)
 *      - removeListing   → PUT /items/{id} (status: "closed")
 *
 * Enquanto não implementado, sinaliza claramente que precisa de configuração,
 * em vez de falhar de forma silenciosa.
 */
export class MercadoLivreAdapter implements ChannelAdapter {
  private requiresSetup(): string {
    return 'Integração com o Mercado Livre ainda não configurada. Conecte a conta (OAuth) nas configurações do canal.';
  }

  private hasToken(credentials: ChannelCredentials): boolean {
    return Boolean(credentials.accessToken);
  }

  async testConnection(credentials: ChannelCredentials): Promise<ConnectionResult> {
    if (!this.hasToken(credentials)) {
      return { ok: false, message: this.requiresSetup() };
    }
    // TODO: GET https://api.mercadolibre.com/users/me com Bearer accessToken.
    return {
      ok: false,
      message: 'Credenciais recebidas, mas a chamada real ao Mercado Livre ainda não foi implementada.',
    };
  }

  async publishListing(credentials: ChannelCredentials, _product: ListingProductSnapshot): Promise<PublishResult> {
    if (!this.hasToken(credentials)) {
      return { ok: false, message: this.requiresSetup() };
    }
    return { ok: false, message: 'Publicação no Mercado Livre ainda não implementada.' };
  }

  async syncListing(
    credentials: ChannelCredentials,
    _externalListingId: string | null,
    _product: ListingProductSnapshot
  ): Promise<SyncResult> {
    if (!this.hasToken(credentials)) {
      return { ok: false, message: this.requiresSetup() };
    }
    return { ok: false, message: 'Sincronização com o Mercado Livre ainda não implementada.' };
  }

  async removeListing(credentials: ChannelCredentials, _externalListingId: string | null): Promise<SyncResult> {
    if (!this.hasToken(credentials)) {
      return { ok: false, message: this.requiresSetup() };
    }
    return { ok: false, message: 'Remoção no Mercado Livre ainda não implementada.' };
  }
}
