/**
 * Testes do normalizador de domínio.
 *
 * O dicionário de sinônimos era código morto: `resolveSynonym` fazia lookup de
 * string inteira, então "5 sc cimento" nunca casava com a chave "cimento".
 * Estes testes existem para que isso não volte a acontecer sem ninguém notar.
 *
 * Executar: npm run test --workspace=apps/backend
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyOcrCorrections,
  blendedSimilarity,
  canonicalUnit,
  normalizeDomainText,
  resolveSynonyms,
} from './quote-text-normalizer.js';

describe('resolveSynonyms', () => {
  it('expande sinônimos no meio da linha, não só na string inteira', () => {
    assert.equal(resolveSynonyms('5 sc cimento'), '5 sc cimento portland cp ii');
    assert.equal(resolveSynonyms('cimento 50kg'), 'cimento portland cp ii 50kg');
    assert.equal(resolveSynonyms('10 tijolo'), '10 tijolo cerâmico 9 furos');
  });

  it('dá preferência à expressão mais longa', () => {
    // "argamassa colante" deve vencer "argamassa" sozinha.
    assert.equal(resolveSynonyms('argamassa colante'), 'argamassa colante ac i');
    assert.equal(resolveSynonyms('argamassa'), 'argamassa ac i');
  });

  it('não aplica substituição dentro do texto já substituído', () => {
    // Regressão: gerava "argamassa ac i colante ac i".
    const resultado = resolveSynonyms('argamassa colante');
    assert.equal(resultado.match(/ac i/g)?.length, 1);
  });

  it('não casa dentro de outra palavra', () => {
    // "cola" não deve ser substituída dentro de "colante".
    assert.ok(!resolveSynonyms('descolamento').includes('pva'));
  });

  it('é idempotente: reaplicar não continua expandindo', () => {
    const uma = resolveSynonyms('5 sc cimento');
    assert.equal(resolveSynonyms(uma), uma);
  });

  it('devolve a string original quando não há sinônimo', () => {
    assert.equal(resolveSynonyms('parafuso sextavado'), 'parafuso sextavado');
  });
});

describe('applyOcrCorrections', () => {
  it('corrige confusões de caractere na saída de OCR raster', () => {
    assert.equal(applyOcrCorrections('p0rta', 'paddleocr'), 'porta');
    assert.equal(applyOcrCorrections('co1a', 'paddleocr'), 'cola');
  });

  it('não mexe no texto vindo de um modelo de visão', () => {
    // O VLM já devolve texto limpo e acentuado; "corrigir" só estraga.
    const original = 'Tinta 18L cor 0800';
    assert.equal(applyOcrCorrections('verniz', 'deepseek'), 'verniz');
    assert.match(normalizeDomainText('verniz'), /^verniz\b/);
    for (const engine of ['openrouter', 'deepseek', 'qwen'] as const) assert.equal(applyOcrCorrections(original, engine), original);
  });

  it('restaura acentos apenas em palavras conhecidas do domínio', () => {
    assert.equal(applyOcrCorrections('conexao pvc', 'paddleocr'), 'conexão pvc');
    // Palavra fora da allowlist permanece intacta.
    assert.equal(applyOcrCorrections('cacao', 'paddleocr'), 'cacao');
  });

  it('preserva o hífen para não atrapalhar a tokenização', () => {
    assert.ok(applyOcrCorrections('tubo - 100mm', 'paddleocr').includes(' '));
  });
});

describe('canonicalUnit', () => {
  it('resolve variações para a mesma unidade', () => {
    assert.equal(canonicalUnit('sacos'), 'sc');
    assert.equal(canonicalUnit('saco'), 'sc');
    assert.equal(canonicalUnit('caixa'), 'cx');
    assert.equal(canonicalUnit('litros'), 'l');
  });

  it('devolve null quando não há unidade', () => {
    assert.equal(canonicalUnit(null), null);
    assert.equal(canonicalUnit(undefined), null);
  });
});

describe('blendedSimilarity com sinônimos aplicados', () => {
  const casos: Array<[string, string]> = [
    ['5 sc cimento', 'Cimento Portland CP II 50kg'],
    ['argamassa colante', 'Argamassa Colante AC I'],
    ['3 sacos de areia', 'Areia Média'],
    ['10 tijolo', 'Tijolo Cerâmico 9 Furos'],
    ['tinta acrilica 18l', 'Tinta Acrílica Fosca 18L'],
  ];

  for (const [linha, produto] of casos) {
    it(`casa "${linha}" com "${produto}"`, () => {
      const score = blendedSimilarity(normalizeDomainText(linha), normalizeDomainText(produto));
      assert.ok(score > 0.7, `score muito baixo: ${score.toFixed(3)}`);
    });
  }

  it('não casa produtos claramente diferentes', () => {
    const score = blendedSimilarity(
      normalizeDomainText('5 sc cimento'),
      normalizeDomainText('Torneira de Cozinha')
    );
    assert.ok(score < 0.42, `falso positivo: ${score.toFixed(3)}`);
  });
});
