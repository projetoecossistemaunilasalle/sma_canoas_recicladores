import { defineConfig } from "drizzle-kit"

// Only for `pnpm db:studio`. The schema itself lives in
// docker/postgres/initdb/*.sql — there are no Drizzle migrations.
export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
