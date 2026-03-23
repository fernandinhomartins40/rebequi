import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  LogOut,
  Package,
  PackageSearch,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCategories } from '@/services/api/categories';
import { fetchNewProducts, fetchProducts, fetchPromotionalProducts } from '@/services/api/products';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const SECTION_IDS = ['visao-geral', 'catalogo', 'acesso', 'estabilidade'] as const;

type SectionId = (typeof SECTION_IDS)[number];

const SIDEBAR_THEME = {
  '--sidebar-background': '18 7% 10%',
  '--sidebar-foreground': '0 0% 98%',
  '--sidebar-primary': '51 100% 50%',
  '--sidebar-primary-foreground': '0 0% 8%',
  '--sidebar-accent': '0 84% 51%',
  '--sidebar-accent-foreground': '0 0% 100%',
  '--sidebar-border': '18 6% 18%',
  '--sidebar-ring': '217 91% 60%',
} as CSSProperties;

function isSectionId(value: string): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('visao-geral');

  const { data: productSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'products'],
    queryFn: () => fetchProducts({}),
  });

  const { data: promotionalProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'promotional-products'],
    queryFn: fetchPromotionalProducts,
  });

  const { data: newProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'new-products'],
    queryFn: fetchNewProducts,
  });

  const { data: categorySummary } = useQuery({
    queryKey: ['merchant-dashboard', 'categories'],
    queryFn: fetchCategories,
  });

  const products = productSummary?.products ?? [];
  const categories = categorySummary?.categories ?? [];

  const navItems = [
    {
      id: 'visao-geral' as SectionId,
      label: 'Visao geral',
      description: 'Resumo real do backoffice',
      icon: BarChart3,
      badge: 'Agora',
    },
    {
      id: 'catalogo' as SectionId,
      label: 'Catalogo',
      description: 'Dados persistidos no banco',
      icon: PackageSearch,
      badge: `${productSummary?.total ?? 0}`,
    },
    {
      id: 'acesso' as SectionId,
      label: 'Acesso',
      description: 'Sessao ADMIN autenticada',
      icon: ShieldCheck,
    },
    {
      id: 'estabilidade' as SectionId,
      label: 'Base estavel',
      description: 'O que existe e o que falta',
      icon: CheckCircle2,
    },
  ];

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (isSectionId(hash)) {
        setActiveSection(hash);
      }
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => !!element
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible && isSectionId(visible.target.id)) {
          setActiveSection(visible.target.id);
        }
      },
      { threshold: [0.2, 0.45, 0.7], rootMargin: '-18% 0px -52% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const jumpToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${sectionId}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen bg-brand-gray"
      style={{
        backgroundImage:
          'radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 28%), radial-gradient(circle at bottom left, rgba(220,38,38,0.14), transparent 30%), linear-gradient(180deg, #f8f9fa 0%, #ffffff 46%, #fff8d8 100%)',
      }}
    >
      <SidebarProvider defaultOpen style={SIDEBAR_THEME}>
        <Sidebar variant="inset" collapsible="icon" className="border-none">
          <SidebarHeader className="gap-4 px-4 py-4">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-3 py-3 transition-colors hover:bg-white/[0.08]"
            >
              <img
                src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
                alt="Rebequi Logo"
                className="h-10 w-auto shrink-0"
              />
              <div className="group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">Backoffice</p>
                <p className="text-sm font-semibold text-white">Painel administrativo</p>
              </div>
            </Link>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 group-data-[collapsible=icon]:hidden">
              <Badge className="mb-3 w-fit border-none bg-secondary text-secondary-foreground">Base real</Badge>
              <p className="text-sm font-semibold text-white">
                Sidebar fixa a esquerda e conteudo operacional a direita.
              </p>
              <p className="mt-2 text-xs leading-5 text-white/65">
                O painel so mostra o que ja esta sustentado por autenticacao e persistencia reais.
              </p>
            </div>
          </SidebarHeader>

          <SidebarSeparator className="mx-4" />

          <AdminSidebarNavigation
            activeSection={activeSection}
            items={navItems}
            onSelect={jumpToSection}
          />

          <SidebarSeparator className="mx-4" />

          <SidebarFooter className="gap-3 px-4 pb-4 pt-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 group-data-[collapsible=icon]:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Sessao ativa</p>
              <p className="mt-3 break-all text-sm font-semibold text-white">{user?.email ?? '-'}</p>
              <p className="mt-1 text-xs text-white/60">Role ADMIN validada pelo backend.</p>
            </div>

            <Button
              className="w-full justify-start gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sair do painel</span>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Voltar para a loja</span>
              </Link>
            </Button>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-white/72 backdrop-blur-sm">
          <header className="sticky top-0 z-20 border-b border-black/5 bg-white/78 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-9 w-9 rounded-full border border-black/10 bg-white shadow-sm" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Admin Rebequi
                  </p>
                  <h1 className="text-lg font-bold text-foreground">Painel com navegacao lateral</h1>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                className="hidden gap-2 border-black/10 bg-white/80 shadow-sm hover:bg-white sm:inline-flex"
              >
                <Link to="/">
                  <Store className="h-4 w-4" />
                  Ver vitrine publica
                </Link>
              </Button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 md:px-8 md:py-8">
            <section id="visao-geral" className="scroll-mt-28 grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
              <Card className="relative overflow-hidden border-none bg-[#161515] text-white shadow-[0_32px_90px_-44px_rgba(0,0,0,0.92)]">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at top right, rgba(37,99,235,0.35), transparent 30%), radial-gradient(circle at bottom left, rgba(220,38,38,0.36), transparent 34%)',
                  }}
                />
                <CardContent className="relative space-y-6 p-8">
                  <Badge className="w-fit border-none bg-secondary text-secondary-foreground">
                    Sessao administrativa autentica
                  </Badge>

                  <div className="space-y-3">
                    <h2 className="max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
                      O painel admin agora tem espinha dorsal de backoffice.
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-white/75">
                      Nada de layout padrao pasteurizado. A sidebar virou o eixo da operacao e o conteudo a direita
                      passou a organizar o estado real da aplicacao.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryTile label="Administrador" value={user?.email ?? '-'} detail="sessao atual" />
                    <SummaryTile
                      label="Produtos ativos"
                      value={`${productSummary?.total ?? 0}`}
                      detail="persistidos no banco"
                    />
                    <SummaryTile
                      label="Categorias"
                      value={`${categorySummary?.total ?? 0}`}
                      detail="carregadas da API"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => jumpToSection('catalogo')}>
                      Ver catalogo real
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                      onClick={() => jumpToSection('estabilidade')}
                    >
                      Ler base estavel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/88 shadow-[0_22px_55px_-38px_rgba(37,99,235,0.5)]">
                <CardHeader className="space-y-3">
                  <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
                    Pulso do sistema
                  </Badge>
                  <div>
                    <CardTitle className="text-2xl">O que esta vivo hoje</CardTitle>
                    <CardDescription>Leitura ancorada em dados que o backend realmente entrega.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PulseLine title="Autenticacao" value="Cookie seguro + role ADMIN" toneClass="bg-primary/10 text-primary" />
                  <PulseLine title="Catalogo" value={`${productSummary?.total ?? 0} produtos e ${categorySummary?.total ?? 0} categorias`} toneClass="bg-secondary/25 text-foreground" />
                  <PulseLine title="Promocoes e novidades" value={`${promotionalProducts?.length ?? 0} ofertas e ${newProducts?.length ?? 0} novidades`} toneClass="bg-accent/10 text-accent" />
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Store className="h-5 w-5 text-primary" />} label="Administrador" value={user?.email ?? '-'} delta="Sessao atual" />
              <StatCard icon={<Package className="h-5 w-5 text-primary" />} label="Produtos ativos" value={`${productSummary?.total ?? 0}`} delta="Persistidos no banco" />
              <StatCard icon={<ShieldCheck className="h-5 w-5 text-primary" />} label="Produtos em oferta" value={`${promotionalProducts?.length ?? 0}`} delta="Lidos via API real" />
              <StatCard icon={<BarChart3 className="h-5 w-5 text-primary" />} label="Novidades" value={`${newProducts?.length ?? 0}`} delta="Catalogo carregado do backend" />
            </section>

            <section id="catalogo" className="scroll-mt-28 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <Card className="border-white/70 bg-white/90 shadow-[0_24px_60px_-44px_rgba(37,99,235,0.45)]">
                <CardHeader className="space-y-3">
                  <Badge variant="outline" className="w-fit border-black/10 bg-white text-foreground">
                    Catalogo persistido
                  </Badge>
                  <div>
                    <CardTitle className="text-2xl">Snapshot do catalogo real</CardTitle>
                    <CardDescription>Leitura do que o backend consegue entregar hoje sem maquiagem de frontend.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SummarySurface value={`${categorySummary?.total ?? 0}`} label="Categorias" description="consultadas pela rota publica" />
                    <SummarySurface value={`${promotionalProducts?.length ?? 0}`} label="Ofertas" description="marcadas como promocionais" />
                    <SummarySurface value={`${newProducts?.length ?? 0}`} label="Novidades" description="sinalizadas no catalogo" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Produtos em destaque nesta base</p>
                    <div className="grid gap-3">
                      {products.slice(0, 4).map((product) => (
                        <div key={product.id} className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.category?.name ?? 'Sem categoria'} | estoque {product.stock}
                              </p>
                            </div>
                            <Badge className="border-none bg-secondary text-secondary-foreground">
                              R$ {product.price.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {products.length === 0 ? (
                        <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
                          Nenhum produto ativo retornado pela API.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-[#111111] text-white shadow-[0_30px_80px_-44px_rgba(0,0,0,0.92)]">
                <CardHeader className="space-y-3">
                  <Badge className="w-fit border-none bg-accent text-accent-foreground">Mapa de categorias</Badge>
                  <div>
                    <CardTitle className="text-2xl">Estrutura pronta para crescer</CardTitle>
                    <CardDescription className="text-white/65">
                      A sidebar ja cria o eixo para futuras areas administrativas sem virar um template generico.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categories.slice(0, 4).map((category, index) => (
                    <div key={category.id} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Bloco {index + 1}</p>
                          <p className="mt-1 font-semibold text-white">{category.name}</p>
                          <p className="mt-1 text-xs text-white/60">{category.description || category.slug}</p>
                        </div>
                        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-secondary">
                          {category.slug}
                        </div>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-white/70">
                      Nenhuma categoria retornada pela API.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section id="acesso" className="scroll-mt-28 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-white/70 bg-white/90 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.35)]">
                <CardHeader>
                  <CardTitle className="text-2xl">Sessao administrativa</CardTitle>
                  <CardDescription>Contrato real de acesso que esta sustentando este painel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Email autenticado" value={user?.email ?? '-'} />
                  <InfoRow label="Role esperada" value={user?.role ?? 'ADMIN'} />
                  <InfoRow label="Middleware" value="ProtectedRoute + role ADMIN" />
                  <InfoRow label="Persistencia de sessao" value="Cookie httpOnly validado em /api/auth/me" />
                  <InfoRow label="Saida" value="POST /api/auth/logout derruba a sessao" />
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/90 shadow-[0_24px_60px_-44px_rgba(37,99,235,0.38)]">
                <CardHeader>
                  <CardTitle className="text-2xl">Garantias reais de autenticacao</CardTitle>
                  <CardDescription>O painel so existe porque o fluxo de login eh validado de ponta a ponta.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <GuaranteeCard title="Login" description="O backend valida email e senha antes de liberar o painel." badgeClass="bg-primary/10 text-primary" />
                  <GuaranteeCard title="Role" description="A rota exige ADMIN; conta cliente nao atravessa esse gate." badgeClass="bg-accent/10 text-accent" />
                  <GuaranteeCard title="Sessao" description="A UI reidrata a autenticacao em /api/auth/me antes de decidir acesso." badgeClass="bg-secondary/25 text-foreground" />
                  <GuaranteeCard title="Deploy" description="O workflow de producao valida login, me e logout com usuarios seed." badgeClass="bg-slate-900 text-white" />
                </CardContent>
              </Card>
            </section>

            <section id="estabilidade" className="scroll-mt-28 grid gap-5 xl:grid-cols-2">
              <StateCard
                className="border-none bg-[#121212] text-white shadow-[0_30px_80px_-46px_rgba(0,0,0,0.9)]"
                badgeClassName="bg-secondary text-secondary-foreground"
                description="Estes blocos sustentam um ponto de partida estavel para seguir o roadmap."
                items={[
                  'Login administrativo com sessao persistida por cookie.',
                  'Protecao de rota por papel ADMIN no frontend.',
                  'Seed idempotente de admin e cliente de teste no deploy.',
                  'Catalogo publico carregado de dados persistidos.',
                  'Deploy que valida autenticacao real em producao.',
                ]}
                itemClassName="border-white/10 bg-white/[0.05] text-white/80"
                title="Ja implementado de forma real"
              />

              <StateCard
                className="border-white/70 bg-white/90 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.35)]"
                badgeClassName="bg-accent text-accent-foreground"
                description="A sidebar ja prepara a arquitetura visual para estes blocos, mas eles continuam pendentes."
                items={[
                  'CRUD administrativo completo de categorias e produtos.',
                  'Pedidos, clientes, pagamentos e metricas operacionais.',
                  'Filtros, busca administrativa e edicao em lote.',
                  'Configuracoes de loja, seguranca e rotacao de credenciais.',
                  'Auditoria e trilha de atividades do backoffice.',
                ]}
                itemClassName="border-black/5 bg-slate-50 text-muted-foreground"
                title="Ainda pendente"
              />
            </section>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

function AdminSidebarNavigation({
  activeSection,
  items,
  onSelect,
}: {
  activeSection: SectionId;
  items: { id: SectionId; label: string; description: string; icon: typeof BarChart3; badge?: string }[];
  onSelect: (sectionId: SectionId) => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarContent className="px-2 pb-4 pt-2">
      <SidebarGroup>
        <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
          Navegacao
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  tooltip={item.label}
                  isActive={activeSection === item.id}
                  onClick={() => {
                    onSelect(item.id);
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}
                  className={cn(
                    'h-auto min-h-12 rounded-2xl px-3 py-3 text-sidebar-foreground/78 hover:bg-white/8 hover:text-white',
                    'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[0_20px_40px_-24px_rgba(220,38,38,0.95)]'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-xs text-current/60">{item.description}</span>
                  </div>
                </SidebarMenuButton>
                {item.badge ? (
                  <SidebarMenuBadge className="rounded-full bg-white/10 px-2 text-[10px] text-white/78">
                    {item.badge}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

function SummaryTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-3 break-all text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/58">{detail}</p>
    </div>
  );
}

function PulseLine({ title, value, toneClass }: { title: string; value: string; toneClass: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-foreground">{title}</p>
        <div className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', toneClass)}>ativo</div>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <Card className="border-white/70 bg-white/88 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.4)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="rounded-full bg-primary/10 p-2">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="break-all text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{delta}</p>
      </CardContent>
    </Card>
  );
}

function SummarySurface({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function GuaranteeCard({
  title,
  description,
  badgeClass,
}: {
  title: string;
  description: string;
  badgeClass: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
      <div className={cn('inline-flex rounded-full px-3 py-1 text-[11px] font-semibold', badgeClass)}>{title}</div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function StateCard({
  badgeClassName,
  className,
  description,
  itemClassName,
  items,
  title,
}: {
  badgeClassName: string;
  className: string;
  description: string;
  itemClassName: string;
  items: string[];
  title: string;
}) {
  const descriptionClass = className.includes('text-white') ? 'text-white/65' : 'text-muted-foreground';

  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        <div className={cn('inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold', badgeClassName)}>
          Estado atual
        </div>
        <div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className={cn('mt-2 leading-6', descriptionClass)}>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className={cn('rounded-2xl border px-4 py-3 text-sm leading-6', itemClassName)}>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
