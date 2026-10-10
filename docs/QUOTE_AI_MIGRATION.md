# Migração da leitura de orçamentos para APIs chinesas

## Resultado e escopo

A leitura de fotos passa a chamar diretamente DeepSeek Flash e Qwen3-VL Flash/Plus. OpenRouter e inferência local foram retirados da execução. PaddleOCR, modelos baixados, subprocessos, requisitos Python e bibliotecas gráficas de OCR saíram da imagem de produção. Python continua somente no estágio de compilação de dependências nativas, sem modelos de IA.

O formato do orçamento, catálogo, banco, rascunhos, foto original, revisão, envio, histórico, atendimento e permissões foram preservados. Os nomes dos motores antigos permanecem no normalizador apenas para compatibilidade com dados e testes históricos; não existe chamada que execute esses motores. Configurações antigas OpenRouter são ignoradas, sem apagar dados históricos.

## Auditoria de ponta a ponta

| Etapa | Comportamento e proteção |
| --- | --- |
| Captura | Câmera/upload e recorte no navegador. Jscanify/OpenCV faz tratamento de imagem, não inferência de IA; permanece para melhorar a foto. Entrada manual funciona sem API. |
| Upload | Apenas imagens, limite existente de 5 MB, persistência da foto e criação do rascunho no PostgreSQL antes da leitura. PDFs continuam fora do escopo já suportado. |
| Trabalho em segundo plano | Reivindicação atômica PENDING → PROCESSING evita duas leituras do mesmo trabalho. Fila global de até 20 aguardando, espera máxima de 60 segundos, três leituras simultâneas compartilhadas com testes do admin. |
| Preparação | JPEG até 1800 × 1800, rotação EXIF, sem ampliar imagens pequenas, até 40 milhões de pixels de entrada. Foto original permanece preservada. |
| Provedor | Endpoint HTTPS oficial fixo, Bearer secreto, redirecionamentos proibidos, modelos com visão. Uma chamada por provedor, sem repetição cega após timeout. |
| Consumo | Saída padrão 2500 tokens, configurável entre 512 e 8000. Timeout padrão 30 s por provedor, entre 10 e 45 s. Reserva opcional; no máximo duas chamadas por lista e orçamento total de 80 segundos, incluindo fila, abaixo do limite de espera da tela (90 segundos). Pensamento desativado. |
| Prompt | Extração de produtos/quantidades, sem dados de cabeçalho, medidas não confundidas com quantidades. JSON explícito; instruções presentes no documento não são comandos. Catálogo enviado somente quando até 100 entradas e 10000 caracteres, evitando contexto caro. |
| Resposta | JSON obrigatório, geração completa, 1–150 itens, produtos não vazios, quantidades finitas positivas até 1000000. IDs aceitos somente quando pertencem ao catálogo efetivamente enviado. Resposta truncada falha, sem salvar lista incompleta. |
| Associação | Catálogo consultado uma vez; associação exata ou aproximada local usa nomes e sinônimos existentes, sem inferência. Texto de modelos de visão não recebe substituições de caracteres de OCR raster. Baixa confiança da leitura não vira alta confiança só por conter um ID válido. |
| Persistência | Itens e estado atualizados em transação. Resultado tardio não sobrescreve edição manual. Uma edição que cancela OCR também impede nova chamada ao provedor reserva. Provedor, modelo, duração e tokens do resultado aceito registrados em OcrRun. |
| Falha | Documento/rascunho preservados. Cliente pode digitar/revisar, reenviar foto ou encaminhar a foto para conferência da loja. Nenhum motor local é iniciado. |
| Revisão/envio | Quantidades e produtos continuam editáveis. Token, validade, status e propriedade continuam condicionando edição/envio. |
| Admin | Integrações em três etapas: conectar, definir limites, testar. Chaves AES-256-GCM, gravação atômica, nunca devolvidas pela API; campo vazio mantém e remoção exige seleção explícita. Apenas usuários com integrations:manage. |
| Saúde | Endpoint de saúde informa configuração, não inventa disponibilidade/saldo. Teste de conexão usa operações sem geração; teste de foto usa a cadeia real e pode consumir saldo. |

## Plano priorizado executado

1. P0 — Provedores diretos e proteção de documentos/chaves: DeepSeek + Qwen, validação, fallback manual, endpoints fixos e configuração criptografada.
2. P0 — Integridade: manter transações, tokens e proteção contra OCR tardio; preservar revisão e imagem original.
3. P1 — VPS: retirar inferência local, downloads de modelos, dependências Python do runtime e scripts de comparação/bridge locais.
4. P1 — Custo: modelos Flash, pensamento desativado, limites de entrada/saída, uma chamada por provedor, concorrência/fila limitada e reserva opcional.
5. P1 — Operação: tela de configuração/teste, saúde honesta, tokens registrados e documentação de ativação.
6. P1 — Validação: testes unitários de protocolo e falhas, configuração/permissões no PostgreSQL isolado, execução completa da leitura/associação/persistência com transporte remoto simulado e upload HTTP sem chave, garantindo preservação da foto.

