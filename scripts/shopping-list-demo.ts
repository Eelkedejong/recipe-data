/**
 * Shows what the generated shopping list looks like for a set of recipes.
 *
 *   npx tsx scripts/shopping-list-demo.ts 25 3 74
 *
 * Read-only: it builds the list in memory without saving it.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { mergeQuantities, formatQuantity } from '../src/modules/units';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ids = process.argv.slice(2).map(Number).filter(Boolean);

const main = async () => {
  const recipes = await prisma.recipe.findMany({
    where: ids.length ? { id: { in: ids } } : { belongsTo: { username: 'Eleur' } },
    select: { id: true, name: true, persons: true, ingredients: true },
    take: ids.length ? undefined : 4,
  });

  console.log('Recipes on the list:');
  recipes.forEach((r) => console.log(`  #${r.id} ${r.name} (${r.persons}p)`));

  const catalog = await prisma.ingredient.findMany({
    select: {
      id: true, nameNl: true, nameNlPlural: true,
      category: { select: { slug: true, nameNl: true, sortOrder: true } },
    },
  });
  const byId = new Map(catalog.map((i) => [i.id, i]));

  const buckets = new Map<string, any>();
  for (const recipe of recipes) {
    if (!Array.isArray(recipe.ingredients)) continue;
    for (const row of recipe.ingredients as any[]) {
      const typed = row.name ?? row.ingredient ?? '';
      if (!typed) continue;
      const linked = row.ingredientId ? byId.get(row.ingredientId) : undefined;
      const key = row.ingredientId ? `id:${row.ingredientId}` : `text:${typed.toLowerCase()}`;
      const b = buckets.get(key) ?? {
        name: linked?.nameNl ?? typed,
        plural: linked?.nameNlPlural ?? null,
        cat: linked?.category ?? { slug: 'other', nameNl: 'Overig', sortOrder: 1000 },
        inputs: [], recipes: new Set<number>(), linked: Boolean(linked),
      };
      b.inputs.push({ amount: row.amount, unit: row.unit ?? '' });
      b.recipes.add(recipe.id);
      buckets.set(key, b);
    }
  }

  const groups = new Map<string, any>();
  let merges = 0;
  for (const b of buckets.values()) {
    const { merged, separate } = mergeQuantities(b.inputs);
    if (b.recipes.size > 1) merges += 1;
    const quantities = [
      ...merged.map((m: any) => formatQuantity(m.amount, m.unit)),
      ...separate.map((s: any) => [s.amount, s.unit].filter(Boolean).join(' ').trim()),
    ].filter(Boolean);
    const total = merged.reduce((sum: number, m: any) => sum + m.amount, 0);
    const name = total > 1 && b.plural ? b.plural : b.name;
    const g = groups.get(b.cat.slug) ?? { ...b.cat, items: [] };
    g.items.push({ name, quantities, from: [...b.recipes], linked: b.linked });
    groups.set(b.cat.slug, g);
  }

  console.log('\nGenerated list:\n');
  for (const g of [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder)) {
    console.log(`  ${g.nameNl.toUpperCase()}`);
    g.items.sort((a: any, b: any) => a.name.localeCompare(b.name));
    for (const item of g.items) {
      const shared = item.from.length > 1 ? `   <- merged from ${item.from.length} recipes` : '';
      const flag = item.linked ? ' ' : '*';
      console.log(`   ${flag} ${item.quantities.join(' + ').padEnd(18)} ${item.name}${shared}`);
    }
    console.log('');
  }
  console.log(`  * = not linked to the catalog`);
  console.log(`  ingredients appearing in more than one recipe: ${merges}`);
  await prisma.$disconnect();
};

main().catch((e) => { console.error(e); process.exit(1); });
