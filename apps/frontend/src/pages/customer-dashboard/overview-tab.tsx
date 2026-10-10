import { Clock3, FileText, Camera, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DashboardHeading,
  DashboardSection,
  DashboardSteps,
} from "@/components/dashboard/DashboardElements";
import { MetricCard } from "./components";
import { getQuoteStatusLabel } from "@/lib/quote-ui";
import type { ActiveTab } from "./types";
import type { QuoteRequest } from "@/types";

export function OverviewTab({
  user,
  quotes,
  draftQuotes,
  submittedQuotes,
  inReviewQuotes,
  respondedQuotes,
  onTabChange,
  onResumeQuote,
}: {
  user: { name?: string | null; identifier?: string | null } | null;
  quotes: QuoteRequest[];
  draftQuotes: QuoteRequest[];
  submittedQuotes: QuoteRequest[];
  inReviewQuotes: QuoteRequest[];
  respondedQuotes: QuoteRequest[];
  onTabChange: (tab: ActiveTab) => void;
  onResumeQuote: (id: string) => void;
}) {
  const navigate = useNavigate();
  const draft = draftQuotes[0];
  const latest = draft ?? quotes[0];
  const resume = () => (draft ? onResumeQuote(draft.id) : navigate("/pedido"));
  return (
    <div className="space-y-5">
      <DashboardHeading
        title={`Olá, ${user?.name || user?.identifier || "cliente"}`}
        actions={
          <Button onClick={draft ? resume : () => navigate("/pedido")}>{draft ? 'Continuar lista' : 'Nova lista'}</Button>
        }
      />
      <DashboardSteps
        activeStep={draft ? 1 : 0}
        steps={[
          { title: "Criar lista", href: "/pedido" },
          { title: "Conferir itens", onClick: resume },
          { title: "Enviar à loja", onClick: resume },
        ]}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={FileText}
          label="Orçamentos"
          value={`${quotes.length}`}
        />
        <MetricCard
          icon={Camera}
          label="Rascunhos"
          value={`${draftQuotes.length}`}
          tone="amber"
        />
        <MetricCard
          icon={Clock3}
          label="Em análise"
          value={`${submittedQuotes.length + inReviewQuotes.length}`}
          tone="sky"
        />
        <MetricCard
          icon={BadgeCheck}
          label="Respondidos"
          value={`${respondedQuotes.length}`}
          tone="emerald"
        />
      </div>
      <DashboardSection
        title={draft ? "Continue sua lista" : "Último orçamento"}
        action={
          latest ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResumeQuote(latest.id)}
            >
              {draft ? "Continuar" : "Acompanhar"}
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/pedido")}>
              Criar lista
            </Button>
          )
        }
      >
        <p className="text-sm text-muted-foreground">
          {latest
            ? `${latest.title || latest.referenceCode} · ${latest.itemCount} itens · ${getQuoteStatusLabel(latest.status)}`
            : "Envie sua lista de materiais para receber um orçamento."}
        </p>
      </DashboardSection>
      <Button variant="outline" onClick={() => onTabChange("orders")}>
        Ver meus pedidos
      </Button>
    </div>
  );
}
