# Plano de Modernização — Sistema de Pedidos

**Base:** [AUDITORIA_SISTEMA_PEDIDOS.md](AUDITORIA_SISTEMA_PEDIDOS.md)
**Objetivo:** um fluxo único, que funcione de verdade em produção, com detecção de produtos precisa e simples o bastante para um cliente leigo usar sem instrução.

---

## Princípio norteador

> **Dois toques e pronto.** Abrir → apontar a câmera (ela captura sozinha) → conferir → enviar.
> Tudo que não couber nisso é opcional, adiado ou removido.

Decisões de produto que guiam o plano:

1. **A foto vem antes do cadastro.** O WhatsApp só é pedido no momento de enviar, quando o cliente já viu a lista lida na tela.
2. **O cliente não audita, ele confirma.** O sistema mostra o que tem certeza e destaca só o que precisa de atenção.
3. **Nunca deixar o cliente sem saída.** Se a IA falhar, existe fallback; se o fallback falhar, existe caminho manual assistido — nunca uma tela de erro seca.
4. **Um só código de captura.** Melhoria feita uma vez, vale para todos os caminhos.

---

## Fase 0 — Emergencial: fazer o OCR existir em produção

> Sem isso, tudo o mais é irrelevante. Hoje, com OpenRouter desligado ou fora do ar, **nenhum pedido é lido**.

### 0.1 Fallback de OCR que funcione na imagem real

Resolve **C1**. Duas opções — recomendo a **A**.

**Opção A (recomendada) — Tesseract.js no backend, em Node.**
- Sem Python, sem subprocess, sem mudar imagem Docker, funciona em Alpine.
- Qualidade em manuscrito é baixa, mas em **lista impressa é aceitável** — e o papel dele é ser rede de segurança, não motor principal.
- Adicionar `tesseract.js` + traineddata `por` empacotado localmente (não baixar em runtime).

**Opção B — trocar Alpine por `node:20-slim` (Debian) e instalar PaddleOCR de verdade.**
- Qualidade muito superior em manuscrito.
- Custo: imagem passa de ~200MB para ~2.5GB, build lento, mais RAM na VPS.
- Só vale se a VPS tiver folga e o manuscrito for realmente crítico offline.

