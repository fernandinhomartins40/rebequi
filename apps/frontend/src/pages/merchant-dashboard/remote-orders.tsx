import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { fetchRemoteOrders } from '@/services/api/channels';
import { formatCurrency } from '@/lib/channel-ui';
import { DashboardPanel } from './components';

const STATUS: Record<string, string> = { paid: 'Pago', confirmed: 'Confirmado', payment_required: 'Aguardando pagamento', payment_in_process: 'Pagamento em análise', cancelled: 'Cancelado', partially_paid: 'Pagamento parcial' };

export function RemoteOrdersPanel({ channelId }: { channelId: string }) {
  const [page, setPage] = useState(1); const [enabled, setEnabled] = useState(false);
  const query = useQuery({ queryKey: ['merchant-dashboard', 'remote-orders', channelId, page], queryFn: () => fetchRemoteOrders(channelId, page), enabled,
    retry: false, staleTime: 60_000, refetchOnWindowFocus: false });
  return <DashboardPanel title="Pedidos do Mercado Livre" description="Consulta da conta autorizada. A importação para vendas e estoque será conferida separadamente.">
    <div className="mb-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={query.isFetching} onClick={() => enabled ? query.refetch() : setEnabled(true)}>{query.isFetching ? 'Consultando…' : enabled ? 'Atualizar pedidos' : 'Consultar pedidos'}</Button>{query.data ? <span className="text-xs text-muted-foreground">{query.data.total} pedidos · Consulta em {new Date(query.data.checkedAt).toLocaleString('pt-BR')}</span> : null}</div>
    {query.isError ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{query.error.message}</p> : null}
    {query.data && !query.data.orders.length ? <p className="text-sm text-muted-foreground">Nenhum pedido nesta página.</p> : null}
    <div className="space-y-3">{query.data?.orders.map(order => <article key={order.id} className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="break-all text-sm font-semibold">Pedido #{order.id}</h3><p className="text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Data indisponível'}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs">{STATUS[order.status] ?? 'Status em conferência'}</span></div>
      <ul className="my-3 divide-y">{order.items.map((item, index) => <li key={`${item.externalListingId}-${index}`} className="flex justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words">{item.quantity} × {item.title}</span><span className="shrink-0">{formatCurrency(item.unitPrice)}</span></li>)}</ul>
      <p className="text-right text-sm font-semibold">Total {formatCurrency(order.total)}</p>
    </article>)}</div>
    {query.data ? <div className="mt-4 flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setPage(current => current - 1)}>Anterior</Button><span className="text-sm">Página {page}</span><Button variant="outline" disabled={!query.data.hasNext || query.isFetching} onClick={() => setPage(current => current + 1)}>Próxima</Button></div> : null}
  </DashboardPanel>;
}
