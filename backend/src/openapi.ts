import { writeFileSync } from "node:fs"
import { buildServer } from "./server"

// Writes the API's OpenAPI document (the same one /admin/docs serves) to
// openapi.json, without starting the server or touching the DB. The frontend
// generates lib/api-types.ts from it: `pnpm openapi` here, then
// `npm run api:types` in frontend/.
async function main() {
  const server = buildServer()
  await server.ready()
  writeFileSync("openapi.json", JSON.stringify(server.swagger(), null, 2) + "\n")
  await server.close()
  console.log("Wrote openapi.json")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
