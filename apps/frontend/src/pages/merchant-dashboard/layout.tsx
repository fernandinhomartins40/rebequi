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
    dashboardData.navItems.find((item) => location.pathname === item.href) ?? dashboardData.navItems[0];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen bg-brand-gray"
      style={
        {
          backgroundImage:
            'radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 26%), radial-gradient(circle at 12% 88%, rgba(220,38,38,0.1), transparent 24%), linear-gradient(180deg, #fffdf5 0%, #ffffff 48%, #fff6cc 100%)',
        } as CSSProperties
      }
    >
      <SidebarProvider defaultOpen style={SIDEBAR_THEME as CSSProperties}>
        <Sidebar
          variant="inset"
          collapsible="icon"
          className="border-r border-[#eadfba] bg-[linear-gradient(180deg,rgba(255,252,237,0.98),rgba(255,255,255,0.98))] shadow-[18px_0_54px_-46px_rgba(37,99,235,0.26)]"
        >
          <MerchantSidebarHeader />
          <AdminSidebarNavigation activePath={activeItem.href} items={dashboardData.navItems} />
          <MerchantSidebarFooter userEmail={dashboardData.userEmail} onLogout={handleLogout} />
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="overflow-hidden bg-transparent">
          <header className="sticky top-0 z-20 border-b border-black/5 bg-white/78 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-9 w-9 rounded-full border border-black/10 bg-white shadow-sm" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {activeItem.eyebrow}
                  </p>
                  <h1 className="text-lg font-bold text-foreground">{activeItem.title}</h1>
                  <p className="hidden text-sm text-muted-foreground lg:block">{activeItem.intro}</p>
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 border-black/10 bg-white/80 shadow-sm hover:bg-white"
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
            <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-8">
              <Outlet context={dashboardData} />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
