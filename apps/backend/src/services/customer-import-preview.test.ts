import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCustomerImportSchema } from '@rebequi/shared/schemas';
import { classifyCustomerImport } from './customer-import-preview.service.js';

test('Customer import preview normalizes identifiers and rejects ambiguous rows', () => {
  const rows = [{ externalId: 'A', name: 'Cliente Teste', email: 'CLIENTE@EXAMPLE.COM', whatsapp: '+55 (11) 98765-4321' }];
  const input = previewCustomerImportSchema.parse({ source: 'pdv-test', rows });
  assert.equal(input.rows[0].email, 'cliente@example.com');
  assert.equal(input.rows[0].whatsapp, '11987654321');
  for (const value of [
    { source: 'pdv-test', rows: [{ externalId: 'A', name: 'Sem Contato' }] },
    { source: 'pdv-test', rows: [{ ...rows[0], email: 'invalid' }] },
    { source: 'pdv-test', rows: [{ ...rows[0], whatsapp: '123' }] },
    { source: 'pdv-test', rows, apply: true },
    { source: 'pdv-test', rows: Array(101).fill(rows[0]) },
  ]) assert.equal(previewCustomerImportSchema.safeParse(value).success, false);
});

test('Customer preview reports duplicates and local account conflicts without personal data in results', () => {
  const input = previewCustomerImportSchema.parse({ source: 'pdv-test', rows: [
    { externalId: 'A', name: 'Cliente Um', email: 'one@example.com', whatsapp: '11987654321' },
    { externalId: 'A', name: 'Cliente Dois', email: 'two@example.com', whatsapp: '11999999999' },
    { externalId: 'C', name: 'Cliente Tres', email: 'one@example.com' },
    { externalId: 'D', name: 'Cliente Quatro', whatsapp: '11888888888' },
  ] });
  const users = [
    { id: 'customer-1', email: 'one@example.com', whatsapp: '11987654321', role: 'CUSTOMER' as const },
    { id: 'staff-1', email: 'staff@example.com', whatsapp: '11999999999', role: 'SALES' as const },
    { id: 'customer-2', email: 'hidden@example.com', whatsapp: '11888888888', role: 'CUSTOMER' as const },
  ];
  const result = classifyCustomerImport(input, users);
  assert.deepEqual(result.rows[0].conflicts, ['DUPLICATE_EXTERNAL_ID', 'DUPLICATE_EMAIL', 'LOCAL_CUSTOMER_EXISTS']);
  assert.deepEqual(result.rows[1].conflicts, ['DUPLICATE_EXTERNAL_ID', 'USER_ROLE_CONFLICT']);
  assert.deepEqual(result.rows[3].conflicts, ['LOCAL_CUSTOMER_EXISTS']);
  assert.equal(result.rows[3].localCustomerId, 'customer-2');
  assert.equal(JSON.stringify(result).includes('one@example.com'), false);
  assert.equal(result.applied, false);
});

test('Customer preview does not merge email and WhatsApp belonging to different accounts', () => {
  const input = previewCustomerImportSchema.parse({ source: 'pdv-test', rows: [
    { externalId: 'A', name: 'Cliente Teste', email: 'one@example.com', whatsapp: '11987654321' },
  ] });
  const users = [
    { id: 'customer-1', email: 'one@example.com', whatsapp: null, role: 'CUSTOMER' as const },
    { id: 'customer-2', email: 'two@example.com', whatsapp: '11987654321', role: 'CUSTOMER' as const },
  ];
  assert.deepEqual(classifyCustomerImport(input, users).rows[0].conflicts, ['IDENTITY_COLLISION']);
});
