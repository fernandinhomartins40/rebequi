import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ADMIN_BASE_PATH } from './config';
import { GuaranteeCard, SectionLeadCard, StateCard } from './components';

export function MerchantDashboardStability() {
  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Base estavel"
        title="Pagina exclusiva do estado da plataforma"
        description="O painel deixa claro o que ja esta implementado de forma real e o que ainda nao deve ser vendido como pronto."
        tone="red"
        actions={
          <>
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to={`${ADMIN_BASE_PATH}/visao-geral`}>Voltar ao resumo</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={`${ADMIN_BASE_PATH}/acesso`}>Ir para acesso</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <StateCard
          className="border-[#e9dfbb] bg-[linear-gradient(160deg,rgba(255,250,224,0.9),rgba(255,255,255,0.97))] shadow-[0_28px_72px_-48px_rgba(220,38,38,0.18)]"
          badgeClassName="bg-secondary text-secondary-foreground"
          description="Estes blocos sustentam um ponto de partida estavel para seguir o roadmap."
          items={[
            'Login administrativo com sessao persistida por cookie.',
            'Protecao de rota por papel ADMIN no frontend.',
            'Seed idempotente de admin e cliente de teste no deploy.',
            'Catalogo publico carregado de dados persistidos.',
            'Deploy que valida autenticacao real em producao.',
          ]}
          itemClassName="border-black/5 bg-white/78 text-muted-foreground"
          title="Ja implementado de forma real"
        />

        <StateCard
          className="border-[#f0d7d7] bg-white/90 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.24)]"
          badgeClassName="bg-accent text-accent-foreground"
          description="A arquitetura visual agora comporta estes blocos como paginas futuras, mas eles continuam pendentes."
          items={[
            'CRUD administrativo completo de categorias e produtos.',
            'Pedidos, clientes, pagamentos e metricas operacionais.',
            'Filtros, busca administrativa e edicao em lote.',
            'Configuracoes de loja, seguranca e rotacao de credenciais.',
            'Auditoria e trilha de atividades do backoffice.',
          ]}
          itemClassName="border-black/5 bg-slate-50 text-muted-foreground"
          title="Ainda pendente"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <GuaranteeCard
          title="Sem maquiagem"
          description="A pagina de estabilidade existe para explicitar limites reais da aplicacao antes de novas entregas."
          badgeClass="bg-primary/10 text-primary"
        />
        <GuaranteeCard
          title="Escala do backoffice"
          description="Cada capacidade futura pode virar uma rota nova do admin sem reescrever o shell do painel."
          badgeClass="bg-secondary/25 text-foreground"
        />
      </section>
    </div>
  );
}
