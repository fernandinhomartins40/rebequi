# Componentes dos painéis

Cliente e admin compartilham `DashboardElements.tsx` e `dashboard.css`. Usar esses componentes antes de criar variantes locais.

- `DashboardToolbar` e `DashboardBrand`: identidade, título curto e ações globais.
- `DashboardHeading`, `DashboardSection` e `DashboardSurface`: hierarquia, ações e espaçamento.
- `DashboardMetric`: indicador com rótulo e valor; cores comunicam estado.
- `DashboardNavLabel` e `DashboardNavAction`: navegação com texto curto e estado ativo.
- `DashboardSteps`: três etapas reais de uma tarefa, com links ou foco em seções. Não adiciona etapas artificiais nem salva automaticamente.
- `DashboardHelp`: explicações auxiliares sob demanda. Alertas, erros, validação e informações de segurança ficam visíveis.
- `DashboardRecord`: cartão de registro com espaçamento padrão, sem sugerir clique quando não há ação.
- `DashboardSearch`: busca com rótulo acessível, botão de limpar e devolução do foco ao campo. Preserva a lógica de debounce de cada lista.
- `DashboardLoading`, `DashboardEmpty` e `DashboardError`: carregamento anunciado, ausência de resultados com ação e falha com nova tentativa. Nunca apresentar erro como lista vazia.
- `DashboardInfo`: pares de rótulo/valor sem truncar e-mails, nomes ou informações longas; variante inline para a conta.
- `DashboardStatus`: apresentação compacta de estado com texto; preserva as cores e os nomes definidos pelas regras de negócio.
- `DashboardSelection`: escolha de registro com estado `aria-pressed`; em telas com uma coluna, direciona o foco ao detalhe. Respeita movimento reduzido.

## Revisão de UX/UI dos componentes

| Família | Aplicação do padrão |
| --- | --- |
| Cabeçalhos e superfícies | Hierarquia curta, ações que se acomodam em linhas e limites consistentes |
| Indicadores e resumos | Valor em destaque, números alinhados, informação auxiliar legível |
| Listas e cartões | Busca compartilhada em sete listas; seleção explícita nos orçamentos; registros de pedidos e vendas com espaçamento comum |
| Estados de consulta | Erro separado de vazio e botão de nova tentativa nas listas; limpeza de filtros sem recarregar a página |
| Tabelas | Cabeçalhos de coluna semânticos, contêiner com foco para rolar por teclado e destaque da linha ao interagir |
| Formulários e ações | Foco visível, estado desabilitado claro, alvos de toque de 44 px para dispositivos de toque |
| Abas e navegação | Abas acomodam texto e múltiplas linhas; cores de seleção consistentes; URLs e permissões preservadas |
| Detalhes e estados | Pares semânticos de rótulo/valor, textos longos acomodados e status sem espaçamento excessivo |
| Carregamento e movimento | Esqueleto anunciado e respeito à preferência por movimento reduzido |

Os adaptadores antigos continuam disponíveis para não quebrar consumidores. Não transformar todo cartão em botão nem esconder totais, alertas, validações ou efeitos de ações em ajuda recolhida. Ações que alteram registros continuam usando os fluxos existentes de confirmação e salvamento.

Priorizar uma ação principal por tela, agrupar configurações relacionadas e preservar URLs e permissões. Os componentes antigos dos painéis são adaptadores para esta base compartilhada.

Validar em 320, 390, 768, 1024 e 1440 pixels. Tabelas podem rolar dentro de seu contêiner; a página não deve ter rolagem horizontal. O teste de produto no GitHub usa usuários, banco e navegação reais, incluindo retomada de conta e troca de etapas sem perder edição.
