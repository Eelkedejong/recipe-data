// dotenv is imported here as well as in index.ts: the adapter below reads
// DATABASE_URL at module load, and TypeScript hoists requires above the
// dotenv.config() call in index.ts, so relying on that alone is not safe.
import 'dotenv/config'
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter. This uses the POOLED Neon connection for
// runtime queries; migrations go through DIRECT_URL via prisma.config.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const prisma = new PrismaClient({ adapter })

export default prisma
