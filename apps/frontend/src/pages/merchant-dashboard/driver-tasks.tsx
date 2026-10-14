import { DeliveryNavigation } from './delivery-navigation';
import { useState } from 'react';
import { useQuery, useIsMutating } from '@tanstack/react-query';
import { PwaControls } from '@/components/dashboard/PwaControls';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Link, useParams } from 'react-router-dom';
import { getDriverTask, getDriverTasks } from '@/services/api/drivers';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { Button } from '@/components/ui/button';
import { PageHeader } from './components';
import { ADMIN_BASE_PATH } from './config';
import { DriverRuns } from './driver-runs';
const LABELS: Record<string, string> = { RECEIVED: 'Materiais recebidos', PARTIALLY_RECEIVED: 'Materiais recebidos parcialmente', LOADED: 'Materiais carregados', IN_TRANSIT: 'Entrega em andamento', PICKING: 'Em separação', CHECKING: 'Em conferência', READY: 'Pronto para expedição' };
export default function DriverTasks() {
  const { taskId } = useParams(); const [page, setPage] = useState(1);
  const [editingRun, setEditingRun] = useState(false); const mutating = useIsMutating();
  const online = useOnlineStatus();
  const list = useQuery({ queryKey: ['driver', 'tasks', page], queryFn: () => getDriverTasks(page), enabled: !taskId, retry: false });
  const detail = useQuery({ queryKey: ['driver', 'task', taskId], queryFn: () => getDriverTask(taskId!), enabled: Boolean(taskId), retry: false });
  return <div className="space-y-4"><PageHeader title="Minhas entregas" description="Confira as tarefas atribuídas a você." />
    {!online ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">Sem conexão. Mantenha esta tela aberta e reconecte-se para confirmar operações. Nada será enviado automaticamente.</p> : null}
    <PwaControls canUpdate={online && !taskId && !editingRun && !mutating} showInstall={!taskId && !editingRun} manifestPath="/motoristas/manifest.webmanifest" workerPath="/driver-sw.js" scope="/painel-lojista/painel/entregas" updateMessage="DRIVER_APPLY_UPDATE" installHref="/painel-lojista/painel/entregas/instalar/" />
    {!taskId ? <DriverRuns onEditingChange={setEditingRun} /> : null}{taskId ? <><Button asChild variant="outline"><Link to={`${ADMIN_BASE_PATH}/entregas`}>Voltar para minhas entregas</Link></Button>{detail.isLoading ? <DashboardLoading /> : detail.isError ? <DashboardError message={detail.error.message} onRetry={() => detail.refetch()} /> : detail.data ? <section className="space-y-4 rounded-xl border bg-white p-4">
      <div><h2 className="font-bold">{detail.data.sale.referenceCode}</h2><p className="text-sm">{LABELS[detail.data.status] ?? 'Confira a etapa com a loja'}</p><p className="mt-1 break-words text-sm">{detail.data.sale.customerNameSnapshot || 'Cliente não informado'}</p></div>
      <div><h3 className="font-semibold">Endereço</h3><p className="break-words text-sm">{detail.data.address}</p><DeliveryNavigation address={detail.data.address} />{detail.data.scheduledAt ? <p className="mt-1 text-xs">Agendado: {new Date(detail.data.scheduledAt).toLocaleString('pt-BR')}</p> : <p className="text-xs text-muted-foreground">Sem agendamento confirmado.</p>}</div>
      <div><h3 className="font-semibold">Materiais</h3><ul className="mt-2 space-y-2">{detail.data.items.map(item => <li key={item.id} className="min-w-0 rounded-lg border p-3"><p className="break-words text-sm font-semibold">{item.nameSnapshot}</p><p className="text-xs text-muted-foreground">Conferido: {item.checked} · Recebido: {item.delivered}</p></li>)}</ul></div>
    </section> : null}</> : list.isLoading ? <DashboardLoading /> : list.isError ? <DashboardError message={list.error.message} onRetry={() => list.refetch()} /> : !list.data?.tasks.length ? <p className="rounded-xl border bg-white p-4 text-sm">Nenhuma entrega atribuída a você.</p> : <><ul className="grid gap-3 sm:grid-cols-2">{list.data.tasks.map(task => <li key={task.id} className="min-w-0 rounded-xl border bg-white p-4"><p className="font-bold">{task.sale.referenceCode}</p><p className="mt-1 text-sm">{LABELS[task.status]}</p><p className="mt-1 break-words text-xs text-muted-foreground">{task.region || 'Região não informada'}</p><Button asChild variant="outline" size="sm" className="mt-3"><Link to={`${ADMIN_BASE_PATH}/entregas/${task.id}`}>Conferir entrega</Link></Button></li>)}</ul>{list.data.totalPages > 1 ? <div className="flex justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>{page}/{list.data.totalPages}</span><Button variant="outline" disabled={page >= list.data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button></div> : null}</>}
  </div>;
}
