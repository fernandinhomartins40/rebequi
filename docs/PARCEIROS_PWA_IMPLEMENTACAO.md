# Implementação incremental — Rebequi Parceiros

Plano aprovado pelo usuário em 11/10/2026: PARCEIROS_PWA_AUDITORIA_PLANO.md, etapas 0–7. Apps nativos, pagamentos bancários e testes pagos de IA permanecem fora desta autorização.

## Fundação e cadastro

`/parceiros/` reutiliza sessão CUSTOMER existente e oferece cadastro em três etapas: especialidades, atendimento, conferência/condições. Mesmo usuário pode atuar em várias especialidades e continua comprando como cliente. Links no rodapé e no painel do cliente; login/cadastro retornam ao espaço profissional. Módulo carregado por importação dinâmica.

PartnerProfile possui código aleatório único, versão para concorrência, especialidades, cidade/região, serviços e experiência. Aprovação/suspensão/rejeição apenas por ADMIN/MANAGER em painel → Parceiros. Revisão exige motivo; suspensão não é removida por edição do profissional. Cadastros rejeitados voltam à análise quando reenviados. Auditoria persistida na mesma transação, sem senhas ou dados de clientes. Mutações exigem origem autorizada; respostas privadas não são cacheadas. Programa financeiro permanece desativado, sem saldo fictício ou promessa de benefício.

Documentos em `/uploads/quotes/` passam a exigir sessão e propriedade do orçamento ou permissão quotes:manage. Proteção examina caminho decodificado/normalizado antes do static para impedir bypass por pasta codificada. Documentos mantêm no-store; fotos públicas de catálogo/promoções preservadas. Caminhos inválidos ou de outro cliente não revelam existência do arquivo.

Migração aditiva 20261011200000_partner_profiles; contas/dados históricos preservados. Validação local: 44 testes backend, TypeScript e lint dos componentes, textos UTF-8. Integração no GitHub acrescenta criação real, rejeição de campos privilegiados/origem ausente, concorrência, aprovação/suspensão/auditoria, wizard em 320/390/1440 e proteção da foto original via HTTP.

## Próximas entregas

### Obras e cálculo determinístico — implementação de 12/10/2026

Obras privadas com ambientes, paginação, edição por versão, arquivamento e criação idempotente. Contatos/anotações do cliente da obra não são copiados para a cotação. Cadastro aprovado é exigido no servidor para gravar obras, estimativas e solicitações; suspensão é verificada dentro da mesma transação das gravações.

Ficha técnica no editor de produto: aplicação, embalagem, rendimento/área, base por demão ou acabamento, fonte HTTPS e confirmação explícita. Histórico de confirmação com versão e ator. Nenhum produto recebe coeficiente de demonstração em produção. O catálogo da calculadora usa apenas produtos ativos com ficha confirmada do serviço escolhido.

Wizard de cálculo em três passos: obra/medidas, produto real, conferência da lista. Motor compartilhado e recalculado no servidor para pintura e pisos; desconta aberturas, aplica margem explícita e arredonda embalagens para cima. Rendimento acabado inclui as demãos uma única vez. Fórmula, ficha, preço e disponibilidade são fotografados na estimativa. Envio exige WhatsApp válido, revalida ficha/produto e cria QuoteRequest SUBMITTED agrupado; chamadas repetidas não criam solicitações duplicadas. Não altera estoque, não inclui mão de obra e não cria venda paga. Sem ficha disponível mantém cotação manual. Sem conexão há conferência simples de área, sem envio nem persistência de dados privados.

Migração aditiva 20261011210000_partner_projects_estimates. 46 testes unitários backend passaram; integração adiciona PostgreSQL/API reais, permissões, concorrência/idempotência, versão de ficha, privacidade, estoque preservado e jornada mobile obra → cálculo → cotação. Corrigido Nginx para servir o SPA na entrada /parceiros/, mesmo com diretório físico do manifesto; teste HTTP explícito impede regressão. Esta entrega ainda não implementa IA de interpretação, proposta versionada, mão de obra, portfólio ou programa financeiro.

### Orçamento de mão de obra — implementação de 12/10/2026

