import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';

type Materials = { materials: { id: string; name: string; orderedQuantity: number; removedQuantity: number; receivedQuantity: number; pendingQuantity: number }[]; page: number; totalPages: number };
export function OrderMaterials({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['customer', 'order-materials', orderId, page], enabled: open, retry: false,
    queryFn: async () => (await apiFetch<{ data: Materials }>(`/orders/me/${encodeURIComponent(orderId)}/fulfillment-materials?page=${page}`)).data });
  return <details className="rounded-lg border p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-medium">O que recebi e o que falta?</summary>
    {query.isLoading ? <DashboardLoading label="Consultando materiais…" /> : query.isError ? <DashboardError message="Não foi possível consultar os materiais." onRetry={() => query.refetch()} /> : query.data ? <>
      <Button className="mt-3" variant="ghost" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}>Atualizar materiais</Button>
      <ul className="mt-3 space-y-3">{query.data.materials.map(item => <li key={item.id} className="rounded-lg bg-slate-50 p-3">
        <p className="break-words text-sm font-semibold">{item.name}</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">Recebido comigo</dt><dd className="font-semibold">{item.receivedQuantity}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Falta receber</dt><dd className="font-semibold">{item.pendingQuantity}</dd></div>
        </dl>
        {item.removedQuantity > 0 ? <p className="mt-2 text-xs text-muted-foreground">Devolvido ou retirado do pedido: {item.removedQuantity}</p> : null}
      </li>)}</ul>
      {!query.data.materials.length ? <p className="mt-3 text-sm text-muted-foreground">A loja ainda não iniciou a preparação.</p> : null}
      {query.data.totalPages > 1 ? <div className="mt-3 flex items-center justify-between gap-2">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button>
        <span className="text-xs">{page}/{query.data.totalPages}</span>
        <Button variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(value => value + 1)}>Próxima</Button>
      </div> : null}
    </> : null}
  </details>;
}
