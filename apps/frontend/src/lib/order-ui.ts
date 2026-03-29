import type { OrderStatus } from '@/types';

export function getOrderStatusLabel(status: OrderStatus) {
  switch (status) {
    case 'PENDING_WHATSAPP':
      return 'Aguardando WhatsApp';
    case 'WHATSAPP_REDIRECTED':
      return 'Cliente enviado ao WhatsApp';
    case 'IN_RECOVERY':
      return 'Em recuperacao';
    case 'COMPLETED':
      return 'Concluido';
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
