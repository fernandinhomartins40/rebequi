import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { fetchIntegrationOperations, retryIntegrationJob } from '@/services/api/channels';
import { DashboardPanel } from './components';

export function IntegrationOperationsPanel() {
  const client = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({ queryKey: ['merchant-dashboard', 'integration-operations'], queryFn: fetchIntegrationOperations, refetchInterval: 30_000 });
  const retry = useMutation({ mutationFn: retryIntegrationJob,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['merchant-dashboard', 'integration-operations'] }); toast({ title: 'Tarefa enviada para reprocessamento' }); },
    onError: error => toast({ variant: 'destructive', title: 'Não foi possível reprocessar', description: error instanceof Error ? error.message : 'Atualize e tente novamente.' }),
  });
  const data = query.data;
  return <DashboardPanel title="Processamento do catálogo" description="Tarefas locais. Publicação e sincronização externa dependem de um conector validado.">
    {query.isLoading ? <p className="text-sm text-muted-foreground">Consultando tarefas…</p> : query.isError ? <div className="flex items-center justify-between gap-3"><p className="text-sm text-destructive">Não foi possível consultar as tarefas.</p><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div> : <>
      <div className="flex flex-wrap gap-2 text-sm">
        {([['PENDING', 'Na fila'], ['RUNNING', 'Em execução'], ['FAILED', 'Com falha'], ['COMPLETED', 'Concluídas']] as const).map(([status, label]) => <span key={status} className="rounded-lg bg-muted px-3 py-2">{label}: <strong>{data?.counts[status] ?? 0}</strong></span>)}
      </div>
      {data?.oldestPendingAt ? <p className="mt-3 text-xs text-muted-foreground">Mais antiga na fila: {new Date(data.oldestPendingAt).toLocaleString('pt-BR')}</p> : null}
      {data?.failed.length ? <div className="mt-4 divide-y rounded-xl border px-3">{data.failed.map(job => <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{job.productName}</p><p className="text-xs text-muted-foreground">{job.message} · {job.attempts} tentativas</p></div><Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(job.id)}>Reprocessar</Button></div>)}</div> : null}
    </>}
  </DashboardPanel>;
}
