'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Alert } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type FormState,
} from './actions'

const idle: FormState = { status: 'idle' }
const linkClass =
  'rounded-sm font-medium text-portland-ink underline decoration-portland-ink/30 underline-offset-4 hover:decoration-portland-ink'

function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null
  return <Alert tone={state.status === 'success' ? 'success' : 'danger'}>{state.message}</Alert>
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, idle)
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <Field label="E-mail" error={state.errors?.email} required>
        {(p) => (
          <Input {...p} name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state.values?.email} autoFocus />
        )}
      </Field>
      <Field label="Senha" error={state.errors?.password} required>
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
      <div className="flex flex-col items-center gap-2 text-sm text-ink-2">
        <Link href="/recuperar-senha" className={linkClass}>
          Esqueci minha senha
        </Link>
        <span>
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className={linkClass}>
            Criar conta
          </Link>
        </span>
      </div>
    </form>
  )
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, idle)

  if (state.status === 'success') {
    return (
      <div className="flex flex-col gap-5">
        <Alert tone="success" title="Confira seu e-mail">
          {state.message}
        </Alert>
        <Link href="/entrar" className={`${linkClass} text-center text-sm`}>
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">
          Como você vai usar o EVOFIT? <span className="text-danger" aria-hidden="true">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'trainer', title: 'Sou personal', hint: 'Gerencio alunos e treinos' },
            { value: 'student', title: 'Sou aluno', hint: 'Executo meus treinos' },
          ].map((o) => (
            <label
              key={o.value}
              className="relative flex cursor-pointer flex-col gap-0.5 rounded-md border border-line-strong p-3.5 text-sm transition-colors hover:border-maastricht has-[:checked]:border-maastricht has-[:checked]:bg-gainsboro-soft has-[:checked]:shadow-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-maastricht"
            >
              <input
                type="radio"
                name="role"
                value={o.value}
                defaultChecked={(state.values?.role ?? 'trainer') === o.value}
                className="sr-only"
              />
              <span className="font-semibold text-ink">{o.title}</span>
              <span className="text-ink-3">{o.hint}</span>
            </label>
          ))}
        </div>
        {state.errors?.role && (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.errors.role}
          </p>
        )}
      </fieldset>
      <Field label="Nome completo" error={state.errors?.fullName} required>
        {(p) => <Input {...p} name="fullName" autoComplete="name" defaultValue={state.values?.fullName} />}
      </Field>
      <Field label="E-mail" error={state.errors?.email} required>
        {(p) => (
          <Input {...p} name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state.values?.email} />
        )}
      </Field>
      <Field label="Senha" hint="Pelo menos 8 caracteres, com letras e números." error={state.errors?.password} required>
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        {pending ? 'Criando conta…' : 'Criar conta'}
      </Button>
      <p className="text-center text-sm text-ink-2">
        Já tem conta?{' '}
        <Link href="/entrar" className={linkClass}>
          Entrar
        </Link>
      </p>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, idle)

  if (state.status === 'success') {
    return (
      <div className="flex flex-col gap-5">
        <Alert tone="success" title="Verifique seu e-mail">
          {state.message}
        </Alert>
        <Link href="/entrar" className={`${linkClass} text-center text-sm`}>
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <Field label="E-mail da sua conta" error={state.errors?.email} required>
        {(p) => (
          <Input {...p} name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state.values?.email} autoFocus />
        )}
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        {pending ? 'Enviando…' : 'Enviar link de recuperação'}
      </Button>
      <Link href="/entrar" className={`${linkClass} text-center text-sm`}>
        Voltar para o login
      </Link>
    </form>
  )
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, idle)
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <Field label="Nova senha" hint="Pelo menos 8 caracteres, com letras e números." error={state.errors?.password} required>
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" autoFocus />}
      </Field>
      <Field label="Confirmar nova senha" error={state.errors?.confirm} required>
        {(p) => <Input {...p} name="confirm" type="password" autoComplete="new-password" />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        {pending ? 'Salvando…' : 'Salvar nova senha'}
      </Button>
      {state.status === 'error' && state.message?.includes('expirou') && (
        <Link href="/recuperar-senha" className={`${linkClass} text-center text-sm`}>
          Pedir novo link
        </Link>
      )}
    </form>
  )
}
