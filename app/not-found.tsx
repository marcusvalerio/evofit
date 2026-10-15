import Link from "next/link"
import { PublicShell } from "@/components/public-shell"

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="t-eyebrow">Erro 404</p>
        <h1 className="t-h1 mt-2">Página não encontrada</h1>
        <p className="mt-2 text-muted">Este endereço não existe ou mudou de lugar.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            Ir para o início
          </Link>
          <Link href="/entrar" className="btn btn-outline">
            Entrar
          </Link>
        </div>
      </div>
    </PublicShell>
  )
}
