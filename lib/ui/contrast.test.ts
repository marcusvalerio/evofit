import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Acessibilidade das cores: lê os tokens direto do CSS (fonte única de verdade) e
 * confere a razão de contraste WCAG 2.x dos pares de texto/fundo usados nos componentes.
 */
const css = readFileSync(join(process.cwd(), 'app/(evofit)/evofit.css'), 'utf8')

function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`token --color-${name} não encontrado`)
  return m[1]
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// [texto, fundo, mínimo, onde é usado]
const AA_TEXT = 4.5
const AA_UI = 3
const pairs: Array<[string, string, number, string]> = [
  ['ink', 'paper', AA_TEXT, 'texto principal na página'],
  ['ink', 'surface', AA_TEXT, 'texto principal em cards'],
  ['ink-2', 'paper', AA_TEXT, 'texto secundário na página'],
  ['ink-2', 'surface', AA_TEXT, 'texto secundário em cards'],
  ['ink-3', 'paper', AA_TEXT, 'texto de apoio na página'],
  ['ink-3', 'surface', AA_TEXT, 'texto de apoio em cards'],
  ['ink', 'portland', AA_TEXT, 'rótulo do botão primário (laranja)'],
  ['ink', 'portland-hi', AA_TEXT, 'botão primário em hover'],
  ['paper', 'maastricht', AA_TEXT, 'botão secundário e navegação escura'],
  ['gainsboro', 'maastricht', AA_TEXT, 'texto secundário sobre Maastricht'],
  ['paper', 'maastricht-lo', AA_TEXT, 'tela de execução do treino'],
  ['portland', 'maastricht', AA_UI, 'destaque laranja sobre Maastricht (elemento gráfico/texto grande)'],
  ['portland', 'maastricht-lo', AA_UI, 'destaque laranja sobre fundo profundo'],
  ['portland-ink', 'paper', AA_TEXT, 'links e destaques em texto sobre a página'],
  ['portland-ink', 'surface', AA_TEXT, 'links e destaques em texto sobre cards'],
  ['portland-ink', 'portland-wash', AA_TEXT, 'texto de destaque sobre fundo suave'],
  ['success', 'success-wash', AA_TEXT, 'status positivo'],
  ['danger', 'danger-wash', AA_TEXT, 'erros'],
  ['warning', 'warning-wash', AA_TEXT, 'avisos'],
  ['danger', 'surface', AA_TEXT, 'mensagem de erro em campo'],
  ['line-strong', 'paper', AA_UI, 'borda de campo de formulário sobre a página (WCAG 1.4.11)'],
  ['line-strong', 'surface', AA_UI, 'borda de campo de formulário sobre card'],
  ['maastricht', 'paper', AA_UI, 'anel de foco sobre a página'],
  ['gainsboro', 'maastricht', AA_UI, 'anel de foco sobre superfície escura'],
]

describe('contraste das cores da marca (WCAG 2.x)', () => {
  it.each(pairs)('%s sobre %s ≥ %s — %s', (fg, bg, min) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min)
  })

  it('documenta por que o laranja da marca não é usado como texto sobre claro', () => {
    // Decisão de design: o laranja puro não atinge 4,5:1 como texto sobre o papel.
    expect(ratio('portland', 'paper')).toBeLessThan(AA_TEXT)
    // E texto branco sobre o laranja também não: por isso o botão usa preto suavizado.
    expect(ratio('surface', 'portland')).toBeLessThan(AA_TEXT)
  })
})
