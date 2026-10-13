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
      <section className="fade-in editorial-hero relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">
        <div className="editorial-hero-top">
          <span>PERSONAL TRAINING / MANAGEMENT PLATFORM</span>
          <span className="editorial-index">01 — 03</span>
        </div>
        <div className="relative grid items-center gap-8 px-5 pb-6 pt-7 sm:px-9 sm:pb-9 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.78fr)] lg:gap-5 lg:px-12 lg:py-12">
          <div className="relative z-10 max-w-3xl">
            <div className="editorial-label"><span /> Feito para personal trainers autônomos</div>
            <h1 className="editorial-title mt-6">
              Menos tempo<br />organizando<span className="editorial-period">.</span><br /><span className="editorial-title-accent">Mais evolução.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Alunos, fichas e progresso conectados em uma ferramenta feita para o trabalho real de quem prescreve e acompanha treinos.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/studio" className="btn btn-primary btn-lg w-full sm:w-auto">
                Explorar o Studio <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/aluno" className="editorial-text-link">
                Conhecer o app do aluno <span aria-hidden>↗</span>
              </Link>
            </div>
            <div className="editorial-proof mt-8">
              <span><strong>01</strong> Sem cadastro para explorar</span>
              <span><strong>{CATALOG_SIZE}</strong> exercícios no catálogo</span>
            </div>
          </div>
          <div className="editorial-showcase relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="editorial-showcase-label"><span>FORÇA EM MOVIMENTO</span><span>EVOFIT / 001</span></div>
            <div className="editorial-photo-panel">
              <img
                src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1100&q=85"
                alt="Atleta treinando força em uma academia"
                className="editorial-photo"
                loading="eager"
              />
              <div className="editorial-photo-shade" aria-hidden="true" />
              <div className="editorial-photo-top"><span>STRENGTH / CONDITIONING</span><span>01—04</span></div>
              <div className="editorial-photo-caption">
                <span className="editorial-photo-kicker">TREINO COM INTENÇÃO</span>
                <strong>Consistência<br/>constrói evolução.</strong>
                <span className="editorial-photo-meta"><i /> PLANEJADO NO EVOFIT STUDIO</span>
              </div>
              <div className="editorial-photo-chip"><span>04</span><small>SÉRIES<br/>PLANEJADAS</small></div>
            </div>
            <div className="editorial-stamp" aria-hidden="true">E<span>F</span><i>.</i></div>
          </div>
        </div>
        <div className="editorial-hero-bottom"><span>EVOFIT STUDIO</span><span>PLANEJAR / PRESCREVER / ACOMPANHAR</span></div>
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
