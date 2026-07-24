export enum ChannelType {
  MERCADO_LIVRE = 'MERCADO_LIVRE',
  SHOPEE = 'SHOPEE',
  AMAZON = 'AMAZON',
  MANUAL = 'MANUAL',
}

export enum ChannelStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export enum ListingSyncStatus {
  DRAFT = 'DRAFT',
  SYNCED = 'SYNCED',
  OUT_OF_SYNC = 'OUT_OF_SYNC',
  ERROR = 'ERROR',
}

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  externalId?: string | null;
  isActive: boolean;
  hasCredentials: boolean;
  lastSyncedAt?: Date | string | null;
  lastError?: string | null;
  listingCounts: {
    total: number;
    synced: number;
    outOfSync: number;
    draft: number;
    error: number;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChannelListing {
  id: string;
  channelId: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    price: number;
    stock: number;
    isActive: boolean;
    imageUrl?: string | null;
  } | null;
  externalListingId?: string | null;
  externalUrl?: string | null;
  syncStatus: ListingSyncStatus;
  publishedPrice?: number | null;
  publishedStock?: number | null;
  lastSyncedAt?: Date | string | null;
  lastError?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChannelResponse {
  channels: Channel[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface ChannelListingResponse {
  listings: ChannelListing[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface CreateChannelDTO {
  type: ChannelType;
  name: string;
  externalId?: string;
  credentials?: Record<string, string>;
}

export interface UpdateChannelDTO {
  name?: string;
  externalId?: string | null;
  isActive?: boolean;
  credentials?: Record<string, string>;
}

export interface ChannelFilters {
  type?: ChannelType;
  status?: ChannelStatus;
  page?: number;
  limit?: number;
}

export interface PublishListingDTO {
  productId: string;
}

export interface ListingFilters {
  search?: string;
  syncStatus?: ListingSyncStatus;
  page?: number;
  limit?: number;
}

export interface ChannelSyncResult {
  channelId: string;
  synced: number;
  failed: number;
  message: string;
}
