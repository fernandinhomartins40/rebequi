import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { sellerCommissionDraftSchema, type SellerCommissionDraftInput } from '@rebequi/shared/schemas';
import { parseMoneyCents } from '@rebequi/shared/utils';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartnerSteps } from '@/pages/partners/steps';

type Draft = { version: number; effectiveMonth: string; basisPoints: number; maturityDays: number; active: false };
const nextMonth = () => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const year = Number(parts.find(part => part.type === 'year')!.value); const month = Number(parts.find(part => part.type === 'month')!.value);
  const date = new Date(Date.UTC(year, month, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; };

export function CommercialCommissionDraft() {
  const { user } = useAuth(); const allowed = hasMerchantPermission(user?.role, 'commercial:assign'); const client = useQueryClient();
  const [month, setMonth] = useState(nextMonth); const [rate, setRate] = useState(''); const [days, setDays] = useState('0');
  const [reason, setReason] = useState(''); const [step, setStep] = useState(1); const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const query = useQuery({ queryKey: ['seller-commission-draft'], enabled: allowed, retry: false,
    queryFn: async () => (await apiFetch<{ data: { draft: Draft | null; active: false } }>('/commercial/commission-draft')).data });
  const draft = () => sellerCommissionDraftSchema.parse({ requestKey: crypto.randomUUID(), expectedVersion: query.data?.draft?.version ?? 0,
    basis: 'NET_PAID_SALE_AFTER_RETURNS', eligibleRole: 'SALES',
    effectiveMonth: month, basisPoints: parseMoneyCents(rate), maturityDays: Number(days), reason, confirmed: true });
  const save = useMutation({ mutationFn: async (base: SellerCommissionDraftInput) => {
    const fingerprint = JSON.stringify({ expectedVersion: base.expectedVersion, effectiveMonth: base.effectiveMonth, basis: base.basis, eligibleRole: base.eligibleRole, basisPoints: base.basisPoints, maturityDays: base.maturityDays, reason: base.reason });
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    return apiFetch('/commercial/commission-draft', { method: 'POST', body: JSON.stringify({ ...base, requestKey: intent.current.key }) });
  }, onSuccess: async () => { setSuccess('Rascunho registrado. Nenhuma comissão foi ativada.'); setStep(1); setConfirmed(false); setError('');
    await client.invalidateQueries({ queryKey: ['seller-commission-draft'] }); }, onError: failure => setError(failure.message) });
  if (!allowed) return null;
  const next = () => { try { if (step === 1 && (month < nextMonth() || query.isLoading || query.isError)) throw new Error('Escolha um mês futuro e aguarde a versão atual.');
    if (step === 2) draft(); setError(''); setSuccess(''); setStep(value => Math.min(3, value + 1)); } catch { setError('Confira mês, percentual, prazo e motivo.'); } };
  return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-bold">Política de comissão · rascunho</summary><div className="mt-4 space-y-3">
    <p className="text-xs text-muted-foreground">Base proposta: venda paga líquida de devoluções, apenas para vendedores. Este rascunho não calcula comissão, cria saldo ou libera pagamento.</p>
    <PartnerSteps step={step} labels={['Período', 'Condições', 'Confirmar']} />
    {query.isError ? <p role="alert" className="text-sm text-red-700">Não foi possível consultar o rascunho atual.</p> : query.data?.draft ? <p className="text-xs">Versão atual: {query.data.draft.version}. Inativa.</p> : null}
    {step === 1 ? <div><Label htmlFor="commission-month">Primeiro mês possível</Label><Input id="commission-month" type="month" min={nextMonth()} value={month} onChange={event => setMonth(event.target.value)} /></div> : null}
    {step === 2 ? <><div><Label htmlFor="commission-rate">Percentual proposto</Label><Input id="commission-rate" inputMode="decimal" placeholder="Ex.: 2,50" value={rate} onChange={event => setRate(event.target.value)} /></div>
      <div><Label htmlFor="commission-days">Dias até conciliação</Label><Input id="commission-days" inputMode="numeric" value={days} onChange={event => setDays(event.target.value)} /></div>
      <div><Label htmlFor="commission-reason">Motivo</Label><Input id="commission-reason" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div></> : null}
    {step === 3 ? <><p className="rounded-lg bg-slate-50 p-3 text-sm">A partir de {month}: {rate}% propostos, prazo {days} dias. Sem ativação.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Conferi o rascunho e entendo que ele ficará inativo.</label></> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}{success ? <p role="status" className="text-sm text-green-800">{success}</p> : null}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={step === 1 || save.isPending} onClick={() => { setStep(value => value - 1); setConfirmed(false); }}>Voltar</Button>
      {step < 3 ? <Button type="button" onClick={next}>Continuar</Button> : <Button type="button" disabled={!confirmed || save.isPending} onClick={() => { try { setError(''); save.mutate(draft()); } catch { setError('Confira os parâmetros do rascunho.'); } }}>{save.isPending ? 'Salvando…' : 'Salvar rascunho'}</Button>}</div>
  </div></details>;
}
