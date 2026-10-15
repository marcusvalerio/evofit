"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, Ban, Copy, Database, EyeOff, KeyRound, MoreHorizontal, RotateCcw, Search, ShieldCheck } from "lucide-react"
import { postJson } from "@/lib/account-client"
import { fmtDate, relativeDays } from "@/lib/date"
import { useDemoState } from "@/lib/store"
import { BarChart } from "@/components/charts"
import { useToast } from "@/components/providers"
import { ConfirmDialog, EmptyState, Field, LoadingScreen, Modal, NotFoundState, PageHeader, Stat, cx } from "@/components/ui"
import type { AuditEntry, Health, Overview, TrainerRow } from "@/lib/server/admin"

type Payload = {
  overview: Overview
  trainers: TrainerRow[]
  health: Health
  audit: AuditEntry[]
  me: string
}
type Filter = "todos" | "ativos" | "parados" | "suspensos"
type Pending = {
  kind: "reset" | "hide" | "reactivate" | "suspend"
  t: TrainerRow
} | null

const ACTION_LABEL: Record<string, string> = {
  senha_provisoria: "Senha provisória gerada",
  suspender: "Conta suspensa",
  reativar: "Conta reativada",
  tirar_do_diretorio: "Retirado do diretório",
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
/** Sem acesso nem treino de aluno há 14 dias (ou nunca). */
const isIdle = (t: TrainerRow, now = Date.now()) => !t.lastActivityAt || now - Date.parse(t.lastActivityAt) > 14 * 86_400_000

/**
 * Painel de administração: crescimento, uso e saúde da plataforma, com ações sobre contas de personal.
 * Só existe para e-mails em ADMIN_EMAILS; a API responde 404 para qualquer outra conta.
 */
export default function AdminPage() {
  const { mode, account } = useDemoState()
  const [data, setData] = useState<Payload | null>(null)
  const [status, setStatus] = useState<"loading" | "ok" | "denied" | "error">("loading")

  const load = useCallback(async () => {
    const r = await fetch("/api/admin", {
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => null)
    if (!r) return setStatus("error")
    if (r.status === 404 || r.status === 401 || r.status === 503) return setStatus("denied")
    if (!r.ok) return setStatus("error")
    setData((await r.json()) as Payload)
    setStatus("ok")
  }, [])

  useEffect(() => {
    if (mode === "loading") return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega ao abrir
    if (mode !== "account" || !account?.isAdmin) return setStatus("denied")
    void load()
  }, [mode, account, load])

  if (status === "loading") return <LoadingScreen label="Carregando administração" />
  if (status === "denied")
    return (
      <NotFoundState title="Área restrita" href="/studio" cta="Voltar ao Studio">
        Esta página é só para a equipe do EVOFIT.
      </NotFoundState>
    )
  if (status === "error" || !data)
    return (
      <EmptyState
        icon={Activity}
        title="Não foi possível carregar"
        action={
          <button type="button" className="btn btn-outline" onClick={() => void load()}>
            Tentar de novo
          </button>
        }
      >
        Verifique a conexão e tente de novo.
      </EmptyState>
    )
  return <AdminView data={data} reload={load} />
}

function AdminView({ data, reload }: { data: Payload; reload: () => Promise<void> }) {
  const { overview: o, trainers, health: h, audit } = data
  const signups = o.signups.map((w) => ({
    label: fmtDate(w.week).slice(0, 5),
    value: w.count,
    detail: `Semana de ${fmtDate(w.week)}`,
  }))

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Administração" title="Como está o EVOFIT" description="Números agregados da plataforma. Dados dos alunos nunca aparecem aqui." />

      <section aria-labelledby="ov-title">
        <h2 id="ov-title" className="sr-only">
          Visão geral
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Personais" value={String(o.trainers)} hint={`+${o.trainersNew7} em 7 dias · +${o.trainersNew30} em 30`} />
          <Stat label="Ativados" value={`${pct(o.activated, o.trainers)}%`} tone="accent" hint={`${o.activated} com aluno e ficha montada`} />
          <Stat label="Alunos ativos" value={String(o.students)} hint={`${o.studentLogins} com login · ${o.studentsActive7} entraram em 7 dias`} />
          <Stat label="Treinos concluídos" value={String(o.sessions7)} unit="7 dias" hint={`${o.sessions30} em 30 dias`} />
          <Stat label="Personais ativos" value={String(o.trainersActive7)} unit="7 dias" hint="Entraram no Studio na semana" />
          <Stat label="Fichas montadas" value={String(o.workouts)} />
          <Stat label="No diretório" value={String(o.listed)} hint="Perfis públicos em Encontrar personal" />
          <Stat label="Suspensos" value={String(o.suspended)} tone={o.suspended ? "warning" : undefined} />
        </div>
      </section>

      <section aria-labelledby="signup-title" className="card p-5">
        <h2 id="signup-title" className="t-h2">
          Cadastros de personal por semana
        </h2>
        <p className="mb-4 text-sm text-muted">Últimas 8 semanas; a barra em destaque é a semana atual.</p>
        <BarChart data={signups} title="Cadastros de personal por semana" unit="cadastros" />
      </section>

      <TrainersSection trainers={trainers} me={data.me} reload={reload} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="health-title" className="card p-5">
          <h2 id="health-title" className="t-h2 flex items-center gap-2">
            <Database size={18} aria-hidden /> Saúde
          </h2>
          <dl className="evo-admin-health mt-4">
            <div>
              <dt>Banco de dados</dt>
              <dd>
                <span className={cx("badge", h.dbLatencyMs < 300 ? "badge-success" : "badge-warning")}>{h.dbLatencyMs} ms</span>
              </dd>
            </div>
            <div>
              <dt>Migrações aplicadas</dt>
              <dd className="tabular">{h.pending === null && !h.applied.length ? "—" : h.applied.length}</dd>
            </div>
            <div>
              <dt>Migrações pendentes</dt>
              <dd>
                {h.pending === null ? (
                  <span className="text-muted">não verificável aqui</span>
                ) : h.pending.length ? (
                  <span className="badge badge-warning">{h.pending.join(", ")}</span>
                ) : (
                  <span className="badge badge-success">nenhuma</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Sessões abertas</dt>
              <dd className="tabular">{h.liveSessions}</dd>
            </div>
            <div>
              <dt>Admins configurados</dt>
              <dd className="tabular">{h.adminsConfigured}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="audit-title" className="card p-5">
          <h2 id="audit-title" className="t-h2 flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden /> Registro de ações
          </h2>
          {audit.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nenhuma ação de administração ainda. Toda ação feita aqui fica registrada com quem fez e quando.</p>
          ) : (
            <ol className="evo-admin-audit mt-4">
              {audit.map((e, i) => (
                <li key={i}>
                  <p className="text-sm">
                    <b>{ACTION_LABEL[e.action] ?? e.action}</b> · {e.target}
                  </p>
                  {e.detail && <p className="text-sm text-muted">“{e.detail}”</p>}
                  <p className="text-xs text-muted">
                    {e.admin} · {relativeDays(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function TrainersSection({ trainers, me, reload }: { trainers: TrainerRow[]; me: string; reload: () => Promise<void> }) {
  const toast = useToast()
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<Filter>("todos")
  const [pending, setPending] = useState<Pending>(null)
  const [issued, setIssued] = useState<{
    name: string
    login: string
    password: string
  } | null>(null)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const counts = useMemo(
    () => ({
      todos: trainers.length,
      ativos: trainers.filter((t) => !t.suspended && !isIdle(t)).length,
      parados: trainers.filter((t) => !t.suspended && isIdle(t)).length,
      suspensos: trainers.filter((t) => t.suspended).length,
    }),
    [trainers],
  )
  const term = q.trim().toLowerCase()
  const list = trainers.filter(
    (t) =>
      (filter === "todos" || (filter === "suspensos" ? t.suspended : !t.suspended && (filter === "parados") === isIdle(t))) &&
      (!term || t.name.toLowerCase().includes(term) || (t.email ?? "").toLowerCase().includes(term)),
  )

  const run = async (kind: NonNullable<Pending>["kind"], t: TrainerRow) => {
    if (kind === "suspend" && reason.trim().length < 3) return setReasonError("Explique o motivo (fica no registro).")
    setBusy(true)
    const r = await postJson<{ login?: string; password?: string }>(`/api/admin/trainers/${encodeURIComponent(t.id)}`, { action: kind, reason }).catch(() => null)
    setBusy(false)
    if (!r?.ok) {
      if (r?.data.fields?.reason) return setReasonError(r.data.fields.reason)
      toast(r?.data.error ?? "Sem conexão. Tente de novo.", "info")
      return setPending(null)
    }
    setPending(null)
    setReason("")
    setReasonError(undefined)
    if (kind === "reset")
      setIssued({
        name: t.name,
        login: r.data.login ?? "",
        password: r.data.password ?? "",
      })
    else toast(kind === "suspend" ? `${t.name} suspenso.` : kind === "reactivate" ? `${t.name} reativado.` : `${t.name} saiu do diretório.`)
    await reload()
  }

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${what} copiado.`)
    } catch {
      toast("Selecione e copie manualmente.", "info")
    }
  }

  return (
    <section aria-labelledby="tr-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="tr-title" className="t-h2">
            Personais
          </h2>
          <p className="text-sm text-muted">“Parado” = sem acesso nem treino de aluno há 14 dias.</p>
        </div>
        <label className="relative block sm:w-72">
          <span className="sr-only">Buscar personal</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" type="search" placeholder="Nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar personais">
        {(Object.keys(counts) as Filter[]).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)} <span className="tabular opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="card p-5 text-sm text-muted">{trainers.length ? "Nenhum personal com esse filtro." : "Nenhum personal cadastrado ainda."}</p>
      ) : (
        <ul className="evo-admin-list card">
          {list.map((t) => (
            <li key={t.id} className="evo-admin-row">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <span className="truncate">{t.name}</span>
                  {t.id === me && <span className="badge">você</span>}
                  {t.suspended && <span className="badge badge-danger">Suspenso</span>}
                  {!t.suspended && isIdle(t) && <span className="badge badge-warning">Parado</span>}
                  {t.mustChangePassword && <span className="badge">Senha provisória</span>}
                  {t.directoryVisible && <span className="badge badge-accent">No diretório</span>}
                </p>
                <p className="truncate text-sm text-muted">{t.email ?? "sem e-mail"}</p>
              </div>
              <dl className="evo-admin-metrics">
                <div>
                  <dt>Cadastro</dt>
                  <dd>{fmtDate(t.createdAt)}</dd>
                </div>
                <div>
                  <dt>Último acesso</dt>
                  <dd>{t.lastLoginAt ? relativeDays(t.lastLoginAt) : "nunca"}</dd>
                </div>
                <div>
                  <dt>Alunos</dt>
                  <dd className="tabular">
                    {t.students}
                    <small> · {t.studentLogins} login</small>
                  </dd>
                </div>
                <div>
                  <dt>Fichas</dt>
                  <dd className="tabular">{t.workouts}</dd>
                </div>
                <div>
                  <dt>Treinos 7d</dt>
                  <dd className="tabular">{t.sessions7}</dd>
                </div>
              </dl>
              <details className="evo-admin-menu">
                <summary className="btn btn-ghost btn-icon btn-sm" aria-label={`Ações para ${t.name}`}>
                  <MoreHorizontal size={18} aria-hidden />
                </summary>
                <div role="menu" className="evo-admin-menu-panel">
                  <button type="button" role="menuitem" onClick={(e) => (closeMenu(e), setPending({ kind: "reset", t }))}>
                    <KeyRound size={16} aria-hidden /> Gerar senha provisória
                  </button>
                  {t.directoryVisible && (
                    <button type="button" role="menuitem" onClick={(e) => (closeMenu(e), setPending({ kind: "hide", t }))}>
                      <EyeOff size={16} aria-hidden /> Tirar do diretório
                    </button>
                  )}
                  {t.suspended ? (
                    <button type="button" role="menuitem" onClick={(e) => (closeMenu(e), setPending({ kind: "reactivate", t }))}>
                      <RotateCcw size={16} aria-hidden /> Reativar conta
                    </button>
                  ) : (
                    t.id !== me && (
                      <button type="button" role="menuitem" className="text-danger" onClick={(e) => (closeMenu(e), setPending({ kind: "suspend", t }))}>
                        <Ban size={16} aria-hidden /> Suspender conta
                      </button>
                    )
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending?.kind === "reset"}
        onClose={() => setPending(null)}
        title="Gerar senha provisória?"
        message={`A senha atual de ${pending?.t.name} deixa de funcionar e ele(a) sai de todos os aparelhos. No próximo acesso, cria uma senha nova. Use quando o próprio personal pedir, pelo e-mail da conta.`}
        confirmLabel="Gerar senha"
        onConfirm={() => pending && run("reset", pending.t)}
      />
      <ConfirmDialog
        open={pending?.kind === "hide"}
        onClose={() => setPending(null)}
        title="Tirar do diretório?"
        message={`O perfil de ${pending?.t.name} deixa de aparecer em Encontrar personal. A conta continua funcionando e o personal pode voltar a aparecer pelo próprio perfil.`}
        confirmLabel="Tirar do diretório"
        onConfirm={() => pending && run("hide", pending.t)}
      />
      <ConfirmDialog
        open={pending?.kind === "reactivate"}
        onClose={() => setPending(null)}
        title="Reativar conta?"
        message={`${pending?.t.name} e os alunos dele(a) voltam a conseguir entrar. O perfil não volta sozinho ao diretório.`}
        confirmLabel="Reativar"
        onConfirm={() => pending && run("reactivate", pending.t)}
      />
      <Modal
        open={pending?.kind === "suspend"}
        onClose={() => setPending(null)}
        title={`Suspender ${pending?.t.name ?? ""}?`}
        description="O personal e todos os alunos dele saem na hora e não conseguem entrar. Nada é apagado; dá para reativar depois."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => pending && run("suspend", pending.t)}>
              {busy ? <span className="spinner" aria-hidden /> : <Ban size={16} aria-hidden />} Suspender
            </button>
          </>
        }
      >
        <Field label="Motivo" error={reasonError} hint="Fica no registro de ações.">
          {(p) => <textarea {...p} className="input min-h-24" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </Modal>
      <Modal open={!!issued} onClose={() => setIssued(null)} title={`Senha provisória de ${issued?.name ?? ""}`} description="Envie pelo e-mail da conta. A senha não aparece de novo.">
        {issued && (
          <dl className="grid gap-2">
            {[
              ["E-mail", issued.login],
              ["Senha provisória", issued.password],
            ].map(([k, v]) => (
              <div key={k} className="evo-access-cred">
                <dt>{k}</dt>
                <dd className="font-mono tabular">{v}</dd>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Copiar ${k.toLowerCase()}`} onClick={() => copy(v, k)}>
                  <Copy size={15} />
                </button>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </section>
  )
}

function closeMenu(e: React.MouseEvent) {
  ;(e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open")
}
