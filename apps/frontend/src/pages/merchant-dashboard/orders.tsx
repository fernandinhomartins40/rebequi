import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Eye,
  MessageCircleMore,
  MoreHorizontal,
  Pencil,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { Link } from 'react-router-dom';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { buildCustomerWhatsappUrl } from '@/lib/order-ui';
import { fetchAdminOrders, updateAdminOrderStatus } from '@/services/api/orders';
import type { CustomerOrder, OrderStatus } from '@/types';
import { DashboardPanel, SectionLeadCard, StatCard } from './components';
import { ADMIN_BASE_PATH } from './config';

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
    mutationFn: ({ id, status, internalNotes }: { id: string; status: OrderStatus; internalNotes?: string }) =>
      updateAdminOrderStatus(id, { internalNotes, status }),
    onSuccess: async (updatedOrder) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders-badge'] }),
      ]);

      toast({
        title: 'Pedido atualizado',
        description: `${updatedOrder.referenceCode} agora esta como ${updatedOrder.status}.`,
      });
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
      internalNotes: order.internalNotes || undefined,
      status,
    });
  };

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Pedidos"
        title="Pedidos em lista operacional"
        description="A listagem mostra o que precisa de tratamento rapido. A edicao completa, notas e acompanhamento ficam na pagina dedicada de cada pedido."
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
          icon={<MessageCircleMore className="h-5 w-5 text-primary" />}
          label="Fila de recuperacao"
          value={`${metrics.pendingWhatsapp + metrics.redirected + metrics.recovery}`}
          delta={`${metrics.recovery} em tratamento manual.`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
          label="Concluidos"
          value={`${metrics.completed}`}
          delta="Pedidos aprovados pelo time."
        />
        <StatCard
          icon={<Search className="h-5 w-5 text-primary" />}
          label="Em aberto"
          value={`${metrics.pendingWhatsapp + metrics.redirected}`}
          delta="Pedidos ainda sem fechamento."
        />
      </section>

      <DashboardPanel
        badge="Operacao"
        title="Pedidos registrados pelo carrinho e checkout"
        description="Use a lista para triagem rapida e entre no pedido quando precisar gerenciar atendimento, aprovacoes e notas."
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
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
              Priorizacao para pedidos que nao fecharam naturalmente no fluxo do WhatsApp.
            </p>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Visao completa da operacao com acesso rapido para gerenciar cada pedido.
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
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{order.customerNameSnapshot}</p>
                          <p className="text-sm text-muted-foreground">{order.itemCount} item(ns)</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-foreground">{order.referenceCode}</p>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>{formatPrice(order.subtotal)}</TableCell>
                      <TableCell>{formatWhatsapp(order.customerWhatsapp)}</TableCell>
                      <TableCell>{formatDateTime(order.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <OrderRowActions
                          compact
                          order={order}
                          isMutating={statusMutation.isPending}
                          onApprove={() => void handleStatusChange(order, 'COMPLETED')}
                          onRecovery={() => void handleStatusChange(order, 'IN_RECOVERY')}
                          onRedirected={() => void handleStatusChange(order, 'WHATSAPP_REDIRECTED')}
                          onCancel={() => void handleStatusChange(order, 'CANCELED')}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 xl:hidden">
              {orders.map((order) => (
                <Card key={order.id} className="border-black/5 bg-slate-50 shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{order.customerNameSnapshot}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatWhatsapp(order.customerWhatsapp)} | {order.referenceCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{formatPrice(order.subtotal)}</p>
                        <p className="text-xs text-muted-foreground">{order.itemCount} item(ns)</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-xs text-muted-foreground">{formatDateTime(order.updatedAt)}</span>
                    </div>

                    <OrderRowActions
                      order={order}
                      isMutating={statusMutation.isPending}
                      onApprove={() => void handleStatusChange(order, 'COMPLETED')}
                      onRecovery={() => void handleStatusChange(order, 'IN_RECOVERY')}
                      onRedirected={() => void handleStatusChange(order, 'WHATSAPP_REDIRECTED')}
                      onCancel={() => void handleStatusChange(order, 'CANCELED')}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </DashboardPanel>
    </div>
  );
}

function OrderRowActions({
  compact = false,
  order,
  isMutating,
  onApprove,
  onRecovery,
  onRedirected,
  onCancel,
}: {
  compact?: boolean;
  order: CustomerOrder;
  isMutating: boolean;
  onApprove: () => void;
  onRecovery: () => void;
  onRedirected: () => void;
  onCancel: () => void;
}) {
  const customerChatUrl = buildCustomerWhatsappUrl(order);

  return (
    <div className={compact ? 'flex items-center justify-end gap-1' : 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'}>
      {!compact ? <span className="text-xs text-muted-foreground">Acoes</span> : null}

      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`${ADMIN_BASE_PATH}/pedidos/${order.id}`} aria-label={`Gerenciar ${order.referenceCode}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" asChild>
          <Link to={`${ADMIN_BASE_PATH}/pedidos/${order.id}`} aria-label={`Editar ${order.referenceCode}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" asChild>
          <a href={customerChatUrl} target="_blank" rel="noreferrer" aria-label={`Conversar com ${order.customerNameSnapshot}`}>
            <MessageCircleMore className="h-4 w-4" />
          </a>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          disabled={isMutating || order.status === 'COMPLETED'}
          onClick={onApprove}
          aria-label={`Aprovar ${order.referenceCode}`}
        >
          <CheckCircle2 className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Mais acoes para ${order.referenceCode}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Gerenciar pedido</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to={`${ADMIN_BASE_PATH}/pedidos/${order.id}`}>Abrir pagina do pedido</Link>
            </DropdownMenuItem>
            {order.whatsappUrl ? (
              <DropdownMenuItem asChild>
                <a href={order.whatsappUrl} target="_blank" rel="noreferrer">
                  Ver mensagem do checkout
                </a>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isMutating} onClick={onRecovery}>
              Colocar em recuperacao
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isMutating} onClick={onRedirected}>
              Marcar cliente no WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isMutating} onClick={onCancel} className="text-red-600 focus:text-red-600">
              Cancelar pedido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
