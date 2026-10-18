/**
 * Rebuilds the RecipeIngredient index and the derived diet flags.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx tsx scripts/rebuild-recipe-ingredients.ts
 *   npx tsx scripts/rebuild-recipe-ingredients.ts --apply
 *
 * The index is derived from Recipe.ingredients, so it can always be thrown
 * away and rebuilt. Run this after a backfill, after a reseed, or any time
 * the index is suspected of having drifted.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { syncRecipeIngredients, deriveDietFlags } from '../src/modules/recipe-ingredients';

const apply = process.argv.includes('--apply');

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('No database URL set.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      ingredients: true,
      isVegetarian: true,
      isVegan: true,
    },
    orderBy: { id: 'asc' },
  });

  let linkRows = 0;
  let judged = 0;
  const changes: string[] = [];

  for (const recipe of recipes) {
    const rows = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const ids = new Set(
      (rows as { ingredientId?: unknown }[])
        .map((row) => row?.ingredientId)
        .filter((id): id is string => typeof id === 'string'),
    );
    linkRows += ids.size;

    const flags = await deriveDietFlags(recipe.ingredients);
    if (!flags) continue;

    judged += 1;
    if (
      flags.isVegetarian !== recipe.isVegetarian ||
      flags.isVegan !== recipe.isVegan
    ) {
      changes.push(
        `  #${recipe.id} ${recipe.name}: vegetarian ${recipe.isVegetarian} -> ${flags.isVegetarian}` +
          `, vegan ${recipe.isVegan} -> ${flags.isVegan}`,
      );
    }

    if (apply) await syncRecipeIngredients(recipe.id, recipe.ingredients);
  }

  if (apply) {
    // Recipes that cannot be judged still need their index rows.
    for (const recipe of recipes) {
      const flags = await deriveDietFlags(recipe.ingredients);
      if (!flags) await syncRecipeIngredients(recipe.id, recipe.ingredients);
      else {
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            isVegetarian: flags.isVegetarian,
            isVegan: flags.isVegan,
            dietFlagsDerived: true,
          },
        });
      }
    }
  }

  console.log(`Recipes:              ${recipes.length}`);
  console.log(`Index rows:           ${linkRows}`);
  console.log(`Diet flags derivable: ${judged} (${recipes.length - judged} have an unlinked or unknown ingredient)`);

  if (changes.length) {
    console.log(`\nFlags that would change (${changes.length}):`);
    changes.slice(0, 20).forEach((line) => console.log(line));
    if (changes.length > 20) console.log(`  ... and ${changes.length - 20} more`);
  } else {
    console.log('\nNo diet flag would change.');
  }

  console.log(apply ? '\nRebuilt.' : '\nDry run. Re-run with --apply to commit.');
  await prisma.$disconnect();
};

main().catch((e) => { console.error(e); process.exit(1); });
