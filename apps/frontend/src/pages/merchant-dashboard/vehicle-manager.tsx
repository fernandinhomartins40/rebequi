import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vehicleSchema } from '@rebequi/shared/schemas';
import { getVehicles, saveVehicle, type Vehicle } from '@/services/api/vehicles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { PartnerSteps } from '@/pages/partners/steps';

export default function VehicleManager() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const query = useQuery({ queryKey: ['vehicles', page], queryFn: () => getVehicles(page), retry: false });
  return <section className="space-y-3 rounded-xl border bg-white p-4">
    <div className="flex items-center justify-between gap-2"><h2 className="font-bold">Veículos</h2><Button size="sm" onClick={() => setEditing('new')}>Cadastrar veículo</Button></div>
    {editing ? <VehicleEditor key={editing === 'new' ? 'new' : `${editing.id}:${editing.version}`} vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    {query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} /> : !query.data?.vehicles.length ? <p className="text-sm text-muted-foreground">Cadastre o primeiro veículo da loja.</p> : <ul className="grid gap-3 sm:grid-cols-2">{query.data.vehicles.map(vehicle => <li key={vehicle.id} className="min-w-0 rounded-lg border p-3">
      <p className="break-words font-semibold">{vehicle.label} · {vehicle.plate}</p>
      <p className="mt-1 text-xs text-muted-foreground">{vehicle.active ? 'Ativo' : 'Inativo'} · Carga: {vehicle.maxLoadKg ? `${vehicle.maxLoadKg} kg` : 'não informada'} · Volume: {vehicle.maxVolumeM3 ? `${vehicle.maxVolumeM3} m³` : 'não informado'}</p>
      {vehicle.restrictions ? <p className="mt-2 break-words text-xs">{vehicle.restrictions}</p> : null}
      <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing(vehicle)}>Editar veículo</Button>
    </li>)}</ul>}
    {query.data && query.data.totalPages > 1 ? <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-xs">{page}/{query.data.totalPages}</span><Button variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button></div> : null}
  </section>;
}

function VehicleEditor({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const client = useQueryClient(); const [step, setStep] = useState(1);
  const [plate, setPlate] = useState(vehicle?.plate ?? ''); const [label, setLabel] = useState(vehicle?.label ?? '');
  const [kg, setKg] = useState(vehicle?.maxLoadKg ?? ''); const [volume, setVolume] = useState(vehicle?.maxVolumeM3 ?? '');
  const [restrictions, setRestrictions] = useState(vehicle?.restrictions ?? ''); const [active, setActive] = useState(vehicle?.active ?? true);
  const [reason, setReason] = useState(''); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const values = () => ({ expectedVersion: vehicle?.version ?? 0, plate, label, maxLoadKg: kg.trim() ? kg.trim().replace(',', '.') : null, maxVolumeM3: volume.trim() ? volume.trim().replace(',', '.') : null, restrictions: restrictions.trim() || null, active, reason });
  const save = useMutation({ mutationFn: () => {
    const input = values(); const fingerprint = JSON.stringify(input);
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    return saveVehicle(vehicle?.id ?? null, vehicleSchema.parse({ ...input, confirmed, requestKey: intent.current.key }));
  }, onSuccess: () => { client.invalidateQueries({ queryKey: ['vehicles'] }); onClose(); }, onError: failure => setError(failure.message) });
  const advance = () => {
    const parsed = vehicleSchema.safeParse({ ...values(), reason: step === 1 ? 'Conferência inicial' : reason, confirmed: true, requestKey: crypto.randomUUID() });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Confira os dados.'); return; }
    setError(''); setStep(step + 1);
  };
  return <div className="space-y-3 rounded-xl border bg-slate-50 p-3">
    <PartnerSteps step={step} labels={['Veículo', 'Capacidade', 'Conferir']} />
    {step === 1 ? <div className="space-y-2"><Label htmlFor="vehicle-label">Nome do veículo</Label><Input id="vehicle-label" maxLength={80} value={label} onChange={event => setLabel(event.target.value)} /><Label htmlFor="vehicle-plate">Placa</Label><Input id="vehicle-plate" maxLength={9} value={plate} onChange={event => setPlate(event.target.value)} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Veículo ativo</label></div> : step === 2 ? <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Use a capacidade útil conferida. Deixe em branco quando desconhecida.</p>
      <Label htmlFor="vehicle-kg">Carga máxima em kg (opcional)</Label><Input id="vehicle-kg" inputMode="decimal" value={kg} onChange={event => setKg(event.target.value)} />
      <Label htmlFor="vehicle-volume">Volume máximo em m³ (opcional)</Label><Input id="vehicle-volume" inputMode="decimal" value={volume} onChange={event => setVolume(event.target.value)} />
      <Label htmlFor="vehicle-restrictions">Restrições de transporte (opcional)</Label><Textarea id="vehicle-restrictions" maxLength={500} value={restrictions} onChange={event => setRestrictions(event.target.value)} />
      <Label htmlFor="vehicle-reason">Motivo do cadastro ou alteração</Label><Input id="vehicle-reason" maxLength={300} value={reason} onChange={event => setReason(event.target.value)} />
    </div> : <div className="space-y-2 text-sm"><p className="break-words font-semibold">{label} · {plate.toUpperCase()}</p><p>Carga: {kg || 'não informada'}{kg ? ' kg' : ''} · Volume: {volume || 'não informado'}{volume ? ' m³' : ''}</p><p>{active ? 'Ativo' : 'Inativo'}</p><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Conferi os dados do veículo.</label></div>}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <div className="flex flex-wrap justify-between gap-2"><Button variant="ghost" disabled={save.isPending} onClick={onClose}>Fechar</Button>{step > 1 ? <Button variant="outline" disabled={save.isPending} onClick={() => { setStep(step - 1); setConfirmed(false); }}>Voltar</Button> : null}{step < 3 ? <Button onClick={advance}>Continuar</Button> : <Button disabled={!confirmed || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando…' : 'Salvar veículo'}</Button>}</div>
  </div>;
}
