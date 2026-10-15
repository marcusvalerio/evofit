"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useDemoState } from "@/lib/store"
import { LoadingScreen } from "./ui"

/**
 * Sem demonstração, o Studio e o app do aluno exigem login: quem chega sem conta vai para
 * /entrar e volta para a mesma tela depois de entrar.
 */
export function useLoginGate() {
  const { mode } = useDemoState()
  const path = usePathname()
  useEffect(() => {
    if (mode === "guest") window.location.replace(`/entrar?next=${encodeURIComponent(path)}`)
  }, [mode, path])
  return mode === "guest"
}

export const GateScreen = () => <LoadingScreen label="Abrindo o login" />
