"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// dotenv is imported here as well as in index.ts: the adapter below reads
// DATABASE_URL at module load, and TypeScript hoists requires above the
// dotenv.config() call in index.ts, so relying on that alone is not safe.
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
// Prisma 7 requires a driver adapter. This uses the POOLED Neon connection for
// runtime queries; migrations go through DIRECT_URL via prisma.config.ts.
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
//# sourceMappingURL=db.js.map