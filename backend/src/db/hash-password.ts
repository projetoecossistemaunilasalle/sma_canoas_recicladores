import { hashPassword } from "../lib/password"

// Cooperatives and their admins are created straight in the database (there's
// no admin UI). users.password must be an argon2id hash — this prints one:
//   pnpm password:hash 'a senha'
async function main() {
  const password = process.argv[2]
  if (!password) {
    console.error("Uso: pnpm password:hash '<senha>'")
    process.exit(1)
  }
  console.log(await hashPassword(password))
}

main()
