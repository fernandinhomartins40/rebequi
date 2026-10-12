import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { INTERNAL_USER_ROLES } from "@rebequi/shared/constants";
import { UserRole } from "@rebequi/shared/types";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import {
  GuestRoute,
  MerchantPermissionRoute,
  ProtectedRoute,
  RoleHomeRedirect,
} from "@/components/auth/RouteGuards";
import { DesignFrame } from "@/components/DesignFrame";
import { lazy, Suspense, type ComponentType } from "react";
const Index = lazy(() => import('./pages/Index'));
const MerchantPanel = lazy(() => import('./pages/MerchantPanel'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Login'));
const CategoriesPage = lazy(() => import('./pages/Categories'));
const CategoryDetailsPage = lazy(() => import('./pages/CategoryDetails'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const PromotionDetailsPage = lazy(() => import('./pages/PromotionDetails'));
const PromotionsPage = lazy(() => import('./pages/Promotions'));
const NewsPage = lazy(() => import('./pages/News'));
const ContactPage = lazy(() => import('./pages/Contact'));
const SearchResultsPage = lazy(() => import('./pages/Search'));
const RequestQuotePage = lazy(() => import('./pages/RequestQuote'));
const Register = lazy(() => import('./pages/Register'));
const CartPage = lazy(() => import('./pages/Cart'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
function merchant(name: keyof typeof import('./pages/MerchantDashboard')) {
  return lazy(async () => ({ default: (await import('./pages/MerchantDashboard'))[name] as ComponentType }));
}
const MerchantDashboard = merchant('default');
const MerchantCategoryEditorPage = merchant('MerchantCategoryEditorPage');
const MerchantCategoryListPage = merchant('MerchantCategoryListPage');
const MerchantDashboardAccess = merchant('MerchantDashboardAccess');
const MerchantDashboardIntegrations = merchant('MerchantDashboardIntegrations');
const MerchantDashboardLayout = merchant('MerchantDashboardLayout');
const MerchantDashboardOrderDetails = merchant('MerchantDashboardOrderDetails');
const MerchantDashboardOrders = merchant('MerchantDashboardOrders');
const MerchantDashboardSales = merchant('MerchantDashboardSales');
const MerchantSaleEditorPage = merchant('MerchantSaleEditorPage');
const MerchantDashboardCustomers = merchant('MerchantDashboardCustomers');
const MerchantCustomerDetailPage = merchant('MerchantCustomerDetailPage');
const MerchantDashboardChannels = merchant('MerchantDashboardChannels');
const MerchantChannelDetailPage = merchant('MerchantChannelDetailPage');
const MerchantDashboardProducts = merchant('MerchantDashboardProducts');
const MerchantDashboardPromotions = merchant('MerchantDashboardPromotions');
const MerchantDashboardQuotes = merchant('MerchantDashboardQuotes');
const MerchantProductEditorPage = merchant('MerchantProductEditorPage');
const MerchantProductOfferPage = merchant('MerchantProductOfferPage');
const MerchantPromotionEditorPage = merchant('MerchantPromotionEditorPage');
const MerchantUserEditorPage = merchant('MerchantUserEditorPage');
const PartnersPage = lazy(() => import('./pages/partners'));
const PartnerReferralPage = lazy(() => import('./pages/PartnerReferral'));
const MerchantPartnersPage = lazy(() => import('./pages/merchant-dashboard/partners'));
const CommercialWorkbenchPage = lazy(() => import('./pages/merchant-dashboard/commercial-workbench'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DesignFrame>
              <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center bg-slate-50">Carregando…</div>}><Routes>
                <Route path="/parceiros/*" element={<PartnersPage />} />
                <Route path="/indicacao/:code" element={<PartnerReferralPage />} />
                <Route path="/" element={<Index />} />
                <Route path="/pedido" element={<RequestQuotePage />} />
                {/* URL antiga: tinha "ç", que vira %C3%A7 ao compartilhar no WhatsApp. */}
                <Route
                  path="/solicitar-orçamento"
                  element={<Navigate to="/pedido" replace />}
                />
                <Route
                  path="/solicitar-orcamento"
                  element={<Navigate to="/pedido" replace />}
                />
                <Route path="/categorias" element={<CategoriesPage />} />
                <Route
                  path="/categorias/:slug"
                  element={<CategoryDetailsPage />}
                />
                <Route
                  path="/ofertas/:slug"
                  element={<PromotionDetailsPage />}
                />
                <Route path="/promoções" element={<PromotionsPage />} />
                <Route
                  path="/promoções/:slug"
                  element={<PromotionDetailsPage />}
                />
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
                  element={
                    <ProtectedRoute
                      allowedRoles={INTERNAL_USER_ROLES}
                      redirectTo="/painel-lojista"
                    />
                  }
                >
                  <Route
                    path="/painel-lojista/painel"
                    element={<MerchantDashboardLayout />}
                  >
                    <Route index element={<RoleHomeRedirect />} />
                    <Route element={<MerchantPermissionRoute permission="partners:manage" />}>
                      <Route path="parceiros" element={<Suspense fallback={<p>Carregando…</p>}><MerchantPartnersPage /></Suspense>} />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="dashboard:view" />
                      }
                    >
                      <Route
                        path="visão-geral"
                        element={<MerchantDashboard />}
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="catalog:manage" />
                      }
                    >
                      <Route
                        path="produtos"
                        element={<MerchantDashboardProducts />}
                      />
                      <Route
                        path="produtos/novo"
                        element={<MerchantProductEditorPage />}
                      />
                      <Route
                        path="produtos/categorias"
                        element={<MerchantCategoryListPage />}
                      />
                      <Route
                        path="produtos/categorias/nova"
                        element={<MerchantCategoryEditorPage />}
                      />
                      <Route
                        path="produtos/categorias/:categoryId/editar"
                        element={<MerchantCategoryEditorPage />}
                      />
                      <Route
                        path="produtos/:productId/editar"
                        element={<MerchantProductEditorPage />}
                      />
                      <Route
                        path="produtos/:productId/oferta"
                        element={<MerchantProductOfferPage />}
                      />
                      <Route
                        path="ofertas"
                        element={
                          <Navigate
                            to="/painel-lojista/painel/produtos"
                            replace
                          />
                        }
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="promotions:manage" />
                      }
                    >
                      <Route
                        path="promoções"
                        element={<MerchantDashboardPromotions />}
                      />
                      <Route
                        path="promoções/nova"
                        element={<MerchantPromotionEditorPage />}
                      />
                      <Route
                        path="promoções/:promotionId/editar"
                        element={<MerchantPromotionEditorPage />}
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="orders:manage" />
                      }
                    >
                      <Route
                        path="pedidos"
                        element={<MerchantDashboardOrders />}
                      />
                      <Route
                        path="pedidos/:orderId"
                        element={<MerchantDashboardOrderDetails />}
                      />
                    </Route>
                    <Route element={<MerchantPermissionRoute permission="commercial:work" />}>
                      <Route path="atendimentos" element={<CommercialWorkbenchPage />} />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="sales:manage" />
                      }
                    >
                      <Route
                        path="vendas"
                        element={<MerchantDashboardSales />}
                      />
                      <Route
                        path="vendas/nova"
                        element={<MerchantSaleEditorPage />}
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="customers:manage" />
                      }
                    >
                      <Route
                        path="clientes"
                        element={<MerchantDashboardCustomers />}
                      />
                      <Route
                        path="clientes/:customerId"
                        element={<MerchantCustomerDetailPage />}
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="quotes:manage" />
                      }
                    >
                      <Route
                        path="orçamentos"
                        element={<MerchantDashboardQuotes />}
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="channels:manage" />
                      }
                    >
                      <Route
                        path="canais"
                        element={<MerchantDashboardChannels />}
                      />
                      <Route
                        path="canais/:channelId"
                        element={<MerchantChannelDetailPage />}
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="integrations:manage" />
                      }
                    >
                      <Route
                        path="integrações"
                        element={<MerchantDashboardIntegrations />}
                      />
                    </Route>
                    <Route
                      element={
                        <MerchantPermissionRoute permission="access:manage" />
                      }
                    >
                      <Route
                        path="acesso"
                        element={<MerchantDashboardAccess />}
                      />
                      <Route
                        path="acesso/novo"
                        element={<MerchantUserEditorPage />}
                      />
                      <Route
                        path="acesso/:userId/editar"
                        element={<MerchantUserEditorPage />}
                      />
                    </Route>
                    <Route path="*" element={<RoleHomeRedirect />} />
                  </Route>
                </Route>

                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={[UserRole.CUSTOMER]}
                      redirectTo="/login"
                    />
                  }
                >
                  <Route
                    path="/painel-cliente"
                    element={<CustomerDashboard />}
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes></Suspense>
            </DesignFrame>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
