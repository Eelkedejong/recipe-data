/**
 * Promotes a user to ADMIN and marks their recipes as house recipes.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx tsx scripts/set-admin.ts Eleur
 *   npx tsx scripts/set-admin.ts Eleur --apply
 *
 * isHouseRecipe and isPublic are separate on purpose: a house recipe that is
 * not public is a draft, and stays invisible until it is published.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const apply = process.argv.includes('--apply');
const username = process.argv.slice(2).find((a) => !a.startsWith('--'));

const main = async () => {
  const connectionString = process.env.SCRIPT_DATABASE_URL;
  if (!connectionString || !username) {
    console.error('Usage: SCRIPT_DATABASE_URL must be set; pass a username.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const user = await prisma.user.findFirst({
    where: { username: { startsWith: username } },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    console.error(`No user matching "${username}".`);
    process.exit(1);
  }

  const recipes = await prisma.recipe.count({ where: { belongsToId: user.id } });
  const alreadyHouse = await prisma.recipe.count({
    where: { belongsToId: user.id, isHouseRecipe: true },
  });
  const publicCount = await prisma.recipe.count({
    where: { belongsToId: user.id, isPublic: true },
  });

  console.log(`user:     ${JSON.stringify(user.username)}`);
  console.log(`role:     ${user.role} -> ADMIN`);
  console.log(`recipes:  ${recipes} (${alreadyHouse} already house, ${publicCount} public)`);
  console.log(`          all ${recipes} will be marked isHouseRecipe=true`);
  console.log(`          isPublic is left untouched - ${recipes - publicCount} stay drafts`);

  if (!apply) {
    console.log('\nDry run. Nothing written. Re-run with --apply to commit.');
    await prisma.$disconnect();
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  const updated = await prisma.recipe.updateMany({
    where: { belongsToId: user.id },
    data: { isHouseRecipe: true },
  });

  console.log(`\n${user.username} is now ADMIN; ${updated.count} recipes marked as house recipes.`);
  await prisma.$disconnect();
};

main().catch((e) => { console.error(e); process.exit(1); });
