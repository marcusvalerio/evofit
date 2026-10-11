import { acceptInvite, inviteInfo, throttle } from "@/lib/server/auth"
import { assertSameOrigin, clientIp, handle, json, readJson, setSessionCookie } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

export const GET = handle(async (_req, ctx) => {
  const { code } = await ctx.params
  const info = await inviteInfo(code)
  if (!info) throw new HttpError(404, "Convite inválido ou expirado. Peça um novo ao seu personal.")
  return json(info)
})

export const POST = handle(async (req, ctx) => {
  assertSameOrigin(req)
  if (!(await throttle(`invite:${clientIp(req)}`, 20, 15))) throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos.")
  const { code } = await ctx.params
  const body = await readJson(req, 4096)
  const { token } = await acceptInvite(code, { email: body.email, password: body.password })
  await setSessionCookie(token)
  return json({ ok: true, role: "student" })
})
