"use client"
import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Check, CloudOff, FlaskConical, LogIn, LogOut, Monitor, Moon, RotateCcw, Sun, TriangleAlert, UserRound, X } from "lucide-react"
import { dismissNotice, resetDemo, retryLoad, useDemoState } from "@/lib/store"
import { logout } from "@/lib/account-client"
import { ConfirmDialog, cx } from "./ui"
import { useToast } from "./providers"

/**
 * Símbolo EVOFIT: pico facetado — a face Gravy sobe devagar, a face Ōtan é o esforço.
 * Vem do cartão da paleta MP020 e do motivo do hero. Funciona de 16 px (favicon) ao hero.
 */
export function BrandMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cx("shrink-0", className)} aria-hidden>
      <path d="M14.5 3 2 21h12.5Z" fill="var(--mp-gravy)" />
      <path d="M14.5 3 22 21h-7.5Z" fill="var(--mp-otan)" />
    </svg>
  )
}

export function Brand({ className, suffix }: { className?: string; suffix?: string }) {
  return (
    <Link href="/" className={cx("inline-flex items-center gap-2 rounded-md", className)} aria-label="EVOFIT — início">
      <BrandMark />
      <span className="t-brand text-[1.4375rem] leading-none text-fg">evofit</span>
      {suffix && <span className="ml-0.5 rounded-full border border-line px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">{suffix}</span>}
    </Link>
  )
}

type ThemePref = "system" | "light" | "dark"
const THEME_KEY = "evofit:theme"

function readTheme(): ThemePref {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === "light" || t === "dark" ? t : "system"
  } catch {
    return "system"
  }
}
const themeListeners = new Set<() => void>()
function subscribeTheme(l: () => void) {
  themeListeners.add(l)
  return () => themeListeners.delete(l)
}

export function ThemeToggle({ className }: { className?: string }) {
  const pref = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as ThemePref)
  const next: Record<ThemePref, ThemePref> = { system: "light", light: "dark", dark: "system" }
  const label = { system: "Tema: automático", light: "Tema: claro", dark: "Tema: escuro" }[pref]
  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor
  return (
    <button
      type="button"
      className={cx("btn btn-ghost btn-icon btn-sm", className)}
      aria-label={`${label}. Alternar tema`}
      title={label}
      onClick={() => {
        const n = next[pref]
        if (n === "system") delete document.documentElement.dataset.theme
        else document.documentElement.dataset.theme = n
        try {
          if (n === "system") localStorage.removeItem(THEME_KEY)
          else localStorage.setItem(THEME_KEY, n)
        } catch {}
        themeListeners.forEach((l) => l())
      }}
    >
      <Icon size={18} />
    </button>
  )
}

/** Faixa superior: identifica o modo demonstração ou a conta logada (com o estado de salvamento). */
export function DemoBanner() {
  const st = useDemoState()
  if (st.mode === "account") return <AccountBar />
  if (st.mode === "offline")
    return (
      <div role="alert" className="border-b border-line bg-warning-soft">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm">
          <CloudOff size={16} aria-hidden className="shrink-0 text-warning" />
          <p className="flex-1">Não foi possível carregar sua conta. Verifique a conexão.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={retryLoad}>
            Tentar de novo
          </button>
        </div>
      </div>
    )
  return <DemoStrip />
}

function AccountBar() {
  const { account, sync, syncError, queued } = useDemoState()
  const [busy, setBusy] = useState(false)
  return (
    <>
      <div className="border-b border-line bg-ink text-on-ink">
        <div className="mx-auto flex min-h-10 max-w-7xl items-center gap-2 px-3 py-1 text-xs sm:gap-3 sm:px-4 sm:py-1.5 sm:text-[0.8125rem]">
          <UserRound size={15} aria-hidden className="shrink-0" />
          <p className="min-w-0 flex-1 truncate">
            <strong className="font-semibold">{account?.role === "student" ? "Conta de aluno" : "Conta de personal"}</strong>
            <span className="opacity-80"> · {account?.email}</span>
          </p>
          <span className={cx("items-center gap-1 opacity-80", sync === "offline" ? "inline-flex" : "hidden sm:inline-flex")} aria-live="polite">
            {sync === "offline" ? (
              <>
                <CloudOff size={14} aria-hidden /> Sem internet{queued > 0 ? ` · ${queued} ${queued === 1 ? "alteração guardada" : "alterações guardadas"}` : ""}
              </>
            ) : sync === "saving" ? (
              <>
                <span className="spinner" aria-hidden /> Salvando…
              </>
            ) : sync === "idle" ? (
              <>
                <Check size={14} aria-hidden /> Salvo
              </>
            ) : null}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await logout()
            }}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 font-semibold hover:bg-white/10 sm:gap-1.5 sm:px-2.5"
          >
            <LogOut size={14} aria-hidden /> Sair
          </button>
        </div>
      </div>
      {syncError && (
        <div role="alert" className="border-b border-line bg-danger-soft">
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2 text-sm text-fg">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <p className="flex-1">{syncError}</p>
            <button type="button" onClick={dismissNotice} className="btn btn-ghost btn-icon btn-sm -my-1" aria-label="Dispensar aviso">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function DemoStrip() {
  const { notice, persistError } = useDemoState()
  const [confirm, setConfirm] = useState(false)
  const toast = useToast()
  return (
    <>
      <div className="border-b border-line bg-ink text-on-ink">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 text-[0.8125rem]">
          <FlaskConical size={15} aria-hidden className="shrink-0" />
          <p className="min-w-0 flex-1 truncate">
            <strong className="font-semibold">Modo demonstração</strong>
            <span className="hidden opacity-80 sm:inline"> · dados fictícios salvos apenas neste navegador</span>
          </p>
          <Link href="/entrar" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 font-semibold hover:bg-white/10 sm:gap-1.5 sm:px-2.5">
            <LogIn size={14} aria-hidden /> Entrar
          </Link>
          <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 font-semibold hover:bg-white/10">
            <RotateCcw size={14} aria-hidden />
            <span>Restaurar</span>
            <span className="sr-only"> dados de demonstração</span>
          </button>
        </div>
      </div>
      {(notice || persistError) && (
        <div role="alert" className="border-b border-line bg-warning-soft">
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2 text-sm text-fg">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <p className="flex-1">
              {persistError
                ? "Este navegador não permitiu salvar dados (modo privado ou armazenamento cheio). As alterações valem só até recarregar a página."
                : notice}
            </p>
            {notice && !persistError && (
              <button type="button" onClick={dismissNotice} className="btn btn-ghost btn-icon btn-sm -my-1" aria-label="Dispensar aviso">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Restaurar demonstração?"
        message="Alunos, fichas, sessões, perfil e solicitações voltam ao estado inicial. Tudo o que você alterou neste navegador será apagado."
        confirmLabel="Restaurar dados"
        danger
        onConfirm={() => {
          resetDemo()
          toast("Demonstração restaurada para o estado inicial.")
        }}
      />
    </>
  )
}
