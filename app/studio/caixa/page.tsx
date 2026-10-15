"use client"
import { useState } from "react"
import Link from "next/link"
import { Check, ChevronLeft, ChevronRight, MessageCircle, Undo2, Wallet } from "lucide-react"
import { update, useData } from "@/lib/store"
import { markPaid, unmarkPaid } from "@/lib/actions"
import { brl, feeMessage, feesForMonth, feeTotals, monthKey, monthLabel, type FeeRow } from "@/lib/finance"
import { whatsappLink } from "@/lib/whatsapp"
import { Avatar, EmptyState, PageHeader, cx } from "@/components/ui"
import { useToast } from "@/components/providers"

const shift = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number)
  return monthKey(new Date(y, m - 1 + n, 1))
}
const ddmm = (d: Date | string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(d))

export default function Caixa() {
  const d = useData()
  const toast = useToast()
  const now = new Date()
  const current = monthKey(now)
  const [month, setMonth] = useState(current)
  const rows = feesForMonth(d, month, now)
  const t = feeTotals(rows)
  const withoutFee = d.students.filter((s) => s.status === "ativo" && (s.monthlyFee === null || s.dueDay === null))
  const count = (s: FeeRow["status"]) => rows.filter((r) => r.status === s).length

  return (
    <div className="fade-in">
      <PageHeader
        title="Mensalidades"
        description="Controle do que você recebeu. O EVOFIT não cobra nem movimenta dinheiro: você marca o que entrou e envia lembretes pelo WhatsApp."
        actions={
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            <button type="button" className="btn btn-ghost btn-icon btn-sm btn-pill" aria-label="Mês anterior" onClick={() => setMonth(shift(month, -1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-36 text-center text-sm font-semibold first-letter:uppercase" aria-live="polite">
              {monthLabel(month)}
            </span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm btn-pill" aria-label="Próximo mês" disabled={month >= shift(current, 1)} onClick={() => setMonth(shift(month, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />

      {rows.length > 0 && (
        <section aria-label="Resumo do mês" className="evo-cash-tiles">
          <div className="evo-cash-tile is-in">
            <span>Recebido</span>
            <strong className="tabular">{brl(t.received)}</strong>
            <small>{count("paga")} de {rows.length} alunos</small>
          </div>
          <div className="evo-cash-tile">
            <span>A receber</span>
            <strong className="tabular">{brl(t.pending)}</strong>
            <small>{count("a_vencer")} a vencer</small>
          </div>
          <div className={cx("evo-cash-tile", t.overdue > 0 && "is-late")}>
            <span>Vencido</span>
            <strong className="tabular">{brl(t.overdue)}</strong>
            <small>{count("vencida") ? `${count("vencida")} ${count("vencida") === 1 ? "aluno" : "alunos"} — cobre hoje` : "nenhum atraso"}</small>
          </div>
        </section>
      )}

      {!d.profile.pixKey.trim() && rows.some((r) => r.status !== "paga") && (
        <p className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          Cadastre sua chave Pix em{" "}
          <Link href="/studio/perfil" className="font-semibold underline">
            Perfil
          </Link>{" "}
          para ela ir junto no lembrete.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Wallet} title="Nenhuma mensalidade definida" action={<Link href="/studio/alunos" className="btn btn-primary btn-sm">Ir para alunos</Link>}>
            Defina o valor e o dia de vencimento no cadastro de cada aluno para acompanhar aqui.
          </EmptyState>
        </div>
      ) : (
        <ul className="card stagger mt-5 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.student.id} className="evo-cash-row">
              <Link href={`/studio/alunos/${r.student.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={r.student.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.student.name}</span>
                  <span className="block text-sm text-muted tabular">
                    {brl(r.amount)} · vence {ddmm(r.due)}
                  </span>
                </span>
              </Link>
              <span className={cx("badge", r.status === "paga" ? "badge-success" : r.status === "vencida" ? "badge-danger" : "badge-warning")}>
                {r.status === "paga" ? `Paga em ${ddmm(r.paidAt!)}` : r.status === "vencida" ? `Vencida há ${r.overdueDays} ${r.overdueDays === 1 ? "dia" : "dias"}` : "A vencer"}
              </span>
              <span className="evo-cash-actions">
                {r.status === "paga" ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      update((x) => unmarkPaid(x, r.student.id, month))
                      toast("Pagamento desfeito.", "info")
                    }}
                  >
                    <Undo2 size={15} aria-hidden /> Desfazer
                  </button>
                ) : (
                  <>
                    <a
                      href={whatsappLink(r.student.phone, feeMessage(r, d.profile.name, d.profile.pixKey, month))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      aria-label={`Lembrar ${r.student.name} no WhatsApp`}
                    >
                      <MessageCircle size={15} aria-hidden /> Lembrar
                    </a>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      aria-label={`Marcar mensalidade de ${r.student.name} como paga`}
                      onClick={() => {
                        update((x) => markPaid(x, r.student.id, month, r.amount))
                        toast(`Mensalidade de ${r.student.name.split(" ")[0]} marcada como paga.`)
                      }}
                    >
                      <Check size={15} aria-hidden /> Paga
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {withoutFee.length > 0 && rows.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          {withoutFee.length === 1 ? "1 aluno ativo" : `${withoutFee.length} alunos ativos`} sem mensalidade definida:{" "}
          {withoutFee.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ", "}
              <Link href={`/studio/alunos/${s.id}`} className="font-medium text-accent hover:underline">
                {s.name.split(" ")[0]}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
    </div>
  )
}
