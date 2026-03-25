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
        badge="Acesso"
        title="Controle de acesso"
        description="Informacoes da sessao administrativa atual."
        tone="blue"
        actions={
          <>
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to={`${ADMIN_BASE_PATH}/visao-geral`}>Visao geral</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={`${ADMIN_BASE_PATH}/produtos`}>Produtos</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-[#f0d7d7] bg-white/90 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.24)]">
          <CardHeader>
            <CardTitle className="text-2xl">Sessao atual</CardTitle>
            <CardDescription>Dados recebidos da autenticacao.</CardDescription>
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
            <CardTitle className="text-2xl">Validacoes de acesso</CardTitle>
            <CardDescription>Regras aplicadas para acesso ao painel.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <GuaranteeCard
              title="Login"
              description="O backend valida email e senha antes de abrir a area administrativa."
              badgeClass="bg-primary/10 text-primary"
            />
            <GuaranteeCard
              title="Role"
              description="Somente usuarios ADMIN acessam o painel."
              badgeClass="bg-accent/10 text-accent"
            />
            <GuaranteeCard
              title="Sessao"
              description="A autenticacao e revalidada em /api/auth/me."
              badgeClass="bg-secondary/25 text-foreground"
            />
            <GuaranteeCard
              title="Deploy"
              description="O deploy valida login, perfil e logout automaticamente."
              badgeClass="bg-primary/10 text-primary"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummarySurface value="ADMIN" label="Papel exigido" description="acesso restrito" />
        <SummarySurface value="Cookie" label="Sessao" description="validacao server-side" />
        <SummarySurface value="Logout" label="Encerramento" description="sessao encerrada pela API" />
      </section>
    </div>
  );
}
