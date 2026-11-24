import { withTenant } from "@/lib/server/db"
import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { getHours, listThreads, setHours, unreadCount } from "@/lib/server/chat"
import type { Account } from "@/lib/server/auth"

const tenant = (a: Account) => (a.role === "trainer" ? { role: "trainer" as const, trainerId: a.trainerId } : { role: "student" as const, trainerId: a.trainerId, studentId: a.studentId! })

/** Personal: conversas, não lidas e horário. Aluno: não lidas e o horário do personal. */
export const GET = handle(async () => {
  const a = await requireAccount()
  const t = tenant(a)
  return json(await withTenant(t, async (q) => ({ unread: await unreadCount(q, t), hours: await getHours(q, t.trainerId), threads: t.role === "trainer" ? await listThreads(q, t) : [] })))
})

/** Personal define o horário de atendimento (padrão: livre 24h). */
export const PUT = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 2048)
  return json({ hours: await withTenant(tenant(a), (q) => setHours(q, tenant(a), body.hours)) })
})
