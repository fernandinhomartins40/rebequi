import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOwnDeliveryRuns, getOwnDeliveryRun } from '@/services/api/delivery-runs';
import { Button } from '@/components/ui/button';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { RunOperations } from './run-operations';
export function DriverRuns() {
  const [page, setPage] = useState(1); const [id, setId] = useState<string>();
  const query = useQuery({ queryKey: ['driver', 'runs', page], queryFn: () => getOwnDeliveryRuns(page), retry: false });
  const detail = useQuery({ queryKey: ['driver', 'run', id], queryFn: () => getOwnDeliveryRun(id!), enabled: Boolean(id), retry: false });
  if (query.isLoading) return <DashboardLoading />;
  if (query.isError) return <DashboardError message={query.error.message} onRetry={() => query.refetch()} />;
  if (!query.data?.runs.length) return null;
  return <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-bold">Meus romaneios</h2>{id ? <><Button size="sm" variant="ghost" onClick={() => setId(undefined)}>Voltar aos meus romaneios</Button>{detail.isLoading ? <DashboardLoading /> : detail.isError ? <DashboardError message={detail.error.message} onRetry={() => detail.refetch()} /> : detail.data ? <><p className="break-words text-sm font-semibold">{detail.data.label} · {detail.data.snapshot.vehicle.plate}</p><p className="text-xs text-muted-foreground">Planejado para {new Date(detail.data.scheduledAt).toLocaleString('pt-BR')}.</p><RunOperations key={`${detail.data.id}:${detail.data.version}`} run={detail.data} driver /><ol className="space-y-3">{detail.data.stops.map(stop => <li key={stop.id} className="min-w-0 rounded-lg border p-3"><p className="font-semibold">{stop.position}. {stop.snapshot.referenceCode}</p><p className="break-words text-sm">{stop.snapshot.customerName}</p><p className="break-words text-sm">{stop.snapshot.address}</p><ul className="mt-2 text-xs">{stop.snapshot.items.map(item => <li key={item.id} className="break-words">{item.quantity} × {item.name}</li>)}</ul></li>)}</ol></> : null}</> : <><ul className="space-y-2">{query.data.runs.map(run => <li key={run.id}><Button variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left" onClick={() => setId(run.id)}>{run.label} · {new Date(run.scheduledAt).toLocaleString('pt-BR')}</Button></li>)}</ul>{query.data.totalPages > 1 ? <div className="flex justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>{page}/{query.data.totalPages}</span><Button variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button></div> : null}</>}</section>;
}
