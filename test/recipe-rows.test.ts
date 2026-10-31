/**
 * Row identity inside Recipe.ingredients.
 *
 * Why this file exists: a shopping list stores its exclusions as
 * listState.excludedRows = [1, 4], pointing at Recipe.ingredients[].id. If an
 * id is ever reassigned, the exclusion silently moves to a different
 * ingredient - the user unticks "crème fraîche" and on their next visit
 * "flammkuchendeeg" is missing from the list instead.
 *
 * That is not hypothetical. The frontend used to renumber every row to
 * `index + 1` on load, so reordering a recipe in one session corrupted the
 * grocery list on the next visit. These tests pin the server side of the fix.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { withRowIds } from '../src/modules/recipe-rows';

type Row = { id?: unknown; name: string };
const ids = (rows: unknown) => (rows as Row[]).map((r) => r.id);
const names = (rows: unknown) => (rows as Row[]).map((r) => r.name);

describe('withRowIds', () => {
  test('keeps ids that were sent, untouched', () => {
    const sent = [
      { id: 1, name: 'flammkuchendeeg' },
      { id: 2, name: 'crème fraîche' },
      { id: 3, name: 'spek' },
    ];

    assert.deepEqual(ids(withRowIds(sent)), [1, 2, 3]);
  });

  test('THE BUG: a reorder must not renumber anything', () => {
    // The same three rows, dragged into a different order. Every id must
    // travel with its own ingredient, not with its new position.
    const reordered = [
      { id: 3, name: 'spek' },
      { id: 1, name: 'flammkuchendeeg' },
      { id: 2, name: 'crème fraîche' },
    ];

    const result = withRowIds(reordered);

    assert.deepEqual(names(result), ['spek', 'flammkuchendeeg', 'crème fraîche']);
    assert.deepEqual(ids(result), [3, 1, 2], 'ids must follow the ingredient, not the index');
  });

  test('fills in a missing id without disturbing the others', () => {
    const withNewRow = [
      { id: 1, name: 'flammkuchendeeg' },
      { name: 'ui' }, // added in the form, never saved before
      { id: 2, name: 'crème fraîche' },
    ];

    const result = withRowIds(withNewRow);

    // The new row gets an id above the highest in use, so it cannot collide
    // with an id some shopping list already remembers.
    assert.deepEqual(ids(result), [1, 3, 2]);
  });

  test('resolves a collision by moving the duplicate, not the original', () => {
    const collision = [
      { id: 1, name: 'flammkuchendeeg' },
      { id: 1, name: 'ui' },
    ];

    const result = withRowIds(collision);

    assert.equal((result as Row[])[0].id, 1, 'the first claim on an id keeps it');
    assert.equal((result as Row[])[1].id, 2);
  });

  test('never allocates an id that is already taken further down the list', () => {
    // Naive "next = length + 1" would hand out 3, which row three already
    // holds. The allocator has to start above the highest id present.
    const rows = [{ name: 'a' }, { name: 'b' }, { id: 3, name: 'c' }];

    const result = withRowIds(rows);
    const allIds = ids(result) as number[];

    assert.equal(new Set(allIds).size, allIds.length, 'ids must be unique');
    assert.ok(allIds.includes(3), 'the id that was sent is kept');
  });

  test('replaces ids that are not usable', () => {
    const bad = [
      { id: 0, name: 'zero is not a valid id' },
      { id: -1, name: 'negative' },
      { id: 1.5, name: 'fractional' },
      { id: '2', name: 'a string' },
      { id: null, name: 'null' },
    ];

    const allIds = ids(withRowIds(bad)) as number[];

    assert.equal(allIds.length, 5);
    allIds.forEach((id) => {
      assert.equal(typeof id, 'number');
      assert.ok(Number.isInteger(id) && id > 0, `${id} should have been replaced`);
    });
    assert.equal(new Set(allIds).size, 5, 'and they must still be unique');
  });

  test('preserves every other field on the row', () => {
    const row = { name: 'ui', amount: '2', unit: 'stuks', prep: 'gesnipperd' };

    const [result] = withRowIds([row]) as Record<string, unknown>[];

    assert.equal(result.name, 'ui');
    assert.equal(result.amount, '2');
    assert.equal(result.unit, 'stuks');
    assert.equal(result.prep, 'gesnipperd');
    assert.equal(result.id, 1);
  });

  test('handles an empty list', () => {
    assert.deepEqual(withRowIds([]), []);
  });

  test('passes a non-array through so validation reports it, not this', () => {
    assert.equal(withRowIds(undefined), undefined);
    assert.equal(withRowIds(null), null);
    assert.equal(withRowIds('not an array'), 'not an array');
  });
});
