import { useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignDriver, getActiveDrivers } from '@/services/api/drivers';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { PartnerSteps } from '@/pages/partners/steps';
import type { Fulfillment } from '@/services/api/fulfillments';
export function DriverAssignment({ row }: { row: Fulfillment }) {
  const [open, setOpen] = useState(false); const [step, setStep] = useState(1);
  const [driverId, setDriverId] = useState(row.driverId ?? ''); const [reason, setReason] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const intent = useRef<{ key: string; fingerprint: string }>(); const client = useQueryClient();
  const choices = useInfiniteQuery({ queryKey: ['active-drivers'], queryFn: ({ pageParam }) => getActiveDrivers(pageParam), initialPageParam: 1, getNextPageParam: last => last.page < last.totalPages ? last.page + 1 : undefined, enabled: open, retry: false });
  const drivers = choices.data?.pages.flatMap(page => page.drivers) ?? [];
  const save = useMutation({ mutationFn: () => { const fingerprint = JSON.stringify({ driverId, reason }); if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() }; return assignDriver(row.id, { driverId: driverId || null, reason, confirmed: true, expectedVersion: row.version, requestKey: intent.current.key }); }, onSuccess: () => { client.invalidateQueries({ queryKey: ['warehouse'] }); client.invalidateQueries({ queryKey: ['driver'] }); setOpen(false); } });
  return <section className="space-y-3 rounded-lg border p-3"><h3 className="text-sm font-semibold">Motorista responsável</h3><p className="text-xs text-muted-foreground">{row.driverId ? 'Entrega atribuída a um motorista.' : 'Ainda não atribuído.'}</p>
    <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>{open ? 'Fechar atribuição' : 'Atribuir motorista'}</Button>
    {open ? <><PartnerSteps step={step} labels={['Motorista', 'Motivo', 'Conferir']} />{step === 1 ? choices.isLoading ? <DashboardLoading /> : choices.isError ? <DashboardError message={choices.error.message} onRetry={() => choices.refetch()} /> : <div><Label htmlFor="driver-choice">Motorista ativo</Label><select id="driver-choice" className="min-h-11 w-full rounded-lg border bg-white px-3" value={driverId} onChange={event => setDriverId(event.target.value)}><option value="">Sem motorista</option>{row.driverId && !drivers.some(driver => driver.id === row.driverId) ? <option value={row.driverId}>Atribuição atual</option> : null}{drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select>{choices.hasNextPage ? <Button size="sm" variant="ghost" disabled={choices.isFetchingNextPage} onClick={() => choices.fetchNextPage()}>Carregar mais motoristas</Button> : null}</div> : step === 2 ? <div><Label htmlFor="driver-reason">Motivo da atribuição</Label><Input id="driver-reason" maxLength={300} value={reason} onChange={event => setReason(event.target.value)} /></div> : <div><p className="text-sm">{driverId ? drivers.find(driver => driver.id === driverId)?.name ?? 'Motorista atual' : 'Remover motorista desta entrega'}</p><label className="mt-2 flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Conferi e autorizo a atribuição.</label></div>}
    {save.isError ? <p role="alert" className="text-sm text-red-700">{save.error.message}</p> : null}<div className="flex justify-between gap-2"><Button variant="outline" disabled={step === 1 || save.isPending} onClick={() => { setStep(step - 1); setConfirmed(false); }}>Voltar</Button>{step < 3 ? <Button disabled={(step === 1 && (choices.isLoading || choices.isError)) || (step === 2 && reason.trim().length < 3)} onClick={() => setStep(step + 1)}>Continuar</Button> : <Button disabled={!confirmed || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Atribuindo…' : 'Confirmar atribuição'}</Button>}</div></> : null}
  </section>;
}
