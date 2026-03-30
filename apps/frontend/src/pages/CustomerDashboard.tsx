import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Home,
  KeyRound,
  Lock,
  LogOut,
  Package,
  Plus,
  ScanText,
  Shield,
  Trash2,
  User,
  UserRound,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { QuoteDocumentCaptureCard, type QuoteDocumentSelection } from '@/components/QuoteDocumentCaptureCard';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type DraftEditorState = {
  title: string;
  customerNote: string;
  items: EditableQuoteItem[];
};

type ActiveTab = 'dashboard' | 'quotes' | 'profile' | 'security';

const EMPTY_ITEM: EditableQuoteItem = {
  name: '',
  quantity: 1,
  unit: '',
  notes: '',
};

function buildEditorState(quote?: QuoteRequest | null): DraftEditorState {
  if (!quote) {
    return {
      title: '',
      customerNote: '',
      items: [{ ...EMPTY_ITEM }],
    };
  }

  return {
    title: quote.title || '',
    customerNote: quote.customerNote || '',
    items:
      quote.items.length > 0
        ? quote.items.map((item) => ({
            id: item.id,
            productId: item.productId || undefined,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || '',
            notes: item.notes || '',
          }))
        : [{ ...EMPTY_ITEM }],
  };
}

/* ━━━━━━━━━━━━━━━━━━━  Sidebar Navigation Item ━━━━━━━━━━━━━━━━━━━ */

