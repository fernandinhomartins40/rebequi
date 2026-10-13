# Piloto do aplicativo de entregas

## Preparação

Usar contas de motorista e cliente destinadas ao piloto, materiais identificados e recebedor informado. Criar venda/romaneio pelo painel apenas com autorização da loja para aquela operação: os registros movimentam estoque na venda e geram auditoria real. Não usar pedidos de clientes reais como massa de teste. Não divulgar senha, endereço, foto ou nome do recebedor em relatórios públicos.

Validar primeiro no navegador do aparelho, depois instalado. Registrar data, versão publicada, modelo do aparelho, versão do sistema/navegador e resultado por cenário. Android: Chrome; iPhone: Safari. Não considerar o piloto concluído apenas pelo teste automatizado de Chromium.

## 1. Instalar e abrir

Entrar como motorista em `/painel-lojista/painel/entregas`. Usar “Instalar aplicativo”; se o navegador não oferecer instalação, seguir a orientação de adicionar à tela inicial. Abrir pelo ícone e confirmar o painel de entregas da conta correta. Reabrir e verificar login quando necessário. Conta cliente ou outro perfil não deve obter tarefas privadas de motorista.

Resultado esperado: nome/ícone Rebequi Entregas, texto legível, controles acessíveis sem rolagem horizontal, somente entregas atribuídas à conta. “Como chegar” deve abrir o endereço conferido no aplicativo/navegador de mapas por ação do motorista. A Rebequi não promete coordenadas verificadas, ETA, restrições de caminhão ou rastreamento contínuo.

## 2. Conferir e registrar

Usar romaneio pago, conferido, carregado e com saída registrada. Registrar recebimento parcial: materiais → recebedor → confirmação física. Conferir saldo no painel da equipe e no pedido do cliente. Tentar quantidade acima do saldo e conferir rejeição. Registrar impedimento apenas na parada correspondente. Retornar fisicamente materiais não recebidos ao depósito antes de confirmar retorno, conferir e preparar outra viagem com o saldo restante.

Foto é opcional. Quando autorizada pelo recebedor: abrir histórico → escolher/recortar → confirmar consentimento → anexar. Conferir dimensões, abertura e legibilidade. Não fotografar documentos pessoais ou pessoas sem necessidade. Outro cliente e usuário sem sessão não podem abrir a foto, mesmo conhecendo o link. Confirmar que a última entrega mostra “Rota encerrada” e sai da fila de pendências.

Resultado esperado: nenhum recebimento presumido, baixa de estoque duplicada ou dados de outra parada no histórico do cliente. Correção financeira/devolução usa o fluxo próprio; não editar histórico de recebimento ou remover provas para corrigir quantidade.

## 3. Interromper e retomar a conexão

Na confirmação de entrega, ativar modo avião. Confirmar aviso e botão desabilitado, mantendo formulário aberto. Voltar à conexão: formulário permanece, nenhuma solicitação é enviada automaticamente; conferir e confirmar explicitamente. Separadamente, abrir o aplicativo sem conexão: deve mostrar aviso público, sem endereços, fotos ou dados privados recuperados de cache.

Com outra conta de piloto, desativar o motorista pela gestão enquanto seu aparelho está offline. Ao reconectar, a sessão deve perder acesso; não pode enviar recebimento. Reativação e novo login são decisões da gestão. Em uma atualização publicada, confirmar que a aplicação oferece atualização explícita e não recarrega durante formulário ou envio.

Resultado esperado: perda de conexão nunca confirma entrega. Falha de resposta após envio exige consultar saldo/histórico antes de tentar novamente; não presumir sucesso ou falha só pela ausência de resposta. A API revalida sessão, versão e intenção para impedir duplicação.

## Registro de aprovação

| Aparelho e sistema | Navegador | Versão da aplicação | Instalação | Recebimento/foto | Offline/reconexão | Revogação | Responsável e data |
|---|---|---|---|---|---|---|---|
| Android — pendente | Chrome — pendente | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| iPhone — pendente | Safari — pendente | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |

Qualquer falha exige descrição do cenário, resultado esperado/obtido e versão. Guardar evidências privadas em local autorizado pela loja. Piloto só aprovado com resultados registrados nos dois sistemas e correções verificadas; este documento não registra aprovação por si só.
