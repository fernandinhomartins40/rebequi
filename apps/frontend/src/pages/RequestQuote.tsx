import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImageIcon,
  Keyboard,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
import { LiveDocumentScanner, type ScannedDocument } from '@/components/LiveDocumentScanner';
import { ProductAutocomplete } from '@/components/ProductAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { saveProvisionalCredentials } from '@/lib/provisional-credentials';
import {
  clearDraftBackup,
  loadDraftBackup,
  saveDraftBackup,
} from '@/lib/quote-draft-storage';
import {
  createAnonymousQuoteDraft,
  createManualQuoteDraft,
  fetchAnonymousQuoteDraft,
  submitAnonymousQuote,
  updateAnonymousQuoteDraft,
} from '@/services/api/quotes';
import { ApiError } from '@/services/api/client';
import type { QuoteItem, QuoteRequest } from '@/types';

type EditableItem = {
  key: string;
  productId?: string | null;
  name: string;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
  /** 0..1. Drives the "please confirm" highlighting. */
  confidence?: number | null;
  /** What was actually written on the paper. */
  sourceLine?: string | null;
};

/**
 * `scan` and `review` are the only screens the customer must pass through.
 * Identification happens inside `review`, after the value is visible.
 */
type Step = 'scan' | 'processing' | 'review' | 'failed' | 'manual' | 'done';

/** Below this the item is flagged for the customer to confirm. */
const REVIEW_THRESHOLD = 0.75;
/** Stop polling after this long and offer a way out instead of spinning forever. */
const MAX_POLL_MS = 90_000;

function makeKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function RequestQuotePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshSession, user } = useAuth();

  const [step, setStep] = useState<Step>('scan');
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const pollStartedAt = useRef<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const pendingSave = useRef<Promise<unknown>>(Promise.resolve());
  const submitting = useRef(false);
  const saveVersion = useRef(0);

  const documentMutation = useMutation({ mutationFn: createAnonymousQuoteDraft });
  const submitMutation = useMutation({ mutationFn: submitAnonymousQuote });
  const manualMutation = useMutation({
    mutationFn: ({ text, token }: { text: string; token?: string }) => createManualQuoteDraft(text, token),
  });

  useEffect(() => {
    if (user?.role !== 'CUSTOMER') return;
    setNameInput((current) => current || user.name);
    setWhatsappInput((current) => current || user.whatsapp || '');
  }, [user]);

  useEffect(() => () => {
    if (photoUrl?.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  // Restore an unsent list (refresh, incoming call, tab discarded).
  useEffect(() => {
    const backup = loadDraftBackup();
    if (!backup) return;

    setDraftToken(backup.token);
    setItems(backup.items);
    setPhotoUrl(backup.photoUrl ?? null);
    setStep('review');
    setRestoring(true);
  }, []);

  useEffect(() => {
    if (!draftToken || step !== 'review') return;
    saveDraftBackup({ token: draftToken, items, photoUrl });
  }, [draftToken, items, photoUrl, step]);

  useEffect(() => {
    if (!draftToken || step !== 'review' || restoring || submitting.current) return;
    const valid = items.filter((item) => item.name.trim());
    if (!valid.length) return;
    const version = ++saveVersion.current;
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => {
      const save = pendingSave.current.catch(() => undefined).then(() =>
        updateAnonymousQuoteDraft(draftToken, valid.map((item) => ({
          productId: item.productId ?? null, name: item.name.trim(), quantity: item.quantity,
          unit: item.unit ?? null, notes: item.notes ?? null,
          recognitionSourceLine: item.sourceLine ?? null,
        })))
      );
      pendingSave.current = save;
      void save.then(() => {
        if (version === saveVersion.current) setSaveStatus('saved');
      }, () => {
        if (version === saveVersion.current) setSaveStatus('error');
      });
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [draftToken, step, items, restoring]);

  const draftQuery = useQuery({
    queryKey: ['quote', 'anonymous', draftToken],
    queryFn: () => fetchAnonymousQuoteDraft(draftToken as string),
    enabled: Boolean(draftToken) && (step === 'processing' || restoring),
    retry: (count, error) => !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2,
    refetchInterval: (query) => {
      if (step !== 'processing') return false;
      const current = query.state.data as QuoteRequest | undefined;
      const finished =
        current && current.ocrStatus !== 'PROCESSING' && current.ocrStatus !== 'PENDING';
      return finished ? false : 1500;
    },
  });

  useEffect(() => {
    if (!restoring || !draftQuery.data) return;
    const draft = draftQuery.data;
    setQuoteId(draft.id);
    setPhotoUrl(draft.documentUrl || null);
    if (!items.length && ['PENDING', 'PROCESSING'].includes(draft.ocrStatus)) {
      pollStartedAt.current = Date.now();
      setStep('processing');
    } else if (!items.length) {
      setItems(draft.items.map(editableFromQuote));
      if (!draft.items.length) {
        setFailureReason(draft.ocrError || 'Revise ou digite a lista para continuar.');
        setStep('failed');
      }
    }
    setRestoring(false);
  }, [restoring, draftQuery.data, items.length]);

  useEffect(() => {
    if (!draftQuery.error || (!restoring && step !== 'processing')) return;
    const expired = draftQuery.error instanceof ApiError && [403, 404].includes(draftQuery.error.status);
    if (expired) { clearDraftBackup(); setDraftToken(null); }
    setRestoring(false);
    setFailureReason(expired ? 'O rascunho expirou. Envie outra foto ou digite sua lista.' : 'Não foi possível consultar a leitura. Você pode continuar com sua lista.');
    setStep('failed');
  }, [draftQuery.error, restoring, step]);

  useEffect(() => {
    if (step !== 'processing') return;
    const remaining = Math.max(0, MAX_POLL_MS - (Date.now() - (pollStartedAt.current ?? Date.now())));
    const timeout = setTimeout(() => {
      setFailureReason('A leitura está demorando mais que o normal.');
      setStep('failed');
    }, remaining);
    return () => clearTimeout(timeout);
  }, [step]);

  // OCR finished (or gave up) — move on.
  useEffect(() => {
    if (step !== 'processing') return;

    // Never leave the customer watching a spinner forever.
    if (pollStartedAt.current && Date.now() - pollStartedAt.current > MAX_POLL_MS) {
      setFailureReason('A leitura está demorando mais que o normal.');
      setStep('failed');
      return;
    }

    const current = draftQuery.data;
    if (!current) return;

    const finished = current.ocrStatus !== 'PROCESSING' && current.ocrStatus !== 'PENDING';
    if (!finished) return;

    setQuoteId(current.id);

    if (current.items.length > 0) {
      setItems(current.items.map(editableFromQuote));
      setStep('review');
      return;
    }

    // Nothing structured came back. If the engine at least produced raw text,
    // hand those lines over as editable items instead of an empty list.
    const rawLines = (current.ocrText ?? '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 2);

    if (rawLines.length > 0) {
      setItems(
        rawLines.map((line) => ({
          key: makeKey('item'),
          name: line,
          quantity: 1,
          unit: null,
          confidence: 0.3,
          sourceLine: line,
        }))
      );
      setStep('review');
      return;
    }

    setFailureReason(current.ocrError ?? 'Não conseguimos ler os itens dessa foto.');
    setStep('failed');
  }, [step, draftQuery.data]);

  const handleScanCapture = useCallback(
    async (doc: ScannedDocument) => {
      setStep('processing');
      pollStartedAt.current = Date.now();
      setPhotoUrl(URL.createObjectURL(doc.file));

      try {
        const result = await documentMutation.mutateAsync({
          file: doc.file,
          width: doc.width,
          height: doc.height,
        });
        setDraftToken(result.token);
        setQuoteId(result.quote.id);
        setPhotoUrl(result.quote.documentUrl || null);
        saveDraftBackup({ token: result.token, items: [], photoUrl: result.quote.documentUrl });
      } catch (error) {
        setStep('scan');
        toast({
          variant: 'destructive',
          title: 'Não foi possível enviar a foto',
          description: error instanceof Error ? error.message : 'Tente novamente.',
        });
      }
    },
    [documentMutation, toast]
  );

  const handleSend = async () => {
    if (submitting.current) return;
    const cleaned = items.filter((item) => item.name.trim().length > 0);
    if (cleaned.length === 0) {
      toast({ variant: 'destructive', title: 'Lista vazia', description: 'Adicione pelo menos um item.' });
      return;
    }

    const digits = whatsappInput.replace(/\D/g, '');
    if (digits.length < 10) {
      toast({
        variant: 'destructive',
        title: 'WhatsApp inválido',
        description: 'Informe o número com DDD para a loja te responder.',
      });
      return;
    }

    if (!draftToken) {
      toast({ variant: 'destructive', title: 'Rascunho expirado', description: 'Tire a foto novamente.' });
      setStep('scan');
      return;
    }

    submitting.current = true;
    clearTimeout(saveTimer.current);
    try {
      await pendingSave.current.catch(() => undefined);
      const result = await submitMutation.mutateAsync({
        token: draftToken,
        name: nameInput.trim() || undefined,
        whatsapp: normalizeWhatsapp(whatsappInput),
        items: cleaned.map((item) => ({
          productId: item.productId ?? null,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit ?? null,
          notes: item.notes ?? null,
          recognitionSourceLine: item.sourceLine ?? null,
        })),
      });

      saveProvisionalCredentials(result.provisionalCredentials);
      clearDraftBackup();
      await refreshSession().catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setQuoteId(result.quote.id);
      setStep('done');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'LOGIN_REQUIRED') {
        saveDraftBackup({ token: draftToken, items, photoUrl });
        toast({ title: 'Entre para enviar', description: 'Sua lista está salva. Depois do login, você volta para conferir e enviar.' });
        navigate('/login', { state: { from: { pathname: '/pedido' }, prefillIdentifier: whatsappInput } });
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Não foi possível enviar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally { submitting.current = false; }
  };

  const restartScan = () => {
    clearDraftBackup();
    setItems([]);
    setDraftToken(null);
    setPhotoUrl(null);
    setFailureReason(null);
    setRestoring(false);
    setStep('scan');
  };

  switch (step) {
    case 'scan':
      return <LiveDocumentScanner onCapture={(doc) => void handleScanCapture(doc)} onCancel={() => navigate('/')}
        onManualEntry={() => setStep('manual')} />;

    case 'processing':
      return <ProcessingScreen uploading={documentMutation.isPending} />;

    case 'failed':
      return (
        <FailedScreen
          reason={failureReason}
          hasDraft={Boolean(draftToken)}
          onRetry={restartScan}
          onTypeManually={() => {
            setItems([{ key: makeKey('item'), name: '', quantity: 1, unit: null }]);
            setStep('manual');
          }}
          onSendPhotoAnyway={() => {
            setItems([
              {
                key: makeKey('item'),
                name: 'Lista na foto (a loja vai conferir)',
                quantity: 1,
                unit: null,
              },
            ]);
            setStep('review');
          }}
        />
      );

    case 'manual':
      return (
        <ManualEntryScreen
          busy={manualMutation.isPending}
          onBack={() => setStep(draftToken ? 'failed' : 'scan')}
          onConfirm={async (lines) => {
            try {
              const result = await manualMutation.mutateAsync({ text: lines.join('\n'), token: draftToken || undefined });
              setDraftToken(result.token);
              setQuoteId(result.quote.id);
              setPhotoUrl(result.quote.documentUrl || null);
              setItems(result.quote.items.map(editableFromQuote));
              saveDraftBackup({ token: result.token, items: result.quote.items.map(editableFromQuote), photoUrl: result.quote.documentUrl });
              setStep('review');
            } catch (error) {
              if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
                setDraftToken(null);
                clearDraftBackup();
              }
              toast({ variant: 'destructive', title: 'Não foi possível preparar a lista', description: error instanceof Error ? error.message : 'Tente novamente.' });
            }
          }}
        />
      );

    case 'review':
      return (
        <ReviewScreen
          items={items}
          photoUrl={photoUrl}
          onItemsChange={setItems}
          onRetake={restartScan}
          onSend={handleSend}
          sending={submitMutation.isPending || restoring}
          saveStatus={restoring ? 'Recuperando rascunho…' : saveStatus === 'saving' ? 'Salvando rascunho…' : saveStatus === 'saved' ? 'Rascunho salvo' : 'Não foi possível salvar agora. Sua lista continua nesta tela.'}
          whatsappInput={whatsappInput}
          nameInput={nameInput}
          onWhatsappChange={setWhatsappInput}
          onNameChange={setNameInput}
        />
      );

    case 'done':
      return <DoneScreen onSeeQuotes={() => navigate(`/painel-cliente?tab=quotes&quoteId=${quoteId}`)} />;
  }
}

// ─── Screen: processing ──────────────────────────────────────────────────────

function ProcessingScreen({ uploading }: { uploading: boolean }) {
  const messages = useMemo(
    () => ['Lendo sua lista…', 'Identificando produtos…', 'Conferindo com o catálogo da loja…'],
    []
  );
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
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{uploading ? 'Enviando sua foto…' : messages[index]}</h1>
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

// ─── Screen: failed ──────────────────────────────────────────────────────────

/**
 * Reading can fail; the order must not. Three ways out, none of which is
 * "type fifteen items into separate fields on a phone".
 */
function FailedScreen({
  reason,
  hasDraft,
  onRetry,
  onTypeManually,
  onSendPhotoAnyway,
}: {
  reason: string | null;
  hasDraft: boolean;
  onRetry: () => void;
  onTypeManually: () => void;
  onSendPhotoAnyway: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-white px-5 py-8">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-foreground">
          Não conseguimos ler dessa vez
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {reason ?? 'A foto pode estar escura ou tremida.'} Escolha como prefere continuar:
        </p>

        <div className="mt-8 space-y-2.5">
          <Button onClick={onRetry} size="lg" className="h-14 w-full justify-start gap-3 text-base">
            <Camera className="h-5 w-5" />
            <span className="text-left">
              Tirar outra foto
              <span className="block text-xs font-normal opacity-80">Mais luz, mais perto, papel plano</span>
            </span>
          </Button>

          <Button
            onClick={onTypeManually}
            variant="outline"
            size="lg"
            className="h-14 w-full justify-start gap-3 text-base"
          >
            <Keyboard className="h-5 w-5" />
            <span className="text-left">
              Digitar minha lista
              <span className="block text-xs font-normal text-muted-foreground">Um item por linha</span>
            </span>
          </Button>

          {hasDraft ? <Button
            onClick={onSendPhotoAnyway}
            variant="outline"
            size="lg"
            className="h-14 w-full justify-start gap-3 text-base"
          >
            <Send className="h-5 w-5" />
            <span className="text-left">
              Mandar a foto direto pra loja
              <span className="block text-xs font-normal text-muted-foreground">A loja lê e te responde</span>
            </span>
          </Button> : null}
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/">Voltar para a loja</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─── Screen: manual entry ────────────────────────────────────────────────────

/** One textarea beats fifteen inputs when typing on a phone. */
function ManualEntryScreen({
  onBack,
  onConfirm,
  busy,
}: {
  onBack: () => void;
  onConfirm: (lines: string[]) => void;
  busy: boolean;
}) {
  const [text, setText] = useState('');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-white pb-32">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={busy} className="gap-1.5 px-0">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Digite sua lista</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escreva um item por linha, do jeito que você falaria. Ex: <em>5 sacos de cimento</em>.
        </p>

        <Textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          maxLength={10000}
          aria-label="Lista de produtos, um por linha"
          placeholder={'5 sacos de cimento\n2 caixas de porcelanato 60x60\n1 tinta acrílica 18L'}
          className="mt-5 text-base leading-relaxed"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {lines.length} {lines.length === 1 ? 'item' : 'itens'}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={() => onConfirm(lines)}
            disabled={lines.length === 0 || lines.length > 100 || busy}
            size="lg"
            className="h-14 w-full gap-2 text-base font-bold"
          >
            <ArrowRight className="h-5 w-5" />
            {busy ? 'Preparando lista…' : `Continuar com ${lines.length} ${lines.length === 1 ? 'item' : 'itens'}`}
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─── Screen: review ──────────────────────────────────────────────────────────

function ReviewScreen({
  items,
  photoUrl,
  onItemsChange,
  onRetake,
  onSend,
  sending,
  saveStatus,
  whatsappInput,
  nameInput,
  onWhatsappChange,
  onNameChange,
}: {
  items: EditableItem[];
  photoUrl: string | null;
  onItemsChange: (items: EditableItem[]) => void;
  onRetake: () => void;
  onSend: () => void;
  sending: boolean;
  saveStatus: string;
  whatsappInput: string;
  nameInput: string;
  onWhatsappChange: (value: string) => void;
  onNameChange: (value: string) => void;
}) {
  const [photoOpen, setPhotoOpen] = useState(false);

  const updateItem = (key: string, patch: Partial<EditableItem>) => {
    onItemsChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };
  const removeItem = (key: string) => onItemsChange(items.filter((item) => item.key !== key));
  const addItem = () =>
    onItemsChange([...items, { key: makeKey('item'), name: '', quantity: 1, unit: null }]);

  const validItems = items.filter((item) => item.name.trim().length > 0);
  const needsAttention = validItems.filter(
    (item) => (item.confidence ?? 1) < REVIEW_THRESHOLD
  ).length;

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-white pb-40">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          {photoUrl ? (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <img src={photoUrl} alt="Sua foto" className="h-8 w-8 rounded object-cover" />
              Ver foto
            </button>
          ) : (
            <span />
          )}
          <p className="text-xs font-medium text-muted-foreground">
            {validItems.length} {validItems.length === 1 ? 'item' : 'itens'}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Confira sua lista</h1>
        <p className="mt-2 text-xs text-muted-foreground" role="status">{saveStatus}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {needsAttention > 0 ? (
            <>
              Lemos {validItems.length} {validItems.length === 1 ? 'item' : 'itens'}.{' '}
              <strong className="text-amber-700">
                {needsAttention} {needsAttention === 1 ? 'precisa' : 'precisam'} da sua conferência
              </strong>{' '}
              — estão marcados abaixo.
            </>
          ) : (
            'Tudo certo com a leitura. Ajuste o que quiser antes de enviar.'
          )}
        </p>

        <div className="mt-5 space-y-2.5">
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

        {/* Identificação: só agora, com o valor já na tela. */}
        <section className="mt-8 rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Para onde mandamos o orçamento?</h2>
          </div>

          <div className="space-y-4">
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
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">É por aqui que a loja vai te responder.</p>
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
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={onSend}
            disabled={sending || validItems.length === 0}
            size="lg"
            className="h-14 w-full gap-2 text-base font-bold"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {sending
              ? 'Enviando…'
              : `Enviar ${validItems.length} ${validItems.length === 1 ? 'item' : 'itens'} para a loja`}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            A loja vai responder no seu WhatsApp em breve.
          </p>
        </div>
      </div>

      {photoOpen && photoUrl ? (
        <PhotoViewer url={photoUrl} onClose={() => setPhotoOpen(false)} onRetake={onRetake} />
      ) : null}
    </main>
  );
}

/** Full-screen photo, with "retake" tucked safely inside it. */
function PhotoViewer({
  url,
  onClose,
  onRetake,
}: {
  url: string;
  onClose: () => void;
  onRetake: () => void;
}) {
  const [confirmingRetake, setConfirmingRetake] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-white">Sua foto</p>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <img src={url} alt="Lista fotografada" className="max-h-full max-w-full rounded-lg object-contain" />
      </div>

      <div className="px-4 pb-8 pt-4">
        {confirmingRetake ? (
          <div className="mx-auto max-w-sm rounded-xl bg-white/10 p-4 text-center backdrop-blur">
            <p className="text-sm text-white">
              Tirar outra foto apaga os itens que você já ajustou. Continuar?
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmingRetake(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={onRetake}>
                Sim, refazer
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm">
            <Button
              variant="secondary"
              className="h-12 w-full gap-2"
              onClick={() => setConfirmingRetake(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              Tirar outra foto
            </Button>
          </div>
        )}
      </div>
    </div>
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
  const confidence = item.confidence ?? 1;
  const needsAttention = confidence < REVIEW_THRESHOLD;
  const showSourceLine =
    needsAttention && item.sourceLine && item.sourceLine.toLowerCase() !== item.name.toLowerCase();

  return (
    <div
      className={`rounded-xl border bg-white p-3 shadow-sm transition ${
        needsAttention ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200/70'
      }`}
    >
      <div className="flex items-center gap-2">
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

        {item.unit ? (
          <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
            {item.unit}
          </span>
        ) : null}

        {editingName ? (
          <ProductAutocomplete
            value={item.name}
            onChange={(name) => onUpdate(item.key, { name, productId: null, confidence: 1 })}
            onSelectProduct={(product) => {
              onUpdate(item.key, {
                name: product.name,
                productId: product.id,
                // Picking from the catalogue resolves any doubt.
                confidence: 1,
              });
              setEditingName(false);
            }}
            onBlur={() => item.name.trim() && setEditingName(false)}
            placeholder="Ex: cimento, areia, tijolo…"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="group flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-medium text-foreground"
          >
            <span className="min-w-0 break-words">{item.name}</span>
            <Pencil className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-50" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onRemove(item.key)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label="Remover item"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showSourceLine ? (
        <p className="mt-2 pl-1 text-xs text-amber-700">
          <ImageIcon className="mr-1 inline h-3 w-3" />
          No papel estava: “{item.sourceLine}”
        </p>
      ) : null}
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
    confidence: item.confidence ?? null,
    sourceLine: item.recognitionSourceLine ?? null,
  };
}
