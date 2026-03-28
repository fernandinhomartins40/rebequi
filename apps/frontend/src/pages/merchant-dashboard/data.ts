import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCategories } from '@/services/api/categories';
import { fetchProducts } from '@/services/api/products';
import { fetchAdminPromotions } from '@/services/api/promotions';
import { fetchAdminQuotes, fetchCapturedLeads } from '@/services/api/quotes';
import { NAV_SECTIONS, type MerchantNavItem } from './config';

export type ProductSummary = Awaited<ReturnType<typeof fetchProducts>>;
export type CategorySummary = Awaited<ReturnType<typeof fetchCategories>>;
export type PromotionSummary = Awaited<ReturnType<typeof fetchAdminPromotions>>;
export type QuoteSummary = Awaited<ReturnType<typeof fetchAdminQuotes>>;
export type LeadSummary = Awaited<ReturnType<typeof fetchCapturedLeads>>;
export type ProductItem = ProductSummary['products'][number];
export type CategoryItem = CategorySummary['categories'][number];
export type PromotionItem = PromotionSummary['promotions'][number];
export type QuoteItem = QuoteSummary['quotes'][number];
export type LeadItem = LeadSummary['leads'][number];

export type MerchantDashboardOutletContext = {
  userEmail: string;
  userRole: string;
  productSummary?: ProductSummary;
  categorySummary?: CategorySummary;
  promotionSummary?: PromotionSummary;
  quoteSummary?: QuoteSummary;
  leadSummary?: LeadSummary;
  products: ProductItem[];
  categories: CategoryItem[];
  promotions: PromotionItem[];
  quotes: QuoteItem[];
  leads: LeadItem[];
  navItems: MerchantNavItem[];
};

export function useMerchantDashboardData(): MerchantDashboardOutletContext {
  const { user } = useAuth();

  const { data: productSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'products'],
    queryFn: () => fetchProducts({}),
  });

  const { data: categorySummary } = useQuery({
    queryKey: ['merchant-dashboard', 'categories'],
    queryFn: fetchCategories,
  });

  const { data: promotionSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'promotions-badge'],
    queryFn: () => fetchAdminPromotions({ kind: 'collection', page: 1, limit: 1 }),
  });

  const { data: quoteSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'quotes-badge'],
    queryFn: () => fetchAdminQuotes({ page: 1, limit: 1 }),
  });

  const { data: leadSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'leads-badge'],
    queryFn: () => fetchCapturedLeads({ page: 1, limit: 1 }),
  });

  const navItems = NAV_SECTIONS.map((item) => {
    if (item.id === 'visao-geral') {
      return { ...item, badge: 'Agora' };
    }

    if (item.id === 'produtos') {
      return { ...item, badge: `${productSummary?.total ?? 0}` };
    }

    if (item.id === 'promocoes') {
      return { ...item, badge: `${promotionSummary?.total ?? 0}` };
    }

    if (item.id === 'orcamentos') {
      const quotesTotal = quoteSummary?.total ?? 0;
      const leadsTotal = leadSummary?.total ?? 0;
      return { ...item, badge: `${quotesTotal}/${leadsTotal}` };
    }

    return item;
  });

  return {
    userEmail: user?.email ?? '-',
    userRole: user?.role ?? 'ADMIN',
    productSummary,
    categorySummary,
    promotionSummary,
    quoteSummary,
    leadSummary,
    products: productSummary?.products ?? [],
    categories: categorySummary?.categories ?? [],
    promotions: promotionSummary?.promotions ?? [],
    quotes: quoteSummary?.quotes ?? [],
    leads: leadSummary?.leads ?? [],
    navItems,
  };
}

export function useMerchantDashboardOutlet() {
  return useOutletContext<MerchantDashboardOutletContext>();
}
