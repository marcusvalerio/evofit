// Aplica as migrações de db/migrations no banco de DATABASE_URL (Neon).
// Uso: DATABASE_URL=postgres://... npm run db:migrate
// Use a string de conexão do papel dono do banco (ex.: neondb_owner).
import fs from "node:fs"
import path from "node:path"
import pg from "pg"

const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL
if (!url) {
  console.error("Defina DATABASE_URL (ou DATABASE_URL_MIGRATIONS) com a string de conexão do Neon.")
  process.exit(1)
}
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../db/migrations")
const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()
  let n = 0
  for (const file of files) {
    await client.query("begin")
    try {
      await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())")
      await client.query("lock table schema_migrations in exclusive mode")
      const r = await client.query("select 1 from schema_migrations where name = $1", [file])
      if (!r.rows.length) {
        await client.query(fs.readFileSync(path.join(dir, file), "utf8"))
        await client.query("insert into schema_migrations (name) values ($1)", [file])
        console.log(`aplicada: ${file}`)
        n++
      }
      await client.query("commit")
    } catch (e) {
      await client.query("rollback")
      throw e
    }
  }
  console.log(n ? `${n} migração(ões) aplicada(s).` : "Banco já está atualizado.")
} finally {
  await client.end()
}
