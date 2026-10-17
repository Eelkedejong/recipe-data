/**
 * Phase 1: mine a candidate ingredient catalog out of the recipes that exist.
 *
 * READ-ONLY. This script never writes to the database.
 *
 *   npx tsx scripts/extract-ingredients.ts
 *   npx tsx scripts/extract-ingredients.ts --author=eelke   # house recipes first
 *   npx tsx scripts/extract-ingredients.ts --out=scripts/out
 *   npx tsx scripts/extract-ingredients.ts --fixture=scripts/fixtures/sample-recipes.json
 *
 * Connection: uses SCRIPT_DATABASE_URL if set, otherwise DATABASE_URL. Point
 * SCRIPT_DATABASE_URL at a Neon dev branch so a stray run cannot touch prod.
 *
 * Outputs into --out (default scripts/out):
 *   ingredients.csv  one row per distinct ingredient, ranked by use, with
 *                    suggested canonical name / category / unit pre-filled
 *   units.csv        every distinct unit string already in the data
 *   report.md        coverage curve and the data-quality problems found
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normaliseIngredient, toMatchKey } from './lib/normalise';
import { CATEGORIES, SUGGESTION_INDEX, UNIT_ALIASES } from './lib/vocabulary';
import { findCandidates, buildClusters } from './lib/similarity';

interface Args {
  author?: string;
  out: string;
  /** Read recipes from a JSON file instead of the database. */
  fixture?: string;
}

const parseArgs = (argv: string[]): Args => {
  const args: Args = { out: 'scripts/out' };
  for (const arg of argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'author' && value) args.author = value;
    if (key === 'out' && value) args.out = value;
    if (key === 'fixture' && value) args.fixture = value;
  }
  return args;
};

interface RecipeRow {
  unit?: unknown;
  amount?: unknown;
  ingredient?: unknown;
}

interface Group {
  matchKey: string;
  /** Cleaned names seen for this key, with counts, most common first. */
  names: Map<string, number>;
  /** The untouched original strings, for eyeballing what was stripped. */
  rawExamples: Set<string>;
  prepExamples: Set<string>;
  units: Map<string, number>;
  recipeIds: Set<number>;
  authors: Set<string>;
  /** Rows where this ingredient appeared, total. */
  occurrences: number;
  /** Rows whose amount was typed into the name field. */
  embeddedAmounts: Set<string>;
}

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvRow = (cells: unknown[]): string => cells.map(csvCell).join(',');

