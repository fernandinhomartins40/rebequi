import { CustomerStage } from '@/types';

export const CUSTOMER_STAGE_ORDER: CustomerStage[] = [
  CustomerStage.NEW,
  CustomerStage.QUOTING,
  CustomerStage.NEGOTIATING,
  CustomerStage.CUSTOMER,
  CustomerStage.RECURRING,
  CustomerStage.INACTIVE,
];

export const CUSTOMER_STAGE_LABELS: Record<CustomerStage, string> = {
  [CustomerStage.NEW]: 'Novo',
  [CustomerStage.QUOTING]: 'Orçando',
  [CustomerStage.NEGOTIATING]: 'Negociando',
  [CustomerStage.CUSTOMER]: 'Cliente',
  [CustomerStage.RECURRING]: 'Recorrente',
  [CustomerStage.INACTIVE]: 'Inativo',
};

export function getCustomerStageLabel(stage: CustomerStage | string) {
  return CUSTOMER_STAGE_LABELS[stage as CustomerStage] ?? stage;
}

export function getCustomerStageTone(stage: CustomerStage | string) {
  switch (stage) {
    case CustomerStage.NEW:
      return 'border-slate-200 bg-slate-50 text-slate-700';
    case CustomerStage.QUOTING:
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case CustomerStage.NEGOTIATING:
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case CustomerStage.CUSTOMER:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case CustomerStage.RECURRING:
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case CustomerStage.INACTIVE:
      return 'border-border/60 bg-muted text-muted-foreground';
    default:
      return 'border-border/60 bg-muted text-muted-foreground';
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
