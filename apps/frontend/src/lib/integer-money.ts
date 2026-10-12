export function formatIntegerCents(value: string) {
  const cents = BigInt(value); const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '-' : ''}R$ ${(absolute / 100n).toLocaleString('pt-BR')},${String(absolute % 100n).padStart(2, '0')}`;
}
