"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Bell, ChevronRight, Radar, Trophy, ClipboardList, Dumbbell } from "@/components/icons"
import { useData } from "@/lib/store"
import { markNoticesRead, readNoticeIds, trainerNotices, type Notice } from "@/lib/notices"
import { EmptyState, cx } from "@/components/ui"

const ICON = { dor: AlertTriangle, radar: Radar, recorde: Trophy, treino: Dumbbell, "sem-ficha": ClipboardList } as const
const LABEL = { alta: "Agir agora", media: "Vale ver", baixa: "Para acompanhar" } as const
const TAG = { alta: "badge badge-danger", media: "badge badge-warning", baixa: "badge" } as const

function when(iso: string) {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return "hoje"
  if (days === 1) return "ontem"
  return `há ${days} dias`
}

export default function AvisosPage() {
  const d = useData()
  const list = useMemo(() => trainerNotices(d), [d])
  const [read, setRead] = useState<Set<string>>(new Set())
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lido do navegador depois da hidratação
    setRead(readNoticeIds())
  }, [])
  const unread = list.filter((n) => !read.has(n.id))
  const markAll = () => {
    markNoticesRead(list.map((n) => n.id))
    setRead(new Set(list.map((n) => n.id)))
  }
  const groups = (["alta", "media", "baixa"] as const).map((p) => ({ p, items: list.filter((n) => n.priority === p) })).filter((g) => g.items.length)

  return (
    <div className="fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h1">Avisos</h1>
          <p className="mt-1 text-muted">Dos últimos 14 dias, do mais urgente ao menos urgente. {unread.length > 0 ? `${unread.length} não lido${unread.length > 1 ? "s" : ""}.` : "Tudo lido."}</p>
        </div>
        {unread.length > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={markAll}>
            Marcar tudo como lido
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Bell} title="Nenhum aviso por aqui">
            Quando um aluno treinar, bater recorde, relatar dor ou sumir, aparece aqui.
          </EmptyState>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.p} className="mt-8" aria-labelledby={`g-${g.p}`}>
            <h2 id={`g-${g.p}`} className="t-eyebrow">{LABEL[g.p]}</h2>
            <ul className="mt-3 space-y-2">
              {g.items.map((n: Notice) => {
                const Icon = ICON[n.kind]
                const isNew = !read.has(n.id)
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => markNoticesRead([n.id])}
                      className={cx("card lift flex items-center gap-3 p-4", isNew && "ring-1 ring-[var(--verde-agua)]")}
                    >
                      <span className={cx("grid size-11 shrink-0 place-items-center rounded-[12px]", n.priority === "alta" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--menta)] text-[var(--petroleo)]")}>
                        <Icon size={20} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {isNew && <span className="size-2 shrink-0 rounded-full bg-[#E5383B]" aria-label="Não lido" />}
                          <b className="truncate">{n.title}</b>
                        </span>
                        <span className="block truncate text-sm text-muted">{n.detail}</span>
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className={TAG[n.priority]}>{when(n.at)}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
