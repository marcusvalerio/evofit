import { cn } from '@/lib/ui/cn'

/**
 * Wordmark EVOFIT.
 *
 * O briefing pede Switzer Black Italic "se disponível e licenciada". Ela NÃO está neste
 * projeto (sem arquivo de fonte e sem licença verificada), então usamos Geist peso 900 com
 * inclinação por transformação. Para trocar pela Switzer: adicione o arquivo licenciado,
 * declare `--font-wordmark` em evofit.css e remova o `skew` abaixo.
 */
export function Wordmark({ className, 'aria-hidden': hidden }: { className?: string; 'aria-hidden'?: boolean }) {
  return (
    <span
      aria-label={hidden ? undefined : 'EVOFIT'}
      aria-hidden={hidden || undefined}
      className={cn('inline-block -skew-x-[9deg] font-black leading-none tracking-tight', className)}
      style={{ fontFamily: 'var(--font-wordmark, var(--font-sans))' }}
    >
      <span aria-hidden="true">EVOFIT</span>
    </span>
  )
}
