import { startCheckout } from "@/lib/server/billing"
import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"

/** Abre o Stripe Checkout do plano escolhido. Devolve a URL para redirecionar. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 1024)
  const url = await startCheckout(a, { plan: body.plan, code: body.code }, new URL(req.url).origin)
  return json({ url })
})
