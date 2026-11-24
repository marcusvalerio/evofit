import { assertAdmin, sendWhatsNewPush } from "@/lib/server/admin"
import { assertSameOrigin, currentAccount, handle, json } from "@/lib/server/http"

/** Envia o push das Novidades para todas as inscrições (uma vez por versão). Só para admins. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await currentAccount()
  assertAdmin(a)
  const r = await sendWhatsNewPush(a)
  return json({ ok: true, ...r })
})
