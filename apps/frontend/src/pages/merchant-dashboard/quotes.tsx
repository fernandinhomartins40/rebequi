import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, FileText, MessageCircle, Send, UserRound } from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Button } from '@/components/ui/button';
import { PageHeader, StatCard } from './components';
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

  const draftLeads = leads.filter((l) => l.status === 'QUOTE_DRAFTED').length;
  const freshLeads = leads.filter((l) => l.status === 'STARTED').length;
  const inReviewQuotes = quotes.filter((q) => q.status === 'IN_REVIEW').length;
  const respondedQuotes = quotes.filter((q) => q.status === 'RESPONDED').length;

  const selectedQuote = useMemo(
    () => (selectedQuoteId ? quotes.find((q) => q.id === selectedQuoteId) ?? null : quotes[0] ?? null),
    [quotes, selectedQuoteId]
  );

  const selectedLead = useMemo(
    () => (selectedLeadId ? leads.find((l) => l.id === selectedLeadId) ?? null : leads[0] ?? null),
    [leads, selectedLeadId]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Orçamentos e leads"
        description="Acompanhe orçamentos enviados e clientes que não concluíram o fluxo."
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Send className="h-4 w-4" />}
          label="Orçamentos"
          value={`${quotes.length}`}
          tone="default"
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Em acompanhamento"
          value={`${inReviewQuotes}`}
          tone={inReviewQuotes > 0 ? 'blue' : 'default'}
        />
        <StatCard
          icon={<UserRound className="h-4 w-4" />}
          label="Leads abertos"
          value={`${leads.length}`}
          delta={`${freshLeads} sem doc · ${draftLeads} com rascunho`}
          tone={leads.length > 0 ? 'yellow' : 'default'}
        />
        <StatCard
          icon={<MessageCircle className="h-4 w-4" />}
          label="Respondidos"
          value={`${respondedQuotes}`}
          tone="green"
        />
      </section>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('quotes')}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'quotes'
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-slate-200 bg-white text-muted-foreground hover:border-slate-300 hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Orçamentos enviados
          {quotes.length > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {quotes.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'leads'
              ? 'border-amber-300/50 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-white text-muted-foreground hover:border-slate-300 hover:text-foreground'
          }`}
        >
          <UserRound className="h-4 w-4" />
          Leads incompletos
          {leads.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {leads.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* Master-detail layout */}
      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* List pane */}
        <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3.5">
            <p className="text-sm font-semibold text-foreground">
              {activeTab === 'quotes' ? 'Fila operacional' : 'Retomada comercial'}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'quotes' ? quotes.length : leads.length} item(ns)
            </p>
          </div>

          <div className="p-3">
            {activeTab === 'quotes' ? (
              quotesQuery.isLoading ? (
                <ListSkeleton />
              ) : quotes.length === 0 ? (
                <EmptyList message="Nenhum orçamento enviado." />
              ) : (
                <div className="max-h-[600px] space-y-1.5 overflow-y-auto">
                  {quotes.map((quote) => (
                    <button
                      key={quote.id}
                      type="button"
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition-all ${
                        selectedQuote?.id === quote.id
                          ? 'border-primary/30 bg-primary/5 text-foreground'
                          : 'border-transparent bg-transparent text-foreground hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{buildQuoteDisplayTitle(quote)}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
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
              <ListSkeleton />
            ) : leads.length === 0 ? (
              <EmptyList message="Nenhum lead incompleto." />
            ) : (
              <div className="max-h-[600px] space-y-1.5 overflow-y-auto">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition-all ${
                      selectedLead?.id === lead.id
                        ? 'border-amber-300/50 bg-amber-50'
                        : 'border-transparent bg-transparent text-foreground hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{lead.nameSnapshot}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
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
        </div>

        {/* Detail pane */}
        <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
          {activeTab === 'quotes' ? (
            selectedQuote ? (
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{selectedQuote.referenceCode}</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">{buildQuoteDisplayTitle(selectedQuote)}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{getQuoteStatusDescription(selectedQuote.status)}</p>
                  </div>
                  <QuoteStatusBadge status={selectedQuote.status} />
                </div>

                {/* Meta grid */}
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <InfoTile label="Cliente" value={selectedQuote.user?.name || 'Cliente'} />
                  <InfoTile
                    label="Contato"
                    value={selectedQuote.user?.whatsapp ? formatWhatsapp(selectedQuote.user.whatsapp) : selectedQuote.user?.identifier || '—'}
                  />
                  <InfoTile label="Origem" value={buildQuoteSourceLabel(selectedQuote.source)} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <InfoTile label="Itens" value={`${selectedQuote.itemCount}`} />
                  <InfoTile label="Enviado em" value={formatQuoteTimestamp(selectedQuote.submittedAt || selectedQuote.updatedAt)} />
                  <InfoTile label="Confiança OCR" value={selectedQuote.ocrConfidence ? `${Math.round(selectedQuote.ocrConfidence)}%` : '—'} />
                </div>

                {/* Items */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Itens do orçamento</p>
                  <div className="space-y-1.5">
                    {selectedQuote.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          {item.notes ? <p className="mt-0.5 text-xs text-muted-foreground">{item.notes}</p> : null}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-muted-foreground">
                          {item.quantity} {item.unit || 'un'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedQuote.customerNote ? (
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observação do cliente</p>
                    <p className="text-sm text-foreground">{selectedQuote.customerNote}</p>
                  </div>
                ) : null}

                {selectedQuote.ocrText ? (
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Texto reconhecido</p>
                    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {selectedQuote.ocrText}
                    </p>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: 'IN_REVIEW' })}
                  >
                    Em análise
                  </Button>
                  <Button
                    size="sm"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: 'RESPONDED' })}
                  >
                    Marcar respondido
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: 'ARCHIVED' })}
                  >
                    Arquivar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center p-8">
                <EmptyList message="Selecione um orçamento para ver os detalhes." />
              </div>
            )
          ) : selectedLead ? (
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Lead capturado</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{selectedLead.nameSnapshot}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{getLeadStatusDescription(selectedLead.status)}</p>
                </div>
                <LeadStatusBadge status={selectedLead.status} />
              </div>

              {/* Meta */}
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <InfoTile label="WhatsApp" value={formatWhatsapp(selectedLead.whatsapp)} />
                <InfoTile label="Criado em" value={formatDateTime(selectedLead.createdAt)} />
                <InfoTile label="Rascunhos" value={`${selectedLead.quoteCount}`} />
              </div>

              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Use essa fila para retomar clientes que pararam na identificação ou criaram rascunho e não enviaram a solicitação final.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={leadStatusMutation.isPending}
                  onClick={() => leadStatusMutation.mutate({ id: selectedLead.id, status: 'CONTACTED' })}
                >
                  Marcar contato
                </Button>
                <Button
                  size="sm"
                  asChild
                >
                  <a href={buildWhatsappLink(selectedLead.whatsapp)} target="_blank" rel="noreferrer">
                    Falar no WhatsApp
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={leadStatusMutation.isPending}
                  onClick={() => leadStatusMutation.mutate({ id: selectedLead.id, status: 'ARCHIVED' })}
                >
                  Arquivar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center p-8">
              <EmptyList message="Selecione um lead para ver os detalhes." />
            </div>
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
    <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
