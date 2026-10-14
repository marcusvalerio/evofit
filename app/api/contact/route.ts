import { throttle } from "@/lib/server/auth"
import { sendContact } from "@/lib/server/directory"
import { assertSameOrigin, clientIp, handle, json, readJson } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/** Pedido de contato de um visitante para um personal real do diretório. */
export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const body = await readJson(req, 4096)
  if (!(await throttle(`contact:${clientIp(req)}`, 10, 60))) throw new HttpError(429, "Muitas solicitações. Tente mais tarde.")
  await sendContact(body)
  return json({ ok: true })
})
