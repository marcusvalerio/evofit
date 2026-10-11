import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { safeNext } from '@/lib/auth/redirect'

// Só os tipos usados pelos e-mails do EVOFIT. Os demais (invite, magiclink, email_change)
// não fazem parte do produto e ficam recusados.
const ALLOWED: readonly EmailOtpType[] = ['signup', 'email', 'recovery']

/**
 * Destino dos links enviados por e-mail (confirmação de cadastro e recuperação de senha).
 * Troca o token por uma sessão e segue para um destino interno validado (sem open redirect).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'), '/inicio')

  const invalid = () => {
    const url = new URL('/entrar', request.url)
    url.searchParams.set('erro', 'link')
    return NextResponse.redirect(url)
  }

  if (!getSupabaseEnv() || !tokenHash || !type || !ALLOWED.includes(type)) return invalid()

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) return invalid()

  // Recuperação de senha só pode terminar na tela de nova senha, qualquer que seja o "next".
  const destination = type === 'recovery' ? '/redefinir-senha' : next
  return NextResponse.redirect(new URL(destination, request.url))
}
