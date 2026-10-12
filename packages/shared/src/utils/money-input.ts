export function parseMoneyCents(text: string) {
  const value = text.trim();
  if (value.length > 24 || !/^\d+(?:[,.]\d{1,2})?$/.test(value)) throw new Error('Informe preços como 25,00, sem separador de milhar.');
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Valor acima do limite permitido');
  return Number(cents);
}
