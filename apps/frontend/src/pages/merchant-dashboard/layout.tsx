import { type CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
    <div className="min-h-screen bg-[hsl(220,20%,97%)]">
      <SidebarProvider defaultOpen style={SIDEBAR_THEME as CSSProperties}>
        <Sidebar
          variant="inset"
          collapsible="icon"
          className="border-r-0 bg-[hsl(222,47%,11%)]"
        >
          <MerchantSidebarHeader />
          <AdminSidebarNavigation activePath={activeItem.href} items={dashboardData.navItems} />
          <MerchantSidebarFooter userEmail={dashboardData.userEmail} userRole={dashboardData.userRole} onLogout={handleLogout} />
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-hidden bg-[hsl(220,20%,97%)]">
          {/* Top bar */}
          <header className="sticky top-0 z-20 border-b border-border/40 bg-white/90 backdrop-blur-md">
            <div className="flex h-14 items-center gap-3 px-4 md:px-5">
              <SidebarTrigger className="h-8 w-8 rounded-lg border border-border/60 bg-white shadow-sm transition-colors hover:bg-muted" />
              <div className="h-5 w-px bg-border/60" />
              <div className="min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {activeItem.eyebrow}
                </span>
                <h1 className="text-[15px] font-bold text-foreground leading-tight">{activeItem.title}</h1>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="merchant-dashboard-scroll flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-5 md:py-8">
              <Outlet context={dashboardData} />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
