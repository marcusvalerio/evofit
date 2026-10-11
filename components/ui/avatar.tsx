import { cn } from '@/lib/ui/cn'

/** Iniciais a partir do nome (até duas letras). Nome vazio vira "?". */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }

/** Avatar com iniciais como alternativa quando não há imagem (ou quando ela falha). */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gainsboro font-semibold text-maastricht',
        sizes[size],
        className,
      )}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- origem dinâmica (storage); falha cai nas iniciais
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
    </span>
  )
}
