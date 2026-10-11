import type { Metadata } from 'next'
import { ForgotPasswordForm } from '../forms'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function RecuperarSenhaPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Recuperar senha</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Enviaremos um link para você criar uma nova senha.</p>
      <ForgotPasswordForm />
    </>
  )
}
