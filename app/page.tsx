import { Fragment } from "react"
import Link from "next/link"
import { Activity, ArrowRight, BellRing, Check, ClipboardList, MapPin, Palette, PersonStanding, Plus, Radar, Smartphone, Timer, Wallet, WifiOff } from "lucide-react"
import { PublicShell } from "@/components/public-shell"
import { LandingPreview } from "@/components/landing-preview"
import { ProductReel } from "@/components/product-reel"
import { LibraryMarquee, RevealOnScroll } from "@/components/landing-motion"
import { CATALOG_SIZE } from "@/lib/catalog"
import { demoEnabled } from "@/lib/demo-mode"

/*
 * Estrutura guiada por Revenue-Centric Design:
 * ICP = personal trainer autônomo, consciente do problema (planilha + WhatsApp).
 * Hero responde em 5 s: o que é, para quem, por que este. A prova (prévia com dados
 * da demonstração) chega antes de qualquer pedido. CTA específico + gatilho de clique.
 * Nada de depoimentos ou números inventados: só fatos verificáveis do produto.
 */

/*
 * A landing inteira responde, sem precisar escrevê-la, à pergunta do personal que já viu outros
 * sistemas: "por que este e não outro?". Cada motivo é verificável no próprio produto
 * (vídeo real logo abaixo), sem citar concorrentes nem inventar números.
 */
const REASONS = [
  { icon: Radar, title: "Ele te avisa quem vai cancelar.", text: "O radar de evasão aponta quem está sumindo, por quê, e quanto isso vale em mensalidades — antes do aluno desistir.", href: "#ver-studio-painel" },
  { icon: Wallet, title: "Cobra a mensalidade sem taxa.", text: "Lembrete pronto no WhatsApp com a sua chave Pix. O dinheiro vai direto para você; o EVOFIT não fica com nada.", href: "#ver-studio-caixa" },
  { icon: WifiOff, title: "Funciona sem sinal na academia.", text: "A ficha fica no celular do aluno. Ele treina no subsolo e as séries sobem quando a internet volta.", href: "#ver-aluno-treino" },
  { icon: PersonStanding, title: "Explica cada exercício em português.", text: `${CATALOG_SIZE} exercícios com demonstração animada, passo a passo e os músculos no mapa do corpo.`, href: "#ver-biblioteca" },
  { icon: Activity, title: "Mostra se a ficha está equilibrada.", text: "Enquanto você monta, o mapa de volume por músculo mostra o que ficou de fora ou passou do ponto.", href: "#ver-studio-ficha" },
  { icon: MapPin, title: "Traz aluno novo até você.", text: "Perfil público em Encontrar personal com botão de WhatsApp e o seu Instagram, para quem procura na sua região.", href: "/personais" },
]

/** O que perguntar a qualquer sistema antes de assinar — com a resposta do EVOFIT. */
const CHECKLIST: [string, string][] = [
  ["Ele me avisa quem está prestes a cancelar?", "Sim — radar de evasão com o valor em risco no mês."],
  ["Meu aluno treina sem internet na academia?", "Sim — a ficha fica no celular e sincroniza depois."],
  ["Fica com uma parte da mensalidade dos meus alunos?", "Não — você recebe direto no seu Pix."],
  ["Eu mesmo crio o acesso do aluno e posso revogar?", "Sim — usuário e senha provisória em um toque."],
  ["Os exercícios estão em português, mostrando como fazer?", `Sim — ${CATALOG_SIZE} com animação, passo a passo e músculos.`],
  ["Sei como o aluno se sentiu no treino?", "Sim — check-in de esforço, dor e sono ao concluir."],
  ["Me ajuda a conseguir aluno novo?", "Sim — perfil público com WhatsApp e Instagram."],
  ["Preciso de cartão de crédito para começar?", "Não — basta e-mail e senha."],
]

