import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDateTime } from '@rebequi/shared/utils';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';

type Delivery = { id: string; referenceCode: string; status: string; mode: string; scheduledAt: string | null; updatedAt: string };
const labels: Record<string, string> = { RECEIVED: 'Materiais recebidos', PARTIALLY_RECEIVED: 'Materiais recebidos parcialmente', LOADED: 'Materiais carregados', IN_TRANSIT: 'Entrega em andamento', AWAITING_DETAILS: 'Confirmando retirada ou entrega', PICKING: 'Em separação', CHECKING: 'Conferindo os materiais', READY: 'Materiais preparados', CANCELED: 'Operação cancelada', PAYMENT_PENDING: 'Aguardando confirmação de pagamento' };
export function SaleDeliveries() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['customer', 'sale-deliveries', page], refetchInterval: 30000,
    queryFn: async () => (await apiFetch<{ data: { deliveries: Delivery[]; totalPages: number } }>(`/sales/me/deliveries?page=${page}`)).data });
  if (query.isLoading) return <DashboardLoading label="Consultando entregas da loja…" />;
  if (query.isError) return <DashboardError message="Não foi possível consultar as entregas da loja." onRetry={() => query.refetch()} />;
  if (!query.data?.deliveries.length) return null;
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Compras na loja</h2><p className="text-sm text-muted-foreground">Entregas e retiradas de compras vinculadas ao seu cadastro.</p>
    {query.data.deliveries.map(delivery => <article key={delivery.id} className="space-y-2 rounded-xl border bg-white p-5">
      <p className="break-words font-semibold">Venda {delivery.referenceCode}</p>
      <p className="text-sm">{labels[delivery.status] ?? 'Andamento em conferência'}{delivery.mode === 'PICKUP' ? ' · Retirada na loja' : delivery.mode === 'DELIVERY' ? ' · Entrega' : ''}</p>
      <p className="text-xs text-muted-foreground">Atualizado em {formatDateTime(delivery.updatedAt)}</p>
      {delivery.scheduledAt ? <p className="text-xs">Agendamento confirmado: {formatDateTime(delivery.scheduledAt)}</p> : null}
    </article>)}
    {query.data.totalPages > 1 ? <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><span className="text-xs">{page}/{query.data.totalPages}</span><Button variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(value => value + 1)}>Próxima</Button></div> : null}
  </section>;
}
