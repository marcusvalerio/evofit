import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react"
import { catalogExercise } from "@/lib/catalog"
import { LEVEL_LABEL } from "@/lib/types"
import { AnimatedExercise, GifActions, MuscleChips, StepList } from "@/components/exercise"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ex = catalogExercise(decodeURIComponent((await params).id))
  if (!ex) return { title: "Exercício não encontrado" }
  return {
    title: `${ex.name} — Biblioteca EVOFIT`,
    description: `Como fazer ${ex.name.toLowerCase()}: GIF animado, músculos trabalhados (${ex.primary.join(", ")}) e passo a passo em português.`,
  }
}

export default async function ExercicioPublico({ params }: Props) {
  const ex = catalogExercise(decodeURIComponent((await params).id))
  if (!ex) notFound()
  return (
    <div className="fade-in">
      <Link href="/biblioteca" className="btn btn-ghost btn-sm -ml-3 mb-3">
        <ArrowLeft size={16} aria-hidden /> Biblioteca
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <AnimatedExercise ex={ex} />
          <GifActions ex={ex} />
        </div>
        <div className="space-y-6">
          <div>
            <p className="t-eyebrow">
              {ex.group} · {ex.category}
            </p>
            <h1 className="t-h1 mt-1">{ex.name}</h1>
            <p className="mt-1 text-sm text-muted">{ex.nameEn}</p>
          </div>
          <MuscleChips ex={ex} />
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Equipamento</dt>
              <dd className="font-semibold">{ex.equipment}</dd>
            </div>
            {ex.level && (
              <div>
                <dt className="text-xs text-muted">Nível</dt>
                <dd className="font-semibold">{LEVEL_LABEL[ex.level]}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted">Tipo</dt>
              <dd className="font-semibold">{ex.category}</dd>
            </div>
          </dl>
          <StepList ex={ex} />
          <p className="flex gap-2 rounded-xl bg-warning-soft p-3 text-xs leading-relaxed text-warning">
            <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0" />
            Demonstração de referência. Sentiu dor (não confundir com esforço) ou insegurança? Pare e procure um profissional de educação física.
          </p>
          <Link href="/studio/exercicios" className="card lift group flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">É personal? Use no EVOFIT Studio</span>
              <span className="block text-sm text-muted">Monte fichas com este exercício e adicione seu próprio vídeo e dica.</span>
            </span>
            <ArrowRight size={18} aria-hidden className="shrink-0 text-accent transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
