import { assertAdmin, setLifetimeRequest } from "@/lib/server/admin"
import { assertSameOrigin, currentAccount, handle, json, readJson } from "@/lib/server/http"

/** Confirma (Pix recebido → libera Vitalício) ou cancela um pedido de Vitalício. */
export const POST = handle(async (req, ctx) => {
  assertSameOrigin(req)
  const a = await currentAccount()
  assertAdmin(a)
  const { id } = await ctx.params
  const body = await readJson(req, 512)
  await setLifetimeRequest(a, id, body.status)
  return json({ ok: true })
})
