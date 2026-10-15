import { cookies } from "next/headers"
import { changePassword } from "@/lib/server/auth"
import { assertSameOrigin, handle, json, readJson, requireAccount, SESSION_COOKIE } from "@/lib/server/http"

/** Troca de senha. No primeiro acesso (senha provisória) não pede a senha atual. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 2048)
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? ""
  await changePassword(a, { current: body.current, password: body.password }, token)
  return json({ ok: true })
})
