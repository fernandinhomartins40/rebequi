import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCategoryImportSchema } from '@rebequi/shared/schemas';
import { classifyCategoryImport } from './category-import-preview.service.js';

test('Category import preview detects duplicates and local identity conflicts without applying data', () => {
  const input = previewCategoryImportSchema.parse({ source: 'pdv-test', rows: [
    { externalId: 'A', slug: 'tintas', name: 'Tintas' },
    { externalId: 'B', slug: 'ferramentas', name: 'Ferramentas' },
    { externalId: 'B', slug: 'ferramentas', name: 'Ferramentas duplicadas' },
  ] });
  const result = classifyCategoryImport(input, [{ id: 'local-1', slug: 'tintas', name: 'Tintas', isActive: true, deletedAt: null }]);
  assert.deepEqual(result.rows[0].conflicts, ['SLUG_ALREADY_LOCAL']);
  assert.equal(result.rows[0].localCategoryId, 'local-1');
  assert.deepEqual(result.rows[1].conflicts, ['DUPLICATE_EXTERNAL_ID', 'DUPLICATE_SLUG']);
  assert.equal(result.applied, false); assert.equal(result.authority.categories, 'LOCAL');
});
test('Category links and archived categories require explicit review', () => {
  const input = previewCategoryImportSchema.parse({ source: 'pdv-test', rows: [{ externalId: 'A', slug: 'tintas', name: 'Tintas' }] });
  const active = [{ id: 'local-1', slug: 'tintas', name: 'Tintas', isActive: true, deletedAt: null }];
  const links = [{ source: 'pdv-test', externalId: 'A', categoryId: 'local-1' }];
  assert.equal(classifyCategoryImport(input, active, links).rows[0].status, 'LINKED_REVIEW');
  assert.deepEqual(classifyCategoryImport(input, active, [{ ...links[0], externalId: 'B' }]).rows[0].conflicts, ['CATEGORY_LINKED_TO_OTHER_ID']);
  const archived = [{ ...active[0], deletedAt: new Date(), isActive: false }];
  assert.deepEqual(classifyCategoryImport(input, archived).rows[0].conflicts, ['CATEGORY_INACTIVE']);
  const changed = previewCategoryImportSchema.parse({ source: 'pdv-test', rows: [{ externalId: 'A', slug: 'nova-tinta', name: 'Tintas' }] });
  assert.deepEqual(classifyCategoryImport(changed, active, links).rows[0].conflicts, ['LINK_SLUG_MISMATCH', 'NAME_ALREADY_LOCAL']);
});
