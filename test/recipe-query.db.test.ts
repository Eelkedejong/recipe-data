/**
 * The filter builder against a real database.
 *
 * recipe-query.test.ts checks the *shape* of the where clause. That is not
 * the same as Prisma accepting it: the ingredient filter nests an AND inside
 * an AND, and a clause that looks right can still be rejected at runtime or
 * quietly match the wrong rows. These run the clauses the handlers actually
 * send.
 *
 * Skips unless TEST_DATABASE_URL is set - see test/db-harness.ts.
 */
import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecipeWhere, RECIPE_ORDER } from '../src/modules/recipe-query';
import {
  canRunDbTests,
  skipReason,
  testDb,
  resetDb,
  disconnect,
  makeUser,
  seedCatalog,
} from './db-harness';

describe('recipe filters against a database', { skip: !canRunDbTests && skipReason }, () => {
  let db: ReturnType<typeof testDb>;
  let catalog: Awaited<ReturnType<typeof seedCatalog>>;
  let ownerId: string;
  let strangerId: string;

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
    overrides: Record<string, unknown> = {},
    ingredientIds: string[] = [],
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
        ingredients: ingredientIds.map((id, index) => ({
          id: index + 1,
          name: 'x',
          ingredientId: id,
        })) as never,
        belongsToId,
        ingredientLinks: {
          create: ingredientIds.map((ingredientId) => ({ ingredientId })),
        },
        ...overrides,
      },
    });

  const run = (query: Record<string, unknown>, scope: Record<string, unknown>) =>
    db.recipe.findMany({
      where: buildRecipeWhere(query, scope),
      orderBy: RECIPE_ORDER,
    });

  const names = async (query: Record<string, unknown>, scope: Record<string, unknown>) =>
    (await run(query, scope)).map((r) => r.name);

  beforeEach(async () => {
    await resetDb();
    catalog = await seedCatalog();
    ownerId = (await makeUser('ADMIN')).id;
    strangerId = (await makeUser()).id;

    await addRecipe(ownerId, 'Publieke aubergine', { isPublic: true, isVegetarian: true }, [
      catalog.aubergine.id,
      catalog.olijfolie.id,
    ]);
    await addRecipe(ownerId, 'Publieke spek', { isPublic: true }, [
      catalog.spek.id,
      catalog.olijfolie.id,
    ]);
    await addRecipe(ownerId, 'Prive aubergine', { isPublic: false }, [catalog.aubergine.id]);
    await addRecipe(strangerId, 'Van iemand anders', { isPublic: false }, [
      catalog.aubergine.id,
    ]);
  });

  test('THE BUG THAT SHIPPED: the public listing filters by ingredient', async () => {
    // This returned everything before the filter was shared, because the
    // public handler simply did not implement ?ingredients=.
    const found = await names({ ingredients: 'aubergine' }, { isPublic: true });

    assert.deepEqual(found, ['Publieke aubergine']);
  });

  test('the nested AND really means every ingredient', async () => {
    assert.deepEqual(
      await names({ ingredients: 'aubergine,olijfolie' }, { isPublic: true }),
      ['Publieke aubergine'],
    );
    assert.deepEqual(
      await names({ ingredients: 'aubergine,spek' }, { isPublic: true }),
      [],
      'no public recipe has both',
    );
  });

  test('excluding an ingredient removes only those recipes', async () => {
    assert.deepEqual(
      await names({ excludeIngredients: 'spek' }, { isPublic: true }),
      ['Publieke aubergine'],
    );
  });

  test('THE PARITY RULE: public results are the public subset of the owner results', async () => {
    const query = { ingredients: 'aubergine' };

    const ownerSide = await names(query, { belongsToId: ownerId });
    const publicSide = await names(query, { isPublic: true });

    assert.deepEqual(ownerSide, ['Prive aubergine', 'Publieke aubergine']);
    assert.deepEqual(publicSide, ['Publieke aubergine']);
    publicSide.forEach((name) => assert.ok(ownerSide.includes(name)));
  });

  test('the public listing never leaks a private recipe', async () => {
    const found = await names({}, { isPublic: true });

    assert.ok(!found.includes('Prive aubergine'));
    assert.ok(!found.includes('Van iemand anders'));
  });

  test('the owner listing never shows someone else\'s recipe', async () => {
    const found = await names({}, { belongsToId: ownerId });

    assert.ok(!found.includes('Van iemand anders'));
  });

  test('ordering is newest first, and stable across identical queries', async () => {
    // Without an explicit order Postgres may return rows differently between
    // two calls, which is what made paging unreliable.
    const first = await names({}, { isPublic: true });
    const second = await names({}, { isPublic: true });

    assert.deepEqual(first, second);
    assert.deepEqual(first, ['Publieke spek', 'Publieke aubergine']);
  });

  test('THE COUNT BUG: a search counts what it returns', async () => {
    const query = { search: 'aubergine' };
    const where = buildRecipeWhere(query, { isPublic: true });

    const rows = await db.recipe.findMany({ where, orderBy: RECIPE_ORDER });
    const count = await db.recipe.count({ where });

    assert.equal(count, rows.length);
    assert.equal(count, 1, 'one public recipe matches, so pagination must say one');
  });

  test('filters combine rather than override each other', async () => {
    const found = await names(
      { ingredients: 'olijfolie', isVegetarian: 'true' },
      { isPublic: true },
    );

    assert.deepEqual(found, ['Publieke aubergine']);
  });
});
