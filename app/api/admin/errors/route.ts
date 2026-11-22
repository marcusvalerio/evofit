import { assertAdmin } from "@/lib/server/admin"
import { listErrors, resolveError } from "@/lib/server/monitor"
import { assertSameOrigin, currentAccount, handle, json, readJson } from "@/lib/server/http"

export const GET = handle(async () => {
  assertAdmin(await currentAccount())
  return json({ errors: await listErrors() })
})

/** { fingerprint } marca como resolvido ("*" limpa tudo). */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  assertAdmin(await currentAccount())
  await resolveError((await readJson(req, 512)).fingerprint)
  return json({ ok: true })
})
