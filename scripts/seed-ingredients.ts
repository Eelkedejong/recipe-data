/**
 * Seeds the ingredient catalog from the curated CSV.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx tsx scripts/seed-ingredients.ts
 *   npx tsx scripts/seed-ingredients.ts --apply
 *   npx tsx scripts/seed-ingredients.ts --apply --csv=scripts/out/ingredients.csv
 *
 * Re-runnable: categories and ingredients are upserted by slug, so editing
 * the CSV and running it again updates in place rather than duplicating.
 * Aliases are replaced wholesale per ingredient.
 *
 * Rows are skipped when SKIP is set or FINAL_slug is empty. Several rows
 * sharing a FINAL_slug become one ingredient with several aliases.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'node:fs';
import { CATEGORIES } from './lib/vocabulary';
import { toMatchKey } from './lib/normalise';

const apply = process.argv.includes('--apply');
const csvPath =
  process.argv.find((a) => a.startsWith('--csv='))?.split('=')[1] ??
  'scripts/out/ingredients.csv';

const QUOTE = '"';

/** Minimal CSV reader handling quoted cells and embedded commas. */
const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === QUOTE) {
        if (text[i + 1] === QUOTE) {
          cell += QUOTE;
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === QUOTE) {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ''));
  return body.map((cells) =>
    Object.fromEntries(header.map((key, i) => [key, (cells[i] ?? '').trim()])),
  );
};

const bool = (value: string): boolean | null =>
  value === 'true' ? true : value === 'false' ? false : null;

interface Entry {
  slug: string;
  nameNl: string;
  nameNlPlural: string | null;
  category: string | null;
  baseUnit: string | null;
  isVegetarian: boolean | null;
  isVegan: boolean | null;
  seasonMonths: number[];
  aliases: Set<string>;
  rows: number;
}

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL;
  if (!connectionString) {
    console.error('SCRIPT_DATABASE_URL is not set. Refusing to guess which database to write to.');
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const entries = new Map<string, Entry>();
  let skipped = 0;

  for (const row of rows) {
    const slug = row.FINAL_slug;
    if (!slug || row.SKIP) {
      skipped += 1;
      continue;
    }

    const occurrences = Number(row.occurrences) || 0;
    const existing = entries.get(slug);

    if (existing) {
      existing.aliases.add(row.matchKey);
      existing.rows += occurrences;
      if (!existing.nameNl && row.FINAL_nameNl) existing.nameNl = row.FINAL_nameNl;
    } else {
      entries.set(slug, {
        slug,
        nameNl: row.FINAL_nameNl || row.cleanedName,
        nameNlPlural: row.FINAL_namePlural || null,
        category: row.FINAL_category || null,
        baseUnit: row.FINAL_baseUnit || null,
        isVegetarian: bool(row.FINAL_isVegetarian),
        isVegan: bool(row.FINAL_isVegan),
        seasonMonths: (row.FINAL_seasonMonths || '')
          .split(/[^0-9]+/)
          .filter(Boolean)
          .map(Number)
          .filter((m) => m >= 1 && m <= 12),
        aliases: new Set([row.matchKey]),
        rows: occurrences,
      });
    }
  }

  // Every display form is also an alias, so autocomplete finds the entry by
  // its own name even when that spelling never appeared in a recipe.
  for (const entry of entries.values()) {
    entry.aliases.add(toMatchKey(entry.slug.replace(/-/g, ' ')));
    entry.aliases.add(toMatchKey(entry.nameNl));
    if (entry.nameNlPlural) entry.aliases.add(toMatchKey(entry.nameNlPlural));
    entry.aliases.delete('');
  }

  // An alias may only point at one ingredient. Ties go to the more-used entry.
  const owner = new Map<string, string>();
  const conflicts: string[] = [];
  for (const entry of [...entries.values()].sort((a, b) => b.rows - a.rows)) {
    for (const alias of [...entry.aliases]) {
      const held = owner.get(alias);
      if (held && held !== entry.slug) {
        conflicts.push(`"${alias}" claimed by both ${held} and ${entry.slug} - kept on ${held}`);
        entry.aliases.delete(alias);
      } else {
        owner.set(alias, entry.slug);
      }
    }
  }

  const usedCategories = new Set(
    [...entries.values()].map((e) => e.category).filter(Boolean),
  );
  const totalAliases = [...entries.values()].reduce((n, e) => n + e.aliases.size, 0);

  console.log(`CSV rows:          ${rows.length}`);
  console.log(`Skipped:           ${skipped}`);
  console.log(`Catalog entries:   ${entries.size}`);
  console.log(`Aliases:           ${totalAliases}`);
  console.log(`Categories in use: ${usedCategories.size} of ${CATEGORIES.length}`);

  if (conflicts.length) {
    console.log(`\nAlias conflicts resolved (${conflicts.length}):`);
    conflicts.forEach((c) => console.log(`  ${c}`));
  }

  const missingCategory = [...entries.values()].filter((e) => !e.category);
  if (missingCategory.length) {
    console.log(`\nNo category set, will group under "Overig": ${missingCategory.length}`);
    console.log(
      `  ${missingCategory.slice(0, 12).map((e) => e.slug).join(', ')}` +
        `${missingCategory.length > 12 ? ', ...' : ''}`,
    );
  }

  if (!apply) {
    console.log('\nDry run. Nothing written. Re-run with --apply to commit.');
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  for (const category of CATEGORIES) {
    await prisma.ingredientCategory.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        nameNl: category.nameNl,
        sortOrder: category.sortOrder,
      },
      update: { nameNl: category.nameNl, sortOrder: category.sortOrder },
    });
  }

  const categoryIds = new Map(
    (await prisma.ingredientCategory.findMany({ select: { id: true, slug: true } })).map(
      (c) => [c.slug, c.id] as const,
    ),
  );

  for (const entry of entries.values()) {
    const data = {
      nameNl: entry.nameNl,
      nameNlPlural: entry.nameNlPlural,
      categoryId: entry.category ? categoryIds.get(entry.category) ?? null : null,
      baseUnit: entry.baseUnit,
      isVegetarian: entry.isVegetarian,
      isVegan: entry.isVegan,
      seasonMonths: entry.seasonMonths,
    };

    const ingredient = await prisma.ingredient.upsert({
      where: { slug: entry.slug },
      create: { slug: entry.slug, ...data },
      update: data,
    });

    await prisma.ingredientAlias.deleteMany({ where: { ingredientId: ingredient.id } });
    await prisma.ingredientAlias.createMany({
      data: [...entry.aliases].map((name) => ({ name, ingredientId: ingredient.id })),
      skipDuplicates: true,
    });
  }

  console.log(`\nSeeded ${entries.size} ingredients and ${totalAliases} aliases.`);
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
