import { formatDateTime } from '@rebequi/shared/utils';
import type { LeadStatus, QuoteStatus } from '@/types';

export function getQuoteStatusLabel(status: QuoteStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Rascunho';
    case 'SUBMITTED':
      return 'Enviado';
    case 'IN_REVIEW':
      return 'Em analise';
    case 'RESPONDED':
      return 'Respondido';
    case 'ARCHIVED':
      return 'Arquivado';
    default:
      return status;
  }
}

export function getQuoteStatusClassName(status: QuoteStatus) {
  switch (status) {
    case 'DRAFT':
      return 'bg-amber-100 text-amber-800';
    case 'SUBMITTED':
      return 'bg-primary/10 text-primary';
    case 'IN_REVIEW':
      return 'bg-sky-100 text-sky-700';
    case 'RESPONDED':
      return 'bg-emerald-100 text-emerald-700';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function getLeadStatusLabel(status: LeadStatus) {
  switch (status) {
    case 'STARTED':
      return 'Capturado';
    case 'QUOTE_DRAFTED':
      return 'Rascunho criado';
    case 'QUOTE_SUBMITTED':
      return 'Concluido';
    case 'CONTACTED':
      return 'Contatado';
    case 'ARCHIVED':
      return 'Arquivado';
    default:
      return status;
  }
}

export function getLeadStatusClassName(status: LeadStatus) {
  switch (status) {
    case 'STARTED':
      return 'bg-amber-100 text-amber-800';
    case 'QUOTE_DRAFTED':
      return 'bg-primary/10 text-primary';
    case 'QUOTE_SUBMITTED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CONTACTED':
      return 'bg-sky-100 text-sky-700';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function formatQuoteTimestamp(value?: Date | string | null) {
  if (!value) {
    return '-';
  }

  return formatDateTime(value);
}
