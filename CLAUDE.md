# recipe-data — the API

Express 5 + Prisma 7 + Neon Postgres, TypeScript, deployed to Vercel at
`cookbook-data.vercel.app`. See `../CLAUDE.md` for deploy and database rules
that apply to both repos.

## Layout

```
src/index.ts        entry
src/server.ts       app, middleware order, router mounts
src/db.ts           the Prisma singleton (see the trap below)
src/routers/        router.ts (authenticated), public.ts
src/handlers/       request/response only
src/handlers/public/  the signed-out equivalents
src/modules/        the actual logic; reusable, no req/res
src/config/         per-environment config
scripts/            one-off and maintenance scripts, run with tsx
```

Two mounts, and the distinction matters:

- `app.use('/api', protect, router)` — everything behind authentication
- `app.use('/public', publicRouter)` — signed-out, and per `PRODUCT.md` this
  is the hot path

**The two recipe listings share their filter logic.** `modules/recipe-query.ts`
builds the where clause; the handlers add only their own visibility scope
(`belongsToId` for the authenticated one, `isPublic: true` for the public
one). Add a filter there and both listings get it.

They used to duplicate that logic and it drifted three times, so **do not
reintroduce the duplication**. The rest of the surface is still paired by
hand, though — the four filter endpoints exist twice, in `handlers/filters.ts`
and `handlers/public/filters.ts`. For anything outside the listings, check
whether the public side needs the same change.

## Prisma

- Prisma 7: connection URLs live in `prisma.config.ts`, **not** in
  `schema.prisma`. The config uses `DIRECT_URL`.
- `DIRECT_URL` — unpooled. Migrations only. They cannot run through PgBouncer.
- `DATABASE_URL` — pooled, via the `PrismaPg` driver adapter. Runtime.
- Migrations: `DIRECT_URL=$PROD_DIRECT_URL npx prisma migrate deploy`

### The trap: module functions must take an explicit client

`src/db.ts` exports a singleton built from `DATABASE_URL`. A script that
builds *its own* client for a different database, and then calls a module
function that silently uses the singleton, writes to **two different
databases in one operation**. This has happened and it cost a rebuild:
production got zero index rows while develop got production's.

So every module function that touches the database takes the client as a
defaulted parameter:

```ts
import defaultPrisma from '../db';
type Db = typeof defaultPrisma;

export const syncRecipeIngredients = async (
  recipeId: number,
  ingredients: unknown,
  prisma: Db = defaultPrisma
) => { /* ... */ };
```

Scripts pass their own client. Handlers pass nothing. **Keep this pattern on
any new module function that queries.** It is not decoration.

## Data model rules

### `Recipe.ingredients` is the source of truth

It is a JSON column, and it holds order, amounts, units and free text that the
form is built on. `RecipeIngredient` is a **derived index** that exists only
to be queryable (filtering a JSON column is unindexed and awkward). It can be
rebuilt from the JSON at any time and must never be edited as if it were
authoritative.

Rebuild: `scripts/rebuild-recipe-ingredients.ts`.
Verify: `scripts/audit-catalog.ts` — read-only, and it *recomputes* the index
and diet flags rather than trusting what is stored, which is how the
cross-database bug above was caught.

### Row ids are load-bearing

`Recipe.ingredients[].id` is referenced from outside the recipe: shopping
lists store `listState.excludedRows` by that id. Renumber a row and the wrong
ingredient disappears from someone's grocery list.

`createRecipe` and `updateRecipe` run ingredients through `withRowIds()`,
which keeps every id the client sent and fills in only ones that are missing
or collide. **Never reassign ids wholesale, and never derive one from array
position.**

### The ingredient catalog is not hand-editable

Do not recommend editing `Ingredient` rows directly in Prisma Studio or SQL.
`createIngredient` also runs `syncDerivedAliases` and
`invalidateCatalogCache`. A hand-written row therefore gets **no alias rows**
— so the backfill can never match recipe text to it — and the catalog cache
serves stale data for up to 5 minutes. Go through the API, or write a script
that calls the same module functions.

### `isVegetarian` / `isVegan`: null is not false

`null` means *unknown*. A recipe's diet flags are only derived
(`dietFlagsDerived`) when **every** linked ingredient answers definitively;
one unknown ingredient leaves the recipe's own flags untouched. Code that
treats `null` as `false` will mislabel food, which is the one category of bug
here with real-world consequences.

### Shopping lists

- `generatedItems` is a **cache**, rebuilt whenever the list's recipes change.
- `listState` is the opposite: ticks, exclusions and hand-added items that
  must **survive** that rebuild. The two are separate columns precisely
  because one gets thrown away.
- Editing or deleting a recipe must propagate: `refreshListsContaining()` and
  `removeRecipeFromLists()` in `modules/shopping-list.ts`.

## Auth

`requireAdmin` reads the role **from the database**, not from the JWT, so a
revoked admin loses access immediately rather than at token expiry. Keep it
that way.

Rate limiter (`modules/limiter.ts`): 50 requests per minute. Scripted test
runs trip it; that is the limiter working, not a bug.

## Testing

`npm test` — Node's built-in runner through `tsx`, no test framework
installed. `npm run test:watch` while working.

**New work ships with tests** — see the root `CLAUDE.md` for the rule. A
feature or fix without tests in the same change is not finished.

```
test/recipe-rows.test.ts       row identity (the shopping-list exclusion bug)
test/units.test.ts             unit conversion, merging, display
test/ingredient-text.test.ts   the normaliser and matchKey
```

54 tests, ~100ms, **no database required** — everything here is pure logic.
Keep it that way: a suite that needs a connection stops being run.

Two conventions worth keeping:

- **Each test says why it exists**, not just what it asserts. These cases were
  chosen because a naive implementation silently does the wrong thing; the
  reasoning is the valuable part and it belongs next to the assertion.
- **Prove a new test fails before trusting it.** Break the code it covers,
  watch the right test go red, then restore. A test written against already-
  working code can assert the wrong thing and never tell you.

### Database-backed tests

```
test/recipe-ingredients.db.test.ts   the derived index and diet flags
test/shopping-list.db.test.ts        generation, scaling, exclusions, propagation
test/publishing.db.test.ts           who may publish to the public site
test/recipe-query.db.test.ts         the filter clauses against real Prisma
```

`test/recipe-query.test.ts` is the parity suite and needs no database: the
filter builder is pure, which is most of why the drift went unnoticed. Its
database counterpart exists because a clause can have the right *shape* and
still be rejected by Prisma or match the wrong rows — the ingredient filter
nests an `AND` inside an `AND`.

They **skip** unless `TEST_DATABASE_URL` is set, so `npm test` stays useful
without the setup. `test/db-harness.ts` holds the client and fixtures, and
documents the one-time Neon setup (a *schema-only* branch — tables, no rows,
no copy of anyone's data).

Two things about that harness are load-bearing:

- **It refuses by hostname to run against the production or develop
  endpoints.** These tests delete rows.
- **`--test-concurrency=1` in the test script.** Node runs test *files* in
  parallel by default, and both database files truncate the same database in
  `beforeEach` — in parallel they wipe each other's fixtures and fail in
  confusing ways. One file at a time.

The test named `THE TRAP` in each file proves an explicit client is honoured.
That only means anything because the test database differs from the app
singleton's — which is the whole reason the setup is worth doing.

### Still not covered

No tests go through HTTP. Handlers import the `src/db` singleton directly, so
they cannot be pointed at the test database without overriding `DATABASE_URL`
before import — the same trap the modules were fixed for, still present one
layer up. Parity is covered at the module level instead, which is where the
logic now lives; what remains untested is the wiring itself: routing,
validators, auth middleware and status codes.

## Scripts

Run with `npx tsx scripts/<name>.ts`. Read-only ones are safe to reach for;
the writing ones take `--apply` and should be run without it first.

- `audit-catalog.ts` — read-only health check. Start here.
- `verify-target.ts [--expect production|develop]` — which database am I on.
- `rebuild-recipe-ingredients.ts` — rebuild the derived index.
- `backfill-recipe-ingredients.ts` — link recipe text to catalog ingredients.
- `copy-catalog.ts` — copy catalog between databases, preserving UUIDs.
- `fix-ingredient-text.ts` — normalise recipe ingredient text. Deliberately
  skips rows needing human judgement.

`scripts/out/` is gitignored. Do not treat anything in it as recoverable —
the seed CSV was once silently overwritten and git could not get it back.

## Gaps and known outstanding items

State as of 2026-10-31, after the production deploy of the ingredient
catalog refactor.

- **No ESLint config in this repo.** Tests exist now, but only for pure
  logic — see Testing above for what is still uncovered.
- **33 recipe ingredient rows on production are unlinked** (mostly compound
  phrases like `citroensap & olijfolie of sladressing`). `unlinkedCount` is
  computed but never surfaced in the UI; those rows land under *Overig*.
- **`bouillon` has no `isVegetarian` value** — the single unknown in the
  catalog, and the reason 24 recipes can't be diet-judged. One field fixes it.
- **Fixed 2026-10-31: only admins can publish.** `createRecipe` and
  `updateRecipe` used to take `isPublic` straight from the request body, and
  the route sits behind `protect` but not `requireAdmin` — so any signed-in
  user could put a recipe on the public site with a direct API call.
  `modules/publishing.ts` now gates it: a non-admin asking for
  `isPublic: true` gets a 403 rather than a silent downgrade, so a future
  admin UI cannot quietly fail to publish. The role is read from the database,
  not the token, matching `requireAdmin`.
- **Fixed 2026-10-31: ticks no longer accumulate.** `listState.ticked` was
  never pruned, and because item keys are stable across rebuilds
  (`id:<ingredientId>`), a tick left by a removed recipe attached itself to
  the next recipe using that ingredient — the line came back already ticked.
  `refreshShoppingList` now drops ticks for lines the rebuild does not
  contain.
- **Five recipe ingredient rows need human judgement.** `fix-ingredient-text.ts`
  deliberately skips them; the owner said they would handle these by hand:
  - #38 `Peper en zout`
  - #39 `Kop sterke koffie`
  - #57 `Knoflook, peper zout`
  - #76 a dish name used as an ingredient
  - #77 `Macaroni groente 450 gram`
- **develop and production have drifted** on the derived index: develop has
  394 linked rows / 38 unlinked, production has 399 / 33. develop was
  backfilled before the last catalog entries existed. `backfill-recipe-ingredients.ts --apply`
  against develop evens them up. Both audit clean apart from this.
- **`scripts/.DS_Store` is tracked in git.** Worth untracking.
- **The develop Neon branch holds a full copy of production user data**,
  including another person's email address and bcrypt password hashes. It is
  a copy-on-write branch of production and was never scrubbed. Consider
  deleting it, or at least do not treat it as non-sensitive.

### Production baseline

The clean audit to compare future runs against:

```
recipes 56 | catalog 156 | categories 11 | aliases 326 | index 399 | lists 3
rows 434 | unlinked 33 | bad row ids 0 | index drift 0
diet: 32 judgeable, 0 disagree, 24 unjudgeable | vegetarian 22
catalog: 0 without category, 1 vegetarian unknown, 0 orphan aliases
no findings
```