const mostCommon = (counts: Map<string, number>): string =>
  [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '';

const main = async () => {
  const args = parseArgs(process.argv);

  interface SourceRecipe {
    id: number;
    name: string;
    ingredients: unknown;
    isPublic?: boolean;
    belongsTo?: { username: string } | null;
  }

  let recipes: SourceRecipe[];

  if (args.fixture) {
    recipes = JSON.parse(fs.readFileSync(args.fixture, 'utf8')) as SourceRecipe[];
    console.log(`Reading ${recipes.length} recipes from fixture ${args.fixture}\n`);
  } else {
    const connectionString =
      process.env.SCRIPT_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('No SCRIPT_DATABASE_URL or DATABASE_URL set. Nothing to read.');
      process.exit(1);
    }

    if (!process.env.SCRIPT_DATABASE_URL) {
      console.warn(
        'Warning: SCRIPT_DATABASE_URL is not set, falling back to DATABASE_URL.\n' +
          '         This script only reads, but prefer pointing it at a dev branch.\n',
      );
    }

    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });

    recipes = await prisma.recipe.findMany({
      select: {
        id: true,
        name: true,
        ingredients: true,
        isPublic: true,
        belongsTo: { select: { username: true } },
      },
      orderBy: { id: 'asc' },
    });

    await prisma.$disconnect();
  }

  const groups = new Map<string, Group>();
  const unitCounts = new Map<string, number>();

  let totalRows = 0;
  let emptyNameRows = 0;
  const malformedRecipes: { id: number; name: string; reason: string }[] = [];

  for (const recipe of recipes) {
    const author = recipe.belongsTo?.username ?? 'unknown';
    if (args.author && author !== args.author) continue;

    if (!Array.isArray(recipe.ingredients)) {
      malformedRecipes.push({
        id: recipe.id,
        name: recipe.name,
        reason: `ingredients is ${recipe.ingredients === null ? 'null' : typeof recipe.ingredients}, not an array`,
      });
      continue;
    }

    for (const row of recipe.ingredients as RecipeRow[]) {
      totalRows += 1;

      const rawName = typeof row?.ingredient === 'string' ? row.ingredient : '';
      const normalised = normaliseIngredient(rawName);

      // Track the unit vocabulary actually in use, regardless of name quality.
      const rawUnit = typeof row?.unit === 'string' ? row.unit.trim().toLowerCase() : '';
      if (rawUnit) unitCounts.set(rawUnit, (unitCounts.get(rawUnit) ?? 0) + 1);

      if (!normalised.matchKey) {
        emptyNameRows += 1;
        continue;
      }

      let group = groups.get(normalised.matchKey);
      if (!group) {
        group = {
          matchKey: normalised.matchKey,
          names: new Map(),
          rawExamples: new Set(),
          prepExamples: new Set(),
          units: new Map(),
          recipeIds: new Set(),
          authors: new Set(),
          occurrences: 0,
          embeddedAmounts: new Set(),
        };
        groups.set(normalised.matchKey, group);
      }

      group.occurrences += 1;
      group.names.set(normalised.name, (group.names.get(normalised.name) ?? 0) + 1);
      if (group.rawExamples.size < 5) group.rawExamples.add(normalised.raw);
      normalised.prep.forEach((p) => {
        if (group!.prepExamples.size < 6) group!.prepExamples.add(p);
      });
      if (rawUnit) group.units.set(rawUnit, (group.units.get(rawUnit) ?? 0) + 1);
      group.recipeIds.add(recipe.id);
      group.authors.add(author);
      if (normalised.embeddedAmount) group.embeddedAmounts.add(normalised.embeddedAmount);
    }
  }

  const ranked = [...groups.values()].sort(
    (a, b) => b.occurrences - a.occurrences || a.matchKey.localeCompare(b.matchKey),
  );

  // ---- near-duplicate detection ----
  const allKeys = ranked.map((g) => g.matchKey);
  const candidates = findCandidates(allKeys);
  const clusters = buildClusters(allKeys, candidates);

  /** matchKey -> the other members of its cluster. */
  const clusterPeers = new Map<string, string[]>();
  for (const cluster of clusters) {
    for (const key of cluster) {
      clusterPeers.set(key, cluster.filter((other) => other !== key));
    }
  }

  // ---- ingredients.csv ----
  const header = [
    'matchKey', 'occurrences', 'recipeCount', 'authors', 'likelySameAs',
    'cleanedName', 'rawExamples', 'detectedPrep', 'unitsUsed', 'embeddedAmounts',
    'suggestedSlug', 'suggestedCategory', 'suggestedBaseUnit', 'suggestedGramsPerPiece',
    'suggestedIsVegetarian', 'suggestedIsVegan',
    // blank columns for the curation pass
    'FINAL_slug', 'FINAL_nameNl', 'FINAL_namePlural', 'FINAL_category',
    'FINAL_baseUnit', 'FINAL_gramsPerPiece', 'FINAL_gramsPerMl',
    'FINAL_isVegetarian', 'FINAL_isVegan', 'FINAL_seasonMonths', 'FINAL_nevoCode',
    'SKIP',
  ];

  const lines = [csvRow(header)];
  let matchedGroups = 0;

  for (const group of ranked) {
    const suggestion = SUGGESTION_INDEX.get(group.matchKey);
    if (suggestion) matchedGroups += 1;

    lines.push(
      csvRow([
        group.matchKey,
        group.occurrences,
        group.recipeIds.size,
        [...group.authors].sort().join(' | '),
        (clusterPeers.get(group.matchKey) ?? []).join(' | '),
        mostCommon(group.names),
        [...group.rawExamples].join(' | '),
        [...group.prepExamples].join(' | '),
        [...group.units.entries()].sort((a, b) => b[1] - a[1]).map(([u, c]) => `${u}(${c})`).join(' '),
        [...group.embeddedAmounts].join(' | '),
        suggestion?.slug ?? '',
        suggestion?.category ?? '',
        suggestion?.baseUnit ?? '',
        suggestion?.gramsPerPiece ?? '',
        suggestion?.isVegetarian ?? '',
        suggestion?.isVegan ?? '',
        // pre-fill the FINAL_ columns from the suggestion so review is a
        // confirm-or-correct pass rather than retyping everything
        suggestion?.slug ?? '',
        suggestion?.nameNl ?? mostCommon(group.names),
        suggestion?.nameNlPlural ?? '',
        suggestion?.category ?? '',
        suggestion?.baseUnit ?? '',
        suggestion?.gramsPerPiece ?? '',
        '',
        suggestion?.isVegetarian ?? '',
        suggestion?.isVegan ?? '',
        '',
        '',
        '',
      ]),
    );
  }

  // ---- units.csv ----
  const unitLines = [csvRow(['rawUnit', 'occurrences', 'suggestedCanonical'])];
  for (const [unit, count] of [...unitCounts.entries()].sort((a, b) => b[1] - a[1])) {
    unitLines.push(csvRow([unit, count, UNIT_ALIASES[toMatchKey(unit)] ?? '']));
  }

  // ---- report.md ----
  const cumulativeAt = (target: number): number => {
    let running = 0;
    for (let i = 0; i < ranked.length; i += 1) {
      running += ranked[i].occurrences;
      if (running / totalRows >= target) return i + 1;
    }
    return ranked.length;
  };

  const unmatched = ranked.filter((g) => !SUGGESTION_INDEX.has(g.matchKey));
  /**
   * Ingredients used in more than one recipe. This is the number that matters
   * for shopping-list merging: an ingredient used once can never merge with
   * anything, so curating it buys aisle grouping only, not merging.
   */
  const multiUse = ranked.filter((g) => g.recipeIds.size > 1);
  const multiUseRows = multiUse.reduce((sum, g) => sum + g.occurrences, 0);
  const withEmbeddedAmounts = ranked.filter((g) => g.embeddedAmounts.size > 0);
  const unknownUnits = [...unitCounts.keys()].filter((u) => !UNIT_ALIASES[toMatchKey(u)]);
  /** Unit cells that contain a number, i.e. an amount typed into the unit column. */
  const unitsWithAmounts = [...unitCounts.keys()].filter((u) => /\d/.test(u));

  const clusterRows = clusters
    .map((cluster) =>
      cluster
        .map((key) => ({ key, count: groups.get(key)?.occurrences ?? 0 }))
        .sort((a, b) => b.count - a.count),
    )
    .sort((a, b) => b[0].count - a[0].count);

  const clusteredKeyCount = clusters.reduce((sum, c) => sum + c.length, 0);

  /**
   * What the catalog actually becomes. Several observed spellings collapse
   * into one entry via a shared slug; the extra spellings become aliases.
   */
  const catalogEntries = new Map<string, { slug: string; name: string; plural?: string; aliases: string[]; rows: number }>();
  for (const group of ranked) {
    const suggestion = SUGGESTION_INDEX.get(group.matchKey);
    if (!suggestion) continue;
    const existing = catalogEntries.get(suggestion.slug);
    if (existing) {
      existing.aliases.push(group.matchKey);
      existing.rows += group.occurrences;
    } else {
      catalogEntries.set(suggestion.slug, {
        slug: suggestion.slug,
        name: suggestion.nameNl,
        plural: suggestion.nameNlPlural,
        aliases: [group.matchKey],
        rows: group.occurrences,
      });
    }
  }
  const catalogList = [...catalogEntries.values()].sort((a, b) => b.rows - a.rows);
  const collapsing = catalogList.filter((e) => e.aliases.length > 1);

  const report = `# Ingredient extraction report

Generated ${new Date().toISOString().slice(0, 10)}${args.author ? ` — filtered to author \`${args.author}\`` : ''}

