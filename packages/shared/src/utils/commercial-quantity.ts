/** Exact thousandths for the future decimal stock contract. Never infer units. */
export const QUANTITY_SCALE = 1000n;
const MAX_SCALED_QUANTITY = 999999999999n;

export function parseCommercialQuantity(value: string): bigint {
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(value)) throw new Error('Informe quantidade decimal com até três casas, sem separador de milhares.');
  const [whole, fraction = ''] = value.split('.');
  const scaled = BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(3, '0'));
  if (scaled > MAX_SCALED_QUANTITY) throw new Error('Quantidade acima do limite.');
  return scaled;
}

export function formatCommercialQuantity(scaled: bigint): string {
  if (scaled < 0n || scaled > MAX_SCALED_QUANTITY) throw new Error('Quantidade fora do limite.');
  const fraction = (scaled % QUANTITY_SCALE).toString().padStart(3, '0').replace(/0+$/, '');
  return `${scaled / QUANTITY_SCALE}${fraction ? `.${fraction}` : ''}`;
}

/** Explicit confirmed factor; incompatible units must be rejected by the caller. */
export function convertCommercialQuantity(quantity: string, confirmedFactor: string): string {
  const input = parseCommercialQuantity(quantity); const factor = parseCommercialQuantity(confirmedFactor);
  if (factor === 0n) throw new Error('O fator de conversão precisa ser positivo.');
  const product = input * factor;
  if (product % QUANTITY_SCALE !== 0n) throw new Error('A conversão exige precisão maior que três casas. Confira a unidade e o fator.');
  return formatCommercialQuantity(product / QUANTITY_SCALE);
}

/** Round each extended line to cents, half up, using integer arithmetic only. */
export function commercialLineCents(unitPriceCents: bigint, quantity: string): bigint {
  if (unitPriceCents < 0n) throw new Error('Preço não pode ser negativo.');
  return (unitPriceCents * parseCommercialQuantity(quantity) + QUANTITY_SCALE / 2n) / QUANTITY_SCALE;
}

/** Cumulative allocation preserves every cent when a fractional line is returned. */
export function commercialReturnCents(lineNetCents: bigint, sold: string, returned: string): bigint {
  const total = parseCommercialQuantity(sold); const part = parseCommercialQuantity(returned);
  if (lineNetCents < 0n || total === 0n || part > total) throw new Error('Quantidade devolvida ou valor inválido.');
  return (lineNetCents * part + total / 2n) / total;
}
