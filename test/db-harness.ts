/**
 * Connection and fixtures for the database-backed tests.
 *
 * These tests need a **throwaway** database. They create and delete rows, so
 * pointing them at develop or production would be destructive - which is why
 * the connection comes from its own variable and is refused if it looks like
 * either of those.
 *
 * Setup (once), in the Neon console:
 *
 *   1. Create a new branch with "Branch schema only" - tables but no rows, so
 *      no copy of anyone's data. Auto-delete: Never. Name it `test`.
 *   2. Put both of its connection strings in recipe-data/.env as
 *      TEST_DATABASE_URL (the pooled one, host contains `-pooler`) and
 *      TEST_DIRECT_URL (the direct one).
 *
 * A schema-only branch already has the tables, so there is no migrate step.
 * If the schema later drifts from main, re-create the branch rather than
 * migrating it - it holds nothing worth keeping.
 *
 * Without TEST_DATABASE_URL the database tests skip rather than fail, so
 * `npm test` stays useful on a machine that has not been set up.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

/** True when the suite can run. Used as `{ skip: !canRunDbTests }`. */
export const canRunDbTests = Boolean(TEST_DATABASE_URL)

export const skipReason =
  'TEST_DATABASE_URL is not set - see the setup notes in test/db-harness.ts'

/**
 * Refuses to run against the databases that hold real data.
 *
 * Checked by endpoint host rather than by the whole URL, so nothing secret is
 * ever compared, logged or thrown. The known endpoints are:
 *   production  ep-shy-fire-b1pntfgg
 *   develop     ep-weathered-dust-b1b1zy2e
 */
const FORBIDDEN_HOSTS = ['ep-shy-fire-b1pntfgg', 'ep-weathered-dust-b1b1zy2e']

const assertSafeTarget = (url: string): string => {
  let host: string
  try {
    host = new URL(url).host
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL')
  }

  for (const forbidden of FORBIDDEN_HOSTS) {
    if (host.includes(forbidden)) {
      throw new Error(
        `Refusing to run destructive tests against ${forbidden} - that is a database with real data in it. ` +
          'Point TEST_DATABASE_URL at a throwaway Neon branch.',
      )
    }
  }

  return host
}

let client: PrismaClient | null = null

/** The test client. Safe to call repeatedly; one client per process. */
export const testDb = (): PrismaClient => {
  if (!TEST_DATABASE_URL) {
    throw new Error(skipReason)
  }

  if (!client) {
    assertSafeTarget(TEST_DATABASE_URL)
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
    })
  }

  return client
}

/** The host of the test database, for a test to print. Never the full URL. */
export const testDbHost = (): string => assertSafeTarget(TEST_DATABASE_URL!)

export const disconnect = async (): Promise<void> => {
  if (client) {
    await client.$disconnect()
    client = null
  }
}

/**
 * Empties every table this suite touches.
 *
 * Order matters: children before parents, because the schema's cascades do
 * not cover every path and a wrong order fails on a foreign key.
 */
export const resetDb = async (): Promise<void> => {
  const db = testDb()
  await db.recipeIngredient.deleteMany()
  await db.ingredientAlias.deleteMany()
  await db.shoppingList.deleteMany()
  await db.savedRecipe.deleteMany()
  await db.recipe.deleteMany()
  await db.ingredient.deleteMany()
  await db.ingredientCategory.deleteMany()
  await db.user.deleteMany()
}

let userSeq = 0

/** A user to own recipes. Unique per call, so tests do not collide. */
export const makeUser = async (role: 'USER' | 'ADMIN' = 'USER') => {
  const db = testDb()
  userSeq += 1
  return db.user.create({
    data: {
      username: `test-user-${userSeq}`,
      email: `test-user-${userSeq}@example.test`,
      // Not a real hash: nothing here authenticates.
      password: 'not-a-hash',
      role,
    },
  })
}

/**
 * A small catalog: two aisles and four ingredients with known diet flags,
 * including one deliberately unknown.
 *
 * `bouillon` is left with isVegetarian null on purpose - it mirrors the one
 * real unknown in the production catalog and is what makes a recipe
 * unjudgeable.
 */
export const seedCatalog = async () => {
  const db = testDb()

  const vegetables = await db.ingredientCategory.create({
    data: { slug: 'groente', nameNl: 'Groente', sortOrder: 1 },
  })
  const meat = await db.ingredientCategory.create({
    data: { slug: 'vlees', nameNl: 'Vlees', sortOrder: 2 },
  })

  const aubergine = await db.ingredient.create({
    data: {
      slug: 'aubergine',
      nameNl: 'aubergine',
      categoryId: vegetables.id,
      isVegetarian: true,
      isVegan: true,
      baseUnit: 'piece',
    },
  })
  const olijfolie = await db.ingredient.create({
    data: {
      slug: 'olijfolie',
      nameNl: 'olijfolie',
      categoryId: vegetables.id,
      isVegetarian: true,
      isVegan: true,
      baseUnit: 'ml',
    },
  })
  const spek = await db.ingredient.create({
    data: {
      slug: 'spek',
      nameNl: 'spek',
      categoryId: meat.id,
      isVegetarian: false,
      isVegan: false,
      baseUnit: 'g',
    },
  })
  const bouillon = await db.ingredient.create({
    data: {
      slug: 'bouillon',
      nameNl: 'bouillon',
      categoryId: vegetables.id,
      // null, not false: unknown is not the same as "contains meat".
      isVegetarian: null,
      isVegan: null,
    },
  })

  return { categories: { vegetables, meat }, aubergine, olijfolie, spek, bouillon }
}

/** A recipe whose ingredients JSON matches the shape the handlers write. */
export const makeRecipe = async (
  belongsToId: string,
  overrides: Record<string, unknown> = {},
) => {
  const db = testDb()
  return db.recipe.create({
    data: {
      name: 'Test recipe',
      persons: 2,
      tags: [],
      typeOfMeal: [],
      typeOfDish: [],
      cuisine: [],
      steps: [],
      ingredients: [
        { id: 1, name: 'aubergine', amount: '1', unit: 'stuks', prep: '' },
        { id: 2, name: 'olijfolie', amount: '2', unit: 'el', prep: '' },
      ],
      belongsToId,
      ...overrides,
    },
  })
}
