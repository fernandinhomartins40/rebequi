/**
 * quote-text-normalizer.ts
 *
 * Domain-aware text normalisation for construction-supply OCR lines.
 *
 * Responsibilities:
 *  1. Fix common OCR character confusions (l/1, O/0, rn/m, etc.)
 *  2. Expand abbreviations used on handwritten shopping lists
 *  3. Resolve synonyms to canonical terms used in the product catalogue
 *  4. Provide a domain-specific token dictionary for fuzzy matching
 */

// ─── OCR character-confusion fixes ───────────────────────────────────────────

/**
 * Pairs of [pattern, replacement] applied to the raw OCR string before any
 * other processing.  Order matters – more specific rules come first.
 */
const OCR_CORRECTIONS: Array<[RegExp, string]> = [
  // Digit/letter confusion inside words
  [/(?<=[a-z])0(?=[a-z])/gi, 'o'],      // p0rta  → porta
  [/(?<=[a-z])1(?=[a-z])/gi, 'l'],      // co1a   → cola
  [/\brn\b/g, 'm'],                      // isolated "rn" → m
  [/([a-z])rn([a-z])/gi, '$1m$2'],      // arnarelo → amarelo
  [/\|/g, 'l'],                          // pipe char → l
  [/¡/g, 'i'],
  [/¿/g, '?'],
  // Common suffix OCR errors
  [/cao\b/gi, 'ção'],
  [/coes\b/gi, 'ções'],
  [/ao\b(?=\s|$)/gi, 'ão'],
  // Extra spaces around slashes / hyphens
  [/\s*\/\s*/g, '/'],
  [/\s*-\s*/g, '-'],
  // Multiple spaces
  [/\s{2,}/g, ' '],
];

