import { ChannelStatus, ChannelType, ListingSyncStatus } from '@/types';

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  [ChannelType.MERCADO_LIVRE]: 'Mercado Livre',
  [ChannelType.SHOPEE]: 'Shopee',
  [ChannelType.AMAZON]: 'Amazon',
  [ChannelType.MANUAL]: 'Canal manual',
};

export function getChannelTypeLabel(type: ChannelType | string) {
  return CHANNEL_TYPE_LABELS[type as ChannelType] ?? type;
}

/** Marketplaces com integração automática real; os demais operam no modo manual. */
export const AUTOMATED_CHANNEL_TYPES: ChannelType[] = [ChannelType.MERCADO_LIVRE];

export function isAutomatedChannel(type: ChannelType | string) {
  return AUTOMATED_CHANNEL_TYPES.includes(type as ChannelType);
}

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  [ChannelStatus.DISCONNECTED]: 'Desconectado',
  [ChannelStatus.CONNECTED]: 'Conectado',
  [ChannelStatus.ERROR]: 'Erro',
};

export function getChannelStatusLabel(status: ChannelStatus | string) {
  return CHANNEL_STATUS_LABELS[status as ChannelStatus] ?? status;
}

export function getChannelStatusTone(status: ChannelStatus | string) {
  switch (status) {
    case ChannelStatus.CONNECTED:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case ChannelStatus.ERROR:
      return 'border-red-200 bg-red-50 text-red-700';
    case ChannelStatus.DISCONNECTED:
    default:
      return 'border-border/60 bg-muted text-muted-foreground';
  }
}

export const LISTING_STATUS_LABELS: Record<ListingSyncStatus, string> = {
  [ListingSyncStatus.DRAFT]: 'Rascunho',
  [ListingSyncStatus.SYNCED]: 'Em dia',
  [ListingSyncStatus.OUT_OF_SYNC]: 'Defasado',
  [ListingSyncStatus.ERROR]: 'Erro',
};

export function getListingStatusLabel(status: ListingSyncStatus | string) {
  return LISTING_STATUS_LABELS[status as ListingSyncStatus] ?? status;
}

export function getListingStatusTone(status: ListingSyncStatus | string) {
  switch (status) {
    case ListingSyncStatus.SYNCED:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case ListingSyncStatus.OUT_OF_SYNC:
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case ListingSyncStatus.ERROR:
      return 'border-red-200 bg-red-50 text-red-700';
    case ListingSyncStatus.DRAFT:
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
