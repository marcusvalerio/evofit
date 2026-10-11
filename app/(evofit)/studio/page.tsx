import type { Metadata } from 'next'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { SessionBar } from '@/components/session-bar'
import { requireRole } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Studio' }

export default async function StudioPage() {
  const session = await requireRole('trainer', '/studio')
  const firstName = session.fullName.split(' ')[0]

  return (
    <>
      <SessionBar name={session.fullName} roleLabel="Personal" />
      <main className="mx-auto max-w-(--container-page) px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Olá, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-2">Seu painel de personal.</p>
        <Card className="mt-6">
          <EmptyState
            title="Seu painel está sendo montado"
            description="Alunos, biblioteca de exercícios, treinos e solicitações de contato chegam nas próximas etapas. Sua conta já está ativa e segura."
          />
        </Card>
      </main>
    </>
  )
}
