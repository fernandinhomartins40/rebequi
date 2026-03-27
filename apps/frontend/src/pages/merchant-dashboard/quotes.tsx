import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, ScanText, Send, UserRound } from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatQuoteTimestamp } from '@/lib/quote-ui';
import {
  fetchAdminQuotes,
  fetchCapturedLeads,
  updateAdminQuoteStatus,
  updateCapturedLeadStatus,
} from '@/services/api/quotes';
import { DashboardPanel, SectionLeadCard, StatCard } from './components';

export function MerchantDashboardQuotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar orçamento',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar o status do orçamento.',
      });
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
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar lead',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar o lead capturado.',
      });
    },
  });

  const quotes = quotesQuery.data?.quotes ?? [];
  const leads = leadsQuery.data?.leads ?? [];
  const draftLeads = leads.filter((lead) => lead.status === 'QUOTE_DRAFTED').length;
  const freshLeads = leads.filter((lead) => lead.status === 'STARTED').length;
  const inReviewQuotes = quotes.filter((quote) => quote.status === 'IN_REVIEW').length;
  const respondedQuotes = quotes.filter((quote) => quote.status === 'RESPONDED').length;

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Orçamentos"
        title="Solicitações por documento e leads capturados"
        description="Acompanhe os orçamentos que chegaram pelo OCR e os clientes que iniciaram o fluxo, mas ainda não concluíram o envio."
        tone="blue"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Send className="h-5 w-5 text-primary" />} label="Orçamentos recebidos" value={`${quotes.length}`} delta="Fluxo já enviado pelo cliente." />
        <StatCard icon={<ScanText className="h-5 w-5 text-primary" />} label="Em análise" value={`${inReviewQuotes}`} delta="Demandas em tratamento interno." />
        <StatCard icon={<UserRound className="h-5 w-5 text-primary" />} label="Leads capturados" value={`${leads.length}`} delta={`${freshLeads} sem foto e ${draftLeads} com rascunho.`} />
        <StatCard icon={<MessageCircle className="h-5 w-5 text-primary" />} label="Respondidos" value={`${respondedQuotes}`} delta="Orçamentos já encaminhados ao cliente." />
      </section>

      <DashboardPanel
        badge="Solicitações"
        title="Orçamentos enviados"
        description="Lista operacional das solicitacoes que o cliente finalizou no painel."
      >
        {quotesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando orçamentos...</p>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum orçamento enviado até o momento.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-[1.5rem] border border-black/5 lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Atualizacao</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{quote.user?.name || 'Cliente'}</p>
                          <p className="text-sm text-muted-foreground">
                            {quote.user?.whatsapp ? formatWhatsapp(quote.user.whatsapp) : quote.user?.identifier}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{quote.referenceCode}</p>
                          <p className="text-sm text-muted-foreground">{quote.title || 'Sem título'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <QuoteStatusBadge status={quote.status} />
                      </TableCell>
                      <TableCell>{quote.itemCount}</TableCell>
                      <TableCell>{formatQuoteTimestamp(quote.submittedAt || quote.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={quoteStatusMutation.isPending}
                            onClick={() => quoteStatusMutation.mutate({ id: quote.id, status: 'IN_REVIEW' })}
                          >
                            Em análise
                          </Button>
                          <Button
                            size="sm"
                            disabled={quoteStatusMutation.isPending}
                            onClick={() => quoteStatusMutation.mutate({ id: quote.id, status: 'RESPONDED' })}
                          >
                            Respondido
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 lg:hidden">
              {quotes.map((quote) => (
                <Card key={quote.id} className="border-black/5 bg-slate-50 shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{quote.user?.name || 'Cliente'}</p>
                        <p className="text-sm text-muted-foreground">
                          {quote.user?.whatsapp ? formatWhatsapp(quote.user.whatsapp) : quote.user?.identifier}
                        </p>
                      </div>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{quote.referenceCode}</p>
                      <p className="mt-1 font-semibold text-foreground">{quote.title || 'Sem título'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {quote.itemCount} itens | atualizado em {formatQuoteTimestamp(quote.submittedAt || quote.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => quoteStatusMutation.mutate({ id: quote.id, status: 'IN_REVIEW' })}>
                        Em análise
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => quoteStatusMutation.mutate({ id: quote.id, status: 'RESPONDED' })}>
                        Respondido
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </DashboardPanel>

      <DashboardPanel
        badge="Leads"
        badgeClassName="bg-amber-500 text-black"
        title="Leads capturados e não concluídos"
        description="Clientes que iniciaram a solicitacao, mas ainda não transformaram o fluxo em um orçamento finalizado."
      >
        {leadsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando leads capturados...</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lead incompleto no momento.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-[1.5rem] border border-black/5 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{lead.nameSnapshot}</p>
                    <p className="text-sm text-muted-foreground">{formatWhatsapp(lead.whatsapp)}</p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoLine label="Criado em" value={formatDateTime(lead.createdAt)} />
                  <InfoLine label="Rascunhos" value={`${lead.quoteCount}`} />
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={leadStatusMutation.isPending}
                    onClick={() => leadStatusMutation.mutate({ id: lead.id, status: 'CONTACTED' })}
                  >
                    Marcar contato
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={leadStatusMutation.isPending}
                    onClick={() => leadStatusMutation.mutate({ id: lead.id, status: 'ARCHIVED' })}
                  >
                    Arquivar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
