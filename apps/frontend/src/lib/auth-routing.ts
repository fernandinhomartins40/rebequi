import { isMerchantUserRole } from '@rebequi/shared/constants';
import type { UserRole } from '@rebequi/shared/types';
import { getDefaultMerchantDashboardHref } from '@/pages/merchant-dashboard/config';

export function getDefaultRouteForRole(role?: UserRole | string | null) {
  if (isMerchantUserRole(role)) {
    return getDefaultMerchantDashboardHref(role);
  }

  return '/painel-cliente';
}
