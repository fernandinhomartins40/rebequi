import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QuoteRequest } from '@/types';
import { proposalSchema, type ProposalInput } from '@rebequi/shared/schemas';
import { parseMoneyCents } from '@rebequi/shared/utils';
import { listQuoteProposals, publishQuoteProposal, acceptQuoteProposal, type QuoteProposal } from '@/services/api/proposals';
import { ProductAutocomplete } from './ProductAutocomplete';
import { DashboardError, DashboardLoading } from './dashboard/DashboardList';
import { DashboardSteps } from './dashboard/DashboardElements';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
type ItemDraft = { productId: string; name: string; quantity: string; price: string };
function ProposalEditor({ quote, latestVersion, onClose }: { quote: QuoteRequest; latestVersion: number; onClose: () => void }) {
  const client = useQueryClient(); const [step, setStep] = useState(1); const [error, setError] = useState('');
  const [notes, setNotes] = useState(''); const [validity, setValidity] = useState('7');
  const [items, setItems] = useState<ItemDraft[]>(quote.items.map(item => ({ productId: item.productId ?? '', name: item.name, quantity: String(item.quantity), price: item.product?.price !== undefined ? item.product.price.toFixed(2).replace('.', ',') : '' })));
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const patch = (index: number, update: Partial<ItemDraft>) => setItems(current => current.map((item, position) => position === index ? { ...item, ...update } : item));
  const input = (): ProposalInput => {
    const values = { items: items.map(item => ({ productId: item.productId, quantity: Number(item.quantity), unitPriceCents: parseMoneyCents(item.price) })), notes, validityDays: Number(validity), expectedLatestVersion: latestVersion };
    const fingerprint = JSON.stringify(values);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    return proposalSchema.parse({ ...values, requestKey: request.current.key });
  };
  const mutation = useMutation({ mutationFn: (values: ProposalInput) => publishQuoteProposal(quote.id, values), onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ['quote-proposals', quote.id] }); await client.invalidateQueries({ queryKey: ['merchant-dashboard', 'quotes'] }); onClose();
  }, onError: failure => setError(failure.message) });
  const advance = () => {
    try {
      if (step === 1) { if (!items.length || items.some(item => !item.productId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) throw new Error('Associe todos os itens ao catálogo e confira as quantidades inteiras.'); }
      else input(); setError(''); setStep(current => current + 1);
    } catch (failure) { setError(failure instanceof Error && 'issues' in failure ? 'Confira preços, produtos repetidos e validade de 1 a 30 dias.' : failure instanceof Error ? failure.message : 'Confira os dados.'); }
  };
  let preview: ProposalInput | null = null; if (step === 3) { try { preview = input(); } catch { /* Validation is shown in the form. */ } }
  return <div className="space-y-4"><h3 className="text-lg font-bold">Publicar proposta de materiais</h3><DashboardSteps activeStep={step - 1} steps={[{ title: 'Produtos' }, { title: 'Valores' }, { title: 'Publicar' }]} />
    {step === 1 ? <div className="space-y-4">{items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-xl border p-3"><legend className="px-1 text-xs">Item {index + 1}</legend><ProductAutocomplete value={item.name} onChange={name => patch(index, { name, productId: '', price: '' })} onSelectProduct={product => patch(index, { productId: product.id, name: product.name, price: product.price.toFixed(2).replace('.', ',') })} /><p className="text-xs text-slate-500">{item.productId ? 'Produto associado ao catálogo' : 'Busque e selecione um produto'}</p><div><Label htmlFor={`proposal-quantity-${index}`}>Quantidade</Label><Input id={`proposal-quantity-${index}`} inputMode="numeric" value={item.quantity} onChange={event => patch(index, { quantity: event.target.value })} /></div><Button variant="ghost" size="sm" disabled={items.length === 1} onClick={() => setItems(current => current.filter((_, position) => position !== index))}>Remover item</Button></fieldset>)}<Button variant="outline" disabled={items.length >= 50} onClick={() => setItems(current => [...current, { productId: '', name: '', quantity: '1', price: '' }])}>Adicionar produto</Button></div> : null}
    {step === 2 ? <div className="space-y-4">{items.map((item, index) => <div key={index}><Label htmlFor={`proposal-price-${index}`}>{item.name} · preço unitário (R$)</Label><Input id={`proposal-price-${index}`} inputMode="decimal" maxLength={20} value={item.price} onChange={event => patch(index, { price: event.target.value })} /></div>)}<div><Label htmlFor="proposal-validity">Validade em dias</Label><Input id="proposal-validity" inputMode="numeric" value={validity} onChange={event => setValidity(event.target.value)} /></div><div><Label htmlFor="proposal-notes">Condições da loja (opcional)</Label><Textarea id="proposal-notes" maxLength={1500} value={notes} onChange={event => setNotes(event.target.value)} /></div></div> : null}
    {step === 3 && preview ? <div className="space-y-3">{preview.items.map((item, index) => <p key={item.productId} className="break-words text-sm">{items[index].name} · {item.quantity} × {money(item.unitPriceCents)}</p>)}<p className="text-xl font-bold">Total: {money(preview.items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0))}</p><p className="text-xs text-slate-500">Versão {latestVersion + 1} · {validity} dias. Disponível na conta do cliente após publicar. Não inclui mão de obra, frete ou reserva de estoque.</p></div> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="flex justify-between gap-3"><Button variant="outline" disabled={mutation.isPending} onClick={() => step === 1 ? onClose() : setStep(current => current - 1)}>{step === 1 ? 'Cancelar' : 'Voltar'}</Button>{step < 3 ? <Button onClick={advance}>Continuar</Button> : <Button disabled={mutation.isPending} onClick={() => { try { mutation.mutate(input()); } catch { setError('Confira os valores antes de publicar.'); } }}>{mutation.isPending ? 'Publicando…' : 'Publicar proposta'}</Button>}</div>
  </div>;
}
export function QuoteProposalPanel({ quote, admin = false }: { quote: QuoteRequest; admin?: boolean }) {
  const client = useQueryClient(); const navigate = useNavigate(); const [editing, setEditing] = useState(false); const [selected, setSelected] = useState<QuoteProposal | null>(null); const [confirmed, setConfirmed] = useState(false);
  const history = useInfiniteQuery({ queryKey: ['quote-proposals', quote.id], queryFn: ({ pageParam }) => listQuoteProposals(quote.id, pageParam), initialPageParam: 1, getNextPageParam: last => last.page < last.totalPages ? last.page + 1 : undefined, retry: false });
  const versions = history.data?.pages.flatMap(page => page.proposals) ?? []; const latest = versions[0]; const displayed = selected ?? latest; const state = history.data?.pages[0];
  const acceptance = useMutation({ mutationFn: () => acceptQuoteProposal(quote.id, displayed!.version), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['quote-proposals', quote.id] }); await client.invalidateQueries({ queryKey: ['customer', 'orders'] }); navigate('/painel-cliente?tab=orders'); } });
  if (history.isLoading) return <DashboardLoading />;
  if (history.isError) return <DashboardError message={history.error.message} onRetry={() => history.refetch()} />;
  if (editing) return <section className="mt-5 rounded-xl border p-4"><ProposalEditor quote={quote} latestVersion={latest?.version ?? 0} onClose={() => { setEditing(false); setSelected(null); }} /></section>;
  return <section className="mt-5 space-y-4 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Proposta da loja</h3>{admin && !state?.proposalOrderId && !['DRAFT', 'ARCHIVED'].includes(quote.status) ? <Button size="sm" onClick={() => setEditing(true)}>{latest ? 'Revisar proposta' : 'Criar proposta'}</Button> : null}</div>
    {!displayed ? <p className="text-sm text-slate-500">A loja ainda não publicou preços para esta solicitação.</p> : <><div className="flex flex-wrap gap-2">{versions.map(proposal => <Button key={proposal.id} size="sm" variant={displayed.id === proposal.id ? 'default' : 'outline'} onClick={() => { setSelected(proposal); setConfirmed(false); }}>Versão {proposal.version}</Button>)}{history.hasNextPage ? <Button variant="outline" size="sm" disabled={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>Versões anteriores</Button> : null}</div><ul className="space-y-3">{displayed.items.map(item => <li key={item.productId} className="space-y-1 border-b pb-3 text-sm"><p className="break-words font-semibold">{item.productName}</p><p>{item.quantity} × {money(item.unitPriceCents)} = {money(item.totalCents)}</p></li>)}</ul><p className="text-xl font-bold">Materiais: {money(displayed.totalCents)}</p><p className="text-sm">Válida até {new Date(displayed.validUntil).toLocaleDateString('pt-BR')}</p>{displayed.notes ? <p className="whitespace-pre-wrap break-words text-sm">{displayed.notes}</p> : null}<p className="text-xs text-slate-500">Não inclui mão de obra ou frete. Aceitar cria um pedido para atendimento; não cobra nem reserva estoque automaticamente.</p>
      {state?.proposalOrderId ? <p role="status" className="text-sm text-green-700">Versão {state.acceptedProposalVersion} aceita. <Link className="underline" to={admin ? `/painel-lojista/painel/pedidos/${state.proposalOrderId}` : '/painel-cliente?tab=orders'}>Ver pedido</Link></p> : !admin && displayed.version === latest?.version && state?.status === 'RESPONDED' && new Date(displayed.validUntil) > new Date() ? <div className="space-y-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Conferi os produtos, quantidades e condições.</label><Button disabled={!confirmed || acceptance.isPending} onClick={() => acceptance.mutate()}>{acceptance.isPending ? 'Criando pedido…' : 'Aceitar e criar pedido'}</Button>{acceptance.isError ? <p role="alert" className="text-sm text-red-700">{acceptance.error.message}</p> : null}</div> : !admin ? <p className="text-sm text-amber-700">Esta versão não está disponível para aceite. Confira a versão atual ou solicite revisão à loja.</p> : null}
    </>}
  </section>;
}