const FAQ = [
  {
    q: "O EVOFIT é só mais um app de ficha?",
    a: "Não. Guardar e enviar ficha é o começo. O EVOFIT cuida do que faz você perder dinheiro: aluno que some (radar de evasão em R$), mensalidade esquecida (lembrete com Pix, sem taxa) e treino que não acontece por falta de sinal (funciona offline).",
  },
  {
    q: "Preciso cadastrar cartão para começar?",
    a: "Não. Você cria a conta com e-mail e senha, cadastra seus alunos e monta a primeira ficha. Seus dados ficam só na sua conta.",
  },
  {
    q: "Meu aluno precisa baixar um aplicativo?",
    a: "Não. O app do aluno funciona no navegador do celular e pode ser instalado na tela inicial. Você gera o usuário e uma senha provisória (ou envia um link de convite) e ele cria a própria senha no primeiro acesso.",
  },
  {
    q: "De onde vêm os exercícios?",
    a: `São ${CATALOG_SIZE} exercícios de um catálogo aberto (domínio público), traduzidos para o português, com a posição inicial e final de cada movimento. Você também pode cadastrar exercícios próprios e anexar seu vídeo.`,
  },
  {
    q: "Os indicadores mostram ganho de massa ou perda de gordura?",
    a: "Não. O EVOFIT mostra o que foi registrado: frequência, aderência às metas, cargas e repetições. Não inventamos resultados físicos que não foram medidos.",
  },
  {
    q: "O EVOFIT cobra meus alunos?",
    a: "Não. Você registra quem pagou, vê quem está vencido e envia o lembrete pelo WhatsApp com a sua chave Pix. O dinheiro vai direto para você — o EVOFIT não intermedeia nem retém nada.",
  },
  {
    q: "Funciona sem internet na academia?",
    a: "Sim. Depois de aberta uma vez, a ficha do aluno fica no celular. Sem sinal, ele treina normalmente e as séries são enviadas quando a conexão volta.",
  },
  {
    q: "Tem chat ou dieta?",
    a: "Ainda não. O foco é o ciclo prescrição → execução → acompanhamento. Essas ideias serão avaliadas depois da validação com personais reais.",
  },
]

const HERO_WORDS = ["Feito", "para", "você", "não", "perder", "aluno."]

