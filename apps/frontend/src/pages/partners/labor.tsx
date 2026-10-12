import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { laborQuoteSchema, type LaborQuoteInput } from '@rebequi/shared/schemas';
import { priceLaborQuote, parseMoneyCents } from '@rebequi/shared/utils';
import { getProject, listLaborQuotes, saveLaborQuote, type LaborQuote } from '@/services/api/partners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DashboardEmpty, DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { PartnerSteps } from './steps';

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
type ItemDraft = { description: string; quantity: string; unit: LaborQuoteInput['items'][number]['unit']; price: string };
function LaborEditor({ projectId, latest, onClose }: { projectId: string; latest?: LaborQuote; onClose: () => void }) {
  const client = useQueryClient(); const [step, setStep] = useState(1); const [error, setError] = useState('');
  const [title, setTitle] = useState(latest?.title ?? 'Orçamento de mão de obra');
  const [notes, setNotes] = useState(latest?.notes ?? ''); const [validity, setValidity] = useState('7');
  const [items, setItems] = useState<ItemDraft[]>(latest?.items.map(item => ({ description: item.description, quantity: String(item.quantity), unit: item.unit, price: (item.unitPriceCents / 100).toFixed(2).replace('.', ',') })) ?? [{ description: '', quantity: '1', unit: 'serviço', price: '' }]);
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const mutation = useMutation({ mutationFn: saveLaborQuote, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['partners', 'labor', projectId] }); onClose(); }, onError: failure => setError(failure.message) });
  const parsedItems = () => items.map(item => ({ description: item.description, unit: item.unit, quantity: Number(item.quantity.replace(',', '.')), unitPriceCents: parseMoneyCents(item.price) }));
  const patch = (index: number, update: Partial<ItemDraft>) => setItems(current => current.map((item, position) => position === index ? { ...item, ...update } : item));
  const advance = () => {
    try {
      if (step === 1) { if (title.trim().length < 2 || !/^\d+$/.test(validity) || Number(validity) < 1 || Number(validity) > 90) throw new Error('Informe o título e a validade entre 1 e 90 dias.'); }
      else priceLaborQuote(parsedItems());
      setError(''); setStep(current => current + 1);
    } catch (failure) { setError(failure instanceof Error && 'issues' in failure ? 'Confira descrição, quantidade e preço de cada serviço.' : failure instanceof Error ? failure.message : 'Confira os serviços.'); }
  };
  const submit = () => {
    try {
      const values = { projectId, title, items: parsedItems(), notes, validityDays: Number(validity), expectedLatestVersion: latest?.version ?? 0 };
      const fingerprint = JSON.stringify(values);
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
      const input = laborQuoteSchema.parse({ ...values, requestKey: request.current.key });
      setError(''); mutation.mutate(input);
    } catch { setError('Confira os serviços e valores antes de salvar.'); }
  };
  let preview: ReturnType<typeof priceLaborQuote> | null = null;
  if (step === 3) { try { preview = priceLaborQuote(parsedItems()); } catch { /* The form reports validation errors. */ } }
  return <section className="rounded-2xl border bg-white p-5"><h1 className="text-xl font-bold">Orçamento de mão de obra</h1><PartnerSteps step={step} labels={['Condições', 'Serviços', 'Conferir']} />
    {step === 1 ? <div className="space-y-4"><div><Label htmlFor="labor-title">Título do orçamento</Label><Input id="labor-title" maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></div><div><Label htmlFor="labor-validity">Validade em dias</Label><Input id="labor-validity" inputMode="numeric" value={validity} onChange={event => setValidity(event.target.value)} /></div><div><Label htmlFor="labor-notes">Condições e observações (opcional)</Label><Textarea id="labor-notes" maxLength={1500} value={notes} onChange={event => setNotes(event.target.value)} /></div><p className="text-xs text-slate-500">Somente serviços do profissional. Materiais são cotados separadamente pela loja.</p></div> : null}
    {step === 2 ? <div className="space-y-4">{items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-xl border p-3"><legend className="px-1 text-xs">Serviço {index + 1}</legend><div><Label htmlFor={`labor-description-${index}`}>Descrição</Label><Input id={`labor-description-${index}`} maxLength={160} value={item.description} onChange={event => patch(index, { description: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor={`labor-quantity-${index}`}>Quantidade</Label><Input id={`labor-quantity-${index}`} inputMode="decimal" value={item.quantity} onChange={event => patch(index, { quantity: event.target.value })} /></div><div><Label htmlFor={`labor-unit-${index}`}>Unidade</Label><select id={`labor-unit-${index}`} className="min-h-11 w-full rounded-lg border bg-white px-3" value={item.unit} onChange={event => patch(index, { unit: event.target.value as ItemDraft['unit'] })}>{['serviço', 'm²', 'metro', 'hora', 'dia', 'unidade'].map(unit => <option key={unit}>{unit}</option>)}</select></div></div><div><Label htmlFor={`labor-price-${index}`}>Preço unitário (R$)</Label><Input id={`labor-price-${index}`} inputMode="decimal" placeholder="Ex.: 25,00" value={item.price} onChange={event => patch(index, { price: event.target.value })} /></div><Button variant="ghost" size="sm" disabled={items.length === 1} onClick={() => setItems(current => current.filter((_, position) => position !== index))}>Remover serviço</Button></fieldset>)}<Button variant="outline" disabled={items.length >= 50} onClick={() => setItems(current => [...current, { description: '', quantity: '1', unit: 'serviço', price: '' }])}>Adicionar serviço</Button></div> : null}
    {step === 3 && preview ? <div className="space-y-4"><h2 className="font-bold">{title}</h2>{items.map((item, index) => <div key={index} className="flex justify-between gap-3 border-b pb-2 text-sm"><span className="break-words">{item.description} · {item.quantity} {item.unit}</span><strong className="shrink-0">{money(preview.lineTotals[index])}</strong></div>)}<p className="text-xl font-bold">Total: {money(preview.totalCents)}</p><p className="text-sm">Validade: {validity} dias · Versão {(latest?.version ?? 0) + 1}</p><p className="text-xs text-slate-500">Salvar preserva as versões anteriores. Não envia à loja, não inclui materiais e não registra pagamento.</p></div> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}<div className="mt-5 flex justify-between gap-3"><Button variant="outline" disabled={mutation.isPending} onClick={() => step === 1 ? onClose() : setStep(current => current - 1)}>{step === 1 ? 'Cancelar' : 'Voltar'}</Button>{step < 3 ? <Button onClick={advance}>Continuar</Button> : <Button disabled={mutation.isPending} onClick={submit}>{mutation.isPending ? 'Salvando…' : 'Salvar versão'}</Button>}</div>
  </section>;
}
export function PartnerLaborQuotes({ approved }: { approved: boolean }) {
  const [params] = useSearchParams(); const projectId = params.get('project') ?? '';
  const [editing, setEditing] = useState(false); const [selected, setSelected] = useState<LaborQuote | null>(null); const [includeClient, setIncludeClient] = useState(false);
  const project = useQuery({ queryKey: ['partners', 'project', projectId], queryFn: () => getProject(projectId), enabled: Boolean(projectId), retry: false });
  const quotes = useInfiniteQuery({ queryKey: ['partners', 'labor', projectId], queryFn: ({ pageParam }) => listLaborQuotes(projectId, pageParam), initialPageParam: 1, getNextPageParam: last => last.page < last.totalPages ? last.page + 1 : undefined, enabled: Boolean(projectId), retry: false });
  const versions = quotes.data?.pages.flatMap(page => page.quotes) ?? [];
  if (!projectId) return <DashboardEmpty title="Escolha uma obra para criar o orçamento" action={<Button asChild><Link to="/parceiros/?area=obras">Minhas obras</Link></Button>} />;
  if (project.isLoading || quotes.isLoading) return <DashboardLoading />;
  if (project.isError || quotes.isError) return <DashboardError message={project.error?.message ?? quotes.error?.message ?? 'Não foi possível abrir o orçamento.'} onRetry={() => { project.refetch(); quotes.refetch(); }} />;
  if (editing) return <LaborEditor projectId={projectId} latest={versions[0]} onClose={() => setEditing(false)} />;
  const displayed = selected ?? versions[0];
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">Mão de obra</h1><Button disabled={!approved || project.data?.archived} onClick={() => setEditing(true)}>{versions.length ? 'Nova versão' : 'Criar orçamento'}</Button></div><p className="text-sm text-slate-500">{project.data?.title} · Valores e condições do profissional.</p>
    {!versions.length ? <DashboardEmpty title="Ainda não há orçamento de serviços" /> : <div className="flex flex-wrap gap-2">{versions.map(quote => <Button key={quote.id} variant={displayed?.id === quote.id ? 'default' : 'outline'} size="sm" onClick={() => setSelected(quote)}>Versão {quote.version}</Button>)}{quotes.hasNextPage ? <Button variant="outline" size="sm" disabled={quotes.isFetchingNextPage} onClick={() => quotes.fetchNextPage()}>Versões anteriores</Button> : null}</div>}
    {displayed ? <><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={includeClient} onChange={event => setIncludeClient(event.target.checked)} />Incluir nome do cliente na impressão</label><Button variant="outline" onClick={() => window.print()}>Imprimir / PDF</Button></div><article id="partner-labor-document" className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="break-words text-xl font-bold">{displayed.title}</h2><div className="space-y-1 text-sm"><p>Profissional: {displayed.professionalNameSnapshot}</p><p>Obra: {displayed.projectTitleSnapshot}</p>{includeClient && displayed.clientNameSnapshot ? <p>Cliente: {displayed.clientNameSnapshot}</p> : null}<p>Versão {displayed.version} · Emitido em {new Date(displayed.createdAt).toLocaleDateString('pt-BR')}</p><p>Válido até {new Date(displayed.validUntil).toLocaleDateString('pt-BR')}</p></div>{displayed.items.map((item, index) => <div key={index} className="space-y-1 border-b pb-3 text-sm"><p className="break-words font-semibold">{item.description}</p><p>{item.quantity.toLocaleString('pt-BR')} {item.unit} × {money(item.unitPriceCents)}</p><p className="font-bold">{money(item.totalCents)}</p></div>)}<p className="text-xl font-bold">Total de serviços: {money(displayed.totalCents)}</p>{displayed.notes ? <p className="whitespace-pre-wrap break-words text-sm">{displayed.notes}</p> : null}<p className="text-xs text-slate-500">Orçamento de mão de obra do profissional. Não inclui materiais da loja e não comprova pagamento ou aceite.</p></article><style>{'@media print { body * { visibility: hidden; } #partner-labor-document, #partner-labor-document * { visibility: visible; } #partner-labor-document { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; border-radius: 0; } #partner-labor-document > div { break-inside: avoid; } }'}</style></> : null}
  </div>;
}
