import type {
  Channel,
  ChannelFilters,
  ChannelListing,
  ChannelListingResponse,
  ChannelResponse,
  ChannelSyncResult,
  CreateChannelDTO,
  ListingFilters,
  PublishListingDTO,
  UpdateChannelDTO,
} from '@/types';
import { apiFetch } from './client';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return typeof payload === 'object' && payload !== null && 'success' in payload;
}

function unwrapData<T>(payload: unknown): T {
  if (isApiResponse<T>(payload)) {
    if (!payload.success) throw new Error(payload.error || payload.message || 'Erro na API');
    if (payload.data === undefined) throw new Error('Resposta inesperada da API');
    return payload.data;
  }
  return payload as T;
}

function unwrapPaginatedChannels(payload: unknown): ChannelResponse {
  if (isApiResponse<Channel[]>(payload)) {
    if (!payload.success) throw new Error(payload.error || payload.message || 'Erro na API');
    const channels = (payload.data as Channel[]) ?? [];
    return {
      channels,
      limit: payload.pagination?.limit ?? channels.length,
      page: payload.pagination?.page ?? 1,
      total: payload.pagination?.total ?? channels.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }
  return payload as ChannelResponse;
}

function unwrapPaginatedListings(payload: unknown): ChannelListingResponse {
  if (isApiResponse<ChannelListing[]>(payload)) {
    if (!payload.success) throw new Error(payload.error || payload.message || 'Erro na API');
    const listings = (payload.data as ChannelListing[]) ?? [];
    return {
      listings,
      limit: payload.pagination?.limit ?? listings.length,
      page: payload.pagination?.page ?? 1,
      total: payload.pagination?.total ?? listings.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }
  return payload as ChannelListingResponse;
}

export async function fetchChannels(filters?: ChannelFilters): Promise<ChannelResponse> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  const response = await apiFetch<ApiResponse<Channel[]> | ChannelResponse>(`/channels/admin/list${qs ? `?${qs}` : ''}`);
  return unwrapPaginatedChannels(response);
}

export async function fetchChannelById(id: string): Promise<Channel> {
  const response = await apiFetch<ApiResponse<Channel> | Channel>(`/channels/admin/${id}`);
  return unwrapData<Channel>(response);
}

export async function createChannel(payload: CreateChannelDTO): Promise<Channel> {
  const response = await apiFetch<ApiResponse<Channel> | Channel>('/channels/admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapData<Channel>(response);
}

export async function updateChannel(id: string, payload: UpdateChannelDTO): Promise<Channel> {
  const response = await apiFetch<ApiResponse<Channel> | Channel>(`/channels/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return unwrapData<Channel>(response);
}

export async function deleteChannel(id: string): Promise<{ deleted: boolean }> {
  const response = await apiFetch<ApiResponse<{ deleted: boolean }> | { deleted: boolean }>(`/channels/admin/${id}`, {
    method: 'DELETE',
  });
  return unwrapData<{ deleted: boolean }>(response);
}

export async function testChannel(id: string): Promise<{ ok: boolean; message: string }> {
  const response = await apiFetch<ApiResponse<{ ok: boolean; message: string }> | { ok: boolean; message: string }>(
    `/channels/admin/${id}/test`,
    { method: 'POST' }
  );
  return unwrapData<{ ok: boolean; message: string }>(response);
}

export async function syncChannel(id: string): Promise<ChannelSyncResult> {
  const response = await apiFetch<ApiResponse<ChannelSyncResult> | ChannelSyncResult>(`/channels/admin/${id}/sync`, {
    method: 'POST',
  });
  return unwrapData<ChannelSyncResult>(response);
}

export async function fetchChannelListings(channelId: string, filters?: ListingFilters): Promise<ChannelListingResponse> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.syncStatus) params.set('syncStatus', filters.syncStatus);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  const response = await apiFetch<ApiResponse<ChannelListing[]> | ChannelListingResponse>(
    `/channels/admin/${channelId}/listings${qs ? `?${qs}` : ''}`
  );
  return unwrapPaginatedListings(response);
}

export async function publishListing(
  channelId: string,
  payload: PublishListingDTO
): Promise<{ listing: ChannelListing; message: string }> {
  const response = await apiFetch<ApiResponse<{ listing: ChannelListing; message: string }> | { listing: ChannelListing; message: string }>(
    `/channels/admin/${channelId}/listings`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
  return unwrapData<{ listing: ChannelListing; message: string }>(response);
}

export async function syncListing(
  channelId: string,
  listingId: string
): Promise<{ listing: ChannelListing; message: string }> {
  const response = await apiFetch<ApiResponse<{ listing: ChannelListing; message: string }> | { listing: ChannelListing; message: string }>(
    `/channels/admin/${channelId}/listings/${listingId}/sync`,
    { method: 'POST' }
  );
  return unwrapData<{ listing: ChannelListing; message: string }>(response);
}

export async function removeListing(channelId: string, listingId: string): Promise<{ deleted: boolean }> {
  const response = await apiFetch<ApiResponse<{ deleted: boolean }> | { deleted: boolean }>(
    `/channels/admin/${channelId}/listings/${listingId}`,
    { method: 'DELETE' }
  );
  return unwrapData<{ deleted: boolean }>(response);
}
