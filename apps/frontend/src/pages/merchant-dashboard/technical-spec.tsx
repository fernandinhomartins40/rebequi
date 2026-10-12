import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { technicalSpecSchema, type TechnicalSpecInput } from '@rebequi/shared/schemas';
import { getTechnicalSpec, saveTechnicalSpec, type TechnicalSpec } from '@/services/api/partners';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardPanel } from './components';

function TechnicalForm({ productId, spec }: { productId: string; spec: TechnicalSpec | null }) {
  const client = useQueryClient(); const [kind, setKind] = useState<'PAINT' | 'TILE'>(spec?.parameters.kind ?? 'PAINT');
  const [coverage, setCoverage] = useState(spec ? String(spec.parameters.kind === 'PAINT' ? spec.parameters.coverageM2PerPack : spec.parameters.areaM2PerPack) : '');
  const [liters, setLiters] = useState(spec?.parameters.kind === 'PAINT' ? String(spec.parameters.packageLiters) : '');
  const [basis, setBasis] = useState<'PER_COAT' | 'FINISHED'>(spec?.parameters.kind === 'PAINT' ? spec.parameters.coverageBasis : 'FINISHED');
  const [source, setSource] = useState(spec?.sourceUrl ?? ''); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (input: TechnicalSpecInput) => saveTechnicalSpec(productId, input), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['product-technical', productId] }); }, onError: failure => setError(failure.message) });
  const submit = () => {
    const parsed = technicalSpecSchema.safeParse({ parameters: kind === 'PAINT' ? { kind, packageLiters: Number(liters.replace(',', '.')), coverageM2PerPack: Number(coverage.replace(',', '.')), coverageBasis: basis } : { kind, areaM2PerPack: Number(coverage.replace(',', '.')) }, sourceUrl: source, confirmed, expectedVersion: spec?.version ?? 0 });
    if (!parsed.success) { setError('Confira os valores, o link HTTPS e a confirmação da ficha técnica.'); return; }
    setError(''); mutation.mutate(parsed.data);
  };
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">Cadastre somente valores da embalagem ou ficha do fabricante deste produto. Sem ficha conferida, ele não entra na calculadora.</p>{spec ? <p role="status" className="text-xs text-green-700">Ficha conferida em {new Date(spec.checkedAt).toLocaleDateString('pt-BR')} · versão {spec.version}</p> : null}<div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="technical-kind">Aplicação</Label><select id="technical-kind" className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" value={kind} onChange={event => { setKind(event.target.value as 'PAINT' | 'TILE'); setCoverage(''); setLiters(''); setConfirmed(false); }}><option value="PAINT">Tinta</option><option value="TILE">Piso ou revestimento</option></select></div><div><Label htmlFor="technical-coverage">{kind === 'PAINT' ? 'Rendimento da embalagem (m²)' : 'Área por caixa (m²)'}</Label><Input id="technical-coverage" inputMode="decimal" value={coverage} onChange={event => { setCoverage(event.target.value); setConfirmed(false); }} /></div>{kind === 'PAINT' ? <><div><Label htmlFor="technical-liters">Litros por embalagem</Label><Input id="technical-liters" inputMode="decimal" value={liters} onChange={event => { setLiters(event.target.value); setConfirmed(false); }} /></div><div><Label htmlFor="technical-basis">O rendimento informado é</Label><select id="technical-basis" className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" value={basis} onChange={event => { setBasis(event.target.value as 'PER_COAT' | 'FINISHED'); setConfirmed(false); }}><option value="FINISHED">Acabado (já inclui as demãos)</option><option value="PER_COAT">Por demão</option></select></div></> : null}</div><div><Label htmlFor="technical-source">Link da ficha ou produto no fabricante</Label><Input id="technical-source" type="url" maxLength={1000} value={source} onChange={event => { setSource(event.target.value); setConfirmed(false); }} /></div><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Conferi os dados na ficha deste produto.</label>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<Button disabled={!confirmed || mutation.isPending} onClick={submit}>{mutation.isPending ? 'Salvando…' : 'Salvar ficha técnica'}</Button></div>;
}
export function ProductTechnicalSpecPanel({ productId }: { productId: string }) {
  const query = useQuery({ queryKey: ['product-technical', productId], queryFn: () => getTechnicalSpec(productId), retry: false });
  return <DashboardPanel title="Ficha para calcular materiais" description="Rendimento e embalagem usados pelos profissionais.">{query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} /> : <TechnicalForm key={query.data?.version ?? 'new'} productId={productId} spec={query.data ?? null} />}</DashboardPanel>;
}
