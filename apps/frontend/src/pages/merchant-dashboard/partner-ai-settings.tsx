import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnerAiConfigSchema, type PartnerAiConfigInput } from '@rebequi/shared/schemas';
import { getPartnerAiSettings, savePartnerAiSettings } from '@/services/api/partners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';

export function PartnerAiSettingsPanel() {
  const client = useQueryClient(); const query = useQuery({ queryKey: ['partner-ai-settings'], queryFn: getPartnerAiSettings, retry: false });
  const [form, setForm] = useState<PartnerAiConfigInput | null>(null); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (query.data) { const { enabled, provider, dailyLimit, monthlyBudgetCents, inputRateMicroUsd, outputRateMicroUsd, version } = query.data;
    setForm({ enabled, provider, dailyLimit, monthlyBudgetCents, inputRateMicroUsd, outputRateMicroUsd, expectedVersion: version, tariffsConfirmed: true }); setConfirmed(false);
  } }, [query.data]);
  const save = useMutation({ mutationFn: savePartnerAiSettings, onSuccess: data => { client.setQueryData(['partner-ai-settings'], data); setError(''); }, onError: failure => setError(failure.message) });
  if (query.isLoading) return <DashboardLoading />;
  if (query.isError) return <DashboardError message={query.error.message} onRetry={() => query.refetch()} />;
  if (!form || !query.data) return null;
  return <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">IA da calculadora de parceiros</h2>
    <p className="text-sm text-slate-500">As chaves são as mesmas cadastradas acima. Este limite controla somente a leitura de descrições técnicas; fotos de orçamentos têm configuração própria.</p>
    <div><Label htmlFor="partner-ai-provider">Provedor</Label><select id="partner-ai-provider" className="mt-1 min-h-11 w-full rounded-lg border px-3" value={form.provider} disabled={save.isPending} onChange={event => { setConfirmed(false); setForm({ ...form, provider: event.target.value as 'deepseek' | 'qwen' }); }}><option value="deepseek">DeepSeek · deepseek-flash</option><option value="qwen">Qwen · qwen-flash · Singapura</option></select></div>
    <div className="grid gap-4 sm:grid-cols-2">{([{ key: 'dailyLimit', label: 'Leituras por profissional/dia', min: 1, max: 20 }, { key: 'monthlyBudgetCents', label: 'Teto mensal (centavos de US$)', min: 0, max: 100000 }, { key: 'inputRateMicroUsd', label: 'Entrada: micro-US$ por milhão de tokens', min: 1, max: 100000000 }, { key: 'outputRateMicroUsd', label: 'Saída: micro-US$ por milhão de tokens', min: 1, max: 100000000 }] as const).map(field => <div key={field.key}><Label htmlFor={`partner-ai-${field.key}`}>{field.label}</Label><Input id={`partner-ai-${field.key}`} type="number" min={field.min} max={field.max} value={form[field.key]} disabled={save.isPending} onChange={event => { setConfirmed(false); setForm({ ...form, [field.key]: Number(event.target.value) }); }} /></div>)}</div>
    <p className="text-xs text-slate-500">100 centavos = US$ 1. Tarifas: US$ 0,30 por milhão = 300000 micro-US$. Confira o preço máximo do modelo e da região, incluindo horários de pico. O controle usa a tarifa informada; não substitui a cobrança do provedor.</p>
    <div className="flex flex-wrap gap-3 text-sm"><a className="text-blue-700 underline" target="_blank" rel="noreferrer" href="https://api-docs.deepseek.com/quick_start/pricing/">Tarifas DeepSeek</a><a className="text-blue-700 underline" target="_blank" rel="noreferrer" href="https://www.alibabacloud.com/help/en/model-studio/model-pricing">Tarifas Qwen</a></div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={save.isPending} onChange={event => setConfirmed(event.target.checked)} />Conferi as tarifas e autorizo o limite de gasto informado.</label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} disabled={save.isPending} onChange={event => setForm({ ...form, enabled: event.target.checked })} />Ativar leitura técnica com IA</label>
    <p className="rounded-lg bg-slate-50 p-3 text-sm">{query.data.month}: {(query.data.estimatedMicroUsd / 1000000).toLocaleString('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })} estimados · {query.data.attempts} tentativas · {query.data.unknown} sem consumo confirmado. Tentativas sem resposta mantêm a reserva de custo.</p>
    {!query.data.hasKey ? <p className="text-sm text-amber-700">O provedor salvo está sem chave cadastrada.</p> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}{save.isSuccess ? <p role="status" className="text-sm text-emerald-700">Configuração salva.</p> : null}
    <Button disabled={!confirmed || save.isPending} onClick={() => { const parsed = partnerAiConfigSchema.safeParse(form); if (!parsed.success) { setError('Confira limites e tarifas. A ativação exige teto maior que zero.'); return; } save.mutate(parsed.data); }}>{save.isPending ? 'Salvando…' : 'Salvar limites'}</Button>
  </section>;
}
