import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Dumbbell, Inbox, Users } from 'lucide-react'
import { Alert, EmptyState, ProgressBar, Skeleton } from '@/components/ui/feedback'
import { Avatar } from '@/components/ui/avatar'
import { Badge, contactStatus, linkStatus, planStatus } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardHeader, MetricCard } from '@/components/ui/card'
import { Field, Input, SearchField, Select, Textarea } from '@/components/ui/field'
import { Pagination, Table, Td, Th, Tr } from '@/components/ui/table'
import { Wordmark } from '@/components/ui/wordmark'
import { InteractiveDemo } from './demo'

export const metadata: Metadata = { title: 'Componentes', robots: { index: false, follow: false } }

const SWATCHES = [
  { name: 'Maastricht Blue', token: 'maastricht', hex: '#06283D', cls: 'bg-maastricht', dark: true },
  { name: 'Maastricht profundo', token: 'maastricht-lo', hex: '#041C2B', cls: 'bg-maastricht-lo', dark: true },
  { name: 'Gainsboro', token: 'gainsboro', hex: '#D6E4E5', cls: 'bg-gainsboro', dark: false },
  { name: 'Papel', token: 'paper', hex: '#F2F7F7', cls: 'bg-paper border border-line', dark: false },
  { name: 'Portland Orange', token: 'portland', hex: '#F45334', cls: 'bg-portland', dark: false },
  { name: 'Preto suavizado', token: 'ink', hex: '#101820', cls: 'bg-ink', dark: true },
]

