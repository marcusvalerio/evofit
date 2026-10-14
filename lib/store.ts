"use client"
import { useSyncExternalStore } from "react"
import type { DemoData } from "./types"
import { createSeed } from "./seed"
import { migrate } from "./migrate"
import { diff, isEmpty, type Changes } from "./sync"

/*
 * Dois modos, mesma interface para as telas:
 *  - demo: dados fictícios no localStorage (sem login);
 *  - conta: dados do personal/aluno no banco (Neon). As telas continuam chamando update(fn) com as
 *    ações puras; o store calcula o que mudou e envia ao servidor, que revalida e grava.
 */

export const STORAGE_KEY = "evofit:demo:v1"
const HINT_COOKIE = "evofit_auth"

export interface AccountInfo {
  email: string
  role: "trainer" | "student"
}

export type SyncStatus = "idle" | "saving" | "error"

interface State {
  data: DemoData | null
  mode: "loading" | "demo" | "account" | "offline"
  account: AccountInfo | null
  /** Mensagem exibida uma vez quando os dados precisaram ser restaurados. */
  notice: string | null
  /** true quando o navegador recusou a gravação (modo privado, cota cheia...). */
  persistError: boolean
  sync: SyncStatus
  syncError: string | null
}

const initial: State = { data: null, mode: "loading", account: null, notice: null, persistError: false, sync: "idle", syncError: null }
let state: State = initial
const listeners = new Set<() => void>()
let started = false

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

/* ---------- Demonstração (localStorage) ---------- */

function readLocal(): { data: DemoData; notice: string | null } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: createSeed(), notice: "Não foi possível ler os dados salvos neste navegador. A demonstração foi carregada do zero." }
  }
  if (!raw) return { data: createSeed(), notice: null }
  try {
    const data = migrate(JSON.parse(raw))
    if (data) return { data, notice: null }
  } catch {
    /* JSON inválido: cai no reset abaixo */
  }
  return { data: createSeed(), notice: "Os dados salvos estavam em um formato antigo ou inválido e foram restaurados para a demonstração inicial." }
}

function writeLocal(data: DemoData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function startDemo() {
  const { data, notice } = readLocal()
  const ok = writeLocal(data)
  set({ data, notice, persistError: !ok, mode: "demo", account: null })
}

/* ---------- Conta (servidor) ---------- */

const hasAccountHint = () => {
  try {
    return document.cookie.split(";").some((c) => c.trim().startsWith(`${HINT_COOKIE}=`))
  } catch {
    return false
  }
}

async function fetchWorkspace() {
  const r = await fetch("/api/workspace", { cache: "no-store", credentials: "same-origin" })
  if (r.status === 401 || r.status === 503 || r.status === 404) return null
  if (!r.ok) throw new Error(String(r.status))
  return (await r.json()) as { account: AccountInfo; data: DemoData }
}

async function loadAccount() {
  try {
    const ws = await fetchWorkspace()
    if (ws) set({ data: ws.data, account: ws.account, mode: "account", sync: "idle", syncError: null })
    else startDemo()
  } catch {
    set({ mode: "offline", data: null })
  }
}

/** Fila de envio: uma alteração por vez, na ordem em que aconteceram. */
let queue: Promise<void> = Promise.resolve()
let pending = 0

function send(changes: Changes) {
  pending++
  set({ sync: "saving" })
  queue = queue.then(async () => {
    try {
      const r = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ changes }),
      })
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Não foi possível salvar.")
      }
      pending--
      if (pending === 0 && state.sync !== "error") set({ sync: "idle" })
    } catch (e) {
      pending--
      // volta ao que está gravado no servidor para não exibir algo que não foi salvo
      set({ sync: "error", syncError: `${(e as Error).message} A tela foi atualizada com os dados salvos.` })
      const ws = await fetchWorkspace().catch(() => null)
      if (ws) set({ data: ws.data })
    }
  })
}

function start() {
  if (started || typeof window === "undefined") return
  started = true
  if (hasAccountHint()) loadAccount()
  else startDemo()
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || state.mode !== "demo") return
    set({ data: readLocal().data })
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
const getServerSnapshot = () => initial

export function useDemoState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Aplica uma transformação imutável e persiste o resultado (navegador ou servidor). */
export function update(fn: (d: DemoData) => DemoData) {
  if (!state.data) return
  const prev = state.data
  const data = fn(prev)
  if (state.mode === "account") {
    const changes = diff(prev, data)
    // activeStudentId é só preferência de tela; o resto vai para o servidor
    set({ data })
    if (!isEmpty(changes)) send(changes)
    return
  }
  const ok = writeLocal(data)
  set({ data, persistError: !ok })
}

export function resetDemo() {
  if (state.mode === "account") return
  const data = createSeed()
  const ok = writeLocal(data)
  set({ data, notice: null, persistError: !ok })
}

export function dismissNotice() {
  set({ notice: null, syncError: null, sync: state.sync === "error" ? "idle" : state.sync })
}

export function retryLoad() {
  set({ mode: "loading" })
  loadAccount()
}

/** Espera os envios pendentes (ex.: antes de sair da conta). */
export const flush = () => queue

/** Para componentes renderizados somente após o carregamento (dentro dos shells). */
export function useData(): DemoData {
  const { data } = useDemoState()
  if (!data) throw new Error("useData chamado antes do carregamento dos dados")
  return data
}

/** true fora de uma conta (demonstração ou carregando). */
export function useIsDemo() {
  return useDemoState().mode !== "account"
}
