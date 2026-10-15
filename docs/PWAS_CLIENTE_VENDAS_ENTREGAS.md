# Aplicativos Cliente, Vendas e Entregas

## Instalador simplificado e ícones em imagem

Cada instalador exibe uma única identidade (ícone, nome e descrição), um botão principal e o link Abrir sem instalar. A ajuda fica recolhida em Como instalar. No iOS, uma linha curta orienta Compartilhar → Adicionar à Tela de Início, e o botão abre as instruções mantendo a identificação do app. No Android/Chromium, o botão chama `prompt()` do evento `beforeinstallprompt` quando disponível: a confirmação do navegador é obrigatória; o site não instala silenciosamente. Convite indisponível, cancelamento e app instalado têm estados próprios, sem anunciar instalação concluída antes do evento `appinstalled`.

Novas artes originais em imagem para Cliente, Vendas e Entregas, com nomes de arquivo versionados `icon-v2-*` para preservar compatibilidade e evitar ícones antigos em cache. Cada pasta `public/aplicativos/{cliente,vendedor,entregas}/` contém PNGs quadrados de 32, 48, 96, 152, 167, 180, 192, 512 e 1024 px; PNG maskable 512 separado com margem adicional; favicon ICO com 32/48 px; prévia WebP 256 px. O manifesto referencia PNGs 192/512 com purpose=any e o arquivo maskable 512 com purpose=maskable. Metadados Apple usam PNGs 152/167/180. Os IDs e acessos foram preservados; start_url e escopos foram separados conforme a migração abaixo. Navegadores/SO controlam quando instalações existentes atualizam seus ícones.

Referências: [Google — convite de instalação](https://web.dev/learn/pwa/installation-prompt), [Google — ícones e área segura](https://web.dev/learn/pwa/web-app-manifest).

## Instalação simultânea e migração do aplicativo antigo

Os três apps usam escopos independentes: `/apps/cliente`, `/apps/vendas` e `/apps/entregas`. O PWA geral usa `/loja/`, com o ID original `/` preservado. Não há app abrangendo o escopo de outro. A configuração compartilhada fica em `apps/frontend/pwa-apps.json`; `BrowserRouter` usa o prefixo como `basename`, preservando telas, links, login e permissões existentes. A resposta HTML das rotas de cada app já contém o manifesto e o ícone Apple corretos, inclusive antes de autenticar.

O aplicativo antigo instalado com escopo `/` pode bloquear os convites dos outros apps até o Chrome atualizar seu manifesto. Para migrar imediatamente, desinstale apenas essa instalação antiga, abra `/aplicativos/` diretamente no Chrome e instale os aplicativos desejados. Contas, pedidos, vendas e permissões permanecem no servidor. Não é necessário apagar os dados do navegador. O site não consegue remover ou alterar instantaneamente o registro de um PWA no dispositivo.

Essa causa foi reproduzida em Chromium: após instalar o PWA geral antigo, os três instaladores deixaram de receber `beforeinstallprompt`, apesar de nenhum erro de instalabilidade. A documentação do Chrome descreve esse conflito para [escopos aninhados](https://web.dev/articles/building-multiple-pwas-on-the-same-domain).

O teste `tests/product/pwa-coexistence.mjs` usa perfil descartável e instala o PWA geral corrigido e os três apps em sequência. Exige eventos reais (`isTrusted`), verifica o botão chamando `prompt()` e mantém os quatro apps instalados no mesmo perfil antes de removê-los ao finalizar. A confirmação humana é substituída por `PWA.install` do protocolo de testes do Chromium. O workflow roda esse teste com `xvfb-run`; isso verifica coexistência no Chromium, sem alegar download WebAPK ou instalação em Android físico.

Página pública de escolha: `/aplicativos/`. Também acessível pelo rodapé da loja e pelos links nos painéis de cliente/vendedor. No painel do motorista, o botão existente leva ao instalador de Entregas.

| App | Instalador público | Início após instalação | Escopo |
| --- | --- | --- | --- |
| Rebequi Cliente | `/apps/cliente/instalar/` | `/apps/cliente/painel-cliente` | `/apps/cliente` |
| Rebequi Vendas | `/apps/vendas/instalar/` | `/apps/vendas/painel-lojista/painel/atendimentos` | `/apps/vendas` |
| Rebequi Entregas | `/apps/entregas/instalar/` | `/apps/entregas/painel-lojista/painel/entregas` | `/apps/entregas` |

Cada aplicativo possui manifesto, ID, ícones PNG/Apple, nome e service worker próprios. IDs e endereço legado do manifesto de Entregas são preservados. Os links antigos dos instaladores redirecionam para os novos. Os workers têm escopos independentes. O PWA de parceiros permanece intacto.

Os instaladores são HTML públicos gerados no build, com manifesto correto desde o carregamento inicial. Não dependem de login ou troca dinâmica do manifesto da página de escolha. A confirmação de instalação sempre identifica o aplicativo selecionado.

No iOS, cada instalador destaca o aplicativo selecionado e mostra uma prévia com o ícone Apple e o nome completo que deve ser conferido no Safari. Título HTML, título Apple, `name` e `short_name` do manifesto usam o mesmo nome. As instruções Android ficam ocultas no iPhone/iPad. O usuário é orientado a cancelar se a confirmação mostrar outro aplicativo e a trocar pela página de escolha. A página de escolha informa que Adicionar à Tela de Início deve ser feito somente na página do aplicativo selecionado. O nome continua editável na confirmação do próprio iOS, e o sistema pode abreviar o rótulo na Tela de Início.

Android: Chrome pode exibir o convite nativo após `beforeinstallprompt`. Na ausência dele (por exemplo, já instalado, navegador incompatível ou convite dispensado), o instalador orienta usar o menu do navegador. iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início → manter Abrir como App da Web, quando disponível → Adicionar. O site não pode confirmar a instalação pelo usuário no iOS. Navegadores embutidos em mensageiros podem exigir abrir no navegador do dispositivo.

Instalações separadas não criam novos usuários, permissões ou bancos. Reutilizam os painéis e APIs reais; o usuário entra com a conta autorizada. Conforme navegador/plataforma, sessões do mesmo domínio podem ser compartilhadas. Instalar Vendas ou Entregas não concede acesso a esses papéis. A instalação não é uma publicação em Play Store/App Store.

Cache: somente um aviso público de falta de conexão por app. Sem cache de API, HTML autenticado, fotos, sessão ou fila de escritas offline. Consulta e operação exigem internet; nada é enviado automaticamente ao reconectar. Novas versões de worker aguardam o encerramento das janelas anteriores, sem recarga forçada durante edição. Entregas mantém seu mecanismo de atualização explícita já existente.

Build: `npm run build --workspace=apps/frontend`; geração em `scripts/build-apps-pwa.mjs`. Ícones vetoriais originais e PNGs ficam em `public/aplicativos/`. Nginx entrega instaladores e manifestos com política de atualização e protege os caminhos SPA contra diretórios criados pelos instaladores.

Validação automatizada: três manifestos/IDs/ícones, leitura do manifesto pelo Chromium, workers por escopo, cache offline, entrada SPA, interfaces estreitas e instruções iOS. Eventos de convite aceito/cancelado são simulados apenas para testar a interface; instalação nativa real em Android/iOS exige confirmação em dispositivo físico e não é alegada por esses testes.

Referências oficiais: [Google — instalação](https://web.dev/learn/pwa/installation), [Google — manifesto](https://web.dev/learn/pwa/web-app-manifest), [Apple — adicionar app web](https://support.apple.com/guide/iphone/iphea86e5236/ios).
