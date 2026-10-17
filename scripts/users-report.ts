import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.SCRIPT_DATABASE_URL }),
});

const main = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, email: true, createdAt: true,
      _count: { select: { recipes: true, shoppinglist: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  for (const u of users) {
    console.log(
      `${JSON.stringify(u.username).padEnd(12)} recipes=${String(u._count.recipes).padStart(3)}` +
      `  lists=${u._count.shoppinglist}  created=${u.createdAt.toISOString().slice(0, 10)}` +
      `  email=${u.email.replace(/(.{2}).*(@.*)/, '$1***$2')}  id=${u.id.slice(0, 8)}`,
    );
  }
  const pub = await prisma.recipe.groupBy({ by: ['belongsToId', 'isPublic'], _count: true });
  console.log('\npublic/private split by owner:');
  for (const row of pub) {
    const u = users.find((x) => x.id === row.belongsToId);
    console.log(`  ${(u?.username ?? row.belongsToId).padEnd(12)} isPublic=${String(row.isPublic).padEnd(5)} ${row._count}`);
  }
  await prisma.$disconnect();
};
main();
