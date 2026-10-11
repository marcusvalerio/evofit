import type { Metadata } from 'next'
import { Alert } from '@/components/ui/feedback'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { SignUpForm } from '../forms'

export const metadata: Metadata = { title: 'Criar conta' }

export default function CadastroPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Criar conta</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Leva menos de um minuto.</p>
      <div className="flex flex-col gap-5">
        {!getSupabaseEnv() && (
          <Alert tone="warning" title="Conexão pendente">
            O banco de dados ainda não foi configurado neste ambiente.
          </Alert>
        )}
        <SignUpForm />
      </div>
    </>
  )
}
