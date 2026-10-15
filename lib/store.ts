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
  /** Acesso com senha provisória: precisa criar a própria senha antes de usar o app. */
  mustChangePassword?: boolean
  /** E-mail em ADMIN_EMAILS: vê o painel de administração. */
  isAdmin?: boolean
}

export type SyncStatus = "idle" | "saving" | "error" | "offline"

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
  /** Alterações feitas sem internet, guardadas no aparelho até a conexão voltar. */
  queued: number
}

const initial: State = { data: null, mode: "loading", account: null, notice: null, persistError: false, sync: "idle", syncError: null, queued: 0 }
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

/* ---------- Sem internet (modo conta) ----------
 * A última cópia dos dados da conta e as alterações ainda não enviadas ficam no aparelho.
 * Sem conexão, o app abre com a cópia e as alterações entram numa fila, enviada em ordem
 * quando a internet volta. Sair da conta apaga as duas (aparelho compartilhado).
 */
const CACHE_KEY = "evofit:account-cache:v1"
const OUTBOX_KEY = "evofit:outbox:v1"

type Cached = { account: AccountInfo; data: DemoData }

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function writeJSON(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* sem espaço: segue só em memória */
  }
}
const readOutbox = () => readJSON<Changes[]>(OUTBOX_KEY) ?? []
const writeOutbox = (o: Changes[]) => (o.length ? writeJSON(OUTBOX_KEY, o) : clearKey(OUTBOX_KEY))
function clearKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {}
}
function cacheAccount() {
  if (state.mode === "account" && state.data && state.account) writeJSON(CACHE_KEY, { account: state.account, data: state.data } satisfies Cached)
}

/** Apaga a cópia local e a fila (ao sair da conta). */
export function clearOffline() {
  clearKey(CACHE_KEY)
  clearKey(OUTBOX_KEY)
}

/** Falha de rede (sem resposta do servidor), diferente de um erro devolvido pelo servidor. */
class NetworkError extends Error {}

async function patch(changes: Changes) {
  let r: Response
  try {
    r = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ changes }) })
  } catch {
    throw new NetworkError("Sem conexão.")
  }
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Não foi possível salvar.")
  }
}

async function loadAccount() {
  let ws: Cached | null
  try {
    ws = await fetchWorkspace()
  } catch {
    // sem internet: abre com a última cópia guardada, se houver
    const cached = readJSON<Cached>(CACHE_KEY)
    if (cached?.data && migrate(cached.data)) {
      set({ data: migrate(cached.data), account: cached.account, mode: "account", sync: "offline", syncError: null, queued: readOutbox().length })
      return
    }
    set({ mode: "offline", data: null })
    return
  }
  if (!ws) return startDemo()
  const cached = readJSON<Cached>(CACHE_KEY)
  // outra conta neste aparelho: descarta a cópia e a fila dela
  if (cached && cached.account.email !== ws.account.email) clearOffline()
  set({ data: ws.data, account: ws.account, mode: "account", sync: "idle", syncError: null, queued: readOutbox().length })
  cacheAccount()
  if (readOutbox().length) void flushOutbox()
}

/** Fila de envio: uma alteração por vez, na ordem em que aconteceram. */
let queue: Promise<void> = Promise.resolve()
let pending = 0

function send(changes: Changes) {
  // com fila offline pendente, a nova alteração entra no fim dela para manter a ordem
  if (readOutbox().length) {
    const o = [...readOutbox(), changes]
    writeOutbox(o)
    set({ sync: "offline", queued: o.length })
    void flushOutbox()
    return
  }
  pending++
  set({ sync: "saving" })
  queue = queue.then(async () => {
    try {
      await patch(changes)
      pending--
      if (pending === 0 && state.sync !== "error" && state.sync !== "offline") set({ sync: "idle" })
    } catch (e) {
      pending--
      if (e instanceof NetworkError) {
        const o = [...readOutbox(), changes]
        writeOutbox(o)
        set({ sync: "offline", queued: o.length })
        return
      }
      // o servidor recusou: volta ao que está gravado para não exibir algo que não foi salvo
      set({ sync: "error", syncError: `${(e as Error).message} A tela foi atualizada com os dados salvos.` })
      const ws = await fetchWorkspace().catch(() => null)
      if (ws) {
        set({ data: ws.data })
        cacheAccount()
      }
    }
  })
}

let flushing = false
/** Envia a fila guardada no aparelho. Para no primeiro erro de rede; recusa do servidor descarta só aquele item. */
async function flushOutbox() {
  if (flushing || state.mode !== "account") return
  flushing = true
  try {
    let o = readOutbox()
    let rejected: string | null = null
    while (o.length) {
      try {
        await patch(o[0])
      } catch (e) {
        if (e instanceof NetworkError) {
          set({ sync: "offline", queued: o.length })
          return
        }
        rejected = (e as Error).message
      }
      o = o.slice(1)
      writeOutbox(o)
      set({ queued: o.length })
    }
    const ws = await fetchWorkspace().catch(() => null)
    if (ws) set({ data: ws.data })
    cacheAccount()
    set(rejected ? { sync: "error", syncError: `Parte do que foi feito sem internet não pôde ser salva: ${rejected}`, queued: 0 } : { sync: "idle", queued: 0 })
  } finally {
    flushing = false
  }
}

function start() {
  if (started || typeof window === "undefined") return
  started = true
  if (hasAccountHint()) loadAccount()
  else startDemo()
  window.addEventListener("online", () => void flushOutbox())
  // rede instável: tenta de novo de tempos em tempos enquanto houver fila
  window.setInterval(() => {
    if (state.mode === "account" && state.queued > 0 && navigator.onLine) void flushOutbox()
  }, 20_000)
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
    cacheAccount()
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
