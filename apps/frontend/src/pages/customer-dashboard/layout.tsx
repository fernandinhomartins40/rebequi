import { FileText, Home, Shield, Sparkles, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatWhatsapp } from '@rebequi/shared/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem, BottomNavItem } from './components';
import type { useCustomerDashboard } from './hooks';
import type { DashboardNavItem } from './types';

type DashboardProps = ReturnType<typeof useCustomerDashboard>;

interface LayoutProps extends DashboardProps {
  children: React.ReactNode;
}

export function CustomerDashboardLayout({
  user,
  provisionalCredentials,
  activeTab,
  handleTabChange,
  handleLogout,
  draftQuotes,
  children,
}: LayoutProps) {
  const navigate = useNavigate();

  const navItems: DashboardNavItem[] = [
    { id: 'overview', icon: Home, label: 'Início', description: 'Resumo e atalhos do painel.' },
    {
      id: 'quotes',
      icon: FileText,
      label: 'Orçamentos',
      description: 'Criar, revisar e enviar documentos.',
      badge: draftQuotes.length > 0 ? `${draftQuotes.length}` : undefined,
    },
    { id: 'profile', icon: User, label: 'Minha conta', description: 'Dados pessoais e contato de acesso.' },
    {
      id: 'security',
      icon: Shield,
      label: 'Segurança',
      description: 'Senha, credenciais e autenticação.',
      badge: user?.mustChangePassword ? '!' : undefined,
    },
  ];

  const activeSection = navItems.find((item) => item.id === activeTab) ?? navItems[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
      {/* ── Sidebar (desktop) ──────────────────────────────────────────── */}
      <aside className="hidden border-r border-slate-200/70 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        {/* Header */}
        <div className="border-b border-slate-200/60 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Painel do cliente</p>
              <p className="truncate text-sm font-semibold text-foreground">{user?.name || user?.identifier || 'Cliente'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={activeTab === item.id}
              onClick={() => handleTabChange(item.id)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200/60 p-4">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Acesso atual</p>
            <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
              {user?.name || user?.identifier || 'Cliente'}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {user?.whatsapp ? formatWhatsapp(user.whatsapp) : user?.email || 'Sem contato'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:bg-white hover:text-foreground"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="min-w-0 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary lg:hidden">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">
                  Painel do cliente
                </p>
                <h2 className="text-[15px] font-semibold text-foreground">{activeSection.label}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-200/80 bg-white text-xs shadow-sm"
                onClick={() => navigate('/')}
              >
                <Home className="h-3.5 w-3.5" /> Loja
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
                onClick={() => void handleLogout()}
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6 md:py-6">
          {/* Password alert */}
          {(user?.mustChangePassword || provisionalCredentials) && activeTab !== 'security' ? (
            <Alert className="mb-5 border-amber-200/60 bg-amber-50/60">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Senha provisória</AlertTitle>
              <AlertDescription className="text-amber-800">
                <button
                  type="button"
                  onClick={() => handleTabChange('security')}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Trocar senha →
                </button>
              </AlertDescription>
            </Alert>
          ) : null}

          {children}
        </div>

        {/* ── Bottom nav (mobile) ──────────────────────────────────────── */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm lg:hidden"
          aria-label="Navegação principal"
        >
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-xl border border-slate-200/70 bg-white p-1.5">
            {navItems.map((item) => (
              <BottomNavItem
                key={item.id}
                item={item}
                active={activeTab === item.id}
                onClick={() => handleTabChange(item.id)}
              />
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
