import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
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
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
import { LiveDocumentScanner, type ScannedDocument } from '@/components/LiveDocumentScanner';
import { ProductAutocomplete } from '@/components/ProductAutocomplete';
import { Button } from '@/components/ui/button';
import { WizardLayout } from '@/components/ui/wizard-layout';
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

/** Three customer steps; camera and processing are substeps of the first. */
type Step = 'start' | 'scan' | 'processing' | 'review' | 'contact' | 'failed' | 'manual' | 'done';
const WIZARD_STEPS = ['Sua lista', 'Conferência', 'Envio'];

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

  const [step, setStep] = useState<Step>('start');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
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
    setStep(backup.stage === 'contact' ? 'contact' : 'review');
    if (backup.name) setNameInput(backup.name);
    if (backup.whatsapp) setWhatsappInput(backup.whatsapp);
    setRestoring(true);
  }, []);

  useEffect(() => {
    if (!draftToken || (step !== 'review' && step !== 'contact')) return;
    saveDraftBackup({ token: draftToken, items, photoUrl, stage: step, name: nameInput, whatsapp: whatsappInput });
  }, [draftToken, items, photoUrl, step, nameInput, whatsappInput]);

  useEffect(() => {
    if (!draftToken || (step !== 'review' && step !== 'contact') || restoring || submitting.current) return;
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
      setDraftToken(null);
      setQuoteId(null);
      setFailureReason(null);
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
        saveDraftBackup({ token: draftToken, items, photoUrl, stage: 'contact', name: nameInput, whatsapp: whatsappInput });
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
    setSelectedFile(null);
    setManualText('');
    setStep('start');
  };

  switch (step) {
    case 'start':
      return <StartScreen onCamera={() => { setSelectedFile(null); setStep('scan'); }}
        onGallery={file => { setSelectedFile(file); setStep('scan'); }} onManual={() => setStep('manual')} />;
    case 'scan':
      return <WizardLayout steps={WIZARD_STEPS} currentStep={0} title="Foto da sua lista"
        description="A lista precisa aparecer inteira e legível." onBack={() => setStep('start')}>
        <LiveDocumentScanner embedded initialFile={selectedFile} onCapture={(doc) => void handleScanCapture(doc)}
          onCancel={() => setStep('start')} onManualEntry={() => setStep('manual')} />
      </WizardLayout>;

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
          text={manualText}
          onTextChange={setManualText}
          busy={manualMutation.isPending}
          onBack={() => setStep(draftToken ? 'failed' : 'start')}
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
      return <ReviewScreen items={items} photoUrl={photoUrl} onItemsChange={setItems} onRetake={restartScan}
        onContinue={() => setStep('contact')} busy={restoring}
        saveStatus={restoring ? 'Recuperando rascunho…' : saveStatus === 'saving' ? 'Salvando rascunho…' : saveStatus === 'saved' ? 'Rascunho salvo' : 'Sem conexão para salvar. Sua lista está guardada neste aparelho.'} />;
    case 'contact':
      return <ContactScreen items={items} onBack={() => setStep('review')} onSend={handleSend}
        sending={submitMutation.isPending || restoring} whatsappInput={whatsappInput} nameInput={nameInput}
        onWhatsappChange={setWhatsappInput} onNameChange={setNameInput} />;

    case 'done':
      return <DoneScreen onSeeQuotes={() => navigate(`/painel-cliente?tab=quotes&quoteId=${quoteId}`)} />;
  }
}

function StartScreen({ onCamera, onGallery, onManual }: {
  onCamera: () => void; onGallery: (file: File) => void; onManual: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <WizardLayout steps={WIZARD_STEPS} currentStep={0} title="Vamos preparar seu orçamento"
    description="Envie sua lista. Depois, confira os produtos e peça os preços.">
    <section className="task-wizard-card quote-method-card">
      <div className="quote-method-icon"><Camera size={34} aria-hidden="true" /></div>
      <h2>Tem uma lista no papel?</h2>
      <p>Fotografe os materiais. Nós organizamos a lista para você conferir.</p>
      <Button className="task-wizard-primary" size="lg" onClick={onCamera}><Camera size={20} />Tirar foto da lista</Button>
      <Button variant="outline" className="mt-3 w-full gap-2" onClick={() => input.current?.click()}><ImageIcon size={18} />Escolher foto da galeria</Button>
      <Button variant="ghost" className="mt-3 w-full gap-2 text-slate-600" onClick={onManual}><Keyboard size={18} />Digitar lista</Button>
      <input ref={input} type="file" accept="image/*" aria-label="Escolher foto da galeria" className="hidden"
        onChange={event => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) onGallery(file); }} />
    </section>
  </WizardLayout>;
}

