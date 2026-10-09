import { OrderStatus as OrderStatusValue } from '@rebequi/shared/types';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Eye,
  MessageCircleMore,
  MoreHorizontal,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { Link } from 'react-router-dom';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
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
import { DashboardPanel, PageHeader, StatCard } from './components';
import { ADMIN_BASE_PATH } from './config';

type QueueView = 'all' | 'recovery';
type StatusFilterValue = 'all' | OrderStatus;

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const ORDER_STATUS_OPTIONS: Array<{ label: string; value: StatusFilterValue }> = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Aguardando WhatsApp', value: OrderStatusValue.PENDING_WHATSAPP },
  { label: 'Enviado ao WhatsApp', value: OrderStatusValue.WHATSAPP_REDIRECTED },
  { label: 'Em recuperação', value: OrderStatusValue.IN_RECOVERY },
  { label: 'Concluído', value: OrderStatusValue.COMPLETED },
  { label: 'Cancelado', value: OrderStatusValue.CANCELED },
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
        description: `${updatedOrder.referenceCode} → ${updatedOrder.status}`,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar pedido',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.',
      });
    },
  });

  const orders = ordersQuery.data?.orders ?? [];

  const metrics = useMemo(() => {
    const pendingWhatsapp = orders.filter((o) => o.status === OrderStatusValue.PENDING_WHATSAPP).length;
    const redirected = orders.filter((o) => o.status === OrderStatusValue.WHATSAPP_REDIRECTED).length;
    const recovery = orders.filter((o) => o.status === OrderStatusValue.IN_RECOVERY).length;
    const completed = orders.filter((o) => o.status === OrderStatusValue.COMPLETED).length;
    return { completed, pendingWhatsapp, recovery, redirected };
  }, [orders]);

  const handleStatusChange = async (order: CustomerOrder, status: OrderStatus) => {
    await statusMutation.mutateAsync({ id: order.id, internalNotes: order.internalNotes || undefined, status });
  };

  const openCount = metrics.pendingWhatsapp + metrics.redirected;
  const recoveryCount = metrics.pendingWhatsapp + metrics.redirected + metrics.recovery;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe e gerencie os pedidos recebidos. Clique em um pedido para ver detalhes completos."
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Pedidos no filtro"
          value={`${orders.length}`}
          delta="Resultado atual"
        />
        <StatCard
          icon={<MessageCircleMore className="h-4 w-4" />}
          label="Para recuperar"
          value={`${recoveryCount}`}
          delta={`${metrics.recovery} em contato manual`}
          tone={recoveryCount > 0 ? 'yellow' : 'green'}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Concluídos"
          value={`${metrics.completed}`}
          tone="green"
        />
        <StatCard
          icon={<Search className="h-4 w-4" />}
          label="Sem resposta"
          value={`${openCount}`}
          delta="Aguardando ação"
          tone={openCount > 0 ? 'red' : 'green'}
        />
      </section>

      {/* Orders panel */}
      <DashboardPanel title="Lista de pedidos" accent="red">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cliente, referência ou WhatsApp…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={queueView} onValueChange={(v) => setQueueView(v as QueueView)}>
          <TabsList className="mb-4">
            <TabsTrigger value="recovery">
              Pedidos para recuperar
              {recoveryCount > 0 ? (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  {recoveryCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="all">Todos os pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="recovery" />
          <TabsContent value="all" />
        </Tabs>

        {ordersQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
            Nenhum pedido encontrado com os filtros atuais.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-border/60 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Referência</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Subtotal</TableHead>
                    <TableHead className="font-medium">WhatsApp</TableHead>
                    <TableHead className="font-medium">Atualização</TableHead>
                    <TableHead className="text-right font-medium">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-medium text-foreground">{order.customerNameSnapshot}</p>
                        <p className="text-xs text-muted-foreground">{order.itemCount} item(ns)</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{order.referenceCode}</span>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="font-medium">{formatPrice(order.subtotal)}</TableCell>
                      <TableCell className="text-sm">{formatWhatsapp(order.customerWhatsapp)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(order.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <OrderRowActions
                          compact
                          order={order}
                          isMutating={statusMutation.isPending}
                          onApprove={() => void handleStatusChange(order, OrderStatusValue.COMPLETED)}
                          onRecovery={() => void handleStatusChange(order, OrderStatusValue.IN_RECOVERY)}
                          onRedirected={() => void handleStatusChange(order, OrderStatusValue.WHATSAPP_REDIRECTED)}
                          onCancel={() => void handleStatusChange(order, OrderStatusValue.CANCELED)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 xl:hidden">
              {orders.map((order) => (
                <div key={order.id} className="rounded-lg border border-border/60 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{order.customerNameSnapshot}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatWhatsapp(order.customerWhatsapp)} · {order.referenceCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatPrice(order.subtotal)}</p>
                      <p className="text-xs text-muted-foreground">{order.itemCount} item(ns)</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(order.updatedAt)}</span>
                  </div>
                  <div className="mt-3 border-t border-border/40 pt-3">
                    <OrderRowActions
                      order={order}
                      isMutating={statusMutation.isPending}
                      onApprove={() => void handleStatusChange(order, OrderStatusValue.COMPLETED)}
                      onRecovery={() => void handleStatusChange(order, OrderStatusValue.IN_RECOVERY)}
                      onRedirected={() => void handleStatusChange(order, OrderStatusValue.WHATSAPP_REDIRECTED)}
                      onCancel={() => void handleStatusChange(order, OrderStatusValue.CANCELED)}
                    />
                  </div>
                </div>
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
    <div className={compact ? 'flex items-center justify-end gap-1' : 'flex flex-wrap items-center gap-1'}>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
        <Link to={`${ADMIN_BASE_PATH}/pedidos/${order.id}`} aria-label={`Abrir ${order.referenceCode}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>

      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
        <a href={customerChatUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp do cliente">
          <MessageCircleMore className="h-4 w-4" />
        </a>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
        disabled={isMutating || order.status === OrderStatusValue.COMPLETED}
        onClick={onApprove}
        aria-label="Aprovar pedido"
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="Mais ações">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Gerenciar pedido</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link to={`${ADMIN_BASE_PATH}/pedidos/${order.id}`}>Abrir página do pedido</Link>
          </DropdownMenuItem>
          {order.whatsappUrl ? (
            <DropdownMenuItem asChild>
              <a href={order.whatsappUrl} target="_blank" rel="noreferrer">
                Ver mensagem do checkout
              </a>
            </DropdownMenuItem>
          ) : null}
          {order.status !== OrderStatusValue.COMPLETED && order.status !== OrderStatusValue.CANCELED ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`${ADMIN_BASE_PATH}/vendas/nova?orderId=${order.id}`} className="font-medium text-emerald-700 focus:text-emerald-700">
                  Registrar venda deste pedido
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isMutating} onClick={onRecovery}>
            Colocar em recuperação
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isMutating} onClick={onRedirected}>
            Marcar contato no WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isMutating} onClick={onCancel} className="text-red-600 focus:text-red-600">
            Cancelar pedido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
