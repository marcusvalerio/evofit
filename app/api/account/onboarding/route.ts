import { finishOnboarding } from "@/lib/server/auth"
import { assertSameOrigin, handle, json, requireAccount } from "@/lib/server/http"

/** Conclui as boas-vindas do personal. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  await finishOnboarding(await requireAccount())
  return json({ ok: true })
})
