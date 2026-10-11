# Câmera e orçamento: auditoria e correções

Data: 10/10/2026. Branch: main. Deploy: GitHub Actions, GHCR.

## Diagnóstico

A câmera usava gerenciamento próprio de MediaStream e OpenCV/jscanify em cada frame de vídeo completo. Uma imagem escolhida na galeria dependia somente de onload: falhas de decodificação não tinham saída. O campo anunciado como galeria tinha capture=environment, que pode forçar a câmera nativa. Faltava conferir a foto antes da chamada paga.

Consulta somente de leitura em produção encontrou uma foto persistida com OCR FAILED. Portanto, houve uma falha posterior ao upload; não é correto atribuir tudo à câmera. GET /models confirmou deepseek-flash disponível. GET /user/balance confirmou saldo disponível, sem geração de tokens. Os logs antigos descartavam o motivo específico do erro. Não se pode determinar retroativamente a causa dessa leitura com esses logs.

## Biblioteca escolhida

| Opção open source | Uso e decisão |
| --- | --- |
| [react-webcam, MIT](https://github.com/mozmorris/react-webcam) | Escolhida para captura: eventos de stream/erro, constraints, integração React e liberação do stream ao desmontar, inclusive quando a permissão resolve tarde. Captura e prévia testadas em Chrome. |
| [react-camera-pro, MIT](https://github.com/purple-technology/react-camera-pro) | Alternativa focada em mobile; captura com o aspecto da visualização. A aplicação precisa preservar a lista inteira, sem corte pela proporção da tela. |
| [jscanify](https://github.com/puffinsoft/jscanify) + OpenCV | Mantidos como melhoria opcional para bordas, perspectiva e captura automática; não são OCR nem requisito para enviar uma imagem. |

Nenhuma biblioteca contorna as permissões/HTTPS do navegador. Há alternativas separadas pela câmera nativa, galeria e lista digitada. A escolha é adequada a esta aplicação, não uma afirmação de que existe uma biblioteca universalmente superior em todos os aparelhos.

## Plano priorizado implementado

1. P0: captura com react-webcam, timeout e liberação da câmera; galeria com tratamento de erro e timeout. Prévia e confirmação antes do upload. Repetir a captura não consome tokens.
2. P0: validar bytes e dimensões no backend antes de guardar a imagem e iniciar leitura; separar feedback de envio e análise. Cliente converte formatos decodificáveis para JPEG e reduz o maior lado a 1800px, até 5MB. Formatos não decodificáveis apresentam erro, sem ficar presos.
3. P0: preservar linhas repetidas, nomes curtos como cal/PVC e quantidades; evitar vincular automaticamente variantes do catálogo com pontuações muito próximas. Clientes continuam revisando e corrigindo todos os itens antes de enviar. Digitar outro nome limpa o ID anterior, tanto no pedido quanto no painel do cliente; selecionar uma sugestão associa o novo produto.
4. P1: detecção de bordas limitada a 4fps e maior lado de 640px; captura final usa a resolução disponível. Retirar a distorção fixa A4 da extração automática; usar a proporção estimada do papel. Prévia permite repetir se a borda estiver errada.
5. P1: prompt compacto, JSON com chaves curtas, nenhum catálogo na chamada. O catálogo e os aliases continuam sendo usados uma vez no servidor para associação; preços são do catálogo, não da IA.
6. P1: erros seguros específicos de chave, saldo, limite, timeout, lista vazia e saída truncada. Lista vazia ou truncada não dispara reserva, evitando uma segunda cobrança que não resolve o limite de saída. Não guardar listas parciais. Não registrar chave, foto, prompt ou corpo bruto do provedor nos logs.
7. P1: teste de conexão DeepSeek consulta saldo sem gerar tokens. Reserva opcional e edição manual continuam protegidas contra resultados tardios e novas chamadas após edição.

## Modelo e custo

Mantido deepseek-flash com pensamento desativado: a chave existente está funcional, o modelo está disponível nessa conta e a [documentação oficial](https://api-docs.deepseek.com/guides/vision/) confirma visão e JSON. Qwen3-VL Flash/Plus permanecem configuráveis com uma chave internacional de Singapura. Não trocar automaticamente de conta, região ou modelo mais caro.

[Preços DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/): na consulta, entrada sem cache US$0,15–0,30 e saída US$0,60–1,20 por milhão de tokens, conforme horário. Exemplo estimado com 1500 tokens de entrada e 500 de saída: US$0,000525–0,00105 por leitura, sem reserva. Não é uma medição de faturamento. [Preços Qwen](https://www.alibabacloud.com/help/en/model-studio/model-pricing) variam por modelo/região; conferir no console antes de trocar. Não houve benchmark pago entre provedores para declarar um vencedor em qualidade de manuscritos.

Uma imagem por chamada. Mantido detail=high no DeepSeek: low reduz para 512px e pode perder letras pequenas. JPEG menor reduz transferência; não equivale diretamente à redução de tokens de visão. Limite de saída continua configurável (padrão 2500); não inclui entrada/imagem. Salvar, editar, restaurar e enviar a lista não acionam a IA novamente. O teste de foto do admin apresenta o consumo real retornado pelo provedor.

## Comparação e validação

- Prompt base: 909 → 637 caracteres; JSON do mesmo item de exemplo: 129 → 69 caracteres. Catálogo retirado independentemente do tamanho. São medidas de caracteres, não tokens faturados.
- Limite de amostragem: de vídeo inteiro a cada frame para no máximo 640px a 4fps. Isso reduz o trabalho de detecção; não foi medido como percentual de CPU em um telefone físico.
- 35 testes do backend passaram localmente, incluindo JSON compacto, quantidades/medidas, duplicatas, associação ambígua, falhas de provedor, saldo e cancelamento da reserva.
- Chrome local com câmera sintética: captura, prévia, stream encerrado, repetir foto e erro de galeria passaram.
- CI exercita upload JPEG real, arquivo persistido usado no transporte de IA simulado, extração/associação, revisão, envio e recebimento no admin. Também cobre câmera negada, formatos inválidos, autosave, propriedade, edição tardia e recuperação do banco. Nenhuma chave de produção é usada no CI.
- Testes automatizados com transporte simulado não medem qualidade real da leitura de manuscritos. Validação paga do provedor exige aprovação, conforme AGENTS.md. Compatibilidade física com iOS/Android depende de teste nesses aparelhos.
