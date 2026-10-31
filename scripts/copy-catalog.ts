/**
 * Copies the ingredient catalog from one database to another.
 *
 * DRY RUN BY DEFAULT.
 *
 *   SOURCE_DATABASE_URL=<from> SCRIPT_DATABASE_URL=<to> npx tsx scripts/copy-catalog.ts
 *   SOURCE_DATABASE_URL=<from> SCRIPT_DATABASE_URL=<to> npx tsx scripts/copy-catalog.ts --apply
 *
 * The seed CSV was a one-off starting point and has since been overwritten by
 * a later extract run, so the curated catalog now lives in the database that
 * was curated - not in a file. This copies that, which is also more faithful:
 * it carries every edit made through the admin API since the seed.
 *
 * Ids are preserved, so the two databases end up genuinely identical rather
 * than merely equivalent. Upserted by slug, so a second run is a no-op, and
 * aliases are replaced per ingredient rather than accumulated.
 *
 * Nothing here touches Recipe rows.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const apply = process.argv.includes('--apply');

const host = (url: string) => url.replace(/^.*@/, '').replace(/[/?].*$/, '');

const main = async () => {
  const from = process.env.SOURCE_DATABASE_URL;
  const to = process.env.SCRIPT_DATABASE_URL;

  if (!from || !to) {
    console.error('Set both SOURCE_DATABASE_URL and SCRIPT_DATABASE_URL.');
    process.exit(1);
  }
  if (host(from) === host(to)) {
    console.error('Source and target are the same database. Refusing.');
    process.exit(1);
  }

  const source = new PrismaClient({ adapter: new PrismaPg({ connectionString: from }) });
  const target = new PrismaClient({ adapter: new PrismaPg({ connectionString: to }) });

  console.log(`from: ${host(from)}`);
  console.log(`to:   ${host(to)}\n`);

  const categories = await source.ingredientCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const ingredients = await source.ingredient.findMany({ orderBy: { slug: 'asc' } });
  const aliases = await source.ingredientAlias.findMany({ orderBy: { name: 'asc' } });

  const existingIngredients = await target.ingredient.count();
  const existingCategories = await target.ingredientCategory.count();
  const existingAliases = await target.ingredientAlias.count();

  console.log(`source:  ${categories.length} categories, ${ingredients.length} ingredients, ${aliases.length} aliases`);
  console.log(`target:  ${existingCategories} categories, ${existingIngredients} ingredients, ${existingAliases} aliases`);

  const unknownVeg = ingredients.filter((i) => i.isVegetarian === null).length;
  const noCategory = ingredients.filter((i) => !i.categoryId).length;
  console.log(`\nof the ingredients being copied: ${unknownVeg} with vegetarian unknown, ${noCategory} with no category`);
  console.log(`categories: ${categories.map((c) => `${c.nameNl}(${c.sortOrder})`).join(', ')}`);

  if (!apply) {
    console.log('\nDry run. Nothing written. Re-run with --apply to commit.');
    await source.$disconnect();
    await target.$disconnect();
    return;
  }

  for (const category of categories) {
    await target.ingredientCategory.upsert({
      where: { slug: category.slug },
      update: { nameNl: category.nameNl, sortOrder: category.sortOrder },
      create: category,
    });
  }
  console.log(`\ncategories upserted: ${categories.length}`);

  for (const ingredient of ingredients) {
    const { id, slug, createdAt, updatedAt, ...rest } = ingredient;
    void createdAt;
    void updatedAt;
    await target.ingredient.upsert({
      where: { slug },
      update: rest,
      create: { id, slug, ...rest },
    });
  }
  console.log(`ingredients upserted: ${ingredients.length}`);

  // Replaced wholesale per ingredient, so a removed alias does not linger.
  const byIngredient = new Map<string, typeof aliases>();
  for (const alias of aliases) {
    const list = byIngredient.get(alias.ingredientId) ?? [];
    list.push(alias);
    byIngredient.set(alias.ingredientId, list);
  }

  for (const [ingredientId, list] of byIngredient) {
    await target.ingredientAlias.deleteMany({ where: { ingredientId } });
    await target.ingredientAlias.createMany({
      data: list.map((a) => ({ id: a.id, name: a.name, ingredientId })),
      skipDuplicates: true,
    });
  }
  console.log(`aliases replaced: ${aliases.length}`);

  console.log(`\nfinal target state: ${await target.ingredientCategory.count()} categories, ${await target.ingredient.count()} ingredients, ${await target.ingredientAlias.count()} aliases`);

  await source.$disconnect();
  await target.$disconnect();
};

main().catch((e) => { console.error(e.message); process.exit(1); });
