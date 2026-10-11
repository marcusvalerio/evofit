import { z } from 'zod'

/**
 * Validação dos formulários de autenticação. Roda no SERVIDOR (server actions); o HTML do
 * formulário só ajuda a experiência, nunca é a barreira de segurança.
 */

export const emailSchema = z
  .string({ error: 'Informe seu e-mail.' })
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail.')
  .max(254, 'E-mail muito longo.')
  .pipe(z.email('Informe um e-mail válido.'))

// 72 bytes é o limite do bcrypt usado pelo Supabase Auth; acima disso a senha seria truncada.
export const passwordSchema = z
  .string({ error: 'Informe uma senha.' })
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'A senha é longa demais (máximo de 72 caracteres).')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letras e números na senha.')

// Só estes dois papéis existem no cadastro. O papel não dá acesso a dados de ninguém:
// o banco ainda exige vínculo aceito pelo aluno (ver migração 0002).
export const signUpRoleSchema = z.enum(['trainer', 'student'], { error: 'Escolha como você vai usar o EVOFIT.' })

export const fullNameSchema = z
  .string({ error: 'Informe seu nome.' })
  .trim()
  .min(2, 'Informe seu nome completo.')
  .max(120, 'Nome muito longo.')

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: signUpRoleSchema,
})

export const signInSchema = z.object({
  email: emailSchema,
  // No login não revelamos regras de senha: só exigimos que exista.
  password: z.string({ error: 'Informe sua senha.' }).min(1, 'Informe sua senha.').max(200),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string({ error: 'Confirme a senha.' }),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não coincidem.' })

export type FieldErrors = Record<string, string | undefined>

/** Achata os erros do Zod em { campo: primeira mensagem }. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
