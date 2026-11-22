"use client"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BadgeCheck, Check, ExternalLink, Info } from "@/components/icons"
import { Field, Modal, PageHeader, cx } from "@/components/ui"
import { useDemoState } from "@/lib/store"
import { postJson } from "@/lib/account-client"
import { PLANS, FREE_MAX_STUDENTS, brl, type BillingStatus, type Plan, type PlanId } from "@/lib/plans"

const dmy = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso))
const per = (p: Plan) => (p.interval === "month" ? "/mês" : p.interval === "year" ? (p.bonusMonths ? ` por ${12 + p.bonusMonths} meses` : "/ano") : " pagamento único")

export default function PlanoPage() {
  return (
    <Suspense>
      <Plano />
    </Suspense>
  )
}

function Plano() {
  const returned = useSearchParams().get("status")
  const { mode, account } = useDemoState()
  const isAccount = mode === "account" && account?.role === "trainer"
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [busy, setBusy] = useState<PlanId | "portal" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [founderOpen, setFounderOpen] = useState(false)
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch("/api/billing", { cache: "no-store", credentials: "same-origin" }).catch(() => null)
    if (r?.ok) setStatus(await r.json())
  }, [])

  useEffect(() => {
    if (!isAccount) return
    // o webhook pode levar alguns segundos depois do retorno do Stripe
    const t1 = setTimeout(load, 0)
    const t2 = returned === "ok" ? setTimeout(load, 4000) : undefined
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isAccount, load, returned])
  const notice = returned === "ok" ? "Pagamento recebido! Sua assinatura será ativada em instantes." : returned === "cancelado" ? "Pagamento cancelado. Nada foi cobrado." : null

  const checkout = async (plan: PlanId, founderCode?: string) => {
    setError(null)
    setCodeError(null)
    if (!isAccount) return setError("Crie sua conta para assinar. Na demonstração não há cobrança.")
    setBusy(plan)
    const r = await postJson<{ url?: string }>("/api/billing/checkout", { plan, code: founderCode }).catch(() => null)
    if (r?.ok && r.data.url) return window.location.assign(r.data.url)
    setBusy(null)
    const msg = r?.data.error ?? "Sem conexão. Tente de novo."
    if (plan === "fundador" && r?.data.fields?.code) setCodeError(r.data.fields.code)
    else setError(msg)
  }

  const [pixDone, setPixDone] = useState(false)
  const lifetime = async () => {
    setError(null)
    if (!isAccount) return setError("Crie sua conta para pedir o Vitalício. Na demonstração não há cobrança.")
    setBusy("vitalicio")
    // abre a aba antes da resposta para o navegador não bloquear o pop-up
    const tab = window.open("", "_blank")
    const r = await postJson<{ whatsapp?: string | null }>("/api/billing/lifetime", {}).catch(() => null)
    setBusy(null)
    if (!r?.ok) {
      tab?.close()
      return setError(r?.data.error ?? "Sem conexão. Tente de novo.")
    }
    setPixDone(true)
    if (r.data.whatsapp && tab) tab.location.href = r.data.whatsapp
    else tab?.close()
  }

  const portal = async () => {
    setBusy("portal")
    const r = await postJson<{ url?: string }>("/api/billing/portal", {}).catch(() => null)
    if (r?.ok && r.data.url) return window.location.assign(r.data.url)
    setBusy(null)
    setError(r?.data.error ?? "Sem conexão. Tente de novo.")
  }

  const current = status?.plan ? PLANS[status.plan] : null
  const subscribed = !!status && (status.lifetime || status.status === "active" || status.status === "past_due")
  const vit = PLANS.vitalicio
  const others: PlanId[] = ["inicial", "anual", "fundador"]

  return (
    <div className="fade-in">
      <PageHeader title="Plano" description="Quem assina é você. Seus alunos usam o app de graça." />

      {notice && (
        <p role="status" className="card mb-4 flex items-center gap-2 p-4 text-sm">
          <Info size={18} aria-hidden /> {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="card mb-4 border-danger p-4 text-sm text-danger">
          {error}
        </p>
      )}

      {isAccount && status && (
        <section className="card mb-6 p-5" aria-labelledby="atual">
          <h2 id="atual" className="t-h2 flex items-center gap-2">
            <BadgeCheck size={20} aria-hidden /> Sua assinatura
          </h2>
          <p className="mt-2 text-sm text-muted">
            {status.lifetime
              ? "Plano Vitalício: acesso para sempre, sem mensalidade."
              : status.source === "manual" && status.currentPeriodEnd && Date.parse(status.currentPeriodEnd) > 0
                ? `Acesso liberado pela equipe EVOFIT até ${dmy(status.currentPeriodEnd)}.`
              : current && status.status === "active"
                ? `Plano ${current.name} ativo${status.currentPeriodEnd ? ` · próxima cobrança em ${dmy(status.currentPeriodEnd)}` : ""}.`
                : current && status.status === "past_due"
                  ? `Plano ${current.name}: pagamento pendente. Atualize o cartão para não perder o acesso.`
                  : current && status.status === "canceled"
                    ? `Plano ${current.name} cancelado${status.currentPeriodEnd ? ` · acesso até ${dmy(status.currentPeriodEnd)}` : ""}.`
                    : `Plano grátis: tudo liberado para até ${FREE_MAX_STUDENTS} alunos ativos. Os planos para mais alunos chegam em breve.`}
          </p>
          {!status.stripeReady && <p className="mt-2 text-sm text-warning">Os pagamentos ainda não foram configurados neste ambiente.</p>}
          {subscribed && !status.lifetime && status.source !== "manual" && (
            <button type="button" className="btn btn-outline mt-4" onClick={portal} disabled={busy !== null}>
              <ExternalLink size={16} aria-hidden /> {busy === "portal" ? "Abrindo…" : "Gerenciar assinatura"}
            </button>
          )}
        </section>
      )}
      {!isAccount && (
        <p className="card mb-6 flex items-center gap-2 p-4 text-sm text-muted">
          <Info size={18} aria-hidden /> Você está na demonstração. Crie sua conta e teste grátis com até {FREE_MAX_STUDENTS} alunos.
        </p>
      )}

      {!status?.lifetime && (
        <section aria-label="Vitalício" className="evo-plan-hero mb-5 rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em]">★ Vitalício · oferta de lançamento</p>
          <p className="mt-2 font-display text-5xl font-extrabold tracking-tight sm:text-6xl">{brl(vit.amount)}</p>
          <p className="mt-2 max-w-xl">
            Pague <strong>uma única vez</strong> e use o EVOFIT <strong>para sempre</strong>. Sem mensalidade, alunos ilimitados.
          </p>
          <button type="button" className="btn mt-5 bg-[#061718] text-white hover:opacity-90" onClick={lifetime} disabled={busy !== null}>
            {busy === "vitalicio" ? "Abrindo…" : "Quero o Vitalício (Pix)"}
          </button>
          <p className="mt-2 text-xs opacity-80">
            {pixDone
              ? "Pedido registrado! Combine o Pix com a equipe pelo WhatsApp. Assim que o pagamento for confirmado, seu acesso vitalício é liberado."
              : "Pagamento por Pix direto com a equipe EVOFIT, pelo WhatsApp. Vagas limitadas."}
          </p>
        </section>
      )}

      {!status?.lifetime && (
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map((id) => {
            const p = PLANS[id]
            const isCurrent = subscribed && status?.plan === id
            return (
              <article key={id} className={cx("card flex flex-col p-5", id === "fundador" && "border-primary")}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{p.name}</h3>
                <p className="mt-2 text-3xl font-bold tabular">
                  {brl(p.amount)}
                  <span className="text-base font-medium text-muted">{per(p)}</span>
                </p>
                <p className="mt-1 flex-1 text-sm text-muted">{p.blurb}</p>
                {isCurrent ? (
                  <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                    <Check size={16} aria-hidden /> Seu plano atual
                  </p>
                ) : (
                  <button
                    type="button"
                    className={cx("btn mt-4", id === "fundador" ? "btn-primary" : "btn-outline")}
                    disabled={busy !== null || subscribed}
                    onClick={() => (p.needsCode ? setFounderOpen(true) : checkout(id))}
                  >
                    {busy === id ? "Abrindo pagamento…" : p.needsCode ? "Tenho um código Fundador" : `Assinar ${p.name}`}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
      {subscribed && !status?.lifetime && <p className="mt-3 text-sm text-muted">Para trocar de plano ou cancelar, use “Gerenciar assinatura”.</p>}
      <p className="mt-6 text-xs text-muted">
        Pagamento processado pelo Stripe. Plano grátis com até {FREE_MAX_STUDENTS} alunos, sem cartão. Assinaturas renovam automaticamente e podem ser canceladas a qualquer momento.
      </p>

      <Modal
        open={founderOpen}
        onClose={() => setFounderOpen(false)}
        title="Código Fundador"
        description={`Anual por ${brl(PLANS.fundador.amount)} com 3 meses de bônus. Cada código vale para uma pessoa.`}
        footer={
          <button type="button" className="btn btn-primary" disabled={busy !== null || !code.trim()} onClick={() => checkout("fundador", code)}>
            {busy === "fundador" ? "Abrindo pagamento…" : "Continuar para o pagamento"}
          </button>
        }
      >
        <Field label="Seu código" error={codeError ?? undefined}>
          {(f) => <input {...f} className="input uppercase" value={code} maxLength={40} onChange={(e) => setCode(e.target.value)} placeholder="FUNDADOR-XXXXXX" autoComplete="off" />}
        </Field>
      </Modal>
    </div>
  )
}
