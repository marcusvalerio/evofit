"use client"
import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { FlaskConical, Monitor, Moon, RotateCcw, Sun, TriangleAlert, X } from "lucide-react"
import { dismissNotice, resetDemo, useDemoState } from "@/lib/store"
import { ConfirmDialog, cx } from "./ui"
import { useToast } from "./providers"

export function Brand({ className, suffix }: { className?: string; suffix?: string }) {
  return (
    <Link href="/" className={cx("inline-flex items-baseline gap-1.5 rounded-md", className)} aria-label="EVOFIT — início">
      <span className="t-brand text-xl leading-none">
        EVO<span className="text-accent">FIT</span>
      </span>
      {suffix && <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{suffix}</span>}
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

/** Faixa fixa que identifica o modo demonstração e permite restaurar os dados. */
export function DemoBanner() {
  const { notice, persistError } = useDemoState()
  const [confirm, setConfirm] = useState(false)
  const toast = useToast()
  return (
    <>
      <div className="border-b border-line bg-inverse text-on-inverse">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 text-[0.8125rem]">
          <FlaskConical size={15} aria-hidden className="shrink-0" />
          <p className="min-w-0 flex-1 truncate">
            <strong className="font-semibold">Modo demonstração</strong>
            <span className="opacity-80"> · dados fictícios salvos apenas neste navegador</span>
          </p>
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
