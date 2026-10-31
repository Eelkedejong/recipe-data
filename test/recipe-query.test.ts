/**
 * The shared recipe filter builder.
 *
 * This is the parity suite. The authenticated and public recipe listings are
 * separate handlers, and the only thing they should differ by is whose
 * recipes they may return. Everything else - which filters exist, what they
 * mean, how they combine, how results are ordered and counted - comes from
 * here, so testing it once covers both.
 *
 * Three bugs lived in the duplicated version this replaced:
 *   - ingredient filtering shipped to the authenticated handler only, so the
 *     public listing ignored ?ingredients= entirely
 *   - the public listing had no ordering, so paging could show a recipe twice
 *     and never show another
 *   - the public count stripped the search condition, so a search matching
 *     three recipes offered pages for twenty-two
 *
 * No database needed: the builder is pure, which is most of why the drift
 * went unnoticed for so long.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRecipeConditions,
  buildRecipeWhere,
  parsePaging,
  RECIPE_ORDER,
} from '../src/modules/recipe-query';

/** The conditions as plain JSON, for readable comparisons. */
const conditions = (query: Record<string, unknown>) =>
  JSON.parse(JSON.stringify(buildRecipeConditions(query)));

/** Does any condition mention this Prisma key? */
const has = (query: Record<string, unknown>, key: string) =>
  JSON.stringify(buildRecipeConditions(query)).includes(`"${key}"`);

describe('no filters', () => {
  test('an empty query filters nothing', () => {
    assert.deepEqual(conditions({}), []);
  });

  test('empty values are ignored rather than matched', () => {
    // A cleared filter in the UI sends ?tags= rather than dropping the key.
    assert.deepEqual(conditions({ tags: '', cuisine: '', search: '' }), []);
  });
});

describe('the visibility scope is the only difference between the listings', () => {
  const query = { tags: 'oven', isVegetarian: 'true' };

  test('the public listing scopes to public recipes', () => {
    const where = buildRecipeWhere(query, { isPublic: true });
    assert.deepEqual((where.AND as unknown[]).at(-1), { isPublic: true });
  });

  test('the authenticated listing scopes to the owner', () => {
    const where = buildRecipeWhere(query, { belongsToId: 'user-1' });
    assert.deepEqual((where.AND as unknown[]).at(-1), { belongsToId: 'user-1' });
  });

  test('THE PARITY RULE: the filters are identical either way', () => {
    const publicSide = buildRecipeWhere(query, { isPublic: true }).AND as unknown[];
    const ownerSide = buildRecipeWhere(query, { belongsToId: 'user-1' }).AND as unknown[];

    assert.deepEqual(
      publicSide.slice(0, -1),
      ownerSide.slice(0, -1),
      'only the scope may differ',
    );
  });

  test('the scope cannot be overridden from the query string', () => {
    // isPublic and belongsToId are not filters, so a crafted query must not
    // reach the where clause at all.
    const where = buildRecipeWhere(
      { isPublic: 'false', belongsToId: 'someone-else' },
      { isPublic: true },
    );

    assert.deepEqual(where.AND, [{ isPublic: true }]);
  });
});

describe('ingredient filters', () => {
  test('every named ingredient must be present, not just one', () => {
    // "aubergine and pasta", not "aubergine or pasta" - the difference
    // between a useful filter and a useless one.
    assert.deepEqual(conditions({ ingredients: 'aubergine,pasta' }), [
      {
        AND: [
          { ingredientLinks: { some: { ingredient: { slug: 'aubergine' } } } },
          { ingredientLinks: { some: { ingredient: { slug: 'pasta' } } } },
        ],
      },
    ]);
  });

  test('excluded ingredients match none of them', () => {
    assert.deepEqual(conditions({ excludeIngredients: 'champignon,prei' }), [
      { ingredientLinks: { none: { ingredient: { slug: { in: ['champignon', 'prei'] } } } } },
    ]);
  });

  test('including and excluding compose rather than clobber', () => {
    const built = conditions({ ingredients: 'aubergine', excludeIngredients: 'spek' });
    assert.equal(built.length, 2);
  });

  test('filters go through the index, not the JSON column', () => {
    // Filtering Recipe.ingredients directly is unindexed and was the reason
    // RecipeIngredient exists at all.
    assert.ok(has({ ingredients: 'aubergine' }, 'ingredientLinks'));
  });
});

