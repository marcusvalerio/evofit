"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { postJson } from "./account-client"
import { useDemoState } from "./store"

export interface ChatMsg {
  id: string
  sender: "trainer" | "student"
  body: string
  createdAt: string
  readAt: string | null
}
export interface Thread {
  studentId: string
  studentName: string
  last: ChatMsg | null
  unread: number
}

const DEMO_KEY = "evofit:demo-chat"
function demoAll(): Record<string, ChatMsg[]> {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? "{}") as Record<string, ChatMsg[]>
  } catch {
    return {}
  }
}
function demoSave(all: Record<string, ChatMsg[]>) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(all))
  } catch {}
}

const POLL_MS = 10_000

/** Uma conversa. No personal, `studentId` diz com quem; no aluno, é sempre com o próprio personal. */
export function useThread(as: "trainer" | "student", studentId: string | null) {
  const { mode } = useDemoState()
  const demo = mode !== "account"
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)

  const load = useCallback(async () => {
    if (!studentId) return
    if (demo) {
      const all = demoAll()
      const list = (all[studentId] ?? []).map((m) => (m.sender !== as && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m))
      all[studentId] = list
      demoSave(all)
      setMessages(list)
      setLoading(false)
      return
    }
    const qs = as === "trainer" ? `?aluno=${encodeURIComponent(studentId)}` : ""
    const r = await fetch(`/api/chat/thread${qs}`, { credentials: "same-origin" }).catch(() => null)
    if (!alive.current) return
    if (r?.ok) {
      const d = (await r.json()) as { messages: ChatMsg[] }
      setMessages(d.messages)
      setError(null)
    } else setError("Sem conexão com o chat agora.")
    setLoading(false)
  }, [as, demo, studentId])

  useEffect(() => {
    alive.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- primeira carga da conversa
    void load()
    const t = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS)
    return () => {
      alive.current = false
      clearInterval(t)
    }
  }, [load])

  const send = useCallback(
    async (body: string) => {
      const text = body.trim()
      if (!text || !studentId) return false
      if (demo) {
        const all = demoAll()
        const m: ChatMsg = { id: `d${Date.now()}`, sender: as, body: text, createdAt: new Date().toISOString(), readAt: null }
        all[studentId] = [...(all[studentId] ?? []), m]
        demoSave(all)
        setMessages(all[studentId])
        return true
      }
      const r = await postJson<{ message: ChatMsg }>("/api/chat/thread", { body: text, aluno: as === "trainer" ? studentId : undefined }).catch(() => null)
      if (r?.ok) {
        setMessages((l) => [...l, r.data.message])
        setError(null)
        return true
      }
      setError(r?.data.error ?? "Não foi possível enviar. Tente de novo.")
      return false
    },
    [as, demo, studentId],
  )

  return { messages, loading, error, send }
}

/** Conversas do personal (lista) e total de não lidas. */
export function useThreads(names: { id: string; name: string }[]) {
  const { mode } = useDemoState()
  const demo = mode !== "account"
  const [threads, setThreads] = useState<Thread[]>([])
  const key = names.map((n) => n.id).join(",")
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (demo) {
        const all = demoAll()
        if (alive)
          setThreads(
            names
              .map((n) => {
                const l = all[n.id] ?? []
                return { studentId: n.id, studentName: n.name, last: l[l.length - 1] ?? null, unread: l.filter((m) => m.sender === "student" && !m.readAt).length }
              })
              .sort((a, b) => (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? "") || a.studentName.localeCompare(b.studentName)),
          )
        return
      }
      const r = await fetch("/api/chat", { credentials: "same-origin" }).catch(() => null)
      if (r?.ok && alive) setThreads(((await r.json()) as { threads: Thread[] }).threads)
    }
    void load()
    const t = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega quando muda a lista de alunos
  }, [demo, key])
  return threads
}

/** Total de mensagens não lidas (ponto vermelho no ícone de chat). */
export function useUnread(as: "trainer" | "student", studentId: string | null) {
  const { mode } = useDemoState()
  const demo = mode !== "account"
  const [n, setN] = useState(0)
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (demo) {
        const all = demoAll()
        const list = as === "student" ? (studentId ? all[studentId] ?? [] : []) : Object.values(all).flat()
        if (alive) setN(list.filter((m) => m.sender !== as && !m.readAt).length)
        return
      }
      const r = await fetch("/api/chat", { credentials: "same-origin" }).catch(() => null)
      if (r?.ok && alive) setN(((await r.json()) as { unread: number }).unread)
    }
    void load()
    const t = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS * 3)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [as, demo, studentId])
  return n
}
