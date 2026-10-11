import { OrderStatus as OrderStatusValue } from '@rebequi/shared/types';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MessageCircleMore,
  RotateCcw,
  Save,
  XCircle,
} from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { Link, useParams } from 'react-router-dom';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { buildCustomerWhatsappUrl } from '@/lib/order-ui';
import { fetchAdminOrderById, updateAdminOrderStatus, reserveAdminOrderStock } from '@/services/api/orders';
import type { OrderStatus } from '@/types';
import { DashboardPanel, InfoRow, SectionLeadCard } from './components';
import { ADMIN_BASE_PATH } from './config';

const STATUS_OPTIONS: Array<{ label: string; value: OrderStatus }> = [
  { label: 'Aguardando WhatsApp', value: OrderStatusValue.PENDING_WHATSAPP },
  { label: 'Enviado ao WhatsApp', value: OrderStatusValue.WHATSAPP_REDIRECTED },
  { label: 'Em recuperação', value: OrderStatusValue.IN_RECOVERY },
  { label: 'Concluído', value: OrderStatusValue.COMPLETED },
  { label: 'Cancelado', value: OrderStatusValue.CANCELED },
];

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function MerchantDashboardOrderDetails() {
  const { orderId = '' } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [internalNotes, setInternalNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(OrderStatusValue.PENDING_WHATSAPP);

  const orderQuery = useQuery({
    queryKey: ['merchant-dashboard', 'orders', 'detail', orderId],
    queryFn: () => fetchAdminOrderById(orderId),
    enabled: Boolean(orderId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ status, notes }: { status: OrderStatus; notes: string }) =>
      updateAdminOrderStatus(orderId, {
        internalNotes: notes.trim() || undefined,
        status,
      }),
    onSuccess: async (updatedOrder) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders-badge'] }),
      ]);

      queryClient.setQueryData(['merchant-dashboard', 'orders', 'detail', orderId], updatedOrder);
      toast({
        title: 'Pedido atualizado',
        description: `Pedido ${updatedOrder.referenceCode} salvo com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar pedido',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o pedido.',
      });
    },
  });

  const reserveMutation = useMutation({
    mutationFn: () => reserveAdminOrderStock(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders'] });
      toast({ title: 'Itens reservados por 30 minutos' });
    },
    onError: error => toast({ variant: 'destructive', title: 'Não foi possível reservar', description: error instanceof Error ? error.message : 'Confira o estoque.' }),
  });

  useEffect(() => {
    if (!orderQuery.data) {
      return;
    }

    setInternalNotes(orderQuery.data.internalNotes || '');
    setSelectedStatus(orderQuery.data.status);
  }, [orderQuery.data]);

  const order = orderQuery.data;

  const customerChatUrl = useMemo(() => {
    if (!order) {
      return '#';
    }

    return buildCustomerWhatsappUrl(order);
  }, [order]);

  const saveOrder = async (statusOverride?: OrderStatus) => {
    const nextStatus = statusOverride ?? selectedStatus;
    await updateMutation.mutateAsync({ notes: internalNotes, status: nextStatus });
  };

  if (orderQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando pedido...</p>;
  }

  if (orderQuery.isError || !order) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Pedido indisponivel</AlertTitle>
        <AlertDescription>
          {orderQuery.error instanceof Error ? orderQuery.error.message : 'Não foi possível carregar este pedido.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {order.status !== OrderStatusValue.COMPLETED && order.status !== OrderStatusValue.CANCELED ? (
        <DashboardPanel title="Reserva de estoque">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{order.stockReservation?.active ? `Reservado até ${formatDateTime(order.stockReservation.expiresAt as string)}` : 'Reserve ao confirmar a intenção de compra. Liberação automática em 30 minutos.'}</p>
            <Button disabled={reserveMutation.isPending || order.stockReservation?.active} onClick={() => reserveMutation.mutate()}>Reservar itens</Button>
          </div>
        </DashboardPanel>
      ) : null}
      <Button asChild variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
        <Link to={`${ADMIN_BASE_PATH}/pedidos`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para pedidos
        </Link>
      </Button>

      <SectionLeadCard
        badge="Pedido"
        title={`Gerenciar ${order.referenceCode}`}
        description="Acompanhamento detalhado do pedido, com conversa direta com o cliente, ajuste de status e notas internas de operação."
        tone="blue"
        actions={
          <>
            <Badge className="border-primary/15 bg-primary/5 text-primary">{order.source}</Badge>
            <OrderStatusBadge status={order.status} />
          </>
        }
      />

      <section className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <DashboardPanel
            badge="Cliente"
            title="Resumo comercial"
            description="Informações centrais para atendimento rápido sem voltar para a lista."
          >
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <InfoRow label="Cliente" value={order.customerNameSnapshot} />
              <InfoRow label="WhatsApp" value={formatWhatsapp(order.customerWhatsapp)} />
              <InfoRow label="Referencia" value={order.referenceCode} />
              <InfoRow label="Criado em" value={formatDateTime(order.createdAt)} />
              <InfoRow label="Atualizado em" value={formatDateTime(order.updatedAt)} />
              <InfoRow label="Subtotal" value={formatPrice(order.subtotal)} />
            </div>

            {order.customerNote ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Observação do cliente
                </p>
                <p className="mt-1.5 text-sm leading-6 text-foreground">{order.customerNote}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="gap-2">
                <a href={customerChatUrl} target="_blank" rel="noreferrer">
                  <MessageCircleMore className="h-4 w-4" />
                  Conversar com cliente
                </a>
              </Button>

              {order.whatsappUrl ? (
                <Button asChild variant="outline" className="gap-2">
                  <a href={order.whatsappUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver mensagem do checkout
                  </a>
                </Button>
              ) : null}
            </div>
          </DashboardPanel>

          <DashboardPanel
            badge="Itens"
            title="Produtos deste pedido"
            description="Snapshots dos itens que chegaram pelo checkout para conferencia e atendimento."
          >
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center">
                  {item.productImageUrlSnapshot ? (
                    <img
                      src={item.productImageUrlSnapshot}
                      alt={item.productNameSnapshot}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border/60 bg-background text-xs text-muted-foreground">
                      Sem foto
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{item.productNameSnapshot}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x {formatPrice(item.unitPrice)}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-semibold text-foreground">{formatPrice(item.quantity * item.unitPrice)}</p>
                    {item.originalPrice ? (
                      <p className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel
            badge="Gestão"
            title="Atualizar acompanhamento"
            description="Centralize aqui aprovacao, recuperação, cancelamento e observacoes internas."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Status do pedido</p>
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Observações internas</p>
                <Textarea
                  placeholder="Ex.: cliente pediu retorno hoje a tarde, aguardando confirmacao do estoque."
                  value={internalNotes}
                  onChange={(event) => setInternalNotes(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button disabled={updateMutation.isPending} onClick={() => void saveOrder()}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar acompanhamento
                </Button>
                <Button
                  variant="secondary"
                  disabled={updateMutation.isPending}
                  onClick={() => void saveOrder(OrderStatusValue.IN_RECOVERY)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Colocar em recuperação
                </Button>
                <Button disabled={updateMutation.isPending} onClick={() => void saveOrder(OrderStatusValue.COMPLETED)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprovar pedido
                </Button>
                <Button
                  variant="destructive"
                  disabled={updateMutation.isPending}
                  onClick={() => void saveOrder(OrderStatusValue.CANCELED)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar pedido
                </Button>
              </div>
            </div>
          </DashboardPanel>
        </div>
      </section>
    </div>
  );
}
