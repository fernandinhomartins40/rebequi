import type { ChannelType } from '@prisma/client';
import type { ChannelAdapter } from './channel-adapter.js';
import { ManualChannelAdapter } from './manual-channel.adapter.js';
import { MercadoLivreAdapter } from './mercado-livre.adapter.js';
import { UnavailableChannelAdapter } from './unavailable-channel.adapter.js';
import { AmazonAdapter, AmericanasAdapter, CasasBahiaAdapter, MagaluAdapter, SheinAdapter } from './account-adapters.js';

const manualAdapter = new ManualChannelAdapter();
const mercadoLivreAdapter = new MercadoLivreAdapter();
const unavailableAdapter = new UnavailableChannelAdapter();
const amazonAdapter = new AmazonAdapter();
const americanasAdapter = new AmericanasAdapter();
const magaluAdapter = new MagaluAdapter();
const casasBahiaAdapter = new CasasBahiaAdapter();
const sheinAdapter = new SheinAdapter();

/**
 * Resolve o adaptador por capacidade. Somente MANUAL admite controle interno;
 * marketplaces sem conector retornam indisponibilidade sem confirmar efeitos.
 */
export function getChannelAdapter(type: ChannelType): ChannelAdapter {
  switch (type) {
    case 'MERCADO_LIVRE':
      return mercadoLivreAdapter;
    case 'MANUAL':
      return manualAdapter;
    case 'SHOPEE':
      return unavailableAdapter;
    case 'AMAZON':
      return amazonAdapter;
    case 'MAGALU':
      return magaluAdapter;
    case 'AMERICANAS':
      return americanasAdapter;
    case 'CASAS_BAHIA':
      return casasBahiaAdapter;
    case 'SHEIN':
      return sheinAdapter;
    default:
      return unavailableAdapter;
  }
}

export * from './channel-adapter.js';
