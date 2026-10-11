import type { Metadata } from 'next'
import { Alert } from '@/components/ui/feedback'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { safeNext } from '@/lib/auth/redirect'
import { SignInForm } from '../forms'

export const metadata: Metadata = { title: 'Entrar' }

const NOTICES: Record<string, { tone: 'info' | 'warning'; text: string }> = {
  sessao: { tone: 'info', text: 'Sua sessão expirou ou você ainda não entrou. Entre para continuar.' },
  link: { tone: 'warning', text: 'Esse link é inválido ou já expirou. Peça um novo ou entre com sua senha.' },
}

export default async function EntrarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const pick = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const notice = NOTICES[pick('motivo') ?? pick('erro') ?? '']
  const next = pick('next') ? safeNext(pick('next'), '') : ''

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Entrar</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Acesse seu painel ou seus treinos.</p>
      <div className="flex flex-col gap-5">
        {!getSupabaseEnv() && (
          <Alert tone="warning" title="Conexão pendente">
            O banco de dados ainda não foi configurado neste ambiente.
          </Alert>
        )}
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <SignInForm next={next || undefined} />
      </div>
    </>
  )
}
