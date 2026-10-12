import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlarmClock,
  FileText,
  Loader2,
  MessageCircle,
  Receipt,
  Send,
  ShoppingCart,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  CUSTOMER_STAGE_ORDER,
  formatCurrency,
  getCustomerStageLabel,
  getCustomerStageTone,
} from '@/lib/customer-ui';
import {
  addCustomerNote,
  deleteCustomerNote,
  fetchCustomerById,
  updateCustomerCrm,
} from '@/services/api/customers';
import { CustomerStage } from '@/types';
import type { CustomerTimelineEntry } from '@/types';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, EditorBackLink, PageHeader } from './components';
import { CommercialAssignment } from '@/components/CommercialAssignment';

function toDateTimeLocal(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

const TIMELINE_ICON = {
  quote: FileText,
  order: ShoppingCart,
  sale: Receipt,
} as const;

const TIMELINE_LABEL = {
  quote: 'Orçamento',
  order: 'Pedido',
  sale: 'Venda',
} as const;

export function MerchantCustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tagInput, setTagInput] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [followUpValue, setFollowUpValue] = useState('');

  const customerQuery = useQuery({
    queryKey: ['merchant-dashboard', 'customers', 'detail', customerId],
    queryFn: () => fetchCustomerById(customerId as string),
    enabled: Boolean(customerId),
  });

  const customer = customerQuery.data;

  useEffect(() => {
    if (customer) setFollowUpValue(toDateTimeLocal(customer.followUpAt));
  }, [customer]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'customers'] }),
    ]);
  };

  const crmMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateCustomerCrm>[1]) => updateCustomerCrm(customerId as string, payload),
    onSuccess: async () => {
      await invalidate();
      await customerQuery.refetch();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao atualizar', description: error instanceof Error ? error.message : 'Erro inesperado.' });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => addCustomerNote(customerId as string, { body }),
    onSuccess: async () => {
      setNoteBody('');
      await customerQuery.refetch();
      toast({ title: 'Anotação salva' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao salvar nota', description: error instanceof Error ? error.message : 'Erro inesperado.' });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCustomerNote(customerId as string, noteId),
    onSuccess: async () => {
      await customerQuery.refetch();
    },
  });

  if (customerQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando ficha…
      </div>
    );
  }

  if (customerQuery.isError || !customer) {
    return (
      <div className="space-y-4">
        <EditorBackLink to={`${ADMIN_BASE_PATH}/clientes`} label="Voltar para clientes" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Não foi possível carregar o cliente.
        </div>
      </div>
    );
  }

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (customer.tags.includes(tag)) {
      setTagInput('');
      return;
    }
    crmMutation.mutate({ tags: [...customer.tags, tag] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    crmMutation.mutate({ tags: customer.tags.filter((t) => t !== tag) });
  };

  const saveFollowUp = () => {
    crmMutation.mutate({ followUpAt: followUpValue ? new Date(followUpValue).toISOString() : null });
  };

  const whatsappLink = customer.whatsapp
    ? `https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <div className="space-y-6">
      <EditorBackLink to={`${ADMIN_BASE_PATH}/clientes`} label="Voltar para clientes" />
      <CommercialAssignment kind="customer" id={customer.id} />
      <PageHeader
        title={customer.name}
        description={customer.whatsapp ? formatWhatsapp(customer.whatsapp) : customer.email || 'Sem contato'}
        actions={
          whatsappLink ? (
            <Button size="sm" className="gap-1.5" asChild>
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          ) : undefined
        }
      />

      {/* Métricas */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Total gasto" value={formatCurrency(customer.metrics.totalSpent)} accent />
        <MetricTile label="Vendas" value={`${customer.metrics.salesCount}`} />
        <MetricTile label="Orçamentos" value={`${customer.metrics.quotesCount}`} />
        <MetricTile label="Pedidos" value={`${customer.metrics.ordersCount}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Timeline */}
        <DashboardPanel title="Histórico" description="Orçamentos, pedidos e vendas deste cliente." accent="blue">
          {customer.timeline.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </div>
          ) : (
            <ul className="space-y-2">
              {customer.timeline.map((entry) => (
                <TimelineRow key={`${entry.kind}-${entry.id}`} entry={entry} />
              ))}
            </ul>
          )}
        </DashboardPanel>

        {/* Painel lateral: estágio, tags, follow-up, notas */}
        <div className="space-y-6">
          {/* Estágio */}
          <DashboardPanel title="Estágio no funil" description={customer.stageManual ? 'Definido manualmente (não muda sozinho).' : 'Ajustado automaticamente pelo histórico.'} accent="yellow">
            <div className="flex flex-wrap gap-1.5">
              {CUSTOMER_STAGE_ORDER.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  disabled={crmMutation.isPending}
                  onClick={() => crmMutation.mutate({ stage, stageManual: true })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    customer.stage === stage ? getCustomerStageTone(stage) : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {getCustomerStageLabel(stage)}
                </button>
              ))}
            </div>
            {customer.stageManual ? (
              <Button variant="ghost" size="sm" className="mt-3 text-xs" disabled={crmMutation.isPending} onClick={() => crmMutation.mutate({ stageManual: false })}>
                Voltar a atualizar automaticamente
              </Button>
            ) : null}
          </DashboardPanel>

          {/* Tags */}
          <DashboardPanel title="Etiquetas" description="Segmente o cliente (ex.: atacado, construtora, VIP)." accent="blue">
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma etiqueta.</p>
              ) : (
                customer.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs text-foreground">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-muted-foreground hover:text-red-600" aria-label={`Remover ${tag}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Nova etiqueta"
                className="h-9"
              />
              <Button size="sm" variant="outline" onClick={addTag} disabled={crmMutation.isPending || !tagInput.trim()}>Adicionar</Button>
            </div>
          </DashboardPanel>

          {/* Follow-up */}
          <DashboardPanel title="Lembrete de retorno" description="Agende quando falar de novo com este cliente." accent="red">
            <div className="flex flex-col gap-2">
              <Label htmlFor="followup" className="text-xs">Data e hora</Label>
              <Input id="followup" type="datetime-local" value={followUpValue} onChange={(e) => setFollowUpValue(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveFollowUp} disabled={crmMutation.isPending} className="gap-1.5">
                  <AlarmClock className="h-3.5 w-3.5" /> Salvar lembrete
                </Button>
                {customer.followUpAt ? (
                  <Button size="sm" variant="ghost" onClick={() => { setFollowUpValue(''); crmMutation.mutate({ followUpAt: null }); }} disabled={crmMutation.isPending}>
                    Limpar
                  </Button>
                ) : null}
              </div>
            </div>
          </DashboardPanel>
        </div>
      </div>

      {/* Notas */}
      <DashboardPanel title="Anotações" description="Registre o que foi conversado com o cliente." accent="blue">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            rows={2}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Ex.: Cliente pediu orçamento de cimento para obra em maio. Retornar com preço de atacado."
            className="flex-1"
          />
          <Button
            onClick={() => noteMutation.mutate(noteBody.trim())}
            disabled={noteMutation.isPending || !noteBody.trim()}
            className="gap-1.5 self-end"
          >
            {noteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Salvar
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {customer.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
          ) : (
            customer.notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                  <button
                    type="button"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    disabled={deleteNoteMutation.isPending}
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    aria-label="Remover anotação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {note.authorName ? `${note.authorName} · ` : ''}{formatDateTime(note.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </DashboardPanel>
    </div>
  );
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${accent ? 'text-emerald-600' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function TimelineRow({ entry }: { entry: CustomerTimelineEntry }) {
  const Icon = TIMELINE_ICON[entry.kind];
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TIMELINE_LABEL[entry.kind]}</span>
          <span className="font-mono text-xs text-muted-foreground">{entry.referenceCode}</span>
        </div>
        <p className="mt-0.5 text-sm font-medium text-foreground">{entry.title}</p>
        <p className="text-xs text-muted-foreground">
          {entry.itemCount ? `${entry.itemCount} item(ns) · ` : ''}{entry.status}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {typeof entry.amount === 'number' ? (
          <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(entry.amount)}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">{formatDateTime(entry.at)}</p>
      </div>
    </li>
  );
}
