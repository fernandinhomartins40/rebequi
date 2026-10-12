import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, Plus, Trash2 } from 'lucide-react';
import { DashboardHeading, DashboardSteps } from '@/components/dashboard/DashboardElements';
import { QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProductAutocomplete } from '@/components/ProductAutocomplete';
import { QuoteProposalPanel } from '@/components/QuoteProposalPanel';
import { buildQuoteDisplayTitle, formatQuoteTimestamp, getQuoteStatusDescription } from '@/lib/quote-ui';
import type { ScannedDocument } from '@/components/LiveDocumentScanner';
import type { QuoteItemInputDTO, QuoteRequest } from '@/types';
import '@/components/ui/wizard-layout.css';

type EditableQuoteItem = QuoteItemInputDTO & { id?: string };
type DraftEditorState = { title: string; customerNote: string; items: EditableQuoteItem[] };
type Props = {
  quotes: QuoteRequest[]; quotesLoading: boolean; selectedQuote: QuoteRequest | null;
  editorState: DraftEditorState; setEditorState: Dispatch<SetStateAction<DraftEditorState>>;
  editorCardRef: MutableRefObject<HTMLDivElement | null>; createDraftPending: boolean;
  saveDraftPending: boolean; submitPending: boolean;
  onCaptureDocument: (selection: ScannedDocument) => Promise<void>;
  onSelectQuote: (id: string | null) => void; onSaveDraft: () => Promise<unknown>; onSaveAndSend: () => Promise<unknown>;
};
const EMPTY_ITEM: EditableQuoteItem = { name: '', quantity: 1, unit: '', notes: '' };

