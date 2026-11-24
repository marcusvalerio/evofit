import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { removePushSubscription, savePushSubscription } from "@/lib/server/push"
import { HttpError } from "@/lib/server/workspace"

/** Liga os avisos no celular deste aparelho. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 4096)
  if (!(await savePushSubscription(a.userId, body.subscription))) throw new HttpError(400, "Inscrição inválida.")
  return json({ ok: true })
})

/** Desliga neste aparelho. */
export const DELETE = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 4096)
  await removePushSubscription(a.userId, body.endpoint)
  return json({ ok: true })
})
