import { assertAdmin, setAdmin } from "@/lib/server/admin"
import { assertSameOrigin, currentAccount, handle, json, readJson } from "@/lib/server/http"

/** Adiciona ({ email, admin: true }) ou remove ({ email, admin: false }) um admin. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await currentAccount()
  assertAdmin(a)
  const body = await readJson(req, 1024)
  await setAdmin(a, body.email, body.admin === true)
  return json({ ok: true })
})
