"use client"
export function load<T>(key: string, fb: T): T {
  if (typeof window === "undefined") return fb
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb } catch { return fb }
}
export function save(key: string, val: unknown) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
export function pad(n: number) { return String(n).padStart(2, "0") }
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
export function fmtDate(s: string) { if (!s) return ""; const [,m,d] = s.split("-"); return `${d}/${m}` }
export function todayIdx() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

export interface Weight { date: string; val: number }

export function dayPct(day: string, checked: Record<string,boolean>, plan: Record<string, Record<string, unknown[]>>) {
  let total = 0, done = 0
  Object.entries(plan[day] || {}).forEach(([meal, items]) => {
    (items as unknown[]).forEach((_, i) => { total++; if (checked[`${day}__${meal}__${i}`]) done++ })
  })
  return total === 0 ? 0 : Math.round((done/total)*100)
}

export function streak(checked: Record<string,boolean>, plan: Record<string, Record<string, unknown[]>>, days: readonly string[]) {
  let s = 0; const d = new Date()
  for (let i = 0; i < 365; i++) {
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
    const name = days[idx]
    if (dayPct(name, checked, plan) === 100) { s++; d.setDate(d.getDate()-1) }
    else if (i === 0) { d.setDate(d.getDate()-1) }
    else break
  }
  return s
}