export function CustomerQuotesPanel({ quotes, quotesLoading, selectedQuote, editorState, setEditorState,
  editorCardRef, saveDraftPending, submitPending, onSelectQuote, onSaveDraft, onSaveAndSend }: Props) {
  const [stage, setStage] = useState<'review' | 'send'>('review');
  const [attempted, setAttempted] = useState(false);
  const busy = saveDraftPending || submitPending;
  const validItems = editorState.items.filter(item => item.name.trim());
  const ready = validItems.length > 0 && validItems.length === editorState.items.length &&
    validItems.every(item => Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0);
  const draft = selectedQuote?.status === 'DRAFT';
  useEffect(() => { setStage('review'); setAttempted(false); }, [selectedQuote?.id]);
  const advance = () => { setAttempted(true); if (ready) setStage('send'); };
  const update = (index: number, patch: Partial<EditableQuoteItem>) => setEditorState(state => ({
    ...state, items: state.items.map((item, i) => i === index ? { ...item, ...patch } : item),
  }));
  const send = async () => { if (!ready || busy) return; try { await onSaveAndSend(); } catch { /* Mutation displays the error and retains the draft. */ } };
  const save = async () => { if (!ready || busy) return; try { await onSaveDraft(); } catch { /* Mutation displays the error. */ } };

  return <div className="space-y-5">
    <DashboardHeading title="Seus orçamentos" actions={<Button asChild><Link to="/pedido">Começar orçamento<ArrowRight size={16} className="ml-2" /></Link></Button>} />
    {quotesLoading && <p role="status" className="text-sm text-slate-500">Carregando seus pedidos…</p>}
    {!selectedQuote && quotes.length > 0 && <section aria-label="Lista de orçamentos" className="grid gap-4 lg:grid-cols-2">
      {quotes.map(quote => <article key={quote.id} data-quote-id={quote.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
          <div className="min-w-0"><h3 className="font-bold">Orçamento {quote.referenceCode}</h3>
            <p className="mt-1 text-xs text-slate-500">Criado em {formatQuoteTimestamp(quote.createdAt)}</p></div>
          <QuoteStatusBadge status={quote.status} />
        </header>
        <div className="p-4">
          {quote.title && <p className="mb-3 break-words text-sm font-medium">{quote.title}</p>}
          <p className="mb-3 text-xs font-semibold text-slate-500">{quote.items.length} {quote.items.length === 1 ? 'produto neste orçamento' : 'produtos neste orçamento'}</p>
          <ul className="space-y-2">{quote.items.slice(0, 3).map(item => <li key={item.id} className="flex justify-between gap-4 text-sm">
            <span className="min-w-0 break-words">{item.name}</span><span className="shrink-0 font-medium">{item.quantity} {item.unit || 'un'}</span>
          </li>)}</ul>
          {quote.items.length > 3 && <p className="mt-2 text-xs text-slate-500">Mais {quote.items.length - 3} produtos</p>}
          {!quote.items.length && <p className="text-sm text-slate-500">Lista em preparação</p>}
          <Button variant="outline" disabled={busy} className="mt-4 w-full gap-2" onClick={() => onSelectQuote(quote.id)} aria-label={`Abrir orçamento ${quote.referenceCode}`}>
            {quote.status === 'DRAFT' ? 'Continuar este orçamento' : 'Ver orçamento completo'}<ArrowRight size={16} />
          </Button>
        </div>
      </article>)}
    </section>}
    {!selectedQuote && !quotesLoading && quotes.length === 0 && <section className="task-wizard-card py-10 text-center">
      <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
      <h3 className="text-xl font-bold">Seu primeiro orçamento em 3 passos</h3>
      <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-slate-500">Envie a lista, confira os produtos e peça os preços.</p>
      <Button asChild className="h-12"><Link to="/pedido">Preparar minha lista<ArrowRight size={18} className="ml-2" /></Link></Button>
    </section>}
    {selectedQuote && <div ref={editorCardRef} className="mx-auto w-full max-w-3xl space-y-5">
      <Button variant="ghost" disabled={busy} className="gap-2 px-0" onClick={() => onSelectQuote(null)}><ArrowLeft size={16} />Todos os orçamentos</Button>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-bold">Orçamento {selectedQuote.referenceCode}</h2><p className="mt-1 text-xs text-slate-500">Criado em {formatQuoteTimestamp(selectedQuote.createdAt)} · {selectedQuote.items.length} produtos</p></div>
      {draft && <DashboardSteps activeStep={stage === 'review' ? 1 : 2} steps={[
        { title: 'Sua lista', href: '/pedido' },
        { title: 'Conferência', onClick: () => { if (!busy) setStage('review'); } },
        { title: 'Envio', onClick: () => { if (!busy) advance(); } },
      ]} />}
      <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-slate-500">{selectedQuote.referenceCode}</span><QuoteStatusBadge status={selectedQuote.status} /></div>
      {draft ? <>
        {stage === 'review' ? <>
          <div><h3 className="text-2xl font-bold">Confira os produtos</h3><p className="mt-2 text-sm text-slate-500">Ajuste os nomes e as quantidades antes de continuar.</p></div>
          {['PENDING', 'PROCESSING'].includes(selectedQuote.ocrStatus) && <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Estamos lendo sua foto. Aguarde ou preencha os produtos abaixo.</p>}
          {selectedQuote.ocrStatus === 'FAILED' && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Não foi possível ler a foto. Você pode preencher os produtos ou começar outra lista.</p>}
          {selectedQuote.documentUrl && <details className="rounded-xl border bg-white p-4 text-sm"><summary className="cursor-pointer font-medium">Conferir foto original</summary><img src={selectedQuote.documentUrl} alt="Lista fotografada" className="mt-4 max-h-96 w-full object-contain" /></details>}
          {attempted && !ready && <p role="alert" className="text-sm text-red-600">Preencha os nomes e quantidades ou remova os itens vazios.</p>}
          <div className="space-y-3">{editorState.items.map((item, index) => <DraftItem key={`${selectedQuote.id}-${item.id || 'new'}-${index}`} item={item} index={index} busy={busy}
            onUpdate={patch => update(index, patch)} onRemove={() => setEditorState(state => ({ ...state, items: state.items.filter((_, i) => i !== index) }))} />)}</div>
          <Button variant="outline" disabled={busy} className="h-12 w-full gap-2 border-dashed" onClick={() => setEditorState(state => ({ ...state, items: [...state.items, { ...EMPTY_ITEM }] }))}><Plus size={18} />Adicionar produto</Button>
          <details className="task-wizard-card text-sm"><summary className="cursor-pointer font-medium">Título e observações (opcional)</summary>
            <div className="mt-4 space-y-4"><div><Label htmlFor="qt">Título</Label><Input id="qt" value={editorState.title} disabled={busy} onChange={event => setEditorState(state => ({ ...state, title: event.target.value }))} className="mt-2" /></div>
            <div><Label htmlFor="qn">Observações para a loja</Label><Textarea id="qn" value={editorState.customerNote} disabled={busy} onChange={event => setEditorState(state => ({ ...state, customerNote: event.target.value }))} className="mt-2" /></div></div>
          </details>
          <div className="rounded-xl border bg-white p-4"><Button className="task-wizard-primary" disabled={busy || !validItems.length} onClick={advance}>Lista conferida, continuar<ArrowRight size={18} /></Button>
            <Button variant="ghost" className="mt-2 w-full" disabled={busy || !ready} onClick={() => void save()}>{saveDraftPending ? 'Salvando…' : 'Salvar e continuar depois'}</Button></div>
        </> : <>
          <Button variant="ghost" className="gap-2 px-0" disabled={busy} onClick={() => setStage('review')}><ArrowLeft size={16} />Voltar à conferência</Button>
          <div><h3 className="text-2xl font-bold">Enviar solicitação</h3><p className="mt-2 text-sm text-slate-500">A loja vai responder pelo WhatsApp cadastrado na sua conta.</p></div>
          <section className="task-wizard-card"><strong>{validItems.length} produtos na sua lista</strong><ul className="mt-4 space-y-3">{validItems.map((item, index) => <li key={item.id || index} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-sm"><span className="min-w-0 break-words">{item.name}</span><strong className="shrink-0">{item.quantity} {item.unit || 'un'}</strong></li>)}</ul>
            {editorState.customerNote && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-500">{editorState.customerNote}</p>}
            <Button variant="ghost" disabled={busy} onClick={() => setStage('review')} className="mt-4 text-blue-600">Editar lista</Button>
          </section>
          <Button className="task-wizard-primary" disabled={busy || !ready} onClick={() => void send()}>{busy ? 'Enviando…' : 'Enviar solicitação de orçamento'}<ArrowRight size={18} /></Button>
          <p className="text-center text-xs text-slate-500">Preços e disponibilidade serão confirmados pela loja.</p>
        </>}
      </> : <section className="task-wizard-card">
        <h3 className="text-xl font-bold">{buildQuoteDisplayTitle(selectedQuote)}</h3><p className="mt-2 text-sm text-slate-500">{getQuoteStatusDescription(selectedQuote.status)}</p>
        <ul className="mt-6 space-y-3">{selectedQuote.items.map(item => <li key={item.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-sm"><span className="min-w-0 break-words">{item.name}{item.notes && <span className="mt-1 block text-xs text-slate-500">{item.notes}</span>}</span><strong className="shrink-0">{item.quantity} {item.unit || 'un'}</strong></li>)}</ul>
        {selectedQuote.customerNote && <p className="mt-5 whitespace-pre-wrap text-sm text-slate-500">{selectedQuote.customerNote}</p>}
        <QuoteProposalPanel key={selectedQuote.id} quote={selectedQuote} />
      </section>}
    </div>}
  </div>;
}

function DraftItem({ item, index, busy, onUpdate, onRemove }: { item: EditableQuoteItem; index: number; busy: boolean; onUpdate: (patch: Partial<EditableQuoteItem>) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(!item.name);
  return <div className="quote-item-row">
    <div className="quote-item-name">{editing && !busy ? <ProductAutocomplete value={item.name} onChange={name => onUpdate({ name, productId: null })}
      onSelectProduct={product => { onUpdate({ name: product.name, productId: product.id }); setEditing(false); }} onBlur={() => { if (item.name.trim()) setEditing(false); }} placeholder="Nome do material" />
      : <button type="button" disabled={busy} onClick={() => setEditing(true)}><span>{item.name}</span><span className="quote-item-edit">Editar</span></button>}</div>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div className="flex gap-3"><div><Label htmlFor={`quote-quantity-${index}`} className="text-xs text-slate-500">Quantidade</Label><Input id={`quote-quantity-${index}`} type="number" min="0.001" step="any" inputMode="decimal" disabled={busy} value={item.quantity ?? ''} onChange={event => onUpdate({ quantity: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1 h-11 w-24" /></div>
      <div><Label htmlFor={`quote-unit-${index}`} className="text-xs text-slate-500">Unidade</Label><Input id={`quote-unit-${index}`} disabled={busy} value={item.unit || ''} onChange={event => onUpdate({ unit: event.target.value })} placeholder="un, sc, m²" className="mt-1 h-11 w-24" /></div></div>
      <Button variant="ghost" disabled={busy} aria-label="Remover produto" className="h-11 gap-1 text-slate-500" onClick={onRemove}><Trash2 size={15} />Remover</Button></div>
  </div>;
}
