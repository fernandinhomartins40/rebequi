import { BadgeCheck, Camera, Clock3, FileText, Home, Sparkles } from 'lucide-react';
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
    <section className="space-y-4">
      {/* Welcome banner */}
      <SectionPanel className="p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Visão geral
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Olá, {user?.name || user?.identifier || 'cliente'}.
            </h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Um resumo do que precisa de atenção agora.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => onTabChange('quotes')}>
              <Camera className="h-3.5 w-3.5" /> Capturar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-slate-200/80 bg-white"
              onClick={() => onTabChange('quotes')}
            >
              <FileText className="h-3.5 w-3.5" /> Orçamentos
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-slate-200/80 bg-white"
              onClick={() => navigate('/')}
            >
              <Home className="h-3.5 w-3.5" /> Loja
            </Button>
          </div>
        </div>
      </SectionPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Metrics */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            hint="Prontos para revisar"
            tone="amber"
          />
          <MetricCard
            icon={Clock3}
            label="Em análise"
            value={`${submittedQuotes.length + inReviewQuotes.length}`}
            hint="Aguardando retorno"
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

        {/* Next step */}
        <SectionPanel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Próximo passo</p>
              <h3 className="mt-1 text-base font-semibold text-foreground">Continue de onde parou</h3>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {latestQuote
              ? `${latestQuote.title || latestQuote.referenceCode} · ${latestQuote.itemCount} item(ns) · ${getQuoteStatusLabel(latestQuote.status)}`
              : 'Capture um documento para começar.'}
          </p>

          <div className="mt-3 grid gap-2">
            <QuickLink label="Abrir orçamentos" onClick={() => onTabChange('quotes')} />
            <QuickLink label="Segurança da conta" onClick={() => onTabChange('security')} />
          </div>
        </SectionPanel>
      </div>
    </section>
  );
}
