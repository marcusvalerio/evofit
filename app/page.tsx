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
      <section className="fade-in evo-landing evo-landing-editorial relative overflow-hidden" aria-label="EVOFIT — treino e evolução">
        <div className="evo-landing-grid" aria-hidden="true" />
        <div className="evo-landing-wordmark" aria-hidden="true">EVOFIT <span>TRAINING PLATFORM</span></div>
        <div className="evo-landing-layout">
          <article className="evo-campaign-panel">
            <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85" alt="Academia preparada para um treino de força" className="evo-campaign-image" loading="eager" />
            <div className="evo-campaign-overlay" aria-hidden="true" />
            <div className="evo-campaign-top"><span>EVOFIT / TRAINING SYSTEM</span><span>01—04</span></div>
            <div className="evo-campaign-copy">
              <p>TREINO COM INTENÇÃO</p>
              <h1>TREINO<br/>INTELIGENTE.<br/><span>RESULTADO REAL.</span></h1>
              <p className="evo-campaign-description">Planeje os treinos, acompanhe seus alunos e transforme cada sessão em progresso visível.</p>
              <Link href="/studio" className="evo-lime-button">CONHECER O EVOFIT <ArrowRight size={17} aria-hidden /></Link>
            </div>
            <div className="evo-campaign-bottom"><span>FORÇA / FOCO / PROGRESSO</span><span>RIO DE JANEIRO · BR</span></div>
          </article>

          <div className="evo-phone-stage">
            <div className="evo-phone-orbit" aria-hidden="true" />
            <div className="evo-phone" aria-label="Prévia da experiência de treino do aluno">
              <div className="evo-phone-status"><span>9:41</span><span>● ● ▰</span></div>
              <div className="evo-phone-header"><div><span>SEU PLANO DE TREINO</span><h2>BORA TREINAR.</h2></div><div className="evo-avatar">E.</div></div>
              <div className="evo-phone-feature">
                <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=700&q=85" alt="" loading="eager" />
                <div><span>TREINO DE HOJE</span><strong>TREINO DE<br/>MEMBROS SUPERIORES</strong><small>45 MIN · 6 EXERCÍCIOS</small></div>
              </div>
              <div className="evo-phone-progress"><div><span>META DA SEMANA</span><strong>03 <small>/ 04 TREINOS</small></strong></div><div className="evo-progress-track"><i /></div></div>
              <div className="evo-phone-section"><h3>EXERCÍCIOS <span>VER FICHA ↗</span></h3>
                <div className="evo-exercise-row"><img src="https://images.unsplash.com/photo-1534368270820-9de3d8053204?auto=format&fit=crop&w=180&q=80" alt="" loading="lazy"/><div><strong>SUPINO RETO</strong><small>Peito · 4 × 10 repetições</small></div><span>↗</span></div>
                <div className="evo-exercise-row"><img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=180&q=80" alt="" loading="lazy"/><div><strong>PUXADA ALTA</strong><small>Costas · 3 × 12 repetições</small></div><span>↗</span></div>
              </div>
              <Link href="/aluno" className="evo-phone-cta">EXPERIMENTAR O APP DO ALUNO <ArrowRight size={15} aria-hidden /></Link>
            </div>
            <p className="evo-phone-caption"><span>02 / 04</span> TREINOS E EVOLUÇÃO CONECTADOS</p>
          </div>
        </div>
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
