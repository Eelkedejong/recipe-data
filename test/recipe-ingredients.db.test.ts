/**
 * The derived index and diet flags, against a real database.
 *
 * Skips unless TEST_DATABASE_URL points at a throwaway Neon branch - see
 * test/db-harness.ts for the one-time setup.
 *
 * The most important thing these tests establish is in the first case below:
 * passing an explicit client must mean the writes land in *that* database.
 * That only proves anything because the test database is a different one from
 * the app singleton's, which is why these tests are worth the setup.
 */
import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncRecipeIngredients,
  deriveDietFlags,
  syncRecipe,
} from '../src/modules/recipe-ingredients';
import {
  canRunDbTests,
  skipReason,
  testDb,
  testDbHost,
  resetDb,
  disconnect,
  makeUser,
  seedCatalog,
  makeRecipe,
} from './db-harness';

describe('recipe-ingredients against a database', { skip: !canRunDbTests && skipReason }, () => {
  let db: ReturnType<typeof testDb>;
  let catalog: Awaited<ReturnType<typeof seedCatalog>>;
  let userId: string;

  before(async () => {
    db = testDb();
    // Printed so a failing run says which database it was talking to. Host
    // only - never the connection string.
    console.log(`    using test database ${testDbHost()}`);
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

  describe('syncRecipeIngredients', () => {
    test('THE TRAP: writes through the client it was given', async () => {
      // The regression this guards: these functions used to reach for the
      // src/db singleton regardless of what the caller passed, so a script
      // pointed at one database wrote its index rows to another. Production
      // ended up with zero index rows while develop got production's.
      //
      // The test database is deliberately not the singleton's database, so if
      // the explicit client were ignored the rows would land elsewhere and
      // the count below would be 0.
      const recipe = await makeRecipe(userId);

      await syncRecipeIngredients(
        recipe.id,
        [{ id: 1, name: 'aubergine', ingredientId: catalog.aubergine.id }],
        db,
      );

      const rows = await db.recipeIngredient.findMany({ where: { recipeId: recipe.id } });
      assert.equal(rows.length, 1, 'the row must exist in the database we passed in');
      assert.equal(rows[0].ingredientId, catalog.aubergine.id);
    });

    test('indexes every linked ingredient', async () => {
      const recipe = await makeRecipe(userId);

      await syncRecipeIngredients(
        recipe.id,
        [
          { id: 1, ingredientId: catalog.aubergine.id },
          { id: 2, ingredientId: catalog.olijfolie.id },
        ],
        db,
      );

      const rows = await db.recipeIngredient.findMany({ where: { recipeId: recipe.id } });
      assert.equal(rows.length, 2);
    });

    test('deduplicates an ingredient used on two rows', async () => {
      // "1 el olijfolie" for the pan and "2 el olijfolie" for the dressing is
      // two rows but one catalog entry, and the index is keyed on the pair.
      const recipe = await makeRecipe(userId);

      await syncRecipeIngredients(
        recipe.id,
        [
          { id: 1, ingredientId: catalog.olijfolie.id },
          { id: 2, ingredientId: catalog.olijfolie.id },
        ],
        db,
      );

      const rows = await db.recipeIngredient.findMany({ where: { recipeId: recipe.id } });
      assert.equal(rows.length, 1);
    });

    test('replaces the previous index rather than adding to it', async () => {
      const recipe = await makeRecipe(userId);

      await syncRecipeIngredients(recipe.id, [{ ingredientId: catalog.spek.id }], db);
      await syncRecipeIngredients(recipe.id, [{ ingredientId: catalog.aubergine.id }], db);

      const rows = await db.recipeIngredient.findMany({ where: { recipeId: recipe.id } });
      assert.equal(rows.length, 1, 'the old link must be gone');
      assert.equal(rows[0].ingredientId, catalog.aubergine.id);
    });

    test('skips an id pointing at a deleted ingredient instead of failing', async () => {
      // A recipe has to keep working when a catalog entry is removed; the
      // row's stored name still carries the display text.
      const recipe = await makeRecipe(userId);
      const goneId = catalog.spek.id;
      await db.ingredient.delete({ where: { id: goneId } });

      await syncRecipeIngredients(
        recipe.id,
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: goneId }],
        db,
      );

      const rows = await db.recipeIngredient.findMany({ where: { recipeId: recipe.id } });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].ingredientId, catalog.aubergine.id);
    });

    test('unlinked rows produce no index rows', async () => {
      // Free text that matched nothing in the catalog - 33 such rows exist on
      // production. They are expected, not an error.
      const recipe = await makeRecipe(userId);

      await syncRecipeIngredients(recipe.id, [{ id: 1, name: 'peper en zout' }], db);

      const rows = await db.recipeIngredient.findMany({ where: { recipeId: recipe.id } });
      assert.equal(rows.length, 0);
    });
  });

  describe('deriveDietFlags', () => {
    test('judges a fully linked vegetarian recipe', async () => {
      const flags = await deriveDietFlags(
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: catalog.olijfolie.id }],
        db,
      );

      assert.deepEqual(flags, { isVegetarian: true, isVegan: true, derived: true });
    });

    test('one non-vegetarian ingredient makes the recipe non-vegetarian', async () => {
      const flags = await deriveDietFlags(
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: catalog.spek.id }],
        db,
      );

      assert.deepEqual(flags, { isVegetarian: false, isVegan: false, derived: true });
    });

    test('THE RULE: one unknown ingredient means no answer at all', async () => {
      // bouillon has isVegetarian null. null is unknown, not false - and
      // flipping a recipe to vegetarian because the stock was unrecognised
      // would mislabel food, which is the one bug class here with real
      // consequences.
      const flags = await deriveDietFlags(
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: catalog.bouillon.id }],
        db,
      );

      assert.equal(flags, null, 'unknown must mean unjudgeable, not vegetarian');
    });

    test('an unlinked row makes the recipe unjudgeable', async () => {
      const flags = await deriveDietFlags(
        [{ ingredientId: catalog.aubergine.id }, { id: 2, name: 'iets onbekends' }],
        db,
      );

      assert.equal(flags, null);
    });

    test('an id pointing at a deleted ingredient is also an unknown', async () => {
      const goneId = catalog.spek.id;
      await db.ingredient.delete({ where: { id: goneId } });

      const flags = await deriveDietFlags(
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: goneId }],
        db,
      );

      assert.equal(flags, null);
    });

    test('no ingredients means no answer', async () => {
      assert.equal(await deriveDietFlags([], db), null);
      assert.equal(await deriveDietFlags(undefined, db), null);
    });

    test('vegetarian but not vegan is reported as such', async () => {
      const kaas = await db.ingredient.create({
        data: {
          slug: 'kaas',
          nameNl: 'kaas',
          categoryId: catalog.categories.vegetables.id,
          isVegetarian: true,
          isVegan: false,
        },
      });

      const flags = await deriveDietFlags(
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: kaas.id }],
        db,
      );

      assert.deepEqual(flags, { isVegetarian: true, isVegan: false, derived: true });
    });
  });

  describe('syncRecipe', () => {
    test('writes the derived flags and marks them derived', async () => {
      const recipe = await makeRecipe(userId, { isVegetarian: false });

      const flags = await syncRecipe(
        recipe.id,
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: catalog.olijfolie.id }],
        db,
      );

      assert.deepEqual(flags, { isVegetarian: true, isVegan: true, derived: true });

      const saved = await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } });
      assert.equal(saved.isVegetarian, true);
      assert.equal(saved.dietFlagsDerived, true);
    });

    test("leaves the owner's own flags alone when it cannot judge", async () => {
      // The user said vegetarian; the ingredients cannot confirm it. Their
      // answer stands, and dietFlagsDerived stays false to record that.
      const recipe = await makeRecipe(userId, { isVegetarian: true });

      const flags = await syncRecipe(recipe.id, [{ ingredientId: catalog.bouillon.id }], db);

      assert.equal(flags, null);

      const saved = await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } });
      assert.equal(saved.isVegetarian, true, 'the manual flag must survive');
      assert.equal(saved.dietFlagsDerived, false);
    });

    test('still builds the index when the flags cannot be judged', async () => {
      const recipe = await makeRecipe(userId);

      await syncRecipe(
        recipe.id,
        [{ ingredientId: catalog.aubergine.id }, { ingredientId: catalog.bouillon.id }],
        db,
      );

      const rows = await db.recipeIngredient.findMany({ where: { recipeId: recipe.id } });
      assert.equal(rows.length, 2, 'filtering must work even when the diet is unknown');
    });
  });
});
