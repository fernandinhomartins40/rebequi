import { DashboardToolbar } from "@/components/dashboard/DashboardElements";
import { type CSSProperties } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SIDEBAR_THEME } from "./config";
import { useMerchantDashboardData } from "./data";
import {
  AdminSidebarNavigation,
  MerchantSidebarFooter,
  MerchantSidebarHeader,
} from "./components";

export function MerchantDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const dashboardData = useMerchantDashboardData();

  const activeItem =
    dashboardData.navItems.find(
      (item) =>
        location.pathname === item.href ||
        location.pathname.startsWith(`${item.href}/`),
    ) ?? dashboardData.navItems[0];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
      <SidebarProvider defaultOpen style={SIDEBAR_THEME as CSSProperties}>
        <Sidebar variant="inset" collapsible="icon" className="border-r-0">
          <MerchantSidebarHeader />
          <AdminSidebarNavigation
            activePath={activeItem.href}
            items={dashboardData.navItems}
          />
          <MerchantSidebarFooter
            userEmail={dashboardData.userEmail}
            userRole={dashboardData.userRole}
            onLogout={handleLogout}
          />
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-hidden border border-border/60 bg-background md:peer-data-[variant=inset]:shadow-sm">
          {/* Top bar */}
          <DashboardToolbar
            title={activeItem.label}
            leading={<SidebarTrigger className="h-8 w-8 rounded-md" />}
          />

          {/* Page content */}
          <div className="merchant-dashboard-scroll flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
              <Outlet context={dashboardData} />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
