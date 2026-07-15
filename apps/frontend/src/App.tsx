import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { INTERNAL_USER_ROLES } from "@rebequi/shared/constants";
import { UserRole } from "@rebequi/shared/types";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { GuestRoute, MerchantPermissionRoute, ProtectedRoute, RoleHomeRedirect } from "@/components/auth/RouteGuards";
import Index from "./pages/Index";
import MerchantPanel from "./pages/MerchantPanel";
import MerchantDashboard, {
  MerchantDashboardAccess,
  MerchantDashboardIntegrations,
  MerchantDashboardLayout,
  MerchantDashboardOrderDetails,
  MerchantDashboardOrders,
  MerchantDashboardProducts,
  MerchantDashboardPromotions,
  MerchantDashboardQuotes,
} from "./pages/MerchantDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import CategoriesPage from "./pages/Categories";
import CategoryDetailsPage from "./pages/CategoryDetails";
import ProductDetails from "./pages/ProductDetails";
import PromotionDetailsPage from "./pages/PromotionDetails";
import PromotionsPage from "./pages/Promotions";
import NewsPage from "./pages/News";
import ContactPage from "./pages/Contact";
import SearchResultsPage from "./pages/Search";
import RequestQuotePage from "./pages/RequestQuote";
import Register from "./pages/Register";
import CartPage from "./pages/Cart";
import CheckoutPage from "./pages/Checkout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/solicitar-orçamento" element={<RequestQuotePage />} />
              <Route path="/categorias" element={<CategoriesPage />} />
              <Route path="/categorias/:slug" element={<CategoryDetailsPage />} />
              <Route path="/ofertas/:slug" element={<PromotionDetailsPage />} />
              <Route path="/promoções" element={<PromotionsPage />} />
              <Route path="/promoções/:slug" element={<PromotionDetailsPage />} />
              <Route path="/novidades" element={<NewsPage />} />
              <Route path="/contato" element={<ContactPage />} />
              <Route path="/buscar" element={<SearchResultsPage />} />
              <Route path="/carrinho" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/produto/:slug" element={<ProductDetails />} />
              <Route path="/produtos/:slug" element={<ProductDetails />} />

              <Route element={<GuestRoute />}>
                <Route path="/painel-lojista" element={<MerchantPanel />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registrar" element={<Register />} />
              </Route>

              <Route
                element={<ProtectedRoute allowedRoles={INTERNAL_USER_ROLES} redirectTo="/painel-lojista" />}
              >
                <Route path="/painel-lojista/painel" element={<MerchantDashboardLayout />}>
                  <Route index element={<RoleHomeRedirect />} />
                  <Route element={<MerchantPermissionRoute permission="dashboard:view" />}>
                    <Route path="visão-geral" element={<MerchantDashboard />} />
                  </Route>
                  <Route element={<MerchantPermissionRoute permission="catalog:manage" />}>
                    <Route path="produtos" element={<MerchantDashboardProducts />} />
                    <Route path="ofertas" element={<Navigate to="/painel-lojista/painel/produtos" replace />} />
                  </Route>
                  <Route element={<MerchantPermissionRoute permission="promotions:manage" />}>
                    <Route path="promoções" element={<MerchantDashboardPromotions />} />
                  </Route>
                  <Route element={<MerchantPermissionRoute permission="orders:manage" />}>
                    <Route path="pedidos" element={<MerchantDashboardOrders />} />
                    <Route path="pedidos/:orderId" element={<MerchantDashboardOrderDetails />} />
                  </Route>
                  <Route element={<MerchantPermissionRoute permission="quotes:manage" />}>
                    <Route path="orçamentos" element={<MerchantDashboardQuotes />} />
                  </Route>
                  <Route element={<MerchantPermissionRoute permission="integrations:manage" />}>
                    <Route path="integrações" element={<MerchantDashboardIntegrations />} />
                  </Route>
                  <Route element={<MerchantPermissionRoute permission="access:manage" />}>
                    <Route path="acesso" element={<MerchantDashboardAccess />} />
                  </Route>
                  <Route path="*" element={<RoleHomeRedirect />} />
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
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
