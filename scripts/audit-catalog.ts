/**
 * Read-only health check of the catalog and everything derived from it.
 *
 *   SCRIPT_DATABASE_URL=<url> npx tsx scripts/audit-catalog.ts
 *
 * Writes nothing. Run it after a deploy, after a backfill, or any time the
 * derived data is suspected of having drifted - every number it prints is
 * recomputed from Recipe.ingredients rather than read from the index, so a
 * disagreement means the index is stale.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { deriveDietFlags } from '../src/modules/recipe-ingredients';

const main = async () => {
  const url = process.env.SCRIPT_DATABASE_URL;
  if (!url) { console.error('Set SCRIPT_DATABASE_URL.'); process.exit(1); }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const issues: string[] = [];

  console.log(`host: ${url.replace(/^.*@/, '').replace(/[/?].*$/, '')}\n`);

  const recipes = await prisma.recipe.findMany({
    select: { id: true, name: true, ingredients: true, isVegetarian: true, isVegan: true },
  });
  const catalog = await prisma.ingredient.findMany({ select: { id: true, slug: true, nameNl: true, isVegetarian: true, categoryId: true } });
  const cats = await prisma.ingredientCategory.count();
  const aliases = await prisma.ingredientAlias.findMany({ select: { name: true, ingredientId: true } });
  const index = await prisma.recipeIngredient.findMany({ select: { recipeId: true, ingredientId: true } });
  const lists = await prisma.shoppingList.findMany({ select: { id: true, recipes: true, generatedItems: true } });

  console.log(`recipes ${recipes.length} | catalog ${catalog.length} | categories ${cats} | aliases ${aliases.length} | index ${index.length} | lists ${lists.length}`);

  const known = new Set(catalog.map((c) => c.id));
  let rows = 0, unlinked = 0, badRowId = 0;
  const expected = new Map<number, Set<string>>();

  for (const r of recipes) {
    const rs = Array.isArray(r.ingredients) ? (r.ingredients as any[]) : [];
    rows += rs.length;
    const ids = rs.map((x) => x?.id);
    if (ids.some((i) => !Number.isInteger(i)) || new Set(ids).size !== ids.length) {
      badRowId++; issues.push(`[rowid] recipe ${r.id} ${r.name}: ids ${ids.join(',')}`);
    }
    unlinked += rs.filter((x) => typeof x?.ingredientId !== 'string' || !known.has(x.ingredientId)).length;
    expected.set(r.id, new Set(rs.map((x) => x?.ingredientId).filter((i) => typeof i === 'string' && known.has(i))));
  }

  const actual = new Map<number, Set<string>>();
  for (const i of index) {
    if (!actual.has(i.recipeId)) actual.set(i.recipeId, new Set());
    actual.get(i.recipeId)!.add(i.ingredientId);
  }
  let drift = 0;
  for (const r of recipes) {
    const e = expected.get(r.id)!, a = actual.get(r.id) ?? new Set<string>();
    if ([...e].some((x) => !a.has(x)) || [...a].some((x) => !e.has(x))) {
      drift++; issues.push(`[index] recipe ${r.id} ${r.name} out of step`);
    }
  }

  let disagree = 0, unjudgeable = 0, veg = 0;
  for (const r of recipes) {
    if (r.isVegetarian) veg++;
    const f = await deriveDietFlags(r.ingredients, prisma);
    if (!f) { unjudgeable++; continue; }
    if (f.isVegetarian !== r.isVegetarian || f.isVegan !== r.isVegan) {
      disagree++; issues.push(`[diet] recipe ${r.id} ${r.name}: stored ${r.isVegetarian}/${r.isVegan}, derives ${f.isVegetarian}/${f.isVegan}`);
    }
  }

  const recipeIds = new Set(recipes.map((r) => r.id));
  for (const l of lists) {
    for (const e of (Array.isArray(l.recipes) ? (l.recipes as any[]) : [])) {
      if (!Number.isInteger(e?.id)) { issues.push(`[list] list ${l.id}: entry with no recipe id`); continue; }
      if (!recipeIds.has(e.id)) issues.push(`[list] list ${l.id} references missing recipe ${e.id}`);
    }
    const g: any = l.generatedItems;
    if (g && g.version !== 2) issues.push(`[list] list ${l.id} stale generated cache (v${g.version})`);
  }

  console.log(`rows ${rows} | unlinked ${unlinked} | recipes with a bad row id ${badRowId}`);
  console.log(`index drift ${drift} | diet: ${recipes.length - unjudgeable} judgeable, ${disagree} disagree, ${unjudgeable} unjudgeable`);
  console.log(`vegetarian recipes: ${veg}`);
  console.log(`catalog: ${catalog.filter((c) => !c.categoryId).length} without category, ${catalog.filter((c) => c.isVegetarian === null).length} vegetarian unknown, ${aliases.filter((a) => !known.has(a.ingredientId)).length} orphan aliases`);
  console.log(`\n${issues.length ? `${issues.length} findings:\n` + issues.map((i) => '  ' + i).join('\n') : 'no findings'}`);

  await prisma.$disconnect();
};
main();
