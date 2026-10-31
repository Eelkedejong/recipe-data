/**
 * Shopping list generation and the propagation that keeps it honest.
 *
 * Skips unless TEST_DATABASE_URL is set - see test/db-harness.ts.
 *
 * The thing worth testing here is that the generated list is a *cache*. It is
 * rebuilt whenever a list's recipes change, which means:
 *
 *   - editing a recipe has to reach every list already holding it, or someone
 *     shops from the version before the edit;
 *   - deleting a recipe has to take it off those lists, because the recipe ids
 *     live in a Json column and nothing cascades;
 *   - and the exclusions a user made have to survive all of that, because they
 *     are stored by row id in a different column on purpose.
 */
import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateShoppingList,
  refreshShoppingList,
  refreshListsContaining,
  removeRecipeFromLists,
} from '../src/modules/shopping-list';
import {
  canRunDbTests,
  skipReason,
  testDb,
  resetDb,
  disconnect,
  makeUser,
  seedCatalog,
} from './db-harness';

describe('shopping lists against a database', { skip: !canRunDbTests && skipReason }, () => {
  let db: ReturnType<typeof testDb>;
  let catalog: Awaited<ReturnType<typeof seedCatalog>>;
  let userId: string;

  before(() => {
    db = testDb();
  });

  after(async () => {
    await resetDb();
    await disconnect();
  });

  beforeEach(async () => {
    await resetDb();
    catalog = await seedCatalog();
    userId = (await makeUser()).id;
  });

  /** A recipe with two linked rows and one free-text row. */
  const recipeWithRows = (overrides: Record<string, unknown> = {}) =>
    db.recipe.create({
      data: {
        name: 'Ovenschotel',
        persons: 2,
        tags: [],
        typeOfMeal: [],
        typeOfDish: [],
        cuisine: [],
        steps: [],
        ingredients: [
          { id: 1, name: 'aubergine', amount: '1', unit: 'stuks', ingredientId: catalog.aubergine.id },
          { id: 2, name: 'olijfolie', amount: '2', unit: 'el', ingredientId: catalog.olijfolie.id },
          { id: 3, name: 'peper en zout', amount: '', unit: '' },
        ],
        belongsToId: userId,
        ...overrides,
      },
    });

  const listWith = (recipes: unknown[]) =>
    db.shoppingList.create({
      data: { recipes: recipes as never, items: [], extraItems: [], belongsToId: userId },
    });

  const allItems = (generated: Awaited<ReturnType<typeof generateShoppingList>>) =>
    generated.groups.flatMap((group) => group.items);

  describe('generateShoppingList', () => {
    test('groups linked ingredients into their aisle', async () => {
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);

      const generated = await generateShoppingList(userId, db);
      const slugs = generated.groups.map((group) => group.categorySlug);

      assert.ok(slugs.includes('groente'), `expected a groente group, got ${slugs.join(', ')}`);
    });

    test('counts rows that matched nothing in the catalog', async () => {
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);

      const generated = await generateShoppingList(userId, db);

      // "peper en zout" is free text. Expected, not an error - 33 such rows
      // exist on production.
      assert.equal(generated.unlinkedCount, 1);
    });

    test('still lists an unlinked row rather than dropping it', async () => {
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);

      const names = allItems(await generateShoppingList(userId, db)).map((item) => item.name);

      assert.ok(names.includes('peper en zout'), `got ${names.join(', ')}`);
    });

    test('scales amounts to the number of persons asked for', async () => {
      const recipe = await recipeWithRows(); // written for 2
      await listWith([{ id: recipe.id, persons: 4 }]);

      const items = allItems(await generateShoppingList(userId, db));
      const oil = items.find((item) => item.name === 'olijfolie');

      // 2 el for two people becomes 4 el for four.
      assert.ok(
        JSON.stringify(oil).includes('4'),
        `expected a doubled amount, got ${JSON.stringify(oil)}`,
      );
    });

    test('takes the recipe as written when the serving count is unusable', async () => {
      const recipe = await recipeWithRows({ persons: 0 });
      await listWith([{ id: recipe.id, persons: 4 }]);

      const items = allItems(await generateShoppingList(userId, db));
      const oil = items.find((item) => item.name === 'olijfolie');

      // Rather than multiplying by a guess.
      assert.ok(JSON.stringify(oil).includes('2'), JSON.stringify(oil));
    });

    test('THE EXCLUSION: a row the user unticked stays off the list', async () => {
      const recipe = await recipeWithRows();
      // Row id 2 is olijfolie. This is the id a shopping list stores, and the
      // reason row ids must never be renumbered.
      await listWith([{ id: recipe.id, persons: 2, excludedRows: [2] }]);

      const names = allItems(await generateShoppingList(userId, db)).map((item) => item.name);

      assert.ok(!names.includes('olijfolie'), `olijfolie should be excluded, got ${names.join(', ')}`);
      assert.ok(names.includes('aubergine'), 'the other rows must survive');
    });

    test('merges the same ingredient used by two recipes', async () => {
      const one = await recipeWithRows();
      const two = await recipeWithRows({ name: 'Pasta' });
      await listWith([
        { id: one.id, persons: 2 },
        { id: two.id, persons: 2 },
      ]);

      const items = allItems(await generateShoppingList(userId, db));
      const aubergines = items.filter((item) => item.name === 'aubergine');

      assert.equal(aubergines.length, 1, 'one line, not one per recipe');
    });

    test('an empty list generates nothing rather than failing', async () => {
      await listWith([]);

      const generated = await generateShoppingList(userId, db);

      assert.deepEqual(generated.groups, []);
      assert.equal(generated.unlinkedCount, 0);
    });

    test('ignores legacy entries that carry no recipe id', async () => {
      // Existing lists contain entries like {"persons":3}; passing those to
      // Prisma inside an `in` array throws.
      const recipe = await recipeWithRows();
      await listWith([{ persons: 3 }, { id: recipe.id, persons: 2 }]);

      const generated = await generateShoppingList(userId, db);

      assert.ok(generated.groups.length > 0);
    });
  });

  describe('ticking things off', () => {
    const storedState = async () => {
      const list = await db.shoppingList.findFirstOrThrow({ where: { belongsToId: userId } });
      return (list.listState ?? { ticked: {}, extras: [] }) as unknown as {
        ticked: Record<string, boolean>;
        extras: { id: string; name: string; ticked?: boolean }[];
      };
    };

    const setTicked = (ticked: Record<string, boolean>, extras: unknown[] = []) =>
      db.shoppingList.updateMany({
        where: { belongsToId: userId },
        data: { listState: { ticked, extras } as never },
      });

    test('a tick survives a rebuild while its line is still on the list', async () => {
      // Ticking is not deleting, and an unrelated edit must not undo it.
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);
      await setTicked({ [`id:${catalog.aubergine.id}`]: true });

      await refreshShoppingList(userId, db);

      const state = await storedState();
      assert.equal(state.ticked[`id:${catalog.aubergine.id}`], true);
    });

    test('a tick is dropped once its line is gone', async () => {
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);
      await setTicked({
        [`id:${catalog.aubergine.id}`]: true,
        [`id:${catalog.spek.id}`]: true, // never on this list
      });

      await refreshShoppingList(userId, db);

      const state = await storedState();
      assert.equal(state.ticked[`id:${catalog.aubergine.id}`], true, 'the live one stays');
      assert.equal(
        `id:${catalog.spek.id}` in state.ticked,
        false,
        'the one with no line must be dropped',
      );
    });

    test('THE BUG: an ingredient coming back is not already ticked', async () => {
      // Item keys are stable across rebuilds on purpose - that is what lets a
      // tick survive an edit. The same stability meant a tick left over from a
      // removed recipe attached itself to the next recipe using that
      // ingredient, so the line reappeared already ticked and got walked past
      // in the shop.
      const first = await recipeWithRows();
      await listWith([{ id: first.id, persons: 2 }]);
      await refreshShoppingList(userId, db);

      await setTicked({ [`id:${catalog.aubergine.id}`]: true });

      // The recipe is taken off the list entirely...
      await removeRecipeFromLists(first.id, db);

      // ...and a different recipe that also uses aubergine is added later.
      const second = await recipeWithRows({ name: 'Moussaka' });
      await db.shoppingList.updateMany({
        where: { belongsToId: userId },
        data: { recipes: { set: [{ id: second.id, persons: 2 }] as never } },
      });
      const rebuilt = await refreshShoppingList(userId, db);

      const aubergine = rebuilt.groups
        .flatMap((group) => group.items)
        .find((item) => item.name === 'aubergine');
      assert.ok(aubergine, 'the ingredient should be back on the list');

      const state = await storedState();
      assert.notEqual(
        state.ticked[aubergine.key],
        true,
        'a newly added ingredient must start unticked',
      );
    });

    test('hand-added extras keep their own ticked flag', async () => {
      // Extras carry `ticked` on themselves rather than in the keyed map, so
      // pruning the map must not touch them.
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);
      await setTicked({ [`id:${catalog.spek.id}`]: true }, [
        { id: 'x1', name: 'vuilniszakken', categorySlug: null, ticked: true },
      ]);

      await refreshShoppingList(userId, db);

      const state = await storedState();
      assert.equal(state.extras.length, 1, 'the extra must survive the prune');
      assert.equal(state.extras[0].ticked, true);
    });
  });

  describe('propagation when a recipe changes', () => {
    test('refreshListsContaining rebuilds the cached list', async () => {
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);
      await refreshShoppingList(userId, db);

      // The ingredient is renamed after the list was already built.
      await db.recipe.update({
        where: { id: recipe.id },
        data: {
          ingredients: [
            { id: 1, name: 'courgette', amount: '1', unit: 'stuks' },
          ] as never,
        },
      });

      const touched = await refreshListsContaining(recipe.id, db);
      assert.equal(touched, 1);

      const stored = await db.shoppingList.findFirstOrThrow({ where: { belongsToId: userId } });
      const names = (stored.generatedItems as never as { groups: { items: { name: string }[] }[] })
        .groups.flatMap((group) => group.items)
        .map((item) => item.name);

      assert.ok(names.includes('courgette'), `stale cache: ${names.join(', ')}`);
      assert.ok(!names.includes('aubergine'));
    });

    test('a list that does not hold the recipe is left alone', async () => {
      const held = await recipeWithRows();
      const other = await recipeWithRows({ name: 'Iets anders' });
      await listWith([{ id: held.id, persons: 2 }]);

      const touched = await refreshListsContaining(other.id, db);

      assert.equal(touched, 0);
    });

    test('removeRecipeFromLists takes a deleted recipe off the list', async () => {
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);
      await refreshShoppingList(userId, db);

      const touched = await removeRecipeFromLists(recipe.id, db);
      assert.equal(touched, 1);

      const stored = await db.shoppingList.findFirstOrThrow({ where: { belongsToId: userId } });
      assert.deepEqual(stored.recipes, [], 'the reference must be gone');

      const groups = (stored.generatedItems as never as { groups: unknown[] }).groups;
      assert.deepEqual(groups, [], 'and the cached lines with it');
    });

    test('removing one recipe leaves the others on the list', async () => {
      const gone = await recipeWithRows();
      const kept = await recipeWithRows({ name: 'Blijft' });
      await listWith([
        { id: gone.id, persons: 2 },
        { id: kept.id, persons: 2 },
      ]);

      await removeRecipeFromLists(gone.id, db);

      const stored = await db.shoppingList.findFirstOrThrow({ where: { belongsToId: userId } });
      assert.deepEqual(stored.recipes, [{ id: kept.id, persons: 2 }]);
    });

    test('THE TRAP: propagation writes through the client it was given', async () => {
      // Same guard as in recipe-ingredients.db.test.ts. These functions took
      // no client at all until this suite was written, so they always used the
      // app singleton - meaning a script pointed at another database would
      // have rebuilt the wrong database's lists.
      const recipe = await recipeWithRows();
      await listWith([{ id: recipe.id, persons: 2 }]);

      await refreshShoppingList(userId, db);

      const stored = await db.shoppingList.findFirstOrThrow({ where: { belongsToId: userId } });
      assert.notEqual(stored.generatedItems, null, 'the cache must exist in the database we passed');
    });
  });
});
