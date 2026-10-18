/**
 * Proves which database a connection string actually points at, before
 * anything is written to it.
 *
 *   npx tsx scripts/verify-target.ts "<connection string>"
 *   npx tsx scripts/verify-target.ts "<connection string>" --expect production
 *   npx tsx scripts/verify-target.ts "<connection string>" --expect develop
 *
 * With --expect it exits non-zero on a mismatch, so it can guard a deploy
 * step rather than merely describe one.
 *
 * The decisive marker is whether the ingredient catalog tables exist: that is
 * exactly what this migration adds, so their absence means the migration has
 * not run here. Spelling is reported too, but only as corroboration - it was
 * the sole check once, and it broke silently when the backfill renamed the
 * row field from `ingredient` to `name`, reporting Develop as production.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.argv[2];
const expectArg = process.argv.indexOf('--expect');
const expected = expectArg === -1 ? null : process.argv[expectArg + 1];

if (!url) {
  console.error('Pass a connection string as the first argument.');
  process.exit(1);
}
if (expected && expected !== 'production' && expected !== 'develop') {
  console.error('--expect takes "production" or "develop".');
  process.exit(1);
}

const main = async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const host = url.replace(/^.*@/, '').replace(/[/?].*$/, '');
  const pooled = host.includes('-pooler');
  console.log(`host:      ${host}`);
  console.log(`pooled:    ${pooled ? 'YES - migrations need the direct endpoint' : 'no (direct)'}`);

  // Does the catalog exist? This is what the migration adds, so it is the
  // marker that separates a migrated database from one that is not.
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Ingredient', 'IngredientAlias', 'IngredientCategory', 'RecipeIngredient')
  `;
  const migrated = tables.length === 4;
  console.log(`catalog:   ${migrated ? 'present (migration has run)' : `absent (${tables.length}/4 tables)`}`);

  const recipes = await prisma.recipe.findMany({ select: { ingredients: true } });
  const users = await prisma.user.count();

  // Reads both field spellings, so a renamed field cannot silently zero this.
  let fixed = 0;
  let unfixed = 0;
  for (const r of recipes) {
    if (!Array.isArray(r.ingredients)) continue;
    for (const row of r.ingredients as { ingredient?: string; name?: string }[]) {
      const v = (row?.name ?? row?.ingredient ?? '').toLowerCase();
      if (v === 'mozzarella') fixed += 1;
      if (v === 'mozarella' || v === 'mozerella') unfixed += 1;
    }
  }

  console.log(`recipes:   ${recipes.length}`);
  console.log(`users:     ${users}`);
  console.log(`spelling:  ${fixed} corrected, ${unfixed} uncorrected`);

  const looksLike = migrated ? 'develop' : 'production';
  console.log(`\nVERDICT:   this looks like ${looksLike.toUpperCase()}`);

  if (expected) {
    const ok = looksLike === expected;
    console.log(ok ? `MATCHES --expect ${expected}.` : `MISMATCH: expected ${expected}.`);
    await prisma.$disconnect();
    process.exit(ok ? 0 : 1);
  }

  await prisma.$disconnect();
};

main().catch((e) => { console.error('Connection failed:', e.message); process.exit(1); });
