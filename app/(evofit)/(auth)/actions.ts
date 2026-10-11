'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl, getSupabaseEnv } from '@/lib/supabase/env'
import {
  fieldErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from '@/lib/auth/schemas'
import { destinationFor } from '@/lib/auth/redirect'

export type FormState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  errors?: FieldErrors
  /** Valores devolvidos para repovoar o formulário (nunca a senha). */
  values?: Record<string, string>
}

const NOT_CONFIGURED: FormState = {
  status: 'error',
  message: 'O EVOFIT ainda não está conectado ao banco de dados. Avise o responsável pelo sistema.',
}

const GENERIC_ERROR = 'Não foi possível concluir agora. Tente novamente em instantes.'

function text(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v : ''
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED
  const input = { email: text(formData, 'email'), password: text(formData, 'password') }
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', errors: fieldErrors(parsed.error), values: { email: input.email } }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error || !data.user) {
    // E-mail inexistente e senha errada recebem a MESMA resposta (sem enumeração de contas).
    const unconfirmed = error?.code === 'email_not_confirmed'
    const limited = error?.status === 429 || error?.code === 'over_request_rate_limit'
    return {
      status: 'error',
      message: unconfirmed
        ? 'Confirme seu e-mail antes de entrar. Procure a mensagem de confirmação na sua caixa de entrada.'
        : limited
          ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
          : 'E-mail ou senha incorretos.',
      values: { email: parsed.data.email },
    }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  redirect(destinationFor(profile?.role, text(formData, 'next')))
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED
  const input = {
    fullName: text(formData, 'fullName'),
    email: text(formData, 'email'),
    password: text(formData, 'password'),
    role: text(formData, 'role'),
  }
  const values = { fullName: input.fullName, email: input.email, role: input.role }
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error), values }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // O banco (gatilho handle_new_user) só aceita 'trainer' ou 'student'; qualquer outro vira 'student'.
      data: { full_name: parsed.data.fullName, role: parsed.data.role },
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/inicio`,
    },
  })

  if (error) {
    const weak = error.code === 'weak_password'
    const limited = error.status === 429 || error.code === 'over_email_send_rate_limit'
    return {
      status: 'error',
      message: weak
        ? 'Essa senha é fraca demais. Escolha outra, mais longa e menos previsível.'
        : limited
          ? 'Muitos cadastros em pouco tempo. Aguarde alguns minutos e tente de novo.'
          : GENERIC_ERROR,
      values,
    }
  }

  // Confirmação de e-mail desligada no projeto: já há sessão.
  if (data.session) redirect('/inicio')

  // Com confirmação ligada, a resposta é a mesma para e-mail novo ou já cadastrado.
  return {
    status: 'success',
    message: 'Quase lá! Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e toque no link para ativar a conta.',
  }
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED
  const input = { email: text(formData, 'email') }
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error), values: input }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/redefinir-senha`,
  })

  if (error && (error.status === 429 || error.code === 'over_email_send_rate_limit')) {
    return { status: 'error', message: 'Você pediu muitos e-mails em pouco tempo. Aguarde alguns minutos e tente de novo.', values: input }
  }

  // Mesma resposta exista ou não a conta: não revela quais e-mails estão cadastrados.
  return {
    status: 'success',
    message: 'Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.',
  }
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED
  const parsed = resetPasswordSchema.safeParse({ password: text(formData, 'password'), confirm: text(formData, 'confirm') })
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { status: 'error', message: 'O link expirou ou já foi usado. Peça um novo link de recuperação.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return {
      status: 'error',
      message:
        error.code === 'same_password'
          ? 'A nova senha precisa ser diferente da atual.'
          : error.code === 'weak_password'
            ? 'Essa senha é fraca demais. Escolha outra, mais longa e menos previsível.'
            : GENERIC_ERROR,
    }
  }

  redirect('/inicio')
}

export async function signOutAction(): Promise<void> {
  if (getSupabaseEnv()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/entrar')
}
