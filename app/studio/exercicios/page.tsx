"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Dumbbell, Lightbulb, Plus, Video } from "lucide-react"
import { useData } from "@/lib/store"
import { CATALOG_SIZE, allExercises } from "@/lib/catalog"
import { parseVideoUrl } from "@/lib/video"
import { EmptyState, PageHeader, cx } from "@/components/ui"
import { ExerciseThumb } from "@/components/exercise"
import { ExerciseForm } from "@/components/exercise-form"
import { ExerciseFilterBar, LIBRARY_PAGE, MoreButton, useExerciseFilters } from "@/components/library"

type Tab = "todos" | "meus" | "material" | "fichas"

export default function ExerciciosPage() {
  const d = useData()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("todos")
  const f = useExerciseFilters()
  const [creating, setCreating] = useState(false)

  const used = useMemo(() => new Set(d.workouts.flatMap((w) => w.items.map((i) => i.exerciseId))), [d.workouts])
  const all = useMemo(() => allExercises(d), [d])
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "todos", label: "Todos", count: all.length },
    { id: "meus", label: "Meus", count: d.exercises.length },
    { id: "material", label: "Com vídeo ou dica", count: Object.keys(d.exerciseMedia).length },
    { id: "fichas", label: "Nas fichas", count: used.size },
  ]

  const list = useMemo(() => {
    const base = tab === "meus" ? all.filter((e) => e.custom) : tab === "material" ? all.filter((e) => d.exerciseMedia[e.id]) : tab === "fichas" ? all.filter((e) => used.has(e.id)) : all
    return f.apply(base)
  }, [all, tab, f, d.exerciseMedia, used])
  const filtered = f.active

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Biblioteca"
        title="Exercícios"
        description={`${CATALOG_SIZE} exercícios com demonstração animada e passo a passo em português, mais os que você criar. Adicione seu vídeo ou uma dica para o aluno treinar sozinho com segurança.`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden /> Exercício próprio
          </button>
        }
      />

      <div className="scroll-x mb-4" role="tablist" aria-label="Filtrar biblioteca">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cx("chip shrink-0", tab === t.id && "!border-inverse !bg-inverse !text-on-inverse")}
            onClick={() => (setTab(t.id), f.reset())}
          >
            {t.label}
            <span className="tabular text-xs opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      <ExerciseFilterBar f={f} count={list.length} />

      {list.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={tab === "meus" && !filtered ? "Você ainda não criou exercícios" : tab === "material" && !filtered ? "Nenhum vídeo ou dica ainda" : "Nenhum exercício encontrado"}
          action={
            tab === "meus" && !filtered ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
                <Plus size={16} aria-hidden /> Criar exercício
              </button>
            ) : filtered ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={f.clear}>
                Limpar filtros
              </button>
            ) : undefined
          }
        >
          {tab === "material" && !filtered ? "Abra um exercício e cole o link do seu vídeo (YouTube, Vimeo, Google Drive ou .mp4) ou escreva uma dica." : undefined}
        </EmptyState>
      ) : (
        <>
          <ul className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {list.slice(0, f.limit).map((e, i) => {
              const m = d.exerciseMedia[e.id]
              const hasVideo = !!(m?.videoUrl && parseVideoUrl(m.videoUrl))
              return (
                <li key={e.id} style={{ "--i": i % LIBRARY_PAGE } as React.CSSProperties}>
                  <Link href={`/studio/exercicios/${encodeURIComponent(e.id)}`} className="card lift group flex h-full flex-col overflow-hidden p-2">
                    <ExerciseThumb ex={e} className="w-full" />
                    <div className="flex min-w-0 flex-1 flex-col px-1.5 pb-1 pt-2.5">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{e.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {e.group} · {e.equipment}
                      </p>
                      {(e.custom || hasVideo || m?.tip || used.has(e.id)) && (
                        <p className="mt-auto flex flex-wrap gap-1 pt-2">
                          {e.custom && <span className="badge badge-accent">Próprio</span>}
                          {hasVideo && (
                            <span className="badge badge-success">
                              <Video size={11} aria-hidden /> Vídeo
                            </span>
                          )}
                          {m?.tip && (
                            <span className="badge">
                              <Lightbulb size={11} aria-hidden /> Dica
                            </span>
                          )}
                          {used.has(e.id) && <span className="badge">Na ficha</span>}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
          <MoreButton left={list.length - f.limit} onClick={f.more} />
        </>
      )}

      {creating && <ExerciseForm onClose={() => setCreating(false)} onCreated={(id) => router.push(`/studio/exercicios/${id}`)} />}
    </div>
  )
}
