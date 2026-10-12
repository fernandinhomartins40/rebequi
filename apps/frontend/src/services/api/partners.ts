import type { PartnerFiltersInput, PartnerProfileInput, ReviewPartnerInput, ProjectInput, TechnicalParameters, TechnicalSpecInput, CreateEstimateInput, LaborQuoteInput } from '@rebequi/shared/schemas';
import type { calculateMaterials } from '@rebequi/shared/utils';
import type { PartnerList, PartnerProfile } from '@rebequi/shared/types';
import { apiFetch } from './client';

export const getPartnerProfile = async () => (await apiFetch<{ data: PartnerProfile | null }>('/partners/me')).data;
export const savePartnerProfile = async (input: PartnerProfileInput) => (await apiFetch<{ data: PartnerProfile }>('/partners/me', { method: 'PUT', body: JSON.stringify(input) })).data;
export const listPartners = async (filters: Partial<PartnerFiltersInput> = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  return (await apiFetch<{ data: PartnerList }>(`/partners/admin/list?${query}`)).data;
};
export const reviewPartner = async (id: string, input: ReviewPartnerInput) => (await apiFetch<{ data: PartnerProfile }>(`/partners/admin/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(input) })).data;

export type EstimateResult = ReturnType<typeof calculateMaterials> & { productId: string; productName: string; sourceUrl: string; specVersion: number; unitPriceAtCalculation: number; availableStockAtCalculation: number; checkedAt: string };
export type SavedEstimate = { id: string; result: EstimateResult; quoteId: string | null; createdAt: string };
export type PartnerProject = Omit<ProjectInput, 'expectedVersion' | 'requestKey'> & { id: string; version: number; updatedAt: string; estimates?: SavedEstimate[] };
export type CalculationProduct = { id: string; name: string; price: number; availableStock: number; technicalSpec: { parameters: TechnicalParameters; sourceUrl: string; version: number } };
export type TechnicalSpec = { productId: string; parameters: TechnicalParameters; sourceUrl: string; version: number; checkedAt: string };
export const listProjects = async (page = 1) => (await apiFetch<{ data: { projects: PartnerProject[]; total: number; page: number; totalPages: number } }>(`/partners/projects?page=${page}`)).data;
export const getProject = async (id: string) => (await apiFetch<{ data: PartnerProject }>(`/partners/projects/${encodeURIComponent(id)}`)).data;
export const saveProject = async (id: string | undefined, input: ProjectInput) => (await apiFetch<{ data: PartnerProject }>(`/partners/projects${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) })).data;
export const getTechnicalSpec = async (id: string) => (await apiFetch<{ data: TechnicalSpec | null }>(`/products/admin/${encodeURIComponent(id)}/technical-spec`)).data;
export const saveTechnicalSpec = async (id: string, input: TechnicalSpecInput) => (await apiFetch<{ data: TechnicalSpec }>(`/products/admin/${encodeURIComponent(id)}/technical-spec`, { method: 'PUT', body: JSON.stringify(input) })).data;
export const getCalculationProducts = async (service: 'PAINT' | 'TILE') => (await apiFetch<{ data: CalculationProduct[] }>(`/partners/catalog?service=${service}`)).data;
export const saveEstimate = async (input: CreateEstimateInput) => (await apiFetch<{ data: SavedEstimate }>('/partners/estimates', { method: 'POST', body: JSON.stringify(input) })).data;
export const requestEstimateQuote = async (id: string, quantity: number) => (await apiFetch<{ data: { quoteId: string } }>(`/partners/estimates/${encodeURIComponent(id)}/quote`, { method: 'POST', body: JSON.stringify({ quantity }) })).data;
export type LaborQuote = { id: string; projectId: string; version: number; title: string; projectTitleSnapshot: string; professionalNameSnapshot: string; clientNameSnapshot: string; items: (LaborQuoteInput['items'][number] & { totalCents: number })[]; notes: string; totalCents: number; validUntil: string; createdAt: string };
export const listLaborQuotes = async (projectId: string, page = 1) => (await apiFetch<{ data: { quotes: LaborQuote[]; total: number; page: number; totalPages: number } }>(`/partners/projects/${encodeURIComponent(projectId)}/labor-quotes?page=${page}`)).data;
export const saveLaborQuote = async (input: LaborQuoteInput) => (await apiFetch<{ data: LaborQuote }>('/partners/labor-quotes', { method: 'POST', body: JSON.stringify(input) })).data;
