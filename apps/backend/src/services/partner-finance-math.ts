// Cents and points are integers. Basis points: 100 = 1%.
export function benefitsForBasis(basisCents: bigint, commissionBasisPoints: number, pointsPerReal: number) {
  if (basisCents < 0n || !Number.isSafeInteger(commissionBasisPoints) || commissionBasisPoints < 0 || commissionBasisPoints > 10000 || !Number.isSafeInteger(pointsPerReal) || pointsPerReal < 0) throw new Error('Invalid benefit parameters');
  return { commissionCents: basisCents * BigInt(commissionBasisPoints) / 10000n, points: basisCents * BigInt(pointsPerReal) / 100n };
}
export function allocateDiscountedLines(lines: { id: string; cents: bigint }[], totalCents: bigint) {
  const subtotal = lines.reduce((sum, line) => sum + line.cents, 0n);
  if (totalCents < 0n || totalCents > subtotal || lines.some(line => line.cents < 0n) || new Set(lines.map(line => line.id)).size !== lines.length) throw new Error('Invalid sale basis');
  if (!subtotal) return new Map(lines.map(line => [line.id, 0n]));
  const rows = lines.map(line => ({ id: line.id, cents: line.cents * totalCents / subtotal, remainder: line.cents * totalCents % subtotal }));
  let left = totalCents - rows.reduce((sum, row) => sum + row.cents, 0n);
  rows.sort((a, b) => a.remainder === b.remainder ? a.id.localeCompare(b.id) : a.remainder > b.remainder ? -1 : 1);
  for (const row of rows) { if (left <= 0n) break; row.cents++; left--; }
  return new Map(rows.map(row => [row.id, row.cents]));
}
export function cumulativeReturnCents(lineCents: bigint, sold: number, returned: number) {
  if (lineCents < 0n || !Number.isSafeInteger(sold) || sold <= 0 || !Number.isSafeInteger(returned) || returned < 0 || returned > sold) throw new Error('Invalid returned quantity');
  return lineCents * BigInt(returned) / BigInt(sold);
}
