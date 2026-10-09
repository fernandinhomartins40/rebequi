# Relatório de implementação

## Resultado de produto

Rebequi mantém o catálogo de materiais de construção, atendimento por WhatsApp e orçamento por foto. As melhorias selecionadas reduzem trabalho nos fluxos já existentes:

| Oportunidade | Antes | Depois |
|---|---|---|
| OP-01: pedidos | Pedido existia no backend, sem acesso no painel do cliente | Meus pedidos mostra referência, situação, itens, observações do cliente e conversa; repetir adiciona produtos disponíveis ao carrinho com preço e estoque atuais para revisão |
| OP-02: lista digitada | Digitação dependia de foto e falha de OCR | Digitar lista → revisar → enviar; quantidades e produtos são reconhecidos usando o catálogo real, sem executar OCR |
| OP-03: recuperar trabalho | Atualização do orçamento sobrescrevia edição; wizard guardava apenas cópia local | Gravação automática no PostgreSQL, backup temporário das edições, recuperação da leitura após reload e preservação do editor durante refresh |
| OP-04: identificação | Cliente conectado precisava repetir nome e WhatsApp | Identificação preenchida pela sessão; conta existente exige login com retorno ao rascunho |
| OP-05: pendências | Alerta exigia procurar novamente o produto | Corrigir abre diretamente o editor do produto, respeitando permissão de catálogo |

## Segurança e integridade

- Conta existente só pode ser reutilizada com sessão do próprio cliente; conta desativada não é reativada pelo fluxo público. Novas senhas temporárias são aleatórias; senhas existentes foram preservadas.
- Documentos de leads e atualização de pedidos exigem sessão e proprietário. Notas internas não são devolvidas na listagem do cliente.
- Sessões consultam o estado ativo e o papel atual do usuário. Cache privado é limpo na troca de conta e logout.
- Substituição dos itens e envio do rascunho usam transação e condição de token/status/validade. Falha na inserção preserva os itens anteriores. Uma resposta tardia de OCR não altera a lista manual.
- Correção de um travamento no carregador OpenCV: o módulo possui `then` que retorna o próprio módulo; resolver uma Promise com esse objeto gerava assimilação recursiva. O carregador resolve apenas a disponibilidade, e a detecção inicia após a câmera abrir.

## Validação e publicação

Validações locais: textos pt-BR/UTF-8, tipos compartilhados, TypeScript do backend e frontend, lint, 18 testes existentes, build frontend, actionlint, ShellCheck e contrato de produção. Navegador Edge real confirmou entrada manual em 320 px sem rolagem horizontal. Permanecem 15 avisos antigos do lint e o aviso de tamanho do bundle.

O mesmo workflow executa builds paralelos, integração com imagens de produção/PostgreSQL real e testes Chromium antes do deploy. Playwright está isolado em `tests/product`, fora dos workspaces e do contexto Docker. Nenhuma API é simulada. Dados sintéticos e mutações de teste ficam restritos ao runner descartável, com recusa explícita fora dele.

A primeira integração revelou o travamento do OpenCV e confirmou isolamento entre clientes, desativação/papel atual, rollback de itens, histórico de pedidos e link de catálogo. Após a correção, downloads Docker Hub retornaram 429 também na repetição; os builds e a obtenção do PostgreSQL de teste passaram a usar o mirror público, sem alterar a configuração da VPS.

Validação final aprovada no [workflow 37992058557](https://github.com/fernandinhomartins40/rebequi/actions/runs/37992058557), revisão `c02af864d80ad89f24876107b93973c61217673c`. Os 11 cenários de produto passaram (12 resultados incluindo o agrupador), sem falhas: autenticação/propriedade, desativação/papel atualizado, rollback de itens/expiração/OCR tardio, lista manual/autosave/reload em 320, 390, 768, 1024 e 1440 px, histórico/repetição, preenchimento/envio autenticado/editor em refresh e editor de catálogo. OCR real, uploads, recriação, restauração de backup e rollback do deploy também passaram.

CORS do runner foi ajustado exclusivamente para sua origem local, sem simular API nem relaxar produção. As seis capturas do artefato `product-browser-evidence` foram obtidas; telas de revisão mobile/desktop e pedidos mobile foram inspecionadas. A inspeção revelou um nome truncado em 320 px; a correção foi implementada e toda a integração repetida, confirmando nome completo sem rolagem horizontal.

A entrada manual foi conferida em Edge nos dois domínios públicos, sem gravar dados de teste na VPS. Tentativa anônima de alterar pedido retornou 401. Uma amostra de repouso registrou aproximadamente 94 MiB de memória nos três contêineres; não é um benchmark de carga.

Publicação final concluída com sucesso pelo mesmo workflow. Em 09/10/2026 às 21:20 UTC, consultas somente de leitura confirmaram o SHA `c02af864d80ad89f24876107b93973c61217673c` na API e no frontend público, HTTPS saudável, três contêineres saudáveis, zero reinicializações e nenhum OOM. Documentação final enviada diretamente à `main`; não exige novo deploy porque o workflow ignora alterações exclusivamente em Markdown.

## Limites e continuidade

- A recuperação anônima mantém o prazo existente de 24 horas e requer o token no navegador; não oferece sincronização entre dispositivos.
- Repetir pedido prepara o carrinho para revisão e não confirma nova compra. Indisponibilidade ou redução de estoque é informada.
- OCR/OpenRouter, preços, promoções, persistência e regras comerciais existentes foram mantidos; testes não acionam OpenRouter com custo externo.
- Câmera física e permissões específicas de iOS/Android não são comprovadas por Chromium/Edge desktop. A alternativa de digitação e upload permanece disponível.
- Paginação das listas administrativas e divisão do bundle são oportunidades futuras, não implementadas nesta entrega. Não houve mudança destrutiva de schema nem novos serviços residentes na VPS.
- Commits e pushes foram feitos diretamente na `main`; os dois protocolos locais do usuário permaneceram fora dos commits.
