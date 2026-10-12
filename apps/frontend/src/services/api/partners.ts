import type { PartnerFiltersInput, PartnerProfileInput, ReviewPartnerInput } from '@rebequi/shared/schemas';
import type { PartnerList, PartnerProfile } from '@rebequi/shared/types';
import { apiFetch } from './client';

export const getPartnerProfile = async () => (await apiFetch<{ data: PartnerProfile | null }>('/partners/me')).data;
export const savePartnerProfile = async (input: PartnerProfileInput) => (await apiFetch<{ data: PartnerProfile }>('/partners/me', { method: 'PUT', body: JSON.stringify(input) })).data;
export const listPartners = async (filters: Partial<PartnerFiltersInput> = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  return (await apiFetch<{ data: PartnerList }>(`/partners/admin/list?${query}`)).data;
};
export const reviewPartner = async (id: string, input: ReviewPartnerInput) => (await apiFetch<{ data: PartnerProfile }>(`/partners/admin/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(input) })).data;
