import { Badge } from '@/components/ui/badge';
import { getLeadStatusClassName, getLeadStatusLabel, getQuoteStatusClassName, getQuoteStatusLabel } from '@/lib/quote-ui';
import type { LeadStatus, QuoteStatus } from '@/types';

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge className={`border-none ${getQuoteStatusClassName(status)}`}>{getQuoteStatusLabel(status)}</Badge>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={`border-none ${getLeadStatusClassName(status)}`}>{getLeadStatusLabel(status)}</Badge>;
}