Cada obra tem versões imutáveis do orçamento de serviços, separado de materiais. Wizard: condições → serviços → conferência. Quantidades com até três casas decimais; preços em centavos; cálculo inteiro e arredondamento por linha no servidor. Sem duplicação por reenvio, com concorrência controlada por versão. Preserva título da obra, nome do profissional e cliente da emissão mesmo após alterações no cadastro. Impressão/PDF local inclui nome do cliente somente por seleção explícita; não registra aceite, envio nem pagamento. História paginada e privada. Migração aditiva 20261011220000_partner_labor_quotes.

47 testes backend passaram, tipos/lint/build aprovados. Teste de integração inclui criação concorrente, rejeição de versão antiga, propriedade, histórico preservado, wizard 320 px e PDF gerado pelo navegador. Jornadas independentes reiniciam apenas a API descartável do runner, preservando o banco e os limites de segurança de produção; o crescimento da suíte havia consumido a janela de 100 solicitações por IP. O PWA e a jornada obra/cálculo/cotação passaram no runner anterior; duas regressões posteriores foram causadas pelo limite da suíte, corrigido com isolamento das jornadas. Nenhuma redução de proteção em produção.

### Proposta da loja e aceite — implementação de 12/10/2026

Admin/atendimento com quotes:manage publica proposta em três etapas: associar produtos do catálogo, informar preços/validade, conferir/publicar. Versões são imutáveis e paginadas, com itens e totais em centavos, fonte do preço de referência e auditoria de publicação/aceite. Sem produto associado ou quantidade inteira, não publica. A proposta contempla os materiais indicados; frete e mão de obra são explicitamente excluídos nesta entrega.

Cliente identificado consulta somente propostas de suas solicitações. Aceite exige confirmação, versão atual, validade, orçamento disponível, conta ativa/WhatsApp válido, catálogo/preço de referência e disponibilidade revalidados com locks. Cria um único CustomerOrder pendente de atendimento; reenvio da mesma versão devolve o pedido existente. Não gera pagamento, venda paga ou reserva automática. Link WhatsApp só é aberto pelo usuário. Após aceite não se publica nova versão sobre o mesmo orçamento. Histórico anterior e auditoria permanecem disponíveis. Migração aditiva 20261011230000_quote_proposals.

49 testes unitários passaram; tipos/build/lint dos novos componentes aprovados. Integração no runner inclui duplicidade/concorrência, prazo, mudança de preço/estoque, acesso de outra conta, status não pago e jornada admin → publicação → aceite mobile → pedido. Corrigida restauração da sessão no evento online antes do guard de login, descoberta pela reconexão real do PWA. Teste monetário normaliza espaço inseparável usado pelo locale pt-BR do navegador; cálculo continua conferido em centavos no banco. Implantação deste incremento depende do gate completo do GitHub Actions, ainda em validação.

Ainda faltam as demais partes do plano: portfólio/compartilhamento, IA de interpretação com orçamento/cotas, atribuição comercial/estornos/ledgers, recompensas/pagamentos registrados, conteúdo/oportunidades/push e piloto com aparelhos. As etapas de proposta e serviços aqui não representam a conclusão de toda a etapa 3.

PWA preparado com manifesto próprio, worker Workbox restrito a `/parceiros/`, precache explícito do shell público (21 arquivos, aproximadamente 620 KB nesta revisão), proteção no-cache para worker/manifest e orçamento máximo de 2 MiB no build. APIs, documentos e imagens de clientes não são cacheados. Sem conexão, apresenta estado claro e não afirma que pedidos foram enviados. Orientação de instalação Android/iPhone e aplicação de atualização por ação explícita, desabilitada durante edição. Código das rotas passa a carregar sob demanda; entrada JS reduzida de 1,1 MB para 347 KB antes de gzip. Não há novo serviço residente na VPS.

Build, TypeScript e lint aprovados; navegador Chromium local confirmou shell offline real e ausência de API/uploads no cache. Transporte sintético usado apenas nessa inspeção local de interface; integração no GitHub consulta PostgreSQL/API reais e testa registro do worker, cache e reconexão. Validação física de instalação Android/iPhone e atualização entre releases permanece pendente. Offline nesta entrega permite abrir o shell; formulários/calculadora e rascunhos offline ainda estão nas etapas seguintes.

Obras/ambientes e PWA instalável com cache seguro; fichas técnicas/motor de pintura e pisos; IA com cotas e proposta comercial; indicações/eventos/ledger; recompensas e relacionamento. A fundação não equivale à conclusão do plano. Câmera física, instalação/push Android/iOS e testes pagos dependem de validação específica posterior.
