/**
 * Planos do EVOFIT (fonte única de preços). Valores em centavos de real.
 * Ver docs/PLANOS.md. O aluno não paga; quem assina é o personal.
 */
export type PlanId = "inicial" | "mensal" | "anual" | "fundador" | "vitalicio"

export interface Plan {
  id: PlanId
  name: string
  amount: number
  /** "month"/"year" = assinatura; null = pagamento único (vitalício). */
  interval: "month" | "year" | null
  /** Limite de alunos ativos; null = ilimitado. */
  maxStudents: number | null
  /** Meses extras grátis no primeiro ciclo (Fundador). */
  bonusMonths?: number
  /** Exige código Fundador. */
  needsCode?: boolean
  blurb: string
}

export const PLANS: Record<PlanId, Plan> = {
  inicial: { id: "inicial", name: "Inicial", amount: 4990, interval: "month", maxStudents: null, blurb: "Mensal, alunos ilimitados. Sem fidelidade." },
  /** Antigo plano mensal: mantido só para assinaturas que já existam. Não aparece para venda. */
  mensal: { id: "mensal", name: "Mensal", amount: 4990, interval: "month", maxStudents: null, blurb: "Alunos ilimitados. Sem fidelidade." },
  anual: { id: "anual", name: "Anual", amount: 47990, interval: "year", maxStudents: null, blurb: "≈ R$ 39,99/mês. Alunos ilimitados." },
  fundador: { id: "fundador", name: "Anual Fundador", amount: 39990, interval: "year", maxStudents: null, bonusMonths: 3, needsCode: true, blurb: "15 meses no primeiro ciclo (12 + 3 de bônus). Preço travado na renovação." },
  vitalicio: { id: "vitalicio", name: "Vitalício", amount: 89990, interval: null, maxStudents: null, blurb: "Pagamento único. Use para sempre." },
}

export const PLAN_IDS = Object.keys(PLANS) as PlanId[]
export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && v in PLANS
/** Antigo teste de 7 dias: mantido só para o histórico do admin. */
export const TRIAL_DAYS = 7
/** Plano grátis: todas as funções liberadas, até este número de alunos ativos. */
export const FREE_MAX_STUDENTS = 2

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export interface BillingStatus {
  plan: PlanId | null
  status: "none" | "active" | "past_due" | "canceled"
  lifetime: boolean
  /** stripe = cobrança automática; manual = liberado pelo admin (ex.: Pix). */
  source: "stripe" | "manual"
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  inTrial: boolean
  /** Tem plano pago (assinatura, vitalício ou liberação manual). Sem isso, vale o plano grátis. */
  paid: boolean
  /** Pode usar o Studio (assinatura ativa, vitalício ou dentro do teste). */
  hasAccess: boolean
  stripeReady: boolean
}
