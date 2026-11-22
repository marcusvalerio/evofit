import { logError } from "@/lib/server/monitor"
import { throttle } from "@/lib/server/auth"
import { dbConfigured } from "@/lib/server/db"
import { assertSameOrigin, clientIp, handle, json, readJson } from "@/lib/server/http"

/** Erros do navegador (enviados pelo próprio app). Limitado por IP para não virar spam. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  if (!dbConfigured()) return json({ ok: true })
  if (!(await throttle(`errors:${clientIp(req)}`, 20, 15))) return json({ ok: true })
  const b = await readJson(req, 8 * 1024)
  const message = typeof b.message === "string" ? b.message : ""
  if (!message) return json({ ok: true })
  await logError({ source: "navegador", route: typeof b.route === "string" ? b.route : "", message, stack: typeof b.stack === "string" ? b.stack : "" })
  return json({ ok: true })
})
