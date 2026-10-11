"use client"
import { useSyncExternalStore } from "react"
import type { TrainerProfile } from "./types"

/** Perfis reais do diretório (do banco). Carregados uma vez por página. */
let profiles: TrainerProfile[] | null = null
let loading = false
const listeners = new Set<() => void>()

function load() {
  if (loading || profiles) return
  loading = true
  fetch("/api/directory")
    .then((r) => (r.ok ? r.json() : { profiles: [] }))
    .then((j: { profiles?: TrainerProfile[] }) => (profiles = Array.isArray(j.profiles) ? j.profiles : []))
    .catch(() => (profiles = []))
    .finally(() => {
      loading = false
      listeners.forEach((l) => l())
    })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  load()
  return () => listeners.delete(l)
}

/** null enquanto carrega. */
export function useRealProfiles() {
  return useSyncExternalStore(subscribe, () => profiles, () => null)
}
