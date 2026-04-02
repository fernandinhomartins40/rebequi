import { type CSSProperties } from 'react';
import { Store } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SIDEBAR_THEME } from './config';
import { useMerchantDashboardData } from './data';
import { AdminSidebarNavigation, MerchantSidebarFooter, MerchantSidebarHeader } from './components';

export function MerchantDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const dashboardData = useMerchantDashboardData();

  const activeItem =
    dashboardData.navItems.find(
      (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
    ) ?? dashboardData.navItems[0];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={
        {
          backgroundImage:
            'radial-gradient(circle at top right, rgba(37,99,235,0.08), transparent 24%), radial-gradient(circle at 12% 88%, rgba(14,165,233,0.06), transparent 22%), linear-gradient(180deg, #f8fafc 0%, #ffffff 48%, #f8fafc 100%)',
        } as CSSProperties
      }
    >
      <SidebarProvider defaultOpen style={SIDEBAR_THEME as CSSProperties}>
        <Sidebar
          variant="inset"
          collapsible="icon"
          className="border-r border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[18px_0_54px_-46px_rgba(15,23,42,0.18)]"
        >
          <MerchantSidebarHeader />
          <AdminSidebarNavigation activePath={activeItem.href} items={dashboardData.navItems} />
          <MerchantSidebarFooter userEmail={dashboardData.userEmail} userRole={dashboardData.userRole} onLogout={handleLogout} />
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-hidden bg-transparent">
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur-lg">
            <div className="h-0.5 w-full bg-gradient-to-r from-primary via-secondary to-accent opacity-60" />
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="h-9 w-9 rounded-full border border-slate-200/80 bg-white shadow-sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {activeItem.eyebrow}
                  </p>
                  <h1 className="break-words text-base font-semibold text-foreground sm:text-lg">{activeItem.title}</h1>
                  <p className="hidden text-sm text-muted-foreground xl:block">{activeItem.intro}</p>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                <Button
                  asChild
                  variant="outline"
                  className="w-full gap-2 rounded-xl border-slate-200/80 bg-white/90 shadow-sm hover:bg-white sm:w-auto"
                >
                  <Link to="/">
                    <Store className="h-4 w-4" />
                    Ver loja
                  </Link>
                </Button>
              </div>
            </div>
          </header>

          <div className="merchant-dashboard-scroll flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-7">
              <Outlet context={dashboardData} />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
