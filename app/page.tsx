import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  Dumbbell,
  Search,
  Smartphone,
  Users,
} from "lucide-react"
import { PublicShell } from "@/components/public-shell"
import { HeroShowcase } from "@/components/hero-showcase"
import { CATALOG_SIZE } from "@/lib/catalog"

const EXPERIENCES = [
  {
    href: "/studio",
    icon: BarChart3,
    eyebrow: "Gestão do personal",
    title: "EVOFIT Studio",
    text: "Organize alunos, monte fichas e acompanhe frequência e evolução sem alternar entre planilhas e mensagens.",
    cta: "Explorar o Studio",
  },
  {
    href: "/aluno",
    icon: Smartphone,
    eyebrow: "Experiência do aluno",
    title: "EVOFIT Aluno",
    text: "O treino fica claro no celular: exercícios demonstrados, séries, cargas, descanso e histórico em um só lugar.",
    cta: "Ver a experiência do aluno",
  },
  {
    href: "/personais",
    icon: Search,
    eyebrow: "Descoberta profissional",
    title: "Encontrar personal",
    text: "Ajude novos alunos a encontrar profissionais por região, modalidade e especialidade — com publicação opcional do perfil.",
    cta: "Conhecer o diretório",
  },
]

const FLOW = [
  { n: "01", icon: Users, title: "Organize", text: "Cadastre seus alunos e entenda quem precisa de atenção." },
  { n: "02", icon: ClipboardList, title: "Prescreva", text: "Monte fichas com exercícios, séries, repetições, carga e descanso." },
  { n: "03", icon: Dumbbell, title: "Acompanhe", text: "Veja o que foi concluído e acompanhe a evolução registrada." },
]

export default function Home() {
  return (
    <PublicShell>
      <section className="fade-in relative overflow-hidden rounded-[1.5rem] border border-line bg-surface px-4 py-6 shadow-sm sm:rounded-[2rem] sm:px-10 sm:py-12 lg:px-14 lg:py-16">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-accent-soft blur-3xl sm:size-80" />
        <div className="relative grid items-center gap-7 sm:gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
          <div className="max-w-3xl">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-line-strong bg-bg/70 px-3 py-1.5 text-[0.7rem] font-semibold text-muted sm:text-xs">
              <span className="size-2 rounded-full bg-success" />
              Feito para personal trainers autônomos
            </div>
            <h1 className="t-display mt-5 max-w-3xl sm:mt-6">
              Menos tempo organizando. <span className="text-accent">Mais tempo evoluindo</span> seus alunos.
            </h1>
            <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-muted sm:mt-5 sm:text-lg">
              Do planejamento à execução do treino, mantenha alunos, fichas e progresso conectados em uma experiência simples — para você e para quem treina com você.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:gap-3">
              <Link href="/studio" className="btn btn-primary btn-lg btn-pill w-full sm:w-auto">
                Experimentar o Studio <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/aluno" className="btn btn-outline btn-lg btn-pill w-full sm:w-auto">
                Ver a experiência do aluno
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted sm:mt-5">
              <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-accent" aria-hidden /> Sem cadastro para explorar</span>
              <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-accent" aria-hidden /> {CATALOG_SIZE} exercícios</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <HeroShowcase />
          </div>
        </div>
      </section>

      <section className="mt-12 sm:mt-16" aria-labelledby="flow-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="t-eyebrow">Um fluxo conectado</p>
            <h2 id="flow-title" className="t-h1 mt-2">Do planejamento ao progresso.</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted">O que você prescreve no Studio aparece para o aluno executar e registrar.</p>
        </div>
        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {FLOW.map(({ n, icon: Icon, title, text }) => (
            <li key={n} className="card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl bg-inverse text-on-inverse">
                  <Icon size={19} aria-hidden />
                </span>
                <span className="text-sm font-semibold tabular text-muted">{n}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 sm:mt-16" aria-labelledby="experiences-title">
        <div className="max-w-2xl">
          <p className="t-eyebrow">Explore por objetivo</p>
          <h2 id="experiences-title" className="t-h1 mt-2">Entre direto na experiência que importa para você.</h2>
        </div>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {EXPERIENCES.map(({ href, icon: Icon, eyebrow, title, text, cta }) => (
            <li key={href}>
              <Link href={href} className="card group flex h-full flex-col p-5 transition-colors hover:border-line-strong sm:p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon size={20} aria-hidden />
                </span>
                <p className="t-eyebrow mt-5">{eyebrow}</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">{text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-accent">
                  {cta} <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-4 rounded-2xl border border-line p-5 text-sm sm:mt-16 sm:grid-cols-3 sm:p-6" aria-label="Sobre a demonstração">
        <div>
          <h2 className="font-semibold">Comece sem barreiras</h2>
          <p className="mt-1 leading-relaxed text-muted">Explore as telas sem precisar criar uma conta antes.</p>
        </div>
        <div>
          <h2 className="font-semibold">Demonstrações de exercícios</h2>
          <p className="mt-1 leading-relaxed text-muted">A biblioteca mostra movimentos em animação e orientações em português para ajudar o aluno a executar a ficha.</p>
        </div>
        <div>
          <h2 className="font-semibold">Teste o ciclo completo</h2>
          <p className="mt-1 leading-relaxed text-muted">Atribua uma ficha no Studio, execute o treino no app do aluno e volte para conferir os indicadores.</p>
        </div>
      </section>
    </PublicShell>
  )
}
