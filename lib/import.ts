import { allExercises } from "./catalog"
import { uid } from "./actions"
import type { DemoData, Exercise, Workout, WorkoutItem } from "./types"

/**
 * Importação de fichas por planilha (CSV exportado do Excel, Google Sheets, MFIT etc.).
 * Uma linha por exercício. Colunas reconhecidas (a ordem não importa, maiúsculas e acentos são ignorados):
 *   treino · exercicio · series · repeticoes · carga · descanso · observacao · grupo
 * Linhas com o mesmo "treino" viram uma ficha. Exercícios que não existem no catálogo viram exercícios próprios.
 */

export interface ImportRow {
  line: number
  workout: string
  exercise: string
  sets: number
  reps: string
  load: number | null
  restSec: number
  notes: string
  group: string
}

export interface ImportPlan {
  rows: ImportRow[]
  errors: string[]
  workouts: { name: string; items: { row: ImportRow; exerciseId: string | null; exerciseName: string }[] }[]
  /** Nomes que não foram achados no catálogo e serão criados como exercícios próprios. */
  newExercises: string[]
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const ALIASES: Record<string, string[]> = {
  workout: ["treino", "ficha", "divisao", "dia", "workout"],
  exercise: ["exercicio", "exercicios", "nome", "exercise", "movimento"],
  sets: ["series", "serie", "sets", "set"],
  reps: ["repeticoes", "reps", "repeticao", "rep"],
  load: ["carga", "peso", "kg", "carga kg", "load"],
  rest: ["descanso", "intervalo", "pausa", "descanso s", "rest"],
  notes: ["observacao", "observacoes", "obs", "notas", "dica", "notes"],
  group: ["grupo", "grupo muscular", "musculo", "group"],
}

/** Separa uma linha de CSV respeitando aspas. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ""
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"'
        i++
      } else q = !q
    } else if (ch === sep && !q) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

const toNumber = (s: string) => {
  const v = s.replace(/kg|s$/gi, "").replace(",", ".").trim()
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

export function parseWorkoutCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").replace(/\r/g, "").split("\n")
  const firstIdx = lines.findIndex((l) => l.trim())
  if (firstIdx < 0) return { rows: [], errors: ["A planilha está vazia."] }
  const head = lines[firstIdx]
  const sep = [";", "\t", ","].sort((a, b) => head.split(b).length - head.split(a).length)[0]
  const cols = splitLine(head, sep).map(norm)
  const col = (k: keyof typeof ALIASES) => cols.findIndex((c) => ALIASES[k].includes(c))
  const idx = { workout: col("workout"), exercise: col("exercise"), sets: col("sets"), reps: col("reps"), load: col("load"), rest: col("rest"), notes: col("notes"), group: col("group") }
  const errors: string[] = []
  if (idx.exercise < 0) return { rows: [], errors: ['Não achei a coluna "exercicio" no cabeçalho.'] }

  const rows: ImportRow[] = []
  for (let i = firstIdx + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const c = splitLine(lines[i], sep)
    const get = (j: number) => (j >= 0 ? (c[j] ?? "") : "")
    const line = i + 1
    const exercise = get(idx.exercise)
    if (!exercise) continue
    const sets = toNumber(get(idx.sets))
    const load = toNumber(get(idx.load))
    const rest = toNumber(get(idx.rest))
    const row: ImportRow = {
      line,
      workout: get(idx.workout) || "Treino importado",
      exercise,
      sets: sets === null ? 3 : sets,
      reps: get(idx.reps) || "10-12",
      load: load === null ? null : load,
      restSec: rest === null ? 60 : rest,
      notes: get(idx.notes),
      group: get(idx.group),
    }
    if (!Number.isInteger(row.sets) || row.sets < 1 || row.sets > 20) errors.push(`Linha ${line}: séries devem ser um número de 1 a 20.`)
    else if (row.load !== null && (Number.isNaN(row.load) || row.load < 0 || row.load > 1000)) errors.push(`Linha ${line}: carga inválida.`)
    else if (!Number.isInteger(row.restSec) || row.restSec < 0 || row.restSec > 600) errors.push(`Linha ${line}: descanso deve ficar entre 0 e 600 segundos.`)
    else rows.push(row)
  }
  if (!rows.length && !errors.length) errors.push("Nenhum exercício encontrado na planilha.")
  return { rows, errors }
}

/** Procura o exercício pelo nome: catálogo (PT ou inglês) e exercícios próprios. */
export function matchExercise(d: DemoData, name: string): { id: string; name: string } | null {
  const q = norm(name)
  if (!q) return null
  const list = allExercises(d)
  const exact = list.find((e) => norm(e.name) === q || (e.nameEn && norm(e.nameEn) === q) || norm(e.id) === q)
  if (exact) return { id: exact.id, name: exact.name }
  const starts = list.filter((e) => norm(e.name).startsWith(q)).sort((a, b) => a.name.length - b.name.length)[0]
  return starts ? { id: starts.id, name: starts.name } : null
}

export function planImport(d: DemoData, text: string): ImportPlan {
  const { rows, errors } = parseWorkoutCsv(text)
  const byName = new Map<string, ImportPlan["workouts"][number]>()
  const newExercises = new Set<string>()
  for (const row of rows) {
    const m = matchExercise(d, row.exercise)
    if (!m) newExercises.add(row.exercise)
    const key = row.workout
    if (!byName.has(key)) byName.set(key, { name: key, items: [] })
    byName.get(key)!.items.push({ row, exerciseId: m?.id ?? null, exerciseName: m?.name ?? row.exercise })
  }
  return { rows, errors, workouts: [...byName.values()], newExercises: [...newExercises] }
}

/** Cria as fichas (e os exercícios próprios que faltarem) e, se informado, atribui ao aluno. */
export function applyImport(d: DemoData, plan: ImportPlan, studentId: string | null): { data: DemoData; workoutIds: string[] } {
  const created: Exercise[] = []
  const customId = new Map<string, string>()
  for (const name of plan.newExercises) {
    const row = plan.rows.find((r) => r.exercise === name)
    const id = uid("ex")
    customId.set(name, id)
    created.push({ id, name: name.slice(0, 80), muscleGroup: row?.group || "Outros", equipment: "", instructions: "", custom: true })
  }
  const t = new Date().toISOString()
  const workoutIds: string[] = []
  const workouts: Workout[] = plan.workouts.map((w) => {
    const id = uid("tr")
    workoutIds.push(id)
    const items: WorkoutItem[] = w.items.map(({ row, exerciseId }) => ({
      id: uid("it"),
      exerciseId: exerciseId ?? customId.get(row.exercise)!,
      sets: row.sets,
      reps: row.reps.slice(0, 20),
      load: row.load,
      restSec: row.restSec,
      notes: row.notes.slice(0, 200),
    }))
    return { id, name: w.name.slice(0, 80), description: "Importada de planilha.", items, studentIds: studentId ? [studentId] : [], createdAt: t, updatedAt: t }
  })
  return { data: { ...d, exercises: [...d.exercises, ...created], workouts: [...d.workouts, ...workouts] }, workoutIds }
}

export const WORKOUT_CSV_TEMPLATE = [
  "treino;exercicio;series;repeticoes;carga;descanso;observacao",
  "Treino A - Pernas;Agachamento com barra;4;10;40;90;Desça até a coxa ficar paralela",
  "Treino A - Pernas;Leg press 45°;4;12;120;90;",
  "Treino B - Peito e tríceps;Supino reto com barra (pegada média);4;10;30;90;",
  "Treino B - Peito e tríceps;Tríceps na polia (barra);3;12;20;60;",
].join("\n")
