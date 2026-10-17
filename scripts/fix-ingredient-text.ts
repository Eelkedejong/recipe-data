/**
 * Tidies ingredient text in existing recipes, for consistency.
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply.
 *
 *   npx tsx scripts/fix-ingredient-text.ts            # show what would change
 *   npx tsx scripts/fix-ingredient-text.ts --apply    # write it
 *
 * Three passes, in increasing order of opinion:
 *   1. whitespace     trim and collapse. Pure win, no judgement.
 *   2. capitalisation ALL CAPS -> sentence case, and capitalise the first
 *                     letter. Fixes "ui" / "Ui" / "UI" being three strings.
 *                     Never touches letters mid-string, so proper nouns like
 *                     "Parmezaanse" and "IJsbergsla" survive.
 *   3. corrections    the curated map in lib/corrections.ts.
 *
 * Idempotent: running it twice changes nothing the second time. Re-runnable
 * against production later with SCRIPT_DATABASE_URL pointed there.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CORRECTIONS, NEEDS_REVIEW } from './lib/corrections';
import { stripDiacritics } from './lib/normalise';

const apply = process.argv.includes('--apply');

/** The key used to look up corrections: lowercase, trimmed, accents folded. */
const fold = (input: string): string =>
  stripDiacritics(input.toLowerCase()).replace(/\s+/g, ' ').trim();

const tidyWhitespace = (input: string): string => input.replace(/\s+/g, ' ').trim();

const tidyCapitalisation = (input: string): string => {
  if (!input) return input;
  // Shouty entries get lowercased first, otherwise capitalising does nothing.
  const base =
    input.length > 1 && input === input.toUpperCase() && /[A-Z]/.test(input)
      ? input.toLowerCase()
      : input;
  return base.charAt(0).toUpperCase() + base.slice(1);
};

interface Change {
  recipeId: number;
  recipeName: string;
  from: string;
  to: string;
  pass: 'whitespace' | 'capitalisation' | 'correction';
}

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL;
  if (!connectionString) {
    console.error('SCRIPT_DATABASE_URL is not set. Refusing to guess which database to write to.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const recipes = await prisma.recipe.findMany({
    select: { id: true, name: true, ingredients: true },
    orderBy: { id: 'asc' },
  });

  const changes: Change[] = [];
  const review: { recipeId: number; recipeName: string; text: string; why: string }[] = [];
  const updates: { id: number; ingredients: unknown }[] = [];

  for (const recipe of recipes) {
    if (!Array.isArray(recipe.ingredients)) continue;

    let recipeChanged = false;
    const next = (recipe.ingredients as Record<string, unknown>[]).map((row) => {
      const original = typeof row?.ingredient === 'string' ? row.ingredient : '';
      if (!original) return row;

      let value = original;

      const trimmed = tidyWhitespace(value);
      if (trimmed !== value) {
        changes.push({ recipeId: recipe.id, recipeName: recipe.name, from: value, to: trimmed, pass: 'whitespace' });
        value = trimmed;
      }

      const correction = CORRECTIONS[fold(value)];
      if (correction && correction !== value) {
        changes.push({ recipeId: recipe.id, recipeName: recipe.name, from: value, to: correction, pass: 'correction' });
        value = correction;
      } else {
        const capitalised = tidyCapitalisation(value);
        if (capitalised !== value) {
          changes.push({ recipeId: recipe.id, recipeName: recipe.name, from: value, to: capitalised, pass: 'capitalisation' });
          value = capitalised;
        }
      }

      const flag = NEEDS_REVIEW[fold(value)];
      if (flag) {
        review.push({ recipeId: recipe.id, recipeName: recipe.name, text: value, why: flag });
      }

      if (value !== original) {
        recipeChanged = true;
        return { ...row, ingredient: value };
      }
      return row;
    });

    // Units only get whitespace tidying - what counts as a unit is still an
    // open design question, so this script does not rewrite them.
    const withUnits = next.map((row) => {
      const unit = typeof row?.unit === 'string' ? row.unit : '';
      const tidied = tidyWhitespace(unit);
      if (unit && tidied !== unit) {
        recipeChanged = true;
        return { ...row, unit: tidied };
      }
      return row;
    });

    if (recipeChanged) updates.push({ id: recipe.id, ingredients: withUnits });
  }

  const byPass = (pass: Change['pass']) => changes.filter((c) => c.pass === pass);

  for (const pass of ['correction', 'capitalisation', 'whitespace'] as const) {
    const group = byPass(pass);
    console.log(`\n=== ${pass} (${group.length}) ===`);
    const seen = new Set<string>();
    for (const change of group) {
      const key = `${change.from}->${change.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const count = group.filter((c) => `${c.from}->${c.to}` === key).length;
      console.log(`  "${change.from}" -> "${change.to}"${count > 1 ? `  (${count}x)` : ''}`);
    }
  }

  if (review.length) {
    console.log(`\n=== needs a human decision (${review.length}) - NOT changed ===`);
    for (const item of review) {
      console.log(`  #${item.recipeId} ${item.recipeName}`);
      console.log(`     "${item.text}" - ${item.why}`);
    }
  }

  console.log(`\n${changes.length} edits across ${updates.length} recipes.`);

  if (!apply) {
    console.log('\nDry run. Nothing written. Re-run with --apply to commit.');
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(
    updates.map((update) =>
      prisma.recipe.update({
        where: { id: update.id },
        data: { ingredients: update.ingredients as never },
      }),
    ),
  );

  console.log(`\nApplied to ${updates.length} recipes.`);
  await prisma.$disconnect();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
