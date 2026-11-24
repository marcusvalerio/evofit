import { withTenant } from "@/lib/server/db"
import { handle, json, requireAccount } from "@/lib/server/http"
import { listThreads, unreadCount } from "@/lib/server/chat"
import type { Account } from "@/lib/server/auth"

const tenant = (a: Account) => (a.role === "trainer" ? { role: "trainer" as const, trainerId: a.trainerId } : { role: "student" as const, trainerId: a.trainerId, studentId: a.studentId! })

/** Personal: lista de conversas. Aluno: só o total de não lidas. */
export const GET = handle(async () => {
  const a = await requireAccount()
  const t = tenant(a)
  return json(await withTenant(t, async (q) => ({ unread: await unreadCount(q, t), threads: t.role === "trainer" ? await listThreads(q, t) : [] })))
})
