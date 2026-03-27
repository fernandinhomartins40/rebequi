import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOTS = [
  'apps/frontend/src',
  'apps/backend/src',
  'packages/shared/src',
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const FORBIDDEN_PATTERNS = [
  /\b(?:promocao|promocoes|orcamento|orcamentos|descricao|titulo|colecao|provisoria|camera|secoes|gestao|visao geral|imperdiveis)\b/i,
  /\b(?:informacao|navegacao|permissoes|validacoes|avancados|configuracoes|rotacao|verificacoes|distribuicao|movimentacao|historico)\b/i,
  /\b(?:esta acontecendo|esta dispon[ií]vel|concluiram|concluidos|preco|sera|ate)\b/i,
  /[A-Za-z\u00C0-\u00FF]+\?[A-Za-z\u00C0-\u00FF?]+/,
  /\uFFFD/,
];

const TECHNICAL_LITERAL = /^[a-z0-9_./:${}\-]+$/i;
const SKIP_LINE_PATTERNS = [
  /path\s*=/,
  /href\s*:/,
  /to\s*=/,
  /id\s*:/,
  /queryKey\s*:/,
  /fallbackBaseName\s*:/,
  /source\s*:/,
];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractQuotedLiterals(line) {
  const matches = line.match(/(['"`])(?:\\.|(?!\1).)*\1/g);
  return matches ? matches.map((value) => value.slice(1, -1).trim()).filter(Boolean) : [];
}

function extractJsxText(line) {
  const matches = [...line.matchAll(/>([^<{][^<]*)</g)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function shouldSkipLiteral(line, literal) {
  if (!literal) {
    return true;
  }

  if (/^https?:\/\//i.test(literal)) {
    return true;
  }

  if (/^\/[a-z0-9_./:${}?=&-]+$/i.test(literal)) {
    return true;
  }

  if (/\/[a-z0-9_./:${}?=&-]+/i.test(literal) && !/[\u00C0-\u00FF]/.test(literal)) {
    return true;
  }

  if (SKIP_LINE_PATTERNS.some((pattern) => pattern.test(line)) && TECHNICAL_LITERAL.test(literal)) {
    return true;
  }

  return TECHNICAL_LITERAL.test(literal) && !literal.includes(' ');
}

const problems = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      const fragments = [...extractQuotedLiterals(line), ...extractJsxText(line)];

      for (const fragment of fragments) {
        if (shouldSkipLiteral(line, fragment)) {
          continue;
        }

        const matchedPattern = FORBIDDEN_PATTERNS.find((pattern) => pattern.test(fragment));
        if (!matchedPattern) {
          continue;
        }

        problems.push({
          file,
          line: index + 1,
          fragment,
        });
      }
    });
  }
}

if (problems.length > 0) {
  console.error('Foram encontrados textos fora do padrão pt-BR/UTF-8:');
  for (const problem of problems) {
    console.error(`- ${problem.file}:${problem.line} -> ${problem.fragment}`);
  }
  process.exit(1);
}

console.log('Textos pt-BR/UTF-8 validados com sucesso.');
