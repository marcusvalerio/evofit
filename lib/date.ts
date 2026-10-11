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
