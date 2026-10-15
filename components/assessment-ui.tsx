/** Número com vírgula decimal. */
export const dec = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",")

/**
 * Variação entre medições, em tom neutro: subir ou descer peso/medida pode ser o objetivo
 * do aluno, então a interface não pinta a variação de "bom" ou "ruim".
 */
export function Delta({ value, unit, className }: { value: number; unit: string; className?: string }) {
  const v = Math.round(value * 10) / 10
  return (
    <span className={`ml-1 text-xs font-medium text-muted tabular ${className ?? ""}`}>
      {v === 0 ? "sem variação" : `${v > 0 ? "+" : "−"}${dec(Math.abs(v))} ${unit}`}
    </span>
  )
}
