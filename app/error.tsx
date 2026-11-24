"use client"
import { useEffect } from "react"
import Link from "next/link"
import { resetDemo } from "@/lib/store"
import { useDemoEnabled } from "@/components/providers"
import { reportError } from "@/components/error-reporter"
import { BrandMark } from "@/components/chrome"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const demo = useDemoEnabled()
  useEffect(() => {
    console.error(error)
    reportError(error.message, error.stack ?? "")
  }, [error])
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <BrandMark size={72} className="mx-auto mb-6 opacity-40" />
      <p className="t-eyebrow">Algo deu errado</p>
      <h1 className="t-h1 mt-2">Não foi possível exibir esta tela</h1>
      <p className="mt-2 text-muted">{demo ? "Tente novamente. Se o problema continuar, restaure os dados de demonstração." : "Tente novamente. Se o problema continuar, recarregue a página."}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Tentar novamente
        </button>
        {demo && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            resetDemo()
            reset()
          }}
        >
          Restaurar demonstração
        </button>
        )}
        <Link href="/" className="btn btn-ghost">
          Início
        </Link>
      </div>
    </div>
  )
}
