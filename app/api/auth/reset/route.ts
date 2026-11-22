import { resetPassword, throttle } from "@/lib/server/auth"
import { assertSameOrigin, clientIp, handle, json, readJson, setSessionCookie } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/** Cria a nova senha a partir do link do e-mail e já entra na conta. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  if (!(await throttle(`reset-ip:${clientIp(req)}`, 10, 15))) throw new HttpError(429, "Muitas tentativas. Aguarde 15 minutos.")
  const body = await readJson(req, 2048)
  const r = await resetPassword(body.token, body.password)
  await setSessionCookie(r.token)
  return json({ ok: true, role: r.role })
})
