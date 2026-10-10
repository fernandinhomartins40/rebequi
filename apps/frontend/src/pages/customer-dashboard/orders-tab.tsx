import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MessageCircle, RefreshCcw, ShoppingCart } from 'lucide-react';
import { formatDateTime } from '@rebequi/shared/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '@/lib/order-ui';
import { formatCurrency } from '@/lib/sale-ui';
import { fetchMyOrders } from '@/services/api/orders';
import { fetchProductById } from '@/services/api/products';
import type { CustomerOrder } from '@/types';
import { SectionPanel } from './components';
import { DashboardHeading } from '@/components/dashboard/DashboardElements';
import { DashboardEmpty, DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';

export function OrdersTab() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [repeating, setRepeating] = useState<string | null>(null);
  const ordersQuery = useQuery({
    queryKey: ['customer', 'orders'], queryFn: fetchMyOrders, refetchInterval: 30000,
  });
  const selectedId = params.get('orderId');
  const scrolledId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || !ordersQuery.data || scrolledId.current === selectedId) return;
    scrolledId.current = selectedId;
    document.getElementById(`customer-order-${selectedId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [selectedId, ordersQuery.data]);

  const repeatOrder = async (order: CustomerOrder) => {
    if (repeating) return;
    setRepeating(order.id);
    const unavailable: string[] = [];
    let added = 0;
    try {
      // Read current prices/stock. Never reuse an expired promotion or price.
      for (const item of order.items) {
        if (!item.productId) { unavailable.push(item.productNameSnapshot); continue; }
        try {
          const product = await fetchProductById(item.productId);
          if (!product.isActive || product.stock <= 0) {
            unavailable.push(item.productNameSnapshot); continue;
          }
          addItem(product, Math.min(item.quantity, product.stock));
          added++;
          if (product.stock < item.quantity) unavailable.push(`${product.name} (quantidade reduzida ao estoque)`);
        } catch { unavailable.push(item.productNameSnapshot); }
      }
      toast({
        title: added ? 'Itens adicionados ao carrinho' : 'Nenhum item disponível agora',
        description: unavailable.length
          ? `Revise o carrinho. Não foi possível repetir integralmente: ${unavailable.join(', ')}.`
          : 'Confira os preços e as quantidades atuais antes de concluir.',
      });
      if (added) navigate('/carrinho');
    } finally { setRepeating(null); }
  };

  return <div className="space-y-5">
    <DashboardHeading title="Meus pedidos" description="Acompanhe seus pedidos e retome a conversa com a loja." actions={
      <Button variant="outline" size="sm" onClick={() => void ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
        <RefreshCcw className="mr-2 h-4 w-4" /> Atualizar pedidos
      </Button>
    } />
    {ordersQuery.isLoading ? <DashboardLoading label="Carregando pedidos…" />
      : ordersQuery.isError ? <DashboardError message="Não foi possível carregar seus pedidos." onRetry={() => void ordersQuery.refetch()} retrying={ordersQuery.isFetching} />
      : !ordersQuery.data?.length ? <DashboardEmpty title="Você ainda não tem pedidos" action={<Button asChild><Link to="/categorias">Escolher produtos</Link></Button>} /> : ordersQuery.data.map((order) => <SectionPanel key={order.id}
        id={`customer-order-${order.id}`} className={`scroll-mt-24 space-y-4 p-5 ${order.id === selectedId ? 'ring-2 ring-primary/40' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-bold">Pedido {order.referenceCode}</h3>
            <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
          </div>
          <Badge variant="outline" className={getOrderStatusBadgeClass(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
        </div>
        <p className="text-sm">{order.itemCount} itens · <strong>{formatCurrency(order.subtotal)}</strong></p>
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Ver itens do pedido</summary>
          <ul className="mt-3 space-y-2">
            {order.items.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{item.quantity} × {item.productNameSnapshot}</span>
              <span className="shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
            </li>)}
          </ul>
          {order.customerNote ? <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{order.customerNote}</p> : null}
        </details>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {order.whatsappUrl ? <Button asChild variant="outline"><a href={order.whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" /> Retomar no WhatsApp
          </a></Button> : null}
          <Button variant="outline" disabled={Boolean(repeating)} onClick={() => void repeatOrder(order)}>
            {repeating === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
            Adicionar itens ao carrinho
          </Button>
        </div>
      </SectionPanel>)}
  </div>;
}
