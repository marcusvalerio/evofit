import { withTenant } from "@/lib/server/db"
import { isAdmin } from "@/lib/server/admin"
import { trainerHasAccess, trainerIsPaid } from "@/lib/server/billing"
import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { applyChanges, loadWorkspace } from "@/lib/server/workspace"
import type { Account } from "@/lib/server/auth"
import { HttpError } from "@/lib/server/workspace"
import type { Changes } from "@/lib/sync"

const tenant = (a: Account) => (a.role === "trainer" ? { role: "trainer" as const, trainerId: a.trainerId } : { role: "student" as const, trainerId: a.trainerId, studentId: a.studentId! })

/** Dados do personal (ou do aluno logado) no mesmo formato usado pelas telas. */
export const GET = handle(async () => {
  const a = await requireAccount()
  const data = await withTenant(tenant(a), (q) => loadWorkspace(q, tenant(a)))
  const admin = isAdmin(a)
  // acesso do personal (teste, assinatura ou liberação manual); o aluno não é bloqueado
  const hasAccess = a.role !== "trainer" || admin || (await trainerHasAccess(a.trainerId))
  return json({ account: { email: a.email, role: a.role, mustChangePassword: a.mustChangePassword, isAdmin: admin, onboarded: a.onboarded !== false, hasAccess }, data })
})

/** Recebe só o que mudou; o servidor revalida e grava numa transação. */
export const PATCH = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  if (a.mustChangePassword) throw new HttpError(403, "Crie sua senha antes de continuar.")
  if (a.role === "trainer" && !isAdmin(a) && !(await trainerHasAccess(a.trainerId)))
    throw new HttpError(402, "Seu teste grátis terminou. Escolha um plano em Studio → Plano para continuar.")
  const body = await readJson(req, 1024 * 1024)
  const changes = (body.changes ?? {}) as Changes
  const paid = a.role === "trainer" && changes.students?.upsert.length ? await trainerIsPaid(a.trainerId as string) : undefined
  await withTenant(tenant(a), (q) => applyChanges(q, tenant(a), changes, { paid }))
  return json({ ok: true })
})
