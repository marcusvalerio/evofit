import { assertAdmin, hideFromDirectory, reactivateTrainer, resetTrainerPassword, suspendTrainer } from "@/lib/server/admin"
import { throttle } from "@/lib/server/auth"
import { assertSameOrigin, currentAccount, handle, json, readJson } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/** Ações do admin sobre a conta de um personal. Toda ação fica no registro de auditoria. */
export const POST = handle(async (req, ctx) => {
  assertSameOrigin(req)
  const a = await currentAccount()
  assertAdmin(a)
  const { id } = await ctx.params
  const body = await readJson(req, 2048)
  if (!(await throttle(`admin:${a.userId}`, 60, 15))) throw new HttpError(429, "Muitas ações seguidas. Aguarde alguns minutos.")
  switch (body.action) {
    case "reset":
      return json(await resetTrainerPassword(a, id))
    case "suspend":
      await suspendTrainer(a, id, body.reason)
      return json({ ok: true })
    case "reactivate":
      await reactivateTrainer(a, id)
      return json({ ok: true })
    case "hide":
      await hideFromDirectory(a, id)
      return json({ ok: true })
  }
  throw new HttpError(400, "Ação inválida.")
})
