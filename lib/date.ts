export const DAY_MS = 86_400_000

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Segunda-feira 00:00 da semana de `d`. */
export function startOfWeek(d: Date) {
  const x = startOfDay(d)
  const dow = x.getDay() === 0 ? 6 : x.getDay() - 1
  x.setDate(x.getDate() - dow)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
const dateLongFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })

export function fmtDate(iso: string) {
  return dateFmt.format(new Date(iso)).replace(".", "")
}
export function fmtDayMonth(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}
export function fmtDateLong(iso: string) {
  return dateLongFmt.format(new Date(iso))
}
export function fmtTime(iso: string) {
  return timeFmt.format(new Date(iso))
}

export function relativeDays(iso: string, now = new Date()) {
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY_MS)
  if (diff <= 0) return "hoje"
  if (diff === 1) return "ontem"
  return `há ${diff} dias`
}

export function durationMin(startIso: string, endIso: string | null) {
  if (!endIso) return 0
  return Math.max(1, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000))
}

/** Data AAAA-MM-DD (sem fuso) → "01/09/2026". Meio-dia evita voltar um dia em fusos negativos. */
export function fmtIsoDay(day: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${day}T12:00:00`))
}

export function daysSinceIso(day: string, now = new Date()) {
  return Math.floor((startOfDay(now).getTime() - startOfDay(new Date(`${day}T12:00:00`)).getTime()) / DAY_MS)
}

/** Último dia do mês (1–12): 28/29 em fevereiro, 30 ou 31 nos demais. */
export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

const pad = (n: number) => String(n).padStart(2, "0")
export const isoDayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** AAAA-MM-DD existente no calendário (rejeita 31/04, 29/02 fora de ano bissexto etc.). */
export function isValidIsoDay(day: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo)
}

/**
 * Soma meses a uma data AAAA-MM-DD mantendo o dia; se o mês de destino for mais curto,
 * usa o último dia dele (31/11 não existe: 30/11 + 3 meses → 28/02 ou 29/02).
 */
export function addMonthsIso(day: string, months: number) {
  const [y, m, d] = day.split("-").map(Number)
  const total = y * 12 + (m - 1) + months
  const ty = Math.floor(total / 12)
  const tm = (total % 12) + 1
  return `${ty}-${pad(tm)}-${pad(Math.min(d, daysInMonth(ty, tm)))}`
}
