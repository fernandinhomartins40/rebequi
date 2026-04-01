import { Badge } from '@/components/ui/badge';
import { getLeadStatusClassName, getLeadStatusLabel, getQuoteStatusClassName, getQuoteStatusLabel } from '@/lib/quote-ui';
import type { LeadStatus, QuoteStatus } from '@/types';

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge className={`rounded-full border-none px-3 py-1 text-[11px] font-semibold tracking-[0.12em] shadow-sm ${getQuoteStatusClassName(status)}`}>{getQuoteStatusLabel(status)}</Badge>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={`rounded-full border-none px-3 py-1 text-[11px] font-semibold tracking-[0.12em] shadow-sm ${getLeadStatusClassName(status)}`}>{getLeadStatusLabel(status)}</Badge>;
}
