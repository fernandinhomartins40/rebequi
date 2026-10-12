import { materialInputSchema, technicalParametersSchema, type MaterialInput, type TechnicalParameters } from '../schemas/material.schema.js';
export const MATERIAL_FORMULA_VERSION = '2026-10-12.1';
export function calculateMaterials(rawInput: MaterialInput, rawParameters: TechnicalParameters) {
  const input = materialInputSchema.parse(rawInput); const spec = technicalParametersSchema.parse(rawParameters);
  if (input.service !== spec.kind) throw new Error('O produto não corresponde ao serviço selecionado.');
  const netAreaM2 = input.areaM2 - input.openingsM2;
  const adjustedAreaM2 = netAreaM2 * (1 + input.lossPercent / 100);
  const coverage = spec.kind === 'TILE' ? spec.areaM2PerPack : spec.coverageM2PerPack;
  const multiplier = spec.kind === 'PAINT' && spec.coverageBasis === 'PER_COAT' ? input.coats : 1;
  const rawPackages = adjustedAreaM2 * multiplier / coverage;
  // Remove only floating arithmetic noise at an exact package boundary.
  const packages = Math.ceil(Number(rawPackages.toPrecision(14)));
  if (!Number.isSafeInteger(packages) || packages < 1 || packages > 1000000) throw new Error('Quantidade fora do limite. Confira as medidas e o rendimento.');
  return { formulaVersion: MATERIAL_FORMULA_VERSION, netAreaM2, adjustedAreaM2, packages,
    quantityNeeded: spec.kind === 'PAINT' ? rawPackages * spec.packageLiters : adjustedAreaM2,
    quantityPurchased: spec.kind === 'PAINT' ? packages * spec.packageLiters : packages * spec.areaM2PerPack,
    unit: spec.kind === 'PAINT' ? 'L' : 'm²',
    formula: `(${input.areaM2} − ${input.openingsM2}) × (1 + ${input.lossPercent}/100)${multiplier > 1 ? ` × ${multiplier} demãos` : ''} ÷ ${coverage} m²/embalagem`,
    assumptions: spec.kind === 'PAINT' && spec.coverageBasis === 'FINISHED' ? 'Rendimento acabado: as demãos já estão incluídas na ficha.' : spec.kind === 'PAINT' ? 'Rendimento por demão conforme a ficha técnica.' : 'Compra em caixas inteiras conforme a área por caixa.',
  };
}
