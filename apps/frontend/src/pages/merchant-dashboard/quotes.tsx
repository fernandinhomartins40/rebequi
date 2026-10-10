import { DashboardInfo, DashboardEmpty, DashboardLoading, DashboardError } from "@/components/dashboard/DashboardList";
import { QuoteStatus, LeadStatus } from '@rebequi/shared/types';
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
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus.IN_REVIEW | QuoteStatus.RESPONDED | QuoteStatus.ARCHIVED }) =>
      updateAdminQuoteStatus(id, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'quotes', 'admin'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'quotes-badge'] }),
      ]);
    },
  });

  const leadStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus.CONTACTED | LeadStatus.ARCHIVED }) =>
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
        title="Orçamentos e clientes"
        description="Gerencie orçamentos recebidos e acompanhe clientes que não finalizaram a solicitação."
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Send className="h-4 w-4" />}
          label="Orçamentos recebidos"
          value={`${quotes.length}`}
          tone="default"
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Em análise"
          value={`${inReviewQuotes}`}
          tone={inReviewQuotes > 0 ? 'blue' : 'default'}
        />
        <StatCard
          icon={<UserRound className="h-4 w-4" />}
          label="Clientes para retomar"
          value={`${leads.length}`}
          delta={`${freshLeads} sem documento · ${draftLeads} com rascunho`}
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
      <div className="inline-flex rounded-lg border border-border/60 bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('quotes')}
          className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm transition-colors ${
            activeTab === 'quotes'
              ? 'bg-card font-medium text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Orçamentos enviados
          {quotes.length > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {quotes.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm transition-colors ${
            activeTab === 'leads'
              ? 'bg-card font-medium text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserRound className="h-4 w-4" />
          Leads incompletos
          {leads.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-800">
              {leads.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* Master-detail layout */}
      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* List pane */}
        <div className="rounded-xl border border-border/70 bg-card">
          <div className="border-b border-border/60 px-5 py-4">
            <p className="text-sm font-semibold text-foreground">
              {activeTab === 'quotes' ? 'Orçamentos' : 'Clientes para retomar'}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'quotes' ? quotes.length : leads.length} item(ns)
            </p>
          </div>

          <div className="p-3">
            {activeTab === 'quotes' ? (
              quotesQuery.isLoading ? (
                <ListSkeleton />
              ) : quotesQuery.isError ? (
                <DashboardError message="Não foi possível carregar orçamentos." onRetry={() => void quotesQuery.refetch()} retrying={quotesQuery.isFetching} />
              ) : quotes.length === 0 ? (
                <EmptyList message="Nenhum orçamento enviado." />
              ) : (
                <div className="max-h-[600px] space-y-1.5 overflow-y-auto">
                  {quotes.map((quote) => (
                    <button
                      key={quote.id}
                      type="button"
                      aria-pressed={selectedQuote?.id === quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                        selectedQuote?.id === quote.id
                          ? 'border-primary/40 bg-primary/5 text-foreground'
                          : 'border-transparent bg-transparent text-foreground hover:bg-muted/50'
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
            ) : leadsQuery.isError ? (
              <DashboardError message="Não foi possível carregar contatos." onRetry={() => void leadsQuery.refetch()} retrying={leadsQuery.isFetching} />
            ) : leads.length === 0 ? (
              <EmptyList message="Nenhum lead incompleto." />
            ) : (
              <div className="max-h-[600px] space-y-1.5 overflow-y-auto">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    aria-pressed={selectedLead?.id === lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                      selectedLead?.id === lead.id
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-transparent bg-transparent text-foreground hover:bg-muted/50'
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
        <div className="rounded-xl border border-border/70 bg-card">
          {activeTab === 'quotes' ? (
            selectedQuote ? (
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
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
                  <InfoTile label="Precisão da leitura" value={selectedQuote.ocrConfidence ? `${Math.round(selectedQuote.ocrConfidence)}%` : '—'} />
                </div>

                {/* Items */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Itens do orçamento</p>
                  <div className="space-y-1.5">
                    {selectedQuote.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5">
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
                  <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Observação do cliente</p>
                    <p className="text-sm text-foreground">{selectedQuote.customerNote}</p>
                  </div>
                ) : null}

                {selectedQuote.ocrText ? (
                  <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Texto do documento original</p>
                    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {selectedQuote.ocrText}
                    </p>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border/40 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: QuoteStatus.IN_REVIEW })}
                  >
                    Em análise
                  </Button>
                  <Button
                    size="sm"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: QuoteStatus.RESPONDED })}
                  >
                    Marcar respondido
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={quoteStatusMutation.isPending}
                    onClick={() => quoteStatusMutation.mutate({ id: selectedQuote.id, status: QuoteStatus.ARCHIVED })}
                  >
                    Arquivar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center px-5 py-8">
                <EmptyList message="Selecione um orçamento para ver os detalhes." />
              </div>
            )
          ) : selectedLead ? (
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Cliente identificado</p>
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

              <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Este cliente iniciou o processo mas não concluiu o envio do orçamento. Entre em contato para ajudá-lo a finalizar a solicitação.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border/40 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={leadStatusMutation.isPending}
                  onClick={() => leadStatusMutation.mutate({ id: selectedLead.id, status: LeadStatus.CONTACTED })}
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
                  onClick={() => leadStatusMutation.mutate({ id: selectedLead.id, status: LeadStatus.ARCHIVED })}
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

function EmptyList({ message }: { message: string }) { return <DashboardEmpty title={message} />;
}

function ListSkeleton() { return <DashboardLoading />;
}

function InfoTile({ label, value }: { label: string; value: string }) {
 return <DashboardInfo label={label} value={value} />;
}
