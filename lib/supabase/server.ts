import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv, SupabaseConfigError } from './env'

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies), portanto a RLS do banco vale em todas as consultas.
 */
export async function createClient() {
  const env = getSupabaseEnv()
  if (!env) throw new SupabaseConfigError()
  const cookieStore = await cookies()

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options)
        } catch {
          // Chamado a partir de um Server Component (cookies somente leitura). Sem problema:
          // o proxy renova a sessão e grava os cookies na resposta.
        }
      },
    },
  })
}
