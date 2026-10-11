/**
 * Variáveis públicas do Supabase. Só a chave PUBLISHABLE/anon entra aqui: ela é segura no
 * navegador porque quem protege os dados é a RLS. A chave service_role NUNCA é lida por
 * este projeto (o app não precisa dela) e não deve ser configurada com prefixo NEXT_PUBLIC_.
 *
 * Os acessos são literais (process.env.NEXT_PUBLIC_X) de propósito: o Next só embute no
 * bundle do cliente as variáveis lidas dessa forma.
 */
export type SupabaseEnv = { url: string; key: string }

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return null
  } catch {
    return null
  }
  return { url, key }
}

export class SupabaseConfigError extends Error {
  constructor() {
    super(
      'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veja .env.example).',
    )
    this.name = 'SupabaseConfigError'
  }
}

/**
 * URL pública do site, usada nos links dos e-mails de confirmação e recuperação.
 * Nunca derivada do cabeçalho Host da requisição (poderia ser forjado para apontar o
 * link do e-mail para um domínio do atacante).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const raw = explicit ?? (vercel ? `https://${vercel}` : undefined)
  if (raw) return raw.replace(/\/+$/, '')
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'
  throw new Error('Defina NEXT_PUBLIC_SITE_URL com a URL pública do site (veja .env.example).')
}
