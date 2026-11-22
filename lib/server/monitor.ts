import { createHash } from "node:crypto"
import { getDb, type Db } from "./db"
import { notifyAdmin } from "./whatsapp-bot"

/**
 * Monitoramento simples e gratuito: erros do servidor e do navegador ficam agrupados no banco
 * (mesmo erro = mesma linha com contador) e aparecem no admin. Nunca lança erro.
 */
export async function logError(e: { source: "servidor" | "navegador"; route?: string; message: string; stack?: string }, db?: Db) {
  try {
    const d = db ?? getDb()
    const message = (e.message || "Erro sem mensagem").slice(0, 500)
    const route = (e.route ?? "").replace(/[?#].*$/, "").replace(/\/[0-9a-f-]{20,}/gi, "/:id").slice(0, 200)
    const fingerprint = createHash("sha1").update(`${e.source}|${route}|${message.replace(/\d+/g, "#")}`).digest("hex")
    const r = await d.tx((q) =>
      q.query<{ count: number }>(
        `insert into app_errors (fingerprint, source, route, message, stack) values ($1, $2, $3, $4, $5)
         on conflict (fingerprint) do update set count = app_errors.count + 1, last_at = now()
         returning count`,
        [fingerprint, e.source, route, message, (e.stack ?? "").slice(0, 2000)],
      ),
    )
    // avisa a equipe só na primeira vez que um erro novo aparece
    if (Number(r.rows[0]?.count) === 1) await notifyAdmin(`🚨 *EVOFIT* · Erro novo (${e.source})\n${route || "-"}\n${message.slice(0, 200)}`, "erro_novo", fingerprint, d)
  } catch {
    /* monitoramento nunca derruba o app */
  }
}

export interface AppError {
  fingerprint: string
  source: string
  route: string
  message: string
  stack: string
  count: number
  firstAt: string
  lastAt: string
}

export async function listErrors(limit = 30, db: Db = getDb()): Promise<AppError[]> {
  const r = await db.tx((q) => q.query<Record<string, unknown>>("select * from app_errors order by last_at desc limit $1", [limit]))
  return r.rows.map((x) => ({
    fingerprint: String(x.fingerprint),
    source: String(x.source),
    route: String(x.route),
    message: String(x.message),
    stack: String(x.stack),
    count: Number(x.count),
    firstAt: new Date(x.first_at as string).toISOString(),
    lastAt: new Date(x.last_at as string).toISOString(),
  }))
}

/** "Resolvido": some da lista (volta se acontecer de novo). */
export async function resolveError(fingerprint: unknown, db: Db = getDb()) {
  const f = typeof fingerprint === "string" ? fingerprint : ""
  await db.tx((q) => (f === "*" ? q.query("delete from app_errors") : q.query("delete from app_errors where fingerprint = $1", [f])))
}

/** Saúde do sistema para monitores externos (UptimeRobot etc.). */
export async function healthCheck(db?: Db) {
  const t0 = performance.now()
  try {
    await (db ?? getDb()).tx((q) => q.query("select 1"))
    return { ok: true, db: "ok", ms: Math.round(performance.now() - t0) }
  } catch {
    return { ok: false, db: "erro", ms: Math.round(performance.now() - t0) }
  }
}
