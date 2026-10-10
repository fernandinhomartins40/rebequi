import { DashboardStatus } from "@/components/dashboard/DashboardList";
import { getLeadStatusClassName, getLeadStatusLabel, getQuoteStatusClassName, getQuoteStatusLabel } from '@/lib/quote-ui';
import type { LeadStatus, QuoteStatus } from '@/types';

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <DashboardStatus className={`${getQuoteStatusClassName(status)}`}>{getQuoteStatusLabel(status)}</DashboardStatus>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <DashboardStatus className={getLeadStatusClassName(status)}>{getLeadStatusLabel(status)}</DashboardStatus>;
}
