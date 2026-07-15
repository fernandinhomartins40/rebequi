import { formatDateTime } from '@rebequi/shared/utils';
import type { LeadStatus, QuoteOcrStatus, QuoteRequest, QuoteStatus } from '@/types';

export function getQuoteStatusLabel(status: QuoteStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Rascunho';
    case 'SUBMITTED':
      return 'Enviado';
    case 'IN_REVIEW':
      return 'Em análise';
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

export function getQuoteStatusDescription(status: QuoteStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Rascunho pronto para revisao e ajustes antes do envio.';
    case 'SUBMITTED':
      return 'Solicitacao enviada para a equipe comercial.';
    case 'IN_REVIEW':
      return 'Equipe analisando itens, quantidades e disponibilidade.';
    case 'RESPONDED':
      return 'Loja ja devolveu o retorno comercial ao cliente.';
    case 'ARCHIVED':
      return 'Fluxo encerrado e mantido apenas para historico.';
    default:
      return 'Status do orçamento.';
  }
}

export function getQuoteOcrStatusLabel(status?: QuoteOcrStatus | null) {
  switch (status) {
    case 'PENDING':
      return 'Leitura na fila';
    case 'PROCESSING':
      return 'Lendo documento';
    case 'COMPLETED':
      return 'Leitura concluida';
    case 'FAILED':
      return 'Leitura falhou';
    case 'SKIPPED':
      return 'Leitura ignorada';
    default:
      return 'Leitura pendente';
  }
}

export function getQuoteOcrStatusDescription(status?: QuoteOcrStatus | null) {
  switch (status) {
    case 'PENDING':
    case 'PROCESSING':
      return 'O rascunho ja foi criado. Voce pode aguardar a leitura automatica ou preencher os itens manualmente.';
    case 'COMPLETED':
      return 'Confira os itens sugeridos antes de enviar para a loja.';
    case 'FAILED':
      return 'Nao foi possivel ler a imagem automaticamente. O rascunho continua disponivel para preenchimento manual.';
    case 'SKIPPED':
      return 'Preencha os itens manualmente para concluir a solicitacao.';
    default:
      return 'Revise o rascunho antes de enviar.';
  }
}

export function getLeadStatusLabel(status: LeadStatus) {
  switch (status) {
    case 'STARTED':
      return 'Capturado';
    case 'QUOTE_DRAFTED':
      return 'Rascunho criado';
    case 'QUOTE_SUBMITTED':
      return 'Concluído';
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

export function getLeadStatusDescription(status: LeadStatus) {
  switch (status) {
    case 'STARTED':
      return 'Cliente informou os dados, mas ainda nao gerou um rascunho.';
    case 'QUOTE_DRAFTED':
      return 'Documento processado e aguardando conclusao do cliente.';
    case 'QUOTE_SUBMITTED':
      return 'Lead convertido em solicitacao enviada.';
    case 'CONTACTED':
      return 'Equipe ja retomou o contato manualmente.';
    case 'ARCHIVED':
      return 'Lead retirado da fila operacional.';
    default:
      return 'Status do lead capturado.';
  }
}

export function formatQuoteTimestamp(value?: Date | string | null) {
  if (!value) {
    return '-';
  }

  return formatDateTime(value);
}

export function buildQuoteDisplayTitle(quote: Pick<QuoteRequest, 'title' | 'referenceCode' | 'items'>) {
  const explicitTitle = quote.title?.trim();

  if (explicitTitle && explicitTitle !== 'Rascunho em processamento') {
    return explicitTitle;
  }

  const firstItem = quote.items[0]?.name?.trim();

  if (!firstItem) {
    return quote.referenceCode;
  }

  if (quote.items.length === 1) {
    return firstItem;
  }

  return `${firstItem} + ${quote.items.length - 1} item(ns)`;
}

export function buildQuoteStageLabel(quote: Pick<QuoteRequest, 'status' | 'ocrStatus'> | null | undefined) {
  if (!quote) {
    return 'Aguardando captura';
  }

  if (quote.status === 'DRAFT' && (quote.ocrStatus === 'PENDING' || quote.ocrStatus === 'PROCESSING')) {
    return 'Lendo documento';
  }

  switch (quote.status) {
    case 'DRAFT':
      return 'Em revisao';
    case 'SUBMITTED':
    case 'IN_REVIEW':
      return 'Acompanhamento';
    case 'RESPONDED':
      return 'Concluído';
    case 'ARCHIVED':
      return 'Arquivado';
    default:
      return 'Acompanhamento';
  }
}

export function buildQuoteSourceLabel(source?: string | null) {
  switch (source) {
    case 'public_camera':
      return 'Capturado na pagina publica';
    case 'customer_dashboard':
      return 'Criado pelo cliente no painel';
    default:
      return source || 'Fluxo de orçamento';
  }
}
