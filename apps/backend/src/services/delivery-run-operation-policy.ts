import { hasMerchantPermission } from '@rebequi/shared/constants';
export function canOperateDeliveryRun(actor: { userId: string; role: string }, driverId: string, action: 'LOAD' | 'DEPART' | 'UNLOAD' | 'RETURN_TO_WAREHOUSE') {
  return action === 'DEPART'
    ? hasMerchantPermission(actor.role, 'logistics:fleet') || actor.role === 'DRIVER' && actor.userId === driverId
    : hasMerchantPermission(actor.role, 'logistics:manage');
}
