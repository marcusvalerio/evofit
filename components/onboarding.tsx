"use client"
import { useState } from "react"
import Link from "next/link"
import { BadgeCheck, Check, ClipboardList, Smartphone, UserRound, Users } from "@/components/icons"
import { flush, update, useData } from "@/lib/store"
import { addStudent, saveProfile, validateProfile, validateStudent } from "@/lib/actions"
import { postJson, hardNavigate } from "@/lib/account-client"
import { MODALITY_LABEL, type Modality } from "@/lib/types"
import { PLANS, TRIAL_DAYS, brl } from "@/lib/plans"
import { Field, cx } from "./ui"
import { BrandMark } from "./chrome"

const STEPS = ["Seu perfil", "Primeiro aluno", "Seu plano"] as const

/**
 * Boas-vindas do personal na primeira entrada: perfil profissional, primeiro aluno (opcional) e
 * como funcionam o teste grátis e os planos. Ao concluir, não aparece de novo.
 */
export function Onboarding() {
  const d = useData()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [p, setP] = useState(() => ({ ...d.profile }))
  const [pErr, setPErr] = useState<Record<string, string>>({})
  const [st, setSt] = useState({ name: "", goal: "", phone: "" })
  const [sErr, setSErr] = useState<Record<string, string>>({})

  const saveStep1 = () => {
    const e = validateProfile(p) as Record<string, string>
    const mine = Object.fromEntries(Object.entries(e).filter(([k]) => ["name", "city", "state"].includes(k)))
    setPErr(mine)
    if (Object.keys(mine).length) return
    update((x) => saveProfile(x, { ...x.profile, name: p.name, city: p.city, state: p.state, modality: p.modality }))
    setStep(1)
  }

  const saveStep2 = (skip: boolean) => {
    if (!skip) {
      const input = { name: st.name, goal: st.goal, level: "iniciante" as const, weeklyTarget: 3, notes: "", phone: st.phone }
      const e = validateStudent(input) as Record<string, string>
      setSErr(e)
      if (Object.keys(e).length) return
      update((x) => addStudent(x, input))
    }
    setStep(2)
  }

  const finish = async (to: string) => {
    setBusy(true)
    await flush().catch(() => {})
    await postJson("/api/account/onboarding", {}).catch(() => null)
    hardNavigate(to)
  }

  return (
    <div className="fade-in mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <BrandMark size={36} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Boas-vindas ao EVOFIT</p>
          <h1 className="t-h1">Vamos deixar tudo pronto</h1>
        </div>
      </div>

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={cx("h-1.5 rounded-full", i <= step ? "evo-ember-fill" : "bg-line")} />
            <span className={cx("text-xs font-semibold", i === step ? "text-fg" : "text-muted")}>
              {i < step ? <Check size={12} aria-hidden className="mr-1 inline" /> : null}
              {s}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="card mt-6 p-5 sm:p-6" aria-labelledby="ob1">
          <h2 id="ob1" className="t-h2 flex items-center gap-2">
            <UserRound size={20} aria-hidden /> Como seus alunos vão te ver
          </h2>
          <p className="mt-1 text-sm text-muted">Dá para completar o resto do perfil depois, em Perfil.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Seu nome profissional" error={pErr.name} className="sm:col-span-2">
              {(f) => <input {...f} className="input" value={p.name} maxLength={80} onChange={(e) => setP({ ...p, name: e.target.value })} />}
            </Field>
            <Field label="Cidade" error={pErr.city}>
              {(f) => <input {...f} className="input" value={p.city} maxLength={80} onChange={(e) => setP({ ...p, city: e.target.value })} />}
            </Field>
            <Field label="UF" error={pErr.state}>
              {(f) => <input {...f} className="input uppercase" value={p.state} maxLength={2} onChange={(e) => setP({ ...p, state: e.target.value })} />}
            </Field>
          </div>
          <fieldset className="mt-4">
            <legend className="field-label">Como você atende</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(MODALITY_LABEL) as Modality[]).map((m) => (
                <button key={m} type="button" aria-pressed={p.modality === m} className={cx("btn btn-sm btn-pill", p.modality === m ? "btn-primary" : "btn-outline")} onClick={() => setP({ ...p, modality: m })}>
                  {MODALITY_LABEL[m]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 flex justify-end">
            <button type="button" className="btn btn-primary" onClick={saveStep1}>
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="card mt-6 p-5 sm:p-6" aria-labelledby="ob2">
          <h2 id="ob2" className="t-h2 flex items-center gap-2">
            <Users size={20} aria-hidden /> Cadastre seu primeiro aluno
          </h2>
          <p className="mt-1 text-sm text-muted">Depois você monta a ficha e gera o acesso dele ao app. Se preferir, pule e faça isso mais tarde.</p>
          <div className="mt-5 grid gap-4">
            <Field label="Nome do aluno" error={sErr.name}>
              {(f) => <input {...f} className="input" value={st.name} maxLength={80} onChange={(e) => setSt({ ...st, name: e.target.value })} />}
            </Field>
            <Field label="Objetivo (opcional)" error={sErr.goal}>
              {(f) => <input {...f} className="input" value={st.goal} maxLength={120} placeholder="Ex.: hipertrofia, emagrecimento" onChange={(e) => setSt({ ...st, goal: e.target.value })} />}
            </Field>
            <Field label="WhatsApp do aluno (opcional)" error={sErr.phone}>
              {(f) => <input {...f} className="input" inputMode="tel" value={st.phone} placeholder="(11) 98765-4321" onChange={(e) => setSt({ ...st, phone: e.target.value })} />}
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => saveStep2(true)}>
              Pular por agora
            </button>
            <button type="button" className="btn btn-primary" onClick={() => saveStep2(false)}>
              Adicionar e continuar
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card mt-6 p-5 sm:p-6" aria-labelledby="ob3">
          <h2 id="ob3" className="t-h2 flex items-center gap-2">
            <BadgeCheck size={20} aria-hidden /> Seus {TRIAL_DAYS} dias grátis começaram
          </h2>
          <p className="mt-1 text-sm text-muted">Use tudo à vontade, sem cartão. Antes de acabar, escolha como quer continuar:</p>
          <ul className="mt-4 grid gap-2 text-sm">
            <li className="rounded-xl border border-line p-3">
              <strong>Inicial</strong> · {brl(PLANS.inicial.amount)}/mês, alunos ilimitados, sem fidelidade.
            </li>
            <li className="rounded-xl border border-line p-3">
              <strong>Anual</strong> · {brl(PLANS.anual.amount)}/ano. Com código Fundador: {brl(PLANS.fundador.amount)} por 15 meses.
            </li>
            <li className="evo-plan-hero rounded-xl p-3">
              <strong>Vitalício</strong> · {brl(PLANS.vitalicio.amount)} uma única vez, via Pix direto com a equipe. Vagas limitadas.
            </li>
          </ul>
          <div className="mt-5 grid gap-2 text-sm text-muted">
            <p className="flex items-center gap-2">
              <ClipboardList size={16} aria-hidden /> Próximo passo: monte uma ficha em Treinos.
            </p>
            <p className="flex items-center gap-2">
              <Smartphone size={16} aria-hidden /> Seus alunos usam o app de graça, pelo celular.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => void finish("/studio/plano")}>
              Ver planos
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void finish("/studio")}>
              {busy ? "Abrindo…" : "Começar a usar"}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

/** Teste vencido e sem plano: o personal só acessa Plano e Perfil até assinar ou ser liberado. */
export function AccessLocked() {
  return (
    <div className="fade-in mx-auto max-w-xl">
      <section className="card p-6 text-center">
        <BadgeCheck size={36} aria-hidden className="mx-auto text-primary" />
        <h1 className="t-h1 mt-3">Seu teste grátis terminou</h1>
        <p className="mt-2 text-muted">Seus dados e os dos seus alunos estão guardados. Escolha um plano para voltar a usar o Studio. Seus alunos continuam acessando o app normalmente.</p>
        <Link href="/studio/plano" className="btn btn-primary mt-5">
          Ver planos
        </Link>
      </section>
    </div>
  )
}
