import type { Metadata } from 'next'
import { ResetPasswordForm } from '../forms'

export const metadata: Metadata = { title: 'Nova senha' }

export default function RedefinirSenhaPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Criar nova senha</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Escolha uma senha que você ainda não usa em outros lugares.</p>
      <ResetPasswordForm />
    </>
  )
}
