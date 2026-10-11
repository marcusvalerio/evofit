"use client"
import { useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { LEVEL_LABEL, type Level } from "@/lib/types"
import { CATALOG_CATEGORIES, CATALOG_EQUIPMENT, CATALOG_GROUPS, filterExercises, type ExerciseView } from "@/lib/catalog"
import { cx } from "./ui"

/* Filtros compartilhados pela biblioteca do Studio e pela biblioteca pública. */

export const LIBRARY_PAGE = 24

export function useExerciseFilters() {
  const [q, setQ] = useState("")
  const [group, setGroup] = useState("")
  const [equipment, setEquipment] = useState("")
  const [level, setLevel] = useState("")
  const [category, setCategory] = useState("")
  const [limit, setLimit] = useState(LIBRARY_PAGE)
  const reset = () => setLimit(LIBRARY_PAGE)
  const wrap = (fn: (v: string) => void) => (v: string) => {
    fn(v)
    reset()
  }
  return {
    q,
    group,
    equipment,
    level,
    category,
    limit,
    setQ: wrap(setQ),
    setGroup: wrap(setGroup),
    setEquipment: wrap(setEquipment),
    setLevel: wrap(setLevel),
    setCategory: wrap(setCategory),
    more: () => setLimit((l) => l + LIBRARY_PAGE * 2),
    reset,
    active: !!(q || group || equipment || level || category),
    clear() {
      setQ("")
      setGroup("")
      setEquipment("")
      setLevel("")
      setCategory("")
      reset()
    },
    apply: (list: readonly ExerciseView[]) => filterExercises(list, { q, group, equipment, level, category }),
  }
}

export type ExerciseFilters = ReturnType<typeof useExerciseFilters>

export function ExerciseFilterBar({ f, count }: { f: ExerciseFilters; count: number }) {
  const [open, setOpen] = useState(false)
  const selects = [f.equipment, f.level, f.category].filter(Boolean).length
  return (
    <>
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <label htmlFor="busca-ex" className="sr-only">
              Buscar exercício
            </label>
            <input id="busca-ex" type="search" className="input pl-10" placeholder="Buscar exercício" value={f.q} onChange={(e) => f.setQ(e.target.value)} />
          </div>
          <button type="button" className="btn btn-outline sm:hidden" aria-expanded={open} aria-controls="filtros-extra" onClick={() => setOpen((x) => !x)}>
            <SlidersHorizontal size={17} aria-hidden /> Filtros
            {selects > 0 && <span className="badge badge-accent pop">{selects}</span>}
          </button>
        </div>
        <div id="filtros-extra" className={cx("gap-2 sm:contents", open ? "fade-in grid" : "hidden")}>
          <Select id="f-eq" label="Equipamento" value={f.equipment} onChange={f.setEquipment} options={CATALOG_EQUIPMENT.map((x) => [x, x])} />
          <Select id="f-lv" label="Nível" value={f.level} onChange={f.setLevel} options={(Object.keys(LEVEL_LABEL) as Level[]).map((x) => [x, LEVEL_LABEL[x]])} />
          <Select id="f-cat" label="Tipo" value={f.category} onChange={f.setCategory} options={CATALOG_CATEGORIES.map((x) => [x, x])} />
        </div>
      </div>

      <div className="scroll-x mb-5 pb-1" role="group" aria-label="Grupo muscular">
        <button type="button" className="chip shrink-0" aria-pressed={!f.group} onClick={() => f.setGroup("")}>
          Todos os músculos
        </button>
        {CATALOG_GROUPS.map((g) => (
          <button key={g} type="button" className="chip shrink-0" aria-pressed={f.group === g} onClick={() => f.setGroup(f.group === g ? "" : g)}>
            {g}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-muted">
        <p aria-live="polite">
          {count} exercício{count === 1 ? "" : "s"}
        </p>
        {f.active && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={f.clear}>
            Limpar filtros
          </button>
        )}
      </div>
    </>
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

export function MoreButton({ left, onClick }: { left: number; onClick: () => void }) {
  if (left <= 0) return null
  return (
    <div className="mt-5 flex justify-center">
      <button type="button" className="btn btn-outline" onClick={onClick}>
        Mostrar mais <span className="tabular text-muted">({left})</span>
      </button>
    </div>
  )
}
