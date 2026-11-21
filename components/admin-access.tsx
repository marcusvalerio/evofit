"use client"
import { useCallback, useEffect, useState } from "react"
import { Activity, BadgeCheck, Check, Clock, Lightbulb, ShieldCheck, Smartphone, UserPlus, X } from "@/components/icons"
import { postJson } from "@/lib/account-client"
import { fmtDate, fmtTime, relativeDays } from "@/lib/date"
import { PLANS, brl, type PlanId } from "@/lib/plans"
import { useToast } from "./providers"
import { ConfirmDialog, Field, Modal, Stat, cx } from "./ui"
import type { AccessInfo, AdminMember, AdminNote, BillingOverview, LifetimeRequest, LoginEvent, TrainerDetail } from "@/lib/server/admin"

export const STATE_LABEL: Record<AccessInfo["state"], string> = {
  teste: "Em teste",
  teste_vencido: "Teste vencido",
  ativo: "Assinante",
  pendente: "Pagamento pendente",
  cancelado: "Cancelado (no período)",
  vitalicio: "Vitalício",
  liberado: "Liberado pela equipe",
}
const STATE_TONE: Record<AccessInfo["state"], string> = {
  teste: "badge",
  teste_vencido: "badge badge-danger",
  ativo: "badge badge-accent",
  pendente: "badge badge-warning",
  cancelado: "badge badge-warning",
  vitalicio: "badge badge-accent",
  liberado: "badge badge-accent",
}

export function AccessBadge({ a }: { a?: AccessInfo }) {
  if (!a) return null
  return (
    <>
      <span className={STATE_TONE[a.state]}>
        {STATE_LABEL[a.state]}
        {a.plan && (a.state === "ativo" || a.state === "pendente" || a.state === "liberado") ? ` · ${PLANS[a.plan].name}` : ""}
      </span>
      {a.pendingLifetime && <span className="badge badge-warning">Pediu Vitalício</span>}
    </>
  )
}

const ddmm = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`

/** Números de cobrança e de acesso. */
export function BillingStats({ b }: { b: BillingOverview }) {
  return (
    <section aria-labelledby="bill-title">
      <h2 id="bill-title" className="t-h2 mb-3 flex items-center gap-2">
        <BadgeCheck size={18} aria-hidden /> Assinaturas e acesso
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receita mensal (MRR)" value={brl(b.mrr)} tone="accent" hint="Assinaturas do Stripe; anuais divididas por 12" />
        <Stat label="Assinantes" value={String(b.paying)} hint={Object.entries(b.byPlan).map(([k, v]) => `${PLANS[k as PlanId]?.name ?? k}: ${v}`).join(" · ") || "nenhum ainda"} />
        <Stat label="Vitalícios" value={String(b.lifetime)} hint={b.pendingLifetime ? `${b.pendingLifetime} pedido(s) aguardando Pix` : "Pagos por Pix"} tone={b.pendingLifetime ? "warning" : undefined} />
        <Stat label="Em teste grátis" value={String(b.inTrial)} hint={`${b.trialExpired} com teste vencido e sem plano`} />
        <Stat label="Liberados pela equipe" value={String(b.manual)} />
        <Stat label="Pagamento pendente" value={String(b.pastDue)} tone={b.pastDue ? "warning" : undefined} />
        <Stat label="Acessos" value={String(b.logins24h)} unit="24 h" hint={`${b.logins7d} em 7 dias`} />
        <Stat label="Quem entrou" value={String(b.activeTrainers7d)} unit="personais · 7d" hint={`${b.activeStudents7d} alunos`} />
      </div>
    </section>
  )
}

/** Pedidos de Vitalício pagos por Pix: confirmar libera o acesso na hora. */
export function LifetimeRequests({ requests, reload }: { requests: LifetimeRequest[]; reload: () => Promise<void> }) {
  const toast = useToast()
  const [confirm, setConfirm] = useState<{ r: LifetimeRequest; status: "pago" | "cancelado" } | null>(null)
  const pending = requests.filter((r) => r.status === "pendente")
  const done = requests.filter((r) => r.status !== "pendente").slice(0, 8)
  const act = async () => {
    if (!confirm) return
    const r = await postJson(`/api/admin/lifetime/${confirm.r.id}`, { status: confirm.status }).catch(() => null)
    toast(r?.ok ? (confirm.status === "pago" ? `Vitalício liberado para ${confirm.r.trainerName}.` : "Pedido cancelado.") : (r?.data.error ?? "Sem conexão."), r?.ok ? undefined : "info")
    setConfirm(null)
    await reload()
  }
  return (
    <section aria-labelledby="pix-title" className="card p-5">
      <h2 id="pix-title" className="t-h2">
        Pedidos de Vitalício (Pix)
      </h2>
      <p className="text-sm text-muted">Quem clicou em “Quero o Vitalício”. Confirme quando o Pix cair: o acesso é liberado na hora.</p>
      {pending.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nenhum pedido aguardando.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.trainerName}</p>
                <p className="text-sm text-muted">
                  {r.email} · pediu {relativeDays(r.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm({ r, status: "cancelado" })}>
                  <X size={15} aria-hidden /> Cancelar
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirm({ r, status: "pago" })}>
                  <Check size={15} aria-hidden /> Pix recebido
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">Resolvidos recentemente</summary>
          <ul className="mt-2 grid gap-1">
            {done.map((r) => (
              <li key={r.id} className="text-muted">
                {r.trainerName} · {r.status === "pago" ? "Pix confirmado" : "cancelado"} {r.handledAt ? `em ${fmtDate(r.handledAt)}` : ""} {r.handledBy ? `por ${r.handledBy}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.status === "pago" ? "Confirmar Pix e liberar Vitalício?" : "Cancelar pedido?"}
        message={
          confirm?.status === "pago"
            ? `${confirm.r.trainerName} passa a ter acesso vitalício, sem mensalidade. Confira se o Pix de ${brl(PLANS.vitalicio.amount)} caiu na sua conta.`
            : `O pedido de ${confirm?.r.trainerName ?? ""} sai da lista. Nada muda no acesso.`
        }
        confirmLabel={confirm?.status === "pago" ? "Liberar Vitalício" : "Cancelar pedido"}
        danger={confirm?.status === "cancelado"}
        onConfirm={act}
      />
    </section>
  )
}

