/**
 * Removes shopping-list entries that have no recipe id.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx tsx scripts/clean-shopping-lists.ts
 *   npx tsx scripts/clean-shopping-lists.ts --apply
 *
 * These were written by the recipe detail page's person selector, which
 * dispatched an update with no id. That is fixed at the source; this clears
 * what it already wrote. Also drops entries pointing at deleted recipes.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const apply = process.argv.includes('--apply');

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('No database URL set.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const lists = await prisma.shoppingList.findMany({
    select: { id: true, recipes: true, belongsTo: { select: { username: true } } },
  });

  const existingIds = new Set(
    (await prisma.recipe.findMany({ select: { id: true } })).map((r) => r.id),
  );

  let changed = 0;

  for (const list of lists) {
    const entries = Array.isArray(list.recipes) ? (list.recipes as unknown[]) : [];

    const kept = entries.filter(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === 'number' &&
        existingIds.has((entry as { id: number }).id),
    );

    if (kept.length === entries.length) continue;

    changed += 1;
    const dropped = entries.length - kept.length;
    console.log(
      `list #${list.id} (${list.belongsTo.username.trim()}): ${entries.length} -> ${kept.length}` +
        `  dropping ${dropped}`,
    );
    for (const entry of entries) {
      if (!kept.includes(entry)) console.log(`    ${JSON.stringify(entry)}`);
    }

    if (apply) {
      await prisma.shoppingList.update({
        where: { id: list.id },
        data: { recipes: kept as never, generatedItems: null },
      });
    }
  }

  console.log(`\n${changed} list(s) ${apply ? 'cleaned' : 'would be cleaned'}.`);
  if (!apply) console.log('Dry run. Re-run with --apply to commit.');
  await prisma.$disconnect();
};

main().catch((e) => { console.error(e); process.exit(1); });
