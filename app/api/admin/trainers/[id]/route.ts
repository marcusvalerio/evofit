import { assertAdmin, extendTrial, grantAccess, hideFromDirectory, reactivateTrainer, resetTrainerPassword, revokeAccess, suspendTrainer, trainerDetail } from "@/lib/server/admin"
import { throttle } from "@/lib/server/auth"
import { assertSameOrigin, currentAccount, handle, json, readJson } from "@/lib/server/http"
import { HttpError } from "@/lib/server/workspace"

/** Detalhe de um personal: acesso, plano, histórico de logins e auditoria. */
export const GET = handle(async (_req, ctx) => {
  const a = await currentAccount()
  assertAdmin(a)
  const { id } = await ctx.params
  return json(await trainerDetail(id))
})

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
    case "grant":
      await grantAccess(a, id, { kind: body.kind, days: body.days, plan: body.plan, note: body.note })
      return json({ ok: true })
    case "extend_trial":
      await extendTrial(a, id, body.days)
      return json({ ok: true })
    case "revoke":
      await revokeAccess(a, id)
      return json({ ok: true })
    case "hide":
      await hideFromDirectory(a, id)
      return json({ ok: true })
  }
  throw new HttpError(400, "Ação inválida.")
})
