# Aplicativos Cliente, Vendas e Entregas

Página pública de escolha: `/aplicativos/`. Também acessível pelo rodapé da loja e pelos links nos painéis de cliente/vendedor. No painel do motorista, o botão existente leva ao instalador de Entregas.

| App | Instalador público | Início após instalação | Escopo |
| --- | --- | --- | --- |
| Rebequi Cliente | `/painel-cliente/instalar/` | `/painel-cliente` | `/painel-cliente` |
| Rebequi Vendas | `/painel-lojista/instalar/` | `/painel-lojista/painel/atendimentos` | `/painel-lojista` |
| Rebequi Entregas | `/painel-lojista/painel/entregas/instalar/` | `/painel-lojista/painel/entregas` | `/painel-lojista/painel/entregas` |

Cada aplicativo possui manifesto, ID, ícones PNG/Apple, nome e service worker próprios. O ID e o endereço legado do manifesto de Entregas são preservados para instalações existentes. O worker de Entregas tem escopo mais específico que o de Vendas; não se substituem. O PWA de parceiros permanece intacto.

Os instaladores são HTML públicos gerados no build, com manifesto correto desde o carregamento inicial. Não dependem de login ou troca dinâmica do manifesto da página de escolha. A confirmação de instalação sempre identifica o aplicativo selecionado.

Android: Chrome pode exibir o convite nativo após `beforeinstallprompt`. Na ausência dele (por exemplo, já instalado, navegador incompatível ou convite dispensado), o instalador orienta usar o menu do navegador. iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início → manter Abrir como App da Web, quando disponível → Adicionar. O site não pode confirmar a instalação pelo usuário no iOS. Navegadores embutidos em mensageiros podem exigir abrir no navegador do dispositivo.

Instalações separadas não criam novos usuários, permissões ou bancos. Reutilizam os painéis e APIs reais; o usuário entra com a conta autorizada. Conforme navegador/plataforma, sessões do mesmo domínio podem ser compartilhadas. Instalar Vendas ou Entregas não concede acesso a esses papéis. A instalação não é uma publicação em Play Store/App Store.

Cache: somente um aviso público de falta de conexão por app. Sem cache de API, HTML autenticado, fotos, sessão ou fila de escritas offline. Consulta e operação exigem internet; nada é enviado automaticamente ao reconectar. Novas versões de worker aguardam o encerramento das janelas anteriores, sem recarga forçada durante edição. Entregas mantém seu mecanismo de atualização explícita já existente.

Build: `npm run build --workspace=apps/frontend`; geração em `scripts/build-apps-pwa.mjs`. Ícones vetoriais originais e PNGs ficam em `public/aplicativos/`. Nginx entrega instaladores e manifestos com política de atualização e protege os caminhos SPA contra diretórios criados pelos instaladores.

Validação automatizada: três manifestos/IDs/ícones, leitura do manifesto pelo Chromium, workers por escopo, cache offline, entrada SPA, interfaces estreitas e instruções iOS. Eventos de convite aceito/cancelado são simulados apenas para testar a interface; instalação nativa real em Android/iOS exige confirmação em dispositivo físico e não é alegada por esses testes.

Referências oficiais: [Google — instalação](https://web.dev/learn/pwa/installation), [Google — manifesto](https://web.dev/learn/pwa/web-app-manifest), [Apple — adicionar app web](https://support.apple.com/guide/iphone/iphea86e5236/ios).
