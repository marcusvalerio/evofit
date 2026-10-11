import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'
import { homeFor } from '@/lib/auth/redirect'

// Resolve o papel no servidor e leva cada pessoa à própria área.
export default async function InicioPage() {
  const session = await getSessionProfile()
  redirect(session ? homeFor(session.role) : '/entrar')
}
