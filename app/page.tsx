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
  { n: "02", icon: ClipboardList, title: "Monte os treinos", text: "Monte fichas com exercícios, séries, repetições, carga e descanso." },
  { n: "03", icon: Dumbbell, title: "Acompanhe", text: "Veja o que foi concluído e acompanhe a evolução registrada." },
]

export default function Home() {
  return (
    <PublicShell>
      <section className="fade-in evo-landing evo-landing-editorial evo-landing-clean relative overflow-hidden" aria-label="EVOFIT — treino e evolução">
        <div className="evo-landing-grid" aria-hidden="true" />
        <header className="evo-landing-wordmark" aria-label="EVOFIT">
          <span className="evo-landing-brand">EVOFIT<span>.</span></span>
          <span className="evo-landing-wordmark-caption">TREINO · GESTÃO · EVOLUÇÃO</span>
        </header>
        <div className="evo-clean-hero">
          <div className="evo-clean-copy">
            <p className="t-eyebrow">SUA ROTINA DE TREINO, EM EVOLUÇÃO</p>
            <h1>Treine com<br/><span>mais intenção.</span></h1>
            <p className="evo-clean-description">Um só lugar para planejar treinos, acompanhar alunos e transformar consistência em progresso.</p>
            <div className="evo-clean-actions">
              <Link href="/studio" className="btn btn-primary">Conhecer o Studio <ArrowRight size={17} aria-hidden /></Link>
              <Link href="/aluno" className="evo-clean-secondary">Explorar app do aluno <ArrowRight size={16} aria-hidden /></Link>
            </div>
            <div className="evo-clean-proof"><span><Check size={15} aria-hidden /> Fichas de treino</span><span><Check size={15} aria-hidden /> Evolução acompanhada</span></div>
          </div>
          <div className="evo-product-preview" aria-label="Prévia do painel EVOFIT">
            <div className="evo-preview-top"><span className="evo-preview-dot" /> <span>STUDIO / VISÃO GERAL</span><span className="evo-preview-live">DEMO</span></div>
            <div className="evo-preview-greeting"><div><span>QUARTA-FEIRA</span><h2>Seu trabalho,<br/>em perspectiva.</h2></div><div className="evo-preview-avatar">EF</div></div>
            <div className="evo-preview-stats">
              <div><span>ALUNOS ATIVOS</span><strong>24</strong><small>acompanhamento próximo</small></div>
              <div><span>SESSÕES NA SEMANA</span><strong>86</strong><small>consistência em foco</small></div>
            </div>
            <div className="evo-preview-activity"><div className="evo-preview-activity-head"><strong>Atividade semanal</strong><span>Últimos 7 dias</span></div><div className="evo-preview-bars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><div className="evo-preview-days"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span></div></div>
            <div className="evo-preview-next"><span className="evo-preview-next-icon"><Dumbbell size={17} aria-hidden /></span><div><strong>Treinos conectados</strong><small>Do planejamento à execução</small></div><ArrowRight size={17} aria-hidden /></div>
          </div>
        </div>
        <footer className="evo-clean-footer"><span>FEITO PARA QUEM TREINA E QUEM ORIENTA</span><span>01 / 03 — EVOFIT PLATFORM</span></footer>
      </section>

      <section className="mt-12 sm:mt-16" aria-labelledby="flow-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="t-eyebrow">Tudo conectado</p>
            <h2 id="flow-title" className="t-h1 mt-2">Do planejamento à evolução.</h2>
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
          <p className="t-eyebrow">Entre no EVOFIT</p>
          <h2 id="experiences-title" className="t-h1 mt-2">Um sistema para quem prescreve. Uma experiência para quem treina.</h2>
        </div>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {EXPERIENCES.map(({ href, icon: Icon, eyebrow, title, text, cta }) => (
            <li key={href}>
              <Link href={href} className="card evo-experience-card group flex h-full flex-col overflow-hidden p-0 transition-colors hover:border-line-strong">
                <div className="evo-experience-photo">
                  <img
                    src={href === "/studio"
                      ? "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=82"
                      : href === "/aluno"
                        ? "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=82"
                        : "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=82"}
                    alt=""
                    loading="lazy"
                  />
                  <span>{href === "/studio" ? "GESTÃO E ACOMPANHAMENTO" : href === "/aluno" ? "TREINE NO SEU RITMO" : "ENCONTRE SEU PERSONAL"}</span>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon size={20} aria-hidden />
                </span>
                <p className="t-eyebrow mt-5">{eyebrow}</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">{text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-accent">
                  {cta} <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
                </span>
                </div>
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
