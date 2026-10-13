import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saveCommercialUnitPolicySchema, commercialUnitCodeSchema, type CommercialUnitPolicy } from '@rebequi/shared/schemas';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PartnerSteps } from '@/pages/partners/steps';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
type StoredPolicy = Omit<CommercialUnitPolicy, 'confirmed'> & { id: string; version: number; reason: string };
const LABELS: Record<string, string> = { UNIT: 'Unidade', PACKAGE: 'Pacote', BAG: 'Saco', BOX: 'Caixa', KG: 'Quilograma', TONNE: 'Tonelada', M: 'Metro', M2: 'Metro quadrado', M3: 'Metro cúbico', L: 'Litro' };
export function ProductUnitPolicyPanel({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['product-unit-policy', productId], enabled: open, retry: false,
    queryFn: async () => (await apiFetch<{ data: { policy: StoredPolicy | null } }>(`/products/admin/${encodeURIComponent(productId)}/unit-policy`)).data });
  return <details className="rounded-xl border bg-white p-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Unidades e conversão</summary>
    <p className="mt-2 text-sm text-muted-foreground">Preparação para venda por medida. Registrar aqui ainda não altera estoque ou libera quantidades fracionadas.</p>
    {query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} /> : query.data ? <UnitEditor key={`${productId}:${query.data.policy?.version ?? 0}`} productId={productId} current={query.data.policy} /> : null}
  </details>;
}
function UnitEditor({ productId, current }: { productId: string; current: StoredPolicy | null }) {
  const client = useQueryClient(); const [step, setStep] = useState(1);
  const [commercialUnit, setCommercialUnit] = useState(current?.commercialUnit ?? ''); const [stockUnit, setStockUnit] = useState(current?.stockUnit ?? '');
  const [factor, setFactor] = useState(current?.stockPerCommercialUnit ?? ''); const [quantityStep, setQuantityStep] = useState(current?.quantityStep ?? '');
  const [reason, setReason] = useState(''); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const values = () => ({ policy: { commercialUnit, stockUnit, stockPerCommercialUnit: factor.trim().replace(',', '.'), quantityStep: quantityStep.trim().replace(',', '.'), confirmed }, reason });
  const save = useMutation({ mutationFn: () => {
    const input = values(); const fingerprint = JSON.stringify(input);
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    return apiFetch(`/products/admin/${encodeURIComponent(productId)}/unit-policy`, { method: 'PUT', body: JSON.stringify(saveCommercialUnitPolicySchema.parse({ ...input, expectedVersion: current?.version ?? 0, requestKey: intent.current.key })) });
  }, onSuccess: () => client.invalidateQueries({ queryKey: ['product-unit-policy', productId] }), onError: failure => setError(failure.message) });
  const advance = () => {
    if (step === 1 && (!commercialUnit || !stockUnit)) { setError('Escolha as duas unidades conferidas.'); return; }
    if (step === 2) {
      const parsed = saveCommercialUnitPolicySchema.safeParse({ ...values(), policy: { ...values().policy, confirmed: true }, expectedVersion: current?.version ?? 0, requestKey: crypto.randomUUID() });
      if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    }
    setError(''); setStep(value => value + 1);
  };
  const select = (label: string, value: string, setter: (value: string) => void, suffix: string) => <div><Label htmlFor={`unit-${suffix}-${productId}`}>{label}</Label><select id={`unit-${suffix}-${productId}`} className="min-h-11 w-full rounded-lg border bg-white px-3" value={value} onChange={event => setter(event.target.value)}><option value="">Escolha a unidade</option>{commercialUnitCodeSchema.options.map(unit => <option key={unit} value={unit}>{LABELS[unit]}</option>)}</select></div>;
  return <section aria-label="Configurar unidades" className="mt-4 space-y-3">
    {current ? <p role="status" className="text-sm">Política registrada · versão {current.version}</p> : null}
    <PartnerSteps step={step} labels={['Unidades', 'Conversão', 'Confirmar']} />
    {step === 1 ? <div className="space-y-3">{select('Unidade de venda', commercialUnit, setCommercialUnit, 'commercial')}{select('Unidade de estoque', stockUnit, setStockUnit, 'stock')}</div> : step === 2 ? <div className="space-y-3">
      <Label htmlFor={`unit-factor-${productId}`}>Quanto no estoque corresponde a 1 unidade de venda?</Label><Input id={`unit-factor-${productId}`} inputMode="decimal" value={factor} onChange={event => setFactor(event.target.value)} />
      <Label htmlFor={`unit-step-${productId}`}>Passo permitido na quantidade de venda</Label><Input id={`unit-step-${productId}`} inputMode="decimal" value={quantityStep} onChange={event => setQuantityStep(event.target.value)} />
      <Label htmlFor={`unit-reason-${productId}`}>Como a conversão foi conferida?</Label><Input id={`unit-reason-${productId}`} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} />
    </div> : <div className="space-y-3"><p className="text-sm">1 {LABELS[commercialUnit]} corresponde a {factor} {LABELS[stockUnit]}. Passo: {quantityStep}.</p><p className="break-words text-sm">{reason}</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Conferi as unidades, o fator e o passo deste produto.</label></div>}
    <div className="flex justify-between gap-2"><Button type="button" variant="outline" disabled={step === 1 || save.isPending} onClick={() => { setStep(value => value - 1); setConfirmed(false); }}>Voltar</Button>{step < 3 ? <Button type="button" onClick={advance}>Continuar</Button> : <Button type="button" disabled={!confirmed || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Registrando…' : 'Registrar política'}</Button>}</div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </section>;
}
