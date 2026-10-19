"use client"
import { useEffect, useId, useRef } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { CountUp } from "./motion"

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ")
}

/* ---------- Campos ---------- */

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode
  className?: string
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Foco automático só com teclado físico/mouse. No celular, abrir o teclado sozinho ao mostrar uma
 * janela empurra a tela e, em alguns iPhones, deixa a janela achatada.
 */
export function autoFocusOk() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
}

/**
 * Depois de um envio com erro, leva a tela até o primeiro campo inválido e o foca. Sem isso, no
 * celular o erro pode ficar fora da tela e parece que o botão "não fez nada".
 */
export function revealFirstError(root: ParentNode = document) {
  requestAnimationFrame(() => {
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!el) return
    el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
    el.focus({ preventScroll: true })
  })
}

/* ---------- Modal ---------- */

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
  /** Janela pequena (confirmação). As demais viram tela cheia no celular, como uma página. */
  compact?: boolean
}

export function Modal({ open, onClose, title, description, children, footer, wide, compact }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    // iOS anterior ao 15.4 não tem <dialog>: abre como bloco fixo na tela, sem quebrar
    if (open && !d.open) {
      if (typeof d.showModal === "function") d.showModal()
      else d.setAttribute("open", "")
    }
    if (!open && d.open) {
      if (typeof d.close === "function") d.close()
      else d.removeAttribute("open")
    }
  }, [open])
  // Altura máxima pela área realmente visível. No iPhone, as unidades de viewport (dvh) podem
  // ficar presas no tamanho com teclado aberto e a janela "não sobe"; o visualViewport é atualizado
  // sempre que o teclado abre/fecha ou a barra do navegador muda.
  useEffect(() => {
    const d = ref.current
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!open || !d || !vv) return
    // Com o teclado aberto o iOS também rola a área visível (offsetTop > 0): sem acompanhar esse
    // deslocamento, a janela fica alta demais e sobra um vão entre os botões e o teclado.
    const sync = () => {
      d.style.setProperty("--sheet-max", `${Math.round(vv.height * 0.92)}px`)
      d.style.setProperty("--sheet-full", `${Math.round(vv.height)}px`)
      d.style.setProperty("--sheet-top", `${Math.round(vv.offsetTop)}px`)
      d.style.setProperty("--sheet-bottom", `${Math.max(0, Math.round(window.innerHeight - vv.offsetTop - vv.height))}px`)
    }
    sync()
    vv.addEventListener("resize", sync)
    vv.addEventListener("scroll", sync)
    window.addEventListener("orientationchange", sync)
    return () => {
      vv.removeEventListener("resize", sync)
      vv.removeEventListener("scroll", sync)
      window.removeEventListener("orientationchange", sync)
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      className={cx("dialog", !compact && "dialog-page", wide && "sm:!w-[min(100%-2rem,46rem)]")}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <>
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="t-h2">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" className="btn btn-ghost btn-icon btn-sm -mr-2" onClick={onClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </header>
          <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer && <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal
      compact
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={cx("btn", danger ? "btn-inverse" : "btn-primary")}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[0.9375rem] leading-relaxed text-muted">{message}</div>
    </Modal>
  )
}

/* ---------- Estados ---------- */

export function EmptyState({ icon: Icon, title, children, action }: { icon: React.ElementType; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface text-muted">
        <Icon size={22} aria-hidden />
      </div>
      <h3 className="t-h2">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Esqueleto de carregamento. Fica dentro do <main> já com padding (sem padding próprio) e copia
 * as medidas do PageHeader — título na altura de linha do t-h1, descrição, botão de ação —, para
 * que o conteúdo real entre no mesmo lugar, sem pulo de layout.
 */
export function LoadingScreen({ label = "Carregando", action = true }: { label?: string; action?: boolean }) {
  const line = "flex h-[1.5em] items-center"
  return (
    <div role="status" aria-label={label}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="t-h1">
            <div className="skeleton h-[1.1em] w-48 max-w-full" />
          </div>
          <div className="mt-1 text-[0.9375rem]">
            <div className={line}>
              <div className="skeleton h-[0.9em] w-full max-w-md" />
            </div>
            <div className={cx(line, "sm:hidden")}>
              <div className="skeleton h-[0.9em] w-2/3" />
            </div>
          </div>
        </div>
        {action && <div className="skeleton h-11 w-40 shrink-0" />}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton mt-4 h-64" />
      <span className="sr-only">{label}…</span>
    </div>
  )
}

export function NotFoundState({ title, children, href, cta }: { title: string; children: React.ReactNode; href: string; cta: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="t-eyebrow">Não encontrado</p>
      <h1 className="t-h1 mt-2">{title}</h1>
      <p className="mt-2 text-muted">{children}</p>
      <Link href={href} className="btn btn-primary mt-6">
        {cta}
      </Link>
    </div>
  )
}

/* ---------- Layout ---------- */

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="fade-in mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="t-eyebrow mb-1">{eyebrow}</p>}
        <h1 className="t-h1">{title}</h1>
        {description && <p className="mt-1 text-[0.9375rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, unit, hint, tone }: { label: string; value: string; unit?: string; hint?: React.ReactNode; tone?: "accent" | "warning" }) {
  return (
    <div className="card lift p-4">
      <p className="t-eyebrow">{label}</p>
      <p className={cx("t-metric mt-3", tone === "accent" && "text-accent", tone === "warning" && "text-warning")}>
        <CountUp text={value} />
        {unit && <span className="ml-1 text-base font-semibold tracking-normal text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function Progress({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  )
}

const ACCENT_BG: Record<string, string> = {
  otan: "bg-brand-otan text-brand-cobblestone",
  gravy: "bg-brand-gravy text-brand-cotton",
  cobblestone: "bg-brand-cobblestone text-brand-cotton",
  smoke: "bg-brand-smoke text-brand-cotton",
}

export function Avatar({ name, accent = "smoke", size = "md" }: { name: string; accent?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
  const s = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" }[size]
  return (
    <span aria-hidden className={cx("grid shrink-0 place-items-center rounded-full font-bold tracking-tight", s, ACCENT_BG[accent] ?? ACCENT_BG.smoke)}>
      {initials || "?"}
    </span>
  )
}