## Scale

| | |
|---|---|
| Recipes scanned | ${recipes.length} |
| Ingredient rows | ${totalRows} |
| Distinct ingredients | ${ranked.length} |
| Used in 2+ recipes | ${multiUse.length} |
| Used in exactly 1 recipe | ${ranked.length - multiUse.length} |
| Matched by the starter dictionary | ${matchedGroups} (${Math.round((matchedGroups / Math.max(ranked.length, 1)) * 100)}%) |
| Rows with an empty name | ${emptyNameRows} |

## Where to stop

The headline number is **${multiUse.length} ingredients used in more than one
recipe**, covering ${multiUseRows} of ${totalRows} rows. That is the real target:
an ingredient that appears in exactly one recipe can never merge with
anything, so curating it buys aisle grouping only - never a merged
shopping-list line. The ${ranked.length - multiUse.length} single-use ingredients
can stay free text indefinitely without costing you the headline feature.

## Coverage curve

Use this only if you want aisle grouping to reach deeper than merging does.

| Share of all ingredient rows | Entries you need to curate |
|---|---|
| 50% | ${cumulativeAt(0.5)} |
| 80% | ${cumulativeAt(0.8)} |
| 90% | ${cumulativeAt(0.9)} |
| 95% | ${cumulativeAt(0.95)} |
| 100% | ${ranked.length} |

## Top 30 by use

| # | ingredient | rows | recipes | suggested |
|---|---|---|---|---|
${ranked
  .slice(0, 30)
  .map((g, i) => `| ${i + 1} | ${mostCommon(g.names)} | ${g.occurrences} | ${g.recipeIds.size} | ${SUGGESTION_INDEX.get(g.matchKey)?.slug ?? '—'} |`)
  .join('\n')}

## Needs your judgement

### Not in the starter dictionary (${unmatched.length})

Ranked by use. The top of this list is where curation time pays off.

${unmatched.slice(0, 40).map((g) => `- \`${mostCommon(g.names)}\` — ${g.occurrences} rows, ${g.recipeIds.size} recipes`).join('\n') || '- none'}${unmatched.length > 40 ? `\n\n...and ${unmatched.length - 40} more in the CSV.` : ''}