/** Últimos logins na plataforma. */
export function RecentLogins({ logins }: { logins: LoginEvent[] }) {
  return (
    <section aria-labelledby="log-title" className="card p-5">
      <h2 id="log-title" className="t-h2 flex items-center gap-2">
        <Activity size={18} aria-hidden /> Acessos recentes
      </h2>
      <p className="text-sm text-muted">Cada login no EVOFIT. Do aluno aparece só o usuário, nunca dados de treino.</p>
      {logins.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nenhum acesso registrado ainda.</p>
      ) : (
        <ol className="mt-3 max-h-96 divide-y divide-line overflow-y-auto">
          {logins.map((l, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <strong>{l.role === "trainer" ? l.trainerName : l.who}</strong>{" "}
                <span className="text-muted">{l.role === "trainer" ? `· personal · ${l.who}` : `· aluno de ${l.trainerName}`}</span>
              </span>
              <span className="shrink-0 text-right text-muted">
                {l.device && (
                  <span className="mr-2 inline-flex items-center gap-1">
                    <Smartphone size={13} aria-hidden /> {l.device}
                  </span>
                )}
                <time dateTime={l.at}>{ddmm(l.at)}</time>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

type Action = { kind: "vitalicio" } | { kind: "dias" } | { kind: "trial" } | { kind: "revoke" } | null

/** Acesso e plano de um personal: liberar, estender teste, remover liberação e ver histórico. */
export function TrainerAccessDialog({ trainer, onClose, reload }: { trainer: { id: string; name: string }; onClose: () => void; reload: () => Promise<void> }) {
  const toast = useToast()
  const [d, setD] = useState<TrainerDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [action, setAction] = useState<Action>(null)
  const [days, setDays] = useState("30")
  const [plan, setPlan] = useState<PlanId>("mensal")
  const [note, setNote] = useState("")
  const [fieldErr, setFieldErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/trainers/${encodeURIComponent(trainer.id)}`, { credentials: "same-origin", cache: "no-store" }).catch(() => null)
    if (!r?.ok) return setErr("Não foi possível carregar.")
    setD((await r.json()) as TrainerDetail)
  }, [trainer.id])
  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  const run = async () => {
    if (!action) return
    setBusy(true)
    setFieldErr(undefined)
    const body =
      action.kind === "vitalicio"
        ? { action: "grant", kind: "vitalicio", note }
        : action.kind === "dias"
          ? { action: "grant", kind: "dias", days: Number(days), plan, note }
          : action.kind === "trial"
            ? { action: "extend_trial", days: Number(days) }
            : { action: "revoke" }
    const r = await postJson(`/api/admin/trainers/${encodeURIComponent(trainer.id)}`, body).catch(() => null)
    setBusy(false)
    if (!r?.ok) {
      if (r?.data.fields?.days) return setFieldErr(r.data.fields.days)
      toast(r?.data.error ?? "Sem conexão.", "info")
      return
    }
    toast("Feito.")
    setAction(null)
    setNote("")
    await Promise.all([load(), reload()])
  }

  const a = d?.access
  return (
    <Modal open onClose={onClose} wide title={`Acesso de ${trainer.name}`} description="Plano, liberações e histórico de acessos. Toda ação fica no registro.">
      {err && <p className="text-sm text-danger">{err}</p>}
      {!d && !err && <div className="skeleton h-40" role="status" aria-label="Carregando" />}
      {d && a && (
        <div className="space-y-5">
          <div className="rounded-xl border border-line p-4">
            <p className="flex flex-wrap items-center gap-2">
              <AccessBadge a={a} />
              <span className={cx("text-sm font-semibold", a.hasAccess ? "text-primary" : "text-danger")}>{a.hasAccess ? "Com acesso" : "Sem acesso ao Studio"}</span>
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted">Teste até</dt>
                <dd>{a.trialEndsAt ? fmtDate(a.trialEndsAt) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">{a.source === "manual" ? "Liberado até" : "Próxima cobrança"}</dt>
                <dd>{a.state === "vitalicio" ? "para sempre" : a.until ? fmtDate(a.until) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Logins do personal (30d)</dt>
                <dd className="tabular">{d.logins30}</dd>
              </div>
              <div>
                <dt className="text-muted">Logins de alunos (30d)</dt>
                <dd className="tabular">{d.studentLogins30}</dd>
              </div>
            </dl>
            {d.note && <p className="mt-2 text-sm text-muted">Observação: {d.note}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {a.state !== "vitalicio" && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAction({ kind: "vitalicio" })}>
                <BadgeCheck size={15} aria-hidden /> Liberar Vitalício (Pix)
              </button>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => (setDays("30"), setAction({ kind: "dias" }))}>
              <Clock size={15} aria-hidden /> Liberar por dias
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => (setDays("7"), setAction({ kind: "trial" }))}>
              + Dias de teste
            </button>
            {a.source === "manual" && (
              <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setAction({ kind: "revoke" })}>
                Remover liberação
              </button>
            )}
          </div>

          {action && action.kind !== "revoke" && (
            <div className="rounded-xl border border-line p-4">
              <p className="font-semibold">
                {action.kind === "vitalicio" ? "Liberar acesso vitalício" : action.kind === "dias" ? "Liberar acesso por um período" : "Dar mais dias de teste grátis"}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {action.kind !== "vitalicio" && (
                  <Field label="Dias" error={fieldErr}>
                    {(f) => <input {...f} className="input" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />}
                  </Field>
                )}
                {action.kind === "dias" && (
                  <Field label="Como plano">
                    {(f) => (
                      <select {...f} className="input" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
                        {(["inicial", "mensal", "anual"] as PlanId[]).map((p) => (
                          <option key={p} value={p}>
                            {PLANS[p].name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}
                {action.kind !== "trial" && (
                  <Field label="Observação (opcional)" className={action.kind === "vitalicio" ? "sm:col-span-3" : ""}>
                    {(f) => <input {...f} className="input" maxLength={300} value={note} placeholder="Ex.: Pix recebido em 21/11" onChange={(e) => setNote(e.target.value)} />}
                  </Field>
                )}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAction(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={run}>
                  {busy ? "Salvando…" : "Confirmar"}
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold">Últimos acessos</h3>
            {d.logins.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nenhum login registrado.</p>
            ) : (
              <ol className="mt-2 max-h-56 divide-y divide-line overflow-y-auto text-sm">
                {d.logins.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3 py-1.5">
                    <span>
                      {l.role === "trainer" ? "Personal" : `Aluno · ${l.who}`}
                      {l.device && <span className="text-muted"> · {l.device}</span>}
                    </span>
                    <time className="text-muted" dateTime={l.at}>
                      {ddmm(l.at)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {d.audit.length > 0 && (
            <div>
              <h3 className="font-semibold">Ações da equipe nesta conta</h3>
              <ul className="mt-2 grid gap-1 text-sm text-muted">
                {d.audit.map((x, i) => (
                  <li key={i}>
                    {fmtDate(x.at)} · {x.action.replaceAll("_", " ")} {x.detail && `· ${x.detail}`} · {x.admin}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={action?.kind === "revoke"}
        onClose={() => setAction(null)}
        title="Remover liberação?"
        message={`${trainer.name} perde o acesso liberado pela equipe (inclusive Vitalício manual). Assinaturas pagas pelo Stripe não mudam.`}
        confirmLabel="Remover"
        danger
        onConfirm={run}
      />
    </Modal>
  )
}

/** Equipe que acessa o admin: adicionar e remover. */
export function AdminTeam({ admins, me, reload }: { admins: AdminMember[]; me: string; reload: () => Promise<void> }) {
  const toast = useToast()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<AdminMember | null>(null)
  const send = async (target: string, admin: boolean) => {
    setBusy(true)
    setError(undefined)
    const r = await postJson("/api/admin/team", { email: target, admin }).catch(() => null)
    setBusy(false)
    if (!r?.ok) {
      if (admin && r?.data.fields?.email) return setError(r.data.fields.email)
      return toast(r?.data.error ?? "Sem conexão.", "info")
    }
    toast(admin ? `${target} agora é admin.` : `${target} saiu do admin.`)
    setEmail("")
    await reload()
  }
  return (
    <section aria-labelledby="team-title" className="card p-5">
      <h2 id="team-title" className="t-h2 flex items-center gap-2">
        <ShieldCheck size={18} aria-hidden /> Equipe do admin
      </h2>
      <p className="text-sm text-muted">Quem pode ver este painel e liberar acessos. A pessoa precisa ter conta de personal no EVOFIT.</p>
      <ul className="mt-3 divide-y divide-line">
        {admins.map((m) => (
          <li key={m.email} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <strong>{m.name || m.email}</strong> <span className="text-muted">· {m.email}</span>
              {m.email.toLowerCase() === me.toLowerCase() && <span className="badge ml-2">você</span>}
              <span className="block text-xs text-muted">{m.lastLoginAt ? `último acesso ${relativeDays(m.lastLoginAt)}` : "ainda não entrou"}</span>
            </span>
            {m.email.toLowerCase() !== me.toLowerCase() && !m.fromEnv && (
              <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setRemoving(m)}>
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send(email.trim(), true)
        }}
      >
        <Field label="Adicionar admin (e-mail)" error={error} className="min-w-56 flex-1">
          {(f) => <input {...f} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" />}
        </Field>
        <button type="submit" className="btn btn-primary" disabled={busy || !email.includes("@")}>
          <UserPlus size={16} aria-hidden /> Adicionar
        </button>
      </form>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remover do admin?"
        message={`${removing?.email ?? ""} deixa de ver o painel de administração. A conta de personal continua funcionando.`}
        confirmLabel="Remover"
        danger
        onConfirm={async () => {
          const m = removing
          setRemoving(null)
          if (m) await send(m.email, false)
        }}
      />
    </section>
  )
}

const CAT_LABEL: Record<AdminNote["category"], string> = { marketing: "Marketing", produto: "Produto", vendas: "Vendas", geral: "Geral" }

/** Bloco de ideias da equipe (marketing e o que mais for para depois). */
export function IdeasBoard({ notes, reload }: { notes: AdminNote[]; reload: () => Promise<void> }) {
  const toast = useToast()
  const [text, setText] = useState("")
  const [cat, setCat] = useState<AdminNote["category"]>("marketing")
  const [show, setShow] = useState<AdminNote["category"] | "todas">("todas")
  const op = async (body: Record<string, unknown>) => {
    const r = await postJson("/api/admin/notes", body).catch(() => null)
    if (!r?.ok) toast(r?.data.error ?? "Sem conexão.", "info")
    await reload()
  }
  const list = notes.filter((n) => show === "todas" || n.category === show)
  return (
    <section aria-labelledby="ideas-title" className="card p-5">
      <h2 id="ideas-title" className="t-h2 flex items-center gap-2">
        <Lightbulb size={18} aria-hidden /> Bloco de ideias
      </h2>
      <p className="text-sm text-muted">Para lembrar depois: marketing, produto e vendas. Marque como feito quando sair do papel.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar ideias">
        {(["todas", "marketing", "produto", "vendas", "geral"] as const).map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={show === c} onClick={() => setShow(c)}>
            {c === "todas" ? "Todas" : CAT_LABEL[c]} <span className="tabular opacity-70">{c === "todas" ? notes.length : notes.filter((n) => n.category === c).length}</span>
          </button>
        ))}
      </div>
      <ul className="mt-3 grid gap-2">
        {list.map((n) => (
          <li key={n.id} className={cx("flex items-start gap-3 rounded-xl border border-line p-3 text-sm", n.done && "opacity-60")}>
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={n.done} aria-label={n.done ? "Marcar como pendente" : "Marcar como feita"} onChange={() => void op({ op: "toggle", id: n.id })} />
            <span className={cx("min-w-0 flex-1", n.done && "line-through")}>
              <span className="badge mr-2">{CAT_LABEL[n.category]}</span>
              {n.text}
            </span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Apagar ideia" onClick={() => void op({ op: "delete", id: n.id })}>
              <X size={14} aria-hidden />
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted">Nenhuma ideia aqui ainda.</li>}
      </ul>
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          void op({ op: "add", text, category: cat }).then(() => setText(""))
        }}
      >
        <Field label="Nova ideia" className="min-w-56 flex-1">
          {(f) => <input {...f} className="input" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: sorteio para quem indicar 3 personais" />}
        </Field>
        <Field label="Tipo">
          {(f) => (
            <select {...f} className="input" value={cat} onChange={(e) => setCat(e.target.value as AdminNote["category"])}>
              {Object.entries(CAT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Guardar ideia
        </button>
      </form>
    </section>
  )
}
