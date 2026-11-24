import { withTenant } from "@/lib/server/db"
import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { openThread, sendMessage } from "@/lib/server/chat"
import { throttle, type Account } from "@/lib/server/auth"
import { HttpError } from "@/lib/server/workspace"

const tenant = (a: Account) => (a.role === "trainer" ? { role: "trainer" as const, trainerId: a.trainerId } : { role: "student" as const, trainerId: a.trainerId, studentId: a.studentId! })

/** Abre a conversa (?aluno= para o personal) e marca as recebidas como lidas. */
export const GET = handle(async (req) => {
  const a = await requireAccount()
  const sid = new URL(req.url).searchParams.get("aluno") ?? undefined
  return json({ messages: await withTenant(tenant(a), (q) => openThread(q, tenant(a), sid)) })
})

export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const a = await requireAccount()
  if (a.mustChangePassword) throw new HttpError(403, "Crie sua senha antes de continuar.")
  if (!(await throttle(`chat:${a.userId}`, 60, 1))) throw new HttpError(429, "Muitas mensagens seguidas. Aguarde um pouco.")
  const body = await readJson(req, 8192)
  const sid = typeof body.aluno === "string" ? body.aluno : undefined
  return json({ message: await withTenant(tenant(a), (q) => sendMessage(q, tenant(a), body.body, sid)) })
})
