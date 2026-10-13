import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';

type Notification = { id: string; resourceKind: string; resourceId: string; createdAt: string; readAt: string | null };
type Feed = { notifications: Notification[]; unread: number; page: number; totalPages: number };
const labels: Record<string, string> = { customer: 'Cliente', lead: 'Contato', quote: 'Orçamento', order: 'Pedido', sale: 'Venda' };

export function CommercialNotifications() {
  const client = useQueryClient(); const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['commercial-notifications', page], retry: false,
    queryFn: async () => (await apiFetch<{ data: Feed }>(`/commercial/notifications?page=${page}`)).data });
  const markRead = useMutation({ mutationFn: async (id: string) => apiFetch(`/commercial/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['commercial-notifications'] }); } });
  return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-bold">Encaminhamentos{query.data?.unread ? ` · ${query.data.unread} novos` : ''}</summary>
    <div className="mt-3 space-y-3">{query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message="Não foi possível carregar os encaminhamentos." onRetry={() => query.refetch()} /> : !query.data?.notifications.length ? <p className="text-sm text-muted-foreground">Nenhum encaminhamento recebido.</p> : <ul className="max-h-80 space-y-2 overflow-auto">{query.data.notifications.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-semibold">{labels[item.resourceKind] ?? 'Atendimento'} encaminhado para você</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('pt-BR')}{item.readAt ? ' · Lido' : ' · Novo'}</p></div>{!item.readAt ? <Button type="button" size="sm" variant="outline" disabled={markRead.isPending} onClick={() => markRead.mutate(item.id)}>Marcar como lido</Button> : null}</li>)}</ul>}
      {markRead.isError ? <p role="alert" className="text-sm text-red-700">{markRead.error.message}</p> : null}
      {query.data && query.data.totalPages > 1 ? <div className="flex justify-between gap-2"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Mais recentes</Button><Button type="button" variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(value => value + 1)}>Mais antigos</Button></div> : null}
    </div>
  </details>;
}
