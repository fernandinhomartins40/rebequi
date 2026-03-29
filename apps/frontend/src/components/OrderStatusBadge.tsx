import type { OrderStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '@/lib/order-ui';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={getOrderStatusBadgeClass(status)}>{getOrderStatusLabel(status)}</Badge>;
}
