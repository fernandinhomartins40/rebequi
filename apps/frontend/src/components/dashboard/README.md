# Componentes dos painéis

Cliente e admin compartilham `DashboardElements.tsx` e `dashboard.css`. Usar esses componentes antes de criar variantes locais.

- `DashboardToolbar` e `DashboardBrand`: identidade, título curto e ações globais.
- `DashboardHeading`, `DashboardSection` e `DashboardSurface`: hierarquia, ações e espaçamento.
- `DashboardMetric`: indicador com rótulo e valor; cores comunicam estado.
- `DashboardNavLabel` e `DashboardNavAction`: navegação com texto curto e estado ativo.
- `DashboardSteps`: três etapas reais de uma tarefa, com links ou foco em seções. Não adiciona etapas artificiais nem salva automaticamente.
- `DashboardHelp`: explicações auxiliares sob demanda. Alertas, erros, validação e informações de segurança ficam visíveis.

Priorizar uma ação principal por tela, agrupar configurações relacionadas e preservar URLs e permissões. Os componentes antigos dos painéis são adaptadores para esta base compartilhada.

Validar em 320, 390, 768, 1024 e 1440 pixels. Tabelas podem rolar dentro de seu contêiner; a página não deve ter rolagem horizontal. O teste de produto no GitHub usa usuários, banco e navegação reais, incluindo retomada de conta e troca de etapas sem perder edição.
