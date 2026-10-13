import { useOnlineStatus } from '@/hooks/use-online-status';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryOccurrenceSchema, type DeliveryOccurrenceInput } from '@rebequi/shared/schemas';
import { apiFetch } from '@/services/api/client';
import type { RunOperationView } from '@/services/api/delivery-runs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PartnerSteps } from '@/pages/partners/steps';
const KINDS: Record<DeliveryOccurrenceInput['kind'], string> = { CUSTOMER_ABSENT: 'Cliente ausente', ADDRESS_REVIEW: 'Endereço precisa de conferência', ACCESS_BLOCKED: 'Acesso bloqueado', DAMAGED_MATERIAL: 'Material danificado', REFUSED_RECEIPT: 'Recebimento recusado', OTHER: 'Outro impedimento' };
export function DeliveryOccurrence({ run, driver }: { run: RunOperationView; driver: boolean }) {
  const online = useOnlineStatus(); const client = useQueryClient(); const stops = run.stops.filter(stop => stop.items.some(item => item.loaded > item.delivered + item.returnedToWarehouse));
  const [open, setOpen] = useState(false); const [step, setStep] = useState(1); const [stopId, setStopId] = useState(stops[0]?.id ?? '');
  const [kind, setKind] = useState<DeliveryOccurrenceInput['kind']>('CUSTOMER_ABSENT'); const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState(''); const intent = useRef<{ fingerprint: string; key: string }>();
  const stop = stops.find(value => value.id === stopId);
  const save = useMutation({ mutationFn: () => {
    const values = { stopId, kind, note }; const fingerprint = JSON.stringify(values);
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    return apiFetch(`/${driver ? 'driver/runs' : 'dispatch/runs'}/${encodeURIComponent(run.id)}/occurrences`, { method: 'POST', body: JSON.stringify(deliveryOccurrenceSchema.parse({ ...values, expectedVersion: run.version, requestKey: intent.current.key, confirmed })) });
  }, onSuccess: async () => {
    await Promise.all(['driver', 'delivery-runs', 'dispatch-runs', 'warehouse', 'customer'].map(key => client.invalidateQueries({ queryKey: [key] })));
    setOpen(false); setStep(1); setNote(''); setConfirmed(false); intent.current = undefined;
  }, onError: failure => setError(failure.message) });
  const advance = () => {
    if (!stop || step === 2 && note.trim().length < 3) { setError('Selecione a parada e descreva o que aconteceu.'); return; }
    setError(''); setStep(value => value + 1);
  };
  if (run.status !== 'IN_TRANSIT' || !stops.length) return null;
  return <section aria-label="Registrar impedimento" className="space-y-3 rounded-xl border bg-white p-3">
    <Button variant="outline" onClick={() => setOpen(value => !value)}>{open ? 'Fechar impedimento' : 'Registrar impedimento'}</Button>
    {open ? <><PartnerSteps step={step} labels={['Parada', 'Motivo', 'Confirmar']} />
      {step === 1 ? <div><Label htmlFor={`occurrence-stop-${run.id}`}>Parada com impedimento</Label><select id={`occurrence-stop-${run.id}`} className="min-h-11 w-full rounded-lg border bg-white px-3" value={stopId} onChange={event => setStopId(event.target.value)}>{stops.map(value => <option key={value.id} value={value.id}>{value.position}. {value.snapshot.referenceCode}</option>)}</select><p className="mt-2 break-words text-sm">{stop?.snapshot.address}</p></div>
        : step === 2 ? <div className="space-y-2"><Label htmlFor={`occurrence-kind-${run.id}`}>O que aconteceu?</Label><select id={`occurrence-kind-${run.id}`} className="min-h-11 w-full rounded-lg border bg-white px-3" value={kind} onChange={event => setKind(event.target.value as typeof kind)}>{Object.entries(KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Label htmlFor={`occurrence-note-${run.id}`}>Detalhes para a equipe</Label><Textarea id={`occurrence-note-${run.id}`} maxLength={300} value={note} onChange={event => setNote(event.target.value)} /><p className="text-xs text-muted-foreground">Informe só o necessário para resolver a entrega.</p></div>
          : <div className="space-y-3"><p className="text-sm font-semibold">{stop?.snapshot.referenceCode} · {KINDS[kind]}</p><p className="break-words text-sm">{note}</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Conferi a parada e o ocorrido.</label></div>}
      <div className="flex justify-between gap-2"><Button variant="outline" disabled={step === 1 || save.isPending} onClick={() => { setStep(value => value - 1); setConfirmed(false); }}>Voltar</Button>{step < 3 ? <Button onClick={advance}>Continuar</Button> : <Button disabled={!online || !confirmed || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Registrando…' : 'Confirmar impedimento'}</Button>}</div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </> : null}
  </section>;
}
