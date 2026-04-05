import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Clock3,
  FileText,
  Home,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  ScanText,
  Shield,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatWhatsapp } from '@rebequi/shared/utils';
import { CustomerQuotesPanel } from '@/components/CustomerQuotesPanel';
import { QuoteDocumentCaptureCard, type QuoteDocumentSelection } from '@/components/QuoteDocumentCaptureCard';
import { QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { clearProvisionalCredentials, readProvisionalCredentials } from '@/lib/provisional-credentials';
import { formatQuoteTimestamp, getQuoteStatusLabel } from '@/lib/quote-ui';
import { createAuthenticatedQuoteDraft, fetchMyQuotes, submitMyQuote, updateMyQuoteDraft } from '@/services/api/quotes';
import type { QuoteItemInputDTO, QuoteRequest } from '@/types';

type EditableQuoteItem = QuoteItemInputDTO & { id?: string };
type DraftEditorState = { title: string; customerNote: string; items: EditableQuoteItem[] };
type ActiveTab = 'overview' | 'quotes' | 'profile' | 'security';
type DashboardNavItem = {
  id: ActiveTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  badge?: string;
};

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

function NavItem({
  icon: Icon,
  label,
  description,
  active,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-start gap-3 rounded-[1.35rem] border px-4 py-3 text-left text-sm transition-all ${
        active
          ? 'border-primary/20 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,252,237,0.96))] text-foreground shadow-[0_24px_55px_-40px_rgba(37,99,235,0.5)]'
          : 'border-transparent bg-white/70 text-foreground/70 hover:border-slate-200 hover:bg-white/90 hover:text-foreground'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${
          active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="flex items-center gap-2">
          <span className="block font-semibold leading-none">{label}</span>
          {badge ? <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary shadow-sm">{badge}</span> : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className={`mt-1 h-4 w-4 shrink-0 transition-all ${active ? 'translate-x-0 text-primary opacity-100' : 'translate-x-[-4px] text-muted-foreground opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
    </button>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accentClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/70 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-[1.45rem] font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClass} text-white shadow-lg`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
    </div>
  );
}

function FlowStepCard({
  step,
  title,
  description,
  icon: Icon,
  active,
  done,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.25rem] border p-3.5 transition-all ${
        active
          ? 'border-primary/20 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,251,235,0.94))] shadow-sm'
          : 'border-slate-200/70 bg-slate-50/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/5 ${
            active ? 'bg-primary text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'
          }`}
        >
          {done ? <BadgeCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Passo {step}</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━ Main ━━━━━━━━━━━━━━ */

function BottomNavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
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
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-2 py-2 text-[11px] font-semibold transition-all ${
        active
          ? 'bg-[linear-gradient(135deg,rgba(37,99,235,0.98),rgba(14,165,233,0.92))] text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.7)]'
          : 'text-muted-foreground hover:bg-slate-100/90 hover:text-foreground'
      }`}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badge ? (
          <span className={`absolute -right-2 -top-2 min-w-4 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
            {badge}
          </span>
        ) : null}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

const CustomerDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, changePassword } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => (searchParams.get('tab') as ActiveTab) || 'overview');
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

  const quotes = useMemo(() => {
    const list = quotesQuery.data ?? [];
    return [...list].sort((a, b) => {
      const aTime = new Date((a.updatedAt || a.createdAt || 0) as string | number | Date).getTime();
      const bTime = new Date((b.updatedAt || b.createdAt || 0) as string | number | Date).getTime();
      return bTime - aTime;
    });
  }, [quotesQuery.data]);

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
  const submittedQuotes = quotes.filter((q) => q.status === 'SUBMITTED');
  const inReviewQuotes = quotes.filter((q) => q.status === 'IN_REVIEW');
  const respondedQuotes = quotes.filter((q) => q.status === 'RESPONDED');
  const latestQuote = quotes[0] || null;
  const editableItemCount = editorState.items.filter((item) => item.name.trim()).length;
  const quoteFlowStage = !selectedQuote ? 1 : selectedQuote.status === 'DRAFT' ? 2 : 3;

  const handleLogout = async () => { await logout(); navigate('/'); };
  const handleSelectQuote = (id: string) => { setSelectedQuoteId(id); setSearchParams({ quoteId: id, tab: 'quotes' }); setActiveTab('quotes'); };
  const handleSaveDraft = async () => {
    if (!selectedQuote || selectedQuote.status !== 'DRAFT') {
      return null;
    }

    return updateDraftMutation.mutateAsync({
      id: selectedQuote.id,
      payload: editorState,
    });
  };
  const handleSaveAndSend = async () => {
    const quote = await handleSaveDraft();
    if (!quote) {
      return;
    }

    await submitQuoteMutation.mutateAsync(quote.id);
  };
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const params: Record<string, string> = { tab };
    if (selectedQuoteId && tab === 'quotes') params.quoteId = selectedQuoteId;
    setSearchParams(params);
  };

  const navItems: DashboardNavItem[] = [
    {
      id: 'overview',
      icon: Home,
      label: 'Início',
      description: 'Resumo e atalhos do painel.',
    },
    {
      id: 'quotes',
      icon: FileText,
      label: 'Orçamentos',
      description: 'Criar, revisar e enviar documentos.',
      badge: draftQuotes.length > 0 ? `${draftQuotes.length}` : undefined,
    },
    {
      id: 'profile',
      icon: User,
      label: 'Minha conta',
      description: 'Dados pessoais e contato de acesso.',
    },
    {
      id: 'security',
      icon: Shield,
      label: 'Segurança',
      description: 'Senha, credenciais e autenticação.',
      badge: user?.mustChangePassword ? '!' : undefined,
    },
  ];

  const activeSection = navItems.find((item) => item.id === activeTab) || navItems[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)] lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-72 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      {/* ━━ Sidebar ━━ */}
      <aside className="hidden border-r border-slate-200/70 bg-white/85 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="border-b border-slate-200/60 p-4">
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Painel do cliente</p>
                <h1 className="mt-1 truncate text-lg font-semibold text-foreground">{user?.name || user?.identifier || 'Cliente'}</h1>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Acompanhe orçamentos, conta e segurança em um único lugar.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-3">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              description={item.description}
              active={activeTab === item.id}
              badge={item.badge}
              onClick={() => handleTabChange(item.id)}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200/60 p-4">
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Acesso atual</p>
            <p className="mt-2 truncate text-sm font-semibold text-foreground">{user?.name || user?.identifier || 'Cliente'}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{user?.whatsapp ? formatWhatsapp(user.whatsapp) : user?.email || 'Sem contato cadastrado'}</p>
            <Button variant="ghost" className="mt-4 w-full justify-start gap-2 text-muted-foreground hover:bg-slate-50 hover:text-foreground" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* ━━ Main ━━ */}
      <main className="min-w-0 pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan-500 text-white shadow-lg shadow-primary/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Painel do cliente</p>
                <h2 className="truncate text-lg font-semibold text-foreground">{activeSection.label}</h2>
                <p className="hidden text-sm text-muted-foreground md:block">{activeSection.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 border-slate-200/80 bg-white/90 shadow-sm" onClick={() => navigate('/')}>
                <Home className="h-3.5 w-3.5" /> Loja
              </Button>
              <Button variant="ghost" size="sm" className="hidden gap-2 text-muted-foreground hover:bg-white/80 hover:text-foreground sm:inline-flex" onClick={() => void handleLogout()}>
                <LogOut className="h-3.5 w-3.5" /> Sair
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6 pb-6 md:pb-8">
          {/* Password alert */}
          {(user?.mustChangePassword || provisionalCredentials) && activeTab !== 'security' ? (
            <Alert className="mb-5 border-amber-200/60 bg-amber-50/60">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Senha provisória</AlertTitle>
              <AlertDescription className="text-amber-800">
                <button type="button" onClick={() => handleTabChange('security')} className="font-semibold text-primary underline underline-offset-2">Trocar senha →</button>
              </AlertDescription>
            </Alert>
          ) : null}

          {activeTab === 'overview' ? (
            <section className="mb-6 space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200/70 bg-white/94 p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Visão geral
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                      Olá, {user?.name || user?.identifier || 'cliente'}.
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Um resumo curto do que precisa de atenção agora. O restante do painel fica focado em uma tarefa por vez.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gap-2 shadow-sm" onClick={() => handleTabChange('quotes')}>
                      <Camera className="h-3.5 w-3.5" /> Capturar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 border-slate-200/80 bg-white" onClick={() => handleTabChange('quotes')}>
                      <FileText className="h-3.5 w-3.5" /> Orçamentos
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 border-slate-200/80 bg-white" onClick={() => navigate('/')}>
                      <Home className="h-3.5 w-3.5" /> Loja
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard icon={FileText} label="Orçamentos" value={`${quotes.length}`} hint="No histórico" accentClass="from-slate-500 to-slate-400" />
                  <MetricCard icon={Camera} label="Rascunhos" value={`${draftQuotes.length}`} hint="Prontos para revisar" accentClass="from-amber-500 to-orange-400" />
                  <MetricCard icon={Clock3} label="Em análise" value={`${submittedQuotes.length + inReviewQuotes.length}`} hint="Aguardando retorno" accentClass="from-sky-500 to-cyan-400" />
                  <MetricCard icon={BadgeCheck} label="Respondidos" value={`${respondedQuotes.length}`} hint="Finalizados" accentClass="from-emerald-500 to-teal-400" />
                </div>

                <aside className="space-y-3 rounded-[1.35rem] border border-slate-200/70 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Próximo passo</p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">Continue de onde parou</h3>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {latestQuote ? `${latestQuote.title || latestQuote.referenceCode} · ${latestQuote.itemCount} item(ns) · ${getQuoteStatusLabel(latestQuote.status)}` : 'Capture um documento para começar.'}
                  </p>

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange('quotes')}
                      className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
                    >
                      <span>Abrir orçamentos</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('security')}
                      className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
                    >
                      <span>Segurança da conta</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </aside>
              </div>
            </section>
          ) : null}

          {/* ━━ Orçamentos ━━ */}
          {activeTab === 'quotes' ? (
            <CustomerQuotesPanel
              quotes={quotes}
              quotesLoading={quotesQuery.isLoading}
              selectedQuote={selectedQuote}
              editorState={editorState}
              setEditorState={setEditorState}
              editorCardRef={editorCardRef}
              createDraftPending={createDraftMutation.isPending}
              saveDraftPending={updateDraftMutation.isPending}
              submitPending={submitQuoteMutation.isPending}
              onCaptureDocument={async (selection) => {
                await createDraftMutation.mutateAsync({
                  file: selection.file,
                  width: selection.width,
                  height: selection.height,
                });
              }}
              onSelectQuote={handleSelectQuote}
              onSaveDraft={handleSaveDraft}
              onSaveAndSend={handleSaveAndSend}
            />
          ) : null}

          {false && activeTab === 'quotes' ? (
            <div className="animate-fade-in-up space-y-5">
              <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Orçamentos em 3 passos</p>
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">Capturar, revisar e enviar.</h3>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Uma etapa por vez. Sem blocos grandes nem explicações repetidas.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{quotes.length} orçamento(s)</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <FlowStepCard
                    step={1}
                    title="Capturar"
                    description="Abra a câmera e capture o documento."
                    icon={Camera}
                    active={quoteFlowStage === 1}
                    done={quoteFlowStage > 1}
                  />
                  <FlowStepCard
                    step={2}
                    title="Revisar"
                    description="Confira o texto e ajuste o que faltar."
                    icon={FileText}
                    active={quoteFlowStage === 2}
                    done={quoteFlowStage > 2}
                  />
                  <FlowStepCard
                    step={3}
                    title="Enviar"
                    description="Salve e envie quando estiver pronto."
                    icon={ArrowRight}
                    active={quoteFlowStage === 3}
                    done={selectedQuote?.status === 'RESPONDED'}
                  />
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Passo 1</p>
                      <h3 className="mt-1 text-xl font-semibold text-foreground">Capturar documento</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Capture uma foto clara. O sistema corrige o enquadramento antes da leitura.</p>
                    </div>
                    <div className="hidden rounded-2xl bg-primary/10 p-3 text-primary sm:flex">
                      <ScanText className="h-5 w-5" />
                    </div>
                  </div>
                <QuoteDocumentCaptureCard
                  title="Scanner simples"
                  description="Capture com a câmera ao vivo."
                  helper="Etapa 1 de 3."
                  processing={createDraftMutation.isPending}
                  buttonLabel="Capturar documento"
                  onSelectFile={async (selection: QuoteDocumentSelection) => {
                    await createDraftMutation.mutateAsync({
                      file: selection.file,
                      width: selection.width,
                      height: selection.height,
                    });
                  }}
                />
              </section>

              <div className="grid gap-5 lg:grid-cols-[1.06fr_0.94fr]">
                <section ref={editorCardRef} className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Passo 2</p>
                      <h3 className="mt-1 text-xl font-semibold text-foreground">Revisar rascunho</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Ajuste só o necessário e siga adiante.</p>
                    </div>
                    <div className="hidden rounded-2xl bg-slate-100 p-3 text-slate-600 sm:flex">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>

                  {!selectedQuote ? (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                      <Camera className="mx-auto h-6 w-6 text-muted-foreground/40" />
                      <p className="mt-2 text-sm text-muted-foreground">Capture um documento no passo 1 para abrir o rascunho.</p>
                    </div>
                  ) : selectedQuote.status !== 'DRAFT' ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{selectedQuote.referenceCode}</p>
                          <h4 className="mt-2 truncate text-lg font-semibold text-foreground">{selectedQuote.title || 'Orçamento enviado'}</h4>
                        </div>
                        <QuoteStatusBadge status={selectedQuote.status} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Atualizado em</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{formatQuoteTimestamp(selectedQuote.submittedAt || selectedQuote.updatedAt)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Itens</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{selectedQuote.itemCount} item(ns)</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Itens reconhecidos</p>
                        <div className="mt-3 space-y-2">
                          {selectedQuote.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                              <span className="min-w-0 truncate text-sm font-medium text-foreground">{item.name}</span>
                              <span className="shrink-0 text-sm text-muted-foreground">
                                {item.quantity} {item.unit || 'un'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="qt">Título</Label>
                          <Input
                            id="qt"
                            value={editorState.title}
                            onChange={(e) => setEditorState((s) => ({ ...s, title: e.target.value }))}
                            placeholder="Ex.: Materiais para reforma"
                            className="mt-1.5 rounded-xl border-slate-200/80 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="qref">Referência</Label>
                          <Input id="qref" value={selectedQuote.referenceCode} disabled className="mt-1.5 rounded-xl border-slate-200/80 bg-slate-50" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="qn">Observações</Label>
                        <Textarea
                          id="qn"
                          rows={3}
                          value={editorState.customerNote}
                          onChange={(e) => setEditorState((s) => ({ ...s, customerNote: e.target.value }))}
                          placeholder="Detalhes extras..."
                          className="mt-1.5 rounded-xl border-slate-200/80 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Itens</p>
                        {editorState.items.map((item, idx) => (
                          <div key={`${item.id || 'n'}-${idx}`} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_88px_88px_auto]">
                              <Input
                                value={item.name}
                                onChange={(e) =>
                                  setEditorState((s) => ({
                                    ...s,
                                    items: s.items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                                  }))
                                }
                                placeholder="Item"
                                className="rounded-xl border-slate-200/80 bg-white"
                              />
                              <Input
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(e) =>
                                  setEditorState((s) => ({
                                    ...s,
                                    items: s.items.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value.replace(',', '.')) || 1 } : x)),
                                  }))
                                }
                                placeholder="Qtd"
                                className="rounded-xl border-slate-200/80 bg-white"
                              />
                              <Input
                                value={item.unit || ''}
                                onChange={(e) =>
                                  setEditorState((s) => ({
                                    ...s,
                                    items: s.items.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)),
                                  }))
                                }
                                placeholder="un"
                                className="rounded-xl border-slate-200/80 bg-white"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() =>
                                  setEditorState((s) => ({
                                    ...s,
                                    items: s.items.length === 1 ? [{ ...EMPTY_ITEM }] : s.items.filter((_, i) => i !== idx),
                                  }))
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-full border-slate-200/80 bg-white/90"
                        onClick={() => setEditorState((s) => ({ ...s, items: [...s.items, { ...EMPTY_ITEM }] }))}
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar item
                      </Button>
                    </div>
                  )}
                </section>

                <div className="space-y-5">
                  <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Passo 3</p>
                        <h3 className="mt-1 text-xl font-semibold text-foreground">Enviar para a loja</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Quando estiver pronto, salve e envie.</p>
                      </div>
                      <div className="hidden rounded-2xl bg-emerald-100 p-3 text-emerald-700 sm:flex">
                        <BadgeCheck className="h-5 w-5" />
                      </div>
                    </div>

                    {selectedQuote && selectedQuote.status === 'DRAFT' ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Orçamento atual</p>
                          <p className="mt-2 truncate text-sm font-semibold text-foreground">{selectedQuote.title || selectedQuote.referenceCode}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Revise os itens no passo 2. Depois, use o envio abaixo para mandar tudo para a loja.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={updateDraftMutation.isPending}
                            className="rounded-full"
                            onClick={() => void handleSaveDraft()}
                          >
                            {updateDraftMutation.isPending ? 'Salvando...' : 'Salvar rascunho'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 rounded-full border-slate-200/80 bg-white/90"
                            disabled={updateDraftMutation.isPending || submitQuoteMutation.isPending}
                            onClick={() => void handleSaveAndSend()}
                          >
                            {submitQuoteMutation.isPending ? 'Enviando...' : 'Salvar e enviar'}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-sm leading-6 text-muted-foreground">
                        Selecione um rascunho em revisão ou capture um novo documento no passo 1.
                      </div>
                    )}
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Recentes</p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">Últimos orçamentos</h3>
                      </div>
                      <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{quotes.length} total</div>
                    </div>

                    {quotesQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : quotes.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                        <Camera className="mx-auto h-6 w-6 text-muted-foreground/40" />
                        <p className="mt-2 text-sm text-muted-foreground">Nenhum orçamento ainda. Capture o primeiro documento no passo 1.</p>
                      </div>
                    ) : (
                      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {quotes.map((quote) => (
                          <button
                            key={quote.id}
                            type="button"
                            onClick={() => handleSelectQuote(quote.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-[1.25rem] border px-4 py-3 text-left transition-all ${
                              selectedQuote?.id === quote.id
                                ? 'border-primary/30 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,252,237,0.9))] shadow-[0_20px_50px_-40px_rgba(37,99,235,0.45)]'
                                : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-foreground">{quote.title || quote.referenceCode}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {quote.itemCount} item(ns) · {formatQuoteTimestamp(quote.createdAt)}
                              </span>
                            </span>
                            <QuoteStatusBadge status={quote.status} />
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          ) : null}

          {/* ━━ Minha conta ━━ */}
          {activeTab === 'profile' ? (
            <div className="animate-fade-in-up space-y-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Perfil</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Minha conta</h2>
                </div>
                <div className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:flex">{quotes.length} orçamento(s)</div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/94 shadow-sm">
                  <div className="divide-y divide-slate-100">
                    <Row label="Nome" value={user?.name || '-'} />
                    <Row label="Identificador" value={user?.identifier || '-'} />
                    <Row label="E-mail" value={user?.email || 'Não cadastrado'} />
                    <Row label="WhatsApp" value={user?.whatsapp ? formatWhatsapp(user.whatsapp) : 'Não cadastrado'} />
                    <Row label="Orçamentos" value={`${quotes.length} total · ${draftQuotes.length} rascunhos`} />
                    <Row label="Senha" value={user?.mustChangePassword ? 'Provisória' : 'Atualizada'} />
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/94 p-5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Resumo</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{user?.name || user?.identifier || 'Cliente'}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Mantenha os dados atualizados para acelerar o atendimento e evitar retrabalho.</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <SummarySurface
                      value={`${draftQuotes.length}`}
                      label="Rascunhos"
                      description="Prontos para revisão ou envio."
                    />
                    <SummarySurface
                      value={user?.whatsapp ? formatWhatsapp(user.whatsapp) : user?.email || 'Sem contato cadastrado'}
                      label="Contato"
                      description="Canal principal de atendimento."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ━━ Segurança ━━ */}
          {activeTab === 'security' ? (
            <div className="animate-fade-in-up space-y-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Acesso</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Segurança</h2>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${user?.mustChangePassword ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                  {user?.mustChangePassword ? 'Senha provisória' : 'Senha atualizada'}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4 rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                  {user?.mustChangePassword ? (
                    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
                      Você está usando uma senha provisória. Troque-a abaixo.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                      Sua senha está atualizada.
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
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-foreground">Trocar senha</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="cp">Senha atual</Label>
                      <Input id="cp" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))} className="mt-1.5 rounded-xl border-slate-200/80 bg-white" />
                    </div>
                    <div>
                      <Label htmlFor="np">Nova senha</Label>
                      <Input id="np" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))} className="mt-1.5 rounded-xl border-slate-200/80 bg-white" />
                    </div>
                  </div>
                  <Button className="mt-4 gap-1.5 rounded-full" size="sm" disabled={changePasswordMutation.isPending}
                    onClick={() => void changePasswordMutation.mutateAsync(passwordForm)}>
                    <Lock className="h-3.5 w-3.5" />
                    {changePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar senha'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:hidden"
          aria-label="Navegação principal"
        >
          <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-[1.75rem] border border-slate-200/70 bg-white/95 p-2">
            {navItems.map((item) => (
              <BottomNavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                badge={item.badge}
                onClick={() => handleTabChange(item.id)}
              />
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground sm:max-w-[60%] sm:text-right">{value}</span>
    </div>
  );
}

export default CustomerDashboard;
