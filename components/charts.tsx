"use client"
import { useState } from "react"
import { fmtDate } from "@/lib/date"

/**
 * Gráficos de série única em SVG puro.
 * Marca em --accent-text (≥3:1 contra a superfície nos dois temas), grade recessiva,
 * tooltip em hover/foco e tabela equivalente para leitores de tela.
 */

interface BarDatum {
  label: string
  value: number
  detail: string
}

export function BarChart({ data, title, unit }: { data: BarDatum[]; title: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const H = 160
  return (
    <figure className="relative">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex gap-2">
        <div className="relative w-6 shrink-0 text-right text-[0.6875rem] text-muted tabular" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / top) * H }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 top-0" style={{ height: H }} aria-hidden>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-line" style={{ top: H - (t / top) * H }} />
            ))}
          </div>
          <div className="relative flex items-end gap-[2px]" style={{ height: H }}>
            {data.map((d, i) => (
              <button
                key={i}
                type="button"
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-md focus-visible:outline-offset-0"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${d.detail}: ${d.value} ${unit}`}
              >
                <span
                  className="block w-full max-w-9 rounded-t-[10px] rounded-b-[3px] transition-opacity"
                  style={{
                    height: d.value ? Math.max(3, (d.value / top) * H) : 0,
                    background: i === data.length - 1 ? "var(--primary)" : "color-mix(in srgb, var(--fg) 24%, transparent)",
                    opacity: hover === null || hover === i ? 1 : 0.5,
                  }}
                />
                {hover === i && (
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-inverse px-2.5 py-1.5 text-xs text-on-inverse shadow-[var(--shadow)]">
                    <span className="block opacity-80">{d.detail}</span>
                    <strong className="tabular">
                      {d.value} {unit}
                    </strong>
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-[2px] text-center text-[0.6875rem] text-muted" aria-hidden>
            {data.map((d, i) => (
              <span key={i} className="min-w-0 flex-1 truncate">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <DataTable caption={title} head={["Período", unit]} rows={data.map((d) => [d.detail, String(d.value)])} />
    </figure>
  )
}

export function LineChart({ points, title, unit }: { points: { date: string; value: number }[]; title: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null)
  if (points.length < 2) {
    return <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">São necessárias pelo menos duas sessões com carga registrada para mostrar a evolução.</p>
  }
  const W = 600
  const H = 180
  const pad = { l: 36, r: 12, t: 14, b: 26 }
  const vals = points.map((p) => p.value)
  const lo = Math.floor(Math.min(...vals) * 0.95)
  const hi = Math.ceil(Math.max(...vals) * 1.05)
  const span = Math.max(1, hi - lo)
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b)
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")
  const grid = [lo, lo + span / 2, hi]
  const first = points[0].value
  const last = points[points.length - 1].value
  const diff = Math.round((last - first) * 10) / 10
  const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

  return (
    <figure>
      <figcaption className="mb-2 text-sm text-muted">
        {title}:{" "}
        <strong className="text-fg tabular">
          {n(first)} → {n(last)} {unit}
        </strong>{" "}
        ({diff >= 0 ? "+" : "−"}
        {n(Math.abs(diff))} {unit})
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${title}: de ${n(first)} para ${n(last)} ${unit} em ${points.length} registros`}>
          {grid.map((g) => (
            <g key={g}>
              <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--line)" />
              <text x={pad.l - 8} y={y(g)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--fg-muted)" className="tabular">
                {Math.round(g)}
              </text>
            </g>
          ))}
          <text x={pad.l} y={H - 6} fontSize="11" fill="var(--fg-muted)">
            {fmtDate(points[0].date)}
          </text>
          <text x={W - pad.r} y={H - 6} fontSize="11" fill="var(--fg-muted)" textAnchor="end">
            {fmtDate(points[points.length - 1].date)}
          </text>
          <path d={path} fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--line-strong)" />}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={hover === i || i === points.length - 1 ? 5 : 0}
              fill="var(--accent-text)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          ))}
          {points.map((p, i) => (
            <rect
              key={`h${i}`}
              x={x(i) - (W - pad.l - pad.r) / (points.length - 1) / 2}
              y={0}
              width={(W - pad.l - pad.r) / (points.length - 1)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverse px-2.5 py-1.5 text-xs text-on-inverse"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <span className="block opacity-80">{fmtDate(points[hover].date)}</span>
            <strong className="tabular">
              {n(points[hover].value)} {unit}
            </strong>
          </div>
        )}
      </div>
      <DataTable caption={title} head={["Data", unit]} rows={points.map((p) => [fmtDate(p.date), n(p.value)])} />
    </figure>
  )
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer rounded text-muted hover:text-fg">Ver dados em tabela</summary>
      <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left tabular">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2 text-muted">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function niceTicks(max: number) {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10
  const top = Math.ceil(max / step) * step
  const out: number[] = []
  for (let t = 0; t <= top; t += step) out.push(t)
  return out
}
