"use client"
import { useEffect } from "react"
import Link from "next/link"
import { resetDemo } from "@/lib/store"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="t-eyebrow">Algo deu errado</p>
      <h1 className="t-h1 mt-2">Não foi possível exibir esta tela</h1>
      <p className="mt-2 text-muted">Tente novamente. Se o problema continuar, restaure os dados de demonstração.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Tentar novamente
        </button>
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
        <Link href="/" className="btn btn-ghost">
          Início
        </Link>
      </div>
    </div>
  )
}
