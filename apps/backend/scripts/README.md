# Scripts de avaliação OCR

## `compare-ocr.ts` — benchmark lado a lado

Compara, na mesma máquina, com as mesmas imagens:

1. **PaddleOCR (atual)** — bridge Python já usado em produção
2. **Qwen2.5-VL-72B `:free`** via OpenRouter
3. **Gemini 2.0 Flash `:free`** via OpenRouter

Para cada imagem mede: tempo de resposta, número de itens extraídos, confiança média e se a chamada deu certo. Gera relatório no console + JSON detalhado em `compare-ocr-results.json`.

### Pré-requisitos

- Backend já configurado: `python3` com `paddleocr` (ou ajustar `QUOTE_PADDLE_PYTHON_BIN` no `.env`).
- Chave do OpenRouter em `apps/backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

  Obter chave em https://openrouter.ai/keys. Conta nova já vem com 50 req/dia grátis. Comprar **uma vez** $10 destrava 1.000 req/dia nos modelos `:free` (créditos não expiram).

### Como rodar

```powershell
# 1. coloque 3-5 fotos reais em apps/backend/scripts/test-images/
#    (fotos de listas manuscritas e impressas, mistura)

# 2. rode o benchmark
cd apps/backend
npx tsx scripts/compare-ocr.ts
```

Primeira execução sem imagens cria a pasta `test-images/` automaticamente e pede para você popular.

### O que olhar no relatório

- **Tempo médio**: PaddleOCR costuma ser 2-5s; VLMs via OpenRouter `:free` 3-10s (variam por carga do provider).
- **Itens extraídos**: VLM deve trazer significativamente mais itens corretos em fotos manuscritas; em impresso a diferença é menor.
- **Texto bruto** (`rawText` no JSON): inspecione manualmente algumas linhas onde os engines divergem para entender onde o atual erra.

### Saída de exemplo

```
📷  lista-pedreiro-01.jpg  (842 KB)
    Engine                      Tempo     Itens   Conf    Status
    ──────────────────────────────────────────────────────────────────────
    PaddleOCR (atual)           2843ms    7       72%     ✓
    Qwen2.5-VL-72B (free)       4521ms    12      100%    ✓
    Gemini 2.0 Flash (free)     2987ms    11      100%    ✓
```

### Próximos passos depois de validar

Se os números confirmarem ganho dos VLMs, integrar no [`quote-ocr.service.ts`](../src/services/quote-ocr.service.ts) com a cadeia de fallback proposta:

```
OpenRouter Qwen :free → OpenRouter Gemini :free → OpenRouter Qwen3-VL-8B (pago, ~$0.0003/img) → PaddleOCR atual
```

Mantendo intacto o [`quote-text-normalizer.ts`](../src/services/quote-text-normalizer.ts) para matching com catálogo.
