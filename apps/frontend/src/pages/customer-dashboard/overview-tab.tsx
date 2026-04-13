import { BadgeCheck, Camera, Clock3, FileText, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getQuoteStatusLabel } from '@/lib/quote-ui';
import { Button } from '@/components/ui/button';
import { MetricCard, QuickLink, SectionPanel } from './components';
import type { ActiveTab } from './types';
import type { QuoteRequest } from '@/types';

interface OverviewTabProps {
  user: { name?: string | null; identifier?: string | null } | null;
  quotes: QuoteRequest[];
  draftQuotes: QuoteRequest[];
  submittedQuotes: QuoteRequest[];
  inReviewQuotes: QuoteRequest[];
  respondedQuotes: QuoteRequest[];
  onTabChange: (tab: ActiveTab) => void;
}

export function OverviewTab({
  user,
  quotes,
  draftQuotes,
  submittedQuotes,
  inReviewQuotes,
  respondedQuotes,
  onTabChange,
}: OverviewTabProps) {
  const navigate = useNavigate();
  const latestQuote = quotes[0] ?? null;

  return (
    <div className="space-y-6">
      {/* ── Boas-vindas ────────────────────────────────────────────────── */}
      <SectionPanel className="px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Visão geral
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Olá, {user?.name || user?.identifier || 'cliente'}.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Um resumo do que precisa de atenção agora.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => onTabChange('quotes')}>
              <Camera className="h-3.5 w-3.5" /> Capturar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-slate-200 bg-white"
              onClick={() => onTabChange('quotes')}
            >
              <FileText className="h-3.5 w-3.5" /> Orçamentos
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-slate-200 bg-white"
              onClick={() => navigate('/')}
            >
              <Home className="h-3.5 w-3.5" /> Loja
            </Button>
          </div>
        </div>
      </SectionPanel>

      {/* ── Métricas ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={FileText}
          label="Orçamentos"
          value={`${quotes.length}`}
          hint="No histórico"
          tone="slate"
        />
        <MetricCard
          icon={Camera}
          label="Rascunhos"
          value={`${draftQuotes.length}`}
          hint="Para revisar"
          tone="amber"
        />
        <MetricCard
          icon={Clock3}
          label="Em análise"
          value={`${submittedQuotes.length + inReviewQuotes.length}`}
          hint="Aguardando"
          tone="sky"
        />
        <MetricCard
          icon={BadgeCheck}
          label="Respondidos"
          value={`${respondedQuotes.length}`}
          hint="Finalizados"
          tone="emerald"
        />
      </div>

      {/* ── Próximo passo ────────────────────────────────────────────────── */}
      <SectionPanel>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Próximo passo
              </p>
              <h3 className="mt-1 text-[15px] font-semibold text-foreground">Continue de onde parou</h3>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            {latestQuote
              ? `${latestQuote.title || latestQuote.referenceCode} · ${latestQuote.itemCount} item(ns) · ${getQuoteStatusLabel(latestQuote.status)}`
              : 'Capture um documento para começar.'}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <QuickLink label="Abrir orçamentos" onClick={() => onTabChange('quotes')} />
            <QuickLink label="Segurança da conta" onClick={() => onTabChange('security')} />
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
