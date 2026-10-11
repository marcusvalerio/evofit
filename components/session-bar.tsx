import { LogOut } from 'lucide-react'
import { signOutAction } from '@/app/(evofit)/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/ui/wordmark'

/** Barra superior das áreas autenticadas: identidade + sair. */
export function SessionBar({ name, roleLabel }: { name: string; roleLabel: string }) {
  return (
    <header className="border-b border-line-soft bg-surface">
      <div className="mx-auto flex h-14 max-w-(--container-page) items-center justify-between gap-4 px-4">
        <span className="text-xl text-maastricht">
          <Wordmark />
        </span>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="text-xs text-ink-3">{roleLabel}</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm" aria-label="Sair da conta">
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
