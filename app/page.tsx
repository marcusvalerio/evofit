import Link from "next/link"
import {
  ArrowRight,
  BellRing,
  Check,
  ClipboardList,
  MapPin,
  Palette,
  PlayCircle,
  Plus,
  Smartphone,
  Timer,
  X,
} from "lucide-react"
import { PublicShell } from "@/components/public-shell"
import { LandingPreview } from "@/components/landing-preview"
import { CATALOG_SIZE } from "@/lib/catalog"

/*
 * Estrutura guiada por Revenue-Centric Design:
 * ICP = personal trainer autônomo, consciente do problema (planilha + WhatsApp).
 * Hero responde em 5 s: o que é, para quem, por que agora. A prova (prévia com dados
 * da demonstração) chega antes de qualquer pedido. CTA específico + gatilho de clique.
 * Nada de depoimentos ou números inventados: só fatos verificáveis do produto.
 */

const PAINS = [
  {
    title: "A ficha vira um PDF perdido no WhatsApp.",
    text: "O aluno não acha, não entende a execução e improvisa a carga.",
    fix: "Ficha no celular do aluno, com demonstração de cada exercício.",
  },
  {
    title: "Você só descobre que o aluno sumiu quando ele cancela.",
    text: "Sem registro de treino, a falta de frequência fica invisível até virar perda de receita.",
    fix: "Alerta de quem está 7+ dias sem treinar, antes de o aluno desistir.",
  },
  {
    title: "A evolução mora na sua memória.",
    text: "Carga, repetições e frequência ficam espalhadas em planilhas e conversas.",
    fix: "Cada série registrada vira histórico e gráfico, sem você digitar nada.",
  },
]

const COMPARE: [string, string, string][] = [
  ["Onde o aluno vê o treino", "PDF ou print no WhatsApp", "App no celular, exercício por exercício"],
  ["Como ele sabe executar", "Áudio ou vídeo solto na conversa", `${CATALOG_SIZE} exercícios demonstrados + seu vídeo`],
  ["Registro de carga e séries", "Quando o aluno lembra de mandar", "Série a série, durante o treino"],
  ["Quem precisa de atenção", "Você descobre tarde demais", "Lista automática no seu painel"],
  ["Sua marca", "Arquivo genérico", "Seu nome e seu perfil público"],
]

const FAQ = [
  {
    q: "Preciso criar conta ou cadastrar cartão para testar?",
    a: "Não. A demonstração abre direto, com alunos e treinos fictícios salvos só no seu navegador. Você pode criar uma conta real quando quiser.",
  },
  {
    q: "Meu aluno precisa baixar um aplicativo?",
    a: "Não. O app do aluno funciona no navegador do celular e pode ser adicionado à tela inicial. Você envia um link de convite e ele cria o acesso.",
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
    q: "Tem pagamento, chat ou dieta?",
    a: "Ainda não. O foco agora é o ciclo prescrição → execução → acompanhamento. Essas ideias serão avaliadas depois da validação com personais reais.",
  },
]

