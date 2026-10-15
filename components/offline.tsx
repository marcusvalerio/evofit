"use client"
import { useEffect } from "react"
import type { DemoData } from "@/lib/types"
import { animUrl, frameUrl, getExercise } from "@/lib/catalog"

/** Registra o service worker (só no build de produção). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])
  return null
}

/**
 * Guarda no aparelho, com antecedência, as páginas e imagens dos treinos do aluno:
 * assim ele abre e executa a ficha mesmo sem sinal na academia.
 */
export function usePrecacheWorkouts(d: DemoData | null, studentId: string | null) {
  const workouts = d && studentId ? d.workouts.filter((w) => w.studentIds.includes(studentId)) : []
  const key = workouts.map((w) => `${w.id}:${w.updatedAt}`).join("|")
  useEffect(() => {
    if (!d || !key || !("serviceWorker" in navigator)) return
    const pages = workouts.map((w) => `/aluno/treino/${w.id}`)
    const media = workouts.flatMap((w) =>
      w.items.flatMap((i) => {
        const ex = getExercise(d, i.exerciseId)
        return ex && ex.frames >= 2 && !ex.custom ? [frameUrl(ex.id, 0), frameUrl(ex.id, 1), animUrl(ex.id, "webp")] : []
      }),
    )
    navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "precache", pages, media: [...new Set(media)] })).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reexecuta só quando as fichas mudam
  }, [key])
}
