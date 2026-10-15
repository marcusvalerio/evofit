"use client"
import Link from "next/link"
import { MessageCircle, Radar } from "lucide-react"
import type { DemoData } from "@/lib/types"
import { churnRadar, revenueAtRisk } from "@/lib/radar"
import { brl } from "@/lib/finance"
import { comebackMessage, whatsappLink } from "@/lib/whatsapp"
import { Avatar, cx } from "./ui"

/** Radar de evasão: quem pode cancelar, por quê, e quanto isso representa na receita do mês. */
export function ChurnRadar({ d, now = new Date() }: { d: DemoData; now?: Date }) {
  const rows = churnRadar(d, now)
  const atRisk = rows.filter((r) => r.level !== "baixo")
  const money = revenueAtRisk(rows)
  const monthly = d.students.filter((s) => s.status === "ativo").reduce((a, s) => a + (s.monthlyFee ?? 0), 0)
  const missingFee = atRisk.some((r) => r.student.monthlyFee === null)

  return (
    <section className="evo-radar card" aria-labelledby="radar-title">
      <div className="evo-radar-head">
        <div>
          <p className="t-eyebrow flex items-center gap-1.5">
            <Radar size={14} aria-hidden /> Radar de evasão
          </p>
          <h2 id="radar-title" className="evo-radar-money tabular">
            {atRisk.length === 0 ? "Nenhum aluno em risco" : money > 0 ? brl(money) : `${atRisk.length} em risco`}
          </h2>
          <p className="text-sm text-muted">
            {atRisk.length === 0
              ? "Ninguém com sinais de abandono nos registros. Continue assim."
              : money > 0
                ? `em mensalidades de ${atRisk.length} ${atRisk.length === 1 ? "aluno" : "alunos"} com sinais de abandono${monthly ? ` · ${Math.round((money / monthly) * 100)}% da sua receita mensal` : ""}`
                : "Defina as mensalidades para ver quanto está em jogo."}
          </p>
        </div>
      </div>
      {atRisk.length > 0 && (
        <ul className="evo-radar-list">
          {atRisk.slice(0, 5).map((r) => (
            <li key={r.student.id} className="evo-radar-row">
              <Link href={`/studio/alunos/${r.student.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                <Avatar name={r.student.name} size="sm" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.student.name}</span>
                    <span className={cx("badge", r.level === "alto" ? "badge-danger" : "badge-warning")}>risco {r.level === "alto" ? "alto" : "médio"}</span>
                    {r.student.monthlyFee !== null && <span className="text-sm text-muted tabular">{brl(r.student.monthlyFee)}/mês</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted first-letter:uppercase">{r.reasons.slice(0, 3).join(" · ")}</span>
                </span>
              </Link>
              <a
                href={whatsappLink(r.student.phone, comebackMessage(r.student.name, d.profile.name, r.daysSince))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm shrink-0"
                aria-label={`Chamar ${r.student.name} no WhatsApp`}
              >
                <MessageCircle size={15} aria-hidden /> <span className="hidden sm:inline">Chamar</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {missingFee && <p className="px-5 pb-4 text-xs text-muted">Alguns alunos em risco estão sem mensalidade definida e não entram no valor.</p>}
      <p className="evo-radar-foot">Sinais dos próprios registros: dias sem treinar vs. meta, queda de frequência, dor no check-in, mensalidade vencida e falta de ficha.</p>
    </section>
  )
}
