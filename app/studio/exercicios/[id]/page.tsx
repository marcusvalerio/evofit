"use client"
import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ClipboardList, Pencil, Trash2, Video } from "lucide-react"
import { update, useData } from "@/lib/store"
import { getExercise } from "@/lib/catalog"
import { deleteExercise, exerciseUsage, setExerciseMedia, validateMedia } from "@/lib/actions"
import { VIDEO_PROVIDERS, parseVideoUrl } from "@/lib/video"
import { ConfirmDialog, Field, NotFoundState } from "@/components/ui"
import { useToast } from "@/components/providers"
import { ExerciseGuide } from "@/components/exercise"
import { ExerciseForm } from "@/components/exercise-form"

export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>()
  const id = decodeURIComponent(params.id)
  const d = useData()
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const ex = getExercise(d, id)
  if (!ex) {
    return (
      <NotFoundState title="Exercício não encontrado" href="/studio/exercicios" cta="Voltar para a biblioteca">
        Este exercício foi excluído ou o link está incorreto.
      </NotFoundState>
    )
  }
  const usage = exerciseUsage(d, id)
  const own = d.exercises.find((e) => e.id === id)

  return (
    <div className="fade-in">
      <Link href="/studio/exercicios" className="btn btn-ghost btn-sm -ml-3 mb-2">
        <ArrowLeft size={16} aria-hidden /> Biblioteca
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="t-eyebrow mb-1">
            {ex.group} · {ex.custom ? "Exercício próprio" : ex.category}
          </p>
          <h1 className="t-h1">{ex.name}</h1>
          {ex.nameEn && <p className="mt-1 text-sm text-muted">{ex.nameEn}</p>}
        </div>
        {own && (
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={15} aria-hidden /> Editar
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemoving(true)}>
              <Trash2 size={15} aria-hidden /> Excluir
            </button>
          </div>
        )}
      </div>

      <div className="card p-4 sm:p-6">
        <p className="t-eyebrow mb-4">Como o aluno vê</p>
        <ExerciseGuide d={d} id={id} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <MediaEditor key={JSON.stringify(d.exerciseMedia[id] ?? null)} id={id} />

        <section className="card p-4 sm:p-5" aria-labelledby="uso">
          <h2 id="uso" className="t-h2 flex items-center gap-2">
            <ClipboardList size={18} aria-hidden /> Nas fichas
          </h2>
          {usage.length ? (
            <ul className="mt-3 space-y-1">
              {usage.map((w) => (
                <li key={w.id}>
                  <Link href={`/studio/treinos/${w.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-line/40">
                    <span className="truncate font-medium">{w.name}</span>
                    <span className="badge shrink-0">
                      {w.studentIds.length} aluno{w.studentIds.length === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Ainda não está em nenhuma ficha. Adicione pelo editor de fichas em Treinos.</p>
          )}
        </section>
      </div>

      {editing && own && <ExerciseForm exercise={own} onClose={() => setEditing(false)} />}
      {own && (
        <ConfirmDialog
          open={removing}
          onClose={() => setRemoving(false)}
          title={`Excluir “${own.name}”?`}
          message={
            usage.length
              ? `Este exercício está em uso em: ${usage.map((w) => w.name).join(", ")}. Remova-o dessas fichas antes de excluir.`
              : "O exercício, o vídeo e a dica vinculados serão removidos. O histórico de sessões já registradas não é alterado."
          }
          confirmLabel={usage.length ? "Entendi" : "Excluir exercício"}
          danger={!usage.length}
          onConfirm={() => {
            if (usage.length) return
            update((x) => deleteExercise(x, own.id))
            toast("Exercício excluído.")
            router.push("/studio/exercicios")
          }}
        />
      )}
    </div>
  )
}

function MediaEditor({ id }: { id: string }) {
  const d = useData()
  const toast = useToast()
  const saved = d.exerciseMedia[id] ?? { videoUrl: "", tip: "" }
  const [v, setV] = useState(saved)
  const [tried, setTried] = useState(false)
  const errors = validateMedia(v)
  const live = v.videoUrl.trim() ? parseVideoUrl(v.videoUrl) : null
  const dirty = v.videoUrl.trim() !== saved.videoUrl || v.tip.trim() !== saved.tip
  const hasSaved = !!(saved.videoUrl || saved.tip)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errors).length) return
    update((x) => setExerciseMedia(x, id, v))
    toast(v.videoUrl.trim() || v.tip.trim() ? "Material salvo. Seus alunos já veem no treino." : "Material removido.")
  }

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="material">
      <h2 id="material" className="t-h2 flex items-center gap-2">
        <Video size={18} aria-hidden /> Seu vídeo e sua dica
      </h2>
      <p className="mt-1 text-sm text-muted">Para os dias em que você não está junto: o aluno vê isto ao tocar em “Como fazer” durante o treino.</p>
      <form onSubmit={save} noValidate className="mt-4 space-y-4">
        <Field label="Link do vídeo" error={tried || (v.videoUrl.trim() && !live) ? errors.videoUrl : undefined} hint={`Aceita ${VIDEO_PROVIDERS}. O vídeo precisa estar público ou “não listado”.`}>
          {(p) => (
            <input
              {...p}
              className="input"
              type="url"
              inputMode="url"
              placeholder="https://youtu.be/…"
              value={v.videoUrl}
              maxLength={500}
              onChange={(e) => setV((x) => ({ ...x, videoUrl: e.target.value }))}
            />
          )}
        </Field>
        {live && (
          <p className="badge badge-success pop">
            Link reconhecido: {{ youtube: "YouTube", vimeo: "Vimeo", drive: "Google Drive", file: "arquivo de vídeo" }[live.kind]}
          </p>
        )}
        <Field label="Dica para o aluno" error={tried ? errors.tip : undefined} hint={`${v.tip.length}/300 — ex.: ponto de atenção, ajuste de máquina, respiração.`}>
          {(p) => <textarea {...p} className="input" rows={3} maxLength={300} value={v.tip} onChange={(e) => setV((x) => ({ ...x, tip: e.target.value }))} />}
        </Field>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={!dirty}>
            Salvar material
          </button>
          {hasSaved && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                update((x) => setExerciseMedia(x, id, { videoUrl: "", tip: "" }))
                toast("Material removido.")
              }}
            >
              Remover
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
