import { getDb, withTenant } from "@/lib/server/db"
import { assertSameOrigin, handle, json, readJson, requireAccount } from "@/lib/server/http"
import { getHours, openThread, recipientsOf, sendMessage } from "@/lib/server/chat"
import { pushTo } from "@/lib/server/push"
import { isOpen } from "@/lib/chat-hours"
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
  const t = tenant(a)
  const sid = t.role === "student" ? t.studentId : typeof body.aluno === "string" ? body.aluno : ""
  const message = await withTenant(t, (q) => sendMessage(q, t, body.body, sid, body.context))
  // aviso no celular de quem recebe; fora do horário do personal, ele não é incomodado
  try {
    const db = getDb()
    const { userIds, senderName, hours } = await db.tx(async (q) => ({ ...(await recipientsOf(q, t, sid)), hours: await getHours(q, t.trainerId) }))
    if (t.role === "trainer" || isOpen(hours)) {
      await pushTo(userIds, {
        title: senderName.split(" ")[0],
        body: message.body.slice(0, 140),
        url: t.role === "trainer" ? "/aluno/chat" : `/studio/mensagens?aluno=${encodeURIComponent(sid)}`,
        tag: `chat-${sid}`,
      })
    }
  } catch {
    // a mensagem já foi gravada; o aviso é só um extra
  }
  return json({ message })
})
