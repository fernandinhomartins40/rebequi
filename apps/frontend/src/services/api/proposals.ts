import type { ProposalInput } from '@rebequi/shared/schemas';
import { apiFetch } from './client';
export type QuoteProposal = { id: string; quoteId: string; version: number; notes: string; totalCents: number; validUntil: string; createdAt: string;
  items: { productId: string; productName: string; quantity: number; unitPriceCents: number; totalCents: number }[] };
export type ProposalHistory = { id: string; status: string; proposalOrderId: string | null; acceptedProposalVersion: number | null; proposals: QuoteProposal[]; total: number; page: number; totalPages: number };
export const listQuoteProposals = async (quoteId: string, page = 1) => (await apiFetch<{ data: ProposalHistory }>(`/quotes/${encodeURIComponent(quoteId)}/proposals?page=${page}`)).data;
export const publishQuoteProposal = async (quoteId: string, input: ProposalInput) => (await apiFetch<{ data: { proposalId: string; version: number } }>(`/quotes/admin/${encodeURIComponent(quoteId)}/proposals`, { method: 'POST', body: JSON.stringify(input) })).data;
export const acceptQuoteProposal = async (quoteId: string, version: number) => (await apiFetch<{ data: { orderId: string } }>(`/quotes/${encodeURIComponent(quoteId)}/proposals/accept`, { method: 'POST', body: JSON.stringify({ version, confirmed: true }) })).data;
