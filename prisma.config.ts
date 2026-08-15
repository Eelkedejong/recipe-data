import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// As of Prisma 7 the connection URLs live here rather than in schema.prisma.
// The CLI uses this url for migrations, so it must be the DIRECT (unpooled)
// Neon connection - migrations cannot run through PgBouncer.
export default defineConfig({
  datasource: {
    url: env('DIRECT_URL'),
  },
})
