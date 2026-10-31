/**
 * Filter lists against a real database.
 *
 * Skips unless TEST_DATABASE_URL is set - see test/db-harness.ts.
 */
import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { uniqueFacetValues, narrowBy } from '../src/modules/recipe-facets';
import { canRunDbTests, skipReason, testDb, resetDb, disconnect, makeUser } from './db-harness';

describe('facet values against a database', { skip: !canRunDbTests && skipReason }, () => {
  let db: ReturnType<typeof testDb>;
  let ownerId: string;

  before(() => {
    db = testDb();
  });

  after(async () => {
    await resetDb();
    await disconnect();
  });

  const addRecipe = (
    belongsToId: string,
    name: string,
    fields: Record<string, unknown>,
    isPublic = false,
  ) =>
    db.recipe.create({
      data: {
        name,
        persons: 2,
        tags: [],
        typeOfMeal: [],
        typeOfDish: [],
        cuisine: [],
        steps: [],
        ingredients: [] as never,
        isPublic,
        belongsToId,
        ...fields,
      },
    });

  beforeEach(async () => {
    await resetDb();
    ownerId = (await makeUser('ADMIN')).id;

    await addRecipe(ownerId, 'Publiek diner', {
      typeOfMeal: ['Diner'],
      cuisine: ['Italian'],
      tags: ['oven', 'snel'],
    }, true);
    await addRecipe(ownerId, 'Publieke lunch', {
      typeOfMeal: ['Lunch'],
      cuisine: ['Dutch'],
      tags: ['snel'],
    }, true);
    await addRecipe(ownerId, 'Prive ontbijt', {
      typeOfMeal: ['Ontbijt'],
      tags: ['geheim'],
    }, false);
  });

  test('returns each value once, however many recipes use it', async () => {
    const tags = await uniqueFacetValues('tags', { isPublic: true }, db);

    assert.deepEqual([...tags].sort(), ['oven', 'snel']);
  });

  test('the scope decides what is visible', async () => {
    const publicTags = await uniqueFacetValues('tags', { isPublic: true }, db);
    const ownerTags = await uniqueFacetValues('tags', { belongsToId: ownerId }, db);

    assert.ok(!publicTags.includes('geheim'), 'a private recipe must not leak its tags');
    assert.ok(ownerTags.includes('geheim'));
  });

  test('THE PARITY RULE: narrowing works the same on both sides', async () => {
    const query = { typeOfMeal: 'Diner' };

    const publicTags = await uniqueFacetValues(
      'tags',
      { isPublic: true, ...narrowBy(query) },
      db,
    );
    const ownerTags = await uniqueFacetValues(
      'tags',
      { belongsToId: ownerId, ...narrowBy(query) },
      db,
    );

    // One recipe is a Diner, and it carries both tags.
    assert.deepEqual([...publicTags].sort(), ['oven', 'snel']);
    assert.deepEqual([...ownerTags].sort(), ['oven', 'snel']);
  });

  test('narrowing actually narrows', async () => {
    const all = await uniqueFacetValues('tags', { isPublic: true }, db);
    const lunchOnly = await uniqueFacetValues(
      'tags',
      { isPublic: true, ...narrowBy({ typeOfMeal: 'Lunch' }) },
      db,
    );

    assert.equal(all.length, 2);
    assert.deepEqual(lunchOnly, ['snel'], 'oven leads nowhere once Lunch is chosen');
  });

  test('every facet column works', async () => {
    assert.deepEqual(
      [...(await uniqueFacetValues('typeOfMeal', { isPublic: true }, db))].sort(),
      ['Diner', 'Lunch'],
    );
    assert.deepEqual(
      [...(await uniqueFacetValues('cuisine', { isPublic: true }, db))].sort(),
      ['Dutch', 'Italian'],
    );
    assert.deepEqual(await uniqueFacetValues('typeOfDish', { isPublic: true }, db), []);
  });
});
