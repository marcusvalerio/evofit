import fs from "node:fs"
import path from "node:path"
import type { Db } from "./db"

/** Aplica, em ordem, os arquivos de db/migrations ainda não aplicados. */
export async function migrate(db: Db, dir = path.join(process.cwd(), "db/migrations")) {
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()
  const applied: string[] = []
  for (const file of files) {
    const done = await db.tx(async (q) => {
      await q.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())")
      await q.query("lock table schema_migrations in exclusive mode")
      const r = await q.query("select 1 from schema_migrations where name = $1", [file])
      if (r.rows.length) return false
      await q.query(fs.readFileSync(path.join(dir, file), "utf8"))
      await q.query("insert into schema_migrations (name) values ($1)", [file])
      return true
    })
    if (done) applied.push(file)
  }
  return applied
}
