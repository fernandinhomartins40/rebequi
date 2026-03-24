import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ADMIN_BASE_PATH } from './config';
import { useMerchantDashboardOutlet } from './data';
import { GuaranteeCard, InfoRow, SectionLeadCard, SummarySurface } from './components';

export function MerchantDashboardAccess() {
  const { userEmail, userRole } = useMerchantDashboardOutlet();

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Acesso administrativo"
        title="Pagina exclusiva da autenticacao"
        description="Esta area documenta o contrato real de sessao que sustenta o painel, sem misturar esse assunto com catalogo ou roadmap."
        tone="blue"
        actions={
          <>
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to={`${ADMIN_BASE_PATH}/visao-geral`}>Voltar ao resumo</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={`${ADMIN_BASE_PATH}/catalogo`}>Ir para catalogo</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-[#f0d7d7] bg-white/90 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.24)]">
          <CardHeader>
            <CardTitle className="text-2xl">Sessao administrativa</CardTitle>
            <CardDescription>Contrato real de acesso que esta sustentando este painel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Email autenticado" value={userEmail} />
            <InfoRow label="Role esperada" value={userRole} />
            <InfoRow label="Middleware" value="ProtectedRoute + role ADMIN" />
            <InfoRow label="Persistencia de sessao" value="Cookie httpOnly validado em /api/auth/me" />
            <InfoRow label="Saida" value="POST /api/auth/logout derruba a sessao" />
          </CardContent>
        </Card>

        <Card className="border-[#dfe6f7] bg-white/90 shadow-[0_24px_60px_-44px_rgba(37,99,235,0.26)]">
          <CardHeader>
            <CardTitle className="text-2xl">Garantias reais de autenticacao</CardTitle>
            <CardDescription>O painel so existe porque o fluxo de login eh validado de ponta a ponta.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <GuaranteeCard
              title="Login"
              description="O backend valida email e senha antes de liberar o painel."
              badgeClass="bg-primary/10 text-primary"
            />
            <GuaranteeCard
              title="Role"
              description="A rota exige ADMIN; conta cliente nao atravessa esse gate."
              badgeClass="bg-accent/10 text-accent"
            />
            <GuaranteeCard
              title="Sessao"
              description="A UI reidrata a autenticacao em /api/auth/me antes de decidir acesso."
              badgeClass="bg-secondary/25 text-foreground"
            />
            <GuaranteeCard
              title="Deploy"
              description="O workflow de producao valida login, me e logout com usuarios seed."
              badgeClass="bg-primary/10 text-primary"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummarySurface value="ADMIN" label="Papel exigido" description="rota administrativa protegida" />
        <SummarySurface value="Cookie" label="Sessao" description="validacao server-side em /api/auth/me" />
        <SummarySurface value="Logout real" label="Encerramento" description="sessao derrubada pela API" />
      </section>
    </div>
  );
}
