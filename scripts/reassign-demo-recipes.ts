/**
 * Moves the demo account's recipes to Eleur and publishes them.
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply.
 *
 *   npx tsx scripts/reassign-demo-recipes.ts
 *   npx tsx scripts/reassign-demo-recipes.ts --apply
 *
 * Re-runnable against production later by repointing SCRIPT_DATABASE_URL.
 * Idempotent: once the recipes have moved, a second run finds nothing to do.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const apply = process.argv.includes('--apply');
const FROM = 'demo';
const TO = 'Eleur';

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL;
  if (!connectionString) {
    console.error('SCRIPT_DATABASE_URL is not set. Refusing to guess which database to write to.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const from = await prisma.user.findUnique({ where: { username: FROM }, select: { id: true } });
  const to = await prisma.user.findUnique({ where: { username: TO }, select: { id: true } });

  if (!from || !to) {
    console.error(`Could not find both users (${FROM}=${!!from}, ${TO}=${!!to}).`);
    process.exit(1);
  }

  const recipes = await prisma.recipe.findMany({
    where: { belongsToId: from.id },
    select: { id: true, name: true, isPublic: true },
    orderBy: { id: 'asc' },
  });

  if (recipes.length === 0) {
    console.log(`Nothing to do - ${FROM} has no recipes.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Moving ${recipes.length} recipes from ${FROM} to ${TO}, and publishing:\n`);
  for (const recipe of recipes) {
    console.log(`  #${recipe.id} "${recipe.name}"  isPublic ${recipe.isPublic} -> true`);
  }

  if (!apply) {
    console.log('\nDry run. Nothing written. Re-run with --apply to commit.');
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.recipe.updateMany({
    where: { belongsToId: from.id },
    data: { belongsToId: to.id, isPublic: true },
  });

  console.log(`\nUpdated ${result.count} recipes.`);

  // The demo account's shopping list still references these recipe ids. That
  // is harmless - the list stores ids, and the recipes still exist - but worth
  // reporting rather than leaving silent.
  const list = await prisma.shoppingList.findFirst({
    where: { belongsToId: from.id },
    select: { recipes: true },
  });
  const stale = Array.isArray(list?.recipes)
    ? (list!.recipes as { id: number }[]).filter((r) => recipes.some((x) => x.id === r.id))
    : [];
  if (stale.length) {
    console.log(`Note: ${FROM}'s shopping list still references ${stale.length} of these recipes.`);
  }

  await prisma.$disconnect();
};

main().catch((e) => { console.error(e); process.exit(1); });
