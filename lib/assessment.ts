import type { Assessment, DemoData, Sex, Skinfold } from "./types"

/** Dobras exigidas por protocolo (Jackson & Pollock). */
export const PROTOCOL_SITES: Record<"pollock3" | "pollock7", Record<Sex, Skinfold[]>> = {
  pollock3: { M: ["peitoral", "abdominal", "coxa"], F: ["triceps", "suprailiaca", "coxa"] },
  pollock7: {
    M: ["peitoral", "axilar", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"],
    F: ["peitoral", "axilar", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"],
  },
}

/** Densidade corporal por Jackson & Pollock (1978, 1980). */
function density(protocol: "pollock3" | "pollock7", sex: Sex, sum: number, age: number) {
  if (protocol === "pollock7")
    return sex === "M"
      ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * age
      : 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * age
  return sex === "M"
    ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * age
    : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * age
}

const round1 = (n: number) => Math.round(n * 10) / 10

export type FatSource = "pollock7" | "pollock3" | "informado"

/**
 * % de gordura: 7 dobras quando completas, senão 3 dobras, senão o valor informado (ex.: bioimpedância).
 * Sem dados suficientes, retorna null — nunca estima.
 */
export function bodyFat(a: Assessment): { pct: number; source: FatSource } | null {
  if (a.age !== null) {
    for (const protocol of ["pollock7", "pollock3"] as const) {
      const sites = PROTOCOL_SITES[protocol][a.sex]
      const values = sites.map((s) => a.skinfolds[s])
      if (values.every((v) => typeof v === "number" && v > 0)) {
        const sum = (values as number[]).reduce((x, y) => x + y, 0)
        const pct = 495 / density(protocol, a.sex, sum, a.age) - 450 // Siri (1961)
        if (Number.isFinite(pct) && pct > 0 && pct < 70) return { pct: round1(pct), source: protocol }
      }
    }
  }
  return a.bodyFatPct !== null ? { pct: round1(a.bodyFatPct), source: "informado" } : null
}

export function bmi(a: Assessment) {
  if (!a.weightKg || !a.heightCm) return null
  return round1(a.weightKg / (a.heightCm / 100) ** 2)
}

/** Relação cintura-quadril. */
export function waistHip(a: Assessment) {
  const w = a.circumferences.cintura
  const h = a.circumferences.quadril
  return w && h ? Math.round((w / h) * 100) / 100 : null
}

export function composition(a: Assessment) {
  const f = bodyFat(a)
  if (!f || !a.weightKg) return null
  const fat = round1((a.weightKg * f.pct) / 100)
  return { fatKg: fat, leanKg: round1(a.weightKg - fat) }
}

export function sumSkinfolds(a: Assessment) {
  const v = Object.values(a.skinfolds).filter((x): x is number => typeof x === "number")
  return v.length ? round1(v.reduce((x, y) => x + y, 0)) : null
}

export function assessmentsOf(d: DemoData, studentId: string) {
  return d.assessments.filter((a) => a.studentId === studentId).sort((a, b) => a.date.localeCompare(b.date))
}

export const FAT_SOURCE_LABEL: Record<FatSource, string> = {
  pollock7: "Pollock 7 dobras",
  pollock3: "Pollock 3 dobras",
  informado: "valor informado",
}
