// Integer micro-USD, rounded up. Never use floating point for budget decisions.
export function tokenCost(tokens: number, rateMicroUsd: number): bigint {
  if (!Number.isSafeInteger(tokens) || tokens < 0 || !Number.isSafeInteger(rateMicroUsd) || rateMicroUsd <= 0) throw new Error('Invalid token tariff');
  return (BigInt(tokens) * BigInt(rateMicroUsd) + 999999n) / 1000000n;
}
export function usageCost(input: number, output: number, inputRate: number, outputRate: number) {
  return tokenCost(input, inputRate) + tokenCost(output, outputRate);
}
export function validateTechnicalDescription(description: string) {
  // Billing reserve bounds the complete request, not just character count.
  if (Buffer.byteLength(description, 'utf8') > 4500) throw new Error('Use uma descrição mais curta.');
  if (/@|https?:\/\/|\b\d{3}[. -]?\d{3}[. -]?\d{3}[- ]?\d{2}\b|\b(?:\+?55\s*)?\(?\d{2}\)?[ -]?\d{4,5}[ -]?\d{4}\b/i.test(description)) throw new Error('Remova contatos, documentos e links. Descreva somente o serviço e as medidas.');
}
