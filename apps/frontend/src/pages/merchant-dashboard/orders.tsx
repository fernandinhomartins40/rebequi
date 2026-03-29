import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, MessageCircleMore, Search, ShoppingCart } from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { fetchAdminOrders, updateAdminOrderStatus } from '@/services/api/orders';
import type { CustomerOrder, OrderStatus } from '@/types';
import { DashboardPanel, SectionLeadCard, StatCard } from './components';

type QueueView = 'all' | 'recovery';
type StatusFilterValue = 'all' | OrderStatus;

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const ORDER_STATUS_OPTIONS: Array<{ label: string; value: StatusFilterValue }> = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Aguardando WhatsApp', value: 'PENDING_WHATSAPP' },
  { label: 'Enviado ao WhatsApp', value: 'WHATSAPP_REDIRECTED' },
  { label: 'Em recuperacao', value: 'IN_RECOVERY' },
  { label: 'Concluido', value: 'COMPLETED' },
  { label: 'Cancelado', value: 'CANCELED' },
];

export function MerchantDashboardOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [queueView, setQueueView] = useState<QueueView>('recovery');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const debouncedSearch = useDebouncedValue(search, 300);

  const ordersQuery = useQuery({
    queryKey: ['merchant-dashboard', 'orders', debouncedSearch, statusFilter, queueView],
    queryFn: () =>
      fetchAdminOrders({
        limit: 100,
        page: 1,
        recoveryOnly: queueView === 'recovery' && statusFilter === 'all',
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, internalNotes, status }: { id: string; internalNotes?: string; status: OrderStatus }) =>
      updateAdminOrderStatus(id, { internalNotes, status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders-badge'] }),
      ]);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar pedido',
        description: error instanceof Error ? error.message : 'Nao foi possivel atualizar o pedido.',
      });
    },
  });

  const orders = ordersQuery.data?.orders ?? [];

  useEffect(() => {
    setNotesDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };

      orders.forEach((order) => {
        if (!(order.id in nextDrafts)) {
          nextDrafts[order.id] = order.internalNotes || '';
        }
      });

      return nextDrafts;
    });
  }, [orders]);

  const metrics = useMemo(() => {
    const pendingWhatsapp = orders.filter((order) => order.status === 'PENDING_WHATSAPP').length;
    const redirected = orders.filter((order) => order.status === 'WHATSAPP_REDIRECTED').length;
    const recovery = orders.filter((order) => order.status === 'IN_RECOVERY').length;
    const completed = orders.filter((order) => order.status === 'COMPLETED').length;

    return {
      completed,
      pendingWhatsapp,
      recovery,
      redirected,
    };
  }, [orders]);

  const handleStatusChange = async (order: CustomerOrder, status: OrderStatus) => {
    await statusMutation.mutateAsync({
      id: order.id,
      internalNotes: notesDrafts[order.id]?.trim() || undefined,
      status,
    });
  };

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Pedidos"
        title="Checkout publico, fila de recuperacao e fechamento comercial"
        description="Os pedidos entram no painel antes do redirecionamento para o WhatsApp. Isso permite acompanhar clientes que abriram a conversa, desistiram no meio ou precisam de retorno manual da equipe."
        tone="blue"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
          label="Pedidos visiveis"
          value={`${orders.length}`}
          delta="Resultado atual da consulta."
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5 text-primary" />}
          label="Aguardando envio"
          value={`${metrics.pendingWhatsapp}`}
          delta="Cliente nao chegou a abrir o WhatsApp."
        />
        <StatCard
          icon={<MessageCircleMore className="h-5 w-5 text-primary" />}
          label="Fila de recuperacao"
          value={`${metrics.redirected + metrics.recovery}`}
          delta={`${metrics.recovery} ja em tratamento interno.`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
          label="Concluidos"
          value={`${metrics.completed}`}
          delta="Pedidos fechados pelo time."
        />
      </section>

      <DashboardPanel
        badge="Operacao"
        title="Pedidos registrados pelo carrinho e checkout"
        description="Use busca, filtro e a troca de status para trabalhar a fila comercial e recuperar vendas quando o cliente nao concluir o WhatsApp."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cliente, referencia ou WhatsApp"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={queueView} onValueChange={(value) => setQueueView(value as QueueView)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="recovery">Fila de recuperacao</TabsTrigger>
            <TabsTrigger value="all">Todos os pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="recovery" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Mostra primeiro quem nao concluiu o contato ou ainda precisa de acompanhamento manual.
            </p>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Visao completa da operacao, incluindo pedidos concluidos e cancelados.
            </p>
          </TabsContent>
        </Tabs>

        {ordersQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50 px-4 py-6 text-sm text-muted-foreground">
            Nenhum pedido encontrado com os filtros atuais.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-[1.5rem] border border-black/5 xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Atualizacao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{order.customerNameSnapshot}</p>
                          <p className="text-sm text-muted-foreground">{order.user?.name || 'Cadastro do cliente'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{order.referenceCode}</p>
                          <p className="text-sm text-muted-foreground">{order.itemCount} item(ns)</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>{formatPrice(order.subtotal)}</TableCell>
                      <TableCell>{formatWhatsapp(order.customerWhatsapp)}</TableCell>
                      <TableCell>{formatDateTime(order.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id} className="border-black/5 bg-slate-50 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{order.customerNameSnapshot}</p>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatWhatsapp(order.customerWhatsapp)} | {order.referenceCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{formatPrice(order.subtotal)}</p>
                        <p className="text-sm text-muted-foreground">{order.itemCount} item(ns)</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <InfoLine label="Criado em" value={formatDateTime(order.createdAt)} />
                      <InfoLine label="Ultima atualizacao" value={formatDateTime(order.updatedAt)} />
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Itens</p>
                      <ul className="mt-3 space-y-2">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-foreground">
                              {item.quantity}x {item.productNameSnapshot}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatPrice(item.quantity * item.unitPrice)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`order-notes-${order.id}`}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Observacoes internas
                      </label>
                      <Textarea
                        id={`order-notes-${order.id}`}
                        placeholder="Ex.: cliente abriu o checkout, mas nao mandou a mensagem. Retornar manualmente."
                        value={notesDrafts[order.id] ?? ''}
                        onChange={(event) =>
                          setNotesDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [order.id]: event.target.value,
                          }))
                        }
                      />
                    </div>

                    {order.customerNote ? (
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm text-muted-foreground">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Observacao do cliente
                        </p>
                        <p className="mt-2 leading-6 text-foreground">{order.customerNote}</p>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusMutation.isPending}
                        onClick={() => void handleStatusChange(order, 'IN_RECOVERY')}
                      >
                        Colocar em recuperacao
                      </Button>
                      <Button
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() => void handleStatusChange(order, 'COMPLETED')}
                      >
                        Marcar concluido
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={statusMutation.isPending}
                        onClick={() => void handleStatusChange(order, 'WHATSAPP_REDIRECTED')}
                      >
                        Cliente foi ao WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={statusMutation.isPending}
                        onClick={() => void handleStatusChange(order, 'CANCELED')}
                      >
                        Cancelar pedido
                      </Button>
                      {order.whatsappUrl ? (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={order.whatsappUrl} target="_blank" rel="noreferrer">
                            Abrir conversa
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {queueView === 'recovery' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Recuperacao de vendas
            </div>
            <p className="mt-2 leading-6">
              Pedidos com status pendente, redirecionados ao WhatsApp ou ja em recuperacao ficam visiveis aqui para o
              time comercial agir mesmo quando o cliente abandona o envio da mensagem.
            </p>
          </div>
        ) : null}
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