export function applyOcrCorrections(raw: string): string {
  let result = raw;
  for (const [pattern, replacement] of OCR_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

// ─── Unit canonicalisation ────────────────────────────────────────────────────

/**
 * Maps every abbreviation/spelling variant to a single canonical unit symbol.
 * Used both for parsing quantities from OCR lines and for normalising units
 * before comparing items.
 */
export const UNIT_ALIASES: Record<string, string> = {
  // Pieces / units
  un: 'un', und: 'un', unid: 'un', unidade: 'un', unidades: 'un',
  pc: 'un', pcs: 'un', peca: 'un', pecas: 'un', peça: 'un', peças: 'un',
  'un.': 'un', 'pç': 'un',

  // Boxes / packs
  cx: 'cx', caixa: 'cx', caixas: 'cx', pct: 'pct', pacote: 'pct',
  pacotes: 'pct', fardo: 'pct', kit: 'kit',

  // Bags / sacks (very common in construction)
  sc: 'sc', saco: 'sc', sacos: 'sc', bag: 'sc',

  // Rolls
  rl: 'rl', rolo: 'rl', rolos: 'rl', 'rl.': 'rl',

  // Buckets / cans / gallons
  balde: 'balde', bal: 'balde',
  lata: 'lata', lt: 'l', litro: 'l', litros: 'l', l: 'l', litr: 'l',
  gal: 'gal', galao: 'gal', galão: 'gal',

  // Weight
  kg: 'kg', quilograma: 'kg', quilo: 'kg', gr: 'g', grama: 'g', gramas: 'g', g: 'g', t: 't', ton: 't', tonelada: 't',

  // Length / area
  m: 'm', metro: 'm', metros: 'm', mt: 'm', mts: 'm',
  'm2': 'm²', 'metro quadrado': 'm²', 'metros quadrados': 'm²',
  'm3': 'm³', 'metro cubico': 'm³',
  cm: 'cm', centimetro: 'cm', ml: 'ml',

  // Sheets / boards / plates
  chapa: 'ch', chapas: 'ch', ch: 'ch',
  folha: 'fl', folhas: 'fl', fl: 'fl',
  placa: 'pl', placas: 'pl',

  // Bars / rods
  barra: 'br', barras: 'br', br: 'br', vara: 'br',

  // Bags of concrete/mortar specific
  bag13: 'sc', // some regions use "bag 13kg"

  // Generic multiplier
  x: 'un',
};

export function canonicalUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim().replace(/\.$/, '');
  return UNIT_ALIASES[key] ?? key;
}

// ─── Construction-domain synonym dictionary ───────────────────────────────────

/**
 * Maps every OCR-produced spelling / abbreviation to its canonical form.
 * The canonical form should match (or be close to) the product name in the
 * catalogue.
 *
 * Structure: { [variant]: canonicalTerm }
 */
const CONSTRUCTION_SYNONYMS: Record<string, string> = {
  // ── Paints & finishes ────────────────────────────────────────────────────
  'tinta acrilica': 'tinta acrílica',
  'tinta acrilica 18l': 'tinta acrílica 18l',
  'tinta acrilica 18 l': 'tinta acrílica 18l',
  'tinta 18l': 'tinta acrílica 18l',
  'tinta 18 l': 'tinta acrílica 18l',
  'tinta latex': 'tinta látex',
  'tinta latex 18l': 'tinta látex 18l',
  'tinta esmalte': 'esmalte sintético',
  'esmalte sint': 'esmalte sintético',
  'massa corrida': 'massa corrida pva',
  'massa pva': 'massa corrida pva',
  'selador': 'selador acrílico',
  'fundo preparador': 'fundo preparador de parede',
  'primer': 'fundo preparador de parede',
  'verniz': 'verniz imbuia',
  'lixa': 'lixa de parede',
  'lixa massa': 'lixa para massa',
  'rolo pintura': 'rolo de pintura',
  'rolo 23cm': 'rolo de pintura 23cm',
  'pincel': 'pincel para pintura',
  'solvente': 'aguarrás solvente',
  'aguarras': 'aguarrás solvente',

  // ── Cement & mortar ──────────────────────────────────────────────────────
  'cimento': 'cimento portland cp ii',
  'cimento cp2': 'cimento portland cp ii',
  'cimento cp ii': 'cimento portland cp ii',
  'cimento cpii': 'cimento portland cp ii',
  'cimento 50kg': 'cimento portland cp ii 50kg',
  'argamassa': 'argamassa ac i',
  'argamassa aci': 'argamassa ac i',
  'argamassa acii': 'argamassa ac ii',
  'argamassa ac ii': 'argamassa ac ii',
  'argamassa colante': 'argamassa colante ac i',
  'rejunte': 'rejunte cimentício',
  'rejunto': 'rejunte cimentício',
  'rejunte branco': 'rejunte branco cimentício',
  'graute': 'graute fino',
  'contrapiso': 'argamassa de contrapiso',
  'reboco': 'argamassa de reboco',
  'chapisco': 'argamassa de chapisco',

  // ── Sand, gravel, aggregates ─────────────────────────────────────────────
  'areia': 'areia média',
  'areia media': 'areia média',
  'areia grossa': 'areia grossa',
  'areia fina': 'areia fina',
  'brita': 'brita 1',
  'brita 1': 'brita 1',
  'brita 0': 'pedrisco',
  'pedrisco': 'pedrisco',
  'pedra brita': 'brita 1',

  // ── Blocks, bricks, tiles ────────────────────────────────────────────────
  'tijolo': 'tijolo cerâmico 9 furos',
  'tijolo 9 furos': 'tijolo cerâmico 9 furos',
  'tijolo furado': 'tijolo cerâmico 9 furos',
  'bloco': 'bloco de concreto',
  'bloco concreto': 'bloco de concreto',
  'bloco 14x19x39': 'bloco de concreto 14x19x39',
  'piso porcelanato': 'porcelanato',
  'porcelanato': 'porcelanato',
  'azulejo': 'azulejo de parede',
  'ceramica': 'cerâmica',
  'ceramica piso': 'cerâmica para piso',
  'ceramica parede': 'cerâmica para parede',
  'telha': 'telha cerâmica',
  'telha ondulada': 'telha de fibrocimento ondulada',
  'telha eternit': 'telha de fibrocimento ondulada',
  'telha fibrocimento': 'telha de fibrocimento ondulada',

  // ── Plaster / drywall ────────────────────────────────────────────────────
  'gesso': 'gesso em pó',
  'gesso placa': 'placa de gesso',
  'drywall': 'placa drywall',
  'placa drywall': 'placa drywall',
  'dry wall': 'placa drywall',

  // ── Steel / rebar ────────────────────────────────────────────────────────
  'ferro': 'barra de aço ca-50',
  'barra ferro': 'barra de aço ca-50',
  'vergalhao': 'vergalhão ca-50',
  'vergalhao ca50': 'vergalhão ca-50',
  'vergalhao ca-50': 'vergalhão ca-50',
  'tela soldada': 'tela soldada nervurada',
  'arame': 'arame recozido',

  // ── Wood / formwork ──────────────────────────────────────────────────────
  'madeira': 'madeira pinus',
  'tabua': 'tábua de madeira',
  'caibro': 'caibro de pinus',
  'viga': 'viga de pinus',
  'compensado': 'compensado resinado',
  'chapa compensado': 'compensado resinado',
  'mdf': 'chapa mdf',

  // ── Pipes & fittings ─────────────────────────────────────────────────────
  'tubo': 'tubo pvc',
  'tubo pvc': 'tubo pvc',
  'cano pvc': 'tubo pvc',
  'cano': 'tubo pvc',
  'tubo soldavel': 'tubo pvc soldável',
  'conexao': 'conexão pvc',
  'joelho': 'joelho pvc 90°',
  'tee': 'tê pvc',
  'registro': 'registro de gaveta',
  'torneira': 'torneira de cozinha',
  'sifao': 'sifão sanfonado',

  // ── Electrical ───────────────────────────────────────────────────────────
  'fio': 'fio elétrico',
  'cabo': 'cabo elétrico',
  'cabo eletrico': 'cabo elétrico',
  'fio eletrico': 'fio elétrico',
  'disjuntor': 'disjuntor monopolar',
  'tomada': 'tomada 2p+t',
  'interruptor': 'interruptor simples',
  'eletroduto': 'eletroduto pvc',
  'caixa de luz': 'caixa de passagem elétrica',

  // ── Waterproofing ────────────────────────────────────────────────────────
  'impermeabilizante': 'impermeabilizante acrílico',
  'manta': 'manta asfáltica',
  'manta asfaltica': 'manta asfáltica',
  'vedacit': 'impermeabilizante vedacit',

  // ── Adhesives & sealants ─────────────────────────────────────────────────
  'silicone': 'silicone neutro',
  'selante': 'selante de poliuretano',
  'cola': 'cola pva',
  'cola pva': 'cola pva',
  'cola branca': 'cola pva',
  'cola de piso': 'adesivo para piso',

  // ── Tools / consumables ──────────────────────────────────────────────────
  'espátula': 'espátula de aço',
  'espatula': 'espátula de aço',
  'colher de pedreiro': 'colher de pedreiro',
  'desempenadeira': 'desempenadeira de aço',
  'saco de ráfia': 'saco de ráfia',
};

/**
 * Returns the canonical domain term for a normalised OCR string, or the
 * original if no synonym entry is found.
 */
export function resolveSynonym(normalized: string): string {
  return CONSTRUCTION_SYNONYMS[normalized] ?? normalized;
}

// ─── Domain token boost list ─────────────────────────────────────────────────

/**
 * High-value tokens that strongly indicate a construction product.
 * When a line contains one of these tokens the fuzzy match score gets
 * a +0.12 boost.
 */
export const CONSTRUCTION_DOMAIN_TOKENS = new Set([
  // Materials
  'tinta', 'cimento', 'areia', 'brita', 'argamassa', 'gesso', 'reboco',
  'tijolo', 'bloco', 'telha', 'piso', 'azulejo', 'ceramica', 'porcelanato',
  'drywall', 'compensado', 'madeira', 'tabua', 'viga', 'caibro',
  'ferro', 'vergalhao', 'tela', 'arame',
  'tubo', 'cano', 'conexao', 'joelho', 'registro', 'torneira',
  'fio', 'cabo', 'disjuntor', 'tomada', 'interruptor', 'eletroduto',
  'manta', 'impermeabilizante', 'silicone', 'cola',
  'massa', 'selador', 'primer', 'verniz', 'esmalte', 'lixa',
  'rejunte', 'graute', 'chapisco',
  // Sizes / formats that appear frequently
  '18l', '20l', '3 6l', '36l', '50kg', '25kg', '20kg', '14kg',
  '90x90', '60x60', '45x45', '30x30',
  '12mm', '15mm', '20mm', '25mm', '32mm', '40mm', '50mm', '75mm', '100mm',
  // Common qualifiers
  'acrilica', 'latex', 'pva', 'cp2', 'cpii', 'ca50', 'ca-50',
  'soldavel', 'esgoto', 'pressao',
]);

// ─── Pre-processing pipeline ──────────────────────────────────────────────────

/**
 * Full normalisation pipeline for a single OCR line before it is used
 * for product matching or stored as an item name.
 *
 * Steps:
 *  1. OCR character corrections
 *  2. Unicode decomposition + accent stripping
 *  3. Lowercase + remove non-alphanumeric (keep spaces and /)
 *  4. Collapse whitespace
 *  5. Synonym resolution
 */
export function normalizeDomainText(raw: string): string {
  const corrected = applyOcrCorrections(raw);

  const stripped = corrected
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return resolveSynonym(stripped);
}

/**
 * Tokenise a string using the same rules as normalisation, filtering out
 * tokens shorter than 2 characters.
 */
export function domainTokenize(value: string): string[] {
  return normalizeDomainText(value)
    .split(' ')
    .filter((t) => t.length >= 2);
}

// ─── Trigram similarity ───────────────────────────────────────────────────────

function trigrams(str: string): Set<string> {
  const padded = `  ${str}  `;
  const result = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    result.add(padded.slice(i, i + 3));
  }
  return result;
}

