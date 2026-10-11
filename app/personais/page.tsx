"use client"
import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MapPin, Search, SearchX } from "lucide-react"
import { useDemoState } from "@/lib/store"
import { directoryList, filterProfiles, type DirectoryFilters } from "@/lib/directory"
import { MODALITY_LABEL, SPECIALTIES, type Modality } from "@/lib/types"
import { Avatar, EmptyState } from "@/components/ui"

export default function PersonaisPage() {
  return (
    <Suspense>
      <Directory />
    </Suspense>
  )
}

function Directory() {
  const { data } = useDemoState()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const f: DirectoryFilters = { q: params.get("q") ?? "", state: params.get("uf") ?? "", modality: params.get("modalidade") ?? "", specialty: params.get("especialidade") ?? "" }

  const [q, setQ] = useState(f.q)
  const clear = () => {
    setQ("")
    router.replace(pathname, { scroll: false })
  }

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const all = useMemo(() => directoryList(data?.profile ?? null), [data?.profile])
  const results = filterProfiles(all, f)
  const states = [...new Set(all.map((p) => p.state))].sort()
  const anyFilter = f.q || f.state || f.modality || f.specialty

  return (
    <div className="fade-in">
      <section className="mb-8 max-w-2xl">
        <p className="t-eyebrow">Diretório EVOFIT</p>
        <h1 className="t-display mt-2">Encontre um personal trainer</h1>
        <p className="mt-3 text-lg text-muted">Busque por cidade ou região e filtre por modalidade e especialidade. Só aparecem profissionais que optaram por estar no diretório.</p>
      </section>

      <div className="card mb-6 space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <label htmlFor="dir-q" className="sr-only">
              Buscar por nome, cidade, região ou especialidade
            </label>
            <input id="dir-q" type="search" className="input pl-10" placeholder="Cidade, bairro, nome ou especialidade" value={q} onChange={(e) => (setQ(e.target.value), setParam("q", e.target.value))} />
          </div>
          <label htmlFor="dir-uf" className="sr-only">
            Estado
          </label>
          <select id="dir-uf" className="input sm:w-44" value={f.state} onChange={(e) => setParam("uf", e.target.value)}>
            <option value="">Todos os estados</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div role="group" aria-label="Modalidade" className="flex flex-wrap gap-2">
          <span className="mr-1 self-center text-sm font-semibold">Modalidade</span>
          {(Object.keys(MODALITY_LABEL) as Modality[]).map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={f.modality === m} onClick={() => setParam("modalidade", f.modality === m ? "" : m)}>
              {MODALITY_LABEL[m]}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Especialidade" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="mr-1 shrink-0 self-center text-sm font-semibold">Especialidade</span>
          {SPECIALTIES.map((s) => (
            <button key={s} type="button" className="chip shrink-0" aria-pressed={f.specialty === s} onClick={() => setParam("especialidade", f.specialty === s ? "" : s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {results.length} {results.length === 1 ? "profissional encontrado" : "profissionais encontrados"}
        </p>
        {anyFilter && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            Limpar filtros
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum profissional com esses filtros"
          action={
            <button type="button" className="btn btn-outline btn-sm" onClick={clear}>
              Limpar filtros
            </button>
          }
        >
          Tente outra região ou remova alguma especialidade.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <li key={p.slug}>
              <Link href={`/personais/${p.slug}`} className="card flex h-full flex-col p-5 transition-colors hover:border-line-strong">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} accent={p.accent} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{p.name}</p>
                    <p className="flex items-center gap-1 text-sm text-muted">
                      <MapPin size={14} aria-hidden /> {p.region ? `${p.region} · ` : ""}
                      {p.city}/{p.state}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[0.9375rem] leading-snug">{p.headline}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  <span className="badge badge-accent">{MODALITY_LABEL[p.modality]}</span>
                  {p.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="badge">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">{data && p.slug === data.profile.slug ? "Seu perfil (demonstração)" : "Perfil fictício de demonstração"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
