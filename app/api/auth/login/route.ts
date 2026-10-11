import { login, throttle } from "@/lib/server/auth"
import { assertSameOrigin, clientIp, handle, json, readJson, setSessionCookie } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const body = await readJson(req, 4096)
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : ""
  if (!(await throttle(`login:${email}`, 10, 15)) || !(await throttle(`login-ip:${clientIp(req)}`, 30, 15)))
    throw new HttpError(429, "Muitas tentativas. Aguarde 15 minutos e tente de novo.")
  const r = await login({ email: body.email, password: body.password })
  if (!r) throw new HttpError(401, "E-mail ou senha incorretos.")
  await setSessionCookie(r.token)
  return json({ ok: true, role: r.role })
})
