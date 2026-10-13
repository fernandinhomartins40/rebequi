import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDispatchRuns, getDispatchRun } from '@/services/api/delivery-runs';
import { Button } from '@/components/ui/button';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { RunOperations } from './run-operations';
import { RUN_STATUS } from './run-status';
export function DispatchRuns() {
  const [page, setPage] = useState(1); const [id, setId] = useState<string>();
  const query = useQuery({ queryKey: ['dispatch-runs', page], queryFn: () => getDispatchRuns(page), retry: false });
  const detail = useQuery({ queryKey: ['dispatch-runs', 'detail', id], queryFn: () => getDispatchRun(id!), enabled: Boolean(id), retry: false });
  return <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-bold">Expedição</h2>{id ? <><Button size="sm" variant="ghost" onClick={() => setId(undefined)}>Voltar para a expedição</Button>{detail.isLoading ? <DashboardLoading /> : detail.isError ? <DashboardError message={detail.error.message} onRetry={() => detail.refetch()} /> : detail.data ? <><p className="break-words font-semibold">{detail.data.label} · {detail.data.snapshot.vehicle.plate}</p><RunOperations key={`${detail.data.id}:${detail.data.version}`} run={detail.data} /></> : null}</> : query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} /> : !query.data?.runs.length ? <p className="text-sm">Nenhum romaneio na expedição.</p> : <><ul className="space-y-2">{query.data.runs.map(run => <li key={run.id}><Button variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left" onClick={() => setId(run.id)}>{run.label} · {RUN_STATUS[run.status] ?? 'Confira a etapa'}</Button></li>)}</ul>{query.data.totalPages > 1 ? <div className="flex justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>{page}/{query.data.totalPages}</span><Button variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button></div> : null}</>}</section>;
}
