import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { sellerGoalSchema, type SellerGoalInput } from '@rebequi/shared/schemas';
import { parseMoneyCents } from '@rebequi/shared/utils';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartnerSteps } from '@/pages/partners/steps';

type Seller = { id: string; name: string };
type Goal = { version: number; targetCents: string };
const nextMonth = () => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const year = Number(parts.find(part => part.type === 'year')!.value); const month = Number(parts.find(part => part.type === 'month')!.value);
  const date = new Date(Date.UTC(year, month, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; };

export function CommercialGoalEditor() {
  const { user } = useAuth(); const allowed = hasMerchantPermission(user?.role, 'commercial:assign');
  const client = useQueryClient(); const [page, setPage] = useState(1); const [sellerId, setSellerId] = useState(''); const [sellerName, setSellerName] = useState('');
  const [month, setMonth] = useState(nextMonth); const [amount, setAmount] = useState(''); const [reason, setReason] = useState('');
  const [step, setStep] = useState(1); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const sellers = useQuery({ queryKey: ['commercial-goal-sellers', page], enabled: allowed, retry: false,
    queryFn: async () => (await apiFetch<{ data: { sellers: Seller[]; totalPages: number } }>(`/commercial/sellers?page=${page}`)).data });
  const goal = useQuery({ queryKey: ['commercial-goal', sellerId, month], enabled: allowed && Boolean(sellerId) && month >= nextMonth(), retry: false,
    queryFn: async () => (await apiFetch<{ data: { goal: Goal | null } }>(`/commercial/goals/${encodeURIComponent(sellerId)}?month=${encodeURIComponent(month)}`)).data.goal });
  const draft = () => {
    const cents = parseMoneyCents(amount);
    return sellerGoalSchema.parse({ sellerId, month, targetCents: String(cents), expectedVersion: goal.data?.version ?? 0,
      reason, confirmed: true, requestKey: crypto.randomUUID() });
  };
  const save = useMutation({ mutationFn: async (base: SellerGoalInput) => {
    const fingerprint = JSON.stringify({ sellerId: base.sellerId, month: base.month, targetCents: base.targetCents, expectedVersion: base.expectedVersion, reason: base.reason });
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    const input = { ...base, requestKey: intent.current.key };
    return apiFetch('/commercial/goals', { method: 'POST', body: JSON.stringify(input) });
  }, onSuccess: async () => { setSuccess('Meta registrada para o mês futuro.'); setStep(1); setConfirmed(false); setError('');
    await client.invalidateQueries({ queryKey: ['commercial-goal'] }); await client.invalidateQueries({ queryKey: ['commercial-performance'] }); },
  onError: failure => setError(failure.message) });
  if (!allowed) return null;
  const move = () => { try { if (step === 1 && (!sellerId || month < nextMonth() || goal.isLoading || goal.isError)) throw new Error('Confira o colaborador e escolha um mês futuro.');
    if (step === 2) draft(); setError(''); setSuccess(''); setStep(value => Math.min(3, value + 1)); } catch (failure) { setError((failure as Error).message || 'Confira os dados da meta.'); } };
  return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-bold">Definir meta futura</summary><div className="mt-4 space-y-3">
    <p className="text-xs text-muted-foreground">A meta acompanha o desempenho. Ela não cria comissão nem pagamento.</p><PartnerSteps step={step} labels={['Colaborador', 'Meta', 'Confirmar']} />
    {step === 1 ? <><div><Label htmlFor="goal-seller">Colaborador</Label><select id="goal-seller" className="min-h-11 w-full rounded-lg border bg-white px-3" value={sellerId} onChange={event => { setSellerId(event.target.value); setSellerName(event.target.selectedOptions[0]?.textContent ?? ''); }}><option value="">Escolha um colaborador</option>{sellers.data?.sellers.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
      {sellers.isError ? <p role="alert" className="text-sm text-red-700">Não foi possível listar colaboradores.</p> : null}
      {sellers.data && sellers.data.totalPages > 1 ? <div className="flex gap-2"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><Button type="button" variant="outline" disabled={page >= sellers.data.totalPages} onClick={() => setPage(value => value + 1)}>Próxima</Button></div> : null}
      <div><Label htmlFor="goal-month">Mês futuro</Label><Input id="goal-month" type="month" min={nextMonth()} value={month} onChange={event => setMonth(event.target.value)} /></div>
      {goal.data ? <p className="text-xs">Meta atual: versão {goal.data.version}. A nova meta ficará registrada como revisão.</p> : null}</> : null}
    {step === 2 ? <><div><Label htmlFor="goal-amount">Meta em reais</Label><Input id="goal-amount" inputMode="decimal" placeholder="Ex.: 10000,00" value={amount} onChange={event => setAmount(event.target.value)} /></div>
      <div><Label htmlFor="goal-reason">Motivo</Label><Input id="goal-reason" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div></> : null}
    {step === 3 ? <><p className="rounded-lg bg-slate-50 p-3 text-sm">{sellerName} · {month} · R$ {amount}. Esta meta não altera pagamentos.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Conferi o colaborador, o mês e o valor.</label></> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}{success ? <p role="status" className="text-sm text-green-800">{success}</p> : null}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={step === 1 || save.isPending} onClick={() => { setStep(value => value - 1); setConfirmed(false); }}>Voltar</Button>
      {step < 3 ? <Button type="button" onClick={move}>Continuar</Button> : <Button type="button" disabled={!confirmed || save.isPending} onClick={() => { try { setError(''); save.mutate(draft()); } catch { setError('Confira o valor e o motivo.'); } }}>{save.isPending ? 'Salvando…' : 'Registrar meta'}</Button>}</div>
  </div></details>;
}
