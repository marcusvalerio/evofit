import { createStudentAccess, resetStudentPassword, revokeStudentAccess, studentAccess } from "@/lib/server/auth"
import { assertSameOrigin, clientIp, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { throttle } from "@/lib/server/auth"
import { HttpError } from "@/lib/server/workspace"

/** Situação do acesso do aluno ao app (sem senha). */
export const GET = handle(async (_req, ctx) => {
  const a = await requireAccount()
  const { id } = await ctx.params
  return json(await studentAccess(a, id))
})

/** Gera acesso, gera nova senha provisória ou revoga. A senha provisória só aparece nesta resposta. */
export const POST = handle(async (req, ctx) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const { id } = await ctx.params
  const body = await readJson(req, 1024)
  if (!(await throttle(`access:${a.userId}`, 30, 15)) || !(await throttle(`access-ip:${clientIp(req)}`, 60, 15))) throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos.")
  if (body.action === "create") return json(await createStudentAccess(a, id))
  if (body.action === "reset") return json(await resetStudentPassword(a, id))
  if (body.action === "revoke") {
    await revokeStudentAccess(a, id)
    return json({ ok: true })
  }
  throw new HttpError(400, "Ação inválida.")
})
