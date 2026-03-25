import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCategories } from '@/services/api/categories';
import { fetchNewProducts, fetchProducts, fetchPromotionalProducts } from '@/services/api/products';
import { NAV_SECTIONS, type MerchantNavItem } from './config';

export type ProductSummary = Awaited<ReturnType<typeof fetchProducts>>;
export type CategorySummary = Awaited<ReturnType<typeof fetchCategories>>;
export type ProductItem = ProductSummary['products'][number];
export type CategoryItem = CategorySummary['categories'][number];

export type MerchantDashboardOutletContext = {
  userEmail: string;
  userRole: string;
  productSummary?: ProductSummary;
  promotionalProducts: ProductItem[];
  newProducts: ProductItem[];
  categorySummary?: CategorySummary;
  products: ProductItem[];
  categories: CategoryItem[];
  navItems: MerchantNavItem[];
};

export function useMerchantDashboardData(): MerchantDashboardOutletContext {
  const { user } = useAuth();

  const { data: productSummary } = useQuery({
    queryKey: ['merchant-dashboard', 'products'],
    queryFn: () => fetchProducts({}),
  });

  const { data: promotionalProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'promotional-products'],
    queryFn: fetchPromotionalProducts,
  });

  const { data: newProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'new-products'],
    queryFn: fetchNewProducts,
  });

  const { data: categorySummary } = useQuery({
    queryKey: ['merchant-dashboard', 'categories'],
    queryFn: fetchCategories,
  });

  const navItems = NAV_SECTIONS.map((item) => {
    if (item.id === 'visao-geral') {
      return { ...item, badge: 'Agora' };
    }

    if (item.id === 'catalogo' || item.id === 'produtos') {
      return { ...item, badge: `${productSummary?.total ?? 0}` };
    }

    return item;
  });

  return {
    userEmail: user?.email ?? '-',
    userRole: user?.role ?? 'ADMIN',
    productSummary,
    promotionalProducts: promotionalProducts ?? [],
    newProducts: newProducts ?? [],
    categorySummary,
    products: productSummary?.products ?? [],
    categories: categorySummary?.categories ?? [],
    navItems,
  };
}

export function useMerchantDashboardOutlet() {
  return useOutletContext<MerchantDashboardOutletContext>();
}