describe('array filters', () => {
  test('tags must all be present', () => {
    assert.deepEqual(conditions({ tags: 'oven,italiaans' }), [
      { tags: { hasEvery: ['oven', 'italiaans'] } },
    ]);
  });

  test('meal, dish and cuisine match any of the given values', () => {
    assert.deepEqual(conditions({ typeOfMeal: 'diner,lunch' }), [
      { typeOfMeal: { hasSome: ['diner', 'lunch'] } },
    ]);
    assert.deepEqual(conditions({ typeOfDish: 'pasta' }), [
      { typeOfDish: { hasSome: ['pasta'] } },
    ]);
    assert.deepEqual(conditions({ cuisine: 'Italian,French' }), [
      { cuisine: { hasSome: ['Italian', 'French'] } },
    ]);
  });
});

describe('boolean filters', () => {
  test('true filters for true', () => {
    assert.deepEqual(conditions({ isVegetarian: 'true' }), [{ isVegetarian: true }]);
  });

  test('false filters for false, rather than not filtering', () => {
    assert.deepEqual(conditions({ isChildFriendly: 'false' }), [{ isChildFriendly: false }]);
  });

  test('an empty value does not filter at all', () => {
    // The two handlers disagreed here: one ignored ?isVegetarian=, the other
    // read it as false and hid every vegetarian recipe.
    assert.deepEqual(conditions({ isVegetarian: '', isChildFriendly: '' }), []);
  });
});

describe('time', () => {
  test('is a maximum, not an exact match', () => {
    assert.deepEqual(conditions({ time: '30' }), [{ time: { lte: 30 } }]);
  });

  test('zero and nonsense are ignored', () => {
    assert.deepEqual(conditions({ time: '0' }), []);
    assert.deepEqual(conditions({ time: 'soon' }), []);
  });
});

describe('ids', () => {
  test('matches the listed ids', () => {
    assert.deepEqual(conditions({ ids: '3,7' }), [{ id: { in: [3, 7] } }]);
  });

  test('a non-numeric id is dropped rather than failing the request', () => {
    // Passing NaN to Prisma throws, so one bad id used to fail the whole
    // request instead of simply not matching.
    assert.deepEqual(conditions({ ids: '3,abc,7' }), [{ id: { in: [3, 7] } }]);
  });

  test('all-bad ids filter nothing rather than matching nothing', () => {
    assert.deepEqual(conditions({ ids: 'abc' }), []);
  });
});

describe('search', () => {
  test('matches name, description or tags', () => {
    const [clause] = conditions({ search: 'pasta' }) as [{ OR: unknown[] }];
    assert.equal(clause.OR.length, 4);
  });

  test('is case insensitive on name and description', () => {
    const built = JSON.stringify(conditions({ search: 'Pasta' }));
    assert.ok(built.includes('insensitive'));
  });

  test('THE COUNT BUG: search is an ordinary condition, not a special case', () => {
    // The public handler used to delete the OR clause before counting, so the
    // count ignored the search: three results, pagination for twenty-two.
    // Keeping search in the same conditions array as everything else means a
    // caller cannot count a different query than it fetched.
    const built = buildRecipeWhere({ search: 'pasta' }, { isPublic: true });
    const serialised = JSON.stringify(built);

    assert.ok(serialised.includes('"OR"'), 'the search condition must be in the where clause');
    assert.equal((built.AND as unknown[]).length, 2, 'search plus the scope');
  });
});

describe('ordering', () => {
  test('THE PAGING BUG: there is always an order', () => {
    // Postgres gives no ordering guarantee. Paging through an unordered query
    // can show the same recipe on two pages and never show another. The
    // public listing had no orderBy at all.
    assert.deepEqual(RECIPE_ORDER, { id: 'desc' });
  });
});

describe('paging', () => {
  test('defaults to the first page of twelve', () => {
    assert.deepEqual(parsePaging({}), { page: 1, limit: 12, offset: 0 });
  });

  test('offset follows from page and limit', () => {
    assert.deepEqual(parsePaging({ page: '3', limit: '10' }), {
      page: 3,
      limit: 10,
      offset: 20,
    });
  });

  test('a limit is capped, so a hand-edited query cannot ask for everything', () => {
    assert.equal(parsePaging({ limit: '100000' }).limit, 100);
  });

  test('nonsense falls back to the defaults rather than NaN', () => {
    // NaN offsets reach Prisma as invalid arguments and fail the request.
    assert.deepEqual(parsePaging({ page: 'two', limit: 'lots' }), {
      page: 1,
      limit: 12,
      offset: 0,
    });
    assert.deepEqual(parsePaging({ page: '-4', limit: '0' }), {
      page: 1,
      limit: 12,
      offset: 0,
    });
  });
});