function SidebarNavItem({
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
      className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-primary shadow-[0_8px_24px_-12px_rgba(37,99,235,0.3)]'
          : 'text-foreground/70 hover:bg-slate-50 hover:text-foreground'
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
          active
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'bg-slate-100 text-muted-foreground group-hover:bg-slate-200'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          {badge ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {badge}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </button>
  );
}

/* ━━━━━━━━━━━━━━━━━━━  Customer Metric Card ━━━━━━━━━━━━━━━━━━━ */

function CustomerMetricCard({
  icon,
  label,
  value,
  detail,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const toneStyles = {
    blue: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-200/50',
    green: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/50',
    yellow: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/50',
    red: 'from-red-500/10 via-red-500/5 to-transparent border-red-200/50',
  };

  return (
    <div
      className={`animate-fade-in-up rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${toneStyles[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <div className="rounded-xl bg-white/80 p-2 shadow-sm">{icon}</div>
      </div>
      <p className="animate-count-up mt-3 break-words text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━  Timeline Item ━━━━━━━━━━━━━━━━━━━ */

function TimelineItem({
  status,
  title,
  timestamp,
  isLast,
}: {
  status: 'DRAFT' | string;
  title: string;
  timestamp: string;
  isLast: boolean;
}) {
  const isDraft = status === 'DRAFT';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isDraft
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {isDraft ? <Clock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        </div>
        {!isLast ? <div className="mt-1 w-px flex-1 bg-slate-200" /> : null}
      </div>
      <div className="min-w-0 pb-5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timestamp}</p>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━  Main Component ━━━━━━━━━━━━━━━━━━━ */

const CustomerDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, changePassword } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const tab = searchParams.get('tab');
    return (tab as ActiveTab) || 'dashboard';
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [editorState, setEditorState] = useState<DraftEditorState>(buildEditorState());
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(searchParams.get('quoteId'));
  const [provisionalCredentials, setProvisionalCredentials] = useState(() => readProvisionalCredentials());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  const quotesQuery = useQuery({
    queryKey: ['customer', 'quotes'],
    queryFn: fetchMyQuotes,
  });

  const createDraftMutation = useMutation({
    mutationFn: createAuthenticatedQuoteDraft,
    onSuccess: async (quote) => {
      queryClient.setQueryData<QuoteRequest[]>(['customer', 'quotes'], (current) => {
        const nextQuotes = current ?? [];
        const withoutCurrentQuote = nextQuotes.filter((entry) => entry.id !== quote.id);
        return [quote, ...withoutCurrentQuote];
      });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      setEditorState(buildEditorState(quote));
      setSearchParams({ quoteId: quote.id, tab: 'quotes' });
      setActiveTab('quotes');
      toast({
        title: 'Rascunho criado',
        description: `${quote.itemCount} item(ns) reconhecido(s). Revise o rascunho e envie o orçamento quando estiver tudo certo.`,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao criar rascunho',
        description: error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
      });
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async (params: { id: string; payload: DraftEditorState }) =>
      updateMyQuoteDraft(params.id, {
        title: params.payload.title || null,
        customerNote: params.payload.customerNote || null,
        items: params.payload.items
          .filter((item) => item.name.trim().length > 0)
          .map((item) => ({
            productId: item.productId || null,
            name: item.name.trim(),
            quantity: Number(item.quantity) || 1,
            unit: item.unit?.trim() || null,
            notes: item.notes?.trim() || null,
          })),
      }),
    onSuccess: async (quote) => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      toast({
        title: 'Rascunho salvo',
        description: 'As alteracoes do orçamento foram registradas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar rascunho',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o orçamento.',
      });
    },
  });

  const submitQuoteMutation = useMutation({
    mutationFn: submitMyQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      toast({
        title: 'Orçamento enviado',
        description: 'Seu orçamento agora está disponível para a equipe administrativa.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar orçamento',
        description: error instanceof Error ? error.message : 'Não foi possível enviar o orçamento.',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      clearProvisionalCredentials();
      setProvisionalCredentials(null);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
      });
      toast({
        title: 'Senha atualizada',
        description: 'Sua conta deixou de usar a senha provisória.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar senha',
        description: error instanceof Error ? error.message : 'Não foi possível alterar sua senha.',
      });
    },
  });

  const quotes = quotesQuery.data ?? [];
  const selectedQuote = useMemo(() => {
    if (selectedQuoteId) {
      return quotes.find((quote) => quote.id === selectedQuoteId) || null;
    }

    return quotes.find((quote) => quote.status === 'DRAFT') || quotes[0] || null;
  }, [quotes, selectedQuoteId]);

  useEffect(() => {
    setEditorState(buildEditorState(selectedQuote));
  }, [selectedQuote]);

  useEffect(() => {
    const quoteId = searchParams.get('quoteId');
    if (quoteId) {
      setSelectedQuoteId(quoteId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedQuote || !selectedQuoteId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      editorCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedQuote?.id, selectedQuoteId]);

  const draftQuotes = quotes.filter((quote) => quote.status === 'DRAFT');
  const submittedQuotes = quotes.filter((quote) => quote.status !== 'DRAFT');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setSearchParams({ quoteId, tab: 'quotes' });
    setActiveTab('quotes');
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const params: Record<string, string> = { tab };
    if (selectedQuoteId && tab === 'quotes') {
      params.quoteId = selectedQuoteId;
    }
    setSearchParams(params);
  };

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      icon: Home,
      label: 'Início',
      description: 'Visão geral da conta',
    },
    {
      id: 'quotes' as ActiveTab,
      icon: FileText,
      label: 'Orçamentos',
      description: 'Gerencie seus pedidos',
      badge: draftQuotes.length > 0 ? `${draftQuotes.length}` : undefined,
    },
    {
      id: 'profile' as ActiveTab,
      icon: User,
      label: 'Meu perfil',
      description: 'Dados da sua conta',
    },
    {
      id: 'security' as ActiveTab,
      icon: Shield,
      label: 'Segurança',
      description: 'Senha e acesso',
      badge: user?.mustChangePassword ? '!' : undefined,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#fafbfe_0%,#ffffff_40%,#f8f9fc_100%)]">
      {/* ━━━━━━ Sidebar ━━━━━━ */}
      <aside
        className={`hidden border-r border-slate-200/80 bg-white/95 backdrop-blur-sm transition-all duration-300 lg:flex lg:flex-col ${
          sidebarOpen ? 'lg:w-[280px]' : 'lg:w-20'
        }`}
      >
        {/* Sidebar Header */}
        <div className="border-b border-slate-100 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-md shadow-blue-500/20">
              <Package className="h-5 w-5" />
            </div>
            {sidebarOpen ? (
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Cliente</p>
                <p className="truncate text-sm font-semibold text-foreground">Meu painel</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              icon={item.icon}
              label={sidebarOpen ? item.label : ''}
              description={sidebarOpen ? item.description : ''}
              active={activeTab === item.id}
              badge={sidebarOpen ? item.badge : undefined}
              onClick={() => handleTabChange(item.id)}
            />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 px-3 py-4">
          {sidebarOpen ? (
            <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Conectado como</p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">
                {user?.name || user?.identifier || 'Cliente'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.whatsapp ? formatWhatsapp(user.whatsapp) : user?.email || ''}
              </p>
            </div>
          ) : null}
          <Button
            variant="outline"
            className="w-full gap-2 border-slate-200 text-muted-foreground hover:text-foreground"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen ? 'Sair da conta' : ''}
          </Button>
        </div>
      </aside>

      {/* ━━━━━━ Main Content ━━━━━━ */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar (mobile + desktop breadcrumb) */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:block"
              >
                <Package className="h-4 w-4 text-muted-foreground" />
              </button>
              {/* Mobile tab navigation */}
              <div className="flex gap-1 overflow-x-auto lg:hidden">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                      activeTab === item.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                    {item.badge ? (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {/* Desktop breadcrumb */}
              <div className="hidden lg:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Painel do cliente
                </p>
                <h1 className="text-lg font-bold text-foreground">
                  {navItems.find((item) => item.id === activeTab)?.label ?? 'Início'}
                </h1>
              </div>
            </div>
            <Button variant="outline" className="gap-2 text-sm" onClick={() => navigate('/')}>
              <Home className="h-3.5 w-3.5" /> Ver loja
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {/* Provisional credentials alert */}
          {(user?.mustChangePassword || provisionalCredentials) && activeTab === 'dashboard' ? (
            <Alert className="animate-fade-in-up mb-6 border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-50/50">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Acesso provisório ativo</AlertTitle>
              <AlertDescription className="text-amber-800">
                Identificador: <strong>{provisionalCredentials?.identifier || user?.identifier}</strong>. Senha atual:{' '}
                <strong>{provisionalCredentials?.password || 'definida por você'}</strong>.{' '}
                <button
                  type="button"
                  onClick={() => handleTabChange('security')}
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Trocar senha agora →
                </button>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* ━━━ Tab: Dashboard ━━━ */}
          {activeTab === 'dashboard' ? (
            <div className="animate-fade-in-up space-y-6">
              {/* Welcome Card */}
              <div className="relative overflow-hidden rounded-3xl border border-blue-100/60 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 px-6 py-8 shadow-[0_20px_60px_-30px_rgba(37,99,235,0.15)]">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/3" />
                <div className="relative">
                  <Badge className="mb-3 border-none bg-primary/10 text-primary">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Sessão ativa
                  </Badge>
                  <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                    Olá, {user?.name || 'cliente'} 👋
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Use o painel para escanear documentos, acompanhar orçamentos e gerenciar seu acesso.
                  </p>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <CustomerMetricCard
                  icon={<UserRound className="h-5 w-5 text-blue-600" />}
                  label="Identificação"
                  value={user?.name || user?.identifier || '-'}
                  detail={user?.whatsapp ? formatWhatsapp(user.whatsapp) : user?.email || 'Sessão autenticada'}
                  tone="blue"
                />
                <CustomerMetricCard
                  icon={<FileText className="h-5 w-5 text-emerald-600" />}
                  label="Orçamentos"
                  value={`${quotes.length}`}
                  detail={`${draftQuotes.length} rascunho(s) · ${submittedQuotes.length} enviado(s)`}
                  tone="green"
                />
                <CustomerMetricCard
                  icon={<KeyRound className="h-5 w-5 text-amber-600" />}
                  label="Segurança"
                  value={user?.mustChangePassword ? 'Provisória' : 'Atualizada'}
                  detail={user?.mustChangePassword ? 'Troca de senha recomendada' : 'Acesso principal em uso'}
                  tone={user?.mustChangePassword ? 'yellow' : 'green'}
                />
              </div>

              {/* Quick scan + recent activity */}
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                {/* Quick OCR Scan */}
                <Card className="animate-fade-in-up overflow-hidden border-slate-200/60 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.12)]">
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-primary to-blue-400" />
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-primary/10 p-2">
                        <ScanText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Escanear documento</CardTitle>
                        <CardDescription>Capture um documento para gerar um rascunho de orçamento</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <QuoteDocumentCaptureCard
                      title=""
                      description="Use a câmera para capturar o documento e o OCR montará os itens automaticamente."
                      helper="Após o processamento, o rascunho será criado para revisão."
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
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="animate-fade-in-up border-slate-200/60 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.12)]">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-emerald-500/10 p-2">
                        <History className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Atividade recente</CardTitle>
                        <CardDescription>Últimos movimentos nos orçamentos</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {quotesQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Carregando...
                      </div>
                    ) : quotes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-3 font-semibold text-foreground">Nenhuma atividade</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Escaneie o primeiro documento para começar.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[280px] overflow-y-auto pr-1">
                        {quotes.slice(0, 6).map((quote, index) => (
                          <button
                            key={quote.id}
                            type="button"
                            className="w-full text-left"
                            onClick={() => handleSelectQuote(quote.id)}
                          >
                            <TimelineItem
                              status={quote.status}
                              title={quote.title || `${quote.referenceCode} · ${quote.itemCount} itens`}
                              timestamp={formatQuoteTimestamp(quote.createdAt)}
                              isLast={index === Math.min(quotes.length, 6) - 1}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    {quotes.length > 0 ? (
                      <Button
                        variant="outline"
                        className="mt-3 w-full gap-2"
                        onClick={() => handleTabChange('quotes')}
                      >
                        Ver todos os orçamentos
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* ━━━ Tab: Quotes ━━━ */}
          {activeTab === 'quotes' ? (
            <div className="animate-fade-in-up space-y-6">
              {/* OCR Scanner */}
              <QuoteDocumentCaptureCard
                title="Escanear um novo documento"
                description="Use a câmera ao vivo para capturar o documento sem sair da página e deixar o OCR montar automaticamente os itens do orçamento."
                helper="Depois do processamento, o rascunho aparece logo abaixo para revisão e envio."
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

              {/* Quote list + editor */}
              <section className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
                {/* Quote List */}
                <Card className="animate-fade-in-up border-slate-200/60 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.12)]">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-blue-500/10 p-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Meus orçamentos</CardTitle>
                        <CardDescription>
                          Selecione um rascunho para revisar ou acompanhe os já enviados.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quotesQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Carregando orçamentos...
                      </div>
                    ) : quotes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                        <Camera className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-3 font-semibold text-foreground">Nenhum orçamento</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Escaneie o primeiro documento com a câmera para abrir um rascunho aqui.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                        {quotes.map((quote) => (
                          <button
                            key={quote.id}
                            type="button"
                            onClick={() => handleSelectQuote(quote.id)}
                            className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                              selectedQuote?.id === quote.id
                                ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-transparent shadow-[0_8px_24px_-12px_rgba(37,99,235,0.2)]'
                                : 'border-slate-200/60 bg-white hover:border-primary/20 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                  {quote.referenceCode}
                                </p>
                                <h2 className="mt-1 text-base font-semibold text-foreground">
                                  {quote.title || 'Orçamento sem título'}
                                </h2>
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                  {quote.itemCount} itens · {formatQuoteTimestamp(quote.createdAt)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <QuoteStatusBadge status={quote.status} />
                                {quote.lead ? <LeadStatusBadge status={quote.lead.status} /> : null}
                              </div>
                            </div>
                            {quote.customerNote ? (
                              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{quote.customerNote}</p>
                            ) : quote.ocrText ? (
                              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{quote.ocrText}</p>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quote Editor / Viewer */}
                <Card
                  ref={editorCardRef}
                  className="animate-fade-in-up border-slate-200/60 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.12)]"
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-amber-500/10 p-2">
                        <ScanText className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Revisão do rascunho</CardTitle>
                        <CardDescription>
                          Edite os itens reconhecidos antes de enviar para a equipe administrativa.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {!selectedQuote ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                        <ScanText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-3 text-sm text-muted-foreground">
                          Selecione um orçamento para visualizar os detalhes.
                        </p>
                      </div>
                    ) : selectedQuote.status !== 'DRAFT' ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                {selectedQuote.referenceCode}
                              </p>
                              <h2 className="mt-1 text-xl font-semibold text-foreground">
                                {selectedQuote.title || 'Orçamento enviado'}
                              </h2>
                            </div>
                            <QuoteStatusBadge status={selectedQuote.status} />
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Enviado em{' '}
                            {formatQuoteTimestamp(selectedQuote.submittedAt || selectedQuote.updatedAt)} com{' '}
                            {selectedQuote.itemCount} itens.
                          </p>
                        </div>

                        <div className="space-y-3">
                          {selectedQuote.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-slate-200/60 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-foreground">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} {item.unit || 'un'}
                                </p>
                              </div>
                              {item.notes ? (
                                <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="quote-title">Título do orçamento</Label>
                            <Input
                              id="quote-title"
                              value={editorState.title}
                              onChange={(event) =>
                                setEditorState((current) => ({ ...current, title: event.target.value }))
                              }
                              placeholder="Ex.: Materiais para reforma da cozinha"
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="quote-note">Observações</Label>
                            <Textarea
                              id="quote-note"
                              rows={3}
                              value={editorState.customerNote}
                              onChange={(event) =>
                                setEditorState((current) => ({
                                  ...current,
                                  customerNote: event.target.value,
                                }))
                              }
                              placeholder="Acrescente detalhes importantes sobre o documento ou a entrega."
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          {editorState.items.map((item, index) => (
                            <div
                              key={`${item.id || 'new'}-${index}`}
                              className="rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-4 transition-colors hover:bg-slate-50"
                            >
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_120px_120px_auto]">
                                <div className="space-y-2">
                                  <Label>Item</Label>
                                  <Input
                                    value={item.name}
                                    onChange={(event) =>
                                      setEditorState((current) => ({
                                        ...current,
                                        items: current.items.map((entry, entryIndex) =>
                                          entryIndex === index
                                            ? { ...entry, name: event.target.value }
                                            : entry
                                        ),
                                      }))
                                    }
                                    placeholder="Nome do produto ou insumo"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Qtd.</Label>
                                  <Input
                                    inputMode="decimal"
                                    value={item.quantity}
                                    onChange={(event) =>
                                      setEditorState((current) => ({
                                        ...current,
                                        items: current.items.map((entry, entryIndex) =>
                                          entryIndex === index
                                            ? {
                                                ...entry,
                                                quantity:
                                                  Number(event.target.value.replace(',', '.')) || 1,
                                              }
                                            : entry
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Unidade</Label>
                                  <Input
                                    value={item.unit || ''}
                                    onChange={(event) =>
                                      setEditorState((current) => ({
                                        ...current,
                                        items: current.items.map((entry, entryIndex) =>
                                          entryIndex === index
                                            ? { ...entry, unit: event.target.value }
                                            : entry
                                        ),
                                      }))
                                    }
                                    placeholder="un"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-1.5 border-red-200/60 text-red-500 hover:bg-red-50 hover:text-red-600 lg:w-auto"
                                    onClick={() =>
                                      setEditorState((current) => ({
                                        ...current,
                                        items:
                                          current.items.length === 1
                                            ? [{ ...EMPTY_ITEM }]
                                            : current.items.filter(
                                                (_, entryIndex) => entryIndex !== index
                                              ),
                                      }))
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remover
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                <Label>Observação do item</Label>
                                <Input
                                  value={item.notes || ''}
                                  onChange={(event) =>
                                    setEditorState((current) => ({
                                      ...current,
                                      items: current.items.map((entry, entryIndex) =>
                                        entryIndex === index
                                          ? { ...entry, notes: event.target.value }
                                          : entry
                                      ),
                                    }))
                                  }
                                  placeholder="Detalhes extras do item reconhecido"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() =>
                            setEditorState((current) => ({
                              ...current,
                              items: [...current.items, { ...EMPTY_ITEM }],
                            }))
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar item
                        </Button>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button
                            className="gap-2"
                            onClick={() => {
                              if (!selectedQuote) {
                                return;
                              }

                              void updateDraftMutation.mutateAsync({
                                id: selectedQuote.id,
                                payload: editorState,
                              });
                            }}
                            disabled={updateDraftMutation.isPending}
                          >
                            {updateDraftMutation.isPending ? 'Salvando...' : 'Salvar rascunho'}
                          </Button>

                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              if (!selectedQuote) {
                                return;
                              }

                              void updateDraftMutation
                                .mutateAsync({
                                  id: selectedQuote.id,
                                  payload: editorState,
                                })
                                .then((quote) => submitQuoteMutation.mutateAsync(quote.id));
                            }}
                            disabled={updateDraftMutation.isPending || submitQuoteMutation.isPending}
                          >
                            {submitQuoteMutation.isPending ? 'Enviando...' : 'Salvar e enviar'}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          ) : null}

          {/* ━━━ Tab: Profile ━━━ */}
          {activeTab === 'profile' ? (
            <div className="animate-fade-in-up space-y-6">
              <div className="relative overflow-hidden rounded-3xl border border-blue-100/60 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 px-6 py-8 shadow-[0_20px_60px_-30px_rgba(37,99,235,0.15)]">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-blue-500/25">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{user?.name || 'Cliente'}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {user?.email || user?.identifier || 'Sem e-mail cadastrado'}
                    </p>
                    {user?.whatsapp ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{formatWhatsapp(user.whatsapp)}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200/60 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.12)]">
                  <CardHeader>
                    <CardTitle className="text-lg">Informações da conta</CardTitle>
                    <CardDescription>Dados cadastrados no sistema</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ProfileField label="Nome" value={user?.name || '-'} />
                    <ProfileField label="Identificador" value={user?.identifier || '-'} />
                    <ProfileField label="E-mail" value={user?.email || 'Não cadastrado'} />
                    <ProfileField label="WhatsApp" value={user?.whatsapp ? formatWhatsapp(user.whatsapp) : 'Não cadastrado'} />
                    <ProfileField label="Tipo de conta" value="Cliente" />
                  </CardContent>
                </Card>

                <Card className="border-slate-200/60 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.12)]">
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo de orçamentos</CardTitle>
                    <CardDescription>Histórico e estatísticas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ProfileField label="Total de orçamentos" value={`${quotes.length}`} />
                    <ProfileField label="Rascunhos" value={`${draftQuotes.length}`} />
                    <ProfileField label="Enviados" value={`${submittedQuotes.length}`} />
                    <ProfileField
                      label="Status da senha"
                      value={user?.mustChangePassword ? 'Provisória (troca pendente)' : 'Senha regular ativa'}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* ━━━ Tab: Security ━━━ */}
          {activeTab === 'security' ? (
            <div className="animate-fade-in-up space-y-6">
              <div className="relative overflow-hidden rounded-3xl border border-amber-100/60 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 px-6 py-8 shadow-[0_20px_60px_-30px_rgba(245,158,11,0.15)]">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/5" />
                <div className="relative">
                  <Badge
                    className={`mb-3 border-none ${
                      user?.mustChangePassword
                        ? 'bg-amber-500/10 text-amber-700'
                        : 'bg-emerald-500/10 text-emerald-700'
                    }`}
                  >
                    <Lock className="mr-1 h-3 w-3" />
                    {user?.mustChangePassword ? 'Ação necessária' : 'Tudo seguro'}
                  </Badge>
                  <h2 className="text-2xl font-bold text-foreground">Segurança da conta</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    {user?.mustChangePassword
                      ? 'Você está usando uma senha provisória. Recomendamos trocar por uma senha pessoal para mais segurança.'
                      : 'Sua senha está atualizada. Você pode alterá-la a qualquer momento abaixo.'}
                  </p>
                </div>
              </div>

              {provisionalCredentials ? (
                <Alert className="border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-50/50">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900">Credenciais provisórias salvas</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    Identificador: <strong>{provisionalCredentials.identifier}</strong>. Senha:{' '}
                    <strong>{provisionalCredentials.password}</strong>.
                  </AlertDescription>
                </Alert>
              ) : null}

              <Card className="border-slate-200/60 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.12)]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-amber-500/10 p-2">
                      <KeyRound className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Atualizar senha</CardTitle>
                      <CardDescription>
                        Troque a senha provisória por uma senha pessoal para continuar acessando com mais segurança.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Senha atual</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            currentPassword: event.target.value,
                          }))
                        }
                        placeholder="Digite sua senha atual"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                        placeholder="Digite a nova senha"
                      />
                    </div>
                  </div>
                  <Button
                    className="mt-4 gap-2"
                    disabled={changePasswordMutation.isPending}
                    onClick={() => {
                      void changePasswordMutation.mutateAsync(passwordForm);
                    }}
                  >
                    <Lock className="h-4 w-4" />
                    {changePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar senha'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

/* ━━━━━━━━━━━━━━━━━━━  Helper Components ━━━━━━━━━━━━━━━━━━━ */

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default CustomerDashboard;
