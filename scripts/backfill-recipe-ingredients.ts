/**
 * Phase 3: link each recipe's ingredient rows to the catalog.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx tsx scripts/backfill-recipe-ingredients.ts
 *   npx tsx scripts/backfill-recipe-ingredients.ts --apply
 *   npx tsx scripts/backfill-recipe-ingredients.ts --apply --exclude-author=Truitje
 *
 * Rewrites each row from the old shape to the new one:
 *
 *   { unit, amount, ingredient, id }
 *   -> { id, ingredientId, name, amount, unit, prep }
 *
 * A row that matches the catalog gets an ingredientId, the catalog's display
 * name, and any qualifier moved into prep. A row that does not match keeps
 * its original text and gets ingredientId: null - which every downstream
 * feature is built to tolerate.
 *
 * Idempotent: reads name ?? ingredient, so running it twice is a no-op.
 * Before writing it saves every recipe's current ingredients to a timestamped
 * JSON file, so the change can be reversed with restore-recipe-ingredients.ts.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normaliseIngredient } from './lib/normalise';

const apply = process.argv.includes('--apply');
const excludeAuthors = (process.argv.find((a) => a.startsWith('--exclude-author='))?.split('=')[1] ?? '')
  .split(',')
  .map((n) => n.trim())
  .filter(Boolean);
const backupDir =
  process.argv.find((a) => a.startsWith('--backup-dir='))?.split('=')[1] ?? 'scripts/out/backups';

interface OldRow {
  id?: number;
  unit?: unknown;
  amount?: unknown;
  ingredient?: unknown;
  name?: unknown;
  prep?: unknown;
  ingredientId?: unknown;
}

interface NewRow {
  id: number;
  ingredientId: string | null;
  name: string;
  amount: number | string | null;
  unit: string;
  prep: string;
}

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('No SCRIPT_DATABASE_URL or DATABASE_URL set.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  // The whole alias table, in memory. It is small, and this turns 434 lookups
  // into zero queries.
  const aliases = await prisma.ingredientAlias.findMany({
    select: { name: true, ingredient: { select: { id: true, slug: true, nameNl: true } } },
  });
  const byAlias = new Map(aliases.map((a) => [a.name, a.ingredient]));

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      ingredients: true,
      belongsTo: { select: { username: true } },
    },
    orderBy: { id: 'asc' },
  });

  const updates: { id: number; ingredients: NewRow[] }[] = [];
  const backup: { id: number; ingredients: unknown }[] = [];

  let totalRows = 0;
  let matchedRows = 0;
  let alreadyLinked = 0;
  let prepExtracted = 0;
  let skippedRecipes = 0;

  const unmatched = new Map<string, { count: number; recipes: Set<number>; example: string }>();

  for (const recipe of recipes) {
    const author = (recipe.belongsTo?.username ?? '').trim();
    if (excludeAuthors.includes(author)) {
      skippedRecipes += 1;
      continue;
    }
    if (!Array.isArray(recipe.ingredients)) continue;

    const rows = recipe.ingredients as OldRow[];
    let changed = false;

    const next: NewRow[] = rows.map((row, index) => {
      // Reading name first makes a second run a no-op.
      const source =
        typeof row.name === 'string' && row.name
          ? row.name
          : typeof row.ingredient === 'string'
            ? row.ingredient
            : '';

      totalRows += 1;

      const normalised = normaliseIngredient(source);
      const hit = normalised.matchKey ? byAlias.get(normalised.matchKey) : undefined;

      if (row.ingredientId) alreadyLinked += 1;

      // Qualifiers found now, merged with anything already stored, deduped so
      // a second run cannot accumulate them.
      const existingPrep = typeof row.prep === 'string' && row.prep ? row.prep.split(', ') : [];
      const prepParts = [...new Set([...existingPrep, ...normalised.prep].filter(Boolean))].filter(
        // A qualifier that is part of the matched ingredient's own name is not
        // preparation: "vegetarisch gehakt" is an ingredient, not minced
        // something that happens to be vegetarian.
        (part) => !hit || !hit.nameNl.toLowerCase().includes(part.toLowerCase()),
      );
      const prep = prepParts.join(', ');
      if (prep && !existingPrep.length) prepExtracted += 1;

      if (hit) {
        matchedRows += 1;
      } else if (normalised.matchKey) {
        const entry = unmatched.get(normalised.matchKey) ?? {
          count: 0,
          recipes: new Set<number>(),
          example: source,
        };
        entry.count += 1;
        entry.recipes.add(recipe.id);
        unmatched.set(normalised.matchKey, entry);
      }

      const built: NewRow = {
        id: typeof row.id === 'number' ? row.id : index + 1,
        ingredientId: hit?.id ?? null,
        // Matched rows take the catalog's spelling, which is where the
        // consistency comes from. Unmatched rows keep exactly what was typed.
        name: hit ? hit.nameNl : normalised.name || source,
        amount:
          typeof row.amount === 'number' || typeof row.amount === 'string' ? row.amount : null,
        unit: typeof row.unit === 'string' ? row.unit : '',
        prep,
      };

      const before = JSON.stringify({
        id: row.id,
        ingredientId: row.ingredientId ?? null,
        name: row.name ?? row.ingredient,
        amount: row.amount ?? null,
        unit: row.unit ?? '',
        prep: row.prep ?? '',
      });
      if (JSON.stringify(built) !== before) changed = true;

      return built;
    });

    if (changed) {
      updates.push({ id: recipe.id, ingredients: next });
      backup.push({ id: recipe.id, ingredients: recipe.ingredients });
    }
  }

  await prisma.$disconnect();

  const pct = (n: number) => (totalRows ? Math.round((n / totalRows) * 100) : 0);
  const rankedUnmatched = [...unmatched.entries()].sort((a, b) => b[1].count - a[1].count);

  console.log(`Recipes:            ${recipes.length - skippedRecipes}${skippedRecipes ? ` (${skippedRecipes} skipped)` : ''}`);
  console.log(`Ingredient rows:    ${totalRows}`);
  console.log(`Matched to catalog: ${matchedRows} (${pct(matchedRows)}%)`);
  console.log(`Left as free text:  ${totalRows - matchedRows} (${pct(totalRows - matchedRows)}%)`);
  console.log(`Prep extracted:     ${prepExtracted} rows`);
  if (alreadyLinked) console.log(`Already linked:     ${alreadyLinked} (re-run)`);
  console.log(`Recipes to update:  ${updates.length}`);

  if (rankedUnmatched.length) {
    console.log(`\nUnmatched ingredients (${rankedUnmatched.length}), ranked - this is the`);
    console.log('queue for extending the catalog. Re-run after adding them.\n');
    for (const [key, info] of rankedUnmatched.slice(0, 25)) {
      console.log(`  ${String(info.count).padStart(3)}x  ${key}${info.example !== key ? `   ("${info.example}")` : ''}`);
    }
    if (rankedUnmatched.length > 25) {
      console.log(`  ... and ${rankedUnmatched.length - 25} more`);
    }
  }

  // A sample, so the shape change is visible rather than described.
  if (updates.length) {
    const sample = updates[0];
    console.log(`\nSample - recipe #${sample.id}:`);
    sample.ingredients.slice(0, 5).forEach((r) => {
      console.log(
        `  ${r.ingredientId ? 'LINKED  ' : 'free    '}${r.amount ?? ''} ${r.unit} ${r.name}` +
          `${r.prep ? `  [prep: ${r.prep}]` : ''}`,
      );
    });
  }

  if (!apply) {
    console.log('\nDry run. Nothing written. Re-run with --apply to commit.');
    return;
  }

  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `recipe-ingredients-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written to ${backupPath}`);

  const writer = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  for (const update of updates) {
    await writer.recipe.update({
      where: { id: update.id },
      data: { ingredients: update.ingredients as never },
    });
  }
  await writer.$disconnect();

  console.log(`Updated ${updates.length} recipes.`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
