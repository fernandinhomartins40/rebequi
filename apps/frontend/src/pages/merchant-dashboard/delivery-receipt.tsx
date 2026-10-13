import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryReceiptSchema } from '@rebequi/shared/schemas';
import { apiFetch } from '@/services/api/client';
import type { RunOperationView } from '@/services/api/delivery-runs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartnerSteps } from '@/pages/partners/steps';

export function DeliveryReceipt({ run, driver }: { run: RunOperationView; driver: boolean }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false); const [step, setStep] = useState(1);
  const available = run.stops.filter(stop => stop.items.some(item => item.loaded > item.delivered + item.returnedToWarehouse));
  const [stopId, setStopId] = useState(available[0]?.id ?? '');
  const [quantities, setQuantities] = useState<Record<string, string>>({}); const [receiverName, setReceiverName] = useState('');
  const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const stop = available.find(item => item.id === stopId);
  const selected = () => stop?.items.filter(item => Number(quantities[item.id] ?? 0) > 0).map(item => ({ id: item.id, quantity: Number(quantities[item.id]) })) ?? [];
  const save = useMutation({ mutationFn: () => {
    const values = { stopId, receiverName, items: selected() }; const fingerprint = JSON.stringify(values);
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    return apiFetch(`/${driver ? 'driver/runs' : 'dispatch/runs'}/${encodeURIComponent(run.id)}/receipts`, { method: 'POST', body: JSON.stringify(deliveryReceiptSchema.parse({ ...values, requestKey: intent.current.key, expectedVersion: run.version, confirmed })) });
  }, onSuccess: async () => {
    await Promise.all(['driver', 'delivery-runs', 'dispatch-runs', 'warehouse', 'customer'].map(key => client.invalidateQueries({ queryKey: [key] })));
    setOpen(false); setStep(1); setQuantities({}); setReceiverName(''); setConfirmed(false); intent.current = undefined;
  }, onError: failure => setError(failure.message) });
  const advance = () => {
    if (step === 1 && (!selected().length || stop?.items.some(item => {
      const quantity = Number(quantities[item.id] ?? 0);
      return !Number.isInteger(quantity) || quantity < 0 || quantity > item.loaded - item.delivered - item.returnedToWarehouse;
    }))) { setError('Informe quanto foi entregue agora, dentro do saldo desta parada.'); return; }
    if (step === 2 && receiverName.trim().length < 2) { setError('Informe o nome de quem recebeu os materiais.'); return; }
    setError(''); setStep(value => value + 1);
  };
  if (run.status !== 'IN_TRANSIT' || !available.length) return null;
  return <section aria-label="Registrar entrega" className="space-y-3 rounded-xl border bg-white p-3">
    <Button variant="outline" onClick={() => setOpen(value => !value)}>{open ? 'Fechar entrega' : 'Registrar entrega'}</Button>
    {open ? <><PartnerSteps step={step} labels={['Materiais', 'Recebedor', 'Confirmar']} />
      {step === 1 ? <div className="space-y-3"><Label htmlFor={`receipt-stop-${run.id}`}>Parada da entrega</Label>
        <select id={`receipt-stop-${run.id}`} className="min-h-11 w-full rounded-lg border bg-white px-3" value={stopId} onChange={event => { setStopId(event.target.value); setQuantities({}); setConfirmed(false); }}>
          {available.map(item => <option key={item.id} value={item.id}>{item.position}. {item.snapshot.referenceCode}</option>)}
        </select><p className="break-words text-sm">{stop?.snapshot.address}</p>
        {stop?.items.filter(item => item.loaded > item.delivered + item.returnedToWarehouse).map(item => <div key={item.id} className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p className="break-words text-sm font-semibold">{stop.snapshot.items.find(value => value.id === item.fulfillmentItemId)?.name ?? 'Material carregado'}</p>
          <p className="text-xs text-muted-foreground">Nesta viagem: recebido {item.delivered} · falta {item.loaded - item.delivered - item.returnedToWarehouse}</p>
          <Label htmlFor={`delivery-quantity-${item.id}`}>Quantidade entregue agora</Label>
          <Input id={`delivery-quantity-${item.id}`} type="number" min={0} max={item.loaded - item.delivered - item.returnedToWarehouse} step={1} value={quantities[item.id] ?? '0'} onChange={event => setQuantities(values => ({ ...values, [item.id]: event.target.value }))} />
        </div>)}</div> : step === 2 ? <div><Label htmlFor={`delivery-receiver-${run.id}`}>Nome do recebedor</Label><Input id={`delivery-receiver-${run.id}`} maxLength={100} autoComplete="off" value={receiverName} onChange={event => setReceiverName(event.target.value)} /></div> : <div className="space-y-3">
        <p className="text-sm font-semibold">{stop?.snapshot.referenceCode} · {receiverName}</p>
        <ul className="space-y-2 text-sm">{selected().map(item => <li key={item.id} className="break-words">{item.quantity} × {stop?.snapshot.items.find(value => value.id === stop.items.find(line => line.id === item.id)?.fulfillmentItemId)?.name ?? 'Material'}</li>)}</ul>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Conferi o recebedor e entreguei fisicamente estes materiais.</label>
      </div>}
      <div className="flex justify-between gap-2"><Button variant="outline" disabled={step === 1 || save.isPending} onClick={() => { setStep(value => value - 1); setConfirmed(false); }}>Voltar</Button>
        {step < 3 ? <Button onClick={advance}>Continuar</Button> : <Button disabled={!confirmed || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Registrando…' : 'Confirmar entrega'}</Button>}
      </div>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </> : null}
  </section>;
}
