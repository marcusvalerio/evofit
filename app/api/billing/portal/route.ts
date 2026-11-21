import { portalUrl } from "@/lib/server/billing"
import { assertSameOrigin, handle, json, requireAccount } from "@/lib/server/http"

/** Portal do Stripe: trocar cartão, mudar de plano, ver faturas e cancelar. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  return json({ url: await portalUrl(await requireAccount(), new URL(req.url).origin) })
})
