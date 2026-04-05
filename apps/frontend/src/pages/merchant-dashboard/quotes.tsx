import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, FileText, MessageCircle, ScanText, Send, UserRound } from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Button } from '@/components/ui/button';
import { SectionLeadCard, StatCard } from './components';
import {
  fetchAdminQuotes,
  fetchCapturedLeads,
  updateAdminQuoteStatus,
  updateCapturedLeadStatus,
} from '@/services/api/quotes';
import {
  buildQuoteDisplayTitle,
  buildQuoteSourceLabel,
  formatQuoteTimestamp,
  getLeadStatusDescription,
  getQuoteStatusDescription,
} from '@/lib/quote-ui';

type BoardTab = 'quotes' | 'leads';

export function MerchantDashboardQuotes() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<BoardTab>('quotes');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const quotesQuery = useQuery({
    queryKey: ['merchant-dashboard', 'quotes', 'admin'],
    queryFn: () => fetchAdminQuotes({ page: 1, limit: 50 }),
  });

  const leadsQuery = useQuery({
    queryKey: ['merchant-dashboard', 'quotes', 'leads'],
    queryFn: () => fetchCapturedLeads({ page: 1, limit: 50 }),
  });

  const quoteStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'IN_REVIEW' | 'RESPONDED' | 'ARCHIVED' }) =>
      updateAdminQuoteStatus(id, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'quotes', 'admin'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'quotes-badge'] }),
      ]);
    },
  });

  const leadStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONTACTED' | 'ARCHIVED' }) =>
      updateCapturedLeadStatus(id, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'quotes', 'leads'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'leads-badge'] }),
      ]);
    },
  });

  const quotes = quotesQuery.data?.quotes ?? [];
  const leads = leadsQuery.data?.leads ?? [];

  const draftLeads = leads.filter((lead) => lead.status === 'QUOTE_DRAFTED').length;
  const freshLeads = leads.filter((lead) => lead.status === 'STARTED').length;
  const inReviewQuotes = quotes.filter((quote) => quote.status === 'IN_REVIEW').length;
  const respondedQuotes = quotes.filter((quote) => quote.status === 'RESPONDED').length;

  const selectedQuote = useMemo(() => {
    if (selectedQuoteId) {
      return quotes.find((quote) => quote.id === selectedQuoteId) ?? null;
    }

    return quotes[0] ?? null;
  }, [quotes, selectedQuoteId]);

  const selectedLead = useMemo(() => {
    if (selectedLeadId) {
      return leads.find((lead) => lead.id === selectedLeadId) ?? null;
    }

    return leads[0] ?? null;
  }, [leads, selectedLeadId]);

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Orcamentos"
        title="Fila comercial de solicitacoes e leads"
        description="Todo o fluxo de orcamentos agora fica em uma fila unica: documentos enviados de um lado e contatos que ainda nao concluiram do outro."
        tone="blue"
        actions={
          <>
            <Button
              variant={activeTab === 'quotes' ? 'default' : 'outline'}
              className="rounded-xl"
              onClick={() => setActiveTab('quotes')}
            >
              Orcamentos enviados
            </Button>
            <Button
              variant={activeTab === 'leads' ? 'default' : 'outline'}
              className="rounded-xl"
              onClick={() => setActiveTab('leads')}
            >
              Leads incompletos
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Send className="h-5 w-5 text-primary" />} label="Orcamentos" value={`${quotes.length}`} delta="Fluxos enviados pelo cliente." />
        <StatCard icon={<Clock3 className="h-5 w-5 text-primary" />} label="Em acompanhamento" value={`${inReviewQuotes}`} delta="Aguardando tratamento interno." />
        <StatCard icon={<UserRound className="h-5 w-5 text-primary" />} label="Leads abertos" value={`${leads.length}`} delta={`${freshLeads} sem documento e ${draftLeads} com rascunho.`} />
        <StatCard icon={<MessageCircle className="h-5 w-5 text-primary" />} label="Respondidos" value={`${respondedQuotes}`} delta="Solicitacoes ja devolvidas ao cliente." />
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200/70 bg-white/94 p-4 shadow-[0_14px_34px_-36px_rgba(15,23,42,0.28)] md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {activeTab === 'quotes' ? 'Orcamentos enviados' : 'Leads incompletos'}
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                {activeTab === 'quotes' ? 'Fila operacional' : 'Retomada comercial'}
              </h3>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {activeTab === 'quotes' ? quotes.length : leads.length} total
            </div>
          </div>

          {activeTab === 'quotes' ? (
            quotesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando orcamentos...</p>
            ) : quotes.length === 0 ? (
              <EmptyList message="Nenhum orcamento enviado ate o momento." />
            ) : (
              <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                {quotes.map((quote) => (
                  <button
                    key={quote.id}
                    type="button"
                    onClick={() => setSelectedQuoteId(quote.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                      selectedQuote?.id === quote.id
                        ? 'border-primary/30 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,252,237,0.9))] shadow-[0_20px_50px_-40px_rgba(37,99,235,0.45)]'
                        : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{buildQuoteDisplayTitle(quote)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {quote.user?.name || 'Cliente'} · {formatQuoteTimestamp(quote.submittedAt || quote.updatedAt)}
                        </p>
                      </div>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : leadsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando leads...</p>
          ) : leads.length === 0 ? (
            <EmptyList message="Nenhum lead incompleto no momento." />
          ) : (
            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    selectedLead?.id === lead.id
                      ? 'border-primary/30 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,252,237,0.9))] shadow-[0_20px_50px_-40px_rgba(37,99,235,0.45)]'
                      : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{lead.nameSnapshot}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatWhatsapp(lead.whatsapp)} · {formatDateTime(lead.createdAt)}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/94 p-4 shadow-[0_14px_34px_-36px_rgba(15,23,42,0.28)] md:p-5">
          {activeTab === 'quotes' ? (
            selectedQuote ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{selectedQuote.referenceCode}</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">{buildQuoteDisplayTitle(selectedQuote)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{getQuoteStatusDescription(selectedQuote.status)}</p>
                  </div>
                  <QuoteStatusBadge status={selectedQuote.status} />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <InfoTile label="Cliente" value={selectedQuote.user?.name || 'Cliente'} />
                  <InfoTile label="Contato" value={selectedQuote.user?.whatsapp ? formatWhatsapp(selectedQuote.user.whatsapp) : selectedQuote.user?.identifier || '-'} />
                  <InfoTile label="Origem" value={buildQuoteSourceLabel(selectedQuote.source)} />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <InfoTile label="Itens" value={`${selectedQuote.itemCount} item(ns)`} />
                  <InfoTile label="Enviado em" value={formatQuoteTimestamp(selectedQuote.submittedAt || selectedQuote.updatedAt)} />
                  <InfoTile label="Confianca OCR" value={selectedQuote.ocrConfidence ? `${Math.round(selectedQuote.ocrConfidence)}%` : '-'} />
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Itens do orcamento</p>
                  <div className="mt-3 space-y-3">
                    {selectedQuote.items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            {item.notes ? <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p> : null}
                          </div>
                          <div className="shrink-0 text-sm font-medium text-muted-foreground">
                            {item.quantity} {item.unit || 'un'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedQuote.customerNote ? (
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Observacao do cliente</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{selectedQuote.customerNote}</p>
                  </div>
                ) : null}

                {selectedQuote.ocrText ? (
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Texto reconhecido</p>
                    <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {selectedQuote.ocrText}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: 'IN_REVIEW' })}
                  >
                    Em analise
                  </Button>
                  <Button
                    className="rounded-xl"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: 'RESPONDED' })}
                  >
                    Marcar respondido
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: 'ARCHIVED' })}
                  >
                    Arquivar
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyList message="Selecione um orcamento para abrir os detalhes." />
            )
          ) : selectedLead ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Lead capturado</p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{selectedLead.nameSnapshot}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{getLeadStatusDescription(selectedLead.status)}</p>
                </div>
                <LeadStatusBadge status={selectedLead.status} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <InfoTile label="WhatsApp" value={formatWhatsapp(selectedLead.whatsapp)} />
                <InfoTile label="Criado em" value={formatDateTime(selectedLead.createdAt)} />
                <InfoTile label="Rascunhos" value={`${selectedLead.quoteCount}`} />
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Leitura operacional</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use essa fila para retomar clientes que pararam na identificacao ou criaram rascunho e nao enviaram a solicitacao final.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-xl"
                  variant="outline"
                  disabled={leadStatusMutation.isPending}
                  onClick={() => leadStatusMutation.mutate({ id: selectedLead.id, status: 'CONTACTED' })}
                >
                  Marcar contato
                </Button>
                <Button
                  className="rounded-xl"
                  disabled={leadStatusMutation.isPending}
                  onClick={() => leadStatusMutation.mutate({ id: selectedLead.id, status: 'ARCHIVED' })}
                >
                  Arquivar
                </Button>
                <Button asChild className="rounded-xl">
                  <a href={buildWhatsappLink(selectedLead.whatsapp)} target="_blank" rel="noreferrer">
                    Falar no WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <EmptyList message="Selecione um lead para abrir os detalhes." />
          )}
        </div>
      </section>
    </div>
  );
}

function buildWhatsappLink(value: string) {
  return `https://wa.me/55${value.replace(/\D/g, '')}`;
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