**Ações:**
- Criar `LocalOcrEngine` como interface, com implementação `TesseractOcrEngine`.
- Substituir a chamada direta a PaddleOCR em `recognizeDocument` pela interface.
- Manter `PaddleOcrEngine` como implementação alternativa selecionável por env (`QUOTE_LOCAL_OCR_ENGINE=tesseract|paddle`).
- Ajustar o texto de [integrations.tsx:406](apps/frontend/src/pages/merchant-dashboard/integrations.tsx#L406) para descrever o que realmente acontece.

### 0.2 Health check honesto da cadeia de OCR

Endpoint `GET /quotes/admin/ocr-health` retornando o estado real de cada motor:

```json
{
  "openrouter": { "enabled": true, "hasKey": true, "reachable": true, "lastError": null },
  "local":      { "engine": "tesseract", "available": true },
  "degraded":   false
}
```

Exibir no topo da página de integrações como um banner. Se `degraded: true`, o lojista **precisa** saber antes que os clientes reclamem.

### 0.3 Recuperar pedidos órfãos

Resolve **C11**.
- Ao subir o backend, marcar como `FAILED` todo `QuoteRequest` com `ocrStatus IN (PENDING, PROCESSING)` e `updatedAt` mais antigo que 10 minutos.
- Adicionar `ocrAttempts Int @default(0)` ao schema; permitir até 2 reprocessamentos automáticos.
- No frontend, limitar o polling a ~90s e então oferecer saída explícita ("Continuar preenchendo à mão" / "Tentar de novo").

**Entregável da Fase 0:** nenhum pedido morre por indisponibilidade de IA.

---

## Fase 1 — Fazer a integração OpenRouter funcionar de verdade

### 1.1 Structured outputs

Resolve **C5**, **C6**. Trocar o prompt de "devolva JSON, por favor" por contrato de schema:

```ts
response_format: {
  type: 'json_schema',
  json_schema: {
    name: 'lista_de_compras',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['itens', 'tipo_documento'],
      properties: {
        tipo_documento: { type: 'string', enum: ['impresso', 'manuscrito', 'misto'] },
        itens: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['produto', 'quantidade', 'unidade', 'confianca', 'texto_original'],
            properties: {
              produto:        { type: 'string' },
              quantidade:     { type: 'number' },
              unidade:        { type: ['string', 'null'] },
              confianca:      { type: 'number' },   // 0..1
              texto_original: { type: 'string' },
              produto_id:     { type: ['string', 'null'] }  // ver 1.3
            }
          }
        }
      }
    }
  }
}
```

Ganhos:
- Elimina o resgate por regex de bloco `{...}`.
- **A quantidade vem separada do nome** — a regex `QTY_BEGINNING_RE`/`QTY_SUFFIX_RE` deixa de ser o caminho principal e vira apenas fallback para o motor local.
- `texto_original` permite mostrar ao cliente o que estava escrito no papel.

Manter o parser tolerante atual como fallback para modelos que ignorarem `json_schema`.

### 1.2 Timeout, retry e concorrência realistas

Resolve **C2**, **C12**.
- Default de timeout: **12s → 45s**. Faixa permitida: 10s a 120s.
- Retry com backoff exponencial **apenas** para 429/5xx/timeout: 2 tentativas, 1s → 3s, com jitter.
- Ler o header `Retry-After` em 429 e respeitar.
- **Remover a fila global `enqueue()` do caminho OpenRouter** — é I/O de rede. Trocar por um semáforo de concorrência (ex.: 4 simultâneos). A serialização fica só no motor local, onde faz sentido.
- Habilitar `stream: true` para poder abortar cedo e evitar truncamento por `max_tokens`. Subir `max_tokens` para 4000.

### 1.3 Enviar o catálogo como contexto

Resolve **C7** — esta é a maior alavanca de precisão do plano.

Em vez de o modelo devolver texto solto para o fuzzy adivinhar depois, ele recebe o catálogo e faz a associação:

```
Produtos disponíveis nesta loja (use o id exato quando reconhecer):
[c1a2] Cimento Portland CP-II 50kg
[c1a3] Argamassa Colante AC-I 20kg
[c1a4] Tinta Acrílica Fosca 18L
...

Para cada item, se corresponder a um produto acima, devolva produto_id.
Se não corresponder a nenhum, devolva produto_id: null e transcreva o texto como está.
Nunca invente um id que não esteja na lista.
```

Estratégia por tamanho de catálogo:
- **Até ~300 produtos:** enviar todos (~6k tokens, aceitável).
- **Acima disso:** duas passadas — (1) transcrição pura, (2) resolução dos nomes contra um subconjunto pré-filtrado pelo matching fuzzy atual (top 5 candidatos por linha). O fuzzy vira um filtro barato, e o modelo faz a decisão final.

Validar **sempre** no backend que o `produto_id` devolvido existe no catálogo — jamais confiar cegamente (risco de alucinação).

### 1.4 Modelos vindos da API, não hardcoded

Resolve **C8**.
- Endpoint `GET /integrations/openrouter/models` que consome `GET /api/v1/models`, filtra por `architecture.input_modalities` contendo `image`, e retorna id, nome, preço e flag de gratuito.
- Cache de 1h no backend.
- Na UI, trocar o `<datalist>` + chips fixos por um `<Select>` com busca, agrupado em "Gratuitos" / "Pagos", mostrando o preço por milhão de tokens.
- Se o modelo salvo não estiver mais na lista, exibir alerta explícito.

### 1.5 Teste de conexão que testa o que importa

Hoje `testOpenRouter` só lista modelos — não prova que o modelo escolhido lê imagem. Adicionar "Testar leitura real": envia uma imagem de lista de exemplo (embutida no projeto), roda a cadeia completa e mostra os itens extraídos, o tempo e o custo. É a única forma de o lojista confirmar que está funcionando.

### 1.6 Observabilidade e custo

Resolve **C9**. Nova tabela:

```prisma
model OcrRun {
  id             String   @id @default(cuid())
  quoteRequestId String
  quoteRequest   QuoteRequest @relation(fields: [quoteRequestId], references: [id], onDelete: Cascade)
  engine         String   // 'openrouter' | 'tesseract' | 'paddle'
  modelId        String?
  success        Boolean
  durationMs     Int
  promptTokens   Int?
  completionTokens Int?
  costUsd        Float?
  itemsDetected  Int
  itemsMatched   Int
  itemsEditedByCustomer Int?   // preenchido no submit
  errorMessage   String?
  createdAt      DateTime @default(now())

  @@index([quoteRequestId])
  @@index([createdAt])
}
```

O OpenRouter devolve `usage` na resposta — basta persistir. `itemsEditedByCustomer` (diff entre o que a IA gerou e o que o cliente enviou) é **a métrica de qualidade real** do sistema.

Painel simples no dashboard: taxa de sucesso por modelo, custo do mês, tempo médio, % de itens corrigidos.

### 1.7 Teto de custo

- Config `monthlyBudgetUsd`. Ao atingir, desligar OpenRouter automaticamente, cair no motor local e notificar o lojista.

---

## Fase 2 — Detecção de produtos mais eficiente

### 2.1 Corrigir o dicionário de sinônimos

Resolve **C3** — bug de maior impacto/esforço do plano.

Trocar o lookup de string inteira por substituição por token/n-grama:

```ts
// Índice construído uma vez, ordenado por nº de tokens (mais longo primeiro)
const SYNONYM_ENTRIES = Object.entries(CONSTRUCTION_SYNONYMS)
  .sort((a, b) => b[0].split(' ').length - a[0].split(' ').length);

export function resolveSynonyms(normalized: string): string {
  let result = normalized;
  for (const [variant, canonical] of SYNONYM_ENTRIES) {
    // limite de palavra, para não casar dentro de outra palavra
    const re = new RegExp(`(?<![a-z0-9])${escapeRegex(variant)}(?![a-z0-9])`, 'g');
    result = result.replace(re, canonical);
  }
  return result;
}
```

Assim `"5 sc cimento"` vira `"5 sc cimento portland cp ii"` e finalmente casa com o catálogo. Aplicar a ordenação por n-gramas longos primeiro para `"argamassa colante"` ganhar de `"argamassa"`.

Cobrir com testes unitários — este dicionário é ativo valioso e precisa deixar de ser código morto.

### 2.2 Pré-computar o catálogo

Resolve **C4**. Normalizar uma vez, no início de `parseItemsFromRecognition`:

```ts
type IndexedProduct = {
  product: CatalogProduct;
  normalizedName: string;
  domainName: string;
  tokens: string[];
  tokenSet: Set<string>;
  trigrams: Set<string>;
  normalizedSku: string;
  categoryTokens: string[];
};
```

Ganhos: elimina milhares de normalizações redundantes por pedido; `blendedSimilarity` passa a receber tokens prontos em vez de recalcular; `tokenSet` troca `Array.includes` (O(n)) por `Set.has` (O(1)).

Cachear o índice em memória com invalidação por `updatedAt` máximo do catálogo.

### 2.3 Filtro invertido antes do scan linear

Índice `token → produtos` construído junto com 2.2. Para cada linha, buscar só os produtos que compartilham ao menos um token relevante, em vez de varrer o catálogo inteiro. Reduz o espaço de busca em ~90% em catálogos grandes.

### 2.4 Normalização condicional por motor

Resolve **C15**. `applyOcrCorrections` foi escrita para PaddleOCR e prejudica saída de VLM.

- Aplicar as correções de confusão de caractere (`0→o`, `1→l`, `rn→m`) **apenas** quando `engine !== 'openrouter'`.
- Remover `[/\s*-\s*/g, '-']` do caminho de tokenização (colar hífen atrapalha o split).
- Revisar `[/cao\b/gi, 'ção']` e `[/ao\b/gi, 'ão']` — restringir a uma allowlist de palavras conhecidas em vez de regra genérica.

### 2.5 Confiança em escala única e útil

Resolve **C16**. Definir explicitamente:

| Origem | Confiança |
|---|---|
| `produto_id` devolvido pelo modelo e validado no catálogo | 0.95 |
| SKU exato encontrado na linha | 1.00 |
| Nome do produto contido na linha | 0.90 |
| Fuzzy ≥ 0.75 | score do fuzzy |
| Fuzzy 0.42–0.75 | score do fuzzy, marcado como "revisar" |
| Sem match (texto livre) | 0.30 |

E então **usar isso na UI** (ver 3.4). Confiança que não é exibida é confiança desperdiçada.

### 2.6 Aprender com as correções do cliente

Quando o cliente editar o nome de um item ou trocar o produto na revisão, gravar o par `(texto_original → produto_id escolhido)`. Após N ocorrências do mesmo par, promovê-lo a alias permanente do produto — o sistema fica mais preciso sozinho, com o vocabulário real dos clientes daquela loja.

---

## Fase 3 — Frontend simples para o cliente leigo

### 3.1 Um único componente de captura

Resolve o problema estrutural dos dois caminhos.

- **Eliminar `QuoteDocumentCaptureCard`** e o `WebcamModal` interno.
- `LiveDocumentScanner` passa a ser o único ponto de captura, usado tanto no wizard público quanto no painel do cliente.
- Manter o `<input type="file" capture>` apenas como fallback interno do scanner (já existe: "Já tenho a foto").
- Remover a heurística `pointer: coarse` — o scanner funciona igual em desktop e mobile.

Isso remove ~200 linhas de código duplicado e garante detecção de borda e captura automática em **todos** os caminhos.

### 3.2 Inverter a ordem: foto antes do cadastro

Resolve **F1** — maior ganho de conversão do plano.

Fluxo novo:

```
1. /pedido → abre a câmera direto (com uma frase e um botão "Tirar foto da lista")
2. Captura automática
3. Processando (a IA lê)
4. Revisão — o cliente vê a lista pronta
5. Só aqui: "Para onde mandamos o orçamento?" → WhatsApp → Enviar
6. Pronto
```

Impacto no backend: criar `POST /quotes/public/anonymous-document`, que aceita a imagem sem lead, cria a Quote com `userId: null` e devolve um token de rascunho anônimo de vida curta. O lead é criado no submit, quando o WhatsApp chega. Requer `userId` opcional em `QuoteRequest` e uma rotina de limpeza de rascunhos anônimos não enviados após 24h.

Rascunhos anônimos abandonados também viram sinal de negócio para o lojista ("14 pessoas fotografaram uma lista e não enviaram").

### 3.3 Rota limpa

Resolve **C10**. `/solicitar-orçamento` → **`/pedido`**. Manter redirect 301 da antiga.

### 3.4 Revisão com sinais de confiança

Resolve **F4**. Três estados visuais claros, sem jargão:

- ✅ **Encontrado no catálogo** (confiança ≥ 0.75) — nome do produto, borda neutra, sem chamar atenção.
- ⚠️ **Confira este** (0.42–0.75) — borda âmbar, com o texto original do papel abaixo: *"no papel estava: 'cim cp2 5sc'"*.
- ✏️ **Não reconhecido** (< 0.42) — campo destacado pedindo confirmação.

E um resumo honesto no topo: *"Lemos 8 itens. 2 precisam da sua conferência."* O cliente foca nos 2, não relê os 8.

### 3.5 Foto lado a lado

Resolve **F2**, **F3**. Miniatura da foto capturada fixa na tela de revisão; toque abre em tela cheia com zoom. O cliente confere sem perder o trabalho.

Trocar "Refazer foto" (destrutivo, canto superior esquerdo) por "Ver foto", e mover o refazer para dentro do visualizador, com confirmação.

### 3.6 Autocomplete contra o catálogo

Resolve **F5**. Ao editar o nome de um item, buscar no catálogo com debounce (o `use-debounced-value` já existe) e mostrar sugestões com foto e nome. Selecionar preenche `productId` — o que também alimenta o aprendizado da 2.6.

Reaproveitar a lógica de `PublicProductSearch`, que já está no projeto.

### 3.7 Caminho de recuperação quando a IA falha

Resolve **F6**. Nunca cair em lista vazia com "digite tudo à mão". Em vez disso:

1. Se o motor local produziu texto mas o parsing falhou, mostrar as **linhas cruas** como itens editáveis — o cliente corrige, não digita do zero.
2. Se nem isso houver: "Não conseguimos ler dessa vez" com três botões — **Tirar outra foto** (com dicas: mais luz, mais perto, papel plano), **Digitar minha lista** (textarea livre, uma linha por item — muito mais rápido que campos individuais no celular), **Mandar a foto direto pra loja** (envia o pedido com a imagem e sem itens; o lojista transcreve). Nenhum cliente sai sem pedido.

### 3.8 Persistência local do rascunho

Resolve **F8**. Salvar estado do wizard (incluindo a foto como blob em IndexedDB) a cada mudança. Ao reabrir: *"Você tem uma lista não enviada. Continuar?"*

### 3.9 Qualidade da foto em tempo real

Resolve **C14**. O OpenCV já está carregado no scanner — calcular a variância do Laplaciano no frame amostrado:

- Abaixo do limiar de nitidez → bloquear a captura automática e mostrar "Segure firme, está tremido".
- Brilho médio muito baixo → "Está escuro demais — procure mais luz" (e oferecer a lanterna via `torch` no `MediaStreamTrack`, onde suportado).

Melhora a taxa de acerto **e** economiza chamadas de IA desperdiçadas em fotos ruins.

### 3.10 Simplificar o painel do cliente

Resolve **F7**.
- Remover os 4 cards de métricas ("Total / Rascunhos / Em leitura / Em análise") — isso é visão de lojista, não de cliente.
- Uma coluna, um botão grande "Nova lista" no topo, histórico simples abaixo.
- Traduzir estados: "Em leitura — OCR rodando em segundo plano" → **"Estamos lendo sua lista…"**; "Em análise" → **"A loja está preparando seu orçamento"**.

### 3.11 OpenCV local

Resolve **C13**. Empacotar `opencv.js` como asset do projeto (ou instalar via npm), com o CDN apenas como fallback secundário. Elimina dependência de terceiro em runtime.

---

## Fase 4 — Lado do lojista

### 4.1 Tela de orçamento acionável

Ao abrir um pedido, o lojista precisa ver: foto original e itens lado a lado; itens com produto casado já precificados; itens não reconhecidos com busca rápida para resolver; total automático; e um botão **"Responder no WhatsApp"** com a mensagem de orçamento pré-montada.

### 4.2 Converter orçamento em venda

Ponte com o que já existe: transformar `QuoteRequest` aprovado em `Sale`, reaproveitando `sale.service.ts` (baixa de estoque e faturamento já implementados). Fecha o ciclo do pedido.

---

## Ordem de execução recomendada

| Etapa | Conteúdo | Por quê primeiro |
|---|---|---|
| **1** | Fase 0 completa (0.1, 0.2, 0.3) | Sem isso o sistema não funciona em produção |
| **2** | 2.1, 2.2, 2.4, 2.5 | Bugs de alto impacto, esforço baixo, sem mudar UI |
| **3** | 1.1, 1.2 | Torna a IA confiável |
| **4** | 3.1, 3.3, 3.4, 3.5, 3.7 | Ganho de UX percebido, um só fluxo |
| **5** | 1.3, 2.3 | Salto grande de precisão |
| **6** | 3.2 (foto antes do cadastro) | Maior ganho de conversão; exige mudança de schema |
| **7** | 1.4, 1.5, 1.6, 1.7 | Autonomia e controle de custo do lojista |
| **8** | 3.6, 3.8, 3.9, 3.10, 3.11 | Refinamento |
| **9** | 2.6, Fase 4 | Aprendizado contínuo e fechamento do ciclo |

Etapas 1–2 são as de maior retorno por esforço e não têm risco de regressão de UI. Recomendo tratá-las como um bloco único.

---

## Como medir se funcionou

| Métrica | Como obter | Alvo |
|---|---|---|
| % de pedidos com OCR bem-sucedido | `OcrRun.success` | > 95% |
| % de itens corrigidos pelo cliente | `itemsEditedByCustomer / itemsDetected` | < 20% |
| % de itens casados com o catálogo | `itemsMatched / itemsDetected` | > 70% |
| Tempo da foto até o envio | timestamps do wizard | < 90s |
| Abandono na revisão | rascunhos criados vs. enviados | < 15% |
| Custo por pedido lido | `OcrRun.costUsd` | definir teto |

`itemsEditedByCustomer` é a métrica principal: mede a qualidade real percebida, não a autoavaliação do modelo.

---

## Riscos do próprio plano

| Risco | Mitigação |
|---|---|
| 3.2 exige `userId` opcional em `QuoteRequest` — mudança de schema com dados existentes | Migration aditiva; nenhum registro atual fica inválido |
| Enviar catálogo grande encarece cada chamada | Estratégia de duas passadas acima de ~300 produtos; medir com 1.6 antes de generalizar |
| `strict: true` não é suportado por todos os modelos | Manter o parser tolerante atual como fallback; detectar e registrar quando ocorrer |
| Remover `QuoteDocumentCaptureCard` pode quebrar o painel do cliente | Fazer 3.1 e 3.10 juntos, no mesmo PR |
| Tesseract em manuscrito é fraco | É rede de segurança, não motor principal — a UI deve deixar claro quando está em modo degradado |
| Aprendizado de aliases (2.6) pode aprender erro do cliente | Exigir N ≥ 3 ocorrências e permitir que o lojista revise/remova aliases |
