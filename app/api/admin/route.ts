import { listAdmins, listNotes, accessByTrainer, assertAdmin, auditLog, billingOverview, health, lifetimeRequests, listTrainers, loginStats, overview, recentLogins } from "@/lib/server/admin"
import { currentAccount, handle, json } from "@/lib/server/http"

/** Tudo o que o painel de administração mostra, numa chamada. Só para admins. */
export const GET = handle(async () => {
  const a = await currentAccount()
  assertAdmin(a)
  // em sequência: cada consulta usa uma conexão, e o pool do servidor é pequeno
  const o = await overview()
  const trainers = await listTrainers()
  const h = await health()
  const audit = await auditLog()
  const access = await accessByTrainer()
  const logins = await recentLogins(null, 60)
  const stats = await loginStats()
  const requests = await lifetimeRequests()
  const admins = await listAdmins()
  const notes = await listNotes()
  return json({ overview: o, trainers, health: h, audit, me: a.trainerId, access, billing: billingOverview(access, stats), logins, requests, admins, notes })
})
