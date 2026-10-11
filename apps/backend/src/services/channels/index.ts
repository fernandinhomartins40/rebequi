import type { ChannelType } from '@prisma/client';
import type { ChannelAdapter } from './channel-adapter.js';
import { ManualChannelAdapter } from './manual-channel.adapter.js';
import { MercadoLivreAdapter } from './mercado-livre.adapter.js';
import { UnavailableChannelAdapter } from './unavailable-channel.adapter.js';

const manualAdapter = new ManualChannelAdapter();
const mercadoLivreAdapter = new MercadoLivreAdapter();
const unavailableAdapter = new UnavailableChannelAdapter();

/**
 * Resolve o adaptador correto para um tipo de canal. Marketplaces sem adaptador
 * real ainda caem no manual, mantendo o vínculo/snapshot funcionando até a
 * integração automática ser conectada.
 */
export function getChannelAdapter(type: ChannelType): ChannelAdapter {
  switch (type) {
    case 'MERCADO_LIVRE':
      return mercadoLivreAdapter;
    case 'MANUAL':
      return manualAdapter;
    case 'SHOPEE':
    case 'AMAZON':
    default:
      return unavailableAdapter;
  }
}

export * from './channel-adapter.js';
