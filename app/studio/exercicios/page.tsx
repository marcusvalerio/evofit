"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Dumbbell, Lightbulb, Plus, Search, SlidersHorizontal, Video } from "lucide-react"
import { useData } from "@/lib/store"
import { LEVEL_LABEL, type Level } from "@/lib/types"
import { CATALOG_CATEGORIES, CATALOG_EQUIPMENT, CATALOG_GROUPS, CATALOG_SIZE, allExercises, filterExercises } from "@/lib/catalog"
import { parseVideoUrl } from "@/lib/video"
import { EmptyState, PageHeader, cx } from "@/components/ui"
import { ExerciseThumb } from "@/components/exercise"
import { ExerciseForm } from "@/components/exercise-form"

type Tab = "todos" | "meus" | "material" | "fichas"
const PAGE = 24

export default function ExerciciosPage() {
  const d = useData()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("todos")
  const [q, setQ] = useState("")
  const [group, setGroup] = useState("")
  const [equipment, setEquipment] = useState("")
  const [level, setLevel] = useState("")
  const [category, setCategory] = useState("")
  const [limit, setLimit] = useState(PAGE)
  const [creating, setCreating] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const activeSelects = [equipment, level, category].filter(Boolean).length

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
    return filterExercises(base, { q, group, equipment, level, category })
  }, [all, tab, q, group, equipment, level, category, d.exerciseMedia, used])

  const reset = () => setLimit(PAGE)
  const filtered = !!(q || group || equipment || level || category)
  const clear = () => {
    setQ("")
    setGroup("")
    setEquipment("")
    setLevel("")
    setCategory("")
    reset()
  }

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
            onClick={() => (setTab(t.id), reset())}
          >
            {t.label}
            <span className="tabular text-xs opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <label htmlFor="busca-ex" className="sr-only">
              Buscar exercício
            </label>
            <input id="busca-ex" type="search" className="input pl-10" placeholder="Buscar exercício" value={q} onChange={(e) => (setQ(e.target.value), reset())} />
          </div>
          <button type="button" className="btn btn-outline sm:hidden" aria-expanded={showFilters} aria-controls="filtros-extra" onClick={() => setShowFilters((x) => !x)}>
            <SlidersHorizontal size={17} aria-hidden /> Filtros
            {activeSelects > 0 && <span className="badge badge-accent pop">{activeSelects}</span>}
          </button>
        </div>
        <div id="filtros-extra" className={cx("gap-2 sm:contents", showFilters ? "fade-in grid" : "hidden")}>
        <Select id="f-eq" label="Equipamento" value={equipment} onChange={(v) => (setEquipment(v), reset())} options={CATALOG_EQUIPMENT.map((x) => [x, x])} />
        <Select id="f-lv" label="Nível" value={level} onChange={(v) => (setLevel(v), reset())} options={(Object.keys(LEVEL_LABEL) as Level[]).map((x) => [x, LEVEL_LABEL[x]])} />
        <Select id="f-cat" label="Tipo" value={category} onChange={(v) => (setCategory(v), reset())} options={CATALOG_CATEGORIES.map((x) => [x, x])} />
        </div>
      </div>

      <div className="scroll-x mb-5 pb-1" role="group" aria-label="Grupo muscular">
        <button type="button" className="chip shrink-0" aria-pressed={!group} onClick={() => (setGroup(""), reset())}>
          Todos os músculos
        </button>
        {CATALOG_GROUPS.map((g) => (
          <button key={g} type="button" className="chip shrink-0" aria-pressed={group === g} onClick={() => (setGroup(group === g ? "" : g), reset())}>
            {g}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-muted">
        <p aria-live="polite">
          {list.length} exercício{list.length === 1 ? "" : "s"}
        </p>
        {filtered && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            Limpar filtros
          </button>
        )}
      </div>

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
              <button type="button" className="btn btn-outline btn-sm" onClick={clear}>
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
            {list.slice(0, limit).map((e, i) => {
              const m = d.exerciseMedia[e.id]
              const hasVideo = !!(m?.videoUrl && parseVideoUrl(m.videoUrl))
              return (
                <li key={e.id} style={{ "--i": i % PAGE } as React.CSSProperties}>
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
          {list.length > limit && (
            <div className="mt-5 flex justify-center">
              <button type="button" className="btn btn-outline" onClick={() => setLimit((l) => l + PAGE * 2)}>
                Mostrar mais <span className="tabular text-muted">({list.length - limit})</span>
              </button>
            </div>
          )}
        </>
      )}

      {creating && <ExerciseForm onClose={() => setCreating(false)} onCreated={(id) => router.push(`/studio/exercicios/${id}`)} />}
    </div>
  )
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} className={cx("input sm:w-44", value && "!border-fg")} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{label}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </>
  )
}
