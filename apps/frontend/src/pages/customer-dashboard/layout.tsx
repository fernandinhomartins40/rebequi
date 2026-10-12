import {
  DashboardBrand,
  DashboardToolbar,
} from "@/components/dashboard/DashboardElements";
import type { CSSProperties } from "react";
import {
  FileText,
  Home,
  KeyRound,
  LogOut,
  ShoppingCart,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatWhatsapp } from "@rebequi/shared/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BottomNavItem, NavItem } from "./components";
import type { useCustomerDashboard } from "./hooks";
import type { ActiveTab, DashboardNavItem } from "./types";

// ── Tema da sidebar — dark navy idêntico ao painel admin ─────────────────────
const SIDEBAR_VARS: CSSProperties = {
  "--sidebar-bg": "#f5f8fc",
  "--sidebar-fg": "#06142c",
  "--sidebar-border": "#e2e9f2",
  "--sidebar-muted": "#51617b",
  "--sidebar-hover": "#edf4ff",
  "--sidebar-active": "#edf4ff",
  "--sidebar-accent": "#ffeb18",
  "--sidebar-accent-fg": "hsl(0, 0%, 9%)",
} as CSSProperties;

type DashboardCtx = ReturnType<typeof useCustomerDashboard>;
interface LayoutProps extends DashboardCtx {
  children: React.ReactNode;
}

function buildNavItems(
  draftCount: number,
  mustChangePassword?: boolean,
): DashboardNavItem[] {
  return [
    {
      id: "overview",
      icon: Home,
      label: "Início",
      description: "Resumo e atalhos do painel.",
    },
    {
      id: "quotes",
      icon: FileText,
      label: "Orçamentos",
      description: "Criar, revisar e enviar documentos.",
      badge: draftCount > 0 ? String(draftCount) : undefined,
    },
    {
      id: "orders",
      icon: ShoppingCart,
      label: "Meus pedidos",
      description: "Acompanhar pedidos e retomar a conversa.",
    },
    {
      id: "profile",
      icon: User,
      label: "Minha conta",
      description: "Dados e segurança.",
      badge: mustChangePassword ? "!" : undefined,
    },
  ];
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
  const navItems = buildNavItems(draftQuotes.length, user?.mustChangePassword);
  const navTab = activeTab === "security" ? "profile" : activeTab;
  const activeSection = navItems.find((n) => n.id === navTab) ?? navItems[0];

  return (
    <div
      className="customer-sidebar-root relative min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]"
      style={
        { ...SIDEBAR_VARS, background: "hsl(220, 14%, 96%)" } as CSSProperties
      }
    >
      {/* ── Sidebar desktop ──────────────────────────────────────────── */}
      <aside className="customer-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        {/* Logo */}
        <div className="customer-sidebar-section px-4 pb-3 pt-4">
          <DashboardBrand label="Painel do cliente" />
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={navTab === item.id}
              onClick={() => handleTabChange(item.id)}
            />
          ))}
        </nav>

        {/* Rodapé */}
        <div className="customer-sidebar-section px-3 pb-4 pt-2">
          <div className="mb-1.5 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="customer-sidebar-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">
              {(user?.name || user?.identifier || "C")
                .slice(0, 1)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="customer-sidebar-fg truncate text-[12px] font-semibold">
                {user?.name || user?.identifier || "Cliente"}
              </p>
              <p className="customer-sidebar-muted truncate text-[11px]">
                {user?.whatsapp
                  ? formatWhatsapp(user.whatsapp)
                  : user?.email || "Sem contato"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className="customer-sidebar-action-btn flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] transition-colors"
              onClick={() => navigate("/")}
            >
              <Home className="h-3.5 w-3.5 shrink-0" />
              Ver loja
            </button>
            <button
              type="button"
              className="customer-sidebar-action-btn flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] transition-colors"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Header */}
        <DashboardToolbar
          title={activeSection.label}
          actions={
            <>
              <Button size="sm" variant="outline" onClick={() => navigate('/parceiros/')}>
                Parceiros
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/")}>
                <Home />
                Loja
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleLogout()}
              >
                <LogOut />
                Sair
              </Button>
            </>
          }
        />

        {/* Conteúdo */}
        <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-6 md:py-7">
          {(user?.mustChangePassword || provisionalCredentials) &&
          activeTab !== "security" ? (
            <Alert className="mb-6 border-amber-200/60 bg-amber-50">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">
                Senha provisória ativa
              </AlertTitle>
              <AlertDescription className="text-amber-800">
                <button
                  type="button"
                  onClick={() => handleTabChange("security")}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Trocar senha agora →
                </button>
              </AlertDescription>
            </Alert>
          ) : null}
          {children}
        </div>

        {/* Bottom nav mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/60 bg-white/98 px-4 pt-2 backdrop-blur-sm lg:hidden"
          style={{
            paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))",
          }}
          aria-label="Navegação"
        >
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {navItems.map((item) => (
              <BottomNavItem
                key={item.id}
                item={item}
                active={navTab === item.id}
                onClick={() => handleTabChange(item.id)}
              />
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
