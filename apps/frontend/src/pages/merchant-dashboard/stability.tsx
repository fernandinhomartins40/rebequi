import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ADMIN_BASE_PATH } from './config';
import { GuaranteeCard, SectionLeadCard, StateCard } from './components';

export function MerchantDashboardStability() {
  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Plataforma"
        title="Status da plataforma"
        description="Itens concluidos e pendencias atuais do painel."
        tone="red"
        actions={
          <>
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to={`${ADMIN_BASE_PATH}/visao-geral`}>Visao geral</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={`${ADMIN_BASE_PATH}/acesso`}>Acesso</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <StateCard
          className="border-[#e9dfbb] bg-[linear-gradient(160deg,rgba(255,250,224,0.9),rgba(255,255,255,0.97))] shadow-[0_28px_72px_-48px_rgba(220,38,38,0.18)]"
          badgeClassName="bg-secondary text-secondary-foreground"
          description="Recursos ativos e validados."
          items={[
            'Login administrativo com sessao persistida por cookie.',
            'Protecao de rota por papel ADMIN no frontend.',
            'Seed idempotente de admin e cliente de teste no deploy.',
            'Produtos publicos carregados da API sem exigir login.',
            'Deploy que valida autenticacao real em producao.',
          ]}
          itemClassName="border-black/5 bg-white/78 text-muted-foreground"
          title="Implementado"
        />

        <StateCard
          className="border-[#f0d7d7] bg-white/90 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.24)]"
          badgeClassName="bg-accent text-accent-foreground"
          description="Itens previstos e ainda nao entregues."
          items={[
            'CRUD administrativo completo de categorias.',
            'Pedidos, clientes, pagamentos e metricas operacionais.',
            'Filtros avancados, busca administrativa e edicao em lote.',
            'Configuracoes de loja, seguranca e rotacao de credenciais.',
            'Auditoria e trilha de atividades do painel administrativo.',
          ]}
          itemClassName="border-black/5 bg-slate-50 text-muted-foreground"
          title="Pendente"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <GuaranteeCard
          title="Escopo atual"
          description="O painel cobre autenticacao, produtos e verificacoes basicas de plataforma."
          badgeClass="bg-primary/10 text-primary"
        />
        <GuaranteeCard
          title="Evolucao"
          description="Novas areas podem ser adicionadas sem alterar a estrutura principal do painel."
          badgeClass="bg-secondary/25 text-foreground"
        />
      </section>
    </div>
  );
}
