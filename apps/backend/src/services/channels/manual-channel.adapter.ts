import type {
  ChannelAdapter,
  ChannelCredentials,
  ConnectionResult,
  ListingProductSnapshot,
  PublishResult,
  SyncResult,
} from './channel-adapter.js';

/**
 * Canal "manual": o lojista controla o anúncio no marketplace à mão, e o sistema
 * só guarda o vínculo e o snapshot de preço/estoque para avisar quando a loja
 * mudou. Não chama API externa nenhuma — funciona imediatamente, sem credenciais,
 * e serve de base enquanto integrações reais não estão conectadas.
 */
export class ManualChannelAdapter implements ChannelAdapter {
  async testConnection(_credentials: ChannelCredentials): Promise<ConnectionResult> {
    return { ok: true, message: 'Canal manual pronto para uso (sem integração automática).' };
  }

  async publishListing(_credentials: ChannelCredentials, product: ListingProductSnapshot): Promise<PublishResult> {
    return {
      ok: true,
      message: `Anúncio de "${product.name}" registrado. Publique manualmente no marketplace e cole o link, se desejar.`,
      externalListingId: null,
      externalUrl: null,
    };
  }

  async syncListing(): Promise<SyncResult> {
    return { ok: true, message: 'Preço e estoque atualizados no controle interno. Ajuste manualmente no marketplace.' };
  }

  async removeListing(): Promise<SyncResult> {
    return { ok: true, message: 'Anúncio removido do controle interno.' };
  }
}
