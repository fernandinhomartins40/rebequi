# Auditoria — Sistema de Pedidos, Câmera ao Vivo e Integração OpenRouter

**Data:** 25/07/2026
**Escopo:** fluxo de solicitação de orçamento (pedido) ponta a ponta — captura por câmera, OCR/IA, detecção de produtos, revisão pelo cliente e recebimento pelo lojista.
**Repositório:** monorepo `rebequi` (`apps/frontend`, `apps/backend`, `packages/shared`)

---

## 1. Sumário executivo

O sistema tem uma base melhor do que aparenta. O scanner ao vivo (`LiveDocumentScanner`) já é moderno de verdade: detecção de contorno em tempo real com OpenCV + jscanify, correção de perspectiva, captura automática por estabilidade e countdown. O wizard público (`RequestQuote`) já é enxuto — 3 passos, mobile-first, linguagem simples. **O problema não é o design; é que a camada de inteligência por trás dele está quebrada em produção e existe um segundo fluxo paralelo, antigo e confuso, competindo com o novo.**

Os quatro problemas estruturais:

1. **A cadeia de OCR não funciona em produção.** O fallback PaddleOCR nunca roda no servidor real (o Dockerfile instala `python3` mas nunca instala PaddleOCR). Se o OpenRouter estiver desligado ou falhar, o pedido morre com `ocrStatus: FAILED`.
2. **A integração OpenRouter é frágil e "meio real".** Ela existe e chama a API de verdade, mas com timeout curto demais para VLM, sem structured outputs, sem retry, sem observabilidade e com uma lista de modelos que envelhece sozinha.
3. **A detecção de produtos perde precisão por bugs concretos**, não por limitação de abordagem — principalmente o dicionário de sinônimos, que hoje quase nunca dispara.
4. **Existem dois fluxos de pedido diferentes**, com componentes, UX e qualidade distintas. O usuário leigo esbarra no pior deles dependendo de por onde entrar.

---

## 2. Mapa do sistema atual

### 2.1 Os dois caminhos (a raiz da confusão)

| | **Caminho A — público** | **Caminho B — cliente logado** |
|---|---|---|
| Rota | `/solicitar-orçamento` | `/painel-cliente?tab=quotes` |
| Página | [RequestQuote.tsx](apps/frontend/src/pages/RequestQuote.tsx) | [CustomerQuotesPanel.tsx](apps/frontend/src/components/CustomerQuotesPanel.tsx) |
| Captura | `LiveDocumentScanner` (moderno) | `QuoteDocumentCaptureCard` (antigo) |
| Detecção de borda | Sim, ao vivo | Não |
| Captura automática | Sim | Não |
| Correção de perspectiva | Sim | Não |
| Passos até enviar | 3 telas guiadas | Painel denso, 4 cards, 2 colunas |
| Endpoint | `POST /quotes/public/document` | `POST /quotes/me/document` |

Os dois fazem a mesma coisa com código totalmente separado. **Toda melhoria precisa hoje ser feita duas vezes** — e na prática só foi feita no caminho A.

O `QuoteDocumentCaptureCard` ainda carrega complexidade morta: um `WebcamModal` próprio (reimplementação inferior do scanner), heurística de `pointer: coarse` para decidir entre `getUserMedia` e `<input capture>`, dois inputs de arquivo ocultos, e um passo de confirmação extra ("preview → botão criar rascunho") que o caminho A não tem.

### 2.2 Fluxo de dados (caminho A, o bom)

```
ContactScreen (WhatsApp + nome)
  └─ POST /quotes/public/start ......... cria Lead + User provisório
LiveDocumentScanner
  └─ OpenCV + jscanify: detecta papel → estabiliza 18 frames → countdown 3s
     → extractPaper() corrige perspectiva → JPEG 0.92
  └─ POST /quotes/public/document ...... cria Quote(ocrStatus=PENDING) e RETORNA JÁ
ProcessingScreen
  └─ polling GET /quotes/me a cada 1500ms até ocrStatus sair de PENDING/PROCESSING
ReviewScreen ......................... edita itens (qtd +/-, nome, remover)
  └─ PUT /quotes/:id  +  POST /quotes/:id/submit
DoneScreen
```

