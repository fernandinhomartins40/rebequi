import type { ChannelAdapter, ConnectionResult, PublishResult, SyncResult } from './channel-adapter.js';

/** An unimplemented provider must never report a local snapshot as remote success. */
export class UnavailableChannelAdapter implements ChannelAdapter {
  private result() {
    return { ok: false, message: 'Este canal aguarda integração e autorização oficial. Nenhuma alteração foi enviada ao marketplace.' };
  }
  async testConnection(): Promise<ConnectionResult> { return this.result(); }
  async publishListing(): Promise<PublishResult> { return this.result(); }
  async syncListing(): Promise<SyncResult> { return this.result(); }
  async removeListing(): Promise<SyncResult> { return this.result(); }
}
