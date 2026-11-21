// Gera códigos Fundador individuais e de uso único (o banco guarda só o hash).
// Uso: DATABASE_URL=postgres://... node scripts/founder-codes.mjs 100 "lote lançamento"
// Os códigos aparecem só aqui: guarde a lista antes de fechar o terminal.
import { createHash, randomBytes } from "node:crypto"
import pg from "pg"

const n = Number(process.argv[2] ?? 1)
const label = process.argv[3] ?? ""
const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL
if (!url || !Number.isInteger(n) || n < 1 || n > 1000) {
  console.error("Uso: DATABASE_URL=... node scripts/founder-codes.mjs <quantidade 1-1000> [rótulo]")
  process.exit(1)
}
// mesma normalização de lib/server/billing.ts
const hash = (c) => createHash("sha256").update(c.trim().toUpperCase().replace(/\s+/g, "")).digest("hex")
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  await client.query("begin")
  const codes = []
  for (let i = 0; i < n; i++) {
    const code = `FUNDADOR-${[...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("")}`
    await client.query("insert into founder_codes (code_hash, label) values ($1, $2)", [hash(code), label])
    codes.push(code)
  }
  await client.query("commit")
  const total = (await client.query("select count(*)::int as n, count(used_by)::int as usados from founder_codes")).rows[0]
  console.log(codes.join("\n"))
  console.error(`\n${n} códigos gerados. Total no banco: ${total.n} (${total.usados} usados).`)
} catch (e) {
  await client.query("rollback").catch(() => {})
  throw e
} finally {
  await client.end()
}