O job de OCR roda em background via `setTimeout(..., 0)` em [quote.service.ts:496](apps/backend/src/services/quote.service.ts#L496). Bom para latência percebida, mas **é memória do processo**: se o backend reiniciar durante o processamento, o pedido fica preso em `PROCESSING` para sempre. Não há retry nem dead-letter.

### 2.3 Cadeia de reconhecimento

[quote-ocr.service.ts](apps/backend/src/services/quote-ocr.service.ts):

```
recognizeDocument(buffer)
  ├─ OpenRouter habilitado e com chave?
  │    ├─ tenta primaryModel   → se lines.length > 0, retorna
  │    ├─ tenta fallbackModel  → se lines.length > 0, retorna
  │    └─ ambos falharam → segue
  └─ PaddleOCR local (via subprocess Python)
```

Depois, `parseItemsFromRecognition` ([quote.service.ts:562](apps/backend/src/services/quote.service.ts#L562)) transforma linhas em itens: descarta ruído, separa metadados (nome/telefone/endereço) para `customerNote`, extrai quantidade+unidade por regex e faz matching contra o catálogo.

---

## 3. Achados críticos

### 🔴 C1 — ~~PaddleOCR não existe em produção~~ → **CORRIGIDO: análise inicial estava errada**

> **Retificação (25/07/2026).** A versão original deste item afirmava que o
> PaddleOCR nunca era instalado em produção. **Isso estava errado.** A conclusão
> se baseou em [Dockerfile.vps](Dockerfile.vps), que é **arquivo morto** — nenhum
> compose, script ou workflow o referencia.
>
> O deploy real (`.github/workflows/deploy-production.yml` →
> `docker-compose.production.yml`) usa [apps/backend/Dockerfile](apps/backend/Dockerfile),
> que é Debian (`node:20-bookworm-slim`) e **instala `paddlepaddle==3.0.0` +
> `paddleocr`** no estágio de produção. O fallback local existe de verdade.

**O que continua sendo problema real (menor, mas concreto):**

Os modelos do PaddleOCR não eram pré-carregados na imagem. Como o download só
acontece na primeira instanciação, o primeiro orçamento de cada container novo
pagaria ~30s de download de pesos — com boa chance de estourar o
`QUOTE_PADDLE_TIMEOUT_MS` justamente quando um cliente está esperando. Resolvido
com um passo `--warmup` no build.

**Lição de método:** existiam dois Dockerfiles divergentes e nada indicava qual
estava vivo. Auditar a partir do arquivo errado produziu um achado "crítico"
falso. O `Dockerfile.vps` recebeu um cabeçalho marcando-o como obsoleto.

### 🔴 C1b — Migrations nunca rodaram em produção; o deploy escondia isso com `db push --accept-data-loss`

Descoberto ao instrumentar o deploy (25/07/2026). É o achado mais grave desta auditoria.

**Não existia migration de baseline.** Nenhuma das 10 migrations criava `users`,
`products`, `categories`, `product_images` ou `settings` — o banco original
nasceu de um `prisma db push`. Consequências, verificadas contra um Postgres 16 real:

- Em banco **novo**: `migrate deploy` morria na primeira migration com
  `42P01: relation "products" does not exist`.
- Em **produção** (schema existe, `_prisma_migrations` vazia): morria com
  `P3005: The database schema is not empty`.

E o `docker-compose.production.yml` reagia assim:

```
if npx prisma migrate deploy; then ... else
  npx prisma db push --accept-data-loss;   # ← aqui
fi
```

Ou seja: **toda migration falhava, sempre, e o deploy caía silenciosamente em
`db push --accept-data-loss`** — que sincroniza o schema dropando o que estiver
no caminho, sem perguntar e sem falhar o build. O deploy reportava sucesso.

Isso significa que (a) o histórico de migrations era decorativo, e (b) qualquer
mudança destrutiva de schema podia apagar dados de produção sem deixar rastro.

**Correção:** criada a migration `20260326000000_baseline` (idempotente, com
`IF NOT EXISTS`), criado `apps/backend/scripts/migrate-deploy.sh` que faz
baseline de banco legado e aplica as pendentes, e **removido o fallback para
`db push`**. Validado contra Postgres real nos dois cenários — banco vazio e
banco com dados sem histórico — com `migrate diff` acusando drift zero.

### 🔴 C2 — Timeout de 12s é curto demais para VLM

`DEFAULTS.timeoutMs = 12_000` ([integration-settings.service.ts:28](apps/backend/src/services/integration-settings.service.ts#L28)).

Modelos de visão no tier `:free` do OpenRouter frequentemente ficam em fila. Uma foto de lista em 2200px vira ~1500-2500 tokens de imagem; o tempo até o primeiro token pode passar de 12s sozinho, sem contar a geração. E a mesma constante é aplicada aos dois modelos em sequência — o cliente espera 24s e recebe falha, quando uma única tentativa com 45s teria funcionado.

Agravante: `max_tokens: 1500` sem streaming. Uma lista longa pode ser truncada no meio do JSON → parse falha → o modelo é considerado "falho" e a cadeia inteira cai.

### 🔴 C3 — Dicionário de sinônimos praticamente nunca dispara

Esse é o bug que mais custa precisão hoje. Em [quote-text-normalizer.ts:262](apps/backend/src/services/quote-text-normalizer.ts#L262):

```ts
export function resolveSynonym(normalized: string): string {
  return CONSTRUCTION_SYNONYMS[normalized] ?? normalized;
}
```

É um lookup de **string inteira**. O dicionário tem ~150 entradas cuidadosamente escritas (`'cimento' → 'cimento portland cp ii'`, `'vergalhao' → 'vergalhão ca-50'`, …) e elas só funcionam se a linha inteira normalizada for exatamente a chave.

Na prática o OCR devolve `"5 sc cimento"` ou `"cimento 50kg"`, nunca `"cimento"` puro. Resultado: **o dicionário inteiro é código morto na esmagadora maioria dos casos**. Todo o trabalho de domínio embutido ali não chega ao matching.

Pior: `resolveSynonym` é chamado dentro de `normalizeDomainText`, que por sua vez é chamado dentro de `domainTokenize` — que é chamado dentro de `blendedSimilarity`, dentro do laço sobre o catálogo. Ou seja, além de não funcionar, ele roda milhares de vezes por pedido.

### 🔴 C4 — Matching é O(linhas × catálogo) com normalização redundante

`findBestProductMatch` ([quote.service.ts:638](apps/backend/src/services/quote.service.ts#L638)) percorre o catálogo inteiro por linha. Para cada produto, ele recalcula `normalizeText(product.name)`, `normalizeDomainText(product.name)` e `domainTokenize(product.name)` — **do zero, toda vez**. Dentro de `blendedSimilarity`, `domainTokenize` roda de novo nos dois lados.

Com 20 linhas e 2.000 produtos: 40.000 iterações, cada uma com várias normalizações Unicode + regex + `Set`. E `lcsLength` (exportada, O(m×n) com alocação de matriz) está disponível mas nem é usada.

O catálogo é imutável durante o processamento de um pedido — deveria ser pré-normalizado **uma vez**.

### 🟠 C5 — Sem structured outputs; parsing de JSON por regex

O prompt pede "Retorne EXCLUSIVAMENTE JSON" e depois o código tenta desesperadamente resgatar ([quote-ocr.service.ts:200](apps/backend/src/services/quote-ocr.service.ts#L200)):

```ts
const cleaned = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
try { parsed = JSON.parse(cleaned); }
catch { const match = cleaned.match(/\{[\s\S]*\}/); /* ... */ }
```

O OpenRouter suporta `response_format: { type: 'json_schema', json_schema: {...} }` com `strict: true` em boa parte dos modelos, o que elimina essa classe inteira de falha. Não está sendo usado.

### 🟠 C6 — O modelo não devolve quantidade estruturada; regex reparse tudo

O prompt manda o modelo retornar `text` com "quantidade e unidade quando presente" **dentro da string**, e aí o backend usa regex (`QTY_BEGINNING_RE`, `QTY_SUFFIX_RE`) para extrair de volta. É jogar fora informação que o modelo já tinha.

O VLM consegue devolver `{ "quantidade": 5, "unidade": "sc", "produto": "cimento CP-II" }` diretamente, com muito mais acerto que regex — especialmente em casos como `"2 caixas de porcelanato 60x60"` onde a heurística `INLINE_SIZE_RE` precisa desambiguar `60x60` de quantidade, ou `"tinta 18L"` onde `18` não é quantidade.

### 🟠 C7 — Catálogo não é enviado ao modelo

O prompt é genérico e não sabe o que a loja vende. O modelo lê `"cim CP2"` e devolve `"cim CP2"`; o matching fuzzy depois tenta adivinhar. Se o catálogo (ou os N produtos mais prováveis) fosse enviado como contexto, o próprio modelo faria a associação com muito mais precisão — é exatamente a tarefa em que VLMs são bons.

### 🟠 C8 — Lista de modelos hardcoded e desatualizando

[integrations.tsx:42-52](apps/frontend/src/pages/merchant-dashboard/integrations.tsx#L42) fixa:

```ts
const FREE_VISION_MODELS = ['qwen/qwen2.5-vl-72b-instruct:free', 'google/gemini-2.0-flash-exp:free', ...]
```

Modelos `:free` do OpenRouter aparecem e somem constantemente. `google/gemini-2.0-flash-exp:free` já é um modelo experimental antigo. O endpoint `GET /api/v1/models` já é chamado no `testOpenRouter()` — os dados estão lá, só são descartados (o código guarda `sampleModels: models.slice(0,5)` e joga o resto fora). O lojista deveria escolher de uma lista real e filtrada por capacidade de visão.

### 🟠 C9 — Sem observabilidade da IA

Não há registro de qual modelo atendeu, quanto custou, quanto demorou, quantos itens saíram, quantos o cliente corrigiu. `RecognizedQuoteDocument` até carrega `engine` e `modelId`, mas **eles são descartados** — `runOcrJob` só persiste `ocrText`, `ocrConfidence` e `ocrError`. Não há coluna no schema para isso.

Sem isso é impossível responder "o OpenRouter está valendo a pena?" ou "qual modelo acerta mais?".

### 🟡 C10 — Rota com acento e caractere não-ASCII

[App.tsx:63](apps/frontend/src/App.tsx#L63): `<Route path="/solicitar-orçamento" ...>`

URL com `ç` vira `%C3%A7` ao ser compartilhada, quebra em alguns clientes de WhatsApp, atrapalha SEO e é impossível de ditar por telefone. Deveria ser `/pedido` — mais curto e mais claro que "solicitar-orçamento" para um público leigo.

### 🟡 C11 — Job em memória, sem retry nem persistência

`scheduleOcrJob` usa `setTimeout`. Restart do processo = pedidos órfãos em `PROCESSING`. O polling do frontend fica girando indefinidamente (`refetchInterval: 1500` sem limite de tentativas), sem timeout nem mensagem de escape para o usuário.

### 🟡 C12 — `enqueue()` serializa todos os pedidos globalmente

[quote-ocr.service.ts:324](apps/backend/src/services/quote-ocr.service.ts#L324): uma fila única encadeada por promise. Faz sentido para PaddleOCR (subprocess pesado, CPU-bound), mas **estrangula o OpenRouter**, que é I/O de rede e poderia rodar em paralelo. Com 5 clientes simultâneos, o quinto espera as quatro chamadas anteriores terminarem — potencialmente 2 minutos.

### 🟡 C13 — OpenCV.js vindo de CDN externa

[opencv-loader.ts:8](apps/frontend/src/lib/opencv-loader.ts#L8): `https://docs.opencv.org/4.8.0/opencv.js` — ~8MB, sem SRI, sem versão travada localmente, dependendo da disponibilidade do site da OpenCV. Se o CDN cair ou for bloqueado, o scanner ao vivo morre e cai no `<input capture>` genérico.

### 🟡 C14 — Sem feedback de qualidade antes de gastar a chamada

O scanner detecta borda e estabilidade, mas não avalia **nitidez** (blur) nem **iluminação**. Uma foto tremida é enviada, consome uma chamada de IA, demora 20s e volta vazia. Um teste de variância do Laplaciano no frame (OpenCV já está carregado) resolveria isso em tempo real, antes da captura.

### 🟡 C15 — Correções de OCR agressivas demais

[quote-text-normalizer.ts:29-31](apps/backend/src/services/quote-text-normalizer.ts#L29):

```ts
[/cao\b/gi, 'ção'],
[/ao\b(?=\s|$)/gi, 'ão'],
```

Isso transforma `"cao"` → `"ção"` mas também quebra palavras legítimas terminadas em "ao"/"cao". E `[/\s*-\s*/g, '-']` colapsa `"tubo - 100mm"` em `"tubo-100mm"`, o que **atrapalha a tokenização** logo depois. Essas regras foram escritas para saída de PaddleOCR e são contraproducentes quando a fonte é um VLM, que já entrega texto limpo e acentuado — mas são aplicadas aos dois indiscriminadamente.

### 🟡 C16 — `confidence` mistura escalas incomparáveis

Em `parseItemsFromRecognition`:

```ts
confidence: Number(((match.score + line.confidence / 100) / 2).toFixed(2))
```

`match.score` é similaridade fuzzy [0,1]; `line.confidence` do OpenRouter é um número que o **próprio modelo inventou** (e o código default é `90` quando ausente). Média aritmética de duas coisas não comparáveis. Esse valor não é exibido em lugar nenhum no frontend — nem para o cliente nem para o lojista — então hoje é só ruído armazenado.

Isso é uma oportunidade perdida importante: **o cliente leigo não sabe quais itens são chute do sistema e quais são certeza**, então precisa reler todos.

---

## 4. Análise de UX — por que está confuso para o leigo

### 4.1 O que já está bom (preservar)

- Wizard de 3 passos com uma decisão por tela.
- Linguagem correta: "Confira sua lista", "Enviar 5 itens para a loja", "A loja vai responder no seu WhatsApp".
- Captura automática — o usuário não precisa nem apertar o botão.
- Controles de quantidade `+/-` (sem teclado numérico).
- `ProcessingScreen` com mensagens rotativas e skeletons — a espera parece menor.

### 4.2 Fricções reais

**F1 — Pedir WhatsApp antes de qualquer valor entregue.**
A primeira tela é um formulário. O usuário ainda não viu nada funcionar e já está sendo cobrado por dado pessoal. É o ponto clássico de maior abandono. A foto é a parte mágica e barata — deveria vir primeiro.

**F2 — Não dá para ver a foto na tela de revisão.**
`ReviewScreen` mostra só a lista de itens. Se o sistema leu "cimento" e o usuário escreveu "cimento branco", ele não tem como conferir sem voltar e refazer a foto inteira (`onBack={() => setStep('scan')}` descarta tudo).

**F3 — "Refazer foto" descarta o trabalho.**
Botão destrutivo, sem confirmação, no canto superior esquerdo — exatamente onde fica o "voltar" que o usuário aperta por reflexo.

**F4 — Todos os itens parecem igualmente confiáveis.**
Sem distinção visual entre "casou com produto do catálogo" e "não fazemos ideia, é o texto cru". O cliente precisa auditar 100% da lista.

**F5 — Sem sugestão de produto ao editar.**
`ItemRow` é um `<input>` de texto livre com placeholder "Ex: cimento, areia, tijolo…". Não há autocomplete contra o catálogo — mesmo com o catálogo já disponível no backend e com um `PublicProductSearch` já existente no projeto.

**F6 — Erro de OCR leva a beco sem saída.**
Se `ocrStatus === 'FAILED'`, o usuário cai na `ReviewScreen` com uma linha vazia e o aviso "Não conseguimos identificar os itens automaticamente. Adicione manualmente abaixo — é rapidinho." Digitar 15 itens no celular não é "rapidinho" — é onde o pedido é abandonado.

**F7 — Painel do cliente é um mundo separado.**
Quem entra por `/painel-cliente` encontra 4 cards de métricas ("Total", "Rascunhos", "Em leitura", "Em análise"), grid de 2 colunas, histórico com scroll — e uma captura pior. "Em leitura — OCR rodando em segundo plano" expõe jargão técnico a um cliente final.

**F8 — Sem persistência local.**
Todo o estado do wizard vive em `useState`. Refresh, ligação recebida, ou o navegador descartando a aba em background = perde tudo, inclusive a foto já tirada.

---

## 5. Viabilidade de simplificação

**Sim, é viável — e a maior parte é remoção de código, não adição.**

| Mudança | Esforço | Impacto |
|---|---|---|
| Unificar em um único componente de captura | Baixo | Alto |
| Foto primeiro, WhatsApp só ao enviar | Baixo | **Muito alto** (conversão) |
| Corrigir sinônimos (substring/token) | Baixo | **Muito alto** (precisão) |
| Pré-computar catálogo normalizado | Baixo | Alto (performance) |
| Structured outputs + qty estruturada | Médio | **Muito alto** (precisão) |
| Enviar catálogo como contexto ao modelo | Médio | Muito alto |
| Fallback real (Tesseract.js ou imagem Debian) | Médio | **Crítico** |
| Sinais de confiança na UI | Baixo | Alto |
| Autocomplete de produtos na revisão | Médio | Alto |
| Foto lado a lado na revisão | Baixo | Alto |
| Observabilidade da IA | Médio | Médio |

O fluxo mínimo viável para o cliente leigo é de **dois toques**: abrir → apontar a câmera (captura sozinha) → conferir → enviar. O WhatsApp entra como último passo, quando o valor já foi demonstrado.

---

## 6. Riscos

| Risco | Severidade | Situação |
|---|---|---|
| OCR completamente indisponível se OpenRouter cair | 🔴 Crítica | Sem mitigação real hoje |
| Quota de modelo `:free` esgotada em pico | 🔴 Crítica | Sem detecção de 429 nem backoff |
| Pedidos presos em `PROCESSING` após restart | 🟠 Alta | Sem recuperação |
| Modelo hardcoded descontinuado pelo OpenRouter | 🟠 Alta | Falha silenciosa para o lojista |
| Custo de IA sem teto | 🟠 Alta | Sem tracking nem limite |
| CDN da OpenCV indisponível | 🟡 Média | Degrada para input básico |
| Chave de API exposta se `ENCRYPTION_KEY` vazar | 🟡 Média | Criptografia existe e está correta |

Nota positiva: a criptografia da chave ([crypto.util.ts](apps/backend/src/utils/crypto.util.ts) via `encryptSecret`/`decryptSecret`) e o mascaramento no retorno público (`maskSecret`, `toPublic` removendo `apiKey`) estão bem implementados. A chave nunca vaza para o frontend.

---

## 7. O que está bem feito

Vale registrar para não ser refatorado por engano:

- **`LiveDocumentScanner`** — detecção de contorno, estabilidade por 18 frames, countdown, correção de perspectiva A4, limpeza de `Mat` do OpenCV no `finally`, cleanup de stream no unmount. É código de qualidade.
- **Persistência da configuração no banco** com criptografia, em vez de env vars — o lojista configura sozinho, sem deploy.
- **Job assíncrono com polling** — o upload responde rápido, a leitura acontece depois. Arquitetura correta.
- **Separação de metadados** (`looksLikeMetadataLine`) — tirar nome/telefone/endereço da lista de itens e jogar em `customerNote` é uma decisão de produto acertada.
- **`blendedSimilarity`** — combinar cobertura de tokens + trigramas + Jaccard é uma abordagem sólida; o problema está nos dados que chegam nela, não nela.
- **Rate limiting** (`uploadLimiter`) nos endpoints de upload.

---

## 8. Conclusão

O sistema não precisa ser reescrito. Ele precisa de:

1. **Uma rede de segurança de OCR que exista de fato** (hoje é a falha mais grave).
2. **A integração OpenRouter levada a sério**: structured outputs, timeout realista, retry com backoff, catálogo como contexto, modelos vindos da API e telemetria.
3. **Correção de 3 bugs pontuais de alto impacto** na detecção: sinônimos por substring, catálogo pré-computado e quantidade vinda estruturada do modelo.
4. **Um único fluxo**, com foto antes de cadastro e sinais claros de confiança para o cliente leigo.

O plano de execução está em [PLANO_MODERNIZACAO_PEDIDOS.md](PLANO_MODERNIZACAO_PEDIDOS.md).
