import { normalizeWhatsapp } from '@rebequi/shared/utils';
import type { CustomerOrder, OrderStatus } from '@/types';

export function getOrderStatusLabel(status: OrderStatus, source?: string) {
  if (source === 'seller_assisted' && status === 'IN_RECOVERY') return 'Em atendimento';
  switch (status) {
    case 'PENDING_WHATSAPP':
      return 'Aguardando WhatsApp';
    case 'WHATSAPP_REDIRECTED':
      return 'Cliente enviado ao WhatsApp';
    case 'IN_RECOVERY':
      return 'Em recuperação';
    case 'COMPLETED':
      return 'Concluído';
    case 'CANCELED':
      return 'Cancelado';
    default:
      return status;
  }
}

export function getOrderStatusBadgeClass(status: OrderStatus) {
  switch (status) {
    case 'PENDING_WHATSAPP':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'WHATSAPP_REDIRECTED':
      return 'border-primary/15 bg-primary/5 text-primary';
    case 'IN_RECOVERY':
      return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700';
    case 'COMPLETED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELED':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-black/10 bg-slate-50 text-slate-700';
  }
}

export function buildCustomerWhatsappUrl(order: Pick<CustomerOrder, 'customerNameSnapshot' | 'customerWhatsapp' | 'referenceCode'>) {
  const normalizedWhatsapp = normalizeWhatsapp(order.customerWhatsapp);

  if (!normalizedWhatsapp) {
    return '#';
  }

  const message = `Ola ${order.customerNameSnapshot}, aqui e da Rebequi. Estou falando sobre o pedido ${order.referenceCode}.`;
  return `https://wa.me/55${normalizedWhatsapp}?text=${encodeURIComponent(message)}`;
}