/**
 * Sørensen–Dice coefficient over character trigrams.
 * Returns a value in [0, 1].
 */
export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  return (2 * intersection) / (ta.size + tb.size);
}

/**
 * Jaccard similarity over token sets.
 * Returns a value in [0, 1].
 */
export function tokenJaccard(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Longest-common-subsequence length (character level).
 * Used as a tiebreaker for near-identical strings.
 */
export function lcsLength(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Blended similarity score combining trigrams + token Jaccard + domain boost.
 *
 * @param ocrLine    Normalised OCR text (already through normalizeDomainText)
 * @param productName Normalised product name
 * @returns score in [0, 1]
 */
export function blendedSimilarity(ocrLine: string, productName: string): number {
  const tg   = trigramSimilarity(ocrLine, productName);
  const lineTokens    = domainTokenize(ocrLine);
  const productTokens = domainTokenize(productName);
  const jaccard = tokenJaccard(lineTokens, productTokens);

  // Bonus: how many of the product tokens appear in the OCR line?
  const coverageRatio =
    productTokens.length > 0
      ? productTokens.filter((t) => lineTokens.includes(t)).length / productTokens.length
      : 0;

  // Domain token bonus: presence of construction-specific words
  const domainBonus = lineTokens.some((t) => CONSTRUCTION_DOMAIN_TOKENS.has(t)) ? 0.06 : 0;

  // Weighted blend: coverage is most important, then trigrams, then Jaccard
  return Math.min(1, coverageRatio * 0.55 + tg * 0.30 + jaccard * 0.15 + domainBonus);
}
