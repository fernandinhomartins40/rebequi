import type { OrderStatus } from '@/types';
import { DashboardStatus } from "@/components/dashboard/DashboardList";
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '@/lib/order-ui';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <DashboardStatus className={getOrderStatusBadgeClass(status)}>{getOrderStatusLabel(status)}</DashboardStatus>;
}
