import type { Metadata } from 'next'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { SessionBar } from '@/components/session-bar'
import { requireRole } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Meus treinos' }

export default async function AlunoPage() {
  const session = await requireRole('student', '/aluno')
  const firstName = session.fullName.split(' ')[0]

  return (
    <>
      <SessionBar name={session.fullName} roleLabel="Aluno" />
      <main className="mx-auto max-w-(--container-app) px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Olá, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-2">Seus treinos aparecem aqui.</p>
        <Card className="mt-6">
          <EmptyState
            title="Nenhum treino ainda"
            description="Quando seu personal atribuir um treino a você, ele aparece nesta tela."
          />
        </Card>
      </main>
    </>
  )
}
