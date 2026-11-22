import { requestPasswordReset, throttle } from "@/lib/server/auth"
import { assertSameOrigin, clientIp, handle, json, readJson } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/** "Esqueci minha senha": manda o link por e-mail (se a conta existir). */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const body = await readJson(req, 1024)
  if (!(await throttle(`forgot-ip:${clientIp(req)}`, 5, 15))) throw new HttpError(429, "Muitos pedidos. Aguarde 15 minutos.")
  return json(await requestPasswordReset(body.email, new URL(req.url).origin))
})
