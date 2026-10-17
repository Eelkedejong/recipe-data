/**
 * Proves which database a connection string actually points at, before any
 * migration runs against it.
 *
 *   npx tsx scripts/verify-target.ts "<connection string>"
 *
 * The check is behavioural rather than cosmetic: the Develop branch has had
 * the spelling fixes applied, production has not. If "Mozarella" is still
 * present this is NOT the dev branch.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.argv[2];
if (!url) {
  console.error('Pass a connection string as the first argument.');
  process.exit(1);
}

const main = async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const host = url.replace(/^.*@/, '').replace(/\/.*$/, '');
  console.log(`host:     ${host}`);
  console.log(`pooled:   ${host.includes('-pooler') ? 'YES (cannot run migrations)' : 'no (direct)'}`);

  const recipes = await prisma.recipe.findMany({ select: { ingredients: true } });
  let fixed = 0;
  let unfixed = 0;
  for (const r of recipes) {
    if (!Array.isArray(r.ingredients)) continue;
    for (const row of r.ingredients as { ingredient?: string }[]) {
      const v = (row?.ingredient ?? '').toLowerCase();
      if (v === 'mozzarella') fixed += 1;
      if (v === 'mozarella' || v === 'mozerella') unfixed += 1;
    }
  }

  const users = await prisma.user.count();
  console.log(`recipes:  ${recipes.length}`);
  console.log(`users:    ${users}`);
  console.log(`spelling: ${fixed} corrected, ${unfixed} uncorrected`);
  console.log(
    unfixed === 0 && fixed > 0
      ? '\nVERDICT: this is the Develop branch (fixes present). Safe to migrate.'
      : '\nVERDICT: fixes NOT present - this looks like PRODUCTION. Do not migrate.',
  );

  await prisma.$disconnect();
};

main().catch((e) => { console.error('Connection failed:', e.message); process.exit(1); });
