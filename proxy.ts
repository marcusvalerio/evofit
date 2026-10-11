import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from '@/lib/supabase/env'

/**
 * Proxy do EVOFIT (antigo "middleware"). Faz duas coisas:
 *   1. Renova a sessão do Supabase e regrava os cookies na resposta.
 *   2. Checagem OTIMISTA de rotas privadas: sem sessão, redireciona ao login.
 *
 * NÃO é a barreira de segurança. A autorização real acontece em cada página/action
 * (requireRole → getUser no servidor de autenticação) e, por último, na RLS do banco.
 *
 * O matcher abaixo evita rodar no app EVO legado ("/") e em arquivos estáticos.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const isPrivate =
    pathname === '/studio' || pathname.startsWith('/studio/') || pathname === '/aluno' || pathname.startsWith('/aluno/')

  const env = getSupabaseEnv()
  if (!env) {
    // Sem configuração não há sessão possível: áreas privadas levam ao login, que explica.
    if (isPrivate) return NextResponse.redirect(new URL('/entrar', request.url))
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of list) response.cookies.set(name, value, options)
      },
    },
  })

  // getClaims valida a assinatura do JWT (e renova se expirado). Não confie em getSession aqui.
  const { data } = await supabase.auth.getClaims()
  const authenticated = Boolean(data?.claims)

  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target)
    // Preserva os cookies de sessão renovados.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }

  if (isPrivate && !authenticated) {
    const url = new URL('/entrar', request.url)
    url.searchParams.set('next', pathname + search)
    url.searchParams.set('motivo', 'sessao')
    return redirectTo(url)
  }

  if (authenticated && (pathname === '/entrar' || pathname === '/cadastro')) {
    return redirectTo(new URL('/inicio', request.url))
  }

  return response
}

export const config = {
  matcher: ['/studio/:path*', '/aluno/:path*', '/entrar', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/inicio', '/auth/:path*'],
}
