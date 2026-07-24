import { useQuery } from '@tanstack/react-query';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCategories } from '@/services/api/categories';
import { fetchAdminOrders } from '@/services/api/orders';
import { fetchProducts } from '@/services/api/products';
import { fetchSales } from '@/services/api/sales';
import { fetchCustomers } from '@/services/api/customers';
import { fetchChannels } from '@/services/api/channels';
import { fetchAdminPromotions } from '@/services/api/promotions';
import { fetchAdminQuotes, fetchCapturedLeads } from '@/services/api/quotes';
import { getMerchantNavItemsForRole, type MerchantNavItem } from './config';

export type ProductSummary = Awaited<ReturnType<typeof fetchProducts>>;
export type CategorySummary = Awaited<ReturnType<typeof fetchCategories>>;
export type PromotionSummary = Awaited<ReturnType<typeof fetchAdminPromotions>>;
export type OrderSummary = Awaited<ReturnType<typeof fetchAdminOrders>>;
export type SaleSummary = Awaited<ReturnType<typeof fetchSales>>;
export type QuoteSummary = Awaited<ReturnType<typeof fetchAdminQuotes>>;
export type LeadSummary = Awaited<ReturnType<typeof fetchCapturedLeads>>;
export type ProductItem = ProductSummary['products'][number];
export type CategoryItem = CategorySummary['categories'][number];
export type PromotionItem = PromotionSummary['promotions'][number];
export type OrderItem = OrderSummary['orders'][number];
export type QuoteItem = QuoteSummary['quotes'][number];
export type LeadItem = LeadSummary['leads'][number];

export type MerchantDashboardOutletContext = {
  userEmail: string;
  userRole: string;
  productSummary?: ProductSummary;
  categorySummary?: CategorySummary;
  promotionSummary?: PromotionSummary;
  orderSummary?: OrderSummary;
  saleSummary?: SaleSummary;
  quoteSummary?: QuoteSummary;
  leadSummary?: LeadSummary;
  products: ProductItem[];
  categories: CategoryItem[];
  promotions: PromotionItem[];
  orders: OrderItem[];
  quotes: QuoteItem[];
  leads: LeadItem[];
  navItems: MerchantNavItem[];
};

export function useMerchantDashboardData(): MerchantDashboardOutletContext {
  const { user } = useAuth();
  const canManageCatalog = hasMerchantPermission(user?.role, 'catalog:manage');
  const canManagePromotions = hasMerchantPermission(user?.role, 'promotions:manage');
  const canManageOrders = hasMerchantPermission(user?.role, 'orders:manage');
  const canManageSales = hasMerchantPermission(user?.role, 'sales:manage');
  const canManageCustomers = hasMerchantPermission(user?.role, 'customers:manage');
  const canManageChannels = hasMerchantPermission(user?.role, 'channels:manage');
  const canManageQuotes = hasMerchantPermission(user?.role, 'quotes:manage');

  const { data: productSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'products'],
    queryFn: () => fetchProducts({}),
    enabled: canManageCatalog,
  });

  const { data: categorySummary } = useQuery({
    queryKey: ['merchant-dashboard', 'categories'],
    queryFn: fetchCategories,
    enabled: canManageCatalog,
  });

  const { data: promotionSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'promotions-badge'],
    queryFn: () => fetchAdminPromotions({ kind: 'collection', page: 1, limit: 1 }),
    enabled: canManagePromotions,
  });

  const { data: quoteSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'quotes-badge'],
    queryFn: () => fetchAdminQuotes({ page: 1, limit: 1 }),
    enabled: canManageQuotes,
  });

  const { data: orderSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'orders-badge'],
    queryFn: () => fetchAdminOrders({ page: 1, limit: 1, recoveryOnly: true }),
    enabled: canManageOrders,
  });

  const { data: leadSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'leads-badge'],
    queryFn: () => fetchCapturedLeads({ page: 1, limit: 1 }),
    enabled: canManageQuotes,
  });

  const { data: saleSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'sales-badge'],
    queryFn: () => fetchSales({ page: 1, limit: 1 }),
    enabled: canManageSales,
  });

  const { data: customerSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'customers-badge'],
    queryFn: () => fetchCustomers({ page: 1, limit: 1 }),
    enabled: canManageCustomers,
  });

  const { data: followUpSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'customers-followup-badge'],
    queryFn: () => fetchCustomers({ page: 1, limit: 1, followUpDue: true }),
    enabled: canManageCustomers,
  });

  const { data: channelSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'channels-badge'],
    queryFn: () => fetchChannels({ page: 1, limit: 100 }),
    enabled: canManageChannels,
  });

  const navItems = getMerchantNavItemsForRole(user?.role).map((item) => {
    if (item.id === 'visão-geral') {
      return { ...item, badge: 'Agora' };
    }

    if (item.id === 'produtos') {
      return { ...item, badge: `${productSummary?.total ?? 0}` };
    }

    if (item.id === 'promoções') {
      return { ...item, badge: `${promotionSummary?.total ?? 0}` };
    }

    if (item.id === 'pedidos') {
      const recoveryTotal = orderSummary?.total ?? 0;
      return { ...item, badge: recoveryTotal > 0 ? `${recoveryTotal}` : 'Fila limpa' };
    }

    if (item.id === 'vendas') {
      return { ...item, badge: `${saleSummary?.total ?? 0}` };
    }

    if (item.id === 'clientes') {
      const dueTotal = followUpSummary?.total ?? 0;
      return { ...item, badge: dueTotal > 0 ? `${dueTotal} p/ retorno` : `${customerSummary?.total ?? 0}` };
    }

    if (item.id === 'canais') {
      const channels = channelSummary?.channels ?? [];
      const outOfSync = channels.reduce((sum, c) => sum + c.listingCounts.outOfSync, 0);
      return { ...item, badge: outOfSync > 0 ? `${outOfSync} defasado(s)` : `${channels.length}` };
    }

    if (item.id === 'orçamentos') {
      const quotesTotal = quoteSummary?.total ?? 0;
      const leadsTotal = leadSummary?.total ?? 0;
      return { ...item, badge: `${quotesTotal}/${leadsTotal}` };
    }

    return item;
  });

  return {
    userEmail: user?.email ?? '-',
    userRole: user?.role ?? '-',
    productSummary,
    categorySummary,
    promotionSummary,
    orderSummary,
    saleSummary,
    quoteSummary,
    leadSummary,
    products: productSummary?.products ?? [],
    categories: categorySummary?.categories ?? [],
    promotions: promotionSummary?.promotions ?? [],
    orders: orderSummary?.orders ?? [],
    quotes: quoteSummary?.quotes ?? [],
    leads: leadSummary?.leads ?? [],
    navItems,
  };
}

export function useMerchantDashboardOutlet() {
  return useOutletContext<MerchantDashboardOutletContext>();
}
