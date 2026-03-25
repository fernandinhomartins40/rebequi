import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { UserRole } from "@rebequi/shared/types";
import { AuthProvider } from "@/contexts/AuthContext";
import { GuestRoute, ProtectedRoute } from "@/components/auth/RouteGuards";
import Index from "./pages/Index";
import MerchantPanel from "./pages/MerchantPanel";
import MerchantDashboard, {
  MerchantDashboardAccess,
  MerchantDashboardLayout,
  MerchantDashboardProducts,
  MerchantDashboardStability,
} from "./pages/MerchantDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />

            <Route element={<GuestRoute />}>
              <Route path="/painel-lojista" element={<MerchantPanel />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registrar" element={<Register />} />
            </Route>

            <Route
              element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} redirectTo="/painel-lojista" />}
            >
              <Route path="/painel-lojista/painel" element={<MerchantDashboardLayout />}>
                <Route index element={<Navigate to="produtos" replace />} />
                <Route path="visao-geral" element={<MerchantDashboard />} />
                <Route path="produtos" element={<MerchantDashboardProducts />} />
                <Route path="acesso" element={<MerchantDashboardAccess />} />
                <Route path="estabilidade" element={<MerchantDashboardStability />} />
                <Route path="*" element={<Navigate to="produtos" replace />} />
              </Route>
            </Route>

            <Route
              element={<ProtectedRoute allowedRoles={[UserRole.CUSTOMER]} redirectTo="/login" />}
            >
              <Route path="/painel-cliente" element={<CustomerDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
