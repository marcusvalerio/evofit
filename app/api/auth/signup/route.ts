import { signupTrainer, throttle } from "@/lib/server/auth"
import { assertSameOrigin, clientIp, handle, json, readJson, setSessionCookie } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const body = await readJson(req, 4096)
  if (!(await throttle(`signup:${clientIp(req)}`, 10, 60))) throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos.")
  const { token, role } = await signupTrainer({ name: body.name, email: body.email, password: body.password })
  await setSessionCookie(token)
  return json({ ok: true, role })
})
