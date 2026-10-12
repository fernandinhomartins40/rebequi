import { laborItemSchema } from '../schemas/labor.schema.js';

// Decimal quantities to thousandths; monetary arithmetic stays in integer cents.
export function priceLaborItem(input: unknown) {
  const item = laborItemSchema.parse(input);
  const thousandths = BigInt(Math.round(item.quantity * 1000));
  const total = (thousandths * BigInt(item.unitPriceCents) + 500n) / 1000n;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Valor acima do limite permitido');
  return Number(total);
}
export function priceLaborQuote(items: unknown[]) {
  if (!items.length || items.length > 50) throw new Error('Informe de 1 a 50 serviços');
  const lineTotals = items.map(priceLaborItem);
  const totalCents = lineTotals.reduce((total, value) => total + value, 0);
  if (!Number.isSafeInteger(totalCents)) throw new Error('Valor acima do limite permitido');
  return { lineTotals, totalCents };
}