const EXAMPLE_ROWS = [
  { name: 'Aluno de exemplo A', status: 'active' as const, plan: 'Treino A — Peito e tríceps' },
  { name: 'Aluno de exemplo B', status: 'invited' as const, plan: 'Sem treino atribuído' },
  { name: 'Aluno de exemplo C', status: 'ended' as const, plan: 'Treino B — Costas e bíceps' },
]

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="py-10">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 max-w-reading text-ink-2">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default function StyleguidePage() {
  // Página de apoio ao desenvolvimento: só aparece fora de produção (ou se habilitada).
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_STYLEGUIDE !== 'true') notFound()

  return (
    <main className="mx-auto max-w-page px-4 pb-24 sm:px-6">
      <header className="on-dark -mx-4 bg-maastricht px-4 py-14 text-paper sm:-mx-6 sm:rounded-b-xl sm:px-10">
        <Wordmark className="text-5xl text-paper sm:text-6xl" />
        <p className="mt-5 max-w-reading text-lg text-gainsboro">
          Componentes e tokens do EVOFIT. Todos os dados abaixo são exemplos, só para esta página de desenvolvimento.
        </p>
      </header>

      <Section title="Cores" description="O laranja é reservado a ações prioritárias e ao progresso. Texto em laranja sobre fundo claro usa o tom escurecido.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map((s) => (
            <div key={s.token} className="overflow-hidden rounded-lg border border-line-soft bg-surface shadow-xs">
              <div className={`h-20 ${s.cls}`} />
              <div className="p-3">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="tabular text-xs text-ink-3">{s.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia" description="Geist em toda a interface. Hierarquia por tamanho e peso, números tabulares em métricas e cargas.">
        <Card className="space-y-4 p-6">
          <p className="text-4xl font-semibold tracking-tight">Treino de hoje</p>
          <p className="text-2xl font-semibold tracking-tight">Agachamento livre</p>
          <p className="text-lg text-ink-2">4 séries de 8 a 10 repetições, descanso de 90 segundos.</p>
          <p className="max-w-reading text-base text-ink-2">
            Mantenha a coluna neutra, desça até a paralela e suba empurrando o chão. Ajuste a carga só quando completar todas as repetições.
          </p>
          <p className="text-sm text-ink-3">Última sessão registrada em 08/10 · 62,5 kg</p>
        </Card>
      </Section>

      <Section title="Botões" description="Quatro hierarquias e três tamanhos. Alvos de toque de 44 px ou mais (médio e grande).">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Salvar treino</Button>
            <Button variant="secondary">Atribuir ao aluno</Button>
            <Button variant="outline">Duplicar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">Desvincular</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
            <Button loading>Salvando</Button>
            <Button disabled>Indisponível</Button>
            <LinkButton href="/styleguide" variant="outline">
              Link com aparência de botão
            </LinkButton>
          </div>
          <InteractiveDemo />
        </div>
      </Section>

      <Section title="Campos" description="Rótulo sempre visível, ajuda e erro ligados ao campo para leitores de tela.">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="space-y-5 p-6">
            <Field label="Nome do aluno" hint="Como ele aparece para você." required>
              {(p) => <Input placeholder="Nome e sobrenome" {...p} />}
            </Field>
            <Field label="E-mail" error="Informe um e-mail válido, como nome@exemplo.com.">
              {(p) => <Input type="email" defaultValue="aluno@exemplo" {...p} />}
            </Field>
            <Field label="Modalidade">
              {(p) => (
                <Select defaultValue="hybrid" {...p}>
                  <option value="in_person">Presencial</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Presencial e online</option>
                </Select>
              )}
            </Field>
          </Card>
          <Card className="space-y-5 p-6">
            <SearchField label="Buscar exercício" placeholder="Buscar por nome ou grupo muscular" />
            <Field label="Instruções">{(p) => <Textarea placeholder="Como executar o movimento" {...p} />}</Field>
            <Field label="Campo desabilitado">{(p) => <Input disabled defaultValue="Não editável" {...p} />}</Field>
          </Card>
        </div>
      </Section>

      <Section title="Cards e métricas" description="Sem dados, o painel mostra um traço e diz o que fazer, nunca um número inventado.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Alunos ativos" value={12} delta={2} deltaLabel="no mês" />
          <MetricCard label="Sessões na semana" value={31} delta={-4} deltaLabel="vs. semana anterior" />
          <MetricCard label="Frequência média" value={78} unit="%" />
          <MetricCard label="Solicitações pendentes" value={null} emptyHint="Quando alguém pedir contato, aparece aqui" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Treino de hoje" description="Peito e tríceps" action={<Badge tone="success" dot>Publicado</Badge>} />
            <div className="space-y-3 p-5">
              <ProgressBar value={6} max={12} label="Séries concluídas" />
              <p className="tabular text-sm text-ink-2">6 de 12 séries</p>
            </div>
          </Card>
          <Card tone="dark" className="p-6">
            <p className="text-sm text-gainsboro">Superfície escura para a execução do treino</p>
            <p className="tabular mt-2 text-4xl font-semibold tracking-tight">62,5 kg</p>
            <ProgressBar value={3} max={4} label="Séries do exercício" className="mt-5 bg-maastricht-hi" />
          </Card>
        </div>
      </Section>

      <Section title="Status" description="O significado nunca depende só da cor: o texto sempre aparece.">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(contactStatus).map(([k, v]) => (
            <Badge key={k} tone={v.tone} dot>
              {v.label}
            </Badge>
          ))}
          {Object.entries(linkStatus).map(([k, v]) => (
            <Badge key={k} tone={v.tone} dot>
              {v.label}
            </Badge>
          ))}
          {Object.entries(planStatus).map(([k, v]) => (
            <Badge key={k} tone={v.tone} dot>
              {v.label}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Feedback" description="Erros dizem o que houve e como resolver. Estados vazios indicam o próximo passo.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Alert tone="success" title="Convite enviado">
              Compartilhe o link com o aluno. Ele vale por 14 dias.
            </Alert>
            <Alert tone="warning" title="Perfil público sem área de atendimento">
              Adicione ao menos uma área para aparecer na busca.
            </Alert>
            <Alert tone="danger" title="Sessão expirada">
              Entre de novo para continuar. Seus treinos não foram perdidos.
            </Alert>
            <div className="space-y-2 rounded-lg border border-line-soft bg-surface p-4" aria-busy="true">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
          <EmptyState
            icon={<Users className="size-5" aria-hidden="true" />}
            title="Você ainda não tem alunos"
            description="Convide o primeiro aluno e atribua um treino a ele."
            action={<Button>Convidar aluno</Button>}
          />
        </div>
      </Section>

      <Section title="Tabela e paginação" description="Rolagem horizontal em telas estreitas; a página atual vem da URL.">
        <div className="space-y-4">
          <Table caption="Alunos de exemplo">
            <thead>
              <tr>
                <Th>Aluno</Th>
                <Th>Vínculo</Th>
                <Th>Treino atual</Th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_ROWS.map((r) => (
                <Tr key={r.name}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={r.name} size="sm" />
                      <span className="font-medium">{r.name}</span>
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={linkStatus[r.status].tone} dot>
                      {linkStatus[r.status].label}
                    </Badge>
                  </Td>
                  <Td className="text-ink-2">{r.plan}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={2} pageCount={5} hrefFor={(p) => `/styleguide?page=${p}`} />
        </div>
      </Section>

      <Section title="Estado vazio com ícone" description="Mesmo padrão para exercícios, treinos e solicitações.">
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={<Dumbbell className="size-5" aria-hidden="true" />}
            title="Nenhum treino criado"
            description="Monte um treino com exercícios da biblioteca e publique para atribuir."
            action={<Button>Criar treino</Button>}
          />
          <EmptyState
            icon={<Inbox className="size-5" aria-hidden="true" />}
            title="Nenhuma solicitação"
            description="Ative seu perfil público para ser encontrado por novos alunos."
            action={<Button variant="outline">Configurar perfil</Button>}
          />
        </div>
      </Section>
    </main>
  )
}
