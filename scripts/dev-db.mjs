// Postgres local em memória (PGlite) para desenvolvimento e testes de ponta a ponta, sem precisar do Neon.
// Uso: node scripts/dev-db.mjs [porta] [--migrate]   → DATABASE_URL=postgres://postgres@127.0.0.1:<porta>/postgres
import fs from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"

const port = Number(process.argv[2] ?? process.env.DEV_DB_PORT ?? 5433)
const db = await PGlite.create()
if (process.argv.includes("--migrate")) {
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../db/migrations")
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"))
    console.log(`migração aplicada: ${f}`)
  }
}
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" })
await server.start()
console.log(`PGlite ouvindo em postgres://postgres@127.0.0.1:${port}/postgres`)
const stop = async () => {
  await server.stop()
  await db.close()
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