export default function Home() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="lp-hero fade-in" aria-labelledby="hero-title">
        <div>
          <p className="evo-pill">
            <span>Novo</span> Para personal trainers autônomos
          </p>
          <h1 id="hero-title" className="t-athletic mt-6">
            Prescreva, acompanhe e <em>evolua</em> seus alunos.
          </h1>
          <p className="lp-lead">
            Sem planilha e sem PDF no WhatsApp: você monta a ficha, o aluno treina série a série pelo celular e o seu painel mostra quem treinou, quem sumiu e quem está perto de bater a meta.
          </p>
          <div className="lp-cta-row">
            <Link href="/studio" className="btn btn-primary btn-lg btn-pill">
              Começar pelo Studio <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="/aluno" className="btn btn-outline btn-lg btn-pill">
              <Smartphone size={18} aria-hidden /> Ver o app do aluno
            </Link>
          </div>
          <p className="lp-trigger">
            <span>
              <Check size={14} aria-hidden /> Sem cadastro
            </span>
            <span>
              <Check size={14} aria-hidden /> Sem cartão
            </span>
            <span>
              <Check size={14} aria-hidden /> Abre com dados de demonstração
            </span>
          </p>
          <dl className="lp-proof">
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
                <strong>7+ dias</strong>
                <span>sem treino viram alerta no painel</span>
              </dd>
            </div>
          </dl>
        </div>
        <LandingPreview />
      </section>

      {/* Dor */}
      <section className="lp-section" aria-labelledby="pain-title">
        <div className="lp-band ink">
          <p className="lp-kicker">O problema</p>
          <h2 id="pain-title" className="lp-h2 t-athletic max-w-[16ch] !text-[clamp(2.4rem,6vw,4.5rem)]">
            Planilha e WhatsApp não mostram quem está desistindo.
          </h2>
          <ul className="lp-pains">
            {PAINS.map((p, i) => (
              <li key={p.title} className="lp-pain">
                <span className="lp-pain-n">0{i + 1}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
                <p className="lp-pain-fix">
                  <Check size={16} aria-hidden /> {p.fix}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mecanismo */}
      <section className="lp-section" aria-labelledby="how-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="lp-kicker">Como funciona</p>
            <h2 id="how-title" className="lp-h2 max-w-[18ch]">
              Um ciclo só: o que você prescreve vira dado de evolução.
            </h2>
          </div>
          <Link href="/studio/treinos" className="btn btn-outline btn-pill shrink-0 self-start md:self-auto">
            Montar uma ficha <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <ol className="lp-steps">
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

      {/* Experiências */}
      <section className="lp-section" aria-labelledby="exp-title">
        <p className="lp-kicker">Três experiências, um sistema</p>
        <h2 id="exp-title" className="lp-h2 max-w-[20ch]">
          Feito para quem prescreve. Simples para quem treina.
        </h2>
        <div className="lp-features">
          <article className="card lp-feature lp-feature-main">
            <span className="lp-icon">
              <BellRing size={20} aria-hidden />
            </span>
            <h3>Um Studio que diz o que fazer, não só o que aconteceu.</h3>
            <p>A primeira coisa que você vê é a lista de ações do dia — calculada a partir do que os alunos registraram.</p>
            <ul>
              <li>
                <Check size={17} aria-hidden /> Alunos sem treino recente e sem ficha atribuída
              </li>
              <li>
                <Check size={17} aria-hidden /> Sessões em andamento, ao vivo
              </li>
              <li>
                <Check size={17} aria-hidden /> Frequência, aderência e evolução de carga por aluno
              </li>
              <li>
                <Check size={17} aria-hidden /> Editor de fichas com prévia do que o aluno verá
              </li>
            </ul>
            <Link href="/studio" className="lp-link">
              Abrir o painel do Studio <ArrowRight size={16} aria-hidden />
            </Link>
          </article>
          <article className="card lp-feature">
            <span className="lp-icon">
              <PlayCircle size={20} aria-hidden />
            </span>
            <h3>Um app que o aluno usa no meio da série.</h3>
            <p>Botões grandes, números legíveis, cronômetro de descanso com vibração e “Como fazer” em cada exercício.</p>
            <Link href="/aluno" className="lp-link">
              Testar como aluno <ArrowRight size={16} aria-hidden />
            </Link>
          </article>
          <article className="card lp-feature">
            <span className="lp-icon">
              <MapPin size={20} aria-hidden />
            </span>
            <h3>Seu perfil público para novos alunos te encontrarem.</h3>
            <p>Publicação opcional no diretório, com busca por região e especialidade. Pedidos de contato chegam no Studio.</p>
            <Link href="/personais" className="lp-link">
              Ver o diretório <ArrowRight size={16} aria-hidden />
            </Link>
          </article>
        </div>
      </section>

      {/* Comparação */}
      <section className="lp-section" aria-labelledby="cmp-title">
        <p className="lp-kicker">Antes e depois</p>
        <h2 id="cmp-title" className="lp-h2 max-w-[22ch]">
          O que muda quando a planilha sai da sua rotina.
        </h2>
        <div className="card lp-compare">
          <table>
            <caption className="sr-only">Comparação entre planilha com WhatsApp e EVOFIT</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Aspecto</span>
                </th>
                <th scope="col">Planilha + WhatsApp</th>
                <th scope="col">EVOFIT</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([row, before, after]) => (
                <tr key={row}>
                  <th scope="row">{row}</th>
                  <td>
                    <span className="inline-flex gap-1.5">
                      <X size={15} aria-hidden className="mt-0.5 shrink-0 opacity-60" />
                      {before}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex gap-1.5">
                      <Check size={15} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                      {after}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Objeções */}
      <section className="lp-section grid gap-8 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="faq-title">
        <div>
          <p className="lp-kicker">Perguntas</p>
          <h2 id="faq-title" className="lp-h2">
            Antes de você perguntar.
          </h2>
          <p className="lp-sub text-base">
            Ainda com dúvida? Abra a demonstração e faça o ciclo completo: atribua uma ficha, treine como aluno e volte ao painel.
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
        <div className="lp-band lp-final ink">
          <p className="lp-kicker justify-center">Comece agora</p>
          <h2 id="final-title" className="lp-h2 t-athletic !text-[clamp(2.6rem,7vw,5.5rem)]">
            Seu próximo aluno não precisa de mais um PDF.
          </h2>
          <p className="lp-sub mx-auto text-on-ink-muted">Abra o Studio com dados de demonstração e monte a primeira ficha em poucos minutos.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/studio" className="btn btn-primary btn-lg btn-pill">
              Abrir o Studio agora <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="/personais" className="btn btn-lg btn-pill border border-white/20 text-on-ink hover:bg-white/10">
              Procuro um personal
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
