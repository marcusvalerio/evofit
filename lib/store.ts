"use client"
import { useSyncExternalStore } from "react"
import type { DemoData } from "./types"
import { createSeed } from "./seed"
import { migrate } from "./migrate"

export const STORAGE_KEY = "evofit:demo:v1"

interface State {
  data: DemoData | null
  /** Mensagem exibida uma vez quando os dados precisaram ser restaurados. */
  notice: string | null
  /** true quando o navegador recusou a gravação (modo privado, cota cheia...). */
  persistError: boolean
}

let state: State = { data: null, notice: null, persistError: false }
const listeners = new Set<() => void>()
let started = false

function emit() {
  listeners.forEach((l) => l())
}

function read(): { data: DemoData; notice: string | null } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: createSeed(), notice: "Não foi possível ler os dados salvos neste navegador. A demonstração foi carregada do zero." }
  }
  if (!raw) return { data: createSeed(), notice: null }
  try {
    const parsed: unknown = JSON.parse(raw)
    const data = migrate(parsed)
    if (data) return { data, notice: null }
  } catch {
    /* JSON inválido: cai no reset abaixo */
  }
  return { data: createSeed(), notice: "Os dados salvos estavam em um formato antigo ou inválido e foram restaurados para a demonstração inicial." }
}

function write(data: DemoData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function start() {
  if (started || typeof window === "undefined") return
  started = true
  const { data, notice } = read()
  const ok = write(data)
  state = { data, notice, persistError: !ok }
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return
    const next = read()
    state = { ...state, data: next.data }
    emit()
  })
}

function subscribe(l: () => void) {
  start()
  listeners.add(l)
  return () => listeners.delete(l)
}

const getSnapshot = () => {
  start()
  return state
}
const serverState: State = { data: null, notice: null, persistError: false }
const getServerSnapshot = () => serverState

export function useDemoState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Aplica uma transformação imutável e persiste o resultado. */
export function update(fn: (d: DemoData) => DemoData) {
  if (!state.data) return
  const data = fn(state.data)
  const ok = write(data)
  state = { ...state, data, persistError: !ok }
  emit()
}

export function resetDemo() {
  const data = createSeed()
  const ok = write(data)
  state = { data, notice: null, persistError: !ok }
  emit()
}

export function dismissNotice() {
  state = { ...state, notice: null }
  emit()
}

/** Para componentes renderizados somente após o carregamento (dentro dos shells). */
export function useData(): DemoData {
  const { data } = useDemoState()
  if (!data) throw new Error("useData chamado antes do carregamento da demonstração")
  return data
}
