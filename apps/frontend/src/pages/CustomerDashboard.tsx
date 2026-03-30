import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Camera,
  FileText,
  Home,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  ScanText,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatWhatsapp } from '@rebequi/shared/utils';
import { QuoteDocumentCaptureCard, type QuoteDocumentSelection } from '@/components/QuoteDocumentCaptureCard';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { clearProvisionalCredentials, readProvisionalCredentials } from '@/lib/provisional-credentials';
import { formatQuoteTimestamp } from '@/lib/quote-ui';
import { createAuthenticatedQuoteDraft, fetchMyQuotes, submitMyQuote, updateMyQuoteDraft } from '@/services/api/quotes';
import type { QuoteItemInputDTO, QuoteRequest } from '@/types';

type EditableQuoteItem = QuoteItemInputDTO & { id?: string };
type DraftEditorState = { title: string; customerNote: string; items: EditableQuoteItem[] };
type ActiveTab = 'quotes' | 'profile' | 'security';

const EMPTY_ITEM: EditableQuoteItem = { name: '', quantity: 1, unit: '', notes: '' };

function buildEditorState(quote?: QuoteRequest | null): DraftEditorState {
  if (!quote) return { title: '', customerNote: '', items: [{ ...EMPTY_ITEM }] };
  return {
    title: quote.title || '',
    customerNote: quote.customerNote || '',
    items: quote.items.length > 0
      ? quote.items.map((item) => ({ id: item.id, productId: item.productId || undefined, name: item.name, quantity: item.quantity, unit: item.unit || '', notes: item.notes || '' }))
      : [{ ...EMPTY_ITEM }],
  };
}

/* ━━━━━━━━━━━━━━ Nav Item ━━━━━━━━━━━━━━ */

function NavItem({ icon: Icon, label, active, badge, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-slate-50 hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge ? <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}
    </button>
  );
}

/* ━━━━━━━━━━━━━━ Main ━━━━━━━━━━━━━━ */

const CustomerDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, changePassword } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => (searchParams.get('tab') as ActiveTab) || 'quotes');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [editorState, setEditorState] = useState<DraftEditorState>(buildEditorState());
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(searchParams.get('quoteId'));
  const [provisionalCredentials, setProvisionalCredentials] = useState(() => readProvisionalCredentials());
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  const quotesQuery = useQuery({ queryKey: ['customer', 'quotes'], queryFn: fetchMyQuotes });

  const createDraftMutation = useMutation({
    mutationFn: createAuthenticatedQuoteDraft,
    onSuccess: async (quote) => {
      queryClient.setQueryData<QuoteRequest[]>(['customer', 'quotes'], (current) => {
        const next = current ?? [];
        return [quote, ...next.filter((e) => e.id !== quote.id)];
      });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      setEditorState(buildEditorState(quote));
      setSearchParams({ quoteId: quote.id, tab: 'quotes' });
      setActiveTab('quotes');
      toast({ title: 'Rascunho criado', description: `${quote.itemCount} item(ns) reconhecido(s).` });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao criar rascunho', description: error instanceof Error ? error.message : 'Erro ao processar imagem.' });
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async (params: { id: string; payload: DraftEditorState }) =>
      updateMyQuoteDraft(params.id, {
        title: params.payload.title || null,
        customerNote: params.payload.customerNote || null,
        items: params.payload.items.filter((i) => i.name.trim()).map((i) => ({
          productId: i.productId || null, name: i.name.trim(), quantity: Number(i.quantity) || 1, unit: i.unit?.trim() || null, notes: i.notes?.trim() || null,
        })),
      }),
    onSuccess: async (quote) => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      toast({ title: 'Rascunho salvo' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao salvar', description: error instanceof Error ? error.message : 'Erro.' });
    },
  });

  const submitQuoteMutation = useMutation({
    mutationFn: submitMyQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      toast({ title: 'Orçamento enviado' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao enviar', description: error instanceof Error ? error.message : 'Erro.' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      clearProvisionalCredentials();
      setProvisionalCredentials(null);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toast({ title: 'Senha atualizada' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao atualizar senha', description: error instanceof Error ? error.message : 'Erro.' });
    },
  });

  const quotes = quotesQuery.data ?? [];
  const selectedQuote = useMemo(() => {
    if (selectedQuoteId) return quotes.find((q) => q.id === selectedQuoteId) || null;
    return quotes.find((q) => q.status === 'DRAFT') || quotes[0] || null;
  }, [quotes, selectedQuoteId]);

  useEffect(() => { setEditorState(buildEditorState(selectedQuote)); }, [selectedQuote]);
  useEffect(() => { const id = searchParams.get('quoteId'); if (id) setSelectedQuoteId(id); }, [searchParams]);
  useEffect(() => {
    if (!selectedQuote || !selectedQuoteId) return;
    const f = window.requestAnimationFrame(() => editorCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(f);
  }, [selectedQuote?.id, selectedQuoteId]);

  const draftQuotes = quotes.filter((q) => q.status === 'DRAFT');

  const handleLogout = async () => { await logout(); navigate('/'); };
  const handleSelectQuote = (id: string) => { setSelectedQuoteId(id); setSearchParams({ quoteId: id, tab: 'quotes' }); setActiveTab('quotes'); };
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const params: Record<string, string> = { tab };
    if (selectedQuoteId && tab === 'quotes') params.quoteId = selectedQuoteId;
    setSearchParams(params);
  };

  const navItems: Array<{ id: ActiveTab; icon: typeof FileText; label: string; badge?: string }> = [
    { id: 'quotes', icon: FileText, label: 'Orçamentos', badge: draftQuotes.length > 0 ? `${draftQuotes.length}` : undefined },
    { id: 'profile', icon: User, label: 'Minha conta' },
    { id: 'security', icon: Shield, label: 'Segurança', badge: user?.mustChangePassword ? '!' : undefined },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/80">
      {/* ━━ Sidebar ━━ */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Painel do cliente</p>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.id} badge={item.badge} onClick={() => handleTabChange(item.id)} />
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 space-y-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{user?.name || user?.identifier || 'Cliente'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.whatsapp ? formatWhatsapp(user.whatsapp) : user?.email || ''}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* ━━ Main ━━ */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            {/* Mobile nav */}
            <div className="flex gap-1 overflow-x-auto lg:hidden">
              {navItems.map((item) => (
                <button key={item.id} type="button" onClick={() => handleTabChange(item.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
            {/* Desktop title */}
            <h1 className="hidden text-base font-bold text-foreground lg:block">
              {navItems.find((i) => i.id === activeTab)?.label ?? 'Orçamentos'}
            </h1>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/')}>
              <Home className="h-3.5 w-3.5" /> Loja
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6">
          {/* Password alert */}
          {(user?.mustChangePassword || provisionalCredentials) && activeTab === 'quotes' ? (
            <Alert className="mb-5 border-amber-200/60 bg-amber-50/60">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Senha provisória</AlertTitle>
              <AlertDescription className="text-amber-800">
                <button type="button" onClick={() => handleTabChange('security')} className="font-semibold text-primary underline underline-offset-2">Trocar senha →</button>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* ━━ Orçamentos ━━ */}
          {activeTab === 'quotes' ? (
            <div className="animate-fade-in-up space-y-5">
              {/* Scanner */}
              <QuoteDocumentCaptureCard
                title="Escanear documento"
                description="Capture com a câmera e o OCR monta os itens automaticamente."
                helper=""
                processing={createDraftMutation.isPending}
                buttonLabel="Capturar"
                onSelectFile={async (selection: QuoteDocumentSelection) => {
                  await createDraftMutation.mutateAsync({ file: selection.file, width: selection.width, height: selection.height });
                }}
              />

              {/* List + Editor */}
              <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                {/* Quote list */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground">Meus orçamentos</h3>
                  {quotesQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : quotes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                      <Camera className="mx-auto h-6 w-6 text-muted-foreground/40" />
                      <p className="mt-2 text-sm text-muted-foreground">Nenhum orçamento. Escaneie um documento para começar.</p>
                    </div>
                  ) : (
                    <div className="max-h-[520px] space-y-1.5 overflow-y-auto">
                      {quotes.map((quote) => (
                        <button key={quote.id} type="button" onClick={() => handleSelectQuote(quote.id)}
                          className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
                            selectedQuote?.id === quote.id ? 'border-primary/30 bg-primary/5' : 'border-slate-200/60 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{quote.title || quote.referenceCode}</span>
                            <QuoteStatusBadge status={quote.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{quote.itemCount} itens · {formatQuoteTimestamp(quote.createdAt)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Editor */}
                <div ref={editorCardRef} className="rounded-xl border border-slate-200/60 bg-white p-5">
                  {!selectedQuote ? (
                    <div className="py-8 text-center">
                      <ScanText className="mx-auto h-6 w-6 text-muted-foreground/40" />
                      <p className="mt-2 text-sm text-muted-foreground">Selecione um orçamento ao lado.</p>
                    </div>
                  ) : selectedQuote.status !== 'DRAFT' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{selectedQuote.referenceCode}</p>
                          <h3 className="mt-1 text-lg font-bold text-foreground">{selectedQuote.title || 'Orçamento enviado'}</h3>
                        </div>
                        <QuoteStatusBadge status={selectedQuote.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enviado em {formatQuoteTimestamp(selectedQuote.submittedAt || selectedQuote.updatedAt)} · {selectedQuote.itemCount} itens
                      </p>
                      <div className="space-y-2">
                        {selectedQuote.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            <span className="text-sm text-muted-foreground">{item.quantity} {item.unit || 'un'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="qt">Título</Label>
                        <Input id="qt" value={editorState.title} onChange={(e) => setEditorState((s) => ({ ...s, title: e.target.value }))} placeholder="Ex.: Materiais para reforma" className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="qn">Observações</Label>
                        <Textarea id="qn" rows={2} value={editorState.customerNote} onChange={(e) => setEditorState((s) => ({ ...s, customerNote: e.target.value }))} placeholder="Detalhes extras..." className="mt-1.5" />
                      </div>

                      <div className="space-y-2">
                        {editorState.items.map((item, idx) => (
                          <div key={`${item.id || 'n'}-${idx}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="grid gap-2 sm:grid-cols-[1fr_80px_80px_auto]">
                              <Input value={item.name} onChange={(e) => setEditorState((s) => ({ ...s, items: s.items.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} placeholder="Item" />
                              <Input inputMode="decimal" value={item.quantity} onChange={(e) => setEditorState((s) => ({ ...s, items: s.items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value.replace(',', '.')) || 1 } : x) }))} placeholder="Qtd" />
                              <Input value={item.unit || ''} onChange={(e) => setEditorState((s) => ({ ...s, items: s.items.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x) }))} placeholder="un" />
                              <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                                onClick={() => setEditorState((s) => ({ ...s, items: s.items.length === 1 ? [{ ...EMPTY_ITEM }] : s.items.filter((_, i) => i !== idx) }))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setEditorState((s) => ({ ...s, items: [...s.items, { ...EMPTY_ITEM }] }))}>
                        <Plus className="h-3.5 w-3.5" /> Adicionar item
                      </Button>

                      <div className="flex gap-2 pt-1">
                        <Button size="sm" disabled={updateDraftMutation.isPending}
                          onClick={() => { if (selectedQuote) void updateDraftMutation.mutateAsync({ id: selectedQuote.id, payload: editorState }); }}>
                          {updateDraftMutation.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5"
                          disabled={updateDraftMutation.isPending || submitQuoteMutation.isPending}
                          onClick={() => {
                            if (!selectedQuote) return;
                            void updateDraftMutation.mutateAsync({ id: selectedQuote.id, payload: editorState }).then((q) => submitQuoteMutation.mutateAsync(q.id));
                          }}>
                          {submitQuoteMutation.isPending ? 'Enviando...' : 'Enviar'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ━━ Minha conta ━━ */}
          {activeTab === 'profile' ? (
            <div className="animate-fade-in-up space-y-4">
              <h2 className="text-lg font-bold text-foreground">Minha conta</h2>
              <div className="rounded-xl border border-slate-200/60 bg-white divide-y divide-slate-100">
                <Row label="Nome" value={user?.name || '-'} />
                <Row label="Identificador" value={user?.identifier || '-'} />
                <Row label="E-mail" value={user?.email || 'Não cadastrado'} />
                <Row label="WhatsApp" value={user?.whatsapp ? formatWhatsapp(user.whatsapp) : 'Não cadastrado'} />
                <Row label="Orçamentos" value={`${quotes.length} total · ${draftQuotes.length} rascunhos`} />
                <Row label="Senha" value={user?.mustChangePassword ? 'Provisória' : 'Atualizada'} />
              </div>
            </div>
          ) : null}

          {/* ━━ Segurança ━━ */}
          {activeTab === 'security' ? (
            <div className="animate-fade-in-up space-y-4">
              <h2 className="text-lg font-bold text-foreground">Segurança</h2>

              {user?.mustChangePassword ? (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
                  ⚠ Você está usando uma senha provisória. Troque-a abaixo.
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-700">
                  ✓ Sua senha está atualizada.
                </div>
              )}

              {provisionalCredentials ? (
                <Alert className="border-amber-200/60 bg-amber-50/50">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900">Credenciais provisórias</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    Identificador: <strong>{provisionalCredentials.identifier}</strong> · Senha: <strong>{provisionalCredentials.password}</strong>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="rounded-xl border border-slate-200/60 bg-white p-5">
                <h3 className="text-base font-bold text-foreground">Trocar senha</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cp">Senha atual</Label>
                    <Input id="cp" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="np">Nova senha</Label>
                    <Input id="np" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))} className="mt-1.5" />
                  </div>
                </div>
                <Button className="mt-4 gap-1.5" size="sm" disabled={changePasswordMutation.isPending}
                  onClick={() => void changePasswordMutation.mutateAsync(passwordForm)}>
                  <Lock className="h-3.5 w-3.5" />
                  {changePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar senha'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default CustomerDashboard;
