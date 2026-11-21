import { assertAdmin } from "@/lib/server/admin"
import { listLeads, setLeadPaused } from "@/lib/server/sales-bot"
import { assertSameOrigin, currentAccount, handle, json, readJson } from "@/lib/server/http"

/** Conversas do vendedor automático. */
export const GET = handle(async () => {
  assertAdmin(await currentAccount())
  return json({ leads: await listLeads() })
})

/** { number, paused }: pausa ou devolve a conversa para o robô. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  assertAdmin(await currentAccount())
  const b = await readJson(req, 512)
  await setLeadPaused(b.number, b.paused === true)
  return json({ ok: true })
})
