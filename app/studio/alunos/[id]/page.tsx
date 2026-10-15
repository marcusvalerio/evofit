"use client"
import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Archive, ArchiveRestore, ArrowLeft, CalendarCheck, MessageCircle, Pencil, Ruler, Send, Smartphone } from "lucide-react"
import { comebackMessage, whatsappLink } from "@/lib/whatsapp"
import { update, useData, useIsDemo } from "@/lib/store"
import { LEVEL_LABEL } from "@/lib/types"
import { setStudentStatus, toggleAssignment } from "@/lib/actions"
import { daysSinceLast, loadProgression, sessionsOf, trackedExercises, weekCount, weeklySeries } from "@/lib/metrics"
import { fmtDate, fmtDayMonth } from "@/lib/date"
import { BarChart, LineChart } from "@/components/charts"
import { SessionList } from "@/components/session-list"
import { StudentFormModal } from "@/components/student-form"
import { Avatar, ConfirmDialog, EmptyState, Field, NotFoundState, Stat } from "@/components/ui"
import { useToast } from "@/components/providers"
import { InviteDialog } from "@/components/invite"

export default function AlunoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const d = useData()
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const demo = useIsDemo()
  const student = d.students.find((s) => s.id === id)
  const tracked = student ? trackedExercises(d, student.id) : []
  const [exerciseId, setExerciseId] = useState<string>("")

  if (!student) {
    return (
      <NotFoundState title="Aluno não encontrado" href="/studio/alunos" cta="Voltar para alunos">
        {demo ? "Este aluno não existe ou a demonstração foi restaurada." : "Este aluno não existe ou o link está incorreto."}
      </NotFoundState>
    )
  }

  const history = sessionsOf(d, student.id)
  const series = weeklySeries(history, 8)
  const since = daysSinceLast(d, student.id)
  const wk = weekCount(d, student.id)
  const chosen = exerciseId && tracked.some((t) => t.id === exerciseId) ? exerciseId : tracked[0]?.id
  const progression = chosen ? loadProgression(d, student.id, chosen) : []
  const archived = student.status === "arquivado"

  const openAsStudent = () => {
    update((x) => ({ ...x, activeStudentId: student.id }))
    router.push("/aluno")
  }

  return (
    <div className="fade-in">
      <Link href="/studio/alunos" className="btn btn-ghost btn-sm -ml-3 mb-4">
        <ArrowLeft size={16} aria-hidden /> Alunos
      </Link>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="t-h1">{student.name}</h1>
              {archived && <span className="badge badge-warning">Arquivado</span>}
            </div>
            <p className="text-muted">
              {student.goal || "Sem objetivo definido"} · {LEVEL_LABEL[student.level]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!archived && demo && (
            <button type="button" className="btn btn-outline" onClick={openAsStudent}>
              <Smartphone size={18} aria-hidden /> Ver como aluno
            </button>
          )}
          {!archived && !demo && (
            <button type="button" className="btn btn-primary" onClick={() => setInviting(true)}>
              <Send size={18} aria-hidden /> Convidar para o app
            </button>
          )}
          {!archived && (
            <a
              href={whatsappLink(student.phone, comebackMessage(student.name, d.profile.name, since))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              title={student.phone ? "Mensagem pronta no WhatsApp" : "Sem telefone cadastrado: escolha o contato no WhatsApp"}
            >
              <MessageCircle size={18} aria-hidden /> WhatsApp
            </a>
          )}
          <Link href={`/studio/avaliacoes/${student.id}`} className="btn btn-outline">
            <Ruler size={18} aria-hidden /> Avaliações
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
            <Pencil size={18} aria-hidden /> Editar
          </button>
          {archived ? (
            <button
              type="button"
              className="btn btn-inverse"
              onClick={() => {
                update((x) => setStudentStatus(x, student.id, "ativo"))
                toast(`${student.name} foi reativado(a).`)
              }}
            >
              <ArchiveRestore size={18} aria-hidden /> Reativar
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setArchiving(true)}>
              <Archive size={18} aria-hidden /> Arquivar
            </button>
          )}
        </div>
      </div>

      {student.notes && <p className="mb-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm">{student.notes}</p>}

      <section aria-label="Indicadores do aluno" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Esta semana" value={`${wk}`} unit={`/ ${student.weeklyTarget}`} hint="sessões vs. meta" tone={wk >= student.weeklyTarget ? "accent" : undefined} />
        <Stat label="Total concluído" value={String(history.length)} hint="sessões registradas" />
        <Stat label="Último treino" value={since === null ? "—" : since === 0 ? "Hoje" : String(since)} unit={since && since > 0 ? "dias" : undefined} hint={since === null ? "nenhuma sessão" : since > 0 ? "atrás" : undefined} tone={since !== null && since >= 7 ? "warning" : undefined} />
        <Stat
          label="Média semanal"
          value={(series.reduce((a, w) => a + w.count, 0) / series.length).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          hint="últimas 8 semanas"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="fichas-title">
          <h2 id="fichas-title" className="t-h2">
            Fichas atribuídas
          </h2>
          <p className="mt-1 text-sm text-muted">Marque as fichas que este aluno verá no app.</p>
          {d.workouts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Nenhuma ficha criada. <Link href="/studio/treinos" className="font-semibold text-accent underline">Criar ficha</Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {d.workouts.map((w) => {
                const on = w.studentIds.includes(student.id)
                return (
                  <li key={w.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                    <input
                      id={`as-${w.id}`}
                      type="checkbox"
                      className="size-5 shrink-0 accent-[var(--primary)]"
                      checked={on}
                      disabled={archived}
                      onChange={() => {
                        update((x) => toggleAssignment(x, w.id, student.id))
                        toast(on ? `“${w.name}” removida de ${student.name}.` : `“${w.name}” atribuída a ${student.name}.`)
                      }}
                    />
                    <label htmlFor={`as-${w.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate font-medium">{w.name}</span>
                      <span className="text-sm text-muted">{w.items.length} exercícios</span>
                    </label>
                    <Link href={`/studio/treinos/${w.id}`} className="btn btn-ghost btn-sm">
                      Abrir
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card p-5" aria-labelledby="freq-title">
          <h2 id="freq-title" className="t-h2 mb-5">
            Frequência semanal
          </h2>
          <BarChart
            title={`Sessões por semana de ${student.name}`}
            unit="sessões"
            data={series.map((w, i) => ({ label: i === series.length - 1 ? "Atual" : fmtDayMonth(w.start.toISOString()), value: w.count, detail: `Semana de ${fmtDate(w.start.toISOString())}` }))}
          />
        </section>
      </div>

      <section className="card mt-6 p-5" aria-labelledby="carga-title">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="carga-title" className="t-h2">
            Evolução de carga
          </h2>
          {tracked.length > 0 && (
            <Field label="Exercício" className="sm:w-72">
              {(p) => (
                <select {...p} className="input" value={chosen} onChange={(e) => setExerciseId(e.target.value)}>
                  {tracked.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
        </div>
        {tracked.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há cargas registradas para este aluno.</p>
        ) : (
          <LineChart title="Maior carga por sessão" unit="kg" points={progression} />
        )}
      </section>

      <section className="card mt-6 p-5" aria-labelledby="hist-title">
        <h2 id="hist-title" className="t-h2 mb-2">
          Histórico de execução
        </h2>
        {history.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nenhuma sessão concluída">
            {demo ? "Use “Ver como aluno” para registrar um treino de demonstração." : "Quando o aluno concluir um treino pelo app, ele aparece aqui."}
          </EmptyState>
        ) : (
          <SessionList sessions={history} />
        )}
      </section>

      <StudentFormModal open={editing} onClose={() => setEditing(false)} student={student} />
      {inviting && <InviteDialog studentId={student.id} studentName={student.name} onClose={() => setInviting(false)} />}
      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        title={`Arquivar ${student.name}?`}
        message="O aluno sai da lista de ativos e deixa de contar nos indicadores. O histórico é preservado e você pode reativá-lo depois."
        confirmLabel="Arquivar aluno"
        danger
        onConfirm={() => {
          update((x) => setStudentStatus(x, student.id, "arquivado"))
          toast(`${student.name} foi arquivado(a).`)
        }}
      />
    </div>
  )
}
