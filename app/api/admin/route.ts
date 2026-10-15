import { assertAdmin, auditLog, health, listTrainers, overview } from "@/lib/server/admin"
import { currentAccount, handle, json } from "@/lib/server/http"

/** Tudo o que o painel de administração mostra, numa chamada. Só para e-mails em ADMIN_EMAILS. */
export const GET = handle(async () => {
  const a = await currentAccount()
  assertAdmin(a)
  const [o, trainers, h, audit] = await Promise.all([overview(), listTrainers(), health(), auditLog()])
  return json({ overview: o, trainers, health: h, audit, me: a.trainerId })
})
