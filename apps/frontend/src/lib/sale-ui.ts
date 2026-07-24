import { PaymentMethod, SaleStatus } from '@/types';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.PIX]: 'Pix',
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.CARD]: 'Cartão',
  [PaymentMethod.INSTALLMENT]: 'A prazo / boleto',
};

export function getPaymentMethodLabel(method: PaymentMethod | string) {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  [SaleStatus.PAID]: 'Pago',
  [SaleStatus.PENDING_PAYMENT]: 'A receber',
  [SaleStatus.CANCELED]: 'Cancelada',
};

export function getSaleStatusLabel(status: SaleStatus | string) {
  return SALE_STATUS_LABELS[status as SaleStatus] ?? status;
}

export function getSaleStatusTone(status: SaleStatus | string) {
  switch (status) {
    case SaleStatus.PAID:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case SaleStatus.PENDING_PAYMENT:
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case SaleStatus.CANCELED:
      return 'border-border/60 bg-muted text-muted-foreground';
    default:
      return 'border-border/60 bg-muted text-muted-foreground';
  }
}
