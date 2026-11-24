/** Horário de atendimento do chat (Chat e Avisos). Padrão: livre 24h. */
export interface ChatHours {
  always: boolean
  /** minutos desde 00:00 */
  from: number
  to: number
  /** bit 0 = domingo … bit 6 = sábado */
  days: number
}
export const DEFAULT_HOURS: ChatHours = { always: true, from: 360, to: 1320, days: 0b0111110 }
export const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

/** Está dentro do horário? Usa o horário de Brasília. */
export function isOpen(h: ChatHours, now = new Date()) {
  if (h.always) return true
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))
  const min = (Number(get("hour")) % 24) * 60 + Number(get("minute"))
  if (!(h.days & (1 << dow))) return false
  return h.from <= h.to ? min >= h.from && min < h.to : min >= h.from || min < h.to
}

export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

export function hoursText(h: ChatHours) {
  if (h.always) return "Recebe mensagens a qualquer hora."
  const days = DAY_LABELS.filter((_, i) => h.days & (1 << i)).join(", ")
  return `Responde ${days || "—"}, das ${hhmm(h.from)} às ${hhmm(h.to)}.`
}

export function validHours(x: unknown): ChatHours | null {
  const h = x as Partial<ChatHours>
  if (!h || typeof h.always !== "boolean") return null
  const ok = (n: unknown, max: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max
  if (!ok(h.from, 1439) || !ok(h.to, 1439) || !ok(h.days, 127)) return null
  return { always: h.always, from: h.from as number, to: h.to as number, days: h.days as number }
}
