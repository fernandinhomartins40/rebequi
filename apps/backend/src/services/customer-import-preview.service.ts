import { previewCustomerImportSchema, type PreviewCustomerImportInput } from '@rebequi/shared/schemas';
import { normalizeWhatsapp } from '@rebequi/shared/utils';
import type { Prisma, UserRole } from '@prisma/client';

type ExistingUser = { id: string; email: string; whatsapp: string | null; role: UserRole; isActive?: boolean };
type ExistingLink = { source: string; externalId: string; customerId: string };

export function classifyCustomerImport(input: PreviewCustomerImportInput, users: ExistingUser[], links: ExistingLink[] = []) {
  const linkedByExternal = new Map(links.filter(link => link.source === input.source).map(link => [link.externalId, link.customerId]));
  const linkedByCustomer = new Map(links.filter(link => link.source === input.source).map(link => [link.customerId, link.externalId]));
  const externalCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();
  const phoneCounts = new Map<string, number>();
  for (const row of input.rows) {
    externalCounts.set(row.externalId, (externalCounts.get(row.externalId) ?? 0) + 1);
    if (row.email) emailCounts.set(row.email, (emailCounts.get(row.email) ?? 0) + 1);
    if (row.whatsapp) phoneCounts.set(row.whatsapp, (phoneCounts.get(row.whatsapp) ?? 0) + 1);
  }
  const rows = input.rows.map((row, index) => {
    const conflicts: string[] = [];
    if (externalCounts.get(row.externalId)! > 1) conflicts.push('DUPLICATE_EXTERNAL_ID');
    if (row.email && emailCounts.get(row.email)! > 1) conflicts.push('DUPLICATE_EMAIL');
    if (row.whatsapp && phoneCounts.get(row.whatsapp)! > 1) conflicts.push('DUPLICATE_WHATSAPP');
    const matches = users.filter(user => (row.email && user.email.toLowerCase() === row.email)
      || (row.whatsapp && (normalizeWhatsapp(user.whatsapp ?? '') === row.whatsapp || normalizeWhatsapp(user.email) === row.whatsapp)));
    const uniqueMatches = [...new Map(matches.map(user => [user.id, user])).values()];
    const linkedCustomerId = linkedByExternal.get(row.externalId);
    if (uniqueMatches.length > 1) conflicts.push('IDENTITY_COLLISION');
    else if (uniqueMatches[0]?.role !== undefined && uniqueMatches[0].role !== 'CUSTOMER') conflicts.push('USER_ROLE_CONFLICT');
    else if (uniqueMatches[0]?.isActive === false) conflicts.push('CUSTOMER_INACTIVE');
    else if (linkedCustomerId && linkedCustomerId !== uniqueMatches[0]?.id) conflicts.push('LINK_IDENTITY_MISMATCH');
    else if (uniqueMatches[0] && linkedByCustomer.has(uniqueMatches[0].id) && !linkedCustomerId) conflicts.push('CUSTOMER_LINKED_TO_OTHER_ID');
    else if (uniqueMatches[0] && !linkedCustomerId) conflicts.push('LOCAL_CUSTOMER_EXISTS');
    return { row: index + 1, externalId: row.externalId,
      localCustomerId: uniqueMatches.length === 1 && uniqueMatches[0].role === 'CUSTOMER' ? uniqueMatches[0].id : null,
      conflicts, status: conflicts.length ? 'CONFLICT' : linkedCustomerId ? 'LINKED_REVIEW' : 'READY_FOR_REVIEW' };
  });
  return { source: input.source, authority: { customers: 'LOCAL' }, rows,
    summary: { total: rows.length, conflicts: rows.filter(row => row.conflicts.length).length }, applied: false };
}

export async function previewCustomerImport(raw: PreviewCustomerImportInput) {
  const input = previewCustomerImportSchema.parse(raw);
  const { prisma } = await import('../lib/prisma.js');
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const emails = input.rows.flatMap(row => row.email ? [row.email] : []);
    const phones = input.rows.flatMap(row => row.whatsapp ? [row.whatsapp] : []);
    const users = await tx.user.findMany({ where: { OR: [
      { email: { in: emails, mode: 'insensitive' } },
      { email: { in: phones } },
      { whatsapp: { in: phones } },
    ] }, select: { id: true, email: true, whatsapp: true, role: true, isActive: true } });
    const links = await tx.externalCustomerLink.findMany({ where: { source: input.source, revokedAt: null,
      OR: [{ externalId: { in: input.rows.map(row => row.externalId) } }, { customerId: { in: users.map(user => user.id) } }] },
      select: { source: true, externalId: true, customerId: true } });
    return classifyCustomerImport(input, users, links);
  }, { isolationLevel: 'RepeatableRead' });
}
