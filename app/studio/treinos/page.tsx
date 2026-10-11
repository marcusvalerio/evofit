"use client"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ClipboardList, Copy, Plus, Trash2 } from "lucide-react"
import { update, useData } from "@/lib/store"
import { createWorkout, deleteWorkout, duplicateWorkout, uid } from "@/lib/actions"
import { fmtDate } from "@/lib/date"
import { Avatar, ConfirmDialog, EmptyState, Field, Modal, PageHeader } from "@/components/ui"
import { useToast } from "@/components/providers"
import type { Workout } from "@/lib/types"

export default function TreinosPage() {
  return (
    <Suspense>
      <Treinos />
    </Suspense>
  )
}

function Treinos() {
  const d = useData()
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [err, setErr] = useState("")
  const [removing, setRemoving] = useState<Workout | null>(null)

  // ?novo=1 (atalho vindo do painel) abre o formulário diretamente.
  const fromQuery = params.get("novo") === "1"
  const open = creating || fromQuery
  const close = () => {
    setCreating(false)
    if (fromQuery) router.replace("/studio/treinos")
  }

  const studentById = new Map(d.students.map((s) => [s.id, s]))

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setErr("Dê um nome à ficha (mínimo 2 caracteres).")
    const id = uid("tr")
    update((x) => createWorkout(x, name, id))
    setCreating(false)
    setName("")
    router.push(`/studio/treinos/${id}`)
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Fichas de treino"
        description="Monte as fichas com exercícios, séries, repetições, carga e descanso, e atribua aos alunos."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden /> Nova ficha
          </button>
        }
      />

      {d.workouts.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ficha criada"
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
              Criar primeira ficha
            </button>
          }
        >
          Fichas atribuídas aparecem automaticamente no app do aluno.
        </EmptyState>
      ) : (
        <ul className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {d.workouts.map((w) => {
            const assigned = w.studentIds.map((id) => studentById.get(id)).filter((s) => s && s.status === "ativo")
            return (
              <li key={w.id} className="card lift flex flex-col p-4">
                <Link href={`/studio/treinos/${w.id}`} className="block rounded-lg">
                  <p className="font-semibold">{w.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{w.description || "Sem descrição"}</p>
                </Link>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <span className="badge">{w.items.length} exercícios</span>
                  <span className="badge">{w.items.reduce((a, i) => a + i.sets, 0)} séries</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                  {assigned.length ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {assigned.slice(0, 4).map((s) => (
                          <span key={s!.id} className="rounded-full ring-2 ring-[var(--surface)]">
                            <Avatar name={s!.name} size="sm" />
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-muted">{assigned.length === 1 ? assigned[0]!.name.split(" ")[0] : `${assigned.length} alunos`}</span>
                    </div>
                  ) : (
                    <span className="badge badge-warning">Sem alunos</span>
                  )}
                  <div className="flex">
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      aria-label={`Duplicar ${w.name}`}
                      title="Duplicar"
                      onClick={() => {
                        update((x) => duplicateWorkout(x, w.id))
                        toast("Ficha duplicada. A cópia não tem alunos atribuídos.")
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Excluir ${w.name}`} title="Excluir" onClick={() => setRemoving(w)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">Atualizada em {fmtDate(w.updatedAt)}</p>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={close}
        title="Nova ficha"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={close}>
              Cancelar
            </button>
            <button type="submit" form="new-workout" className="btn btn-primary">
              Criar e editar
            </button>
          </>
        }
      >
        <form id="new-workout" onSubmit={create} noValidate>
          <Field label="Nome da ficha" error={err} hint="Ex.: Treino C — Pernas e glúteos">
            {(p) => (
              <input
                {...p}
                className="input"
                value={name}
                maxLength={80}
                autoFocus
                onChange={(e) => {
                  setName(e.target.value)
                  setErr("")
                }}
              />
            )}
          </Field>
        </form>
      </Modal>

      {removing && (
        <ConfirmDialog
          open
          onClose={() => setRemoving(null)}
          title={`Excluir “${removing.name}”?`}
          message="A ficha deixa de aparecer para os alunos. Sessões já concluídas continuam no histórico; sessões em andamento desta ficha são descartadas."
          confirmLabel="Excluir ficha"
          danger
          onConfirm={() => {
            update((x) => deleteWorkout(x, removing.id))
            toast("Ficha excluída.")
          }}
        />
      )}
    </div>
  )
}