function ProcessingScreen({ uploading }: { uploading: boolean }) {
  return <WizardLayout steps={WIZARD_STEPS} currentStep={0} title={uploading ? 'Enviando sua foto…' : 'Organizando sua lista…'}
    description="Aguarde um instante. Você vai conferir tudo antes de enviar.">
    <div className="task-wizard-card flex min-h-64 flex-col items-center justify-center gap-5 text-center" role="status" aria-live="polite">
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-slate-600">{uploading ? 'Preparando a leitura da foto.' : 'Identificando os produtos e as quantidades.'}</p>
    </div>
  </WizardLayout>;
}

function FailedScreen({ reason, hasDraft, onRetry, onTypeManually, onSendPhotoAnyway }: {
  reason: string | null; hasDraft: boolean; onRetry: () => void; onTypeManually: () => void; onSendPhotoAnyway: () => void;
}) {
  return <WizardLayout steps={WIZARD_STEPS} currentStep={0} title="Não conseguimos ler dessa vez"
    description="Você pode tentar outra foto ou continuar de outra forma." onBack={onRetry}>
    <section className="task-wizard-card">
      <p role="alert" className="mb-6 flex items-start gap-2 text-sm text-amber-800"><AlertTriangle className="h-5 w-5 shrink-0" />{reason ?? 'A foto pode estar escura ou tremida.'}</p>
      <Button onClick={onRetry} className="task-wizard-primary"><Camera size={18} />Tirar outra foto</Button>
      <Button onClick={onTypeManually} variant="outline" className="mt-3 h-12 w-full gap-2"><Keyboard size={18} />Digitar minha lista</Button>
      {hasDraft && <Button onClick={onSendPhotoAnyway} variant="ghost" className="mt-3 h-auto min-h-12 w-full whitespace-normal">Pedir à loja para conferir a foto</Button>}
    </section>
  </WizardLayout>;
}

function ManualEntryScreen({ text, onTextChange, onBack, onConfirm, busy }: {
  text: string; onTextChange: (value: string) => void;
  onBack: () => void; onConfirm: (lines: string[]) => void; busy: boolean;
}) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  return <WizardLayout steps={WIZARD_STEPS} currentStep={0} title="Digite sua lista"
    description="Escreva a quantidade e o material, um por linha." onBack={onBack} busy={busy}
    footer={<Button onClick={() => onConfirm(lines)} disabled={!lines.length || lines.length > 100 || busy} className="task-wizard-primary">
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight size={18} />}
      {busy ? 'Preparando lista…' : 'Continuar com ' + lines.length + (lines.length === 1 ? ' item' : ' itens')}
    </Button>}>
    <div className="task-wizard-card">
      <Label htmlFor="quote-manual-list">Quais materiais você precisa?</Label>
      <Textarea id="quote-manual-list" autoFocus value={text} onChange={event => onTextChange(event.target.value)}
        rows={8} maxLength={10000} aria-label="Lista de produtos, um por linha"
        placeholder={'5 sacos de cimento\n10 tijolos\n1 tinta acrílica 18L'} className="mt-3 text-base leading-relaxed" />
      <p className="mt-3 text-xs text-slate-500">{lines.length} {lines.length === 1 ? 'item' : 'itens'}{lines.length > 100 ? ' — use até 100 itens por lista.' : ''}</p>
    </div>
  </WizardLayout>;
}

