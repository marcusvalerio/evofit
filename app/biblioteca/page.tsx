"use client"
import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { CATALOG, CATALOG_SIZE, libraryUrl } from "@/lib/catalog"
import { LEVEL_LABEL } from "@/lib/types"
import { EmptyState } from "@/components/ui"
import { ExerciseThumb } from "@/components/exercise"
import { ExerciseFilterBar, LIBRARY_PAGE, MoreButton, useExerciseFilters } from "@/components/library"

export default function BibliotecaPage() {
  const f = useExerciseFilters()
  const list = f.apply(CATALOG)
  return (
    <div className="fade-in">
      <section className="mb-8 max-w-3xl">
        <p className="t-eyebrow">Biblioteca EVOFIT</p>
        <h1 className="t-display mt-2">
          Veja como se faz. <span className="text-accent">Em movimento.</span>
        </h1>
        <p className="mt-4 text-lg text-muted">
          {CATALOG_SIZE} exercícios com GIF animado, músculos trabalhados e passo a passo em português. Baixe o GIF ou compartilhe o link com seus alunos.
        </p>
      </section>

      <ExerciseFilterBar f={f} count={list.length} />

      {list.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum exercício encontrado"
          action={
            <button type="button" className="btn btn-outline btn-sm" onClick={f.clear}>
              Limpar filtros
            </button>
          }
        />
      ) : (
        <>
          <ul className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {list.slice(0, f.limit).map((e, i) => (
              <li key={e.id} style={{ "--i": i % LIBRARY_PAGE } as React.CSSProperties}>
                <Link href={libraryUrl(e.id)} className="card lift group flex h-full flex-col overflow-hidden p-2">
                  <ExerciseThumb ex={e} className="w-full" />
                  <div className="px-1.5 pb-1 pt-2.5">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{e.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {e.group} · {e.equipment}
                      {e.level && ` · ${LEVEL_LABEL[e.level]}`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <MoreButton left={list.length - f.limit} onClick={f.more} />
        </>
      )}

      <p className="mt-12 text-xs text-muted">
        Imagens e descrições originais do projeto aberto{" "}
        <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener noreferrer" className="underline hover:text-fg">
          free-exercise-db
        </a>{" "}
        (domínio público), traduzidas e animadas pelo EVOFIT. As demonstrações são referência e não substituem a orientação de um profissional.
      </p>
    </div>
  )
}
