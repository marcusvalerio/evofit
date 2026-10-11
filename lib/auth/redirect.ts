/**
 * Destino pós-login seguro (evita open redirect).
 *
 * Aceita apenas caminhos internos ("/studio/alunos?x=1"). Rejeita URLs absolutas,
 * "//host" (protocol-relative), "/\host" (que alguns navegadores tratam como "//"),
 * esquemas como "javascript:" e caracteres de controle.
 */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (typeof raw !== 'string') return fallback
  const value = raw.trim()
  if (value.length === 0 || value.length > 500) return fallback

  // Caracteres de controle (inclui \t \n \r, que navegadores removem ao interpretar a URL).
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.includes('\\')) return fallback

  // Confirma que, resolvido contra uma origem qualquer, o destino continua nela.
  try {
    const base = 'https://evofit.invalid'
    const url = new URL(value, base)
    if (url.origin !== base) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}

/** Áreas autenticadas. Usado pelo proxy (checagem otimista) e pelos redirecionamentos. */
export const HOME_BY_ROLE = { trainer: '/studio', student: '/aluno' } as const
export type AppRole = keyof typeof HOME_BY_ROLE

export function isAppRole(v: unknown): v is AppRole {
  return v === 'trainer' || v === 'student'
}

export function homeFor(role: unknown): string {
  return isAppRole(role) ? HOME_BY_ROLE[role] : '/entrar'
}

/** O destino pedido só vale se pertencer à área do papel do usuário. */
export function destinationFor(role: unknown, next: string | null | undefined): string {
  const home = homeFor(role)
  const candidate = safeNext(next, home)
  if (!isAppRole(role)) return home
  return candidate === home || candidate.startsWith(home + '/') || candidate.startsWith(home + '?')
    ? candidate
    : home
}