function ReviewScreen({ items, photoUrl, onItemsChange, onRetake, onContinue, busy, saveStatus }: {
  items: EditableItem[]; photoUrl: string | null; onItemsChange: (items: EditableItem[]) => void;
  onRetake: () => void; onContinue: () => void; busy: boolean; saveStatus: string;
}) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const validItems = items.filter(item => item.name.trim());
  const incomplete = validItems.length !== items.length;
  const needsAttention = validItems.filter(item => (item.confidence ?? 1) < REVIEW_THRESHOLD).length;
  const continueToContact = () => {
    setAttempted(true);
    if (incomplete || !validItems.length) return;
    onContinue();
  };
  return <WizardLayout steps={WIZARD_STEPS} currentStep={1} title="Confira sua lista"
    description="Confira os nomes e as quantidades. Toque em Editar para corrigir."
    footer={<><Button onClick={continueToContact} disabled={busy || !validItems.length} className="task-wizard-primary">Lista conferida, continuar<ArrowRight size={18} /></Button>
      <p className="task-wizard-note" role="status">{saveStatus}</p></>}>
    <div className="quote-review-toolbar"><strong>{validItems.length} {validItems.length === 1 ? 'produto' : 'produtos'}</strong>
      {photoUrl && <Button variant="outline" size="sm" onClick={() => setPhotoOpen(true)} className="gap-2"><ImageIcon size={16} />Ver foto</Button>}
    </div>
    {needsAttention > 0 && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{needsAttention === 1 ? 'Confira com atenção o item marcado.' : `Confira com atenção os ${needsAttention} itens marcados.`}</p>}
    {attempted && incomplete && <p role="alert" className="mb-4 text-sm text-red-600">Preencha o nome do item vazio ou remova-o para continuar.</p>}
    <div className="space-y-3">{items.map(item => <ItemRow key={item.key} item={item}
      onUpdate={(key, patch) => onItemsChange(items.map(current => current.key === key ? { ...current, ...patch } : current))}
      onRemove={key => onItemsChange(items.filter(current => current.key !== key))} />)}</div>
    <Button variant="outline" className="mt-4 h-12 w-full gap-2 border-dashed" onClick={() => onItemsChange([...items, { key: makeKey('item'), name: '', quantity: 1, unit: null }])}><Plus size={18} />Adicionar outro item</Button>
    {photoOpen && photoUrl && <PhotoViewer url={photoUrl} onClose={() => setPhotoOpen(false)} onRetake={onRetake} />}
  </WizardLayout>;
}

function ContactScreen({ items, onBack, onSend, sending, whatsappInput, nameInput, onWhatsappChange, onNameChange }: {
  items: EditableItem[]; onBack: () => void; onSend: () => void; sending: boolean;
  whatsappInput: string; nameInput: string; onWhatsappChange: (value: string) => void; onNameChange: (value: string) => void;
}) {
  const [attempted, setAttempted] = useState(false);
  const digits = whatsappInput.replace(/\D/g, '');
  const invalid = digits.length < 10 || digits.length > 11;
  const validItems = items.filter(item => item.name.trim());
  const submit = () => { setAttempted(true); if (!invalid) onSend(); };
  return <WizardLayout steps={WIZARD_STEPS} currentStep={2} title="Para onde enviamos o orçamento?"
    description="A loja vai responder com os preços pelo WhatsApp." onBack={onBack} busy={sending}
    footer={<><Button type="submit" form="quote-contact" disabled={sending || !validItems.length} className="task-wizard-primary">
      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
      {sending ? 'Enviando…' : 'Enviar solicitação de orçamento'}
    </Button><p className="task-wizard-note">Os preços e a disponibilidade serão confirmados pela loja.</p></>}>
    <form id="quote-contact" noValidate onSubmit={event => { event.preventDefault(); submit(); }} className="task-wizard-card">
      <div className="quote-form-fields">
        <div><Label htmlFor="whatsapp">Seu WhatsApp com DDD</Label><Input id="whatsapp" type="tel" autoComplete="tel-national" required
          value={whatsappInput} placeholder="(11) 99999-0000" disabled={sending}
          aria-invalid={attempted && invalid} aria-describedby={attempted && invalid ? 'quote-phone-error' : undefined}
          onChange={event => onWhatsappChange(formatWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 11)))} className="mt-2 h-12 text-base" />
          {attempted && invalid && <p id="quote-phone-error" role="alert" className="mt-2 text-sm text-red-600">Informe seu WhatsApp com DDD, incluindo 10 ou 11 números.</p>}
        </div>
        <div><Label htmlFor="name">Seu nome <span className="font-normal text-slate-500">(opcional)</span></Label>
          <Input id="name" autoComplete="name" value={nameInput} disabled={sending} placeholder="Como podemos te chamar?"
            onChange={event => onNameChange(event.target.value)} className="mt-2 h-12 text-base" /></div>
      </div>
      <section className="quote-summary" aria-label="Resumo da solicitação"><div><strong className="text-sm">{validItems.length} {validItems.length === 1 ? 'produto na sua lista' : 'produtos na sua lista'}</strong>
        <Button type="button" variant="ghost" size="sm" disabled={sending} onClick={onBack} className="gap-1 text-blue-600"><Pencil size={14} />Editar lista</Button></div>
        <details><summary>Ver os produtos</summary><ul>{validItems.map(item => <li key={item.key}>{item.quantity} {displayUnit(item.unit, item.quantity)} · {item.name}</li>)}</ul></details>
      </section>
    </form>
  </WizardLayout>;
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

