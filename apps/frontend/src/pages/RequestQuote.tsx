import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
import { LiveDocumentScanner, type ScannedDocument } from '@/components/LiveDocumentScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { saveProvisionalCredentials } from '@/lib/provisional-credentials';
import {
  fetchMyQuotes,
  processPublicQuoteDocument,
  startPublicLead,
  submitMyQuote,
  updateMyQuoteDraft,
} from '@/services/api/quotes';
import type { QuoteItem, QuoteRequest } from '@/types';

type EditableItem = {
  key: string;
  productId?: string | null;
  name: string;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
};

type Step = 'contact' | 'scan' | 'processing' | 'review' | 'done';

function makeKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function RequestQuotePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshSession } = useAuth();

  const [step, setStep] = useState<Step>('contact');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [reviewStartedAt, setReviewStartedAt] = useState<Date | null>(null);

  const leadMutation = useMutation({ mutationFn: startPublicLead });
  const documentMutation = useMutation({ mutationFn: processPublicQuoteDocument });
  const updateDraftMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { items: EditableItem[] } }) =>
      updateMyQuoteDraft(id, {
        items: payload.items.map((item) => ({
          productId: item.productId ?? null,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit ?? null,
          notes: item.notes ?? null,
        })),
      }),
  });
  const submitMutation = useMutation({ mutationFn: submitMyQuote });

  // Polling: enquanto o OCR está em andamento, busca a quota atualizada
  const quoteQuery = useQuery({
    queryKey: ['customer', 'quotes', 'wizard', quoteId],
    queryFn: fetchMyQuotes,
    enabled: Boolean(quoteId) && (step === 'processing' || step === 'review'),
    refetchInterval: (query) => {
      if (step !== 'processing') return false;
      const data = query.state.data as QuoteRequest[] | undefined;
      const current = data?.find((q) => q.id === quoteId);
      const finished = current && current.ocrStatus !== 'PROCESSING' && current.ocrStatus !== 'PENDING';
      return finished ? false : 1500;
    },
  });

  // Quando o polling sinaliza que o OCR terminou, popula itens e troca de tela
  useEffect(() => {
    if (step !== 'processing' || !quoteId || !quoteQuery.data) return;
    const current = quoteQuery.data.find((q) => q.id === quoteId);
    if (!current) return;

    const finished = current.ocrStatus !== 'PROCESSING' && current.ocrStatus !== 'PENDING';
    if (!finished) return;

    setItems(
      current.items.length > 0
        ? current.items.map((item) => editableFromQuote(item))
        : [{ key: makeKey('item'), name: '', quantity: 1, unit: null }]
    );
    setStep('review');
    setReviewStartedAt(new Date());
  }, [step, quoteId, quoteQuery.data]);

  const handleSubmitContact = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = whatsappInput.replace(/\D/g, '');
    if (digits.length < 10) {
      toast({ variant: 'destructive', title: 'WhatsApp inválido', description: 'Informe o número com DDD.' });
      return;
    }
    try {
      const result = await leadMutation.mutateAsync({
        name: nameInput.trim() || undefined,
        whatsapp: normalizeWhatsapp(whatsappInput),
      });
      saveProvisionalCredentials(result.provisionalCredentials);
      setLeadId(result.lead.id);
      setStep('scan');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível continuar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    }
  };

  const handleScanCapture = async (doc: ScannedDocument) => {
    if (!leadId) return;
    setStep('processing');
    try {
      const result = await documentMutation.mutateAsync({
        leadId,
        file: doc.file,
        width: doc.width,
        height: doc.height,
      });
      setQuoteId(result.quote.id);
      queryClient.setQueryData<QuoteRequest[]>(['customer', 'quotes'], (current) => {
        const next = current ?? [];
        return [result.quote, ...next.filter((q) => q.id !== result.quote.id)];
      });
      await refreshSession();
      // Se o OCR já completou no upload (raro mas possível), pula direto para review
      if (result.quote.ocrStatus !== 'PROCESSING' && result.quote.ocrStatus !== 'PENDING') {
        setItems(
          result.quote.items.length > 0
            ? result.quote.items.map((item) => editableFromQuote(item))
            : [{ key: makeKey('item'), name: '', quantity: 1, unit: null }]
        );
        setStep('review');
        setReviewStartedAt(new Date());
      }
    } catch (error) {
      setStep('scan');
      toast({
        variant: 'destructive',
        title: 'Não foi possível enviar a foto',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    }
  };

  const handleSendQuote = async () => {
    if (!quoteId) return;
    const cleaned = items.filter((item) => item.name.trim().length > 0);
    if (cleaned.length === 0) {
      toast({ variant: 'destructive', title: 'Lista vazia', description: 'Adicione pelo menos um item.' });
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({ id: quoteId, payload: { items: cleaned } });
      await submitMutation.mutateAsync(quoteId);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível enviar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    }
  };

  switch (step) {
    case 'contact':
      return (
        <ContactScreen
          whatsappInput={whatsappInput}
          nameInput={nameInput}
          onWhatsappChange={setWhatsappInput}
          onNameChange={setNameInput}
          onSubmit={handleSubmitContact}
          loading={leadMutation.isPending}
        />
      );
    case 'scan':
      return (
        <LiveDocumentScanner
          onCapture={(doc) => void handleScanCapture(doc)}
          onCancel={() => setStep('contact')}
        />
      );
    case 'processing':
      return <ProcessingScreen />;
    case 'review':
      return (
        <ReviewScreen
          items={items}
          onItemsChange={setItems}
          onBack={() => setStep('scan')}
          onSend={handleSendQuote}
          sending={updateDraftMutation.isPending || submitMutation.isPending}
          startedAt={reviewStartedAt}
        />
      );
    case 'done':
      return <DoneScreen onSeeQuotes={() => navigate(`/painel-cliente?tab=quotes&quoteId=${quoteId}`)} />;
  }
}

// ─── Screen: contact ─────────────────────────────────────────────────────────

function ContactScreen({
  whatsappInput,
  nameInput,
  onWhatsappChange,
  onNameChange,
  onSubmit,
  loading,
}: {
  whatsappInput: string;
  nameInput: string;
  onWhatsappChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-white">
      <div className="px-4 pt-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 px-0 text-muted-foreground hover:bg-transparent">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Vamos fazer seu orçamento
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Em 3 passos rápidos: você se identifica, tira foto da sua lista e confere os itens.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">Seu WhatsApp</Label>
              <Input
                id="whatsapp"
                inputMode="tel"
                placeholder="(11) 99999-0000"
                value={whatsappInput}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                  onWhatsappChange(formatWhatsapp(digits));
                }}
                autoFocus
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">É por aqui que a loja vai responder.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="flex items-center gap-2">
                Nome <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="name"
                placeholder="Como podemos te chamar?"
                value={nameInput}
                onChange={(event) => onNameChange(event.target.value)}
                className="h-12 text-base"
              />
            </div>

            <Button type="submit" size="lg" disabled={loading} className="h-12 w-full gap-2 text-base">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              {loading ? 'Aguarde…' : 'Continuar para a câmera'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Seus dados são usados só para a loja te responder. Nada é compartilhado.
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Screen: processing ──────────────────────────────────────────────────────

function ProcessingScreen() {
  const messages = [
    'Lendo sua lista…',
    'Identificando produtos…',
    'Conferindo com o catálogo da loja…',
  ];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((value) => (value + 1) % messages.length), 1800);
    return () => window.clearInterval(id);
  }, [messages.length]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white px-5">
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
          <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{messages[index]}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Isso costuma levar de 5 a 30 segundos. Não saia desta tela.
        </p>
        <div className="mt-8 space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </main>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Screen: review ──────────────────────────────────────────────────────────

function ReviewScreen({
  items,
  onItemsChange,
  onBack,
  onSend,
  sending,
  startedAt,
}: {
  items: EditableItem[];
  onItemsChange: (items: EditableItem[]) => void;
  onBack: () => void;
  onSend: () => void;
  sending: boolean;
  startedAt: Date | null;
}) {
  const updateItem = (key: string, patch: Partial<EditableItem>) => {
    onItemsChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };
  const removeItem = (key: string) => {
    onItemsChange(items.filter((item) => item.key !== key));
  };
  const addItem = () => {
    onItemsChange([...items, { key: makeKey('item'), name: '', quantity: 1, unit: null }]);
  };

  const validItems = items.filter((item) => item.name.trim().length > 0).length;
  const showEmptyHint = items.length === 0 || (items.length === 1 && !items[0].name.trim());

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-white pb-32">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 px-0">
            <ArrowLeft className="h-4 w-4" />
            Refazer foto
          </Button>
          <p className="text-xs font-medium text-muted-foreground">
            {validItems} {validItems === 1 ? 'item' : 'itens'}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Confira sua lista</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {startedAt
              ? 'Lemos os itens que estavam na foto. Ajuste o que precisar antes de enviar.'
              : 'Adicione os itens da sua lista.'}
          </p>
        </div>

        {showEmptyHint ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Não conseguimos identificar os itens automaticamente. Adicione manualmente abaixo — é rapidinho.
          </div>
        ) : null}

        <div className="space-y-2.5">
          {items.map((item) => (
            <ItemRow key={item.key} item={item} onUpdate={updateItem} onRemove={removeItem} />
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Adicionar outro item
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={onSend}
            disabled={sending || validItems === 0}
            size="lg"
            className="h-14 w-full gap-2 text-base font-bold"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {sending ? 'Enviando…' : `Enviar ${validItems} ${validItems === 1 ? 'item' : 'itens'} para a loja`}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            A loja vai responder no seu WhatsApp em breve.
          </p>
        </div>
      </div>
    </main>
  );
}

function ItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: EditableItem;
  onUpdate: (key: string, patch: Partial<EditableItem>) => void;
  onRemove: (key: string) => void;
}) {
  const [editingName, setEditingName] = useState(item.name === '');

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
      {/* Quantidade */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onUpdate(item.key, { quantity: Math.max(1, item.quantity - 1) })}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-600 transition hover:bg-white"
          aria-label="Diminuir"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
        <button
          type="button"
          onClick={() => onUpdate(item.key, { quantity: item.quantity + 1 })}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-600 transition hover:bg-white"
          aria-label="Aumentar"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Unidade pequena */}
      {item.unit ? (
        <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
          {item.unit}
        </span>
      ) : null}

      {/* Nome */}
      {editingName ? (
        <input
          autoFocus
          type="text"
          value={item.name}
          onChange={(event) => onUpdate(item.key, { name: event.target.value })}
          onBlur={() => item.name.trim() && setEditingName(false)}
          onKeyDown={(event) => event.key === 'Enter' && item.name.trim() && setEditingName(false)}
          placeholder="Ex: cimento, areia, tijolo…"
          className="min-w-0 flex-1 rounded border border-primary/30 bg-white px-2 py-1 text-sm outline-none focus:border-primary"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingName(true)}
          className="group flex min-w-0 flex-1 items-center gap-1 truncate text-left text-sm font-medium text-foreground"
        >
          <span className="truncate">{item.name}</span>
          <Pencil className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-50" />
        </button>
      )}

      {/* Remover */}
      <button
        type="button"
        onClick={() => onRemove(item.key)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-500"
        aria-label="Remover item"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Screen: done ────────────────────────────────────────────────────────────

function DoneScreen({ onSeeQuotes }: { onSeeQuotes: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-white px-5 py-8">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Pronto, lista enviada!</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A loja recebeu seu pedido e vai te chamar no WhatsApp com os preços. Pode fechar essa tela.
        </p>
        <div className="mt-8 space-y-2">
          <Button asChild size="lg" className="h-12 w-full gap-2">
            <Link to="/">
              Voltar para a loja
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button onClick={onSeeQuotes} variant="outline" size="lg" className="h-12 w-full gap-2">
            <Camera className="h-4 w-4" />
            Ver meus pedidos
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function editableFromQuote(item: QuoteItem): EditableItem {
  return {
    key: item.id,
    productId: item.productId,
    name: item.name,
    quantity: Number(item.quantity) || 1,
    unit: item.unit,
    notes: item.notes,
  };
}