## What the catalog becomes

The CSV has one row per spelling FOUND IN YOUR RECIPES. That is not the
same as one row per catalog entry. Rows sharing a \`FINAL_slug\` collapse
into a single entry, and the extra spellings become its aliases.

With the suggestions as they stand, **${ranked.length} observed spellings become
${catalogList.length} catalog entries** (plus ${ranked.length - catalogList.length} still
uncategorised). ${collapsing.length} of those entries absorb more than one spelling:

| entry | shown as | absorbs |
|---|---|---|
${collapsing
  .slice(0, 25)
  .map((e) => `| \`${e.slug}\` | ${e.name}${e.plural ? ` / ${e.plural}` : ''} | ${e.aliases.map((a) => `\`${a}\``).join(', ')} |`)
  .join('\n')}

So \`ui\` and \`uien\` are **one** entry with two aliases, displayed as "ui" or
"uien" depending on the amount - not two ingredients.

### Probably the same ingredient, written differently (${clusterRows.length} clusters, ${clusteredKeyCount} entries)

Candidates only - confirm each before merging. Giving every member of a
cluster the same \`FINAL_slug\` collapses it into one catalog entry with
several aliases, which is the fastest way to shrink this list.

${clusterRows
  .slice(0, 40)
  .map((cluster) => `- ${cluster.map((m) => `\`${m.key}\` (${m.count})`).join('  ·  ')}`)
  .join('\n') || '- none'}${clusterRows.length > 40 ? `\n\n...and ${clusterRows.length - 40} more clusters in the \`likelySameAs\` column.` : ''}

### Unit strings with no canonical mapping (${unknownUnits.length})

${unknownUnits.map((u) => `- \`${u}\` (${unitCounts.get(u)} rows)`).join('\n') || '- none'}

## Data quality

### Amounts typed into the name field (${withEmbeddedAmounts.length})

These rows have the quantity in the ingredient name, so their \`amount\`
column is probably wrong or empty. Worth fixing in the recipes themselves.

${withEmbeddedAmounts.slice(0, 20).map((g) => `- \`${mostCommon(g.names)}\` — ${[...g.embeddedAmounts].join(', ')}`).join('\n') || '- none'}

### Amounts typed into the unit field (${unitsWithAmounts.length})

${unitsWithAmounts.map((u) => `- \`${u}\` (${unitCounts.get(u)} rows)`).join('\n') || '- none'}

### Recipes whose ingredients are not an array (${malformedRecipes.length})

${malformedRecipes.map((r) => `- #${r.id} ${r.name} — ${r.reason}`).join('\n') || '- none'}

## Categories available

${CATEGORIES.map((c) => `- \`${c.slug}\` (${c.sortOrder}) — ${c.nameNl}`).join('\n')}

## How to curate

1. Open \`ingredients.csv\` in a spreadsheet. It is sorted by use, descending.
2. Work down the \`FINAL_\` columns. They are pre-filled from the starter
   dictionary where it matched, so most rows are confirm-or-correct.
3. Several rows can share one \`FINAL_slug\` — that is how variants collapse.
   Give \`ui\` and \`uien\` the same slug and they become one catalog entry
   with two aliases.
4. Put \`x\` in \`SKIP\` for anything that should stay free text.
5. Stop around the 80% line from the coverage curve above.
6. Always check \`rawExamples\` before trusting \`cleanedName\` — it shows what
   the normaliser stripped.
`;

  fs.mkdirSync(args.out, { recursive: true });
  fs.writeFileSync(path.join(args.out, 'ingredients.csv'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(args.out, 'units.csv'), unitLines.join('\n') + '\n');
  fs.writeFileSync(path.join(args.out, 'report.md'), report);

  console.log(`Recipes scanned:        ${recipes.length}`);
  console.log(`Ingredient rows:        ${totalRows}`);
  console.log(`Distinct ingredients:   ${ranked.length}`);
  console.log(`Dictionary matched:     ${matchedGroups}`);
  console.log(`Used in 2+ recipes:     ${multiUse.length}  <- the number that matters`);
  console.log(`Used in exactly 1:      ${ranked.length - multiUse.length}`);
  console.log(`Curate for 80% cover:   ${cumulativeAt(0.8)} entries`);
  console.log(`Near-duplicate clusters: ${clusterRows.length} covering ${clusteredKeyCount} entries`);
  console.log(`Catalog entries:        ${catalogList.length} (from ${ranked.length} observed spellings)`);
  console.log(`\nWrote ${path.join(args.out, 'ingredients.csv')}`);
  console.log(`Wrote ${path.join(args.out, 'units.csv')}`);
  console.log(`Wrote ${path.join(args.out, 'report.md')}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
