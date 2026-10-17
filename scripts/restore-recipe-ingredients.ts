/**
 * Puts recipe ingredients back exactly as they were before a backfill.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx tsx scripts/restore-recipe-ingredients.ts                  # newest backup
 *   npx tsx scripts/restore-recipe-ingredients.ts --apply
 *   npx tsx scripts/restore-recipe-ingredients.ts --file=scripts/out/backups/<name>.json --apply
 *
 * Reads the JSON that backfill-recipe-ingredients.ts writes before it
 * touches anything, and restores each recipe's ingredients column verbatim.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'node:fs';
import * as path from 'node:path';

const apply = process.argv.includes('--apply');
const explicitFile = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1];
const backupDir =
  process.argv.find((a) => a.startsWith('--backup-dir='))?.split('=')[1] ?? 'scripts/out/backups';

const newestBackup = (): string | null => {
  if (!fs.existsSync(backupDir)) return null;
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  return files.length ? path.join(backupDir, files[files.length - 1]) : null;
};

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('No SCRIPT_DATABASE_URL or DATABASE_URL set.');
    process.exit(1);
  }

  const file = explicitFile ?? newestBackup();
  if (!file || !fs.existsSync(file)) {
    console.error(`No backup found. Looked in ${backupDir}.`);
    process.exit(1);
  }

  const entries = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    id: number;
    ingredients: unknown;
  }[];

  console.log(`Backup:  ${file}`);
  console.log(`Recipes: ${entries.length}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const current = await prisma.recipe.findMany({
    where: { id: { in: entries.map((e) => e.id) } },
    select: { id: true, name: true, ingredients: true },
  });

  const differing = entries.filter((entry) => {
    const now = current.find((c) => c.id === entry.id);
    return now && JSON.stringify(now.ingredients) !== JSON.stringify(entry.ingredients);
  });

  console.log(`Differing from backup: ${differing.length}`);

  if (differing.length) {
    const sample = differing[0];
    const now = current.find((c) => c.id === sample.id);
    console.log(`\nSample - recipe #${sample.id} "${now?.name}" first row:`);
    console.log(`  now:     ${JSON.stringify((now?.ingredients as unknown[])?.[0])}`);
    console.log(`  restore: ${JSON.stringify((sample.ingredients as unknown[])?.[0])}`);
  }

  if (!apply) {
    console.log('\nDry run. Nothing written. Re-run with --apply to restore.');
    await prisma.$disconnect();
    return;
  }

  for (const entry of differing) {
    await prisma.recipe.update({
      where: { id: entry.id },
      data: { ingredients: entry.ingredients as never },
    });
  }

  console.log(`\nRestored ${differing.length} recipes.`);
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
