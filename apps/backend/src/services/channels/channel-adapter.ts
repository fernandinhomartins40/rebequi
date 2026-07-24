/**
 * Channel adapters — a camada que isola o restante do sistema das APIs de cada
 * marketplace. Cada canal externo implementa esta interface; o ChannelService
 * fala sempre com a interface, nunca com a API concreta. Assim, plugar o
 * Mercado Livre (ou Shopee/Amazon) depois é só trocar o adaptador, sem tocar no
 * fluxo de publicação/sincronização.
 */

export type ChannelCredentials = Record<string, string>;

export type ListingProductSnapshot = {
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  description: string | null;
};

export type ConnectionResult = {
  ok: boolean;
  message: string;
  externalId?: string | null;
};

export type PublishResult = {
  ok: boolean;
  message: string;
  externalListingId?: string | null;
  externalUrl?: string | null;
};

export type SyncResult = {
  ok: boolean;
  message: string;
};

export interface ChannelAdapter {
  /** Valida as credenciais e confirma que dá para operar o canal. */
  testConnection(credentials: ChannelCredentials): Promise<ConnectionResult>;
  /** Publica (ou cria) um anúncio para o produto no canal. */
  publishListing(credentials: ChannelCredentials, product: ListingProductSnapshot): Promise<PublishResult>;
  /** Envia preço/estoque atuais da loja (fonte única) para o anúncio existente. */
  syncListing(
    credentials: ChannelCredentials,
    externalListingId: string | null,
    product: ListingProductSnapshot
  ): Promise<SyncResult>;
  /** Remove/pausa o anúncio no canal. */
  removeListing(credentials: ChannelCredentials, externalListingId: string | null): Promise<SyncResult>;
}
