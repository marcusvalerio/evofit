import { withTenant } from "@/lib/server/db"
import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { applyChanges, loadWorkspace } from "@/lib/server/workspace"
import type { Account } from "@/lib/server/auth"
import type { Changes } from "@/lib/sync"

const tenant = (a: Account) => (a.role === "trainer" ? { role: "trainer" as const, trainerId: a.trainerId } : { role: "student" as const, trainerId: a.trainerId, studentId: a.studentId! })

/** Dados do personal (ou do aluno logado) no mesmo formato usado pelas telas. */
export const GET = handle(async () => {
  const a = await requireAccount()
  const data = await withTenant(tenant(a), (q) => loadWorkspace(q, tenant(a)))
  return json({ account: { email: a.email, role: a.role }, data })
})

/** Recebe só o que mudou; o servidor revalida e grava numa transação. */
export const PATCH = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  const body = await readJson(req, 1024 * 1024)
  await withTenant(tenant(a), (q) => applyChanges(q, tenant(a), (body.changes ?? {}) as Changes))
  return json({ ok: true })
})
