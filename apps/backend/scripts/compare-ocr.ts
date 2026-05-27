/**
 * compare-ocr.ts
 *
 * Roda 3 motores de OCR lado a lado em um conjunto de imagens e gera:
 *   - tabela no console com tempo, contagem de itens, confiança média
 *   - JSON detalhado em ./scripts/compare-ocr-results.json com o texto bruto
 *     e os itens extraídos por cada motor
 *
 * Motores comparados:
 *   1. PaddleOCR (clássico, atual) — via bridge Python já existente
 *   2. OpenRouter Qwen2.5-VL-72B :free
 *   3. OpenRouter Gemini 2.0 Flash :free
 *
 * Como rodar:
 *   1. coloque 3–5 fotos de listas em scripts/test-images/
 *   2. exporte OPENROUTER_API_KEY no .env do backend (ou no terminal)
 *   3. cd apps/backend && npx tsx scripts/compare-ocr.ts
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

dotenv.config();

const execFileAsync = promisify(execFile);

// ─── Configuração ─────────────────────────────────────────────────────────────

const SCRIPTS_DIR = path.resolve(import.meta.dirname);
const INPUT_DIR = path.join(SCRIPTS_DIR, 'test-images');
const OUTPUT_FILE = path.join(SCRIPTS_DIR, 'compare-ocr-results.json');
const BRIDGE_SCRIPT = path.join(SCRIPTS_DIR, 'paddleocr_bridge.py');

const PYTHON_BIN = process.env.QUOTE_PADDLE_PYTHON_BIN || 'python3';
const PADDLE_LANG = process.env.QUOTE_PADDLE_LANG || 'la';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODELS = [
  { id: 'qwen/qwen2.5-vl-72b-instruct:free', label: 'Qwen2.5-VL-72B (free)' },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)' },
];

const VLM_PROMPT = `
Você é um extrator de pedidos de loja de material de construção brasileira.
A imagem é uma foto de uma lista (pode estar impressa ou manuscrita, com letra
de pedreiro). Extraia APENAS itens de produto que serão comprados.

REGRAS:
- Ignore cabeçalho, contato, endereço, datas, observações sociais.
- Para cada item, retorne: name (string), quantity (number), unit (string|null).
- Unidades comuns: un, cx, sc, kg, m, m², l, balde, rolo, barra. Se não souber, null.
- Quando a lista escrever só o número e o nome do material, inferir unidade pelo contexto:
  cimento→sc, areia→m³, brita→m³, tinta→l, fio/cabo→m, tijolo→un.

Retorne EXCLUSIVAMENTE um JSON válido no formato:
{ "items": [ { "name": "...", "quantity": 0, "unit": "..." } ] }
Sem texto antes ou depois.
`.trim();

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ExtractedItem = {
  name: string;
  quantity: number;
  unit: string | null;
};

type EngineResult = {
  engine: string;
  ok: boolean;
  durationMs: number;
  rawText?: string;
  items: ExtractedItem[];
  averageConfidence?: number;
  error?: string;
};

type ImageReport = {
  file: string;
  sizeBytes: number;
  results: EngineResult[];
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

function ms(start: number) {
  return Math.round(performance.now() - start);
}

function pad(value: string | number, width: number) {
  return String(value).padEnd(width);
}

function listImages(dir: string) {
  return fs.readdir(dir).then((files) =>
    files
      .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
      .map((file) => path.join(dir, file))
  );
}

function safeParseJson(value: string): { items: ExtractedItem[] } | null {
  if (!value) return null;
  const cleaned = value.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.items)) {
      return parsed as { items: ExtractedItem[] };
    }
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed && Array.isArray(parsed.items)) {
          return parsed as { items: ExtractedItem[] };
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ─── Engine 1: PaddleOCR (Python bridge) ─────────────────────────────────────

async function runPaddleOcr(imagePath: string): Promise<EngineResult> {
  const start = performance.now();
  try {
    const { stdout } = await execFileAsync(
      PYTHON_BIN,
      [BRIDGE_SCRIPT, '--image', imagePath, '--lang', PADDLE_LANG],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    );
    const payload = JSON.parse(stdout.trim()) as {
      text?: string;
      confidence?: number;
      lines?: Array<{ text: string; confidence: number }>;
    };
    const lines = payload.lines ?? [];
    const items: ExtractedItem[] = lines
      .map((line) => line.text.trim())
      .filter((text) => text.length > 2)
      .map((text) => {
        const match = text.match(/^\s*(\d+(?:[.,]\d+)?)\s*(\w+)?\s+(.+)$/);
        if (match) {
          return {
            name: match[3].trim(),
            quantity: Number(match[1].replace(',', '.')) || 1,
            unit: match[2]?.toLowerCase() ?? null,
          };
        }
        return { name: text, quantity: 1, unit: null };
      });

    return {
      engine: 'PaddleOCR (atual)',
      ok: true,
      durationMs: ms(start),
      rawText: payload.text,
      items,
      averageConfidence: payload.confidence,
    };
  } catch (error) {
    return {
      engine: 'PaddleOCR (atual)',
      ok: false,
      durationMs: ms(start),
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Engine 2/3: OpenRouter VLMs ─────────────────────────────────────────────

async function runOpenRouter(
  modelId: string,
  label: string,
  imagePath: string
): Promise<EngineResult> {
  const start = performance.now();
  if (!OPENROUTER_KEY) {
    return {
      engine: label,
      ok: false,
      durationMs: 0,
      items: [],
      error: 'OPENROUTER_API_KEY ausente no .env',
    };
  }

  try {
    const buffer = await fs.readFile(imagePath);
    const mime = imagePath.toLowerCase().endsWith('.png')
      ? 'image/png'
      : imagePath.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rebequi.com.br',
        'X-Title': 'Rebequi OCR Benchmark',
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: VLM_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        engine: label,
        ok: false,
        durationMs: ms(start),
        items: [],
        error: `HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = data.choices?.[0]?.message?.content ?? '';
    const parsed = safeParseJson(rawText);

    return {
      engine: label,
      ok: true,
      durationMs: ms(start),
      rawText,
      items: parsed?.items ?? [],
      averageConfidence: parsed ? 100 : 0,
      error: parsed ? undefined : 'Resposta não pôde ser parseada como JSON',
    };
  } catch (error) {
    return {
      engine: label,
      ok: false,
      durationMs: ms(start),
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Relatório no console ─────────────────────────────────────────────────────

function printSummary(reports: ImageReport[]) {
  console.log('\n┌────────────────────────────────────────────────────────────────────────────┐');
  console.log('│                       Resumo Comparativo (por imagem)                      │');
  console.log('└────────────────────────────────────────────────────────────────────────────┘\n');

  for (const report of reports) {
    console.log(`📷  ${report.file}  (${Math.round(report.sizeBytes / 1024)} KB)`);
    console.log('    ' + pad('Engine', 28) + pad('Tempo', 10) + pad('Itens', 8) + pad('Conf', 8) + 'Status');
    console.log('    ' + '─'.repeat(70));
    for (const r of report.results) {
      const status = r.ok ? '✓' : '✗ ' + (r.error ?? '').slice(0, 40);
      console.log(
        '    ' +
          pad(r.engine, 28) +
          pad(`${r.durationMs}ms`, 10) +
          pad(r.items.length, 8) +
          pad(r.averageConfidence != null ? `${Math.round(r.averageConfidence)}%` : '–', 8) +
          status
      );
    }
    console.log('');
  }

  console.log('────────────────────────────────────────────────────────────────────────────');
  console.log('Médias por engine:');
  const engines = new Map<string, { count: number; ok: number; time: number; items: number }>();
  for (const r of reports) {
    for (const result of r.results) {
      const acc = engines.get(result.engine) ?? { count: 0, ok: 0, time: 0, items: 0 };
      acc.count++;
      if (result.ok) acc.ok++;
      acc.time += result.durationMs;
      acc.items += result.items.length;
      engines.set(result.engine, acc);
    }
  }
  for (const [engine, acc] of engines) {
    console.log(
      '  ' +
        pad(engine, 28) +
        ' sucesso: ' +
        pad(`${acc.ok}/${acc.count}`, 8) +
        ' tempo méd: ' +
        pad(`${Math.round(acc.time / acc.count)}ms`, 10) +
        ' itens méd: ' +
        (acc.items / acc.count).toFixed(1)
    );
  }
  console.log('');
  console.log(`💾  JSON detalhado salvo em: ${OUTPUT_FILE}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await fs.access(INPUT_DIR);
  } catch {
    await fs.mkdir(INPUT_DIR, { recursive: true });
    console.log(`📂  Pasta criada: ${INPUT_DIR}`);
    console.log('    Coloque 3-5 fotos de listas de materiais aí e rode novamente.\n');
    return;
  }

  const images = await listImages(INPUT_DIR);
  if (images.length === 0) {
    console.log(`⚠️   Nenhuma imagem em ${INPUT_DIR}`);
    console.log('    Suporte: .jpg, .jpeg, .png, .webp\n');
    return;
  }

  console.log(`\n🚀  Comparando ${images.length} imagem(s) em 3 motores de OCR\n`);
  if (!OPENROUTER_KEY) {
    console.log('⚠️   OPENROUTER_API_KEY não definida — só PaddleOCR vai rodar.');
    console.log('    Adicione no .env do backend:  OPENROUTER_API_KEY=sk-or-v1-...\n');
  }

  const reports: ImageReport[] = [];

  for (const imagePath of images) {
    const file = path.basename(imagePath);
    const stat = await fs.stat(imagePath);
    console.log(`▶  ${file} …`);

    const paddleResult = await runPaddleOcr(imagePath);
    const openRouterResults: EngineResult[] = [];
    for (const model of OPENROUTER_MODELS) {
      openRouterResults.push(await runOpenRouter(model.id, model.label, imagePath));
    }

    reports.push({
      file,
      sizeBytes: stat.size,
      results: [paddleResult, ...openRouterResults],
    });
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(reports, null, 2), 'utf8');
  printSummary(reports);
}

main().catch((error) => {
  console.error('Falha na execução:', error);
  process.exit(1);
});