function ItemRow({ item, onUpdate, onRemove }: {
  item: EditableItem; onUpdate: (key: string, patch: Partial<EditableItem>) => void; onRemove: (key: string) => void;
}) {
  const [editingName, setEditingName] = useState(item.name === '');
  const [quantityText, setQuantityText] = useState(String(item.quantity));
  useEffect(() => { setQuantityText(String(item.quantity)); }, [item.quantity]);
  const needsAttention = (item.confidence ?? 1) < REVIEW_THRESHOLD;
  return <div className="quote-item-row" data-attention={needsAttention}>
    <div className="quote-item-name">
      {editingName ? <ProductAutocomplete value={item.name}
        onChange={name => onUpdate(item.key, { name, productId: null, confidence: 1 })}
        onSelectProduct={product => { onUpdate(item.key, { name: product.name, productId: product.id, confidence: 1 }); setEditingName(false); }}
        onBlur={() => { if (item.name.trim()) setEditingName(false); }} placeholder="Nome do material" />
        : <button type="button" onClick={() => setEditingName(true)}><span>{item.name}</span><span className="quote-item-edit"><Pencil size={13} />Editar</span></button>}
    </div>
    <div className="quote-item-controls"><div>
      <div className="quote-quantity" role="group" aria-label={'Quantidade de ' + (item.name || 'novo item')}>
        <button type="button" disabled={item.quantity <= 1} onClick={() => onUpdate(item.key, { quantity: Math.max(1, item.quantity - 1) })} aria-label="Diminuir" className="disabled:opacity-40"><Minus size={16} /></button>
        <input type="text" inputMode="decimal" aria-label={'Quantidade de ' + (item.name || 'novo item')} value={quantityText}
          onChange={event => {
            const value = event.target.value;
            setQuantityText(value);
            const quantity = Number(value.replace(',', '.'));
            if (Number.isFinite(quantity) && quantity > 0) onUpdate(item.key, { quantity });
          }} onBlur={() => setQuantityText(String(item.quantity))} />
        <button type="button" onClick={() => onUpdate(item.key, { quantity: item.quantity + 1 })} aria-label="Aumentar"><Plus size={16} /></button>
    </div><span className="quote-unit">{displayUnit(item.unit, item.quantity)}</span>
    </div><button type="button" onClick={() => onRemove(item.key)} className="quote-remove" aria-label="Remover item"><X size={15} />Remover</button></div>
    {needsAttention && <p className="quote-attention">Confira este item{item.sourceLine ? ': “' + item.sourceLine + '”' : '.'}</p>}
  </div>;
}

function DoneScreen({ onSeeQuotes }: { onSeeQuotes: () => void }) {
  return <WizardLayout steps={WIZARD_STEPS} currentStep={2} complete title="Pronto, lista enviada!"
    description="A loja recebeu sua solicitação e vai responder pelo WhatsApp.">
    <div className="task-wizard-card text-center">
      <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-emerald-600" aria-hidden="true" />
      <h2 className="mb-6 text-lg font-semibold">Agora é só aguardar o orçamento.</h2>
      <Button onClick={onSeeQuotes} className="task-wizard-primary">Acompanhar solicitação<ArrowRight size={18} /></Button>
      <Button asChild variant="ghost" className="mt-3 h-12 w-full"><Link to="/">Voltar para a loja</Link></Button>
    </div>
  </WizardLayout>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function displayUnit(unit: string | null | undefined, quantity: number) {
  const names: Record<string, [string, string]> = {
    un: ['unidade', 'unidades'], und: ['unidade', 'unidades'], sc: ['saco', 'sacos'],
    saco: ['saco', 'sacos'], sacos: ['saco', 'sacos'], cx: ['caixa', 'caixas'],
    caixa: ['caixa', 'caixas'], caixas: ['caixa', 'caixas'], lata: ['lata', 'latas'], latas: ['lata', 'latas'],
  };
  const value = unit?.trim() || 'un';
  return names[value.toLowerCase()]?.[quantity === 1 ? 0 : 1] ?? value;
}

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
