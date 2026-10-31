/**
 * Narrowing for the filter lists.
 *
 * The pure half of modules/recipe-facets.ts. The database half is covered in
 * recipe-facets.db.test.ts.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { narrowBy } from '../src/modules/recipe-facets';

describe('narrowBy', () => {
  test('narrows nothing when no filters are chosen', () => {
    assert.deepEqual(narrowBy({}), {});
  });

  test('ignores empty values rather than matching on them', () => {
    // A cleared filter sends ?cuisine= rather than dropping the key.
    assert.deepEqual(narrowBy({ typeOfMeal: '', cuisine: '' }), {});
  });

  test('narrows by one chosen filter', () => {
    assert.deepEqual(narrowBy({ typeOfMeal: 'Diner' }), {
      typeOfMeal: { has: 'Diner' },
    });
  });

  test('combines several chosen filters', () => {
    assert.deepEqual(narrowBy({ typeOfMeal: 'Diner', cuisine: 'Italian' }), {
      typeOfMeal: { has: 'Diner' },
      cuisine: { has: 'Italian' },
    });
  });

  test('THE DRIFT: narrowing is not something only one side does', () => {
    // Only the public tags endpoint narrowed; the authenticated one returned
    // every tag regardless of the other filters. Both now use this, so the
    // behaviour cannot differ between them.
    assert.deepEqual(narrowBy({ typeOfDish: 'pasta' }), {
      typeOfDish: { has: 'pasta' },
    });
  });

  test('cannot be used to widen past the caller\'s scope', () => {
    // Scope comes from the router, not the query string. Nothing a visitor
    // sends may add belongsToId or isPublic to the where clause.
    const narrowed = narrowBy({ isPublic: 'false', belongsToId: 'someone-else' });

    assert.deepEqual(narrowed, {});
  });
});