export default function Home() {
  // com contas reais, toda chamada leva a criar a conta; sem banco, abre a demonstração
  const demo = demoEnabled()
  const start = demo ? "/studio" : "/criar-conta"
  return (
    <PublicShell>
      {/* Hero */}
      <section className="lp-hero fade-in" aria-labelledby="hero-title">
        <div>
          <p className="evo-pill lp-in" style={{ "--d": "0ms" } as React.CSSProperties}>
            <span>Novo</span> Para personal trainers autônomos
          </p>
          <h1 id="hero-title" className="lp-title t-athletic mt-6">
            {HERO_WORDS.map((w, i) => (
              <Fragment key={i}>
                <span className="lp-w">
                  <span style={{ "--i": i } as React.CSSProperties}>{w === "perder" ? <em>perder</em> : w}</span>
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <p className="lp-lead lp-in" style={{ "--d": "520ms" } as React.CSSProperties}>
            Guardar ficha qualquer sistema guarda. O EVOFIT trabalha por você: avisa quem está sumindo e quanto isso vale em R$, cobra a mensalidade pelo WhatsApp sem taxa e deixa o aluno treinar até sem internet.
          </p>
          <div className="lp-cta-row lp-in" style={{ "--d": "640ms" } as React.CSSProperties}>
            <Link href={start} className="btn btn-primary btn-lg btn-pill">
              {demo ? "Começar pelo Studio" : "Criar minha conta"} <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href={demo ? "/aluno" : "#como-funciona"} className="btn btn-outline btn-lg btn-pill">
              <Smartphone size={18} aria-hidden /> {demo ? "Ver o app do aluno" : "Ver funcionando"}
            </Link>
          </div>
          <p className="lp-trigger lp-in" style={{ "--d": "740ms" } as React.CSSProperties}>
            <span>
              <Check size={14} aria-hidden /> {demo ? "Sem cadastro" : "Cadastro só com e-mail"}
            </span>
            <span>
              <Check size={14} aria-hidden /> Sem cartão
            </span>
            <span>
              <Check size={14} aria-hidden /> {demo ? "Abre com dados de demonstração" : "Aluno usa no navegador, sem baixar app"}
            </span>
          </p>
          <dl className="lp-proof lp-in" style={{ "--d": "840ms" } as React.CSSProperties}>
            <div>
              <dt className="sr-only">Exercícios</dt>
              <dd>
                <Link href="/biblioteca" className="lp-proof-link" aria-label={`Biblioteca EVOFIT: ${CATALOG_SIZE} exercícios em GIF`}>
                  <strong>{CATALOG_SIZE}</strong>
                  <span>exercícios demonstrados em português →</span>
                </Link>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Registro</dt>
              <dd>
                <strong>Série a série</strong>
                <span>reps, carga e descanso registrados</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Alertas</dt>
              <dd>
                <strong>0% de taxa</strong>
                <span>na mensalidade: recebe direto no seu Pix</span>
              </dd>
            </div>
          </dl>
        </div>
        <LandingPreview />
      </section>

      <LibraryMarquee />

      {/* A pergunta */}
      <section className="lp-section" aria-labelledby="why-title">
        <div className="lp-why-head" data-reveal>
          <p className="lp-kicker">Além da ficha</p>
          <h2 id="why-title" className="lp-h2 t-athletic">
            Ele trabalha <em>enquanto você treina.</em>
          </h2>
          <p className="lp-sub">Seis coisas que o EVOFIT faz por você no dia a dia — cada uma aparece funcionando logo abaixo.</p>
        </div>
        <ol className="lp-why lp-stagger" data-reveal>
          {REASONS.map((r, i) => (
            <li key={r.title}>
              <a href={r.href} className="lp-why-card">
                <span className="lp-why-n" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="lp-icon">
                  <r.icon size={20} aria-hidden />
                </span>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
                <span className="lp-why-go">
                  {r.href.startsWith("#") ? "Ver funcionando" : "Ver o diretório"} <ArrowRight size={15} aria-hidden />
                </span>
              </a>
            </li>
          ))}
        </ol>
        <div className="lp-cta-inline" data-reveal>
          <Link href={start} className="btn btn-primary btn-lg btn-pill">
            {demo ? "Ver isso no meu Studio" : "Quero isso no meu dia a dia"} <ArrowRight size={18} aria-hidden />
          </Link>
          <p className="lp-trigger">
            <span>
              <Check size={14} aria-hidden /> {demo ? "Abre na hora" : "Conta criada com e-mail e senha"}
            </span>
            <span>
              <Check size={14} aria-hidden /> Sem cadastro e sem cartão
            </span>
          </p>
        </div>
      </section>

      <ProductReel demo={demo} />

      {/* Checklist */}
      <section className="lp-section" aria-labelledby="ask-title">
        <div data-reveal>
          <p className="lp-kicker">Na ponta do lápis</p>
          <h2 id="ask-title" className="lp-h2 max-w-[22ch]">
            As perguntas que todo personal faz. Já respondidas.
          </h2>
          <p className="lp-sub">Do primeiro aluno ao vigésimo, o que pesa no dia a dia — e como o EVOFIT resolve cada uma.</p>
        </div>
        <div className="card lp-ask" data-reveal>
          <table>
            <caption className="sr-only">Perguntas frequentes de personal trainers e como o EVOFIT responde</caption>
            <thead>
              <tr>
                <th scope="col">Pergunta</th>
                <th scope="col">No EVOFIT</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST.map(([q, a]) => (
                <tr key={q}>
                  <th scope="row">{q}</th>
                  <td>
                    <span className="lp-ask-yes">
                      <Check size={15} aria-hidden /> {a}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mecanismo */}
      <section className="lp-section" aria-labelledby="how-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" data-reveal>
          <div>
            <p className="lp-kicker">Como funciona</p>
            <h2 id="how-title" className="lp-h2 max-w-[18ch]">
              Um ciclo só: o que você prescreve vira dado de evolução.
            </h2>
          </div>
          <Link href={demo ? "/studio/treinos" : "/criar-conta"} className="btn btn-outline btn-pill shrink-0 self-start md:self-auto">
            {demo ? "Montar uma ficha" : "Montar minha primeira ficha"} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <ol className="lp-steps lp-stagger" data-reveal>
          <li className="card lp-step">
            <div className="lp-step-head">
              <span className="lp-icon">
                <ClipboardList size={20} aria-hidden />
              </span>
              <span className="lp-step-n">01</span>
            </div>
            <h3>Você prescreve</h3>
            <p>Escolhe exercícios da biblioteca, define séries, repetições, carga e descanso, e atribui ao aluno.</p>
            <div className="lp-step-ui" aria-hidden>
              <div className="lp-step-ui-row">
                <b className="flex-1">Agachamento com barra</b>
                <span className="badge">4 × 8</span>
              </div>
              <div className="lp-step-ui-row">
                <b className="flex-1">Supino inclinado</b>
                <span className="badge">3 × 12</span>
              </div>
              <div className="lp-step-ui-row text-accent">
                <Plus size={15} /> <span className="font-semibold">Adicionar exercício</span>
              </div>
            </div>
          </li>
          <li className="card lp-step">
            <div className="lp-step-head">
              <span className="lp-icon">
                <Timer size={20} aria-hidden />
              </span>
              <span className="lp-step-n">02</span>
            </div>
            <h3>O aluno executa</h3>
            <p>Vê como fazer cada movimento, marca as séries, ajusta a carga e o descanso começa sozinho.</p>
            <div className="lp-step-ui" aria-hidden>
              {[
                ["1", "8", "50", true],
                ["2", "8", "50", true],
                ["3", "7", "52,5", false],
              ].map(([n, r, kg, on]) => (
                <div key={String(n)} className="lp-step-ui-row">
                  <span className="w-4 text-center font-bold tabular">{n}</span>
                  <span className="lp-mini-num">{r}</span>
                  <span className="lp-mini-num">{kg} kg</span>
                  <span className={on ? "lp-mini-check on" : "lp-mini-check"}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                </div>
              ))}
            </div>
          </li>
          <li className="card lp-step">
            <div className="lp-step-head">
              <span className="lp-icon">
                <BellRing size={20} aria-hidden />
              </span>
              <span className="lp-step-n">03</span>
            </div>
            <h3>Você acompanha</h3>
            <p>O painel calcula frequência e aderência e aponta quem precisa de uma mensagem hoje.</p>
            <div className="lp-step-ui" aria-hidden>
              <div className="lp-step-ui-row">
                <span className="flex-1">Meta da semana</span>
                <b className="tabular">3/4</b>
              </div>
              <div className="progress">
                <span style={{ width: "75%" }} />
              </div>
              <div className="lp-step-ui-row mt-1">
                <span className="flex-1">Sem treinar</span>
                <span className="badge badge-warning">9 dias</span>
              </div>
            </div>
          </li>
        </ol>
      </section>

      {/* Objeções */}
      <section className="lp-section grid gap-8 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="faq-title" data-reveal>
        <div>
          <p className="lp-kicker">Perguntas</p>
          <h2 id="faq-title" className="lp-h2">
            Antes de você perguntar.
          </h2>
          <p className="lp-sub text-base">
            Ainda com dúvida? Veja as gravações acima: é exatamente o que você e seus alunos vão usar.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted">
            <Palette size={16} aria-hidden className="text-accent" /> Seu nome e sua cor no perfil profissional.
          </p>
        </div>
        <div className="lp-faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <Plus size={20} aria-hidden />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="lp-section" aria-labelledby="final-title">
        <div className="lp-band lp-final ink" data-reveal>
          <p className="lp-kicker justify-center">Comece agora</p>
          <h2 id="final-title" className="lp-h2 t-athletic !text-[clamp(2.6rem,7vw,5.5rem)]">
            Seu próximo aluno não precisa de mais um PDF.
          </h2>
          <p className="lp-sub mx-auto text-on-ink-muted">Crie sua conta, cadastre o primeiro aluno e envie o acesso dele hoje mesmo.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={start} className="btn btn-primary btn-lg btn-pill">
              {demo ? "Abrir o Studio agora" : "Criar minha conta"} <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="/personais" className="btn btn-lg btn-pill border border-white/20 text-on-ink hover:bg-white/10">
              Procuro um personal
            </Link>
          </div>
        </div>
      </section>
      <RevealOnScroll />
    </PublicShell>
  )
}
