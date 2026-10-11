"use client"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Field } from "./ui"

/** Moldura das telas de conta. */
export function AuthCard({ eyebrow, title, children, footer }: { eyebrow: string; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fade-in mx-auto w-full max-w-md py-4 sm:py-10">
      <p className="t-eyebrow">{eyebrow}</p>
      <h1 className="t-h1 mt-1">{title}</h1>
      <div className="card mt-6 p-5 sm:p-6">{children}</div>
      {footer && <div className="mt-5 space-y-2 text-center text-sm text-muted">{footer}</div>}
    </div>
  )
}

export function PasswordField({ value, onChange, error, label = "Senha", autoComplete, hint }: { value: string; onChange: (v: string) => void; error?: string; label?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <div className="relative">
          <input {...p} type={show ? "text" : "password"} className="input pr-12" value={value} maxLength={128} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
          <button type="button" className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      )}
    </Field>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
      {message}
    </p>
  )
}
