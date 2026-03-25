import { BarChart3, Package, ShieldCheck, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ADMIN_BASE_PATH } from './config';
import { useMerchantDashboardOutlet } from './data';
import {
  GuaranteeCard,
  PulseLine,
  SectionLeadCard,
  StatCard,
  SummaryTile,
} from './components';

export default function MerchantDashboardOverview() {
  const { userEmail, productSummary, promotionalProducts, newProducts, categorySummary } =
    useMerchantDashboardOutlet();

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="relative overflow-hidden border border-[#e9dfbb] bg-[linear-gradient(135deg,rgba(255,250,224,0.92),rgba(255,255,255,0.96)_50%,rgba(239,246,255,0.92)_100%)] shadow-[0_30px_88px_-48px_rgba(37,99,235,0.35)]">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at top right, rgba(37,99,235,0.22), transparent 30%), radial-gradient(circle at bottom left, rgba(220,38,38,0.16), transparent 34%)',
            }}
          />
          <CardContent className="relative space-y-6 p-8">
            <Badge className="w-fit border-none bg-secondary text-secondary-foreground">Resumo</Badge>

            <div className="space-y-3">
              <h2 className="max-w-3xl text-3xl font-bold leading-tight md:text-4xl">Visao geral da operacao</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Indicadores principais do painel administrativo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Administrador" value={userEmail} detail="sessao atual" />
              <SummaryTile
                label="Produtos ativos"
                value={`${productSummary?.total ?? 0}`}
                detail="persistidos no banco"
              />
              <SummaryTile
                label="Categorias"
                value={`${categorySummary?.total ?? 0}`}
                detail="carregadas da API"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Link to={`${ADMIN_BASE_PATH}/produtos`}>Produtos</Link>
              </Button>
              <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
                <Link to={`${ADMIN_BASE_PATH}/estabilidade`}>Status da plataforma</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dfe6f7] bg-white/88 shadow-[0_22px_55px_-38px_rgba(37,99,235,0.32)]">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
              Monitoramento
            </Badge>
            <div>
              <CardTitle className="text-2xl">Indicadores principais</CardTitle>
              <CardDescription>Dados carregados da API administrativa e publica.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <PulseLine title="Autenticacao" value="Sessao ADMIN ativa" toneClass="bg-primary/10 text-primary" />
            <PulseLine
              title="Produtos"
              value={`${productSummary?.total ?? 0} itens ativos e ${categorySummary?.total ?? 0} categorias publicas`}
              toneClass="bg-secondary/25 text-foreground"
            />
            <PulseLine
              title="Vitrine"
              value={`${promotionalProducts.length} ofertas e ${newProducts.length} novidades`}
              toneClass="bg-accent/10 text-accent"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Store className="h-5 w-5 text-primary" />}
          label="Administrador"
          value={userEmail}
          delta="Usuario autenticado"
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-primary" />}
          label="Produtos ativos"
          value={`${productSummary?.total ?? 0}`}
          delta="Base publica"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          label="Produtos em oferta"
          value={`${promotionalProducts.length}`}
          delta="Ofertas ativas"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
          label="Novidades"
          value={`${newProducts.length}`}
          delta="Produtos sinalizados"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <SectionLeadCard
          badge="Acesso rapido"
          title="Atalhos do painel"
          description="Links diretos para as areas administrativas."
          tone="blue"
          actions={
            <>
              <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
                <Link to={`${ADMIN_BASE_PATH}/produtos`}>Produtos</Link>
              </Button>
              <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
                <Link to={`${ADMIN_BASE_PATH}/acesso`}>Acesso</Link>
              </Button>
            </>
          }
        />

        <Card className="border-[#f0d7d7] bg-white/90 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.18)]">
          <CardHeader>
            <CardTitle className="text-2xl">Estrutura do painel</CardTitle>
            <CardDescription>Navegacao lateral fixa e rotas separadas por area.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <GuaranteeCard
              title="Navegacao"
              description="A sidebar permanece visivel em todas as paginas do painel."
              badgeClass="bg-secondary/30 text-foreground"
            />
            <GuaranteeCard
              title="Rotas"
              description="Cada area administrativa possui URL propria."
              badgeClass="bg-primary/10 text-primary"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