## Escolha de modelos e preços

DeepSeek Flash aceita imagens na API oficial atual, conforme o [guia de visão](https://api-docs.deepseek.com/guides/vision/). A resposta estruturada segue o [modo JSON](https://api-docs.deepseek.com/guides/json_mode/). Qwen3-VL Flash foi escolhido como alternativa econômica com visão; Plus fica disponível para listas difíceis. O modelo deve existir na região da chave.

O endpoint Qwen é o DashScope internacional da região Singapura. A documentação oficial informa que o domínio existente permanece funcional após a introdução de domínios dedicados: [visão compatível com OpenAI](https://www.alibabacloud.com/help/en/model-studio/qwen-vl-compatible-with-openai). JSON em modo sem pensamento é suportado nas séries Qwen3-VL: [saída estruturada](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output).

Não fixamos valores de cobrança no código: preços dependem de modelo, região, faixa de contexto e alterações do fornecedor. Consulte [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/) e [Alibaba Cloud](https://www.alibabacloud.com/help/en/model-studio/model-pricing). Tokens de entrada incluem imagem e catálogo, além do texto. O limite configurado é de saída, não um teto monetário. Limites de saldo/gasto devem ser definidos também na conta do fornecedor. Reserva pode gerar cobrança mesmo quando a primeira tentativa não retorna resposta utilizável. A telemetria de tokens registra a resposta aceita; não deve ser usada como fatura completa de tentativas descartadas. costUsd permanece nulo, sem estimativas enganosas.

## Ativação em três passos

1. Admin → Integrações: cadastrar chave DeepSeek e/ou chave Qwen da região Singapura. Nunca enviar chaves pelo chat ou adicionar ao Git.
2. Escolher o principal, a reserva e os limites; ativar a leitura automática e salvar. A API permite só um provedor quando não há necessidade de reserva.
3. Testar conexão e depois uma foto real. Conferir produtos e quantidades antes de disponibilizar para clientes. Testes com transporte simulado não comprovam saldo, acesso ao modelo ou qualidade real de caligrafia.

Sem uma chave válida e saldo, a integração fica preparada, mas a leitura remota não está ativada; orçamento manual e encaminhamento da foto continuam funcionando. Nenhuma chave OpenRouter é reutilizada em outro fornecedor.

## Medições e validação

Antes da migração, em produção: imagem API 3365136615 bytes (3,36 GB decimais); RAM API em repouso 57,56 MiB, web 5,05 MiB, PostgreSQL 60,22 MiB. Repouso não mede pico de PaddleOCR. Comparar tamanho após deploy; não prometer economia de RAM/latência em carga sem amostra equivalente.

28 testes unitários passaram. Build do frontend, TypeScript dos dois aplicativos, lint, textos pt-BR e configurações de infraestrutura validados localmente. O workflow único mantém builds no GitHub, imagens GHCR e deploy condicionado a testes isolados, preservação de uploads, restauração de backup e rollback. A chamada paga real depende das chaves cadastradas no painel.

## Resultado publicado

Deploy aprovado no [workflow 38085900606](https://github.com/fernandinhomartins40/rebequi/actions/runs/38085900606), revisão de código a4aa27a8df4dfa572903259fae5cd6cf9850ad22, em 10/10/2026. Passaram os 28 testes unitários da API e os 17 cenários integrados (18 resultados incluindo o agrupador), além de uploads/recriação, backup/restauração e rollback.

Verificação somente de leitura na VPS após deploy: API, web e PostgreSQL saudáveis; endpoint /api/health respondeu ok; runtime sem Python; configuração contém DeepSeek Flash e Qwen3-VL Flash sem chaves, leitura automática desativada conforme solicitação de preparar os provedores antes da contratação.

Imagem API antes: 3365136615 bytes; depois: 812379915 bytes. Redução de 75,9% no tamanho da imagem ativa. Imagens anteriores podem permanecer para rollback; isso não representa liberação automática de todo esse espaço no disco da VPS. RAM da API após inicialização: 40,2 MiB. A comparação de RAM em repouso não comprova ganho sob carga nem qualidade de leitura.

As chaves serão cadastradas pelo usuário em Admin → Integrações. A leitura paga real, o saldo e a qualidade sobre listas manuscritas ainda dependem desse cadastro e do teste de foto disponível na própria tela. Não foram feitos testes pagos nem recebidas chaves pelo chat.
