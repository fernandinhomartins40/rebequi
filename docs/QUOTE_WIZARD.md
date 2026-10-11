# Solicitação de orçamento em três etapas

O fluxo em `/pedido` separa a captura, a conferência dos produtos e o envio para a loja. Uma ação principal por tela, progresso visível e o padrão amarelo/vermelho da loja.

1. **Sua lista:** escolher foto, galeria ou digitação. A câmera só abre por escolha do cliente. A prévia permite conferir e repetir a foto antes do upload e da chamada à IA.
2. **Conferência:** somente os produtos, com nome, quantidade, unidade e ações visíveis para editar, adicionar ou remover. Quantidade pode ser digitada diretamente. Linhas incertas são destacadas. Um item vazio precisa ser preenchido ou removido antes de avançar.
3. **Envio:** WhatsApp com DDD, nome opcional e resumo recolhido da lista. Voltar preserva os ajustes. O botão solicita o orçamento; preços e disponibilidade são confirmados pela loja.

`WizardLayout` e seu CSS concentram cabeçalho, progresso, título, foco ao mudar de etapa e rodapé de ação. O scanner ocupa a tela inteira e oferece prévia e recorte antes de enviar. A entrada de novos orçamentos no painel do cliente também leva a esse assistente, sem abrir a captura antiga. O painel mantém o acompanhamento e a edição dos pedidos existentes.

O rascunho mantém itens, etapa e dados de contato no mesmo armazenamento local com validade de 24 horas. Atualizar a página recupera a etapa; rascunhos antigos continuam compatíveis. Voltar entre conferência e envio ou editar dados não chama a IA. A lógica de leitura, autenticação, persistência e envio do servidor é preservada.

Validação local em Chromium, com transporte simulado e câmera sintética: 320, 390, 768 e 1440 pixels; início sem câmera, prévia antes de upload, galeria sem solicitar câmera, edição, item vazio, WhatsApp incompleto, restauração da etapa/dados, retorno à lista e envio único. Evidências visuais revisadas. Os testes de produto do CI exercitam o mesmo assistente com as APIs e o banco isolados reais, sem usar chaves de produção.

O painel do cliente também foi reorganizado: lista de pedidos agrupados por orçamento, revisão dos rascunhos separada do resumo de envio e detalhes opcionais recolhidos. Validado em 320, 390, 768 e 1440 pixels, com preservação da edição ao voltar e entrada de novos pedidos pelo assistente compartilhado.

Cadastro obrigatório antes de qualquer captura ou chamada de IA: nome e WhatsApp criam um acesso rápido com sessão automática; clientes existentes precisam entrar. Upload, leitura, edição e envio verificam sessão CUSTOMER e propriedade do rascunho. O contato final é o da conta autenticada. Um cliente provisório pode definir a primeira senha sem a atual; o servidor exige CUSTOMER, isProvisional e mustChangePassword simultaneamente. Após a troca, a senha atual volta a ser obrigatória. Nenhuma conta administrativa recebe essa exceção.
