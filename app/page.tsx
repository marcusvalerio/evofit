import Link from "next/link"
import { ArrowRight, LayoutDashboard, Search, Smartphone } from "lucide-react"
import { PublicShell } from "@/components/public-shell"
import { HeroShowcase } from "@/components/hero-showcase"
import { CATALOG_SIZE } from "@/lib/catalog"

const EXPERIENCES = [
  {
    href: "/studio",
    icon: LayoutDashboard,
    eyebrow: "Para o personal",
    title: "EVOFIT Studio",
    text: "Painel com frequência real dos alunos, editor de fichas e uma biblioteca com centenas de exercícios demonstrados — com espaço para o seu vídeo e a sua dica.",
    cta: "Abrir o Studio",
  },
  {
    href: "/aluno",
    icon: Smartphone,
    eyebrow: "Para o aluno",
    title: "EVOFIT Aluno",
    text: "O treino do dia no celular, mesmo sem o personal por perto: como fazer cada exercício, registro de carga, cronômetro de descanso e histórico.",
    cta: "Abrir o app do aluno",
  },
  {
    href: "/personais",
    icon: Search,
    eyebrow: "Para quem procura",
    title: "Encontrar personal",
    text: "Diretório público com busca por região, modalidade e especialidade. Só aparecem profissionais que escolheram ser listados.",
    cta: "Buscar profissionais",
  },
]

export default function Home() {
  return (
    <PublicShell>
      <div className="grid items-center gap-10 py-6 sm:py-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <section className="fade-in max-w-3xl">
        <p className="t-eyebrow">Plataforma para personal trainers autônomos</p>
        <h1 className="t-display mt-3">
          Prescreva, acompanhe e <span className="text-accent">evolua</span> cada aluno.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Esta é uma demonstração aberta, sem login. Os dados são fictícios e ficam salvos apenas no seu navegador — explore à vontade e use “Restaurar” na faixa superior para voltar ao início.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/studio" className="btn btn-primary btn-lg btn-pill">
            Começar pelo Studio <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/aluno" className="btn btn-outline btn-lg btn-pill">
            Ver como aluno
          </Link>
        </div>
        <dl className="stagger mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
          {[
            { v: String(CATALOG_SIZE), l: "exercícios com demonstração" },
            { v: "PT-BR", l: "passo a passo traduzido" },
            { v: "3", l: "experiências conectadas" },
          ].map((x) => (
            <div key={x.l}>
              <dt className="sr-only">{x.l}</dt>
              <dd className="text-2xl font-bold tracking-tight tabular">{x.v}</dd>
              <dd className="mt-0.5 text-xs leading-snug text-muted">{x.l}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="fade-in [animation-delay:150ms]">
        <HeroShowcase />
      </div>
      </div>

      <ul className="stagger mt-6 grid gap-4 md:grid-cols-3">
        {EXPERIENCES.map(({ href, icon: Icon, eyebrow, title, text, cta }) => (
          <li key={href}>
            <Link href={href} className="card lift group flex h-full flex-col p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-inverse text-on-inverse transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <Icon size={20} aria-hidden />
              </span>
              <p className="t-eyebrow mt-5">{eyebrow}</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
              <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">{text}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-accent">
                {cta} <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12 grid gap-4 rounded-2xl border border-line p-6 text-sm sm:grid-cols-3" aria-label="Sobre a demonstração">
        <div>
          <h2 className="font-semibold">Sem cadastro</h2>
          <p className="mt-1 text-muted">Todas as telas abrem direto. No app do aluno você escolhe qual aluno fictício quer “ser”.</p>
        </div>
        <div>
          <h2 className="font-semibold">Dados locais</h2>
          <p className="mt-1 text-muted">Nada é enviado a servidores. Outro navegador ou dispositivo começa com a demonstração original.</p>
        </div>
        <div>
          <h2 className="font-semibold">Fluxo conectado</h2>
          <p className="mt-1 text-muted">Uma ficha atribuída no Studio aparece no app do aluno; o treino concluído volta para os indicadores do Studio.</p>
        </div>
      </section>
    </PublicShell>
  )
}
