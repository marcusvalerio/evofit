import type { Queryable, Tenant } from "./db"
import { HttpError } from "./workspace"

export interface ChatMessage {
  id: string
  sender: "trainer" | "student"
  body: string
  createdAt: string
  readAt: string | null
}
export interface ChatThread {
  studentId: string
  studentName: string
  last: ChatMessage | null
  unread: number
}

type T = Extract<Tenant, { role: "trainer" | "student" }>

const row = (r: { id: string; sender: "trainer" | "student"; body: string; created_at: Date | string; read_at: Date | string | null }): ChatMessage => ({
  id: r.id,
  sender: r.sender,
  body: r.body,
  createdAt: new Date(r.created_at).toISOString(),
  readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
})

function studentOf(t: T, studentId?: string) {
  const id = t.role === "student" ? t.studentId : studentId
  if (!id || id.length > 64) throw new HttpError(400, "Aluno inválido.")
  return id
}

/** Conversas do personal: uma por aluno ativo, com a última mensagem e as não lidas. */
export async function listThreads(q: Queryable, t: T): Promise<ChatThread[]> {
  if (t.role !== "trainer") throw new HttpError(403, "Só para personal.")
  const r = await q.query<{ student_id: string; name: string; id: string | null; sender: "trainer" | "student"; body: string; created_at: string; read_at: string | null; unread: string }>(
    `select s.id as student_id, s.name, m.id, m.sender, m.body, m.created_at, m.read_at,
            (select count(*) from messages u where u.trainer_id = s.trainer_id and u.student_id = s.id and u.sender = 'student' and u.read_at is null) as unread
       from students s
       left join lateral (select * from messages x where x.trainer_id = s.trainer_id and x.student_id = s.id order by x.created_at desc limit 1) m on true
      where s.status = 'ativo'
      order by m.created_at desc nulls last, s.name`,
  )
  return r.rows.map((x) => ({ studentId: x.student_id, studentName: x.name, last: x.id ? row({ ...x, id: x.id }) : null, unread: Number(x.unread) }))
}

/** Mensagens da conversa (as 200 mais recentes, em ordem) e marca como lidas as recebidas. */
export async function openThread(q: Queryable, t: T, studentId?: string): Promise<ChatMessage[]> {
  const sid = studentOf(t, studentId)
  const other = t.role === "trainer" ? "student" : "trainer"
  await q.query("update messages set read_at = now() where student_id = $1 and sender = $2 and read_at is null", [sid, other])
  const r = await q.query<Parameters<typeof row>[0]>(
    "select id, sender, body, created_at, read_at from (select * from messages where student_id = $1 order by created_at desc limit 200) m order by created_at",
    [sid],
  )
  return r.rows.map(row)
}

export async function sendMessage(q: Queryable, t: T, body: unknown, studentId?: string): Promise<ChatMessage> {
  const sid = studentOf(t, studentId)
  const text = typeof body === "string" ? body.trim() : ""
  if (!text) throw new HttpError(400, "Escreva uma mensagem.")
  if (text.length > 2000) throw new HttpError(400, "Mensagem longa demais (máximo de 2.000 caracteres).")
  const r = await q.query<Parameters<typeof row>[0]>(
    "insert into messages (trainer_id, student_id, sender, body) values ($1, $2, $3, $4) returning id, sender, body, created_at, read_at",
    [t.trainerId, sid, t.role, text],
  )
  return row(r.rows[0])
}

/** Quantas mensagens não lidas a pessoa tem (para o ponto vermelho). */
export async function unreadCount(q: Queryable, t: T): Promise<number> {
  const other = t.role === "trainer" ? "student" : "trainer"
  const r = t.role === "trainer"
    ? await q.query<{ n: string }>("select count(*) as n from messages where sender = $1 and read_at is null", [other])
    : await q.query<{ n: string }>("select count(*) as n from messages where student_id = $1 and sender = $2 and read_at is null", [t.studentId, other])
  return Number(r.rows[0]?.n ?? 0)
}
