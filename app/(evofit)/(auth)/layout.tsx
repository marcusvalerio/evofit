import Link from 'next/link'
import { Wordmark } from '@/components/ui/wordmark'

/** Moldura das telas de autenticação: foco total no formulário, sem navegação do app. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 pb-10 pt-10 sm:justify-center sm:pt-6">
      <Link href="/entrar" className="mb-8 rounded-sm text-3xl text-maastricht" aria-label="EVOFIT, ir para o login">
        <Wordmark aria-hidden />
      </Link>
      <main className="w-full max-w-[26rem] rounded-xl border border-line-soft bg-surface p-6 shadow-md sm:p-8">
        {children}
      </main>
      <p className="mt-6 max-w-[26rem] text-center text-xs text-ink-3">
        Seus dados são usados apenas para operar sua conta e seus treinos.
      </p>
    </div>
  )
}
