import { cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { homeFor, isAppRole, safeNext, type AppRole } from './redirect'

export type SessionProfile = {
  userId: string
  email: string | null
  role: AppRole
  fullName: string
}

/**
 * Usuário autenticado + perfil, verificado no SERVIDOR DE AUTENTICAÇÃO (getUser), não só
 * pela leitura do cookie. É a fonte de verdade para telas e actions.
 * Retorna null se não houver sessão válida, se o Supabase não estiver configurado ou se
 * o usuário não tiver perfil.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  // Sessão é sempre por requisição. Sem isto, um build SEM variáveis de ambiente (CI, por
  // exemplo) pré-renderizaria o redirecionamento ao login como página estática, e ela seria
  // servida a todos, inclusive a quem está logado.
  await connection()
  if (!getSupabaseEnv()) return null
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!profile || !isAppRole(profile.role)) return null

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    role: profile.role,
    fullName: String(profile.full_name),
  }
})

/**
 * Exige sessão e papel. Sem sessão: vai ao login guardando o destino. Papel errado:
 * volta à área do próprio papel (nunca mostra a tela de outro papel).
 */
export async function requireRole(role: AppRole, currentPath: string): Promise<SessionProfile> {
  const session = await getSessionProfile()
  if (!session) {
    redirect(`/entrar?next=${encodeURIComponent(safeNext(currentPath, homeFor(role)))}`)
  }
  if (session.role !== role) redirect(homeFor(session.role))
  return session
}
